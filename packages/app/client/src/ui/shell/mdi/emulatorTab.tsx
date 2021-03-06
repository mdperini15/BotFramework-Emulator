//
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license.
//
// Microsoft Bot Framework: http://botframework.com
//
// Bot Framework Emulator Github:
// https://github.com/Microsoft/BotFramwork-Emulator
//
// Copyright (c) Microsoft Corporation
// All rights reserved.
//
// MIT License:
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED ""AS IS"", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

import * as React from 'react';
import { connect } from 'react-redux';

import { getTabGroupForDocument } from '../../../data/editorHelpers';
import * as ChatActions from '../../../data/action/chatActions';
import * as EditorActions from '../../../data/action/editorActions';
import { Tab } from './tab';
import { RootState } from '../../../data/store';
import { EmulatorMode } from '../../editor/emulator';

interface EmulatorTabProps {
  active?: boolean;
  dirty?: boolean;
  documentId?: string;
  mode?: EmulatorMode;
  title?: string;
  closeTab?: () => void;
}

class EmulatorTabComponent extends React.Component<EmulatorTabProps> {
  constructor(props: EmulatorTabProps) {
    super(props);
  }

  render() {
    return (
      <Tab active={ this.props.active } title={ this.props.title } onCloseClick={ this.onCloseClick }
           documentId={ this.props.documentId } dirty={ this.props.dirty }/>
    );
  }

  private onCloseClick = (e) => {
    e.stopPropagation();
    this.props.closeTab();
  }
}

const mapStateToProps = (state: RootState, ownProps: EmulatorTabProps): EmulatorTabProps => {
  const { mode, documentId } = ownProps;
  // TODO - localization
  let title;
  if (mode === 'livechat') {
    title = 'Live Chat';

    const { services = [] } = state.bot.activeBot || {};

    const { endpointId = null } = state.chat.chats[documentId] || {};
    const botEndpoint = services.find(s => s.id === endpointId);

    if (botEndpoint) {
      title += ` (${ botEndpoint.name })`;
    }
  } else if (mode === 'transcript') {
    const { editor: editorState } = state;
    const {editors, activeEditor} = editorState;
    const editor = editors[activeEditor];
    const document = editor.documents[documentId];
    title = 'Transcript';
    if (document.fileName) {
      title += ` (${document.fileName})`;
    }
  }

  return {
    active: state.editor.editors[state.editor.activeEditor].activeDocumentId === documentId,
    title
  };
};

const mapDispatchToProps = (dispatch, ownProps: EmulatorTabProps): EmulatorTabProps => ({
  closeTab: () => {
    dispatch(EditorActions.close(getTabGroupForDocument(ownProps.documentId), ownProps.documentId));
    dispatch(ChatActions.closeDocument(ownProps.documentId));
  }
});

export const EmulatorTab = connect(mapStateToProps, mapDispatchToProps)(EmulatorTabComponent);
