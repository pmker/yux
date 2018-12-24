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
	"encoding/base64"
	"encoding/json"
	"fmt"
	"path"
	"strings"
	"time"

	"go.uber.org/zap"

	"github.com/pmker/yux/common"
	"github.com/pmker/yux/common/auth/claim"
	"github.com/pmker/yux/common/config"
	"github.com/pmker/yux/common/log"
	proto "github.com/pmker/yux/common/proto/auth"
	"github.com/pmker/yux/common/service/context"
	"github.com/pmker/yux/idm/auth"
)

func NewAuthTokenRevokerHandler(dexConfig auth.Config) (proto.AuthTokenRevokerHandler, error) {
	h := &TokenRevokerHandler{
		dexConfig: dexConfig,
	}
	dataDir, e := config.ServiceDataDir(common.SERVICE_GRPC_NAMESPACE_ + common.SERVICE_AUTH)
	if e != nil {
		return nil, e
	}
	dao, err := auth.NewBoltStore("tokens", path.Join(dataDir, "auth-revoked-token.db"))
	if err != nil {
		return nil, err
	}
	h.dao = dao
	return h, nil
}

type TokenRevokerHandler struct {
	dao       auth.DAO
	dexConfig auth.Config
}

// MatchInvalid checks if token is part of revocation list
func (h *TokenRevokerHandler) MatchInvalid(ctx context.Context, in *proto.MatchInvalidTokenRequest, out *proto.MatchInvalidTokenResponse) error {
	info, err := h.dao.GetInfo(in.Token)
	if err != nil || len(info) == 0 {
		out.State = proto.State_NO_MATCH
	} else {
		out.State = proto.State_REVOKED
	}
	out.RevocationInfo = info
	return nil
}

// Revoke adds token to revocation list and eventually clear RefreshToken as well (directly inside Dex)
func (h *TokenRevokerHandler) Revoke(ctx context.Context, in *proto.RevokeTokenRequest, out *proto.RevokeTokenResponse) error {

	// Revoke RefreshToken if any
	if payload, err := parseJWT(in.Token.Value); err == nil {
		var claims claim.Claims
		if err := json.Unmarshal(payload, &claims); err == nil {
			claimsUuid, _ := claims.DecodeUserUuid()
			claimsNonce := claims.Nonce
			log.Logger(ctx).Info("Deleting offline session for ", zap.Any("userUuid", claimsUuid), zap.Any("nonce", claimsNonce))
			if dexDao, ok := servicecontext.GetDAO(ctx).(auth.DexDAO); ok {
				dexDao.DexDeleteOfflineSessions(h.dexConfig, claimsUuid, claimsNonce)
			}
		} else {
			log.Logger(ctx).Error("Cannot unmarshall token", zap.Error(err), zap.Any("token", in.Token))
		}
	}
	// Put in revocation list for IdToken
	return h.dao.PutToken(in.Token)

}

// PruneTokens garbage collect expired IdTokens and Tokens
func (h *TokenRevokerHandler) PruneTokens(ctx context.Context, in *proto.PruneTokensRequest, out *proto.PruneTokensResponse) error {
	var offset = 0

	tc, e := h.dao.ListTokens(offset, 1000)
	if e != nil {
		return e
	}

	done := false
	for !done {
		select {
		case t := <-tc:
			var claims claim.Claims
			if payload, err := parseJWT(t.Value); err == nil {
				if err := json.Unmarshal(payload, &claims); err == nil {
					if claims.Expiry.Before(time.Now()) {
						// IdToken is expired so there is no need to keep it in the revoked list
						bytes, err := json.Marshal(claims)
						if err == nil {
							if e := h.dao.DeleteToken(string(bytes)); e == nil {
								out.Tokens = append(out.Tokens, "token")
							}
						}
					}
				}
			}
		default:
			done = true
		}
	}

	if dexDao, ok := servicecontext.GetDAO(ctx).(auth.DexDAO); ok {
		pruned, _ := dexDao.DexPruneOfflineSessions(h.dexConfig)
		if pruned > 0 {
			log.Logger(ctx).Info(fmt.Sprintf("Pruned %d expired offline sessions", pruned))
		}
	} else {
		log.Logger(ctx).Info("Cannot get dexDAO")
	}

	return nil
}

// Util
func parseJWT(p string) ([]byte, error) {
	parts := strings.Split(p, ".")
	if len(parts) < 2 {
		return nil, fmt.Errorf("oidc: malformed jwt, expected 3 parts got %d", len(parts))
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, fmt.Errorf("oidc: malformed jwt payload: %v", err)
	}
	return payload, nil
}
