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
import PydioApi from 'pydio/http/api'
import {UserServiceApi, IdmUser} from 'pydio/http/rest-api'
const React = require('react')
const Pydio = require('pydio')
const {TextField} = require('material-ui')
const {ValidPassword} = Pydio.requireLib('form')


let PasswordForm = React.createClass({

    getInitialState(){
        return {error: null, old: '', newPass: ''};
    },

    getMessage(id){
        return this.props.pydio.MessageHash[id];
    },

    update(value, field){
        let newStatus = {}
        newStatus[field] = value;
        this.setState(newStatus, () => {
            let status = this.validate();
            if(this.props.onValidStatusChange){
                this.props.onValidStatusChange(status);
            }
        });
    },

    validate(){
        if(!this.refs.newpass.isValid()){
            return false;
        }
        const {oldPass, newPass} = this.state;
        if(!oldPass || !newPass){
            this.setState({error: this.getMessage(239)});
            return false;
        }
        if(newPass.length < parseInt(this.props.pydio.getPluginConfigs("core.auth").get("PASSWORD_MINLENGTH"))){
            this.setState({error: this.getMessage(378)});
            return false;
        }
        this.setState({error: null});
        return true;
    },

    post(callback){
        const {oldPass, newPass} = this.state;
        const {pydio} = this.props;
        let logoutString = '';
        if(pydio.user.lock) {
            logoutString =  ' ' + this.getMessage(445);
        }
        pydio.user.getIdmUser().then(idmUser => {
            const updateUser = IdmUser.constructFromObject(JSON.parse(JSON.stringify(idmUser)));
            updateUser.OldPassword = oldPass;
            updateUser.Password = newPass;
            const api = new UserServiceApi(PydioApi.getRestClient());
            api.putUser(updateUser.Login, updateUser).then(() => {
                pydio.displayMessage('SUCCESS', this.getMessage(197) + logoutString);
                callback(true);
                if(logoutString) {
                    pydio.getController().fireAction('logout');
                }
            })
        });
    },

    render(){

        const messages = this.props.pydio.MessageHash;
        let legend;
        if(this.state.error){
            legend = <div className="error">{this.state.error}</div>;
        } else if(this.props.pydio.user.lock){
            legend = <div>{messages[444]}</div>
        }
        let oldChange = (event, newV) => {this.update(newV, 'oldPass')};
        let newChange = (newV, oldV) => {this.update(newV, 'newPass')};
        return(
            <div style={this.props.style}>
                {legend}
                <div>
                    <form autoComplete="off">
                        <TextField
                            onChange={oldChange}
                            type="password"
                            value={this.state.oldPass}
                            ref="old"
                            floatingLabelText={messages[237]}
                            autoComplete="off"
                        />
                    </form>
                </div>
                <div style={{width:250}}>
                    <ValidPassword
                        onChange={newChange}
                        attributes={{name:'pass',label:messages[198]}}
                        value={this.state.newPass}
                        name="newpassword"
                        ref="newpass"
                    />
                </div>
            </div>
        );

    }

});

export {PasswordForm as default}