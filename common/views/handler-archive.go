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
	"path/filepath"
	"strings"

	"github.com/micro/go-micro/client"
	"github.com/micro/go-micro/errors"
	"go.uber.org/zap"

	"encoding/json"

	"path"

	"time"

	"github.com/pydio/cells/common"
	"github.com/pydio/cells/common/log"
	"github.com/pydio/cells/common/micro"
	"github.com/pydio/cells/common/proto/docstore"
	"github.com/pydio/cells/common/proto/tree"
	"github.com/pydio/cells/common/utils"
)

type selectionProvider interface {
	getSelectionByUuid(ctx context.Context, selectionUuid string) (bool, []*tree.Node, error)
	deleteSelectionByUuid(ctx context.Context, selectionUuid string)
}

type ArchiveHandler struct {
	AbstractHandler
	selectionProvider selectionProvider
}

func NewArchiveHandler() *ArchiveHandler {
	a := &ArchiveHandler{}
	a.selectionProvider = a
	return a
}

// Override the response of GetObject if it is sent on a folder key : create an archive on-the-fly.
func (a *ArchiveHandler) GetObject(ctx context.Context, node *tree.Node, requestData *GetRequestData) (io.ReadCloser, error) {

	originalPath := node.Path

	if ok, format, archivePath, innerPath := a.isArchivePath(originalPath); ok && len(innerPath) > 0 {
		extractor := &ArchiveReader{Router: a.next}
		statResp, _ := a.next.ReadNode(ctx, &tree.ReadNodeRequest{Node: &tree.Node{Path: archivePath}})
		archiveNode := statResp.Node
		log.Logger(ctx).Debug("[ARCHIVE:GET] "+archivePath+" -- "+innerPath, zap.Any("archiveNode", archiveNode))

		if format == "zip" {
			return extractor.ReadChildZip(ctx, archiveNode, innerPath)
		} else {
			reader, writer := io.Pipe()
			gzip := false
			if format == "tar.gz" {
				gzip = true
			}
			go func() {
				extractor.ReadChildTar(ctx, gzip, writer, archiveNode, innerPath)
			}()
			return reader, nil
		}

	}

	readCloser, err := a.next.GetObject(ctx, node, requestData)
	if err != nil {
		if selectionUuid := a.selectionFakeName(originalPath); selectionUuid != "" {
			ok, nodes, er := a.selectionProvider.getSelectionByUuid(ctx, selectionUuid)
			if er != nil {
				return readCloser, er
			}
			if ok && len(nodes) > 0 {
				ext := strings.Trim(path.Ext(originalPath), ".")
				r, w := io.Pipe()
				go func() {
					defer w.Close()
					defer func() {
						// Delete selection after download
						a.selectionProvider.deleteSelectionByUuid(context.Background(), selectionUuid)
					}()
					a.generateArchiveFromSelection(ctx, w, nodes, ext)
				}()
				return r, nil
			}
		} else if testFolder := a.archiveFolderName(originalPath); len(testFolder) > 0 {
			r, w := io.Pipe()
			go func() {
				defer w.Close()
				a.generateArchiveFromFolder(ctx, w, originalPath)
			}()
			return r, nil
		}
	}

	return readCloser, err

}

// Override the response of ReadNode to create a fake stat for archive file
func (a *ArchiveHandler) ReadNode(ctx context.Context, in *tree.ReadNodeRequest, opts ...client.CallOption) (*tree.ReadNodeResponse, error) {
	originalPath := in.Node.Path

	if ok, format, archivePath, innerPath := a.isArchivePath(originalPath); ok && len(innerPath) > 0 {
		log.Logger(ctx).Debug("[ARCHIVE:READ] " + originalPath + " => " + archivePath + " -- " + innerPath)
		extractor := &ArchiveReader{Router: a.next}
		statResp, _ := a.next.ReadNode(ctx, &tree.ReadNodeRequest{Node: &tree.Node{Path: archivePath}})
		archiveNode := statResp.Node

		var statNode *tree.Node
		var err error
		if format == "zip" {
			statNode, err = extractor.StatChildZip(ctx, archiveNode, innerPath)
		} else {
			gzip := false
			if format == "tar.gz" {
				gzip = true
			}
			statNode, err = extractor.StatChildTar(ctx, gzip, archiveNode, innerPath)
		}
		if err == nil {
			if statNode.Size == 0 {
				statNode.Size = -1
			}
			statNode.SetMeta(common.META_NAMESPACE_NODENAME, filepath.Base(statNode.Path))
		}
		return &tree.ReadNodeResponse{Node: statNode}, err
	}

	response, err := a.next.ReadNode(ctx, in, opts...)
	if err != nil {
		// Check if it's a selection Uuid
		if selectionUuid := a.selectionFakeName(originalPath); selectionUuid != "" {
			ok, nodes, er := a.selectionProvider.getSelectionByUuid(ctx, selectionUuid)
			if er != nil {
				return response, er
			}
			if ok && len(nodes) > 0 {
				// Send a fake stat
				fakeNode := &tree.Node{
					Path:      path.Dir(originalPath) + "selection.zip",
					Type:      tree.NodeType_LEAF,
					Size:      -1,
					Etag:      selectionUuid,
					MTime:     time.Now().Unix(),
					MetaStore: map[string]string{"name": "selection.zip"},
				}
				return &tree.ReadNodeResponse{Node: fakeNode}, nil
			}
		} else if folderName := a.archiveFolderName(originalPath); folderName != "" {
			// Check if it's a folder
			fakeNode, err := a.archiveFakeStat(ctx, originalPath)
			if err == nil && fakeNode != nil {
				response = &tree.ReadNodeResponse{
					Node: fakeNode,
				}
				return response, nil
			}
		}
	}
	return response, err
}

func (a *ArchiveHandler) ListNodes(ctx context.Context, in *tree.ListNodesRequest, opts ...client.CallOption) (tree.NodeProvider_ListNodesClient, error) {

	if ok, format, archivePath, innerPath := a.isArchivePath(in.Node.Path); ok {
		extractor := &ArchiveReader{Router: a.next}
		statResp, e := a.next.ReadNode(ctx, &tree.ReadNodeRequest{Node: &tree.Node{Path: archivePath}})
		if e != nil {
			return nil, e
		}
		archiveNode := statResp.Node

		if in.Limit == 1 && innerPath == "" {
			archiveNode.Type = tree.NodeType_COLLECTION
			streamer := NewWrappingStreamer()
			go func() {
				defer streamer.Close()
				log.Logger(ctx).Debug("[ARCHIVE:LISTNODE/READ]", zap.String("path", archiveNode.Path))
				streamer.Send(&tree.ListNodesResponse{Node: archiveNode})
			}()
			return streamer, nil
		}

		log.Logger(ctx).Debug("[ARCHIVE:LIST] "+archivePath+" -- "+innerPath, zap.Any("archiveNode", archiveNode))
		var children []*tree.Node
		var err error
		if format == "zip" {
			children, err = extractor.ListChildrenZip(ctx, archiveNode, innerPath)
		} else {
			gzip := false
			if format == "tar.gz" {
				gzip = true
			}
			children, err = extractor.ListChildrenTar(ctx, gzip, archiveNode, innerPath)
		}
		streamer := NewWrappingStreamer()
		if err != nil {
			return streamer, err
		}
		go func() {
			defer streamer.Close()
			for _, child := range children {
				log.Logger(ctx).Debug("[ARCHIVE:LISTNODE]", zap.String("path", child.Path))
				streamer.Send(&tree.ListNodesResponse{Node: child})
			}
		}()
		return streamer, nil
	}

	return a.next.ListNodes(ctx, in, opts...)
}

func (a *ArchiveHandler) isArchivePath(nodePath string) (ok bool, format string, archivePath string, innerPath string) {
	formats := []string{"zip", "tar", "tar.gz"}
	for _, f := range formats {
		test := strings.SplitN(nodePath, "."+f+"/", 2)
		if len(test) == 2 {
			return true, f, test[0] + "." + f, test[1]
		}
		if strings.HasSuffix(nodePath, "."+f) {
			return true, f, nodePath, ""
		}
	}
	return false, "", "", ""
}

func (a *ArchiveHandler) selectionFakeName(nodePath string) string {
	if strings.HasSuffix(nodePath, "-selection.zip") || strings.HasSuffix(nodePath, "-selection.tar") || strings.HasSuffix(nodePath, "-selection.tar.gz") {
		fName := path.Base(nodePath)
		return strings.TrimSuffix(strings.TrimSuffix(strings.TrimSuffix(fName, "-selection.zip"), "-selection.tar.gz"), "-selection.tar")
	}
	return ""
}

func (a *ArchiveHandler) archiveFolderName(nodePath string) string {
	if strings.HasSuffix(nodePath, ".zip") || strings.HasSuffix(nodePath, ".tar") || strings.HasSuffix(nodePath, ".tar.gz") {
		fName := strings.TrimSuffix(strings.TrimSuffix(strings.TrimSuffix(nodePath, ".zip"), ".gz"), ".tar")
		return strings.Trim(fName, "/")
	}
	return ""
}

func (a *ArchiveHandler) archiveFakeStat(ctx context.Context, nodePath string) (node *tree.Node, e error) {

	if noExt := a.archiveFolderName(nodePath); noExt != "" {

		n, er := a.ReadNode(ctx, &tree.ReadNodeRequest{Node: &tree.Node{Path: noExt}})
		if er == nil && n != nil {
			n.Node.Type = tree.NodeType_LEAF
			n.Node.Path = nodePath
			n.Node.Size = -1 // This will avoid a Content-Length discrepancy
			n.Node.SetMeta(common.META_NAMESPACE_NODENAME, filepath.Base(nodePath))
			log.Logger(ctx).Debug("This is a zip, sending folder info instead", zap.Any("node", n.Node))
			return n.Node, nil
		}

	}

	return nil, errors.NotFound(VIEWS_LIBRARY_NAME, "Could not find corresponding folder for archive")

}

func (a *ArchiveHandler) generateArchiveFromFolder(ctx context.Context, writer io.Writer, nodePath string) (bool, error) {

	if noExt := a.archiveFolderName(nodePath); noExt != "" {

		n, er := a.ReadNode(ctx, &tree.ReadNodeRequest{Node: &tree.Node{Path: noExt}})
		if er == nil && n != nil {
			ext := strings.Trim(path.Ext(nodePath), ".")
			err := a.generateArchiveFromSelection(ctx, writer, []*tree.Node{n.Node}, ext)
			return true, err
		}
	}

	return false, nil
}

// generateArchiveFromSelection Create a zip/tar/tar.gz on the fly
func (a *ArchiveHandler) generateArchiveFromSelection(ctx context.Context, writer io.Writer, selection []*tree.Node, format string) error {

	archiveWriter := &ArchiveWriter{
		Router: a,
	}
	var err error
	if format == "zip" {
		log.Logger(ctx).Debug("This is a zip, create a zip on the fly")
		_, err = archiveWriter.ZipSelection(ctx, writer, selection)
	} else if format == "tar" {
		log.Logger(ctx).Debug("This is a tar, create a tar on the fly")
		_, err = archiveWriter.TarSelection(ctx, writer, false, selection)
	} else if format == "gz" {
		log.Logger(ctx).Debug("This is a tar.gz, create a tar.gz on the fly")
		_, err = archiveWriter.TarSelection(ctx, writer, true, selection)
	}

	return err

}

// getSelectionByUuid loads a selection stored in DocStore service by its id.
func (a *ArchiveHandler) getSelectionByUuid(ctx context.Context, selectionUuid string) (bool, []*tree.Node, error) {

	var data []*tree.Node
	dcClient := docstore.NewDocStoreClient(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_DOCSTORE, defaults.NewClient())
	if resp, e := dcClient.GetDocument(ctx, &docstore.GetDocumentRequest{
		StoreID:    common.DOCSTORE_ID_SELECTIONS,
		DocumentID: selectionUuid,
	}); e == nil {
		doc := resp.Document
		username, _ := utils.FindUserNameInContext(ctx)
		if username != doc.Owner {
			return false, data, errors.Forbidden("selection.forbidden", "this selection does not belong to you")
		}
		if er := json.Unmarshal([]byte(doc.Data), &data); er != nil {
			return false, data, er
		} else {
			return true, data, nil
		}
	} else {
		return false, data, nil
	}

}

// deleteSelectionByUuid Delete selection
func (a *ArchiveHandler) deleteSelectionByUuid(ctx context.Context, selectionUuid string) {
	dcClient := docstore.NewDocStoreClient(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_DOCSTORE, defaults.NewClient())
	_, e := dcClient.DeleteDocuments(ctx, &docstore.DeleteDocumentsRequest{
		StoreID:    common.DOCSTORE_ID_SELECTIONS,
		DocumentID: selectionUuid,
	})
	if e != nil {
		log.Logger(ctx).Error("Could not delete selection")
	} else {
		log.Logger(ctx).Debug("Deleted selection after download " + selectionUuid)
	}
}
