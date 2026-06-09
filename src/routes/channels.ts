import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { auth } from '../middleware/auth';

const router = Router();

router.post('/', auth, async (req: Request, res: Response): Promise<void> => {
  const { server_id, category_id, name, type = 'text', topic } = req.body as Record<string, string>;
  if (!server_id || !name) { res.status(400).json({ error: 'server_id and name required' }); return; }
  try {
    const server = (await pool.query('SELECT owner_id FROM servers WHERE id = $1', [server_id])).rows[0];
    if (!server || server.owner_id !== req.user!.id) { res.status(403).json({ error: 'No permission' }); return; }

    const pos = (await pool.query('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM channels WHERE server_id = $1', [server_id])).rows[0].p as number;
    const channel = (await pool.query(
      'INSERT INTO channels (server_id, category_id, name, type, topic, position) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [server_id, category_id || null, name.toLowerCase().replace(/\s+/g, '-'), type, topic || null, pos]
    )).rows[0];
    res.status(201).json(channel);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.patch('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, topic, slowmode, nsfw, position, category_id } = req.body as Record<string, string>;
  try {
    const ch = (await pool.query('SELECT c.*, s.owner_id FROM channels c JOIN servers s ON c.server_id = s.id WHERE c.id = $1', [id])).rows[0];
    if (!ch) { res.status(404).json({ error: 'Not found' }); return; }
    if (ch.owner_id !== req.user!.id) { res.status(403).json({ error: 'No permission' }); return; }

    const updates: Record<string, string | boolean | number> = {};
    if (name !== undefined) updates.name = name.toLowerCase().replace(/\s+/g, '-');
    if (topic !== undefined) updates.topic = topic;
    if (slowmode !== undefined) updates.slowmode = Number(slowmode);
    if (nsfw !== undefined) updates.nsfw = nsfw === 'true';
    if (position !== undefined) updates.position = Number(position);
    if (category_id !== undefined) updates.category_id = category_id;

    if (!Object.keys(updates).length) { res.json(ch); return; }

    const set = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ');
    const result = await pool.query(`UPDATE channels SET ${set} WHERE id = $1 RETURNING *`, [id, ...Object.values(updates)]);
    res.json(result.rows[0]);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const ch = (await pool.query('SELECT c.*, s.owner_id FROM channels c JOIN servers s ON c.server_id = s.id WHERE c.id = $1', [id])).rows[0];
    if (!ch) { res.status(404).json({ error: 'Not found' }); return; }
    if (ch.owner_id !== req.user!.id) { res.status(403).json({ error: 'No permission' }); return; }

    await pool.query('DELETE FROM channels WHERE id = $1', [id]);
    res.json({ message: 'Channel deleted' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.post('/categories', auth, async (req: Request, res: Response): Promise<void> => {
  const { server_id, name } = req.body as { server_id: string; name: string };
  if (!server_id || !name) { res.status(400).json({ error: 'server_id and name required' }); return; }
  try {
    const server = (await pool.query('SELECT owner_id FROM servers WHERE id = $1', [server_id])).rows[0];
    if (!server || server.owner_id !== req.user!.id) { res.status(403).json({ error: 'No permission' }); return; }

    const pos = (await pool.query('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM categories WHERE server_id = $1', [server_id])).rows[0].p as number;
    const cat = (await pool.query(
      'INSERT INTO categories (server_id, name, position) VALUES ($1, $2, $3) RETURNING *',
      [server_id, name.toUpperCase(), pos]
    )).rows[0];
    res.status(201).json(cat);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/categories/:id', auth, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const cat = (await pool.query('SELECT cat.*, s.owner_id FROM categories cat JOIN servers s ON cat.server_id = s.id WHERE cat.id = $1', [id])).rows[0];
    if (!cat) { res.status(404).json({ error: 'Not found' }); return; }
    if (cat.owner_id !== req.user!.id) { res.status(403).json({ error: 'No permission' }); return; }

    await pool.query('UPDATE channels SET category_id = NULL WHERE category_id = $1', [id]);
    await pool.query('DELETE FROM categories WHERE id = $1', [id]);
    res.json({ message: 'Category deleted' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.get('/:id/pins', auth, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT m.*, u.username, u.avatar, u.discriminator
      FROM pinned_messages pm
      JOIN messages m ON pm.message_id = m.id
      JOIN users u ON m.user_id = u.id
      WHERE pm.channel_id = $1 ORDER BY pm.pinned_at DESC
    `, [id]);
    res.json(result.rows);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

export default router;
