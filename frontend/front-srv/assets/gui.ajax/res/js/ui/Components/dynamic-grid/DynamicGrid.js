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
const Pydio = require('pydio')
const {Responsive, WidthProvider} = require('react-grid-layout');
const {PydioContextConsumer} = Pydio.requireLib('boot')

import Store from './Store'
import GridBuilder from './GridBuilder'

/**
 * Automatic layout for presenting draggable cards to users. Used for user and admin dashboard.
 */
const CardsGrid = React.createClass({

    /**
     * Save layouts in the users preference.
     *
     * @param {object} allLayouts Responsive layouts passed for saving
     */
    saveFullLayouts:function(allLayouts){
        const savedPref = this.props.store.getUserPreference('Layout');
        // Compare JSON versions to avoid saving unnecessary changes
        if(savedPref && this.previousLayout  && this.previousLayout == JSON.stringify(allLayouts)){
            return;
        }
        this.previousLayout = JSON.stringify(allLayouts);
        this.props.store.saveUserPreference('Layout', allLayouts);
    },

    onLayoutChange: function(currentLayout, allLayouts){
        if(this._blockLayoutSave) return;
        this.saveFullLayouts(allLayouts);
    },

    componentWillUnmount: function(){
        this.props.store.stopObserving("cards", this._storeObserver);
    },

    componentWillReceiveProps: function(nextProps){
        if(this.props && nextProps.editMode !== this.props.editMode){
            Object.keys(this.refs).forEach(function(k){
                this.refs[k].toggleEditMode(nextProps.editMode);
            }.bind(this));
        }
    },

    shouldComponentUpdate: function(nextProps, nextState){
        return this._forceUpdate || false;
    },

    getInitialState:function(){
        this._storeObserver = function(e){
            this._forceUpdate = true;
            this.setState({
                cards: this.props.store.getCards()
            }, ()=>{this._forceUpdate = false});
        }.bind(this);
        this.props.store.observe("cards", this._storeObserver);
        return {cards: this.props.store.getCards()}
    },

    removeCard: function(itemKey){
        this.props.removeCard(itemKey);
    },

    buildCards: function(cards){

        let index = 0;
        let layouts = {lg:[], md:[], sm:[], xs:[], xxs:[]};
        let items = [];
        let additionalNamespaces = [];
        const rand = Math.random();
        const savedLayouts = this.props.store.getUserPreference('Layout');
        const buildLayout = function(classObject, itemKey, item, x, y){
            let layout = classObject.getGridLayout(x, y);
            layout['handle'] = 'h4';
            if(item['gridHandle']){
                layout['handle'] = item['gridHandle'];
            }
            layout['i'] = itemKey;
            return layout;
        }
        cards.map(function(item){

            var parts = item.componentClass.split(".");
            var classNS = parts[0];
            var className = parts[1];
            var classObject;
            if(global[classNS] && global[classNS][className]){
                classObject = global[classNS][className];
            }else{
                if(!global[classNS]) {
                    additionalNamespaces.push(classNS);
                }
                return;
            }
            var props = {...item.props};
            var itemKey = props['key'] = item['id'] || 'item_' + index;
            props.ref=itemKey;
            props.pydio=this.props.pydio;
            props.onCloseAction = function(){
                this.removeCard(itemKey);
            }.bind(this);
            props.preferencesProvider = this.props.store;
            var defaultX = 0, defaultY = 0;
            if(item.defaultPosition){
                defaultX = item.defaultPosition.x;
                defaultY = item.defaultPosition.y;
            }
            const defaultLayout = buildLayout(classObject, itemKey, item, defaultX, defaultY);

            for(var breakpoint in layouts){
                if(!layouts.hasOwnProperty(breakpoint))continue;
                var breakLayout = layouts[breakpoint];
                // Find corresponding element in preference
                var existing;
                if(savedLayouts && savedLayouts[breakpoint]){
                    savedLayouts[breakpoint].map(function(gridData){
                        if(gridData['i'] == itemKey && gridData['h'] == defaultLayout['h']){
                            existing = gridData;
                        }
                    });
                }
                if(existing) {
                    breakLayout.push(existing);
                }else if(item.defaultLayouts && item.defaultLayouts[breakpoint]){
                    let crtLayout = buildLayout(classObject, itemKey, item, item.defaultLayouts[breakpoint].x, item.defaultLayouts[breakpoint].y);
                    breakLayout.push(crtLayout);
                }else{
                    breakLayout.push(defaultLayout);
                }
            }
            index++;
            items.push(React.createElement(classObject, props));

        }.bind(this));

        if(additionalNamespaces.length){
            this._blockLayoutSave = true;
            ResourcesManager.loadClassesAndApply(additionalNamespaces, function(){
                this.setState({additionalNamespacesLoaded:additionalNamespaces}, function(){
                    this._blockLayoutSave = false;
                }.bind(this));
            }.bind(this));
        }
        return {cards: items, layouts: layouts};
    },

    render: function(){
        const {cards, layouts} = this.buildCards(this.state.cards);
        const ResponsiveGridLayout = WidthProvider(Responsive);
        return (
            <ResponsiveGridLayout
                className="dashboard-layout"
                cols={this.props.cols || {lg: 10, md: 8, sm: 8, xs: 4, xxs: 2}}
                layouts={layouts}
                rowHeight={5}
                onLayoutChange={this.onLayoutChange}
                isDraggable={!this.props.disableDrag}
                style={this.props.style}
                autoSize={false}
            >
                {cards}
            </ResponsiveGridLayout>
        );
    }

});

let DynamicGrid = React.createClass({

    propTypes: {
        storeNamespace   : React.PropTypes.string.isRequired,
        builderNamespaces: React.PropTypes.array,
        defaultCards     : React.PropTypes.array,
        pydio            : React.PropTypes.instanceOf(Pydio),
        disableDrag      : React.PropTypes.bool,
        disableEdit      : React.PropTypes.bool,
    },

    removeCard:function(cardId){

        this.state.store.removeCard(cardId);
    },

    addCard:function(cardDefinition){

        this.state.store.addCard(cardDefinition);
    },

    resetCardsAndLayout:function(){
        this.state.store.saveUserPreference('Layout', null);
        this.state.store.setCards(this.props.defaultCards);
    },

    getInitialState: function(){
        const store = new Store(this.props.storeNamespace, this.props.defaultCards, this.props.pydio);
        return{
            editMode: false,
            store   : store
        };
    },

    toggleEditMode:function(){
        this.setState({editMode:!this.state.editMode});
    },

    render: function(){

        const monitorWidgetEditing = function(status){
            this.setState({widgetEditing:status});
        }.bind(this);

        let builder;
        if(this.props.builderNamespaces && this.state.editMode){
            builder = (
                <GridBuilder
                    className="admin-helper-panel"
                    namespaces={this.props.builderNamespaces}
                    onCreateCard={this.addCard}
                    onResetLayout={this.resetCardsAndLayout}
                    onEditStatusChange={monitorWidgetEditing}
                    getMessage={(id,ns='ajxp_admin') => {return this.props.getMessage(id, ns)}}
                />);
        }
        const propStyle = this.props.style || {};
        const rglStyle  = this.props.rglStyle || {};
        return (
            <div style={{...this.props.style, width:'100%', flex:'1'}} className={this.state.editMode?"builder-open":""}>
                {!this.props.disableEdit &&
                    <div style={{position:'absolute',bottom:30,right:18, zIndex:11}}>
                        <MaterialUI.FloatingActionButton
                            tooltip={this.props.getMessage('home.49')}
                            onClick={this.toggleEditMode}
                            iconClassName={this.state.editMode?"icon-ok":"mdi mdi-pencil"}
                            mini={this.state.editMode}
                            disabled={this.state.editMode && this.state.widgetEditing}
                        />
                    </div>
                }
                {builder}
                <div className="home-dashboard" style={{height:'100%'}}>
                    <CardsGrid
                        disableDrag={this.props.disableDrag}
                        cols={this.props.cols}
                        store={this.state.store}
                        style={rglStyle}
                        pydio={this.props.pydio}
                        editMode={this.state.editMode}
                        removeCard={this.removeCard}
                    />
                </div>
            </div>
        );
    }

});

DynamicGrid = PydioContextConsumer(DynamicGrid)
export {DynamicGrid as default}