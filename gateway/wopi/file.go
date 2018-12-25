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

// Package wopi implements communication with the backend via the WOPI API.
// It typically enables integration of the Collabora online plugin.
package wopi

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"go.uber.org/zap"

	"github.com/pydio/cells/common"
	"github.com/pydio/cells/common/auth/claim"
	"github.com/pydio/cells/common/log"
	"github.com/pydio/cells/common/proto/tree"
	"github.com/pydio/cells/common/views"
)

type File struct {
	BaseFileName     string
	OwnerId          string
	Size             int64
	UserId           string
	Version          string
	UserFriendlyName string
	UserCanWrite     bool
	PydioPath        string
}

func getNodeInfos(w http.ResponseWriter, r *http.Request) {
	log.Logger(r.Context()).Debug("WOPI BACKEND - GetNode INFO", zap.Any("vars", mux.Vars(r)))

	w.Header().Set("Content-Type", "application/json; charset=UTF-8")

	n, err := findNodeFromRequest(r)
	if err != nil {
		log.Logger(r.Context()).Error("cannot find node from request", zap.Error(err))
		w.WriteHeader(http.StatusNotFound)
		return
	}

	f := buildFileFromNode(r.Context(), n)

	data, _ := json.Marshal(f)
	w.Write(data)
}

func download(w http.ResponseWriter, r *http.Request) {
	log.Logger(r.Context()).Debug("WOPI BACKEND - Download")

	n, err := findNodeFromRequest(r)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	read, err := viewsRouter.GetObject(r.Context(), n, &views.GetRequestData{StartOffset: 0, Length: -1})
	if err != nil {
		log.Logger(r.Context()).Error("cannot get object", zap.Error(err))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Length", fmt.Sprintf("%d", n.GetSize()))
	defer read.Close()
	written, err := io.Copy(w, read)
	if err != nil {
		log.Logger(r.Context()).Error("cannot write response", zap.Error(err))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	log.Logger(r.Context()).Debug("data sent to output", zap.Int64("Data Length", written))
}

func uploadStream(w http.ResponseWriter, r *http.Request) {
	log.Logger(r.Context()).Debug("WOPI BACKEND - Upload")
	w.Header().Set("Content-Type", "application/json; charset=UTF-8")

	n, err := findNodeFromRequest(r)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	var size int64
	if h, ok := r.Header["Content-Length"]; ok && len(h) > 0 {
		size, _ = strconv.ParseInt(h[0], 10, 64)
	}

	written, err := viewsRouter.PutObject(r.Context(), n, r.Body, &views.PutRequestData{
		Size: size,
	})
	if err != nil {
		log.Logger(r.Context()).Error("cannot put object", zap.Int64("already written data Length", written), zap.Error(err))
		if written == 0 {
			w.WriteHeader(http.StatusForbidden)
		} else {
			w.WriteHeader(http.StatusInternalServerError)
		}
		return
	}

	log.Logger(r.Context()).Debug("uploaded node", n.Zap(), zap.Int64("Data Length", written))
	w.WriteHeader(http.StatusOK)
}

func buildFileFromNode(ctx context.Context, n *tree.Node) *File {

	f := File{
		BaseFileName: n.GetStringMeta("name"),
		OwnerId:      "pydio", // TODO get an ownerID?
		Size:         n.GetSize(),
		Version:      fmt.Sprintf("%d", n.GetModTime().Unix()),
		PydioPath:    n.Path,
	}

	// Find user info in claims, if any
	if cValue := ctx.Value(claim.ContextKey); cValue != nil {
		if claims, ok := cValue.(claim.Claims); ok {

			f.UserId = claims.Name
			f.UserFriendlyName = claims.DisplayName

			pydioReadOnly := n.GetStringMeta(common.META_FLAG_READONLY)
			if pydioReadOnly == "true" {
				f.UserCanWrite = false
			} else {
				f.UserCanWrite = true
			}
		}
	} else {
		log.Logger(ctx).Debug("No Claims Found", zap.Any("ctx", ctx))
	}

	return &f
}

// findNodeFromRequest retrieves a node from the repository using the node id
// prefixed by the relevant workspace slug that is encoded in the current route
func findNodeFromRequest(r *http.Request) (*tree.Node, error) {

	vars := mux.Vars(r)
	uuid := vars["uuid"]
	if uuid == "" {
		return nil, fmt.Errorf("Cannot find uuid in parameters")
	}

	// Now go through all the authorization mechanisms
	resp, err := viewsRouter.ReadNode(r.Context(), &tree.ReadNodeRequest{
		Node: &tree.Node{Uuid: uuid},
	})
	if err != nil {
		log.Logger(r.Context()).Error("cannot retrieve node with uuid", zap.String(common.KEY_NODE_UUID, uuid), zap.Error(err))
		return nil, err
	}

	log.Logger(r.Context()).Debug("node retrieved from request with uuid", resp.Node.Zap())
	return resp.Node, nil
}
