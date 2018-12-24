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

// Package namespace provides operations for managing user-metadata namespaces
package namespace

import (
	"github.com/pmker/yux/common/dao"
	"github.com/pmker/yux/common/proto/idm"
	"github.com/pmker/yux/common/sql"
	"github.com/pmker/yux/common/sql/resources"
)

const (
	ReservedNamespaceBookmark = "bookmark"
)

// DAO interface
type DAO interface {
	resources.DAO

	Add(ns *idm.UserMetaNamespace) error
	Del(ns *idm.UserMetaNamespace) (e error)
	List() (map[string]*idm.UserMetaNamespace, error)
}

func NewDAO(o dao.DAO) dao.DAO {
	switch v := o.(type) {
	case sql.DAO:
		return &sqlimpl{Handler: v.(*sql.Handler)}
	}
	return nil
}
