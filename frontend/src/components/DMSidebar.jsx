import React, { useState } from 'react';
import useStore from '../store/useStore';
import api from '../utils/api';
import toast from 'react-hot-toast';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

const statusColors = {
  online: 'bg-discord-green',
  idle: 'bg-discord-yellow',
  dnd: 'bg-discord-red',
  offline: 'bg-discord-text-muted',
  invisible: 'bg-discord-text-muted'
};

const DMSidebar = () => {
  const { dms, activeDM, setActiveDM, friends, user } = useStore();
  const [activeTab, setActiveTab] = useState('friends');

  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  const pending = friends.filter(f => f.status === 'pending');

  const openDM = async (friendId) => {
    try {
      const res = await api.post(`/dms/open/${friendId}`);
      const dmUser = acceptedFriends.find(f => f.friend_user_id === friendId);
      setActiveDM({ ...res.data, friend_id: friendId, username: dmUser?.username, avatar: dmUser?.avatar });
    } catch {
      toast.error('Failed to open DM');
    }
  };

  return (
    <div className="w-60 bg-discord-gray flex flex-col">
      <div className="p-2 border-b border-discord-darkest">
        <input
          placeholder="Find or start a conversation"
          className="w-full bg-discord-darkest rounded px-2 py-1 text-sm text-discord-text placeholder-discord-text-muted focus:outline-none"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-2 pt-3">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm font-medium transition-colors
              ${activeTab === 'friends' ? 'bg-discord-lighter text-white' : 'text-discord-text-muted hover:bg-discord-lighter hover:text-white'}`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
            </svg>
            Friends
            {pending.length > 0 && (
              <span className="ml-auto bg-discord-red text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                {pending.length}
              </span>
            )}
          </button>
        </div>

        <div className="mt-4 px-2">
          <p className="text-xs font-bold text-discord-text-muted uppercase tracking-wide px-2 mb-1">
            Direct Messages
          </p>
          {dms.map(dm => (
            <button
              key={dm.id}
              onClick={() => setActiveDM(dm)}
              className={`flex items-center gap-3 w-full px-2 py-1.5 rounded transition-colors
                ${activeDM?.id === dm.id ? 'bg-discord-lighter text-white' : 'text-discord-text-muted hover:bg-discord-lighter hover:text-white'}`}
            >
              <div className="relative flex-shrink-0">
                {dm.avatar ? (
                  <img src={`${BACKEND_URL}${dm.avatar}`} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-discord-accent flex items-center justify-center text-white text-xs font-bold">
                    {dm.username?.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-discord-gray ${statusColors[dm.status] || statusColors.offline}`} />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-medium truncate">{dm.username}</p>
                {dm.last_message && (
                  <p className="text-xs text-discord-text-muted truncate">{dm.last_message}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="h-14 bg-discord-darker flex items-center px-2 gap-2">
        {user?.avatar ? (
          <img src={`${BACKEND_URL}${user.avatar}`} alt="" className="w-8 h-8 rounded-full" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-discord-accent flex items-center justify-center text-white text-xs font-bold">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">{user?.username}</p>
          <p className="text-discord-text-muted text-xs">#{user?.discriminator}</p>
        </div>
      </div>
    </div>
  );
};

export default DMSidebar;
