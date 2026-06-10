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
  const { activeServer, activeChannel, setActiveChannel, updateServer, user, voiceChannelId, voiceParticipants } = useStore();
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
    <div className="w-60 nexus-glass flex flex-col flex-shrink-0">
      <button
        className="h-12 flex items-center justify-between px-4 shadow-sm hover:bg-discord-lighter/30 transition-colors w-full text-left"
        style={{ borderBottom: '1px solid rgba(255,107,53,0.1)' }}
        onClick={() => setShowServerSettings(true)}
      >
        <span className="text-white font-bold text-sm truncate">{activeServer.name}</span>
        <svg className="w-4 h-4 text-discord-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div className="flex-1 overflow-y-auto py-2">
        {uncategorized.map(channel => (
          <React.Fragment key={channel.id}>
            <ChannelItem
              channel={channel}
              isActive={activeChannel?.id === channel.id}
              isOwner={isOwner}
              inVoice={voiceChannelId === channel.id}
              onClick={() => setActiveChannel(channel)}
            />
            {channel.type === 'voice' && (voiceParticipants[channel.id] || []).map(p => (
              <VoiceParticipantRow key={p.id} participant={p} />
            ))}
          </React.Fragment>
        ))}

        {categories.map(cat => (
          <div key={cat.id} className="mt-2">
            <div
              className="flex items-center justify-between px-3 py-1 group cursor-pointer"
              onClick={() => setCollapsed(c => ({ ...c, [cat.id]: !c[cat.id] }))}
            >
              <span className="nexus-category-header font-bold uppercase flex items-center gap-1">
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
                <React.Fragment key={channel.id}>
                  <ChannelItem
                    channel={channel}
                    isActive={activeChannel?.id === channel.id}
                    isOwner={isOwner}
                    inVoice={voiceChannelId === channel.id}
                    onClick={() => setActiveChannel(channel)}
                  />
                  {channel.type === 'voice' && (voiceParticipants[channel.id] || []).map(p => (
                    <VoiceParticipantRow key={p.id} participant={p} />
                  ))}
                </React.Fragment>
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

      <div className="h-14 nexus-user-bar flex items-center px-2 gap-2 flex-shrink-0">
        <div className="relative flex-shrink-0">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.username} className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, #ff6b35, #ff2d55)' }}>
              {user?.username[0].toUpperCase()}
            </div>
          )}
          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-discord-darkest ${statusDot(user?.status)}`} />
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
  inVoice?: boolean;
  onClick: () => void;
}

const ChannelItem: React.FC<ChannelItemProps> = ({ channel, isActive, inVoice, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-2 px-3 py-1.5 mx-2 rounded-lg text-sm transition-all duration-150 group
      ${isActive
        ? 'nexus-active-channel'
        : 'text-discord-text-muted hover:bg-discord-lighter/20 hover:text-discord-text-dim'
      }`}
    style={{ width: 'calc(100% - 16px)' }}
  >
    {channel.type === 'voice' ? (
      <svg className={`w-4 h-4 flex-shrink-0 ${inVoice ? 'text-discord-green' : ''}`} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
      </svg>
    ) : (
      <span className="font-bold text-base leading-none flex-shrink-0">#</span>
    )}
    <span className="truncate">{channel.name}</span>
    {inVoice && (
      <span className="ml-auto text-discord-green">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
        </svg>
      </span>
    )}
  </button>
);

const VoiceParticipantRow: React.FC<{ participant: { id: string; username: string; avatar?: string } }> = ({ participant }) => (
  <div className="flex items-center gap-2 pl-8 pr-3 py-0.5 ml-2 text-xs text-discord-text-muted">
    {participant.avatar ? (
      <img src={participant.avatar} alt={participant.username} className="w-5 h-5 rounded-full flex-shrink-0" />
    ) : (
      <div className="w-5 h-5 rounded-full bg-discord-accent flex items-center justify-center text-white text-xs flex-shrink-0">
        {participant.username[0].toUpperCase()}
      </div>
    )}
    <span className="truncate">{participant.username}</span>
    <svg className="w-3 h-3 ml-auto text-discord-green flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
    </svg>
  </div>
);

export default ChannelSidebar;
