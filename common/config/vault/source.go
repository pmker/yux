package vault

import (
	"crypto/md5"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"sync"
	"time"

	"os"

	"github.com/pydio/cells/common"
	"github.com/pydio/cells/common/config/file"
	"github.com/pydio/cells/common/crypto"
	"github.com/pydio/go-os/config"
)

type VaultSource struct {
	opts         config.SourceOptions
	skipKeyring  bool
	storePath    string
	vaultKeyPath string
	masterPass   []byte

	data     map[string]string
	dataLock *sync.Mutex
}

func NewVaultSource(storePath string, keyPath string, skipKeyring bool, opts ...config.SourceOption) *VaultSource {

	var options config.SourceOptions
	for _, o := range opts {
		o(&options)
	}

	if len(options.Name) == 0 {
		options.Name = config.DefaultSourceName
	}

	v := &VaultSource{
		opts:         options,
		storePath:    storePath,
		vaultKeyPath: keyPath,
		skipKeyring:  skipKeyring,
		data:         make(map[string]string),
		dataLock:     &sync.Mutex{},
	}

	v.initMasterPassword()

	return v
}

// Loads ChangeSet from the source
func (v *VaultSource) Read() (*config.ChangeSet, error) {

	// Now load data and decypher
	v.dataLock.Lock()
	defer v.dataLock.Unlock()

	content, err := ioutil.ReadFile(v.storePath)
	if err == nil {
		var data map[string]string
		if e := json.Unmarshal(content, &data); e != nil {
			return nil, e
		}
		for k, val := range data {
			if dec, e := v.decrypt(val); e == nil {
				v.data[k] = string(dec)
			}
		}

	}
	// Add masterPassword for backward compatibility
	v.data["masterPassword"] = string(v.masterPass)

	b, err := json.Marshal(v.data)
	if err != nil {
		return nil, err
	}
	h := md5.New()
	h.Write(b)
	checksum := fmt.Sprintf("%x", h.Sum(nil))

	return &config.ChangeSet{
		Source:    "vault",
		Timestamp: time.Now(),
		Data:      b,
		Checksum:  checksum,
	}, nil
}

// Watch for source changes Returns the entire changeset
func (v *VaultSource) Watch() (config.SourceWatcher, error) {
	return nil, nil
}

// Name of source
func (v *VaultSource) String() string {
	return "vault"
}

// additional methods for Setters

// Set sets a key/value in memory (not encrypted)
func (v *VaultSource) Set(key string, value string, save bool) error {
	v.dataLock.Lock()
	defer v.dataLock.Unlock()
	v.data[key] = value
	if save {
		return v.save()
	} else {
		return nil
	}
}

// Delete removes a key from memory
func (v *VaultSource) Delete(key string, save bool) error {
	v.dataLock.Lock()
	defer v.dataLock.Unlock()
	delete(v.data, key)
	if save {
		return v.save()
	} else {
		return nil
	}
}

// Save encrypts values and save to file
func (v *VaultSource) save() error {
	data := make(map[string]interface{})
	for k, val := range v.data {
		if k == "masterPassword" {
			continue
		}
		enc, e := v.encrypt([]byte(val))
		if e != nil {
			return e
		}
		data[k] = enc
	}
	return file.Save(v.storePath, data)
}

func (v *VaultSource) initMasterPassword() {

	var kPass []byte
	if !v.skipKeyring {
		var e error
		kPass, e = crypto.GetKeyringPassword(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_USER_KEY, common.KEYRING_MASTER_KEY, false)
		// Keyring seems accessible - use it
		if e == nil && len(kPass) == 0 {
			// Check if it may have been already initiated without keyring previously
			if fPass := v.getStorePassword(false); len(fPass) > 0 {
				if e := crypto.SetKeyringPassword(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_USER_KEY, common.KEYRING_MASTER_KEY, fPass); e == nil {
					fmt.Println("Migrated master key from local storage to keyring - removing stored file")
					os.Remove(v.vaultKeyPath)
					kPass = fPass
				} else {
					fmt.Println("Tried to store master key in keyring but it failed - switching to local storage")
				}
			} else {
				fmt.Println("Generating a new master key from keyring")
				if kPass, e = crypto.GetKeyringPassword(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_USER_KEY, common.KEYRING_MASTER_KEY, true); e != nil {
					fmt.Println("Tried to generate master key in keyring but it failed - switching to local storage")
				}
			}
		}
	}

	if kPass == nil || len(kPass) == 0 {
		kPass = v.getStorePassword(true)
	}
	v.masterPass = kPass

}

// getStorePassword gets or generate a master key from file instead of keyring
func (v *VaultSource) getStorePassword(createIfNotExists bool) []byte {
	if s, e := ioutil.ReadFile(v.vaultKeyPath); e == nil {
		return s
	} else if createIfNotExists {
		fmt.Println("Cannot find vaultKeyPath, creating new one", v.vaultKeyPath)
		k := v.generateStorePassword()
		fmt.Println("**************************************************************")
		fmt.Println("     Warning! A keyring is not found on this machine,         ")
		fmt.Println(" 	A Master Key has been created for cyphering secrets       ")
		fmt.Println("   It has been stored in " + v.vaultKeyPath + "               ")
		fmt.Println("   Please make sure to secure this file and update the configs")
		fmt.Println("   with its new location, under the defaults/keyPath key.     ")
		fmt.Println("***************************************************************")

		ioutil.WriteFile(v.vaultKeyPath, k, 0400)
		return k
	}
	return []byte{}
}

// generateStorePassword creates a new random password for encryption
func (v *VaultSource) generateStorePassword() []byte {
	pass, _ := crypto.RandomBytes(50)
	return pass
}

// encrypt encrypts and base64 encode result to string
func (v *VaultSource) encrypt(data []byte) (string, error) {
	sealed, e := crypto.Seal(crypto.KeyFromPassword(v.masterPass, 32), data)
	if e != nil {
		return "", e
	}
	return base64.StdEncoding.EncodeToString(sealed), nil
}

// encrypt base64 decode and decrypt result to []byte
func (v *VaultSource) decrypt(value string) ([]byte, error) {
	if data, e := base64.StdEncoding.DecodeString(value); e != nil {
		return []byte{}, e
	} else {
		return crypto.Open(crypto.KeyFromPassword(v.masterPass, 32), data[:12], data[12:])
	}
}
