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

'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _ApiClient = require('../ApiClient');

var _ApiClient2 = _interopRequireDefault(_ApiClient);

var _ServiceResourcePolicyQuery = require('./ServiceResourcePolicyQuery');

var _ServiceResourcePolicyQuery2 = _interopRequireDefault(_ServiceResourcePolicyQuery);

/**
* The IdmSearchUserMetaRequest model module.
* @module model/IdmSearchUserMetaRequest
* @version 1.0
*/

var IdmSearchUserMetaRequest = (function () {
    /**
    * Constructs a new <code>IdmSearchUserMetaRequest</code>.
    * @alias module:model/IdmSearchUserMetaRequest
    * @class
    */

    function IdmSearchUserMetaRequest() {
        _classCallCheck(this, IdmSearchUserMetaRequest);

        this.MetaUuids = undefined;
        this.NodeUuids = undefined;
        this.Namespace = undefined;
        this.ResourceSubjectOwner = undefined;
        this.ResourceQuery = undefined;
    }

    /**
    * Constructs a <code>IdmSearchUserMetaRequest</code> from a plain JavaScript object, optionally creating a new instance.
    * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
    * @param {Object} data The plain JavaScript object bearing properties of interest.
    * @param {module:model/IdmSearchUserMetaRequest} obj Optional instance to populate.
    * @return {module:model/IdmSearchUserMetaRequest} The populated <code>IdmSearchUserMetaRequest</code> instance.
    */

    IdmSearchUserMetaRequest.constructFromObject = function constructFromObject(data, obj) {
        if (data) {
            obj = obj || new IdmSearchUserMetaRequest();

            if (data.hasOwnProperty('MetaUuids')) {
                obj['MetaUuids'] = _ApiClient2['default'].convertToType(data['MetaUuids'], ['String']);
            }
            if (data.hasOwnProperty('NodeUuids')) {
                obj['NodeUuids'] = _ApiClient2['default'].convertToType(data['NodeUuids'], ['String']);
            }
            if (data.hasOwnProperty('Namespace')) {
                obj['Namespace'] = _ApiClient2['default'].convertToType(data['Namespace'], 'String');
            }
            if (data.hasOwnProperty('ResourceSubjectOwner')) {
                obj['ResourceSubjectOwner'] = _ApiClient2['default'].convertToType(data['ResourceSubjectOwner'], 'String');
            }
            if (data.hasOwnProperty('ResourceQuery')) {
                obj['ResourceQuery'] = _ServiceResourcePolicyQuery2['default'].constructFromObject(data['ResourceQuery']);
            }
        }
        return obj;
    };

    /**
    * @member {Array.<String>} MetaUuids
    */
    return IdmSearchUserMetaRequest;
})();

exports['default'] = IdmSearchUserMetaRequest;
module.exports = exports['default'];

/**
* @member {Array.<String>} NodeUuids
*/

/**
* @member {String} Namespace
*/

/**
* @member {String} ResourceSubjectOwner
*/

/**
* @member {module:model/ServiceResourcePolicyQuery} ResourceQuery
*/
