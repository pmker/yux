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

package mailer

import (
	"testing"

	. "github.com/smartystreets/goconvey/convey"

	"github.com/pydio/cells/common/config"
	"github.com/pydio/cells/common/proto/mailer"
)

const (
	// Put valid info below to test on your workstation.
	// Beware to *not* commit your personal sendGrid API key
	sendgridTestConfig_sender      = ""
	sendgridTestConfig_senderDN    = ""
	sendgridTestConfig_recipient   = ""
	sendgridTestConfig_recipientDN = ""
	sendgridTestConfig_apiKey      = ""
)

func TestSendgrid_Send(t *testing.T) {
	Convey("Test Sending with sendgrid", t, func() {

		// skip tests when no API key is defined
		if sendgridTestConfig_apiKey == "" {
			return
		}

		conf := config.NewMap()
		conf.Set("apiKey", sendgridTestConfig_apiKey)

		email := &mailer.Mail{}
		email.From = &mailer.User{
			Address: sendgridTestConfig_sender,
			Name:    sendgridTestConfig_senderDN,
		}
		email.To = []*mailer.User{{
			Address: sendgridTestConfig_recipient,
			Name:    sendgridTestConfig_recipientDN,
		}}

		email.Subject = "Test Email Sent from sendgrid via API"
		email.ContentPlain = "Hey, how are you ? This is now a success test."

		buildFromWelcomeTemplate(email, email.To[0])

		sendGrid := &SendGrid{}
		err := sendGrid.Configure(*conf)
		So(err, ShouldBeNil)

		err = sendGrid.Send(email)
		if sendgridTestConfig_apiKey == "" { // usual case when not in dev mode
			So(err, ShouldNotBeNil)
		} else {
			So(err, ShouldBeNil)
		}
	})
}
