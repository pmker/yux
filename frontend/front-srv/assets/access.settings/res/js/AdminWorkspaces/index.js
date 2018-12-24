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

import MetaSourceForm from './meta/MetaSourceForm'
import WsDashboard from './board/WsDashboard'
import MetaList from './meta/MetaList'
import VirtualNodes from './board/VirtualNodes'
import DataSourcesBoard from './board/DataSourcesBoard'
import MetadataBoard from './board/MetadataBoard'
import DataSourceEditor from './editor/DataSourceEditor'
import Workspace from './model/Ws'
import WsAutoComplete from './editor/WsAutoComplete'
import NodeCard from './virtual/NodeCard'
import VirtualNode from './model/VirtualNode'

window.AdminWorkspaces = {
    MetaSourceForm,
    MetaList,
    VirtualNodes,
    WsDashboard,
    DataSourcesBoard,
    MetadataBoard,
    DataSourceEditor,
    WsAutoComplete,
    TemplatePathEditor: NodeCard,
    TemplatePath:VirtualNode,
    Workspace,
};