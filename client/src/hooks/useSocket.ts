import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import useStore from '../store/useStore';
import toast from 'react-hot-toast';

let socketInstance: Socket | null = null;
export const getSocket = (): Socket | null => socketInstance;

export const useSocket = () => {
  const initialized = useRef(false);
  const { user, addMessage, updateMessage, deleteMessage, updateMessageReactions, addDMMessage, deleteDMMessage, setTyping, updateMemberStatus, addFriend, updateFriend, removeServer } = useStore();

  useEffect(() => {
    if (!user || initialized.current) return;
    initialized.current = true;

    socketInstance = io('', { auth: { token: localStorage.getItem('token') }, transports: ['websocket'] });

    socketInstance.on('message:new', (msg: any) => addMessage(msg.channel_id, msg));
    socketInstance.on('message:update', (msg: any) => updateMessage(msg.channel_id, msg));
    socketInstance.on('message:delete', ({ id, channel_id }: any) => deleteMessage(channel_id, id));
    socketInstance.on('message:reaction', ({ message_id, reactions, channel_id }: any) => updateMessageReactions(channel_id, message_id, reactions));
    socketInstance.on('dm:message', (msg: any) => addDMMessage(msg.dm_channel_id, msg));
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

    return () => { socketInstance?.disconnect(); socketInstance = null; initialized.current = false; };
  }, [user]);

  return socketInstance;
};
