import React from 'react'
import {IdmWorkspace, TreeNode} from 'pydio/http/rest-api';
import WorkspaceAcl from './WorkspaceAcl'

class PagesAcls extends React.Component{

    constructor(props){
        super(props);
        const m = (id) => props.pydio.MessageHash['pydio_role.' + id] || id;

        let workspaces = [];
        const homepageWorkspace = new IdmWorkspace();
        homepageWorkspace.UUID = "homepage";
        homepageWorkspace.Label = m('workspace.statics.home.title');
        homepageWorkspace.Description = m('workspace.statics.home.description');
        homepageWorkspace.Slug = "homepage";
        homepageWorkspace.RootNodes = {"homepage-ROOT": TreeNode.constructFromObject({Uuid:"homepage-ROOT"})};
        workspaces.push(homepageWorkspace);
        if(props.showSettings) {
            const settingsWorkspace = new IdmWorkspace();
            settingsWorkspace.UUID = "settings";
            settingsWorkspace.Label = m('workspace.statics.settings.title');
            settingsWorkspace.Description = m('workspace.statics.settings.description');
            settingsWorkspace.Slug = "settings";
            settingsWorkspace.RootNodes = {"settings-ROOT": TreeNode.constructFromObject({Uuid:"settings-ROOT"})};
            workspaces.push(settingsWorkspace);
        }
        this.state = {workspaces};
    }

    render(){
        const {role} = this.props;
        const {workspaces} = this.state;
        if(!role){
            return <div></div>
        }
        return (
            <div className={"material-list"}>{workspaces.map(
                ws => {return (
                    <WorkspaceAcl
                        workspace={ws}
                        role={role}
                        advancedAcl={false}
                    />
                )}
            )}</div>
        );

    }

}

export {PagesAcls as default}