// lib/language.js
export function detectLanguage(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const map = {
    js: 'javascript', jsx: 'javascript', ts: 'javascript', tsx: 'javascript',
    mjs: 'javascript', cjs: 'javascript',
    html: 'html', htm: 'html',
    css: 'css', scss: 'css', sass: 'css',
    py: 'python',
    json: 'json', jsonc: 'json',
    md: 'markdown', mdx: 'markdown',
    sh: 'shell', bash: 'shell', zsh: 'shell',
    sql: 'sql',
    yaml: 'yaml', yml: 'yaml',
    xml: 'xml', svg: 'xml',
    php: 'php',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    c: 'c', h: 'c',
    cpp: 'cpp', cc: 'cpp',
    cs: 'csharp',
    swift: 'swift',
    kt: 'kotlin',
    txt: 'text',
  };
  return map[ext] || 'text';
}

export function getLanguageIcon(filename) {
  const lang = detectLanguage(filename);
  const icons = {
    javascript: '🟨', html: '🟧', css: '🟦', python: '🐍',
    json: '📋', markdown: '📝', shell: '⬛', sql: '🗄️',
    yaml: '⚙️', xml: '📄', php: '🐘', ruby: '💎',
    go: '🐹', rust: '🦀', java: '☕', c: '🔵', cpp: '🔵',
    csharp: '💜', swift: '🍊', kotlin: '🟣', text: '📄',
  };
  return icons[lang] || '📄';
}

export function getFileColor(filename) {
  const lang = detectLanguage(filename);
  const colors = {
    javascript: '#f7df1e', html: '#e34c26', css: '#264de4', python: '#3776ab',
    json: '#a6e22e', markdown: '#aaa', shell: '#89e051', sql: '#336791',
    yaml: '#cb171e', xml: '#0060ac', php: '#777bb4', ruby: '#cc342d',
    go: '#00add8', rust: '#dea584', java: '#b07219', c: '#555555',
    cpp: '#f34b7d', csharp: '#178600', swift: '#ffac45', kotlin: '#A97BFF',
    text: '#888',
  };
  return colors[lang] || '#888';
}
