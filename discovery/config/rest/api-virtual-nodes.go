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

package rest

import (
	"github.com/emicklei/go-restful"

	"github.com/golang/protobuf/jsonpb"
	"github.com/pmker/yux/common"
	"github.com/pmker/yux/common/proto/docstore"
	"github.com/pmker/yux/common/proto/rest"
	"github.com/pmker/yux/common/proto/tree"
	"github.com/pmker/yux/common/service"
	"github.com/pmker/yux/common/micro"
)

/****************************
VERSIONING POLICIES MANAGEMENT
*****************************/

// ListVersioningPolicies list all defined policies.
func (s *Handler) ListVirtualNodes(req *restful.Request, resp *restful.Response) {
	//T := lang.Bundle().GetTranslationFunc(utils.UserLanguagesFromRestRequest(req)...)
	dc := docstore.NewDocStoreClient(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_DOCSTORE, defaults.NewClient())
	docs, er := dc.ListDocuments(req.Request.Context(), &docstore.ListDocumentsRequest{
		StoreID: common.DOCSTORE_ID_VIRTUALNODES,
	})
	if er != nil {
		service.RestError500(req, resp, er)
		return
	}
	defer docs.Close()
	response := &rest.NodesCollection{}
	for {
		r, e := docs.Recv()
		if e != nil {
			break
		}
		var vNode tree.Node
		if er := jsonpb.UnmarshalString(r.Document.Data, &vNode); er == nil {
			response.Children = append(response.Children, &vNode)
		}
	}
	resp.WriteEntity(response)
}
