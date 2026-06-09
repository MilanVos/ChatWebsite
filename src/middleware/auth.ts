import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db';

interface JwtPayload {
  userId: string;
}

export const auth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    const result = await pool.query(
      `SELECT u.id, u.username, u.discriminator, u.email, u.avatar, u.banner, u.bio, u.status, u.custom_status,
        COALESCE(json_agg(ub.badge_type ORDER BY ub.awarded_at) FILTER (WHERE ub.badge_type IS NOT NULL), '[]') AS badges
       FROM users u
       LEFT JOIN user_badges ub ON ub.user_id = u.id
       WHERE u.id = $1
       GROUP BY u.id`,
      [decoded.userId]
    );

    if (!result.rows[0]) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = result.rows[0];
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
