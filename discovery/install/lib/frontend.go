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

package lib

import (
	"encoding/base64"
	"fmt"
	"math"
	"os"
	"path/filepath"

	"github.com/pydio/cells/common/config"
	"github.com/pydio/cells/common/proto/install"
)

// Frontends
type frontendsConfig struct {
	Hosts    string
	Login    string
	Password string
	Confirm  string
}

func restoreProgress(in chan float64, done chan bool, publisher func(event *InstallProgressEvent)) {
	start := float64(40)
	end := float64(90)
	lastStep := float64(0)
	for {
		select {
		case pg := <-in:
			step := math.Floor(pg * 10) // Send only increments by 10%
			if step != lastStep {
				newPg := start + pg*(end-start)
				publisher(&InstallProgressEvent{
					Progress: int(newPg),
					Message:  fmt.Sprintf("Deploying interface assets: %d%% done...", int(step*10)),
				})
			}
			lastStep = step
		case <-done:
			return
		}
	}
}

func actionFrontendsAdd(c *install.InstallConfig) error {

	conf := &frontendsConfig{
		Hosts:    c.GetFrontendHosts(),
		Login:    c.GetFrontendLogin(),
		Password: c.GetFrontendPassword(),
		Confirm:  c.GetFrontendRepeatPassword(),
	}

	if conf.Login != "" && conf.Password != "" && conf.Confirm == conf.Password {
		sEnc := base64.StdEncoding.EncodeToString([]byte(conf.Login + "||||" + conf.Password))
		config.Set(sEnc, "defaults", "root")
	}

	if c.FrontendApplicationTitle != "" {
		config.Set(c.FrontendApplicationTitle, "frontend", "plugin", "core.pydio", "APPLICATION_TITLE")
	}

	if c.FrontendDefaultLanguage != "" {
		config.Set(c.FrontendDefaultLanguage, "frontend", "plugin", "core.pydio", "DEFAULT_LANGUAGE")
	}

	config.Save("cli", "Set default admin user and frontend configs")

	// Creating log dir
	logsFolder := filepath.Join(config.ApplicationDataDir(), "logs")
	e := os.MkdirAll(logsFolder, 0755)

	return e
}
