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

package jobs

import (
	"context"

	"github.com/golang/protobuf/ptypes"
	"github.com/golang/protobuf/ptypes/any"
	"github.com/micro/go-micro/client"

	"github.com/pmker/yux/common"
	"github.com/pmker/yux/common/proto/idm"
	"github.com/pmker/yux/common/service/proto"
)

func (u *UsersSelector) MultipleSelection() bool {
	return u.Collect
}

// ENRICH UsersSelector METHODS
func (u *UsersSelector) Select(client client.Client, ctx context.Context, objects chan interface{}, done chan bool) error {

	// Push Claims in Context to impersonate this user
	var query *service.Query
	if len(u.Users) > 0 {
		queries := []*any.Any{}
		for _, user := range u.Users {
			if user.Login != "" {
				q, _ := ptypes.MarshalAny(&idm.UserSingleQuery{Login: user.Login})
				queries = append(queries, q)
			} else if user.Uuid != "" {
				q, _ := ptypes.MarshalAny(&idm.UserSingleQuery{Uuid: user.Uuid})
				queries = append(queries, q)
			}
		}
		query = &service.Query{SubQueries: queries}
	} else if u.Query != nil {
		query = u.Query
	} else if u.All {
		query = &service.Query{SubQueries: []*any.Any{}}
	}
	if query == nil {
		return nil
	}
	userClient := idm.NewUserServiceClient(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_USER, client)
	s, e := userClient.SearchUser(ctx, &idm.SearchUserRequest{Query: query})
	if e != nil {
		return e
	}
	defer s.Close()
	for {
		resp, e := s.Recv()
		if e != nil {
			break
		}
		if resp == nil {
			continue
		}
		objects <- resp.User
	}

	done <- true
	return nil
}

func (n *UsersSelector) Filter(input ActionMessage) ActionMessage {
	return input
}
