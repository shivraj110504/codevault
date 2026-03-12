// lib/github.js
// All GitHub operations via REST API (no SDK needed for Vercel edge compatibility)

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const BASE_PATH = process.env.GITHUB_BASE_PATH || 'files'; // subfolder in repo

const API = 'https://api.github.com';

function validateConfig() {
  const missing = [];
  if (!GITHUB_TOKEN || GITHUB_TOKEN.includes('xxx')) missing.push('GITHUB_TOKEN');
  if (!GITHUB_OWNER || GITHUB_OWNER === 'your-username') missing.push('GITHUB_OWNER');
  if (!GITHUB_REPO || GITHUB_REPO === 'my-codevault-files') missing.push('GITHUB_REPO');
  
  if (missing.length > 0) {
    throw new Error(`CONFIG_ERROR: Missing or default configuration for: ${missing.join(', ')}`);
  }
}

function headers() {
  validateConfig();
  return {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

// List all files in the base path
export async function listFiles() {
  try {
    const res = await fetch(
      `${API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${BASE_PATH}`,
      { headers: headers(), cache: 'no-store' }
    );
    if (res.status === 404) return []; // folder doesn't exist yet
    if (!res.ok) throw new Error(`GitHub list error: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data)
      ? data.filter(f => f.type === 'file').map(f => ({
          name: f.name,
          path: f.path,
          sha: f.sha,
          size: f.size,
          download_url: f.download_url,
          html_url: f.html_url,
        }))
      : [];
  } catch (e) {
    console.error('listFiles error:', e);
    return [];
  }
}

// Get a single file's content
export async function getFile(filename) {
  const res = await fetch(
    `${API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${BASE_PATH}/${filename}`,
    { headers: headers(), cache: 'no-store' }
  );
  if (!res.ok) throw new Error(`File not found: ${filename}`);
  const data = await res.json();
  const content = Buffer.from(data.content, 'base64').toString('utf-8');
  return { ...data, decoded: content };
}

// Create or update a file
export async function saveFile(filename, content, existingSha = null) {
  const encoded = Buffer.from(content, 'utf-8').toString('base64');
  const body = {
    message: existingSha ? `Update ${filename}` : `Add ${filename}`,
    content: encoded,
    ...(existingSha && { sha: existingSha }),
  };
  const res = await fetch(
    `${API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${BASE_PATH}/${filename}`,
    { method: 'PUT', headers: headers(), body: JSON.stringify(body) }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Save failed');
  }
  return res.json();
}

// Delete a file
export async function deleteFile(filename, sha) {
  const body = { message: `Delete ${filename}`, sha };
  const res = await fetch(
    `${API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${BASE_PATH}/${filename}`,
    { method: 'DELETE', headers: headers(), body: JSON.stringify(body) }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Delete failed');
  }
  return res.json();
}

// Rename = create new + delete old
export async function renameFile(oldName, newName, content) {
  // Get current file to get sha
  const current = await getFile(oldName);
  await saveFile(newName, content);
  await deleteFile(oldName, current.sha);
}
