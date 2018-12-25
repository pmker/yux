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



import Pydio from 'pydio'
import React from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import CodeMirrorLoader from './CodeMirrorLoader';

const {EditorActions} = Pydio.requireLib('hoc');

function mapStateToProps (state, props) {
    const {tabs} = state

    const tab = tabs.filter(({editorData, node}) => (!editorData || editorData.id === props.editorData.id) && node.getPath() === props.node.getPath())[0] || {}

    return {
        id: tab.id,
        tab,
        ...props
    }
}

@connect(mapStateToProps, EditorActions)
export default class Editor extends React.Component {

    constructor(props) {
        super(props)

        const {node, tab = {}, tabCreate} = this.props
        const {id} = tab

        if (!id) tabCreate({id: node.getLabel(), node})
    }

    componentDidMount() {
        const {pydio, node, tab, tabModify} = this.props;
        const {id, codemirror} = tab;

        pydio.ApiClient.getPlainContent(node, (content) => {
            tabModify({id: id || node.getLabel(), editable: true, editortools: true, searchable: true, lineNumbers: true, content: content});
        });
    }

    componentWillReceiveProps(nextProps) {
        const {editorModify} = this.props

        if (editorModify && nextProps.isActive) {
            editorModify({fixedToolbar: true})
        }
    }

    render() {
        const {node, tab, error, tabModify} = this.props

        if (!tab) return null

        const {id, content, lineWrapping, lineNumbers} = tab

        return (
            <CodeMirrorLoader
                {...this.props}
                url={node.getPath()}
                content={content}
                options={{lineNumbers: lineNumbers, lineWrapping: lineWrapping}}
                error={error}

                onLoad={(codemirror) => tabModify({id, codemirror})}
                onChange={content => tabModify({id, content})}
                onCursorChange={cursor => tabModify({id, cursor})}
            />
        )
    }
}
