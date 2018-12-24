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





/**
* The MailerSendMailResponse model module.
* @module model/MailerSendMailResponse
* @version 1.0
*/
export default class MailerSendMailResponse {
    /**
    * Constructs a new <code>MailerSendMailResponse</code>.
    * @alias module:model/MailerSendMailResponse
    * @class
    */

    constructor() {
        

        
        

        

        
    }

    /**
    * Constructs a <code>MailerSendMailResponse</code> from a plain JavaScript object, optionally creating a new instance.
    * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
    * @param {Object} data The plain JavaScript object bearing properties of interest.
    * @param {module:model/MailerSendMailResponse} obj Optional instance to populate.
    * @return {module:model/MailerSendMailResponse} The populated <code>MailerSendMailResponse</code> instance.
    */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new MailerSendMailResponse();

            
            
            

            if (data.hasOwnProperty('Success')) {
                obj['Success'] = ApiClient.convertToType(data['Success'], 'Boolean');
            }
        }
        return obj;
    }

    /**
    * @member {Boolean} Success
    */
    Success = undefined;








}


