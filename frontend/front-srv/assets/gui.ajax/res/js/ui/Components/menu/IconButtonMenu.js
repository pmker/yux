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


const React = require('react')
const {IconButton, Popover} = require('material-ui')
import Utils from './Utils'

class IconButtonMenu extends React.Component{

    constructor(props, context){
        super(props, context);
        this.state = {showMenu: false};
    }

    showMenu(event){
        this.setState({
            showMenu: true,
            anchor: event.currentTarget
        })
    }

    closeMenu(event, index, menuItem){
        this.setState({showMenu: false});
    }

    render(){
        const {menuItems, className, buttonTitle, buttonClassName, containerStyle, buttonStyle, popoverDirection, popoverTargetPosition, menuProps} = this.props;
        if(!menuItems.length) {
            return null;
        }
        return (
            <span className={"toolbars-button-menu " + (className ? className  : '')} style={containerStyle}>
                <IconButton
                    ref="menuButton"
                    tooltip={buttonTitle}
                    iconClassName={buttonClassName}
                    onTouchTap={this.showMenu.bind(this)}
                    iconStyle={buttonStyle}
                />
                <Popover
                    open={this.state.showMenu}
                    anchorEl={this.state.anchor}
                    anchorOrigin={{horizontal: popoverDirection || 'right', vertical: popoverTargetPosition || 'bottom'}}
                    targetOrigin={{horizontal: popoverDirection || 'right', vertical: 'top'}}
                    onRequestClose={() => {this.setState({showMenu: false})}}
                    useLayerForClickAway={false}
                >
                    {Utils.itemsToMenu(menuItems, this.closeMenu.bind(this), false, menuProps || undefined)}
                </Popover>
            </span>
        );
    }
}

IconButtonMenu.propTypes =  {
    buttonTitle: React.PropTypes.string.isRequired,
    buttonClassName: React.PropTypes.string.isRequired,
    className: React.PropTypes.string,
    popoverDirection: React.PropTypes.oneOf(['right', 'left']),
    popoverPosition: React.PropTypes.oneOf(['top', 'bottom']),
    menuProps:React.PropTypes.object,
    menuItems: React.PropTypes.array.isRequired
}

import MenuItemsConsumer from './MenuItemsConsumer'

export default MenuItemsConsumer(IconButtonMenu)