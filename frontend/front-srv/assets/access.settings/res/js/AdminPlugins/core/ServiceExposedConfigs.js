import React from 'react'
import PydioApi from 'pydio/http/api'
import {ConfigServiceApi, RestConfiguration} from 'pydio/http/rest-api'

class ServiceExposedConfigs extends React.Component{

    constructor(props){
        super(props);
        this.state = {};
    }

    componentDidMount(){
        const {serviceName} = this.props;
        this.loadServiceData(serviceName);
    }

    componentWillReceiveProps(nextProps){
        if(nextProps.serviceName !== this.props.serviceName){
            this.setState({values:{}, originalValues:{}}, () => {
                this.loadServiceData(nextProps.serviceName);
            });
        }
    }

    /**
     * @param {String} serviceName
     * @return {Promise} a {@link https://www.promisejs.org/|Promise}, with an object containing data of type {@link module:model/RestDiscoveryResponse} and HTTP response
     */
    configFormsDiscoveryWithHttpInfo(serviceName) {
        let postBody = null;

        // verify the required parameter 'serviceName' is set
        if (serviceName === undefined || serviceName === null) {
            throw new Error("Missing the required parameter 'serviceName' when calling configFormsDiscovery");
        }

        let pathParams = {
            'ServiceName': serviceName
        };
        let queryParams = {};
        let headerParams = {};
        let formParams = {};

        let authNames = [];
        let contentTypes = ['application/json'];
        let accepts = ['application/json'];
        let returnType = "String";

        return PydioApi.getRestClient().callApi(
            '/config/discovery/forms/{ServiceName}', 'GET',
            pathParams, queryParams, headerParams, formParams, postBody,
            authNames, contentTypes, accepts, returnType
        );
    }


    loadServiceData(serviceId){

        this.configFormsDiscoveryWithHttpInfo(serviceId).then((responseAndData) => {
            const xmlString = responseAndData.data;
            const domNode = XMLUtils.parseXml(xmlString);
            this.setState({
                parameters: PydioForm.Manager.parseParameters(domNode, "//param"),
                loaded: true,
            });
        });

        const api = new ConfigServiceApi(PydioApi.getRestClient());
        api.getConfig("services/" + serviceId).then((restConfig) => {
            if (restConfig.Data){
                const values = JSON.parse(restConfig.Data) || {};
                this.setState({
                    originalValues: PydioForm.Manager.JsonToSlashes(values),
                    values: PydioForm.Manager.JsonToSlashes(values),
                });
            }
        });

    }

    save(){
        const {values} = this.state;
        const {onBeforeSave, onAfterSave, serviceName} = this.props;

        const jsonValues = PydioForm.Manager.SlashesToJson(values);
        if(onBeforeSave){
            onBeforeSave(jsonValues);
        }
        const api = new ConfigServiceApi(PydioApi.getRestClient());
        let body = new RestConfiguration();
        body.FullPath = "services/" + serviceName;
        body.Data = JSON.stringify(jsonValues);
        return api.putConfig(body.FullPath, body).then((res)=>{
            this.setState({dirty: false});
            if(onAfterSave){
                onAfterSave(body);
            }
        });
    }

    revert(){
        const {onRevert} = this.props;
        const {originalValues} = this.state;
        this.setState({dirty:false, values:originalValues});
        if(onRevert){
            onRevert(originalValues);
        }
    }

    onChange(formValues, dirty){
        const {onDirtyChange} = this.props;
        const jsonValues = PydioForm.Manager.SlashesToJson(formValues);
        const values = PydioForm.Manager.JsonToSlashes(jsonValues);
        this.setState({dirty:dirty, values:values});
        if(onDirtyChange){
            onDirtyChange(dirty, formValues);
        }
    }

    render() {

        const {parameters, values} = this.state;
        if(!parameters) {
            return null;
        }

        return (
            <PydioForm.FormPanel
                {...this.props}
                ref="formPanel"
                parameters={parameters}
                values={values}
                onChange={this.onChange.bind(this)}
            />
        );

    }

}

export {ServiceExposedConfigs as default}