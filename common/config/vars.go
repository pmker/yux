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

// Package configs provides tools for managing configurations
package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/micro/go-config/reader"
	"github.com/pydio/go-os/config"
	"github.com/pydio/go-os/config/source/file"
	"github.com/spf13/viper"

	"github.com/pmker/yux/common"
	"github.com/pmker/yux/common/config/envvar"
	file2 "github.com/pmker/yux/common/config/file"
	"github.com/pmker/yux/common/config/memory"
	"github.com/pmker/yux/common/config/remote"
)

var (
	PydioConfigDir  = ApplicationDataDir()
	PydioConfigFile = "pydio.json"

	VersionsStore    file2.VersionsStore
	defaultConfig    *Config
	once             sync.Once
	remoteSourceOnce sync.Once
	remoteSource     bool
)

// Config wrapper around micro Config
type Config struct {
	config.Config
}

func initVersionStore() {
	var e error
	VersionsStore, e = file2.NewStore(PydioConfigDir)
	if e != nil {
		//log.Println("Could not open versions store", e)
	}
	written, err := file2.WriteIfNotExists(filepath.Join(PydioConfigDir, PydioConfigFile), SampleConfig)
	if err != nil {
		fmt.Println("Error while trying to create default config file")
		os.Exit(1)
	}
	if written && VersionsStore != nil {
		var data interface{}
		if e := json.Unmarshal([]byte(SampleConfig), data); e == nil {
			VersionsStore.Put(&file2.Version{
				User: "cli",
				Date: time.Now(),
				Log:  "Initialize with sample config",
				Data: data,
			})
		}
	}
}

// Default Config with initialisation
func Default() config.Config {
	once.Do(func() {
		if GetRemoteSource() {
			// Warning, loading remoteSource will trigger a call to defaults.NewClient()

			defaultConfig = &Config{config.NewConfig(
				config.WithSource(newRemoteSource(config.SourceName("config"))),
				config.PollInterval(10*time.Second),
			)}
			return
		}
		initVersionStore()
		defaultConfig = &Config{config.NewConfig(
			config.WithSource(newLocalSource()),
			config.PollInterval(10*time.Second),
		)}
		if save, e := UpgradeConfigsIfRequired(defaultConfig); e == nil && save {
			e2 := saveConfig(defaultConfig, common.PYDIO_SYSTEM_USERNAME, "Configs upgrades applied")
			if e2 != nil {
				fmt.Println("[Configs] Error while saving upgraded configs")
			} else {
				fmt.Println("[Configs] successfully saved config after upgrade - Reloading from source")
			}
			// Reload fully from source to make sure it's in sync with JSON
			defaultConfig = &Config{config.NewConfig(
				config.WithSource(newLocalSource()),
				config.PollInterval(10*time.Second),
			)}
		} else if e != nil {
			fmt.Errorf("[Configs] something whent wrong while upgrading configs: %s", e.Error())
		}
	})
	return defaultConfig
}

func newEnvSource() config.Source {
	return envvar.NewSource(
		config.SourceName("PYDIO"),
	)
}

func newLocalSource() config.Source {
	return file.NewSource(
		config.SourceName(filepath.Join(PydioConfigDir, PydioConfigFile)),
	)
}

func newRemoteSource(opts ...config.SourceOption) config.Source {
	return remote.NewSource(opts...)
}

func Get(path ...string) reader.Value {
	return Default().Get(path...)
}

func Set(val interface{}, path ...string) {

	if GetRemoteSource() {
		remote.UpdateRemote("config", val, path...)
		return
	}
	tmpConfig := Config{Config: config.NewConfig(config.WithSource(memory.NewSource(Default().Bytes())))}
	tmpConfig.Set(val, path...)
	// Make sure to init vault
	Vault()
	// Filter values
	hasFilter := false
	for _, p := range registeredVaultKeys {
		savedUuid := Default().Get(p...).String("")
		newConfig := tmpConfig.Get(p...).String("")
		if newConfig != savedUuid {
			hasFilter = true
			if savedUuid != "" {
				vaultSource.Delete(savedUuid, true)
			}
			if newConfig != "" {
				// Replace value with a secret Uuid
				fmt.Println("Replacing config value with a secret UUID", strings.Join(p, "/"))
				newUuid := NewKeyForSecret()
				e := vaultSource.Set(newUuid, newConfig, true)
				if e != nil {
					fmt.Println("Something went wrong when saving file!", e.Error())
				}
				tmpConfig.Set(newUuid, p...)
			}
		}
	}
	if hasFilter {
		// Replace fully from tmp
		// Does not work probably due to a bug in the underlying TP library
		// Default().Set(tmpConfig.Get())

		// Rather explicitly replace all values.
		var all map[string]interface{}
		json.Unmarshal(tmpConfig.Bytes(), &all)
		for k, v := range all {
			Default().Set(v, k)
		}
	} else {
		// Just update default config
		Default().Set(val, path...)
	}
}

func Del(path ...string) {
	if GetRemoteSource() {
		remote.DeleteRemote("config", path...)
		return
	}
	Default().Del(path...)
}

func Watch(path ...string) (config.Watcher, error) {
	return Default().Watch(path...)
}

func (c *Config) Unmarshal(val interface{}) error {
	return c.Config.Get().Scan(&val)
}

func (c *Config) UnmarshalKey(key string, val interface{}) error {
	return c.Config.Get(key).Scan(&val)
}

func watchConfig() {

}

// GetJsonPath build path for json that contain the local config
func GetJsonPath() string {
	return filepath.Join(PydioConfigDir, PydioConfigFile)
}

func GetRemoteSource() bool {
	remoteSourceOnce.Do(func() {
		if viper.GetString("registry_cluster_routes") != "" {
			remoteSource = true
		}
	})

	return remoteSource
}
