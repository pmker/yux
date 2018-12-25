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
var pydio = global.pydio;

var Callbacks = {
  ls: require('./ls')(pydio),
  mkdir: require('./mkdir')(pydio),
  deleteAction: require('./deleteAction')(pydio),
  rename: require('./rename')(pydio),
  applyCopyOrMove: require('./applyCopyOrMove')(pydio),
  copy: require('./copy')(pydio),
  move: require('./move')(pydio),
  upload: require('./upload')(pydio),
  download: require('./download')(pydio),
  downloadAll: require('./downloadAll')(pydio),
  emptyRecycle: require('./emptyRecycle')(pydio),
  restore: require('./restore')(pydio),
  openInEditor: require('./openInEditor')(pydio),
  ajxpLink: require('./ajxpLink')(pydio),
  openOtherEditorPicker: require('./openOtherEditorPicker')(pydio),
  lock: require('./lock')(pydio)
};

exports['default'] = Callbacks;
module.exports = exports['default'];
