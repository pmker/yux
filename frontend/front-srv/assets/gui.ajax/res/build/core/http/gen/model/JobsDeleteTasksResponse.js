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
* The JobsDeleteTasksResponse model module.
* @module model/JobsDeleteTasksResponse
* @version 1.0
*/

var JobsDeleteTasksResponse = (function () {
    /**
    * Constructs a new <code>JobsDeleteTasksResponse</code>.
    * @alias module:model/JobsDeleteTasksResponse
    * @class
    */

    function JobsDeleteTasksResponse() {
        _classCallCheck(this, JobsDeleteTasksResponse);

        this.Deleted = undefined;
    }

    /**
    * Constructs a <code>JobsDeleteTasksResponse</code> from a plain JavaScript object, optionally creating a new instance.
    * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
    * @param {Object} data The plain JavaScript object bearing properties of interest.
    * @param {module:model/JobsDeleteTasksResponse} obj Optional instance to populate.
    * @return {module:model/JobsDeleteTasksResponse} The populated <code>JobsDeleteTasksResponse</code> instance.
    */

    JobsDeleteTasksResponse.constructFromObject = function constructFromObject(data, obj) {
        if (data) {
            obj = obj || new JobsDeleteTasksResponse();

            if (data.hasOwnProperty('Deleted')) {
                obj['Deleted'] = _ApiClient2['default'].convertToType(data['Deleted'], ['String']);
            }
        }
        return obj;
    };

    /**
    * @member {Array.<String>} Deleted
    */
    return JobsDeleteTasksResponse;
})();

exports['default'] = JobsDeleteTasksResponse;
module.exports = exports['default'];