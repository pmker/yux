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
* The RestResetPasswordRequest model module.
* @module model/RestResetPasswordRequest
* @version 1.0
*/

var RestResetPasswordRequest = (function () {
    /**
    * Constructs a new <code>RestResetPasswordRequest</code>.
    * @alias module:model/RestResetPasswordRequest
    * @class
    */

    function RestResetPasswordRequest() {
        _classCallCheck(this, RestResetPasswordRequest);

        this.ResetPasswordToken = undefined;
        this.UserLogin = undefined;
        this.NewPassword = undefined;
    }

    /**
    * Constructs a <code>RestResetPasswordRequest</code> from a plain JavaScript object, optionally creating a new instance.
    * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
    * @param {Object} data The plain JavaScript object bearing properties of interest.
    * @param {module:model/RestResetPasswordRequest} obj Optional instance to populate.
    * @return {module:model/RestResetPasswordRequest} The populated <code>RestResetPasswordRequest</code> instance.
    */

    RestResetPasswordRequest.constructFromObject = function constructFromObject(data, obj) {
        if (data) {
            obj = obj || new RestResetPasswordRequest();

            if (data.hasOwnProperty('ResetPasswordToken')) {
                obj['ResetPasswordToken'] = _ApiClient2['default'].convertToType(data['ResetPasswordToken'], 'String');
            }
            if (data.hasOwnProperty('UserLogin')) {
                obj['UserLogin'] = _ApiClient2['default'].convertToType(data['UserLogin'], 'String');
            }
            if (data.hasOwnProperty('NewPassword')) {
                obj['NewPassword'] = _ApiClient2['default'].convertToType(data['NewPassword'], 'String');
            }
        }
        return obj;
    };

    /**
    * @member {String} ResetPasswordToken
    */
    return RestResetPasswordRequest;
})();

exports['default'] = RestResetPasswordRequest;
module.exports = exports['default'];

/**
* @member {String} UserLogin
*/

/**
* @member {String} NewPassword
*/
