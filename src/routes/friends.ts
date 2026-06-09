import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { auth } from '../middleware/auth';
import { getIO } from '../socket/handlers';

const router = Router();

router.get('/', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT f.*,
        u.id as friend_user_id, u.username, u.discriminator, u.avatar, u.status, u.custom_status
      FROM friends f
      JOIN users u ON u.id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
      WHERE f.requester_id = $1 OR f.addressee_id = $1
      ORDER BY f.created_at DESC
    `, [req.user!.id]);
    res.json(result.rows);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.post('/', auth, async (req: Request, res: Response): Promise<void> => {
  const { username, discriminator } = req.body as { username: string; discriminator: string };
  if (!username || !discriminator) { res.status(400).json({ error: 'Username and discriminator required' }); return; }
  try {
    const target = (await pool.query('SELECT id FROM users WHERE username = $1 AND discriminator = $2', [username, discriminator])).rows[0];
    if (!target) { res.status(404).json({ error: 'User not found' }); return; }
    if (target.id === req.user!.id) { res.status(400).json({ error: 'Cannot add yourself' }); return; }

    const existing = (await pool.query(
      'SELECT * FROM friends WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)',
      [req.user!.id, target.id]
    )).rows[0];

    if (existing) {
      res.status(400).json({ error: existing.status === 'accepted' ? 'Already friends' : 'Request already sent' }); return;
    }

    const result = (await pool.query(
      'INSERT INTO friends (requester_id, addressee_id, status) VALUES ($1, $2, $3) RETURNING *',
      [req.user!.id, target.id, 'pending']
    )).rows[0];

    getIO()?.to(`user:${target.id as string}`).emit('friend:request', {
      ...result, username: req.user!.username, avatar: req.user!.avatar, discriminator: req.user!.discriminator,
    });
    res.status(201).json(result);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.patch('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { action } = req.body as { action: 'accept' | 'decline' };
  try {
    const friend = (await pool.query('SELECT * FROM friends WHERE id = $1 AND addressee_id = $2', [id, req.user!.id])).rows[0];
    if (!friend) { res.status(404).json({ error: 'Request not found' }); return; }

    if (action === 'accept') {
      const result = (await pool.query('UPDATE friends SET status = $1 WHERE id = $2 RETURNING *', ['accepted', id])).rows[0];

      const existing = await pool.query(`
        SELECT dc.id FROM dm_channels dc
        JOIN dm_members dm1 ON dc.id = dm1.dm_channel_id AND dm1.user_id = $1
        JOIN dm_members dm2 ON dc.id = dm2.dm_channel_id AND dm2.user_id = $2
      `, [req.user!.id, friend.requester_id]);

      if (!existing.rows[0]) {
        const dm = (await pool.query('INSERT INTO dm_channels DEFAULT VALUES RETURNING *')).rows[0];
        await pool.query('INSERT INTO dm_members (dm_channel_id, user_id) VALUES ($1, $2), ($1, $3)', [dm.id, req.user!.id, friend.requester_id]);
      }

      getIO()?.to(`user:${friend.requester_id as string}`).emit('friend:accepted', {
        ...result, username: req.user!.username, avatar: req.user!.avatar,
      });
      res.json(result);
    } else {
      await pool.query('DELETE FROM friends WHERE id = $1', [id]);
      res.json({ message: 'Request declined' });
    }
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:userId', auth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;
  try {
    await pool.query(
      'DELETE FROM friends WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)',
      [req.user!.id, userId]
    );
    res.json({ message: 'Friend removed' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

export default router;
