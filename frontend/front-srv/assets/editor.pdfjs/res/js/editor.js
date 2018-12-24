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


import PydioApi from 'pydio/http/api'
import DOMUtils from 'pydio/util/dom'
import React, {Component} from 'react'
import { connect } from 'react-redux'

const { EditorActions } = PydioHOCs;

class Viewer extends Component {
    componentDidMount() {
        this.loadNode(this.props)
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.node !== this.props.node) {
            this.loadNode(nextProps)
        }
    }

    loadNode(props) {
        const {pydio, node, loadThumbnail} = props;

        let url;
        let base = DOMUtils.getUrlFromBase();

        if (base) {
            url = base;
            if (!url.startsWith('http') && !url.startsWith('https')) {
                if (!window.location.origin) {
                    // Fix for IE when Pydio is inside an iFrame
                    window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: '');
                }
                url = document.location.origin + url;
            }
        } else {
            // Get the URL for current workspace path.
            url = document.location.href.split('#').shift().split('?').shift();
            if(url[(url.length-1)] === '/'){
                url = url.substr(0, url.length-1);
            }else if(url.lastIndexOf('/') > -1){
                url = url.substr(0, url.lastIndexOf('/'));
            }
        }
        let viewerFile = 'viewer.html';
        if(loadThumbnail){
            viewerFile = 'viewer-thumb.html';
        } else if(pydio.Parameters.has('MINISITE')){
            viewerFile = 'viewer-minisite.html';
        }
        PydioApi.getClient().buildPresignedGetUrl(node).then(pdfurl => {
            this.setState({
                url: 'plug/editor.pdfjs/pdfjs/web/' + viewerFile + '?file=' + encodeURIComponent(pdfurl)
            })
        })

    }

    render() {
        const {url} = this.state || {}

        if (!url) return null

        return (
            <iframe {...this.props} style={{flex: 1, width: "100%", height: "100%", border: 0}} src={url} />
        );
    }
}

const editors = pydio.Registry.getActiveExtensionByType("editor")
const conf = editors.filter(({id}) => id === 'editor.pdfjs')[0]

const getSelectionFilter = (node) => conf.mimes.indexOf(node.getAjxpMime()) > -1

const getSelection = (node) => new Promise((resolve, reject) => {
    let selection = [];

    node.getParent().getChildren().forEach((child) => selection.push(child));
    selection = selection.filter(getSelectionFilter)

    resolve({
        selection,
        currentIndex: selection.reduce((currentIndex, current, index) => current === node && index || currentIndex, 0)
    })
})

const {withSelection} = PydioHOCs;

export const Panel = Viewer

@withSelection(getSelection)
@connect(null, EditorActions)
export class Editor extends React.Component {
    componentWillReceiveProps(nextProps) {
        const {editorModify} = this.props

        if (nextProps.isActive) {
            editorModify({fixedToolbar: true})
        }
    }

    render() {
        return <Viewer {...this.props} />
    }
}
