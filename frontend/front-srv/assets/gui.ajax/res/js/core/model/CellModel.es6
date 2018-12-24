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
import PydioApi from '../http/PydioApi'
import Observable from '../lang/Observable'
import PathUtils from '../util/PathUtils'
import IdmObjectHelper from './IdmObjectHelper'
import {ShareServiceApi, RestPutCellRequest, RestCell, RestCellAcl, IdmACLAction, TreeNode} from '../http/gen/index'

class CellModel extends Observable{

    dirty;

    constructor(editMode = false){
        super();
        // Create an empty room
        this.cell = new RestCell();
        this.cell.Label = '';
        this.cell.Description = '';
        this.cell.ACLs = {};
        this.cell.RootNodes = [];
        this.cell.Policies = [];
        this.cell.PoliciesContextEditable = true;
        this._edit = editMode;
    }

    isDirty(){
        return this.dirty;
    }

    isEditable(){
        return this.cell.PoliciesContextEditable;
    }

    getRootNodes(){
        return this.cell.RootNodes;
    }
    
    notifyDirty(){
        this.dirty = true;
        this.notify('update');
    }

    revertChanges(){
        if(this.originalCell){
            this.cell = this.clone(this.originalCell);
            this.dirty = false;
            this.notify('update');
        }
    }

    /**
     *
     * @param node {TreeNode}
     * @return string
     */
    getNodeLabelInContext(node){
        const path = node.Path;
        let label = PathUtils.getBasename(path);
        if(node.MetaStore && node.MetaStore.selection){
            return label;
        }
        if(node.MetaStore && node.MetaStore.CellNode) {
            return '[Cell Folder]';
        }
        if(node.AppearsIn && node.AppearsIn.length){
            node.AppearsIn.map(workspaceRelativePath => {
                if (workspaceRelativePath.WsUuid !== this.cell.Uuid){
                    label = '[' + workspaceRelativePath.WsLabel + '] ' + PathUtils.getBasename(workspaceRelativePath.Path);
                }
            })
        }
        return label;
    }

    /**
     *
     * @return {string}
     */
    getAclsSubjects(){
        return Object.keys(this.cell.ACLs).map(roleId => {
            const acl = this.cell.ACLs[roleId];
            return IdmObjectHelper.extractLabel(Pydio.getInstance(), acl);
        }).join(', ');
    }

    /**
     * @return {Object.<String, module:model/RestCellAcl>}
     */
    getAcls(){
        return this.cell.ACLs;
    }

    /**
     *
     * @param idmObject IdmUser|IdmRole
     */
    addUser(idmObject){
        let acl = new RestCellAcl();
        acl.RoleId = idmObject.Uuid;
        if(idmObject.Login !== undefined){
            acl.IsUserRole = true;
            acl.User = idmObject;
        } else if(idmObject.IsGroup){
            acl.Group = idmObject;
        } else {
            acl.Role = idmObject;
        }
        acl.Actions = [];
        let action = new IdmACLAction();
        action.Name = 'read';
        action.Value = '1';
        acl.Actions.push(action);
        this.cell.ACLs[acl.RoleId] = acl;
        this.notifyDirty();
    }

    /**
     *
     * @param roleId string
     */
    removeUser(roleId){
        if(this.cell.ACLs[roleId]){
            delete this.cell.ACLs[roleId];
        }
        this.notifyDirty();
    }

    /**
     *
     * @param roleId string
     * @param right string
     * @param value bool
     */
    updateUserRight(roleId, right, value){
        if (value) {
            const acl = this.cell.ACLs[roleId];
            let action = new IdmACLAction();
            action.Name = right;
            action.Value = '1';
            acl.Actions.push(action);
            this.cell.ACLs[roleId] = acl;
        } else {
            if (this.cell.ACLs[roleId]) {
                const actions = this.cell.ACLs[roleId].Actions;
                this.cell.ACLs[roleId].Actions = actions.filter((action) => {
                    return action.Name !== right;
                });
                if(!this.cell.ACLs[roleId].Actions.length) {
                    this.removeUser(roleId);
                    return;
                }
            }
        }
        this.notifyDirty();
    }

    /**
     *
     * @param node Node
     * @param repositoryId String
     */
    addRootNode(node, repositoryId = null){
        const pydio = Pydio.getInstance();
        let treeNode = new TreeNode();
        treeNode.Uuid = node.getMetadata().get('uuid');
        let slug;
        if(repositoryId){
            slug = pydio.user.getRepositoriesList().get(repositoryId).getSlug();
        } else {
            slug = pydio.user.getActiveRepositoryObject().getSlug();
        }
        treeNode.Path = slug + node.getPath();
        treeNode.MetaStore = {selection:true};
        this.cell.RootNodes.push(treeNode);
        this.notifyDirty();
    }

    /**
     *
     * @param uuid string
     */
    removeRootNode(uuid){
        let newNodes = [];
        this.cell.RootNodes.map(n => {
            if (n.Uuid !== uuid) {
                newNodes.push(n);
            }
        });
        this.cell.RootNodes = newNodes;
        this.notifyDirty();
    }

    /**
     *
     * @param nodeId
     * @return bool
     */
    hasRootNode(nodeId){
        return this.cell.RootNodes.filter(root => {
            return root.Uuid === nodeId;
        }).length;
    }

    /**
     * Check if there are differences between current root nodes and original ones
     * @return {boolean}
     */
    hasDirtyRootNodes(){
        if(!this.originalCell) {
            return false;
        }
        let newNodes = [], deletedNodes = [];
        this.cell.RootNodes.map(n => {
            if (this.originalCell.RootNodes.filter(root => {
                return root.Uuid === n.Uuid;
            }).length === 0) {
                newNodes.push(n.Uuid);
            }
        });
        this.originalCell.RootNodes.map(n => {
            if (this.cell.RootNodes.filter(root => {
                return root.Uuid === n.Uuid;
            }).length === 0) {
                deletedNodes.push(n.Uuid);
            }
        });
        return newNodes.length > 0 || deletedNodes.length > 0;
    }

    /**
     *
     * @param roomLabel
     */
    setLabel(roomLabel){
        this.cell.Label = roomLabel;
        this.notifyDirty();
    }

    /**
     *
     * @return {String}
     */
    getLabel(){
        return this.cell.Label;
    }

    /**
     *
     * @return {String}
     */
    getDescription(){
        return this.cell.Description;
    }

    /**
     *
     * @return {String}
     */
    getUuid(){
        return this.cell.Uuid;
    }

    /**
     *
     * @param description
     */
    setDescription(description){
        this.cell.Description = description;
        this.notifyDirty();
    }

    clone(room){
        return RestCell.constructFromObject(JSON.parse(JSON.stringify(room)));
    }

    /**
     * @return {Promise}
     */
    save(){

        if(!this.cell.RootNodes.length && this.cell.Uuid) {
            // cell was emptied, remove it
            return this.deleteCell('This cell has no more items in it, it will be deleted, are you sure?');
        }

        const api = new ShareServiceApi(PydioApi.getRestClient());
        let request = new RestPutCellRequest();
        if(!this._edit && !this.cell.RootNodes.length){
            request.CreateEmptyRoot = true;
        }
        this.cell.RootNodes.map(node => {
            if(node.MetaStore && node.MetaStore.selection){
                delete node.MetaStore.selection;
            }
        });
        request.Room = this.cell;
        return api.putCell(request).then(response=>{
            if(!response || !response.Uuid){
                throw new Error('Error while saving cell');
            }
            if(this._edit) {
                this.cell = response;
                this.dirty = false;
                this.originalCell = this.clone(this.cell);
                this.notify('update');
            } else {
                Pydio.getInstance().observeOnce('repository_list_refreshed', ()=>{
                    Pydio.getInstance().triggerRepositoryChange(response.Uuid);
                });
            }
        });

    }

    load(cellId){
        const api = new ShareServiceApi(PydioApi.getRestClient());
        return api.getCell(cellId).then(room => {
            this.cell = room;
            if(!this.cell.RootNodes){
                this.cell.RootNodes = [];
            }
            if(!this.cell.ACLs){
                this.cell.ACLs = {};
            }
            if(!this.cell.Policies){
                this.cell.Policies = [];
            }
            if(!this.cell.Description){
                this.cell.Description = '';
            }
            this._edit = true;
            this.originalCell = this.clone(this.cell);
            this.notify('update');
        })
    }

    /**
     * @param confirmMessage String
     * @return {Promise}
     */
    deleteCell(confirmMessage = ''){
        if(!confirmMessage){
            confirmMessage = 'Are you sure you want to delete this cell? This cannot be undone.';
        }
        if (confirm(confirmMessage)){
            const api = new ShareServiceApi(PydioApi.getRestClient());
            const pydio = Pydio.getInstance();
            if(pydio.user.activeRepository === this.cell.Uuid){
                let switchToOther;
                pydio.user.getRepositoriesList().forEach((v, k) => {
                    if(k !== this.cell.Uuid && (!switchToOther || v.getAccessType() === 'gateway')){
                        switchToOther = k;
                    }
                });
                if(switchToOther){
                    pydio.triggerRepositoryChange(switchToOther, () => {
                        api.deleteCell(this.cell.Uuid).then(res => {});
                    });
                }
            } else {
                return api.deleteCell(this.cell.Uuid).then(res => {});
            }
        }
        return Promise.resolve({});
    }

}

export {CellModel as default}