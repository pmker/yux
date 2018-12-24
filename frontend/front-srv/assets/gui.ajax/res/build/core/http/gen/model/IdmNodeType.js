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

"use strict";

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _ApiClient = require('../ApiClient');

var _ApiClient2 = _interopRequireDefault(_ApiClient);

/**
* Enum class IdmNodeType.
* @enum {}
* @readonly
*/

var IdmNodeType = (function () {
    function IdmNodeType() {
        _classCallCheck(this, IdmNodeType);

        this.UNKNOWN = "UNKNOWN";
        this.USER = "USER";
        this.GROUP = "GROUP";
    }

    /**
    * Returns a <code>IdmNodeType</code> enum value from a Javascript object name.
    * @param {Object} data The plain JavaScript object containing the name of the enum value.
    * @return {module:model/IdmNodeType} The enum <code>IdmNodeType</code> value.
    */

    IdmNodeType.constructFromObject = function constructFromObject(object) {
        return object;
    };

    return IdmNodeType;
})();

exports["default"] = IdmNodeType;
module.exports = exports["default"];

/**
 * value: "UNKNOWN"
 * @const
 */

/**
 * value: "USER"
 * @const
 */

/**
 * value: "GROUP"
 * @const
 */
