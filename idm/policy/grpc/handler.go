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
	"context"
	"fmt"
	"strings"

	"github.com/ory/ladon"

	"github.com/pmker/yux/common"
	"github.com/pmker/yux/common/log"
	"github.com/pmker/yux/common/proto/idm"
	"github.com/pmker/yux/common/service/context"
	"github.com/pmker/yux/idm/policy"
)

type Handler struct {
}

func (h *Handler) IsAllowed(ctx context.Context, request *idm.PolicyEngineRequest, response *idm.PolicyEngineResponse) error {

	dao := servicecontext.GetDAO(ctx).(policy.DAO)

	reqContext := make(map[string]interface{})
	for k, v := range request.Context {
		reqContext[k] = v
	}
	var allowed bool

	for _, subject := range request.Subjects {

		ladonRequest := &ladon.Request{
			Subject:  subject,
			Resource: request.Resource,
			Action:   request.Action,
			Context:  reqContext,
		}

		if err := dao.IsAllowed(ladonRequest); err == nil {
			// Explicit allow
			allowed = true
		} else if strings.Contains(err.Error(), "Request was denied by default") {
			// This is a deny because no match: it does nothing but waits for
			// the loop to finish and see if there is an explicit allow or deny
		} else if strings.Contains(err.Error(), "Request was forcefully denied") {
			// Explicitly Deny : break and return false, ignoring following policies
			response.ExplicitDeny = true
			// log.Logger(context.Background()).Error("IsAllowed: explicitly denied", zap.Any("ladonRequest", ladonRequest))
			return nil
		} else {
			// Unexpected Error
			return err
		}
	}

	if allowed {
		response.Allowed = true
	} else {
		response.DefaultDeny = true
	}

	return nil
}

func (h *Handler) ListPolicyGroups(ctx context.Context, request *idm.ListPolicyGroupsRequest, response *idm.ListPolicyGroupsResponse) error {

	dao := servicecontext.GetDAO(ctx).(policy.DAO)
	groups, err := dao.ListPolicyGroups(ctx)
	if err != nil {
		return err
	}
	response.PolicyGroups = groups
	response.Total = int32(len(groups))

	return nil
}

func (h *Handler) StorePolicyGroup(ctx context.Context, request *idm.StorePolicyGroupRequest, response *idm.StorePolicyGroupResponse) error {

	dao := servicecontext.GetDAO(ctx).(policy.DAO)

	stored, err := dao.StorePolicyGroup(ctx, request.PolicyGroup)
	if err != nil {
		return err
	}

	response.PolicyGroup = stored
	log.Auditer(ctx).Info(
		fmt.Sprintf("Stored policy group [%s]", stored.Name),
		log.GetAuditId(common.AUDIT_POLICY_GROUP_STORE),
		stored.ZapUuid(),
	)

	return nil
}

func (h *Handler) DeletePolicyGroup(ctx context.Context, request *idm.DeletePolicyGroupRequest, response *idm.DeletePolicyGroupResponse) error {
	dao := servicecontext.GetDAO(ctx).(policy.DAO)

	err := dao.DeletePolicyGroup(ctx, request.PolicyGroup)
	if err != nil {
		return err
	}

	response.Success = true
	log.Auditer(ctx).Info(
		fmt.Sprintf("Deleted policy group [%s]", request.PolicyGroup.Name),
		log.GetAuditId(common.AUDIT_POLICY_GROUP_DELETE),
		request.PolicyGroup.ZapUuid(),
	)

	return nil
}
