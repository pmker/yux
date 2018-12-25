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

package timer

import (
	"context"

	"github.com/micro/go-micro/client"
	"go.uber.org/zap"

	"github.com/pydio/cells/common"
	"github.com/pydio/cells/common/log"
	"github.com/pydio/cells/common/proto/jobs"
	"github.com/pydio/cells/common/registry"
)

// EventProducer gathers all ScheduleWaiters in a pool and provides a single entry point
// to communicate with them, typically to stop them.
type EventProducer struct {
	Context context.Context

	Waiters   map[string]*ScheduleWaiter
	EventChan chan *jobs.JobTriggerEvent
	StopChan  chan bool
}

// NewEventProducer creates a pool of ScheduleWaiters that will send events based on pre-defined scheduling.
func NewEventProducer(rootCtx context.Context) *EventProducer {
	e := &EventProducer{
		Waiters:   make(map[string]*ScheduleWaiter),
		StopChan:  make(chan bool, 1),
		EventChan: make(chan *jobs.JobTriggerEvent),
	}

	e.Context = context.WithValue(rootCtx, common.PYDIO_CONTEXT_USER_KEY, common.PYDIO_SYSTEM_USERNAME)

	go func() {
		defer close(e.StopChan)
		defer close(e.EventChan)

		for {
			select {
			case event := <-e.EventChan:
				log.Logger(e.Context).Debug("Sending Timer Event", zap.Any("event", event))
				client.Publish(e.Context, client.NewPublication(common.TOPIC_TIMER_EVENT, event))
			case <-e.StopChan:
				return
			}
		}
	}()

	return e
}

// Start loads all TimersOnly Jobs from the job repository and registers them in this EventProducer pool.
func (e *EventProducer) Start() error {

	// Load all schedules
	cli := jobs.NewJobServiceClient(registry.GetClient(common.SERVICE_JOBS))
	streamer, err := cli.ListJobs(e.Context, &jobs.ListJobsRequest{TimersOnly: true})
	if err != nil {
		return err
	}

	// Iterate through the registered jobs
	for {
		resp, err := streamer.Recv()
		if err != nil {
			break
		}
		if resp == nil {
			continue
		}
		log.Logger(e.Context).Info("Registering Job", zap.String("job", resp.Job.ID))
		e.StartOrUpdateJob(resp.Job)
	}
	return nil
}

// StopAll ranges all waiters from the EventProducer, calls Stop() and remove them from the Waiter pool.
func (e *EventProducer) StopAll() {
	for jId, w := range e.Waiters {
		w.Stop()
		delete(e.Waiters, jId)
	}
	e.StopChan <- true
}

// StopWaiter stops a waiter given its ID and remove it from the Waiter pool.
// If no waiter with this ID is registered, it returns silently.
func (e *EventProducer) StopWaiter(jobId string) {
	if w, ok := e.Waiters[jobId]; ok {
		w.Stop()
		delete(e.Waiters, jobId)
	}
}

// StartOrUpdateJob creates a ScheduleWaiter and registers it in the EventProducer pool.
// If a waiter already exists for the same job ID it will be stopped and replaced with a new one.
func (e *EventProducer) StartOrUpdateJob(job *jobs.Job) {

	// Stop if already running
	jobId := job.ID
	e.StopWaiter(jobId)

	schedule := job.Schedule
	waiter := NewScheduleWaiter(jobId, schedule, e.EventChan)
	waiter.Start()
	e.Waiters[jobId] = waiter
}
