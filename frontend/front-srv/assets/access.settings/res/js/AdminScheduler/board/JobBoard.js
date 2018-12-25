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
import Pydio from 'pydio'
import {IconButton, FontIcon, FlatButton, RaisedButton, Paper, Dialog, Divider} from 'material-ui'
const {JobsStore} = Pydio.requireLib("boot");
const {MaterialTable} = Pydio.requireLib('components');

class ActionsLog extends React.Component {

    render(){
        const {task} = this.props;
        const {ActionsLogs} = task;
        let lines = [], error;
        if(ActionsLogs){
            ActionsLogs.map(log => {
                lines.push(
                    <div>
                        <div style={{border: '1px solid #9e9e9e'}}>
                            <AdminComponents.CodeMirrorField
                                mode="json"
                                globalScope={{}}
                                value={JSON.stringify(log.OutputMessage, null, 4)}
                                readOnly={true}
                            />
                        </div>
                    </div>
                );
                lines.push(<Divider/>)
            });
            lines.pop();
        }

        if (task.Status === "Error" && task.StatusMessage) {
            error = <div style={{padding: '12px 0', fontWeight: 500, fontSize: 14, color:'#e53935'}}>{task.StatusMessage}</div>
        }
        if (!error && !lines.length) {
            return <div>No actions taken</div>
        }

        return (
            <div style={{fontSize: 13}}>
                {error}
                <div>{lines}</div>
            </div>
        );

    }
}


class JobBoard extends React.Component {

    constructor(props){
        super(props);
        this.state = {
            mode:'log', // 'log' or 'selection'
            selectedRows: [],
            working: false,
            taskLogs: null,
        }
    }

    runOnce(){

    }

    renderActions(row){

        const {pydio} = this.props;
        const m = (id) => pydio.MessageHash['ajxp_admin.scheduler.task.action.' + id] || id;

        const store = JobsStore.getInstance();
        let actions = [];
        if (row.Status === 'Running' && row.CanPause){
            actions.push(<IconButton iconClassName={"mdi mdi-pause"} tooltip={m('pause')} onTouchTap={()=>{store.controlTask(row, 'Pause')}} onClick={e => e.stopPropagation()}/>)
        }
        if(row.Status === 'Paused') {
            actions.push(<IconButton iconClassName={"mdi mdi-play"} tooltip={m('resume')} onTouchTap={()=>{store.controlTask(row, 'Resume')}} onClick={e => e.stopPropagation()}/>)
        }
        if(row.Status === 'Running' || row.Status === 'Paused'){
            if(row.CanStop){
                actions.push(<IconButton iconClassName={"mdi mdi-stop"} tooltip={m('stop')} onTouchTap={()=>{store.controlTask(row, 'Stop')}} onClick={e => e.stopPropagation()}/>)
            } else if(row.StatusMessage === 'Pending'){
                actions.push(<IconButton iconClassName={"mdi mdi-delete"} tooltip={m('delete')} onTouchTap={()=>{store.controlTask(row, 'Delete')}} onClick={e => e.stopPropagation()}/>)
            }
        } else {
            actions.push(<IconButton iconClassName={"mdi mdi-delete"} tooltip={m('delete')} onTouchTap={()=>{store.controlTask(row, 'Delete')}} onClick={e => e.stopPropagation()}/>)
        }
        return actions
    }

    onSelectTaskRows(rows) {
        const {mode} = this.state;
        if(mode === 'selection'){
            this.setState({selectedRows: rows});
        } else if(rows.length === 1){
            this.setState({taskLogs: rows[0]});
        }
    }

    deleteSelection(){
        const {selectedRows} = this.state;
        const {job} = this.props;
        const store = JobsStore.getInstance();
        this.setState({working: true});
        store.deleteTasks(job.ID, selectedRows).then(()=>{
            this.setState({working: false, selectedRows:[], mode:'log'})
        })
    }

    deleteAll(){
        this.setState({working: true});
        const {job} = this.props;
        const store = JobsStore.getInstance();
        store.deleteAllTasksForJob(job.ID).then(() => {
            this.setState({working: false});
        })
    }

    render(){

        const {pydio} = this.props;
        const m = (id) => pydio.MessageHash['ajxp_admin.scheduler.' + id] || id;

        const keys = [
            {name:'ID', label:m('task.id'), hideSmall: true},
            {name:'StartTime', label:m('task.start'), useMoment:true},
            {name:'EndTime', label:m('task.end'), useMoment:true, hideSmall: true},
            {name:'Status', label:m('task.status')},
            {name:'StatusMessage', label:m('task.message'), hideSmall: true, style:{width: '25%'}, headerStyle:{width:'25%'}, renderCell:(row)=>{
                if(row.Status === 'Error') return <span style={{fontWeight: 500, color: '#E53935'}}>{row.StatusMessage}</span>;
                else return row.StatusMessage;
            }},
            {name:'Actions', label:'', style:{textAlign:'right'}, renderCell:this.renderActions.bind(this)}
        ];

        const {job, onRequestClose} = this.props;
        const {selectedRows, working, mode, taskLogs} = this.state;
        const tasks = job.Tasks || [];
        const runningStatus = ['Running', 'Paused'];

        tasks.sort((a,b)=>{
            if(!a.StartTime || !b.StartTime || a.StartTime === b.StartTime) {
                return a.ID > b.ID ? 1 : -1;
            }
            return a.StartTime > b.StartTime ? -1 : 1;
        });

        let actions = [];
        if(!job.EventNames){
            actions.push(<FlatButton icon={<FontIcon className={"mdi mdi-play"}/>} label={m('task.action.run')} disabled={job.Inactive} primary={true} onTouchTap={()=>{JobsStore.getInstance().controlJob(job, 'RunOnce')}} />);
        }
        if(job.Inactive) {
            actions.push(<FlatButton icon={<FontIcon className={"mdi mdi-checkbox-marked-circle-outline"}/>} label={m('task.action.enable')} primary={true} onTouchTap={()=>{JobsStore.getInstance().controlJob(job, 'Active')}} />);
        } else {
            actions.push(<FlatButton icon={<FontIcon className={"mdi mdi-checkbox-blank-circle-outline"}/>} label={m('task.action.disable')} primary={true} onTouchTap={()=>{JobsStore.getInstance().controlJob(job, 'Inactive')}} />);
        }
        const running = tasks.filter((t) => {return runningStatus.indexOf(t.Status) !== -1});
        let other = tasks.filter((t) => {return runningStatus.indexOf(t.Status) === -1});
        let more;
        if(other.length > 20) {
            more = other.length - 20;
            other = other.slice(0, 20);
        }

        return (
            <div style={{height: '100%', display:'flex', flexDirection:'column', position:'relative'}}>
                <Dialog
                    title={job.Label}
                    onRequestClose={()=>{this.setState({taskLogs: null})}}
                    open={taskLogs !== null}
                    autoScrollBodyContent={true}
                    autoDetectWindowHeight={true}
                >
                    {taskLogs && <ActionsLog pydio={this.props.pydio} task={taskLogs}/>}
                </Dialog>
                <AdminComponents.Header
                    title={<span><a style={{cursor:'pointer', borderBottom:'1px solid rgba(0,0,0,.87)'}} onTouchTap={onRequestClose}>{pydio.MessageHash['action.scheduler.18']}</a> / {job.Label} {job.Inactive ? ' [disabled]' : ''}</span>}
                    backButtonAction={onRequestClose}
                    actions={actions}
                    loading={working}
                />
                <div style={{flex:1, overflowY: 'auto'}}>
                    <AdminComponents.SubHeader
                        title={m('tasks.running')}
                    />
                    <Paper style={{margin: 20}}>
                        <MaterialTable
                            data={running}
                            columns={keys}
                            showCheckboxes={false}
                            emptyStateString={m('tasks.running.empty')}
                        />
                    </Paper>
                    <AdminComponents.SubHeader
                        title={
                            <div style={{display:'flex', width:'100%', alignItems:'baseline'}}>
                                <div style={{flex: 1}}>{m('tasks.history')}</div>
                                {mode=== 'selection' && selectedRows.length > 1 && <div style={{lineHeight:'initial'}}><RaisedButton label={m('tasks.bulk.delete')} secondary={true} onTouchTap={this.deleteSelection.bind(this)} disabled={working}/></div>}
                                {<div style={{lineHeight:'initial', marginLeft: 5}}><FlatButton label={mode === 'selection'?m('tasks.bulk.disable'):m('tasks.bulk.enable')} primary={true} onTouchTap={()=>{this.setState({mode:mode==='selection'?'log':'selection'})}} disabled={working}/></div>}
                                {<div style={{lineHeight:'initial', marginLeft: 5}}><FlatButton label={m('tasks.bulk.clear')} primary={true} onTouchTap={this.deleteAll.bind(this)} disabled={working}/></div>}
                            </div>
                        }
                    />
                    <Paper style={{margin: 20}}>
                        <MaterialTable
                            data={other}
                            columns={keys}
                            showCheckboxes={mode === 'selection'}
                            onSelectRows={this.onSelectTaskRows.bind(this)}
                            emptyStateString={m('tasks.history.empty')}
                            selectedRows={selectedRows}
                            deselectOnClickAway={true}
                        />
                        {more  && <div style={{padding: 20, borderTop:'1px solid #eee'}}>{m('tasks.history.more').replace('%s', more)}</div>}
                    </Paper>
                </div>
            </div>
        );

    }

}

export {JobBoard as default}