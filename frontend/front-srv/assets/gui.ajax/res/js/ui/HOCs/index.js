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

import withContextMenu from './context-menu'
import * as controls from './controls'
import withErrors from './errors'
import withLoader from './loader'
import {ContentActions, Controls as ContentControls} from './content/index'
import {SelectionActions, SelectionControls, withSelection, withSelectionControls, withAutoPlayControls} from './selection/index'
import {SizeActions, SizeControls, SizeProviders, withContainerSize, withResize, withSizeControls} from './size/index'
import {ResolutionActions, ResolutionControls, withResolution, withResolutionControls} from './resolution/index'
import {LocalisationActions, LocalisationControls} from './localisation/index'
import {URLProvider} from './urls'
import PaletteModifier from './PaletteModifier'
import * as Animations from "./animations";
import reducers from './editor/reducers/index'
import * as actions from './editor/actions';
import withVerticalScroll from './scrollbar/withVerticalScroll';
import dropProvider from './drop/dropProvider'
import NativeFileDropProvider from './drop/NativeFileDropProvider'

const PydioHOCs = {
    EditorActions: actions,
    EditorReducers: reducers,
    ContentActions,
    ...ContentControls,
    ResolutionActions,
    ResolutionControls,
    SizeActions,
    SizeControls,
    SelectionActions,
    SelectionControls,
    LocalisationActions,
    LocalisationControls,
    withContextMenu,
    withErrors,
    withLoader,
    withContainerSize,
    withResize,
    withSizeControls,
    withResolution,
    withResolutionControls,
    withAutoPlayControls,
    withSelectionControls,
    withSelection,
    withVerticalScroll,
    dropProvider,
    NativeFileDropProvider,
    ...Animations,
    PaletteModifier,
    URLProvider,
    SizeProviders,
    ...controls
};

export {PydioHOCs as default}
