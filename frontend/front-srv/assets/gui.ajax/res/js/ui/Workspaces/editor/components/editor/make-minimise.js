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

import _ from 'lodash';
import { Motion, spring, presets } from 'react-motion';

const ANIMATION={stiffness: 300, damping: 40}
const ORIGIN=0
const TARGET=100

const { makeMotion } = Pydio.requireLib('hoc');

const makeMinimise = (Target) => {
    return (
        @makeMotion({scale: 1}, {scale: 0.5}, {
            check: (props) => {
                console.log("checking ", props)
                return props.minimise && (!props.minimised)
            }
        })
        class extends React.Component {
            constructor(props) {
                super(props);
                this.state = {};
            }

            componentWillReceiveProps(nextProps) {
                this.setState({
                    minimised: nextProps.minimised
                })
            }

            render() {
                return (
                    <Target {...this.props} />
                );
            }
        }
    )
};

export default makeMinimise;
