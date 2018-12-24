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
import InfoPanelCard from './InfoPanelCard'
import FilePreview from '../views/FilePreview'

class GenericInfoCard extends React.Component {

    constructor(props) {
        super(props)
        this.state = this.build(props);

    }

    componentWillReceiveProps(nextProps) {
        this.setState(this.build(nextProps));
    }

    build(props) {
        let isMultiple, isLeaf, isDir;

        // Determine if we have a multiple selection or a single
        const {node, nodes} = props

        if (nodes) {
            isMultiple = true
        } else if (node) {
            isLeaf = node.isLeaf()
            isDir = !isLeaf;
        } else {
            return {ready: false};
        }
        return {
            isMultiple,
            isLeaf,
            isDir,
            ready: true
        };
    }

    render() {

        if (!this.state.ready) {
            return null
        }

        if (this.state.isMultiple) {
            let nodes = this.props.nodes;
            let more;
            if(nodes.length > 10){
                const moreNumber = nodes.length - 10;
                nodes = nodes.slice(0, 10);
                more = <div>... and {moreNumber} more.</div>
            }
            return (
                <InfoPanelCard {...this.props} primaryToolbars={["info_panel", "info_panel_share"]}>
                    <div style={{padding:'0'}}>
                        {nodes.map(function(node){
                            return (
                                <div style={{display:'flex', alignItems:'center', borderBottom:'1px solid #eeeeee'}}>
                                    <FilePreview
                                        key={node.getPath()}
                                        style={{height:50, width:50, fontSize: 25, flexShrink: 0}}
                                        node={node}
                                        loadThumbnail={true}
                                        richPreview={false}
                                    />
                                    <div style={{flex:1, fontSize:14, marginLeft:6, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{node.getLabel()}</div>
                                </div>
                            );
                        })}
                        {more}
                    </div>
                </InfoPanelCard>
            );
        } else {
            const processing = !!this.props.node.getMetadata().get('Processing');
            return (
                <InfoPanelCard {...this.props} primaryToolbars={["info_panel", "info_panel_share"]}>
                    <FilePreview
                        key={this.props.node.getPath()}
                        style={{backgroundColor:'white', height: 200, padding: 0}}
                        node={this.props.node}
                        loadThumbnail={this.state.isLeaf && !processing}
                        richPreview={this.state.isLeaf}
                        processing={processing}
                    />
                </InfoPanelCard>
            );
        }

        return null
    }
}

export {GenericInfoCard as default}
