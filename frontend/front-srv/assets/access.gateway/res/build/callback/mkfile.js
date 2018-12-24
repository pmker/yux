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

"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _pydioHttpApi = require("pydio/http/api");

var _pydioHttpApi2 = _interopRequireDefault(_pydioHttpApi);

var _pydioUtilLang = require('pydio/util/lang');

var _pydioUtilLang2 = _interopRequireDefault(_pydioUtilLang);

var _pydioHttpRestApi = require("pydio/http/rest-api");

exports["default"] = function (pydio) {

    return function () {
        var submit = function submit(value) {
            var api = new _pydioHttpRestApi.TreeServiceApi(_pydioHttpApi2["default"].getRestClient());
            var request = new _pydioHttpRestApi.RestCreateNodesRequest();
            var slug = pydio.user.getActiveRepositoryObject().getSlug();
            var path = slug + _pydioUtilLang2["default"].trimRight(pydio.getContextNode().getPath(), '/') + '/' + value;
            var node = new _pydioHttpRestApi.TreeNode();
            node.Path = path;
            node.Type = _pydioHttpRestApi.TreeNodeType.constructFromObject('LEAF');
            request.Nodes = [node];
            api.createNodes(request).then(function (collection) {
                console.log('Create files', collection.Children);
            });
        };
        pydio.UI.openComponentInModal('PydioReactUI', 'PromptDialog', {
            dialogTitleId: 156,
            legendId: 157,
            fieldLabelId: 174,
            dialogSize: 'sm',
            submitValue: submit
        });
    };
};

module.exports = exports["default"];
