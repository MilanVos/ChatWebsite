export interface User {
  id: string;
  username: string;
  discriminator: string;
  email: string;
  avatar?: string;
  banner?: string;
  bio?: string;
  status: string;
  custom_status?: string;
  created_at: string;
}

export interface Server {
  id: string;
  name: string;
  icon?: string;
  banner?: string;
  description?: string;
  owner_id: string;
  invite_code: string;
  member_count: number;
  created_at: string;
  categories?: Category[];
  channels?: Channel[];
  members?: Member[];
  roles?: Role[];
}

export interface Category {
  id: string;
  server_id: string;
  name: string;
  position: number;
}

export interface Channel {
  id: string;
  server_id: string;
  category_id?: string;
  name: string;
  type: 'text' | 'voice';
  topic?: string;
  position: number;
  slowmode: number;
  nsfw: boolean;
  last_message_at?: string;
  created_at: string;
}

export interface Role {
  id: string;
  server_id: string;
  name: string;
  color: string;
  permissions: number;
  position: number;
  hoist: boolean;
  mentionable: boolean;
}

export interface Member extends User {
  nickname?: string;
  role_id?: string;
  role_name?: string;
  role_color?: string;
  joined_at: string;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content?: string;
  type: string;
  edited_at?: string;
  pinned: boolean;
  reply_to?: string;
  created_at: string;
  username?: string;
  avatar?: string;
  discriminator?: string;
  attachments?: Attachment[];
  reactions?: Reaction[];
}

export interface Attachment {
  id: string;
  message_id: string;
  url: string;
  filename: string;
  size: number;
  content_type?: string;
  width?: number;
  height?: number;
}

export interface Reaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

export interface DMChannel {
  id: string;
  friend_id?: string;
  username?: string;
  avatar?: string;
  status?: string;
  last_message?: string;
  created_at: string;
}

export interface Friend {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  friend_user_id?: string;
  username?: string;
  discriminator?: string;
  avatar?: string;
  created_at: string;
}
