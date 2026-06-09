import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { pool } from '../config/db';
import { auth } from '../middleware/auth';

const router = Router();

const generateDiscriminator = (): string =>
  String(Math.floor(Math.random() * 9000) + 1000);

router.post(
  '/register',
  [
    body('username').trim().isLength({ min: 2, max: 32 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { username, email, password } = req.body as { username: string; email: string; password: string };
    try {
      const existingEmail = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingEmail.rows[0]) {
        res.status(400).json({ error: 'Email already in use' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 12);
      let discriminator = generateDiscriminator();

      for (let i = 0; i < 10; i++) {
        const ex = await pool.query(
          'SELECT id FROM users WHERE username = $1 AND discriminator = $2',
          [username, discriminator]
        );
        if (!ex.rows[0]) break;
        discriminator = generateDiscriminator();
      }

      const result = await pool.query(
        'INSERT INTO users (username, discriminator, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, username, discriminator, email, avatar, status',
        [username, discriminator, email, passwordHash]
      );

      const user = result.rows[0];
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
      res.status(201).json({ token, user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password } = req.body as { email: string; password: string };
    try {
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      const user = result.rows[0];

      if (!user || !(await bcrypt.compare(password, user.password_hash as string))) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      await pool.query('UPDATE users SET status = $1 WHERE id = $2', ['online', user.id]);
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
      const { password_hash, ...userData } = user;
      res.json({ token, user: { ...userData, status: 'online' } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.post('/logout', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    await pool.query('UPDATE users SET status = $1 WHERE id = $2', ['offline', req.user!.id]);
    res.json({ message: 'Logged out' });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', auth, (req: Request, res: Response): void => {
  res.json(req.user);
});

export default router;
