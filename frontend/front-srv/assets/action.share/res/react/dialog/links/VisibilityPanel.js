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
import React from 'react'
import ShareContextConsumer from '../ShareContextConsumer'
import Pydio from 'pydio'
import Policies from 'pydio/http/policies'
import {ServiceResourcePolicy, ServiceResourcePolicyPolicyEffect} from 'pydio/http/rest-api'
const {ResourcePoliciesPanel} = Pydio.requireLib('components');
import LinkModel from './LinkModel'

let VisibilityPanel = React.createClass({

    /**
     * Update associated hidden users policies, otherwise
     * the public link visibility cannot be changed
     * @param diffPolicies
     */
    onSavePolicies(diffPolicies){

        const {linkModel, pydio} = this.props;
        const internalUser = linkModel.getLink().UserLogin;
        Policies.loadPolicies('user', internalUser).then(policies=>{
            if(policies.length){
                const resourceId = policies[0].Resource;
                const newPolicies = this.diffPolicies(policies, diffPolicies, resourceId);
                Policies.savePolicies('user', internalUser, newPolicies);
            }
        });

    },

    diffPolicies(policies, diffPolicies, resourceId){
        let newPols = [];
        policies.map(p=>{
            const key = p.Action + '///' + p.Subject;
            if (!diffPolicies.remove[key]){
                newPols.push(p);
            }
        });
        Object.keys(diffPolicies.add).map(k=>{
            let newPol = new ServiceResourcePolicy();
            const [action, subject] = k.split('///');
            newPol.Resource = resourceId;
            newPol.Effect = ServiceResourcePolicyPolicyEffect.constructFromObject('allow');
            newPol.Subject = subject;
            newPol.Action = action;
            newPols.push(newPol);
        });
        return newPols;
    },

    render(){

        const {linkModel, pydio} = this.props;
        let subjectsHidden = [];
        subjectsHidden["user:" + linkModel.getLink().UserLogin] = true;
        let subjectDisables = {READ:subjectsHidden, WRITE:subjectsHidden};
        return (
            <div style={this.props.style} title={this.props.getMessage('199')}>
                {linkModel.getLink().Uuid &&
                    <ResourcePoliciesPanel
                        pydio={pydio}
                        resourceType="workspace"
                        resourceId={linkModel.getLink().Uuid}
                        skipTitle={true}
                        onSavePolicies={this.onSavePolicies.bind(this)}
                        subjectsDisabled={subjectDisables}
                        subjectsHidden={subjectsHidden}
                        readonly={this.props.isReadonly() || !linkModel.isEditable()}
                        ref="policies"
                    />
                }
            </div>
        );

    }
});

VisibilityPanel.PropTypes = {
    pydio: React.PropTypes.instanceOf(Pydio).isRequired,
    linkModel: React.PropTypes.instanceOf(LinkModel).isRequired
};

VisibilityPanel = ShareContextConsumer(VisibilityPanel);
export default VisibilityPanel