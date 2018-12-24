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

package chat

import (
	"encoding/binary"
	"encoding/json"

	"github.com/boltdb/bolt"
	"github.com/micro/go-micro/errors"
	"github.com/pborman/uuid"

	"github.com/pmker/yux/common"
	"github.com/pmker/yux/common/boltdb"
	"github.com/pmker/yux/common/proto/chat"
)

type boltdbimpl struct {
	boltdb.DAO
	HistorySize int64
}

const (
	rooms         = "rooms"
	messages      = "messages"
	generalObject = "general"
)

func (h *boltdbimpl) Init(config common.ConfigValues) error {
	h.DB().Update(func(tx *bolt.Tx) error {
		_, err := tx.CreateBucketIfNotExists([]byte(rooms))
		if err != nil {
			return err
		}
		_, err = tx.CreateBucketIfNotExists([]byte(messages))
		if err != nil {
			return err
		}
		return nil
	})

	return nil
}

// Load a given sub-bucket
// Bucket are structured like this:
// rooms
//   -> Room Types
//      -> Type Objects
//      	-> UUID => Rooms
// messages
//   -> ROOM IDS
//      -> UUID => messages
func (h *boltdbimpl) getMessagesBucket(tx *bolt.Tx, createIfNotExist bool, roomUuid string) (*bolt.Bucket, error) {

	mainBucket := tx.Bucket([]byte(messages))
	if createIfNotExist {

		objectBucket, err := mainBucket.CreateBucketIfNotExists([]byte(roomUuid))
		if err != nil {
			return nil, err
		}
		return objectBucket, nil

	} else {

		objectBucket := mainBucket.Bucket([]byte(roomUuid))
		if objectBucket == nil {
			return nil, nil
		}
		return objectBucket, nil
	}
}

func (h *boltdbimpl) getRoomsBucket(tx *bolt.Tx, createIfNotExist bool, roomType chat.RoomType, roomObject string) (*bolt.Bucket, error) {

	mainBucket := tx.Bucket([]byte(messages))
	if createIfNotExist {

		objectBucket, err := mainBucket.CreateBucketIfNotExists([]byte(roomType.String()))
		if err != nil {
			return nil, err
		}
		if len(roomObject) == 0 {
			return objectBucket, nil
		}
		targetBucket, err := objectBucket.CreateBucketIfNotExists([]byte(roomObject))
		if err != nil {
			return nil, err
		}
		return targetBucket, nil

	} else {

		objectBucket := mainBucket.Bucket([]byte(roomType.String()))
		if objectBucket == nil {
			return nil, nil
		}
		if len(roomObject) == 0 {
			return objectBucket, nil
		}
		targetBucket := objectBucket.Bucket([]byte(roomObject))
		if targetBucket == nil {
			return nil, nil
		}
		return targetBucket, nil
	}
}

func (h *boltdbimpl) PutRoom(room *chat.ChatRoom) (*chat.ChatRoom, error) {

	err := h.DB().Update(func(tx *bolt.Tx) error {

		bucket, err := h.getRoomsBucket(tx, true, room.Type, room.RoomTypeObject)
		if err != nil {
			return err
		}
		if room.Uuid == "" {
			room.Uuid = uuid.NewUUID().String()
		}
		serialized, _ := json.Marshal(room)
		return bucket.Put([]byte(room.Uuid), serialized)

	})

	return room, err
}

func (h *boltdbimpl) DeleteRoom(room *chat.ChatRoom) (bool, error) {

	var success bool
	err := h.DB().Update(func(tx *bolt.Tx) error {

		bucket, err := h.getRoomsBucket(tx, false, room.Type, room.RoomTypeObject)
		if bucket == nil {
			success = true
			return nil
		}
		if err != nil {
			return err
		}
		return bucket.Delete([]byte(room.Uuid))

	})

	return success, err
}

func (h *boltdbimpl) ListRooms(request *chat.ListRoomsRequest) (rooms []*chat.ChatRoom, e error) {

	e = h.DB().View(func(tx *bolt.Tx) error {

		if request.TypeObject != "" {

			bucket, _ := h.getRoomsBucket(tx, false, request.ByType, request.TypeObject)
			if bucket == nil {
				return nil
			}
			err := bucket.ForEach(func(k, v []byte) error {
				var room chat.ChatRoom
				err := json.Unmarshal(v, &room)
				if err != nil {
					return err
				}
				rooms = append(rooms, &room)
				return nil
			})
			if err != nil {
				return err
			}

		} else {

			bucket, _ := h.getRoomsBucket(tx, false, request.ByType, "")
			return bucket.ForEach(func(k, v []byte) error {
				if v != nil {
					return nil
				}
				subBucket := bucket.Bucket(k)
				return subBucket.ForEach(func(k, v []byte) error {
					var room chat.ChatRoom
					err := json.Unmarshal(v, &room)
					if err != nil {
						return err
					}
					rooms = append(rooms, &room)
					return nil
				})
			})

		}

		return nil
	})

	return rooms, e
}
func (h *boltdbimpl) ListMessages(request *chat.ListMessagesRequest) (messages []*chat.ChatMessage, e error) {

	e = h.DB().View(func(tx *bolt.Tx) error {

		bucket, _ := h.getMessagesBucket(tx, false, request.RoomUuid)
		if bucket == nil {
			return nil
		}
		return bucket.ForEach(func(k, v []byte) error {
			var msg chat.ChatMessage
			err := json.Unmarshal(v, &msg)
			if err != nil {
				return err
			}
			messages = append(messages, &msg)
			return nil
		})

	})

	return messages, e
}
func (h *boltdbimpl) PostMessage(msg *chat.ChatMessage) (*chat.ChatMessage, error) {

	if msg.Uuid == "" {
		msg.Uuid = uuid.NewUUID().String()
	}

	err := h.DB().Update(func(tx *bolt.Tx) error {
		bucket, err := h.getMessagesBucket(tx, true, msg.RoomUuid)
		if err != nil {
			return nil
		}

		objectKey, _ := bucket.NextSequence()
		k := make([]byte, 8)
		binary.BigEndian.PutUint64(k, objectKey)
		serial, _ := json.Marshal(msg)
		return bucket.Put(k, serial)
	})

	return msg, err
}

func (h *boltdbimpl) DeleteMessage(message *chat.ChatMessage) error {

	if message.Uuid == "" {
		return errors.BadRequest(common.SERVICE_CHAT, "Cannot delete a message without Uuid")
	}

	err := h.DB().Update(func(tx *bolt.Tx) error {
		bucket, err := h.getMessagesBucket(tx, false, message.RoomUuid)
		if err != nil || bucket == nil {
			return nil
		}
		return bucket.ForEach(func(k, v []byte) error {
			var msg chat.ChatMessage
			if err := json.Unmarshal(v, &msg); err == nil && msg.Uuid == message.Uuid {
				return bucket.Delete(k)
			}
			return nil
		})
	})

	return err
}
