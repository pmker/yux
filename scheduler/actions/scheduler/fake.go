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

package scheduler

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/micro/go-micro/client"

	"github.com/pydio/cells/common/log"
	"github.com/pydio/cells/common/proto/jobs"
	"github.com/pydio/cells/scheduler/actions"
)

var (
	fakeActionName = "actions.test.fake"
)

type FakeAction struct {
	timer  int64
	ticker int64
}

// GetName returns this action unique identifier
func (f *FakeAction) GetName() string {
	return fakeActionName
}

// Implement ControllableAction
func (f *FakeAction) CanPause() bool {
	return true
}

// Implement ControllableAction
func (f *FakeAction) CanStop() bool {
	return true
}

// ProvidesProgress mocks ProgressProviderAction interface method
func (f *FakeAction) ProvidesProgress() bool {
	return true
}

// Init passes parameters to the action
func (f *FakeAction) Init(job *jobs.Job, cl client.Client, action *jobs.Action) error {
	f.timer = 10
	f.ticker = 3
	if strTime, ok := action.Parameters["timer"]; ok {
		if timer, err := strconv.ParseInt(strTime, 10, 64); err == nil {
			f.timer = timer
		}
	}
	if strTime, ok := action.Parameters["ticker"]; ok {
		if ticker, err := strconv.ParseInt(strTime, 10, 64); err == nil {
			f.ticker = ticker
		}
	}
	return nil
}

// Run the actual action code
func (f *FakeAction) Run(ctx context.Context, channels *actions.RunnableChannels, input jobs.ActionMessage) (jobs.ActionMessage, error) {

	log.Logger(ctx).Info("Starting FAKE task")
	outputMessage := input
	outputMessage.AppendOutput(&jobs.ActionOutput{StringBody: "Hello World"})
	ticker := time.NewTicker(time.Second * time.Duration(f.ticker))
	go func() {
		time.Sleep(time.Second * time.Duration(f.timer))
		ticker.Stop()
	}()
	steps := float32(f.timer) / float32(f.ticker)
	step := float32(0)

loop:
	for {
		select {
		case t := <-ticker.C:
			channels.Progress <- step * 100 / steps
			step++
			channels.StatusMsg <- fmt.Sprintf("Ticking Now %v", t)
		case <-channels.Pause:
			log.Logger(ctx).Info("fake task received pause from channels, should pause here")
			<-channels.BlockUntilResume()
			log.Logger(ctx).Info("blockuntilresume passed, received resume, continue")
		case <-channels.Stop:
			log.Logger(ctx).Info("received stop from channels")
			ticker.Stop()
			break loop
		}
	}

	return outputMessage, nil
}
