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

// Package meta add persistence layer for meta data defined by the end users to enrich the nodes.
//
// Meta data might be defined by an admin and modified by normal end-users.
// Typically, to manage bookmarks or ratings.
package meta

import (
	"github.com/pmker/yux/common/dao"
	"github.com/pmker/yux/common/proto/idm"
	"github.com/pmker/yux/common/service/proto"
	"github.com/pmker/yux/common/sql"
	"github.com/pmker/yux/common/sql/resources"
	"github.com/pmker/yux/idm/meta/namespace"
)

// DAO interface
type DAO interface {
	resources.DAO

	GetNamespaceDao() namespace.DAO

	Set(meta *idm.UserMeta) (*idm.UserMeta, bool, error)
	Del(meta *idm.UserMeta) (e error)
	Search(metaIds []string, nodeUuids []string, namespace string, ownerSubject string, q *service.ResourcePolicyQuery) ([]*idm.UserMeta, error)
}

func NewDAO(o dao.DAO) dao.DAO {
	switch v := o.(type) {
	case sql.DAO:
		return &sqlimpl{Handler: v.(*sql.Handler)}
	}
	return nil
}
