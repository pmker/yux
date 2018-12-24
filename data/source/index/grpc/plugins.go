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

// Package grpc provides a pydio GRPC service for CRUD-ing the datasource index.
//
// It uses an SQL-based persistence layer for storing all nodes in the nested-set format in DB.
package grpc

import (
	"strings"

	"github.com/micro/go-micro"

	"github.com/pmker/yux/common"
	"github.com/pmker/yux/common/config"
	"github.com/pmker/yux/common/plugins"
	"github.com/pmker/yux/common/proto/object"
	"github.com/pmker/yux/common/proto/tree"
	"github.com/pmker/yux/common/service"
	"github.com/pmker/yux/data/source/index"
)

func init() {

	plugins.Register(func() {

		sources := config.SourceNamesForDataServices(common.SERVICE_DATA_INDEX)

		for _, source := range sources {

			name := common.SERVICE_DATA_INDEX_ + source

			service.NewService(
				service.Name(common.SERVICE_GRPC_NAMESPACE_+name),
				service.Tag(common.SERVICE_TAG_DATASOURCE),
				service.Description("Datasource indexation service"),
				service.Source(source),
				service.Fork(true),
				service.AutoStart(false),
				service.WithStorage(index.NewDAO, func(s service.Service) string {
					// Returning a prefix for the dao
					return strings.Replace(name, ".", "_", -1)
				}),
				service.WithMicro(func(m micro.Service) error {

					server := m.Server()
					source := server.Options().Metadata["source"]

					engine := NewTreeServer(source)
					tree.RegisterNodeReceiverHandler(m.Options().Server, engine)
					tree.RegisterNodeProviderHandler(m.Options().Server, engine)
					tree.RegisterNodeReceiverStreamHandler(m.Options().Server, engine)
					tree.RegisterNodeProviderStreamerHandler(m.Options().Server, engine)
					tree.RegisterSessionIndexerHandler(m.Options().Server, engine)
					object.RegisterResourceCleanerEndpointHandler(m.Options().Server, engine)

					return nil
				}),
			)
		}
	})
}
