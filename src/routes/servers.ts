import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { auth } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { getIO } from '../socket/handlers';
import { uploadFile } from '../config/cloudinary';

const router = Router();
const generateInvite = (): string => Math.random().toString(36).substring(2, 10).toUpperCase();

const isStaff = (user: Express.Request['user']): boolean => {
  const badges = (user as { badges?: string[] })?.badges ?? [];
  return badges.includes('staff');
};

router.get('/', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT s.*, sm.nickname, sm.role_id, sm.joined_at
      FROM servers s JOIN server_members sm ON s.id = sm.server_id
      WHERE sm.user_id = $1 ORDER BY sm.joined_at ASC
    `, [req.user!.id]);
    res.json(result.rows);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.get('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    if (!isStaff(req.user)) {
      const memberCheck = await pool.query('SELECT * FROM server_members WHERE server_id = $1 AND user_id = $2', [id, req.user!.id]);
      if (!memberCheck.rows[0]) { res.status(403).json({ error: 'Not a member' }); return; }
    }

    const [server, categories, channels, members, roles] = await Promise.all([
      pool.query('SELECT * FROM servers WHERE id = $1', [id]),
      pool.query('SELECT * FROM categories WHERE server_id = $1 ORDER BY position ASC', [id]),
      pool.query('SELECT * FROM channels WHERE server_id = $1 ORDER BY position ASC', [id]),
      pool.query(`
        SELECT u.id, u.username, u.discriminator, u.avatar, u.status, u.custom_status,
               sm.nickname, sm.role_id, sm.joined_at, r.name as role_name, r.color as role_color,
               COALESCE(json_agg(ub.badge_type ORDER BY ub.awarded_at) FILTER (WHERE ub.badge_type IS NOT NULL), '[]') AS badges
        FROM server_members sm
        JOIN users u ON sm.user_id = u.id
        LEFT JOIN roles r ON sm.role_id = r.id
        LEFT JOIN user_badges ub ON ub.user_id = u.id
        WHERE sm.server_id = $1
        GROUP BY u.id, sm.nickname, sm.role_id, sm.joined_at, r.name, r.color
        ORDER BY u.username ASC
      `, [id]),
      pool.query('SELECT * FROM roles WHERE server_id = $1 ORDER BY position DESC', [id]),
    ]);

    if (!server.rows[0]) { res.status(404).json({ error: 'Server not found' }); return; }

    res.json({
      ...server.rows[0],
      categories: categories.rows,
      channels: channels.rows,
      members: members.rows,
      roles: roles.rows,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/', auth, upload.single('icon'), async (req: Request, res: Response): Promise<void> => {
  const { name } = req.body as { name: string };
  if (!name) { res.status(400).json({ error: 'Name required' }); return; }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const icon = req.file ? await uploadFile(req.file, 'server-icons') : null;
    const server = (await client.query(
      'INSERT INTO servers (name, icon, owner_id, invite_code) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, icon, req.user!.id, generateInvite()]
    )).rows[0];

    const role = (await client.query(
      'INSERT INTO roles (server_id, name, color, permissions, position) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [server.id, '@everyone', '#99aab5', 104324161, 0]
    )).rows[0];

    await client.query(
      'INSERT INTO roles (server_id, name, color, permissions, position) VALUES ($1, $2, $3, $4, $5)',
      [server.id, 'Admin', '#f04747', 2147483647, 100]
    );

    await client.query('INSERT INTO server_members (server_id, user_id, role_id) VALUES ($1, $2, $3)', [server.id, req.user!.id, role.id]);

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

router.post('/join/:inviteCode', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const server = (await pool.query('SELECT * FROM servers WHERE invite_code = $1', [req.params.inviteCode])).rows[0];
    if (!server) { res.status(404).json({ error: 'Invalid invite code' }); return; }

    const existing = await pool.query('SELECT * FROM server_members WHERE server_id = $1 AND user_id = $2', [server.id, req.user!.id]);
    if (existing.rows[0]) { res.status(400).json({ error: 'Already a member', server }); return; }

    const banned = await pool.query('SELECT * FROM bans WHERE server_id = $1 AND user_id = $2', [server.id, req.user!.id]);
    if (banned.rows[0]) { res.status(403).json({ error: 'You are banned from this server' }); return; }

    let roleId: string | null = null;
    if (isStaff(req.user)) {
      const adminRole = (await pool.query('SELECT id FROM roles WHERE server_id = $1 AND name = $2', [server.id, 'Admin'])).rows[0];
      roleId = adminRole?.id ?? null;
    } else {
      const everyoneRole = (await pool.query('SELECT id FROM roles WHERE server_id = $1 AND name = $2', [server.id, '@everyone'])).rows[0];
      roleId = everyoneRole?.id ?? null;
    }

    await pool.query('INSERT INTO server_members (server_id, user_id, role_id) VALUES ($1, $2, $3)', [server.id, req.user!.id, roleId]);
    await pool.query('UPDATE servers SET member_count = member_count + 1 WHERE id = $1', [server.id]);
    res.json(server);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.patch('/:id', auth, upload.fields([{ name: 'icon', maxCount: 1 }, { name: 'banner', maxCount: 1 }]), async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, description } = req.body as Record<string, string>;
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  try {
    const server = (await pool.query('SELECT * FROM servers WHERE id = $1', [id])).rows[0];
    if (!server) { res.status(404).json({ error: 'Not found' }); return; }
    if (server.owner_id !== req.user!.id && !isStaff(req.user)) { res.status(403).json({ error: 'No permission' }); return; }

    const updates: Record<string, string> = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (files?.icon?.[0]) updates.icon = await uploadFile(files.icon[0], 'server-icons');
    if (files?.banner?.[0]) updates.banner = await uploadFile(files.banner[0], 'server-banners');

    if (!Object.keys(updates).length) { res.json(server); return; }

    const set = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ');
    const result = await pool.query(`UPDATE servers SET ${set} WHERE id = $1 RETURNING *`, [id, ...Object.values(updates)]);
    res.json(result.rows[0]);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id/leave', auth, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const server = (await pool.query('SELECT owner_id FROM servers WHERE id = $1', [id])).rows[0];
    if (!server) { res.status(404).json({ error: 'Not found' }); return; }
    if (server.owner_id === req.user!.id) { res.status(400).json({ error: 'Owner cannot leave. Transfer ownership first.' }); return; }

    await pool.query('DELETE FROM server_members WHERE server_id = $1 AND user_id = $2', [id, req.user!.id]);
    await pool.query('UPDATE servers SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1', [id]);
    res.json({ message: 'Left server' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const server = (await pool.query('SELECT owner_id FROM servers WHERE id = $1', [id])).rows[0];
    if (!server) { res.status(404).json({ error: 'Not found' }); return; }
    if (server.owner_id !== req.user!.id && !isStaff(req.user)) { res.status(403).json({ error: 'No permission' }); return; }

    await pool.query('DELETE FROM servers WHERE id = $1', [id]);
    res.json({ message: 'Server deleted' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id/members/:userId', auth, async (req: Request, res: Response): Promise<void> => {
  const { id, userId } = req.params;
  try {
    const server = (await pool.query('SELECT owner_id FROM servers WHERE id = $1', [id])).rows[0];
    if (!server || (server.owner_id !== req.user!.id && !isStaff(req.user))) { res.status(403).json({ error: 'No permission' }); return; }

    await pool.query('DELETE FROM server_members WHERE server_id = $1 AND user_id = $2', [id, userId]);
    await pool.query('UPDATE servers SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1', [id]);
    getIO()?.to(`user:${userId}`).emit('server:kick', { server_id: id });
    res.json({ message: 'Member kicked' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.post('/:id/ban/:userId', auth, async (req: Request, res: Response): Promise<void> => {
  const { id, userId } = req.params;
  const { reason } = req.body as { reason?: string };
  try {
    const server = (await pool.query('SELECT owner_id FROM servers WHERE id = $1', [id])).rows[0];
    if (!server || (server.owner_id !== req.user!.id && !isStaff(req.user))) { res.status(403).json({ error: 'No permission' }); return; }

    await pool.query('INSERT INTO bans (server_id, user_id, banned_by, reason) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING', [id, userId, req.user!.id, reason]);
    await pool.query('DELETE FROM server_members WHERE server_id = $1 AND user_id = $2', [id, userId]);
    await pool.query('UPDATE servers SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1', [id]);
    getIO()?.to(`user:${userId}`).emit('server:ban', { server_id: id, reason });
    res.json({ message: 'Member banned' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.post('/:id/invite/regenerate', auth, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const server = (await pool.query('SELECT owner_id FROM servers WHERE id = $1', [id])).rows[0];
    if (!server || (server.owner_id !== req.user!.id && !isStaff(req.user))) { res.status(403).json({ error: 'No permission' }); return; }

    const newCode = generateInvite();
    await pool.query('UPDATE servers SET invite_code = $1 WHERE id = $2', [newCode, id]);
    res.json({ invite_code: newCode });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.post('/:id/roles', auth, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, color, permissions } = req.body as { name?: string; color?: string; permissions?: number };
  try {
    const server = (await pool.query('SELECT owner_id FROM servers WHERE id = $1', [id])).rows[0];
    if (!server || (server.owner_id !== req.user!.id && !isStaff(req.user))) { res.status(403).json({ error: 'No permission' }); return; }

    const pos = (await pool.query('SELECT COALESCE(MAX(position), 0) + 1 as pos FROM roles WHERE server_id = $1', [id])).rows[0].pos as number;
    const role = (await pool.query(
      'INSERT INTO roles (server_id, name, color, permissions, position) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, name || 'new role', color || '#99aab5', permissions || 0, pos]
    )).rows[0];
    res.status(201).json(role);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.patch('/:id/members/:userId/role', auth, async (req: Request, res: Response): Promise<void> => {
  const { id, userId } = req.params;
  const { role_id } = req.body as { role_id: string };
  try {
    const server = (await pool.query('SELECT owner_id FROM servers WHERE id = $1', [id])).rows[0];
    if (!server || (server.owner_id !== req.user!.id && !isStaff(req.user))) { res.status(403).json({ error: 'No permission' }); return; }

    await pool.query('UPDATE server_members SET role_id = $1 WHERE server_id = $2 AND user_id = $3', [role_id, id, userId]);
    res.json({ message: 'Role updated' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

export default router;
