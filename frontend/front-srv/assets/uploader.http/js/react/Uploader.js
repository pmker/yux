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
import {TextField, FontIcon, Divider, Paper, Toolbar, RaisedButton} from 'material-ui'

export default React.createClass({

    getInitialState () {
        const {pydio} = this.props;
        return {
            dir: pydio.user.getActiveRepositoryObject().getSlug() + pydio.getContextNode().getPath(),
            submitting: false,
            currentURL: "",
            urls: []
        }
    },

    _handleChangeURL(id) {
        return function(e, newValue) {

            if (this.state.submitting) {
                return;
            }

            if (newValue === "") {
                this._handleDeleteURL(id)();
                return
            }

            const {urls} = this.state;

            urls[id] = newValue;
            this.setState({
                urls: urls
            })
        }.bind(this)
    },

    _handleDeleteURL(id) {
        return function() {
            if (this.state.submitting) {
                return;
            }

            const {urls} = this.state;

            urls.splice(id, 1);

            this.setState({
                urls: urls
            })
        }.bind(this)
    },

    _handleChangeCurrentURL(e, value) {
        this.setState({
            currentURL: value
        });
    },

    _handleAddURL(e) {

        if (this.state.submitting) {
            return
        }

        if (e.type === "keydown" && e.keyCode !== 13) {
            return
        }

        const {currentURL, urls} = this.state;

        if (currentURL === "") {
            return
        }

        urls.push(currentURL);

        this.setState({
            currentURL: "",
            urls: urls
        })
    },

    _handleSubmit(e) {

        e.preventDefault();
        e.stopPropagation();

        const {dir, urls} = this.state;

        PydioApi.getRestClient().userJob("remote-download", {target: dir, urls: urls}).then(()=>{
            this.setState({urls:[]});
        });
    },

    render(){

        let messages = this.props.pydio.MessageHash;
        let urls = this.state.urls;

        let items = urls.map(function(item, id) {
            return (
                <div>
                    <div style={{display:'flex', justifyContent: 'space-between', padding: '0px 24px', width: '100%', height: '100%'}}>
                        <TextField disabled={this.state.submitting} style={{display:'flex', alignItems: 'center'}} value={item} underlineShow={false} fullWidth={true} onChange={this._handleChangeURL(id)} />
                        <FontIcon style={{display:'flex', alignItems: 'center', fontSize: '1em'}} className="mdi mdi-delete" onClick={this._handleDeleteURL(id)} />
                    </div>
                    <Divider />
                </div>
            )
        }.bind(this));

        return (
            <div style={{position:'relative', padding: 10}}>
                <div style={{position:'relative', margin: 10, fontSize:13}} className="dialoglegend">{messages['httpdownloader.4']}</div>
                <div style={{minHeight: 160}}>
                    <Paper zDepth={1} style={{marginBottom: 10, maxHeight: 300, overflowY: 'auto'}}>
                        {items}
                        <div style={{paddingLeft: 24}}><TextField disabled={this.state.submitting} hintText={messages['httpdownloader.5'] + ' + Hit Enter'} value={this.state.currentURL} underlineShow={false} fullWidth={true} onChange={this._handleChangeCurrentURL} onKeyDown={this._handleAddURL} onBlur={this._handleAddURL} /></div>
                        <Divider />
                    </Paper>
                </div>
                <div style={{textAlign:'right'}}>
                    <RaisedButton disabled={urls.length === 0} primary={true} label="Start" onClick={this._handleSubmit}/>
                </div>

            </div>
        );
    }
});

