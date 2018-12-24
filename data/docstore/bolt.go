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

package docstore

import (
	"context"
	"encoding/json"
	"os"
	"time"

	"github.com/boltdb/bolt"
	"github.com/micro/go-micro/errors"
	"go.uber.org/zap"

	"github.com/pmker/yux/common"
	"github.com/pmker/yux/common/log"
	"github.com/pmker/yux/common/proto/docstore"
)

var (
	// Jobs Configurations
	storeBucketString = "store-"
)

type BoltStore struct {
	// Internal DB
	db *bolt.DB
	// For Testing purpose : delete file after closing
	DeleteOnClose bool
	// Path to the DB file
	DbPath string
}

func NewBoltStore(fileName string, deleteOnClose ...bool) (*BoltStore, error) {

	bs := &BoltStore{
		DbPath: fileName,
	}
	if len(deleteOnClose) > 0 && deleteOnClose[0] {
		bs.DeleteOnClose = true
	}
	options := bolt.DefaultOptions
	options.Timeout = 5 * time.Second
	db, err := bolt.Open(fileName, 0644, options)
	if err != nil {
		return nil, err
	}
	bs.db = db
	return bs, nil

}

func (b *BoltStore) Close() error {
	err := b.db.Close()
	if b.DeleteOnClose {
		os.Remove(b.DbPath)
	}
	return err
}

func (s *BoltStore) GetStore(tx *bolt.Tx, storeID string, mode string) (*bolt.Bucket, error) {

	key := []byte(storeBucketString + storeID)
	if mode == "read" {
		if bucket := tx.Bucket(key); bucket != nil {
			return bucket, nil
		} else {
			return nil, errors.NotFound(common.SERVICE_DOCSTORE, "Store Not Found")
		}
	} else {
		return tx.CreateBucketIfNotExists(key)
	}

}

func (s *BoltStore) PutDocument(storeID string, doc *docstore.Document) error {

	err := s.db.Update(func(tx *bolt.Tx) error {

		log.Logger(context.Background()).Debug("Bolt:PutDocument", zap.String("storeId", storeID), zap.Any("doc", doc))
		bucket, err := s.GetStore(tx, storeID, "write")
		if err != nil {
			return err
		}
		jsonData, err := json.Marshal(doc)
		if err != nil {
			return err
		}
		return bucket.Put([]byte(doc.ID), jsonData)

	})
	return err

}

func (s *BoltStore) GetDocument(storeID string, docId string) (*docstore.Document, error) {

	j := &docstore.Document{}
	e := s.db.View(func(tx *bolt.Tx) error {

		bucket, err := s.GetStore(tx, storeID, "read")
		if err != nil {
			return err
		}
		data := bucket.Get([]byte(docId))
		if data == nil {
			return errors.NotFound(common.SERVICE_DOCSTORE, "Doc ID not found")
		}
		err = json.Unmarshal(data, j)
		if err != nil {
			return errors.InternalServerError(common.SERVICE_DOCSTORE, "Cannot deserialize document")
		}
		return nil
	})

	if e != nil {
		return nil, e
	}
	return j, nil

}

func (s *BoltStore) DeleteDocument(storeID string, docID string) error {

	return s.db.Update(func(tx *bolt.Tx) error {

		bucket, err := s.GetStore(tx, storeID, "write")
		if err != nil {
			return err
		}
		return bucket.Delete([]byte(docID))

	})

}

func (s *BoltStore) ListDocuments(storeID string, query *docstore.DocumentQuery) (chan *docstore.Document, chan bool, error) {

	res := make(chan *docstore.Document)
	done := make(chan bool, 1)

	go func() {

		s.db.View(func(tx *bolt.Tx) error {
			defer func() {
				done <- true
				close(done)
			}()
			bucket, e := s.GetStore(tx, storeID, "read")
			if e != nil {
				return e
			}

			c := bucket.Cursor()
			for k, v := c.First(); k != nil; k, v = c.Next() {
				j := &docstore.Document{}
				err := json.Unmarshal(v, j)
				if err != nil {
					continue
				}
				if query != nil && query.Owner != "" && j.Owner != query.Owner {
					continue
				}
				res <- j
			}
			return nil
		})

	}()

	return res, done, nil
}
