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
import XMLUtils from 'pydio/util/xml'
import {ConfigServiceApi, RestConfiguration} from 'pydio/http/rest-api'
import PydioApi from 'pydio/http/api'
import {RaisedButton, FlatButton} from 'material-ui'
import Pydio from 'pydio'
const PydioForm = Pydio.requireLib("form");
import ServiceExposedConfigs from './ServiceExposedConfigs'
import MailerTest from './MailerTest'

/**
 * Editor for a given plugin. By default, displays documentation in a left column panel,
 * and plugin parameters as form cards on the right.
 * May take additionalPanes to be appended to the form cards.
 */
const PluginEditor = React.createClass({

    mixins:[AdminComponents.MessagesConsumerMixin],

    propTypes:{
        serviceName: React.PropTypes.string,
        rootNode:React.PropTypes.instanceOf(AjxpNode).isRequired,
        close:React.PropTypes.func,
        style:React.PropTypes.string,
        className:React.PropTypes.string,
        additionalPanes:React.PropTypes.shape({
            top:React.PropTypes.array,
            bottom:React.PropTypes.array
        }),
        docAsAdditionalPane:React.PropTypes.bool,
        additionalDescription:React.PropTypes.string,
        registerCloseCallback:React.PropTypes.func,
        onBeforeSave:React.PropTypes.func,
        onAfterSave:React.PropTypes.func,
        onRevert:React.PropTypes.func,
        onDirtyChange:React.PropTypes.func
    },

    getInitialState:function(){

        return {
            loaded:false,
            documentation:'',
            dirty:false,
            label:'',
            docOpen:false
        };
    },

    externalSetDirty:function(){
        this.setState({dirty:true});
    },

    save: function(){
        this.refs.formConfigs.save();
        this.setState({dirty: false});
    },

    revert: function(){
        this.refs.formConfigs.revert();
        this.setState({dirty: false});
    },

    parameterHasHelper:function(paramName, testPluginId){
        const parameterName = paramName.split('/').pop();
        let h = PydioForm.Manager.hasHelper(this.props.serviceName, parameterName);
        if(!h && testPluginId){
            h = PydioForm.Manager.hasHelper(testPluginId, parameterName);
        }
        return h;
    },

    showHelper:function(helperData, testPluginId){
        if(helperData){
            const serviceName = this.props.serviceName;
            if(testPluginId && !PydioForm.Manager.hasHelper(serviceName, helperData['name'])){
                helperData['pluginId'] = testPluginId;
            }else{
                helperData['pluginId'] = serviceName;
            }
            helperData['updateCallback'] = this.helperUpdateValues.bind(this);
        }
        this.setState({helperData:helperData});
    },

    closeHelper:function(){
        this.setState({helperData:null});
    },

    /**
     * External helper can pass a full set of values and update them
     * @param newValues
     */
    helperUpdateValues:function(newValues){
        this.onChange(newValues, true);
    },

    toggleDocPane: function(){
        this.setState({docOpen:!this.state.docOpen});
    },

    monitorMainPaneScrolling:function(event){
        if(event.target.className.indexOf('pydio-form-panel') === -1){
            return;
        }
        const scroll = event.target.scrollTop;
        const newState = (scroll > 5);
        const currentScrolledState = (this.state && this.state.mainPaneScrolled);
        if(newState !== currentScrolledState){
            this.setState({mainPaneScrolled:newState});
        }
    },

    render: function(){

        const {additionalPanes, closeEditor, docAsAdditionalPane, className, style, rootNode, tabs} = this.props;
        const {documentation, pluginId, docOpen, mainPaneScrolled, dirty, parameters, values, helperData} = this.state;

        let addPanes = {top:[], bottom:[]};
        if(additionalPanes){
            addPanes.top = additionalPanes.top.slice();
            addPanes.bottom = additionalPanes.bottom.slice();
        }
        const {serviceName} = this.props;
        if(serviceName === 'pydio.grpc.mailer'){
            addPanes.bottom.push(<MailerTest pydio={this.props.pydio}/>)
        }

        let closeButton;
        if(closeEditor){
            closeButton = <RaisedButton label={this.context.getMessage('86','')} onTouchTap={closeEditor}/>
        }

        let doc = documentation;
        if(doc && docAsAdditionalPane){
            doc = doc.firstChild.nodeValue.replace('<p><ul', '<ul').replace('</ul></p>', '</ul>').replace('<p></p>', '');
            doc = doc.replace('<img src="', '<img style="width:90%;" src="plug/' + pluginId + '/');
            const readDoc = function(){
                return {__html:doc};
            };
            addPanes.top.push((
                <div className={"plugin-doc" + (docOpen?' plugin-doc-open':'')}>
                    <h3>Documentation</h3>
                    <div className="plugin-doc-pane" dangerouslySetInnerHTML={readDoc()}></div>
                </div>
            ));
        }

        let scrollingClassName = '';
        if(this.state && mainPaneScrolled){
            scrollingClassName = ' main-pane-scrolled';
        }
        let actions = [];
        actions.push(<FlatButton secondary={true} disabled={!dirty} label={this.context.getMessage('plugins.6')} onTouchTap={this.revert}/>);
        actions.push(<FlatButton secondary={true} disabled={!dirty} label={this.context.getMessage('plugins.5')} onTouchTap={this.save}/>);
        actions.push(closeButton);


        const icon = rootNode.getMetadata().get('icon_class');
        const label = rootNode.getLabel();
        // Building  a form
        return (
            <div className={(className?className+" ":"") + "main-layout-nav-to-stack vertical-layout plugin-board" + scrollingClassName} style={style}>
                <AdminComponents.Header title={label} actions={actions} scrolling={this.state && mainPaneScrolled} icon={icon}/>
                <ServiceExposedConfigs
                    ref={"formConfigs"}
                    {...this.props}
                    additionalPanes={addPanes}
                    tabs={tabs}
                    setHelperData={this.showHelper}
                    checkHasHelper={this.parameterHasHelper}
                    onScrollCallback={this.monitorMainPaneScrolling}
                    className="row-flex"
                    onDirtyChange={(dirty) => {this.setState({dirty:dirty})}}
                />
                <PydioForm.PydioHelper
                    helperData={helperData}
                    close={this.closeHelper}
                />
            </div>
        );


    }
});

export {PluginEditor as default}