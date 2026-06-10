import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import useStore from '../store/useStore';
import toast from 'react-hot-toast';

let socketInstance: Socket | null = null;
export const getSocket = (): Socket | null => socketInstance;

export const useSocket = () => {
  const initialized = useRef(false);
  const { user, addMessage, updateMessage, deleteMessage, updateMessageReactions, addDMMessage, deleteDMMessage, setTyping, updateMemberStatus, addFriend, updateFriend, removeServer, incrementDMUnread, setVoiceParticipants, addVoiceParticipant, removeVoiceParticipant, updateServer, addChannel, updateChannel, removeChannel, addCategory, removeCategory, addServerMember, removeServerMember, updateServerMember, updateServerRoles } = useStore();

  useEffect(() => {
    if (!user || initialized.current) return;
    initialized.current = true;

    socketInstance = io('', { auth: { token: localStorage.getItem('token') }, transports: ['websocket'] });

    socketInstance.on('message:new', (msg: any) => addMessage(msg.channel_id, msg));
    socketInstance.on('message:update', (msg: any) => updateMessage(msg.channel_id, msg));
    socketInstance.on('message:delete', ({ id, channel_id }: any) => deleteMessage(channel_id, id));
    socketInstance.on('message:reaction', ({ message_id, reactions, channel_id }: any) => updateMessageReactions(channel_id, message_id, reactions));
    socketInstance.on('dm:message', (msg: any) => {
      const { activeDM } = useStore.getState();
      addDMMessage(msg.dm_channel_id, msg);
      if (activeDM?.id !== msg.dm_channel_id) {
        incrementDMUnread(msg.dm_channel_id, msg.content || '');
      }
    });
    socketInstance.on('dm:delete', ({ message_id, dm_channel_id }: any) => deleteDMMessage(dm_channel_id, message_id));
    socketInstance.on('typing:start', ({ channel_id, user: u }: any) => {
      setTyping(channel_id, u.id, u.username, true);
      setTimeout(() => setTyping(channel_id, u.id, u.username, false), 3000);
    });
    socketInstance.on('typing:stop', ({ channel_id, user_id }: any) => setTyping(channel_id, user_id, '', false));
    socketInstance.on('user:status', ({ user_id, status }: any) => updateMemberStatus(user_id, status));
    socketInstance.on('friend:request', (data: any) => { toast(`Friend request from ${data.username}#${data.discriminator}`, { icon: '👋' }); addFriend(data); });
    socketInstance.on('friend:accepted', (data: any) => { toast(`${data.username} accepted your request!`, { icon: '🎉' }); updateFriend(data.id, { status: 'accepted' }); });
    socketInstance.on('server:kick', ({ server_id }: any) => { toast.error('You were kicked'); removeServer(server_id); });
    socketInstance.on('server:ban', ({ server_id }: any) => { toast.error('You were banned'); removeServer(server_id); });

    socketInstance.on('voice:participants', ({ channel_id, participants }: any) => {
      setVoiceParticipants(channel_id, participants);
    });
    socketInstance.on('voice:user-joined', ({ channel_id, user: u }: any) => {
      addVoiceParticipant(channel_id, u);
    });
    socketInstance.on('voice:user-left', ({ channel_id, user_id }: any) => {
      removeVoiceParticipant(channel_id, user_id);
    });

    socketInstance.on('server:update', (data: any) => updateServer(data));
    socketInstance.on('channel:create', (channel: any) => addChannel(channel));
    socketInstance.on('channel:update', (channel: any) => updateChannel(channel));
    socketInstance.on('channel:delete', ({ id }: any) => removeChannel(id));
    socketInstance.on('category:create', (cat: any) => addCategory(cat));
    socketInstance.on('category:delete', ({ id }: any) => removeCategory(id));
    socketInstance.on('member:join', ({ server_id, member }: any) => addServerMember(server_id, member));
    socketInstance.on('member:leave', ({ server_id, user_id }: any) => removeServerMember(server_id, user_id));
    socketInstance.on('member:role_update', ({ server_id, user_id, role_id, role_name, role_color }: any) => {
      updateServerMember(server_id, user_id, { role_id, role_name, role_color });
    });
    socketInstance.on('server:roles_update', ({ server_id, roles }: any) => updateServerRoles(server_id, roles));

    return () => { socketInstance?.disconnect(); socketInstance = null; initialized.current = false; };
  }, [user]);

  return socketInstance;
};
