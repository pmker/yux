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

// Package templates defines ready-to-use templates to send email in a nice formatting.
//
// It is based on the Hermes package, and other services can use some specific templates Ids when sending emails
// to apply the formatting.
package templates

import (
	"fmt"

	"github.com/matcornic/hermes"
	"github.com/pmker/yux/broker/mailer/lang"
	"github.com/pmker/yux/common/proto/mailer"
)

func GetHermes(languages ...string) hermes.Hermes {

	configs := GetApplicationConfig(languages...)
	return hermes.Hermes{
		Theme: configs.Theme,
		Product: hermes.Product{
			Name:        configs.Title,
			Link:        configs.Url,
			Logo:        configs.Logo,
			TroubleText: configs.TroubleText,
			Copyright:   configs.Copyright,
		},
	}

}

func BuildTemplateWithId(user *mailer.User, templateId string, templateData map[string]string, languages ...string) (subject string, body hermes.Body) {

	T := lang.Bundle().GetTranslationFunc(languages...)
	configs := GetApplicationConfig(languages...)
	var intros, outros []string
	var actions []hermes.Action
	if templateData == nil {
		templateData = map[string]string{}
	}

	i18nTemplateData := struct {
		TplData map[string]string
		User    *mailer.User
		Configs ApplicationConfigs
	}{
		TplData: templateData,
		User:    user,
		Configs: configs,
	}

	// Try to get intros/outros from bundle.
	// If T function returns the ID, the string is not present.
	introId := fmt.Sprintf("Mail.%s.Intros", templateId)
	outroId := fmt.Sprintf("Mail.%s.Outros", templateId)
	if T(introId) != introId {
		intros = append(intros, T(introId, i18nTemplateData))
	}
	if T(outroId) != outroId {
		outros = append(outros, T(outroId, i18nTemplateData))
	}

	// Init button with link if needed
	actionLabelId := fmt.Sprintf("Mail.%s.LinkLabel", templateId)
	if T(actionLabelId) != actionLabelId {
		var link string
		if linkPath, has := templateData["LinkPath"]; has {
			link = fmt.Sprintf("%s%s", configs.Url, linkPath)
		} else if linkFull, has := templateData["LinkUrl"]; has {
			link = linkFull
		} else {
			link = configs.Url
		}
		instructions := ""
		actionInstructionId := fmt.Sprintf("Mail.%s.LinkInstructions", templateId)
		if T(actionInstructionId) != actionInstructionId {
			instructions = T(actionInstructionId, i18nTemplateData)
		}
		actions = append(actions, hermes.Action{
			Button: hermes.Button{
				Link:  link,
				Text:  T(actionLabelId, i18nTemplateData),
				Color: configs.ButtonsColor,
			},
			Instructions: instructions,
		})
	}

	body = hermes.Body{
		Name:      user.Name,
		Greeting:  configs.Greeting,
		Signature: configs.Signature,
		Intros:    intros,
		Outros:    outros,
		Actions:   actions,
	}

	subject = T(fmt.Sprintf("Mail.%s.Subject", templateId), i18nTemplateData)

	return

}
