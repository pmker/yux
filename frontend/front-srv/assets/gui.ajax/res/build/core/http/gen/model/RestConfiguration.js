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
* The RestConfiguration model module.
* @module model/RestConfiguration
* @version 1.0
*/

var RestConfiguration = (function () {
    /**
    * Constructs a new <code>RestConfiguration</code>.
    * @alias module:model/RestConfiguration
    * @class
    */

    function RestConfiguration() {
        _classCallCheck(this, RestConfiguration);

        this.FullPath = undefined;
        this.Data = undefined;
    }

    /**
    * Constructs a <code>RestConfiguration</code> from a plain JavaScript object, optionally creating a new instance.
    * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
    * @param {Object} data The plain JavaScript object bearing properties of interest.
    * @param {module:model/RestConfiguration} obj Optional instance to populate.
    * @return {module:model/RestConfiguration} The populated <code>RestConfiguration</code> instance.
    */

    RestConfiguration.constructFromObject = function constructFromObject(data, obj) {
        if (data) {
            obj = obj || new RestConfiguration();

            if (data.hasOwnProperty('FullPath')) {
                obj['FullPath'] = _ApiClient2['default'].convertToType(data['FullPath'], 'String');
            }
            if (data.hasOwnProperty('Data')) {
                obj['Data'] = _ApiClient2['default'].convertToType(data['Data'], 'String');
            }
        }
        return obj;
    };

    /**
    * @member {String} FullPath
    */
    return RestConfiguration;
})();

exports['default'] = RestConfiguration;
module.exports = exports['default'];

/**
* @member {String} Data
*/
