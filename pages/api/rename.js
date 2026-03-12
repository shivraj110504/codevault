// pages/api/rename.js
import { renameFile } from '../../lib/github';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { oldName, newName, content } = req.body;
  if (!oldName || !newName || content === undefined)
    return res.status(400).json({ error: 'oldName, newName, content required' });
  try {
    await renameFile(oldName, newName, content);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
