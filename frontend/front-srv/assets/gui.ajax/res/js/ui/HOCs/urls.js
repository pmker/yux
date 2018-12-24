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

import React, {Component} from 'react';

import {toTitleCase} from './utils'

export const URLProvider = (urls = []) => {
    return class extends React.Component {
        static get displayName() {
            return `URLProvider`
        }

        static get propTypes() {
            return urls.reduce((current, type) => ({
                    ...current,
                    [`on${toTitleCase(type)}`]: React.PropTypes.func.isRequired
                }), {
                    urlType: React.PropTypes.oneOf(urls).isRequired,
                })
        }

        constructor(props) {
            super(props);
            const u = this.getUrl(props);
            if (u.then) {
                this.state = {url: ''};
                u.then(res => {
                    this.setState({url: res});
                })
            } else {
                this.setState({url: u});
            }
        }

        componentWillReceiveProps(nextProps) {
            const u = this.getUrl(nextProps);
            if (u.then) {
                u.then(res => {
                    this.setState({url: res});
                })
            } else {
                this.setState({url: u});
            }
        }

        getUrl(props) {
            const fn = props[`on${toTitleCase(props.urlType)}`];
            return fn()
        }

        render() {
            return this.props.children(this.state.url)
        }
    }
};
