package config

import (
	"encoding/json"
	"testing"

	. "github.com/smartystreets/goconvey/convey"
)

func TestLoadSampleConf(t *testing.T) {

	Convey("Testing json validity of sample config", t, func() {
		var data map[string]interface{}
		e := json.Unmarshal([]byte(SampleConfig), &data)
		So(e, ShouldBeNil)
		_, ok := data["services"]
		So(ok, ShouldBeTrue)
	})

}
