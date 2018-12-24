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


import ListEntryNodeListenerMixin from './ListEntryNodeListenerMixin'
import {DragDropListEntry} from './ListEntry'
import InlineEditor from './InlineEditor'
import PathUtils from 'pydio/util/path'
const {moment} = require('pydio').requireLib('boot');


/**
 * Specific list entry rendered as a table row. Not a real table, CSS used.
 */
export default React.createClass({

    mixins:[ListEntryNodeListenerMixin],

    propTypes:{
        node:React.PropTypes.instanceOf(AjxpNode),
        tableKeys:React.PropTypes.object.isRequired,
        renderActions:React.PropTypes.func
        // See also ListEntry nodes
    },

    render: function(){

        let actions = this.props.actions;
        if(this.props.renderActions) {
            actions = this.props.renderActions(this.props.node);
        }

        let cells = [];
        let firstKey = true;
        const meta = this.props.node.getMetadata();
        for(let key in this.props.tableKeys){
            if(!this.props.tableKeys.hasOwnProperty(key)) {
                continue;
            }

            let data = this.props.tableKeys[key];
            let style = data['width']?{width:data['width']}:null;
            let value, rawValue;
            if(data.renderCell) {
                data['name'] = key;
                value = data.renderCell(this.props.node, data);
            }else if(key === 'ajxp_modiftime') {
                let mDate = moment(parseFloat(meta.get('ajxp_modiftime')) * 1000);
                let dateString = mDate.calendar();
                if (dateString.indexOf('/') > -1) {
                    dateString = mDate.fromNow();
                }
                value = dateString;
            } else if(key === 'bytesize'){
                value = PathUtils.roundFileSize(parseInt(meta.get(key)));
            }else{
                value = meta.get(key);
            }
            rawValue = meta.get(key);
            let inlineEditor;
            if(this.state && this.state.inlineEdition && firstKey){
                inlineEditor = (<InlineEditor
                    node={this.props.node}
                    onClose={()=>{this.setState({inlineEdition:false})}}
                    callback={this.state.inlineEditionCallback}
                />);
                let style = this.props.style || {};
                style.position = 'relative';
                this.props.style = style;
            }
            cells.push(<span key={key} className={'cell cell-' + key} title={rawValue} style={style} data-label={data['label']}>{inlineEditor}{value}</span>);
            firstKey = false;
        }

        return (
            <DragDropListEntry
                {...this.props}
                iconCell={null}
                firstLine={cells}
                actions={actions}
            />
        );


    }

});

