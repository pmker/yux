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

// Package grpc wraps a Minio server for exposing the content of the datasource with the S3 protocol.
package grpc

import (
	"github.com/micro/go-micro"

	"github.com/pmker/yux/common"
	"github.com/pmker/yux/common/config"
	"github.com/pmker/yux/common/log"
	"github.com/pmker/yux/common/plugins"
	"github.com/pmker/yux/common/proto/object"
	"github.com/pmker/yux/common/service"
	"github.com/pmker/yux/common/service/context"
	"github.com/pmker/yux/common/utils"
)

func init() {

	plugins.Register(func() {

		sources := config.SourceNamesForDataServices(common.SERVICE_DATA_OBJECTS)

		for _, datasource := range sources {

			service.NewService(
				service.Name(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_DATA_OBJECTS_+datasource),
				service.Tag(common.SERVICE_TAG_DATASOURCE),
				service.Description("S3 Object service for a given datasource"),
				service.Source(datasource),
				service.Fork(true),
				service.Unique(true),
				service.AutoStart(false),
				service.WithMicro(func(m micro.Service) error {
					s := m.Options().Server
					serviceName := s.Options().Metadata["source"]

					engine := &ObjectHandler{}

					m.Init(micro.AfterStart(func() error {
						ctx := m.Options().Context
						log.Logger(ctx).Debug("AfterStart for Object service " + serviceName)
						var conf *object.MinioConfig
						if err := servicecontext.ScanConfig(ctx, &conf); err != nil {
							return err
						}
						if ip, e := utils.GetExternalIP(); e != nil {
							conf.RunningHost = "127.0.0.1"
						} else {
							conf.RunningHost = ip.String()
						}

						conf.RunningSecure = false

						engine.Config = conf
						log.Logger(ctx).Debug("Now starting minio server (" + serviceName + ")")
						go engine.StartMinioServer(ctx, serviceName)
						object.RegisterObjectsEndpointHandler(s, engine)

						return nil
					}))

					return nil
				}),
			)
		}
	})
}
