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
	"log"

	"github.com/pmker/yux/common"
	"github.com/pmker/yux/common/proto/idm"
	"github.com/pmker/yux/common/micro"
	"github.com/spf13/cobra"
)

var (
	userUnlockLogin string
)

// userSetProfileCmd represents the set profile command
var userUnlockCmd = &cobra.Command{
	Use:   "user-unlock",
	Short: "Unlock User",
	Long: fmt.Sprintf(`Remove locks on a user

This may be handy if admin is locked out of the interface

EXAMPLE
=======
$ cells admin user-unlock -u LOGIN

`),
	PreRunE: func(cmd *cobra.Command, args []string) error {
		if userUnlockLogin == "" {
			cmd.Usage()
			return fmt.Errorf("Missing arguments")
		}
		return nil
	},
	Run: func(cmd *cobra.Command, args []string) {
		client := idm.NewUserServiceClient(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_USER, defaults.NewClient())

		users, err := searchUser(context.Background(), client, userUnlockLogin)
		if err != nil {
			fmt.Printf("Cannot list users for login %s: %s\n", userUnlockLogin, err.Error())
		}

		for _, user := range users {

			if _, ok := user.Attributes["locks"]; ok {
				delete(user.Attributes, "locks")
			}
			if _, ok := user.Attributes["failedConnections"]; ok {
				delete(user.Attributes, "failedConnections")
			}
			if _, err := client.CreateUser(context.Background(), &idm.CreateUserRequest{
				User: user,
			}); err != nil {
				fmt.Printf("could not update user [%s], skipping.\n Error message: %s", user.Login, err.Error())
				log.Println(err)
			} else {
				fmt.Printf("Successfully unlocked user %s\n", user.Login)
			}
			break
		}
	},
}

func init() {
	userUnlockCmd.Flags().StringVarP(&userUnlockLogin, "username", "u", "", "Login of the user to update")
	adminCmd.AddCommand(userUnlockCmd)
}
