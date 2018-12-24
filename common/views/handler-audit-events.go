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
	"fmt"
	"io"

	"github.com/micro/go-micro/client"
	minio "github.com/pydio/minio-go"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"

	"github.com/pmker/yux/common"
	"github.com/pmker/yux/common/log"
	"github.com/pmker/yux/common/proto/tree"
)

// HandlerAuditEvent is responsible for auditing all events on Nodes
// as soon as the router's option flag "AuditEvent" is set to true.
type HandlerAuditEvent struct {
	AbstractHandler
}

// GetObject logs an audit message on each GetObject Events after calling following handlers.
func (h *HandlerAuditEvent) GetObject(ctx context.Context, node *tree.Node, requestData *GetRequestData) (io.ReadCloser, error) {
	auditer := log.Auditer(ctx)
	reader, e := h.next.GetObject(ctx, node, requestData)

	isBinary, wsInfo, wsScope := checkBranchInfoForAudit(ctx, "in")
	if isBinary {
		return reader, e // do not audit thumbnail events
	}
	if e == nil {
		auditer.Info(
			fmt.Sprintf("Retrieved object at %s", node.Path),
			log.GetAuditId(common.AUDIT_OBJECT_GET),
			node.ZapUuid(),
			node.ZapPath(),
			wsInfo,
			wsScope,
		)
	}

	return reader, e
}

// PutObject logs an audit message after calling following handlers.
func (h *HandlerAuditEvent) PutObject(ctx context.Context, node *tree.Node, reader io.Reader, requestData *PutRequestData) (int64, error) {
	auditer := log.Auditer(ctx)
	written, e := h.next.PutObject(ctx, node, reader, requestData)

	isBinary, wsInfo, wsScope := checkBranchInfoForAudit(ctx, "in")
	if isBinary {
		return written, e // do not audit thumbnail events
	}

	auditer.Info(
		fmt.Sprintf("Modified %s, put %d bytes", node.Path, written),
		log.GetAuditId(common.AUDIT_OBJECT_PUT),
		node.ZapUuid(),
		node.ZapPath(),
		wsInfo,
		wsScope,
		zap.Error(e), // empty if e == nil
	)

	return written, e
}

// ReadNode only forwards call to next handler, it call too often to provide useful audit info.
func (h *HandlerAuditEvent) ReadNode(ctx context.Context, in *tree.ReadNodeRequest, opts ...client.CallOption) (*tree.ReadNodeResponse, error) {
	response, e := h.next.ReadNode(ctx, in, opts...)
	return response, e

	// We do not log ReadNode events for the time being
	// isBinary, wsInfo, wsScope := checkBranchInfoForAudit(ctx, "in")
	// if isBinary {
	// 	return response, e // do not audit thumbnail events
	// }

	// log.Auditer(ctx).Info(
	// 	"[handler-audit-event] ReadNode",
	// 	log.GetAuditId(common.AUDIT_NODE_READ),
	// 	in.Node.ZapUuid(),
	// 	in.Node.ZapPath(),
	// 	wsInfo,
	// 	wsScope,
	// 	zap.Any("ReadNodeRequest", in),
	// )
}

// ListNodes logs an audit message on each call after having transferred the call to following handlers.
func (h *HandlerAuditEvent) ListNodes(ctx context.Context, in *tree.ListNodesRequest, opts ...client.CallOption) (tree.NodeProvider_ListNodesClient, error) {
	c, e := h.next.ListNodes(ctx, in, opts...)

	_, wsInfo, wsScope := checkBranchInfoForAudit(ctx, "in")
	log.Auditer(ctx).Info(
		fmt.Sprintf("Listed folder %s", in.Node.Path),
		log.GetAuditId(common.AUDIT_NODE_LIST),
		in.Node.ZapUuid(),
		in.Node.ZapPath(),
		wsInfo,
		wsScope,
		zap.Any("listNodeRequest", in),
	)

	return c, e
}

// CreateNode logs an audit message on each call after having transferred the call to following handlers.
func (h *HandlerAuditEvent) CreateNode(ctx context.Context, in *tree.CreateNodeRequest, opts ...client.CallOption) (*tree.CreateNodeResponse, error) {
	response, e := h.next.CreateNode(ctx, in, opts...)

	_, wsInfo, wsScope := checkBranchInfoForAudit(ctx, "in")
	log.Auditer(ctx).Info(
		fmt.Sprintf("Created node at %s", in.Node.Path),
		log.GetAuditId(common.AUDIT_NODE_CREATE),
		in.Node.ZapUuid(),
		in.Node.ZapPath(),
		wsInfo,
		wsScope,
		zap.Any("CreateNodeRequest", in),
	)
	return response, e
}

// UpdateNode logs an audit message on each call after having transferred the call to following handlers.
func (h *HandlerAuditEvent) UpdateNode(ctx context.Context, in *tree.UpdateNodeRequest, opts ...client.CallOption) (*tree.UpdateNodeResponse, error) {
	response, e := h.next.UpdateNode(ctx, in, opts...)

	from := in.From
	to := in.To

	log.Logger(ctx).Debug(fmt.Sprintf("Updated node, from: %v to: %v", from, to))

	log.Auditer(ctx).Info(
		fmt.Sprintf("Update node at %s", in.From.Path),
		log.GetAuditId(common.AUDIT_NODE_UPDATE),
		in.From.ZapUuid(),
		in.From.ZapPath(),
		zap.Any("UpdateNodeRequest", in),
	)

	return response, e
}

// DeleteNode logs an audit message on each call after having transferred the call to following handlers.
func (h *HandlerAuditEvent) DeleteNode(ctx context.Context, in *tree.DeleteNodeRequest, opts ...client.CallOption) (*tree.DeleteNodeResponse, error) {
	response, e := h.next.DeleteNode(ctx, in, opts...)

	_, wsInfo, wsScope := checkBranchInfoForAudit(ctx, "in")
	log.Auditer(ctx).Info(
		fmt.Sprintf("Deleted node at %s", in.Node.Path),
		log.GetAuditId(common.AUDIT_NODE_DELETE),
		in.Node.ZapUuid(),
		in.Node.ZapPath(),
		wsInfo,
		wsScope,
		zap.Any("DeleteNodeRequest", in),
	)

	return response, e
}

func (h *HandlerAuditEvent) CopyObject(ctx context.Context, from *tree.Node, to *tree.Node, requestData *CopyRequestData) (int64, error) {
	// TODO implement
	return h.next.CopyObject(ctx, from, to, requestData)
}

// Multi part upload management

func (h *HandlerAuditEvent) MultipartCreate(ctx context.Context, target *tree.Node, requestData *MultipartRequestData) (string, error) {
	// TODO implement
	return h.next.MultipartCreate(ctx, target, requestData)
}

func (h *HandlerAuditEvent) MultipartPutObjectPart(ctx context.Context, target *tree.Node, uploadID string, partNumberMarker int, reader io.Reader, requestData *PutRequestData) (minio.ObjectPart, error) {
	// TODO implement
	return h.next.MultipartPutObjectPart(ctx, target, uploadID, partNumberMarker, reader, requestData)
}

func (h *HandlerAuditEvent) MultipartComplete(ctx context.Context, target *tree.Node, uploadID string, uploadedParts []minio.CompletePart) (minio.ObjectInfo, error) {
	// TODO implement
	return h.next.MultipartComplete(ctx, target, uploadID, uploadedParts)
}

func (h *HandlerAuditEvent) MultipartAbort(ctx context.Context, target *tree.Node, uploadID string, requestData *MultipartRequestData) error {
	// TODO implement
	return h.next.MultipartAbort(ctx, target, uploadID, requestData)
}

func (h *HandlerAuditEvent) MultipartList(ctx context.Context, prefix string, requestData *MultipartRequestData) (minio.ListMultipartUploadsResult, error) {
	// TODO implement
	return h.next.MultipartList(ctx, prefix, requestData)
}

func (h *HandlerAuditEvent) MultipartListObjectParts(ctx context.Context, target *tree.Node, uploadID string, partNumberMarker int, maxParts int) (minio.ListObjectPartsResult, error) {
	// TODO implement
	return h.next.MultipartListObjectParts(ctx, target, uploadID, partNumberMarker, maxParts)
}

/* HELPER METHODS */
// checkBranchInfoForAudit simply gather relevant information from the branch info before calling the Audit log.
func checkBranchInfoForAudit(ctx context.Context, identifier string) (isBinary bool, wsInfo zapcore.Field, wsScope zapcore.Field) {
	// Retrieve Datasource and Workspace info
	wsInfo = zap.String(common.KEY_WORKSPACE_UUID, "")
	wsScope = zap.String(common.KEY_WORKSPACE_SCOPE, "")

	branchInfo, ok := GetBranchInfo(ctx, identifier)
	if ok && branchInfo.Binary {
		return true, wsInfo, wsScope
	}

	// Try to retrieve Wksp UUID
	if ok {
		wsId := branchInfo.UUID
		if wsId != "" {
			wsInfo = zap.String(common.KEY_WORKSPACE_UUID, wsId)
			wsScope = zap.String(common.KEY_WORKSPACE_SCOPE, branchInfo.Scope.String())
		}
	}
	return false, wsInfo, wsScope
}
