// pages/admin.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { getLanguageIcon, getFileColor, detectLanguage } from '../lib/language';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name'); // name | size | type
  const [previewFile, setPreviewFile] = useState(null); // { name, content }
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Check if already logged in (cookie)
  useEffect(() => {
    fetchStats().then(ok => { if (ok) setAuthed(true); });
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) return false;
      const data = await res.json();
      setStats(data);
      return true;
    } catch { return false; }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) { setLoginError('Invalid password'); return; }
      setAuthed(true);
      fetchStats();
    } catch { setLoginError('Login failed'); }
    finally { setLoading(false); }
  };

  const handleDeleteFile = async (file) => {
    if (!confirm(`Delete ${file.name}?`)) return;
    try {
      const res = await fetch(`/api/files/${encodeURIComponent(file.name)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sha: file.sha }),
      });
      if (!res.ok) throw new Error('Delete failed');
      showToast(`${file.name} deleted`);
      fetchStats();
    } catch { showToast('Delete failed', 'error'); }
  };

  const handlePreview = async (file) => {
    try {
      const res = await fetch(`/api/files/${encodeURIComponent(file.name)}`);
      const data = await res.json();
      setPreviewFile({ name: file.name, content: data.content });
    } catch { showToast('Preview failed', 'error'); }
  };

  const filteredFiles = stats?.files
    ? stats.files
        .filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
          if (sortBy === 'size') return b.size - a.size;
          if (sortBy === 'type') return detectLanguage(a.name).localeCompare(detectLanguage(b.name));
          return a.name.localeCompare(b.name);
        })
    : [];

  if (!authed) {
    return (
      <>
        <Head><title>Admin — CodeVault</title></Head>
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d0d0d' }}>
          <div className="w-80 animate-fade-in">
            <div className="text-center mb-8">
              <div className="text-4xl mb-3">🔐</div>
              <h1 className="text-xl font-semibold" style={{ color: '#e8e8e8' }}>Admin Portal</h1>
              <p className="text-xs mt-1" style={{ color: '#444' }}>CodeVault file manager</p>
            </div>
            <form onSubmit={handleLogin} className="flex flex-col gap-3">
              <input
                type="password"
                placeholder="Admin password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field w-full text-center"
                autoFocus
              />
              {loginError && (
                <p className="text-xs text-center" style={{ color: '#ff4444' }}>{loginError}</p>
              )}
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
            <div className="mt-6 text-center">
              <a href="/" className="text-xs" style={{ color: '#444' }}>← Back to editor</a>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head><title>Admin — CodeVault</title></Head>
      <div className="min-h-screen" style={{ background: '#0d0d0d' }}>
        {/* Header */}
        <header className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: '#1e1e1e', background: '#101010' }}>
          <div className="flex items-center gap-3">
            <span className="text-xl">⚡</span>
            <div>
              <h1 className="text-sm font-semibold" style={{ color: '#e8e8e8' }}>CodeVault Admin</h1>
              {stats?.repo && (
                <p className="text-xs" style={{ color: '#444' }}>
                  github.com/{stats.repo}/{stats.basePath}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a href="/" className="btn-ghost text-xs">← Editor</a>
            <button
              onClick={fetchStats}
              className="btn-ghost text-xs"
            >↻ Refresh</button>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-8">
          {/* Stats cards */}
          {stats && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              <StatCard label="Total Files" value={stats.totalFiles} icon="📁" />
              <StatCard label="Total Size" value={formatSize(stats.totalSize)} icon="💾" />
              <StatCard label="File Types" value={Object.keys(stats.byType).length} icon="🏷️" />
            </div>
          )}

          {/* Type breakdown */}
          {stats?.byType && Object.keys(stats.byType).length > 0 && (
            <div className="mb-8 p-4 rounded-lg" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
              <h2 className="text-xs font-semibold mb-3" style={{ color: '#666' }}>BY EXTENSION</h2>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.byType).sort((a, b) => b[1] - a[1]).map(([ext, count]) => (
                  <span key={ext} className="px-2 py-1 rounded text-xs font-mono"
                    style={{ background: '#1a1a1a', color: '#888', border: '1px solid #2a2a2a' }}>
                    .{ext} <span style={{ color: '#00ff88' }}>{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Files table */}
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #1e1e1e' }}>
            {/* Table header */}
            <div className="flex items-center gap-4 px-4 py-3 border-b" style={{ background: '#111', borderColor: '#1e1e1e' }}>
              <h2 className="text-xs font-semibold flex-1" style={{ color: '#666' }}>
                FILES ({filteredFiles.length})
              </h2>
              {/* Search */}
              <input
                className="input-field text-xs py-1"
                placeholder="Search files..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: 180 }}
              />
              {/* Sort */}
              <select
                className="input-field text-xs py-1"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                style={{ width: 100, background: '#141414' }}
              >
                <option value="name">Name</option>
                <option value="size">Size</option>
                <option value="type">Type</option>
              </select>
            </div>

            {filteredFiles.length === 0 ? (
              <div className="p-12 text-center text-xs" style={{ color: '#333', background: '#0d0d0d' }}>
                {search ? 'No files match your search.' : 'No files in the repository yet.'}
              </div>
            ) : (
              <div style={{ background: '#0d0d0d' }}>
                {filteredFiles.map((file, i) => (
                  <div
                    key={file.name}
                    className="flex items-center gap-4 px-4 py-3 group"
                    style={{
                      borderBottom: i < filteredFiles.length - 1 ? '1px solid #141414' : 'none',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#111'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span className="text-base" style={{ color: getFileColor(file.name) }}>
                      {getLanguageIcon(file.name)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-mono truncate" style={{ color: '#e8e8e8' }}>{file.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: '#444' }}>
                        {formatSize(file.size)} · {detectLanguage(file.name)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100" style={{ transition: 'opacity 0.15s' }}>
                      <button
                        onClick={() => handlePreview(file)}
                        className="btn-ghost text-xs px-2 py-1"
                        style={{ color: '#00ff88' }}
                      >Preview</button>
                      <a
                        href={file.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-ghost text-xs px-2 py-1"
                      >GitHub ↗</a>
                      <button
                        onClick={() => handleDeleteFile(file)}
                        className="text-xs px-2 py-1 rounded"
                        style={{ color: '#ff4444' }}
                      >Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Preview modal */}
        {previewFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8" style={{ background: '#000000cc' }}>
            <div className="w-full max-w-3xl max-h-full flex flex-col rounded-lg animate-fade-in"
              style={{ background: '#141414', border: '1px solid #2a2a2a' }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#1e1e1e' }}>
                <span className="font-mono text-sm" style={{ color: '#e8e8e8' }}>{previewFile.name}</span>
                <div className="flex gap-2">
                  <a href="/" className="btn-ghost text-xs" onClick={() => {
                    sessionStorage.setItem('openFile', previewFile.name);
                  }}>Open in editor</a>
                  <button onClick={() => setPreviewFile(null)} className="btn-ghost text-xs">Close ✕</button>
                </div>
              </div>
              <div className="overflow-auto flex-1 p-4">
                <pre className="text-xs font-mono" style={{ color: '#aaa', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {previewFile.content || '(empty file)'}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 right-6 px-4 py-2 rounded text-sm font-mono toast z-50"
            style={{
              background: toast.type === 'error' ? '#2d1010' : '#0d2015',
              border: `1px solid ${toast.type === 'error' ? '#ff4444' : '#00ff88'}`,
              color: toast.type === 'error' ? '#ff6666' : '#00ff88',
            }}>
            {toast.msg}
          </div>
        )}
      </div>
    </>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="rounded-lg p-4" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs" style={{ color: '#555' }}>{label}</span>
      </div>
      <div className="text-2xl font-semibold font-mono" style={{ color: '#e8e8e8' }}>{value}</div>
    </div>
  );
}
