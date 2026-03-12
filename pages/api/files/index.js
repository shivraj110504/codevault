// pages/api/files/index.js
import { listFiles } from '../../../lib/github';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const files = await listFiles();
    res.json({ files });
  } catch (e) {
    const status = e.message.includes('CONFIG_ERROR') ? 400 : 500;
    res.status(status).json({ error: e.message });
  }
}
