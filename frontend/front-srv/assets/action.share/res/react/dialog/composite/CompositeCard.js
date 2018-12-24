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
import {GenericCard, GenericLine} from '../main/GenericCard'
import CompositeModel from '../composite/CompositeModel'
import GenericEditor from '../main/GenericEditor'
const {PaletteModifier} = require('pydio').requireLib('hoc');
import Panel from '../links/Panel'
import SecureOptions from '../links/SecureOptions'
import ShareHelper from '../main/ShareHelper'
import Mailer from './Mailer'
import CellsList from './CellsList'
import Clipboard from 'clipboard'
import PublicLinkTemplate from '../links/PublicLinkTemplate'
import VisibilityPanel from '../links/VisibilityPanel'
import LabelPanel from '../links/LabelPanel'
import {Divider} from 'material-ui'
import Pydio from 'pydio'
const {Tooltip} = Pydio.requireLib("boot");

class CompositeCard extends React.Component {

    constructor(props){
        super(props);
        this.state = {
            mode: this.props.mode || 'view',
            model : new CompositeModel(this.props.mode === 'edit')
        };
    }

    attachClipboard(){
        const {pydio} = this.props;
        const m = (id) => pydio.MessageHash['share_center.' + id];
        const {model} = this.state;
        this.detachClipboard();
        if(!model.getLinks().length){
            return;
        }
        const linkModel = model.getLinks()[0];
        if(!linkModel.getLink()){
            return;
        }
        if(this.refs['copy-button']){
            this._clip = new Clipboard(this.refs['copy-button'], {
                text: function(trigger) {
                    return ShareHelper.buildPublicUrl(pydio, linkModel.getLink().LinkHash);
                }.bind(this)
            });
            this._clip.on('success', function(){
                this.setState({copyMessage: m('192')}, ()=>{
                    setTimeout(()=>{this.setState({copyMessage:null})}, 2500);
                })
            }.bind(this));
            this._clip.on('error', function(){
                let copyMessage;
                if( global.navigator.platform.indexOf("Mac") === 0 ){
                    copyMessage = m(144);
                }else{
                    copyMessage = m(143);
                }
                this.setState({copyMessage}, ()=>{
                    setTimeout(()=>{this.setState({copyMessage:null})}, 2500);
                })
            }.bind(this));
        }
    }
    detachClipboard(){
        if(this._clip){
            this._clip.destroy();
        }
    }


    componentDidMount() {
        const {node, mode} = this.props;
        this.state.model.observe("update", ()=>{this.forceUpdate()});
        this.state.model.load(node, mode === 'infoPanel');
        this.attachClipboard();
    }

    componentWillUnmount(){
        this.state.model.stopObserving("update");
        this.detachClipboard();
    }

    componentDidUpdate(){
        this.attachClipboard();
    }

    componentWillReceiveProps(props){
        if(props.node && (props.node !== this.props.node || props.node.getMetadata('pydio_shares') !== this.props.node.getMetadata('pydio_shares') )){
            this.state.model.load(props.node, props.mode === 'infoPanel');
        }
    }

    usersInvitations(userObjects, cellModel) {
        ShareHelper.sendCellInvitation(this.props.node, cellModel, userObjects);
    }

    linkInvitation(linkModel){
        try{
            const mailData = ShareHelper.prepareEmail(this.props.node, linkModel);
            this.setState({mailerData:{...mailData, users:[], linkModel: linkModel}});
        }catch(e){
            alert(e.message);
        }
    }

    dismissMailer(){
        this.setState({mailerData: null});
    }

    submit(){
        try{
            this.state.model.save();
        } catch(e){
            this.props.pydio.UI.displayMessage('ERROR', e.message);
        }
    }

    render(){

        const {node, mode, pydio} = this.props;
        const {model, mailerData, linkTooltip, copyMessage} = this.state;
        const m = (id) => pydio.MessageHash['share_center.' + id];

        if (mode === 'edit') {

            let publicLinkModel;
            if(model.getLinks().length){
                publicLinkModel = model.getLinks()[0];
            }
            let header;
            if(publicLinkModel && publicLinkModel.getLinkUuid() && publicLinkModel.isEditable()) {
                header = (
                    <div>
                        <Mailer {...mailerData} pydio={pydio} onDismiss={this.dismissMailer.bind(this)}/>
                        <LabelPanel pydio={pydio} linkModel={publicLinkModel}/>
                    </div>
                )
            } else {
                header = (
                    <div style={{fontSize: 24, padding: '26px 10px 0 ', lineHeight: '26px'}}>
                        <Mailer {...mailerData} pydio={pydio} onDismiss={this.dismissMailer.bind(this)}/>
                        {m(256).replace('%s', node.getLabel())}
                    </div>
                );

            }
            let tabs = {left:[], right:[], leftStyle:{padding:0}};
            tabs.right.push({
                Label:m(250),
                Value:"cells",
                Component:(
                    <CellsList pydio={pydio} compositeModel={model} usersInvitations={this.usersInvitations.bind(this)}/>
                )
            });
            const links = model.getLinks();
            if (publicLinkModel){
                tabs.left.push({
                    Label:m(251),
                    Value:'public-link',
                    Component:(<Panel
                        pydio={pydio}
                        compositeModel={model}
                        linkModel={links[0]}
                        showMailer={this.linkInvitation.bind(this)}
                    />)
                });
                if(publicLinkModel.getLinkUuid()){

                    const layoutData = ShareHelper.compileLayoutData(pydio, model);
                    let templatePane;
                    if(layoutData.length > 1){
                        templatePane = <PublicLinkTemplate
                            linkModel={publicLinkModel}
                            pydio={pydio}
                            layoutData={layoutData}
                            style={{padding: '10px 16px'}}
                            readonly={model.getNode().isLeaf()}
                        />;
                    }
                    tabs.left.push({
                        Label:m(252),
                        Value:'link-secure',
                        Component:(
                            <div>
                                <SecureOptions pydio={pydio} linkModel={links[0]} />
                                {templatePane && <Divider/>}
                                {templatePane}
                            </div>
                        )
                    });
                    tabs.left.push({
                        Label:m(253),
                        Value:'link-visibility',
                        Component:( <VisibilityPanel pydio={pydio} linkModel={links[0]}/> )
                    })
                }
            }

            return (
                <GenericEditor
                    tabs={tabs}
                    pydio={pydio}
                    header={header}
                    saveEnabled={model.isDirty()}
                    onSaveAction={this.submit.bind(this)}
                    onCloseAction={this.props.onDismiss}
                    onRevertAction={()=>{model.revertChanges()}}
                    style={{width:'100%', height: null, flex: 1, minHeight:550, color: 'rgba(0,0,0,.83)', fontSize: 13}}
                />
            );

        } else {

            let lines = [];
            let cells = [];
            model.getCells().map(cell => {
                cells.push(cell.getLabel());
            });
            if(cells.length){
                lines.push(
                    <GenericLine iconClassName="mdi mdi-account-multiple" legend={m(254)} data={cells.join(', ')}/>
                );
            }
            const links = model.getLinks();
            if (links.length && links[0].getLink()){
                const publicLink = ShareHelper.buildPublicUrl(pydio, links[0].getLink().LinkHash, mode === 'infoPanel');
                lines.push(
                    <GenericLine iconClassName="mdi mdi-link" legend={m(121)} style={{overflow:'visible'}} dataStyle={{overflow:'visible'}} data={
                        <div
                            ref="copy-button"
                            style={{cursor:'pointer', position:'relative'}}
                            onMouseOver={()=>{this.setState({linkTooltip:true})}}
                            onMouseOut={()=>{this.setState({linkTooltip:false})}}
                        >
                            <Tooltip
                                label={copyMessage ? copyMessage : m(191)}
                                horizontalPosition={"left"}
                                verticalPosition={"top"}
                                show={linkTooltip}
                            />
                            {publicLink}
                        </div>
                    }/>
                )
            }
            const deleteAction = () => {
                if(confirm(m(255))){
                    model.stopObserving('update');
                    model.deleteAll().then(res => {
                        model.updateUnderlyingNode();
                    });
                }
            };
            return (
                <GenericCard
                    pydio={pydio}
                    title={pydio.MessageHash['share_center.50']}
                    onDismissAction={this.props.onDismiss}
                    onDeleteAction={deleteAction}
                    onEditAction={()=>{pydio.Controller.fireAction('share-edit-shared')}}
                    headerSmall={mode === 'infoPanel'}
                >
                    {lines}
                </GenericCard>

            );

        }


    }

}

CompositeCard = PaletteModifier({primary1Color:'#009688'})(CompositeCard);
export {CompositeCard as default}