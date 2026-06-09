const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/search', auth, async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);
  try {
    const result = await pool.query(
      'SELECT id, username, discriminator, avatar, status FROM users WHERE username ILIKE $1 AND id != $2 LIMIT 10',
      [`%${q}%`, req.user.id]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, discriminator, avatar, banner, bio, status, custom_status, created_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/me', auth, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'banner', maxCount: 1 }]), async (req, res) => {
  const { username, bio, custom_status, status } = req.body;
  try {
    const updates = {};
    if (username) updates.username = username;
    if (bio !== undefined) updates.bio = bio;
    if (custom_status !== undefined) updates.custom_status = custom_status;
    if (status) updates.status = status;
    if (req.files?.avatar?.[0]) updates.avatar = `/uploads/${req.files.avatar[0].filename}`;
    if (req.files?.banner?.[0]) updates.banner = `/uploads/${req.files.banner[0].filename}`;

    if (Object.keys(updates).length === 0) return res.json(req.user);

    const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ');
    const result = await pool.query(
      `UPDATE users SET ${setClauses} WHERE id = $1 RETURNING id, username, discriminator, email, avatar, banner, bio, status, custom_status`,
      [req.user.id, ...Object.values(updates)]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/me/password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Invalid password data' });
  }
  try {
    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!(await bcrypt.compare(currentPassword, result.rows[0].password_hash))) {
      return res.status(401).json({ error: 'Current password incorrect' });
    }
    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Password updated' });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
