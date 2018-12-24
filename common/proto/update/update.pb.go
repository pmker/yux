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

// Code generated by protoc-gen-go. DO NOT EDIT.
// source: update.proto

/*
Package update is a generated protocol buffer package.

It is generated from these files:
	update.proto

It has these top-level messages:
	Package
	ApplyUpdateRequest
	ApplyUpdateResponse
	UpdateRequest
	UpdateResponse
	PublishPackageRequest
	PublishPackageResponse
	ListPackagesRequest
	ListPackagesResponse
	DeletePackageRequest
	DeletePackageResponse
*/
package update

import proto "github.com/golang/protobuf/proto"
import fmt "fmt"
import math "math"
import tree "github.com/pmker/yux/common/proto/tree"

// Reference imports to suppress errors if they are not otherwise used.
var _ = proto.Marshal
var _ = fmt.Errorf
var _ = math.Inf

// This is a compile-time assertion to ensure that this generated file
// is compatible with the proto package it is being compiled against.
// A compilation error at this line likely means your copy of the
// proto package needs to be updated.
const _ = proto.ProtoPackageIsVersion2 // please upgrade the proto package

type Package_PackageStatus int32

const (
	Package_Draft    Package_PackageStatus = 0
	Package_Pending  Package_PackageStatus = 1
	Package_Released Package_PackageStatus = 2
)

var Package_PackageStatus_name = map[int32]string{
	0: "Draft",
	1: "Pending",
	2: "Released",
}
var Package_PackageStatus_value = map[string]int32{
	"Draft":    0,
	"Pending":  1,
	"Released": 2,
}

func (x Package_PackageStatus) String() string {
	return proto.EnumName(Package_PackageStatus_name, int32(x))
}
func (Package_PackageStatus) EnumDescriptor() ([]byte, []int) { return fileDescriptor0, []int{0, 0} }

type Package struct {
	// Name of the application
	PackageName string `protobuf:"bytes,1,opt,name=PackageName" json:"PackageName,omitempty"`
	// Version of this new binary
	Version string `protobuf:"bytes,2,opt,name=Version" json:"Version,omitempty"`
	// Release date of the binary
	ReleaseDate int32 `protobuf:"varint,3,opt,name=ReleaseDate" json:"ReleaseDate,omitempty"`
	// Short human-readable description
	Label string `protobuf:"bytes,4,opt,name=Label" json:"Label,omitempty"`
	// Long human-readable description (markdown)
	Description string `protobuf:"bytes,5,opt,name=Description" json:"Description,omitempty"`
	// List or public URL of change logs
	ChangeLog string `protobuf:"bytes,6,opt,name=ChangeLog" json:"ChangeLog,omitempty"`
	// License of this package
	License string `protobuf:"bytes,16,opt,name=License" json:"License,omitempty"`
	// Https URL where to download the binary
	BinaryURL string `protobuf:"bytes,7,opt,name=BinaryURL" json:"BinaryURL,omitempty"`
	// Checksum of the binary to verify its integrity
	BinaryChecksum string `protobuf:"bytes,8,opt,name=BinaryChecksum" json:"BinaryChecksum,omitempty"`
	// Signature of the binary
	BinarySignature string `protobuf:"bytes,9,opt,name=BinarySignature" json:"BinarySignature,omitempty"`
	// Hash type used for the signature
	BinaryHashType string `protobuf:"bytes,10,opt,name=BinaryHashType" json:"BinaryHashType,omitempty"`
	// Size of the binary to download
	BinarySize int64 `protobuf:"varint,15,opt,name=BinarySize" json:"BinarySize,omitempty"`
	// GOOS value used at build time
	BinaryOS string `protobuf:"bytes,17,opt,name=BinaryOS" json:"BinaryOS,omitempty"`
	// GOARCH value used at build time
	BinaryArch string `protobuf:"bytes,18,opt,name=BinaryArch" json:"BinaryArch,omitempty"`
	// Not used : if binary is a patch
	IsPatch bool `protobuf:"varint,11,opt,name=IsPatch" json:"IsPatch,omitempty"`
	// Not used : if a patch, how to patch (bsdiff support)
	PatchAlgorithm string `protobuf:"bytes,12,opt,name=PatchAlgorithm" json:"PatchAlgorithm,omitempty"`
	// Not used : at a point we may deliver services only updates
	ServiceName string                `protobuf:"bytes,13,opt,name=ServiceName" json:"ServiceName,omitempty"`
	Status      Package_PackageStatus `protobuf:"varint,14,opt,name=Status,enum=update.Package_PackageStatus" json:"Status,omitempty"`
}

func (m *Package) Reset()                    { *m = Package{} }
func (m *Package) String() string            { return proto.CompactTextString(m) }
func (*Package) ProtoMessage()               {}
func (*Package) Descriptor() ([]byte, []int) { return fileDescriptor0, []int{0} }

func (m *Package) GetPackageName() string {
	if m != nil {
		return m.PackageName
	}
	return ""
}

func (m *Package) GetVersion() string {
	if m != nil {
		return m.Version
	}
	return ""
}

func (m *Package) GetReleaseDate() int32 {
	if m != nil {
		return m.ReleaseDate
	}
	return 0
}

func (m *Package) GetLabel() string {
	if m != nil {
		return m.Label
	}
	return ""
}

func (m *Package) GetDescription() string {
	if m != nil {
		return m.Description
	}
	return ""
}

func (m *Package) GetChangeLog() string {
	if m != nil {
		return m.ChangeLog
	}
	return ""
}

func (m *Package) GetLicense() string {
	if m != nil {
		return m.License
	}
	return ""
}

func (m *Package) GetBinaryURL() string {
	if m != nil {
		return m.BinaryURL
	}
	return ""
}

func (m *Package) GetBinaryChecksum() string {
	if m != nil {
		return m.BinaryChecksum
	}
	return ""
}

func (m *Package) GetBinarySignature() string {
	if m != nil {
		return m.BinarySignature
	}
	return ""
}

func (m *Package) GetBinaryHashType() string {
	if m != nil {
		return m.BinaryHashType
	}
	return ""
}

func (m *Package) GetBinarySize() int64 {
	if m != nil {
		return m.BinarySize
	}
	return 0
}

func (m *Package) GetBinaryOS() string {
	if m != nil {
		return m.BinaryOS
	}
	return ""
}

func (m *Package) GetBinaryArch() string {
	if m != nil {
		return m.BinaryArch
	}
	return ""
}

func (m *Package) GetIsPatch() bool {
	if m != nil {
		return m.IsPatch
	}
	return false
}

func (m *Package) GetPatchAlgorithm() string {
	if m != nil {
		return m.PatchAlgorithm
	}
	return ""
}

func (m *Package) GetServiceName() string {
	if m != nil {
		return m.ServiceName
	}
	return ""
}

func (m *Package) GetStatus() Package_PackageStatus {
	if m != nil {
		return m.Status
	}
	return Package_Draft
}

type ApplyUpdateRequest struct {
	TargetVersion string `protobuf:"bytes,1,opt,name=TargetVersion" json:"TargetVersion,omitempty"`
}

func (m *ApplyUpdateRequest) Reset()                    { *m = ApplyUpdateRequest{} }
func (m *ApplyUpdateRequest) String() string            { return proto.CompactTextString(m) }
func (*ApplyUpdateRequest) ProtoMessage()               {}
func (*ApplyUpdateRequest) Descriptor() ([]byte, []int) { return fileDescriptor0, []int{1} }

func (m *ApplyUpdateRequest) GetTargetVersion() string {
	if m != nil {
		return m.TargetVersion
	}
	return ""
}

type ApplyUpdateResponse struct {
	Success bool   `protobuf:"varint,1,opt,name=Success" json:"Success,omitempty"`
	Message string `protobuf:"bytes,2,opt,name=Message" json:"Message,omitempty"`
}

func (m *ApplyUpdateResponse) Reset()                    { *m = ApplyUpdateResponse{} }
func (m *ApplyUpdateResponse) String() string            { return proto.CompactTextString(m) }
func (*ApplyUpdateResponse) ProtoMessage()               {}
func (*ApplyUpdateResponse) Descriptor() ([]byte, []int) { return fileDescriptor0, []int{2} }

func (m *ApplyUpdateResponse) GetSuccess() bool {
	if m != nil {
		return m.Success
	}
	return false
}

func (m *ApplyUpdateResponse) GetMessage() string {
	if m != nil {
		return m.Message
	}
	return ""
}

type UpdateRequest struct {
	// Channel name
	Channel string `protobuf:"bytes,1,opt,name=Channel" json:"Channel,omitempty"`
	// Name of the currently running application
	PackageName string `protobuf:"bytes,2,opt,name=PackageName" json:"PackageName,omitempty"`
	// Current version of the application
	CurrentVersion string `protobuf:"bytes,3,opt,name=CurrentVersion" json:"CurrentVersion,omitempty"`
	// Current GOOS
	GOOS string `protobuf:"bytes,4,opt,name=GOOS" json:"GOOS,omitempty"`
	// Current GOARCH
	GOARCH string `protobuf:"bytes,5,opt,name=GOARCH" json:"GOARCH,omitempty"`
	// Not Used : specific service to get updates for
	ServiceName string `protobuf:"bytes,6,opt,name=ServiceName" json:"ServiceName,omitempty"`
	// For enterprise version, info about the current license
	LicenseInfo map[string]string `protobuf:"bytes,7,rep,name=LicenseInfo" json:"LicenseInfo,omitempty" protobuf_key:"bytes,1,opt,name=key" protobuf_val:"bytes,2,opt,name=value"`
}

func (m *UpdateRequest) Reset()                    { *m = UpdateRequest{} }
func (m *UpdateRequest) String() string            { return proto.CompactTextString(m) }
func (*UpdateRequest) ProtoMessage()               {}
func (*UpdateRequest) Descriptor() ([]byte, []int) { return fileDescriptor0, []int{3} }

func (m *UpdateRequest) GetChannel() string {
	if m != nil {
		return m.Channel
	}
	return ""
}

func (m *UpdateRequest) GetPackageName() string {
	if m != nil {
		return m.PackageName
	}
	return ""
}

func (m *UpdateRequest) GetCurrentVersion() string {
	if m != nil {
		return m.CurrentVersion
	}
	return ""
}

func (m *UpdateRequest) GetGOOS() string {
	if m != nil {
		return m.GOOS
	}
	return ""
}

func (m *UpdateRequest) GetGOARCH() string {
	if m != nil {
		return m.GOARCH
	}
	return ""
}

func (m *UpdateRequest) GetServiceName() string {
	if m != nil {
		return m.ServiceName
	}
	return ""
}

func (m *UpdateRequest) GetLicenseInfo() map[string]string {
	if m != nil {
		return m.LicenseInfo
	}
	return nil
}

type UpdateResponse struct {
	Channel string `protobuf:"bytes,1,opt,name=Channel" json:"Channel,omitempty"`
	// List of available binaries
	AvailableBinaries []*Package `protobuf:"bytes,2,rep,name=AvailableBinaries" json:"AvailableBinaries,omitempty"`
}

func (m *UpdateResponse) Reset()                    { *m = UpdateResponse{} }
func (m *UpdateResponse) String() string            { return proto.CompactTextString(m) }
func (*UpdateResponse) ProtoMessage()               {}
func (*UpdateResponse) Descriptor() ([]byte, []int) { return fileDescriptor0, []int{4} }

func (m *UpdateResponse) GetChannel() string {
	if m != nil {
		return m.Channel
	}
	return ""
}

func (m *UpdateResponse) GetAvailableBinaries() []*Package {
	if m != nil {
		return m.AvailableBinaries
	}
	return nil
}

type PublishPackageRequest struct {
	Channel string   `protobuf:"bytes,1,opt,name=Channel" json:"Channel,omitempty"`
	Package *Package `protobuf:"bytes,2,opt,name=Package" json:"Package,omitempty"`
	// Used internally to map to an existing file
	Node *tree.Node `protobuf:"bytes,3,opt,name=Node" json:"Node,omitempty"`
}

func (m *PublishPackageRequest) Reset()                    { *m = PublishPackageRequest{} }
func (m *PublishPackageRequest) String() string            { return proto.CompactTextString(m) }
func (*PublishPackageRequest) ProtoMessage()               {}
func (*PublishPackageRequest) Descriptor() ([]byte, []int) { return fileDescriptor0, []int{5} }

func (m *PublishPackageRequest) GetChannel() string {
	if m != nil {
		return m.Channel
	}
	return ""
}

func (m *PublishPackageRequest) GetPackage() *Package {
	if m != nil {
		return m.Package
	}
	return nil
}

func (m *PublishPackageRequest) GetNode() *tree.Node {
	if m != nil {
		return m.Node
	}
	return nil
}

type PublishPackageResponse struct {
	Success bool     `protobuf:"varint,1,opt,name=Success" json:"Success,omitempty"`
	Package *Package `protobuf:"bytes,2,opt,name=Package" json:"Package,omitempty"`
}

func (m *PublishPackageResponse) Reset()                    { *m = PublishPackageResponse{} }
func (m *PublishPackageResponse) String() string            { return proto.CompactTextString(m) }
func (*PublishPackageResponse) ProtoMessage()               {}
func (*PublishPackageResponse) Descriptor() ([]byte, []int) { return fileDescriptor0, []int{6} }

func (m *PublishPackageResponse) GetSuccess() bool {
	if m != nil {
		return m.Success
	}
	return false
}

func (m *PublishPackageResponse) GetPackage() *Package {
	if m != nil {
		return m.Package
	}
	return nil
}

type ListPackagesRequest struct {
	Channel     string `protobuf:"bytes,1,opt,name=Channel" json:"Channel,omitempty"`
	PackageName string `protobuf:"bytes,2,opt,name=PackageName" json:"PackageName,omitempty"`
}

func (m *ListPackagesRequest) Reset()                    { *m = ListPackagesRequest{} }
func (m *ListPackagesRequest) String() string            { return proto.CompactTextString(m) }
func (*ListPackagesRequest) ProtoMessage()               {}
func (*ListPackagesRequest) Descriptor() ([]byte, []int) { return fileDescriptor0, []int{7} }

func (m *ListPackagesRequest) GetChannel() string {
	if m != nil {
		return m.Channel
	}
	return ""
}

func (m *ListPackagesRequest) GetPackageName() string {
	if m != nil {
		return m.PackageName
	}
	return ""
}

type ListPackagesResponse struct {
	Packages []*Package `protobuf:"bytes,1,rep,name=Packages" json:"Packages,omitempty"`
}

func (m *ListPackagesResponse) Reset()                    { *m = ListPackagesResponse{} }
func (m *ListPackagesResponse) String() string            { return proto.CompactTextString(m) }
func (*ListPackagesResponse) ProtoMessage()               {}
func (*ListPackagesResponse) Descriptor() ([]byte, []int) { return fileDescriptor0, []int{8} }

func (m *ListPackagesResponse) GetPackages() []*Package {
	if m != nil {
		return m.Packages
	}
	return nil
}

type DeletePackageRequest struct {
	Channel     string `protobuf:"bytes,1,opt,name=Channel" json:"Channel,omitempty"`
	PackageName string `protobuf:"bytes,2,opt,name=PackageName" json:"PackageName,omitempty"`
	Version     string `protobuf:"bytes,3,opt,name=Version" json:"Version,omitempty"`
	BinaryOS    string `protobuf:"bytes,4,opt,name=BinaryOS" json:"BinaryOS,omitempty"`
	BinaryArch  string `protobuf:"bytes,5,opt,name=BinaryArch" json:"BinaryArch,omitempty"`
}

func (m *DeletePackageRequest) Reset()                    { *m = DeletePackageRequest{} }
func (m *DeletePackageRequest) String() string            { return proto.CompactTextString(m) }
func (*DeletePackageRequest) ProtoMessage()               {}
func (*DeletePackageRequest) Descriptor() ([]byte, []int) { return fileDescriptor0, []int{9} }

func (m *DeletePackageRequest) GetChannel() string {
	if m != nil {
		return m.Channel
	}
	return ""
}

func (m *DeletePackageRequest) GetPackageName() string {
	if m != nil {
		return m.PackageName
	}
	return ""
}

func (m *DeletePackageRequest) GetVersion() string {
	if m != nil {
		return m.Version
	}
	return ""
}

func (m *DeletePackageRequest) GetBinaryOS() string {
	if m != nil {
		return m.BinaryOS
	}
	return ""
}

func (m *DeletePackageRequest) GetBinaryArch() string {
	if m != nil {
		return m.BinaryArch
	}
	return ""
}

type DeletePackageResponse struct {
	Success bool `protobuf:"varint,2,opt,name=Success" json:"Success,omitempty"`
}

func (m *DeletePackageResponse) Reset()                    { *m = DeletePackageResponse{} }
func (m *DeletePackageResponse) String() string            { return proto.CompactTextString(m) }
func (*DeletePackageResponse) ProtoMessage()               {}
func (*DeletePackageResponse) Descriptor() ([]byte, []int) { return fileDescriptor0, []int{10} }

func (m *DeletePackageResponse) GetSuccess() bool {
	if m != nil {
		return m.Success
	}
	return false
}

func init() {
	proto.RegisterType((*Package)(nil), "update.Package")
	proto.RegisterType((*ApplyUpdateRequest)(nil), "update.ApplyUpdateRequest")
	proto.RegisterType((*ApplyUpdateResponse)(nil), "update.ApplyUpdateResponse")
	proto.RegisterType((*UpdateRequest)(nil), "update.UpdateRequest")
	proto.RegisterType((*UpdateResponse)(nil), "update.UpdateResponse")
	proto.RegisterType((*PublishPackageRequest)(nil), "update.PublishPackageRequest")
	proto.RegisterType((*PublishPackageResponse)(nil), "update.PublishPackageResponse")
	proto.RegisterType((*ListPackagesRequest)(nil), "update.ListPackagesRequest")
	proto.RegisterType((*ListPackagesResponse)(nil), "update.ListPackagesResponse")
	proto.RegisterType((*DeletePackageRequest)(nil), "update.DeletePackageRequest")
	proto.RegisterType((*DeletePackageResponse)(nil), "update.DeletePackageResponse")
	proto.RegisterEnum("update.Package_PackageStatus", Package_PackageStatus_name, Package_PackageStatus_value)
}

func init() { proto.RegisterFile("update.proto", fileDescriptor0) }

var fileDescriptor0 = []byte{
	// 892 bytes of a gzipped FileDescriptorProto
	0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0xff, 0xac, 0x56, 0xdd, 0x6e, 0xe3, 0x44,
	0x14, 0xc6, 0x49, 0xf3, 0xd3, 0x93, 0x26, 0xcd, 0x4e, 0x7f, 0x34, 0x32, 0xbb, 0x55, 0x64, 0xa1,
	0x2a, 0x08, 0x29, 0x11, 0x41, 0x8b, 0xd0, 0x4a, 0x80, 0x42, 0xca, 0x6e, 0x2b, 0x85, 0x4d, 0x71,
	0x76, 0xb9, 0xe3, 0x62, 0xe2, 0x9c, 0x75, 0xac, 0x3a, 0x76, 0xd6, 0x33, 0xae, 0x14, 0xc4, 0x83,
	0x70, 0xc3, 0x3d, 0x8f, 0xc1, 0x3d, 0x2f, 0x85, 0x3c, 0x33, 0x4e, 0x6c, 0x27, 0xa5, 0x8b, 0xb4,
	0x37, 0xed, 0x9c, 0xef, 0xfc, 0x7a, 0xce, 0x77, 0xce, 0x04, 0x8e, 0xe2, 0xd5, 0x9c, 0x09, 0xec,
	0xad, 0xa2, 0x50, 0x84, 0xa4, 0xaa, 0x24, 0xf3, 0x6b, 0xd7, 0x13, 0x8b, 0x78, 0xd6, 0x73, 0xc2,
	0x65, 0x7f, 0xb5, 0x9e, 0x7b, 0x61, 0x9f, 0x63, 0x74, 0xef, 0x39, 0xc8, 0xfb, 0x4e, 0xb8, 0x5c,
	0x86, 0x41, 0x5f, 0xda, 0xf7, 0x45, 0x84, 0x28, 0xff, 0x28, 0x7f, 0xeb, 0xcf, 0x0a, 0xd4, 0x6e,
	0x99, 0x73, 0xc7, 0x5c, 0x24, 0x1d, 0x68, 0xe8, 0xe3, 0x6b, 0xb6, 0x44, 0x6a, 0x74, 0x8c, 0xee,
	0xa1, 0x9d, 0x85, 0x08, 0x85, 0xda, 0x2f, 0x18, 0x71, 0x2f, 0x0c, 0x68, 0x49, 0x6a, 0x53, 0x31,
	0xf1, 0xb5, 0xd1, 0x47, 0xc6, 0xf1, 0x8a, 0x09, 0xa4, 0xe5, 0x8e, 0xd1, 0xad, 0xd8, 0x59, 0x88,
	0x9c, 0x42, 0x65, 0xcc, 0x66, 0xe8, 0xd3, 0x03, 0xe9, 0xa9, 0x84, 0xc4, 0xef, 0x0a, 0xb9, 0x13,
	0x79, 0x2b, 0x91, 0x44, 0xad, 0xa8, 0x9c, 0x19, 0x88, 0x3c, 0x85, 0xc3, 0xd1, 0x82, 0x05, 0x2e,
	0x8e, 0x43, 0x97, 0x56, 0xa5, 0x7e, 0x0b, 0x24, 0x15, 0x8d, 0x3d, 0x07, 0x03, 0x8e, 0xb4, 0xad,
	0x2a, 0xd2, 0x62, 0xe2, 0xf7, 0x83, 0x17, 0xb0, 0x68, 0xfd, 0xd6, 0x1e, 0xd3, 0x9a, 0xf2, 0xdb,
	0x00, 0xe4, 0x12, 0x5a, 0x4a, 0x18, 0x2d, 0xd0, 0xb9, 0xe3, 0xf1, 0x92, 0xd6, 0xa5, 0x49, 0x01,
	0x25, 0x5d, 0x38, 0x56, 0xc8, 0xd4, 0x73, 0x03, 0x26, 0xe2, 0x08, 0xe9, 0xa1, 0x34, 0x2c, 0xc2,
	0xdb, 0x88, 0xd7, 0x8c, 0x2f, 0xde, 0xac, 0x57, 0x48, 0x21, 0x1b, 0x31, 0x45, 0xc9, 0x05, 0x40,
	0xea, 0xfa, 0x1b, 0xd2, 0xe3, 0x8e, 0xd1, 0x2d, 0xdb, 0x19, 0x84, 0x98, 0x50, 0x57, 0xd2, 0x64,
	0x4a, 0x9f, 0xc8, 0x08, 0x1b, 0x79, 0xeb, 0x3b, 0x8c, 0x9c, 0x05, 0x25, 0x52, 0x9b, 0x41, 0x92,
	0xdb, 0xb8, 0xe1, 0xb7, 0x4c, 0x38, 0x0b, 0xda, 0xe8, 0x18, 0xdd, 0xba, 0x9d, 0x8a, 0x49, 0x75,
	0xf2, 0x30, 0xf4, 0xdd, 0x30, 0xf2, 0xc4, 0x62, 0x49, 0x8f, 0x54, 0x75, 0x79, 0x34, 0xe9, 0xc7,
	0x54, 0x11, 0x47, 0x72, 0xa0, 0xa9, 0xfa, 0x91, 0x81, 0xc8, 0x73, 0xa8, 0x4e, 0x05, 0x13, 0x31,
	0xa7, 0xad, 0x8e, 0xd1, 0x6d, 0x0d, 0x9e, 0xf5, 0x34, 0x21, 0x35, 0x51, 0xd2, 0xff, 0xca, 0xc8,
	0xd6, 0xc6, 0xd6, 0x73, 0x68, 0xe6, 0x14, 0xe4, 0x10, 0x2a, 0x57, 0x11, 0x7b, 0x27, 0xda, 0x9f,
	0x90, 0x06, 0xd4, 0x6e, 0x31, 0x98, 0x7b, 0x81, 0xdb, 0x36, 0xc8, 0x11, 0xd4, 0x35, 0x6d, 0xe6,
	0xed, 0x92, 0xf5, 0x02, 0xc8, 0x70, 0xb5, 0xf2, 0xd7, 0x6f, 0x65, 0x0e, 0x1b, 0xdf, 0xc7, 0xc8,
	0x05, 0xf9, 0x0c, 0x9a, 0x6f, 0x58, 0xe4, 0xa2, 0x48, 0xd9, 0xa8, 0xb8, 0x9a, 0x07, 0xad, 0x1b,
	0x38, 0xc9, 0xf9, 0xf2, 0x55, 0x98, 0x10, 0x83, 0x42, 0x6d, 0x1a, 0x3b, 0x0e, 0x72, 0x2e, 0xdd,
	0xea, 0x76, 0x2a, 0x26, 0x9a, 0x9f, 0x90, 0x73, 0xe6, 0x62, 0x4a, 0x6f, 0x2d, 0x5a, 0xff, 0x94,
	0xa0, 0x99, 0x2f, 0x81, 0x42, 0x2d, 0x61, 0x61, 0x80, 0xbe, 0x4e, 0x9e, 0x8a, 0xc5, 0x31, 0x2a,
	0xed, 0x8e, 0xd1, 0x25, 0xb4, 0x46, 0x71, 0x14, 0x61, 0xb0, 0xa9, 0xbf, 0xac, 0x9a, 0x91, 0x47,
	0x09, 0x81, 0x83, 0x57, 0x93, 0xc9, 0x54, 0x4f, 0x8c, 0x3c, 0x93, 0x73, 0xa8, 0xbe, 0x9a, 0x0c,
	0xed, 0xd1, 0xb5, 0x9e, 0x15, 0x2d, 0x15, 0x1b, 0x57, 0xdd, 0x6d, 0xdc, 0x35, 0x34, 0xf4, 0x6c,
	0xdc, 0x04, 0xef, 0x42, 0x5a, 0xeb, 0x94, 0xbb, 0x8d, 0xc1, 0x65, 0xda, 0xbd, 0xdc, 0xd7, 0xf5,
	0x32, 0x86, 0x3f, 0x06, 0x22, 0x5a, 0xdb, 0x59, 0x57, 0xf3, 0x3b, 0x68, 0x17, 0x0d, 0x48, 0x1b,
	0xca, 0x77, 0xb8, 0xd6, 0x77, 0x91, 0x1c, 0x93, 0x81, 0xbf, 0x67, 0x7e, 0x9c, 0xde, 0x80, 0x12,
	0x5e, 0x94, 0xbe, 0x31, 0x2c, 0x0f, 0x5a, 0xbb, 0x3d, 0x79, 0xe0, 0x36, 0xbf, 0x85, 0x27, 0xc3,
	0x7b, 0xe6, 0xf9, 0x6c, 0xe6, 0xa3, 0x64, 0xba, 0x87, 0x9c, 0x96, 0x64, 0xed, 0xc7, 0x05, 0xe6,
	0xd9, 0xbb, 0x96, 0xd6, 0xef, 0x70, 0x76, 0x1b, 0xcf, 0x7c, 0x8f, 0x2f, 0x52, 0xa3, 0x47, 0xfb,
	0xf7, 0xf9, 0x66, 0x23, 0xca, 0xca, 0xf7, 0xe4, 0xd9, 0x6c, 0xcc, 0x0b, 0x38, 0x78, 0x1d, 0xce,
	0xd5, 0xba, 0x6b, 0x0c, 0xa0, 0x27, 0x17, 0x6b, 0x82, 0xd8, 0x12, 0xb7, 0x7e, 0x85, 0xf3, 0x62,
	0xf6, 0x47, 0x49, 0xf8, 0xe1, 0xe9, 0xad, 0x9f, 0xe1, 0x64, 0xec, 0x71, 0xa1, 0x45, 0xfe, 0x11,
	0xa8, 0x69, 0x8d, 0xe0, 0x34, 0x1f, 0x52, 0xd7, 0xfb, 0x05, 0xd4, 0x53, 0x8c, 0x1a, 0xfb, 0x6f,
	0x7f, 0x63, 0x60, 0xfd, 0x65, 0xc0, 0xe9, 0x15, 0xfa, 0x28, 0xf0, 0x83, 0x2f, 0xfd, 0xf1, 0xa1,
	0xc9, 0xbc, 0x3d, 0xe5, 0xfc, 0xdb, 0x93, 0xdd, 0x98, 0x07, 0xff, 0xb9, 0x31, 0x2b, 0xc5, 0x8d,
	0x69, 0x7d, 0x09, 0x67, 0x85, 0x4a, 0x77, 0x1b, 0x54, 0xca, 0x35, 0x68, 0xf0, 0x87, 0x91, 0xee,
	0x02, 0x3d, 0x5d, 0xe4, 0xfb, 0x2d, 0x9f, 0xdf, 0xc7, 0x5e, 0x84, 0x73, 0x72, 0xb6, 0x77, 0xac,
	0xcc, 0xf3, 0x22, 0xac, 0x93, 0xbd, 0x84, 0x46, 0x66, 0x53, 0x11, 0x33, 0x35, 0xdb, 0x5d, 0x7d,
	0xe6, 0xa7, 0x7b, 0x75, 0x2a, 0xce, 0xe0, 0xef, 0x12, 0x9c, 0x6c, 0x4b, 0xc3, 0x28, 0x53, 0xa0,
	0x7c, 0xd1, 0x5e, 0x86, 0x91, 0x4e, 0xf1, 0x3f, 0x0b, 0x9c, 0x40, 0x2b, 0x4f, 0x64, 0xb2, 0x5d,
	0xfb, 0xfb, 0xc6, 0xcb, 0xbc, 0x78, 0x48, 0xad, 0x03, 0xde, 0xc0, 0x51, 0x96, 0x67, 0x64, 0xf3,
	0x59, 0x7b, 0x08, 0x6d, 0x3e, 0xdd, 0xaf, 0xd4, 0xa1, 0xc6, 0xd0, 0xcc, 0xb5, 0x90, 0x6c, 0xcc,
	0xf7, 0x71, 0xd0, 0x7c, 0xf6, 0x80, 0x56, 0x45, 0x9b, 0x55, 0xe5, 0xef, 0xa2, 0xaf, 0xfe, 0x0d,
	0x00, 0x00, 0xff, 0xff, 0x43, 0x6b, 0x45, 0x72, 0x67, 0x09, 0x00, 0x00,
}
