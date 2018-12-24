import React from 'react'
import ParameterEntry from './ParameterEntry'
import {IconButton, SelectField, MenuItem, Divider} from 'material-ui'
import {WorkspaceServiceApi,RestSearchWorkspaceRequest,IdmWorkspaceSingleQuery} from 'pydio/http/rest-api';

export default class ParametersPanel extends React.Component {

    constructor(props){
        super(props);
        this.state = {actions: {}, parameters: {}, workspaces:{}};
        const api = new WorkspaceServiceApi(PydioApi.getRestClient());
        const request = new RestSearchWorkspaceRequest();
        request.Queries = [IdmWorkspaceSingleQuery.constructFromObject({
            scope: 'ADMIN',
        })];
        api.searchWorkspaces(request).then(collection => {
            const wss = collection.Workspaces || [];
            let workspaces = {};
            wss.forEach(ws => {
                workspaces[ws.UUID] = ws;
            });
            this.setState({workspaces});
        });
    }

    componentDidMount(){
        const loader = AdminComponents.PluginsLoader.getInstance(this.props.pydio);
        loader.allPluginsActionsAndParameters().then(plugins => {
            this.setState({actions: plugins.ACTIONS, parameters: plugins.PARAMETERS});
        })
    }

    onCreateParameter(scope, type, pluginName, paramName, attributes){
        const {role} = this.props;
        const aclKey = type + ':' + pluginName + ':' + paramName;
        let value;
        //console.log(scope, type, pluginName, paramName, attributes);
        if(type === 'action'){
            value = false;
        } else if (attributes && attributes.xmlNode) {
            const xmlNode = attributes.xmlNode;
            value = xmlNode.getAttribute('default') ? xmlNode.getAttribute('default') : "";
            if(xmlNode.getAttribute('type') === 'boolean'){
                value = (value === "true");
            } else if(xmlNode.getAttribute('type') === 'integer'){
                value = parseInt(value);
            }
        }
        role.setParameter(aclKey, value, scope);
    }

    addParameter(scope){
        const {pydio, roleType} = this.props;
        const {actions, parameters} = this.state;
        pydio.UI.openComponentInModal('AdminPeople', 'ParameterCreate', {
            pydio: pydio,
            actions: actions,
            parameters: parameters,
            workspaceScope: scope,
            createParameter: (type, pluginName, paramName, attributes) => {this.onCreateParameter(scope, type, pluginName, paramName, attributes);},
            roleType: roleType
        });
    }


    render(){
        const {role, pydio} = this.props;
        if(!role){
            return null;
        }
        const {workspaces} = this.state;
        const m = (id) => pydio.MessageHash['pydio_role.'+id] || id;

        const params = role.listParametersAndActions();
        let scopes = {
            PYDIO_REPO_SCOPE_ALL:{},
            PYDIO_REPO_SCOPE_SHARED:{},
        };

        params.forEach(a => {
            if(!scopes[a.WorkspaceID]){
                scopes[a.WorkspaceID] = {};
            }
            const [type, pluginId, paramName] = a.Action.Name.split(':');
            scopes[a.WorkspaceID][paramName] = a;
        });
        let wsItems = [
            <MenuItem primaryText={m('parameters.scope.selector.title')} value={1}/>,
            <MenuItem primaryText={m('parameters.scope.all')} onTouchTap={() => { this.addParameter('PYDIO_REPO_SCOPE_ALL') }}/>,
            <MenuItem primaryText={m('parameters.scope.shared')} onTouchTap={() => { this.addParameter('PYDIO_REPO_SCOPE_SHARED') }}/>,
            <Divider/>
        ].concat(
            Object.keys(workspaces).map(ws => <MenuItem primaryText={workspaces[ws].Label} onTouchTap={() => { this.addParameter(ws) }}/>)
        );

        return (
            <div>
                <h3 className="paper-right-title" style={{display: 'flex'}}>
                    <span style={{flex: 1, paddingRight: 20}}>
                        {m('46')}
                        <div className={"section-legend"}>{m('47')}</div>
                    </span>
                    <div style={{width: 160}}><SelectField fullWidth={true} value={1}>{wsItems}</SelectField></div>
                </h3>
                <div style={{padding: '0 20px'}}>
                    {Object.keys(scopes).map(s => {
                        let scopeLabel;
                        let odd = false;
                        if(s === 'PYDIO_REPO_SCOPE_ALL') {
                            scopeLabel = m('parameters.scope.all');
                        } else if(s === 'PYDIO_REPO_SCOPE_SHARED') {
                            scopeLabel = m('parameters.scope.shared');
                        } else if(workspaces[s]){
                            scopeLabel = m('parameters.scope.workspace').replace('%s', workspaces[s].Label);
                        } else {
                            scopeLabel = m('parameters.scope.workspace').replace('%s', s);
                        }
                        let entries;
                        if(Object.keys(scopes[s]).length){
                            entries = Object.keys(scopes[s]).map(param => {
                                const style = {backgroundColor: odd ? '#FAFAFA' : 'white'};
                                odd = !odd;
                                return <ParameterEntry pydio={pydio} acl={scopes[s][param]} role={role} {...this.state} style={style}/>
                            });
                        } else {
                            entries = <tr><td colSpan={3} style={{padding: '14px 0'}}>{m('parameters.empty')}</td></tr>;
                        }
                        return (
                            <table style={{width:'100%', marginBottom: 20}}>
                                <tr style={{borderBottom: '1px solid #e0e0e0'}}>
                                    <td colSpan={2} style={{fontSize: 15, paddingTop: 10}}>{scopeLabel}</td>
                                    <td style={{width: 50}}>
                                        <IconButton iconClassName={"mdi mdi-plus"} onTouchTap={()=>{this.addParameter(s)}} tooltip={m('parameters.custom.add')}/>
                                    </td>
                                </tr>
                                {entries}
                            </table>
                        );
                    })}
                </div>
            </div>
        );

    }

}