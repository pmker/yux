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

	"github.com/micro/go-micro/client"

	"github.com/pydio/cells/common"
	"github.com/pydio/cells/common/proto/jobs"
	"github.com/pydio/cells/common/registry"
	"github.com/pydio/cells/scheduler/actions"
)

type PruneJobsAction struct{}

var (
	pruneJobsActionName = "actions.internal.prune-jobs"
)

// GetName returns this action unique identifier
func (c *PruneJobsAction) GetName() string {
	return pruneJobsActionName
}

// Init passes parameters to the action
func (c *PruneJobsAction) Init(job *jobs.Job, cl client.Client, action *jobs.Action) error {
	return nil
}

// Run the actual action code
func (c *PruneJobsAction) Run(ctx context.Context, channels *actions.RunnableChannels, input jobs.ActionMessage) (jobs.ActionMessage, error) {

	cli := jobs.NewJobServiceClient(registry.GetClient(common.SERVICE_JOBS))
	// Fix Stuck Tasks
	resp, e := cli.DetectStuckTasks(ctx, &jobs.DetectStuckTasksRequest{
		Since: 60 * 60 * 6,
	})
	if e != nil {
		return input.WithError(e), e
	}
	input.AppendOutput(&jobs.ActionOutput{
		Success:    true,
		StringBody: fmt.Sprintf("Pruned %d stuck jobs", len(resp.FixedTaskIds)),
	})

	// Prune number of tasks per jobs
	resp2, e := cli.DeleteTasks(ctx, &jobs.DeleteTasksRequest{
		Status: []jobs.TaskStatus{
			jobs.TaskStatus_Finished,
			jobs.TaskStatus_Interrupted,
		},
		PruneLimit: 1000,
	})
	if e != nil {
		return input.WithError(e), e
	}
	input.AppendOutput(&jobs.ActionOutput{
		Success:    true,
		StringBody: fmt.Sprintf("Pruned number of tasks to 1000 for each job (deleted %d tasks)", len(resp2.Deleted)),
	})

	// Prune cleanable jobs
	resp3, e := cli.DeleteJob(ctx, &jobs.DeleteJobRequest{CleanableJobs: true})
	if e != nil {
		return input.WithError(e), e
	}
	input.AppendOutput(&jobs.ActionOutput{
		Success:    true,
		StringBody: fmt.Sprintf("Deleted %d AutoClean jobs", resp3.DeleteCount),
	})

	return input, nil
}
