import { create } from 'zustand';

interface User {
  id: string; username: string; discriminator: string; email: string;
  avatar?: string; banner?: string; bio?: string; status: string; custom_status?: string;
  badges?: string[];
}
interface Server {
  id: string; name: string; icon?: string; owner_id: string; invite_code: string;
  member_count: number; categories?: Category[]; channels?: Channel[]; members?: Member[]; roles?: Role[];
}
interface Category { id: string; server_id: string; name: string; position: number; }
interface Channel {
  id: string; server_id: string; category_id?: string; name: string;
  type: string; topic?: string; position: number;
}
interface Role { id: string; server_id: string; name: string; color: string; permissions: number; position: number; }
interface Member extends User { nickname?: string; role_id?: string; role_name?: string; role_color?: string; joined_at: string; badges?: string[]; }
interface Message {
  id: string; channel_id: string; user_id: string; content?: string;
  username?: string; avatar?: string; discriminator?: string;
  created_at: string; edited_at?: string; pinned?: boolean;
  reply_to?: string; reply_content?: string; reply_username?: string;
  attachments?: Attachment[]; reactions?: Reaction[]; isGrouped?: boolean;
}
interface Attachment { id: string; url: string; filename: string; size: number; content_type?: string; }
interface Reaction { emoji: string; count: string; reacted: boolean; }
interface DMChannel {
  id: string; friend_id?: string; username?: string; avatar?: string;
  status?: string; last_message?: string; created_at: string; unread_count?: number;
}
interface Friend {
  id: string; requester_id: string; addressee_id: string; status: string;
  friend_user_id?: string; username?: string; discriminator?: string; avatar?: string;
}

interface Store {
  user: User | null;
  servers: Server[];
  activeServer: Server | null;
  activeChannel: Channel | null;
  activeDM: DMChannel | null;
  messages: Record<string, Message[]>;
  dmMessages: Record<string, Message[]>;
  friends: Friend[];
  dms: DMChannel[];
  typingUsers: Record<string, Record<string, string>>;
  memberStatuses: Record<string, string>;

  setUser: (user: User | null) => void;
  setServers: (s: Server[]) => void;
  addServer: (s: Server) => void;
  removeServer: (id: string) => void;
  updateServer: (s: Partial<Server> & { id: string }) => void;
  setActiveServer: (s: Server | null) => void;
  setActiveChannel: (c: Channel | null) => void;
  setActiveDM: (dm: DMChannel | null) => void;
  addChannel: (c: Channel) => void;
  removeChannel: (id: string) => void;
  setMessages: (channelId: string, msgs: Message[]) => void;
  addMessage: (channelId: string, msg: Message) => void;
  updateMessage: (channelId: string, msg: Message) => void;
  deleteMessage: (channelId: string, msgId: string) => void;
  updateMessageReactions: (channelId: string, msgId: string, reactions: Reaction[]) => void;
  prependMessages: (channelId: string, msgs: Message[]) => void;
  setDMMessages: (channelId: string, msgs: Message[]) => void;
  addDMMessage: (channelId: string, msg: Message) => void;
  deleteDMMessage: (channelId: string, msgId: string) => void;
  setFriends: (friends: Friend[]) => void;
  addFriend: (f: Friend) => void;
  updateFriend: (id: string, data: Partial<Friend>) => void;
  setDMs: (dms: DMChannel[]) => void;
  addDM: (dm: DMChannel) => void;
  markDMRead: (channelId: string) => void;
  incrementDMUnread: (channelId: string, lastMessage: string) => void;
  setTyping: (channelId: string, userId: string, username: string, isTyping: boolean) => void;
  updateMemberStatus: (userId: string, status: string) => void;
  setBadges: (badges: string[]) => void;
  logout: () => void;
}

const useStore = create<Store>((set) => ({
  user: null, servers: [], activeServer: null, activeChannel: null, activeDM: null,
  messages: {}, dmMessages: {}, friends: [], dms: [], typingUsers: {}, memberStatuses: {},

  setUser: (user) => set({ user }),
  setServers: (servers) => set({ servers }),
  addServer: (server) => set((s) => ({ servers: [...s.servers, server] })),
  removeServer: (id) => set((s) => ({
    servers: s.servers.filter((sv) => sv.id !== id),
    activeServer: s.activeServer?.id === id ? null : s.activeServer,
    activeChannel: s.activeServer?.id === id ? null : s.activeChannel,
  })),
  updateServer: (server) => set((s) => ({
    servers: s.servers.map((sv) => sv.id === server.id ? { ...sv, ...server } : sv),
    activeServer: s.activeServer?.id === server.id ? { ...s.activeServer, ...server } : s.activeServer,
  })),
  setActiveServer: (server) => set({ activeServer: server, activeChannel: null, activeDM: null }),
  setActiveChannel: (channel) => set({ activeChannel: channel, activeDM: null }),
  setActiveDM: (dm) => set({ activeDM: dm, activeChannel: null, activeServer: null }),
  addChannel: (channel) => set((s) => {
    if (!s.activeServer || s.activeServer.id !== channel.server_id) return s;
    return { activeServer: { ...s.activeServer, channels: [...(s.activeServer.channels || []), channel] } };
  }),
  removeChannel: (id) => set((s) => {
    if (!s.activeServer) return s;
    return {
      activeServer: { ...s.activeServer, channels: s.activeServer.channels?.filter((c) => c.id !== id) || [] },
      activeChannel: s.activeChannel?.id === id ? null : s.activeChannel,
    };
  }),
  setMessages: (channelId, msgs) => set((s) => ({ messages: { ...s.messages, [channelId]: msgs } })),
  addMessage: (channelId, msg) => set((s) => ({ messages: { ...s.messages, [channelId]: [...(s.messages[channelId] || []), msg] } })),
  updateMessage: (channelId, msg) => set((s) => ({
    messages: { ...s.messages, [channelId]: (s.messages[channelId] || []).map((m) => m.id === msg.id ? { ...m, ...msg } : m) },
  })),
  deleteMessage: (channelId, msgId) => set((s) => ({
    messages: { ...s.messages, [channelId]: (s.messages[channelId] || []).filter((m) => m.id !== msgId) },
  })),
  updateMessageReactions: (channelId, msgId, reactions) => set((s) => ({
    messages: { ...s.messages, [channelId]: (s.messages[channelId] || []).map((m) => m.id === msgId ? { ...m, reactions } : m) },
  })),
  prependMessages: (channelId, msgs) => set((s) => ({
    messages: { ...s.messages, [channelId]: [...msgs, ...(s.messages[channelId] || [])] },
  })),
  setDMMessages: (channelId, msgs) => set((s) => ({ dmMessages: { ...s.dmMessages, [channelId]: msgs } })),
  addDMMessage: (channelId, msg) => set((s) => ({ dmMessages: { ...s.dmMessages, [channelId]: [...(s.dmMessages[channelId] || []), msg] } })),
  deleteDMMessage: (channelId, msgId) => set((s) => ({
    dmMessages: { ...s.dmMessages, [channelId]: (s.dmMessages[channelId] || []).filter((m) => m.id !== msgId) },
  })),
  setFriends: (friends) => set({ friends }),
  addFriend: (f) => set((s) => ({ friends: [...s.friends, f] })),
  updateFriend: (id, data) => set((s) => ({ friends: s.friends.map((f) => f.id === id ? { ...f, ...data } : f) })),
  setDMs: (dms) => set({ dms }),
  addDM: (dm) => set((s) => ({ dms: s.dms.find((d) => d.id === dm.id) ? s.dms : [dm, ...s.dms] })),
  markDMRead: (channelId) => set((s) => ({
    dms: s.dms.map((d) => d.id === channelId ? { ...d, unread_count: 0 } : d),
  })),
  incrementDMUnread: (channelId, lastMessage) => set((s) => ({
    dms: s.dms.map((d) => d.id === channelId
      ? { ...d, last_message: lastMessage, unread_count: (d.unread_count || 0) + 1 }
      : d
    ).sort((a, b) => {
      if (a.id === channelId) return -1;
      if (b.id === channelId) return 1;
      return 0;
    }),
  })),
  setTyping: (channelId, userId, username, isTyping) => set((s) => {
    const current = s.typingUsers[channelId] || {};
    if (isTyping) return { typingUsers: { ...s.typingUsers, [channelId]: { ...current, [userId]: username } } };
    const { [userId]: _, ...rest } = current;
    return { typingUsers: { ...s.typingUsers, [channelId]: rest } };
  }),
  setBadges: (badges) => set((s) => ({ user: s.user ? { ...s.user, badges } : s.user })),
  updateMemberStatus: (userId, status) => set((s) => ({
    memberStatuses: { ...s.memberStatuses, [userId]: status },
    activeServer: s.activeServer
      ? { ...s.activeServer, members: s.activeServer.members?.map((m) => m.id === userId ? { ...m, status } : m) }
      : s.activeServer,
  })),
  logout: () => set({ user: null, servers: [], activeServer: null, activeChannel: null, activeDM: null, messages: {}, dmMessages: {}, friends: [], dms: {}, typingUsers: {}, memberStatuses: {} } as unknown as Store),
}));

export default useStore;
