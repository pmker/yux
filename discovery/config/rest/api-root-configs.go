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

package rest

import (
	"encoding/json"
	"strings"

	"github.com/emicklei/go-restful"
	"go.uber.org/zap"

	"github.com/pmker/yux/common/config"
	"github.com/pmker/yux/common/log"
	"github.com/pmker/yux/common/proto/rest"
	"github.com/pmker/yux/common/service"
	"github.com/pmker/yux/common/utils"
)

/*********************
GENERIC GET/PUT CALLS
*********************/
func (s *Handler) PutConfig(req *restful.Request, resp *restful.Response) {

	ctx := req.Request.Context()
	var configuration rest.Configuration
	if err := req.ReadEntity(&configuration); err != nil {
		service.RestError500(req, resp, err)
		return
	}
	u, _ := utils.FindUserNameInContext(ctx)
	if u == "" {
		u = "rest"
	}
	path := strings.Split(strings.Trim(configuration.FullPath, "/"), "/")
	var parsed map[string]interface{}
	if e := json.Unmarshal([]byte(configuration.Data), &parsed); e == nil {
		config.Set(parsed, path...)
		if err := config.Save(u, "Setting config via API"); err != nil {
			log.Logger(ctx).Error("Put", zap.Error(err))
			service.RestError500(req, resp, err)
			return
		}
		resp.WriteEntity(&configuration)

	} else {
		service.RestError500(req, resp, e)
	}

}

func (s *Handler) GetConfig(req *restful.Request, resp *restful.Response) {

	ctx := req.Request.Context()
	fullPath := req.PathParameter("FullPath")
	log.Logger(ctx).Debug("Config.Get FullPath : " + fullPath)

	path := strings.Split(strings.Trim(fullPath, "/"), "/")

	data := config.Get(path...).String("")
	if data == "" && len(config.Get(path...).Bytes()) > 0 {
		data = string(config.Get(path...).Bytes())
	}
	output := &rest.Configuration{
		FullPath: fullPath,
		Data:     data,
	}
	resp.WriteEntity(output)

}
