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

package views

import (
	"context"

	"go.uber.org/zap"

	"github.com/pydio/cells/common/log"
	"github.com/pydio/cells/common/utils"
)

type AccessListHandler struct {
	AbstractHandler
}

func NewAccessListHandler(adminView bool) *AccessListHandler {
	a := &AccessListHandler{}
	a.CtxWrapper = func(ctx context.Context) (context.Context, error) {
		if adminView {
			return context.WithValue(ctx, ctxAdminContextKey{}, true), nil
		}
		if ctx.Value(CtxKeepAccessListKey{}) != nil && ctx.Value(ctxUserAccessListKey{}) != nil {
			// Already loaded and context is instructed to not reload access list
			return ctx, nil
		}
		accessList, err := utils.AccessListFromContextClaims(ctx)
		if err != nil {
			log.Logger(ctx).Error("Failed to get accessList", zap.Error(err))
			return ctx, err
		}
		ctx = context.WithValue(ctx, ctxUserAccessListKey{}, accessList)
		return ctx, nil
	}
	return a
}
