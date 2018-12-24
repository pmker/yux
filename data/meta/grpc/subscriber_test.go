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

package grpc

import (
	"context"
	"sync"
	"testing"

	"github.com/pmker/yux/common/event"
	"github.com/pmker/yux/common/proto/tree"
	. "github.com/smartystreets/goconvey/convey"
)

func TestEventsSubscriber_Handle(t *testing.T) {

	Convey("Test Events Subscriber", t, func() {

		out := make(chan *event.EventWithContext)
		subscriber := &EventsSubscriber{
			outputChannel: out,
		}

		wg := sync.WaitGroup{}
		wg.Add(1)
		var output *event.EventWithContext
		go func() {
			defer wg.Done()
			for {
				select {
				case e := <-out:
					if e != nil {
						output = e
					} else {
						return
					}
				}
			}
		}()

		ctx := context.Background()
		ev := &tree.NodeChangeEvent{
			Type:   tree.NodeChangeEvent_CREATE,
			Source: &tree.Node{},
		}
		subscriber.Handle(ctx, ev)
		close(out)

		wg.Wait()

		So(output, ShouldResemble, &event.EventWithContext{
			Context: ctx,
			Event:   ev,
		})

	})

}
