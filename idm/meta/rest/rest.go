/*
 * Copyright (c) 2018. Abstrium SAS <team (at) pydio.com>
 * This file is part of Pydio Cells.
 *
 * Pydio Cells is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Pydio Cells is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Pydio Cells.  If not, see <http://www.gnu.org/licenses/>.
 *
 * The latest code can be found at <https://pydio.com>.
 */

package rest

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/emicklei/go-restful"
	"go.uber.org/zap"

	"github.com/golang/protobuf/ptypes"
	"github.com/golang/protobuf/ptypes/any"
	"github.com/micro/go-micro/errors"
	"github.com/pmker/yux/common"
	"github.com/pmker/yux/common/auth"
	"github.com/pmker/yux/common/auth/claim"
	"github.com/pmker/yux/common/log"
	"github.com/pmker/yux/common/proto/docstore"
	"github.com/pmker/yux/common/proto/idm"
	"github.com/pmker/yux/common/proto/rest"
	"github.com/pmker/yux/common/proto/tree"
	"github.com/pmker/yux/common/service"
	"github.com/pmker/yux/common/micro"
	serviceproto "github.com/pmker/yux/common/service/proto"
	"github.com/pmker/yux/common/service/resources"
	"github.com/pmker/yux/common/utils"
	"github.com/pmker/yux/common/views"
	"github.com/pmker/yux/idm/meta/namespace"
)

const MetaTagsDocStoreId = "user_meta_tags"

func NewUserMetaHandler() *UserMetaHandler {
	handler := new(UserMetaHandler)
	handler.ServiceName = common.SERVICE_USER_META
	handler.ResourceName = "userMeta"
	handler.PoliciesLoader = handler.PoliciesForMeta
	return handler
}

type UserMetaHandler struct {
	resources.ResourceProviderHandler
}

// SwaggerTags list the names of the service tags declared in the swagger json implemented by this service
func (s *UserMetaHandler) SwaggerTags() []string {
	return []string{"UserMetaService"}
}

// Filter returns a function to filter the swagger path
func (s *UserMetaHandler) Filter() func(string) string {
	return nil
}

// Handle special case for "content_lock" meta => store in ACL instead of user metadatas
func (s *UserMetaHandler) updateLock(ctx context.Context, meta *idm.UserMeta, operation idm.UpdateUserMetaRequest_UserMetaOp) error {
	log.Logger(ctx).Info("Should update content lock in ACLs", zap.Any("meta", meta), zap.Any("operation", operation))
	nodeUuid := meta.NodeUuid
	aclClient := idm.NewACLServiceClient(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_ACL, defaults.NewClient())
	q, _ := ptypes.MarshalAny(&idm.ACLSingleQuery{
		NodeIDs: []string{nodeUuid},
		Actions: []*idm.ACLAction{{Name: utils.ACL_CONTENT_LOCK.Name}},
	})
	userName, _ := utils.FindUserNameInContext(ctx)
	stream, err := aclClient.SearchACL(ctx, &idm.SearchACLRequest{Query: &serviceproto.Query{SubQueries: []*any.Any{q}}})
	if err != nil {
		return err
	}
	defer stream.Close()
	for {
		rsp, e := stream.Recv()
		if e != nil {
			break
		}
		if rsp == nil {
			continue
		}
		acl := rsp.ACL
		if userName == "" || acl.Action.Value != userName {
			return errors.Forbidden("lock.update.forbidden", "This file is locked by another user")
		}
		break
	}
	if operation == idm.UpdateUserMetaRequest_PUT {
		if _, e := aclClient.CreateACL(ctx, &idm.CreateACLRequest{ACL: &idm.ACL{
			NodeID: nodeUuid,
			Action: &idm.ACLAction{Name: "content_lock", Value: meta.JsonValue},
		}}); e != nil {
			return e
		}
	} else {
		req := &idm.DeleteACLRequest{Query: &serviceproto.Query{SubQueries: []*any.Any{q}}}
		if _, e := aclClient.DeleteACL(ctx, req); e != nil {
			return e
		}
	}
	return nil
}

// Will check for namespace policies before updating / deleting
func (s *UserMetaHandler) UpdateUserMeta(req *restful.Request, rsp *restful.Response) {

	var input idm.UpdateUserMetaRequest
	if err := req.ReadEntity(&input); err != nil {
		service.RestError500(req, rsp, err)
		return
	}
	ctx := req.Request.Context()
	userMetaClient := idm.NewUserMetaServiceClient(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_USER_META, defaults.NewClient())
	nsList, e := s.ListAllNamespaces(ctx, userMetaClient)
	if e != nil {
		service.RestError500(req, rsp, e)
		return
	}
	var loadUuids []string
	router := views.NewUuidRouter(views.RouterOptions{})

	// First check if the namespaces are globally accessible
	for _, meta := range input.MetaDatas {
		var ns *idm.UserMetaNamespace
		var exists bool
		resp, e := router.ReadNode(ctx, &tree.ReadNodeRequest{Node: &tree.Node{Uuid: meta.NodeUuid}})
		if e != nil {
			service.RestError404(req, rsp, e)
			return
		}
		if meta.Namespace == utils.ACL_CONTENT_LOCK.Name {
			e := s.updateLock(ctx, meta, input.Operation)
			if e != nil {
				service.RestErrorDetect(req, rsp, e)
			} else {
				rsp.WriteEntity(&idm.UpdateUserMetaResponse{MetaDatas: []*idm.UserMeta{meta}})
			}
			return
		}
		if ns, exists = nsList[meta.Namespace]; !exists {
			service.RestError404(req, rsp, errors.NotFound(common.SERVICE_USER_META, "Namespace "+meta.Namespace+" is not defined!"))
			return
		}
		if strings.HasPrefix(meta.Namespace, "usermeta-") && resp.Node.GetStringMeta(common.META_FLAG_READONLY) != "" {
			service.RestError403(req, rsp, fmt.Errorf("you are not allowed to edit this node"))
			return
		}

		if !s.MatchPolicies(ctx, meta.Namespace, ns.Policies, serviceproto.ResourcePolicyAction_WRITE) {
			service.RestError403(req, rsp, errors.Forbidden(common.SERVICE_USER_META, "You are not authorized to write on namespace "+meta.Namespace))
			return
		}
		if meta.Uuid != "" {
			loadUuids = append(loadUuids, meta.Uuid)
		}
		// Special case for tags: automatically update stored list
		var nsDef map[string]interface{}
		if jE := json.Unmarshal([]byte(ns.JsonDefinition), &nsDef); jE == nil {
			if _, ok := nsDef["type"]; ok {
				nsType := nsDef["type"].(string)
				if nsType == "tags" {
					var currentValue string
					json.Unmarshal([]byte(meta.JsonValue), &currentValue)
					log.Logger(ctx).Debug("jsonDef for namespace "+ns.Namespace, zap.Any("d", nsDef), zap.Any("v", currentValue))
					e := s.putTagsIfNecessary(ctx, ns.Namespace, strings.Split(currentValue, ","))
					if e != nil {
						log.Logger(ctx).Error("Could not store meta tags for namespace "+ns.Namespace, zap.Error(e))
					}
				}
			}
		} else {
			log.Logger(ctx).Error("Cannot decode jsonDef "+ns.Namespace, zap.Error(jE))
		}
	}
	// Some existing meta will be updated / deleted : load their policies and check their rights!
	if len(loadUuids) > 0 {
		stream, e := userMetaClient.SearchUserMeta(ctx, &idm.SearchUserMetaRequest{MetaUuids: loadUuids})
		if e != nil {
			service.RestError500(req, rsp, e)
			return
		}
		defer stream.Close()
		for {
			resp, er := stream.Recv()
			if er != nil {
				break
			}
			if resp == nil {
				continue
			}
			if !s.MatchPolicies(ctx, resp.UserMeta.Uuid, resp.UserMeta.Policies, serviceproto.ResourcePolicyAction_WRITE) {
				service.RestError403(req, rsp, errors.Forbidden(common.SERVICE_USER_META, "You are not authorized to edit this meta "+resp.UserMeta.Namespace))
				return
			}
		}
	}
	if response, err := userMetaClient.UpdateUserMeta(ctx, &input); err != nil {
		service.RestError500(req, rsp, err)
	} else {
		rsp.WriteEntity(response)
	}

}

func (s *UserMetaHandler) SearchUserMeta(req *restful.Request, rsp *restful.Response) {

	var input idm.SearchUserMetaRequest
	if err := req.ReadEntity(&input); err != nil {
		service.RestError500(req, rsp, err)
		return
	}
	ctx := req.Request.Context()
	if output, e := s.PerformSearchMetaRequest(ctx, &input); e != nil {
		service.RestError500(req, rsp, e)
	} else {
		rsp.WriteEntity(output)
	}

}

// UserBookmarks searches meta with bookmark namespace and feeds a list of nodes with the results
func (s *UserMetaHandler) UserBookmarks(req *restful.Request, rsp *restful.Response) {

	searchRequest := &idm.SearchUserMetaRequest{
		Namespace: namespace.ReservedNamespaceBookmark,
	}
	router := views.NewUuidRouter(views.RouterOptions{})
	ctx := req.Request.Context()
	output, e := s.PerformSearchMetaRequest(ctx, searchRequest)
	if e != nil {
		service.RestError500(req, rsp, e)
		return
	}
	log.Logger(ctx).Info("Got Bookmarks : ", zap.Any("b", output))
	bulk := &rest.BulkMetaResponse{}
	for _, meta := range output.Metadatas {
		node := &tree.Node{
			Uuid: meta.NodeUuid,
		}
		if resp, e := router.ReadNode(ctx, &tree.ReadNodeRequest{Node: node}); e == nil {
			bulk.Nodes = append(bulk.Nodes, resp.Node.WithoutReservedMetas())
		} else {
			log.Logger(ctx).Error("ReadNode Error : ", zap.Error(e))
		}
	}
	log.Logger(ctx).Info("Return bulk : ", zap.Any("b", bulk))
	rsp.WriteEntity(bulk)

}

func (s *UserMetaHandler) UpdateUserMetaNamespace(req *restful.Request, rsp *restful.Response) {

	var input idm.UpdateUserMetaNamespaceRequest
	if err := req.ReadEntity(&input); err != nil {
		service.RestError500(req, rsp, err)
		return
	}
	ctx := req.Request.Context()
	if value := ctx.Value(claim.ContextKey); value != nil {
		claims := value.(claim.Claims)
		if claims.Profile != "admin" {
			service.RestError403(req, rsp, errors.Forbidden(common.SERVICE_USER_META, "You are not allowed to edit namespaces"))
			return
		}
	}

	nsClient := idm.NewUserMetaServiceClient(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_USER_META, defaults.NewClient())
	response, err := nsClient.UpdateUserMetaNamespace(ctx, &input)
	if err != nil {
		service.RestError500(req, rsp, err)
	} else {
		rsp.WriteEntity(response)
	}

}

func (s *UserMetaHandler) ListUserMetaNamespace(req *restful.Request, rsp *restful.Response) {

	nsClient := idm.NewUserMetaServiceClient(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_USER_META, defaults.NewClient())
	output := &rest.UserMetaNamespaceCollection{}
	if ns, err := s.ListAllNamespaces(req.Request.Context(), nsClient); err == nil {
		for _, n := range ns {
			if n.Namespace == namespace.ReservedNamespaceBookmark {
				continue
			}
			output.Namespaces = append(output.Namespaces, n)
		}
	}
	rsp.WriteEntity(output)

}

func (s *UserMetaHandler) ListUserMetaTags(req *restful.Request, rsp *restful.Response) {
	ns := req.PathParameter("Namespace")
	ctx := req.Request.Context()
	log.Logger(ctx).Info("Listing tags for namespace " + ns)
	tags, _ := s.listTagsForNamespace(ctx, ns)
	rsp.WriteEntity(&rest.ListUserMetaTagsResponse{
		Tags: tags,
	})
}

func (s *UserMetaHandler) PutUserMetaTag(req *restful.Request, rsp *restful.Response) {
	var r rest.PutUserMetaTagRequest
	if e := req.ReadEntity(&r); e != nil {
		service.RestError500(req, rsp, e)
	}
	e := s.putTagsIfNecessary(req.Request.Context(), r.Namespace, []string{r.Tag})
	if e != nil {
		service.RestError500(req, rsp, e)
	} else {
		rsp.WriteEntity(&rest.PutUserMetaTagResponse{Success: true})
	}
}

func (s *UserMetaHandler) listTagsForNamespace(ctx context.Context, namespace string) ([]string, *docstore.Document) {
	docClient := docstore.NewDocStoreClient(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_DOCSTORE, defaults.NewClient())
	var tags []string
	var doc *docstore.Document
	r, e := docClient.GetDocument(ctx, &docstore.GetDocumentRequest{
		StoreID:    MetaTagsDocStoreId,
		DocumentID: namespace,
	})
	if e == nil && r != nil && r.Document != nil {
		doc = r.Document
		var docTags []string
		if e := json.Unmarshal([]byte(r.Document.Data), &docTags); e == nil {
			tags = docTags
		}
	}
	return tags, doc
}

func (s *UserMetaHandler) putTagsIfNecessary(ctx context.Context, namespace string, tags []string) error {
	// Store new tags
	currentTags, storeDocument := s.listTagsForNamespace(ctx, namespace)
	changes := false
	for _, newT := range tags {
		found := false
		for _, crt := range currentTags {
			if crt == newT {
				found = true
				break
			}
		}
		if !found {
			currentTags = append(currentTags, newT)
			changes = true
		}
	}
	if changes {
		// Now store back
		jsonData, _ := json.Marshal(currentTags)
		docClient := docstore.NewDocStoreClient(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_DOCSTORE, defaults.NewClient())
		if storeDocument != nil {
			storeDocument.Data = string(jsonData)
		} else {
			storeDocument = &docstore.Document{
				ID:   namespace,
				Data: string(jsonData),
			}
		}
		_, e := docClient.PutDocument(ctx, &docstore.PutDocumentRequest{
			StoreID:    MetaTagsDocStoreId,
			Document:   storeDocument,
			DocumentID: namespace,
		})
		if e != nil {
			return e
		}
	}
	return nil
}

func (s *UserMetaHandler) DeleteUserMetaTags(req *restful.Request, rsp *restful.Response) {
	ns := req.PathParameter("Namespace")
	tag := req.PathParameter("Tags")
	ctx := req.Request.Context()
	log.Logger(ctx).Info("Delete tags for namespace "+ns, zap.String("tag", tag))
	if tag == "*" {
		docClient := docstore.NewDocStoreClient(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_DOCSTORE, defaults.NewClient())
		if _, e := docClient.DeleteDocuments(ctx, &docstore.DeleteDocumentsRequest{
			StoreID:    MetaTagsDocStoreId,
			DocumentID: ns,
		}); e != nil {
			service.RestError500(req, rsp, e)
			return
		}
	} else {
		service.RestError500(req, rsp, fmt.Errorf("not implemented - please use * to clear all tags"))
		return
	}
	rsp.WriteEntity(&rest.DeleteUserMetaTagsResponse{Success: true})
}

func (s *UserMetaHandler) PerformSearchMetaRequest(ctx context.Context, request *idm.SearchUserMetaRequest) (*rest.UserMetaCollection, error) {

	subjects, e := auth.SubjectsForResourcePolicyQuery(ctx, nil)
	if e != nil {
		return nil, e
	}
	// Append Subjects
	request.ResourceQuery = &serviceproto.ResourcePolicyQuery{
		Subjects: subjects,
	}

	userMetaClient := idm.NewUserMetaServiceClient(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_USER_META, defaults.NewClient())
	stream, er := userMetaClient.SearchUserMeta(ctx, request)
	if er != nil {
		return nil, e
	}
	output := &rest.UserMetaCollection{}
	defer stream.Close()
	for {
		resp, e := stream.Recv()
		if e != nil {
			break
		}
		if resp == nil {
			continue
		}
		output.Metadatas = append(output.Metadatas, resp.UserMeta)
	}

	return output, nil
}

func (s *UserMetaHandler) ListAllNamespaces(ctx context.Context, client idm.UserMetaServiceClient) (map[string]*idm.UserMetaNamespace, error) {

	stream, e := client.ListUserMetaNamespace(ctx, &idm.ListUserMetaNamespaceRequest{})
	if e != nil {
		return nil, e
	}
	result := make(map[string]*idm.UserMetaNamespace)
	defer stream.Close()
	for {
		resp, err := stream.Recv()
		if err != nil {
			break
		}
		if resp == nil {
			continue
		}
		result[resp.UserMetaNamespace.Namespace] = resp.UserMetaNamespace
	}
	return result, nil

}

func (s *UserMetaHandler) PoliciesForMeta(ctx context.Context, resourceId string, resourceClient interface{}) (policies []*serviceproto.ResourcePolicy, e error) {

	return
}
