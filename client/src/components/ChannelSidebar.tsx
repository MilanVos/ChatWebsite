import React, { useEffect, useState } from 'react';
import useStore from '../store/useStore';
import api from '../utils/api';
import ServerSettingsModal from './modals/ServerSettingsModal';
import CreateChannelModal from './modals/CreateChannelModal';
import UserSettingsModal from './modals/UserSettingsModal';

const statusDot = (status?: string) => {
  if (status === 'online') return 'bg-discord-green';
  if (status === 'idle') return 'bg-discord-yellow';
  if (status === 'dnd') return 'bg-discord-red';
  return 'bg-gray-500';
};

const ChannelSidebar = () => {
  const { activeServer, activeChannel, setActiveChannel, updateServer, user } = useStore();
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!activeServer) return;
    api.get(`/servers/${activeServer.id}`).then(res => updateServer(res.data)).catch(console.error);
  }, [activeServer?.id]);

  if (!activeServer) return null;

  const isOwner = user?.id === activeServer.owner_id;
  const channels = activeServer.channels || [];
  const categories = [...(activeServer.categories || [])].sort((a, b) => a.position - b.position);
  const uncategorized = channels.filter(c => !c.category_id).sort((a, b) => a.position - b.position);

  return (
    <div className="w-60 bg-discord-gray flex flex-col flex-shrink-0">
      <button
        className="h-12 flex items-center justify-between px-4 border-b border-discord-darker shadow-md hover:bg-discord-lighter transition-colors w-full text-left"
        onClick={() => setShowServerSettings(true)}
      >
        <span className="text-white font-bold text-sm truncate">{activeServer.name}</span>
        <svg className="w-4 h-4 text-discord-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div className="flex-1 overflow-y-auto py-2">
        {uncategorized.map(channel => (
          <ChannelItem
            key={channel.id}
            channel={channel}
            isActive={activeChannel?.id === channel.id}
            isOwner={isOwner}
            onClick={() => setActiveChannel(channel)}
          />
        ))}

        {categories.map(cat => (
          <div key={cat.id} className="mt-2">
            <div
              className="flex items-center justify-between px-3 py-1 group cursor-pointer"
              onClick={() => setCollapsed(c => ({ ...c, [cat.id]: !c[cat.id] }))}
            >
              <span className="text-discord-text-muted text-xs font-bold uppercase tracking-wide hover:text-discord-text-dim flex items-center gap-1">
                <svg className={`w-2 h-2 transition-transform ${collapsed[cat.id] ? '-rotate-90' : ''}`} fill="currentColor" viewBox="0 0 8 8">
                  <path d="M0 2l4 4 4-4z" />
                </svg>
                {cat.name}
              </span>
              {isOwner && (
                <button
                  onClick={e => { e.stopPropagation(); setShowCreateChannel(true); }}
                  className="opacity-0 group-hover:opacity-100 text-discord-text-muted hover:text-white transition-opacity text-lg leading-none"
                >
                  +
                </button>
              )}
            </div>
            {!collapsed[cat.id] && channels
              .filter(c => c.category_id === cat.id)
              .sort((a, b) => a.position - b.position)
              .map(channel => (
                <ChannelItem
                  key={channel.id}
                  channel={channel}
                  isActive={activeChannel?.id === channel.id}
                  isOwner={isOwner}
                  onClick={() => setActiveChannel(channel)}
                />
              ))}
          </div>
        ))}

        {isOwner && (
          <button
            onClick={() => setShowCreateChannel(true)}
            className="mx-3 mt-3 flex items-center gap-1 text-discord-text-muted hover:text-discord-text text-sm transition-colors"
          >
            <span className="text-lg leading-none">+</span>
            <span>Add Channel</span>
          </button>
        )}
      </div>

      <div className="h-14 bg-discord-dark flex items-center px-2 gap-2 flex-shrink-0">
        <div className="relative flex-shrink-0">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.username} className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-discord-accent flex items-center justify-center text-white text-sm font-bold">
              {user?.username[0].toUpperCase()}
            </div>
          )}
          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-discord-dark ${statusDot(user?.status)}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-medium truncate">{user?.username}</div>
          <div className="text-discord-text-muted text-xs truncate">#{user?.discriminator}</div>
        </div>
        <button
          onClick={() => setShowUserSettings(true)}
          className="text-discord-text-muted hover:text-white p-1 transition-colors"
          title="User Settings"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
            <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {showServerSettings && <ServerSettingsModal onClose={() => setShowServerSettings(false)} />}
      {showCreateChannel && <CreateChannelModal onClose={() => setShowCreateChannel(false)} />}
      {showUserSettings && <UserSettingsModal onClose={() => setShowUserSettings(false)} />}
    </div>
  );
};

interface ChannelItemProps {
  channel: { id: string; name: string; type: string; topic?: string };
  isActive: boolean;
  isOwner: boolean;
  onClick: () => void;
}

const ChannelItem: React.FC<ChannelItemProps> = ({ channel, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-2 px-3 py-1.5 mx-2 rounded text-sm transition-colors group
      ${isActive
        ? 'bg-discord-lighter text-white'
        : 'text-discord-text-muted hover:bg-discord-lighter/50 hover:text-discord-text-dim'
      }`}
    style={{ width: 'calc(100% - 16px)' }}
  >
    {channel.type === 'voice' ? (
      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 3a9 9 0 00-9 9 9 9 0 009 9 9 9 0 009-9 9 9 0 00-9-9zm-1 4h2v7h-2V7zm0 9h2v2h-2v-2z" />
      </svg>
    ) : (
      <span className="font-bold text-base leading-none flex-shrink-0">#</span>
    )}
    <span className="truncate">{channel.name}</span>
  </button>
);

export default ChannelSidebar;
