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

var _pydio = require('pydio');

var _pydio2 = _interopRequireDefault(_pydio);

var _utilNavigationHelper = require('../util/NavigationHelper');

var _utilNavigationHelper2 = _interopRequireDefault(_utilNavigationHelper);

var _utilMenuItemListener = require('../util/MenuItemListener');

var _utilMenuItemListener2 = _interopRequireDefault(_utilMenuItemListener);

var React = require('react');

var _require = require('material-ui');

var Paper = _require.Paper;
var Menu = _require.Menu;

var _require2 = require('material-ui/styles');

var muiThemeable = _require2.muiThemeable;

var AjxpNode = require('pydio/model/node');
var PydioDataModel = require('pydio/model/data-model');
//const {withVerticalScroll} = Pydio.requireLib('hoc');

var AdminMenu = React.createClass({
    displayName: 'AdminMenu',

    propTypes: {
        rootNode: React.PropTypes.instanceOf(AjxpNode),
        contextNode: React.PropTypes.instanceOf(AjxpNode),
        dataModel: React.PropTypes.instanceOf(PydioDataModel)
    },

    componentDidMount: function componentDidMount() {
        _utilMenuItemListener2['default'].getInstance().observe("item_changed", (function () {
            this.forceUpdate();
        }).bind(this));
    },

    componentWillUnmount: function componentWillUnmount() {
        _utilMenuItemListener2['default'].getInstance().stopObserving("item_changed");
    },

    checkForUpdates: function checkForUpdates() {
        var _props = this.props;
        var pydio = _props.pydio;
        var rootNode = _props.rootNode;
    },

    onMenuChange: function onMenuChange(event, node) {
        this.props.dataModel.setSelectedNodes([]);
        this.props.dataModel.setContextNode(node);
    },

    render: function render() {
        var _props2 = this.props;
        var pydio = _props2.pydio;
        var rootNode = _props2.rootNode;
        var muiTheme = _props2.muiTheme;
        var showAdvanced = _props2.showAdvanced;

        // Fix for ref problems on context node
        var contextNode = this.props.contextNode;

        this.props.rootNode.getChildren().forEach(function (child) {
            if (child.getPath() === contextNode.getPath()) {
                contextNode = child;
            } else {
                child.getChildren().forEach(function (grandChild) {
                    if (grandChild.getPath() === contextNode.getPath()) {
                        contextNode = grandChild;
                    }
                });
            }
        });

        var menuItems = _utilNavigationHelper2['default'].buildNavigationItems(pydio, rootNode, muiTheme.palette, showAdvanced, false);

        return React.createElement(
            Menu,
            {
                onChange: this.onMenuChange,
                autoWidth: false,
                width: 256,
                listStyle: { display: 'block', maxWidth: 256 },
                value: contextNode
            },
            menuItems
        );
    }

});

//AdminMenu = withVerticalScroll(AdminMenu, {id:'settings-menu'});
AdminMenu = muiThemeable()(AdminMenu);

var AdminLeftNav = (function (_React$Component) {
    _inherits(AdminLeftNav, _React$Component);

    function AdminLeftNav() {
        _classCallCheck(this, AdminLeftNav);

        _get(Object.getPrototypeOf(AdminLeftNav.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(AdminLeftNav, [{
        key: 'render',
        value: function render() {
            var open = this.props.open;

            var pStyle = {
                position: 'fixed',
                width: 256,
                top: 56,
                bottom: 0,
                zIndex: 9,
                overflowX: 'hidden',
                overflowY: 'auto'
            };
            if (!open) {
                pStyle.transform = 'translateX(-256px)';
            }

            return React.createElement(
                Paper,
                { zDepth: 2, className: "admin-main-nav", style: pStyle },
                React.createElement(AdminMenu, this.props)
            );
        }
    }]);

    return AdminLeftNav;
})(React.Component);

exports['default'] = AdminLeftNav;
module.exports = exports['default'];
