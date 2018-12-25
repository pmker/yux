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

package actions

import (
	"context"

	"github.com/micro/go-micro/client"
	"github.com/micro/go-micro/errors"
	"go.uber.org/zap"

	activity2 "github.com/pydio/cells/broker/activity"
	"github.com/pydio/cells/broker/activity/render"
	"github.com/pydio/cells/common"
	"github.com/pydio/cells/common/auth"
	"github.com/pydio/cells/common/config"
	"github.com/pydio/cells/common/log"
	"github.com/pydio/cells/common/proto/activity"
	"github.com/pydio/cells/common/proto/idm"
	"github.com/pydio/cells/common/proto/jobs"
	"github.com/pydio/cells/common/proto/mailer"
	"github.com/pydio/cells/common/utils/i18n"
	"github.com/pydio/cells/scheduler/actions"
)

const (
	digestActionName = "broker.activity.actions.mail-digest"
)

type MailDigestAction struct {
	mailerClient   mailer.MailerServiceClient
	activityClient activity.ActivityServiceClient
	userClient     idm.UserServiceClient
	dryRun         bool
	dryMail        string
}

// GetName returns the Unique Identifier of the MailDigestAction.
func (m *MailDigestAction) GetName() string {
	return digestActionName
}

// Init passes parameters to a newly created instance.
func (m *MailDigestAction) Init(job *jobs.Job, cl client.Client, action *jobs.Action) error {
	if dR, ok := action.Parameters["dryRun"]; ok && dR == "true" {
		m.dryRun = true
	}
	if email, ok := action.Parameters["dryMail"]; ok && email != "" {
		m.dryMail = email
	}
	m.mailerClient = mailer.NewMailerServiceClient(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_MAILER, cl)
	m.activityClient = activity.NewActivityServiceClient(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_ACTIVITY, cl)
	m.userClient = idm.NewUserServiceClient(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_USER, cl)
	return nil
}

// Run processes the actual action code
func (m *MailDigestAction) Run(ctx context.Context, channels *actions.RunnableChannels, input jobs.ActionMessage) (jobs.ActionMessage, error) {

	if len(input.Users) == 0 {
		e := errors.BadRequest(digestActionName, "action should be triggered with one user in input")
		return input.WithError(e), e
	}
	userObject := input.Users[0]
	ctx = auth.WithImpersonate(ctx, input.Users[0])

	var email, displayName string
	var has bool

	if email, has = userObject.Attributes["email"]; !has {
		// Ignoring as the user has no email address set up
		return input.WithIgnore(), nil
	}
	if displayName, has = userObject.Attributes["displayName"]; !has {
		displayName = userObject.Login
	}
	lang := i18n.UserLanguage(ctx, userObject, config.Default())

	query := &activity.StreamActivitiesRequest{
		Context:     activity.StreamContext_USER_ID,
		ContextData: userObject.Login,
		BoxName:     "inbox",
		AsDigest:    true,
	}

	streamer, e := m.activityClient.StreamActivities(ctx, query)
	if e != nil {
		output := input.WithError(e)
		return output, e
	}
	defer streamer.Close()
	var collection []*activity.Object
	for {
		resp, e := streamer.Recv()
		if e != nil {
			break
		}
		if resp == nil {
			continue
		}
		collection = append(collection, resp.Activity)
	}
	if len(collection) == 0 {
		input.AppendOutput(&jobs.ActionOutput{
			Ignored:    true,
			StringBody: "No activities to send",
		})
		return input, nil
	}

	digest, err := activity2.Digest(ctx, collection)
	if err != nil {
		return input.WithError(err), err
	}

	user := &mailer.User{
		Uuid:    userObject.Uuid,
		Address: email,
		Name:    displayName,
	}
	if m.dryRun && m.dryMail != "" {
		user.Address = m.dryMail
	}

	_, err = m.mailerClient.SendMail(ctx, &mailer.SendMailRequest{
		Mail: &mailer.Mail{
			TemplateId:      "Digest",
			ContentMarkdown: render.Markdown(digest, activity.SummaryPointOfView_GENERIC, lang),
			To:              []*mailer.User{user},
		},
	})
	if err != nil {
		log.Logger(ctx).Error("could not send digest email", zap.Error(err))
		return input.WithError(err), err
	}

	input.AppendOutput(&jobs.ActionOutput{
		Success:    true,
		StringBody: "Daily Digest sent to user " + userObject.Uuid,
	})
	if len(collection) > 0 && !m.dryRun {
		lastActivity := collection[0] // Activities are in reverse order, the first one is the last id
		_, err := m.activityClient.SetUserLastActivity(ctx, &activity.UserLastActivityRequest{
			ActivityId: lastActivity.Id,
			UserId:     userObject.Login,
			BoxName:    "lastsent",
		})
		if err != nil {
			return input.WithError(err), err
		}
	}
	return input, nil
}
