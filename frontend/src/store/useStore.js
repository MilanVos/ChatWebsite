import { create } from 'zustand';

const useStore = create((set, get) => ({
  user: null,
  servers: [],
  activeServer: null,
  activeChannel: null,
  activeDM: null,
  messages: {},
  dmMessages: {},
  friends: [],
  dms: [],
  typingUsers: {},
  memberStatuses: {},

  setUser: (user) => set({ user }),

  setServers: (servers) => set({ servers }),
  addServer: (server) => set((state) => ({ servers: [...state.servers, server] })),
  removeServer: (serverId) => set((state) => ({
    servers: state.servers.filter(s => s.id !== serverId),
    activeServer: state.activeServer?.id === serverId ? null : state.activeServer,
    activeChannel: state.activeServer?.id === serverId ? null : state.activeChannel
  })),
  updateServer: (server) => set((state) => ({
    servers: state.servers.map(s => s.id === server.id ? { ...s, ...server } : s),
    activeServer: state.activeServer?.id === server.id ? { ...state.activeServer, ...server } : state.activeServer
  })),

  setActiveServer: (server) => set({ activeServer: server, activeChannel: null, activeDM: null }),
  setActiveChannel: (channel) => set({ activeChannel: channel, activeDM: null }),
  setActiveDM: (dm) => set({ activeDM: dm, activeChannel: null }),

  updateServerData: (serverId, data) => set((state) => ({
    activeServer: state.activeServer?.id === serverId ? { ...state.activeServer, ...data } : state.activeServer
  })),

  addChannel: (channel) => set((state) => {
    if (!state.activeServer || state.activeServer.id !== channel.server_id) return state;
    return {
      activeServer: {
        ...state.activeServer,
        channels: [...(state.activeServer.channels || []), channel]
      }
    };
  }),

  removeChannel: (channelId) => set((state) => {
    if (!state.activeServer) return state;
    return {
      activeServer: {
        ...state.activeServer,
        channels: state.activeServer.channels?.filter(c => c.id !== channelId) || []
      },
      activeChannel: state.activeChannel?.id === channelId ? null : state.activeChannel
    };
  }),

  setMessages: (channelId, messages) => set((state) => ({
    messages: { ...state.messages, [channelId]: messages }
  })),
  addMessage: (channelId, message) => set((state) => ({
    messages: {
      ...state.messages,
      [channelId]: [...(state.messages[channelId] || []), message]
    }
  })),
  updateMessage: (channelId, message) => set((state) => ({
    messages: {
      ...state.messages,
      [channelId]: (state.messages[channelId] || []).map(m => m.id === message.id ? { ...m, ...message } : m)
    }
  })),
  deleteMessage: (channelId, messageId) => set((state) => ({
    messages: {
      ...state.messages,
      [channelId]: (state.messages[channelId] || []).filter(m => m.id !== messageId)
    }
  })),
  updateMessageReactions: (channelId, messageId, reactions) => set((state) => ({
    messages: {
      ...state.messages,
      [channelId]: (state.messages[channelId] || []).map(m =>
        m.id === messageId ? { ...m, reactions } : m
      )
    }
  })),
  prependMessages: (channelId, messages) => set((state) => ({
    messages: {
      ...state.messages,
      [channelId]: [...messages, ...(state.messages[channelId] || [])]
    }
  })),

  setDMMessages: (channelId, messages) => set((state) => ({
    dmMessages: { ...state.dmMessages, [channelId]: messages }
  })),
  addDMMessage: (channelId, message) => set((state) => ({
    dmMessages: {
      ...state.dmMessages,
      [channelId]: [...(state.dmMessages[channelId] || []), message]
    }
  })),
  deleteDMMessage: (channelId, messageId) => set((state) => ({
    dmMessages: {
      ...state.dmMessages,
      [channelId]: (state.dmMessages[channelId] || []).filter(m => m.id !== messageId)
    }
  })),

  setFriends: (friends) => set({ friends }),
  addFriend: (friend) => set((state) => ({ friends: [...state.friends, friend] })),
  updateFriend: (id, data) => set((state) => ({
    friends: state.friends.map(f => f.id === id ? { ...f, ...data } : f)
  })),
  removeFriend: (userId) => set((state) => ({
    friends: state.friends.filter(f => f.friend_user_id !== userId && f.id !== userId)
  })),

  setDMs: (dms) => set({ dms }),
  addDM: (dm) => set((state) => {
    const exists = state.dms.find(d => d.id === dm.id);
    if (exists) return state;
    return { dms: [dm, ...state.dms] };
  }),

  setTyping: (channelId, userId, username, isTyping) => set((state) => {
    const current = state.typingUsers[channelId] || {};
    if (isTyping) {
      return { typingUsers: { ...state.typingUsers, [channelId]: { ...current, [userId]: username } } };
    } else {
      const { [userId]: _, ...rest } = current;
      return { typingUsers: { ...state.typingUsers, [channelId]: rest } };
    }
  }),

  setMemberStatus: (userId, status) => set((state) => ({
    memberStatuses: { ...state.memberStatuses, [userId]: status }
  })),

  updateMemberStatus: (userId, status) => {
    set((state) => {
      const newStatuses = { ...state.memberStatuses, [userId]: status };
      const activeServer = state.activeServer;
      if (!activeServer) return { memberStatuses: newStatuses };

      const updatedMembers = activeServer.members?.map(m =>
        m.id === userId ? { ...m, status } : m
      ) || [];

      return {
        memberStatuses: newStatuses,
        activeServer: { ...activeServer, members: updatedMembers }
      };
    });
  },

  logout: () => set({
    user: null, servers: [], activeServer: null, activeChannel: null,
    activeDM: null, messages: {}, dmMessages: {}, friends: [], dms: [],
    typingUsers: {}, memberStatuses: {}
  })
}));

export default useStore;
