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

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _require = require('react');

var Component = _require.Component;
var PropTypes = _require.PropTypes;

var _require2 = require('material-ui');

var MenuItem = _require2.MenuItem;
var IconMenu = _require2.IconMenu;
var IconButton = _require2.IconButton;

var _require3 = require('material-ui/styles');

var muiThemeable = _require3.muiThemeable;

var Color = require('color');

var UserBadge = (function (_Component) {
    _inherits(UserBadge, _Component);

    function UserBadge() {
        _classCallCheck(this, UserBadge);

        _get(Object.getPrototypeOf(UserBadge.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(UserBadge, [{
        key: 'renderMenu',
        value: function renderMenu() {
            if (!this.props.menus || !this.props.menus.length) {
                return null;
            }
            var menuItems = this.props.menus.map(function (m) {
                var rightIcon = undefined;
                if (m.checked) {
                    rightIcon = React.createElement('span', { className: 'mdi mdi-check' });
                }
                return React.createElement(MenuItem, {
                    primaryText: m.text,
                    onTouchTap: m.callback,
                    rightIcon: rightIcon });
            });
            var iconStyle = { fontSize: 18 };
            return React.createElement(
                IconMenu,
                {
                    iconButtonElement: React.createElement(IconButton, { style: { padding: 16 }, iconStyle: iconStyle, iconClassName: 'icon-ellipsis-vertical' }),
                    anchorOrigin: { horizontal: 'right', vertical: 'top' },
                    targetOrigin: { horizontal: 'right', vertical: 'top' }
                },
                menuItems
            );
        }
    }, {
        key: 'render',
        value: function render() {
            var avatar = undefined;
            var avatarColor = this.props.muiTheme.palette.avatarsColor;
            if (this.props.type == 'group') {
                avatarColor = Color(avatarColor).darken(.2).toString();
                avatar = React.createElement('span', { className: 'avatar mdi mdi-account-multiple', style: { backgroundColor: avatarColor } });
            } else if (this.props.type == 'team') {
                avatarColor = Color(avatarColor).darken(.2).toString();
                avatar = React.createElement('span', { className: 'avatar mdi mdi-account-multiple-outline', style: { backgroundColor: avatarColor } });
            } else if (this.props.type == 'temporary') {
                avatarColor = Color(avatarColor).lighten(.2).toString();
                avatar = React.createElement('span', { className: 'avatar mdi mdi-account-plus', style: { backgroundColor: avatarColor } });
            } else if (this.props.type == 'remote_user') {
                avatar = React.createElement('span', { className: 'avatar mdi mdi-account-network', style: { backgroundColor: avatarColor } });
            } else {
                avatar = React.createElement('span', { className: 'avatar mdi mdi-account', style: { backgroundColor: avatarColor } });
            }
            var menu = this.renderMenu();
            return React.createElement(
                'div',
                { className: "share-dialog user-badge user-type-" + this.props.type },
                avatar,
                React.createElement(
                    'span',
                    { className: 'user-badge-label' },
                    this.props.label
                ),
                this.props.children,
                menu
            );
        }
    }]);

    return UserBadge;
})(Component);

UserBadge.propTypes = {
    label: PropTypes.string,
    avatar: PropTypes.string,
    type: PropTypes.string,
    menus: PropTypes.object,
    muiTheme: PropTypes.object
};

exports['default'] = UserBadge = muiThemeable()(UserBadge);

exports['default'] = UserBadge;
module.exports = exports['default'];
