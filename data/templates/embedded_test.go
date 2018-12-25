package templates

import (
	"testing"

	"io/ioutil"

	. "github.com/smartystreets/goconvey/convey"
)

func TestGetProvider(t *testing.T) {
	Convey("Test Providers and Embedded DAO", t, func() {
		dao := GetProvider()
		nodes := dao.List()
		So(nodes, ShouldHaveLength, 11)
		n := nodes[0]
		So(n.AsTemplate().UUID, ShouldEqual, "01-Microsoft Word 2007_2010_2013 XML.docx")
		So(n.AsTemplate().Label, ShouldEqual, "Microsoft Word 2007/2010/2013 XML")
		So(n.IsLeaf(), ShouldBeTrue)
		So(n.List(), ShouldHaveLength, 0)
		reader, size, e := n.Read()
		So(e, ShouldBeNil)
		So(size, ShouldBeGreaterThan, 0)
		data, _ := ioutil.ReadAll(reader)
		So(len(data), ShouldBeGreaterThan, 0)

		byId, e := dao.ByUUID("06-Microsoft PowerPoint Template.pot")
		So(e, ShouldBeNil)
		So(byId.AsTemplate().UUID, ShouldEqual, "06-Microsoft PowerPoint Template.pot")
	})
}
