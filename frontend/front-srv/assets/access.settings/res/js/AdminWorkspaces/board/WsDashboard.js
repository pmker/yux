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

import React from 'react'
import {FlatButton, IconButton, Paper} from 'material-ui'
import XMLUtils from 'pydio/util/xml'
import WsEditor from '../editor/WsEditor'
import WorkspaceList from './WorkspaceList'
const PydioDataModel = require('pydio/model/data-model');
const AjxpNode = require('pydio/model/node');

export default React.createClass({

    mixins:[AdminComponents.MessagesConsumerMixin],

    propTypes:{
        dataModel:React.PropTypes.instanceOf(PydioDataModel).isRequired,
        rootNode:React.PropTypes.instanceOf(AjxpNode).isRequired,
        currentNode:React.PropTypes.instanceOf(AjxpNode).isRequired,
        openEditor:React.PropTypes.func.isRequired,
        openRightPane:React.PropTypes.func.isRequired,
        closeRightPane:React.PropTypes.func.isRequired,
        filter:React.PropTypes.string,
    },

    getInitialState(){
        return {selectedNode:null, filter:this.props.filter || 'workspaces'}
    },

    componentDidMount(){
        this._setLoading = () => {
            this.setState({loading: true});
        };
        this._stopLoading = () => {
            this.setState({loading: false});
        };
        this.props.currentNode.observe('loaded', this._stopLoading);
        this.props.currentNode.observe('loading', this._setLoading);
    },

    componentWillUnmount(){
        this.props.currentNode.stopObserving('loaded', this._stopLoading);
        this.props.currentNode.stopObserving('loading', this._setLoading);
    },

    dirtyEditor(){
        const {pydio} = this.props;
        if(this.refs.editor && this.refs.editor.isDirty()){
            if(!confirm(pydio.MessageHash["role_editor.19"])) {
                return true;
            }
        }
        return false;
    },

    openWorkspace(workspace){
        if(this.dirtyEditor()){
            return;
        }
        let editor = WsEditor;
        const editorNode = XMLUtils.XPathSelectSingleNode(this.props.pydio.getXmlRegistry(), '//client_configs/component_config[@component="AdminWorkspaces.Dashboard"]/editor');
        if(editorNode){
            editor = editorNode.getAttribute('namespace') + '.' + editorNode.getAttribute('component');
        }
        const {pydio} = this.props;
        const editorData = {
            COMPONENT:editor,
            PROPS:{
                ref:"editor",
                pydio: pydio,
                workspace:workspace,
                closeEditor:this.closeWorkspace,
                reloadList:()=>{this.refs['workspacesList'].reload();}
            }
        };
        this.props.openRightPane(editorData);
        return true;
    },

    closeWorkspace(){
        if(!this.dirtyEditor()){
            this.props.closeRightPane()
        }
    },

    showWorkspaceCreator(type){
        const {pydio} = this.props;
        const editorData = {
            COMPONENT:WsEditor,
            PROPS:{
                ref:"editor",
                type:type,
                pydio: pydio,
                closeEditor:this.closeWorkspace,
                reloadList:()=>{this.refs['workspacesList'].reload();}
            }
        };
        this.props.openRightPane(editorData);

    },

    reloadWorkspaceList(){
        this.refs.workspacesList.reload();
    },

    render(){
        let buttons = [];
        let icon;
        const title = this.props.currentNode.getLabel();
        buttons.push(<FlatButton primary={true} label={this.context.getMessage('ws.3')} onTouchTap={this.showWorkspaceCreator}/>);
        icon = 'mdi mdi-folder-open';

        return (

            <div className="main-layout-nav-to-stack workspaces-board">
                <div className="vertical-layout" style={{width:'100%'}}>
                    <AdminComponents.Header
                        title={title}
                        icon={icon}
                        actions={buttons}
                        reloadAction={this.reloadWorkspaceList}
                        loading={this.state.loading}
                    />
                    <AdminComponents.SubHeader legend={this.context.getMessage('ws.dashboard', 'ajxp_admin')}/>
                    <div className="layout-fill">
                        <Paper zDepth={1} style={{margin: 16}}>
                            <WorkspaceList
                                ref="workspacesList"
                                pydio={this.props.pydio}
                                dataModel={this.props.dataModel}
                                rootNode={this.props.rootNode}
                                currentNode={this.props.currentNode}
                                openSelection={this.openWorkspace}
                                filter={this.state.filter}
                            />
                        </Paper>
                    </div>

                </div>
            </div>
        );
    }

});
