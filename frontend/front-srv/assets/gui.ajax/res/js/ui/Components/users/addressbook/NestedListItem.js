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


import {Component, PropTypes} from 'react'
import {ListItem, FontIcon} from 'material-ui'

/**
 * Left panel of the address book
 * Display treeview hierarchy of users, teams, groups.
 */
class NestedListItem extends Component{

    /**
     * Triggers this.props.onTouchTap
     */
    onTouchTap(){
        this.props.onTouchTap(this.props.entry);
    }

    /**
     * Recursively build other NestedListItem
     * @param data
     */
    buildNestedItems(data){
        return data.map(function(entry){
            return (
                <NestedListItem
                    nestedLevel={this.props.nestedLevel+1}
                    entry={entry}
                    onTouchTap={this.props.onTouchTap}
                    selected={this.props.selected}
                    showIcons={true}
                />);
        }.bind(this));
    }

    render(){
        const {showIcons, entry, selected} = this.props;
        const {id, label, icon} = entry;
        const children = entry.collections || [];
        const nested = this.buildNestedItems(children);
        let fontIcon;
        if(icon && showIcons){
            fontIcon = <FontIcon className={icon}/>;
        }
        return (
            <ListItem
                nestedLevel={this.props.nestedLevel}
                key={id}
                primaryText={label}
                onTouchTap={this.onTouchTap.bind(this)}
                nestedItems={nested}
                initiallyOpen={true}
                leftIcon={fontIcon}
                innerDivStyle={{fontWeight:selected === entry.id ? 500 : 400}}
                style={selected===entry.id ?{backgroundColor:"#efefef"}:{}}
            />
        );
    }

}

NestedListItem.propTypes = {
    /**
     * Keeps track of the current depth level
     */
    nestedLevel:PropTypes.number,
    /**
     * Currently selected node id
     */
    selected:PropTypes.string,
    /**
     * Callback triggered when an entry is selected
     */
    onTouchTap:PropTypes.func
}

export {NestedListItem as default}