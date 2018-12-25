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
import PydioApi from 'pydio/http/api'
import {Paper, FlatButton, Divider, TextField} from 'material-ui'
import {User, UsersApi} from 'pydio/http/users-api'
const {Manager, FormPanel} = Pydio.requireLib('form');

class UserCreationForm extends React.Component{

    getCreateUserParameters(editMode = false){

        let basicParameters = [];
        const pydio = this.props.pydio;
        const {MessageHash} = pydio;
        let prefix = pydio.getPluginConfigs('action.share').get('SHARED_USERS_TMP_PREFIX');
        basicParameters.push({
            IdmUserField    : 'Login',
            description     : MessageHash['533'],
            readonly        : editMode,
            expose          : "true",
            label           : MessageHash['522'],
            name            : (editMode ? "existing_user_id" : "new_user_id"),
            scope           : "user",
            type            : "valid-login",
            mandatory       : true,
            "default"       : prefix ? prefix : ''
        },{
            IdmUserField    : 'Password',
            description     : MessageHash['534'],
            editable        : "true",
            expose          : "true",
            label           : MessageHash['523'],
            name            : "new_password",
            scope           : "user",
            type            : "valid-password",
            mandatory       : true
        });

        const params = global.pydio.getPluginConfigs('auth').get('NEWUSERS_EDIT_PARAMETERS').split(',');
        for(let i=0;i<params.length;i++){
            params[i] = "user/preferences/pref[@exposed]|//param[@name='"+params[i]+"']";
        }
        const xPath = params.join('|');
        Manager.parseParameters(this.props.pydio.getXmlRegistry(), xPath).map(function(el){
            basicParameters.push(el);
        });
        if(!editMode){
            basicParameters.push({
                description : MessageHash['536'],
                editable    : "true",
                expose      : "true",
                label       : MessageHash['535'],
                name        : "send_email",
                scope       : "user",
                type        : "boolean",
                mandatory   : true
            });
        }
        return basicParameters;
    }



    getDefaultProps(){
        return {editMode: false};
    }

    getParameters(){
        if(!this._parsedParameters){
            this._parsedParameters = this.getCreateUserParameters(this.props.editMode);
        }
        return this._parsedParameters;
    }

    getValuesForPost(prefix){
        return Manager.getValuesForPOST(this.getParameters(),this.state.values,prefix);
    }

    constructor(props, context){
        super(props, context);

        const {pydio, newUserName, editMode, userData} = this.props;
        let userPrefix = pydio.getPluginConfigs('action.share').get('SHARED_USERS_TMP_PREFIX');
        if(!userPrefix || newUserName.startsWith(userPrefix)) userPrefix = '';
        let values = {
            new_password:'',
            send_email:true
        };
        if(editMode && userData && userData.IdmUser){
            const {IdmUser} = userData;
            this.getParameters().forEach(param => {
                const {name, IdmUserField, scope, pluginId} = param;
                let value;
                if(IdmUserField){
                    value = IdmUser[IdmUserField];
                } else if(scope === 'user' && IdmUser.Attributes) {
                    value = IdmUser.Attributes[name];
                } else if(pluginId && IdmUser.Attributes["parameter:" + pluginId + ":" + name]) {
                    value = JSON.parse(IdmUser.Attributes["parameter:" + pluginId + ":" + name]);
                }
                if(value !== undefined){
                    values[name] = value;
                }
            });
        }else{
            values['new_user_id'] = userPrefix + newUserName;
            values['lang'] = pydio.currentLanguage;
        }
        this.state = { values: values };
    }

    onValuesChange(newValues){
        this.setState({values:newValues});
    }

    changeValidStatus(status){
        this.setState({valid: status});
    }

    submitCreationForm(){

        let existingUser;
        const {editMode, userData} = this.props;
        if(editMode){
            existingUser = userData.IdmUser;
        }
        PydioApi.getRestClient().getIdmApi().putExternalUser(this.state.values, this.getParameters(), existingUser).then((idmUser)=>{
            this.props.onUserCreated(User.fromIdmUser(idmUser));
        });
    }

    cancelCreationForm(){
        this.props.onCancel();
    }

    render(){
        const {pydio, editMode, newUserName} = this.props;
        let status = this.state.valid;
        if(!status && editMode && !this.state.values['new_password']){
            status = true;
        }

        return (
            <Paper zDepth={this.props.zDepth !== undefined ? this.props.zDepth : 2} style={{minHeight: 250, display:'flex', flexDirection:'column', ...this.props.style}}>
                <FormPanel
                    className="reset-pydio-forms"
                    depth={-1}
                    parameters={this.getParameters()}
                    values={this.state.values}
                    onChange={this.onValuesChange.bind(this)}
                    onValidStatusChange={this.changeValidStatus.bind(this)}
                    style={{overflowY: 'auto', flex:1}}
                />
                <Divider style={{flexShrink:0}}/>
                <div style={{padding:8, textAlign:'right'}}>
                    <FlatButton label={pydio.MessageHash[49]} onTouchTap={this.cancelCreationForm.bind(this)} />
                    <FlatButton label={this.props.editMode ? pydio.MessageHash[519] : pydio.MessageHash[484]} primary={true} onTouchTap={this.submitCreationForm.bind(this)} disabled={!status} />
                </div>
            </Paper>
        )
    }
}

UserCreationForm.propTypes = {
    newUserName     : React.PropTypes.string,
    onUserCreated   : React.PropTypes.func.isRequired,
    onCancel        : React.PropTypes.func.isRequired,
    editMode        : React.PropTypes.bool,
    userData        : React.PropTypes.object
};

export {UserCreationForm as default}