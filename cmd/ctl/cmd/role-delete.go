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

	"github.com/golang/protobuf/ptypes"
	"github.com/golang/protobuf/ptypes/any"
	"github.com/spf13/cobra"

	"github.com/pydio/cells/common"
	"github.com/pydio/cells/common/proto/idm"
	"github.com/pydio/cells/common/micro"
	service "github.com/pydio/cells/common/service/proto"
)

var roleDeleteUUID []string

// deleteCmd represents the delete command
var roleDeleteCmd = &cobra.Command{
	Use:   "delete",
	Short: "Delete a role in backend",
	Long:  `Delete a role in backend`,
	PreRunE: func(cmd *cobra.Command, args []string) error {
		if len(roleDeleteUUID) == 0 {
			return fmt.Errorf("Missing arguments")
		}

		return nil
	},
	Run: func(cmd *cobra.Command, args []string) {
		client := idm.NewRoleServiceClient(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_ROLE, defaults.NewClient())

		query, _ := ptypes.MarshalAny(&idm.RoleSingleQuery{
			Uuid: roleDeleteUUID,
		})

		if _, err := client.DeleteRole(context.Background(), &idm.DeleteRoleRequest{
			Query: &service.Query{
				SubQueries: []*any.Any{query},
			},
		}); err != nil {
			log.Println(err)
		}
	},
}

func init() {
	roleDeleteCmd.Flags().StringArrayVarP(&roleDeleteUUID, "uuid", "u", []string{}, "Uuid of the role to delete")

	roleCmd.AddCommand(roleDeleteCmd)
}
