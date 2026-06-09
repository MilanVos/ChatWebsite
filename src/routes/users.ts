import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db';
import { auth } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.get('/search', auth, async (req: Request, res: Response): Promise<void> => {
  const { q } = req.query as { q?: string };
  if (!q || q.length < 2) { res.json([]); return; }
  try {
    const result = await pool.query(
      'SELECT id, username, discriminator, avatar, status FROM users WHERE username ILIKE $1 AND id != $2 LIMIT 10',
      [`%${q}%`, req.user!.id]
    );
    res.json(result.rows);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.get('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT id, username, discriminator, avatar, banner, bio, status, custom_status, created_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(result.rows[0]);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.patch(
  '/me',
  auth,
  upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'banner', maxCount: 1 }]),
  async (req: Request, res: Response): Promise<void> => {
    const { username, bio, custom_status, status } = req.body as Record<string, string>;
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    try {
      const updates: Record<string, string> = {};
      if (username) updates.username = username;
      if (bio !== undefined) updates.bio = bio;
      if (custom_status !== undefined) updates.custom_status = custom_status;
      if (status) updates.status = status;
      if (files?.avatar?.[0]) updates.avatar = `/uploads/${files.avatar[0].filename}`;
      if (files?.banner?.[0]) updates.banner = `/uploads/${files.banner[0].filename}`;

      if (!Object.keys(updates).length) { res.json(req.user); return; }

      const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ');
      const result = await pool.query(
        `UPDATE users SET ${setClauses} WHERE id = $1 RETURNING id, username, discriminator, email, avatar, banner, bio, status, custom_status`,
        [req.user!.id, ...Object.values(updates)]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.patch('/me/password', auth, async (req: Request, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'Invalid password data' }); return;
  }
  try {
    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user!.id]);
    if (!(await bcrypt.compare(currentPassword, result.rows[0].password_hash as string))) {
      res.status(401).json({ error: 'Current password incorrect' }); return;
    }
    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user!.id]);
    res.json({ message: 'Password updated' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

export default router;
