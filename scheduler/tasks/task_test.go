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

package tasks

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/cskr/pubsub"
	"github.com/micro/protobuf/ptypes"
	. "github.com/smartystreets/goconvey/convey"

	"github.com/pydio/cells/common/proto/jobs"
	"github.com/pydio/cells/common/proto/tree"

	// registered default scheduler actions
	_ "github.com/pydio/cells/scheduler/actions/scheduler"
)

func TestMain(m *testing.M) {
	PubSub = pubsub.New(1)
	m.Run()
}

func TestNewTaskFromEvent(t *testing.T) {

	Convey("Test New Task From Event", t, func() {
		event := &jobs.JobTriggerEvent{JobID: "ajob"}
		task := NewTaskFromEvent(context.Background(), &jobs.Job{ID: "ajob"}, event)
		So(task, ShouldNotBeNil)
		ev, _ := ptypes.MarshalAny(event)
		msg := jobs.ActionMessage{
			Event: ev,
		}
		So(task.lockedTask, ShouldNotBeNil)
		So(task, ShouldResemble, &Task{
			context:        context.Background(),
			Job:            &jobs.Job{ID: "ajob"},
			lock:           &sync.RWMutex{},
			initialMessage: msg,
			lockedTask: &jobs.Task{
				ID:            task.lockedTask.ID,
				JobID:         "ajob",
				Status:        jobs.TaskStatus_Queued,
				StatusMessage: "Pending",
				ActionsLogs:   []*jobs.ActionLog{},
			},
		})

	})
}

func TestTaskSetters(t *testing.T) {

	Convey("Test task Setters", t, func() {

		event := &jobs.JobTriggerEvent{JobID: "ajob"}
		task := NewTaskFromEvent(context.Background(), &jobs.Job{ID: "ajob"}, event)
		So(task, ShouldNotBeNil)

		task.Add(2)
		So(task.RC, ShouldEqual, 2)
		task.Done(1)
		So(task.RC, ShouldEqual, 1)
		task.Done(1)
		So(task.RC, ShouldEqual, 0)

		now := time.Now()
		stamp := int32(now.Unix())
		task.SetStartTime(now)
		task.SetEndTime(now)
		So(task.lockedTask.StartTime, ShouldEqual, stamp)
		So(task.lockedTask.EndTime, ShouldEqual, stamp)

		task.SetStatus(jobs.TaskStatus_Running)
		So(task.lockedTask.Status, ShouldEqual, 2)

		task.SetStatus(jobs.TaskStatus_Finished)
		So(task.lockedTask.Status, ShouldEqual, 3)

		task.Add(1)
		task.SetStatus(jobs.TaskStatus_Finished)
		So(task.lockedTask.Status, ShouldEqual, 2)

		task.SetProgress(0.23)
		So(task.lockedTask.Progress, ShouldEqual, 0.23)

	})

}

func TestTaskLogs(t *testing.T) {

	Convey("Test task Append Log", t, func() {

		event := &jobs.JobTriggerEvent{JobID: "ajob"}
		ev, _ := ptypes.MarshalAny(&jobs.JobTriggerEvent{JobID: "ajob"})
		task := NewTaskFromEvent(context.Background(), &jobs.Job{ID: "ajob"}, event)
		So(task, ShouldNotBeNil)

		a := jobs.Action{
			ID: "fake",
			ChainedActions: []*jobs.Action{
				{
					ID: "followingAction",
				},
			},
		}

		in := jobs.ActionMessage{
			Event: ev,
			OutputChain: []*jobs.ActionOutput{
				{Success: true},
				{Success: false},
			},
		}

		out := jobs.ActionMessage{
			Event: ev,
			OutputChain: []*jobs.ActionOutput{
				{Success: true},
				{Success: false},
				{Success: true, StringBody: "last output"},
			},
		}

		task.AppendLog(a, in, out)

		So(task.lockedTask.ActionsLogs, ShouldHaveLength, 1)
		log := task.lockedTask.ActionsLogs[0]
		So(log.Action, ShouldResemble, &jobs.Action{ID: "fake"})
		So(log.InputMessage, ShouldResemble, &jobs.ActionMessage{})
		So(log.OutputMessage, ShouldResemble, &jobs.ActionMessage{
			OutputChain: []*jobs.ActionOutput{
				{Success: true, StringBody: "last output"},
			},
		})
		// Verify inputs were not modified
		So(a.ChainedActions, ShouldHaveLength, 1)
		So(in.OutputChain, ShouldHaveLength, 2)
		So(out.OutputChain, ShouldHaveLength, 3)
	})
}

func TestTaskEvents(t *testing.T) {

	Convey("Test task Events", t, func() {

		event := &jobs.JobTriggerEvent{JobID: "ajob"}
		ev, _ := ptypes.MarshalAny(event)
		task := NewTaskFromEvent(context.Background(), &jobs.Job{ID: "ajob"}, event)
		So(task.initialMessage.Event, ShouldResemble, ev)

		event2 := &tree.NodeChangeEvent{
			Type:   tree.NodeChangeEvent_CREATE,
			Target: &tree.Node{Path: "create"},
		}
		_, _ = ptypes.MarshalAny(event2)
		task = NewTaskFromEvent(context.Background(), &jobs.Job{ID: "ajob"}, event2)
		So(task.initialMessage.Nodes, ShouldHaveLength, 1)
		So(task.initialMessage.Nodes[0], ShouldResemble, &tree.Node{Path: "create"})

		event3 := &tree.NodeChangeEvent{
			Type:   tree.NodeChangeEvent_DELETE,
			Source: &tree.Node{Path: "delete"},
		}
		_, _ = ptypes.MarshalAny(event3)
		task = NewTaskFromEvent(context.Background(), &jobs.Job{ID: "ajob"}, event3)
		So(task.initialMessage.Nodes, ShouldHaveLength, 1)
		So(task.initialMessage.Nodes[0], ShouldResemble, &tree.Node{Path: "delete"})

	})
}

func TestTask_Save(t *testing.T) {

	Convey("Test task Save", t, func() {

		event := &jobs.JobTriggerEvent{JobID: "ajob"}
		task := NewTaskFromEvent(context.Background(), &jobs.Job{ID: "ajob"}, event)
		ch := PubSub.Sub(PubSubTopicTaskStatuses)
		task.Save()
		read := <-ch
		So(read, ShouldEqual, task.lockedTask)

	})
}

func TestTask_EnqueueRunnables(t *testing.T) {

	Convey("Test Enqueue Runnables", t, func(c C) {

		saveChannel := PubSub.Sub(PubSubTopicTaskStatuses)
		output := make(chan Runnable, 1)
		event := &jobs.JobTriggerEvent{JobID: "ajob"}
		task := NewTaskFromEvent(context.Background(), &jobs.Job{
			ID: "ajob",
			Actions: []*jobs.Action{
				&jobs.Action{ID: "actions.test.fake"},
			},
		}, event)

		task.EnqueueRunnables(nil, output)
		read := <-output
		So(read, ShouldNotBeNil)
		So(read.Action, ShouldResemble, jobs.Action{ID: "actions.test.fake"})
		close(output)

		go func() {
			err := read.RunAction(nil)
			fmt.Println(err.Error())
			// c.So(err, ShouldBeNil)
		}()

		saved := <-saveChannel
		So(saved, ShouldNotBeNil)
		So(saved, ShouldEqual, task.lockedTask)

	})

	Convey("Test task without Impl", t, func() {

		output := make(chan Runnable, 1)
		event := &jobs.JobTriggerEvent{JobID: "ajob"}
		task := NewTaskFromEvent(context.Background(), &jobs.Job{
			ID: "ajob",
			Actions: []*jobs.Action{
				{ID: "unknown action"},
			},
		}, event)

		task.EnqueueRunnables(nil, output)
		read := <-output
		So(read, ShouldNotBeNil)
		So(read.Action, ShouldResemble, jobs.Action{ID: "unknown action"})
		close(output)

		go read.RunAction(nil)

	})

}
