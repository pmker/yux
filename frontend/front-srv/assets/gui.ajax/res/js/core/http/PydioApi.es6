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
import Pydio from '../Pydio'
import Connexion from './Connexion'
import PathUtils from '../util/PathUtils'
import RestClient from './RestClient'
import AWS from 'aws-sdk'
import RestCreateSelectionRequest from './gen/model/RestCreateSelectionRequest'
import TreeNode from "./gen/model/TreeNode";
import TreeServiceApi from "./gen/api/TreeServiceApi";
import AjxpNode from "../model/AjxpNode";

// Extend S3 ManagedUpload to get progress info about each part
class ManagedMultipart extends AWS.S3.ManagedUpload{

    progress(info) {
        const upload = this._managedUpload;
        if (this.operation === 'putObject') {
            info.part = 1;
            info.key = this.params.Key;
        } else {
            const partLoaded = info.loaded;
            const partTotal = info.total;
            upload.totalUploadedBytes += info.loaded - this._lastUploadedBytes;
            this._lastUploadedBytes = info.loaded;
            info = {
                loaded: upload.totalUploadedBytes,
                total: upload.totalBytes,
                part: this.params.PartNumber,
                partLoaded, partTotal,
                key: this.params.Key
            };
        }
        upload.emit('httpUploadProgress', [info]);
    }

    uploadPart(chunk, partNumber) {
        // Make sure to reupdate JWT after long uploads
        PydioApi.getRestClient().getOrUpdateJwt().then(jwt => {
            // Update accessKeyId
            this.service.config.credentials.accessKeyId = jwt;
            super.uploadPart(chunk, partNumber);
        });
    }

}

/**
 * API Client
 */
class PydioApi{

    constructor(){
    }

    /**
     * @return {JwtApiClient}
     */
    static getRestClient(){
        return new RestClient(this.getClient()._pydioObject);
    }

    static getMultipartThreshold(){
        const conf = Pydio.getInstance().getPluginConfigs("core.uploader").get("MULTIPART_UPLOAD_THRESHOLD");
        if(conf) {
            return parseInt(conf);
        } else {
            return 100 * 1024 * 1024;
        }
    }

    static getMultipartPartSize(){
        const conf = Pydio.getInstance().getPluginConfigs("core.uploader").get("MULTIPART_UPLOAD_PART_SIZE");
        if(conf) {
            return parseInt(conf);
        } else {
            return 50 * 1024 * 1024;
        }
    }

    static getMultipartPartQueueSize(){
        const conf = Pydio.getInstance().getPluginConfigs("core.uploader").get("MULTIPART_UPLOAD_QUEUE_SIZE");
        if(conf) {
            return parseInt(conf);
        } else {
            return 3;
        }
    }

    setPydioObject(pydioObject){
        this._pydioObject = pydioObject;
        this._baseUrl = pydioObject.Parameters.get('serverAccessPath');
    }

    getPydioObject(){
        return this._pydioObject;
    }

    loadFile(filePath, onComplete=null, onError=null){
        let c = new Connexion(filePath);
        c.setMethod('GET');
        c.onComplete = onComplete;
        c.send();
    }

    /**
     * 
     * @param file
     * @param fileParameterName
     * @param queryStringParams
     * @param onComplete
     * @param onError
     * @param onProgress
     * @param uploadUrl
     * @param xhrSettings
     * @returns XHR Handle to abort transfer
     */
    uploadFile(file, fileParameterName, queryStringParams='', onComplete=function(){}, onError=function(){}, onProgress=function(){}, uploadUrl='', xhrSettings={}){

        if(!uploadUrl){
            uploadUrl = pydio.Parameters.get('ajxpServerAccess');
        }
        if(queryStringParams){
            uploadUrl += (uploadUrl.indexOf('?') === -1 ? '?' : '&') + queryStringParams;
        }

            // Warning, avoid double error
            let errorSent = false;
            let localError = (xhr) => {
                if(!errorSent) {
                    onError('Request failed with status :' + xhr.status);
                }
                errorSent = true;
            };
            let c = new Connexion();
            return c.uploadFile(file, fileParameterName, uploadUrl, onComplete, localError, onProgress, xhrSettings);


    }

    /**
     *
     * @param userSelection UserSelection A Pydio DataModel with selected files
     */
    downloadSelection(userSelection){

        const pydio = this.getPydioObject();
        const agent = navigator.userAgent || '';
        const agentIsMobile = (agent.indexOf('iPhone')!==-1||agent.indexOf('iPod')!==-1||agent.indexOf('iPad')!==-1||agent.indexOf('iOs')!==-1);

        const hiddenForm = pydio.UI && pydio.UI.hasHiddenDownloadForm();
        const archiveExt = pydio.getPluginConfigs("access.gateway").get("DOWNLOAD_ARCHIVE_FORMAT") || "zip";

        if (userSelection.isUnique()) {
            let downloadNode, attachmentName;
            const uniqueNode = userSelection.getUniqueNode();
            if(uniqueNode.isLeaf()){
                downloadNode = uniqueNode;
                attachmentName = uniqueNode.getLabel();
            } else {
                downloadNode = new AjxpNode(uniqueNode.getPath() + '.' + archiveExt, false);
                attachmentName = uniqueNode.getLabel() + '.' + archiveExt;
            }

            this.buildPresignedGetUrl(downloadNode, null, '', null, attachmentName).then(url => {
                if(agentIsMobile || !hiddenForm){
                    document.location.href = url;
                } else {
                    this.getPydioObject().UI.sendDownloadToHiddenForm(userSelection, {presignedUrl: url});
                }
            });
        } else {
            const selection = new RestCreateSelectionRequest();
            selection.Nodes = [];
            const slug = this.getPydioObject().user.getActiveRepositoryObject().getSlug();
            selection.Nodes = userSelection.getSelectedNodes().map(node => {
                const tNode = new TreeNode();
                tNode.Path = slug + node.getPath();
                return tNode;
            });
            const api = new TreeServiceApi(PydioApi.getRestClient());
            api.createSelection(selection).then(response => {
                const {SelectionUUID} = response;
                const fakeNodePath = this.getPydioObject().getContextHolder().getContextNode().getPath() + "/" + SelectionUUID + '-selection.' + archiveExt;
                const fakeNode = new AjxpNode(fakeNodePath, true);
                this.buildPresignedGetUrl(fakeNode, null, '', null, 'selection.' + archiveExt).then(url => {
                    if(agentIsMobile || !hiddenForm){
                        document.location.href = url;
                    } else {
                        this.getPydioObject().UI.sendDownloadToHiddenForm(userSelection, {presignedUrl: url});
                    }
                });
            })
        }

    }

    /**
     * Generate presigned and use it for uploads
     * @param file
     * @param path
     * @param onComplete
     * @param onError
     * @param onProgress
     * @return {Promise<any>}
     */
    uploadPresigned(file, path, onComplete=()=>{}, onError=()=>{}, onProgress=()=>{}){
        let targetPath = path;
        if (path.normalize){
            targetPath = path.normalize('NFC');
        }
        if(targetPath[0] === "/"){
            targetPath = targetPath.substring(1);
        }
        const url = this.getPydioObject().Parameters.get('ENDPOINT_S3_GATEWAY');
        const params = {
            Bucket: 'io',
            Key: targetPath,
            ContentType: 'application/octet-stream'
        };

        return new Promise(resolve => {
            PydioApi.getRestClient().getOrUpdateJwt().then(jwt => {
                AWS.config.update({
                    accessKeyId: 'gateway',
                    secretAccessKey: 'gatewaysecret',
                    s3ForcePathStyle: true
                });
                const s3 = new AWS.S3({endpoint:url.replace('/io', '')});
                const signed = s3.getSignedUrl('putObject', params);
                const xhr = this.uploadFile(file, '', '', onComplete, onError, onProgress, signed, {method: 'PUT', customHeaders: {'X-Pydio-Bearer': jwt, 'Content-Type': 'application/octet-stream'}});
                resolve(xhr);
            });
        });
    }

    uploadMultipart(file, path, onComplete=()=>{}, onError=()=>{}, onProgress=() => {}) {
        let targetPath = path;
        if (path.normalize){
            targetPath = path.normalize('NFC');
        }
        if(targetPath[0] === "/"){
            targetPath = targetPath.substring(1);
        }
        const url = this.getPydioObject().Parameters.get('ENDPOINT_S3_GATEWAY');
        const params = {
            Bucket: 'io',
            Key: targetPath,
            ContentType: 'application/octet-stream'
        };

        return new Promise(resolve => {
            PydioApi.getRestClient().getOrUpdateJwt().then(jwt => {
                AWS.config.update({
                    accessKeyId: jwt,
                    secretAccessKey: 'gatewaysecret',
                    s3ForcePathStyle: true,
                    endpoint:url.replace('/io', ''),
                });
                const managed = new ManagedMultipart({
                    params: {...params, Body: file},
                    partSize: PydioApi.getMultipartPartSize(),
                    queueSize: PydioApi.getMultipartPartQueueSize(),
                    leavePartsOnError:false,
                });
                managed.on('httpUploadProgress', onProgress);
                managed.send((e,d) => {
                    if(e){
                        onError(e);
                    } else {
                        onComplete(d);
                    }
                });
                resolve(managed);
            });
        });

    }

    /**
     * Send a request to the server to get a usable presigned url.
     *
     * @param node AjxpNode
     * @param callback Function
     * @param presetType String
     * @param bucketParams
     * @param attachmentName
     * @return {Promise}|null Return a Promise if callback is null, or call the callback
     */
    buildPresignedGetUrl(node, callback = null, presetType = '', bucketParams = null, attachmentName = '') {
        const url = this.getPydioObject().Parameters.get('ENDPOINT_S3_GATEWAY');
        const slug = this.getPydioObject().user.getActiveRepositoryObject().getSlug();
        let cType = '', cDisposition;
        let longExpire = false;

        switch (presetType){
            case 'image/png':
            case 'image/jpeg':
            case 'image/bmp':
            case 'text/plain':
                cType = presetType;
                cDisposition = 'inline';
                break;
            case 'image/jpg':
                cType = 'image/jpeg';
                cDisposition = 'inline';
                break;
            case 'audio/mp3':
                cType = presetType;
                longExpire = true;
                break;
            case 'video/mp4':
                cType = presetType;
                longExpire = true;
                break;
            case 'detect':
                cType = PathUtils.getAjxpMimeType(node);
                cDisposition = 'inline';
                break;
            default:
                break;
        }

        let params = {
            Bucket: 'io',
            Key: slug + node.getPath(),
            Expires: longExpire ? 6000 : 600
        };
        if (bucketParams !== null) {
            params = bucketParams;
        }
        if(cType) {
            params['ResponseContentType'] = cType;
        }
        if(cDisposition) {
            params['ResponseContentDisposition'] = cDisposition;
        } else if (attachmentName ){
            params['ResponseContentDisposition'] = 'attachment; filename=' + encodeURIComponent(attachmentName);
        }

        const resolver = (jwt, cb) => {
            let meta = node.getMetadata().get('presignedUrls');
            let cacheKey = jwt + params.Key;
            if(cType){
               cacheKey += "#" + cType;
            }
            const cached = meta ? meta.get(cacheKey) : null;
            if(cached){
                cb(cached);
                return;
            }
            if(!meta) {
                meta = new Map();
            }

            AWS.config.update({
                accessKeyId: 'gateway',
                secretAccessKey: 'gatewaysecret',
                s3ForcePathStyle: true
            });
            const s3 = new AWS.S3({endpoint:url.replace('/io', '')});
            const signed = s3.getSignedUrl('getObject', params);
            const output = signed + '&pydio_jwt=' + jwt;
            cb(output);
            meta.set(cacheKey, output);
            node.getMetadata().set('presignedUrls', meta);
        };

        if (callback === null) {
            return new Promise((resolve) => {
                PydioApi.getRestClient().getOrUpdateJwt().then(jwt => {
                    resolver(jwt, resolve);
                });
            });
        } else {
            PydioApi.getRestClient().getOrUpdateJwt().then(jwt => {
                resolver(jwt, callback);
            });
            return null;
        }

    }

    getPlainContent(node, contentCallback) {
        PydioApi.getRestClient().getOrUpdateJwt().then(jwt => {
            const url = this.getPydioObject().Parameters.get('ENDPOINT_S3_GATEWAY');
            const slug = this.getPydioObject().user.getActiveRepositoryObject().getSlug();

            AWS.config.update({
                accessKeyId: jwt,
                secretAccessKey: 'gatewaysecret',
                s3ForcePathStyle: true
            });
            const params = {
                Bucket: "io",
                Key: slug + node.getPath(),
                ResponseContentType: 'text/plain',
                ResponseCacheControl: "no-cache",
            };
            const s3 = new AWS.S3({endpoint:url.replace('/io', '')});
            s3.getObject(params, (err,data) => {
                if (!err) {
                    contentCallback(data.Body.toString('utf-8'));
                } else {
                    this.getPydioObject().UI.displayMessage('ERROR', err.message);
                }
            })
        });

    }

    postPlainTextContent(nodePath, content, finishedCallback){

        PydioApi.getRestClient().getOrUpdateJwt().then(jwt => {
            const url = this.getPydioObject().Parameters.get('ENDPOINT_S3_GATEWAY');
            const slug = this.getPydioObject().user.getActiveRepositoryObject().getSlug();

            AWS.config.update({
                accessKeyId: jwt,
                secretAccessKey: 'gatewaysecret',
                s3ForcePathStyle: true
            });
            const params = {
                Bucket: "io",
                Key: slug + nodePath,
                Body: content,
            };
            const s3 = new AWS.S3({endpoint:url.replace('/io', '')});
            s3.putObject(params, (err) => {
                if (!err) {
                    finishedCallback('Ok');
                }  else {
                    this.getPydioObject().UI.displayMessage('ERROR', err.message);
                    finishedCallback(false);
                }
            })
        });

    }

    openVersion(node, versionId){

        const pydio = this.getPydioObject();
        const agent = navigator.userAgent || '';
        const agentIsMobile = (agent.indexOf('iPhone')!==-1||agent.indexOf('iPod')!==-1||agent.indexOf('iPad')!==-1||agent.indexOf('iOs')!==-1);
        const hiddenForm = pydio && pydio.UI && pydio.UI.hasHiddenDownloadForm();
        const slug = pydio.user.getActiveRepositoryObject().getSlug();

        this.buildPresignedGetUrl(node, (url) => {
            if(agentIsMobile || !hiddenForm){
                document.location.href = url;
            } else {
                pydio.UI.sendDownloadToHiddenForm(null, {presignedUrl: url});
            }
        }, '', {
            Bucket: 'io',
            Key: slug + node.getPath(),
            VersionId: versionId
        });

    }


    revertToVersion(node, versionId, callback){
        PydioApi.getRestClient().getOrUpdateJwt().then(jwt => {
            const url = this.getPydioObject().Parameters.get('ENDPOINT_S3_GATEWAY');
            const slug = this.getPydioObject().user.getActiveRepositoryObject().getSlug();

            AWS.config.update({
                accessKeyId: jwt,
                secretAccessKey: 'gatewaysecret',
                s3ForcePathStyle: true
            });
            const params = {
                Bucket: "io",
                Key: slug + node.getPath(),
                CopySource:encodeURIComponent('io/' + slug + node.getPath() + '?versionId=' + versionId)
            };
            const s3 = new AWS.S3({endpoint:url.replace('/io', '')});
            s3.copyObject(params, (err) => {
                if (err) {
                    this.getPydioObject().UI.displayMessage('ERROR', err.message);
                } else if (callback) {
                    callback('Copy version to original node');
                }
            })
        });

    }

    /**
     * Detect a minisite_session parameter in the URL
     * @param serverAccess
     * @returns string|bool
     */
    static detectMinisiteSession(serverAccess){
        const regex = new RegExp('.*?[&\\?]' + 'minisite_session' + '=(.*?)&?.*?');
        const val = serverAccess.replace(regex, "$1");
        return ( val === serverAccess ? false : val );
    }

    /**
     * Detects if current browser supports HTML5 Upload.
     * @returns boolean
     */
    static supportsUpload(){
        if(window.Connexion){
            return (window.FormData || window.FileReader);
        }else if(window.jQuery){
            return window.FormData;
        }
        return false;
    }

    /**
     * Instanciate a PydioApi client if it's not already instanciated and return it.
     * @returns PydioApi
     */
    static getClient(){
        if(PydioApi._PydioClient) {
            return PydioApi._PydioClient;
        }
        const client = new PydioApi();
        PydioApi._PydioClient = client;
        return client;
    }

    /**
     * Load a javascript library
     * @param fileName String
     * @param onLoadedCode Function Callback
     * @param aSync Boolean load library asynchroneously
     */
    static loadLibrary(fileName, onLoadedCode, aSync){
        if(window.pydio && pydio.Parameters.get("ajxpVersion") && fileName.indexOf("?")===-1){
            fileName += "?v="+ pydio.Parameters.get("ajxpVersion");
        }
        PydioApi._libUrl = false;
        if(window.pydio && pydio.Parameters.get('SERVER_PREFIX_URI')){
            PydioApi._libUrl = pydio.Parameters.get('SERVER_PREFIX_URI');
        }

        let conn = new Connexion();
        conn._libUrl = false;
        if(pydio.Parameters.get('SERVER_PREFIX_URI')){
            conn._libUrl = pydio.Parameters.get('SERVER_PREFIX_URI');
        }
        conn.loadLibrary(fileName, onLoadedCode, aSync);


    }

    switchLanguage(lang, completeCallback){

        let url = pydio.Parameters.get('ENDPOINT_REST_API') + '/frontend/messages/' + lang;
        window.fetch(url, {
            method:'GET',
            credentials:'same-origin',
        }).then((response) => {
            response.json().then((data) => {
                completeCallback(data);
            });
        });

    }

}

export {PydioApi as default}