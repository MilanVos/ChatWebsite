const express = require('express');
const { pool } = require('../config/db');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

const getFullMessage = async (messageId, userId) => {
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

router.get('/channel/:channelId', auth, async (req, res) => {
  const { channelId } = req.params;
  const { before, limit = 50 } = req.query;
  try {
    const access = await pool.query(`
      SELECT c.id FROM channels c JOIN server_members sm ON c.server_id = sm.server_id
      WHERE c.id = $1 AND sm.user_id = $2
    `, [channelId, req.user.id]);
    if (!access.rows[0]) return res.status(403).json({ error: 'No access' });

    let whereClause = 'WHERE m.channel_id = $1';
    const params = [channelId, req.user.id];

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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', auth, upload.array('attachments', 10), async (req, res) => {
  const { channel_id, content, reply_to } = req.body;
  if (!channel_id || (!content?.trim() && !req.files?.length)) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }
  try {
    const access = await pool.query(`
      SELECT c.* FROM channels c JOIN server_members sm ON c.server_id = sm.server_id
      WHERE c.id = $1 AND sm.user_id = $2
    `, [channel_id, req.user.id]);
    if (!access.rows[0]) return res.status(403).json({ error: 'No access' });

    const msg = (await pool.query(
      'INSERT INTO messages (channel_id, user_id, content, reply_to) VALUES ($1, $2, $3, $4) RETURNING *',
      [channel_id, req.user.id, content?.trim() || null, reply_to || null]
    )).rows[0];

    if (req.files?.length) {
      for (const file of req.files) {
        await pool.query(
          'INSERT INTO message_attachments (message_id, url, filename, size, content_type) VALUES ($1, $2, $3, $4, $5)',
          [msg.id, `/uploads/${file.filename}`, file.originalname, file.size, file.mimetype]
        );
      }
    }

    await pool.query('UPDATE channels SET last_message_at = NOW() WHERE id = $1', [channel_id]);

    const fullMsg = await getFullMessage(msg.id, req.user.id);

    const { io } = require('../index');
    io.to(`channel:${channel_id}`).emit('message:new', fullMsg);

    res.status(201).json(fullMsg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content required' });
  try {
    const msg = (await pool.query('SELECT * FROM messages WHERE id = $1', [id])).rows[0];
    if (!msg) return res.status(404).json({ error: 'Not found' });
    if (msg.user_id !== req.user.id) return res.status(403).json({ error: 'Not your message' });

    const updated = (await pool.query(
      'UPDATE messages SET content = $1, edited_at = NOW() WHERE id = $2 RETURNING *',
      [content.trim(), id]
    )).rows[0];

    const { io } = require('../index');
    io.to(`channel:${updated.channel_id}`).emit('message:update', updated);

    res.json(updated);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  try {
    const msg = (await pool.query(`
      SELECT m.*, s.owner_id as server_owner FROM messages m
      JOIN channels c ON m.channel_id = c.id JOIN servers s ON c.server_id = s.id
      WHERE m.id = $1
    `, [id])).rows[0];

    if (!msg) return res.status(404).json({ error: 'Not found' });
    if (msg.user_id !== req.user.id && msg.server_owner !== req.user.id) return res.status(403).json({ error: 'No permission' });

    await pool.query('DELETE FROM messages WHERE id = $1', [id]);

    const { io } = require('../index');
    io.to(`channel:${msg.channel_id}`).emit('message:delete', { id, channel_id: msg.channel_id });

    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.post('/:id/reactions', auth, async (req, res) => {
  const { id } = req.params;
  const { emoji } = req.body;
  if (!emoji) return res.status(400).json({ error: 'Emoji required' });
  try {
    const existing = await pool.query(
      'SELECT * FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3',
      [id, req.user.id, emoji]
    );

    if (existing.rows[0]) {
      await pool.query('DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3', [id, req.user.id, emoji]);
    } else {
      await pool.query('INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)', [id, req.user.id, emoji]);
    }

    const reactions = (await pool.query(
      'SELECT emoji, COUNT(*) as count, bool_or(user_id = $2) as reacted FROM message_reactions WHERE message_id = $1 GROUP BY emoji',
      [id, req.user.id]
    )).rows;

    const channelId = (await pool.query('SELECT channel_id FROM messages WHERE id = $1', [id])).rows[0]?.channel_id;

    const { io } = require('../index');
    io.to(`channel:${channelId}`).emit('message:reaction', { message_id: id, reactions });

    res.json(reactions);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.post('/:id/pin', auth, async (req, res) => {
  const { id } = req.params;
  try {
    const msg = (await pool.query(`
      SELECT m.*, s.owner_id FROM messages m
      JOIN channels c ON m.channel_id = c.id JOIN servers s ON c.server_id = s.id
      WHERE m.id = $1
    `, [id])).rows[0];

    if (!msg) return res.status(404).json({ error: 'Not found' });
    if (msg.owner_id !== req.user.id) return res.status(403).json({ error: 'No permission' });

    const existing = (await pool.query('SELECT * FROM pinned_messages WHERE message_id = $1', [id])).rows[0];
    if (existing) {
      await pool.query('DELETE FROM pinned_messages WHERE message_id = $1', [id]);
      await pool.query('UPDATE messages SET pinned = FALSE WHERE id = $1', [id]);
      res.json({ pinned: false });
    } else {
      await pool.query('INSERT INTO pinned_messages (channel_id, message_id, pinned_by) VALUES ($1, $2, $3)', [msg.channel_id, id, req.user.id]);
      await pool.query('UPDATE messages SET pinned = TRUE WHERE id = $1', [id]);
      res.json({ pinned: true });
    }
  } catch { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
