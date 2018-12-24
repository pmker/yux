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

package websocket

import (
	"context"
	"encoding/json"
	"strings"
	"sync"
	"time"

	"github.com/micro/go-micro/metadata"
	"github.com/micro/protobuf/jsonpb"
	"go.uber.org/zap"
	"gopkg.in/olahol/melody.v1"

	"github.com/pmker/yux/common"
	"github.com/pmker/yux/common/auth"
	"github.com/pmker/yux/common/auth/claim"
	"github.com/pmker/yux/common/log"
	"github.com/pmker/yux/common/proto/activity"
	"github.com/pmker/yux/common/proto/idm"
	"github.com/pmker/yux/common/proto/jobs"
	"github.com/pmker/yux/common/proto/tree"
	"github.com/pmker/yux/common/utils/meta"
	"github.com/pmker/yux/common/views"
)

type WebsocketHandler struct {
	Websocket   *melody.Melody
	EventRouter *views.RouterEventFilter

	batcherLock *sync.Mutex
	batchers    map[string]*NodeEventsBatcher
	dispatcher  chan *NodeChangeEventWithInfo
	done        chan string
}

func NewWebSocketHandler(serviceCtx context.Context) *WebsocketHandler {
	w := &WebsocketHandler{
		batchers:    make(map[string]*NodeEventsBatcher),
		dispatcher:  make(chan *NodeChangeEventWithInfo),
		done:        make(chan string),
		batcherLock: &sync.Mutex{},
	}
	w.InitHandlers(serviceCtx)
	go func() {
		for {
			select {
			case e := <-w.dispatcher:
				w.BroadcastNodeChangeEvent(context.Background(), e)
			case finished := <-w.done:
				w.batcherLock.Lock()
				delete(w.batchers, finished)
				w.batcherLock.Unlock()
			}
		}
	}()
	return w
}

func (w *WebsocketHandler) InitHandlers(serviceCtx context.Context) {

	w.Websocket = melody.New()
	w.Websocket.Config.MaxMessageSize = 2048

	w.Websocket.HandleError(func(session *melody.Session, i error) {
		if !strings.Contains(i.Error(), "close 1000 (normal)") {
			log.Logger(serviceCtx).Debug("HandleError", zap.Error(i))
		}
		ClearSession(session)
	})

	w.Websocket.HandleClose(func(session *melody.Session, i int, i2 string) error {
		ClearSession(session)
		return nil
	})

	w.Websocket.HandleMessage(func(session *melody.Session, bytes []byte) {

		msg := &Message{}
		e := json.Unmarshal(bytes, msg)
		if e != nil {
			session.CloseWithMsg(NewErrorMessage(e))
			return
		}
		switch msg.Type {
		case MsgSubscribe:

			if msg.JWT == "" {
				session.CloseWithMsg(NewErrorMessageString("empty jwt"))
				log.Logger(serviceCtx).Debug("empty jwt")
				return
			}
			ctx := context.Background()
			verifier := auth.DefaultJWTVerifier()
			_, claims, e := verifier.Verify(ctx, msg.JWT)
			if e != nil {
				log.Logger(serviceCtx).Error("invalid jwt received from websocket connection")
				session.CloseWithMsg(NewErrorMessage(e))
				return
			}
			UpdateSessionFromClaims(session, claims, w.EventRouter.GetClientsPool())

		case MsgUnsubscribe:

			ClearSession(session)

		default:
			return
		}

	})

}

func (w *WebsocketHandler) getBatcherForUuid(uuid string) *NodeEventsBatcher {
	var batcher *NodeEventsBatcher
	w.batcherLock.Lock()
	if b, ok := w.batchers[uuid]; ok {
		batcher = b
	} else {
		batcher = NewEventsBatcher(1*time.Second, uuid, w.dispatcher, w.done)
		w.batchers[uuid] = batcher
	}
	w.batcherLock.Unlock()
	return batcher
}

// HandleNodeChangeEvent listens to NodeChangeEvents and either broadcase them directly, or use NodeEventsBatcher
// to buffer them and flatten them into one.
func (w *WebsocketHandler) HandleNodeChangeEvent(ctx context.Context, event *tree.NodeChangeEvent) error {

	switch event.Type {
	case tree.NodeChangeEvent_UPDATE_META, tree.NodeChangeEvent_CREATE, tree.NodeChangeEvent_UPDATE_CONTENT:
		if event.Target != nil {
			batcher := w.getBatcherForUuid(event.Target.Uuid)
			batcher.in <- event
			return nil
		} else {
			e := &NodeChangeEventWithInfo{}
			e.NodeChangeEvent = *event
			return w.BroadcastNodeChangeEvent(ctx, e)
		}
	case tree.NodeChangeEvent_DELETE, tree.NodeChangeEvent_UPDATE_PATH:
		e := &NodeChangeEventWithInfo{}
		e.NodeChangeEvent = *event
		e.refreshTarget = true
		return w.BroadcastNodeChangeEvent(ctx, e)
	case tree.NodeChangeEvent_READ:
		// Ignore READ events
		return nil
	default:
		return nil
	}

}

// BroadcastNodeChangeEvent will browse the currently registered websocket sessions and decide whether to broadcast
// the event or not.
func (w *WebsocketHandler) BroadcastNodeChangeEvent(ctx context.Context, event *NodeChangeEventWithInfo) error {

	return w.Websocket.BroadcastFilter([]byte(`"dump"`), func(session *melody.Session) bool {

		value, ok := session.Get(SessionWorkspacesKey)
		if !ok || value == nil {
			return false
		}
		workspaces := value.(map[string]*idm.Workspace)
		var hasData bool

		var (
			metaCtx             context.Context
			metaProviderClients []tree.NodeProviderStreamer_ReadNodeStreamClient
			metaProviderNames   []string
			metaProvidersCloser meta.MetaProviderCloser
		)

		if event.refreshTarget && event.Target != nil {
			claims, _ := session.Get(SessionClaimsKey)
			uName, _ := session.Get(SessionUsernameKey)
			c, _ := json.Marshal(claims)
			metaCtx = metadata.NewContext(context.Background(), map[string]string{
				claim.MetadataContextKey:      string(c),
				common.PYDIO_CONTEXT_USER_KEY: uName.(string),
			})
			metaProviderClients, metaProvidersCloser, metaProviderNames = meta.InitMetaProviderClients(metaCtx, false)
			defer metaProvidersCloser()
			if respNode, err := w.EventRouter.GetClientsPool().GetTreeClient().ReadNode(ctx, &tree.ReadNodeRequest{Node: event.Target}); err == nil {
				event.Target = respNode.Node
			}
		}

		enrichedNodes := make(map[string]*tree.Node)
		for wsId, workspace := range workspaces {
			nTarget, t1 := w.EventRouter.WorkspaceCanSeeNode(ctx, workspace, event.Target)
			nSource, t2 := w.EventRouter.WorkspaceCanSeeNode(ctx, workspace, event.Source)
			// Depending on node, broadcast now
			if t1 || t2 {
				eType := event.Type
				if nTarget != nil {
					if event.refreshTarget {
						if metaNode, ok := enrichedNodes[nTarget.Uuid]; ok {
							for k, v := range metaNode.MetaStore {
								nTarget.MetaStore[k] = v
							}
						} else {
							metaNode = nTarget.Clone()
							meta.EnrichNodesMetaFromProviders(metaCtx, metaProviderClients, metaProviderNames, metaNode)
							for k, v := range metaNode.MetaStore {
								nTarget.MetaStore[k] = v
							}
							enrichedNodes[nTarget.Uuid] = metaNode
						}
					}
					nTarget.SetMeta("EventWorkspaceId", workspace.UUID)
					nTarget = nTarget.WithoutReservedMetas()
					log.Logger(ctx).Debug("Broadcasting event to this session for workspace", zap.Any("type", event.Type), zap.String("wsId", wsId), zap.Any("path", event.Target.Path))
				}
				if nSource != nil {
					nSource.SetMeta("EventWorkspaceId", workspace.UUID)
					nSource = nSource.WithoutReservedMetas()
				}
				// Eventually update event type if one node is out of scope
				if eType == tree.NodeChangeEvent_UPDATE_PATH {
					if nSource == nil {
						eType = tree.NodeChangeEvent_CREATE
					} else if nTarget == nil {
						eType = tree.NodeChangeEvent_DELETE
					}
				}
				// We have to filter the event for this context
				marshaler := &jsonpb.Marshaler{}
				s, _ := marshaler.MarshalToString(&tree.NodeChangeEvent{
					Type:   eType,
					Target: nTarget,
					Source: nSource,
				})
				data := []byte(s)

				session.Write(data)
				hasData = true
			}
		}

		return hasData
	})

}

// BroadcastTaskChangeEvent listens to tasks events and broadcast them to sessions with the adequate user.
func (w *WebsocketHandler) BroadcastTaskChangeEvent(ctx context.Context, event *jobs.TaskChangeEvent) error {

	taskOwner := event.TaskUpdated.TriggerOwner

	marshaller := jsonpb.Marshaler{}
	message, _ := marshaller.MarshalToString(event)
	return w.Websocket.BroadcastFilter([]byte(message), func(session *melody.Session) bool {
		var isAdmin, o bool
		var v interface{}
		if v, o = session.Get(SessionProfileKey); o && v == common.PYDIO_PROFILE_ADMIN {
			isAdmin = true
		}
		value, ok := session.Get(SessionUsernameKey)
		if !ok || value == nil {
			return false
		}
		isOwner := value.(string) == taskOwner || (taskOwner == common.PYDIO_SYSTEM_USERNAME && isAdmin)
		if isOwner {
			log.Logger(ctx).Debug("Should Broadcast Task Event : ", zap.Any("task", event.TaskUpdated), zap.Any("job", event.Job))
		} else {
			log.Logger(ctx).Debug("Owner was " + taskOwner + " while session user was " + value.(string))
		}
		return isOwner
	})

}

// BroadcastIDMChangeEvent listens to ACL events and broadcast them to sessions if the Role, User, or Workspace is concerned
// This triggers a registry reload in the UX (and eventually a change of permissions)
func (w *WebsocketHandler) BroadcastIDMChangeEvent(ctx context.Context, event *idm.ChangeEvent) error {

	marshaller := jsonpb.Marshaler{}
	event.JsonType = "idm"
	message, _ := marshaller.MarshalToString(event)
	return w.Websocket.BroadcastFilter([]byte(message), func(session *melody.Session) bool {

		var checkRoleId string
		var checkUserId string
		var checkWorkspaceId string
		if event.Acl != nil && event.Acl.RoleID != "" && !strings.HasPrefix(event.Acl.Action.Name, "parameter:") && !strings.HasPrefix(event.Acl.Action.Name, "action:") {
			checkRoleId = event.Acl.RoleID
		} else if event.Role != nil {
			checkRoleId = event.Role.Uuid
		} else if event.User != nil {
			checkUserId = event.User.Uuid
		} else if event.Workspace != nil {
			checkWorkspaceId = event.Workspace.UUID
		}

		if checkUserId != "" {
			if val, ok := session.Get(SessionUsernameKey); ok && val != nil {
				return checkUserId == val.(string)
			}
		}

		if checkRoleId != "" {
			if value, ok := session.Get(SessionRolesKey); ok && value != nil {
				roles := value.([]*idm.Role)
				for _, r := range roles {
					if r.Uuid == checkRoleId {
						return true
					}
				}
			}
		}

		if checkWorkspaceId != "" {
			if value, ok := session.Get(SessionWorkspacesKey); ok && value != nil {
				if _, has := value.(map[string]*idm.Workspace)[checkWorkspaceId]; has {
					return true
				}
			}
		}

		return false
	})

}

// BroadcastActivityEvent listens to activities and broadcast them to sessions with the adequate user.
func (w *WebsocketHandler) BroadcastActivityEvent(ctx context.Context, event *activity.PostActivityEvent) error {

	// Only handle "users inbox" events for now
	if event.BoxName != "inbox" && event.OwnerType != activity.OwnerType_USER {
		return nil
	}
	marshaller := jsonpb.Marshaler{}
	event.JsonType = "activity"
	message, _ := marshaller.MarshalToString(event)
	return w.Websocket.BroadcastFilter([]byte(message), func(session *melody.Session) bool {
		if val, ok := session.Get(SessionUsernameKey); ok && val != nil {
			return event.OwnerId == val.(string) && event.Activity.Actor.Id != val.(string)
		}
		return false
	})

}
