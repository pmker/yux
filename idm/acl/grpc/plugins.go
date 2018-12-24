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

// Package grpc provides a service for storing and CRUD-ing ACLs
package grpc

import (
	"github.com/micro/go-micro"
	"github.com/pmker/yux/common"
	"github.com/pmker/yux/common/proto/idm"
	"github.com/pmker/yux/common/proto/tree"
	"github.com/pmker/yux/common/service"
	"github.com/pmker/yux/idm/acl"
	"github.com/pmker/yux/common/plugins"
)

func init() {
	plugins.Register(func() {
		service.NewService(
			service.Name(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_ACL),
			service.Tag(common.SERVICE_TAG_IDM),
			service.Description("Access Control List service"),
			service.WithStorage(acl.NewDAO, "idm_acl"),
			service.Migrations([]*service.Migration{
				{
					TargetVersion: service.ValidVersion("1.2.0"),
					Up:            UpgradeTo120,
				},
			}),
			service.WithMicro(func(m micro.Service) error {
				m.Init(micro.Metadata(map[string]string{"MetaProvider": "stream"}))
				handler := new(Handler)
				idm.RegisterACLServiceHandler(m.Server(), handler)
				tree.RegisterNodeProviderStreamerHandler(m.Server(), handler)

				// Clean acls on Ws or Roles deletion
				m.Server().Subscribe(m.Server().NewSubscriber(common.TOPIC_IDM_EVENT, &WsRolesCleaner{handler}))

				// Clean acls on Nodes deletion
				m.Server().Subscribe(m.Server().NewSubscriber(common.TOPIC_TREE_CHANGES, &NodesCleaner{Handler: handler}))

				return nil
			}),
		)
	})
}
