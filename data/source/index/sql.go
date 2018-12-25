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
package index

import (
	"context"
	"time"

	"github.com/pydio/cells/common"
	"github.com/pydio/cells/common/log"
	"github.com/pydio/cells/common/proto/tree"
	"github.com/pydio/cells/common/sql"
	"github.com/pydio/cells/common/sql/index"
	"github.com/pydio/cells/common/utils"
)

var (
	queries = map[string]interface{}{}
)

type sqlimpl struct {
	*sql.Handler

	*index.IndexSQL
}

// Init handler for the SQL DAO
func (s *sqlimpl) Init(options common.ConfigValues) error {

	// super
	s.DAO.Init(options)

	// Preparing the index
	s.IndexSQL = index.NewDAO(s.Handler, "ROOT").(*index.IndexSQL)
	if err := s.IndexSQL.Init(options); err != nil {
		return err
	}

	// Preparing the db statements
	if options.Bool("prepare", true) {
		for key, query := range queries {
			if err := s.Prepare(key, query); err != nil {
				return err
			}
		}
	}

	if _, err := s.IndexSQL.GetNode(utils.NewMPath(1)); err != nil {
		log.Logger(context.Background()).Info("Creating root node in index ")
		treeNode := utils.NewTreeNode()
		treeNode.Type = tree.NodeType_COLLECTION
		treeNode.Uuid = "ROOT"
		treeNode.SetMPath(1)
		treeNode.Level = 1
		treeNode.MTime = time.Now().Unix()
		s.IndexSQL.AddNode(treeNode)
	}

	return nil
}
