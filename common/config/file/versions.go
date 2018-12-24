package file

import (
	"path/filepath"
	"time"

	"encoding/binary"
	"encoding/json"

	"github.com/boltdb/bolt"
)

var (
	versionsBucket = []byte("versions")
)

// Structure for encapsulating a new version of configs with additional metadata
type Version struct {
	Id   uint64
	Date time.Time
	User string
	Log  string
	Data interface{}
}

// Interface for storing and listing configs versions
type VersionsStore interface {
	Put(version *Version) error
	List(offset uint64, limit uint64) ([]*Version, error)
	Retrieve(id uint64) (*Version, error)
}

// BoltDB implementation of the Store interface
type BoltStore struct {
	FileName string
}

// Open a new store
func NewStore(configDir string) (VersionsStore, error) {
	filename := filepath.Join(configDir, "configs-versions.db")
	return &BoltStore{
		FileName: filename,
	}, nil
}

func (b *BoltStore) GetConnection() (*bolt.DB, error) {

	options := bolt.DefaultOptions
	options.Timeout = 2 * time.Second
	db, err := bolt.Open(b.FileName, 0644, options)
	if err != nil {
		return nil, err
	}
	err = db.Update(func(tx *bolt.Tx) error {
		_, e := tx.CreateBucketIfNotExists(versionsBucket)
		return e
	})
	if err != nil {
		return nil, err
	}
	return db, nil

}

// Put stores version in Bolt
func (b *BoltStore) Put(version *Version) error {

	db, err := b.GetConnection()
	if err != nil {
		return err
	}
	defer db.Close()
	return db.Update(func(tx *bolt.Tx) error {

		bucket := tx.Bucket(versionsBucket)
		objectId, _ := bucket.NextSequence()
		version.Id = objectId

		objectKey := make([]byte, 8)
		binary.BigEndian.PutUint64(objectKey, objectId)

		data, _ := json.Marshal(version)
		return bucket.Put(objectKey, data)

	})

}

// Put lists all version starting at a given id
func (b *BoltStore) List(offset uint64, limit uint64) (result []*Version, err error) {

	db, er := b.GetConnection()
	if er != nil {
		err = er
		return
	}
	defer db.Close()

	err = db.View(func(tx *bolt.Tx) error {
		bucket := tx.Bucket(versionsBucket)
		c := bucket.Cursor()
		var count uint64
		if offset > 0 {
			offsetKey := make([]byte, 8)
			binary.BigEndian.PutUint64(offsetKey, offset)
			c.Seek(offsetKey)
			for k, v := c.Seek(offsetKey); k != nil; k, v = c.Prev() {
				var version Version
				if e := json.Unmarshal(v, &version); e == nil {
					result = append(result, &version)
				}
				count++
				if count >= limit {
					break
				}
			}
		} else {
			for k, v := c.Last(); k != nil; k, v = c.Prev() {
				var version Version
				if e := json.Unmarshal(v, &version); e == nil {
					result = append(result, &version)
				}
				count++
				if count >= limit {
					break
				}
			}
		}
		return nil
	})

	return
}

// Retrieve loads data from db by version ID
func (b *BoltStore) Retrieve(id uint64) (*Version, error) {

	db, err := b.GetConnection()
	if err != nil {
		return nil, err
	}
	defer db.Close()

	var version Version
	objectKey := make([]byte, 8)
	binary.BigEndian.PutUint64(objectKey, id)
	e := db.View(func(tx *bolt.Tx) error {
		data := tx.Bucket(versionsBucket).Get(objectKey)
		return json.Unmarshal(data, &version)
	})
	if e != nil {
		return nil, e
	}
	return &version, nil
}
