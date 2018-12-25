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
import React from 'react';
import {Divider} from 'material-ui';

const { PydioContextConsumer } = Pydio.requireLib('boot');
const { InfoPanelCard } = Pydio.requireLib('workspaces');
import ActivityList from './ActivityList'


class InfoPanel extends React.Component {

    render(){
        const {node, pydio} = this.props;

        return (
            <InfoPanelCard identifier={"activity"} title={node.isLeaf()?pydio.MessageHash['notification_center.11']:pydio.MessageHash['notification_center.10']}>
                <ActivityList
                    context="NODE_ID"
                    contextData={node.getMetadata().get('uuid')}
                    boxName="outbox"
                    style={{overflowY:'scroll', maxHeight: 380}}
                    listContext={"NODE-" + (node.isLeaf() ? "LEAF" : "COLLECTION")}
                    pointOfView={"ACTOR"}
                    displayContext="infoPanel"
                />
            </InfoPanelCard>
        );
    }

}

InfoPanel = PydioContextConsumer(InfoPanel);
export {InfoPanel as default}