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

package archive

import (
	"testing"

	. "github.com/smartystreets/goconvey/convey"

	"github.com/pydio/cells/common/proto/jobs"
)

func TestExtractAction_GetName(t *testing.T) {
	Convey("Test GetName", t, func() {
		metaAction := &ExtractAction{}
		So(metaAction.GetName(), ShouldEqual, extractActionName)
	})
}

func TestExtractAction_Init(t *testing.T) {

	Convey("Test extract action init", t, func() {

		action := &ExtractAction{}
		job := &jobs.Job{}
		// No Parameters
		e := action.Init(job, nil, &jobs.Action{})

		// Valid Cmd
		e = action.Init(job, nil, &jobs.Action{
			Parameters: map[string]string{
				"format": "tar.gz",
				"target": "path",
			},
		})
		So(e, ShouldBeNil)
		So(action.Format, ShouldEqual, "tar.gz")
		So(action.TargetName, ShouldEqual, "path")

	})
}
