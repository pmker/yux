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
import TreeNode from './TreeNode';





/**
* The TreeReadNodeRequest model module.
* @module model/TreeReadNodeRequest
* @version 1.0
*/
export default class TreeReadNodeRequest {
    /**
    * Constructs a new <code>TreeReadNodeRequest</code>.
    * @alias module:model/TreeReadNodeRequest
    * @class
    */

    constructor() {
        

        
        

        

        
    }

    /**
    * Constructs a <code>TreeReadNodeRequest</code> from a plain JavaScript object, optionally creating a new instance.
    * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
    * @param {Object} data The plain JavaScript object bearing properties of interest.
    * @param {module:model/TreeReadNodeRequest} obj Optional instance to populate.
    * @return {module:model/TreeReadNodeRequest} The populated <code>TreeReadNodeRequest</code> instance.
    */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new TreeReadNodeRequest();

            
            
            

            if (data.hasOwnProperty('Node')) {
                obj['Node'] = TreeNode.constructFromObject(data['Node']);
            }
            if (data.hasOwnProperty('WithCommits')) {
                obj['WithCommits'] = ApiClient.convertToType(data['WithCommits'], 'Boolean');
            }
            if (data.hasOwnProperty('WithExtendedStats')) {
                obj['WithExtendedStats'] = ApiClient.convertToType(data['WithExtendedStats'], 'Boolean');
            }
        }
        return obj;
    }

    /**
    * @member {module:model/TreeNode} Node
    */
    Node = undefined;
    /**
    * @member {Boolean} WithCommits
    */
    WithCommits = undefined;
    /**
    * @member {Boolean} WithExtendedStats
    */
    WithExtendedStats = undefined;








}


