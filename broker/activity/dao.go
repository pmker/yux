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

// Package activity stores and distributes events to users in a social-feed manner.
//
// It is composed of two services, one GRPC for persistence layer and one REST for logic.
// Persistence is currently only implemented using a BoltDB store.
package activity

import (
	"github.com/pydio/cells/common/boltdb"
	"github.com/pydio/cells/common/dao"
	"github.com/pydio/cells/common/proto/activity"
)

type BoxName string

const (
	BoxInbox         BoxName = "inbox"
	BoxOutbox        BoxName = "outbox"
	BoxSubscriptions BoxName = "subscriptions"
	BoxLastRead      BoxName = "lastread"
	BoxLastSent      BoxName = "lastsent"
)

type DAO interface {
	dao.DAO

	// Post an activity to target inbox
	PostActivity(ownerType activity.OwnerType, ownerId string, boxName BoxName, object *activity.Object) error

	// Update Subscription status
	UpdateSubscription(subscription *activity.Subscription) error

	// List subscriptions on a given object
	// Returns a map of userId => status (true/false, required to disable default subscriptions like workspaces)
	ListSubscriptions(objectType activity.OwnerType, objectIds []string) ([]*activity.Subscription, error)

	// Count the number of unread activities in user "Inbox" box
	CountUnreadForUser(userId string) int

	// Load activities for a given owner. Targets "outbox" by default
	ActivitiesFor(ownerType activity.OwnerType, ownerId string, boxName BoxName, refBoxOffset BoxName, reverseOffset int64, limit int64, result chan *activity.Object, done chan bool) error

	// Store the last read uint ID for a given box
	StoreLastUserInbox(userId string, boxName BoxName, last []byte, activityId string) error

	// Should be wired to "USER_DELETE" and "NODE_DELETE" events
	// to remove (or archive?) deprecated queues
	Delete(ownerType activity.OwnerType, ownerId string) error
}

func NewDAO(o dao.DAO) dao.DAO {
	switch v := o.(type) {
	case boltdb.DAO:
		return &boltdbimpl{DAO: v, InboxMaxSize: 1000}
	}
	return nil
}
