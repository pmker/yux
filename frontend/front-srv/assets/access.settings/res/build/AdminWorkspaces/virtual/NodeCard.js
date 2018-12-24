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

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _materialUi = require('material-ui');

var NodeCard = (function (_React$Component) {
    _inherits(NodeCard, _React$Component);

    function NodeCard(props) {
        _classCallCheck(this, NodeCard);

        _get(Object.getPrototypeOf(NodeCard.prototype), 'constructor', this).call(this, props);
        var value = props.node.getValue();
        if (!value) {
            value = "// Compute the Path variable that this node must resolve to. \n// Use Ctrl+Space to see the objects available for completion.\nPath = \"\";";
        }
        this.state = { value: value, dirty: false };
    }

    _createClass(NodeCard, [{
        key: 'onChange',
        value: function onChange(event, newValue) {
            this.setState({
                value: newValue,
                dirty: true
            });
        }
    }, {
        key: 'save',
        value: function save() {
            var _this = this;

            var node = this.props.node;
            node.setValue(this.state.value);
            node.save(function () {
                _this.setState({ dirty: false });
            });
        }
    }, {
        key: 'remove',
        value: function remove() {
            var _this2 = this;

            this.props.node.remove(function () {
                _this2.props.reloadList();
            });
        }
    }, {
        key: 'render',
        value: function render() {
            var _props = this.props;
            var dataSources = _props.dataSources;
            var node = _props.node;
            var readonly = _props.readonly;
            var oneLiner = _props.oneLiner;

            var ds = {};
            if (dataSources) {
                dataSources.map(function (d) {
                    ds[d.Name] = d.Name;
                });
            }
            var globalScope = {
                Path: '',
                DataSources: ds,
                User: { Name: '' }
            };

            var codeMirrorField = _react2['default'].createElement(AdminComponents.CodeMirrorField, {
                mode: 'javascript',
                globalScope: globalScope,
                value: this.state.value,
                onChange: this.onChange.bind(this),
                readOnly: readonly
            });

            if (oneLiner) {
                return _react2['default'].createElement(
                    'div',
                    { style: { display: 'flex' } },
                    _react2['default'].createElement(
                        'div',
                        { style: { flex: 1 } },
                        codeMirrorField
                    ),
                    _react2['default'].createElement(
                        'div',
                        null,
                        _react2['default'].createElement(_materialUi.IconButton, { iconClassName: "mdi mdi-content-save", onClick: this.save.bind(this), disabled: !this.state.dirty, tooltip: "Save" })
                    )
                );
            } else {
                var titleComponent = _react2['default'].createElement(
                    'div',
                    { style: { display: 'flex', alignItems: 'baseline' } },
                    _react2['default'].createElement(
                        'div',
                        { style: { flex: 1 } },
                        node.getName()
                    ),
                    !readonly && _react2['default'].createElement(
                        'div',
                        null,
                        _react2['default'].createElement(_materialUi.IconButton, { iconClassName: "mdi mdi-content-save", onClick: this.save.bind(this), disabled: !this.state.dirty, tooltip: "Save" }),
                        _react2['default'].createElement(_materialUi.IconButton, { iconClassName: "mdi mdi-delete", onClick: this.remove.bind(this), tooltip: "Delete", disabled: node.getName() === 'cells' || node.getName() === 'my-files' })
                    )
                );
                return _react2['default'].createElement(
                    'div',
                    { style: { marginBottom: 10 } },
                    _react2['default'].createElement(AdminComponents.SubHeader, { title: titleComponent }),
                    _react2['default'].createElement(
                        _materialUi.Paper,
                        { zDepth: 1, style: { margin: '0 20px' } },
                        codeMirrorField
                    )
                );
            }
        }
    }]);

    return NodeCard;
})(_react2['default'].Component);

exports['default'] = NodeCard;
module.exports = exports['default'];
