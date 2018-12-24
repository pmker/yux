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
import PydioApi from 'pydio/http/api'
import Pydio from 'pydio'
import AddressBook from './addressbook/AddressBook'
import {TextField, AutoComplete, MenuItem, RefreshIndicator, Popover, FontIcon} from 'material-ui'
import FuncUtils from 'pydio/util/func'
import UserCreationForm from './UserCreationForm'

/**
 * Ready to use autocomplete field that will load users/groups/roles from
 * the server (using user_list_authorized_users API).
 * Used for sharing, addressbooks, send email, etc.
 *
 * Can also open a "selector-style" adress book.
 */
const UsersLoader = React.createClass({

    propTypes:{

        /**
         * Method called to render a commponent, taking a UserObject as input
         */
        renderSuggestion: React.PropTypes.func.isRequired,
        /**
         * Callback when a value is finally selected
         */
        onValueSelected : React.PropTypes.func.isRequired,
        /**
         * Floating Label Text displayed on the field
         */
        fieldLabel      : React.PropTypes.string.isRequired,
        /**
         * Array of values to ignore
         */
        excludes        : React.PropTypes.array.isRequired,
        /**
         * Display only users, no groups nor roles
         */
        usersOnly       : React.PropTypes.bool,
        /**
         * Display users from local directory and/or from remote.
         */
        usersFrom       : React.PropTypes.oneOf(['local', 'remote', 'any']),
        /**
         * Do not propose a "Create user" option
         */
        existingOnly    : React.PropTypes.bool,
        /**
         * Allow free typing
         */
        freeValueAllowed: React.PropTypes.bool,
        /**
         * Will be passed to the root component
         */
        className       : React.PropTypes.string
    },

    getInitialState(){
        return {
            dataSource  : [],
            loading     : false,
            searchText  : '',
            minChars    : parseInt(global.pydio.getPluginConfigs("core.auth").get("USERS_LIST_COMPLETE_MIN_CHARS"))
        };
    },

    /**
     * Loads values from server
     * @param {string} input Currently searched text
     * @param {Function} callback Called with the values
     */
    suggestionLoader(input, callback){
        const excludes = this.props.excludes;
        //const disallowTemporary = this.props.existingOnly && !this.props.freeValueAllowed;
        this.setState({loading:this.state.loading + 1});
        const api = PydioApi.getRestClient().getIdmApi();
        const uPromise = api.listUsers('/', input, true, 0, 20);
        const gPromise = api.listGroups('/', input, true, 0, 20);
        const tPromise = api.listTeams(input, 0, 20);
        Promise.all([uPromise, gPromise, tPromise]).then(results => {
            this.setState({loading:this.state.loading - 1});
            let [users, groups, teams] = results;
            users = users.Users;
            groups = groups.Groups;
            teams = teams.Teams;
            if(excludes && excludes.length){
                users = users.filter(user => excludes.indexOf(user.Login) === -1 );
                groups = groups.filter(group => excludes.indexOf(group.GroupLabel) === -1);
                teams = teams.filter(team => excludes.indexOf(team.Label === -1));
            }
            callback([...groups.map(u => {return {IdmUser:u}}), ...teams.map(u => {return {IdmRole:u}}), ...users.map(u => {return {IdmUser:u}})]);
        });
    },

    /**
     * Called when the field is updated
     * @param value
     */
    textFieldUpdate(value){

        this.setState({searchText: value});
        if(this.state.minChars && value && value.length < this.state.minChars ){
            return;
        }
        this.loadBuffered(value, 350);

    },

    getPendingSearchText(){
        return this.state.searchText || false;
    },

    componentWillReceiveProps(){
        this._emptyValueList = null;
    },

    /**
     * Debounced call for rendering search
     * @param value {string}
     * @param timeout {int}
     */
    loadBuffered(value, timeout){

        if(!value && this._emptyValueList){
            this.setState({dataSource: this._emptyValueList});
            return;
        }
        const {existingOnly, freeValueAllowed, excludes} = this.props;
        FuncUtils.bufferCallback('remote_users_search', timeout, function(){
            this.setState({loading: true});
            const excluded = [Pydio.getInstance().user.id, 'pydio.anon.user'];
            this.suggestionLoader(value, function(users){
                let valueExists = false;
                let values = users.filter(userObject => {
                    return !(userObject.IdmUser && !userObject.IdmUser.IsGroup && excluded.indexOf(userObject.IdmUser.Login) > -1);
                }).filter(userObject => {
                    if(!excludes) {
                        return true;
                    }
                    if(userObject.IdmUser && userObject.IdmUser.IsGroup){
                        return excludes.filter(e => e === userObject.IdmUser.Uuid).length === 0;
                    } else if(userObject.IdmUser){
                        return excludes.filter(e => e === userObject.IdmUser.Login).length === 0;
                    } else {
                        return excludes.filter(e => e === userObject.IdmRole.Uuid).length === 0;
                    }
                }).map(userObject => {
                    let identifier, icon, label;
                    if(userObject.IdmUser && userObject.IdmUser.IsGroup){
                        identifier = userObject.IdmUser.GroupLabel;
                        label = userObject.IdmUser.Attributes && userObject.IdmUser.Attributes["displayName"] ? userObject.IdmUser.Attributes["displayName"] : identifier;
                        icon = "mdi mdi-folder-account";
                    } else if(userObject.IdmUser) {
                        identifier = userObject.IdmUser.Login;
                        label = userObject.IdmUser.Attributes && userObject.IdmUser.Attributes["displayName"] ? userObject.IdmUser.Attributes["displayName"] : identifier;
                        const shared = userObject.IdmUser.Attributes && userObject.IdmUser.Attributes["profile"] === "shared";
                        if(shared){
                            icon = "mdi mdi-account";
                        } else {
                            icon = "mdi mdi-account-box-outline";
                        }
                    } else {
                        identifier = userObject.IdmRole.Uuid;
                        label = userObject.IdmRole.Label;
                        icon = "mdi mdi-account-multiple-outline";
                    }
                    valueExists |= (label === value);
                    let component = (
                        <MenuItem
                            primaryText={label}
                            leftIcon={<FontIcon className={icon} style={{margin: '0 12px'}}/>}
                        />
                    );
                    return {
                        userObject  : userObject,
                        text        : identifier,
                        value       : component
                    };
                });
                if(!value){
                    this._emptyValueList = values;
                }
                // Append temporary create user
                if(value && !valueExists && (!existingOnly || freeValueAllowed)){
                    const m = Pydio.getMessages()["448"] || "create";
                    const createItem = (
                        <MenuItem
                            primaryText={value + (freeValueAllowed ? '' : ' ('+m+')')}
                            leftIcon={<FontIcon className={"mdi mdi-account-plus"} style={{margin: '0 12px'}}/>}
                        />
                    );
                    values = [{text:value, value:createItem}, ...values];
                }
                this.setState({dataSource: values, loading: false});
            }.bind(this));
        }.bind(this));

    },

    /**
     * Called when user selects a value from the list
     * @param value
     * @param index
     */
    onCompleterRequest(value, index){

        const {freeValueAllowed} = this.props;
        if(index === -1){
            this.state.dataSource.map(function(entry){
                if(entry.text === value){
                    value = entry;
                }
            });
            if(value && !value.userObject && this.props.freeValueAllowed){
                this.props.onValueSelected({FreeValue: value.text});
                this.setState({searchText: '', dataSource:[]});
                return;
            }
        }
        if(value){
            if(value.userObject){
                this.props.onValueSelected(value.userObject);
            } else if (freeValueAllowed) {
                this.props.onValueSelected({FreeValue: value.text});
            } else {
                this.setState({createUser: value.text});
            }
            this.setState({searchText: '', dataSource:[]});
        }

    },

    /**
     * Triggers onValueSelected props callback
     * @param {Pydio.User} newUser
     */
    onUserCreated(newUser){
        this.props.onValueSelected(newUser);
        this.setState({createUser:null});
    },

    /**
     * Close user creation form
     */
    onCreationCancelled(){
        this.setState({createUser:null});
    },

    /**
     * Open address book inside a Popover
     * @param event
     */
    openAddressBook(event){
        this.setState({
            addressBookOpen: true,
            addressBookAnchor: event.currentTarget
        });
    },

    /**
     * Close address book popover
     */
    closeAddressBook(){
        this.setState({addressBookOpen: false});
    },

    /**
     * Triggered when user clicks on an entry from adress book.
     * @param item
     */
    onAddressBookItemSelected(item){
        this.props.onValueSelected(item);
    },

    render(){

        const {dataSource, createUser} = this.state;
        const containerStyle = {position:'relative', overflow: 'visible'};

        return (
            <div style={containerStyle} ref={(el)=>{this._popoverAnchor = el;}}>
                {!createUser &&
                    <AutoComplete
                        filter={AutoComplete.noFilter}
                        dataSource={dataSource}
                        searchText={this.state.searchText}
                        onUpdateInput={this.textFieldUpdate}
                        className={this.props.className}
                        openOnFocus={true}
                        floatingLabelText={this.props.fieldLabel}
                        underlineShow={!this.props.underlineHide}
                        fullWidth={true}
                        onNewRequest={this.onCompleterRequest}
                        listStyle={{maxHeight: 350, overflowY: 'auto'}}
                        onFocus={() => {this.loadBuffered(this.state.searchText, 100)}}
                    />
                }
                {createUser &&
                    <TextField
                        floatingLabelText={this.props.fieldLabel}
                        value={global.pydio.MessageHash[485] + ' (' + this.state.createUser + ')'}
                        disabled={true}
                        fullWidth={true}
                        underlineShow={!this.props.underlineHide}
                    />
                }
                {!createUser &&
                    <div style={{position:'absolute', right:4, bottom: 14, height: 20, width: 20}}>
                        <RefreshIndicator
                            size={20}
                            left={0}
                            top={0}
                            status={this.state.loading ? 'loading' : 'hide' }
                        />
                    </div>
                }
                {this.props.showAddressBook && !createUser &&
                    <AddressBook
                        mode="popover"
                        pydio={this.props.pydio}
                        loaderStyle={{width: 320, height: 420}}
                        onItemSelected={this.onAddressBookItemSelected}
                        usersFrom={this.props.usersFrom}
                        disableSearch={true}
                    />
                }
                <Popover
                    open={createUser}
                    anchorEl={this._popoverAnchor}
                    anchorOrigin={{horizontal: 'left', vertical: 'bottom'}}
                    targetOrigin={{horizontal: 'left', vertical: 'top'}}
                    onRequestClose={this.onCreationCancelled}
                    canAutoPosition={false}
                >
                    {createUser &&
                        <UserCreationForm
                            onUserCreated={this.onUserCreated.bind(this)}
                            onCancel={this.onCreationCancelled.bind(this)}
                            style={{width:350, height: 320}}
                            newUserName={this.state.createUser}
                            pydio={this.props.pydio}
                        />
                    }
                </Popover>
            </div>
        );

    }

});

export {UsersLoader as default}