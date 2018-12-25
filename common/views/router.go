/*
 * Copyright (c) 2018. Abstrium SAS <team (at) pydio.com>
 * This file is part of Pydio Cells.
 *
 * Pydio Cells is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Pydio Cells is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Pydio Cells.  If not, see <http://www.gnu.org/licenses/>.
 *
 * The latest code can be found at <https://pydio.com>.
 */

package views

import (
	"context"
	"io"

	"github.com/micro/go-micro/client"
	"github.com/pydio/minio-go"

	"github.com/pydio/cells/common"
	"github.com/pydio/cells/common/proto/tree"
)

// RouterOptions holds configuration flags to pass to a routeur constructor easily.
type RouterOptions struct {
	AdminView          bool
	WatchRegistry      bool
	LogReadEvents      bool
	BrowseVirtualNodes bool
	// AuditEvent flag turns audit logger ON for the corresponding router.
	AuditEvent bool
}

// NewStandardRouter returns a new configured instance of the default standard router.
func NewStandardRouter(options RouterOptions) *Router {

	handlers := []Handler{
		NewAccessListHandler(options.AdminView),
		&BinaryStoreHandler{
			StoreName: common.PYDIO_THUMBSTORE_NAMESPACE, // Direct access to dedicated Bucket for thumbnails
		},
		&BinaryStoreHandler{
			StoreName:     common.PYDIO_DOCSTORE_BINARIES_NAMESPACE, // Direct access to dedicated Bucket for pydio binaries
			AllowPut:      true,
			AllowAnonRead: true,
		},
	}
	handlers = append(handlers, NewArchiveHandler())
	handlers = append(handlers, NewPathWorkspaceHandler())
	handlers = append(handlers, NewPathMultipleRootsHandler())
	if !options.BrowseVirtualNodes && !options.AdminView {
		handlers = append(handlers, NewVirtualNodesHandler())
	}
	if options.BrowseVirtualNodes {
		handlers = append(handlers, NewVirtualNodesBrowser())
	}
	handlers = append(handlers, NewWorkspaceRootResolver())
	handlers = append(handlers, NewPathDataSourceHandler())

	if options.AuditEvent {
		handlers = append(handlers, &HandlerAuditEvent{})
	}
	if !options.AdminView {
		handlers = append(handlers, &AclFilterHandler{})
	}
	if options.LogReadEvents {
		handlers = append(handlers, &HandlerEventRead{})
	}
	handlers = append(handlers, &PutHandler{})
	if !options.AdminView {
		handlers = append(handlers, &UploadLimitFilter{})
		handlers = append(handlers, &AclLockFilter{})
		handlers = append(handlers, &AclQuotaFilter{})
	}
	handlers = append(handlers, &EncryptionHandler{})
	handlers = append(handlers, &VersionHandler{})
	handlers = append(handlers, &Executor{})

	pool := NewClientsPool(options.WatchRegistry)
	return NewRouter(pool, handlers)
}

// NewUuidRouter returns a new configured instance of a router
// that relies on nodes UUID rather than the usual Node path.
func NewUuidRouter(options RouterOptions) *Router {
	handlers := []Handler{
		NewAccessListHandler(options.AdminView),
		NewUuidNodeHandler(),
		NewUuidDataSourceHandler(),
	}

	if options.AuditEvent {
		handlers = append(handlers, &HandlerAuditEvent{})
	}

	if !options.AdminView {
		handlers = append(handlers, &AclFilterHandler{})
	}
	handlers = append(handlers, &PutHandler{}) // adds a node precreation on PUT file request
	if !options.AdminView {
		handlers = append(handlers, &UploadLimitFilter{})
		handlers = append(handlers, &AclLockFilter{})
		handlers = append(handlers, &AclQuotaFilter{})
	}
	handlers = append(handlers, &EncryptionHandler{}) // retrieves encryption materials from encryption service
	handlers = append(handlers, &VersionHandler{})
	handlers = append(handlers, &Executor{})

	pool := NewClientsPool(options.WatchRegistry)
	return NewRouter(pool, handlers)
}

// NewRouter creates and configures a new router with given ClientsPool and Handlers.
func NewRouter(pool *ClientsPool, handlers []Handler) *Router {
	r := &Router{
		handlers: handlers,
		pool:     pool,
	}
	r.initHandlers()
	return r
}

type Router struct {
	handlers []Handler
	pool     *ClientsPool
}

func (v *Router) initHandlers() {
	for i, h := range v.handlers {
		if i < len(v.handlers)-1 {
			next := v.handlers[i+1]
			h.SetNextHandler(next)
		}
		h.SetClientsPool(v.pool)
	}
}

func (v *Router) WrapCallback(provider NodesCallback) error {
	return v.ExecuteWrapped(nil, nil, provider)
}

func (v *Router) ExecuteWrapped(inputFilter NodeFilter, outputFilter NodeFilter, provider NodesCallback) error {
	outputFilter = func(ctx context.Context, inputNode *tree.Node, identifier string) (context.Context, *tree.Node, error) {
		return ctx, inputNode, nil
	}
	inputFilter = func(ctx context.Context, inputNode *tree.Node, identifier string) (context.Context, *tree.Node, error) {
		return ctx, inputNode, nil
	}
	return v.handlers[0].ExecuteWrapped(inputFilter, outputFilter, provider)
}

func (v *Router) ReadNode(ctx context.Context, in *tree.ReadNodeRequest, opts ...client.CallOption) (*tree.ReadNodeResponse, error) {
	h := v.handlers[0]
	return h.ReadNode(ctx, in, opts...)
}

func (v *Router) ListNodes(ctx context.Context, in *tree.ListNodesRequest, opts ...client.CallOption) (tree.NodeProvider_ListNodesClient, error) {
	h := v.handlers[0]
	return h.ListNodes(ctx, in, opts...)
}

func (v *Router) CreateNode(ctx context.Context, in *tree.CreateNodeRequest, opts ...client.CallOption) (*tree.CreateNodeResponse, error) {
	h := v.handlers[0]
	return h.CreateNode(ctx, in, opts...)
}

func (v *Router) UpdateNode(ctx context.Context, in *tree.UpdateNodeRequest, opts ...client.CallOption) (*tree.UpdateNodeResponse, error) {
	h := v.handlers[0]
	return h.UpdateNode(ctx, in, opts...)
}

func (v *Router) DeleteNode(ctx context.Context, in *tree.DeleteNodeRequest, opts ...client.CallOption) (*tree.DeleteNodeResponse, error) {
	h := v.handlers[0]
	return h.DeleteNode(ctx, in, opts...)
}

func (v *Router) GetObject(ctx context.Context, node *tree.Node, requestData *GetRequestData) (io.ReadCloser, error) {
	h := v.handlers[0]
	return h.GetObject(ctx, node, requestData)
}

func (v *Router) PutObject(ctx context.Context, node *tree.Node, reader io.Reader, requestData *PutRequestData) (int64, error) {
	h := v.handlers[0]
	return h.PutObject(ctx, node, reader, requestData)
}

func (v *Router) CopyObject(ctx context.Context, from *tree.Node, to *tree.Node, requestData *CopyRequestData) (int64, error) {
	h := v.handlers[0]
	return h.CopyObject(ctx, from, to, requestData)
}

func (v *Router) MultipartCreate(ctx context.Context, target *tree.Node, requestData *MultipartRequestData) (string, error) {
	return v.handlers[0].MultipartCreate(ctx, target, requestData)
}

func (v *Router) MultipartPutObjectPart(ctx context.Context, target *tree.Node, uploadID string, partNumberMarker int, reader io.Reader, requestData *PutRequestData) (minio.ObjectPart, error) {
	return v.handlers[0].MultipartPutObjectPart(ctx, target, uploadID, partNumberMarker, reader, requestData)
}

func (v *Router) MultipartList(ctx context.Context, prefix string, requestData *MultipartRequestData) (minio.ListMultipartUploadsResult, error) {
	return v.handlers[0].MultipartList(ctx, prefix, requestData)
}

func (v *Router) MultipartAbort(ctx context.Context, target *tree.Node, uploadID string, requestData *MultipartRequestData) error {
	return v.handlers[0].MultipartAbort(ctx, target, uploadID, requestData)
}

func (v *Router) MultipartComplete(ctx context.Context, target *tree.Node, uploadID string, uploadedParts []minio.CompletePart) (minio.ObjectInfo, error) {
	return v.handlers[0].MultipartComplete(ctx, target, uploadID, uploadedParts)
}

func (v *Router) MultipartListObjectParts(ctx context.Context, target *tree.Node, uploadID string, partNumberMarker int, maxParts int) (minio.ListObjectPartsResult, error) {
	return v.handlers[0].MultipartListObjectParts(ctx, target, uploadID, partNumberMarker, maxParts)
}

// To respect Handler interface
func (v *Router) SetNextHandler(h Handler)      {}
func (v *Router) SetClientsPool(p *ClientsPool) {}

// GetExecutor uses the very last handler (Executor) to send a request with a previously filled context.
func (v *Router) GetExecutor() Handler {
	return v.handlers[len(v.handlers)-1]
}

// Specific to Router
func (v *Router) GetClientsPool() *ClientsPool {
	return v.pool
}
