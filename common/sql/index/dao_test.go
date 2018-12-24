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
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"log"
	"strconv"
	"sync"
	"testing"
	"time"

	_ "github.com/mattn/go-sqlite3"
	. "github.com/smartystreets/goconvey/convey"

	"github.com/pmker/yux/common/proto/tree"
	"github.com/pmker/yux/common/service/context"
	"github.com/pmker/yux/common/sql"
	"github.com/pmker/yux/common/utils"
)

var (
	ctxNoCache context.Context
)

func init() {

	SetDefaultFailureMode(FailureContinues)

	// Running first without a cache
	sqlDAO := sql.NewDAO("sqlite3", "file::memnocache:?mode=memory&cache=shared", "test")
	if sqlDAO == nil {
		fmt.Print("Could not start test")
		return
	}

	d := NewDAO(sqlDAO, "ROOT")
	if err := d.Init(options); err != nil {
		fmt.Print("Could not start test ", err)
		return
	}

	ctxNoCache = servicecontext.WithDAO(context.Background(), d)
}

func TestMysql(t *testing.T) {

	// Adding a file
	Convey("Test adding a file - Success", t, func() {
		err := getDAO(ctxNoCache).AddNode(mockNode)
		So(err, ShouldBeNil)

		// printTree()
		// printNodes()
	})

	// Setting a file
	Convey("Test setting a file - Success", t, func() {
		newNode := NewNode(&tree.Node{
			Uuid: "ROOT",
			Type: tree.NodeType_LEAF,
		}, []uint64{2}, []string{""})

		err := getDAO(ctxNoCache).SetNode(newNode)
		So(err, ShouldBeNil)

		// printTree()
		// printNodes()

		err = getDAO(ctxNoCache).SetNode(mockNode)
		So(err, ShouldBeNil)
	})

	// Delete a file
	// TODO - needs to be deleted by UUID
	Convey("Test deleting a file - Success", t, func() {
		err := getDAO(ctxNoCache).DelNode(mockNode)
		So(err, ShouldBeNil)

		// printTree()
		// printNodes()
	})

	Convey("Re-adding a file - Success", t, func() {
		err := getDAO(ctxNoCache).AddNode(mockNode)
		So(err, ShouldBeNil)

		//printTree()
		//printNodes()
	})

	Convey("Re-adding the same file - Failure", t, func() {
		err := getDAO(ctxNoCache).AddNode(mockNode)
		So(err, ShouldNotBeNil)

		// printTree()
		// printNodes()
	})

	Convey("Test Getting a file - Success", t, func() {

		node, err := getDAO(ctxNoCache).GetNode([]uint64{1})
		So(err, ShouldBeNil)

		// Setting MTime to 0 so we can compare
		node.MTime = 0

		So(node.Node, ShouldResemble, mockNode.Node)
	})

	// Setting a file
	Convey("Test setting a file with a massive path - Success", t, func() {

		err := getDAO(ctxNoCache).AddNode(mockLongNode)
		So(err, ShouldBeNil)

		err = getDAO(ctxNoCache).AddNode(mockLongNodeChild1)
		So(err, ShouldBeNil)

		err = getDAO(ctxNoCache).AddNode(mockLongNodeChild2)
		So(err, ShouldBeNil)

		//printTree()
		//printNodes()

		node, err := getDAO(ctxNoCache).GetNode(mockLongNodeChild2MPath)
		So(err, ShouldBeNil)

		// TODO - find a way
		node.MTime = 0
		node.Path = mockLongNodeChild2.Path

		So(node.Node, ShouldResemble, mockLongNodeChild2.Node)
	})

	Convey("Test Getting a node by uuid - Success", t, func() {
		node, err := getDAO(ctxNoCache).GetNodeByUUID("mockLongNode")
		So(err, ShouldBeNil)

		// Setting MTime to 0 so we can compare
		node.MTime = 0
		node.Path = "mockLongNode"

		So(node.Node, ShouldResemble, mockLongNode.Node)
	})

	// Getting a file
	Convey("Test Getting a child node", t, func() {

		node, err := getDAO(ctxNoCache).GetNodeChild(mockLongNodeMPath, "mockLongNodeChild1")

		So(err, ShouldBeNil)

		// TODO - find a way
		node.MTime = 0
		node.Path = mockLongNodeChild1.Path

		So(node.Node, ShouldNotResemble, mockLongNodeChild2.Node)
		So(node.Node, ShouldResemble, mockLongNodeChild1.Node)
	})

	// Setting a file
	Convey("Test Getting the last child of a node", t, func() {

		node, err := getDAO(ctxNoCache).GetNodeLastChild(mockLongNodeMPath)

		So(err, ShouldBeNil)

		// TODO - find a way
		node.MTime = 0
		node.Path = mockLongNodeChild2.Path

		So(node.Node, ShouldNotResemble, mockLongNodeChild1.Node)
		So(node.Node, ShouldResemble, mockLongNodeChild2.Node)
	})

	// Getting children count
	Convey("Test Getting the Children Count of a node", t, func() {

		count := getDAO(ctxNoCache).GetNodeChildrenCount(mockLongNodeMPath)

		So(count, ShouldEqual, 2)
	})

	// Setting a file
	Convey("Test Getting the Children of a node", t, func() {

		var i int
		for _ = range getDAO(ctxNoCache).GetNodeChildren(mockLongNodeMPath) {
			i++
		}

		So(i, ShouldEqual, 2)
	})

	// Setting a file
	Convey("Test Getting the Children of a node", t, func() {

		var i int
		for _ = range getDAO(ctxNoCache).GetNodeTree([]uint64{1}) {
			i++
		}

		So(i, ShouldEqual, 3)
	})

	// Setting a file
	Convey("Test Getting Nodes by MPath", t, func() {

		var i int
		for _ = range getDAO(ctxNoCache).GetNodes(mockLongNodeChild1MPath, mockLongNodeChild2MPath) {
			i++
		}

		So(i, ShouldEqual, 2)
	})

	// Setting a file
	Convey("Setting multiple nodes at once", t, func() {
		b := getDAO(ctxNoCache).SetNodes("test", 10)

		mpath := mockLongNodeMPath

		for len(mpath) > 0 {
			node := utils.NewTreeNode()
			node.SetMPath(mpath...)
			b.Send(node)
			mpath = mpath.Parent()
		}

		err := b.Close()

		So(err, ShouldBeNil)
	})

	// Setting a mpath multiple times
	Convey("Setting a same mpath multiple times", t, func() {

		node1 := utils.NewTreeNode()
		node1.Node = &tree.Node{Uuid: "test-same-mpath", Type: tree.NodeType_LEAF}
		node1.SetMPath(1, 21, 12, 7)
		err := getDAO(ctxNoCache).AddNode(node1)
		So(err, ShouldBeNil)

		node2 := utils.NewTreeNode()
		node2.Node = &tree.Node{Uuid: "test-same-mpath2", Type: tree.NodeType_LEAF}
		node2.SetMPath(1, 21, 12, 7)
		err = getDAO(ctxNoCache).AddNode(node2)
		So(err, ShouldNotBeNil)
	})

	Convey("Test wrong children due to same MPath start", t, func() {

		node1 := utils.NewTreeNode()
		node1.Node = &tree.Node{Uuid: "parent1", Type: tree.NodeType_COLLECTION}
		node1.SetMPath(1, 1)

		node2 := utils.NewTreeNode()
		node2.Node = &tree.Node{Uuid: "parent2", Type: tree.NodeType_COLLECTION}
		node2.SetMPath(1, 15)

		node11 := utils.NewTreeNode()
		node11.Node = &tree.Node{Uuid: "child1.1", Type: tree.NodeType_COLLECTION}
		node11.SetMPath(1, 1, 1)

		node21 := utils.NewTreeNode()
		node21.Node = &tree.Node{Uuid: "child2.1", Type: tree.NodeType_COLLECTION}
		node21.SetMPath(1, 15, 1)

		e := getDAO(ctxNoCache).AddNode(node1)
		So(e, ShouldBeNil)
		e = getDAO(ctxNoCache).AddNode(node2)
		So(e, ShouldBeNil)
		e = getDAO(ctxNoCache).AddNode(node11)
		So(e, ShouldBeNil)
		e = getDAO(ctxNoCache).AddNode(node21)
		So(e, ShouldBeNil)

		// List Root
		nodes := getDAO(ctxNoCache).GetNodeChildren(utils.MPath{1})
		count := 0
		for range nodes {
			count++
		}
		So(count, ShouldEqual, 2)

		// List Parent1 Children
		nodes = getDAO(ctxNoCache).GetNodeTree(utils.MPath{1})
		count = 0
		for c := range nodes {
			log.Println(c)
			count++
		}
		So(count, ShouldEqual, 8) // Because of previous tests there are other nodes

		// List Parent1 Children
		nodes = getDAO(ctxNoCache).GetNodeChildren(utils.MPath{1, 1})
		count = 0
		for range nodes {
			count++
		}
		So(count, ShouldEqual, 1)

	})

	Convey("Test Etag Compute", t, func() {

		// Test the following tree
		//
		// Parent  					: -1
		//    -> Child bbb  		: xxx
		//    -> Child aaa  		: yyy
		//    -> Child ccc  		: -1
		// 		   -> Child a-aaa	: zzz
		// 		   -> Child a-bbb	: qqq
		//
		// At the end, "Child ccc" and "Parent" should have a correct etag

		const etag1 = "xxxx"
		const etag2 = "yyyy"

		const etag3 = "zzzz"
		const etag4 = "qqqq"

		node := utils.NewTreeNode()
		node.Node = &tree.Node{Uuid: "etag-parent-folder", Type: tree.NodeType_COLLECTION}
		node.SetMPath(1, 16)
		node.Etag = "-1"

		node11 := utils.NewTreeNode()
		node11.Node = &tree.Node{Uuid: "etag-child-1", Type: tree.NodeType_LEAF}
		node11.SetMPath(1, 16, 1)
		node11.Etag = etag1
		node11.SetMeta("name", "\"bbb\"")

		node12 := utils.NewTreeNode()
		node12.Node = &tree.Node{Uuid: "etag-child-2", Type: tree.NodeType_LEAF}
		node12.SetMPath(1, 16, 2)
		node12.Etag = etag2
		node12.SetMeta("name", "\"aaa\"")

		node13 := utils.NewTreeNode()
		node13.Node = &tree.Node{Uuid: "etag-child-3", Type: tree.NodeType_COLLECTION}
		node13.SetMPath(1, 16, 3)
		node13.Etag = "-1"
		node13.SetMeta("name", "\"ccc\"")

		node14 := utils.NewTreeNode()
		node14.Node = &tree.Node{Uuid: "etag-child-child-1", Type: tree.NodeType_LEAF}
		node14.SetMPath(1, 16, 3, 1)
		node14.Etag = etag3
		node14.SetMeta("name", "\"a-aaa\"")

		node15 := utils.NewTreeNode()
		node15.Node = &tree.Node{Uuid: "etag-child-child-2", Type: tree.NodeType_LEAF}
		node15.SetMPath(1, 16, 3, 2)
		node15.Etag = etag4
		node15.SetMeta("name", "\"a-bbb\"")

		e := getDAO(ctxNoCache).AddNode(node)
		So(e, ShouldBeNil)
		e = getDAO(ctxNoCache).AddNode(node11)
		So(e, ShouldBeNil)
		e = getDAO(ctxNoCache).AddNode(node12)
		So(e, ShouldBeNil)
		e = getDAO(ctxNoCache).AddNode(node13)
		So(e, ShouldBeNil)
		e = getDAO(ctxNoCache).AddNode(node14)
		So(e, ShouldBeNil)
		e = getDAO(ctxNoCache).AddNode(node15)
		So(e, ShouldBeNil)

		e = getDAO(ctxNoCache).ResyncDirtyEtags(node)
		So(e, ShouldBeNil)
		intermediaryNode, e := getDAO(ctxNoCache).GetNode(node13.MPath)
		So(e, ShouldBeNil)
		hash := md5.New()
		hash.Write([]byte(etag3 + "." + etag4))
		newEtag := hex.EncodeToString(hash.Sum(nil))
		So(intermediaryNode.Etag, ShouldEqual, newEtag)

		parentNode, e := getDAO(ctxNoCache).GetNode(node.MPath)
		So(e, ShouldBeNil)
		hash2 := md5.New()
		hash2.Write([]byte(etag2 + "." + etag1 + "." + intermediaryNode.Etag))
		newEtag2 := hex.EncodeToString(hash2.Sum(nil))
		So(parentNode.Etag, ShouldEqual, newEtag2)

	})

}

func TestCommits(t *testing.T) {

	Convey("Test Insert / List / Delete", t, func() {

		node := utils.NewTreeNode()
		node.Node = &tree.Node{Uuid: "etag-child-1", Type: tree.NodeType_LEAF}
		node.SetMPath(1, 16, 1)
		node.Etag = "first-etag"
		node.MTime = time.Now().Unix()
		node.Size = 2444
		node.SetMeta("name", "\"bbb\"")

		err := getDAO(ctxNoCache).PushCommit(node)
		So(err, ShouldBeNil)

		node.Etag = "second-etag"
		err = getDAO(ctxNoCache).PushCommit(node)
		So(err, ShouldBeNil)

		logs, err := getDAO(ctxNoCache).ListCommits(node)
		So(err, ShouldBeNil)
		So(logs, ShouldHaveLength, 2)
		So(logs[0].Uuid, ShouldEqual, "second-etag")
		So(logs[1].Uuid, ShouldEqual, "first-etag")

		err = getDAO(ctxNoCache).DeleteCommits(node)
		So(err, ShouldBeNil)
		logs, err = getDAO(ctxNoCache).ListCommits(node)
		So(err, ShouldBeNil)
		So(logs, ShouldHaveLength, 0)

	})

}

func TestStreams(t *testing.T) {
	Convey("Re-adding a file - Success", t, func() {
		c, e := getDAO(ctxNoCache).AddNodeStream(5)

		for i := 1; i <= 1152; i++ {
			node := utils.NewTreeNode()
			node.Node = &tree.Node{Uuid: "testing-stream" + strconv.Itoa(i), Type: tree.NodeType_LEAF}
			node.SetMPath(1, 17, uint64(i))

			c <- node
		}

		close(c)

		So(<-e, ShouldBeNil)

		idx, err := getDAO(ctxNoCache).GetNodeFirstAvailableChildIndex(utils.NewMPath(1, 17))
		So(err, ShouldBeNil)
		So(idx, ShouldEqual, 1153)
	})
}

func TestArborescence(t *testing.T) {
	Convey("Creating an arborescence in the index", t, func() {
		arborescence := []string{
			"__MACOSX",
			"__MACOSX/personal",
			"__MACOSX/personal/admin",
			"__MACOSX/personal/admin/._.DS_Store",
			"personal",
			"personal/.pydio",
			"personal/admin",
			"personal/admin/.DS_Store",
			"personal/admin/.pydio",
			"personal/admin/Archive",
			"personal/admin/Archive/.pydio",
			"personal/admin/Archive/__MACOSX",
			"personal/admin/Archive/__MACOSX/.pydio",
			"personal/admin/Archive/EventsDarwin.txt",
			"personal/admin/Archive/photographie.jpg",
			"personal/admin/Archive.zip",
			"personal/admin/download.png",
			"personal/admin/EventsDarwin.txt",
			"personal/admin/Labellized",
			"personal/admin/Labellized/.pydio",
			"personal/admin/Labellized/Dossier Chateau de Vaux - Dossier diag -.zip",
			"personal/admin/Labellized/photographie.jpg",
			"personal/admin/PydioCells",
			"personal/admin/PydioCells/.DS_Store",
			"personal/admin/PydioCells/.pydio",
			"personal/admin/PydioCells/4c7f2f-EventsDarwin.txt",
			"personal/admin/PydioCells/download1.png",
			"personal/admin/PydioCells/icomoon (1)",
			"personal/admin/PydioCells/icomoon (1)/.DS_Store",
			"personal/admin/PydioCells/icomoon (1)/.pydio",
			"personal/admin/PydioCells/icomoon (1)/demo-files",
			"personal/admin/PydioCells/icomoon (1)/demo-files/.pydio",
			"personal/admin/PydioCells/icomoon (1)/demo-files/demo.css",
			"personal/admin/PydioCells/icomoon (1)/demo-files/demo.js",
			"personal/admin/PydioCells/icomoon (1)/demo.html",
			"personal/admin/PydioCells/icomoon (1)/Read Me.txt",
			"personal/admin/PydioCells/icomoon (1)/selection.json",
			"personal/admin/PydioCells/icomoon (1)/style.css",
			"personal/admin/PydioCells/icomoon (1).zip",
			"personal/admin/PydioCells/icons-signs.svg",
			"personal/admin/PydioCells/Pydio-cells0.ai",
			"personal/admin/PydioCells/Pydio-cells1-Mod.ai",
			"personal/admin/PydioCells/Pydio-cells1.ai",
			"personal/admin/PydioCells/Pydio-cells2.ai",
			"personal/admin/PydioCells/PydioCells Logos.zip",
			"personal/admin/recycle_bin",
			"personal/admin/recycle_bin/.ajxp_recycle_cache.ser",
			"personal/admin/recycle_bin/.pydio",
			"personal/admin/recycle_bin/Archive.zip",
			"personal/admin/recycle_bin/cells-clear-minus.svg",
			"personal/admin/recycle_bin/cells-clear-plus.svg",
			"personal/admin/recycle_bin/cells-full-minus.svg",
			"personal/admin/recycle_bin/cells-full-plus.svg",
			"personal/admin/recycle_bin/cells.svg",
			"personal/admin/recycle_bin/Dossier Chateau de Vaux - Dossier diag -",
			"personal/admin/recycle_bin/Dossier Chateau de Vaux - Dossier diag -/.pydio",
			"personal/admin/recycle_bin/Dossier Chateau de Vaux - Dossier diag -/Dossier Chateau de Vaux - Dossier diag -",
			"personal/admin/recycle_bin/Dossier Chateau de Vaux - Dossier diag -/Dossier Chateau de Vaux - Dossier diag -/.pydio",
			"personal/admin/recycle_bin/Dossier Chateau de Vaux - Dossier diag -.zip",
			"personal/admin/recycle_bin/STACK.txt",
			"personal/admin/recycle_bin/Synthèse des pathologies et urgences sanitaires.doc",
			"personal/admin/STACK.txt",
			"personal/admin/Test Toto",
			"personal/admin/Test Toto/.pydio",
			"personal/admin/Test Toto/download1 very long name test with me please.png",
			"personal/admin/Test Toto/Pydio-color-logo-4.png",
			"personal/admin/Test Toto/PydioCells Logos.zip",
			"personal/admin/Test Toto/STACK.txt",
			"personal/admin/Up",
			"personal/admin/Up/.DS_Store",
			"personal/admin/Up/.pydio",
			"personal/admin/Up/2018 03 08 - Pydio Cells.key",
			"personal/admin/Up/2018 03 08 - Pydio Cells.pdf",
			"personal/admin/Up/Pydio-color-logo-2.png",
			"personal/admin/Up/Pydio-color-logo-4.png",
			"personal/admin/Up/Pydio20180201.mm",
			"personal/admin/Up/Repair Result to pydio-logs-2018-3-13 06348.xml",
			"personal/external",
			"personal/external/.pydio",
			"personal/external/Pydio-color-logo-4.png",
			"personal/external/recycle_bin",
			"personal/external/recycle_bin/.pydio",
			"personal/recycle_bin",
			"personal/recycle_bin/.ajxp_recycle_cache.ser",
			"personal/recycle_bin/.pydio",
			"personal/toto",
			"personal/toto/.pydio",
			"personal/toto/recycle_bin",
			"personal/toto/recycle_bin/.pydio",
			"personal/user",
			"personal/user/.pydio",
			"personal/user/recycle_bin",
			"personal/user/recycle_bin/.pydio",
			"personal/user/User Folder",
			"personal/user/User Folder/.pydio",
		}

		for _, path := range arborescence {
			_, _, err := getDAO(ctxNoCache).Path(path, true)

			So(err, ShouldBeNil)
		}

		getDAO(ctxNoCache).Flush(true)
	})
}

func TestSmallArborescence(t *testing.T) {
	arborescence := []string{
		"testcreatethenmove",
		"testcreatethenmove/.pydio",
	}

	for _, path := range arborescence {
		getDAO(ctxNoCache).Path(path, true)
	}

	getDAO(ctxNoCache).Flush(true)
}

func TestArborescenceNoFolder(t *testing.T) {
	Convey("Creating an arborescence without folders in the index", t, func(c C) {
		arborescence := []string{
			"__MACOSX/arbo_no_folder/admin",
			"__MACOSX/arbo_no_folder/admin/._.DS_Store",
			"arbo_no_folder/.pydio",
			"arbo_no_folder/admin/.DS_Store",
			"arbo_no_folder/admin/.pydio",
			"arbo_no_folder/admin/Archive/__MACOSX",
			"arbo_no_folder/admin/Archive/__MACOSX/.pydio",
			"arbo_no_folder/admin/Archive/EventsDarwin.txt",
			"arbo_no_folder/admin/Archive/photographie.jpg",
			"arbo_no_folder/admin/Archive.zip",
			"arbo_no_folder/admin/download.png",
			"arbo_no_folder/admin/EventsDarwin.txt",
			"arbo_no_folder/admin/Labellized/.pydio",
			"arbo_no_folder/admin/Labellized/Dossier Chateau de Vaux - Dossier diag -.zip",
			"arbo_no_folder/admin/Labellized/photographie.jpg",
			"arbo_no_folder/admin/PydioCells/.DS_Store",
			"arbo_no_folder/admin/PydioCells/.pydio",
			"arbo_no_folder/admin/PydioCells/4c7f2f-EventsDarwin.txt",
			"arbo_no_folder/admin/PydioCells/download1.png",
			"arbo_no_folder/admin/PydioCells/icomoon (1)",
			"arbo_no_folder/admin/PydioCells/icomoon (1)/.DS_Store",
			"arbo_no_folder/admin/PydioCells/icomoon (1)/.pydio",
			"arbo_no_folder/admin/PydioCells/icomoon (1)/demo-files",
			"arbo_no_folder/admin/PydioCells/icomoon (1)/demo-files/.pydio",
			"arbo_no_folder/admin/PydioCells/icomoon (1)/demo-files/demo.css",
			"arbo_no_folder/admin/PydioCells/icomoon (1)/demo-files/demo.js",
			"arbo_no_folder/admin/PydioCells/icomoon (1)/demo.html",
			"arbo_no_folder/admin/PydioCells/icomoon (1)/Read Me.txt",
			"arbo_no_folder/admin/PydioCells/icomoon (1)/selection.json",
			"arbo_no_folder/admin/PydioCells/icomoon (1)/style.css",
			"arbo_no_folder/admin/PydioCells/icomoon (1).zip",
			"arbo_no_folder/admin/PydioCells/icons-signs.svg",
			"arbo_no_folder/admin/PydioCells/Pydio-cells0.ai",
			"arbo_no_folder/admin/PydioCells/Pydio-cells1-Mod.ai",
			"arbo_no_folder/admin/PydioCells/Pydio-cells1.ai",
			"arbo_no_folder/admin/PydioCells/Pydio-cells2.ai",
			"arbo_no_folder/admin/PydioCells/PydioCells Logos.zip",
			"arbo_no_folder/admin/recycle_bin/.ajxp_recycle_cache.ser",
			"arbo_no_folder/admin/recycle_bin/.pydio",
			"arbo_no_folder/admin/recycle_bin/Archive.zip",
			"arbo_no_folder/admin/recycle_bin/cells-clear-minus.svg",
			"arbo_no_folder/admin/recycle_bin/cells-clear-plus.svg",
			"arbo_no_folder/admin/recycle_bin/cells-full-minus.svg",
			"arbo_no_folder/admin/recycle_bin/cells-full-plus.svg",
			"arbo_no_folder/admin/recycle_bin/cells.svg",
			"arbo_no_folder/admin/recycle_bin/Dossier Chateau de Vaux - Dossier diag -",
			"arbo_no_folder/admin/recycle_bin/Dossier Chateau de Vaux - Dossier diag -/.pydio",
			"arbo_no_folder/admin/recycle_bin/Dossier Chateau de Vaux - Dossier diag -/Dossier Chateau de Vaux - Dossier diag -",
			"arbo_no_folder/admin/recycle_bin/Dossier Chateau de Vaux - Dossier diag -/Dossier Chateau de Vaux - Dossier diag -/.pydio",
			"arbo_no_folder/admin/recycle_bin/Dossier Chateau de Vaux - Dossier diag -.zip",
			"arbo_no_folder/admin/recycle_bin/STACK.txt",
			"arbo_no_folder/admin/recycle_bin/Synthèse des pathologies et urgences sanitaires.doc",
			"arbo_no_folder/admin/STACK.txt",
			"arbo_no_folder/admin/Test Toto/.pydio",
			"arbo_no_folder/admin/Test Toto/download1 very long name test with me please.png",
			"arbo_no_folder/admin/Test Toto/Pydio-color-logo-4.png",
			"arbo_no_folder/admin/Test Toto/PydioCells Logos.zip",
			"arbo_no_folder/admin/Test Toto/STACK.txt",
			"arbo_no_folder/admin/Up/.DS_Store",
			"arbo_no_folder/admin/Up/.pydio",
			"arbo_no_folder/admin/Up/2018 03 08 - Pydio Cells.key",
			"arbo_no_folder/admin/Up/2018 03 08 - Pydio Cells.pdf",
			"arbo_no_folder/admin/Up/Pydio-color-logo-2.png",
			"arbo_no_folder/admin/Up/Pydio-color-logo-4.png",
			"arbo_no_folder/admin/Up/Pydio20180201.mm",
			"arbo_no_folder/admin/Up/Repair Result to pydio-logs-2018-3-13 06348.xml",
			"arbo_no_folder/external/.pydio",
			"arbo_no_folder/external/Pydio-color-logo-4.png",
			"arbo_no_folder/external/recycle_bin",
			"arbo_no_folder/external/recycle_bin/.pydio",
			"arbo_no_folder/recycle_bin/.ajxp_recycle_cache.ser",
			"arbo_no_folder/recycle_bin/.pydio",
			"arbo_no_folder/toto/.pydio",
			"arbo_no_folder/toto/recycle_bin/.pydio",
			"arbo_no_folder/user/.pydio",
			"arbo_no_folder/user/recycle_bin/.pydio",
			"arbo_no_folder/user/User Folder/.pydio",
		}

		wg := &sync.WaitGroup{}
		for _, path := range arborescence {
			wg.Add(1)
			go func(p string) {
				_, _, err := getDAO(ctxNoCache).Path(p, true)

				c.So(err, ShouldBeNil)

				wg.Done()
			}(path)
		}

		wg.Wait()

		getDAO(ctxNoCache).Flush(true)

		// printTree(ctxNoCache)
	})
}

func TestMoveNodeTree(t *testing.T) {
	Convey("Test movin a node in the tree", t, func() {
		arborescence := []string{
			"personal",
			"personal/.DS_Store",
			"personal/.pydio",
			"personal/admin",
			"personal/admin/.DS_Store",
			"personal/admin/.pydio",
			"personal/admin/Archive",
			"personal/admin/Archive/.pydio",
			"personal/admin/Archive/__MACOSX",
			"personal/admin/Archive/__MACOSX/.pydio",
			"personal/admin/Archive/EventsDarwin.txt",
			"personal/admin/Archive/photographie.jpg",
			"personal/admin/Archive.zip",
			"personal/admin/download.png",
			"personal/admin/EventsDarwin.txt",
			"personal/admin/Labellized",
			"personal/admin/Labellized/.pydio",
			"personal/admin/Labellized/Dossier Chateau de Vaux - Dossier diag -.zip",
			"personal/admin/Labellized/photographie.jpg",
			"personal/admin/PydioCells",
			"personal/admin/PydioCells/.DS_Store",
			"personal/admin/PydioCells/.pydio",
			"personal/admin/PydioCells/4c7f2f-EventsDarwin.txt",
			"personal/admin/PydioCells/download1.png",
			"personal/admin/PydioCells/icomoon (1)",
			"personal/admin/PydioCells/icomoon (1)/.DS_Store",
			"personal/admin/PydioCells/icomoon (1)/.pydio",
			"personal/admin/PydioCells/icomoon (1)/demo-files",
			"personal/admin/PydioCells/icomoon (1)/demo-files/.pydio",
			"personal/admin/PydioCells/icomoon (1)/demo-files/demo.css",
			"personal/admin/PydioCells/icomoon (1)/demo-files/demo.js",
			"personal/admin/PydioCells/icomoon (1)/demo.html",
			"personal/admin/PydioCells/icomoon (1)/Read Me.txt",
			"personal/admin/PydioCells/icomoon (1)/selection.json",
			"personal/admin/PydioCells/icomoon (1)/style.css",
			"personal/admin/PydioCells/icomoon (1).zip",
			"personal/admin/PydioCells/icons-signs.svg",
			"personal/admin/PydioCells/Pydio-cells0.ai",
			"personal/admin/PydioCells/Pydio-cells1-Mod.ai",
			"personal/admin/PydioCells/Pydio-cells1.ai",
			"personal/admin/PydioCells/Pydio-cells2.ai",
			"personal/admin/PydioCells/PydioCells Logos.zip",
			"personal/admin/recycle_bin",
			"personal/admin/recycle_bin/.ajxp_recycle_cache.ser",
			"personal/admin/recycle_bin/.DS_Store",
			"personal/admin/recycle_bin/.pydio",
			"personal/admin/recycle_bin/Archive.zip",
			"personal/admin/recycle_bin/cells-clear-minus.svg",
			"personal/admin/recycle_bin/cells-clear-plus.svg",
			"personal/admin/recycle_bin/cells-full-minus.svg",
			"personal/admin/recycle_bin/cells-full-plus.svg",
			"personal/admin/recycle_bin/cells.svg",
			"personal/admin/recycle_bin/Dossier Chateau de Vaux - Dossier diag -",
			"personal/admin/recycle_bin/Dossier Chateau de Vaux - Dossier diag -/.DS_Store",
			"personal/admin/recycle_bin/Dossier Chateau de Vaux - Dossier diag -/.pydio",
			"personal/admin/recycle_bin/Dossier Chateau de Vaux - Dossier diag -/Dossier Chateau de Vaux - Dossier diag -",
			"personal/admin/recycle_bin/Dossier Chateau de Vaux - Dossier diag -/Dossier Chateau de Vaux - Dossier diag -/.pydio",
			"personal/admin/recycle_bin/Dossier Chateau de Vaux - Dossier diag - 2",
			"personal/admin/recycle_bin/Dossier Chateau de Vaux - Dossier diag - 2/.DS_Store",
			"personal/admin/recycle_bin/Dossier Chateau de Vaux - Dossier diag -.zip",
			"personal/admin/recycle_bin/STACK.txt",
			"personal/admin/recycle_bin/Synthèse des pathologies et urgences sanitaires.doc",
			"personal/admin/STACK.txt",
			"personal/admin/Test Toto",
			"personal/admin/Test Toto/.pydio",
			"personal/admin/Test Toto/download1 very long name test with me please.png",
			"personal/admin/Test Toto/Pydio-color-logo-4.png",
			"personal/admin/Test Toto/PydioCells Logos.zip",
			"personal/admin/Test Toto/STACK.txt",
			"personal/admin/Up",
			"personal/admin/Up/.DS_Store",
			"personal/admin/Up/.pydio",
			"personal/admin/Up/2018 03 08 - Pydio Cells.key",
			"personal/admin/Up/2018 03 08 - Pydio Cells.pdf",
			"personal/admin/Up/Pydio-color-logo-2.png",
			"personal/admin/Up/Pydio-color-logo-4.png",
			"personal/admin/Up/Pydio20180201.mm",
			"personal/admin/Up/Repair Result to pydio-logs-2018-3-13 06348.xml",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/.pydio",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/Chateau de Vaux - Dossier diag -.indd",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/Chateau de Vaux - Dossier diag RELU.pdf",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/ep assemble.txt",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/Fonts",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/Fonts/.pydio",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/Fonts/arial.ttf",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/Fonts/arialbd.ttf",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/Fonts/ariali.ttf",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/Fonts/calibri.ttf",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/Fonts/calibrib.ttf",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/Fonts/calibrii.ttf",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/Links",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/Links/.pydio",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/Links/2017061674_ET7_SLR_AVOIR5_ET_7_SLR_AVOIR1_CHATEAU_VAUX-p.jpg",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/Links/Atlas de Trudaine Foucheres.tif",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/Links/cache_31574817.png",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/Links/Carte de Vaux.jpg",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/Links/carte localisation.jpg",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/Links/elevation cour avec retombe.jpg",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/Links/elevation jardin.jpg",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/Links/Etage 2.jpg",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/Links/Etage avec retombes.jpg",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/Links/Hôtel Dieu.jpg",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/Links/maps commune.jpg",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/Links/PDG.jpg",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/Links/pdg2.jpg",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/Links/Plan domaine fin XVIIIe.jpg",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/Links/plan masse.jpg",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/Links/Projet XIXe plan.jpg",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/Links/Projet XIXe siècle.jpg",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/Links/RDC Avec modifs.jpg",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/Links/Saint ménéhould.jpg",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/Links/Seigneurie de Vaux.jpg",
			"personal/Dossier Chateau de Vaux - Dossier diag - 2/Links/SS avec retombefs.jpg",
			"personal/external",
			"personal/external/.DS_Store",
			"personal/external/.pydio",
			"personal/external/Pydio-color-logo-4.png",
			"personal/external/recycle_bin",
			"personal/external/recycle_bin/.pydio",
			"personal/recycle_bin",
			"personal/recycle_bin/.ajxp_recycle_cache.ser",
			"personal/recycle_bin/.pydio",
			"personal/toto",
			"personal/toto/.pydio",
			"personal/toto/recycle_bin",
			"personal/toto/recycle_bin/.pydio",
			"personal/user",
			"personal/user/.DS_Store",
			"personal/user/.pydio",
			"personal/user/recycle_bin",
			"personal/user/recycle_bin/.pydio",
			"personal/user/User Folder",
			"personal/user/User Folder/.pydio",
		}

		for _, path := range arborescence {
			getDAO(ctxNoCache).Path(path, true)
		}

		getDAO(ctxNoCache).Flush(true)

		// Then we move a node
		pathFrom, _, err := getDAO(ctxNoCache).Path("/personal/Dossier Chateau de Vaux - Dossier diag - 2", false)
		So(err, ShouldBeNil)
		pathTo, _, err := getDAO(ctxNoCache).Path("/Dossier Chateau de Vaux - Dossier diag - 2", true)
		So(err, ShouldBeNil)

		nodeFrom, err := getDAO(ctxNoCache).GetNode(pathFrom)
		So(err, ShouldBeNil)
		nodeTo, err := getDAO(ctxNoCache).GetNode(pathTo)
		So(err, ShouldBeNil)

		// First of all, we delete the existing node
		if nodeTo != nil {
			err = getDAO(ctxNoCache).DelNode(nodeTo)
			So(err, ShouldBeNil)
		}

		err = getDAO(ctxNoCache).MoveNodeTree(nodeFrom, nodeTo)
		So(err, ShouldBeNil)

		var i int
		for _ = range getDAO(ctxNoCache).GetNodeTree(pathTo) {
			i++
		}

		So(i, ShouldEqual, 35)

	})
}
