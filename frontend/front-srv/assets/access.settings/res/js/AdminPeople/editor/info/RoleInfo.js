import React from 'react'
import Pydio from 'pydio'
import Role from '../model/Role'
const {FormPanel} = Pydio.requireLib('form');

class RoleInfo extends React.Component {

    constructor(props){
        super(props);
        this.state = {
            parameters: []
        };
        AdminComponents.PluginsLoader.getInstance(props.pydio).formParameters('//global_param[contains(@scope,\'role\')]|//param[contains(@scope,\'role\')]').then(params => {
            this.setState({parameters: params});
        })

    }

    getPydioRoleMessage(messageId){
        const {pydio} = this.props;
        return pydio.MessageHash['role_editor.' + messageId] || messageId;
    }

    onParameterChange(paramName, newValue, oldValue){
        const {role} = this.props;
        const idmRole = role.getIdmRole();
        if(paramName === "applies") {
            idmRole.AutoApplies = newValue.split(',');
        } else if(paramName === "roleLabel"){
            idmRole.Label = newValue;
        }else{
            const param = this.getParameterByName(paramName);
            if(param.aclKey){
                role.setParameter(param.aclKey, newValue);
            }
        }
    }

    getParameterByName(paramName){
        const {parameters} = this.state;
        return parameters.filter(p => p.name === paramName)[0];
    }

    render(){

        const {role} = this.props;
        const {parameters} = this.state;

        if(!parameters){
            return <div>Loading...</div>;
        }

        // Load role parameters
        const params = [
            {"name":"roleId", label:this.getPydioRoleMessage('31'),"type":"string", readonly:true},
            {"name":"roleLabel", label:this.getPydioRoleMessage('32'),"type":"string"},
            {"name":"applies", label:this.getPydioRoleMessage('33'),"type":"select", multiple:true, choices:'admin|Administrators,standard|Standard,shared|Shared Users,anon|Anonymous'},
            ...parameters
        ];

        let values = {applies: []};
        if(role){
            const idmRole = role.getIdmRole();
            let applies = idmRole.AutoApplies || [];
            values = {
                roleId:idmRole.Uuid,
                applies: applies.filter(v => !!v), // filter empty values
                roleLabel:idmRole.Label,
            };
            parameters.map(p => {
                if(p.aclKey && role.getParameterValue(p.aclKey)){
                    values[p.name] = role.getParameterValue(p.aclKey);
                }
            });
        }
        //console.log(values);

        return (
            <FormPanel
                parameters={params}
                onParameterChange={this.onParameterChange.bind(this)}
                values={values}
                depth={-2}
            />
        );

    }

}

RoleInfo.PropTypes = {
    pydio: React.PropTypes.instanceOf(Pydio).isRequired,
    pluginsRegistry: React.PropTypes.instanceOf(XMLDocument),
    role: React.PropTypes.instanceOf(Role),
};

export {RoleInfo as default}