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
const {TextField, FlatButton, CardTitle, Divider} = require('material-ui')
import UsersList from './UsersList'
import Loaders from './Loaders'
import ActionsPanel from '../avatar/ActionsPanel'
import PydioApi from 'pydio/http/api';
const {PydioContextConsumer} = require('pydio').requireLib('boot')

/**
 * Display info about a Team inside a popover-able card
 */
class TeamCard extends React.Component{

    constructor(props, context){
        super(props, context);
        this.state = {label: this.props.item.label};
    }

    /**
     * Use loader to get team participants
     * @param item
     */
    loadMembers(item){
        this.setState({loading: true});
        Loaders.childrenAsPromise(item, false).then((children) => {
            Loaders.childrenAsPromise(item, true).then((children) => {
                this.setState({members:item.leafs, loading: false});
            });
        });
    }
    componentWillMount(){
        this.loadMembers(this.props.item);
    }
    componentWillReceiveProps(nextProps){
        this.loadMembers(nextProps.item);
        this.setState({label: nextProps.item.label});
    }
    onLabelChange(e, value){
        this.setState({label: value});
    }
    updateLabel(){
        if(this.state.label !== this.props.item.label){
            PydioApi.getRestClient().getIdmApi().updateTeamLabel(this.props.item.IdmRole.Uuid, this.state.label, () => {
                this.props.onUpdateAction(this.props.item);
            });
        }
        this.setState({editMode: false});
    }
    render(){
        const {item, onDeleteAction, onCreateAction, getMessage} = this.props;

        const editProps = {
            team: item,
            userEditable: this.props.item.IdmRole.PoliciesContextEditable,
            onDeleteAction: () => {this.props.onDeleteAction(item._parent, [item])},
            onEditAction: () => {this.setState({editMode: !this.state.editMode})},
            reloadAction: () => {this.props.onUpdateAction(item)}
        };

        let title;
        if(this.state.editMode){
            title = (
                <div style={{display:'flex', alignItems:'center', margin: 16}}>
                    <TextField style={{flex: 1, fontSize: 24}} fullWidth={true} disabled={false} underlineShow={false} value={this.state.label} onChange={this.onLabelChange.bind(this)}/>
                    <FlatButton secondary={true} label={getMessage(48)} onTouchTap={() => {this.updateLabel()}}/>
                </div>
            );
        }else{
            title = <CardTitle title={this.state.label} subtitle={(item.leafs && item.leafs.length ? getMessage(576).replace('%s', item.leafs.length) : getMessage(577))}/>;
        }
        const {style, ...otherProps} = this.props;
        return (
            <div>
                {title}
                <ActionsPanel {...otherProps} {...editProps} />
                <Divider/>
                <UsersList subHeader={getMessage(575)} onItemClicked={()=>{}} item={item} mode="inner" onDeleteAction={onDeleteAction}/>
            </div>
        )
    }

}

TeamCard.propTypes = {
    /**
     * Pydio instance
     */
    pydio: React.PropTypes.instanceOf(Pydio),
    /**
     * Team data object
     */
    item: React.PropTypes.object,
    /**
     * Applied to root container
     */
    style: React.PropTypes.object,
    /**
     * Called to dismiss the popover
     */
    onRequestClose: React.PropTypes.func,
    /**
     * Delete current team
     */
    onDeleteAction: React.PropTypes.func,
    /**
     * Update current team
     */
    onUpdateAction: React.PropTypes.func
};

TeamCard = PydioContextConsumer(TeamCard);

export {TeamCard as default}