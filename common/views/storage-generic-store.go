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

package views

import (
	"context"

	"github.com/micro/go-micro/client"
	"github.com/micro/go-micro/errors"
	"github.com/pydio/minio-go"

	"github.com/pmker/yux/common"
	config2 "github.com/pmker/yux/common/config"
	"github.com/pmker/yux/common/proto/object"
)

func GetGenericStoreClient(ctx context.Context, storeNamespace string, microClient client.Client) (client *minio.Core, bucket string, e error) {

	var dataSource string
	var err error
	dataSource, bucket, err = GetGenericStoreClientConfig(storeNamespace)
	if err != nil {
		return nil, "", err
	}

	s3endpointClient := object.NewDataSourceEndpointClient(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_DATA_SYNC_+dataSource, microClient)
	response, err := s3endpointClient.GetDataSourceConfig(ctx, &object.GetDataSourceConfigRequest{})
	if err != nil {
		return nil, "", err
	}

	source := response.DataSource

	client, err = source.CreateClient()
	return client, bucket, err

}

func GetGenericStoreClientConfig(storeNamespace string) (dataSource string, bucket string, e error) {

	// TMP - TO BE FIXED
	var configKey string
	switch storeNamespace {
	case common.PYDIO_DOCSTORE_BINARIES_NAMESPACE:
		configKey = "pydio.docstore-binaries"
		break
	case common.PYDIO_THUMBSTORE_NAMESPACE:
		configKey = "pydio.thumbs_store"
		break
	default:
		configKey = "pydio." + storeNamespace
		break
	}

	var cfg config2.Map

	if err := config2.Default().Get("services", configKey).Scan(&cfg); err != nil {
		return "", "", err
	}
	if cfg == nil {
		return "", "", errors.NotFound(VIEWS_LIBRARY_NAME, "Cannot find default config for services")
	}

	dataSource = cfg.Get("datasource").(string)
	if dataSource == "default" {
		dataSource = config2.Default().Get("defaults", "datasource").String("default")
	}

	bucket = cfg.Get("bucket").(string)

	return dataSource, bucket, nil
}
