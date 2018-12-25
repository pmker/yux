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

func init() {
	// Ignore client pool for unit tests
	views.IsUnitTestEnv = true
}

func TestCopyMoveAction_GetName(t *testing.T) {
	Convey("Test GetName", t, func() {
		metaAction := &CopyMoveAction{}
		So(metaAction.GetName(), ShouldEqual, copyMoveActionName)
	})
}

func TestCopyMoveAction_Init(t *testing.T) {
	Convey("", t, func() {
		action := &CopyMoveAction{}
		job := &jobs.Job{}
		// Test action without parameters
		e := action.Init(job, nil, &jobs.Action{})
		So(e, ShouldNotBeNil)

		// Test action without empty target parameters
		e = action.Init(job, nil, &jobs.Action{
			Parameters: map[string]string{
				"paramName": "paramValue",
			},
		})
		So(e, ShouldNotBeNil)

		// Test action with parameters
		e = action.Init(job, nil, &jobs.Action{
			Parameters: map[string]string{
				"target": "target/path",
				"type":   "move",
				"create": "true",
			},
		})
		So(e, ShouldBeNil)
		So(action.TargetPlaceholder, ShouldEqual, "target/path")
		So(action.CreateFolder, ShouldBeTrue)
		So(action.Move, ShouldBeTrue)

	})
}

func TestCopyMoveAction_RunCopy(t *testing.T) {

	Convey("", t, func() {

		action := &CopyMoveAction{}
		job := &jobs.Job{}
		action.Init(job, nil, &jobs.Action{
			Parameters: map[string]string{
				"target": "target/path/moved",
				"type":   "copy",
				"create": "true",
			},
		})
		originalNode := &tree.Node{
			Path:      "path/to/original",
			Type:      tree.NodeType_LEAF,
			MetaStore: map[string]string{"name": `"original"`},
		}
		mock := &views.HandlerMock{
			Nodes: map[string]*tree.Node{"path/to/original": originalNode},
		}
		action.Client = mock
		status := make(chan string)
		progress := make(chan float32)

		ignored, err := action.Run(context.Background(), &actions.RunnableChannels{StatusMsg: status, Progress: progress}, jobs.ActionMessage{
			Nodes: []*tree.Node{},
		})
		So(ignored.GetLastOutput().Ignored, ShouldBeTrue)

		output, err := action.Run(context.Background(), &actions.RunnableChannels{StatusMsg: status, Progress: progress}, jobs.ActionMessage{
			Nodes: []*tree.Node{&tree.Node{
				Path:      "path/to/original",
				MetaStore: map[string]string{"name": `"original"`},
			}},
		})
		close(status)
		close(progress)

		So(err, ShouldBeNil)
		So(output.Nodes, ShouldHaveLength, 1)
		So(output.Nodes[0].Path, ShouldEqual, "target/path/moved")

		So(mock.Nodes, ShouldHaveLength, 4)
		So(mock.Nodes["from"].Path, ShouldEqual, "path/to/original")
		So(mock.Nodes["to"].Path, ShouldEqual, "target/path/moved")

	})
}

func TestCopyMoveAction_RunCopyOnItself(t *testing.T) {

	Convey("", t, func() {

		action := &CopyMoveAction{}
		job := &jobs.Job{}
		originalNode := &tree.Node{
			Path:      "path/to/original",
			Type:      tree.NodeType_LEAF,
			MetaStore: map[string]string{"name": `"original"`},
		}
		mock := &views.HandlerMock{
			Nodes: map[string]*tree.Node{"target/path/original": originalNode},
		}
		action.Client = mock

		action.Init(job, nil, &jobs.Action{
			Parameters: map[string]string{
				"target": "target/path/original",
				"type":   "copy",
				"create": "true",
			},
		})
		status := make(chan string)
		progress := make(chan float32)

		ignored, err := action.Run(context.Background(), &actions.RunnableChannels{StatusMsg: status, Progress: progress}, jobs.ActionMessage{
			Nodes: []*tree.Node{},
		})
		So(ignored.GetLastOutput().Ignored, ShouldBeTrue)

		output, err := action.Run(context.Background(), &actions.RunnableChannels{StatusMsg: status, Progress: progress}, jobs.ActionMessage{
			Nodes: []*tree.Node{&tree.Node{
				Path:      "target/path/original",
				MetaStore: map[string]string{"name": `"original"`},
			}},
		})
		close(status)
		close(progress)

		So(err, ShouldBeNil)
		So(output.Nodes, ShouldHaveLength, 1)
		So(output.Nodes[0].Path, ShouldEqual, "target/path/original")

		So(mock.Nodes, ShouldHaveLength, 1)

	})
}

func TestCopyMoveAction_RunMove(t *testing.T) {

	Convey("", t, func() {

		action := &CopyMoveAction{}
		job := &jobs.Job{}
		originalNode := &tree.Node{
			Path:      "path/to/original",
			Type:      tree.NodeType_LEAF,
			MetaStore: map[string]string{"name": `"original"`},
		}
		mock := &views.HandlerMock{
			Nodes: map[string]*tree.Node{"path/to/original": originalNode},
		}
		action.Client = mock
		action.Init(job, nil, &jobs.Action{
			Parameters: map[string]string{
				"target": "target/path/moved",
				"type":   "move",
				"create": "true",
			},
		})
		status := make(chan string)
		progress := make(chan float32)

		ignored, err := action.Run(context.Background(), &actions.RunnableChannels{StatusMsg: status, Progress: progress}, jobs.ActionMessage{
			Nodes: []*tree.Node{},
		})
		So(ignored.GetLastOutput().Ignored, ShouldBeTrue)

		output, err := action.Run(context.Background(), &actions.RunnableChannels{StatusMsg: status, Progress: progress}, jobs.ActionMessage{
			Nodes: []*tree.Node{&tree.Node{
				Path: "path/to/original",
			}},
		})
		close(status)
		close(progress)

		So(err, ShouldBeNil)
		So(output.Nodes, ShouldHaveLength, 1)
		So(output.Nodes[0].Path, ShouldEqual, "target/path/moved")

		So(mock.Nodes, ShouldHaveLength, 3)
		So(mock.Nodes["from"].Path, ShouldEqual, "path/to/original")
		So(mock.Nodes["to"].Path, ShouldEqual, "target/path/moved")
		// Deleted Node
		So(mock.Nodes["in"].Path, ShouldEqual, "path/to/original")

	})
}
