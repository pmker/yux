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
	"crypto/md5"
	"database/sql"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"sync"

	"github.com/pborman/uuid"
	"github.com/pmker/yux/common"
	"github.com/pmker/yux/common/dao"
	"github.com/pmker/yux/common/proto/tree"
	commonsql "github.com/pmker/yux/common/sql"
	"github.com/pmker/yux/common/utils"
)

var (
	cache      = make(map[string]DAO)
	cacheMutex = &sync.Mutex{}
)

type daocache struct {
	DAO

	session string

	// MPAth Cache
	cache      map[string]*utils.TreeNode
	childCache map[string][]*utils.TreeNode

	// NameCache
	nameCache map[string][]*utils.TreeNode

	mutex *sync.RWMutex

	insertChan chan *utils.TreeNode
	insertDone chan bool

	errors []error

	current string
}

type DAOWrapper func(d DAO) DAO

// NewDAOCache wraps a cache around the dao
func NewDAOCache(session string, d DAO) DAO {

	ic, err := d.AddNodeStream(100)
	id := make(chan bool, 1)

	c := &daocache{
		DAO:        d,
		session:    session,
		cache:      make(map[string]*utils.TreeNode),
		childCache: make(map[string][]*utils.TreeNode),
		nameCache:  make(map[string][]*utils.TreeNode),
		mutex:      &sync.RWMutex{},
		insertChan: ic,
		insertDone: id,
	}

	cacheMutex.Lock()
	defer cacheMutex.Unlock()

	cache[session] = c

	c.resync()

	go func() {
		defer close(c.insertDone)
		for e := range err {
			c.errors = append(c.errors, e)
		}
	}()

	return c
}

// GetDAOCache returns the cache based on the session name
func GetDAOCache(session string) DAO {
	cacheMutex.Lock()
	defer cacheMutex.Unlock()

	if c, ok := cache[session]; ok {
		return c
	}

	return nil
}

func (d *daocache) resync() {
	d.mutex.Lock()
	defer d.mutex.Unlock()

	d.cache = make(map[string]*utils.TreeNode)
	d.childCache = make(map[string][]*utils.TreeNode)
	d.nameCache = make(map[string][]*utils.TreeNode)

	for node := range d.DAO.GetNodeTree(utils.NewMPath(1)) {
		mpath := node.MPath.String()
		pmpath := node.MPath.Parent().String()

		d.cache[mpath] = node
		d.childCache[pmpath] = append(d.childCache[pmpath], node)

		name := node.Name()
		d.nameCache[name] = append(d.nameCache[name], node)
	}
}

// Init the dao cache
func (d *daocache) Init(m common.ConfigValues) error {
	return d.DAO.(dao.DAO).Init(m)
}

// GetConn returns the connection of the underlying dao
func (d *daocache) GetConn() dao.Conn {
	return d.DAO.(dao.DAO).GetConn()
}

// GetConn sets the connection of the underlying dao
func (d *daocache) SetConn(conn dao.Conn) {
	d.DAO.(dao.DAO).SetConn(conn)
}

// GetConn sets a prefix for tables and statements in the dao
func (d *daocache) Prefix() string {
	return d.DAO.(dao.DAO).Prefix()
}

// Driver defines the type of driver used by the dao
func (d *daocache) Driver() string {
	return d.DAO.(dao.DAO).Driver()
}

// DB object
func (d *daocache) DB() *sql.DB {
	return d.DAO.(commonsql.DAO).DB()
}

// Prepare a SQL statement
func (d *daocache) Prepare(name string, args interface{}) error {
	return d.DAO.(commonsql.DAO).Prepare(name, args)
}

// GetStmt returns a statement that had been already prepared
func (d *daocache) GetStmt(name string, args ...interface{}) *sql.Stmt {
	return d.DAO.(commonsql.DAO).GetStmt(name, args...)
}

// UseExclusion defines if the DAO uses mutexes or not
func (d *daocache) UseExclusion() {
	d.DAO.(commonsql.DAO).UseExclusion()
}

// Lock the mutex of DAO requests
func (d *daocache) Lock() {
	d.DAO.(commonsql.DAO).Lock()
}

// Unlock the mutex of DAO requests
func (d *daocache) Unlock() {
	d.DAO.(commonsql.DAO).Unlock()
}

// Path resolution for a node
func (d *daocache) Path(strpath string, create bool, reqNode ...*tree.Node) (utils.MPath, []*utils.TreeNode, error) {

	if len(strpath) == 0 || strpath == "/" {
		return []uint64{1}, nil, nil
	}

	names := strings.Split(strings.TrimLeft(strpath, "/"), "/")

	// If we don't create, then we can just retrieve the node directly
	if !create {
		if node, err := d.GetNodeByPath(names); err != nil {
			return nil, nil, err
		} else {
			return node.MPath, nil, err
		}
	}

	// We are in creation mode, so we need to retrieve the parent node
	// In this function, we consider that the parent node always exists
	ppath := utils.NewMPath(1)
	if len(names) > 1 {
		if pnode, err := d.GetNodeByPath(names[0 : len(names)-1]); err != nil {
			return nil, nil, err
		} else {
			ppath = utils.NewMPathFromMPath(pnode.MPath)
		}
	}

	if index, err := d.GetNodeFirstAvailableChildIndex(ppath); err != nil {
		return nil, nil, err
	} else {
		source := &tree.Node{}

		if len(reqNode) > 0 {
			source = reqNode[0]
		}

		mpath := utils.NewMPath(append(ppath, index)...)

		node := NewNode(source, mpath, names)

		if node.Uuid == "" {
			node.Uuid = uuid.NewUUID().String()
		}

		if node.Etag == "" {
			// Should only happen for folders - generate first Etag from uuid+mtime
			node.Etag = fmt.Sprintf("%x", md5.Sum([]byte(fmt.Sprintf("%s%d", node.Uuid, node.MTime))))
		}

		if err := d.AddNode(node); err != nil {
			return nil, nil, err
		}

		return node.MPath, []*utils.TreeNode{node}, nil
	}
}

// Flush
func (d *daocache) Flush(final bool) error {
	close(d.insertChan)

	// Waiting for the insertion to be fully done
	<-d.insertDone

	var err error

	errs := d.errors
	l := len(errs)

	if l == 1 {
		err = errs[0]
	} else if l > 0 {
		f := make([]string, l)
		for i, e := range errs {
			f[i] = e.Error()
		}
		err = errors.New("Combined errors : " + strings.Join(f, " "))
	}

	if !final {
		// If this isn't the final flush, then we reopen a new cache
		newCache := NewDAOCache(d.session, d.DAO).(*daocache)
		*d = *newCache
		d.resync()
	}

	return err
}

// AddNodeStream should not be used directly with the cache
func (d *daocache) AddNodeStream(max int) (chan *utils.TreeNode, chan error) {
	c := make(chan *utils.TreeNode)
	e := make(chan error)

	go func() {
		defer close(e)
		for _ = range c {
			e <- errors.New("AddNodeStream should not be used directly when using the cache")
		}
	}()

	return c, e
}

// AddNode to the cache and prepares it to be added to the database
func (d *daocache) AddNode(node *utils.TreeNode) error {
	d.mutex.Lock()
	defer d.mutex.Unlock()

	d.insertChan <- node

	mpath := node.MPath.String()
	pmpath := node.MPath.Parent().String()
	name := node.Name()

	d.cache[mpath] = node
	d.childCache[pmpath] = append(d.childCache[pmpath], node)

	d.nameCache[name] = append(d.nameCache[name], node)
	d.current = mpath

	return nil
}

func (d *daocache) SetNode(node *utils.TreeNode) error {

	d.mutex.Lock()
	defer d.mutex.Unlock()

	if err := d.DAO.SetNode(node); err != nil {
		return err
	}

	d.cache[node.MPath.String()] = node

	return nil
}

func (d *daocache) DelNode(node *utils.TreeNode) error {
	d.mutex.Lock()
	defer d.mutex.Unlock()

	if err := d.DAO.DelNode(node); err != nil {
		return err
	}

	delete(d.cache, node.MPath.String())

	return nil
}

// Batch Add / Set / Delete
func (d *daocache) GetNodes(pathes ...utils.MPath) chan *utils.TreeNode {
	return d.DAO.GetNodes(pathes...)
}

func (d *daocache) SetNodes(etag string, size int64) commonsql.BatchSender {
	return d.DAO.SetNodes(etag, size)
}

// Getters
func (d *daocache) GetNode(path utils.MPath) (*utils.TreeNode, error) {
	d.mutex.RLock()
	defer d.mutex.RUnlock()

	if node, ok := d.cache[path.String()]; ok {
		return node, nil
	}

	return d.DAO.GetNode(path)
}

func (d *daocache) GetNodeByUUID(uuid string) (*utils.TreeNode, error) {
	return d.DAO.GetNodeByUUID(uuid)
}

func testEq(a, b []string) bool {

	if a == nil && b == nil {
		return true
	}

	if a == nil || b == nil {
		return false
	}

	if len(a) != len(b) {
		return false
	}

	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}

	return true
}

// GetNodeByPath
func (d *daocache) GetNodeByPath(path []string) (*utils.TreeNode, error) {
	d.mutex.RLock()
	defer d.mutex.RUnlock()

	name := path[len(path)-1]

	// we retrieve a list of potential nodes
	if nodes, ok := d.nameCache[name]; !ok {
		return nil, fmt.Errorf("node missing")
	} else {
		if len(nodes) == 1 {
			node := nodes[0]
			if len(node.MPath) != len(path)+1 {
				return nil, fmt.Errorf("node missing at this level")
			}
			return node, nil
		}

		potentialNodes := []*utils.TreeNode{}

		// Keeping only nodes on right level
		for _, node := range nodes {
			if len(node.MPath) == len(path)+1 { // We're adding 1 to take into account the root
				potentialNodes = append(potentialNodes, node)
			}
		}

		if len(potentialNodes) == 1 {
			return potentialNodes[0], nil
		}

		// Resetting potentialNodes
		newPotentialNodes := []*utils.TreeNode{}

		// Removing nodes with wrong parent
		for i := len(path) - 2; i >= 0; i-- {
			for _, node := range potentialNodes {

				mpath := utils.NewMPath(node.MPath[0 : i+2]...)

				if pnode, ok := d.cache[mpath.String()]; !ok {
					// We can't find the node in the cache - this could be a problem
					continue
				} else if pnode.Name() != path[i] {
					// The parent node name doesn't match what we are looking for
					continue
				}

				newPotentialNodes = append(newPotentialNodes, node)
			}

			if len(newPotentialNodes) == 1 {
				return newPotentialNodes[0], nil
			}

			// Resetting potentialNodes
			potentialNodes = newPotentialNodes
			newPotentialNodes = []*utils.TreeNode{}
		}
	}

	return nil, fmt.Errorf("node presumably missing")
}

func (d *daocache) GetNodeChild(path utils.MPath, name string) (*utils.TreeNode, error) {
	d.mutex.RLock()
	defer d.mutex.RUnlock()

	if nodes, ok := d.childCache[path.String()]; ok {
		for _, node := range nodes {
			if node.Name() == name {
				return node, nil
			}
		}
	}

	return d.DAO.GetNodeChild(path, name)
}
func (d *daocache) GetNodeLastChild(path utils.MPath) (*utils.TreeNode, error) {
	d.mutex.RLock()
	defer d.mutex.RUnlock()

	// Looping
	var currentLast uint64
	var currentLastNode *utils.TreeNode
	if nodes, ok := d.childCache[path.String()]; ok {
		for _, node := range nodes {
			last := node.MPath[len(node.MPath)-1]
			if last > currentLast {
				currentLast = last
				currentLastNode = node
			}
		}
	}

	if currentLastNode != nil {
		return currentLastNode, nil
	}

	return d.DAO.GetNodeLastChild(path)
}
func (d *daocache) GetNodeFirstAvailableChildIndex(path utils.MPath) (uint64, error) {
	d.mutex.RLock()
	defer d.mutex.RUnlock()

	// Looping
	c := d.childCache[path.String()]
	count := len(c)

	if count == 0 {
		return 1, nil
	}

	var currentLast uint64
	slots := make(map[uint64]bool, count)
	for _, node := range c {
		last := node.MPath[len(node.MPath)-1]
		slots[last] = true
		if last > currentLast {
			currentLast = last
		}
	}

	if currentLast > uint64(count) {
		var freeSlot uint64
		for i := 1; i <= count; i++ {
			if _, ok := slots[uint64(i)]; !ok {
				freeSlot = uint64(i)
				break
			}
		}
		if freeSlot > 0 {
			// Found a free slot indeed, return it
			//fmt.Println("Get Node Last Child: returning free slot! ", path.String(), freeSlot)
			return freeSlot, nil
		}
	}

	// Return currentLast + 1
	//fmt.Println("Get Node Last Child: returning last+1", path.String(), currentLast+1)
	return uint64(currentLast + 1), nil

}

func (d *daocache) GetNodeChildrenCount(path utils.MPath) int {

	d.mutex.RLock()
	defer d.mutex.RUnlock()

	res := 0

	if nodes, ok := d.childCache[path.String()]; ok {
		res = len(nodes)
	}

	return res
}

func (d *daocache) GetNodeChildren(path utils.MPath) chan *utils.TreeNode {

	c := make(chan *utils.TreeNode)

	go func() {
		d.mutex.RLock()
		defer d.mutex.RUnlock()
		defer close(c)

		if nodes, ok := d.childCache[path.String()]; ok {
			for _, node := range nodes {
				c <- node
			}
		}
	}()

	return c
}

func (d *daocache) GetNodeTree(path utils.MPath) chan *utils.TreeNode {
	c := make(chan *utils.TreeNode)

	go func() {
		d.mutex.RLock()
		defer d.mutex.RUnlock()
		defer close(c)
		childRegexp := regexp.MustCompile(`^` + path.String() + `\..*`)

		// Looping
		for k, node := range d.cache {
			if childRegexp.Match([]byte(k)) {
				c <- node
			}
		}
	}()

	return c
}
func (d *daocache) MoveNodeTree(nodeFrom *utils.TreeNode, nodeTo *utils.TreeNode) error {

	err := d.DAO.MoveNodeTree(nodeFrom, nodeTo)

	d.resync()

	return err
}
func (d *daocache) PushCommit(node *utils.TreeNode) error {
	return d.DAO.PushCommit(node)
}
func (d *daocache) DeleteCommits(node *utils.TreeNode) error {
	return d.DAO.DeleteCommits(node)
}
func (d *daocache) ListCommits(node *utils.TreeNode) ([]*tree.ChangeLog, error) {
	return d.DAO.ListCommits(node)
}
func (d *daocache) ResyncDirtyEtags(rootNode *utils.TreeNode) error {
	err := d.DAO.ResyncDirtyEtags(rootNode)

	d.resync()

	return err
}
func (d *daocache) CleanResourcesOnDeletion() (error, string) {
	return d.DAO.CleanResourcesOnDeletion()
}
