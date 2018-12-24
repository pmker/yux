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

package activity

import (
	"encoding/binary"
	"encoding/json"
	"fmt"

	"bytes"
	"strconv"
	"strings"

	"github.com/boltdb/bolt"
	"github.com/pmker/yux/common"
	"github.com/pmker/yux/common/boltdb"
	"github.com/pmker/yux/common/proto/activity"
)

type boltdbimpl struct {
	boltdb.DAO

	InboxMaxSize int64
	db           *bolt.DB
}

// Init the storage
func (dao *boltdbimpl) Init(options common.ConfigValues) error {

	// Update defaut inbox max size if set in the config
	dao.InboxMaxSize = options.Int64("InboxMaxSize", dao.InboxMaxSize)

	dao.DB().Update(func(tx *bolt.Tx) error {
		_, err := tx.CreateBucketIfNotExists([]byte(activity.OwnerType_USER.String()))
		if err != nil {
			return err
		}
		_, err = tx.CreateBucketIfNotExists([]byte(activity.OwnerType_NODE.String()))
		if err != nil {
			return err
		}
		return nil
	})

	return nil
}

// Load a given sub-bucket
// Bucket are structured like this:
// users
//   -> USER_ID
//      -> inbox [all notifications triggered by subscriptions or explicit alerts]
//      -> outbox [all user activities history]
//      -> lastread [id of the last inbox notification read]
//      -> lastsent [id of the last inbox notification sent by email, used for digest]
//      -> subscriptions [list of other users following her activities, with status]
// nodes
//   -> NODE_ID
//      -> outbox [all node activities, including its children ones]
//      -> subscriptions [list of users following this node activity]
func (dao *boltdbimpl) getBucket(tx *bolt.Tx, createIfNotExist bool, ownerType activity.OwnerType, ownerId string, bucketName BoxName) (*bolt.Bucket, error) {

	mainBucket := tx.Bucket([]byte(ownerType.String()))
	if createIfNotExist {

		objectBucket, err := mainBucket.CreateBucketIfNotExists([]byte(ownerId))
		if err != nil {
			return nil, err
		}
		targetBucket, err := objectBucket.CreateBucketIfNotExists([]byte(bucketName))
		if err != nil {
			return nil, err
		}
		return targetBucket, nil
	}

	objectBucket := mainBucket.Bucket([]byte(ownerId))
	if objectBucket == nil {
		return nil, nil
	}
	targetBucket := objectBucket.Bucket([]byte(bucketName))
	if targetBucket == nil {
		return nil, nil
	}
	return targetBucket, nil
}

func (dao *boltdbimpl) PostActivity(ownerType activity.OwnerType, ownerId string, boxName BoxName, object *activity.Object) error {

	err := dao.DB().Update(func(tx *bolt.Tx) error {

		bucket, err := dao.getBucket(tx, true, ownerType, ownerId, boxName)
		if err != nil {
			return err
		}
		objectKey, _ := bucket.NextSequence()
		object.Id = fmt.Sprintf("/activity-%v", objectKey)

		jsonData, _ := json.Marshal(object)

		k := make([]byte, 8)
		binary.BigEndian.PutUint64(k, objectKey)
		return bucket.Put(k, jsonData)

	})
	return err

}

func (dao *boltdbimpl) UpdateSubscription(subscription *activity.Subscription) error {

	err := dao.DB().Update(func(tx *bolt.Tx) error {

		bucket, err := dao.getBucket(tx, true, subscription.ObjectType, subscription.ObjectId, BoxSubscriptions)
		if err != nil {
			return err
		}

		events := subscription.Events
		if len(events) == 0 {
			return bucket.Delete([]byte(subscription.UserId))
		}

		eventsData, _ := json.Marshal(events)
		return bucket.Put([]byte(subscription.UserId), eventsData)
	})
	return err
}

func (dao *boltdbimpl) ListSubscriptions(objectType activity.OwnerType, objectIds []string) (subs []*activity.Subscription, err error) {

	userIds := make(map[string]bool)
	e := dao.DB().View(func(tx *bolt.Tx) error {

		for _, objectId := range objectIds {
			bucket, _ := dao.getBucket(tx, false, objectType, objectId, BoxSubscriptions)
			if bucket == nil {
				continue
			}
			bucket.ForEach(func(k, v []byte) error {
				uId := string(k)
				if _, exists := userIds[uId]; exists {
					return nil // Already listed
				}
				var events []string
				uE := json.Unmarshal(v, &events)
				if uE != nil {
					return uE
				}
				subs = append(subs, &activity.Subscription{
					UserId:     uId,
					Events:     events,
					ObjectType: objectType,
					ObjectId:   objectId,
				})
				userIds[uId] = true
				return nil
			})
		}

		return nil
	})

	return subs, e
}

func (dao *boltdbimpl) ActivitiesFor(ownerType activity.OwnerType, ownerId string, boxName BoxName, refBoxOffset BoxName, reverseOffset int64, limit int64, result chan *activity.Object, done chan bool) error {

	defer func() {
		done <- true
	}()
	if boxName == "" {
		boxName = BoxOutbox
	}
	var lastRead []byte
	if limit == 0 && refBoxOffset == "" {
		limit = 20
	}

	var uintOffset uint64
	if refBoxOffset != "" {
		uintOffset = dao.ReadLastUserInbox(ownerId, refBoxOffset)
	}

	dao.DB().View(func(tx *bolt.Tx) error {
		// Assume bucket exists and has keys
		bucket, _ := dao.getBucket(tx, false, ownerType, ownerId, boxName)
		if bucket == nil {
			// Does not exists, just return
			return nil
		}
		c := bucket.Cursor()
		i := int64(0)
		total := int64(0)
		var prevObj *activity.Object
		for k, v := c.Last(); k != nil; k, v = c.Prev() {
			if uintOffset > 0 && dao.bytesToUint(k) <= uintOffset {
				break
			}
			if len(lastRead) == 0 {
				lastRead = k
			}
			if reverseOffset > 0 && i < reverseOffset {
				i++
				continue
			}
			acObject := &activity.Object{}
			err := json.Unmarshal(v, acObject)
			if prevObj != nil && dao.activitiesAreSimilar(prevObj, acObject) {
				prevObj = acObject // Ignore similar events - TODO : add occurrence number?
				continue
			}
			if err == nil {
				i++
				total++
				result <- acObject
				prevObj = acObject
			} else {
				return err
			}
			if limit > 0 && total >= limit {
				break
			}
		}
		return nil
	})

	if refBoxOffset != BoxLastSent && ownerType == activity.OwnerType_USER && boxName == BoxInbox && len(lastRead) > 0 {
		// Store last read in dedicated box
		go func() {
			dao.StoreLastUserInbox(ownerId, BoxLastRead, lastRead, "")
		}()
	}

	return nil

}

func (dao *boltdbimpl) ReadLastUserInbox(userId string, boxName BoxName) uint64 {

	var last []byte
	dao.DB().View(func(tx *bolt.Tx) error {
		bucket, _ := dao.getBucket(tx, false, activity.OwnerType_USER, userId, boxName)
		if bucket == nil {
			return nil
		}
		last = bucket.Get([]byte("last"))
		return nil
	})
	if len(last) > 0 {
		return dao.bytesToUint(last)
	}
	return 0
}

// Store last key read to a "Last" inbox (read, sent)
func (dao *boltdbimpl) StoreLastUserInbox(userId string, boxName BoxName, last []byte, activityId string) error {

	if last == nil && activityId != "" {
		id := strings.TrimPrefix(activityId, "/activity-")
		uintId, _ := strconv.ParseUint(id, 10, 64)
		last = dao.uintToBytes(uintId)
	}

	return dao.DB().Update(func(tx *bolt.Tx) error {
		bucket, err := dao.getBucket(tx, true, activity.OwnerType_USER, userId, boxName)
		if err != nil {
			return err
		}
		return bucket.Put([]byte("last"), last)
	})
}

func (dao *boltdbimpl) CountUnreadForUser(userId string) int {

	var unread int
	lastRead := dao.ReadLastUserInbox(userId, BoxLastRead)

	dao.DB().View(func(tx *bolt.Tx) error {

		bucket, _ := dao.getBucket(tx, false, activity.OwnerType_USER, userId, BoxInbox)
		if bucket != nil {
			c := bucket.Cursor()
			for k, _ := c.Last(); k != nil; k, _ = c.Prev() {
				kUint := dao.bytesToUint(k)
				if kUint <= lastRead {
					break
				}
				unread++
			}
		}
		return nil
	})

	return unread
}

// Should be wired to "USER_DELETE" and "NODE_DELETE" events
// to remove (or archive?) deprecated queues
func (dao *boltdbimpl) Delete(ownerType activity.OwnerType, ownerId string) error {

	err := dao.DB().Update(func(tx *bolt.Tx) error {

		b := tx.Bucket([]byte(ownerType.String()))
		if b == nil {
			return nil
		}
		idBucket := b.Bucket([]byte(ownerId))
		if idBucket == nil {
			return nil
		}
		return b.DeleteBucket([]byte(ownerId))

	})

	return err
}

func (dao *boltdbimpl) activitiesAreSimilar(acA *activity.Object, acB *activity.Object) bool {
	if acA.Actor == nil || acA.Object == nil || acB.Actor == nil || acB.Object == nil {
		return false
	}
	return acA.Type == acB.Type && acA.Actor.Id == acB.Actor.Id && acA.Object.Id == acB.Object.Id
}

// Transform an uint64 to a storable []byte array
func (dao *boltdbimpl) uintToBytes(i uint64) []byte {
	k := make([]byte, 8)
	binary.BigEndian.PutUint64(k, i)
	return k
}

// Transform stored []byte to an uint64
func (dao *boltdbimpl) bytesToUint(by []byte) uint64 {
	var num uint64
	binary.Read(bytes.NewBuffer(by[:]), binary.BigEndian, &num)
	return num
}
