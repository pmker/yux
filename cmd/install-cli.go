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
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"

	p "github.com/manifoldco/promptui"
	_ "github.com/mholt/caddy/caddyhttp"
	"github.com/spf13/cobra"

	"github.com/pydio/cells/common"
	"github.com/pydio/cells/common/config"
	"github.com/pydio/cells/common/log"
	"github.com/pydio/cells/common/proto/install"
	"github.com/pydio/cells/common/utils"
	"github.com/pydio/cells/discovery/install/lib"
)

func notEmpty(input string) error {
	if len(input) > 0 {
		return nil
	} else {
		return fmt.Errorf("Field cannot be empty!")
	}
}

func validHostPort(input string) error {
	if e := notEmpty(input); e != nil {
		return e
	}
	parts := strings.Split(input, ":")
	if len(parts) != 2 {
		return fmt.Errorf("Please use an [IP|DOMAIN]:[PORT] string")
	}
	if e := validPortNumber(parts[1]); e != nil {
		return e
	}
	return nil
}

func validPortNumber(input string) error {
	port, e := strconv.ParseInt(input, 10, 64)
	if e == nil && port == 0 {
		return fmt.Errorf("Please use a non empty port!")
	}
	return e
}

func promptAndSaveInstallUrls() (internal *url.URL, external *url.URL, e error) {

	defaultPort := "8080"
	var internalHost, externalHost string
	defaultIps, e := utils.GetAvailableIPs()
	if e != nil {
		return
	}
	var items []string

	testExt, eExt := utils.GetOutboundIP()
	if eExt == nil {
		items = append(items, fmt.Sprintf("%s:%s", testExt.String(), defaultPort))
	}
	for _, ip := range defaultIps {
		if testExt != nil && testExt.String() == ip.String() {
			continue
		}
		items = append(items, fmt.Sprintf("%s:%s", ip.String(), defaultPort))
	}
	items = append(items, "localhost:"+defaultPort, "0.0.0.0:"+defaultPort)

	prompt := p.SelectWithAdd{
		Label:    "Binding Host (ip:port or yourdomain.tld that the webserver will listen. If internal and external urls differ, use internal here)",
		Items:    items,
		AddLabel: "Other",
		Validate: validHostPort,
	}
	_, internalHost, e = prompt.Run()
	if e != nil {
		return
	}
	internalHost = strings.TrimSuffix(internalHost, "/")
	internalHost = strings.TrimPrefix(internalHost, "http://")
	internalHost = strings.TrimPrefix(internalHost, "https://")
	parts := strings.Split(internalHost, ":")
	if len(parts) != 2 {
		return nil, nil, fmt.Errorf("Please use an [IP|DOMAIN]:[PORT] string")
	}
	defaultExternal := internalHost
	if parts[1] == "80" || parts[1] == "443" {
		defaultExternal = parts[0]
	}
	extPrompt := p.Prompt{
		Label:    "External Host (used to access this machine from outside world if it differs from Bind Host)",
		Validate: notEmpty,
		Default:  defaultExternal,
	}
	externalHost, e = extPrompt.Run()
	if e != nil {
		return
	}
	externalHost = strings.TrimSuffix(externalHost, "/")
	externalHost = strings.TrimPrefix(externalHost, "http://")
	externalHost = strings.TrimPrefix(externalHost, "https://")

	_, e = promptSslMode()
	if e != nil {
		return
	}
	scheme := "http"
	if config.Get("cert", "proxy", "ssl").Bool(false) {
		scheme = "https"
	}
	externalUrl := fmt.Sprintf("%s://%s", scheme, externalHost)
	internalUrl := fmt.Sprintf("%s://%s", scheme, internalHost)
	internal, e = url.Parse(internalUrl)
	if e != nil {
		return
	}
	external, e = url.Parse(externalUrl)
	if e != nil {
		return
	}

	config.Set(externalUrl, "defaults", "url")
	config.Set(internalUrl, "defaults", "urlInternal")
	config.Save("cli", "Install / Setting default URLs")

	return
}

// installCmd represents the install command
var installCliCmd = &cobra.Command{
	Use:   "install-cli",
	Short: "Pydio Cells Command-Line Installer",
	Long:  "This command launch the installation process of Pydio Cells in the command line instead of a browser.",
	Run: func(cmd *cobra.Command, args []string) {

		micro := config.Get("ports", common.SERVICE_MICRO_API).Int(0)
		if micro == 0 {
			micro = utils.GetAvailablePort()
			config.Set(micro, "ports", common.SERVICE_MICRO_API)
			config.Save("cli", "Install / Setting default Ports")
		}

		internalUrl, _, err := promptAndSaveInstallUrls()
		if err != nil {
			log.Fatal(err.Error())
		}

		installConfig := lib.GenerateDefaultConfig()
		installConfig.InternalUrl = internalUrl.String()
		fmt.Println("")
		fmt.Println("\033[1m## Database Connection\033[0m")
		if e := promptDB(installConfig); e != nil {
			log.Fatal(e.Error())
		}

		fmt.Println("")
		fmt.Println("\033[1m## Frontend Configuration\033[0m")
		if e := promptFrontendAdmin(installConfig); e != nil {
			log.Fatal(e.Error())
		}
		fmt.Println("")
		fmt.Println("\033[1m## Advanced Settings\033[0m")
		if e := promptAdvanced(installConfig); e != nil {
			log.Fatal(e.Error())
		}

		fmt.Println("")
		fmt.Println("\033[1m## Performing Installation\033[0m")
		e := lib.Install(context.Background(), installConfig, func(event *lib.InstallProgressEvent) {
			fmt.Println(p.IconGood + " " + event.Message)
		})
		if e != nil {
			log.Fatal("Error while performing installation: " + e.Error())
		}

		fmt.Println("")
		fmt.Println(p.IconGood + "\033[1m Installation Finished: please restart with '" + os.Args[0] + " start' command\033[0m")
		fmt.Println("")
	},
}

func promptDB(c *install.InstallConfig) error {

	connType := p.Select{
		Label: "Database Connection Type",
		Items: []string{"TCP", "Socket", "Manual"},
	}
	dbTcpHost := p.Prompt{Label: "Database Hostname", Validate: notEmpty, Default: "localhost"}
	dbTcpPort := p.Prompt{Label: "Database Port", Validate: validPortNumber, Default: "3306"}

	dbName := p.Prompt{Label: "Database Name", Validate: notEmpty, Default: "cells"}
	dbUser := p.Prompt{Label: "Database User", Validate: notEmpty}
	dbPass := p.Prompt{Label: "Database Password (leave empty if not needed)", Mask: '*'}

	dbSocketFile := p.Prompt{Label: "Socket File", Validate: notEmpty}
	dbDSN := p.Prompt{Label: "Manual DSN", Validate: notEmpty}

	uConnIdx, _, _ := connType.Run()
	var e error
	if uConnIdx == 2 {
		if c.DbManualDSN, e = dbDSN.Run(); e != nil {
			return e
		}
	} else {
		if uConnIdx == 0 {
			c.DbConnectionType = "tcp"
			if c.DbTCPHostname, e = dbTcpHost.Run(); e != nil {
				return e
			}
			if c.DbTCPPort, e = dbTcpPort.Run(); e != nil {
				return e
			}
		} else if uConnIdx == 1 {
			c.DbConnectionType = "socket"
			if c.DbSocketFile, e = dbSocketFile.Run(); e != nil {
				return e
			}
		}
		var name, user, pass string
		if name, e = dbName.Run(); e != nil {
			return e
		}
		if user, e = dbUser.Run(); e != nil {
			return e
		}
		if pass, e = dbPass.Run(); e != nil {
			return e
		}
		if uConnIdx == 0 {
			c.DbTCPName = name
			c.DbTCPUser = user
			c.DbTCPPassword = pass
		} else {
			c.DbSocketName = name
			c.DbSocketUser = user
			c.DbSocketPassword = pass
		}
	}
	if res := lib.PerformCheck(context.Background(), "DB", c); !res.Success {
		return fmt.Errorf("Cannot connect to this database, please double ckeck your connection parameters and try again.")
	}
	fmt.Println(p.IconGood + " Successfully connected to the database")
	return nil
}

func promptFrontendAdmin(c *install.InstallConfig) error {

	login := p.Prompt{Label: "Admin Login (leave passwords empty if an admin is already created)", Default: "admin", Validate: notEmpty}
	pwd := p.Prompt{Label: "Admin Password", Mask: '*'}
	pwd2 := p.Prompt{Label: "Confirm Password", Mask: '*', Validate: func(s string) error {
		if c.FrontendPassword != s {
			return fmt.Errorf("Password differ!")
		} else {
			return nil
		}
	}}
	var e error
	if c.FrontendLogin, e = login.Run(); e != nil {
		return e
	}
	if c.FrontendPassword, e = pwd.Run(); e != nil {
		return e
	}
	if c.FrontendRepeatPassword, e = pwd2.Run(); e != nil {
		return e
	}
	return nil
}

func promptAdvanced(c *install.InstallConfig) error {

	confirm := p.Prompt{Label: "There are some advanced settings for ports and initial data storage. Do you want to edit them", IsConfirm: true}
	if _, e := confirm.Run(); e != nil {
		return nil
	}
	dsPath := p.Prompt{Label: "Path to the default datasource", Default: c.DsFolder, Validate: notEmpty}

	oidcId := p.Prompt{Label: "OpenIdConnect ClientID (for frontend)", Default: c.ExternalDexID, Validate: notEmpty}
	oidcSecret := p.Prompt{Label: "OpenIdConnect ClientID (for frontend)", Default: c.ExternalDexSecret, Validate: notEmpty}

	dexPort := p.Prompt{Label: "OpenIdConnect Server Port", Default: c.ExternalDex, Validate: validPortNumber}
	microPort := p.Prompt{Label: "Rest Gateway Port", Default: c.ExternalMicro, Validate: validPortNumber}
	gatewayPort := p.Prompt{Label: "Data Gateway Port", Default: c.ExternalGateway, Validate: validPortNumber}
	websocketPort := p.Prompt{Label: "WebSocket Port", Default: c.ExternalWebsocket, Validate: validPortNumber}
	davPort := p.Prompt{Label: "WebDAV Gateway Port", Default: c.ExternalDAV, Validate: validPortNumber}
	wopiPort := p.Prompt{Label: "WOPI Api Port (for Collabora support)", Default: c.ExternalWOPI, Validate: validPortNumber}

	if folder, e := dsPath.Run(); e == nil {
		c.DsFolder = folder
	} else {
		return e
	}

	var e error
	if c.ExternalDexID, e = oidcId.Run(); e != nil {
		return e
	}
	if c.ExternalDexSecret, e = oidcSecret.Run(); e != nil {
		return e
	}
	if c.ExternalDex, e = dexPort.Run(); e != nil {
		return e
	}
	if c.ExternalMicro, e = microPort.Run(); e != nil {
		return e
	}
	if c.ExternalGateway, e = gatewayPort.Run(); e != nil {
		return e
	}
	if c.ExternalWebsocket, e = websocketPort.Run(); e != nil {
		return e
	}
	if c.ExternalDAV, e = davPort.Run(); e != nil {
		return e
	}
	if c.ExternalWOPI, e = wopiPort.Run(); e != nil {
		return e
	}

	return nil
}

func init() {
	RootCmd.AddCommand(installCliCmd)
}
