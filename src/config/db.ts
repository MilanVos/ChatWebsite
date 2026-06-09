import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export const initDB = async (): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(32) NOT NULL,
        discriminator VARCHAR(4) NOT NULL DEFAULT '0000',
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        avatar VARCHAR(255),
        banner VARCHAR(255),
        bio TEXT,
        status VARCHAR(20) DEFAULT 'offline',
        custom_status VARCHAR(128),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(username, discriminator)
      );

      CREATE TABLE IF NOT EXISTS servers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        icon VARCHAR(255),
        banner VARCHAR(255),
        description TEXT,
        owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        invite_code VARCHAR(16) UNIQUE NOT NULL,
        member_count INT DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        color VARCHAR(7) DEFAULT '#99aab5',
        permissions BIGINT DEFAULT 0,
        position INT DEFAULT 0,
        hoist BOOLEAN DEFAULT FALSE,
        mentionable BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS server_members (
        server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
        nickname VARCHAR(32),
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (server_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        position INT DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS channels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
        category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(20) DEFAULT 'text',
        topic VARCHAR(1024),
        position INT DEFAULT 0,
        slowmode INT DEFAULT 0,
        nsfw BOOLEAN DEFAULT FALSE,
        last_message_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT,
        type VARCHAR(20) DEFAULT 'default',
        edited_at TIMESTAMPTZ,
        pinned BOOLEAN DEFAULT FALSE,
        reply_to UUID REFERENCES messages(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS message_attachments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        url VARCHAR(512) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        size INT NOT NULL,
        content_type VARCHAR(100),
        width INT,
        height INT
      );

      CREATE TABLE IF NOT EXISTS message_reactions (
        message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        emoji VARCHAR(32) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (message_id, user_id, emoji)
      );

      CREATE TABLE IF NOT EXISTS pinned_messages (
        channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
        message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        pinned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        pinned_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (channel_id, message_id)
      );

      CREATE TABLE IF NOT EXISTS dm_channels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS dm_members (
        dm_channel_id UUID NOT NULL REFERENCES dm_channels(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (dm_channel_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS dm_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        dm_channel_id UUID NOT NULL REFERENCES dm_channels(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT,
        edited_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS friends (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(requester_id, addressee_id)
      );

      CREATE TABLE IF NOT EXISTS bans (
        server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        banned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (server_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_server_members_user_id ON server_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_channels_server_id ON channels(server_id);
      CREATE INDEX IF NOT EXISTS idx_dm_messages_channel_id ON dm_messages(dm_channel_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_friends_users ON friends(requester_id, addressee_id);
    `);
    console.log('✅ Database initialized');
  } catch (err) {
    console.error('❌ DB init error:', err);
    throw err;
  } finally {
    client.release();
  }
};
