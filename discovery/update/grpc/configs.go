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

package grpc

import (
	"github.com/pmker/yux/common"
	"github.com/pmker/yux/common/forms"
	"github.com/pmker/yux/discovery/update/lang"
)

var ExposedConfigs = &forms.Form{
	I18NBundle: lang.Bundle(),
	Groups: []*forms.Group{{
		Label: "Update.Config.Title",
		Fields: []forms.Field{
			&forms.FormField{
				Name:        "updateUrl",
				Type:        forms.ParamString,
				Label:       "Update.Config.Url.Label",
				Description: "Update.Config.Url.Description",
				Default:     common.UpdateDefaultServerUrl,
			},
			&forms.FormField{
				Name:        "publicKey",
				Type:        forms.ParamTextarea,
				Label:       "Update.Config.PublicKey.Label",
				Description: "Update.Config.PublicKey.Description",
				Default:     common.UpdateDefaultPublicKey,
			},
			&forms.FormField{
				Name:        "channel",
				Type:        forms.ParamSelect,
				Label:       "Update.Config.Channel.Label",
				Description: "Update.Config.Channel.Description",
				ChoicePresetList: []map[string]string{
					{"stable": "Update.Config.Channel.ValueStable"},
					{"dev": "Update.Config.Channel.ValueDev"},
				},
				Default:   common.UpdateDefaultChannel,
				Mandatory: true,
			},
			/*
				&forms.FormField{
					Name:        "proxyHost",
					Type:        forms.ParamString,
					Label:       "Update.Config.ProxyHost.Label",
					Description: "Update.Config.ProxyHost.Description",
				},
				&forms.FormField{
					Name:        "proxyUser",
					Type:        forms.ParamString,
					Label:       "Update.Config.ProxyUser.Label",
					Description: "Update.Config.ProxyUser.Description",
				},
				&forms.FormField{
					Name:        "proxyPassword",
					Type:        forms.ParamPassword,
					Label:       "Update.Config.ProxyPassword.Label",
					Description: "Update.Config.ProxyPassword.Description",
				},
			*/
		},
	}},
}
