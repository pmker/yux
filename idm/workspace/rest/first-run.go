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
	"context"
	"time"

	"github.com/pborman/uuid"

	"fmt"

	"github.com/golang/protobuf/ptypes"
	"github.com/golang/protobuf/ptypes/any"
	"github.com/pmker/yux/common"
	"github.com/pmker/yux/common/config"
	"github.com/pmker/yux/common/log"
	"github.com/pmker/yux/common/micro"
	"github.com/pmker/yux/common/proto/idm"
	service2 "github.com/pmker/yux/common/service"
	"github.com/pmker/yux/common/service/proto"
	"github.com/pmker/yux/common/utils"
)

var (
	initialPolicies = []*service.ResourcePolicy{
		{Subject: "profile:standard", Action: service.ResourcePolicyAction_READ, Effect: service.ResourcePolicy_allow},
		{Subject: "profile:" + common.PYDIO_PROFILE_ADMIN, Action: service.ResourcePolicyAction_WRITE, Effect: service.ResourcePolicy_allow},
	}
)

// Detect datasources created during install and create workspaces on them
func FirstRun(ctx context.Context) error {

	<-time.After(8 * time.Second)

	var hasPersonal bool
	var commonDS string
	// List datasources from configs
	sources := config.SourceNamesForDataServices(common.SERVICE_DATA_INDEX)
	for _, s := range sources {
		if s == "personal" {
			hasPersonal = true
		} else if s == "cellsdata" {
			continue
		} else {
			commonDS = s
		}
	}
	if !hasPersonal && commonDS == "" {
		log.Logger(ctx).Info("No sources found at first run, skip automatic workspaces creation")
		return nil
	}

	wsClient := idm.NewWorkspaceServiceClient(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_WORKSPACE, defaults.NewClient())

	if hasPersonal {
		log.Logger(ctx).Info("Creating a Personal workspace")
		ws := &idm.Workspace{
			UUID:        uuid.NewUUID().String(),
			Label:       "Personal Files",
			Description: "User personal data",
			Slug:        "personal-files",
		}
		createWs(ctx, wsClient, ws, "my-files", "my-files")
	}

	if commonDS != "" {
		log.Logger(ctx).Info("Creating a Common Files workspace on " + commonDS)
		ws := &idm.Workspace{
			UUID:        uuid.NewUUID().String(),
			Label:       "Common Files",
			Description: "Data shared by all users",
			Slug:        "common-files",
		}
		createWs(ctx, wsClient, ws, "DATASOURCE:"+commonDS, commonDS)

	}

	return nil
}

func createWs(ctx context.Context, wsClient idm.WorkspaceServiceClient, ws *idm.Workspace, rootUuid string, rootPath string) error {

	ws.Scope = idm.WorkspaceScope_ADMIN
	ws.Policies = initialPolicies

	// First check if it does not already exists, for one reason or another
	q, _ := ptypes.MarshalAny(&idm.WorkspaceSingleQuery{
		Slug: ws.Slug,
	})
	rC, e := wsClient.SearchWorkspace(ctx, &idm.SearchWorkspaceRequest{Query: &service.Query{
		SubQueries: []*any.Any{q},
		Limit:      1,
	}})
	if e == nil {
		defer rC.Close()
		for {
			resp, er := rC.Recv()
			if er != nil {
				break
			}
			if resp != nil && resp.Workspace != nil {
				// Workspace was found, exit now, avoid creating duplicates
				log.Logger(ctx).Info(fmt.Sprintf("Ignoring creation of %s workspace as it already exists", ws.Label))
				return nil
			}
		}
	}

	if _, e := wsClient.CreateWorkspace(ctx, &idm.CreateWorkspaceRequest{Workspace: ws}); e != nil {
		return e
	}
	acls := []*idm.ACL{
		{NodeID: rootUuid, Action: utils.ACL_READ, RoleID: "ROOT_GROUP", WorkspaceID: ws.UUID},
		{NodeID: rootUuid, Action: utils.ACL_WRITE, RoleID: "ROOT_GROUP", WorkspaceID: ws.UUID},
		{NodeID: rootUuid, Action: &idm.ACLAction{Name: utils.ACL_WSROOT_ACTION_NAME, Value: rootPath}, WorkspaceID: ws.UUID},
		{NodeID: rootUuid, Action: utils.ACL_RECYCLE_ROOT, WorkspaceID: ws.UUID},
	}
	service2.Retry(func() error {
		log.Logger(ctx).Info("Settings ACLS for workspace")
		aclClient := idm.NewACLServiceClient(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_ACL, defaults.NewClient())
		for _, acl := range acls {
			_, e := aclClient.CreateACL(ctx, &idm.CreateACLRequest{ACL: acl})
			if e != nil {
				return e
			}
		}
		return nil
	}, 9*time.Second, 30*time.Second)

	return nil
}
