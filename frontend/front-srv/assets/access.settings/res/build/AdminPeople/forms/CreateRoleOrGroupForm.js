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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _pydioHttpApi = require('pydio/http/api');

var _pydioHttpApi2 = _interopRequireDefault(_pydioHttpApi);

var _pydioModelNode = require('pydio/model/node');

var _pydioModelNode2 = _interopRequireDefault(_pydioModelNode);

var _materialUi = require('material-ui');

var CreateRoleOrGroupForm = _react2['default'].createClass({
    displayName: 'CreateRoleOrGroupForm',

    mixins: [AdminComponents.MessagesConsumerMixin, PydioReactUI.CancelButtonProviderMixin, PydioReactUI.SubmitButtonProviderMixin],

    propTypes: {
        type: _react2['default'].PropTypes.oneOf(['group', 'user', 'role']),
        roleNode: _react2['default'].PropTypes.instanceOf(_pydioModelNode2['default']),
        openRoleEditor: _react2['default'].PropTypes.func
    },

    getTitle: function getTitle() {
        if (this.props.type === 'group') {
            return this.context.getMessage('ajxp_admin.user.15');
        } else {
            return this.context.getMessage('ajxp_admin.user.14');
        }
    },

    getPadding: function getPadding() {
        return true;
    },

    getSize: function getSize() {
        return 'sm';
    },

    dismiss: function dismiss() {
        return this.props.onDismiss();
    },

    getInitialState: function getInitialState() {
        return {
            groupId: '',
            groupIdError: this.context.getMessage('ajxp_admin.user.16.empty'),
            groupLabel: '',
            groupLabelError: this.context.getMessage('ajxp_admin.user.17.empty'),
            roleId: '',
            roleIdError: this.context.getMessage('ajxp_admin.user.18.empty')
        };
    },

    submit: function submit() {
        var _this = this;

        var _props = this.props;
        var type = _props.type;
        var pydio = _props.pydio;
        var reload = _props.reload;

        var currentNode = undefined;
        var _state = this.state;
        var groupId = _state.groupId;
        var groupIdError = _state.groupIdError;
        var groupLabel = _state.groupLabel;
        var groupLabelError = _state.groupLabelError;
        var roleId = _state.roleId;
        var roleIdError = _state.roleIdError;

        if (type === "group") {
            if (groupIdError || groupLabelError) {
                return;
            }
            if (pydio.getContextHolder().getSelectedNodes().length) {
                currentNode = pydio.getContextHolder().getSelectedNodes()[0];
            } else {
                currentNode = pydio.getContextNode();
            }
            var currentPath = currentNode.getPath().replace('/idm/users', '');
            _pydioHttpApi2['default'].getRestClient().getIdmApi().createGroup(currentPath || '/', groupId, groupLabel).then(function () {
                _this.dismiss();
                currentNode.reload();
            });
        } else if (type === "role") {
            if (roleIdError) {
                return;
            }
            currentNode = this.props.roleNode;
            _pydioHttpApi2['default'].getRestClient().getIdmApi().createRole(roleId).then(function () {
                _this.dismiss();
                if (reload) {
                    reload();
                }
            });
        }
    },

    update: function update(state) {
        if (state.groupId !== undefined) {
            var re = new RegExp(/^[0-9A-Z\-_.:\+]+$/i);
            if (!re.test(state.groupId)) {
                state.groupIdError = this.context.getMessage('ajxp_admin.user.16.format');
            } else if (state.groupId === '') {
                state.groupIdError = this.context.getMessage('ajxp_admin.user.16.empty');
            } else {
                state.groupIdError = '';
            }
        } else if (state.groupLabel !== undefined) {
            if (state.groupLabel === '') {
                state.groupLabelError = this.context.getMessage('ajxp_admin.user.17.empty');
            } else {
                state.groupLabelError = '';
            }
        } else if (state.roleId !== undefined) {
            if (state.roleId === '') {
                state.roleIdError = this.context.getMessage('ajxp_admin.user.18.empty');
            } else {
                state.roleIdError = '';
            }
        }
        this.setState(state);
    },

    render: function render() {
        var _this2 = this;

        var _state2 = this.state;
        var groupId = _state2.groupId;
        var groupIdError = _state2.groupIdError;
        var groupLabel = _state2.groupLabel;
        var groupLabelError = _state2.groupLabelError;
        var roleId = _state2.roleId;
        var roleIdError = _state2.roleIdError;

        if (this.props.type === 'group') {
            return _react2['default'].createElement(
                'div',
                { style: { width: '100%' } },
                _react2['default'].createElement(_materialUi.TextField, {
                    value: groupId,
                    errorText: groupIdError,
                    onChange: function (e, v) {
                        _this2.update({ groupId: v });
                    },
                    fullWidth: true,
                    floatingLabelText: this.context.getMessage('ajxp_admin.user.16')
                }),
                _react2['default'].createElement(_materialUi.TextField, {
                    value: groupLabel,
                    errorText: groupLabelError,
                    onChange: function (e, v) {
                        _this2.update({ groupLabel: v });
                    },
                    fullWidth: true,
                    floatingLabelText: this.context.getMessage('ajxp_admin.user.17')
                })
            );
        } else {
            return _react2['default'].createElement(
                'div',
                { style: { width: '100%' } },
                _react2['default'].createElement(_materialUi.TextField, {
                    value: roleId,
                    errorText: roleIdError,
                    onChange: function (e, v) {
                        _this2.update({ roleId: v });
                    },
                    floatingLabelText: this.context.getMessage('ajxp_admin.user.18')
                })
            );
        }
    }

});

exports['default'] = CreateRoleOrGroupForm;
module.exports = exports['default'];
