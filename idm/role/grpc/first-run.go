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

package grpc

import (
	"context"
	"encoding/json"
	"time"

	"fmt"

	"github.com/pmker/yux/common"
	"github.com/pmker/yux/common/config"
	"github.com/pmker/yux/common/log"
	"github.com/pmker/yux/common/proto/idm"
	service2 "github.com/pmker/yux/common/service"
	"github.com/pmker/yux/common/service/context"
	"github.com/pmker/yux/common/micro"
	"github.com/pmker/yux/common/service/proto"
	"github.com/pmker/yux/common/utils"
	"github.com/pmker/yux/idm/role"
)

type insertRole struct {
	Role *idm.Role
	Acls []*idm.ACL
}

var (
	rootPolicies = []*service.ResourcePolicy{
		{
			Action:  service.ResourcePolicyAction_READ,
			Subject: "*",
			Effect:  service.ResourcePolicy_allow,
		},
		{
			Action:  service.ResourcePolicyAction_WRITE,
			Subject: "profile:" + common.PYDIO_PROFILE_ADMIN,
			Effect:  service.ResourcePolicy_allow,
		},
	}
	externalPolicies = []*service.ResourcePolicy{
		{
			Action:  service.ResourcePolicyAction_READ,
			Subject: "*",
			Effect:  service.ResourcePolicy_allow,
		},
		{
			Action:  service.ResourcePolicyAction_WRITE,
			Subject: "profile:" + common.PYDIO_PROFILE_STANDARD,
			Effect:  service.ResourcePolicy_allow,
		},
	}
)

func InitRoles(ctx context.Context) error {

	<-time.After(3 * time.Second)

	lang := config.Default().Get("defaults", "language").String("en-us")
	langJ, _ := json.Marshal(lang)

	insertRoles := []*insertRole{
		{
			Role: &idm.Role{
				Uuid:      "ROOT_GROUP",
				Label:     "Root Group",
				GroupRole: true,
				Policies:  rootPolicies,
			},
			Acls: []*idm.ACL{
				{RoleID: "ROOT_GROUP", Action: utils.ACL_READ, WorkspaceID: "homepage", NodeID: "homepage-ROOT"},
				{RoleID: "ROOT_GROUP", Action: utils.ACL_WRITE, WorkspaceID: "homepage", NodeID: "homepage-ROOT"},
				{RoleID: "ROOT_GROUP", Action: &idm.ACLAction{Name: "parameter:core.conf:lang", Value: string(langJ)}, WorkspaceID: "PYDIO_REPO_SCOPE_ALL"},
			},
		},
		{
			Role: &idm.Role{
				Uuid:        "ADMINS",
				Label:       "Administrators",
				AutoApplies: []string{common.PYDIO_PROFILE_ADMIN},
				Policies:    rootPolicies,
			},
			Acls: []*idm.ACL{
				{RoleID: "ADMINS", Action: utils.ACL_READ, WorkspaceID: "settings", NodeID: "settings-ROOT"},
				{RoleID: "ADMINS", Action: utils.ACL_WRITE, WorkspaceID: "settings", NodeID: "settings-ROOT"},
			},
		},
		{
			Role: &idm.Role{
				Uuid:        "EXTERNAL_USERS",
				Label:       "External Users",
				AutoApplies: []string{common.PYDIO_PROFILE_SHARED},
				Policies:    externalPolicies,
			},
			Acls: []*idm.ACL{
				{RoleID: "EXTERNAL_USERS", Action: utils.ACL_DENY, WorkspaceID: "homepage", NodeID: "homepage-ROOT"},
				{RoleID: "EXTERNAL_USERS", Action: &idm.ACLAction{Name: "action:action.share:share", Value: "false"}, WorkspaceID: "PYDIO_REPO_SCOPE_ALL"},
				{RoleID: "EXTERNAL_USERS", Action: &idm.ACLAction{Name: "action:action.share:share-edit-shared", Value: "false"}, WorkspaceID: "PYDIO_REPO_SCOPE_ALL"},
				{RoleID: "EXTERNAL_USERS", Action: &idm.ACLAction{Name: "action:action.share:open_user_shares", Value: "false"}, WorkspaceID: "PYDIO_REPO_SCOPE_ALL"},
				{RoleID: "EXTERNAL_USERS", Action: &idm.ACLAction{Name: "action:action.user:open_address_book", Value: "false"}, WorkspaceID: "PYDIO_REPO_SCOPE_ALL"},
				{RoleID: "EXTERNAL_USERS", Action: &idm.ACLAction{Name: "parameter:core.auth:USER_CREATE_CELLS", Value: "false"}, WorkspaceID: "PYDIO_REPO_SCOPE_ALL"},
			},
		},
		{
			Role: &idm.Role{
				Uuid:     "MINISITE",
				Label:    "Minisite Permissions",
				Policies: rootPolicies,
			},
			Acls: []*idm.ACL{
				{RoleID: "MINISITE", Action: &idm.ACLAction{Name: "action:action.share:share", Value: "false"}, WorkspaceID: "PYDIO_REPO_SCOPE_SHARED"},
				{RoleID: "MINISITE", Action: &idm.ACLAction{Name: "action:action.share:share-edit-shared", Value: "false"}, WorkspaceID: "PYDIO_REPO_SCOPE_SHARED"},
			},
		},
		{
			Role: &idm.Role{
				Uuid:     "MINISITE_NODOWNLOAD",
				Label:    "Minisite (Download Disabled)",
				Policies: rootPolicies,
			},
			Acls: []*idm.ACL{
				{RoleID: "MINISITE_NODOWNLOAD", Action: &idm.ACLAction{Name: "action:access.gateway:download", Value: "false"}, WorkspaceID: "PYDIO_REPO_SCOPE_SHARED"},
				{RoleID: "MINISITE_NODOWNLOAD", Action: &idm.ACLAction{Name: "action:access.gateway:download_folder", Value: "false"}, WorkspaceID: "PYDIO_REPO_SCOPE_SHARED"},
			},
		},
	}

	var e error
	for _, insert := range insertRoles {
		dao := servicecontext.GetDAO(ctx).(role.DAO)
		var update bool
		_, update, e = dao.Add(insert.Role)
		if e != nil {
			break
		}
		if update {
			continue
		}
		log.Logger(ctx).Info(fmt.Sprintf("Created default role %s", insert.Role.Label))
		if e = dao.AddPolicies(false, insert.Role.Uuid, insert.Role.Policies); e == nil {
			log.Logger(ctx).Info(fmt.Sprintf(" - Policies added for role %s", insert.Role.Label))
		} else {
			break
		}
		e = service2.Retry(func() error {
			aclClient := idm.NewACLServiceClient(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_ACL, defaults.NewClient())
			for _, acl := range insert.Acls {
				_, e := aclClient.CreateACL(ctx, &idm.CreateACLRequest{ACL: acl})
				if e != nil {
					return e
				}
			}
			log.Logger(ctx).Info(fmt.Sprintf(" - ACLS set for role %s", insert.Role.Label))
			return nil
		}, 8*time.Second, 50*time.Second)
	}

	return e
}

func UpgradeTo12(ctx context.Context) error {

	<-time.After(3 * time.Second)

	insertRoles := []*insertRole{
		{
			Role: &idm.Role{
				Uuid:     "MINISITE",
				Label:    "Minisite Permissions",
				Policies: rootPolicies,
			},
			Acls: []*idm.ACL{
				{RoleID: "MINISITE", Action: &idm.ACLAction{Name: "action:action.share:share", Value: "false"}, WorkspaceID: "PYDIO_REPO_SCOPE_SHARED"},
				{RoleID: "MINISITE", Action: &idm.ACLAction{Name: "action:action.share:share-edit-shared", Value: "false"}, WorkspaceID: "PYDIO_REPO_SCOPE_SHARED"},
			},
		},
		{
			Role: &idm.Role{
				Uuid:     "MINISITE_NODOWNLOAD",
				Label:    "Minisite (Download Disabled)",
				Policies: rootPolicies,
			},
			Acls: []*idm.ACL{
				{RoleID: "MINISITE_NODOWNLOAD", Action: &idm.ACLAction{Name: "action:access.gateway:download", Value: "false"}, WorkspaceID: "PYDIO_REPO_SCOPE_SHARED"},
				{RoleID: "MINISITE_NODOWNLOAD", Action: &idm.ACLAction{Name: "action:access.gateway:download_folder", Value: "false"}, WorkspaceID: "PYDIO_REPO_SCOPE_SHARED"},
			},
		},
	}

	var e error
	for _, insert := range insertRoles {
		dao := servicecontext.GetDAO(ctx).(role.DAO)
		var update bool
		_, update, e = dao.Add(insert.Role)
		if e != nil {
			break
		}
		if update {
			continue
		}
		log.Logger(ctx).Info(fmt.Sprintf("Created role %s", insert.Role.Label))
		if e = dao.AddPolicies(false, insert.Role.Uuid, insert.Role.Policies); e == nil {
			log.Logger(ctx).Info(fmt.Sprintf(" - Policies added for role %s", insert.Role.Label))
		} else {
			break
		}
		e = service2.Retry(func() error {
			aclClient := idm.NewACLServiceClient(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_ACL, defaults.NewClient())
			for _, acl := range insert.Acls {
				_, e := aclClient.CreateACL(ctx, &idm.CreateACLRequest{ACL: acl})
				if e != nil {
					return e
				}
			}
			log.Logger(ctx).Info(fmt.Sprintf(" - ACLS set for role %s", insert.Role.Label))
			return nil
		}, 8*time.Second, 50*time.Second)
	}

	return e
}
