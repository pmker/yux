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
const React = require('react');
import UserBadge from './UserBadge'
import ShareContextConsumer from '../ShareContextConsumer'

let SharedUserEntry = React.createClass({

    propTypes: {
        cellAcl:React.PropTypes.object.isRequired,
        sendInvitations:React.PropTypes.func,
        onUserObjectRemove:React.PropTypes.func.isRequired,
        onUserObjectUpdateRight:React.PropTypes.func.isRequired,
    },
    onRemove:function(){
        this.props.onUserObjectRemove(this.props.cellAcl.RoleId);
    },
    onInvite:function(){
        let targets = {};
        const userObject = PydioUsers.User.fromIdmUser(this.props.cellAcl.User);
        targets[userObject.getId()] = userObject;
        this.props.sendInvitations(targets);
    },
    onUpdateRight:function(event){
        const target = event.target;
        this.props.onUserObjectUpdateRight(this.props.cellAcl.RoleId, target.name, target.checked);
    },
    render: function(){
        const {cellAcl, pydio} = this.props;
        let menuItems = [];
        const type = cellAcl.User ? 'user' : (cellAcl.Group ? 'group' : 'team');

        // Do not render current user
        if(cellAcl.User && cellAcl.User.Login === pydio.user.id){
            return null;
        }

        if(type != 'group'){
            if(this.props.sendInvitations){
                // Send invitation
                menuItems.push({
                    text:this.props.getMessage('45'),
                    callback:this.onInvite
                });
            }
        }
        if(!this.props.isReadonly() && !this.props.readonly){
            // Remove Entry
            menuItems.push({
                text:this.props.getMessage('257', ''),
                callback:this.onRemove
            });
        }

        let label, avatar;
        switch (type){
            case "user":
                label = cellAcl.User.Attributes["displayName"] || cellAcl.User.Login;
                avatar = cellAcl.User.Attributes["avatar"];
                break;
            case "group":
                if(!cellAcl.Group.Attributes){
                    label = cellAcl.Group.Uuid;
                } else {
                    label = cellAcl.Group.Attributes["displayName"] || cellAcl.Group.GroupLabel;
                }
                break;
            case "team":
                if(!cellAcl.Role){
                    label = "No role found";
                } else {
                    label = cellAcl.Role.Label;
                }
                break;
            default:
                label = cellAcl.RoleId;
                break;
        }
        let read = false, write = false;
        cellAcl.Actions.map((action) =>{
            if(action.Name === 'read') read = true;
            if(action.Name === 'write') write = true;
        });

        return (
            <UserBadge
                label={label}
                avatar={avatar}
                type={type}
                menus={menuItems}
            >
                <span className="user-badge-rights-container" style={!menuItems.length ? {marginRight: 48} : {}}>
                    <input type="checkbox" name="read" disabled={this.props.isReadonly() || this.props.readonly} checked={read} onChange={this.onUpdateRight}/>
                    <input type="checkbox" name="write" disabled={this.props.isReadonly() || this.props.readonly} checked={write} onChange={this.onUpdateRight}/>
                </span>
            </UserBadge>
        );
    }
});

SharedUserEntry = ShareContextConsumer(SharedUserEntry);
export {SharedUserEntry as default}