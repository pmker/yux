/*
 * Copyright 2007-2017 Charles du Jeu - Abstrium SAS <team (at) pyd.io>
 * This file is part of Pydio.
 *
 * Pydio is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Pydio is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Pydio.  If not, see <http://www.gnu.org/licenses/>.
 *
 * The latest code can be found at <https://pydio.com>.
 */

'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _react = require('react');

var _pydio = require('pydio');

var _pydio2 = _interopRequireDefault(_pydio);

var _reactJoyride = require('react-joyride');

var _reactJoyride2 = _interopRequireDefault(_reactJoyride);

var _Pydio$requireLib = _pydio2['default'].requireLib('boot');

var PydioContextConsumer = _Pydio$requireLib.PydioContextConsumer;

var TourGuide = (function (_Component) {
    _inherits(TourGuide, _Component);

    function TourGuide() {
        _classCallCheck(this, TourGuide);

        _Component.apply(this, arguments);
    }

    TourGuide.prototype.render = function render() {
        var _this = this;

        var message = function message(id) {
            return _this.props.getMessage('ajax_gui.tour.locale.' + id);
        };
        var locales = ['back', 'close', 'last', 'next', 'skip'];
        var locale = {};
        locales.forEach(function (k) {
            locale[k] = message(k);
        });
        return React.createElement(_reactJoyride2['default'], _extends({}, this.props, {
            locale: locale,
            allowClicksThruHole: true
        }));
    };

    return TourGuide;
})(_react.Component);

exports['default'] = TourGuide = PydioContextConsumer(TourGuide);
exports['default'] = TourGuide;
module.exports = exports['default'];
