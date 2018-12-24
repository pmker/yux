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

package auth

import (
	"context"
	"fmt"
	"time"

	"github.com/micro/go-micro/client"

	"github.com/pmker/yux/common"
	"github.com/pmker/yux/common/config"
	"github.com/pmker/yux/common/log"
	"github.com/pmker/yux/common/proto/auth"
	"github.com/pmker/yux/common/proto/docstore"
	"github.com/pmker/yux/common/proto/jobs"
	"github.com/pmker/yux/common/registry"
	"github.com/pmker/yux/common/service"
	"github.com/pmker/yux/common/utils/i18n"
	"github.com/pmker/yux/idm/auth/lang"
	"github.com/pmker/yux/scheduler/actions"
)

func init() {
	actions.GetActionsManager().Register(pruneTokensActionName, func() actions.ConcreteAction {
		return &PruneTokensAction{}
	})
}

func InsertPruningJob(ctx context.Context) error {

	log.Logger(ctx).Info("Inserting pruning job for revoked token and reset password tokens")
	T := lang.Bundle().GetTranslationFunc(i18n.GetDefaultLanguage(config.Default()))

	return service.Retry(func() error {

		cli := jobs.NewJobServiceClient(registry.GetClient(common.SERVICE_JOBS))
		_, e := cli.PutJob(ctx, &jobs.PutJobRequest{Job: &jobs.Job{
			ID:    pruneTokensActionName,
			Owner: common.PYDIO_SYSTEM_USERNAME,
			Label: T("Auth.PruneJob.Title"),
			Schedule: &jobs.Schedule{
				Iso8601Schedule: "R/2012-06-04T19:25:16.828696-07:00/PT5M", // Every 5 minutes
			},
			AutoStart:      false,
			MaxConcurrency: 1,
			Actions: []*jobs.Action{{
				ID: "actions.auth.prune.tokens",
			}},
		}})

		return e
	})
}

type PruneTokensAction struct{}

var (
	pruneTokensActionName = "actions.auth.prune.tokens"
)

// Unique identifier
func (c *PruneTokensAction) GetName() string {
	return pruneTokensActionName
}

// Pass parameters
func (c *PruneTokensAction) Init(job *jobs.Job, cl client.Client, action *jobs.Action) error {
	return nil
}

// Run the actual action code
func (c *PruneTokensAction) Run(ctx context.Context, channels *actions.RunnableChannels, input jobs.ActionMessage) (jobs.ActionMessage, error) {

	T := lang.Bundle().GetTranslationFunc(i18n.GetDefaultLanguage(config.Default()))

	output := input

	// Prune revoked tokens
	cli := auth.NewAuthTokenRevokerClient(registry.GetClient(common.SERVICE_AUTH))
	if pruneResp, e := cli.PruneTokens(ctx, &auth.PruneTokensRequest{}); e != nil {
		return input.WithError(e), e
	} else {
		output.AppendOutput(&jobs.ActionOutput{
			Success:    true,
			StringBody: T("Auth.PruneJob.Revoked", struct{ Count int }{Count: len(pruneResp.Tokens)}),
		})
	}

	// Prune reset password tokens
	docCli := docstore.NewDocStoreClient(registry.GetClient(common.SERVICE_DOCSTORE))
	deleteResponse, er := docCli.DeleteDocuments(ctx, &docstore.DeleteDocumentsRequest{
		StoreID: "resetPasswordKeys",
		Query: &docstore.DocumentQuery{
			MetaQuery: fmt.Sprintf("expiration<%d", time.Now().Unix()),
		},
	})
	if er != nil {
		return output.WithError(er), er
	} else {
		output.AppendOutput(&jobs.ActionOutput{
			Success:    true,
			StringBody: T("Auth.PruneJob.ResetToken", deleteResponse),
		})
	}

	return output, nil
}
