// pages/index.js
import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { getLanguageIcon, getFileColor } from '../lib/language';

// Dynamically import the code editor (client-only)
const CodeEditor = dynamic(() => import('../components/CodeEditor'), { ssr: false });

export default function Home() {
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null); // { name, sha, content }
  const [editorContent, setEditorContent] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(null);
  const [toast, setToast] = useState(null);
  const [showNewFile, setShowNewFile] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [dirty, setDirty] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const newFileRef = useRef(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/files');
      const data = await res.json();
      if (!res.ok && data.error?.includes('CONFIG_ERROR')) {
        setConfigError(data.error.split(': ')[1]);
        return;
      }
      setFiles(data.files || []);
      setConfigError(null);
    } catch (e) {
      showToast('Failed to load files', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  useEffect(() => {
    if (showNewFile && newFileRef.current) newFileRef.current.focus();
  }, [showNewFile]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (activeFile) handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeFile, editorContent]);

  const openFile = async (file) => {
    if (dirty && activeFile) {
      if (!confirm(`Discard unsaved changes to ${activeFile.name}?`)) return;
    }
    try {
      const res = await fetch(`/api/files/${encodeURIComponent(file.name)}`);
      const data = await res.json();
      setActiveFile({ name: data.name, sha: data.sha });
      setEditorContent(data.content);
      setDirty(false);
      setRenaming(false);
    } catch {
      showToast('Failed to open file', 'error');
    }
  };

  const handleSave = async () => {
    if (!activeFile) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/files/${encodeURIComponent(activeFile.name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editorContent, sha: activeFile.sha }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActiveFile(prev => ({ ...prev, sha: data.sha }));
      setDirty(false);
      showToast(`${activeFile.name} saved ✓`);
      fetchFiles();
    } catch (e) {
      showToast(e.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNew = async () => {
    const name = newFileName.trim();
    if (!name) return;
    if (files.find(f => f.name === name)) {
      showToast('File already exists', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/files/${encodeURIComponent(name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewFileName('');
      setShowNewFile(false);
      await fetchFiles();
      // Open the new file
      setActiveFile({ name, sha: data.sha });
      setEditorContent('');
      setDirty(false);
      showToast(`${name} created`);
    } catch (e) {
      showToast(e.message || 'Create failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (file) => {
    try {
      const res = await fetch(`/api/files/${encodeURIComponent(file.name)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sha: file.sha }),
      });
      if (!res.ok) throw new Error('Delete failed');
      if (activeFile?.name === file.name) {
        setActiveFile(null);
        setEditorContent('');
        setDirty(false);
      }
      setDeleteConfirm(null);
      await fetchFiles();
      showToast(`${file.name} deleted`);
    } catch {
      showToast('Delete failed', 'error');
    }
  };

  const handleRename = async () => {
    const newName = renameValue.trim();
    if (!newName || newName === activeFile.name) { setRenaming(false); return; }
    if (files.find(f => f.name === newName)) {
      showToast('Name already taken', 'error'); return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName: activeFile.name, newName, content: editorContent }),
      });
      if (!res.ok) throw new Error('Rename failed');
      setActiveFile(prev => ({ ...prev, name: newName }));
      setRenaming(false);
      await fetchFiles();
      showToast(`Renamed to ${newName}`);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Head>
        <title>CodeVault — Code File Manager</title>
        <meta name="description" content="Store and manage code files in GitHub" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>" />
      </Head>

      <div className="flex h-screen overflow-hidden" style={{ background: '#0d0d0d' }}>
        {/* SETUP OVERLAY */}
        {configError && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <div className="max-w-md w-full p-8 rounded-2xl border border-[#00ff88]/30 bg-[#0d0d0d] shadow-2xl shadow-[#00ff88]/10 animate-fade-in">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-[#00ff88]/10 flex items-center justify-center mb-6 border border-[#00ff88]/20">
                  <span className="text-3xl text-[#00ff88]">⚡</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Setup Required</h2>
                <p className="text-[#888] text-sm mb-6 leading-relaxed">
                  To start using CodeVault, you need to configure your GitHub environment variables.
                </p>

                <div className="w-full space-y-3 mb-8">
                  {configError.split(', ').map(missing => (
                    <div key={missing} className="flex items-center gap-3 p-3 rounded-lg bg-[#1a1a1a] border border-[#333]">
                      <span className="text-red-400">✕</span>
                      <span className="text-xs font-mono text-[#aaa]">Missing {missing}</span>
                    </div>
                  ))}
                </div>

                <div className="w-full p-4 rounded-xl bg-[#111] border border-[#333] mb-8 text-left">
                  <p className="text-[10px] uppercase tracking-wider text-[#555] font-bold mb-2">Instructions</p>
                  <ol className="text-xs text-[#888] space-y-2 list-decimal list-inside">
                    <li>Open <code className="text-[#00ff88]">.env.example</code></li>
                    <li>Copy it to a new file named <code className="text-[#00ff88]">.env</code></li>
                    <li>Fill in your GitHub personal token and repo info</li>
                    <li>Restart the dev server</li>
                  </ol>
                </div>

                <button
                  onClick={() => window.location.reload()}
                  className="w-full py-3 rounded-xl font-bold text-black bg-[#00ff88] hover:bg-[#00dd77] transition-all transform active:scale-95 shadow-lg shadow-[#00ff88]/20"
                >
                  I've updated my .env
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SIDEBAR */}
        <aside className="w-60 flex-shrink-0 flex flex-col border-r" style={{ borderColor: '#1e1e1e', background: '#101010' }}>
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: '#1e1e1e' }}>
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <span className="font-semibold text-sm tracking-wide" style={{ color: '#00ff88' }}>CodeVault</span>
            </div>
            <a href="/admin" className="text-xs" style={{ color: '#444' }} title="Admin portal">⚙️</a>
          </div>

          {/* New file button */}
          <div className="p-3 border-b" style={{ borderColor: '#1e1e1e' }}>
            {showNewFile ? (
              <div className="flex gap-1">
                <input
                  ref={newFileRef}
                  className="input-field flex-1 text-xs"
                  placeholder="filename.js"
                  value={newFileName}
                  onChange={e => setNewFileName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleCreateNew();
                    if (e.key === 'Escape') { setShowNewFile(false); setNewFileName(''); }
                  }}
                />
                <button onClick={handleCreateNew} className="btn-primary text-xs px-2 py-1">✓</button>
                <button onClick={() => { setShowNewFile(false); setNewFileName(''); }} className="btn-ghost text-xs px-2">✕</button>
              </div>
            ) : (
              <button
                onClick={() => setShowNewFile(true)}
                className="w-full text-left text-xs flex items-center gap-2 px-2 py-1.5 rounded"
                style={{ color: '#00ff88', background: '#0d1f14', border: '1px dashed #00ff8833' }}
              >
                <span>+</span> New file
              </button>
            )}
          </div>

          {/* File list */}
          <div className="flex-1 overflow-y-auto py-2">
            {loading ? (
              <div className="px-4 py-8 text-center text-xs" style={{ color: '#444' }}>Loading...</div>
            ) : files.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs" style={{ color: '#444' }}>
                No files yet.<br />Create your first file above.
              </div>
            ) : (
              files.map(file => (
                <div
                  key={file.name}
                  className={`group flex items-center px-3 py-2 cursor-pointer relative ${activeFile?.name === file.name ? 'active' : ''}`}
                  style={{
                    background: activeFile?.name === file.name ? '#1a2e22' : 'transparent',
                    borderLeft: activeFile?.name === file.name ? '2px solid #00ff88' : '2px solid transparent',
                  }}
                  onClick={() => openFile(file)}
                >
                  <span className="mr-2 text-sm" style={{ color: getFileColor(file.name) }}>
                    {getLanguageIcon(file.name)}
                  </span>
                  <span className="flex-1 text-xs font-mono truncate" style={{ color: activeFile?.name === file.name ? '#e8e8e8' : '#888' }}>
                    {file.name}
                  </span>
                  {/* Delete button - show on hover */}
                  <button
                    className="opacity-0 group-hover:opacity-100 ml-1 text-xs p-0.5 rounded"
                    style={{ color: '#ff4444', transition: 'opacity 0.15s' }}
                    onClick={e => {
                      e.stopPropagation();
                      setDeleteConfirm(file);
                    }}
                    title="Delete file"
                  >✕</button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t text-xs" style={{ borderColor: '#1e1e1e', color: '#333' }}>
            {files.length} file{files.length !== 1 ? 's' : ''}
          </div>
        </aside>

        {/* MAIN EDITOR AREA */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {activeFile ? (
            <>
              {/* Tab bar */}
              <div className="flex items-center border-b px-2 h-10 flex-shrink-0 gap-2" style={{ borderColor: '#1e1e1e', background: '#0f0f0f' }}>
                {/* File tab with rename */}
                <div className="flex items-center gap-1 px-3 py-1 rounded-t text-xs font-mono"
                  style={{ background: '#1a2e22', borderBottom: '2px solid #00ff88', color: '#e8e8e8' }}>
                  <span style={{ color: getFileColor(activeFile.name) }}>{getLanguageIcon(activeFile.name)}</span>
                  {renaming ? (
                    <input
                      autoFocus
                      className="bg-transparent outline-none border-b font-mono text-xs"
                      style={{ borderColor: '#00ff88', width: Math.max(80, renameValue.length * 8) }}
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onBlur={handleRename}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRename();
                        if (e.key === 'Escape') setRenaming(false);
                      }}
                    />
                  ) : (
                    <span
                      className="cursor-text"
                      onDoubleClick={() => { setRenaming(true); setRenameValue(activeFile.name); }}
                      title="Double-click to rename"
                    >
                      {activeFile.name}
                      {dirty && <span style={{ color: '#00ff8866' }}> ●</span>}
                    </span>
                  )}
                </div>

                <div className="flex-1" />

                {/* Actions */}
                <span className="text-xs" style={{ color: '#444' }}>⌘S to save</span>
                <button
                  onClick={handleSave}
                  disabled={saving || !dirty}
                  className="btn-primary text-xs py-1 px-3"
                  style={{ opacity: (!dirty || saving) ? 0.5 : 1 }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>

              {/* Code editor */}
              <div className="flex-1 overflow-hidden">
                <CodeEditor
                  filename={activeFile.name}
                  value={editorContent}
                  onChange={val => { setEditorContent(val); setDirty(true); }}
                />
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center" style={{ color: '#333' }}>
              <div className="text-6xl mb-6">⚡</div>
              <div className="text-xl font-semibold mb-2" style={{ color: '#444' }}>CodeVault</div>
              <div className="text-sm mb-6" style={{ color: '#333' }}>Select a file or create a new one</div>
              <button
                onClick={() => setShowNewFile(true)}
                className="btn-primary text-sm"
              >
                + New file
              </button>
            </div>
          )}
        </main>

        {/* DELETE CONFIRM MODAL */}
        {deleteConfirm && (
          <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: '#000000aa' }}>
            <div className="rounded-lg p-6 w-80 animate-fade-in" style={{ background: '#141414', border: '1px solid #2a2a2a' }}>
              <div className="text-sm font-semibold mb-2" style={{ color: '#e8e8e8' }}>Delete file?</div>
              <div className="text-xs mb-4" style={{ color: '#666' }}>
                <span className="font-mono" style={{ color: '#ff6644' }}>{deleteConfirm.name}</span> will be permanently deleted from GitHub.
              </div>
              <div className="flex gap-2 justify-end">
                <button className="btn-ghost text-xs" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button
                  className="px-3 py-1.5 text-xs font-semibold rounded"
                  style={{ background: '#ff4444', color: '#fff' }}
                  onClick={() => handleDelete(deleteConfirm)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TOAST */}
        {toast && (
          <div
            className="fixed bottom-6 right-6 px-4 py-2 rounded text-sm font-mono toast z-50"
            style={{
              background: toast.type === 'error' ? '#2d1010' : '#0d2015',
              border: `1px solid ${toast.type === 'error' ? '#ff4444' : '#00ff88'}`,
              color: toast.type === 'error' ? '#ff6666' : '#00ff88',
            }}
          >
            {toast.msg}
          </div>
        )}
      </div>
    </>
  );
}
