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

package endpoints

import (
	"os"
	"path/filepath"
	"time"

	"github.com/pydio/minio-go"
)

type S3FileInfo struct {
	Object minio.ObjectInfo
	isDir  bool
}

// base name of the file
func (s *S3FileInfo) Name() string {
	if s.isDir {
		return filepath.Base(s.Object.Key)
	} else {
		return s.Object.Key
	}
}

// length in bytes for regular files; system-dependent for others
func (s *S3FileInfo) Size() int64 {
	return s.Object.Size
}

// file mode bits
func (s *S3FileInfo) Mode() os.FileMode {
	if s.isDir {
		return os.ModePerm & os.ModeDir
	} else {
		return os.ModePerm
	}

}

// modification time
func (s *S3FileInfo) ModTime() time.Time {
	return s.Object.LastModified
}

// abbreviation for Mode().IsDir()
func (s *S3FileInfo) IsDir() bool {
	return s.isDir
}

// underlying data source (can return nil)
func (s *S3FileInfo) Sys() interface{} {
	return s.Object
}

func NewS3FileInfo(object minio.ObjectInfo) *S3FileInfo {
	return &S3FileInfo{
		Object: object,
		isDir:  false,
	}
}

func NewS3FolderInfo(object minio.ObjectInfo) *S3FileInfo {
	return &S3FileInfo{
		Object: object,
		isDir:  true,
	}
}
