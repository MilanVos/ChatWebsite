import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db';

interface JwtPayload { userId: string; }

let ioInstance: Server | null = null;

export const getIO = (): Server | null => ioInstance;

export const initSocket = (io: Server): void => {
  ioInstance = io;

  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token as string | undefined;
      if (!token) return next(new Error('No token'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
      const result = await pool.query('SELECT id, username, discriminator, avatar, status FROM users WHERE id = $1', [decoded.userId]);
      if (!result.rows[0]) return next(new Error('User not found'));

      (socket as Socket & { user: Record<string, unknown> }).user = result.rows[0] as Record<string, unknown>;
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const user = (socket as Socket & { user: Record<string, unknown> }).user;
    const userId = user.id as string;
    console.log(`🟢 Connected: ${user.username as string}`);

    socket.join(`user:${userId}`);
    await pool.query('UPDATE users SET status = $1 WHERE id = $2', ['online', userId]);

    const servers = await pool.query('SELECT server_id FROM server_members WHERE user_id = $1', [userId]);
    servers.rows.forEach(({ server_id }: { server_id: string }) => {
      void socket.join(`server:${server_id}`);
      socket.to(`server:${server_id}`).emit('user:status', { user_id: userId, status: 'online' });
    });

    socket.emit('connected', { user });

    socket.on('channel:join', (channelId: string) => void socket.join(`channel:${channelId}`));
    socket.on('channel:leave', (channelId: string) => void socket.leave(`channel:${channelId}`));

    socket.on('typing:start', async ({ channel_id, is_dm }: { channel_id: string; is_dm: boolean }) => {
      if (is_dm) {
        const members = await pool.query('SELECT user_id FROM dm_members WHERE dm_channel_id = $1', [channel_id]);
        members.rows.forEach(({ user_id }: { user_id: string }) => {
          if (user_id !== userId) {
            io.to(`user:${user_id}`).emit('typing:start', { channel_id, user: { id: userId, username: user.username } });
          }
        });
      } else {
        socket.to(`channel:${channel_id}`).emit('typing:start', { channel_id, user: { id: userId, username: user.username } });
      }
    });

    socket.on('typing:stop', async ({ channel_id, is_dm }: { channel_id: string; is_dm: boolean }) => {
      if (is_dm) {
        const members = await pool.query('SELECT user_id FROM dm_members WHERE dm_channel_id = $1', [channel_id]);
        members.rows.forEach(({ user_id }: { user_id: string }) => {
          if (user_id !== userId) io.to(`user:${user_id}`).emit('typing:stop', { channel_id, user_id: userId });
        });
      } else {
        socket.to(`channel:${channel_id}`).emit('typing:stop', { channel_id, user_id: userId });
      }
    });

    socket.on('status:update', async ({ status }: { status: string }) => {
      const valid = ['online', 'idle', 'dnd', 'invisible'];
      if (!valid.includes(status)) return;

      await pool.query('UPDATE users SET status = $1 WHERE id = $2', [status, userId]);
      const userServers = await pool.query('SELECT server_id FROM server_members WHERE user_id = $1', [userId]);
      userServers.rows.forEach(({ server_id }: { server_id: string }) => {
        socket.to(`server:${server_id}`).emit('user:status', { user_id: userId, status });
      });
    });

    socket.on('server:join', (serverId: string) => void socket.join(`server:${serverId}`));
    socket.on('server:leave', (serverId: string) => {
      void socket.leave(`server:${serverId}`);
      socket.to(`server:${serverId}`).emit('user:status', { user_id: userId, status: 'offline' });
    });

    socket.on('disconnect', async () => {
      console.log(`🔴 Disconnected: ${user.username as string}`);
      await pool.query('UPDATE users SET status = $1 WHERE id = $2', ['offline', userId]);
      const userServers = await pool.query('SELECT server_id FROM server_members WHERE user_id = $1', [userId]);
      userServers.rows.forEach(({ server_id }: { server_id: string }) => {
        socket.to(`server:${server_id}`).emit('user:status', { user_id: userId, status: 'offline' });
      });
    });
  });
};
