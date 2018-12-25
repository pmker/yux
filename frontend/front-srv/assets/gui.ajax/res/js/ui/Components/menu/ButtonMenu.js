/*
 * Copyright 2007-2018 Charles du Jeu - Abstrium SAS <team (at) pyd.io>
 * This file is part of Pydio Cells.
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
import Utils from './Utils'
import MenuItemsConsumer from './MenuItemsConsumer'
import React from "react";
import ReactDOM from "react-dom";
import {Popover, RaisedButton, FlatButton} from "material-ui";

const ButtonMenu = React.createClass({

    propTypes:{
        buttonTitle : React.PropTypes.oneOfType([React.PropTypes.string,React.PropTypes.object]).isRequired,
        menuItems   : React.PropTypes.array.isRequired,
        className   : React.PropTypes.string,
        raised      : React.PropTypes.bool,
        direction   : React.PropTypes.oneOf(['left', 'right'])
    },

    componentDidMount(){
        if(this.props.openOnEvent){
            this.props.pydio.observe(this.props.openOnEvent, () => { this.showMenu();});
        }
    },

    getInitialState(){
        return {showMenu: false};
    },


    showMenu(event){
        let anchor;
        if(event){
            anchor = event.currentTarget;
        }else{
            anchor = this._buttonDOM;
        }
        this.setState({
            showMenu: true,
            anchor: anchor
        })
    },

    menuClicked(event, index, object){
        this.setState({showMenu: false});
    },

    render(){
        const {showMenu, anchor} = this.state;
        let label = <span style={{whiteSpace:'nowrap'}}>{this.props.buttonTitle} <span className="mdi mdi-menu-down"/></span>
        let button;
        const props = {
            primary: this.props.primary,
            secondary: this.props.secondary,
            disabled: this.props.disabeld,
            label: label,
            onTouchTap: this.showMenu,
            labelStyle:{...this.props.buttonLabelStyle,paddingRight: 10},
            style:{...this.props.buttonStyle, backgroundColor:(showMenu?'rgba(153,153,153,.2)':'')},
            onClick:(e=>e.stopPropagation())
        };
        const {menuItems} = this.props;
        if(menuItems.length){
            if(this.props.raised){
                button = <RaisedButton {...props} ref={(b) => {this._buttonDOM = ReactDOM.findDOMNode(b);}}/>;
            }else{
                button = <FlatButton {...props} ref={(b) => {this._buttonDOM = ReactDOM.findDOMNode(b);}}/>;
            }
        }
        return (
            <span id={this.props.id} className={this.props.className}>
                {button}
                <Popover
                    className="menuPopover"
                    open={showMenu}
                    anchorEl={anchor}
                    anchorOrigin={{horizontal: this.props.direction || 'left', vertical: 'bottom'}}
                    targetOrigin={{horizontal: this.props.direction || 'left', vertical: 'top'}}
                    onRequestClose={() => {this.setState({showMenu: false})}}
                    style={{marginTop: 1}}
                    useLayerForClickAway={false}
                >
                    {Utils.itemsToMenu(menuItems, this.menuClicked)}
                </Popover>
            </span>
        );
    }

});


export default MenuItemsConsumer(ButtonMenu)
