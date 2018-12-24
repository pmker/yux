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
	"github.com/pmker/yux/common"
	"github.com/pmker/yux/common/service"
	"github.com/pmker/yux/data/templates"
	"github.com/pmker/yux/common/plugins"
)

func init() {
	plugins.Register(func() {
		service.NewService(
			service.Name(common.SERVICE_REST_NAMESPACE_+common.SERVICE_TEMPLATES),
			service.Tag(common.SERVICE_TAG_DATA),
			service.Description("RESTful Gateway to list templates"),
			service.RouterDependencies(),
			service.WithWeb(func() service.WebHandler {
				h := new(Handler)
				h.dao = templates.GetProvider()
				return h
			}),
		)
	})
}
