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
const Infinite = require('react-infinite')
import ScrollArea from 'react-scrollbar'
import {Toolbar, ToolbarGroup, FontIcon, Checkbox, RaisedButton, FlatButton} from 'material-ui'

import MessagesConsumerMixin from '../util/MessagesConsumerMixin'
import {ListEntry} from './ListEntry'
import TableListEntry from './TableListEntry'
import TableListHeader from './TableListHeader'
import ConfigurableListEntry from './ConfigurableListEntry'
import SortColumns from './SortColumns'
import ListPaginator from './ListPaginator'
import SimpleReactActionBar from '../views/SimpleReactActionBar'
import InlineEditor from './InlineEditor'
import EmptyStateView from '../views/EmptyStateView'

const DOMUtils = require('pydio/util/dom')
const LangUtils = require('pydio/util/lang')
const PydioDataModel = require('pydio/model/data-model')
const PeriodicalExecuter = require('pydio/util/periodical-executer')

/**
 * Generic List component, using Infinite for cell virtualization, pagination, various
 * displays, etc... It provides many hooks for rendering cells on-demand.
 */
let SimpleList = React.createClass({

    mixins:[MessagesConsumerMixin],

    propTypes:{
        infiniteSliceCount  : React.PropTypes.number,
        filterNodes         : React.PropTypes.func,
        customToolbar       : React.PropTypes.object,
        tableKeys           : React.PropTypes.object,
        autoRefresh         : React.PropTypes.number,
        reloadAtCursor      : React.PropTypes.bool,
        clearSelectionOnReload: React.PropTypes.bool,
        heightAutoWithMax   : React.PropTypes.number,
        containerHeight     : React.PropTypes.number,
        observeNodeReload   : React.PropTypes.bool,
        defaultGroupBy      : React.PropTypes.string,
        defaultGroupByLabel : React.PropTypes.string,

        skipParentNavigation: React.PropTypes.bool,
        skipInternalDataModel:React.PropTypes.bool,
        delayInitialLoad    : React.PropTypes.number,

        entryEnableSelector : React.PropTypes.func,
        renderCustomEntry   : React.PropTypes.func,
        entryRenderIcon     : React.PropTypes.func,
        entryRenderActions  : React.PropTypes.func,
        entryRenderFirstLine: React.PropTypes.func,
        entryRenderSecondLine:React.PropTypes.func,
        entryRenderThirdLine: React.PropTypes.func,
        entryHandleClicks   : React.PropTypes.func,
        hideToolbar         : React.PropTypes.bool,
        computeActionsForNode: React.PropTypes.bool,
        multipleActions     : React.PropTypes.array,

        openEditor          : React.PropTypes.func,
        openCollection      : React.PropTypes.func,

        elementStyle        : React.PropTypes.object,
        passScrollingStateToChildren:React.PropTypes.bool,
        elementHeight       : React.PropTypes.oneOfType([
            React.PropTypes.number,
            React.PropTypes.object
        ]).isRequired

    },

    statics:{
        HEIGHT_ONE_LINE:50,
        HEIGHT_TWO_LINES:73,
        CLICK_TYPE_SIMPLE:'simple',
        CLICK_TYPE_DOUBLE:'double',
        PARENT_FOLDER_ICON:'mdi mdi-chevron-left'
    },

    getDefaultProps:function(){
        return {infiniteSliceCount:30, clearSelectionOnReload: true}
    },

    clickRow: function(gridRow, event){
        let node;
        if(gridRow.props){
            node = gridRow.props.data.node;
        }else{
            node = gridRow;
        }
        if(this.props.entryHandleClicks){
            this.props.entryHandleClicks(node, SimpleList.CLICK_TYPE_SIMPLE, event);
            return;
        }
        if(node.isLeaf() && this.props.openEditor) {
            if( this.props.openEditor(node) === false){
                return;
            }
            let uniqueSelection = new Map();
            uniqueSelection.set(node, true);
            this.setState({selection:uniqueSelection}, this.rebuildLoadedElements);
        } else if(!node.isLeaf()) {
            if(this.props.openCollection){
                this.props.openCollection(node);
            }else{
                this.props.dataModel.setSelectedNodes([node]);
            }
        }
    },

    doubleClickRow: function(gridRow, event){
        let node;
        if(gridRow.props){
            node = gridRow.props.data.node;
        }else{
            node = gridRow;
        }
        if(this.props.entryHandleClicks){
            this.props.entryHandleClicks(node, SimpleList.CLICK_TYPE_DOUBLE, event);
        }
    },

    onColumnSort: function(column, stateSetCallback = null){

        let pagination = this.props.node.getMetadata().get('paginationData');
        if(pagination && pagination.get('total') > 1 && pagination.get('remote_order')){

            let dir = 'asc';
            if(this.props.node.getMetadata().get('paginationData').get('currentOrderDir')){
                dir = this.props.node.getMetadata().get('paginationData').get('currentOrderDir') === 'asc' ? 'desc' : 'asc';
            }
            let orderData = new Map();
            orderData.set('order_column', column['remoteSortAttribute']?column.remoteSortAttribute:column.name);
            orderData.set('order_direction', dir);
            this.props.node.getMetadata().set("remote_order", orderData);
            this.props.dataModel.requireContextChange(this.props.node, true);

        }else{

            let att = column['sortAttribute']?column['sortAttribute']:column.name;
            let sortingInfo;
            const {sortingInfo: {attribute, direction}} = this.state;
            if(attribute === att && direction){
                if(direction === 'asc') {
                    // Switch direction
                    sortingInfo = { attribute : att, sortType  : column.sortType, direction : 'desc' };
                } else {
                    // Reset sorting
                    sortingInfo = this.props.defaultSortingInfo || {};
                }
            }else{
                sortingInfo = { attribute : att, sortType  : column.sortType, direction : 'asc' };
            }
            this.setState({sortingInfo}, function(){
                this.rebuildLoadedElements();
                if(stateSetCallback){
                    stateSetCallback();
                }
            }.bind(this));

        }

    },

    computeSelectionFromCurrentPlusTargetNode: function(currentSelection, targetNode){

        let currentIndexStart, currentIndexEnd, nodeBefore = false;
        if(!this.indexedElements ) {
            return [];
        }
        let firstSelected = currentSelection[0];
        let lastSelected = currentSelection[currentSelection.length - 1];
        let newSelection = [];
        for(let i=0; i< this.indexedElements.length; i++){
            if(currentIndexStart !== undefined){
                newSelection.push(this.indexedElements[i].node);
            }
            if(this.indexedElements[i].node === targetNode){
                if(currentIndexStart !== undefined && currentIndexEnd === undefined){
                    currentIndexEnd = i;
                    break;
                }
                currentIndexStart = i;
                nodeBefore = true;
                newSelection.push(this.indexedElements[i].node);
            }
            if(this.indexedElements[i].node === firstSelected && currentIndexStart === undefined) {
                currentIndexStart = i;
                newSelection.push(this.indexedElements[i].node);
            }
            if(this.indexedElements[i].node === lastSelected && nodeBefore) {
                currentIndexEnd = i;
                break;
            }
        }
        return newSelection;
    },

    onKeyDown: function(e){
        let currentIndexStart, currentIndexEnd;
        let contextHolder = window.pydio.getContextHolder();
        const elementsPerLine = this.props.elementsPerLine || 1;
        const shiftKey = e.shiftKey;
        const key = e.key;

        if(contextHolder.isEmpty() || !this.indexedElements ) {
            return;
        }
        let downKeys = ['ArrowDown', 'ArrowRight', 'PageDown', 'End'];

        let position = (shiftKey && downKeys.indexOf(key) > -1) ? 'first' : 'last';
        let currentSelection = contextHolder.getSelectedNodes();

        let firstSelected = currentSelection[0];
        let lastSelected = currentSelection[currentSelection.length - 1];

        if(key === 'Enter'){
            this.doubleClickRow(firstSelected);
            return;
        }
        if(key === 'Delete' && global.pydio.Controller.fireActionByKey('key_delete')){
            return;
        }

        for(let i=0; i< this.indexedElements.length; i++){
            if(this.indexedElements[i].node === firstSelected) {
                currentIndexStart = i;
            }
            if(this.indexedElements[i].node === lastSelected) {
                currentIndexEnd = i;
                break;
            }
        }
        let selectionIndex;
        let maxIndex = this.indexedElements.length - 1;
        let increment = (key === 'PageDown' || key === 'PageUp' ? 10 : 1);
        if(key === 'ArrowDown' || key === 'PageDown'){
            selectionIndex = Math.min(currentIndexEnd + elementsPerLine * increment, maxIndex);
        }else if(key === 'ArrowUp' || key === 'PageUp'){
            selectionIndex = Math.max(currentIndexStart - elementsPerLine * increment, 0);
        }else if(key === 'Home'){
            selectionIndex = 0;
        }else if(key === 'End'){
            selectionIndex = maxIndex;
        }
        if(elementsPerLine > 1){
            if(key === 'ArrowRight'){
                selectionIndex = currentIndexEnd + 1;
            }else if(key === 'ArrowLeft'){
                selectionIndex = currentIndexStart - 1;
            }
        }

        if(shiftKey && selectionIndex !== undefined){
            const min = Math.min(currentIndexStart, currentIndexEnd, selectionIndex);
            const max = Math.max(currentIndexStart, currentIndexEnd, selectionIndex);
            if(min !== max){
                let selection = [];
                for(let i=min; i<max+1; i++){
                    if(this.indexedElements[i]) selection.push(this.indexedElements[i].node);
                }
                contextHolder.setSelectedNodes(selection);
            }
        }else if(this.indexedElements[selectionIndex] && this.indexedElements[selectionIndex].node){
            contextHolder.setSelectedNodes([this.indexedElements[selectionIndex].node]);
        }

    },

    getInitialState: function(){
        this.actionsCache = {multiple:new Map()};
        if(!this.props.skipInternalDataModel){
            this.dm = new PydioDataModel();
            this.dm.setRootNode(this.props.dataModel.getContextNode());
            this.dm.setContextNode(this.props.dataModel.getContextNode());
        }else{
            this.dm = this.props.dataModel;
        }
        let state = {
            loaded: this.props.node.isLoaded(),
            loading             : !this.props.node.isLoaded(),
            showSelector        : false,
            elements            : this.props.node.isLoaded()?this.buildElements(0, this.props.infiniteSliceCount):[],
            containerHeight     : this.props.containerHeight ? this.props.containerHeight  : (this.props.heightAutoWithMax ? 0 : 500),
            sortingInfo         : this.props.defaultSortingInfo || null
        };
        if(this.props.elementHeight instanceof Object){
            state.elementHeight = this.computeElementHeightResponsive();
        }
        state.infiniteLoadBeginBottomOffset = 200;
        return state;
    },

    componentWillReceiveProps: function(nextProps) {
        this.indexedElements = null;
        const currentLength = Math.max(this.state.elements.length, nextProps.infiniteSliceCount);
        this.setState({
            loaded: nextProps.node.isLoaded(),
            loading:!nextProps.node.isLoaded(),
            showSelector:false,
            elements:nextProps.node.isLoaded()?this.buildElements(0, currentLength, nextProps.node):[],
            infiniteLoadBeginBottomOffset:200,
            sortingInfo: this.state.sortingInfo || nextProps.defaultSortingInfo || null
        }, () => {if (nextProps.node.isLoaded()) this.updateInfiniteContainerHeight()});
        if(!nextProps.autoRefresh&& this.refreshInterval){
            window.clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }else if(nextProps.autoRefresh && !this.refreshInterval){
            this.refreshInterval = window.setInterval(this.reload, nextProps.autoRefresh);
        }
        this.patchInfiniteGrid(nextProps.elementsPerLine);
        if(this.props.node && nextProps.node !== this.props.node) {
            this.observeNodeChildren(this.props.node, true);
        }
        if(this._manualScrollPe) {
            this._manualScrollPe.stop();
            this._manualScrollPe = null;
        }
    },

    observeNodeChildren: function(node, stop = false){
        if(stop && !this._childrenObserver) return;

        if(!this._childrenObserver){
            this._childrenObserver = function(){
                this.indexedElements = null;
                this.rebuildLoadedElements();
            }.bind(this);
        }
        if(!this._childrenActionsObserver){
            this._childrenActionsObserver = function(eventMemo){
                if(eventMemo.type === 'prompt-rename'){
                    this.setState({inlineEditionForNode:eventMemo.child, inlineEditionCallback:eventMemo.callback});
                }
            }.bind(this);
        }
        if(stop){
            node.stopObserving("child_added", this._childrenObserver);
            node.stopObserving("child_removed", this._childrenObserver);
            node.stopObserving("child_node_action", this._childrenActionsObserver);
        }else{
            node.observe("child_added", this._childrenObserver);
            node.observe("child_removed", this._childrenObserver);
            node.observe("child_node_action", this._childrenActionsObserver);
        }
    },

    _loadNodeIfNotLoaded: function(){
        const {node} = this.props;
        if(!node.isLoaded()){
            node.observeOnce("loaded", function(){
                if(!this.isMounted()) return;
                if(this.props.node === node){
                    this.observeNodeChildren(node);
                    this.setState({
                        loaded:true,
                        loading: false,
                        elements:this.buildElements(0, this.props.infiniteSliceCount)
                    });
                }
                if(this.props.heightAutoWithMax){
                    this.updateInfiniteContainerHeight();
                }
            }.bind(this));
            node.load();
        }else{
            this.observeNodeChildren(node);
        }
    },

    _loadingListener: function(){
        this.observeNodeChildren(this.props.node, true);
        this.setState({loaded:false, loading:true});
        this.indexedElements = null;
    },
    _loadedListener: function(){
        const currentLength = Math.max(this.state.elements.length, this.props.infiniteSliceCount);
        this.setState({
            loading:false,
            elements:this.buildElements(0, currentLength, this.props.node)
        });
        if(this.props.heightAutoWithMax){
            this.updateInfiniteContainerHeight();
        }
        this.observeNodeChildren(this.props.node);
    },

    reload: function(){
        if(this.props.reloadAtCursor && this._currentCursor){
            this.loadStartingAtCursor();
            return;
        }
        if(this.props.clearSelectionOnReload){
            this.props.dataModel.setSelectedNodes([]);
        }
        this._loadingListener();
        this.props.node.observeOnce("loaded", this._loadedListener);
        this.props.node.reload();
    },

    loadStartingAtCursor: function(){
        this._loadingListener();
        const node = this.props.node;
        const cachedChildren = node.getChildren();
        let newChildren = [];
        node.observeOnce("loaded", function(){
            let reorderedChildren = new Map();
            newChildren.map(function(c){reorderedChildren.set(c.getPath(), c);});
            cachedChildren.forEach(function(c){reorderedChildren.set(c.getPath(), c);});
            node._children = reorderedChildren;
            this._loadedListener();
        }.bind(this));
        node.setLoaded(false);
        node.observe("child_added", function(newChild){
            newChildren.push(node._children.get(newChild));
        });
        this.props.node.load(null, {cursor:this._currentCursor});
    },

    wireReloadListeners: function(){
        this.wrappedLoading = this._loadingListener;
        this.wrappedLoaded = this._loadedListener;
        this.props.node.observe("loading", this.wrappedLoading);
        this.props.node.observe("loaded", this.wrappedLoaded);
    },
    stopReloadListeners:function(){
        this.props.node.stopObserving("loading", this.wrappedLoading);
        this.props.node.stopObserving("loaded", this.wrappedLoaded);
    },

    toggleSelector:function(){
        // Force rebuild elements
        this.setState({
            showSelector:!this.state.showSelector,
            selection:new Map()
        }, this.rebuildLoadedElements);
    },

    toggleSelection:function(node){
        let selection = this.state.selection || new Map();
        if(selection.get(node)) selection.delete(node);
        else selection.set(node, true);
        if(this.refs.all_selector) this.refs.all_selector.setChecked(false);
        this.setState({
            selection:selection
        }, this.rebuildLoadedElements);
    },

    selectAll:function(){
        if(this.refs.all_selector && !this.refs.all_selector.isChecked()){
            this.setState({selection:new Map()}, this.rebuildLoadedElements);
        }else{
            let selection = new Map();
            this.props.node.getChildren().forEach(function(child){
                if(this.props.filterNodes && !this.props.filterNodes(child)){
                    return;
                }
                if(child.isLeaf()){
                    selection.set(child, true);
                }
            }.bind(this));
            if(this.refs.all_selector) this.refs.all_selector.setChecked(true);
            this.setState({selection:selection}, this.rebuildLoadedElements);
        }
    },

    applyMultipleAction: function(ev){
        if(!this.state.selection || !this.state.selection.size){
            return;
        }
        const actionName = ev.currentTarget.getAttribute('data-action');
        const dm = this.dm || new PydioDataModel();
        dm.setContextNode(this.props.node);
        let selNodes = [];
        this.state.selection.forEach(function(v, node){
            selNodes.push(node);
        });
        dm.setSelectedNodes(selNodes);
        const a = this.props.pydio.Controller.getActionByName(actionName);
        a.fireContextChange(dm, true, this.props.pydio.user);
        a.apply([dm]);

        ev.stopPropagation();
        ev.preventDefault();
    },

    getActionsForNode: function(dm, node){
        if(!this.props.computeActionsForNode){
            return [];
        }
        const cacheKey = node.isLeaf() ? 'file-' + node.getAjxpMime() :'folder';
        const selectionType = node.isLeaf() ? 'file' : 'dir';
        let nodeActions = [];
        if(this.actionsCache[cacheKey]) {
            nodeActions = this.actionsCache[cacheKey];
        }else{
            dm.setSelectedNodes([node]);
            window.pydio.Controller.actions.forEach(function(a){
                a.fireContextChange(dm, true, window.pydio.user);
                if(a.context.selection && a.context.actionBar && a.selectionContext[selectionType] && !a.deny && a.options.icon_class
                    && (!this.props.actionBarGroups || this.props.actionBarGroups.indexOf(a.context.actionBarGroup) !== -1)
                    && (!a.selectionContext.allowedMimes.length || a.selectionContext.allowedMimes.indexOf(node.getAjxpMime()) !== -1)
                ) {
                    nodeActions.push(a);
                    if(node.isLeaf() &&  a.selectionContext.unique === false) {
                        this.actionsCache.multiple.set(a.options.name, a);
                    }
                }
            }.bind(this));
            this.actionsCache[cacheKey] = nodeActions;
        }
        return nodeActions;
    },

    updateInfiniteContainerHeight: function(retries = false){
        if(this.props.containerHeight){
            return this.props.containerHeight;
        }
        if(!this.refs.infiniteParent){
            return;
        }
        let containerHeight = this.refs.infiniteParent.clientHeight;
        if(this.props.heightAutoWithMax){
            const number = this.indexedElements ? this.indexedElements.length : this.props.node.getChildren().size;
            const elementHeight = this.state.elementHeight?this.state.elementHeight:this.props.elementHeight;
            containerHeight = Math.min(number * elementHeight ,this.props.heightAutoWithMax);
        }
        if(!containerHeight && !retries ){
            global.setTimeout(function(){
                this.updateInfiniteContainerHeight(true);
            }.bind(this), 50);
        }
        this.setState({containerHeight:containerHeight});
    },

    computeElementHeightResponsive:function(){
        let breaks = this.props.elementHeight;
        if(! (breaks instanceof Object) ){
            breaks = {
                "min-width:480px":this.props.elementHeight,
                "max-width:480px":(Object.keys(this.props.tableKeys).length * 24) + 33
            };
        }
        if(window.matchMedia){
            for(let k in breaks){
                if(breaks.hasOwnProperty(k) && window.matchMedia('('+k+')').matches){
                    return breaks[k];
                }
            }
        }else{
            const width = DOMUtils.getViewportWidth();
            if(width < 480) return breaks["max-width:480px"];
            else return breaks["max-width:480px"];
        }
        return 50;
    },

    updateElementHeightResponsive: function(){
        const newH = this.computeElementHeightResponsive();
        if(!this.state || !this.state.elementHeight || this.state.elementHeight != newH){
            this.setState({elementHeight:newH}, function(){
                if(this.props.heightAutoWithMax){
                    this.updateInfiniteContainerHeight();
                }
            }.bind(this));
        }
    },

    patchInfiniteGrid: function(els){
        if(this.refs.infinite && els > 1){
            this.refs.infinite.state.infiniteComputer.__proto__.getDisplayIndexStart = function (windowTop){
                return els * Math.floor((windowTop/this.heightData) / els)
            };
            this.refs.infinite.state.infiniteComputer.__proto__.getDisplayIndexEnd = function (windowBottom){
                return els * Math.ceil((windowBottom/this.heightData) / els)
            };
        }
    },

    componentDidMount: function(){
        if(this.props.delayInitialLoad){
            setTimeout(() => {this._loadNodeIfNotLoaded()}, this.props.delayInitialLoad);
        }else{
            this._loadNodeIfNotLoaded();
        }
        this.patchInfiniteGrid(this.props.elementsPerLine);
        if(this.refs.infiniteParent){
            this.updateInfiniteContainerHeight();
            if(!this.props.heightAutoWithMax && !this.props.externalResize) {
                if(window.addEventListener){
                    window.addEventListener('resize', this.updateInfiniteContainerHeight);
                }else{
                    window.attachEvent('onresize', this.updateInfiniteContainerHeight);
                }
            }
        }
        if(this.props.autoRefresh){
            this.refreshInterval = window.setInterval(this.reload, this.props.autoRefresh);
        }
        if(this.props.observeNodeReload){
            this.wireReloadListeners();
        }
        if(this.props.elementHeight instanceof Object || this.props.tableKeys){
            if(window.addEventListener){
                window.addEventListener('resize', this.updateElementHeightResponsive);
            }else{
                window.attachEvent('onresize', this.updateElementHeightResponsive);
            }
            this.updateElementHeightResponsive();
        }
        this.props.dataModel.observe('root_node_changed', (rootNode) => {
            this.rootNodeChangedFlag = true;
        });
        this.props.dataModel.observe('selection_changed', function(){
            if(!this.isMounted()) return;
            let selection = new Map();
            const selectedNodes = this.props.dataModel.getSelectedNodes();
            selectedNodes.map(function(n){
                selection.set(n, true);
            });
            this.setState({selection: selection}, ()  => {
                this.rebuildLoadedElements();
                if(selectedNodes.length === 1){
                    this.scrollToView(selectedNodes[0]);
                }
            });
        }.bind(this));
    },

    componentWillUnmount: function(){
        if(!this.props.heightAutoWithMax) {
            if(window.removeEventListener){
                window.removeEventListener('resize', this.updateInfiniteContainerHeight);
            }else{
                window.detachEvent('onresize', this.updateInfiniteContainerHeight);
            }
        }
        if(this.props.elementHeight instanceof Object || this.props.tableKeys){
            if(window.removeEventListener){
                window.removeEventListener('resize', this.updateElementHeightResponsive);
            }else{
                window.detachEvent('resize', this.updateElementHeightResponsive);
            }
        }
        if(this.refreshInterval){
            window.clearInterval(this.refreshInterval);
        }
        if(this.props.observeNodeReload){
            this.stopReloadListeners();
        }
        if(this.props.node) {
            this.observeNodeChildren(this.props.node, true);
        }
    },

    componentDidUpdate: function(prevProps, prevState){
        if(!this.rootNodeChangedFlag && prevProps.node && this.props.node && prevProps.node.getPath() === this.props.node.getPath()){
            return;
        }
        this._loadNodeIfNotLoaded();
        this.rootNodeChangedFlag = false;
    },

    onScroll:function(scrollTop){

        if(!this.props.passScrollingStateToChildren){
            return;
        }
        // Maintains a series of timeouts to set this.state.isScrolling
        // to be true when the element is scrolling.

        if (this.state.scrollTimeout) {
            clearTimeout(this.state.scrollTimeout);
        }

        let that = this,
            scrollTimeout = setTimeout(() => {
                that.setState({
                    isScrolling: false,
                    scrollTimeout: undefined
                })
            }, 150);

        this.setState({
            isScrolling: true,
            scrollTimeout: scrollTimeout
        });

    },

    scrollToLast: function(){
        if(this.indexedElements && this.indexedElements[this.indexedElements.length - 1].node){
            this.scrollToView(this.indexedElements[this.indexedElements.length - 1].node);
        }
    },

    scrollToView:function(node){
        if(!this.indexedElements || !this.refs.infinite || !this.refs.infinite.scrollable) return;
        const scrollable = this.refs.infinite.scrollable;
        const visibleFrame = {
            top: scrollable.scrollTop + this.props.elementHeight / 2,
            bottom: scrollable.scrollTop + this.state.containerHeight - this.props.elementHeight / 2
        };
        const realMaxScrollTop = this.indexedElements.length * this.props.elementHeight - this.state.containerHeight;

        let position = -1;
        this.indexedElements.forEach((e, k) => {
            if(e.node && e.node === node) position = k;
        });
        if(position === -1) return;
        let elementHeight = this.props.elementHeight;
        let scrollTarget = position * elementHeight;

        if(scrollTarget > visibleFrame.top && scrollTarget < visibleFrame.bottom){
            // already visible;
            return;
        }else if(scrollTarget >= visibleFrame.bottom){
            scrollTarget -= (this.state.containerHeight - elementHeight * 2);
        }
        scrollTarget = Math.min(scrollTarget, realMaxScrollTop);
        scrollable.scrollTop = scrollTarget;
        if(this._manualScrollPe) this._manualScrollPe.stop();
        if(scrollable.scrollHeight < scrollTarget){
            this._manualScrollPe = new PeriodicalExecuter(() => {
                scrollable.scrollTop = scrollTarget;
                if(scrollable.scrollHeight >= scrollTarget){
                    this._manualScrollPe.stop();
                    this._manualScrollPe = null;
                }
            }, .25);
        }
    },

    buildElementsFromNodeEntries: function(nodeEntries, showSelector){

        let components = [], index = 0;
        const nodeEntriesLength = nodeEntries.length;
        nodeEntries.forEach(function(entry){
            let data;
            if(entry.parent) {
                data = {
                    node                : entry.node,
                    key                 : entry.node.getPath(),
                    id                  : entry.node.getPath(),
                    mainIcon            : SimpleList.PARENT_FOLDER_ICON,
                    firstLine           : "..",
                    className           : "list-parent-node",
                    secondLine          : this.context.getMessage('react.1'),
                    onClick             : this.clickRow,
                    onDoubleClick       : this.doubleClickRow,
                    showSelector        : false,
                    selectorDisabled    : true,
                    noHover             : false
                };
                if(this.props.entryRenderParentIcon && ! this.props.tableKeys){
                    data['iconCell'] = this.props.entryRenderParentIcon(entry.node, entry);
                }else{
                    data['mainIcon'] = SimpleList.PARENT_FOLDER_ICON;
                }
                if(this.props.elementStyle){
                    data['style'] = this.props.elementStyle;
                }
                if(this.props.passScrollingStateToChildren){
                    data['parentIsScrolling'] = this.state.isScrolling;
                }
                components.push(React.createElement(ListEntry, data));
            }else if(entry.groupHeader){
                let id = entry.groupHeader, firstLine = entry.groupHeaderLabel;
                if(this.props.entryRenderGroupHeader){
                    firstLine = this.props.entryRenderGroupHeader(id, firstLine);
                }
                data = {
                    node                : null,
                    key                 : entry.groupHeader,
                    id                  : id,
                    mainIcon            : null,
                    firstLine           : firstLine,
                    className           : 'list-group-header',
                    onClick             : null,
                    showSelector        : false,
                    selectorDisabled    : true,
                    noHover             : true
                };
                if(this.props.passScrollingStateToChildren){
                    data['parentIsScrolling'] = this.state.isScrolling;
                }
                components.push(React.createElement(ListEntry, data));
            }else{
                data = {
                    node                : entry.node,
                    onClick             : this.clickRow,
                    onDoubleClick       : this.doubleClickRow,
                    onSelect            : this.toggleSelection,
                    key                 : entry.node.getPath(),
                    id                  : entry.node.getPath(),
                    renderIcon          : this.props.entryRenderIcon,
                    renderFirstLine     : this.props.entryRenderFirstLine,
                    renderSecondLine    : this.props.entryRenderSecondLine,
                    renderThirdLine     : this.props.entryRenderThirdLine,
                    renderActions       : this.props.entryRenderActions,
                    showSelector        : showSelector,
                    selected            : (this.state && this.state.selection)?this.state.selection.get(entry.node):false,
                    actions             : <SimpleReactActionBar node={entry.node} actions={entry.actions} dataModel={this.dm}/>,
                    selectorDisabled    : !(this.props.entryEnableSelector?this.props.entryEnableSelector(entry.node):entry.node.isLeaf())
                };
                data['isFirst'] = (index === 0);
                data['isLast'] = (index === nodeEntriesLength - 1);
                index ++;
                if(this.props.elementStyle){
                    data['style'] = this.props.elementStyle;
                }
                if(this.props.passScrollingStateToChildren){
                    data['parentIsScrolling'] = this.state.isScrolling;
                }
                if(this.props.renderCustomEntry){

                    components.push(this.props.renderCustomEntry(data));

                }else if(this.props.tableKeys){

                    if(this.props.defaultGroupBy){
                        data['tableKeys'] = LangUtils.deepCopy(this.props.tableKeys);
                        delete data['tableKeys'][this.props.defaultGroupBy];
                    }else{
                        data['tableKeys'] = this.props.tableKeys;
                    }
                    components.push(React.createElement(TableListEntry, data));

                }else{

                    components.push(React.createElement(ConfigurableListEntry, data));

                }
            }
        }.bind(this));

        return components;

    },

    buildElements: function(start, end, node, showSelector){
        let theNode = this.props.node;
        if (node) theNode = node;
        let theShowSelector = this.state && this.state.showSelector;
        if(showSelector !== undefined) theShowSelector = showSelector;

        if(!this.indexedElements || this.indexedElements.length !== theNode.getChildren().size) {
            this.indexedElements = [];
            let groupBy, groupByLabel, groups, groupKeys, groupLabels;
            if(this.props.defaultGroupBy){
                groupBy = this.props.defaultGroupBy;
                groupByLabel = this.props.groupByLabel || false;
                groups = {}, groupKeys = [], groupLabels = {};
            }

            if (!this.props.skipParentNavigation && theNode.getParent()
                && (this.props.dataModel.getContextNode() !== theNode || this.props.skipInternalDataModel)) {
                this.indexedElements.push({node: theNode.getParent(), parent: true, actions: null});
            }

            theNode.getChildren().forEach(function (child) {
                if(child.getMetadata().has('cursor')){
                    const childCursor = parseInt(child.getMetadata().get('cursor'));
                    this._currentCursor = Math.max((this._currentCursor ? this._currentCursor : 0), childCursor);
                }
                if(this.props.filterNodes && !this.props.filterNodes(child)){
                    return;
                }
                const nodeActions = this.getActionsForNode(this.dm, child);
                if(groupBy){
                    const groupValue = child.getMetadata().get(groupBy) || 'N/A';
                    if(!groups[groupValue]) {
                        groups[groupValue] = [];
                        groupKeys.push(groupValue);
                    }
                    if(groupByLabel && child.getMetadata().has(groupByLabel) && !groupLabels[groupValue]){
                        groupLabels[groupValue] = child.getMetadata().get(groupByLabel);
                    }
                    groups[groupValue].push({node: child, parent: false, actions: nodeActions});
                }else{
                    this.indexedElements.push({node: child, parent: false, actions: nodeActions});
                }
            }.bind(this));

            if(groupBy){
                groupKeys = groupKeys.sort();
                groupKeys.map(function(k){
                    let label = k;
                    if(groupLabels[k]){
                        label = groupLabels[k];
                    }else if(this.props.renderGroupLabels){
                        label = this.props.renderGroupLabels(groupBy, k);
                    }
                    this.indexedElements.push({
                        node: null,
                        groupHeader:k,
                        groupHeaderLabel:label,
                        parent: false,
                        actions: null
                    });
                    this.indexedElements = this.indexedElements.concat(groups[k]);
                }.bind(this));
            }

        }

        if(this.state && this.state.sortingInfo && !this.remoteSortingInfo()){
            const {sortingInfo:{attribute, direction, sortType}} = this.state;
            let sortFunction;
            if(sortType === 'file-natural'){
                sortFunction = (a, b) => {
                    if (a.parent){
                        return -1;
                    }
                    if (b.parent){
                        return 1;
                    }
                    const nodeA = a.node;
                    const nodeB = b.node;
                    // Recycle always last
                    if(nodeA.isRecycle()) return 1;
                    if(nodeB.isRecycle()) return -1;
                    // Folders first
                    const aLeaf = nodeA.isLeaf();
                    const bLeaf = nodeB.isLeaf();
                    let res = (aLeaf && !bLeaf ? 1 : ( !aLeaf && bLeaf ? -1 : 0));
                    if(res !== 0) return res;
                    res = nodeA.getLabel().localeCompare(nodeB.getLabel());
                    return res;
                };
            }else{
                sortFunction = (a, b) => {
                    if (a.parent){
                        return -1;
                    }
                    let aMeta = a.node.getMetadata().get(attribute) || "";
                    let bMeta = b.node.getMetadata().get(attribute) || "";
                    let res;
                    if(sortType === 'number'){
                        aMeta = parseFloat(aMeta);
                        bMeta = parseFloat(bMeta);
                        res  = (direction === 'asc' ? aMeta - bMeta : bMeta - aMeta);
                    }else if(sortType === 'string'){
                        res = (direction === 'asc'? aMeta.localeCompare(bMeta) : bMeta.localeCompare(aMeta));
                    }
                    if(res === 0){
                        // Resort by label to make it stable
                        let labComp = a.node.getLabel().localeCompare(b.node.getLabel());
                        res = (direction === 'asc' ? labComp : -labComp);
                    }
                    return res;
                };
            }
            this.indexedElements.sort(sortFunction);
        }

        if(this.props.elementPerLine > 1){
            end = end * this.props.elementPerLine;
            start = start * this.props.elementPerLine;
        }
        return this.indexedElements.slice(start, end);
    },

    rebuildLoadedElements: function(){
        let newElements = this.buildElements(0, Math.max(this.state.elements.length, this.props.infiniteSliceCount));
        let infiniteLoadBeginBottomOffset = newElements.length? 200 : 0;
        this.setState({
            elements:newElements,
            infiniteLoadBeginBottomOffset:infiniteLoadBeginBottomOffset
        });
        this.updateInfiniteContainerHeight();
    },

    handleInfiniteLoad: function() {
        let elemLength = this.state.elements.length;
        let newElements = this.buildElements(elemLength, elemLength + this.props.infiniteSliceCount);
        let infiniteLoadBeginBottomOffset = newElements.length? 200 : 0;
        this.setState({
            isInfiniteLoading: false,
            elements: this.state.elements.concat(newElements),
            infiniteLoadBeginBottomOffset:infiniteLoadBeginBottomOffset
        });
    },

    /**
     * Extract remote sorting info from current node metadata
     */
    remoteSortingInfo: function(){
        let meta = this.props.node.getMetadata().get('paginationData');
        if(meta && meta.get('total') > 1 && meta.has('remote_order')){
            let col = meta.get('currentOrderCol');
            let dir = meta.get('currentOrderDir');
            if(col && dir){
                return {
                    remote: true,
                    attribute: col,
                    direction:dir
                };
            }
        }
        return null;
    },

    renderToolbar: function(hiddenMode = false){

        if(hiddenMode){
            if(this.props.sortKeys){
                let sortingInfo, remoteSortingInfo = this.remoteSortingInfo();
                if(remoteSortingInfo){
                    sortingInfo = remoteSortingInfo;
                }else{
                    sortingInfo = this.state?this.state.sortingInfo:null;
                }
                return <SortColumns displayMode="hidden" tableKeys={this.props.sortKeys} columnClicked={this.onColumnSort} sortingInfo={sortingInfo} />;
            }
            return null;
        }

        let rightButtons = [<FontIcon
            key={1}
            tooltip="Reload"
            className={"mdi mdi-reload" + (this.state.loading?" rotating":"")}
            onClick={this.reload}
        />];
        let i = 2;
        if(this.props.sortKeys){

            let sortingInfo, remoteSortingInfo = this.remoteSortingInfo();
            if(remoteSortingInfo){
                sortingInfo = remoteSortingInfo;
            }else{
                sortingInfo = this.state?this.state.sortingInfo:null;
            }
            rightButtons.push(<SortColumns
                key={i}
                displayMode="menu"
                tableKeys={this.props.sortKeys}
                columnClicked={this.onColumnSort}
                sortingInfo={sortingInfo}
            />);
            i++;
        }
        if(this.props.additionalActions){
            rightButtons.push(this.props.additionalActions);
        }

        let leftToolbar, paginator;
        if(this.props.node.getMetadata().get("paginationData") && this.props.node.getMetadata().get("paginationData").get('total') > 1){
            paginator = (
                <ListPaginator dataModel={this.dm} node={this.props.node}/>
            );
        }

        if(this.props.listTitle){
            leftToolbar =(
                <ToolbarGroup key={0} float="left">
                    <div className="list-title">{this.props.listTitle}</div>
                </ToolbarGroup>
            );
        }

        if(this.props.searchResultData){

            leftToolbar =(
                <ToolbarGroup key={0} float="left">
                    <div style={{fontSize: 15, fontWeight: 500, color: '#9e9e9e'}}>{this.context.getMessage('react.3').replace('%s', this.props.searchResultData.term)}</div>
                </ToolbarGroup>
            );
            rightButtons = <RaisedButton key={1} label={this.context.getMessage('react.4')} primary={true} onTouchTap={this.props.searchResultData.toggleState} style={{marginRight: -10}} />;

        }else if(this.actionsCache.multiple.size || this.props.multipleActions){
            let bulkLabel = this.context.getMessage('react.2');
            let hiddenStyle = {
                transform: 'translateX(-80px)'
            };
            let cbStyle = {width: 24, ...hiddenStyle};
            let buttonStyle = {...hiddenStyle};
            if(this.state.showSelector){
                cbStyle = {width:24, transform:'translateX(-12px)'};
                buttonStyle = {transform:'translateX(-40px)'};
            }
            if(this.state.selection && this.state.showSelector){
                bulkLabel +=" (" + this.state.selection.size + ")";
            }
            leftToolbar = (
                <ToolbarGroup key={0} float="left" className="hide-on-vertical-layout">
                    <Checkbox ref="all_selector" onClick={this.selectAll} style={cbStyle}/>
                    <FlatButton label={bulkLabel} onClick={this.toggleSelector} style={buttonStyle} />
                </ToolbarGroup>
            );

            if(this.state.showSelector) {
                rightButtons = [];
                let index = 0;
                const actions = this.props.multipleActions || this.actionsCache.multiple;
                actions.forEach(function(a){
                    rightButtons.push(<RaisedButton
                        key={index}
                        label={a.options.text}
                        data-action={a.options.name}
                        onClick={this.applyMultipleAction}
                        primary={true}/>
                    );
                }.bind(this));
                rightButtons = (<span>{rightButtons}</span>);

            }

        }

        return (
            <Toolbar style={this.props.toolbarStyle}>
                {leftToolbar}
                <ToolbarGroup key={1} float="right">
                    {paginator}
                    {rightButtons}
                </ToolbarGroup>
            </Toolbar>
        );

    },

    render: function(){

        let containerClasses = "material-list vertical-layout layout-fill";
        if(this.props.className){
            containerClasses += " " + this.props.className;
        }
        if(this.state.showSelector) {
            containerClasses += " list-show-selectors";
        }
        if(this.props.tableKeys){
            containerClasses += " table-mode";
        }
        let toolbar;
        let hiddenToolbar;
        if(this.props.tableKeys){
            let tableKeys;
            if(this.props.defaultGroupBy){
                tableKeys = LangUtils.deepCopy(this.props.tableKeys);
                delete tableKeys[this.props.defaultGroupBy];
            }else{
                tableKeys = this.props.tableKeys;
            }
            let sortingInfo, remoteSortingInfo = this.remoteSortingInfo();
            if(remoteSortingInfo){
                sortingInfo = remoteSortingInfo;
            }else{
                sortingInfo = this.state?this.state.sortingInfo:null;
            }
            toolbar = <TableListHeader
                tableKeys={tableKeys}
                loading={this.state.loading}
                reload={this.reload}
                ref="loading_indicator"
                dm={this.props.dataModel}
                node={this.props.node}
                additionalActions={this.props.additionalActions}
                onHeaderClick={this.onColumnSort}
                sortingInfo={sortingInfo}
            />
        }else{
            toolbar = this.props.customToolbar ? this.props.customToolbar : ( !this.props.hideToolbar ? this.renderToolbar() : null );
            if(this.props.hideToolbar || this.props.customToolbar){
                hiddenToolbar = this.renderToolbar(true);
            }
        }

        let inlineEditor;
        if(this.state.inlineEditionForNode){
            inlineEditor = <InlineEditor
                detached={true}
                node={this.state.inlineEditionForNode}
                callback={this.state.inlineEditionCallback}
                onClose={()=>{this.setState({inlineEditionForNode:null});}}
            />
        }

        let emptyState;
        const {emptyStateProps, node} = this.props;
        if(emptyStateProps && this.props.node.isLoaded() && !this.props.node.isLoading() &&
            ( !this.state.elements.length || (this.state.elements.length === 1 && this.state.elements[0].parent)) ){

            let actionProps = {};
            if(this.state.elements.length === 1 && this.state.elements[0].parent){
                const parentNode = this.state.elements[0].node;
                actionProps = {
                    actionLabelId: 'react.1',
                    actionIconClassName: SimpleList.PARENT_FOLDER_ICON,
                    actionCallback: (e) => {
                        if(this.props.entryHandleClicks) {
                            this.props.entryHandleClicks(parentNode, SimpleList.CLICK_TYPE_DOUBLE, e);
                        }
                    }
                }
            }
            emptyState = <EmptyStateView {...emptyStateProps} {...actionProps}/> ;

        }else if(emptyStateProps && emptyStateProps.checkEmptyState && emptyStateProps.checkEmptyState(this.props.node)){

            emptyState = <EmptyStateView {...emptyStateProps}/> ;

        }

        const elements = this.buildElementsFromNodeEntries(this.state.elements, this.state.showSelector);

        return (
            <div className={containerClasses} onContextMenu={this.contextMenuResponder} tabIndex="0" onKeyDown={this.onKeyDown} style={this.props.style}>
                {toolbar}{hiddenToolbar}
                {inlineEditor}
                <div className={this.props.heightAutoWithMax?"infinite-parent-smooth-height":(emptyState?"layout-fill vertical_layout":"layout-fill")} ref="infiniteParent">
                    {!emptyState && !this.props.verticalScroller &&
                    <Infinite
                        elementHeight={this.state.elementHeight ? this.state.elementHeight : this.props.elementHeight}
                        containerHeight={this.state.containerHeight ? this.state.containerHeight : 1}
                        infiniteLoadBeginEdgeOffset={this.state.infiniteLoadBeginBottomOffset}
                        onInfiniteLoad={this.handleInfiniteLoad}
                        handleScroll={this.onScroll}
                        ref="infinite"
                    >
                        {elements}
                    </Infinite>
                    }
                    {!emptyState && this.props.verticalScroller &&
                        <ScrollArea
                            speed={0.8}
                            horizontalScroll={false}
                            style={{height:this.state.containerHeight}}
                            verticalScrollbarStyle={{borderRadius: 10, width: 6}}
                            verticalContainerStyle={{width: 8}}
                        >
                            <div>{elements}</div>
                        </ScrollArea>
                    }
                    {emptyState}
                </div>
            </div>
        );
    }

});

export {SimpleList as default}
