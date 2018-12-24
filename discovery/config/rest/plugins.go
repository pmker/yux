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

// Package rest implements the REST api for managing configurations
package rest

import (
	"github.com/pmker/yux/common"
	"github.com/pmker/yux/common/service"
	"github.com/pmker/yux/common/plugins"
)

func init() {
	plugins.Register(func() {
		service.NewService(
			service.Name(common.SERVICE_REST_NAMESPACE_+common.SERVICE_CONFIG),
			service.Tag(common.SERVICE_TAG_DISCOVERY),
			service.Description("Configuration"),
			service.Dependency(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_CONFIG, []string{}),
			service.WithWeb(func() service.WebHandler {
				return new(Handler)
			}),
		)
	})
}
