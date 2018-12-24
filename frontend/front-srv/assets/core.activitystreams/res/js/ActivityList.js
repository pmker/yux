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
import {Divider, List, Subheader, FlatButton} from 'material-ui';
import Pydio from 'pydio'
import AS2Client from './Client'
import Activity from './Activity'

const { PydioContextConsumer, moment } = Pydio.requireLib('boot');
const {EmptyStateView} = Pydio.requireLib('components');

class ActivityList extends React.Component {

    constructor(props) {
        super(props);
        if(props.items){
            this.state = {data:{items:props.items}, offset: 0, loadMore: false, loading: false};
        } else {
            this.state = {data:[], offset: 0, loadMore: true, loading: false};
        }
    }

    mergeMoreFeed(currentFeed, newFeed){
        const currentIds = currentFeed.items.map(item => item.id);
        const filtered = newFeed.items.filter(item => currentIds.indexOf(item.id) === -1);
        if(!filtered.length){
            this.setState({loadMore: false});
            return currentFeed;
        }
        let merged = currentFeed;
        merged.items = [...currentFeed.items, ...filtered];
        merged.totalItems = merged.items.length;
        return merged;
    }

    loadForProps(props){
        let {context, pointOfView, contextData, limit} = props;
        const {offset, data} = this.state;
        if (limit === undefined){
            limit = -1;
        }
        if(offset > 0){
            limit = 100;
        }
        this.setState({loading: true});
        AS2Client.loadActivityStreams((json) => {
            if(offset > 0 && data && data.items){
                if(json && json.items) this.setState({data: this.mergeMoreFeed(data, json)});
            }else {
                this.setState({data: json});
            }
            if(!json || !json.items || !json.items.length){
                this.setState({loadMore: false});
            }
            this.setState({loading: false});
        },
            context,
            contextData,
            'outbox',
            pointOfView,
            offset,
            limit
        );
    }

    componentWillMount(){
        const {items, contextData} = this.props;
        if(items) {
            return
        }
        if(contextData) {
            this.loadForProps(this.props);
        }
    }

    componentWillReceiveProps(nextProps) {
        if(nextProps.items) {
            this.setState({data:{items:nextProps.items}, offset: 0, loadMore: false});
            return;
        }
        if (nextProps.contextData !== this.props.contextData || nextProps.context !== this.props.context) {
            this.setState({offset: 0, loadMore: true}, () => {
                this.loadForProps(nextProps);
            });
        }
    }

    render(){

        let content = [];
        let {data, loadMore, loading} = this.state;
        const {listContext, groupByDate, displayContext, pydio} = this.props;
        let previousFrom;
        if (data !== null && data.items) {
            data.items.forEach(function(ac){

                let fromNow = moment(ac.updated).fromNow();
                if (groupByDate && fromNow !== previousFrom) {
                    content.push(<div style={{padding: '0 16px', fontSize: 13, color: 'rgba(147, 168, 178, 0.67)', fontWeight: 500}}>{fromNow}</div>);
                }
                content.push(<Activity key={ac.id} activity={ac} listContext={listContext} oneLiner={groupByDate} displayContext={displayContext} />);
                if (groupByDate) {
                    previousFrom = fromNow;
                }

            });
        }
        if(content.length && loadMore){
            const loadAction = () => {
                this.setState({offset: data.items.length + 1}, () => {
                    this.loadForProps(this.props);
                })
            };
            content.push(<div style={{paddingLeft:16}}><FlatButton primary={true} label={loading ? pydio.MessageHash['notification_center.20'] : pydio.MessageHash['notification_center.19']} disabled={loading} onTouchTap={loadAction}/></div>)
        }
        if (content.length) {
            return <List style={this.props.style}>{content}</List>;
        } else {
            let style = {backgroundColor: 'transparent'};
            let iconStyle, legendStyle;
            if(displayContext === 'popover'){
                style = {minHeight: 250}
            } else if(displayContext === 'infoPanel'){
                style = {backgroundColor: 'transparent', paddingBottom: 20};
                iconStyle = {fontSize: 40};
                legendStyle = {fontSize: 13, fontWeight: 400};
            }
            return (
                <EmptyStateView
                    pydio={this.props.pydio}
                    iconClassName="mdi mdi-pulse"
                    primaryTextId={loading ? pydio.MessageHash['notification_center.17'] : pydio.MessageHash['notification_center.18']}
                    style={style}
                    iconStyle={iconStyle}
                    legendStyle={legendStyle}
                />);
        }

    }

}

ActivityList.PropTypes = {
    context: React.PropTypes.string,
    contextData: React.PropTypes.string,
    boxName : React.PropTypes.string,
    pointOfView: React.PropTypes.oneOf(['GENERIC', 'ACTOR', 'SUBJECT']),
    displayContext: React.PropTypes.oneOf(['mainList', 'infoPanel', 'popover'])
};

ActivityList = PydioContextConsumer(ActivityList);
export {ActivityList as default}