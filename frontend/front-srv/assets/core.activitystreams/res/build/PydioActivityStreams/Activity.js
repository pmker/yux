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

var _reactMarkdown = require('react-markdown');

var _reactMarkdown2 = _interopRequireDefault(_reactMarkdown);

var _materialUi = require('material-ui');

var _DocLink = require('./DocLink');

var _DocLink2 = _interopRequireDefault(_DocLink);

var _require$requireLib = require('pydio').requireLib('components');

var UserAvatar = _require$requireLib.UserAvatar;

var _require$requireLib2 = require('pydio').requireLib('boot');

var PydioContextConsumer = _require$requireLib2.PydioContextConsumer;

var _Pydio$requireLib = Pydio.requireLib('boot');

var moment = _Pydio$requireLib.moment;

var Paragraph = (function (_React$Component) {
    _inherits(Paragraph, _React$Component);

    function Paragraph() {
        _classCallCheck(this, Paragraph);

        _get(Object.getPrototypeOf(Paragraph.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(Paragraph, [{
        key: 'render',
        value: function render() {
            return _react2['default'].createElement(
                'span',
                null,
                this.props.children
            );
        }
    }]);

    return Paragraph;
})(_react2['default'].Component);

function workspacesLocations(pydio, object) {
    var workspaces = [];
    if (!object.partOf || !object.partOf.items || !object.partOf.items.length) {
        return "No workspace found";
    }

    var _loop = function (i) {
        var ws = object.partOf.items[i];
        // Remove slug part
        //let paths = ws.rel.split('/');
        //paths.shift();
        //let relPath = paths.join('/');
        workspaces.push(_react2['default'].createElement(
            'a',
            { key: ws.id, onClick: function () {
                    return pydio.triggerRepositoryChange(ws.id);
                }, style: { cursor: 'pointer' } },
            ws.name
        ));
        workspaces.push(_react2['default'].createElement(
            'span',
            { key: ws.id + '-sep' },
            ', '
        ));
    };

    for (var i = 0; i < object.partOf.items.length; i++) {
        _loop(i);
    }
    workspaces.pop();
    return _react2['default'].createElement(
        'span',
        null,
        pydio.MessageHash['notification_center.16'],
        ' ',
        _react2['default'].createElement(
            'span',
            null,
            workspaces
        )
    );
}

function LinkWrapper(pydio, activity) {

    return _react2['default'].createClass({

        render: function render() {
            var _props = this.props;
            var href = _props.href;
            var children = _props.children;

            var title = "";
            var onClick = null;
            if (href.startsWith('doc://')) {
                if (activity.type === 'Delete') {
                    return _react2['default'].createElement(
                        'a',
                        { style: { textDecoration: 'line-through' } },
                        children
                    );
                } else {
                    return _react2['default'].createElement(
                        _DocLink2['default'],
                        { pydio: pydio, activity: activity },
                        children
                    );
                }
            } else if (href.startsWith('user://')) {
                var userId = href.replace('user://', '');
                return _react2['default'].createElement(UserAvatar, { userId: userId, displayAvatar: false, richOnClick: true, style: { cursor: 'pointer', display: 'inline-block', color: 'rgb(66, 140, 179)' }, pydio: pydio });
            }
            return _react2['default'].createElement(
                'a',
                { title: title, style: { cursor: 'pointer', color: 'rgb(66, 140, 179)' }, onClick: onClick },
                children
            );
        }
    });
}

var Activity = (function (_React$Component2) {
    _inherits(Activity, _React$Component2);

    function Activity() {
        _classCallCheck(this, Activity);

        _get(Object.getPrototypeOf(Activity.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(Activity, [{
        key: 'render',
        value: function render() {
            var _props2 = this.props;
            var pydio = _props2.pydio;
            var activity = _props2.activity;
            var listContext = _props2.listContext;
            var displayContext = _props2.displayContext;
            var oneLiner = _props2.oneLiner;

            var secondary = activity.type + " - " + activity.actor.name;
            if (activity.summary) {
                secondary = _react2['default'].createElement(_reactMarkdown2['default'], { source: activity.summary, renderers: { 'paragraph': Paragraph, 'link': LinkWrapper(pydio, activity) } });
            }

            var avatar = _react2['default'].createElement(UserAvatar, {
                useDefaultAvatar: true,
                userId: activity.actor.id,
                userLabel: activity.actor.name,
                displayLocalLabel: true,
                userType: 'user',
                pydio: pydio,
                style: { display: 'flex', alignItems: 'center', maxWidth: '60%' },
                labelStyle: { fontSize: 14, paddingLeft: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                avatarStyle: { flexShrink: 0 },
                avatarSize: 28,
                richOnHover: true
            });

            var summary = undefined;
            var actionIcon = undefined;
            var blockStyle = {
                margin: '0px 10px 6px'
            };
            var summaryStyle = {
                padding: '6px 22px 12px',
                marginTop: 6,
                borderRadius: 2,
                borderLeft: '2px solid #e0e0e0',
                marginLeft: 13,
                color: 'rgba(0,0,0,0.33)',
                fontWeight: 500,
                fontStyle: 'italic',
                overflow: 'hidden'
            };
            if (displayContext === 'popover') {
                summaryStyle = {
                    fontSize: 13,
                    color: 'rgba(0,0,0,0.33)',
                    fontWeight: 500,
                    margin: '6px 0',
                    padding: 6
                };
            }

            var className = undefined;
            var title = undefined;
            switch (activity.type) {
                case "Create":
                    if (activity.object.type === 'Document') {
                        className = "file-plus";
                    } else {
                        className = "folder-plus";
                    }
                    title = "Created";
                    break;
                case "Delete":
                    className = "delete";
                    title = "Deleted";
                    break;
                case "Edit":
                case "Update":
                    className = "pencil";
                    title = "Modified";
                    break;
                case "Read":
                    className = "eye";
                    title = "Accessed";
                    break;
                case "Move":
                    className = "file-send";
                    title = "Moved";
                    break;
                default:
                    break;
            }
            if (listContext === 'NODE-LEAF') {
                blockStyle = { margin: '16px 10px' };
                actionIcon = _react2['default'].createElement(_materialUi.FontIcon, { className: "mdi mdi-" + className, title: title, style: { fontSize: 17, color: 'rgba(0,0,0,0.17)' } });
            } else {
                if (displayContext === 'mainList') {
                    return _react2['default'].createElement(_materialUi.ListItem, {
                        leftIcon: _react2['default'].createElement(_materialUi.FontIcon, { className: "mdi mdi-" + className, color: 'rgba(0,0,0,.33)' }),
                        primaryText: secondary,
                        secondaryText: _react2['default'].createElement(
                            'div',
                            { style: { color: 'rgba(0,0,0,.33)' } },
                            workspacesLocations(pydio, activity.object)
                        ),
                        disabled: true
                    });
                } else if (displayContext === 'popover') {
                    var leftIcon = _react2['default'].createElement(_materialUi.FontIcon, { className: "mdi mdi-" + className, title: title, style: { padding: '0 8px', fontSize: 20, color: 'rgba(0,0,0,0.17)' } });
                    summary = _react2['default'].createElement(
                        'div',
                        { style: { display: 'flex', alignItems: 'center' } },
                        leftIcon,
                        _react2['default'].createElement(
                            'div',
                            { style: _extends({}, summaryStyle, { flex: 1 }) },
                            secondary
                        )
                    );
                } else {
                    summary = _react2['default'].createElement(
                        'div',
                        { style: summaryStyle },
                        secondary
                    );
                }
            }

            return _react2['default'].createElement(
                'div',
                { style: blockStyle },
                !oneLiner && _react2['default'].createElement(
                    'div',
                    { style: { display: 'flex', alignItems: 'center' } },
                    avatar,
                    _react2['default'].createElement(
                        'span',
                        { style: { fontSize: 13, display: 'inline-block', flex: 1, height: 18, color: 'rgba(0,0,0,0.23)', fontWeight: 500, paddingLeft: 8, whiteSpace: 'nowrap' } },
                        moment(activity.updated).fromNow()
                    ),
                    actionIcon
                ),
                summary
            );
        }
    }]);

    return Activity;
})(_react2['default'].Component);

Activity.PropTypes = {
    activity: _react2['default'].PropTypes.object,
    listContext: _react2['default'].PropTypes.string,
    displayContext: _react2['default'].PropTypes.oneOf(['mainList', 'infoPanel', 'popover'])
};

exports['default'] = Activity = PydioContextConsumer(Activity);
exports['default'] = Activity;
module.exports = exports['default'];
