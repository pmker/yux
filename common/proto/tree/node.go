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

package tree

import (
	"encoding/json"
	"path"
	"strings"
	"time"

	"github.com/golang/protobuf/proto"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"

	"github.com/pydio/cells/common"
)

/* This file provides helpers and shortcuts to ease development of tree.node related features.
   As a rule of thumb, never touch the tree.pb.go that is generated via proto. */

/* VARIOUS HELPERS TO MANAGE NODES */

// Clone node to avoid modifying it directly
func (node *Node) Clone() *Node{
	return proto.Clone(node).(*Node)
}

// IsLeaf checks if node is of type NodeType_LEAF or NodeType_COLLECTION
func (node *Node) IsLeaf() bool {
	return node.Type == NodeType_LEAF
}

// IsLeafInt checks if node is of type NodeType_LEAF or NodeType_COLLECTION, return as 0/1 integer (for storing)
func (node *Node) IsLeafInt() int {
	if node.Type == NodeType_LEAF {
		return 1
	}
	return 0
}

// GetModTime returns the last modification timestamp
func (node *Node) GetModTime() time.Time {
	return time.Unix(0, node.MTime*int64(time.Second))
}

// HasSource checks if node has a DataSource and Object Service metadata set
func (node *Node) HasSource() bool {
	return node.HasMetaKey(common.META_NAMESPACE_DATASOURCE_NAME)
}

/* METADATA MANAGEMENT */

// GetMeta retrieves a metadata and unmarshall it to JSON format
func (node *Node) GetMeta(namespace string, jsonStruc interface{}) error {
	metaString := node.getMetaString(namespace)
	if metaString == "" {
		return nil
	}
	return json.Unmarshal([]byte(metaString), &jsonStruc)
}

// SetMeta sets a metadata by marshalling to JSON
func (node *Node) SetMeta(namespace string, jsonMeta interface{}) (err error) {
	if node.MetaStore == nil {
		node.MetaStore = make(map[string]string)
	}
	var bytes []byte
	bytes, err = json.Marshal(jsonMeta)
	node.MetaStore[namespace] = string(bytes)
	return err
}

// GetStringMeta easily returns the string value of the MetaData for this key
// or an empty string if the MetaData for this key is not defined
func (node *Node) GetStringMeta(namespace string) string {
	var value string
	node.GetMeta(namespace, &value)
	return value
}

// HasMetaKey checks if a metaData with this key has been defined
func (node *Node) HasMetaKey(keyName string) bool {
	if node.MetaStore == nil {
		return false
	}
	_, ok := node.MetaStore[keyName]
	return ok
}

// AllMetaDeserialized unmarshall all defined metadata to JSON objects,
// skipping reserved meta (e.g. meta that have a key prefixed by "pydio:")
func (node *Node) AllMetaDeserialized() map[string]interface{} {

	if len(node.MetaStore) == 0 {
		return map[string]interface{}{}
	}
	m := make(map[string]interface{}, len(node.MetaStore))
	for k := range node.MetaStore {
		if strings.HasPrefix(k, "pydio:") {
			continue
		}
		var data interface{}
		node.GetMeta(k, &data)
		m[k] = data
	}
	return m
}

// WithoutReservedMetas returns a copy of this node, after removing all reserved meta
func (node *Node) WithoutReservedMetas() *Node {
	newNode := proto.Clone(node).(*Node)
	for k := range newNode.MetaStore {
		if strings.HasPrefix(k, "pydio:") {
			delete(newNode.MetaStore, k)
		}
	}
	return newNode
}

// LegacyMeta enrich metadata store for this node adding info for some legacy keys
func (node *Node) LegacyMeta(meta map[string]interface{}) {
	meta["uuid"] = node.Uuid
	meta["bytesize"] = node.Size
	meta["ajxp_modiftime"] = node.MTime
	meta["etag"] = node.Etag
	if _, basename := path.Split(node.Path); basename != node.GetStringMeta("name") {
		meta["text"] = node.GetStringMeta("name")
	}
}

/*
type jsonMarshallableNode struct {
	Node
	Meta         map[string]interface{} `json:"Meta"`
	ReadableType string                 `json:"type"`
}

// Specific JSON Marshalling for backward compatibility with previous Pydio
// versions
func (node *Node) MarshalJSONPB(marshaler *jsonpb.Marshaler) ([]byte, error) {

	meta := node.AllMetaDeserialized()
	node.LegacyMeta(meta)
	output := &jsonMarshallableNode{Node: *node}
	output.Meta = meta
	output.MetaStore = nil
	if node.Type == NodeType_LEAF {
		output.ReadableType = "LEAF"
		meta["is_file"] = true
	} else if node.Type == NodeType_COLLECTION {
		output.ReadableType = "COLLECTION"
		meta["is_file"] = false
	}
	return json.Marshal(output)

}
*/

/* LOGGING SUPPORT */

// Zap simply returns a zapcore.Field object populated with this node and with a standard key
func (node *Node) Zap() zapcore.Field {
	return zap.Any(common.KEY_NODE, node)
}

// ZapPath simply calls zap.String() with NodePath standard key and this node path
func (node *Node) ZapPath() zapcore.Field {
	return zap.String(common.KEY_NODE_PATH, node.GetPath())
}

// ZapUuid simply calls zap.String() with NodeUuid standard key and this node uuid
func (node *Node) ZapUuid() zapcore.Field {
	return zap.String(common.KEY_NODE_UUID, node.GetUuid())
}

// Zap simply returns a zapcore.Field object populated with this ChangeLog uneder a standard key
func (log *ChangeLog) Zap() zapcore.Field {
	return zap.Any(common.KEY_CHANGE_LOG, log)
}

// Zap simply returns a zapcore.Field object populated with this VersioningPolicy under a standard key
func (policy *VersioningPolicy) Zap() zapcore.Field {
	return zap.Any(common.KEY_VERSIONING_POLICY, policy)
}

// Zap simply returns a zapcore.Field object populated with this VersioningPolicy under a standard key
func (msg *NodeChangeEvent) Zap() zapcore.Field {
	return zap.Any(common.KEY_NODE_CHANGE_EVENT, msg)
}

/*PACKAGE PROTECTED METHODS */

// setMetaString sets a metadata in string format
func (node *Node) setMetaString(namespace string, meta string) {
	if node.MetaStore == nil {
		node.MetaStore = make(map[string]string)
	}
	if meta == "" {
		delete(node.MetaStore, namespace)
	} else {
		node.MetaStore[namespace] = meta
	}
}

// getMetaString gets a metadata string
func (node *Node) getMetaString(namespace string) (meta string) {
	if node.MetaStore == nil {
		return ""
	}
	var ok bool
	if meta, ok = node.MetaStore[namespace]; ok {
		return meta
	}
	return ""
}
