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

package main

import (
	"github.com/pmker/yux/cmd"

	// Making sure they are initialised first
	_ "github.com/pmker/yux/discovery/consul"
	_ "github.com/pmker/yux/discovery/nats"

	//_ "github.com/pmker/yux/discovery/config/grpc"
	//_ "github.com/pmker/yux/discovery/config/rest"
	//_ "github.com/pmker/yux/discovery/install/rest"
	//_ "github.com/pmker/yux/discovery/update/grpc"
	//_ "github.com/pmker/yux/discovery/update/rest"
	//
	//_ "github.com/pmker/yux/broker/activity/grpc"
	//_ "github.com/pmker/yux/broker/activity/rest"
	//_ "github.com/pmker/yux/broker/chat/grpc"
	//_ "github.com/pmker/yux/broker/log/grpc"
	//_ "github.com/pmker/yux/broker/log/rest"
	//_ "github.com/pmker/yux/broker/mailer/grpc"
	//_ "github.com/pmker/yux/broker/mailer/rest"
	//_ "github.com/pmker/yux/frontend/front-srv/rest"
	//_ "github.com/pmker/yux/frontend/front-srv/web"
	//
	//_ "github.com/pmker/yux/data/changes/grpc"
	//_ "github.com/pmker/yux/data/changes/rest"
	//_ "github.com/pmker/yux/data/docstore/grpc"
	//_ "github.com/pmker/yux/data/key/grpc"
	//_ "github.com/pmker/yux/data/meta/grpc"
	//_ "github.com/pmker/yux/data/meta/rest"
	//_ "github.com/pmker/yux/data/source/index/grpc"
	//_ "github.com/pmker/yux/data/source/objects/grpc"
	//_ "github.com/pmker/yux/data/source/sync/grpc"
	//_ "github.com/pmker/yux/data/source/test"
	//_ "github.com/pmker/yux/data/templates/rest"
	//_ "github.com/pmker/yux/data/tree/grpc"
	//_ "github.com/pmker/yux/data/tree/rest"
	//_ "github.com/pmker/yux/data/versions/grpc"
	//
	//_ "github.com/pmker/yux/discovery/config/grpc"
	//_ "github.com/pmker/yux/discovery/config/rest"
	//
	//_ "github.com/pmker/yux/gateway/data"
	//_ "github.com/pmker/yux/gateway/dav"
	//_ "github.com/pmker/yux/gateway/micro"
	//_ "github.com/pmker/yux/gateway/proxy"
	//_ "github.com/pmker/yux/gateway/websocket/api"
	//_ "github.com/pmker/yux/gateway/wopi"
	//
	//_ "github.com/pmker/yux/data/search/grpc"
	//_ "github.com/pmker/yux/data/search/rest"
	//_ "github.com/pmker/yux/idm/acl/grpc"
	//_ "github.com/pmker/yux/idm/acl/rest"
	//_ "github.com/pmker/yux/idm/auth/grpc"
	//_ "github.com/pmker/yux/idm/auth/rest"
	//_ "github.com/pmker/yux/idm/auth/web"
	//_ "github.com/pmker/yux/idm/graph/rest"
	//_ "github.com/pmker/yux/idm/key/grpc"
	//_ "github.com/pmker/yux/idm/meta/grpc"
	//_ "github.com/pmker/yux/idm/meta/rest"
	//_ "github.com/pmker/yux/idm/policy/grpc"
	//_ "github.com/pmker/yux/idm/policy/rest"
	//_ "github.com/pmker/yux/idm/role/grpc"
	//_ "github.com/pmker/yux/idm/role/rest"
	//_ "github.com/pmker/yux/idm/share/rest"
	//_ "github.com/pmker/yux/idm/user/grpc"
	//_ "github.com/pmker/yux/idm/user/rest"
	//_ "github.com/pmker/yux/idm/workspace/grpc"
	//_ "github.com/pmker/yux/idm/workspace/rest"
	//_ "github.com/pmker/yux/scheduler/jobs/grpc"
	//_ "github.com/pmker/yux/scheduler/jobs/rest"
	//_ "github.com/pmker/yux/scheduler/tasks/grpc"
	//_ "github.com/pmker/yux/scheduler/timer/grpc"
	//
	//// All Actions for scheduler
	//_ "github.com/pmker/yux/broker/activity/actions"
	//_ "github.com/pmker/yux/scheduler/actions/archive"
	//_ "github.com/pmker/yux/scheduler/actions/changes"
	//_ "github.com/pmker/yux/scheduler/actions/cmd"
	//_ "github.com/pmker/yux/scheduler/actions/images"
	//_ "github.com/pmker/yux/scheduler/actions/scheduler"
	//_ "github.com/pmker/yux/scheduler/actions/tree"

	"github.com/pmker/yux/common"
)

func main() {
	common.PackageType = "PydioHome"
	common.PackageLabel = "Pydio Cells Home Edition"
	cmd.Execute()
}
