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

package key

import (
	"fmt"
	"testing"

	"github.com/smartystreets/goconvey/convey"

	_ "github.com/mattn/go-sqlite3"
	"github.com/pmker/yux/common/config"
	"github.com/pmker/yux/common/sql"
)

var (
	mockDAO DAO
)

func TestMain(m *testing.M) {
	var options config.Map

	sqlDAO := sql.NewDAO("sqlite3", "file::memory:?mode=memory&cache=shared", "test")
	if sqlDAO == nil {
		fmt.Print("Could not start test")
		return
	}

	mockDAO = NewDAO(sqlDAO).(DAO)
	if err := mockDAO.Init(options); err != nil {
		fmt.Print("Could not start test ", err)
		return
	}

	m.Run()
}

func TestSqlimpl_InsertNode(t *testing.T) {
	convey.Convey("Test Put key", t, func() {
		err := mockDAO.InsertNode("node_id", []byte("nonce"), 4)
		convey.So(err, convey.ShouldBeNil)
	})
}

func TestSqlimpl_SetNodeKey(t *testing.T) {
	convey.Convey("Set node key", t, func() {
		err := mockDAO.SetNodeKey("node_id", "pydio", "pydio", []byte("key"))
		convey.So(err, convey.ShouldBeNil)
	})
}

func TestSqlimpl_SetNodeKey2(t *testing.T) {
	convey.Convey("Set node share key 1", t, func() {
		err := mockDAO.SetNodeKey("node_id", "pydio", "user-1", []byte("key"))
		convey.So(err, convey.ShouldBeNil)
	})
}

func TestSqlimpl_SetNodeKey3(t *testing.T) {
	convey.Convey("Set node share key 2", t, func() {
		err := mockDAO.SetNodeKey("node_id", "pydio", "user-2", []byte("key"))
		convey.So(err, convey.ShouldBeNil)
	})
}

func TestSqlimpl_GetNodeKey(t *testing.T) {
	convey.Convey("Get node key", t, func() {
		k, err := mockDAO.GetNodeKey("node_id", "pydio")
		convey.So(err, convey.ShouldBeNil)
		convey.So(k, convey.ShouldNotBeNil)
	})
}

func TestSqlimpl_DeleteNodeSharedKey(t *testing.T) {
	convey.Convey("Get node key", t, func() {
		err := mockDAO.DeleteNodeSharedKey("node_id", "pydio", "user-1")
		convey.So(err, convey.ShouldBeNil)
	})
}

func TestSqlimpl_DeleteNodeAllSharedKey(t *testing.T) {
	convey.Convey("Get node key", t, func() {
		err := mockDAO.DeleteNodeAllSharedKey("node_id", "pydio")
		convey.So(err, convey.ShouldBeNil)
	})
}

func TestSqlimpl_DeleteNode(t *testing.T) {
	convey.Convey("Get node key", t, func() {
		err := mockDAO.DeleteNode("pydio")
		convey.So(err, convey.ShouldBeNil)
	})
}
