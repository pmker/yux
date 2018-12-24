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

export default React.createClass({

    propTypes: {
        label:React.PropTypes.string,
        labelElement:React.PropTypes.object,
        tooltip:React.PropTypes.string,
        tooltipClassName:React.PropTypes.string,
        className:React.PropTypes.string,
        style:React.PropTypes.object
    },

    getInitialState:function(){
        return {show:false};
    },

    show:function(){this.setState({show:true});},
    hide:function(){this.setState({show:false});},

    render:function(){
        if(this.props.tooltip){
            let tooltipStyle={};
            if(this.props.label || this.props.labelElement){
                if(this.state.show){
                    tooltipStyle = {bottom: -10, top: 'inherit'};
                }
            }else{
                tooltipStyle = {position:'relative'};
            }
            let label;
            if(this.props.label){
                label = <span className="ellipsis-label">{this.props.label}</span>;
            }else if(this.props.labelElement){
                label = this.props.labelElement;
            }
            let style = this.props.style || {position:'relative'};

            return (
                <span onMouseEnter={this.show} onMouseLeave={this.hide} style={style} className={this.props.className}>
                        {label}
                    {this.props.children}
                    <ReactMUI.Tooltip label={this.props.tooltip} style={tooltipStyle} className={this.props.tooltipClassName} show={this.state.show}/>
                    </span>
            );
        }else{
            if(this.props.label) {
                return <span>{this.props.label}</span>;
            } else if(this.props.labelElement) {
                return this.props.labelElement;
            } else {
                return <span>{this.props.children}</span>;
            }
        }
    }

});
