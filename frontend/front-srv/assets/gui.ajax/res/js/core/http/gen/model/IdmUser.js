/**
 * Pydio Cells Rest API
 * No description provided (generated by Swagger Codegen https://github.com/swagger-api/swagger-codegen)
 *
 * OpenAPI spec version: 1.0
 * 
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 *
 */


import ApiClient from '../ApiClient';
import IdmRole from './IdmRole';
import ServiceResourcePolicy from './ServiceResourcePolicy';





/**
* The IdmUser model module.
* @module model/IdmUser
* @version 1.0
*/
export default class IdmUser {
    /**
    * Constructs a new <code>IdmUser</code>.
    * @alias module:model/IdmUser
    * @class
    */

    constructor() {
        

        
        

        

        
    }

    /**
    * Constructs a <code>IdmUser</code> from a plain JavaScript object, optionally creating a new instance.
    * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
    * @param {Object} data The plain JavaScript object bearing properties of interest.
    * @param {module:model/IdmUser} obj Optional instance to populate.
    * @return {module:model/IdmUser} The populated <code>IdmUser</code> instance.
    */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new IdmUser();

            
            
            

            if (data.hasOwnProperty('Uuid')) {
                obj['Uuid'] = ApiClient.convertToType(data['Uuid'], 'String');
            }
            if (data.hasOwnProperty('GroupPath')) {
                obj['GroupPath'] = ApiClient.convertToType(data['GroupPath'], 'String');
            }
            if (data.hasOwnProperty('Attributes')) {
                obj['Attributes'] = ApiClient.convertToType(data['Attributes'], {'String': 'String'});
            }
            if (data.hasOwnProperty('Roles')) {
                obj['Roles'] = ApiClient.convertToType(data['Roles'], [IdmRole]);
            }
            if (data.hasOwnProperty('Login')) {
                obj['Login'] = ApiClient.convertToType(data['Login'], 'String');
            }
            if (data.hasOwnProperty('Password')) {
                obj['Password'] = ApiClient.convertToType(data['Password'], 'String');
            }
            if (data.hasOwnProperty('OldPassword')) {
                obj['OldPassword'] = ApiClient.convertToType(data['OldPassword'], 'String');
            }
            if (data.hasOwnProperty('IsGroup')) {
                obj['IsGroup'] = ApiClient.convertToType(data['IsGroup'], 'Boolean');
            }
            if (data.hasOwnProperty('GroupLabel')) {
                obj['GroupLabel'] = ApiClient.convertToType(data['GroupLabel'], 'String');
            }
            if (data.hasOwnProperty('Policies')) {
                obj['Policies'] = ApiClient.convertToType(data['Policies'], [ServiceResourcePolicy]);
            }
            if (data.hasOwnProperty('PoliciesContextEditable')) {
                obj['PoliciesContextEditable'] = ApiClient.convertToType(data['PoliciesContextEditable'], 'Boolean');
            }
        }
        return obj;
    }

    /**
    * @member {String} Uuid
    */
    Uuid = undefined;
    /**
    * @member {String} GroupPath
    */
    GroupPath = undefined;
    /**
    * @member {Object.<String, String>} Attributes
    */
    Attributes = undefined;
    /**
    * @member {Array.<module:model/IdmRole>} Roles
    */
    Roles = undefined;
    /**
    * @member {String} Login
    */
    Login = undefined;
    /**
    * @member {String} Password
    */
    Password = undefined;
    /**
    * @member {String} OldPassword
    */
    OldPassword = undefined;
    /**
    * @member {Boolean} IsGroup
    */
    IsGroup = undefined;
    /**
    * @member {String} GroupLabel
    */
    GroupLabel = undefined;
    /**
    * @member {Array.<module:model/ServiceResourcePolicy>} Policies
    */
    Policies = undefined;
    /**
    * @member {Boolean} PoliciesContextEditable
    */
    PoliciesContextEditable = undefined;








}


