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
import {FlatButton, IconButton, Paper, Subheader, TextField, RaisedButton} from 'material-ui'
import DataSourceEditor from '../editor/DataSourceEditor'
import VersionPolicyEditor from '../editor/VersionPolicyEditor'
import PydioDataModel from 'pydio/model/data-model'
import Node from 'pydio/model/node'
import LangUtils from 'pydio/util/lang'
import Pydio from 'pydio'
const {MaterialTable} = Pydio.requireLib('components');
import DataSource from '../model/DataSource'
import {TreeVersioningPolicy,TreeVersioningKeepPeriod} from 'pydio/http/rest-api'
import uuid from 'uuid4'
import VersionPolicyPeriods from '../editor/VersionPolicyPeriods'
import EncryptionKeys from './EncryptionKeys'

class DataSourcesBoard extends React.Component {

    constructor(props){
        super(props);
        this.state = {
            dataSources: [],
            versioningPolicies: [],
            dsLoaded: false,
            versionsLoaded: false,
            showExportKey: false,
            exportedKey : null,
            showImportKey: false,
            importResult: null,
            keyOperationError: null,
            startedServices: [],
            m: (id) => props.pydio.MessageHash["ajxp_admin.ds." + id] || id,
        };
    }

    componentDidMount(){
        this.statusPoller = setInterval(()=>{
            DataSource.loadStatuses().then(data => {
                this.setState({startedServices: data.Services});
            });
        }, 2500);
        this.load();
    }

    componentWillUnmount(){
        clearInterval(this.statusPoller);
    }

    load(){
        this.setState({dsLoaded: false, versionsLoaded: false});
        DataSource.loadDatasources().then((data) => {
            this.setState({dataSources: data.DataSources || [], dsLoaded: true});
        });
        DataSource.loadVersioningPolicies().then((data) => {
            this.setState({versioningPolicies: data.Policies || [], versionsLoaded: true});
        });
        DataSource.loadStatuses().then(data => {
            this.setState({startedServices: data.Services});
        });
        if(this.refs && this.refs.encKeys){
            this.refs.encKeys.load();
        }
    }

    closeEditor(){
        this.props.closeRightPane();
    }

    openDataSource(dataSources){
        if(!dataSources.length){
            return;
        }
        const dataSource = dataSources[0];
        this.props.openRightPane({
            COMPONENT:DataSourceEditor,
            PROPS:{
                ref:"editor",
                pydio:this.props.pydio,
                dataSource:dataSource,
                storageTypes:this.props.storageTypes,
                closeEditor:this.closeEditor.bind(this),
                reloadList:this.load.bind(this),
            }
        });
    }

    computeStatus(dataSource) {
        const {startedServices, m} = this.state;
        if(!startedServices.length){
            return m('status.na');
        }
        let index, sync, object;
        startedServices.map(service => {
            if (service.Name === 'pydio.grpc.data.sync.' + dataSource.Name){
                sync = true;
            } else if (service.Name === 'pydio.grpc.data.index.' + dataSource.Name){
                index = true;
            } else if (service.Name === 'pydio.grpc.data.objects.' + dataSource.ObjectsServiceName){
                object = true;
            }
        });
        if(index && sync && object){
            return m('status.ok');
        } else if (!index && !sync && !object) {
            return <span style={{color:'#e53935'}}>{m('status.ko')}</span>;
        } else {
            let services = [];
            if(!index) {
                services.push(m('status.index'));
            }
            if(!sync) {
                services.push(m('status.sync'));
            }
            if(!object) {
                services.push(m('status.object'));
            }
            return <span style={{color:'#e53935'}}>{services.join(' - ')}</span>;
        }
    }

    openVersionPolicy(versionPolicies = undefined){
        if(versionPolicies !== undefined && !versionPolicies.length){
            return;
        }
        let versionPolicy;
        let create = false;
        if(versionPolicies === undefined){
            create = true;
            versionPolicy = new TreeVersioningPolicy();
            versionPolicy.Uuid = uuid();
            versionPolicy.VersionsDataSourceName = "default";
            versionPolicy.VersionsDataSourceBucket = "versions";
            const period = new TreeVersioningKeepPeriod();
            period.IntervalStart = "0";
            period.MaxNumber = -1;
            versionPolicy.KeepPeriods = [period];
        }else{
            versionPolicy = versionPolicies[0];
        }
        this.props.openRightPane({
            COMPONENT:VersionPolicyEditor,
            PROPS:{
                ref:"editor",
                versionPolicy:versionPolicy,
                create: create,
                pydio: this.props.pydio,
                readonly: this.props.versioningReadonly,
                closeEditor:this.closeEditor.bind(this),
                reloadList:this.load.bind(this),
            }
        });
    }

    createDataSource(){
        const {pydio, storageTypes} = this.props;
        this.props.openRightPane({
            COMPONENT:DataSourceEditor,
            PROPS:{
                ref:"editor",
                create:true,
                pydio:pydio,
                storageTypes:storageTypes,
                closeEditor:this.closeEditor.bind(this),
                reloadList:this.load.bind(this),
            }
        });
    }

    render(){
        const {dataSources, versioningPolicies, m} = this.state;
        dataSources.sort(LangUtils.arraySorter('Name'));
        versioningPolicies.sort(LangUtils.arraySorter('Name'));

        const {currentNode, pydio, versioningReadonly} = this.props;
        const dsColumns = [
            {name:'Name', label:m('name'), style:{fontSize: 15}},
            {name:'StorageType', label:m('storage'), renderCell:(row)=>{
                let s = 'storage.fs';
                switch (row.StorageType) {
                    case "S3":
                        s = 'storage.s3';
                        break;
                    case "AZURE":
                        s = 'storage.azure';
                        break;
                    case "GCS":
                        s = 'storage.gcs';
                        break;
                    default:
                        break;
                }
                return m(s);
            }},
            {name:'Status', label:m('status'), hideSmall:true, renderCell:(row)=>{
                    return row.Disabled ? m('status.disabled') : this.computeStatus(row);
            }},
            {name:'EncryptionMode', label:m('encryption'), hideSmall:true, renderCell:(row) => {
                return row['EncryptionMode'] === 'MASTER' ? pydio.MessageHash['440'] : pydio.MessageHash['441'] ;
            }},
            {name:'VersioningPolicyName', label:m('versioning'), hideSmall:true, renderCell:(row) => {
                const pol = versioningPolicies.find((obj)=>obj.Uuid === row['VersioningPolicyName']);
                if (pol) {
                    return pol.Name;
                } else {
                    return row['VersioningPolicyName'];
                }
            }},
        ];
        const title = currentNode.getLabel();
        const icon = currentNode.getMetadata().get('icon_class');
        let buttons = [
            <FlatButton primary={true} label={pydio.MessageHash['ajxp_admin.ws.4']} onTouchTap={this.createDataSource.bind(this)}/>,
        ];
        if(!versioningReadonly){
            buttons.push(<FlatButton primary={true} label={pydio.MessageHash['ajxp_admin.ws.4b']} onTouchTap={() => {this.openVersionPolicy()}}/>)
        }
        const policiesColumns = [
            {name:'Name', label: m('versioning.name'), style:{width:180, fontSize:15}, headerStyle:{width:180}},
            {name:'Description', label: m('versioning.description')},
            {name:'KeepPeriods', hideSmall:true, label: m('versioning.periods'), renderCell:(row) => {
                return <VersionPolicyPeriods rendering="short" periods={row.KeepPeriods} pydio={pydio}/>
            }}
        ];

        return (

            <div className="main-layout-nav-to-stack workspaces-board">
                <div className="vertical-layout" style={{width:'100%'}}>
                    <AdminComponents.Header
                        title={title}
                        icon={icon}
                        actions={buttons}
                        reloadAction={this.load.bind(this)}
                        loading={!(this.state.dsLoaded && this.state.versionsLoaded)}
                    />
                    <div className="layout-fill">
                        <AdminComponents.SubHeader title={m('board.ds.title')} legend={m('board.ds.legend')}/>
                        <Paper zDepth={1} style={{margin: 16}}>
                            <MaterialTable
                                data={dataSources}
                                columns={dsColumns}
                                onSelectRows={this.openDataSource.bind(this)}
                                deselectOnClickAway={true}
                                showCheckboxes={false}
                                emptyStateString={"No datasources created yet"}
                            />
                        </Paper>

                        <AdminComponents.SubHeader title={m('board.versioning.title')} legend={m('board.versioning.legend')}/>
                        <Paper zDepth={1} style={{margin: 16}}>
                            <MaterialTable
                                data={versioningPolicies}
                                columns={policiesColumns}
                                onSelectRows={this.openVersionPolicy.bind(this)}
                                deselectOnClickAway={true}
                                showCheckboxes={false}
                            />
                        </Paper>

                        <AdminComponents.SubHeader  title={m('board.enc.title')} legend={m('board.enc.legend')}/>
                        <EncryptionKeys pydio={pydio} ref={"encKeys"}/>

                    </div>

                </div>
            </div>

        );
    }


}

DataSourcesBoard.propTypes = {
    dataModel:React.PropTypes.instanceOf(PydioDataModel).isRequired,
    rootNode:React.PropTypes.instanceOf(Node).isRequired,
    currentNode:React.PropTypes.instanceOf(Node).isRequired,
    openEditor:React.PropTypes.func.isRequired,
    openRightPane:React.PropTypes.func.isRequired,
    closeRightPane:React.PropTypes.func.isRequired,
    filter:React.PropTypes.string,
    versioningReadonly: React.PropTypes.bool,
};

export {DataSourcesBoard as default}