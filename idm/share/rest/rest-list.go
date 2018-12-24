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
	"fmt"

	"github.com/emicklei/go-restful"
	"github.com/golang/protobuf/ptypes"
	"github.com/golang/protobuf/ptypes/any"

	"context"

	"github.com/pmker/yux/common"
	"github.com/pmker/yux/common/auth"
	"github.com/pmker/yux/common/auth/claim"
	"github.com/pmker/yux/common/log"
	"github.com/pmker/yux/common/proto/idm"
	"github.com/pmker/yux/common/proto/rest"
	"github.com/pmker/yux/common/proto/tree"
	"github.com/pmker/yux/common/registry"
	"github.com/pmker/yux/common/service"
	"github.com/pmker/yux/common/micro"
	service2 "github.com/pmker/yux/common/service/proto"
	"github.com/pmker/yux/common/utils"
	"github.com/pmker/yux/common/views"
	"go.uber.org/zap"
)

// ListSharedResources implements the corresponding Rest API operation
func (h *SharesHandler) ListSharedResources(req *restful.Request, rsp *restful.Response) {

	var request rest.ListSharedResourcesRequest
	if e := req.ReadEntity(&request); e != nil {
		service.RestError500(req, rsp, e)
		return
	}

	ctx := req.Request.Context()
	var subjects []string
	admin := false
	var userId string
	if claims, ok := ctx.Value(claim.ContextKey).(claim.Claims); ok {
		admin = claims.Profile == common.PYDIO_PROFILE_ADMIN
		userId, _ = claims.DecodeUserUuid()
	}
	if request.Subject != "" {
		if !admin {
			service.RestError403(req, rsp, fmt.Errorf("only admins can specify a subject"))
			return
		}
		subjects = append(subjects, request.Subject)
	} else {
		var e error
		if subjects, e = auth.SubjectsForResourcePolicyQuery(ctx, &rest.ResourcePolicyQuery{Type: rest.ResourcePolicyQuery_CONTEXT}); e != nil {
			service.RestError500(req, rsp, e)
			return
		}
	}

	var qs []*any.Any
	if request.ShareType == rest.ListSharedResourcesRequest_CELLS || request.ShareType == rest.ListSharedResourcesRequest_ANY {
		q, _ := ptypes.MarshalAny(&idm.WorkspaceSingleQuery{Scope: idm.WorkspaceScope_ROOM})
		qs = append(qs, q)
	}
	if request.ShareType == rest.ListSharedResourcesRequest_LINKS || request.ShareType == rest.ListSharedResourcesRequest_ANY {
		q, _ := ptypes.MarshalAny(&idm.WorkspaceSingleQuery{Scope: idm.WorkspaceScope_LINK})
		qs = append(qs, q)
	}

	cl := idm.NewWorkspaceServiceClient(registry.GetClient(common.SERVICE_WORKSPACE))
	streamer, err := cl.SearchWorkspace(ctx, &idm.SearchWorkspaceRequest{
		Query: &service2.Query{
			SubQueries: qs,
			Operation:  service2.OperationType_OR,
			ResourcePolicyQuery: &service2.ResourcePolicyQuery{
				Subjects: subjects,
			},
		},
	})
	if err != nil {
		service.RestError500(req, rsp, err)
		return
	}
	defer streamer.Close()
	response := &rest.ListSharedResourcesResponse{}
	workspaces := map[string]*idm.Workspace{}
	var workspaceIds []string
	for {
		resp, e := streamer.Recv()
		if e != nil {
			break
		}
		if request.OwnedBySubject && !h.MatchPolicies(ctx, resp.Workspace.UUID, resp.Workspace.Policies, service2.ResourcePolicyAction_OWNER, userId) {
			continue
		}
		workspaces[resp.Workspace.UUID] = resp.Workspace
		workspaceIds = append(workspaceIds, resp.Workspace.UUID)
	}

	if len(workspaces) == 0 {
		rsp.WriteEntity(response)
		return
	}

	acls, e := utils.GetACLsForWorkspace(ctx, workspaceIds, utils.ACL_READ, utils.ACL_WRITE, utils.ACL_POLICY)
	if e != nil {
		service.RestError500(req, rsp, e)
		return
	}

	// Map roots to objects
	roots := make(map[string]map[string]*idm.Workspace)
	var detectedRoots []string
	for _, acl := range acls {
		if acl.NodeID == "" {
			continue
		}
		if _, has := roots[acl.NodeID]; !has {
			roots[acl.NodeID] = make(map[string]*idm.Workspace)
			detectedRoots = append(detectedRoots, acl.NodeID)
		}
		if ws, ok := workspaces[acl.WorkspaceID]; ok {
			roots[acl.NodeID][acl.WorkspaceID] = ws
		}
	}
	var rootNodes map[string]*tree.Node
	if request.Subject != "" {
		rootNodes = h.LoadAdminRootNodes(ctx, detectedRoots)
	} else {
		rootNodes = h.LoadDetectedRootNodes(ctx, detectedRoots)
	}

	// Build resources
	for nodeId, node := range rootNodes {
		resource := &rest.ListSharedResourcesResponse_SharedResource{
			Node: node,
		}
		for _, ws := range roots[nodeId] {
			if ws.Scope == idm.WorkspaceScope_LINK {
				resource.Link = &rest.ShareLink{
					Uuid:                    ws.UUID,
					Label:                   ws.Label,
					Description:             ws.Description,
					Policies:                ws.Policies,
					PoliciesContextEditable: h.IsContextEditable(ctx, ws.UUID, ws.Policies),
				}
			} else {
				resource.Cells = append(resource.Cells, &rest.Cell{
					Uuid:                    ws.UUID,
					Label:                   ws.Label,
					Description:             ws.Description,
					Policies:                ws.Policies,
					PoliciesContextEditable: h.IsContextEditable(ctx, ws.UUID, ws.Policies),
				})
			}
		}
		response.Resources = append(response.Resources, resource)
	}

	rsp.WriteEntity(response)

}

// LoadDetectedRootNodes find actual nodes in the tree, and enrich their metadata if they appear
// in many workspaces for the current user.
func (h *SharesHandler) LoadAdminRootNodes(ctx context.Context, detectedRoots []string) (rootNodes map[string]*tree.Node) {

	rootNodes = make(map[string]*tree.Node)
	router := views.NewUuidRouter(views.RouterOptions{AdminView: true})
	metaClient := tree.NewNodeProviderClient(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_META, defaults.NewClient())
	for _, rootId := range detectedRoots {
		request := &tree.ReadNodeRequest{Node: &tree.Node{Uuid: rootId}}
		if resp, err := router.ReadNode(ctx, request); err == nil {
			node := resp.Node
			if metaResp, e := metaClient.ReadNode(ctx, request); e == nil {
				var isRoomNode bool
				if metaResp.GetNode().GetMeta("CellNode", &isRoomNode); err == nil && isRoomNode {
					node.SetMeta("CellNode", true)
				}
			}
			rootNodes[node.GetUuid()] = node.WithoutReservedMetas()
		} else {
			log.Logger(ctx).Error("Share Load - Ignoring Root Node, probably deleted", zap.String("nodeId", rootId), zap.Error(err))
		}
	}
	return

}
