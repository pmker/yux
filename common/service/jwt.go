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

package service

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/micro/go-micro"
	"github.com/micro/go-micro/metadata"
	"github.com/micro/go-micro/server"

	"github.com/pydio/cells/common"
	"github.com/pydio/cells/common/auth"
	"github.com/pydio/cells/common/auth/claim"
	"github.com/pydio/cells/common/log"
)

func newClaimsProvider(service micro.Service) error {

	var options []micro.Option

	options = append(options, micro.WrapHandler(NewClaimsHandlerWrapper()))

	service.Init(options...)

	return nil
}

// NewClaimsHandlerWrapper decodes json claims passed via context metadata ( = headers ) and
// sets Claims as a proper value in the context
func NewClaimsHandlerWrapper() server.HandlerWrapper {
	return func(h server.HandlerFunc) server.HandlerFunc {
		return func(ctx context.Context, req server.Request, rsp interface{}) error {

			if md, ok := metadata.FromContext(ctx); ok {
				if jsonClaims, exists := md[claim.MetadataContextKey]; exists {
					var claims claim.Claims
					if e := json.Unmarshal([]byte(jsonClaims), &claims); e == nil {
						ctx = context.WithValue(ctx, claim.ContextKey, claims)
					}
				}
			}

			err := h(ctx, req, rsp)

			return err
		}
	}
}

// JWTHttpWrapper captures and verifies a JWT token if it's present in the headers.
// Warning: it goes through if there is no JWT => the next handlers
// must verify if a valid user was found or not.
func JWTHttpWrapper(h http.Handler) http.Handler {

	jwtVerifier := auth.DefaultJWTVerifier()

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		c := r.Context()
		log.Logger(c).Debug("JWTHttpHandler: Checking JWT")

		if val, ok1 := r.Header["Authorization"]; ok1 {

			whole := strings.Join(val, "")
			rawIDToken := strings.TrimPrefix(strings.Trim(whole, ""), "Bearer ")
			//var claims claim.Claims
			var err error

			c, _, err = jwtVerifier.Verify(c, rawIDToken)
			if err != nil {
				// This is a wrong JWT go out with error
				w.WriteHeader(401)
				w.Write([]byte("Unauthorized.\n"))

				log.Auditer(c).Error(
					"Blocked invalid JWT",
					log.GetAuditId(common.AUDIT_INVALID_JWT),
				)

				return
			}

		}

		r = r.WithContext(c)
		h.ServeHTTP(w, r)
	})
}
