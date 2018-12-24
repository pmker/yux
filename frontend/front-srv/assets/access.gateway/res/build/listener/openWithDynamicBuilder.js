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
var PathUtils = require('pydio/util/path');

exports['default'] = function (pydio) {

    var openOtherEditorPicker = require('../callback/openOtherEditorPicker')(pydio);
    var MessageHash = pydio.MessageHash;

    return function () {
        var _this = this;

        var builderMenuItems = [];
        if (pydio.getUserSelection().isEmpty()) {
            return builderMenuItems;
        }
        var node = pydio.getUserSelection().getUniqueNode();
        var selectedMime = PathUtils.getAjxpMimeType(node);
        var nodeHasReadonly = node.getMetadata().get("node_readonly") === "true";

        var user = pydio.user;
        // Patch editors list before looking for available ones
        if (user && user.getPreference("gui_preferences", true) && user.getPreference("gui_preferences", true)["other_editor_extensions"]) {
            (function () {
                var otherRegistered = user.getPreference("gui_preferences", true)["other_editor_extensions"];
                Object.keys(otherRegistered).forEach((function (key) {
                    var editor = undefined;
                    pydio.Registry.getActiveExtensionByType("editor").forEach(function (ed) {
                        if (ed.editorClass === otherRegistered[key]) {
                            editor = ed;
                        }
                    });
                    if (editor && editor.mimes.indexOf(key) === -1) {
                        editor.mimes.push(key);
                    }
                }).bind(_this));
            })();
        }

        var editors = pydio.Registry.findEditorsForMime(selectedMime);
        var index = 0,
            sepAdded = false;
        if (editors.length) {
            editors.forEach((function (el) {
                if (!el.openable) return;
                if (el.write && nodeHasReadonly) return;
                if (el.mimes.indexOf('*') > -1) {
                    if (!sepAdded && index > 0) {
                        builderMenuItems.push({ separator: true });
                    }
                    sepAdded = true;
                }
                builderMenuItems.push({
                    name: el.text,
                    alt: el.title,
                    isDefault: index === 0,
                    icon_class: el.icon_class,
                    callback: (function (e) {
                        this.apply([el]);
                    }).bind(this)
                });
                index++;
            }).bind(this));
            builderMenuItems.push({
                name: MessageHash['openother.1'],
                alt: MessageHash['openother.2'],
                isDefault: index === 0,
                icon_class: 'icon-list-alt',
                callback: openOtherEditorPicker
            });
        }
        if (!index) {
            builderMenuItems.push({
                name: MessageHash[324],
                alt: MessageHash[324],
                callback: function callback(e) {}
            });
        }
        return builderMenuItems;
    };
};

module.exports = exports['default'];
