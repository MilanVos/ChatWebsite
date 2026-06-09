import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import useStore from '../store/useStore';
import toast from 'react-hot-toast';

let socketInstance = null;

export const getSocket = () => socketInstance;

export const useSocket = () => {
  const initialized = useRef(false);
  const {
    user, addMessage, updateMessage, deleteMessage, updateMessageReactions,
    addDMMessage, deleteDMMessage, setTyping, updateMemberStatus,
    addFriend, updateFriend, setDMs, dms, removeServer, activeChannel, activeDM
  } = useStore();

  useEffect(() => {
    if (!user || initialized.current) return;
    initialized.current = true;

    const token = localStorage.getItem('token');
    socketInstance = io(import.meta.env.VITE_BACKEND_URL || '', {
      auth: { token },
      transports: ['websocket']
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected');
    });

    socketInstance.on('message:new', (message) => {
      addMessage(message.channel_id, message);
    });

    socketInstance.on('message:update', (message) => {
      updateMessage(message.channel_id, message);
    });

    socketInstance.on('message:delete', ({ id, channel_id }) => {
      deleteMessage(channel_id, id);
    });

    socketInstance.on('message:reaction', ({ message_id, reactions, channel_id }) => {
      if (activeChannel) {
        updateMessageReactions(activeChannel.id, message_id, reactions);
      }
    });

    socketInstance.on('dm:message', (message) => {
      addDMMessage(message.dm_channel_id, message);
    });

    socketInstance.on('dm:delete', ({ message_id, dm_channel_id }) => {
      deleteDMMessage(dm_channel_id, message_id);
    });

    socketInstance.on('typing:start', ({ channel_id, user: typingUser }) => {
      setTyping(channel_id, typingUser.id, typingUser.username, true);
      setTimeout(() => setTyping(channel_id, typingUser.id, typingUser.username, false), 3000);
    });

    socketInstance.on('typing:stop', ({ channel_id, user_id }) => {
      setTyping(channel_id, user_id, '', false);
    });

    socketInstance.on('user:status', ({ user_id, status }) => {
      updateMemberStatus(user_id, status);
    });

    socketInstance.on('friend:request', (data) => {
      toast(`Friend request from ${data.username}#${data.discriminator}`, { icon: '👋' });
      addFriend(data);
    });

    socketInstance.on('friend:accepted', (data) => {
      toast(`${data.username} accepted your friend request!`, { icon: '🎉' });
      updateFriend(data.id, { status: 'accepted' });
    });

    socketInstance.on('server:kick', ({ server_id }) => {
      toast.error('You were kicked from a server');
      removeServer(server_id);
    });

    socketInstance.on('server:ban', ({ server_id, reason }) => {
      toast.error(`You were banned${reason ? `: ${reason}` : ''}`);
      removeServer(server_id);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
        initialized.current = false;
      }
    };
  }, [user]);

  return socketInstance;
};
