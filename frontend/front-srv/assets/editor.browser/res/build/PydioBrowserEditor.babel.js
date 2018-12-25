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

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x3, _x4, _x5) { var _again = true; _function: while (_again) { var object = _x3, property = _x4, receiver = _x5; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x3 = parent; _x4 = property; _x5 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactRedux = require('react-redux');

var PydioApi = require("pydio/http/api");

var _Pydio$requireLib = Pydio.requireLib('hoc');

var EditorActions = _Pydio$requireLib.EditorActions;

var Editor = (function (_Component) {
    _inherits(Editor, _Component);

    _createClass(Editor, null, [{
        key: 'styles',
        get: function get() {
            return {
                iframe: {
                    border: 0,
                    flex: 1
                }
            };
        }
    }]);

    function Editor(props) {
        _classCallCheck(this, _Editor);

        _get(Object.getPrototypeOf(_Editor.prototype), 'constructor', this).call(this, props);

        this.state = {
            frameSrc: null
        };
    }

    _createClass(Editor, [{
        key: 'componentDidMount',
        value: function componentDidMount() {
            var _props = this.props;
            var pydio = _props.pydio;
            var node = _props.node;
            var editorModify = _props.editorModify;
            var isActive = _props.isActive;

            var configs = pydio.getPluginConfigs("editor.browser");

            if (node.getAjxpMime() === "url" || node.getAjxpMime() === "website") {
                this.openBookmark(node, configs);
            } else {
                this.openNode(node, configs);
            }
            if (editorModify && isActive) {
                editorModify({ fixedToolbar: false });
            }
        }
    }, {
        key: 'componentWillReceiveProps',
        value: function componentWillReceiveProps(nextProps) {
            var editorModify = this.props.editorModify;

            if (editorModify && nextProps.isActive) {
                editorModify({ fixedToolbar: false });
            }
        }
    }, {
        key: 'openBookmark',
        value: function openBookmark(node, configs) {
            var _this = this;

            var alwaysOpenLinksInBrowser = configs.get('OPEN_LINK_IN_TAB') === 'browser';

            PydioApi.getClient().getPlainContent(node, function (_ref) {
                var url = _ref.responseText;

                if (url.indexOf('URL=') !== -1) {
                    url = url.split('URL=')[1];
                    if (url.indexOf('\n') !== -1) {
                        url = url.split('\n')[0];
                    }
                }
                _this._openURL(url, alwaysOpenLinksInBrowser, true);
            });
        }
    }, {
        key: 'openNode',
        value: function openNode(node, configs) {
            var _this2 = this;

            var pydio = this.props.pydio;

            var alwaysOpenDocsInBrowser = configs.get('OPEN_DOCS_IN_TAB') === "browser";

            PydioApi.getClient().buildPresignedGetUrl(node, function (url) {
                _this2._openURL(url, alwaysOpenDocsInBrowser, false);
            }, "detect");
        }
    }, {
        key: '_openURL',
        value: function _openURL(url) {
            var modal = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];
            var updateTitle = arguments.length <= 2 || arguments[2] === undefined ? false : arguments[2];

            if (modal) {
                global.open(url, '', "location=yes,menubar=yes,resizable=yes,scrollbars=yes,toolbar=yes,status=yes");
                if (this.props.onRequestTabClose) {
                    this.props.onRequestTabClose();
                }
            } else {
                if (updateTitle && this.props.onRequestTabTitleUpdate) {
                    this.props.onRequestTabTitleUpdate(url);
                }
                this.setState({ frameSrc: url });
            }
        }
    }, {
        key: 'render',
        value: function render() {
            return _react2['default'].createElement('iframe', { style: Editor.styles.iframe, src: this.state.frameSrc });
        }
    }]);

    var _Editor = Editor;
    Editor = (0, _reactRedux.connect)(null, EditorActions)(Editor) || Editor;
    return Editor;
})(_react.Component);

window.PydioBrowserEditor = {
    Editor: Editor
};
