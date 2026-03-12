// pages/api/admin/stats.js
import { requireAdmin } from '../../../lib/auth';
import { listFiles } from '../../../lib/github';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const admin = await requireAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const files = await listFiles();
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const byType = {};
    files.forEach(f => {
      const ext = f.name.split('.').pop() || 'unknown';
      byType[ext] = (byType[ext] || 0) + 1;
    });
    res.json({
      totalFiles: files.length,
      totalSize,
      byType,
      files,
      repo: `${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}`,
      basePath: process.env.GITHUB_BASE_PATH || 'files',
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
