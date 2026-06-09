import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db';
import { auth } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

const HYPESQUAD_BADGES = ['hypesquad_bravery', 'hypesquad_brilliance', 'hypesquad_balance'];
const VALID_BADGES = [
  'staff', 'early_supporter', 'bug_hunter', 'active_developer',
  'verified_developer', 'server_booster',
  ...HYPESQUAD_BADGES,
];

router.get('/search', auth, async (req: Request, res: Response): Promise<void> => {
  const { q } = req.query as { q?: string };
  if (!q || q.length < 2) { res.json([]); return; }
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.discriminator, u.avatar, u.status,
        COALESCE(json_agg(ub.badge_type ORDER BY ub.awarded_at) FILTER (WHERE ub.badge_type IS NOT NULL), '[]') AS badges
       FROM users u
       LEFT JOIN user_badges ub ON ub.user_id = u.id
       WHERE u.username ILIKE $1 AND u.id != $2
       GROUP BY u.id
       LIMIT 10`,
      [`%${q}%`, req.user!.id]
    );
    res.json(result.rows);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.get('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.discriminator, u.avatar, u.banner, u.bio, u.status, u.custom_status, u.created_at,
        COALESCE(json_agg(ub.badge_type ORDER BY ub.awarded_at) FILTER (WHERE ub.badge_type IS NOT NULL), '[]') AS badges
       FROM users u
       LEFT JOIN user_badges ub ON ub.user_id = u.id
       WHERE u.id = $1
       GROUP BY u.id`,
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

      const badgesResult = await pool.query(
        'SELECT badge_type FROM user_badges WHERE user_id = $1 ORDER BY awarded_at',
        [req.user!.id]
      );

      res.json({ ...result.rows[0], badges: badgesResult.rows.map((r: { badge_type: string }) => r.badge_type) });
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

router.patch('/me/hypesquad', auth, async (req: Request, res: Response): Promise<void> => {
  const { house } = req.body as { house: string };
  if (!HYPESQUAD_BADGES.includes(house)) {
    res.status(400).json({ error: 'Invalid HypeSquad house' }); return;
  }
  try {
    await pool.query(
      'DELETE FROM user_badges WHERE user_id = $1 AND badge_type = ANY($2)',
      [req.user!.id, HYPESQUAD_BADGES]
    );
    await pool.query(
      'INSERT INTO user_badges (user_id, badge_type) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user!.id, house]
    );
    const badges = await pool.query(
      'SELECT badge_type FROM user_badges WHERE user_id = $1 ORDER BY awarded_at',
      [req.user!.id]
    );
    res.json({ badges: badges.rows.map((r: { badge_type: string }) => r.badge_type) });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.post('/me/badges/award', auth, async (req: Request, res: Response): Promise<void> => {
  const { target_user_id, badge_type } = req.body as { target_user_id: string; badge_type: string };

  const selfBadges = (req.user as { badges?: string[] }).badges || [];
  if (!selfBadges.includes('staff')) {
    res.status(403).json({ error: 'Only staff can award badges' }); return;
  }
  if (!VALID_BADGES.includes(badge_type)) {
    res.status(400).json({ error: 'Invalid badge type' }); return;
  }
  try {
    await pool.query(
      'INSERT INTO user_badges (user_id, badge_type) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [target_user_id, badge_type]
    );
    res.json({ message: 'Badge awarded' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

export default router;
