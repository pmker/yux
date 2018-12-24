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

package utils

import (
	"context"
	"strings"
	"testing"

	. "github.com/smartystreets/goconvey/convey"

	"github.com/pmker/yux/common/proto/idm"
	"github.com/pmker/yux/common/proto/tree"
)

var (
	roles = []*idm.Role{
		{Uuid: "root"},
		{Uuid: "role"},
		{Uuid: "user_id"},
	}
	nodes = map[string]string{
		"root":                          "root",
		"root/folder1":                  "root/folder1",
		"root/folder2":                  "root/folder2",
		"root/folder1/subfolder1":       "root/folder1/subfolder1",
		"root/folder1/subfolder1/fileA": "root/folder1/subfolder1/fileA",
		"root/folder1/subfolder1/fileB": "root/folder1/subfolder1/fileB",
		"root/folder1/subfolder2":       "root/folder1/subfolder2",
		"root/folder1/subfolder2/file1": "root/folder1/subfolder2/file1",
		"root/folder1/subfolder2/file2": "root/folder1/subfolder2/file2",
	}
	acls = []*idm.ACL{
		{
			WorkspaceID: "ws1",
			NodeID:      "root/folder1",
			RoleID:      "root",
			Action:      ACL_READ,
		},
		{
			NodeID: "root/folder1/subfolder1",
			RoleID: "root",
			Action: ACL_DENY,
		},
		{
			WorkspaceID: "ws2",
			NodeID:      "root/folder1/subfolder2",
			RoleID:      "role",
			Action:      ACL_READ,
		},
		{
			WorkspaceID: "ws2",
			NodeID:      "root/folder1/subfolder2",
			RoleID:      "role",
			Action:      ACL_WRITE,
		},
		{
			NodeID: "root/folder1/subfolder2/file2",
			RoleID: "user_id",
			Action: ACL_READ,
		},
		{
			WorkspaceID: "ws2",
			RoleID:      "root",
			Action:      &idm.ACLAction{Name: "other-acl", Value: "no-node-id, must be ignored"},
		},
	}
)

func listParents(nodeId string) []*tree.Node {
	parts := strings.Split(nodeId, "/")
	var paths, inverted []*tree.Node
	total := len(parts)
	for i := 0; i < total; i++ {
		paths = append(paths, &tree.Node{Uuid: strings.Join(parts[0:i+1], "/")})
	}
	for i := 1; i <= total; i++ {
		inverted = append(inverted, paths[total-i])
	}
	return inverted
}

func TestNewAccessList(t *testing.T) {
	Convey("Test New Access List", t, func() {
		list := NewAccessList(roles, []*idm.ACL{})
		list.Append(acls)
		So(list.OrderedRoles, ShouldResemble, roles)
		So(list.Acls, ShouldResemble, acls)
	})
}

func TestAccessList_Flatten(t *testing.T) {
	Convey("Test Flatten", t, func() {
		ctx := context.Background()
		list := NewAccessList(roles)
		list.Append(acls)
		list.Flatten(ctx)
		So(list.NodesAcls, ShouldHaveLength, 4)
		wsNodes := list.GetWorkspacesNodes()
		So(wsNodes, ShouldHaveLength, 2)
		result := map[string]map[string]Bitmask{}
		rMask := Bitmask{}
		rMask.AddFlag(FLAG_READ)
		result["ws1"] = map[string]Bitmask{
			"root/folder1": rMask,
		}
		rwMask := Bitmask{}
		rwMask.AddFlag(FLAG_READ)
		rwMask.AddFlag(FLAG_WRITE)
		result["ws2"] = map[string]Bitmask{
			"root/folder1/subfolder2": rwMask,
		}
		So(wsNodes, ShouldResemble, result)

		testReadWrite := listParents("root/folder1/subfolder2/file1")
		So(list.CanRead(ctx, testReadWrite...), ShouldBeTrue)
		So(list.CanWrite(ctx, testReadWrite...), ShouldBeTrue)

		testReadOnly := listParents("root/folder1/subfolder2/file2")
		So(list.CanRead(ctx, testReadOnly...), ShouldBeTrue)
		So(list.CanWrite(ctx, testReadOnly...), ShouldBeFalse)

		testDenied := listParents("root/folder1/subfolder1/fileA")
		So(list.CanRead(ctx, testDenied...), ShouldBeFalse)
		So(list.CanWrite(ctx, testDenied...), ShouldBeFalse)

		testNothing := listParents("root/folder2")
		So(list.CanRead(ctx, testNothing...), ShouldBeFalse)
		So(list.CanWrite(ctx, testNothing...), ShouldBeFalse)

		testNothing2 := listParents("root")
		So(list.CanRead(ctx, testNothing2...), ShouldBeFalse)
		So(list.CanWrite(ctx, testNothing2...), ShouldBeFalse)

	})
}
