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
import {FlatButton, Popover} from 'material-ui'
import CompositeCard from '../composite/CompositeCard'
import CellCard from '../cells/CellCard'

class InfoPanel extends React.Component {

    constructor(props){
        super(props);
        this.state = {popoverOpen: false}
    }

    openPopover(event){
        this.setState({popoverOpen:true, popoverAnchor:event.target});
    }

    render(){

        const {pydio, node} = this.props;

        if(node.isRoot()){
            return (
                <PydioWorkspaces.InfoPanelCard>
                    <div style={{padding:0}}>
                        <CellCard cellId={pydio.user.activeRepository} pydio={pydio} mode="infoPanel"/>
                    </div>
                </PydioWorkspaces.InfoPanelCard>
            );
        } else {
            return (
                <PydioWorkspaces.InfoPanelCard>
                    <div style={{padding:0}}>
                        <CompositeCard node={node} pydio={pydio} mode="infoPanel"/>
                    </div>
                </PydioWorkspaces.InfoPanelCard>
            );

        }



    }
}

export {InfoPanel as default}