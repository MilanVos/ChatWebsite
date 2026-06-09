const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const connectedUsers = new Map();

const initSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('No token'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const result = await pool.query('SELECT id, username, discriminator, avatar, status FROM users WHERE id = $1', [decoded.userId]);
      if (!result.rows[0]) return next(new Error('User not found'));

      socket.user = result.rows[0];
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user.id;
    console.log(`User connected: ${socket.user.username} (${userId})`);

    connectedUsers.set(userId, socket.id);
    socket.join(`user:${userId}`);

    await pool.query('UPDATE users SET status = $1 WHERE id = $2', ['online', userId]);

    const servers = await pool.query(
      'SELECT server_id FROM server_members WHERE user_id = $1',
      [userId]
    );
    servers.rows.forEach(({ server_id }) => {
      socket.join(`server:${server_id}`);
      socket.to(`server:${server_id}`).emit('user:status', { user_id: userId, status: 'online' });
    });

    socket.emit('connected', { user: socket.user });

    socket.on('channel:join', (channelId) => {
      socket.join(`channel:${channelId}`);
    });

    socket.on('channel:leave', (channelId) => {
      socket.leave(`channel:${channelId}`);
    });

    socket.on('typing:start', async ({ channel_id, is_dm }) => {
      if (is_dm) {
        const members = await pool.query('SELECT user_id FROM dm_members WHERE dm_channel_id = $1', [channel_id]);
        members.rows.forEach(m => {
          if (m.user_id !== userId) {
            io.to(`user:${m.user_id}`).emit('typing:start', {
              channel_id, user: { id: userId, username: socket.user.username }
            });
          }
        });
      } else {
        socket.to(`channel:${channel_id}`).emit('typing:start', {
          channel_id, user: { id: userId, username: socket.user.username }
        });
      }
    });

    socket.on('typing:stop', async ({ channel_id, is_dm }) => {
      if (is_dm) {
        const members = await pool.query('SELECT user_id FROM dm_members WHERE dm_channel_id = $1', [channel_id]);
        members.rows.forEach(m => {
          if (m.user_id !== userId) {
            io.to(`user:${m.user_id}`).emit('typing:stop', { channel_id, user_id: userId });
          }
        });
      } else {
        socket.to(`channel:${channel_id}`).emit('typing:stop', { channel_id, user_id: userId });
      }
    });

    socket.on('status:update', async ({ status }) => {
      const validStatuses = ['online', 'idle', 'dnd', 'invisible'];
      if (!validStatuses.includes(status)) return;

      await pool.query('UPDATE users SET status = $1 WHERE id = $2', [status, userId]);

      const userServers = await pool.query('SELECT server_id FROM server_members WHERE user_id = $1', [userId]);
      userServers.rows.forEach(({ server_id }) => {
        socket.to(`server:${server_id}`).emit('user:status', { user_id: userId, status });
      });
    });

    socket.on('server:join', (serverId) => {
      socket.join(`server:${serverId}`);
    });

    socket.on('server:leave', (serverId) => {
      socket.leave(`server:${serverId}`);
      socket.to(`server:${serverId}`).emit('user:status', { user_id: userId, status: 'offline' });
    });

    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user.username}`);
      connectedUsers.delete(userId);

      await pool.query('UPDATE users SET status = $1 WHERE id = $2', ['offline', userId]);

      const userServers = await pool.query('SELECT server_id FROM server_members WHERE user_id = $1', [userId]);
      userServers.rows.forEach(({ server_id }) => {
        socket.to(`server:${server_id}`).emit('user:status', { user_id: userId, status: 'offline' });
      });
    });
  });
};

module.exports = { initSocket };
