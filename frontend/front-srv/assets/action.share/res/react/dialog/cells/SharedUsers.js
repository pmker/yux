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
import ShareContextConsumer from '../ShareContextConsumer'
import UserBadge from './UserBadge'
import SharedUserEntry from './SharedUserEntry'
import ActionButton from '../main/ActionButton'
import Pydio from 'pydio'
const {UsersCompleter} = Pydio.requireLib('components');

let SharedUsers = React.createClass({
    
    propTypes: {
        pydio:React.PropTypes.instanceOf(Pydio),

        cellAcls:React.PropTypes.object,

        saveSelectionAsTeam:React.PropTypes.func,
        sendInvitations:React.PropTypes.func,
        showTitle:React.PropTypes.bool,

        onUserObjectAdd:React.PropTypes.func.isRequired,
        onUserObjectRemove:React.PropTypes.func.isRequired,
        onUserObjectUpdateRight:React.PropTypes.func.isRequired,

    },
    sendInvitationToAllUsers(){
        const {cellAcls, pydio} = this.props;
        let userObjects = [];
        Object.keys(cellAcls).map(k => {
            const acl = cellAcls[k];
            if (acl.User && acl.User.Login === pydio.user.id) {
                return;
            }
            if(acl.User) {
                const userObject = PydioUsers.User.fromIdmUser(acl.User);
                userObjects[userObject.getId()] = userObject;
            }
        });
        this.props.sendInvitations(userObjects);
    },
    clearAllUsers(){
        Object.keys(this.props.cellAcls).map(k=>{
            this.props.onUserObjectRemove(k);
        })
    },
    valueSelected(userObject){
        if(userObject.IdmUser){
            this.props.onUserObjectAdd(userObject.IdmUser);
        } else {
            this.props.onUserObjectAdd(userObject.IdmRole);
        }
    },
    render(){
        const {cellAcls, pydio} = this.props;
        let index = 0;
        let userEntries = [];
        Object.keys(cellAcls).map(k => {
            const acl = cellAcls[k];
            if (acl.User && acl.User.Login === pydio.user.id){
                return;
            }
            index ++;
            userEntries.push(<SharedUserEntry
                cellAcl={acl}
                key={index}
                pydio={this.props.pydio}
                readonly={this.props.readonly}
                sendInvitations={this.props.sendInvitations}
                onUserObjectRemove={this.props.onUserObjectRemove}
                onUserObjectUpdateRight={this.props.onUserObjectUpdateRight}
            />);
        });

        let actionLinks = [];
        const aclsLength = Object.keys(this.props.cellAcls).length;
        if(aclsLength && !this.props.isReadonly() && !this.props.readonly){
            actionLinks.push(<ActionButton key="clear" callback={this.clearAllUsers} mdiIcon="delete" messageId="180"/>)
        }
        if(aclsLength && this.props.sendInvitations){
            actionLinks.push(<ActionButton key="invite" callback={this.sendInvitationToAllUsers} mdiIcon="email-outline" messageId="45"/>)
        }
        if(this.props.saveSelectionAsTeam && aclsLength > 1 && !this.props.isReadonly() && !this.props.readonly){
            actionLinks.push(<ActionButton key="team" callback={this.props.saveSelectionAsTeam} mdiIcon="account-multiple-plus" messageId="509" messageCoreNamespace={true}/>)
        }
        let rwHeader, usersInput;
        if(userEntries.length){
            rwHeader = (
                <div style={{display:'flex', marginBottom: -8, marginTop: -8, color:'rgba(0,0,0,.33)', fontSize:12}}>
                    <div style={{flex: 1}}/>
                    <div style={{width: 43, textAlign:'center'}}>
                        <span style={{borderBottom: '2px solid rgba(0,0,0,0.13)'}}>{this.props.getMessage('361', '')}</span>
                    </div>
                    <div style={{width: 43, textAlign:'center'}}>
                        <span style={{borderBottom: '2px solid rgba(0,0,0,0.13)'}}>{this.props.getMessage('181')}</span>
                    </div>
                    <div style={{width: 52}}/>
                </div>
            );
        }
        if(!this.props.isReadonly() && !this.props.readonly){
            const excludes = Object.values(cellAcls).map(a => {
                if(a.User) {
                    return a.User.Login;
                } else if(a.Group) {
                    return a.Group.Uuid;
                } else if(a.Role) {
                    return a.Role.Uuid
                } else {
                    return null
                }
            }).filter(k => !!k);
            usersInput = (
                <UsersCompleter
                    className="share-form-users"
                    fieldLabel={this.props.getMessage('34')}
                    onValueSelected={this.valueSelected}
                    pydio={this.props.pydio}
                    showAddressBook={true}
                    usersFrom="local"
                    excludes={excludes}
                />
            );
        }

        return (
            <div>
                <div style={userEntries.length? {margin: '-20px 8px 16px'} : {marginTop: -20}}>{usersInput}</div>
                {rwHeader}
                <div>{userEntries}</div>
                {!userEntries.length &&
                    <div style={{color: 'rgba(0,0,0,0.43)'}}>{this.props.getMessage('182')}</div>
                }
                {userEntries.length > 0 &&
                    <div style={{textAlign:'center'}}>{actionLinks}</div>
                }
            </div>
        );

    }
});

SharedUsers = ShareContextConsumer(SharedUsers);
export {SharedUsers as default}