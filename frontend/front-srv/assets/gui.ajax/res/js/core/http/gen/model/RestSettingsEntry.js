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
import RestSettingsEntryMeta from './RestSettingsEntryMeta';





/**
* The RestSettingsEntry model module.
* @module model/RestSettingsEntry
* @version 1.0
*/
export default class RestSettingsEntry {
    /**
    * Constructs a new <code>RestSettingsEntry</code>.
    * @alias module:model/RestSettingsEntry
    * @class
    */

    constructor() {
        

        
        

        

        
    }

    /**
    * Constructs a <code>RestSettingsEntry</code> from a plain JavaScript object, optionally creating a new instance.
    * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
    * @param {Object} data The plain JavaScript object bearing properties of interest.
    * @param {module:model/RestSettingsEntry} obj Optional instance to populate.
    * @return {module:model/RestSettingsEntry} The populated <code>RestSettingsEntry</code> instance.
    */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new RestSettingsEntry();

            
            
            

            if (data.hasOwnProperty('Key')) {
                obj['Key'] = ApiClient.convertToType(data['Key'], 'String');
            }
            if (data.hasOwnProperty('Label')) {
                obj['Label'] = ApiClient.convertToType(data['Label'], 'String');
            }
            if (data.hasOwnProperty('Description')) {
                obj['Description'] = ApiClient.convertToType(data['Description'], 'String');
            }
            if (data.hasOwnProperty('Manager')) {
                obj['Manager'] = ApiClient.convertToType(data['Manager'], 'String');
            }
            if (data.hasOwnProperty('Alias')) {
                obj['Alias'] = ApiClient.convertToType(data['Alias'], 'String');
            }
            if (data.hasOwnProperty('Metadata')) {
                obj['Metadata'] = RestSettingsEntryMeta.constructFromObject(data['Metadata']);
            }
        }
        return obj;
    }

    /**
    * @member {String} Key
    */
    Key = undefined;
    /**
    * @member {String} Label
    */
    Label = undefined;
    /**
    * @member {String} Description
    */
    Description = undefined;
    /**
    * @member {String} Manager
    */
    Manager = undefined;
    /**
    * @member {String} Alias
    */
    Alias = undefined;
    /**
    * @member {module:model/RestSettingsEntryMeta} Metadata
    */
    Metadata = undefined;








}


