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

/**
* The RestFrontSessionRequest model module.
* @module model/RestFrontSessionRequest
* @version 1.0
*/

var RestFrontSessionRequest = (function () {
    /**
    * Constructs a new <code>RestFrontSessionRequest</code>.
    * @alias module:model/RestFrontSessionRequest
    * @class
    */

    function RestFrontSessionRequest() {
        _classCallCheck(this, RestFrontSessionRequest);

        this.ClientTime = undefined;
        this.AuthInfo = undefined;
        this.Logout = undefined;
    }

    /**
    * Constructs a <code>RestFrontSessionRequest</code> from a plain JavaScript object, optionally creating a new instance.
    * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
    * @param {Object} data The plain JavaScript object bearing properties of interest.
    * @param {module:model/RestFrontSessionRequest} obj Optional instance to populate.
    * @return {module:model/RestFrontSessionRequest} The populated <code>RestFrontSessionRequest</code> instance.
    */

    RestFrontSessionRequest.constructFromObject = function constructFromObject(data, obj) {
        if (data) {
            obj = obj || new RestFrontSessionRequest();

            if (data.hasOwnProperty('ClientTime')) {
                obj['ClientTime'] = _ApiClient2['default'].convertToType(data['ClientTime'], 'Number');
            }
            if (data.hasOwnProperty('AuthInfo')) {
                obj['AuthInfo'] = _ApiClient2['default'].convertToType(data['AuthInfo'], { 'String': 'String' });
            }
            if (data.hasOwnProperty('Logout')) {
                obj['Logout'] = _ApiClient2['default'].convertToType(data['Logout'], 'Boolean');
            }
        }
        return obj;
    };

    /**
    * @member {Number} ClientTime
    */
    return RestFrontSessionRequest;
})();

exports['default'] = RestFrontSessionRequest;
module.exports = exports['default'];

/**
* @member {Object.<String, String>} AuthInfo
*/

/**
* @member {Boolean} Logout
*/
