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

package tree

import (
	"context"
	"testing"

	. "github.com/smartystreets/goconvey/convey"

	"github.com/pydio/cells/common/proto/jobs"
	"github.com/pydio/cells/common/proto/tree"
	"github.com/pydio/cells/common/views"
	"github.com/pydio/cells/scheduler/actions"
)

func TestMetaAction_GetName(t *testing.T) {
	Convey("Test GetName", t, func() {
		metaAction := &MetaAction{}
		So(metaAction.GetName(), ShouldEqual, metaActionName)
	})
}

func TestMetaAction_Init(t *testing.T) {
	Convey("", t, func() {
		metaAction := &MetaAction{}
		job := &jobs.Job{}
		action := &jobs.Action{
			Parameters: map[string]string{
				"metaName":  "key",
				"metaValue": "value",
			},
		}
		metaAction.Init(job, nil, action)
		So(metaAction.MetaNamespace, ShouldEqual, "key")
		So(metaAction.MetaValue, ShouldEqual, "value")
	})
}

func TestMetaAction_Run(t *testing.T) {
	Convey("", t, func() {
		metaAction := &MetaAction{}
		job := &jobs.Job{}
		action := &jobs.Action{
			Parameters: map[string]string{
				"metaName":  "key",
				"metaValue": "value",
			},
		}
		metaAction.Init(job, nil, action)
		mock := views.NewHandlerMock()
		metaAction.Client = mock
		status := make(chan string)
		progress := make(chan float32)

		ignored, err := metaAction.Run(context.Background(), &actions.RunnableChannels{StatusMsg: status, Progress: progress}, jobs.ActionMessage{
			Nodes: []*tree.Node{},
		})
		So(ignored.GetLastOutput().Ignored, ShouldBeTrue)

		output, err := metaAction.Run(context.Background(), &actions.RunnableChannels{StatusMsg: status, Progress: progress}, jobs.ActionMessage{
			Nodes: []*tree.Node{&tree.Node{
				Path: "test",
			}},
		})
		close(status)
		close(progress)

		So(err, ShouldBeNil)
		So(output.Nodes, ShouldHaveLength, 1)
		So(output.Nodes[0].GetStringMeta("key"), ShouldEqual, "value")
		So(output.GetLastOutput().Success, ShouldBeTrue)

		So(mock.Nodes, ShouldHaveLength, 2)
		So(mock.Nodes["from"].GetStringMeta("key"), ShouldEqual, "value")
		So(mock.Nodes["to"].GetStringMeta("key"), ShouldEqual, "value")
	})
}
