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

import MetaCacheService from '../http/MetaCacheService'
import PydioApi from '../http/PydioApi'
import PathUtils from '../util/PathUtils'
import Pydio from 'pydio'
import AjxpNode from './AjxpNode'
import MetaServiceApi from "../http/gen/api/MetaServiceApi";
import RestGetBulkMetaRequest from "../http/gen/model/RestGetBulkMetaRequest";


/**
 * Implementation of the IAjxpNodeProvider interface based on a remote server access.
 * Default for all repositories.
 */
export default class MetaNodeProvider{

    /**
     * Constructor
     */
    constructor(properties = null){
        this.discrete = false;
        this.properties = new Map();
        if(properties) {
            this.initProvider(properties);
        }
    }
    /**
     * Initialize properties
     * @param properties Object
     */
    initProvider(properties){
        this.properties = new Map();
        for (let p in properties){
            if(properties.hasOwnProperty(p)) {
                this.properties.set(p, properties[p]);
            }
        }
        if(this.properties && this.properties.has('connexion_discrete')){
            this.discrete = true;
            this.properties.delete('connexion_discrete');
        }
        if(this.properties && this.properties.has('cache_service')){
            this.cacheService = this.properties.get('cache_service');
            this.properties.delete('cache_service');
            MetaCacheService.getInstance().registerMetaStream(
                this.cacheService['metaStreamName'],
                this.cacheService['expirationPolicy']
            );
        }
    }

    /**
     * Load a node
     * @param node AjxpNode
     * @param nodeCallback Function On node loaded
     * @param childCallback Function On child added
     * @param recursive
     * @param depth
     * @param optionalParameters
     */
    loadNode (node, nodeCallback=null, childCallback=null, recursive=false, depth=-1, optionalParameters=null){

        const pydio = Pydio.getInstance();
        const api = new MetaServiceApi(PydioApi.getRestClient());
        let request = new RestGetBulkMetaRequest();
        let slug = '';
        if(pydio.user){
            if(this.properties.has('tmp_repository_id')) {
                const repos = pydio.user.getRepositoriesList();
                slug = repos.get(this.properties.get('tmp_repository_id')).getSlug();
            } else {
                slug = pydio.user.getActiveRepositoryObject().getSlug();
            }
        }
        const inputPagination = node.getMetadata().get("paginationData");
        if(inputPagination){
            request.Offset = (inputPagination.get("current") - 1) * inputPagination.get("size");
            request.Limit = inputPagination.get("size");
        } else {
            request.Limit = pydio.getPluginConfigs("access.gateway").get("LIST_NODES_PER_PAGE") || 200;
        }
        request.NodePaths = [slug + node.getPath(), slug + node.getPath() + '/*'];
        if(this.properties.has("versions")){
            request.Versions = true;
            request.NodePaths = [slug + this.properties.get('file')];
        }
        Pydio.startLoading();
        api.getBulkMeta(request).then(res => {
            Pydio.endLoading();
            let origNode;
            let childrenNodes = [];
            res.Nodes.map(n => {
                let newNode;
                try{
                    newNode = MetaNodeProvider.parseTreeNode(n, slug);
                } catch(e){
                    console.error(e);
                    return;
                }
                if(newNode.getLabel() === '.pydio'){
                    return;
                } else if(newNode.getPath() === node.getPath()){
                    origNode = newNode;
                } else {
                    if(childCallback){
                        childCallback(newNode);
                    }
                    childrenNodes.push(newNode);
                }
            });
            if(origNode !== undefined){
                if (res.Pagination) {
                    const paginationData = new Map();
                    paginationData.set("current", res.Pagination.CurrentPage);
                    paginationData.set("total", res.Pagination.TotalPages);
                    paginationData.set("size", res.Pagination.Limit);
                    origNode.getMetadata().set("paginationData", paginationData);
                }
                node.replaceBy(origNode);
            }
            if(this.properties.has("versions")){
                childrenNodes = childrenNodes.map(child => {
                    child._path = child.getMetadata().get('versionId');
                    return child;
                })
            }
            node.setChildren(childrenNodes);
            if(nodeCallback !== null){
                nodeCallback(node);
            }
        }).catch(e => {
            Pydio.endLoading();
            console.log(e);
        });
    }

    /**
     * Load a node
     * @param node {AjxpNode}
     * @param nodeCallback Function On node loaded
     * @param aSync bool
     * @param additionalParameters object
     */
    loadLeafNodeSync (node, nodeCallback, aSync=false, additionalParameters={}){

        const api = new MetaServiceApi(PydioApi.getRestClient());
        let request = new RestGetBulkMetaRequest();
        let slug = '';
        let path = node.getPath();
        const pydio = Pydio.getInstance();
        if(pydio.user){
            if(node.getMetadata().has('repository_id')){
                const repoId = node.getMetadata().get('repository_id');
                const repo = pydio.user.getRepositoriesList().get(repoId);
                if(repo){
                    slug = repo.getSlug();
                }
            } else {
                slug = pydio.user.getActiveRepositoryObject().getSlug();
            }
        }
        if(path && path[0] !== '/') {
            path = '/' + path;
        }
        request.NodePaths = [slug + path];
        api.getBulkMeta(request).then(res => {
            if(res.Nodes && res.Nodes.length){
                nodeCallback(MetaNodeProvider.parseTreeNode(res.Nodes[0], slug));
            }
        });

    }

    refreshNodeAndReplace (node, onComplete){

        const nodeCallback = (newNode) => {
            node.replaceBy(newNode, "override");
            if(onComplete) {
                onComplete(node);
            }
        };
        this.loadLeafNodeSync(node, nodeCallback);

    }

    /**
     * @return AjxpNode | null
     * @param obj
     * @param workspaceSlug string
     * @param defaultSlug string
     */
    static parseTreeNode(obj, workspaceSlug, defaultSlug = '') {

        if (!obj){
            return null;
        }
        if(!obj.MetaStore){
            obj.MetaStore = {};
        }
        const pydio = Pydio.getInstance();

        let nodeName;
        if (obj.MetaStore.name){
            nodeName = JSON.parse(obj.MetaStore.name);
        } else{
            nodeName = PathUtils.getBasename(obj.Path);
        }
        let slug = workspaceSlug;
        if(!workspaceSlug){
            if(obj.MetaStore['repository_id']){
                const wsId = JSON.parse(obj.MetaStore['repository_id']);
                if (pydio.user.getRepositoriesList().has(wsId)){
                    slug = pydio.user.getRepositoriesList().get(wsId).getSlug();
                }
            }
        }
        if(!slug){
            slug = defaultSlug;
        }
        if(slug){
            // Strip workspace slug
            obj.Path = obj.Path.substr(slug.length + 1);
        }

        let node = new AjxpNode('/' + obj.Path, obj.Type === "LEAF", nodeName, '', null);

        let meta = obj.MetaStore;
        for (let k in meta){
            if (meta.hasOwnProperty(k)) {
                let metaValue = JSON.parse(meta[k]);
                node.getMetadata().set(k, metaValue);
                if (typeof metaValue === 'object') {
                    for (let kSub in metaValue) {
                        if (metaValue.hasOwnProperty(kSub)) {
                            node.getMetadata().set(kSub, metaValue[kSub]);
                        }
                    }
                }
            }
        }
        node.getMetadata().set('filename', node.getPath());
        if(node.getPath() === '/recycle_bin'){
            node.getMetadata().set('fonticon', 'delete');
            node.getMetadata().set('mimestring_id', '122');
            node.getMetadata().set('ajxp_mime', 'ajxp_recycle');
            if(pydio) node.setLabel(pydio.MessageHash[122]);
            node.getMetadata().set('mimestring', pydio.MessageHash[122]);
        }
        if(node.isLeaf() && pydio && pydio.Registry){
            const ext = PathUtils.getFileExtension(node.getPath());
            const registered = pydio.Registry.getFilesExtensions();
            if(registered.has(ext)){
                const {messageId, fontIcon} = registered.get(ext);
                node.getMetadata().set('fonticon',fontIcon);
                node.getMetadata().set('mimestring_id',messageId);
                if(pydio.MessageHash[messageId]){
                    node.getMetadata().set('mimestring',pydio.MessageHash[messageId]);
                }
            }
        } else if(!node.isLeaf()) {
            node.getMetadata().set('mimestring',pydio.MessageHash[8]);
        }
        if (obj.Size !== undefined){
            node.getMetadata().set('bytesize', obj.Size);
        }
        if (obj.MTime !== undefined){
            node.getMetadata().set('ajxp_modiftime', obj.MTime);
        }
        if (obj.Etag !== undefined){
            node.getMetadata().set('etag', obj.Etag);
        }
        if (obj.Uuid !== undefined){
            node.getMetadata().set('uuid', obj.Uuid);
        }
        MetaNodeProvider.overlays(node);
        return node;

    }

    /**
     * Update metadata for specific overlays
     * @param node AjxpNode
     */
    static overlays(node){
        let meta = node.getMetadata();
        let overlays = [];

        // SHARES
        if(meta.has('workspaces_shares')){
            const wsRoot = meta.get('ws_root');
            meta.set('pydio_is_shared', "true");
            meta.set('pydio_shares', JSON.stringify(meta.get('workspaces_shares')));
            if(!wsRoot){
                overlays.push('mdi mdi-share-variant');
            } else if(!node.isLeaf()){
                meta.set('fonticon', 'folder-star');
            }
        }

        // WATCHES
        if(meta.has('user_subscriptions')){
            const subs = meta.get('user_subscriptions');
            const read = subs.indexOf('read');
            const changes = subs.indexOf('change');
            let value = '';
            if(read && changes){
                value = 'META_WATCH_BOTH';
            } else if(read){
                value = 'META_WATCH_READ';
            } else if(changes){
                value = 'META_WATCH_CHANGES';
            }
            if(value){
                meta.set('meta_watched', value);
                overlays.push('mdi mdi-rss');
            }
        }

        // BOOKMARKS
        if(meta.has('bookmark')){
            meta.set('ajxp_bookmarked', 'true');
            overlays.push('mdi mdi-bookmark-outline');
        }

        // LOCKS
        if(meta.has('content_lock')){
            const lockUser = meta.get('content_lock');
            overlays.push('mdi mdi-lock-outline');
            meta.set('sl_locked', 'true');
            if(pydio && pydio.user && lockUser === pydio.user.id){
                meta.set('sl_mylock', 'true');
            }
        }

        if(overlays.length) {
            meta.set('overlay_class', overlays.join(','));
        }
        node.setMetadata(meta);
    }
}