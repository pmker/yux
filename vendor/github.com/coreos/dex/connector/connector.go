// Package connector defines interfaces for federated identity strategies.
package connector

import (
	"context"
	"net/http"
	"strings"
)

// Connector is a mechanism for federating login to a remote identity service.
//
// Implementations are expected to implement either the PasswordConnector or
// CallbackConnector interface.
type Connector interface{}

// Scopes represents additional data requested by the clients about the end user.
type Scopes struct {
	// The client has requested a refresh token from the server.
	OfflineAccess bool

	// The client has requested group information about the end user.
	Groups  bool
	OpenID  bool
	Profile bool
	Email   bool
	Pydio   bool
}

// Identity represents the ID Token claims supported by the server.
// Should be added
type Identity struct {
	UserID        string
	Username      string
	Email         string
	EmailVerified bool

	Groups []string

	// Additional claims for Pydio
	// To be added
	//Uuid 			string
	AuthSource  string
	DisplayName string
	Profile 	string
	Roles       []string
	GroupPath   string

	// ConnectorData holds data used by the connector for subsequent requests after initial
	// authentication, such as access tokens for upstream provides.
	//
	// This data is never shared with end users, OAuth clients, or through the API.
	ConnectorData []byte
}

// PasswordConnector is an interface implemented by connectors which take a
// username and password.
type PasswordConnector interface {
	Login(ctx context.Context, s Scopes, username, password string) (identity Identity, validPassword bool, err error)
}

// CallbackConnector is an interface implemented by connectors which use an OAuth
// style redirect flow to determine user information.
type CallbackConnector interface {
	// The initial URL to redirect the user to.
	//
	// OAuth2 implementations should request different scopes from the upstream
	// identity provider based on the scopes requested by the downstream client.
	// For example, if the downstream client requests a refresh token from the
	// server, the connector should also request a token from the provider.
	//
	// Many identity providers have arbitrary restrictions on refresh tokens. For
	// example Google only allows a single refresh token per client/user/scopes
	// combination, and wont return a refresh token even if offline access is
	// requested if one has already been issues. There's no good general answer
	// for these kind of restrictions, and may require this package to become more
	// aware of the global set of user/connector interactions.
	LoginURL(s Scopes, callbackURL, state string) (string, error)

	// Handle the callback to the server and return an identity.
	HandleCallback(s Scopes, r *http.Request) (identity Identity, err error)
}

// SAMLConnector represents SAML connectors which implement the HTTP POST binding.
//  RelayState is handled by the server.
//
// See: https://docs.oasis-open.org/security/saml/v2.0/saml-bindings-2.0-os.pdf
// "3.5 HTTP POST Binding"
type SAMLConnector interface {
	// POSTData returns an encoded SAML request and SSO URL for the server to
	// render a POST form with.
	//
	// POSTData should encode the provided request ID in the returned serialized
	// SAML request.
	POSTData(s Scopes, requestID string) (sooURL, samlRequest string, err error)

	// HandlePOST decodes, verifies, and maps attributes from the SAML response.
	// It passes the expected value of the "InResponseTo" response field, which
	// the connector must ensure matches the response value.
	//
	// See: https://www.oasis-open.org/committees/download.php/35711/sstc-saml-core-errata-2.0-wd-06-diff.pdf
	// "3.2.2 Complex Type StatusResponseType"
	HandlePOST(s Scopes, samlResponse, inResponseTo string) (identity Identity, err error)
}

// RefreshConnector is a connector that can update the client claims.
type RefreshConnector interface {
	// Refresh is called when a client attempts to claim a refresh token. The
	// connector should attempt to update the identity object to reflect any
	// changes since the token was last refreshed.
	Refresh(ctx context.Context, s Scopes, identity Identity) (Identity, error)
}

// Pydio
func SetAttribute(i *Identity, attName string, attVal []string) (err error) {
	if len(attVal) == 0 {
		return nil
	}

	switch strings.TrimSpace(attName) {
	case "UserID":
		i.UserID = attVal[0]
	case "UserName":
		i.Username = attVal[0]
	case "Email":
		i.Email = attVal[0]
		//case "EmailVerified":
		//	i.EmailVerified = true
	case "AuthSource":
		i.AuthSource = attVal[0]
	case "DisplayName":
		i.DisplayName = attVal[0]
	case "GroupPath":
		i.GroupPath = attVal[0]
	case "Profile":
		i.Profile = attVal[0]

	case "Roles":
		if len(attVal) > 0 {
			for _, val := range attVal {
				i.Roles = append(i.Roles, strings.TrimSpace(val))
			}
		}
	default:
	}
	return nil
}
