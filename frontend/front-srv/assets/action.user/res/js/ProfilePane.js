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

import React from "react";
import PasswordPopover from './PasswordPopover'
import EmailPanel from './EmailPanel'
import LangUtils from "pydio/util/lang";
import {Divider, FlatButton} from "material-ui";
import Pydio from "pydio";
import PydioApi from 'pydio/http/api';
import {UserServiceApi} from 'pydio/http/rest-api';

const {Manager, FormPanel} = Pydio.requireLib('form');

const FORM_CSS = ` 
.react-mui-context .current-user-edit.pydio-form-panel > .pydio-form-group:first-of-type {
  margin-top: 220px;
  overflow-y: hidden;
}
.react-mui-context .current-user-edit.pydio-form-panel > .pydio-form-group div.form-entry-image {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 200px;
  background-color: #eceff1;
}
.react-mui-context .current-user-edit.pydio-form-panel > .pydio-form-group div.form-entry-image .image-label,
.react-mui-context .current-user-edit.pydio-form-panel > .pydio-form-group div.form-entry-image .form-legend {
  display: none;
}
.react-mui-context .current-user-edit.pydio-form-panel > .pydio-form-group div.form-entry-image .file-dropzone {
  border-radius: 50%;
  width: 160px !important;
  height: 160px !important;
  margin: 20px auto;
}
.react-mui-context .current-user-edit.pydio-form-panel > .pydio-form-group div.form-entry-image .binary-remove-button {
  position: absolute;
  bottom: 5px;
  right: 0;
}

`;

let ProfilePane = React.createClass({

    getInitialState(){
        let objValues = {}, mailValues = {};
        let pydio = this.props.pydio;
        if(pydio.user){
            pydio.user.preferences.forEach(function(v, k){
                if(k === 'gui_preferences') {
                    return;
                }
                objValues[k] = v;
            });
        }
        return {
            definitions:Manager.parseParameters(pydio.getXmlRegistry(), "user/preferences/pref[@exposed='true']|//param[contains(@scope,'user') and @expose='true' and not(contains(@name, 'NOTIFICATIONS_EMAIL'))]"),
            mailDefinitions:Manager.parseParameters(pydio.getXmlRegistry(), "user/preferences/pref[@exposed='true']|//param[contains(@scope,'user') and @expose='true' and contains(@name, 'NOTIFICATIONS_EMAIL')]"),
            values:objValues,
            originalValues:LangUtils.deepCopy(objValues),
            dirty: false
        };
    },

    onFormChange(newValues, dirty, removeValues){
        const {values} = this.state;
        this.setState({dirty: dirty, values: newValues}, () => {
            if(this._updater) {
                this._updater(this.getButtons());
            }
            if(this.props.saveOnChange || newValues['avatar'] !== values['avatar']) {
                this.saveForm();
            }
        });
    },

    getButtons(updater = null){
        if(updater) {
            this._updater = updater;
        }
        let button, revert;
        if(this.state.dirty){
            revert = <FlatButton label={this.props.pydio.MessageHash[628]} onTouchTap={this.revert}/>;
            button = <FlatButton label={this.props.pydio.MessageHash[53]} secondary={true} onTouchTap={this.saveForm}/>;
        }else{
            button = <FlatButton label={this.props.pydio.MessageHash[86]} onTouchTap={this.props.onDismiss}/>;
        }
        if(this.props.pydio.Controller.getActionByName('pass_change')){
            return [
                <div style={{display:'flex', width: '100%'}}>
                    <PasswordPopover {...this.props}/>
                    <span style={{flex:1}}/>
                    {revert}
                    {button}
                </div>
            ];
        }else{
            return [button];
        }
    },

    getButton(actionName, messageId){
        let pydio = this.props.pydio;
        if(!pydio.Controller.getActionByName(actionName)){
            return null;
        }
        let func = () => {
            pydio.Controller.fireAction(actionName);
        };
        return (
            <ReactMUI.RaisedButton label={pydio.MessageHash[messageId]} onClick={func}/>
        );
    },

    revert(){
        this.setState({
            values: {...this.state.originalValues},
            dirty: false
        },() => {
            if(this._updater) {
                this._updater(this.getButtons());
            }
        });
    },

    saveForm(){
        if(!this.state.dirty){
            this.setState({dirty: false});
            return;
        }
        let {pydio} = this.props;
        let {definitions, values} = this.state;

        pydio.user.getIdmUser().then(idmUser => {
            if(!idmUser.Attributes) {
                idmUser.Attributes = {};
            }
            definitions.forEach(d => {
                if (values[d.name] === undefined) {
                    return;
                }
                if (d.scope === "user") {
                    idmUser.Attributes[d.name] = values[d.name];
                } else {
                    idmUser.Attributes["parameter:" + d.pluginId + ":" + d.name] = JSON.stringify(values[d.name]);
                }
            });
            if(values['lang'] && values['lang'] !== pydio.currentLanguage) {
                pydio.user.setPreference('lang', values['lang']);
            }
            const api = new UserServiceApi(PydioApi.getRestClient());
            return api.putUser(idmUser.Login, idmUser).then(response => {
                // Do something now
                pydio.refreshUserData();
                this.setState({dirty: false}, () => {
                    if(this._updater) {
                        this._updater(this.getButtons());
                    }
                });
            });

        });
    },

    render(){
        const {pydio, miniDisplay} = this.props;
        if(!pydio.user) {
            return null;
        }
        let {definitions, values} = this.state;
        if(miniDisplay){
            definitions = definitions.filter((o) => {return ['avatar'].indexOf(o.name) !== -1});
        }
        return (
            <div>
                <FormPanel
                    className="current-user-edit"
                    parameters={definitions}
                    values={values}
                    depth={-1}
                    binary_context={"user_id="+pydio.user.id + (values['avatar'] ? "?" + values['avatar'] : '')}
                    onChange={this.onFormChange}
                />
                <style type="text/css" dangerouslySetInnerHTML={{__html: FORM_CSS}}></style>
            </div>
        );
    }

});

export {ProfilePane as default}