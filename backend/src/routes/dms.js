const express = require('express');
const { pool } = require('../config/db');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT dc.id, dc.created_at,
        u.id as friend_id, u.username, u.discriminator, u.avatar, u.status, u.custom_status,
        (SELECT content FROM dm_messages WHERE dm_channel_id = dc.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM dm_messages WHERE dm_channel_id = dc.id ORDER BY created_at DESC LIMIT 1) as last_message_at
      FROM dm_channels dc
      JOIN dm_members dm1 ON dc.id = dm1.dm_channel_id AND dm1.user_id = $1
      JOIN dm_members dm2 ON dc.id = dm2.dm_channel_id AND dm2.user_id != $1
      JOIN users u ON u.id = dm2.user_id
      ORDER BY last_message_at DESC NULLS LAST
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:channelId/messages', auth, async (req, res) => {
  const { channelId } = req.params;
  const { before, limit = 50 } = req.query;
  try {
    const access = (await pool.query('SELECT * FROM dm_members WHERE dm_channel_id = $1 AND user_id = $2', [channelId, req.user.id])).rows[0];
    if (!access) return res.status(403).json({ error: 'No access' });

    let where = 'WHERE m.dm_channel_id = $1';
    const params = [channelId];

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

router.post('/:channelId/messages', auth, upload.array('attachments', 5), async (req, res) => {
  const { channelId } = req.params;
  const { content } = req.body;
  if (!content?.trim() && !req.files?.length) return res.status(400).json({ error: 'Empty message' });
  try {
    const access = (await pool.query('SELECT * FROM dm_members WHERE dm_channel_id = $1 AND user_id = $2', [channelId, req.user.id])).rows[0];
    if (!access) return res.status(403).json({ error: 'No access' });

    const msg = (await pool.query(
      'INSERT INTO dm_messages (dm_channel_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
      [channelId, req.user.id, content?.trim() || null]
    )).rows[0];

    const fullMsg = (await pool.query(
      'SELECT m.*, u.username, u.avatar, u.discriminator FROM dm_messages m JOIN users u ON m.user_id = u.id WHERE m.id = $1',
      [msg.id]
    )).rows[0];

    const members = (await pool.query('SELECT user_id FROM dm_members WHERE dm_channel_id = $1', [channelId])).rows;

    const { io } = require('../index');
    members.forEach(m => {
      io.to(`user:${m.user_id}`).emit('dm:message', { ...fullMsg, dm_channel_id: channelId });
    });

    res.status(201).json(fullMsg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:channelId/messages/:messageId', auth, async (req, res) => {
  const { channelId, messageId } = req.params;
  try {
    const msg = (await pool.query('SELECT * FROM dm_messages WHERE id = $1 AND dm_channel_id = $2', [messageId, channelId])).rows[0];
    if (!msg) return res.status(404).json({ error: 'Not found' });
    if (msg.user_id !== req.user.id) return res.status(403).json({ error: 'No permission' });

    await pool.query('DELETE FROM dm_messages WHERE id = $1', [messageId]);

    const { io } = require('../index');
    const members = (await pool.query('SELECT user_id FROM dm_members WHERE dm_channel_id = $1', [channelId])).rows;
    members.forEach(m => {
      io.to(`user:${m.user_id}`).emit('dm:delete', { message_id: messageId, dm_channel_id: channelId });
    });

    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.post('/open/:userId', auth, async (req, res) => {
  const { userId } = req.params;
  try {
    const existing = await pool.query(`
      SELECT dc.id FROM dm_channels dc
      JOIN dm_members dm1 ON dc.id = dm1.dm_channel_id AND dm1.user_id = $1
      JOIN dm_members dm2 ON dc.id = dm2.dm_channel_id AND dm2.user_id = $2
    `, [req.user.id, userId]);

    if (existing.rows[0]) return res.json({ id: existing.rows[0].id });

    const dm = (await pool.query('INSERT INTO dm_channels DEFAULT VALUES RETURNING *')).rows[0];
    await pool.query('INSERT INTO dm_members (dm_channel_id, user_id) VALUES ($1, $2), ($1, $3)', [dm.id, req.user.id, userId]);
    res.status(201).json(dm);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
