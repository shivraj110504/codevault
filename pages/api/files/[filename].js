// pages/api/files/[filename].js
import { getFile, saveFile, deleteFile } from '../../../lib/github';

export default async function handler(req, res) {
  const { filename } = req.query;

  if (!filename) return res.status(400).json({ error: 'filename required' });

  // GET - fetch file content
  if (req.method === 'GET') {
    try {
      const file = await getFile(filename);
      res.json({ content: file.decoded, sha: file.sha, name: file.name });
    } catch (e) {
      res.status(404).json({ error: e.message });
    }
  }

  // PUT - save (create or update) file
  else if (req.method === 'PUT') {
    const { content, sha } = req.body;
    if (content === undefined) return res.status(400).json({ error: 'content required' });
    try {
      const result = await saveFile(filename, content, sha || null);
      res.json({ success: true, sha: result.content?.sha });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  // DELETE - delete a file
  else if (req.method === 'DELETE') {
    const { sha } = req.body;
    if (!sha) return res.status(400).json({ error: 'sha required' });
    try {
      await deleteFile(filename, sha);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  else {
    res.status(405).end();
  }
}
