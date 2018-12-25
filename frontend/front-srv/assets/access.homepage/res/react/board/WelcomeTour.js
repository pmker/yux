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

import {Component} from 'react'
import Pydio from 'pydio'
const {AsyncComponent, PydioContextConsumer} = Pydio.requireLib('boot');

class Scheme extends Component {

    render(){
        let style = {
            position:'relative',
            fontSize: 24,
            width: this.props.dimension || 100,
            height: this.props.dimension || 100,
            backgroundColor: '#ECEFF1',
            color: '#607d8b',
            borderRadius: '50%',
            margin: '0 auto'
        };
        return (
            <div style={{...style, ...this.props.style}}>{this.props.children}</div>
        );
    }

}

let WorkspacesCard = (props) => {

    const renderRay = (angle) => {
        return (
            <div style={{position:'absolute', top: 52, left: 20, width: 80, display:'flex', transformOrigin:'left', transform:'rotate('+(-angle)+'deg)'}}>
                <span style={{flex:1}}/>
                <span className="mdi mdi-dots-horizontal" style={{opacity:.5, marginRight:5}}/>
                <span style={{display:'inline-block', transform:'rotate('+angle+'deg)'}} className="mdi mdi-account"/>
            </div>
        )
    };

    return (
        <div>
            <p>{props.message('workspaces.1')}</p>
            <Scheme dimension={130}>
                <span style={{position:'absolute', top: 52, left: 20}} className="mdi mdi-network"/>
                {renderRay(30)}
                {renderRay(0)}
                {renderRay(-30)}
            </Scheme>
            <p>{props.message('workspaces.2')}</p>
            <Scheme dimension={130}>
                <span className="mdi mdi-account" style={{position:'absolute', left: 54, top: 32}}/>
                <div style={{position:'absolute', top: 60, left:30}}>
                    <span className="mdi mdi-folder"/>
                    <span className="mdi mdi-arrow-right"/>
                    <span className="mdi mdi-network"/>
                </div>
            </Scheme>
        </div>
    );

};


let SearchCard = (props) => {

    return (
        <div>
            <p>{props.message('globsearch.1')}</p>
            <Scheme style={{fontSize: 10, padding: 25}} dimension={130}>
                <div style={{boxShadow:'2px 2px 0px #CFD8DC'}}>
                    <div style={{backgroundColor: '#03a9f4', color: 'white', borderRadius: '3px 3px 0 0'}}><span className="mdi mdi-magnify"/>{props.message('infopanel.search')}...</div>
                    <div style={{backgroundColor:'white'}}>
                        <div><span className="mdi mdi-folder"/> {props.message('infopanel.folder')} 1 </div>
                        <div><span className="mdi mdi-folder"/>  {props.message('infopanel.file')} 2</div>
                        <div><span className="mdi mdi-file"/> {props.message('infopanel.file')} 3</div>
                    </div>
                </div>
            </Scheme>
            <p>{props.message('globsearch.2')}</p>
        </div>
    );

};

let WidgetsCard = (props) => {

    return (
        <div>
            <p>{props.message('widget-cards')}</p>
            <Scheme>
                <img src="plug/access.homepage/res/images/movecards.gif" style={{height:70, margin:'15px 30px'}}/>
            </Scheme>
        </div>
    );

};

class WelcomeTour extends Component{

    constructor(props, context){
        super(props, context);
        this.state = {started: !(props.pydio.user && !props.pydio.user.getPreference('gui_preferences', true)['UserAccount.WelcomeModal.Shown'])};
    }

    componentDidMount(){
        if(!this.state.started){
            pydio.UI.openComponentInModal('UserAccount', 'WelcomeModal', {
                onRequestStart:(skip) => {
                    if(skip) {
                        this.discard(true);
                    }else{
                        this.discard(false);
                        this.setState({started: true});
                    }
                }
            });
        }
    }

    discard(finished = false){
        const {user} =  this.props.pydio;
        let guiPrefs = user.getPreference('gui_preferences', true);
        guiPrefs['UserAccount.WelcomeModal.Shown'] = true;
        if(finished) guiPrefs['WelcomeComponent.Pydio8.TourGuide.Welcome'] = true;
        user.setPreference('gui_preferences', guiPrefs, true);
        user.savePreference('gui_preferences');
    }

    render(){

        if(!this.state.started){
            return null;
        }
        const {getMessage} = this.props;
        const message = (id) => getMessage('ajax_gui.tour.' + id);
        const widgetBarEnabled = !!! this.props.pydio.getPluginConfigs('access.homepage').get('DISABLE_WIDGET_BAR');

        let tourguideSteps = [
            {
                title       : message('workspaces.title'),
                text        : <WorkspacesCard message={message}/>,
                selector    :'.user-workspaces-list',
                position    :'right'
            },
            {
                title       : message('globsearch.title'),
                text        : <SearchCard message={message}/>,
                selector    : '.home-search-form',
                position    : 'bottom'
            },
        ];
        if(this.props.pydio.user){
            let hasAccessRepo = false;
            this.props.pydio.user.getRepositoriesList().forEach((entry) => {
                if(entry.accessType === "gateway"){
                    hasAccessRepo = true;
                }
            });
            if(hasAccessRepo){
                tourguideSteps.push({
                        title       : message('openworkspace.title'),
                        text        : message('openworkspace'),
                        selector    : '.workspace-entry',
                        position    : 'right'
                });
            }
        }

        const callback = (data) => {
            if(data.type === 'step:after' && data.index === tourguideSteps.length - 1 ){
                this.discard(true);
            }
        };
        return (
            <AsyncComponent
                namespace="PydioWorkspaces"
                componentName="TourGuide"
                ref="joyride"
                steps={tourguideSteps}
                run={true} // or some other boolean for when you want to start it
                autoStart={true}
                debug={false}
                callback={callback}
                type='continuous'
            />
        );


    }

}

WelcomeTour = PydioContextConsumer(WelcomeTour);

export {WelcomeTour as default}