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

// Package api starts the actual WebSocket service
package api

import (
	"context"

	"github.com/gin-gonic/gin"
	"github.com/micro/go-micro"
	"github.com/pmker/yux/common/plugins"

	"github.com/pmker/yux/common"
	"github.com/pmker/yux/common/micro"
	"github.com/pmker/yux/common/proto/activity"
	chat2 "github.com/pmker/yux/common/proto/chat"
	"github.com/pmker/yux/common/proto/idm"
	"github.com/pmker/yux/common/proto/jobs"
	"github.com/pmker/yux/common/proto/tree"
	"github.com/pmker/yux/common/service"
	"github.com/pmker/yux/common/views"
	"github.com/pmker/yux/gateway/websocket"
)

var (
	ws   *websocket.WebsocketHandler
	chat *websocket.ChatHandler
)

func init() {
	plugins.Register(func() {
		service.NewService(
			service.Name(common.SERVICE_GATEWAY_NAMESPACE_+common.SERVICE_WEBSOCKET),
			service.Tag(common.SERVICE_TAG_GATEWAY),
			service.Dependency(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_CHAT, []string{}),
			service.Description("WebSocket server pushing event to the clients"),
			service.WithGeneric(func(ctx context.Context, cancel context.CancelFunc) (service.Runner, service.Checker, service.Stopper, error) {
				return service.RunnerFunc(func() error {
						return nil
					}), service.CheckerFunc(func() error {
						return nil
					}), service.StopperFunc(func() error {
						return nil
					}), nil

			}, func(s service.Service) (micro.Option, error) {

				ctx := s.Options().Context
				srv := defaults.NewHTTPServer()

				ws = websocket.NewWebSocketHandler(ctx)
				ws.EventRouter = views.NewRouterEventFilter(views.RouterOptions{WatchRegistry: true})

				gin.SetMode(gin.ReleaseMode)
				gin.DisableConsoleColor()
				Server := gin.New()
				Server.Use(gin.Recovery())
				Server.GET("/event", func(c *gin.Context) {
					ws.Websocket.HandleRequest(c.Writer, c.Request)
				})

				chat = websocket.NewChatHandler(ctx)
				Server.GET("/chat", func(c *gin.Context) {
					chat.Websocket.HandleRequest(c.Writer, c.Request)
				})

				hd := srv.NewHandler(Server)

				err := srv.Handle(hd)
				if err != nil {
					return nil, err
				}

				return micro.Server(srv), nil
			}),
		)

		service.NewService(
			service.Name(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_WEBSOCKET),
			service.Tag(common.SERVICE_TAG_GATEWAY),
			service.Dependency(common.SERVICE_GATEWAY_NAMESPACE_+common.SERVICE_WEBSOCKET, []string{}),
			service.Description("WebSocket server subscribing to messages"),
			service.WithMicro(func(m micro.Service) error {
				// Register Subscribers
				treeChangeListener := func(ctx context.Context, msg *tree.NodeChangeEvent) error {
					return ws.HandleNodeChangeEvent(ctx, msg)
				}
				taskChangeListener := func(ctx context.Context, msg *jobs.TaskChangeEvent) error {
					return ws.BroadcastTaskChangeEvent(ctx, msg)
				}
				idmChangeListener := func(ctx context.Context, msg *idm.ChangeEvent) error {
					return ws.BroadcastIDMChangeEvent(ctx, msg)
				}
				activityListener := func(ctx context.Context, msg *activity.PostActivityEvent) error {
					return ws.BroadcastActivityEvent(ctx, msg)
				}

				eventSrv := m.Options().Server

				if err := eventSrv.Subscribe(eventSrv.NewSubscriber(common.TOPIC_TREE_CHANGES, treeChangeListener)); err != nil {
					return err
				}
				if err := eventSrv.Subscribe(eventSrv.NewSubscriber(common.TOPIC_META_CHANGES, treeChangeListener)); err != nil {
					return err
				}
				if err := eventSrv.Subscribe(eventSrv.NewSubscriber(common.TOPIC_JOB_TASK_EVENT, taskChangeListener)); err != nil {
					return err
				}
				if err := eventSrv.Subscribe(eventSrv.NewSubscriber(common.TOPIC_IDM_EVENT, idmChangeListener)); err != nil {
					return err
				}
				if err := eventSrv.Subscribe(eventSrv.NewSubscriber(common.TOPIC_ACTIVITY_EVENT, activityListener)); err != nil {
					return err
				}

				// Register Chat Subscribers
				chatEventsListener := func(ctx context.Context, msg *chat2.ChatEvent) error {
					return chat.BroadcastChatMessage(ctx, msg)
				}
				if err := eventSrv.Subscribe(eventSrv.NewSubscriber(common.TOPIC_CHAT_EVENT, chatEventsListener)); err != nil {
					return err
				}

				return nil
			}),
		)
	})
}
