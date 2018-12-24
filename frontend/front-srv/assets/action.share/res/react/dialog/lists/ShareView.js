import React from 'react'
import Pydio from 'pydio'
import PydioApi from 'pydio/http/api'
import Node from 'pydio/model/node'
import PathUtils from 'pydio/util/path'
import {ShareServiceApi, RestListSharedResourcesRequest, ListSharedResourcesRequestListShareType} from 'pydio/http/rest-api'
const {ActionDialogMixin, Loader} = Pydio.requireLib('boot');
const {ModalAppBar, EmptyStateView} = Pydio.requireLib('components');
import {List, ListItem, Paper, FontIcon, SelectField, MenuItem} from 'material-ui'

class ShareView extends React.Component {

    getChildContext() {
        const messages = this.props.pydio.MessageHash;
        return {
            messages: messages,
            getMessage: function(messageId, namespace='share_center'){
                try{
                    return messages[namespace + (namespace?".":"") + messageId] || messageId;
                }catch(e){
                    return messageId;
                }
            },
            isReadonly: function(){
                return false;
            }.bind(this)
        };
    }

    constructor(props){
        super(props);
        this.state = {
            resources: [],
            loading: false,
            selectedModel: null,
            shareType: props.defaultShareType || 'LINKS'
        };

    }

    componentDidMount(){
        this.load();
    }

    load(){

        const api = new ShareServiceApi(PydioApi.getRestClient());
        const request = new RestListSharedResourcesRequest();
        request.ShareType = ListSharedResourcesRequestListShareType.constructFromObject(this.state.shareType);
        if (this.props.subject) {
            request.Subject = this.props.subject;
        } else {
            request.OwnedBySubject = true;
        }
        this.setState({loading: true});
        api.listSharedResources(request).then(res => {
            this.setState({resources: res.Resources || [], loading: false});
        }).catch(() => {
            this.setState({loading: false});
        });

    }

    getLongestPath(node){
        if (!node.AppearsIn) {
            return {path: node.Path, basename:node.Path};
        }
        let paths = {};
        node.AppearsIn.map(a => {
            paths[a.Path] = a;
        });
        let keys = Object.keys(paths);
        keys.sort();
        const longest = keys[keys.length - 1];
        let label = PathUtils.getBasename(longest);
        if (!label) {
            label = paths[longest].WsLabel;
        }
        return {path: longest, appearsIn: paths[longest], basename:label};
    }

    goTo(appearsIn){
        const {Path, WsLabel, WsUuid} = appearsIn;
        // Remove first segment (ws slug)
        let pathes = Path.split('/');
        pathes.shift();
        const pydioNode = new Node(pathes.join('/'));
        pydioNode.getMetadata().set('repository_id', WsUuid);
        pydioNode.getMetadata().set('repository_label', WsLabel);
        this.props.pydio.goTo(pydioNode);
        this.props.onRequestClose();
    }

    render(){

        const {loading, resources} = this.state;
        const {pydio, style} = this.props;
        const m = id => pydio.MessageHash['share_center.' + id];
        resources.sort((a,b) => {
            const kA = a.Node.Path;
            const kB = b.Node.Path;
            return kA === kB ? 0 : kA > kB ? 1 : -1
        });
        const extensions = pydio.Registry.getFilesExtensions();
        return (
            <div style={{...style, display:'flex', flexDirection:'column'}}>
                <div style={{backgroundColor: '#F5F5F5', borderBottom: '1px solid #EEEEEE', padding: '3px 20px', height: 50}}>
                    <SelectField
                        value={this.state.shareType}
                        onChange={(e,i,v) => {this.setState({shareType: v}, ()=>{this.load()})}}
                        underlineStyle={{display:'none'}}
                        style={{width: 160}}
                    >
                        <MenuItem value={"LINKS"} primaryText={m(243)}/>
                        <MenuItem value={"CELLS"} primaryText={m(250)}/>
                    </SelectField>
                </div>
                {loading &&
                    <Loader style={{height: 300, flex: 1}}/>
                }
                {!loading && resources.length === 0 &&
                    <EmptyStateView
                        pydio={pydio}
                        iconClassName={"mdi mdi-share-variant"}
                        primaryTextId={m(131)}
                        style={{flex: 1, height: 300, backgroundColor: 'transparent'}}
                    />
                }
                {!loading && resources.length > 0 &&
                    <List style={{flex: 1, minHeight: 300, overflowY: 'auto', paddingTop: 0}}>
                        {resources.map(res => {
                            const {appearsIn, basename} = this.getLongestPath(res.Node);
                            let icon;
                            if(basename.indexOf('.') === -1 ){
                                icon = 'mdi mdi-folder'
                            } else {
                                const ext = PathUtils.getFileExtension(basename);
                                if(extensions.has(ext)) {
                                    const {fontIcon} = extensions.get(ext);
                                    icon = 'mdi mdi-' + fontIcon;
                                } else {
                                    icon = 'mdi mdi-file';
                                }
                            }
                            return <ListItem
                                primaryText={basename}
                                secondaryText={res.Link ? m(251) + ': ' + res.Link.Description : m(284).replace('%s', res.Cells.length)}
                                onTouchTap={()=>{appearsIn ? this.goTo(appearsIn) : null}}
                                disabled={!appearsIn}
                                leftIcon={<FontIcon className={icon}/>}
                            />
                        })}
                    </List>
                }
            </div>
        );
    }

}

ShareView.childContextTypes = {
    messages:React.PropTypes.object,
    getMessage:React.PropTypes.func,
    isReadonly:React.PropTypes.func
};

const ShareViewModal = React.createClass({

    mixins: [ActionDialogMixin],

    getDefaultProps: function(){
        return {
            dialogTitle: '',
            dialogSize: 'lg',
            dialogPadding: false,
            dialogIsModal: false,
            dialogScrollBody: false
        };
    },

    submit: function(){
        this.dismiss();
    },

    render: function(){

        return (
            <div style={{width:'100%', display:'flex', flexDirection:'column'}}>
                <ModalAppBar
                    title={this.props.pydio.MessageHash['share_center.98']}
                    showMenuIconButton={false}
                    iconClassNameRight="mdi mdi-close"
                    onRightIconButtonTouchTap={()=>{this.dismiss()}}
                />
                <ShareView {...this.props} style={{width:'100%', flex: 1}} onRequestClose={()=>{this.dismiss()}}/>
            </div>
        );

    }

});

export {ShareView, ShareViewModal}