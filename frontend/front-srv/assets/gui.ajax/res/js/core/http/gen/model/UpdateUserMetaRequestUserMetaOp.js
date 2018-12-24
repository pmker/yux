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
* Enum class UpdateUserMetaRequestUserMetaOp.
* @enum {}
* @readonly
*/
export default class UpdateUserMetaRequestUserMetaOp {
    
        /**
         * value: "PUT"
         * @const
         */
        PUT = "PUT";

    
        /**
         * value: "DELETE"
         * @const
         */
        DELETE = "DELETE";

    

    /**
    * Returns a <code>UpdateUserMetaRequestUserMetaOp</code> enum value from a Javascript object name.
    * @param {Object} data The plain JavaScript object containing the name of the enum value.
    * @return {module:model/UpdateUserMetaRequestUserMetaOp} The enum <code>UpdateUserMetaRequestUserMetaOp</code> value.
    */
    static constructFromObject(object) {
        return object;
    }
}


