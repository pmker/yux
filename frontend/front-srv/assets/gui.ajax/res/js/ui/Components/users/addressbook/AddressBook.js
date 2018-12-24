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


import NestedListItem from './NestedListItem'
import UsersList from './UsersList'
import RightPanelCard from './RightPanelCard'
import SearchPanel from './SearchPanel'
import Loaders from './Loaders'
import TeamCreationForm from '../TeamCreationForm'
import React from 'react'
import Pydio from 'pydio'
import {Popover, IconButton, Divider} from 'material-ui'
import {muiThemeable, colors} from 'material-ui/styles'
import ActionsPanel from '../avatar/ActionsPanel'
import UserCreationForm from '../UserCreationForm'
const {PydioContextConsumer} = Pydio.requireLib('boot');
import PydioApi from 'pydio/http/api';

/**
 * High level component to browse users, groups and teams, either in a large format (mode='book') or a more compact
 * format (mode='selector'|'popover').
 * Address book allows to create external users, teams, and also to browse trusted server directories if Federated Sharing
 * is active.
 */
let AddressBook = React.createClass({

    propTypes: {
        /**
         * Main instance of pydio
         */
        pydio           : React.PropTypes.instanceOf(Pydio),
        /**
         * Display mode, either large (book) or small picker ('selector', 'popover').
         */
        mode            : React.PropTypes.oneOf(['book', 'selector', 'popover']).isRequired,
        /**
         * Use book mode but display as column
         */
        bookColumn      : React.PropTypes.bool,
        /**
         * Callback triggered in 'selector' mode whenever an item is clicked.
         */
        onItemSelected  : React.PropTypes.func,
        /**
         * Display users only, no teams or groups
         */
        usersOnly       : React.PropTypes.bool,
        /**
         * Choose various user sources, either the local directory or remote ( = trusted ) servers.
         */
        usersFrom       : React.PropTypes.oneOf(['local', 'remote', 'any']),
        /**
         * Disable the search engine
         */
        disableSearch   : React.PropTypes.bool,
        /**
         * Theme object passed by muiThemeable() wrapper
         */
        muiTheme                    : React.PropTypes.object,
        /**
         * Will be passed to the Popover object
         */
        popoverStyle                : React.PropTypes.object,
        /**
         * Used as a button to open the selector in a popover
         */
        popoverButton               : React.PropTypes.object,
        /**
         * Will be passed to the Popover container object
         */
        popoverContainerStyle       : React.PropTypes.object,
        /**
         * Will be passed to the Popover Icon Button.
         */
        popoverIconButtonStyle      : React.PropTypes.object
    },

    getDefaultProps(){
        return {
            mode            : 'book',
            usersOnly       : false,
            usersFrom       : 'any',
            teamsOnly       : false,
            disableSearch   : false
        };
    },

    getInitialState(){

        const {pydio, mode, usersOnly, usersFrom, teamsOnly, disableSearch} = this.props;
        const getMessage = (id) => {return this.props.getMessage(id, '')};
        const authConfigs = pydio.getPluginConfigs('core.auth');

        let root;
        if(teamsOnly){
            root = {
                id: 'teams',
                label: getMessage(568),
                childrenLoader: Loaders.loadTeams,
                _parent: null,
                _notSelectable: true,
                actions: {
                    type: 'teams',
                    create: '+ ' + getMessage(569),
                    remove: getMessage(570),
                    multiple: true
                }
            };
            return {
                root: root,
                selectedItem:root,
                loading: false,
                rightPaneItem: null
            };
        }

        root = {
            id:'root',
            label:getMessage(592),
            type:'root',
            collections: []
        };
        if(usersFrom !== 'remote'){
            if(authConfigs.get('USER_CREATE_USERS')){
                root.collections.push({
                    id:'ext',
                    label:getMessage(593),
                    icon:'mdi mdi-account-network',
                    itemsLoader: Loaders.loadExternalUsers,
                    _parent:root,
                    _notSelectable:true,
                    actions:{
                        type    : 'users',
                        create  : '+ ' + getMessage(484),
                        remove  : getMessage(582),
                        multiple: true
                    }
                });
            }
            if(!usersOnly) {
                root.collections.push({
                    id: 'teams',
                    label: getMessage(568),
                    icon: 'mdi mdi-account-multiple',
                    childrenLoader: Loaders.loadTeams,
                    _parent: root,
                    _notSelectable: true,
                    actions: {
                        type: 'teams',
                        create: '+ ' + getMessage(569),
                        remove: getMessage(570),
                        multiple: true
                    }
                });
            }
            root.collections.push({
                id:'PYDIO_GRP_/',
                label:getMessage(584),
                icon:'mdi mdi-account-box',
                childrenLoader: Loaders.loadGroups,
                itemsLoader:  Loaders.loadGroupUsers,
                _parent:root,
                _notSelectable:true
            });
        }

        const ocsRemotes = pydio.getPluginConfigs('core.ocs').get('TRUSTED_SERVERS');
        if(ocsRemotes && !usersOnly && usersFrom !== 'local'){
            let remotes = JSON.parse(ocsRemotes);
            let remotesNodes = {
                id:'remotes',
                label:getMessage(594),
                //icon:'mdi mdi-server',
                collections:[],
                _parent:root,
                _notSelectable:true
            };
            for(let k in remotes){
                if(!remotes.hasOwnProperty(k)) continue;
                remotesNodes.collections.push({
                    id:k,
                    label:remotes[k],
                    icon:'mdi mdi-server-network',
                    type:'remote',
                    _parent:remotesNodes,
                    _notSelectable:true
                });
            }
            if(remotesNodes.collections.length){
                root.collections.push(remotesNodes);
            }
        }

        return {
            root: root,
            selectedItem:mode === 'selector' ? root : root.collections[0],
            loading: false,
            rightPaneItem: null
        };
    },

    componentDidMount(){
        this.state.selectedItem && this.onFolderClicked(this.state.selectedItem);
    },

    onFolderClicked(item, callback = undefined){
        // Special case for teams
        if(this.props.mode === 'selector' && item.IdmRole && item.IdmRole.IsTeam){
            this.onUserListItemClicked(item);
            return;
        }
        this.setState({loading: true});

        Loaders.childrenAsPromise(item, false).then((children) => {
            Loaders.childrenAsPromise(item, true).then((children) => {
                this.setState({selectedItem:item, loading: false}, callback);
            });
        });
    },

    onUserListItemClicked(item){
        if(this.props.onItemSelected){
            const uObject = new PydioUsers.User(
                item.id,
                item.label,
                item.type,
                item.group,
                item.avatar,
                item.temporary,
                item.external
            );
            if(item.trusted_server_id) {
                uObject.trustedServerId = item.trusted_server_id;
                uObject.trustedServerLabel = item.trusted_server_label;
            }
            uObject._uuid = item.uuid;
            if(item.IdmUser) uObject.IdmUser = item.IdmUser;
            if(item.IdmRole) uObject.IdmRole = item.IdmRole;
            this.props.onItemSelected(uObject);
        }else{
            this.setState({rightPaneItem:item});
        }
    },

    onCreateAction(item){
        this.setState({createDialogItem:item});
    },

    closeCreateDialogAndReload(){
        this.setState({createDialogItem:null});
        this.reloadCurrentNode();
    },

    onCardUpdateAction(item){
        if(item._parent && item._parent === this.state.selectedItem){
            this.reloadCurrentNode();
        }
    },

    onDeleteAction(parentItem, selection, skipConfirm = false){
        if(!skipConfirm && !confirm(this.props.getMessage(278))){
            return;
        }
        switch(parentItem.actions.type){
            case 'users':
                Promise.all(selection.map((user) => {
                    if(this.state.rightPaneItem === user) {
                        this.setState({rightPaneItem: null});
                    }
                    return PydioApi.getRestClient().getIdmApi().deleteIdmUser(user.IdmUser);
                })).then(() => {
                    this.reloadCurrentNode();
                });
                break;
            case 'teams':
                Promise.all(selection.map((team)=>{
                    if(this.state.rightPaneItem === team) {
                        this.setState({rightPaneItem: null});
                    }
                    return PydioApi.getRestClient().getIdmApi().deleteRole(team.IdmRole.Uuid);
                })).then(() => {
                    this.reloadCurrentNode();
                });
                break;
            case 'team':
                Promise.all(selection.map((user) => {
                    return PydioApi.getRestClient().getIdmApi().removeUserFromTeam(parentItem.IdmRole.Uuid, user.IdmUser.Login);
                })).then(()=>{
                    this.reloadCurrentNode();
                });
                break;
            default:
                break;
        }
    },

    openPopover(event){
        this.setState({
            popoverOpen: true,
            popoverAnchor: event.currentTarget
        });
    },

    closePopover(){
        this.setState({popoverOpen: false});
    },

    reloadCurrentNode(){
        this.state.selectedItem.leafLoaded = false;
        this.state.selectedItem.collectionsLoaded = false;
        this.onFolderClicked(this.state.selectedItem, () => {
            if(this.state.rightPaneItem){
                const rPaneId = this.state.rightPaneItem.id;
                let foundItem = null;
                const leafs = this.state.selectedItem.leafs || [];
                const collections = this.state.selectedItem.collections || [];
                [...leafs, ...collections].forEach((leaf) => {
                    if(leaf.id === rPaneId) foundItem = leaf;
                });
                this.setState({rightPaneItem: foundItem});
            }
        });
    },

    reloadCurrentAtPage(letterOrRange){
        this.state.selectedItem.leafLoaded = false;
        this.state.selectedItem.collectionsLoaded = false;
        if(letterOrRange === -1) {
            this.state.selectedItem.currentParams = null;
        }else if(letterOrRange.indexOf('-') !== -1){
            this.state.selectedItem.range = letterOrRange;
        }else{
            this.state.selectedItem.range = null;
            this.state.selectedItem.currentParams = {alpha_pages:'true', value:letterOrRange};
        }
        this.onFolderClicked(this.state.selectedItem);
    },

    reloadCurrentWithSearch(value){
        if(!value){
            this.reloadCurrentAtPage(-1);
            return;
        }
        this.state.selectedItem.leafLoaded = false;
        this.state.selectedItem.collectionsLoaded = false;
        this.state.selectedItem.currentParams = {has_search: true, value:value, existing_only:true};
        this.onFolderClicked(this.state.selectedItem);
    },

    render(){

        const {mode, getMessage, bookColumn} = this.props;

        if(mode === 'popover'){

            const popoverStyle = this.props.popoverStyle || {}
            const popoverContainerStyle = this.props.popoverContainerStyle || {}
            const iconButtonStyle = this.props.popoverIconButtonStyle || {}
            let iconButton = (
                <IconButton
                    style={{position:'absolute', padding:15, zIndex:100, right:0, top: 25, display:this.state.loading?'none':'initial', ...iconButtonStyle}}
                    iconStyle={{fontSize:19, color:'rgba(0,0,0,0.6)'}}
                    iconClassName={'mdi mdi-book-open-variant'}
                    onTouchTap={this.openPopover}
                />
            );
            if(this.props.popoverButton){
                iconButton = <this.props.popoverButton.type {...this.props.popoverButton.props} onTouchTap={this.openPopover}/>
            }
            return (
                <span>
                    {iconButton}
                    <Popover
                        open={this.state.popoverOpen}
                        anchorEl={this.state.popoverAnchor}
                        anchorOrigin={{horizontal: 'right', vertical: 'top'}}
                        targetOrigin={{horizontal: 'left', vertical: 'top'}}
                        onRequestClose={this.closePopover}
                        style={{marginLeft: 20, ...popoverStyle}}
                        zDepth={2}
                    >
                        <div style={{width: 320, height: 420, ...popoverContainerStyle}}>
                            <AddressBook {...this.props} mode="selector" />
                        </div>
                    </Popover>
                </span>

            );

        }

        const {selectedItem, root, rightPaneItem, createDialogItem} = this.state;

        const leftColumnStyle = {
            backgroundColor: colors.grey100,
            width: 256,
            overflowY:'auto',
            overflowX: 'hidden'
        };
        let centerComponent, rightPanel, leftPanel, topActionsPanel, onEditLabel;

        if(selectedItem.id === 'search'){

            centerComponent = (
                <SearchPanel
                    item={selectedItem}
                    title={getMessage(583, '')}
                    searchLabel={getMessage(595, '')}
                    onItemClicked={this.onUserListItemClicked}
                    onFolderClicked={this.onFolderClicked}
                    mode={mode}
                />);

        }else if(selectedItem.type === 'remote') {

            centerComponent = (
                <SearchPanel
                    item={selectedItem}
                    params={{trusted_server_id: selectedItem.id}}
                    searchLabel={getMessage(595, '')}
                    title={getMessage(596, '').replace('%s', selectedItem.label)}
                    onItemClicked={this.onUserListItemClicked}
                    onFolderClicked={this.onFolderClicked}
                    mode={mode}
                />);

        } else{

            let emptyStatePrimary;
            let emptyStateSecondary;
            let otherProps = {};
            if(selectedItem.id === 'teams'){
                emptyStatePrimary = getMessage(571, '');
                emptyStateSecondary = getMessage(572, '');
            }else if(selectedItem.id === 'ext'){
                emptyStatePrimary = getMessage(585, '');
                emptyStateSecondary = getMessage(586, '');
            }else if((selectedItem.IdmUser && selectedItem.IdmUser.IsGroup) || selectedItem.id === 'PYDIO_GRP_/'){
                otherProps = {
                    showSubheaders: true,
                    paginatorType: !(selectedItem.currentParams && selectedItem.currentParams.has_search) && 'alpha',
                    paginatorCallback: this.reloadCurrentAtPage.bind(this),
                    enableSearch: !this.props.disableSearch,
                    searchLabel: getMessage(595, ''),
                    onSearch: this.reloadCurrentWithSearch.bind(this),
                };
            }

            if((mode === 'book' || bookColumn ) && selectedItem.IdmRole && selectedItem.IdmRole.IsTeam){
                topActionsPanel =
                    (<ActionsPanel
                        {...this.props}
                        team={selectedItem}
                        userEditable={true}
                        reloadAction={()=>{this.reloadCurrentNode();}}
                        onDeleteAction={() => {
                            if(confirm(this.props.getMessage(278))){
                                const parent = selectedItem._parent;
                                this.setState({selectedItem: parent}, () => {
                                    this.onDeleteAction(parent, [selectedItem], true);
                                })
                            }
                        }}
                        style={{backgroundColor: 'transparent', borderTop:0, borderBottom:0}}
                    />);
                onEditLabel = (item, newLabel) => {
                    PydioApi.getRestClient().getIdmApi().updateTeamLabel(item.IdmRole.Uuid, newLabel, () => {
                        const parent = selectedItem._parent;
                        this.setState({selectedItem: parent}, () => {
                            this.reloadCurrentNode();
                        })
                    });
                };
            }

            centerComponent = (
                <UsersList
                    item={selectedItem}
                    onItemClicked={this.onUserListItemClicked}
                    onFolderClicked={this.onFolderClicked}
                    onCreateAction={this.onCreateAction}
                    onDeleteAction={this.onDeleteAction}
                    reloadAction={this.reloadCurrentNode.bind(this)}
                    onEditLabel={onEditLabel}
                    loading={this.state.loading}
                    mode={mode}
                    bookColumn={bookColumn}
                    emptyStatePrimaryText={emptyStatePrimary}
                    emptyStateSecondaryText={emptyStateSecondary}
                    onTouchTap={this.state.rightPaneItem ? () => { this.setState({rightPaneItem:null}) } : null}
                    actionsPanel={topActionsPanel}
                    actionsForCell={this.props.actionsForCell}
                    {...otherProps}
                />);

        }
        let rightPanelStyle = {
            ...leftColumnStyle,
            position: 'absolute',
            transformOrigin:'right',
            backgroundColor: 'white',
            right: 8,
            bottom: 8,
            top: 120,
            zIndex: 2
        };
        if(!rightPaneItem){
            rightPanelStyle = {
                ...rightPanelStyle,
                //transform: 'translateX(256px)',
                transform: 'scale(0)',
//                width: 0
            };
        }
        rightPanel = (
            <RightPanelCard
                pydio={this.props.pydio}
                onRequestClose={() => {this.setState({rightPaneItem:null})}}
                style={rightPanelStyle}
                onCreateAction={this.onCreateAction}
                onDeleteAction={this.onDeleteAction}
                onUpdateAction={this.onCardUpdateAction}
                item={rightPaneItem}/>
        );
        if(mode === 'book'){
            let nestedRoots = [];
            root.collections.map(function(e){
                nestedRoots.push(
                    <NestedListItem
                        key={e.id}
                        selected={selectedItem.id}
                        nestedLevel={0}
                        entry={e}
                        onTouchTap={this.onFolderClicked}
                    />
                );
                nestedRoots.push(<Divider key={e.id + '-divider'}/>);
            }.bind(this));
            nestedRoots.pop();
            leftPanel = (
                <MaterialUI.Paper zDepth={1} style={{...leftColumnStyle, zIndex:2}}>
                    <MaterialUI.List>{nestedRoots}</MaterialUI.List>
                </MaterialUI.Paper>
            );
        }

        let dialogTitle, dialogContent;
        if(createDialogItem){
            if(createDialogItem.actions.type === 'users'){
                dialogTitle = getMessage(484, '');
                dialogContent = (
                    <div style={{height:500}}>
                        <UserCreationForm
                            zDepth={0}
                            style={{height:500}}
                            newUserName={""}
                            onUserCreated={this.closeCreateDialogAndReload.bind(this)}
                            onCancel={() => {this.setState({createDialogItem:null})}}
                            pydio={this.props.pydio}
                        />
                    </div>
                );
            }else if(createDialogItem.actions.type === 'teams'){
                dialogTitle = getMessage(569, '');
                dialogContent = <TeamCreationForm
                    onTeamCreated={this.closeCreateDialogAndReload}
                    onCancel={() => {this.setState({createDialogItem:null})}}
                />;
            }else if(createDialogItem.actions.type === 'team'){
                const selectUser = (item) => {
                    PydioApi.getRestClient().getIdmApi().addUserToTeam(createDialogItem.IdmRole.Uuid, item.IdmUser.Login).then(()=>{
                        this.reloadCurrentNode();
                    });
                };
                dialogTitle = null;
                dialogContent = <AddressBook
                    pydio={this.props.pydio}
                    mode="selector"
                    usersOnly={true}
                    disableSearch={true}
                    onItemSelected={selectUser}
                />;
            }
        }

        let style = this.props.style || {};
        return (
            <div style={{display:'flex', height: mode === 'selector' ? 420 : 450 , ...style}}>
                {leftPanel}
                {centerComponent}
                {rightPanel}
                <MaterialUI.Dialog
                    contentStyle={{width:380,minWidth:380,maxWidth:380, padding:0}}
                    bodyStyle={{padding:0}}
                    title={<div style={{padding: 20}}>{dialogTitle}</div>}
                    actions={null}
                    modal={false}
                    open={createDialogItem?true:false}
                    onRequestClose={() => {this.setState({createDialogItem:null})}}
                >
                    {dialogContent}
                </MaterialUI.Dialog>
            </div>
        );
    }

});

AddressBook = PydioContextConsumer(AddressBook);
AddressBook = muiThemeable()(AddressBook);
export {AddressBook as default}
