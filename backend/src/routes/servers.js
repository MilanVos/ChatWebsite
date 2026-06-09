const express = require('express');
const { pool } = require('../config/db');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();
const generateInvite = () => Math.random().toString(36).substring(2, 10).toUpperCase();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, sm.nickname, sm.role_id, sm.joined_at
      FROM servers s JOIN server_members sm ON s.id = sm.server_id
      WHERE sm.user_id = $1 ORDER BY sm.joined_at ASC
    `, [req.user.id]);
    res.json(result.rows);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.get('/:id', auth, async (req, res) => {
  const { id } = req.params;
  try {
    const memberCheck = await pool.query('SELECT * FROM server_members WHERE server_id = $1 AND user_id = $2', [id, req.user.id]);
    if (!memberCheck.rows[0]) return res.status(403).json({ error: 'Not a member' });

    const [server, categories, channels, members, roles] = await Promise.all([
      pool.query('SELECT * FROM servers WHERE id = $1', [id]),
      pool.query('SELECT * FROM categories WHERE server_id = $1 ORDER BY position ASC', [id]),
      pool.query('SELECT * FROM channels WHERE server_id = $1 ORDER BY position ASC', [id]),
      pool.query(`
        SELECT u.id, u.username, u.discriminator, u.avatar, u.status, u.custom_status,
               sm.nickname, sm.role_id, sm.joined_at, r.name as role_name, r.color as role_color
        FROM server_members sm JOIN users u ON sm.user_id = u.id
        LEFT JOIN roles r ON sm.role_id = r.id
        WHERE sm.server_id = $1 ORDER BY u.username ASC
      `, [id]),
      pool.query('SELECT * FROM roles WHERE server_id = $1 ORDER BY position DESC', [id])
    ]);

    if (!server.rows[0]) return res.status(404).json({ error: 'Server not found' });

    res.json({
      ...server.rows[0],
      categories: categories.rows,
      channels: channels.rows,
      members: members.rows,
      roles: roles.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', auth, upload.single('icon'), async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inviteCode = generateInvite();
    const icon = req.file ? `/uploads/${req.file.filename}` : null;

    const server = (await client.query(
      'INSERT INTO servers (name, icon, owner_id, invite_code) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, icon, req.user.id, inviteCode]
    )).rows[0];

    const role = (await client.query(
      'INSERT INTO roles (server_id, name, color, permissions, position) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [server.id, '@everyone', '#99aab5', 104324161, 0]
    )).rows[0];

    await client.query('INSERT INTO server_members (server_id, user_id, role_id) VALUES ($1, $2, $3)', [server.id, req.user.id, role.id]);

    const category = (await client.query(
      'INSERT INTO categories (server_id, name, position) VALUES ($1, $2, $3) RETURNING *',
      [server.id, 'TEXT CHANNELS', 0]
    )).rows[0];

    await client.query(
      'INSERT INTO channels (server_id, category_id, name, type, position) VALUES ($1, $2, $3, $4, $5)',
      [server.id, category.id, 'general', 'text', 0]
    );

    await client.query('COMMIT');
    res.status(201).json(server);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally { client.release(); }
});

router.post('/join/:inviteCode', auth, async (req, res) => {
  try {
    const server = (await pool.query('SELECT * FROM servers WHERE invite_code = $1', [req.params.inviteCode])).rows[0];
    if (!server) return res.status(404).json({ error: 'Invalid invite code' });

    const existing = await pool.query('SELECT * FROM server_members WHERE server_id = $1 AND user_id = $2', [server.id, req.user.id]);
    if (existing.rows[0]) return res.status(400).json({ error: 'Already a member', server });

    const banned = await pool.query('SELECT * FROM bans WHERE server_id = $1 AND user_id = $2', [server.id, req.user.id]);
    if (banned.rows[0]) return res.status(403).json({ error: 'You are banned from this server' });

    const role = (await pool.query('SELECT id FROM roles WHERE server_id = $1 AND name = $2', [server.id, '@everyone'])).rows[0];
    await pool.query('INSERT INTO server_members (server_id, user_id, role_id) VALUES ($1, $2, $3)', [server.id, req.user.id, role?.id]);
    await pool.query('UPDATE servers SET member_count = member_count + 1 WHERE id = $1', [server.id]);

    res.json(server);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id', auth, upload.fields([{ name: 'icon', maxCount: 1 }, { name: 'banner', maxCount: 1 }]), async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  try {
    const server = (await pool.query('SELECT * FROM servers WHERE id = $1', [id])).rows[0];
    if (!server) return res.status(404).json({ error: 'Not found' });
    if (server.owner_id !== req.user.id) return res.status(403).json({ error: 'No permission' });

    const updates = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (req.files?.icon?.[0]) updates.icon = `/uploads/${req.files.icon[0].filename}`;
    if (req.files?.banner?.[0]) updates.banner = `/uploads/${req.files.banner[0].filename}`;

    if (!Object.keys(updates).length) return res.json(server);

    const set = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ');
    const result = await pool.query(`UPDATE servers SET ${set} WHERE id = $1 RETURNING *`, [id, ...Object.values(updates)]);
    res.json(result.rows[0]);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id/leave', auth, async (req, res) => {
  const { id } = req.params;
  try {
    const server = (await pool.query('SELECT owner_id FROM servers WHERE id = $1', [id])).rows[0];
    if (!server) return res.status(404).json({ error: 'Not found' });
    if (server.owner_id === req.user.id) return res.status(400).json({ error: 'Owner cannot leave. Transfer ownership first.' });

    await pool.query('DELETE FROM server_members WHERE server_id = $1 AND user_id = $2', [id, req.user.id]);
    await pool.query('UPDATE servers SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1', [id]);
    res.json({ message: 'Left server' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  try {
    const server = (await pool.query('SELECT owner_id FROM servers WHERE id = $1', [id])).rows[0];
    if (!server) return res.status(404).json({ error: 'Not found' });
    if (server.owner_id !== req.user.id) return res.status(403).json({ error: 'No permission' });

    await pool.query('DELETE FROM servers WHERE id = $1', [id]);
    res.json({ message: 'Server deleted' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id/members/:userId', auth, async (req, res) => {
  const { id, userId } = req.params;
  try {
    const server = (await pool.query('SELECT owner_id FROM servers WHERE id = $1', [id])).rows[0];
    if (!server) return res.status(404).json({ error: 'Not found' });
    if (server.owner_id !== req.user.id) return res.status(403).json({ error: 'No permission' });
    if (userId === req.user.id) return res.status(400).json({ error: 'Cannot kick yourself' });

    await pool.query('DELETE FROM server_members WHERE server_id = $1 AND user_id = $2', [id, userId]);
    await pool.query('UPDATE servers SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1', [id]);

    const { io } = require('../index');
    io.to(`user:${userId}`).emit('server:kick', { server_id: id });

    res.json({ message: 'Member kicked' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.post('/:id/ban/:userId', auth, async (req, res) => {
  const { id, userId } = req.params;
  const { reason } = req.body;
  try {
    const server = (await pool.query('SELECT owner_id FROM servers WHERE id = $1', [id])).rows[0];
    if (!server) return res.status(404).json({ error: 'Not found' });
    if (server.owner_id !== req.user.id) return res.status(403).json({ error: 'No permission' });

    await pool.query('INSERT INTO bans (server_id, user_id, banned_by, reason) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING', [id, userId, req.user.id, reason]);
    await pool.query('DELETE FROM server_members WHERE server_id = $1 AND user_id = $2', [id, userId]);
    await pool.query('UPDATE servers SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1', [id]);

    const { io } = require('../index');
    io.to(`user:${userId}`).emit('server:ban', { server_id: id, reason });

    res.json({ message: 'Member banned' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.post('/:id/invite/regenerate', auth, async (req, res) => {
  const { id } = req.params;
  try {
    const server = (await pool.query('SELECT owner_id FROM servers WHERE id = $1', [id])).rows[0];
    if (!server || server.owner_id !== req.user.id) return res.status(403).json({ error: 'No permission' });

    const newCode = generateInvite();
    await pool.query('UPDATE servers SET invite_code = $1 WHERE id = $2', [newCode, id]);
    res.json({ invite_code: newCode });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.post('/:id/roles', auth, async (req, res) => {
  const { id } = req.params;
  const { name, color, permissions } = req.body;
  try {
    const server = (await pool.query('SELECT owner_id FROM servers WHERE id = $1', [id])).rows[0];
    if (!server || server.owner_id !== req.user.id) return res.status(403).json({ error: 'No permission' });

    const posResult = await pool.query('SELECT COALESCE(MAX(position), 0) + 1 as pos FROM roles WHERE server_id = $1', [id]);
    const role = (await pool.query(
      'INSERT INTO roles (server_id, name, color, permissions, position) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, name || 'new role', color || '#99aab5', permissions || 0, posResult.rows[0].pos]
    )).rows[0];

    res.status(201).json(role);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.patch('/:id/members/:userId/role', auth, async (req, res) => {
  const { id, userId } = req.params;
  const { role_id } = req.body;
  try {
    const server = (await pool.query('SELECT owner_id FROM servers WHERE id = $1', [id])).rows[0];
    if (!server || server.owner_id !== req.user.id) return res.status(403).json({ error: 'No permission' });

    await pool.query('UPDATE server_members SET role_id = $1 WHERE server_id = $2 AND user_id = $3', [role_id, id, userId]);
    res.json({ message: 'Role updated' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
