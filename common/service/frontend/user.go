package frontend

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"

	"go.uber.org/zap"

	"github.com/pmker/yux/common"
	"github.com/pmker/yux/common/auth/claim"
	"github.com/pmker/yux/common/config"
	"github.com/pmker/yux/common/log"
	"github.com/pmker/yux/common/proto/idm"
	"github.com/pmker/yux/common/utils"
	"github.com/pmker/yux/common/views"
)

type User struct {
	Logged           bool
	Claims           claim.Claims
	AccessList       *utils.AccessList
	Workspaces       map[string]*Workspace
	UserObject       *idm.User
	ActiveWorkspace  string
	ActiveAccessType string
}

type Workspace struct {
	idm.Workspace
	AccessType  string
	AccessRight string
}

func (u *User) Load(ctx context.Context) error {

	u.Workspaces = make(map[string]*Workspace)

	claims, ok := ctx.Value(claim.ContextKey).(claim.Claims)
	if !ok {
		// No user logged
		return nil
	}
	u.Logged = true
	u.Claims = claims

	// Load user object
	userName, _ := utils.FindUserNameInContext(ctx)
	if user, err := utils.SearchUniqueUser(ctx, userName, ""); err != nil {
		return err
	} else {
		u.UserObject = user
	}

	accessList, err := utils.AccessListFromContextClaims(ctx)
	if err != nil {
		return err
	}
	u.AccessList = accessList
	u.LoadWorkspaces(ctx, u.AccessList)

	utils.AccessListLoadFrontValues(ctx, u.AccessList)

	return nil
}

func (u *User) GetActiveScopes() (scopes []string) {

	if u.ActiveWorkspace == "" {
		return
	}
	ws := u.Workspaces[u.ActiveWorkspace]
	if ws.Scope != idm.WorkspaceScope_ADMIN {
		scopes = append(scopes, "PYDIO_REPO_SCOPE_ALL")
		scopes = append(scopes, "PYDIO_REPO_SCOPE_SHARED")
	} else {
		scopes = append(scopes, "PYDIO_REPO_SCOPE_ALL")
	}
	scopes = append(scopes, ws.UUID)

	return
}

func (u *User) LoadActiveWorkspace(parameter string) {

	if ws, ok := u.Workspaces[parameter]; ok {
		u.ActiveWorkspace = parameter
		u.ActiveAccessType = ws.AccessType
		return
	}
	// Check by slug
	for _, ws := range u.Workspaces {
		if ws.Slug == parameter {
			u.ActiveWorkspace = ws.UUID
			u.ActiveAccessType = ws.AccessType
			return
		}
	}
	// Load default repository from preferences, or start on home page
	var defaultStart = "homepage"
	configs := u.FlattenedRolesConfigs().Get("parameters").(*config.Map)

	if c := configs.Get("core.conf"); c != nil {
		if p := c.(*config.Map).Get("DEFAULT_START_REPOSITORY"); p != nil {
			if v := p.(*config.Map).String("PYDIO_REPO_SCOPE_ALL"); v != "" {
				if _, ok := u.Workspaces[v]; ok {
					defaultStart = v
				}
			}
		}
	}

	if ws, ok := u.Workspaces[defaultStart]; ok {
		u.ActiveWorkspace = defaultStart
		u.ActiveAccessType = ws.AccessType
		return
	}
	// Take first value
	for id, ws := range u.Workspaces {
		u.ActiveWorkspace = id
		u.ActiveAccessType = ws.AccessType
		return
	}

}

func (u *User) LoadActiveLanguage(parameter string) string {
	if parameter != "" {
		return parameter
	}
	lang := "en"
	configs := u.FlattenedRolesConfigs().Get("parameters").(*config.Map)
	if c := configs.Get("core.conf"); c != nil {
		if p := c.(*config.Map).Get("lang"); p != nil {
			if v := p.(*config.Map).String("PYDIO_REPO_SCOPE_ALL"); v != "" {
				lang = v
			}
		}
	}
	return lang
}

func (u *User) FlattenedRolesConfigs() *config.Map {
	if u.Logged {
		return u.FlattenedFrontValues()
	} else {
		c := config.NewMap()
		c.Set("actions", config.NewMap())
		c.Set("parameters", config.NewMap())
		return c
	}
}

// FlattenedFrontValues generates a config.Map with frontend actions/parameters configs
func (u *User) FlattenedFrontValues() *config.Map {
	actions := config.NewMap()
	parameters := config.NewMap()
	a := u.AccessList
	for _, role := range a.OrderedRoles {
		for _, acl := range a.FrontPluginsValues {
			if acl.RoleID != role.Uuid {
				continue
			}
			name := acl.Action.Name
			value := acl.Action.Value
			scope := acl.WorkspaceID
			var iVal interface{}
			if e := json.Unmarshal([]byte(value), &iVal); e != nil {
				// May not be marshalled, use original string instead
				iVal = value
			}
			parts := strings.Split(name, ":")
			t := parts[0]
			p := parts[1]
			n := parts[2]
			var plugins *config.Map
			if t == "action" {
				plugins = actions
			} else {
				plugins = parameters
			}
			if plugs := plugins.Get(p); plugs != nil {
				plugins = plugs.(*config.Map)
			} else {
				plugins = config.NewMap()
			}
			var param *config.Map
			if sc := plugins.Get(n); sc != nil {
				param = sc.(*config.Map)
			} else {
				param = config.NewMap()
			}
			param.Set(scope, iVal)
			plugins.Set(n, param)
			if t == "action" {
				actions.Set(p, plugins)
			} else {
				parameters.Set(p, plugins)
			}
		}
	}
	output := config.NewMap()
	output.Set("actions", actions)
	output.Set("parameters", parameters)
	return output
}

func (u *User) LoadWorkspaces(ctx context.Context, accessList *utils.AccessList) error {

	workspacesAccesses := accessList.GetAccessibleWorkspaces(ctx)
	for wsId, _ := range workspacesAccesses {
		if wsId == "settings" || wsId == "homepage" {
			slug := "settings"
			if wsId == "homepage" {
				slug = "welcome"
			}
			ws := &idm.Workspace{
				Scope: idm.WorkspaceScope_ADMIN,
				UUID:  wsId,
				Slug:  slug,
				Label: wsId,
			}
			workspace := &Workspace{
				AccessType:  wsId,
				AccessRight: "rw",
			}
			workspace.Workspace = *ws
			u.Workspaces[wsId] = workspace
		} else {
			aclWs, ok := accessList.Workspaces[wsId]
			if !ok {
				log.Logger(ctx).Error("something went wrong, access list refers to unknown workspace", zap.Any("AccessList", accessList))
				return fmt.Errorf("something went wrong, access list refers to unknown workspace")
			}
			access := workspacesAccesses[aclWs.UUID]
			access = strings.Replace(access, "read", "r", -1)
			access = strings.Replace(access, "write", "w", -1)
			access = strings.Replace(access, ",", "", -1)
			ws := &Workspace{}
			ws.Workspace = *aclWs
			ws.AccessRight = access
			ws.AccessType = "gateway"
			u.Workspaces[wsId] = ws
		}
	}
	return nil
}

func (u *User) Publish(status RequestStatus, pool *PluginsPool) *Cuser {
	if !u.Logged {
		return nil
	}
	reg := &Cuser{
		Attrid:        u.UserObject.Login,
		Crepositories: &Crepositories{},
		Cpreferences:  &Cpreferences{},
	}
	if u.Claims.Profile == common.PYDIO_PROFILE_ADMIN {
		reg.Cspecial_rights = &Cspecial_rights{
			Attris_admin: "1",
		}
	}
	reg.Cpreferences.Cpref = u.publishPreferences(status, pool)

	// Add locks info
	var hasLock bool
	if l, ok := u.UserObject.Attributes["locks"]; ok {
		var locks []string
		if e := json.Unmarshal([]byte(l), &locks); e == nil {
			if len(locks) > 0 {
				if reg.Cspecial_rights == nil {
					reg.Cspecial_rights = &Cspecial_rights{}
				}
				reg.Cspecial_rights.Attrlock = strings.Join(locks, ",")
				hasLock = true
			}
		}
	}
	if !hasLock {
		reg.Cactive_repo = &Cactive_repo{
			Attrid: u.ActiveWorkspace,
		}
		reg.Crepositories.Crepo = u.publishWorkspaces(status, pool)
	}

	return reg
}

func (u *User) publishPreferences(status RequestStatus, pool *PluginsPool) (preferencesNodes []*Cpref) {

	if preferences, ok := u.UserObject.Attributes["preferences"]; ok {
		var userPrefs map[string]string
		if e := json.Unmarshal([]byte(preferences), &userPrefs); e == nil {
			for k, v := range userPrefs {
				if k == "gui_preferences" {
					if decoded, e := base64.StdEncoding.DecodeString(v); e == nil {
						preferencesNodes = append(preferencesNodes, &Cpref{
							Attrname: k,
							Cdata:    string(decoded),
						})
					}
				} else {
					preferencesNodes = append(preferencesNodes, &Cpref{
						Attrname:  k,
						Attrvalue: v,
					})
				}
			}
		}
	}
	for _, exposed := range pool.ExposedParametersByScope("user", true) {
		if exposed.Attrscope == "user" {
			if pref, ok := u.UserObject.Attributes[exposed.Attrname]; ok {
				preferencesNodes = append(preferencesNodes, &Cpref{
					Attrname:     exposed.Attrname,
					Attrvalue:    pref,
					AttrpluginId: exposed.PluginId,
				})
			}
		} else {
			plugin := pool.Plugins[exposed.PluginId]
			pref := plugin.PluginConfig(status, &exposed.Cglobal_param)
			if exposed.Attrtype == "string" || exposed.Attrtype == "select" || exposed.Attrtype == "autocomplete" {
				preferencesNodes = append(preferencesNodes, &Cpref{
					Attrname:     exposed.Attrname,
					Attrvalue:    pref.(string),
					AttrpluginId: exposed.PluginId,
				})
			} else {
				marsh, _ := json.Marshal(pref)
				preferencesNodes = append(preferencesNodes, &Cpref{
					Attrname:     exposed.Attrname,
					AttrpluginId: exposed.PluginId,
					Cdata:        string(marsh),
				})
			}
		}
	}

	return
}

func (u *User) publishWorkspaces(status RequestStatus, pool *PluginsPool) (workspaceNodes []*Crepo) {

	accessSettings := make(map[string]*Cclient_settings)
	for _, p := range pool.Plugins {
		if strings.HasPrefix(p.GetId(), "access.") {
			accessSettings[strings.TrimPrefix(p.GetId(), "access.")] = p.GetClientSettings()
		}
	}

	// Used to detect "personal files"-like workspace
	vNodeManager := views.GetVirtualNodesManager()

	for _, ws := range u.Workspaces {
		repo := &Crepo{
			Attrid:             ws.UUID,
			Attraccess_type:    ws.AccessType,
			AttrrepositorySlug: ws.Slug,
			Clabel:             &Clabel{Cdata: ws.Label},
		}
		if cSettings, ok := accessSettings[ws.AccessType]; ok {
			repo.Cclient_settings = cSettings
		}
		if ws.Description != "" {
			repo.Cdescription = &Cdescription{Cdata: ws.Description}
		}
		if ws.Scope != idm.WorkspaceScope_ADMIN {
			repo.Attrowner = "shared"
			repo.Attruser_editable_repository = "true"
			repo.Attrrepository_type = "cell"
		} else {
			repo.Attrrepository_type = "workspace"
			if len(ws.RootUUIDs) == 1 {
				if _, ok := vNodeManager.ByUuid(ws.RootUUIDs[0]); ok {
					repo.Attrrepository_type = "workspace-personal"
				}
			}
		}
		repo.Attracl = ws.AccessRight
		if ws.AccessType == "gateway" && strings.Contains(ws.AccessRight, "w") {
			repo.AttrallowCrossRepositoryCopy = "true"
		}
		workspaceNodes = append(workspaceNodes, repo)
	}

	return
}
