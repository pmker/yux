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

package auth

import (
	"context"
	"time"

	"github.com/boltdb/bolt"
	"github.com/pydio/cells/common/log"
	"github.com/pydio/cells/common/proto/auth"
	"go.uber.org/zap"
)

type BoltStore struct {
	db                *bolt.DB
	tokenBucket       []byte
	connectionsBucket []byte
}

func NewBoltStore(tokenBucket string, filename string) (*BoltStore, error) {

	bs := &BoltStore{
		tokenBucket: []byte(tokenBucket),
	}

	options := bolt.DefaultOptions
	options.Timeout = 5 * time.Second
	db, err := bolt.Open(filename, 0644, options)
	if err != nil {
		return nil, err
	}

	er := db.Update(func(tx *bolt.Tx) error {
		_, err := tx.CreateBucketIfNotExists([]byte(bs.tokenBucket))
		return err
	})

	if er != nil {
		db.Close()
		return nil, er
	}

	bs.db = db
	return bs, nil
}

func (b *BoltStore) Close() error {
	return b.db.Close()
}

func (b *BoltStore) PutToken(t *auth.Token) error {

	return b.db.Update(func(tx *bolt.Tx) error {
		bucket := tx.Bucket(b.tokenBucket)
		return bucket.Put([]byte(t.Value), []byte(t.AdditionalInfo))
	})
}

func (b *BoltStore) GetInfo(value string) (string, error) {
	sc := make(chan string, 1)
	e := b.db.View(func(tx *bolt.Tx) error {
		bucket := tx.Bucket(b.tokenBucket)
		infoBytes := bucket.Get([]byte(value))
		sc <- string(infoBytes)
		return nil
	})

	if e != nil {
		return "", e
	}
	return <-sc, nil
}

func (b *BoltStore) DeleteToken(t string) error {
	return b.db.Update(func(tx *bolt.Tx) error {
		bucket := tx.Bucket(b.tokenBucket)
		err := bucket.Delete([]byte(t))
		if err != nil {
			log.Logger(context.Background()).Error("Error on Token Deletion: ", zap.Error(err))
		}
		return err
	})
}

func (b *BoltStore) ListTokens(offset int, count int) (chan *auth.Token, error) {
	tc := make(chan *auth.Token, count)

	e := b.db.View(func(tx *bolt.Tx) error {
		bucket := tx.Bucket(b.tokenBucket)
		c := bucket.Cursor()
		k, v := c.First()

		processedCount := 0
		for processedCount < count && k != nil && v != nil {
			if count >= offset {
				tc <- &auth.Token{
					Value:          string(k),
					AdditionalInfo: string(v),
				}
				processedCount++
			}
			k, v = c.Next()
		}
		return nil
	})

	if len(tc) == 0 {
		return nil, nil
	}

	return tc, e
}
