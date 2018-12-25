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

package cmd

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"time"

	"github.com/micro/go-micro/client"
	"github.com/micro/go-micro/errors"
	"go.uber.org/zap"

	"github.com/pydio/cells/common"
	"github.com/pydio/cells/common/log"
	"github.com/pydio/cells/common/proto/jobs"
	"github.com/pydio/cells/common/views"
	"github.com/pydio/cells/scheduler/actions"
)

var (
	wgetActionName = "actions.cmd.wget"
)

// WGetAction performs a wget command with the provided URL
type WGetAction struct {
	Router    *views.Router
	SourceUrl *url.URL
}

// GetName returns the unique identifier of this action
func (w *WGetAction) GetName() string {
	return wgetActionName
}

// Init passes parameters
func (w *WGetAction) Init(job *jobs.Job, cl client.Client, action *jobs.Action) error {
	if urlParam, ok := action.Parameters["url"]; ok {
		var e error
		w.SourceUrl, e = url.Parse(urlParam)
		if e != nil {
			return e
		}
	} else {
		return errors.BadRequest(common.SERVICE_TASKS, "missing parameter url in Action")
	}
	w.Router = views.NewStandardRouter(views.RouterOptions{AdminView: true})
	return nil
}

// Run the actual action code
func (w *WGetAction) Run(ctx context.Context, channels *actions.RunnableChannels, input jobs.ActionMessage) (jobs.ActionMessage, error) {

	log.Logger(ctx).Info("WGET: " + w.SourceUrl.String())
	if len(input.Nodes) == 0 {
		log.Logger(ctx).Info("IGNORE WGET: " + w.SourceUrl.String())
		return input.WithIgnore(), nil
	}
	targetNode := input.Nodes[0]
	httpResponse, err := http.Get(w.SourceUrl.String())
	if err != nil {
		return input.WithError(err), err
	}
	start := time.Now()
	defer httpResponse.Body.Close()
	var written int64
	var er error
	if localFolder := targetNode.GetStringMeta(common.META_NAMESPACE_NODE_TEST_LOCAL_FOLDER); localFolder != "" {
		var localFile *os.File
		localFile, er = os.OpenFile(filepath.Join(localFolder, targetNode.Uuid), os.O_CREATE|os.O_WRONLY, 0755)
		if er == nil {
			written, er = io.Copy(localFile, httpResponse.Body)
		}
	} else {
		written, er = w.Router.PutObject(ctx, targetNode, httpResponse.Body, &views.PutRequestData{Size: httpResponse.ContentLength})
	}
	log.Logger(ctx).Info("After PUT Object", zap.Int64("Written Bytes", written), zap.Error(er), zap.Any("ctx", ctx))
	if er != nil {
		return input.WithError(er), err
	}
	last := time.Now().Sub(start)
	log, _ := json.Marshal(map[string]interface{}{
		"Size": written,
		"Time": last,
	})
	input.AppendOutput(&jobs.ActionOutput{
		Success:  true,
		JsonBody: log,
	})
	return input, nil
}
