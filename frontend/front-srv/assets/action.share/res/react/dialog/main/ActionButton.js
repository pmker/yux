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

const {Component, PropTypes} = require('react')
const {IconButton} = require('material-ui')
const {muiThemeable} = require('material-ui/styles');
import ShareContextConsumer from '../ShareContextConsumer'

class ActionButton extends Component{

    render(){

        const {palette} = this.props.muiTheme;

        const style = {
            root: {
                borderRadius: '50%',
                border: '1px solid ' + palette.primary1Color,
                backgroundColor: 'transparent',
                width: 36, height: 36,
                padding: 8,
                margin: '0 6px',
                zIndex: 0
            },
            icon: {
                color: palette.primary1Color,
                fontSize: 20,
                lineHeight: '20px'
            }
        };

        return (
            <IconButton
                style={style.root}
                iconStyle={style.icon}
                onTouchTap={this.props.callback || this.props.onTouchTap}
                iconClassName={"mdi mdi-" + this.props.mdiIcon}
                tooltip={this.props.getMessage(this.props.messageId, this.props.messageCoreNamespace?'': undefined)}
            />
        );

    }

}

ActionButton.propTypes = {
    callback: PropTypes.func,
    onTouchTap: PropTypes.func,
    mdiIcon: PropTypes.string,
    messageId: PropTypes.string
};

ActionButton = ShareContextConsumer(ActionButton);
ActionButton = muiThemeable()(ActionButton);

export default ActionButton