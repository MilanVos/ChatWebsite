import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { auth } from '../middleware/auth';
import { getIO } from '../socket/handlers';

const router = Router();

router.get('/', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT dc.id, dc.created_at,
        u.id as friend_id, u.username, u.discriminator, u.avatar, u.status, u.custom_status,
        (SELECT content FROM dm_messages WHERE dm_channel_id = dc.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM dm_messages WHERE dm_channel_id = dc.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
        (
          SELECT COUNT(*) FROM dm_messages m2
          WHERE m2.dm_channel_id = dc.id
            AND m2.user_id != $1
            AND m2.created_at > COALESCE(dm1.last_read_at, '1970-01-01')
        ) as unread_count
      FROM dm_channels dc
      JOIN dm_members dm1 ON dc.id = dm1.dm_channel_id AND dm1.user_id = $1
      JOIN dm_members dm2 ON dc.id = dm2.dm_channel_id AND dm2.user_id != $1
      JOIN users u ON u.id = dm2.user_id
      ORDER BY last_message_at DESC NULLS LAST
    `, [req.user!.id]);
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/:channelId/messages', auth, async (req: Request, res: Response): Promise<void> => {
  const { channelId } = req.params;
  const { before, limit = '50' } = req.query as { before?: string; limit?: string };
  try {
    const access = (await pool.query('SELECT * FROM dm_members WHERE dm_channel_id = $1 AND user_id = $2', [channelId, req.user!.id])).rows[0];
    if (!access) { res.status(403).json({ error: 'No access' }); return; }

    let where = 'WHERE m.dm_channel_id = $1';
    const params: (string | number)[] = [channelId];

    if (before) {
      params.push(before);
      where += ` AND m.created_at < (SELECT created_at FROM dm_messages WHERE id = $${params.length})`;
    }

    const result = await pool.query(`
      SELECT m.*, u.username, u.avatar, u.discriminator
      FROM dm_messages m JOIN users u ON m.user_id = u.id
      ${where}
      ORDER BY m.created_at DESC LIMIT $${params.length + 1}
    `, [...params, parseInt(limit)]);

    res.json(result.rows.reverse());
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.post('/:channelId/messages', auth, async (req: Request, res: Response): Promise<void> => {
  const { channelId } = req.params;
  const { content } = req.body as { content?: string };
  if (!content?.trim()) { res.status(400).json({ error: 'Empty message' }); return; }
  try {
    const access = (await pool.query('SELECT * FROM dm_members WHERE dm_channel_id = $1 AND user_id = $2', [channelId, req.user!.id])).rows[0];
    if (!access) { res.status(403).json({ error: 'No access' }); return; }

    const msg = (await pool.query(
      'INSERT INTO dm_messages (dm_channel_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
      [channelId, req.user!.id, content.trim()]
    )).rows[0];

    await pool.query(
      'UPDATE dm_members SET last_read_at = NOW() WHERE dm_channel_id = $1 AND user_id = $2',
      [channelId, req.user!.id]
    );

    const fullMsg = (await pool.query(
      'SELECT m.*, u.username, u.avatar, u.discriminator FROM dm_messages m JOIN users u ON m.user_id = u.id WHERE m.id = $1',
      [msg.id]
    )).rows[0];

    const members = (await pool.query('SELECT user_id FROM dm_members WHERE dm_channel_id = $1', [channelId])).rows;
    members.forEach(m => {
      getIO()?.to(`user:${m.user_id as string}`).emit('dm:message', { ...fullMsg, dm_channel_id: channelId });
    });

    res.status(201).json(fullMsg);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/:channelId/read', auth, async (req: Request, res: Response): Promise<void> => {
  const { channelId } = req.params;
  try {
    await pool.query(
      'UPDATE dm_members SET last_read_at = NOW() WHERE dm_channel_id = $1 AND user_id = $2',
      [channelId, req.user!.id]
    );
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.patch('/:channelId/messages/:messageId', auth, async (req: Request, res: Response): Promise<void> => {
  const { channelId, messageId } = req.params;
  const { content } = req.body as { content?: string };
  if (!content?.trim()) { res.status(400).json({ error: 'Content required' }); return; }
  try {
    const msg = (await pool.query('SELECT * FROM dm_messages WHERE id = $1 AND dm_channel_id = $2', [messageId, channelId])).rows[0];
    if (!msg) { res.status(404).json({ error: 'Not found' }); return; }
    if (msg.user_id !== req.user!.id) { res.status(403).json({ error: 'No permission' }); return; }

    const updated = (await pool.query(
      'UPDATE dm_messages SET content = $1, edited_at = NOW() WHERE id = $2 RETURNING *',
      [content.trim(), messageId]
    )).rows[0];

    const members = (await pool.query('SELECT user_id FROM dm_members WHERE dm_channel_id = $1', [channelId])).rows;
    members.forEach(m => {
      getIO()?.to(`user:${m.user_id as string}`).emit('dm:update', { ...updated, dm_channel_id: channelId });
    });

    res.json(updated);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:channelId/messages/:messageId', auth, async (req: Request, res: Response): Promise<void> => {
  const { channelId, messageId } = req.params;
  try {
    const msg = (await pool.query('SELECT * FROM dm_messages WHERE id = $1 AND dm_channel_id = $2', [messageId, channelId])).rows[0];
    if (!msg) { res.status(404).json({ error: 'Not found' }); return; }
    if (msg.user_id !== req.user!.id) { res.status(403).json({ error: 'No permission' }); return; }

    await pool.query('DELETE FROM dm_messages WHERE id = $1', [messageId]);

    const members = (await pool.query('SELECT user_id FROM dm_members WHERE dm_channel_id = $1', [channelId])).rows;
    members.forEach(m => {
      getIO()?.to(`user:${m.user_id as string}`).emit('dm:delete', { message_id: messageId, dm_channel_id: channelId });
    });
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.post('/open/:userId', auth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;
  try {
    const existing = await pool.query(`
      SELECT dc.id FROM dm_channels dc
      JOIN dm_members dm1 ON dc.id = dm1.dm_channel_id AND dm1.user_id = $1
      JOIN dm_members dm2 ON dc.id = dm2.dm_channel_id AND dm2.user_id = $2
    `, [req.user!.id, userId]);

    if (existing.rows[0]) { res.json({ id: existing.rows[0].id }); return; }

    const dm = (await pool.query('INSERT INTO dm_channels DEFAULT VALUES RETURNING *')).rows[0];
    await pool.query('INSERT INTO dm_members (dm_channel_id, user_id) VALUES ($1, $2), ($1, $3)', [dm.id, req.user!.id, userId]);
    res.status(201).json(dm);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

export default router;
