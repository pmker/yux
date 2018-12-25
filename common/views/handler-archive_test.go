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
	"bytes"
	"context"
	"io"
	"testing"

	"github.com/pydio/cells/common"
	"github.com/pydio/cells/common/proto/tree"
	. "github.com/smartystreets/goconvey/convey"
)

type mockSelectionProvider struct {
	sel map[string][]*tree.Node
}

func newMockSelectionProvider() *mockSelectionProvider {
	m := &mockSelectionProvider{}
	m.sel = make(map[string][]*tree.Node)
	return m
}

func (m *mockSelectionProvider) getSelectionByUuid(ctx context.Context, selectionUuid string) (bool, []*tree.Node, error) {
	if nodes, ok := m.sel[selectionUuid]; ok {
		return true, nodes, nil
	}
	return false, nil, nil
}

func (m *mockSelectionProvider) deleteSelectionByUuid(ctx context.Context, selectionUuid string) {
	// Do NOT actually delete, or mockSelectionProvider cannot be reused for further testing
	//delete(m.sel, selectionUuid)
}

func TestArchiveHandler_ReadNode(t *testing.T) {

	mock := NewHandlerMock()
	mock.Nodes["path/folder"] = &tree.Node{Path: "path/folder", Type: tree.NodeType_COLLECTION}
	mock.Nodes["path/folder/file1"] = &tree.Node{Path: "path/folder/file1", Type: tree.NodeType_LEAF}
	mock.Nodes["path/folder/file2"] = &tree.Node{Path: "path/folder/file2", Type: tree.NodeType_LEAF}

	selMock := newMockSelectionProvider()
	selMock.sel["selection-uuid"] = append(selMock.sel["selection-uuid"], &tree.Node{Path: "path/folder/file1", Type: tree.NodeType_LEAF})
	selMock.sel["selection-uuid"] = append(selMock.sel["selection-uuid"], &tree.Node{Path: "path/folder/file2", Type: tree.NodeType_LEAF})

	zipHandler := &ArchiveHandler{
		selectionProvider: selMock,
	}
	zipHandler.SetNextHandler(mock)

	Convey("Test Read Normal Node", t, func() {
		resp, e := zipHandler.ReadNode(context.Background(), &tree.ReadNodeRequest{Node: &tree.Node{Path: "path/folder"}})
		So(e, ShouldBeNil)
		So(resp.Node, ShouldResemble, &tree.Node{Path: "path/folder", Type: tree.NodeType_COLLECTION})
	})

	Convey("Test Read Zip Node", t, func() {
		resp, e := zipHandler.ReadNode(context.Background(), &tree.ReadNodeRequest{Node: &tree.Node{Path: "path/folder.zip"}})
		So(e, ShouldBeNil)
		So(resp.Node.Size, ShouldEqual, -1)
	})

	Convey("Test read zipped selection", t, func() {
		resp, e := zipHandler.ReadNode(context.Background(), &tree.ReadNodeRequest{Node: &tree.Node{Path: "selection-uuid-selection.zip"}})
		So(e, ShouldBeNil)
		So(resp.Node.Size, ShouldEqual, -1)
	})

}

func TestArchiveHandler_GetObject(t *testing.T) {

	mock := NewHandlerMock()
	mock.Nodes["path/folder"] = &tree.Node{Path: "path/folder", Type: tree.NodeType_COLLECTION, Size: 30}
	mock.Nodes["path/folder/file1"] = &tree.Node{Path: "path/folder/file1", Type: tree.NodeType_LEAF, Size: 10}
	mock.Nodes["path/folder/file2"] = &tree.Node{Path: "path/folder/file2", Type: tree.NodeType_LEAF, Size: 10}
	mock.Nodes["path/folder/"+common.PYDIO_SYNC_HIDDEN_FILE_META] = &tree.Node{Path: "path/folder/file2", Type: tree.NodeType_LEAF, Size: 10}
	mock.Nodes["path/folder/subfolder_ignored"] = &tree.Node{Path: "path/folder/file2", Type: tree.NodeType_COLLECTION}

	selMock := newMockSelectionProvider()
	selMock.sel["selection-uuid"] = append(selMock.sel["selection-uuid"], &tree.Node{Path: "path/folder/file1", Type: tree.NodeType_LEAF})
	selMock.sel["selection-uuid"] = append(selMock.sel["selection-uuid"], &tree.Node{Path: "path/folder/file2", Type: tree.NodeType_LEAF})

	zipHandler := &ArchiveHandler{
		selectionProvider: selMock,
	}
	zipHandler.SetNextHandler(mock)

	Convey("Test Get Zip Node", t, func() {
		reader, e := zipHandler.GetObject(context.Background(), &tree.Node{
			Path: "path/folder.zip",
		}, &GetRequestData{
			Length: -1,
		})
		So(e, ShouldBeNil)
		So(reader, ShouldNotBeNil)
		data := []byte{}
		n, _ := io.Copy(bytes.NewBuffer(data), reader)
		reader.Close()
		So(n, ShouldBeGreaterThan, 200)
	})

	Convey("Test Get Zip Selection", t, func() {
		reader, e := zipHandler.GetObject(context.Background(), &tree.Node{
			Path: "path/selection-uuid-selection.zip",
		}, &GetRequestData{
			Length: -1,
		})
		So(e, ShouldBeNil)
		So(reader, ShouldNotBeNil)
		data := []byte{}
		n, _ := io.Copy(bytes.NewBuffer(data), reader)
		reader.Close()
		So(n, ShouldBeGreaterThan, 20)
	})

	Convey("Test Get Tar Node", t, func() {
		reader, e := zipHandler.GetObject(context.Background(), &tree.Node{
			Path: "path/folder.tar",
		}, &GetRequestData{
			Length: -1,
		})
		So(e, ShouldBeNil)
		So(reader, ShouldNotBeNil)
		data := []byte{}
		n, _ := io.Copy(bytes.NewBuffer(data), reader)
		reader.Close()
		So(n, ShouldBeGreaterThan, 0)
	})

	Convey("Test Get Tar Selection", t, func() {
		reader, e := zipHandler.GetObject(context.Background(), &tree.Node{
			Path: "path/selection-uuid-selection.tar",
		}, &GetRequestData{
			Length: -1,
		})
		So(e, ShouldBeNil)
		So(reader, ShouldNotBeNil)
		data := []byte{}
		n, _ := io.Copy(bytes.NewBuffer(data), reader)
		reader.Close()
		So(n, ShouldBeGreaterThan, 20)
	})

	Convey("Test Get Tar.gz Node", t, func() {
		reader, e := zipHandler.GetObject(context.Background(), &tree.Node{
			Path: "path/folder.tar.gz",
		}, &GetRequestData{
			Length: -1,
		})
		So(e, ShouldBeNil)
		So(reader, ShouldNotBeNil)
		data := []byte{}
		n, _ := io.Copy(bytes.NewBuffer(data), reader)
		reader.Close()
		So(n, ShouldBeGreaterThan, 0)
	})

	Convey("Test Get Tar.gz Selection", t, func() {
		reader, e := zipHandler.GetObject(context.Background(), &tree.Node{
			Path: "path/selection-uuid-selection.tar.gz",
		}, &GetRequestData{
			Length: -1,
		})
		So(e, ShouldBeNil)
		So(reader, ShouldNotBeNil)
		data := []byte{}
		n, _ := io.Copy(bytes.NewBuffer(data), reader)
		reader.Close()
		So(n, ShouldBeGreaterThan, 20)
	})

	Convey("Test Get Wrong Selection Uuid", t, func() {
		_, e := zipHandler.GetObject(context.Background(), &tree.Node{
			Path: "path/selection-uuid2-selection.zip",
		}, &GetRequestData{
			Length: -1,
		})
		So(e, ShouldNotBeNil)
	})

}

func TestArchiveHandler_isArchivePath(t *testing.T) {

	Convey("Test isArchivePath", t, func() {

		a := &ArchiveHandler{}
		ok, format, archivePath, innerPath := a.isArchivePath("path/to/archive.zip/inner")
		So(ok, ShouldBeTrue)
		So(format, ShouldEqual, "zip")
		So(archivePath, ShouldEqual, "path/to/archive.zip")
		So(innerPath, ShouldEqual, "inner")

	})

}
