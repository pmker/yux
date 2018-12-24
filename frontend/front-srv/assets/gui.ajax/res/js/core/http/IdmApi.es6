import UserServiceApi from "./gen/api/UserServiceApi";
import RestSearchUserRequest from "./gen/model/RestSearchUserRequest";
import IdmUserSingleQuery from "./gen/model/IdmUserSingleQuery";
import ServiceOperationType from "./gen/model/ServiceOperationType";
import IdmNodeType from "./gen/model/IdmNodeType";
import IdmUser from "./gen/model/IdmUser";
import LangUtils from "../util/LangUtils"
import RoleServiceApi from "./gen/api/RoleServiceApi";
import IdmRole from "./gen/model/IdmRole";
import RestSearchRoleRequest from "./gen/model/RestSearchRoleRequest";
import IdmRoleSingleQuery from "./gen/model/IdmRoleSingleQuery";
import uuid from 'uuid4'
import ServiceResourcePolicy from "./gen/model/ServiceResourcePolicy";
import GraphServiceApi from "./gen/api/GraphServiceApi";

class IdmApi {

    constructor(restClient){
        this.client = restClient;
    }

    /**
     *
     * @param userLogin
     * @return {Promise<IdmUser>}
     */
    loadUser(userLogin){
        const api = new UserServiceApi(this.client);
        const request = new RestSearchUserRequest();
        request.Operation = ServiceOperationType.constructFromObject('AND');
        request.Queries = [];
        const query = new IdmUserSingleQuery();
        query.Login = userLogin;
        query.NodeType = IdmNodeType.constructFromObject('USER');
        request.Queries.push(query);
        return api.searchUsers(request).then(collection => {
            return collection.Users ? collection.Users[0] : null;
        })
    }

    /**
     *
     * @param roleUuid
     * @return {Promise<IdmRole>}
     */
    loadRole(roleUuid){
        const api = new RoleServiceApi(this.client);
        const request = new RestSearchRoleRequest();
        request.Queries = [IdmRoleSingleQuery.constructFromObject({Uuid: [roleUuid]})];
        return api.searchRoles(request).then(collection => {
            return collection.Roles ? collection.Roles[0] : null;
        });
    }

    /**
     *
     * @param baseGroup string
     * @param filterString string
     * @param recursive boolean
     * @param offset integer
     * @param limit integer
     * @param profile string filter by profile
     * @return Promise<IdmUser[]>
     */
    listUsers(baseGroup='/', filterString='', recursive = false, offset = 0, limit = -1, profile = ''){

        const api = new UserServiceApi(this.client);
        const request = new RestSearchUserRequest();
        request.Operation = ServiceOperationType.constructFromObject('AND');
        request.Queries = [];
        const query = new IdmUserSingleQuery();
        query.GroupPath = baseGroup || '/';
        query.Recursive = recursive;
        query.NodeType = IdmNodeType.constructFromObject('USER');
        request.Queries.push(query);

        if(filterString){
            const queryString = new IdmUserSingleQuery();
            queryString.Login = filterString + '*';
            request.Queries.push(queryString);
        }
        if(profile){
            const exclude = profile[0] === '!';
            const profileQ = new IdmUserSingleQuery();
            profileQ.AttributeName = 'profile';
            profileQ.AttributeValue = exclude ? profile.substring(1) : profile;
            if(exclude){
                profileQ.not = true;
            }
            request.Queries.push(profileQ);
        }

        const query2 = new IdmUserSingleQuery();
        query2.AttributeName = 'hidden';
        query2.AttributeValue = 'true';
        query2.not = true;
        request.Queries.push(query2);
        if(offset > 0){
            request.Offset = offset + '';
        }
        if(limit > -1){
            request.Limit = limit + '';
        }

        return api.searchUsers(request).then(collection => {
            return {Users:collection.Users || [], Total:collection.Total, Offset: offset, Limit: limit};
        });

    }

    /**
     *
     * @param baseGroup string
     * @param recursive boolean
     * @param offset integer
     * @param limit integer
     * @return Promise<RestUsersCollection>
     */
    listUsersGroups(baseGroup='/', recursive = false, offset = 0, limit = -1){

        const p1 = this.listGroups(baseGroup, '', recursive, 0, 1000);
        const p2 = this.listUsers(baseGroup, '', recursive, offset, limit);
        return Promise.all([p1, p2]).then(result => {
            const [resGroups, resUsers] = result;
            return {
                Groups: resGroups.Groups || [],
                Users: resUsers.Users || [],
                Total: resUsers.Total,
                Offset: offset,
                Limit: limit
            }
        });
        /*
        const api = new UserServiceApi(this.client);
        const request = new RestSearchUserRequest();
        request.Operation = ServiceOperationType.constructFromObject('AND');
        request.Queries = [];
        const query = new IdmUserSingleQuery();
        query.GroupPath = baseGroup || '/';
        query.Recursive = recursive;
        query.NodeType = IdmNodeType.constructFromObject('UNKNOWN');
        request.Queries.push(query);

        const query2 = new IdmUserSingleQuery();
        query2.AttributeName = 'hidden';
        query2.AttributeValue = 'true';
        query2.not = true;
        request.Queries.push(query2);
        if(offset > 0){
            request.Offset = offset + '';
        }
        if(limit > -1){
            request.Limit = limit + '';
        } else {
            request.Limit = '10000';
        }

        return api.searchUsers(request);
        */

    }

    /**
     *
     * @param roleId string
     * @param offset integer
     * @param limit integer
     * @return Promise<RestUsersCollection>
     */
    listUsersWithRole(roleId, offset = 0, limit = -1){

        const api = new UserServiceApi(this.client);
        const request = new RestSearchUserRequest();
        request.Operation = ServiceOperationType.constructFromObject('AND');
        request.Queries = [];
        const query = new IdmUserSingleQuery();
        query.GroupPath = '/';
        query.Recursive = true;
        query.NodeType = IdmNodeType.constructFromObject('USER');
        request.Queries.push(query);
        const query2 = new IdmUserSingleQuery();
        query2.HasRole = roleId;
        request.Queries.push(query2);

        if(offset > 0){
            request.Offset = offset + '';
        }
        if(limit > -1){
            request.Limit = limit + '';
        } else {
            request.Limit = '100';
        }

        return api.searchUsers(request).then(collection => {
            return {Users:collection.Users || [], Total:collection.Total, Offset: offset, Limit: limit};
        });

    }

    /**
     *
     * @param baseGroup string
     * @param filterString string
     * @param recursive boolean
     * @param offset integer
     * @param limit integer
     * @return {Promise<IdmUser[]>}
     */
    listGroups(baseGroup = '/', filterString='', recursive = false, offset = 0, limit = -1){

        const api = new UserServiceApi(this.client);
        const request = new RestSearchUserRequest();
        request.Operation = ServiceOperationType.constructFromObject('AND');
        request.Queries = [];
        const query = new IdmUserSingleQuery();
        query.GroupPath = baseGroup || '/';
        query.Recursive = recursive;
        query.NodeType = IdmNodeType.constructFromObject('GROUP');
        request.Queries.push(query);

        if(filterString){
            const queryString = new IdmUserSingleQuery();
            queryString.AttributeName = 'displayName';
            queryString.AttributeValue = filterString + '*';
            request.Queries.push(queryString);
        }

        if(offset > 0){
            request.Offset = offset + '';
        }
        if(limit > -1){
            request.Limit = limit + '';
        }

        return api.searchUsers(request).then(value => {
            return {Groups: value.Groups || [], Total:value.Total, Offset: offset, Limit: limit};
        });


    }

    /**
     *
     * @param showTechnicalRoles boolean
     * @param offset int
     * @param limit int
     * @return {Promise<any>}
     */
    listRoles(showTechnicalRoles = false, offset = 0, limit = -1){

        const api = new RoleServiceApi(this.client);
        const request = new RestSearchRoleRequest();
        if(offset > 0){
            request.Offset = offset + '';
        }
        if(limit > -1){
            request.Limit = limit + '';
        }
        if (showTechnicalRoles) {

            return api.searchRoles(request).then(coll => {
                return coll.Roles || [];
            });

        }
        // Exclude tech roles but still load ROOT_GROUP role
        request.Queries = [];
        {
            const q = new IdmRoleSingleQuery();
            q.IsGroupRole = true;
            q.not = true;
            request.Queries.push(q);
        }
        {
            const q = new IdmRoleSingleQuery();
            q.IsUserRole = true;
            q.not = true;
            request.Queries.push(q);
        }
        {
            const q = new IdmRoleSingleQuery();
            q.IsTeam = true;
            q.not = true;
            request.Queries.push(q);
        }
        request.Operation = ServiceOperationType.constructFromObject('AND');

        const p1 = api.searchRoles(request).then(coll => {
            return coll.Roles || [];
        });
        const p2 = this.loadRole('ROOT_GROUP');
        return Promise.all([p1, p2]).then(result => {
            let roles = result[0];
            if (result[1] !== null) {
                roles = [result[1], ...roles];
            }
            return roles;
        });


    }

    /**
     *
     * @param filterString
     * @param offset
     * @param limit
     * @return {Promise<any>}
     */
    listTeams(filterString = '', offset = 0, limit = -1){

        const api = new RoleServiceApi(this.client);
        const request = new RestSearchRoleRequest();
        if(offset > 0){
            request.Offset = offset + '';
        }
        if(limit > -1){
            request.Limit = limit + '';
        }
        request.Queries = [];
        const q = new IdmRoleSingleQuery();
        q.IsTeam = true;
        request.Queries.push(q);
        if (filterString) {
            const q2 = new IdmRoleSingleQuery();
            q2.Label = filterString + '*';
            request.Queries.push(q2);
        }
        request.Operation = ServiceOperationType.constructFromObject('AND');

        return api.searchRoles(request).then(coll => {
            return {Teams:coll.Roles || [], Total: coll.Total, Offset: offset, Limit: limit};
        });

    }

    /**
     *
     * @param baseGroup
     * @param groupIdentifier
     * @param displayName
     * @return {Promise}
     */
    createGroup(baseGroup = '/', groupIdentifier, displayName){
        const api = new UserServiceApi(this.client);
        const object = new IdmUser();
        object.IsGroup = true;
        object.GroupPath = baseGroup || '/';
        object.GroupLabel = groupIdentifier;
        object.Attributes = {"displayName": displayName};
        return api.putUser(groupIdentifier, object);
    }

    /**
     *
     * @param baseGroup string
     * @param login string
     * @param password string
     * @param profile string
     * @return {Promise}
     */
    createUser(baseGroup = '/', login, password, profile='standard'){
        const api = new UserServiceApi(this.client);
        const object = new IdmUser();
        object.GroupPath = baseGroup;
        object.Login = login;
        object.Password = password;
        object.Attributes = {profile: profile};
        return api.putUser(login, object);
    }

    /**
     *
     * @param data {*}
     * @param parametersDef []
     * @param existingUser {IdmUser}
     */
    putExternalUser(data, parametersDef, existingUser = null){
        const idmUser = existingUser || new IdmUser();
        idmUser.Attributes = idmUser.Attributes || {};
        idmUser.Roles = idmUser.Roles || [];
        idmUser.Attributes["profile"] = "shared";

        parametersDef.forEach(param => {
            const {name, IdmUserField, scope, pluginId} = param;
            let value = data[name];
            if(IdmUserField){
                idmUser[IdmUserField] = value;
            } else if(scope === 'user') {
                if (value === true || value === false){
                    value = JSON.stringify(value);
                }
                idmUser.Attributes[name] = value;
            } else if(pluginId) {
                // This will be redispatched to user role in backend
                idmUser.Attributes["parameter:" + pluginId + ":" + name] = JSON.stringify(value);
            }
        });
        return pydio.user.getIdmUser().then(crtUser => {
            idmUser.GroupPath = crtUser.GroupPath;
            return this.policiesForExternalUser(pydio.user, idmUser.Login).then(policies => {
                idmUser.Policies = policies;
                const api = new UserServiceApi(this.client);
                return api.putUser(idmUser.Login, idmUser);
            });
        });
    }

    /**
     *
     * @param userLogin
     * @return {Promise<RestRelationResponse>}
     */
    loadUserGraph(userLogin){
        const api = new GraphServiceApi(this.client);
        return api.relation(userLogin);
    }

    /**
     * Create a role from scratch
     * @param roleLabel string
     * @return {Promise}
     */
    createRole(roleLabel) {
        const api = new RoleServiceApi(this.client);
        const idmRole = new IdmRole();
        idmRole.Uuid = uuid.sync();
        idmRole.Label = roleLabel;
        return api.setRole(idmRole.Uuid, idmRole)
    }

    /**
     *
     * @param idmUser {IdmUser}
     * @return {Promise}
     */
    updateIdmUser(idmUser){
        const api = new UserServiceApi(this.client);
        if(idmUser.IsGroup){
            return api.putUser(idmUser.GroupLabel, idmUser);
        } else {
            return api.putUser(idmUser.Login, idmUser);
        }
    }

    /**
     *
     * @param idmUser {IdmUser}
     * @return {Promise}
     */
    deleteIdmUser(idmUser){
        const api = new UserServiceApi(this.client);
        if(idmUser.IsGroup){
            const gPath = LangUtils.trimRight(idmUser.GroupPath, '/') + '/' + idmUser.GroupLabel + '/';
            if(gPath === '/'){
                return Promise.reject('cannot delete root group!');
            }
            return api.deleteUser(LangUtils.trimLeft(gPath, '/'));
        } else {
            return api.deleteUser(idmUser.Login);
        }
    }

    /**
     * Delete a role by Id
     * @param roleId
     * @return {Promise}
     */
    deleteRole(roleId){
        const api = new RoleServiceApi(this.client);
        return api.deleteRole(roleId);
    }


    /**
     *
     * @param teamName string
     * @param userIds array
     * @param callback optional callback
     * @return {Promise<T>}
     */
    saveSelectionAsTeam(teamName, userIds, callback){

        return this.policiesForUniqueUser(pydio.user).then(policies => {
            const roleApi = new RoleServiceApi(this.client);
            const role = new IdmRole();
            role.Uuid = LangUtils.computeStringSlug(teamName) + "-" + uuid.sync().substr(0, 4);
            role.Label = teamName;
            role.IsTeam = true;
            role.Policies = policies;
            return roleApi.setRole(role.Uuid, role).then(r => {
                const ps = userIds.map(userId => {
                    return this.addUserToTeam(role.Uuid, userId, null);
                });
                return Promise.all(ps).then(()=> {
                    if(callback) {
                        callback(r);
                    }
                });
            });
        });

    }

    /**
     *
     * @param teamId
     * @param userLogin
     * @param callback
     * @return {Promise<[any , any]>}
     */
    addUserToTeam(teamId, userLogin, callback){

        const userApi = new UserServiceApi(this.client);
        const p1 = this.loadUser(userLogin);
        const p2 = this.loadRole(teamId);
        return Promise.all([p1, p2]).then(result => {
            const [user, role] = result;
            if(!user || !role){
                throw new Error('Cannot find user or team!');
            }
            user.Roles = user.Roles || [];
            user.Roles.push(role);
            return userApi.putRoles(userLogin, user).then(() => {
                if (callback) {
                    callback();
                }
            });
        });

    }

    /**
     *
     * @param teamId
     * @param userLogin
     * @param callback
     * @return {Promise<[any , any]>}
     */
    removeUserFromTeam(teamId, userLogin, callback){

        const userApi = new UserServiceApi(this.client);
        return this.loadUser(userLogin).then(u => {
            if(!u){
                throw new Error('Cannot find user!');
            }
            u.Roles = u.Roles || [];
            u.Roles = u.Roles.filter(r => r.Uuid !== teamId);

            if(callback){
                callback(u);
            }
            return userApi.putRoles(userLogin, u).then(()=>{
                if(callback) {
                    callback();
                }
            });
        });

    }

    /**
     *
     * @param teamId
     * @param newLabel
     * @param callback
     * @return {Promise<IdmRole>}
     */
    updateTeamLabel(teamId, newLabel,callback){
        const roleApi = new RoleServiceApi(this.client);
        return this.loadRole(teamId).then(r => {
            if(!r){
                throw new Error('Cannot find team!');
            }
            r.Label = newLabel;
            return roleApi.setRole(r.Uuid, r).then(() => {
                if(callback) {
                    callback();
                }
            });
        });
    }

    /**
     *
     * @param currentUser
     * @return {Promise<Array>}
     */
    policiesForUniqueUser(currentUser){
        return currentUser.getIdmUser().then(idmUser => {
            return [
                ServiceResourcePolicy.constructFromObject({
                    Subject: idmUser.Uuid,
                    Action : 'OWNER',
                    Effect: 'allow',
                }),
                ServiceResourcePolicy.constructFromObject({
                    Subject: "user:" + idmUser.Login,
                    Action : 'READ',
                    Effect: 'allow',
                }),
                ServiceResourcePolicy.constructFromObject({
                    Subject: "user:" + idmUser.Login,
                    Action : 'WRITE',
                    Effect: 'allow',
                }),
                ServiceResourcePolicy.constructFromObject({
                    Subject: "profile:admin",
                    Action : 'WRITE',
                    Effect: 'allow',
                }),
                ServiceResourcePolicy.constructFromObject({
                    Subject: "profile:admin",
                    Action : 'READ',
                    Effect: 'allow',
                }),
            ];
        });
    }

    /**
     *
     * @param currentUser
     * @param newUserLogin
     * @return {Promise<Array>}
     */
    policiesForExternalUser(currentUser, newUserLogin){
        return currentUser.getIdmUser().then(idmUser => {
            return [
                ServiceResourcePolicy.constructFromObject({
                    Subject: idmUser.Uuid,
                    Action : 'OWNER',
                    Effect: 'allow',
                }),
                ServiceResourcePolicy.constructFromObject({
                    Subject: "user:" + idmUser.Login,
                    Action : 'READ',
                    Effect: 'allow',
                }),
                ServiceResourcePolicy.constructFromObject({
                    Subject: "user:" + idmUser.Login,
                    Action : 'WRITE',
                    Effect: 'allow',
                }),
                ServiceResourcePolicy.constructFromObject({
                    Subject: "user:" + newUserLogin,
                    Action : 'READ',
                    Effect: 'allow',
                }),
                ServiceResourcePolicy.constructFromObject({
                    Subject: "user:" + newUserLogin,
                    Action : 'WRITE',
                    Effect: 'allow',
                }),
                ServiceResourcePolicy.constructFromObject({
                    Subject: "profile:admin",
                    Action : 'WRITE',
                    Effect: 'allow',
                }),
                ServiceResourcePolicy.constructFromObject({
                    Subject: "profile:admin",
                    Action : 'READ',
                    Effect: 'allow',
                }),
            ];
        });
    }

}

export {IdmApi as default}