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
import {DropDownMenu, MenuItem} from 'material-ui'

import {RoleMessagesConsumerMixin} from '../util/MessagesMixin'
import PydioApi from 'pydio/http/api';

export default React.createClass({

    mixins:[RoleMessagesConsumerMixin],

    propTypes: {
        roles:React.PropTypes.array,
        addRole:React.PropTypes.func,
        removeRole:React.PropTypes.func,
        switchRoles:React.PropTypes.func,
    },

    getInitialState(){
        return {
            availableRoles: []
        }
    },

    componentDidMount(){
        PydioApi.getRestClient().getIdmApi().listRoles().then(roles => {
            this.setState({availableRoles: roles});
        })
    },

    onChange(e, selectedIndex, value){
        if(value === -1) {
            return;
        }
        this.props.addRole(value);
    },

    remove(value){
        const {availableRoles} = this.state;
        const role = availableRoles.filter(r => r.Uuid === value)[0];
        this.props.removeRole(role);
    },

    orderUpdated(oldId, newId, currentValues){
        this.props.switchRoles(oldId, newId);
    },

    render(){

        let groups=[], manual=[], users=[];
        const ctx = this.context;
        const {roles, loadingMessage} = this.props;
        const {availableRoles} = this.state;

        roles.map(function(r){
            if(r.GroupRole){
                if(r.Uuid === 'ROOT_GROUP') {
                    groups.push('/ ' + ctx.getMessage('user.25', 'ajxp_admin'));
                }else {
                    groups.push(ctx.getMessage('user.26', 'ajxp_admin').replace('%s', r.Label || r.Uuid));
                }
            }else if(r.UserRole){
                users.push(ctx.getMessage('user.27', 'ajxp_admin'));
            }else{
                /*
                if(rolesDetails[r].sticky) {
                    label += ' [' + ctx.getMessage('19') + ']';
                } // always overrides
                */
                manual.push({payload:r.Uuid, text:r.Label});
            }
        }.bind(this));

        const addableRoles = [
            <MenuItem value={-1} primaryText={ctx.getMessage('20')}/>,
            ...availableRoles.filter(r => roles.indexOf(r) === -1).map(r => <MenuItem value={r} primaryText={r.Label || r.Uuid} />)
        ];

        const fixedRoleStyle = {
            padding: 10,
            fontSize: 14,
            backgroundColor: '#ffffff',
            borderRadius: 2,
            margin: '8px 0'
        };

        return (
            <div className="user-roles-picker" style={{padding:0, marginBottom: 20}}>
                <div style={{paddingLeft: 22, marginTop: -40, display: 'flex', alignItems: 'center'}}>
                    <div style={{flex: 1, color: '#bdbdbd', fontWeight: 500}}>{ctx.getMessage('roles.picker.title')} {loadingMessage ? ' ('+ctx.getMessage('21')+')':''}</div>
                    <div className="roles-picker-menu" style={{marginTop: -12}}>
                        <DropDownMenu onChange={this.onChange} value={-1}>{addableRoles}</DropDownMenu>
                    </div>
                </div>
                <div className="roles-list" style={{margin: '0 16px'}}>
                    {groups.map(function(g){
                        return <div key={"group-"+g} style={fixedRoleStyle}>{g}</div>;
                    })}
                    <PydioComponents.SortableList
                        key="sortable"
                        values={manual}
                        removable={true}
                        onRemove={this.remove}
                        onOrderUpdated={this.orderUpdated}
                        itemClassName="role-item role-item-sortable"
                    />
                    {users.map(function(u){
                        return <div key={"user-"+u} style={fixedRoleStyle}>{u}</div>;
                    })}
                </div>
            </div>
        );

    }

});
