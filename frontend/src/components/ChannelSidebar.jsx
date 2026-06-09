import React, { useState } from 'react';
import useStore from '../store/useStore';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { getSocket } from '../hooks/useSocket';
import ServerSettingsModal from './modals/ServerSettingsModal';
import CreateChannelModal from './modals/CreateChannelModal';

const ChannelSidebar = () => {
  const { activeServer, activeChannel, setActiveChannel, user, addChannel } = useStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [createChannelCategory, setCreateChannelCategory] = useState(null);
  const [hoveredChannel, setHoveredChannel] = useState(null);

  const isOwner = activeServer?.owner_id === user?.id;

  const handleChannelClick = (channel) => {
    setActiveChannel(channel);
    const socket = getSocket();
    if (socket) {
      if (activeChannel) socket.emit('channel:leave', activeChannel.id);
      socket.emit('channel:join', channel.id);
    }
  };

  const handleDeleteChannel = async (e, channelId) => {
    e.stopPropagation();
    if (!confirm('Delete this channel?')) return;
    try {
      await api.delete(`/channels/${channelId}`);
      const { removeChannel } = useStore.getState();
      removeChannel(channelId);
      toast.success('Channel deleted');
    } catch {
      toast.error('Failed to delete channel');
    }
  };

  const channelsByCategory = activeServer?.channels?.reduce((acc, ch) => {
    const catId = ch.category_id || 'uncategorized';
    if (!acc[catId]) acc[catId] = [];
    acc[catId].push(ch);
    return acc;
  }, {}) || {};

  const categories = activeServer?.categories || [];
  const uncategorized = channelsByCategory['uncategorized'] || [];

  return (
    <div className="w-60 bg-discord-gray flex flex-col">
      <div
        className="h-12 px-4 flex items-center justify-between border-b border-discord-darkest cursor-pointer hover:bg-discord-lighter transition-colors"
        onClick={() => isOwner && setShowSettings(true)}
      >
        <h2 className="font-semibold text-white truncate">{activeServer?.name}</h2>
        {isOwner && (
          <svg className="w-4 h-4 text-discord-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pt-2">
        {uncategorized.length > 0 && uncategorized.map(ch => (
          <ChannelItem
            key={ch.id}
            channel={ch}
            isActive={activeChannel?.id === ch.id}
            onClick={() => handleChannelClick(ch)}
            isOwner={isOwner}
            onDelete={handleDeleteChannel}
            onHover={setHoveredChannel}
            hovered={hoveredChannel === ch.id}
          />
        ))}

        {categories.map(category => (
          <div key={category.id} className="mt-4">
            <div className="flex items-center justify-between px-4 mb-1 group">
              <button className="flex items-center gap-1 text-xs font-semibold text-discord-text-muted uppercase tracking-wide hover:text-discord-text">
                <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 6 6">
                  <path d="M0 0l6 3-6 3V0z" />
                </svg>
                {category.name}
              </button>
              {isOwner && (
                <button
                  onClick={() => { setCreateChannelCategory(category.id); setShowCreateChannel(true); }}
                  className="opacity-0 group-hover:opacity-100 text-discord-text-muted hover:text-white transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
            </div>
            {(channelsByCategory[category.id] || []).map(ch => (
              <ChannelItem
                key={ch.id}
                channel={ch}
                isActive={activeChannel?.id === ch.id}
                onClick={() => handleChannelClick(ch)}
                isOwner={isOwner}
                onDelete={handleDeleteChannel}
                onHover={setHoveredChannel}
                hovered={hoveredChannel === ch.id}
              />
            ))}
          </div>
        ))}

        {isOwner && (
          <button
            onClick={() => { setCreateChannelCategory(null); setShowCreateChannel(true); }}
            className="flex items-center gap-2 mx-2 mt-4 px-2 py-1.5 rounded text-discord-text-muted hover:text-white hover:bg-discord-lighter w-full text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Channel
          </button>
        )}
      </div>

      <UserPanel />

      {showSettings && <ServerSettingsModal onClose={() => setShowSettings(false)} />}
      {showCreateChannel && (
        <CreateChannelModal
          categoryId={createChannelCategory}
          onClose={() => setShowCreateChannel(false)}
        />
      )}
    </div>
  );
};

const ChannelItem = ({ channel, isActive, onClick, isOwner, onDelete, onHover, hovered }) => {
  const icons = {
    text: (
      <svg className="w-4 h-4 mr-1.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M5.88 2.507L4.16 12h6.312L8.624 21.507l.023.01L17.839 9h-5.967l2.104-6.493z" />
      </svg>
    ),
    voice: (
      <svg className="w-4 h-4 mr-1.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6z"/>
        <path d="M17 12c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z"/>
      </svg>
    )
  };

  return (
    <div
      className={`channel-item flex items-center justify-between mx-2 px-2 py-1 rounded cursor-pointer group transition-colors
        ${isActive ? 'active bg-discord-lighter' : ''}`}
      onClick={onClick}
      onMouseEnter={() => onHover(channel.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="flex items-center min-w-0">
        <span className={`${isActive ? 'text-white' : 'text-discord-text-muted group-hover:text-discord-text'}`}>
          {icons[channel.type] || icons.text}
        </span>
        <span className={`text-sm truncate ${isActive ? 'text-white font-medium' : 'text-discord-text-muted group-hover:text-discord-text'}`}>
          {channel.name}
        </span>
      </div>
      {isOwner && hovered && (
        <button
          onClick={(e) => onDelete(e, channel.id)}
          className="text-discord-text-muted hover:text-discord-red ml-1 flex-shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  );
};

const UserPanel = () => {
  const { user } = useStore();
  const [showSettings, setShowSettings] = useState(false);
  const UserSettingsModal = React.lazy(() => import('./modals/UserSettingsModal'));

  return (
    <div className="h-14 bg-discord-darker flex items-center px-2 gap-2">
      <div className="relative flex-shrink-0">
        {user?.avatar ? (
          <img src={user.avatar} alt="" className="w-8 h-8 rounded-full" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-discord-accent flex items-center justify-center text-white text-xs font-bold">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
        )}
        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-discord-darker
          ${user?.status === 'online' ? 'bg-discord-green' : user?.status === 'idle' ? 'bg-discord-yellow' : user?.status === 'dnd' ? 'bg-discord-red' : 'bg-discord-text-muted'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold truncate">{user?.username}</p>
        <p className="text-discord-text-muted text-xs truncate">#{user?.discriminator}</p>
      </div>
      <button
        onClick={() => setShowSettings(true)}
        className="text-discord-text-muted hover:text-white p-1 rounded"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
      {showSettings && (
        <React.Suspense fallback={null}>
          <UserSettingsModal onClose={() => setShowSettings(false)} />
        </React.Suspense>
      )}
    </div>
  );
};

export default ChannelSidebar;
