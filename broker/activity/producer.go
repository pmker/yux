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

package activity

import (
	"time"

	"github.com/golang/protobuf/ptypes/timestamp"
	"github.com/pydio/cells/common/proto/activity"
	"github.com/pydio/cells/common/proto/tree"
)

func DocumentActivity(author string, event *tree.NodeChangeEvent) (ac *activity.Object, detectedNode *tree.Node) {

	ac = createObject()
	ac.Name = "File Event"
	switch event.Type {
	case tree.NodeChangeEvent_CREATE:
		// log.Printf("CREATE %v", event.Type)
		ac.Type = activity.ObjectType_Create
		if event.Target.IsLeaf() {
			ac.Object = &activity.Object{
				Type: activity.ObjectType_Document,
			}
		} else {
			ac.Object = &activity.Object{
				Type: activity.ObjectType_Folder,
			}
		}
		ac.Object.Name = event.Target.Path
		ac.Object.Id = event.Target.Uuid
		detectedNode = event.Target
		break
	case tree.NodeChangeEvent_READ:
		// log.Printf("CREATE %v", event.Type)
		ac.Type = activity.ObjectType_Read
		if event.Target.IsLeaf() {
			ac.Object = &activity.Object{
				Type: activity.ObjectType_Document,
			}
		} else {
			ac.Object = &activity.Object{
				Type: activity.ObjectType_Folder,
			}
		}
		ac.Object.Name = event.Target.Path
		ac.Object.Id = event.Target.Uuid
		detectedNode = event.Target
		break
	case tree.NodeChangeEvent_DELETE:
		// log.Printf("DELETE %v", event.Type)
		ac.Type = activity.ObjectType_Delete
		if event.Source.IsLeaf() {
			ac.Object = &activity.Object{
				Type: activity.ObjectType_Document,
			}
		} else {
			ac.Object = &activity.Object{
				Type: activity.ObjectType_Folder,
			}
		}
		ac.Object.Name = event.Source.Path
		ac.Object.Id = event.Source.Uuid
		detectedNode = event.Source
		break
	case tree.NodeChangeEvent_UPDATE_PATH:
		// log.Printf("MOVE %v", event.Type)
		ac.Type = activity.ObjectType_Move
		ac.Object = &activity.Object{
			Type: activity.ObjectType_Document,
			Name: event.Target.Path,
			Id:   event.Target.Uuid,
		}
		ac.Origin = &activity.Object{
			Type: activity.ObjectType_Document,
			Name: event.Source.Path,
			Id:   event.Source.Uuid,
		}
		ac.Target = &activity.Object{
			Type: activity.ObjectType_Document,
			Name: event.Target.Path,
			Id:   event.Target.Uuid,
		}
		detectedNode = event.Target
		break
	case tree.NodeChangeEvent_UPDATE_CONTENT, tree.NodeChangeEvent_UPDATE_META:
		// log.Printf("UPDATE %v", event.Type)
		ac.Type = activity.ObjectType_Update
		ac.Object = &activity.Object{
			Type: activity.ObjectType_Document,
			Name: event.Target.Path,
			Id:   event.Target.Uuid,
		}
		detectedNode = event.Target
		break
	}

	ac.Actor = &activity.Object{
		Type: activity.ObjectType_Person,
		Name: author,
		Id:   author,
	}

	ac.Updated = &timestamp.Timestamp{
		Seconds: time.Now().Unix(),
	}

	return ac, detectedNode

}
