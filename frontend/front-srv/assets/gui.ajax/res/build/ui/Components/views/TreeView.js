/*
 * Copyright 2007-2017 Charles du Jeu - Abstrium SAS <team (at) pyd.io>
 * This file is part of Pydio.
 *
 * Pydio is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Pydio is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Pydio.  If not, see <http://www.gnu.org/licenses/>.
 *
 * The latest code can be found at <https://pydio.com>.
 */

'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _utilDND = require('../util/DND');

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _pydio = require('pydio');

var _pydio2 = _interopRequireDefault(_pydio);

var _Pydio$requireLib = _pydio2['default'].requireLib('hoc');

var withContextMenu = _Pydio$requireLib.withContextMenu;

var ContextMenuWrapper = function ContextMenuWrapper(props) {
    return _react2['default'].createElement('div', props);
};
ContextMenuWrapper = withContextMenu(ContextMenuWrapper);

/**
 * Tree Node
 */
var SimpleTreeNode = _react2['default'].createClass({
    displayName: 'SimpleTreeNode',

    propTypes: {
        collapse: _react2['default'].PropTypes.bool,
        forceExpand: _react2['default'].PropTypes.bool,
        childrenOnly: _react2['default'].PropTypes.bool,
        depth: _react2['default'].PropTypes.number,
        onNodeSelect: _react2['default'].PropTypes.func,
        node: _react2['default'].PropTypes.instanceOf(AjxpNode),
        dataModel: _react2['default'].PropTypes.instanceOf(PydioDataModel),
        forceLabel: _react2['default'].PropTypes.string,
        // Optional currently selected detection
        nodeIsSelected: _react2['default'].PropTypes.func,
        // Optional checkboxes
        checkboxes: _react2['default'].PropTypes.array,
        checkboxesValues: _react2['default'].PropTypes.object,
        checkboxesComputeStatus: _react2['default'].PropTypes.func,
        onCheckboxCheck: _react2['default'].PropTypes.func,
        paddingOffset: _react2['default'].PropTypes.number
    },

    getDefaultProps: function getDefaultProps() {
        return {
            collapse: false,
            childrenOnly: false,
            depth: 0,
            paddingOffset: 0,
            onNodeSelect: function onNodeSelect(node) {}
        };
    },

    listenToNode: function listenToNode(node) {
        this._childrenListener = (function () {
            if (!this.isMounted()) return;
            this.setState({ children: this._nodeToChildren(node) });
        }).bind(this);
        this._nodeListener = (function () {
            if (!this.isMounted()) return;
            this.forceUpdate();
        }).bind(this);
        node.observe("child_added", this._childrenListener);
        node.observe("child_removed", this._childrenListener);
        node.observe("loaded", this._childrenListener);
        node.observe("node_replaced", this._nodeListener);
    },

    stopListening: function stopListening(node) {
        node.stopObserving("child_added", this._childrenListener);
        node.stopObserving("child_removed", this._childrenListener);
        node.stopObserving("loaded", this._childrenListener);
        node.stopObserving("node_replaced", this._nodeListener);
    },

    componentDidMount: function componentDidMount() {
        this.listenToNode(this.props.node);
    },

    componentWillUnmount: function componentWillUnmount() {
        this.stopListening(this.props.node);
    },

    componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
        var oldNode = this.props.node;
        var newNode = nextProps.node;
        if (newNode == oldNode && newNode.getMetadata().get("paginationData")) {
            var remapedChildren = this.state.children.map(function (c) {
                c.setParent(newNode);return c;
            });
            var remapedPathes = this.state.children.map(function (c) {
                return c.getPath();
            });
            var newChildren = this._nodeToChildren(newNode);
            newChildren.forEach(function (nc) {
                if (remapedPathes.indexOf(nc.getPath()) === -1) {
                    remapedChildren.push(nc);
                }
            });
            this.setState({ children: remapedChildren });
        } else {
            this.setState({ children: this._nodeToChildren(newNode) });
        }
        if (newNode !== oldNode) {
            this.stopListening(oldNode);
            this.listenToNode(newNode);
        }
    },

    getInitialState: function getInitialState() {
        return {
            showChildren: !this.props.collapse || this.props.forceExpand,
            children: this._nodeToChildren(this.props.node)
        };
    },

    _nodeToChildren: function _nodeToChildren() {
        var children = [];
        this.props.node.getChildren().forEach(function (c) {
            if (!c.isLeaf() || c.getAjxpMime() === 'ajxp_browsable_archive') children.push(c);
        });
        return children;
    },

    onNodeSelect: function onNodeSelect(ev) {
        if (this.props.onNodeSelect) {
            this.props.onNodeSelect(this.props.node);
        }
        ev.preventDefault();
        ev.stopPropagation();
    },
    onChildDisplayToggle: function onChildDisplayToggle(ev) {
        if (this.props.node.getChildren().size) {
            this.setState({ showChildren: !this.state.showChildren });
        }
        ev.preventDefault();
        ev.stopPropagation();
    },
    nodeIsSelected: function nodeIsSelected(n) {
        if (this.props.nodeIsSelected) return this.props.nodeIsSelected(n);else return this.props.dataModel.getSelectedNodes().indexOf(n) !== -1;
    },
    render: function render() {
        var _this = this;

        var _props = this.props;
        var node = _props.node;
        var childrenOnly = _props.childrenOnly;
        var canDrop = _props.canDrop;
        var isOverCurrent = _props.isOverCurrent;
        var checkboxes = _props.checkboxes;
        var checkboxesComputeStatus = _props.checkboxesComputeStatus;
        var checkboxesValues = _props.checkboxesValues;
        var onCheckboxCheck = _props.onCheckboxCheck;
        var depth = _props.depth;
        var paddingOffset = _props.paddingOffset;
        var forceExpand = _props.forceExpand;
        var selectedItemStyle = _props.selectedItemStyle;
        var getItemStyle = _props.getItemStyle;
        var forceLabel = _props.forceLabel;

        var hasFolderChildrens = this.state.children.length ? true : false;
        var hasChildren;
        if (hasFolderChildrens) {
            hasChildren = _react2['default'].createElement(
                'span',
                { onClick: this.onChildDisplayToggle },
                this.state.showChildren || forceExpand ? _react2['default'].createElement('span', { className: 'tree-icon icon-angle-down' }) : _react2['default'].createElement('span', { className: 'tree-icon icon-angle-right' })
            );
        } else {
            var cname = "tree-icon icon-angle-right";
            if (node.isLoaded()) {
                cname += " no-folder-children";
            }
            hasChildren = _react2['default'].createElement('span', { className: cname });
        }
        var isSelected = this.nodeIsSelected(node) ? 'mui-menu-item mui-is-selected' : 'mui-menu-item';
        var selfLabel;
        if (!childrenOnly) {
            if (canDrop && isOverCurrent) {
                isSelected += ' droppable-active';
            }
            var boxes;
            if (checkboxes) {
                var values = {},
                    inherited = false,
                    disabled = {},
                    additionalClassName = '';
                if (checkboxesComputeStatus) {
                    var status = checkboxesComputeStatus(node);
                    values = status.VALUES;
                    inherited = status.INHERITED;
                    disabled = status.DISABLED;
                    if (status.CLASSNAME) additionalClassName = ' ' + status.CLASSNAME;
                } else if (checkboxesValues && checkboxesValues[node.getPath()]) {
                    values = checkboxesValues[node.getPath()];
                }
                var valueClasses = [];
                boxes = checkboxes.map((function (c) {
                    var selected = values[c] !== undefined ? values[c] : false;
                    var click = (function (event, value) {
                        onCheckboxCheck(node, c, value);
                    }).bind(this);
                    if (selected) valueClasses.push(c);
                    return _react2['default'].createElement(ReactMUI.Checkbox, {
                        name: c,
                        key: c + "-" + (selected ? "true" : "false"),
                        checked: selected,
                        onCheck: click,
                        disabled: disabled[c],
                        className: "cbox-" + c
                    });
                }).bind(this));
                isSelected += inherited ? " inherited " : "";
                isSelected += valueClasses.length ? " checkbox-values-" + valueClasses.join('-') : " checkbox-values-empty";
                boxes = _react2['default'].createElement(
                    'div',
                    { className: "tree-checkboxes" + additionalClassName },
                    boxes
                );
            }
            var itemStyle = { paddingLeft: paddingOffset + depth * 20 };
            if (this.nodeIsSelected(node) && selectedItemStyle) {
                itemStyle = _extends({}, itemStyle, selectedItemStyle);
            }
            if (getItemStyle) {
                itemStyle = _extends({}, itemStyle, getItemStyle(node));
            }
            var icon = 'mdi mdi-folder';
            var ajxpMime = node.getAjxpMime();
            if (ajxpMime === 'ajxp_browsable_archive') {
                icon = 'mdi mdi-archive';
            } else if (ajxpMime === 'ajxp_recycle') {
                icon = 'mdi mdi-delete';
            }
            selfLabel = _react2['default'].createElement(
                ContextMenuWrapper,
                { node: node, className: 'tree-item ' + isSelected + (boxes ? ' has-checkboxes' : ''), style: itemStyle },
                _react2['default'].createElement(
                    'div',
                    { className: 'tree-item-label', onClick: this.onNodeSelect, title: node.getLabel(),
                        'data-id': node.getPath() },
                    hasChildren,
                    _react2['default'].createElement('span', { className: "tree-icon " + icon }),
                    forceLabel ? forceLabel : node.getLabel()
                ),
                boxes
            );
        }

        var children = [];
        var connector = function connector(instance) {
            return instance;
        };
        var draggable = false;
        if (window.ReactDND && this.props.connectDropTarget && this.props.connectDragSource) {
            (function () {
                var connectDragSource = _this.props.connectDragSource;
                var connectDropTarget = _this.props.connectDropTarget;
                connector = function (instance) {
                    connectDragSource(ReactDOM.findDOMNode(instance));
                    connectDropTarget(ReactDOM.findDOMNode(instance));
                };
                draggable = true;
            })();
        }

        if (this.state.showChildren || forceExpand) {
            children = this.state.children.map((function (child) {
                var props = _extends({}, this.props, {
                    forceLabel: null,
                    childrenOnly: false,
                    key: child.getPath(),
                    node: child,
                    depth: depth + 1
                });
                return _react2['default'].createElement(draggable ? DragDropTreeNode : SimpleTreeNode, props);
            }).bind(this));
        }
        return _react2['default'].createElement(
            'li',
            { ref: connector, className: "treenode" + node.getPath().replace(/\//g, '_') },
            selfLabel,
            _react2['default'].createElement(
                'ul',
                null,
                children
            )
        );
    }
});

var DragDropTreeNode;
if (window.ReactDND) {
    DragDropTreeNode = ReactDND.flow(ReactDND.DragSource(_utilDND.Types.NODE_PROVIDER, _utilDND.nodeDragSource, _utilDND.collect), ReactDND.DropTarget(_utilDND.Types.NODE_PROVIDER, _utilDND.nodeDropTarget, _utilDND.collectDrop))(SimpleTreeNode);
} else {
    DragDropTreeNode = SimpleTreeNode;
}

/**
 * Simple openable / loadable tree taking AjxpNode as inputs
 */
var DNDTreeView = _react2['default'].createClass({
    displayName: 'DNDTreeView',

    propTypes: {
        showRoot: _react2['default'].PropTypes.bool,
        rootLabel: _react2['default'].PropTypes.string,
        onNodeSelect: _react2['default'].PropTypes.func,
        node: _react2['default'].PropTypes.instanceOf(AjxpNode).isRequired,
        dataModel: _react2['default'].PropTypes.instanceOf(PydioDataModel).isRequired,
        selectable: _react2['default'].PropTypes.bool,
        selectableMultiple: _react2['default'].PropTypes.bool,
        initialSelectionModel: _react2['default'].PropTypes.array,
        onSelectionChange: _react2['default'].PropTypes.func,
        forceExpand: _react2['default'].PropTypes.bool,
        // Optional currently selected detection
        nodeIsSelected: _react2['default'].PropTypes.func,
        // Optional checkboxes
        checkboxes: _react2['default'].PropTypes.array,
        checkboxesValues: _react2['default'].PropTypes.object,
        checkboxesComputeStatus: _react2['default'].PropTypes.func,
        onCheckboxCheck: _react2['default'].PropTypes.func,
        paddingOffset: _react2['default'].PropTypes.number
    },

    getDefaultProps: function getDefaultProps() {
        return {
            showRoot: true,
            onNodeSelect: this.onNodeSelect
        };
    },

    onNodeSelect: function onNodeSelect(node) {
        if (this.props.onNodeSelect) {
            this.props.onNodeSelect(node);
        } else {
            this.props.dataModel.setSelectedNodes([node]);
        }
    },

    render: function render() {
        return _react2['default'].createElement(
            'ul',
            { className: this.props.className },
            _react2['default'].createElement(DragDropTreeNode, {
                childrenOnly: !this.props.showRoot,
                forceExpand: this.props.forceExpand,
                node: this.props.node ? this.props.node : this.props.dataModel.getRootNode(),
                dataModel: this.props.dataModel,
                onNodeSelect: this.onNodeSelect,
                nodeIsSelected: this.props.nodeIsSelected,
                forceLabel: this.props.rootLabel,
                checkboxes: this.props.checkboxes,
                checkboxesValues: this.props.checkboxesValues,
                checkboxesComputeStatus: this.props.checkboxesComputeStatus,
                onCheckboxCheck: this.props.onCheckboxCheck,
                selectedItemStyle: this.props.selectedItemStyle,
                getItemStyle: this.props.getItemStyle,
                paddingOffset: this.props.paddingOffset
            })
        );
    }
});

var TreeView = _react2['default'].createClass({
    displayName: 'TreeView',

    propTypes: {
        showRoot: _react2['default'].PropTypes.bool,
        rootLabel: _react2['default'].PropTypes.string,
        onNodeSelect: _react2['default'].PropTypes.func,
        node: _react2['default'].PropTypes.instanceOf(AjxpNode).isRequired,
        dataModel: _react2['default'].PropTypes.instanceOf(PydioDataModel).isRequired,
        selectable: _react2['default'].PropTypes.bool,
        selectableMultiple: _react2['default'].PropTypes.bool,
        initialSelectionModel: _react2['default'].PropTypes.array,
        onSelectionChange: _react2['default'].PropTypes.func,
        forceExpand: _react2['default'].PropTypes.bool,
        // Optional currently selected detection
        nodeIsSelected: _react2['default'].PropTypes.func,
        // Optional checkboxes
        checkboxes: _react2['default'].PropTypes.array,
        checkboxesValues: _react2['default'].PropTypes.object,
        checkboxesComputeStatus: _react2['default'].PropTypes.func,
        onCheckboxCheck: _react2['default'].PropTypes.func,
        paddingOffset: _react2['default'].PropTypes.number
    },

    getDefaultProps: function getDefaultProps() {
        return {
            showRoot: true,
            onNodeSelect: this.onNodeSelect
        };
    },

    onNodeSelect: function onNodeSelect(node) {
        if (this.props.onNodeSelect) {
            this.props.onNodeSelect(node);
        } else {
            this.props.dataModel.setSelectedNodes([node]);
        }
    },

    render: function render() {
        return _react2['default'].createElement(
            'ul',
            { className: this.props.className },
            _react2['default'].createElement(SimpleTreeNode, {
                childrenOnly: !this.props.showRoot,
                forceExpand: this.props.forceExpand,
                node: this.props.node ? this.props.node : this.props.dataModel.getRootNode(),
                dataModel: this.props.dataModel,
                onNodeSelect: this.onNodeSelect,
                nodeIsSelected: this.props.nodeIsSelected,
                forceLabel: this.props.rootLabel,
                checkboxes: this.props.checkboxes,
                checkboxesValues: this.props.checkboxesValues,
                checkboxesComputeStatus: this.props.checkboxesComputeStatus,
                onCheckboxCheck: this.props.onCheckboxCheck,
                selectedItemStyle: this.props.selectedItemStyle,
                getItemStyle: this.props.getItemStyle,
                paddingOffset: this.props.paddingOffset
            })
        );
    }

});

var FoldersTree = _react2['default'].createClass({
    displayName: 'FoldersTree',

    propTypes: {
        pydio: _react2['default'].PropTypes.instanceOf(_pydio2['default']).isRequired,
        dataModel: _react2['default'].PropTypes.instanceOf(PydioDataModel).isRequired,
        className: _react2['default'].PropTypes.string,
        onNodeSelected: _react2['default'].PropTypes.func,
        draggable: _react2['default'].PropTypes.bool
    },

    nodeObserver: function nodeObserver() {
        var r = this.props.dataModel.getRootNode();
        if (!r.isLoaded()) {
            r.observeOnce("loaded", (function () {
                this.forceUpdate();
            }).bind(this));
        } else {
            this.forceUpdate();
        }
    },

    componentDidMount: function componentDidMount() {
        var dm = this.props.dataModel;
        this._dmObs = this.nodeObserver;
        dm.observe("context_changed", this._dmObs);
        dm.observe("root_node_changed", this._dmObs);
        this.nodeObserver();
    },

    componentWillUnmount: function componentWillUnmount() {
        if (this._dmObs) {
            var dm = this.props.dataModel;
            dm.stopObserving("context_changed", this._dmObs);
            dm.stopObserving("root_node_changed", this._dmObs);
        }
    },

    treeNodeSelected: function treeNodeSelected(n) {
        if (this.props.onNodeSelected) {
            this.props.onNodeSelected(n);
        } else {
            this.props.dataModel.requireContextChange(n);
        }
    },

    nodeIsSelected: function nodeIsSelected(n) {
        return n === this.props.dataModel.getContextNode();
    },

    render: function render() {
        if (this.props.draggable) {
            return _react2['default'].createElement(PydioComponents.DNDTreeView, {
                onNodeSelect: this.treeNodeSelected,
                nodeIsSelected: this.nodeIsSelected,
                dataModel: this.props.dataModel,
                node: this.props.dataModel.getRootNode(),
                showRoot: this.props.showRoot ? true : false,
                selectedItemStyle: this.props.selectedItemStyle,
                getItemStyle: this.props.getItemStyle,
                className: "folders-tree" + (this.props.className ? ' ' + this.props.className : '')
            });
        } else {
            return _react2['default'].createElement(PydioComponents.TreeView, {
                onNodeSelect: this.treeNodeSelected,
                nodeIsSelected: this.nodeIsSelected,
                dataModel: this.props.dataModel,
                node: this.props.dataModel.getRootNode(),
                selectedItemStyle: this.props.selectedItemStyle,
                getItemStyle: this.props.getItemStyle,
                showRoot: this.props.showRoot ? true : false,
                className: "folders-tree" + (this.props.className ? ' ' + this.props.className : '')
            });
        }
    }

});

exports.TreeView = TreeView;
exports.DNDTreeView = DNDTreeView;
exports.FoldersTree = FoldersTree;
