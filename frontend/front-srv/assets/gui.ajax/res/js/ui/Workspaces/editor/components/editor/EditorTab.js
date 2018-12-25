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

import Pydio from 'pydio'
import { Toolbar, ToolbarGroup, ToolbarSeparator, Card, CardHeader, CardMedia, DropDownMenu, MenuItem, Slider, IconButton, TextField, Snackbar } from 'material-ui';
import { connect } from 'react-redux';
import Draggable from 'react-draggable';
import panAndZoomHoc from 'react-pan-and-zoom-hoc';
import { compose, bindActionCreators } from 'redux';
import makeMaximise from './make-maximise';

const { EditorActions, ResolutionActions, ContentActions, SizeActions, SelectionActions, LocalisationActions, withMenu, withContentControls, withSizeControls, withAutoPlayControls, withResolutionControls } = Pydio.requireLib('hoc');

const styles = {
    textField: {
        width: 150,
        marginRight: 40
    },
    textInput: {
        color: "rgba(255, 255,255, 0.87)"
    },
    textHint: {
        color: "rgba(255, 255,255, 0.67)"
    },
    iconButton: {
        backgroundColor: "rgba(0, 0, 0, 0.87)",
        color: "rgba(255, 255, 255, 0.87)",
        fill: "rgba(255, 255, 255, 0.87)"
    },
    divider: {
        backgroundColor: "rgba(255, 255,255, 0.87)",
        marginLeft: "12px",
        marginRight: "12px",
        alignSelf: "center"
    }
}

@connect(mapStateToProps, EditorActions)
export default class Tab extends React.Component {
    static get styles() {
        return {
            container: {
                display: "flex",
                flex: 1,
                flexFlow: "column nowrap",
                overflow: "auto",
                alignItems: "center"
                /*backgroundColor: "rgb(66, 66, 66)"*/
            },
            child: {
                display: "flex",
                flex: 1
            },
            toolbar: {
                backgroundColor: "rgb(0, 0, 0)",
                color: "rgba(255, 255, 255, 0.87)",
                width: "min-content",
                margin: "0 auto",
                padding: 0,
                position: "absolute",
                bottom: 24,
                height: 48,
                borderRadius: 3,
                alignSelf: "center"
            }
        }
    }

    render() {
        const {node, displaySnackbar, snackbarMessage, editorData, Editor, Controls, Actions, id, isActive, editorSetActiveTab, style, tabModify} = this.props

        const select = () => editorSetActiveTab(id)
        const cardStyle = {backgroundColor:'transparent', borderRadius: 0, ...style};

        return !isActive ? (
            <AnimatedCard style={cardStyle} containerStyle={Tab.styles.container} maximised={isActive} expanded={isActive} onExpandChange={!isActive ? select : null}>
                <CardHeader title={id} actAsExpander={true} showExpandableButton={true} />
                <CardMedia style={Tab.styles.child} mediaStyle={Tab.styles.child}>
                    <Editor pydio={pydio} node={node} editorData={editorData} isActive={isActive} />
                </CardMedia>
            </AnimatedCard>
        ) : (
            <AnimatedCard style={cardStyle} containerStyle={Tab.styles.container} maximised={true} expanded={isActive} onExpandChange={!isActive ? select : null}>
                <Editor pydio={pydio} node={node} editorData={editorData} isActive={isActive} />
                <BottomBar id={id} style={Tab.styles.toolbar} />
                <Snackbar
                    style={{
                        left: "10%",
                        bottom: 24
                    }}
                    open={snackbarMessage !== ""}
                    autoHideDuration={3000}
                    onRequestClose={() => tabModify({id, message: ""})}
                    message={<span>{snackbarMessage}</span>}
                />
            </AnimatedCard>
        )
    }
}

@withContentControls
@withAutoPlayControls
@withSizeControls
@withResolutionControls
@connect(mapStateToProps)
class BottomBar extends React.Component {
    constructor(props) {
        super(props)

        const {size, scale} = props

        this.state = {
            minusDisabled: scale - 0.5 <= 0,
            magnifyDisabled: size == "contain",
            plusDisabled: scale + 0.5 >= 20,
        }
    }

    componentWillReceiveProps(props) {
        const {size, scale} = props

        this.setState({
            minusDisabled: scale - 0.5 <= 0,
            magnifyDisabled: size == "contain",
            plusDisabled: scale + 0.5 >= 20,
        })
    }

    render() {
        const {minusDisabled= false, magnifyDisabled = false, plusDisabled = false} = this.state
        const {readonly, size, scale, playing = false, resolution = "hi", onAutoPlayToggle, onSizeChange, onResolutionToggle, ...remaining} = this.props

        // Content functions
        const {saveable, undoable, redoable, onSave, onUndo, onRedo, saveDisabled, undoDisabled, redoDisabled} = this.props
        const {onToggleLineNumbers, onToggleLineWrapping} = this.props
        const {onSearch, onJumpTo} = this.props

        const editable = (saveable || undoable || redoable) && !readonly
        const {editortools, searchable} = this.props

        // Resolution functions
        const {hdable} = this.props

        // Selection functions
        const {playable} = this.props

        // Size functions
        const {resizable} = this.props

        if (!editable && !editortools && !searchable && !hdable && !playable && !resizable) {
            return null
        }

        return (
            <Draggable>
                <Toolbar {...remaining}>
                    {playable && (
                        <ToolbarGroup>
                            <IconButton
                                iconClassName={"mdi " + (!playing ? "mdi-play" : "mdi-pause")}
                                iconStyle={styles.iconButton}
                                onClick={() => onAutoPlayToggle()}
                            />
                        </ToolbarGroup>
                    )}
                    {playable && resizable && (
                        <ToolbarSeparator style={styles.divider} />
                    )}
                    {resizable && (
                        <ToolbarGroup>
                            <IconButton
                                iconClassName="mdi mdi-minus"
                                iconStyle={styles.iconButton}
                                onClick={() => onSizeChange({
                                    size: "auto",
                                    scale: scale - 0.5
                                })}
                                disabled={minusDisabled}
                            />
                            <IconButton
                                iconClassName="mdi mdi-magnify-minus"
                                iconStyle={styles.iconButton}
                                onClick={() => onSizeChange({
                                    size: "contain",
                                })}
                                disabled={magnifyDisabled}
                            />
                            <IconButton
                                iconClassName="mdi mdi-plus"
                                iconStyle={styles.iconButton}
                                onClick={() => onSizeChange({
                                    size: "auto",
                                    scale: scale + 0.5
                                })}
                                disabled={plusDisabled}
                            />
                        </ToolbarGroup>
                    )}
                    {(playable || resizable) && hdable && (
                        <ToolbarSeparator style={styles.divider} />
                    )}
                    {hdable && (
                        <ToolbarGroup>
                            <IconButton
                                iconClassName={"mdi " + (resolution == "hi" ? "mdi-quality-high" : "mdi-image")}
                                iconStyle={styles.iconButton}
                                onClick={() => onResolutionToggle()}
                            />
                        </ToolbarGroup>
                    )}
                    {(playable || resizable || hdable) && editable && (
                        <ToolbarSeparator style={styles.divider} />
                    )}
                    {editable && (
                        <ToolbarGroup>
                            {saveable && (
                                <IconButton
                                    iconClassName="mdi mdi-content-save"
                                    iconStyle={styles.iconButton}
                                    onClick={() => onSave()}
                                    disabled={saveDisabled}
                                />
                            )}
                            {undoable && (
                                <IconButton
                                    iconClassName="mdi mdi-undo"
                                    iconStyle={styles.iconButton}
                                    onClick={() => onUndo()}
                                    disabled={undoDisabled}
                                />
                            )}
                            {redoable && (
                                <IconButton
                                    iconClassName="mdi mdi-redo"
                                    iconStyle={styles.iconButton}
                                    onClick={() => onRedo()}
                                    disabled={redoDisabled}
                                />
                            )}
                        </ToolbarGroup>
                    )}
                    {(playable || resizable || hdable || editable) && editortools && (
                        <ToolbarSeparator style={styles.divider} />
                    )}
                    {editortools && (
                        <ToolbarGroup>
                            {onToggleLineNumbers && (
                                <IconButton
                                    iconClassName="mdi mdi-format-list-numbers"
                                    iconStyle={styles.iconButton}
                                    onClick={() => onToggleLineNumbers()}
                                />
                            )}
                            {onToggleLineWrapping && (
                                <IconButton
                                    iconClassName="mdi mdi-wrap"
                                    iconStyle={styles.iconButton}
                                    onClick={() => onToggleLineWrapping()}
                                />
                            )}
                        </ToolbarGroup>
                    )}
                    {(playable || resizable || hdable || editable || editortools) && searchable && (
                        <ToolbarSeparator style={styles.divider} />
                    )}
                    {searchable && (
                        <ToolbarGroup>
                            <TextField onKeyUp={({key, target}) => key === 'Enter' && onJumpTo(target.value)} hintText="Jump to Line" style={styles.textField} hintStyle={styles.textHint} inputStyle={styles.textInput} />
                            <TextField onKeyUp={({key, target}) => key === 'Enter' && onSearch(target.value)} hintText="Search..." style={styles.textField} hintStyle={styles.textHint} inputStyle={styles.textInput} />
                        </ToolbarGroup>
                    )}
                </Toolbar>
            </Draggable>
        )
    }
}

function mapStateToProps(state, ownProps) {
    const { editor, tabs } = state

    let current = tabs.filter(tab => tab.id === ownProps.id)[0] || {}

    const {node, message = ""} = current

    return  {
        ...ownProps,
        ...current,
        isActive: editor.activeTabId === current.id,
        snackbarMessage: message,
        readonly: node.hasMetadataInBranch("node_readonly", "true"),
    }
}

const AnimatedCard = makeMaximise(Card)
