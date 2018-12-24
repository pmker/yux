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

package dao

import (
	"database/sql"
	"fmt"

	mysqltools "github.com/go-sql-driver/mysql"
)

type mysql struct {
	conn *sql.DB
}

func (m *mysql) Open(dsn string) (Conn, error) {

	var (
		db *sql.DB
	)

	// Try to create the database to ensure it exists
	mysqlConfig, err := mysqltools.ParseDSN(dsn)
	if err != nil {
		return nil, err
	}
	dbName := mysqlConfig.DBName
	mysqlConfig.DBName = ""
	rootDSN := mysqlConfig.FormatDSN()

	if db, err = getSqlConnection("mysql", rootDSN); err != nil {
		return nil, err
	}
	if _, err = db.Exec(fmt.Sprintf("create database if not exists %s", dbName)); err != nil {
		return nil, err
	}

	if db, err = getSqlConnection("mysql", dsn); err != nil {
		return nil, err
	}

	m.conn = db

	return db, nil
}
