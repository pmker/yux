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

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _materialUi = require('material-ui');

var _editorRuleEditor = require('./editor/RuleEditor');

var _editorRuleEditor2 = _interopRequireDefault(_editorRuleEditor);

var Rule = (function (_React$Component) {
    _inherits(Rule, _React$Component);

    function Rule() {
        _classCallCheck(this, Rule);

        _get(Object.getPrototypeOf(Rule.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(Rule, [{
        key: 'componentDidMount',
        value: function componentDidMount() {
            if (this.props.create) {
                this.openEditor();
            }
        }
    }, {
        key: 'openEditor',
        value: function openEditor() {
            var _props = this.props;
            var pydio = _props.pydio;
            var policy = _props.policy;
            var rule = _props.rule;
            var openRightPane = _props.openRightPane;

            if (this.refs.editor && this.refs.editor.isDirty()) {
                if (!window.confirm(pydio.MessageHash["role_editor.19"])) {
                    return false;
                }
            }
            var editorData = {
                COMPONENT: _editorRuleEditor2['default'],
                PROPS: {
                    ref: "editor",
                    policy: policy,
                    rule: rule,
                    pydio: pydio,
                    saveRule: this.props.onRuleChange,
                    create: this.props.create,
                    onRequestTabClose: this.closeEditor.bind(this)
                }
            };
            openRightPane(editorData);
            return true;
        }
    }, {
        key: 'closeEditor',
        value: function closeEditor(editor) {
            var _props2 = this.props;
            var pydio = _props2.pydio;
            var closeRightPane = _props2.closeRightPane;

            if (editor && editor.isDirty()) {
                if (editor.isCreate()) {
                    this.props.onRemoveRule(this.props.rule, true);
                    closeRightPane();
                    return true;
                }
                if (!window.confirm(pydio.MessageHash["role_editor.19"])) {
                    return false;
                }
            }
            closeRightPane();
            return true;
        }
    }, {
        key: 'removeRule',
        value: function removeRule() {
            if (window.confirm('Are you sure you want to remove this security rule?')) {
                this.props.onRemoveRule(this.props.rule);
            }
        }
    }, {
        key: 'render',
        value: function render() {
            var _props3 = this.props;
            var rule = _props3.rule;
            var readonly = _props3.readonly;

            var iconColor = rule.effect === 'allow' ? '#33691e' : '#d32f2f';
            var buttons = [];
            if (!readonly) {
                buttons = [_react2['default'].createElement('span', { className: 'mdi mdi-delete', style: { color: '#9e9e9e', cursor: 'pointer', marginLeft: 5 }, onTouchTap: this.removeRule.bind(this) }), _react2['default'].createElement('span', { className: 'mdi mdi-pencil', style: { color: '#9e9e9e', cursor: 'pointer', marginLeft: 5 }, onTouchTap: this.openEditor.bind(this) })];
            }
            var label = _react2['default'].createElement(
                'div',
                null,
                rule.description,
                buttons
            );

            return _react2['default'].createElement(_materialUi.ListItem, _extends({}, this.props, {
                style: { fontStyle: 'italic', fontSize: 15 },
                primaryText: label,
                leftIcon: _react2['default'].createElement(_materialUi.FontIcon, { className: 'mdi mdi-traffic-light', color: iconColor }),
                disabled: true
            }));
        }
    }]);

    return Rule;
})(_react2['default'].Component);

exports['default'] = Rule;
module.exports = exports['default'];
