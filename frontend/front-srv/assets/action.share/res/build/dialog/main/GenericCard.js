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

var _materialUiStyles = require('material-ui/styles');

var globalStyles = {
    globalLeftMargin: 64
};

var GenericLine = (function (_React$Component) {
    _inherits(GenericLine, _React$Component);

    function GenericLine() {
        _classCallCheck(this, GenericLine);

        _get(Object.getPrototypeOf(GenericLine.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(GenericLine, [{
        key: 'render',
        value: function render() {
            var _props = this.props;
            var iconClassName = _props.iconClassName;
            var legend = _props.legend;
            var data = _props.data;
            var dataStyle = _props.dataStyle;
            var legendStyle = _props.legendStyle;
            var iconStyle = _props.iconStyle;

            var style = {
                icon: _extends({
                    margin: '16px 20px 0'
                }, iconStyle),
                legend: _extends({
                    fontSize: 12,
                    color: '#aaaaaa',
                    fontWeight: 500,
                    textTransform: 'lowercase'
                }, legendStyle),
                data: _extends({
                    fontSize: 15,
                    paddingRight: 6,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                }, dataStyle)
            };
            return _react2['default'].createElement(
                'div',
                { style: _extends({ display: 'flex', marginBottom: 8, overflow: 'hidden' }, this.props.style) },
                _react2['default'].createElement(
                    'div',
                    { style: { width: globalStyles.globalLeftMargin } },
                    _react2['default'].createElement(_materialUi.FontIcon, { color: '#aaaaaa', className: iconClassName, style: style.icon })
                ),
                _react2['default'].createElement(
                    'div',
                    { style: { flex: 1 } },
                    _react2['default'].createElement(
                        'div',
                        { style: style.legend },
                        legend
                    ),
                    _react2['default'].createElement(
                        'div',
                        { style: style.data },
                        data
                    )
                )
            );
        }
    }]);

    return GenericLine;
})(_react2['default'].Component);

var GenericCard = (function (_React$Component2) {
    _inherits(GenericCard, _React$Component2);

    function GenericCard() {
        _classCallCheck(this, GenericCard);

        _get(Object.getPrototypeOf(GenericCard.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(GenericCard, [{
        key: 'render',
        value: function render() {
            var _props2 = this.props;
            var title = _props2.title;
            var onDismissAction = _props2.onDismissAction;
            var onEditAction = _props2.onEditAction;
            var onDeleteAction = _props2.onDeleteAction;
            var moreMenuItems = _props2.moreMenuItems;
            var children = _props2.children;
            var muiTheme = _props2.muiTheme;
            var style = _props2.style;
            var headerSmall = _props2.headerSmall;
            var primary1Color = muiTheme.palette.primary1Color;

            var styles = {
                headerHeight: 100,
                buttonBarHeight: 60,
                fabTop: 80,
                button: {
                    style: {},
                    iconStyle: { color: 'white' }
                }
            };
            if (headerSmall) {
                styles = {
                    headerHeight: 80,
                    buttonBarHeight: 40,
                    fabTop: 60,
                    button: {
                        style: { width: 38, height: 38, padding: 9 },
                        iconStyle: { color: 'white', fontSize: 18 }
                    }
                };
            }

            return _react2['default'].createElement(
                _materialUi.Paper,
                { zDepth: 0, style: _extends({ width: '100%', position: 'relative' }, style) },
                onEditAction && _react2['default'].createElement(
                    _materialUi.FloatingActionButton,
                    { onTouchTap: onEditAction, mini: true, style: { position: 'absolute', top: styles.fabTop, left: 10 } },
                    _react2['default'].createElement(_materialUi.FontIcon, { className: "mdi mdi-pencil" })
                ),
                _react2['default'].createElement(
                    _materialUi.Paper,
                    { zDepth: 0, style: { backgroundColor: primary1Color, color: 'white', height: styles.headerHeight, borderRadius: '2px 2px 0 0' } },
                    _react2['default'].createElement(
                        'div',
                        { style: { display: 'flex', height: styles.buttonBarHeight } },
                        _react2['default'].createElement('span', { style: { flex: 1 } }),
                        onDeleteAction && _react2['default'].createElement(_materialUi.IconButton, { style: styles.button.style, iconStyle: styles.button.iconStyle, iconClassName: "mdi mdi-delete", onTouchTap: onDeleteAction }),
                        moreMenuItems && moreMenuItems.length > 0 && _react2['default'].createElement(
                            _materialUi.IconMenu,
                            {
                                anchorOrigin: { vertical: 'top', horizontal: headerSmall ? 'right' : 'left' },
                                targetOrigin: { vertical: 'top', horizontal: headerSmall ? 'right' : 'left' },
                                iconButtonElement: _react2['default'].createElement(_materialUi.IconButton, { style: styles.button.style, iconStyle: styles.button.iconStyle, iconClassName: "mdi mdi-dots-vertical" })
                            },
                            moreMenuItems
                        ),
                        onDismissAction && _react2['default'].createElement(_materialUi.IconButton, { style: styles.button.style, iconStyle: styles.button.iconStyle, iconClassName: "mdi mdi-close", onTouchTap: onDismissAction })
                    ),
                    _react2['default'].createElement(
                        'div',
                        { style: { paddingLeft: onEditAction ? globalStyles.globalLeftMargin : 20, fontSize: 20 } },
                        title
                    )
                ),
                _react2['default'].createElement(
                    'div',
                    { style: { paddingTop: 12, paddingBottom: 8 } },
                    children
                )
            );
        }
    }]);

    return GenericCard;
})(_react2['default'].Component);

exports.GenericCard = GenericCard = (0, _materialUiStyles.muiThemeable)()(GenericCard);
exports.GenericCard = GenericCard;
exports.GenericLine = GenericLine;
