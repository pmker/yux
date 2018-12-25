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

const React = require('react')
const {ActionDialogMixin, AsyncComponent} = require('pydio').requireLib('boot');
import {Tabs, Tab, IconButton, FontIcon} from 'material-ui'
import {muiThemeable} from 'material-ui/styles'

class TopBar extends React.Component{

    render(){
        const {tabs, dismiss, muiTheme} = this.props;
        return(
            <div style={{display:'flex', backgroundColor:muiTheme.tabs.backgroundColor}}>
                <Tabs style={{flex: 1}}>
                    {tabs}
                </Tabs>
                <IconButton iconStyle={{color:muiTheme.tabs.selectedTextColor}} iconClassName={"mdi mdi-close"} onTouchTap={dismiss} tooltip={"Close"}/>
            </div>
        );
    }

}

TopBar = muiThemeable()(TopBar);

let UploadDialog = React.createClass({

    mixins:[
        ActionDialogMixin
    ],

    getDefaultProps: function(){
        const mobile = pydio.UI.MOBILE_EXTENSIONS;
        return {
            dialogTitle: '',
            dialogSize: mobile ? 'md' : 'lg',
            dialogPadding: false,
            dialogIsModal: false
        };
    },

    getInitialState(){
        let uploaders = this.props.pydio.Registry.getActiveExtensionByType("uploader").filter(uploader => uploader.moduleName);
        uploaders.sort(function(objA, objB){
            return objA.order - objB.order;
        });
        let current;
        if(uploaders.length){
            current = uploaders[0];
        }
        return {
            uploaders,
            current
        };
    },

    render: function(){
        let tabs = [];
        let component = <div style={{height: 360}}></div>;
        const dismiss = () => {this.dismiss()};
        const {uploaders, current} = this.state;
        uploaders.map((uploader) => {
            tabs.push(<Tab label={uploader.xmlNode.getAttribute('label')} key={uploader.id} onActive={()=>{this.setState({current:uploader})}}/>);
        });
        if(current){
            let parts = current.moduleName.split('.');
            component = (
                <AsyncComponent
                    pydio={this.props.pydio}
                    namespace={parts[0]}
                    componentName={parts[1]}
                    onDismiss={dismiss}
                    {...this.props.uploaderProps}
                />
            );
        }

        return (
            <div style={{width: '100%'}}>
                <TopBar tabs={tabs} dismiss={dismiss}/>
                {component}
            </div>
        );
    }

});

export {UploadDialog as default}