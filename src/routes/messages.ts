import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { auth } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { getIO } from '../socket/handlers';
import { uploadFile } from '../config/cloudinary';

const router = Router();

const getFullMessage = async (messageId: string, userId: string) => {
  const result = await pool.query(`
    SELECT m.*, u.username, u.avatar, u.discriminator,
      COALESCE(json_agg(DISTINCT jsonb_build_object(
        'id', ma.id, 'url', ma.url, 'filename', ma.filename,
        'size', ma.size, 'content_type', ma.content_type, 'width', ma.width, 'height', ma.height
      )) FILTER (WHERE ma.id IS NOT NULL), '[]') as attachments,
      COALESCE(json_agg(DISTINCT jsonb_build_object(
        'emoji', mr.emoji, 'count', mr.reaction_count, 'reacted', mr.user_reacted
      )) FILTER (WHERE mr.emoji IS NOT NULL), '[]') as reactions,
      rm.content as reply_content, rm.id as reply_msg_id,
      ru.username as reply_username, ru.avatar as reply_avatar
    FROM messages m
    JOIN users u ON m.user_id = u.id
    LEFT JOIN message_attachments ma ON m.id = ma.message_id
    LEFT JOIN (
      SELECT message_id, emoji, COUNT(*) as reaction_count, bool_or(user_id = $2) as user_reacted
      FROM message_reactions GROUP BY message_id, emoji
    ) mr ON m.id = mr.message_id
    LEFT JOIN messages rm ON m.reply_to = rm.id
    LEFT JOIN users ru ON rm.user_id = ru.id
    WHERE m.id = $1
    GROUP BY m.id, u.username, u.avatar, u.discriminator, rm.content, rm.id, ru.username, ru.avatar
  `, [messageId, userId]);
  return result.rows[0];
};

router.get('/channel/:channelId', auth, async (req: Request, res: Response): Promise<void> => {
  const { channelId } = req.params;
  const { before, limit = '50' } = req.query as { before?: string; limit?: string };
  try {
    const access = await pool.query(`
      SELECT c.id FROM channels c JOIN server_members sm ON c.server_id = sm.server_id
      WHERE c.id = $1 AND sm.user_id = $2
    `, [channelId, req.user!.id]);
    if (!access.rows[0]) { res.status(403).json({ error: 'No access' }); return; }

    let whereClause = 'WHERE m.channel_id = $1';
    const params: (string | number)[] = [channelId, req.user!.id];

    if (before) {
      params.push(before);
      whereClause += ` AND m.created_at < (SELECT created_at FROM messages WHERE id = $${params.length})`;
    }

    const result = await pool.query(`
      SELECT m.*, u.username, u.avatar, u.discriminator,
        COALESCE(json_agg(DISTINCT jsonb_build_object(
          'id', ma.id, 'url', ma.url, 'filename', ma.filename,
          'size', ma.size, 'content_type', ma.content_type, 'width', ma.width, 'height', ma.height
        )) FILTER (WHERE ma.id IS NOT NULL), '[]') as attachments,
        COALESCE(json_agg(DISTINCT jsonb_build_object(
          'emoji', mr.emoji, 'count', mr.reaction_count, 'reacted', mr.user_reacted
        )) FILTER (WHERE mr.emoji IS NOT NULL), '[]') as reactions,
        rm.content as reply_content, rm.id as reply_msg_id,
        ru.username as reply_username, ru.avatar as reply_avatar
      FROM messages m
      JOIN users u ON m.user_id = u.id
      LEFT JOIN message_attachments ma ON m.id = ma.message_id
      LEFT JOIN (
        SELECT message_id, emoji, COUNT(*) as reaction_count, bool_or(user_id = $2) as user_reacted
        FROM message_reactions GROUP BY message_id, emoji
      ) mr ON m.id = mr.message_id
      LEFT JOIN messages rm ON m.reply_to = rm.id
      LEFT JOIN users ru ON rm.user_id = ru.id
      ${whereClause}
      GROUP BY m.id, u.username, u.avatar, u.discriminator, rm.content, rm.id, ru.username, ru.avatar
      ORDER BY m.created_at DESC LIMIT $${params.length + 1}
    `, [...params, parseInt(limit)]);

    res.json(result.rows.reverse());
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/', auth, upload.array('attachments', 10), async (req: Request, res: Response): Promise<void> => {
  const { channel_id, content, reply_to } = req.body as Record<string, string>;
  const files = req.files as Express.Multer.File[] | undefined;

  if (!channel_id || (!content?.trim() && !files?.length)) {
    res.status(400).json({ error: 'Message cannot be empty' }); return;
  }
  try {
    const access = await pool.query(`
      SELECT c.* FROM channels c JOIN server_members sm ON c.server_id = sm.server_id
      WHERE c.id = $1 AND sm.user_id = $2
    `, [channel_id, req.user!.id]);
    if (!access.rows[0]) { res.status(403).json({ error: 'No access' }); return; }

    const msg = (await pool.query(
      'INSERT INTO messages (channel_id, user_id, content, reply_to) VALUES ($1, $2, $3, $4) RETURNING *',
      [channel_id, req.user!.id, content?.trim() || null, reply_to || null]
    )).rows[0];

    if (files?.length) {
      for (const file of files) {
        const url = await uploadFile(file, 'attachments');
        await pool.query(
          'INSERT INTO message_attachments (message_id, url, filename, size, content_type) VALUES ($1, $2, $3, $4, $5)',
          [msg.id, url, file.originalname, file.size, file.mimetype]
        );
      }
    }

    await pool.query('UPDATE channels SET last_message_at = NOW() WHERE id = $1', [channel_id]);
    const fullMsg = await getFullMessage(msg.id as string, req.user!.id);
    getIO()?.to(`channel:${channel_id}`).emit('message:new', fullMsg);
    res.status(201).json(fullMsg);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.patch('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { content } = req.body as { content: string };
  if (!content?.trim()) { res.status(400).json({ error: 'Content required' }); return; }
  try {
    const msg = (await pool.query('SELECT * FROM messages WHERE id = $1', [id])).rows[0];
    if (!msg) { res.status(404).json({ error: 'Not found' }); return; }
    if (msg.user_id !== req.user!.id) { res.status(403).json({ error: 'Not your message' }); return; }

    const updated = (await pool.query(
      'UPDATE messages SET content = $1, edited_at = NOW() WHERE id = $2 RETURNING *',
      [content.trim(), id]
    )).rows[0];

    getIO()?.to(`channel:${updated.channel_id as string}`).emit('message:update', updated);
    res.json(updated);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const msg = (await pool.query(`
      SELECT m.*, s.owner_id as server_owner FROM messages m
      JOIN channels c ON m.channel_id = c.id JOIN servers s ON c.server_id = s.id
      WHERE m.id = $1
    `, [id])).rows[0];

    if (!msg) { res.status(404).json({ error: 'Not found' }); return; }
    if (msg.user_id !== req.user!.id && msg.server_owner !== req.user!.id) {
      res.status(403).json({ error: 'No permission' }); return;
    }

    await pool.query('DELETE FROM messages WHERE id = $1', [id]);
    getIO()?.to(`channel:${msg.channel_id as string}`).emit('message:delete', { id, channel_id: msg.channel_id });
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.post('/:id/reactions', auth, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { emoji } = req.body as { emoji: string };
  if (!emoji) { res.status(400).json({ error: 'Emoji required' }); return; }
  try {
    const existing = await pool.query(
      'SELECT * FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3',
      [id, req.user!.id, emoji]
    );
    if (existing.rows[0]) {
      await pool.query('DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3', [id, req.user!.id, emoji]);
    } else {
      await pool.query('INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)', [id, req.user!.id, emoji]);
    }

    const reactions = (await pool.query(
      'SELECT emoji, COUNT(*) as count, bool_or(user_id = $2) as reacted FROM message_reactions WHERE message_id = $1 GROUP BY emoji',
      [id, req.user!.id]
    )).rows;

    const channelId = (await pool.query('SELECT channel_id FROM messages WHERE id = $1', [id])).rows[0]?.channel_id as string;
    getIO()?.to(`channel:${channelId}`).emit('message:reaction', { message_id: id, channel_id: channelId, reactions });
    res.json(reactions);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.post('/:id/pin', auth, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const msg = (await pool.query(`
      SELECT m.*, s.owner_id FROM messages m
      JOIN channels c ON m.channel_id = c.id JOIN servers s ON c.server_id = s.id
      WHERE m.id = $1
    `, [id])).rows[0];

    if (!msg) { res.status(404).json({ error: 'Not found' }); return; }
    if (msg.owner_id !== req.user!.id) { res.status(403).json({ error: 'No permission' }); return; }

    const existing = (await pool.query('SELECT * FROM pinned_messages WHERE message_id = $1', [id])).rows[0];
    if (existing) {
      await pool.query('DELETE FROM pinned_messages WHERE message_id = $1', [id]);
      await pool.query('UPDATE messages SET pinned = FALSE WHERE id = $1', [id]);
      res.json({ pinned: false });
    } else {
      await pool.query('INSERT INTO pinned_messages (channel_id, message_id, pinned_by) VALUES ($1, $2, $3)', [msg.channel_id, id, req.user!.id]);
      await pool.query('UPDATE messages SET pinned = TRUE WHERE id = $1', [id]);
      res.json({ pinned: true });
    }
  } catch { res.status(500).json({ error: 'Server error' }); }
});

export default router;
