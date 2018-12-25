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
const {TextField} = require('material-ui');
import SharedUsers from './SharedUsers'
import NodesPicker from './NodesPicker'
import GenericEditor from '../main/GenericEditor'
import Pydio from 'pydio'
const {ResourcePoliciesPanel} = Pydio.requireLib('components');

/**
 * Dialog for letting users create a workspace
 */
export default React.createClass({

    childContextTypes: {
        messages:React.PropTypes.object,
        getMessage:React.PropTypes.func,
        isReadonly:React.PropTypes.func
    },

    getChildContext() {
        const messages = this.props.pydio.MessageHash;
        return {
            messages: messages,
            getMessage: (messageId, namespace = 'share_center') => {
                try{
                    return messages[namespace + (namespace?".":"") + messageId] || messageId;
                }catch(e){
                    return messageId;
                }
            },
            isReadonly: (() => false)
        };
    },

    submit(){
        const {model, pydio} = this.props;
        const dirtyRoots = model.hasDirtyRootNodes();
        model.save().then(result => {
            this.forceUpdate();
            if(dirtyRoots && model.getUuid() === pydio.user.getActiveRepository()) {
                pydio.goTo('/');
                pydio.fireContextRefresh();
            }
        }).catch(reason => {
            pydio.UI.displayMessage('ERROR', reason.message);
        });
    },

    render: function(){

        const {pydio, model, sendInvitations} = this.props;
        const m = (id) => pydio.MessageHash['share_center.' + id];

        const header = (
            <div>
                <TextField style={{marginTop: -14}} floatingLabelText={m(267)} value={model.getLabel()} onChange={(e,v)=>{model.setLabel(v)}} fullWidth={true}/>
                <TextField style={{marginTop: -14}} floatingLabelText={m(268)} value={model.getDescription()} onChange={(e,v)=>{model.setDescription(v)}} fullWidth={true}/>
            </div>
        );
        const tabs = {
            left: [
                {
                    Label:m(54),
                    Value:'users',
                    Component:(<SharedUsers
                        pydio={pydio}
                        cellAcls={model.getAcls()}
                        excludes={[pydio.user.id]}
                        sendInvitations={sendInvitations}
                        onUserObjectAdd={model.addUser.bind(model)}
                        onUserObjectRemove={model.removeUser.bind(model)}
                        onUserObjectUpdateRight={model.updateUserRight.bind(model)}
                    />)
                },
                {
                    Label:m(253),
                    Value:'permissions',
                    Component:(
                        <ResourcePoliciesPanel
                            pydio={pydio}
                            resourceType="workspace"
                            resourceId={model.getUuid()}
                            style={{}}
                            skipTitle={true}
                            onSavePolicies={()=>{}}
                            readonly={false}
                            cellAcls={model.getAcls()}
                        />
                    )
                }
            ],
            right: [
                {
                    Label:m(249),
                    Value:'content',
                    Component:(<NodesPicker pydio={pydio} model={model} mode="edit"/>)
                }
            ]
        };

        return (
            <GenericEditor
                pydio={pydio}
                tabs={tabs}
                header={header}
                saveEnabled={model.isDirty()}
                onSaveAction={this.submit.bind(this)}
                onCloseAction={this.props.onDismiss}
                onRevertAction={()=>{model.revertChanges()}}
            />
        );

    }

});

