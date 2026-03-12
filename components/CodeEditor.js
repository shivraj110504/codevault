// components/CodeEditor.js
import React, { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { python } from '@codemirror/lang-python';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';

function getExtensions(filename) {
  const ext = filename?.split('.').pop()?.toLowerCase();
  const extMap = {
    js: javascript({ jsx: false }),
    jsx: javascript({ jsx: true }),
    ts: javascript({ typescript: true }),
    tsx: javascript({ jsx: true, typescript: true }),
    mjs: javascript(),
    cjs: javascript(),
    html: html(),
    htm: html(),
    css: css(),
    scss: css(),
    py: python(),
    json: json(),
    jsonc: json(),
    md: markdown(),
    mdx: markdown(),
  };
  return extMap[ext] ? [extMap[ext]] : [];
}

const customTheme = EditorView.theme({
  '&': {
    background: '#0d0d0d !important',
    height: '100%',
    fontSize: '14px',
  },
  '.cm-content': {
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    padding: '16px 0',
    caretColor: '#00ff88',
  },
  '.cm-line': { padding: '0 16px' },
  '.cm-cursor': { borderLeftColor: '#00ff88 !important', borderLeftWidth: '2px' },
  '.cm-gutters': {
    background: '#0d0d0d !important',
    borderRight: '1px solid #1e1e1e',
    color: '#333',
    minWidth: '48px',
  },
  '.cm-activeLineGutter': { background: '#141414 !important' },
  '.cm-activeLine': { background: '#141414 !important' },
  '.cm-selectionBackground': { background: '#00ff8822 !important' },
  '&.cm-focused .cm-selectionBackground': { background: '#00ff8833 !important' },
  '.cm-matchingBracket': { background: '#00ff8822', color: '#00ff88 !important' },
  '.cm-lineNumbers': { color: '#2a2a2a' },
  '.cm-lineNumbers .cm-gutterElement:hover': { color: '#555' },
  '.cm-scroller': { overflow: 'auto', height: '100%' },
});

export default function CodeEditor({ filename, value, onChange }) {
  const extensions = useMemo(() => [
    ...getExtensions(filename),
    customTheme,
    EditorView.lineWrapping,
  ], [filename]);

  return (
    <div style={{ height: '100%', overflow: 'hidden', background: '#0d0d0d' }}>
      <CodeMirror
        value={value}
        height="100%"
        theme={oneDark}
        extensions={extensions}
        onChange={onChange}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightSpecialChars: true,
          history: true,
          foldGutter: true,
          drawSelection: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          syntaxHighlighting: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          rectangularSelection: true,
          crosshairCursor: true,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          closeBracketsKeymap: true,
          defaultKeymap: true,
          searchKeymap: true,
          historyKeymap: true,
          foldKeymap: true,
          completionKeymap: true,
          lintKeymap: true,
        }}
        style={{ height: '100%' }}
      />
    </div>
  );
}
