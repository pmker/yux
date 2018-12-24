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
const {withVerticalScroll} = Pydio.requireLib('hoc');
const {EmptyStateView} = Pydio.requireLib('components');
import WorkspaceEntry from './WorkspaceEntry'
const Repository = require('pydio/model/repository');
import ResourcesManager from 'pydio/http/resources-manager'
import {IconButton, Popover, FlatButton} from 'material-ui'
const {muiThemeable} = require('material-ui/styles');
import LangUtils from 'pydio/util/lang'
import Color from 'color'

class WorkspacesList extends React.Component{

    constructor(props, context){
        super(props, context);
        this.state = this.stateFromPydio(props.pydio);
        this._reloadObserver = () => {
            this.setState(this.stateFromPydio(this.props.pydio));
        };
    }

    stateFromPydio(pydio){
        return {
            workspaces : pydio.user ? pydio.user.getRepositoriesList() : [],
            showTreeForWorkspace: pydio.user ? pydio.user.activeRepository : false,
            activeRepoIsHome: pydio.user && pydio.user.activeRepository === 'homepage'
        };
    }

    componentDidMount(){
        this.props.pydio.observe('repository_list_refreshed', this._reloadObserver);
    }

    componentWillUnmount(){
        this.props.pydio.stopObserving('repository_list_refreshed', this._reloadObserver);
    }

    createRepositoryEnabled(){
        return this.props.pydio.getPluginConfigs("auth").get("USER_CREATE_CELLS");
    }

    render(){
        let entries = [], sharedEntries = [], createAction;
        const {workspaces,showTreeForWorkspace, activeRepoIsHome} = this.state;
        const {pydio, className, style, filterByType, muiTheme, sectionTitleStyle} = this.props;
        let selectHint, titleMarginFirst;
        // TEMP TESTS
        if (false && activeRepoIsHome) {
            const hintStyle = {
                padding: '14px 18px 12px',
                color: '#2196F3',
                fontWeight: 500,
                backgroundColor: '#E3F2FD',
                /*borderBottom: '1px solid #BBDEFB',
                fontStyle: 'italic'*/
            };
            const hintIconStyle = {
                display: 'inline-block',
                marginLeft: 5
            };
            selectHint = <div style={hintStyle}>Select a workspace or a cell<span className="mdi mdi-arrow-down" style={hintIconStyle}/></div>
            titleMarginFirst = true
        }
        let wsList = [];
        workspaces.forEach((o,k)=>{
            wsList.push(o);
        });
        wsList.sort(LangUtils.arraySorter('getLabel', true));

        wsList.forEach(function(object){

            const key = object.getId();
            if (Repository.isInternal(key)) return;
            if (object.hasContentFilter()) return;
            if (object.getAccessStatus() === 'declined') return;

            const entry = (
                <WorkspaceEntry
                    {...this.props}
                    key={key}
                    workspace={object}
                    showFoldersTree={showTreeForWorkspace && showTreeForWorkspace===key}
                />
            );
            if(object.getOwner()) {
                sharedEntries.push(entry);
            } else {
                entries.push(entry);
            }
        }.bind(this));

        const messages = pydio.MessageHash;
        const createClick = function(event){
            const target = event.target;
            ResourcesManager.loadClassesAndApply(['ShareDialog'], () => {
                this.setState({
                    popoverOpen: true,
                    popoverAnchor: target,
                    popoverContent: <ShareDialog.CreateCellDialog pydio={this.props.pydio} onDismiss={()=> {this.setState({popoverOpen: false})}}/>
                })
            })
        }.bind(this);
        if(this.createRepositoryEnabled()){
            const styles = {
                button: {
                    width: 36,
                    height: 36,
                    padding: 6,
                    position:'absolute',
                    right: 4,
                    top: 8
                },
                icon : {
                    fontSize: 22,
                    color: muiTheme.palette.primary1Color //'rgba(0,0,0,.54)'
                }
            };
            if(sharedEntries.length){
                createAction = <IconButton
                    style={styles.button}
                    iconStyle={styles.icon}
                    iconClassName={"mdi mdi-plus"}
                    tooltip={messages[417]}
                    tooltipPosition={"top-left"}
                    onTouchTap={createClick}
                />
            }
        }

        let sections = [];
        if(entries.length){
            const s = titleMarginFirst ? {...sectionTitleStyle, marginTop:5} : {...sectionTitleStyle};
            titleMarginFirst = false;
            sections.push({
                k:'entries',
                title: <div key="entries-title" className="section-title" style={s}>{messages[468]}</div>,
                content: <div key="entries-ws" className="workspaces">{entries}</div>
            });
        }
        if(!sharedEntries.length){

            const mainColor = Color(muiTheme.palette.primary1Color);
            sharedEntries = (
                <div style={{textAlign: 'center', color: mainColor.fade(0.6).toString()}}>
                    <div className="icomoon-cells" style={{fontSize: 80}}></div>
                    {this.createRepositoryEnabled() && <FlatButton style={{color: muiTheme.palette.accent2Color, marginTop:5}} primary={true} label={messages[418]} onTouchTap={createClick}/>}
                    <div style={{fontSize: 13, padding: '5px 20px'}}>{messages[633]}</div>
                </div>
            );

        }
        const s = titleMarginFirst ? {...sectionTitleStyle, marginTop:5} : {...sectionTitleStyle};
        sections.push({
            k:'shared',
            title: <div key="shared-title" className="section-title" style={{...s, position:'relative', overflow:'visible', padding:'16px 16px'}}>{messages[469]}{createAction}</div>,
            content: <div key="shared-ws" className="workspaces">{sharedEntries}</div>
        });

        let classNames = ['user-workspaces-list'];
        if(className) classNames.push(className);

        if(filterByType){
            let ret;
            sections.map(function(s){
                if(filterByType && filterByType === s.k){
                    ret = <div className={classNames.join(' ')}>{s.title}{s.content}</div>
                }
            });
            return ret;
        }

        let elements = [];
        sections.map(function(s) {
            elements.push(s.title);
            elements.push(s.content);
        });
        return (
            <div className={classNames.join(' ')}>
                {selectHint}
                {elements}
                <Popover
                    open={this.state.popoverOpen}
                    anchorEl={this.state.popoverAnchor}
                    useLayerForClickAway={true}
                    onRequestClose={() => {this.setState({popoverOpen: false})}}
                    anchorOrigin={sharedEntries.length ? {horizontal:"left",vertical:"top"} : {horizontal:"left",vertical:"bottom"}}
                    targetOrigin={sharedEntries.length ? {horizontal:"left",vertical:"top"} : {horizontal:"left",vertical:"bottom"}}
                    zDepth={3}
                    style={{borderRadius:6, overflow: 'hidden', marginLeft:sharedEntries.length?-10:0, marginTop:sharedEntries.length?-10:0}}
                >{this.state.popoverContent}</Popover>
            </div>
        );
    }
}

WorkspacesList.PropTypes =   {
    pydio                   : React.PropTypes.instanceOf(Pydio),
    workspaces              : React.PropTypes.instanceOf(Map),
    showTreeForWorkspace    : React.PropTypes.string,
    onHoverLink             : React.PropTypes.func,
    onOutLink               : React.PropTypes.func,
    className               : React.PropTypes.string,
    style                   : React.PropTypes.object,
    sectionTitleStyle       : React.PropTypes.object,
    filterByType            : React.PropTypes.oneOf(['shared', 'entries', 'create'])
};


WorkspacesList = withVerticalScroll(WorkspacesList);
WorkspacesList = muiThemeable()(WorkspacesList);

export {WorkspacesList as default}