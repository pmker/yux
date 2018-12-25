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
import PathUtils from 'pydio/util/path'
const {TreeServiceApi, TemplatesServiceApi, RestTemplate, RestCreateNodesRequest, TreeNode, TreeNodeType} = require('pydio/http/rest-api');

let QuickCache, QuickCacheTimer;

class Builder {

    static dynamicBuilder(){

        const pydio = Pydio.getInstance();
        if(QuickCache !== null) {
            this.__loadedTemplates = QuickCache;
        }

        if(this.__loadedTemplates){

            const exts = {
                doc:'file-word',
                docx:'file-word',
                odt:'file-word',
                odg:'file-chart',
                odp:'file-powerpoint',
                ods:'file-excel',
                pot:'file-powerpoint',
                pptx:'file-powerpoint',
                rtf:'file-word',
                xls:'file-excel',
                xlsx:'file-excel'
            };

            return this.__loadedTemplates.map(tpl => {

                let ext;
                if(tpl.UUID){
                    ext = PathUtils.getFileExtension(tpl.UUID)
                } else {
                    ext = "txt";
                }
                let icon = 'file';
                if(exts[ext]) {
                    icon = exts[ext];
                }
                return {
                    name:tpl.Label,
                    alt:tpl.Label,
                    icon_class:'mdi mdi-' + icon,
                    callback: async function(e) {
                        const repoList = pydio.user.getRepositoriesList();
                        const contextNode = pydio.getContextHolder().getContextNode();
                        const slug = repoList.get(pydio.user.activeRepository).getSlug();
                        const base = pydio.MessageHash["mkfile.untitled.document"] || "Untitled";
                        let path = slug + contextNode.getPath() + "/" + base + "." + ext;
                        path = path.replace('//', '/');

                        const pathDir = PathUtils.getDirname(path);
                        const pathLabel = newLabel(contextNode, PathUtils.getBasename(path));

                        let submit = value => {
                            const api = new TreeServiceApi(PydioApi.getRestClient());
                            const request = new RestCreateNodesRequest();
                            const node = new TreeNode();
                            node.Path = pathDir + '/' + value;
                            node.Type = TreeNodeType.constructFromObject('LEAF');
                            request.Nodes = [node];
                            request.TemplateUUID = tpl.UUID;
                            api.createNodes(request).then(collection => {
                                //console.log('Create files', collection.Children);
                            });
                        };
                        pydio.UI.openComponentInModal('PydioReactUI', 'PromptDialog', {
                            dialogTitleId:156,
                            legendId:tpl.Label,
                            fieldLabelId:174,
                            dialogSize:'sm',
                            defaultValue: pathLabel,
                            submitValue:submit
                        });

                    }.bind(this)
                }
            });

        }

        if(QuickCacheTimer){
            clearTimeout(QuickCacheTimer);
        }
        const api = new TemplatesServiceApi(PydioApi.getRestClient());
        api.listTemplates().then(response => {
            this.__loadedTemplates = response.Templates;
            // Add Empty File Template
            const emptyTemplate = new RestTemplate();
            emptyTemplate.Label = pydio.MessageHash["mkfile.empty.template.label"] || "Empty File";
            emptyTemplate.UUID = "";
            this.__loadedTemplates.unshift(emptyTemplate);
            QuickCache = response.Templates;
            QuickCacheTimer = setTimeout(() => {
                QuickCache = null;
            }, 2000);
            Pydio.getInstance().getController().fireContextChange();
        });

        return [];

    };
}

function newLabel(contextNode, label) {

    const children = contextNode.getChildren();
    const isExists = (name => {
        let yes = false;
        children.forEach(child => {
            if(child.getLabel() === name) {
                yes = true;
            }
        });
        return yes;
    });

    const pos = label.lastIndexOf('.');
    const base = label.substring(0, pos);
    const ext = label.substring(pos);

    let newPath = label;
    let counter = 1;

    let exists = isExists(newPath);

    while (exists) {
        newPath = base + '-' + counter + ext;
        counter++;
        exists = isExists(newPath)
    }

    return newPath;

}

export default function(pydio){
    return Builder.dynamicBuilder;
}