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
import React from 'react'
import {Paper, IconButton, FontIcon, IconMenu, FloatingActionButton} from 'material-ui'
import {muiThemeable} from 'material-ui/styles';

const globalStyles = {
    globalLeftMargin : 64,
};

class GenericLine extends React.Component{
    render(){
        const {iconClassName, legend, data, dataStyle, legendStyle, iconStyle} = this.props;
        const style = {
            icon: {
                margin:'16px 20px 0',
                ...iconStyle,
            },
            legend: {
                fontSize: 12,
                color: '#aaaaaa',
                fontWeight: 500,
                textTransform: 'lowercase',
                ...legendStyle,
            },
            data: {
                fontSize: 15,
                paddingRight: 6,
                overflow:'hidden',
                textOverflow:'ellipsis',
                ...dataStyle,
            }
        };
        return (
            <div style={{display:'flex', marginBottom: 8, overflow:'hidden', ...this.props.style}}>
                <div style={{width: globalStyles.globalLeftMargin}}>
                    <FontIcon color={'#aaaaaa'} className={iconClassName} style={style.icon}/>
                </div>
                <div style={{flex: 1}}>
                    <div style={style.legend}>{legend}</div>
                    <div style={style.data}>{data}</div>
                </div>
            </div>
        );
    }
}

class GenericCard extends React.Component{

    render(){

        const {title, onDismissAction, onEditAction, onDeleteAction, moreMenuItems, children, muiTheme, style, headerSmall} = this.props;

        const {primary1Color} = muiTheme.palette;

        let styles = {
            headerHeight: 100,
            buttonBarHeight: 60,
            fabTop: 80,
            button: {
                style:{},
                iconStyle:{color:'white'},
            }
        };
        if (headerSmall) {
            styles = {
                headerHeight: 80,
                buttonBarHeight: 40,
                fabTop: 60,
                button: {
                    style:{width:38, height: 38, padding: 9},
                    iconStyle:{color:'white', fontSize: 18}
                }
            }
        }

        return (
            <Paper zDepth={0} style={{width: '100%', position:'relative', ...style}}>
                {onEditAction &&
                    <FloatingActionButton onTouchTap={onEditAction} mini={true} style={{position:'absolute', top:styles.fabTop, left: 10}}>
                        <FontIcon className={"mdi mdi-pencil"} />
                    </FloatingActionButton>
                }
                <Paper zDepth={0} style={{backgroundColor:primary1Color, color: 'white', height: styles.headerHeight, borderRadius: '2px 2px 0 0'}}>
                    <div style={{display:'flex', height: styles.buttonBarHeight}}>
                        <span style={{flex: 1}}/>
                        {onDeleteAction &&
                            <IconButton style={styles.button.style} iconStyle={styles.button.iconStyle} iconClassName={"mdi mdi-delete"} onTouchTap={onDeleteAction}/>
                        }
                        {moreMenuItems && moreMenuItems.length > 0 &&
                            <IconMenu
                                anchorOrigin={{vertical:'top', horizontal:headerSmall?'right':'left'}}
                                targetOrigin={{vertical:'top', horizontal:headerSmall?'right':'left'}}
                                iconButtonElement={<IconButton style={styles.button.style} iconStyle={styles.button.iconStyle} iconClassName={"mdi mdi-dots-vertical"}/>}
                            >{moreMenuItems}</IconMenu>
                        }
                        {onDismissAction &&
                            <IconButton  style={styles.button.style} iconStyle={styles.button.iconStyle} iconClassName={"mdi mdi-close"} onTouchTap={onDismissAction}/>
                        }
                    </div>
                    <div style={{paddingLeft: onEditAction?globalStyles.globalLeftMargin:20, fontSize: 20}}>
                        {title}
                    </div>
                </Paper>
                <div style={{paddingTop: 12, paddingBottom: 8}}>
                    {children}
                </div>
            </Paper>
        );
    }

}

GenericCard = muiThemeable()(GenericCard);
export {GenericCard, GenericLine}