/*
 * Copyright 2007-2018 Charles du Jeu - Abstrium SAS <team (at) pyd.io>
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
import PydioApi from 'pydio/http/api'
import PathUtils from 'pydio/util/path'
import FolderItem from './FolderItem'
import {TreeServiceApi, RestGetBulkMetaRequest, TreeNode, TreeNodeType} from 'pydio/http/rest-api'

class Session extends FolderItem {

    constructor(repositoryId, targetNode) {
        super('/', targetNode);
        this._repositoryId = repositoryId;
        this._status = 'analyse';
        delete this.children.pg[this.getId()];
    }

    getFullPath(){
        const repoList = Pydio.getInstance().user.getRepositoriesList();
        if(!repoList.has(this._repositoryId)){
            throw new Error("Repository disconnected?");
        }
        const slug = repoList.get(this._repositoryId).getSlug();
        let fullPath = this._targetNode.getPath();
        fullPath = LangUtils.trimRight(fullPath, '/');
        if (fullPath.normalize) {
            fullPath = fullPath.normalize('NFC');
        }
        fullPath = slug + fullPath;
        return fullPath;
    }

    treeViewFromMaterialPath(merged){
        const tree = [];
        Object.keys(merged).forEach((path)  => {

            const pathParts = path.split('/');
            pathParts.shift(); // Remove first blank element from the parts array.
            let currentLevel = tree; // initialize currentLevel to root
            pathParts.forEach((part) => {
                // check to see if the path already exists.
                const existingPath = currentLevel.find((data)=>{return data.name === part});
                if (existingPath) {
                    // The path to this item was already in the tree, so don't add it again.
                    // Set the current level to this path's children
                    currentLevel = existingPath.children;
                } else {
                    const newPart = {
                        name: part,
                        item: merged[path],
                        path: path,
                        children: [],
                    };
                    currentLevel.push(newPart);
                    currentLevel = newPart.children;
                }
            });
        });
        return tree
    }

    /**
     * @param api {TreeServiceApi}
     * @param nodePaths []
     * @param sliceSize int
     * @return {Promise<{Nodes: Array}>}
     */
    bulkStatSliced(api, nodePaths, sliceSize){
        let p = Promise.resolve({Nodes:[]});
        let slice = nodePaths.slice(0, sliceSize);
        while(slice.length){
            nodePaths = nodePaths.slice(sliceSize);
            const request = new RestGetBulkMetaRequest();
            request.NodePaths = slice;
            p = p.then(r => {
                return api.bulkStatNodes(request).then(response => {
                    r.Nodes = r.Nodes.concat(response.Nodes || []);
                    return r;
                })
            });
            slice = nodePaths.slice(0, sliceSize);
        }
        return p;
    }

    prepare(overwriteStatus){

        // No need to check stats - we'll just override existing files
        if (overwriteStatus === 'overwrite') {
            this.setStatus('ready');
            return Promise.resolve()
        }

        this.setStatus('analyse');
        const api = new TreeServiceApi(PydioApi.getRestClient());
        const request = new RestGetBulkMetaRequest();
        request.NodePaths = [];
        let walkType = 'both';
        if(overwriteStatus === 'rename'){
            walkType = 'file';
        }
        // Recurse children
        this.walk((item)=>{
            request.NodePaths.push(item.getFullPath());
        }, ()=>true, walkType);

        return new Promise((resolve, reject) => {
            const proms = [];
            this.bulkStatSliced(api, request.NodePaths, 400).then(response => {
                if(!response.Nodes || !response.Nodes.length){
                    this.setStatus('ready');
                    resolve(proms);
                    return;
                }

                if(overwriteStatus === 'alert'){
                    // Will ask for overwrite - if ok, just resolve without renaming
                    this.setStatus('confirm');
                    resolve();
                    return;
                }
                const itemStated = (item) => response.Nodes.map(n=>n.Path).indexOf(item.getFullPath()) !== -1;

                // rename files if necessary
                const renameFiles = () => {
                    this.walk((item)=>{
                        if (itemStated(item)){
                            proms.push(new Promise(async resolve1 => {
                                const newPath = await this.newPath(item.getFullPath());
                                const newLabel = PathUtils.getBasename(newPath);
                                item.updateLabel(newLabel);
                                resolve1();
                            }));
                        }
                    }, ()=>true, 'file');
                    return Promise.all(proms);
                };


                // First rename folders if necessary - Blocking, so that renaming a parent folder
                // will change the children paths and see them directly as not existing
                // To do that, we chain promises to resolve them sequentially
                if(overwriteStatus === 'rename-folders'){
                    const folderProms = [];
                    let folderProm = Promise.resolve();
                    this.walk((item)=>{
                        folderProm = folderProm.then(async()=>{
                            if (itemStated(item)){
                                const newPath = await this.newPath(item.getFullPath());
                                const newLabel = PathUtils.getBasename(newPath);
                                item.updateLabel(newLabel);
                            }
                        });
                    }, ()=>true, 'folder');
                    folderProm.then(()=>{
                        return renameFiles();
                    }).then(proms=>{
                        this.setStatus('ready');
                        resolve(proms);
                    });
                } else {
                    renameFiles().then(proms=>{
                        this.setStatus('ready');
                        resolve(proms);
                    });
                }

            });

        });

    }


    newPath(fullpath) {
        return new Promise(async (resolve) => {
            const lastSlash = fullpath.lastIndexOf('/');
            const pos = fullpath.lastIndexOf('.');
            let path = fullpath;
            let ext = '';

            // NOTE: the position lastSlash + 1 corresponds to hidden files (ex: .DS_STORE)
            if (pos  > -1 && lastSlash < pos && pos > lastSlash + 1) {
                path = fullpath.substring(0, pos);
                ext = fullpath.substring(pos);
            }

            let newPath = fullpath;
            let counter = 1;

            let exists = true; //await this.nodeExists(newPath); // If we are here, we already know it exists
            while (exists) {
                newPath = path + '-' + counter + ext;
                counter++;
                exists = await this.nodeExists(newPath)
            }

            resolve(newPath);
        });
    }

    nodeExists(fullpath) {
        return new Promise(resolve => {
            const api = new TreeServiceApi(PydioApi.getRestClient());
            const request = new RestGetBulkMetaRequest();
            request.NodePaths = [fullpath];
            api.bulkStatNodes(request).then(response => {
                if (response.Nodes && response.Nodes[0]) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            }).catch(() => resolve(false))
        })
    }


}

export {Session as default}