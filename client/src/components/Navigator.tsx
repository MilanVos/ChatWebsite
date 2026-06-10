import React, { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import api from '../utils/api';
import CreateServerModal from './modals/CreateServerModal';
import JoinServerModal from './modals/JoinServerModal';
import ServerSettingsModal from './modals/ServerSettingsModal';
import CreateChannelModal from './modals/CreateChannelModal';
import UserSettingsModal from './modals/UserSettingsModal';

const statusColor = (status?: string): string => {
  if (status === 'online') return '#22c55e';
  if (status === 'idle') return '#f59e0b';
  if (status === 'dnd') return '#ff3b55';
  return '#4a3636';
};

interface ServerChipProps {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const ServerChip: React.FC<ServerChipProps> = ({ label, active, onClick, children }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="relative group" title={label}>
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="w-9 h-9 flex items-center justify-center overflow-hidden transition-all duration-200 text-sm font-bold"
        style={{
          borderRadius: active || hovered ? '12px' : '50%',
          background: active
            ? 'linear-gradient(135deg, #ff6b35, #ff2d55)'
            : hovered
              ? 'rgba(255, 107, 53, 0.2)'
              : 'rgba(255, 255, 255, 0.07)',
          border: active
            ? 'none'
            : '1px solid rgba(255, 107, 53, 0.18)',
          color: active ? 'white' : '#f0e2de',
          boxShadow: active ? '0 2px 14px rgba(255, 107, 53, 0.45)' : 'none',
        }}
      >
        {children}
      </button>
    </div>
  );
};

interface ChannelItemProps {
  channel: { id: string; name: string; type: string; topic?: string };
  isActive: boolean;
  isOwner: boolean;
  inVoice?: boolean;
  voiceParticipants?: Array<{ id: string; username: string; avatar?: string }>;
  onClick: () => void;
}

const ChannelItem: React.FC<ChannelItemProps> = ({ channel, isActive, inVoice, voiceParticipants = [], onClick }) => (
  <>
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-150
        ${isActive ? 'nexus-active-channel' : 'text-discord-text-muted hover:bg-discord-lighter/20 hover:text-discord-text-dim'}`}
      style={{ width: 'calc(100% - 12px)', marginLeft: '6px' }}
    >
      {channel.type === 'voice' ? (
        <svg className={`w-4 h-4 flex-shrink-0 ${inVoice ? 'text-discord-green' : ''}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
        </svg>
      ) : (
        <span className="font-bold text-base leading-none flex-shrink-0 opacity-60">#</span>
      )}
      <span className="truncate">{channel.name}</span>
      {inVoice && (
        <span className="ml-auto text-discord-green text-xs">●</span>
      )}
    </button>
    {channel.type === 'voice' && voiceParticipants.map(p => (
      <div key={p.id} className="flex items-center gap-2 pl-9 pr-3 py-0.5 ml-1.5 text-xs text-discord-text-muted">
        {p.avatar
          ? <img src={p.avatar} alt={p.username} className="w-4 h-4 rounded-full flex-shrink-0" />
          : <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0" style={{ background: 'linear-gradient(135deg,#ff6b35,#ff2d55)', fontSize: '8px' }}>{p.username[0].toUpperCase()}</div>
        }
        <span className="truncate">{p.username}</span>
      </div>
    ))}
  </>
);

const Navigator = () => {
  const {
    servers, activeServer, setActiveServer, setActiveChannel,
    activeChannel, dms, activeDM, setActiveDM, markDMRead,
    user, updateServer, voiceChannelId, voiceParticipants,
  } = useStore();

  const [showCreateServer, setShowCreateServer] = useState(false);
  const [showJoinServer, setShowJoinServer] = useState(false);
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showServerMenu, setShowServerMenu] = useState(false);

  useEffect(() => {
    if (!activeServer) return;
    api.get(`/servers/${activeServer.id}`).then(res => updateServer(res.data)).catch(console.error);
  }, [activeServer?.id]);

  const isOwner = user?.id === activeServer?.owner_id;
  const channels = activeServer?.channels || [];
  const categories = [...(activeServer?.categories || [])].sort((a, b) => a.position - b.position);
  const uncategorized = channels.filter(c => !c.category_id).sort((a, b) => a.position - b.position);

  return (
    <div className="w-72 nexus-glass flex flex-col flex-shrink-0">
      <div className="p-3" style={{ borderBottom: '1px solid rgba(255, 107, 53, 0.1)' }}>
        <div className="flex flex-wrap gap-1.5 items-center">
          <ServerChip
            label="Home & DMs"
            active={!activeServer}
            onClick={() => { setActiveServer(null); setActiveChannel(null); }}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
          </ServerChip>

          {servers.map(server => (
            <ServerChip
              key={server.id}
              label={server.name}
              active={activeServer?.id === server.id}
              onClick={() => setActiveServer(server)}
            >
              {server.icon
                ? <img src={server.icon} alt={server.name} className="w-full h-full object-cover" />
                : <span className="text-xs">{server.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}</span>
              }
            </ServerChip>
          ))}

          <div className="relative">
            <button
              onClick={() => setShowServerMenu(v => !v)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-xl transition-all hover:rounded-xl"
              style={{ background: 'rgba(255,107,53,0.12)', color: '#ff6b35', border: '1px dashed rgba(255,107,53,0.35)' }}
              title="Add or Join Server"
            >
              +
            </button>
            {showServerMenu && (
              <div className="absolute top-11 left-0 z-50 rounded-xl py-1.5 min-w-[160px] nexus-glass-panel shadow-2xl"
                onMouseLeave={() => setShowServerMenu(false)}>
                <button onClick={() => { setShowCreateServer(true); setShowServerMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-discord-text hover:bg-discord-lighter/30 transition-colors">
                  <span>🏗️</span><span>Create Server</span>
                </button>
                <button onClick={() => { setShowJoinServer(true); setShowServerMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-discord-text hover:bg-discord-lighter/30 transition-colors">
                  <span>🔗</span><span>Join with Invite</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {activeServer ? (
          <>
            <div className="px-4 mb-2 flex items-center justify-between">
              <span className="text-white font-semibold text-sm truncate">{activeServer.name}</span>
              {isOwner && (
                <button
                  onClick={() => setShowServerSettings(true)}
                  className="transition-colors text-xs p-1 rounded-lg hover:bg-discord-lighter/30"
                  style={{ color: 'rgba(255,107,53,0.6)' }}
                  title="Server Settings"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>

            {uncategorized.map(ch => (
              <ChannelItem
                key={ch.id}
                channel={ch}
                isActive={activeChannel?.id === ch.id}
                isOwner={isOwner}
                inVoice={voiceChannelId === ch.id}
                voiceParticipants={voiceParticipants[ch.id] || []}
                onClick={() => setActiveChannel(ch)}
              />
            ))}

            {categories.map(cat => (
              <div key={cat.id} className="mt-1">
                <div
                  className="flex items-center justify-between px-3 py-0.5 group cursor-pointer"
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
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-lg leading-none"
                      style={{ color: 'rgba(255,107,53,0.7)' }}
                    >
                      +
                    </button>
                  )}
                </div>
                {!collapsed[cat.id] && channels
                  .filter(c => c.category_id === cat.id)
                  .sort((a, b) => a.position - b.position)
                  .map(ch => (
                    <ChannelItem
                      key={ch.id}
                      channel={ch}
                      isActive={activeChannel?.id === ch.id}
                      isOwner={isOwner}
                      inVoice={voiceChannelId === ch.id}
                      voiceParticipants={voiceParticipants[ch.id] || []}
                      onClick={() => setActiveChannel(ch)}
                    />
                  ))}
              </div>
            ))}

            {isOwner && (
              <button
                onClick={() => setShowCreateChannel(true)}
                className="flex items-center gap-1.5 text-xs px-4 mt-2 py-1 transition-colors"
                style={{ color: 'rgba(255,107,53,0.55)' }}
              >
                <span className="text-base leading-none">+</span>
                <span>Add Channel</span>
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={() => { setActiveDM(null); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 mb-1
                ${!activeDM ? 'nexus-active-channel' : 'text-discord-text-muted hover:bg-discord-lighter/20 hover:text-discord-text'}`}
              style={{ width: 'calc(100% - 12px)', marginLeft: '6px' }}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
              <span className="font-medium">Friends</span>
            </button>

            <div className="px-4 pt-3 pb-1">
              <span className="nexus-category-header font-bold uppercase">Direct Messages</span>
            </div>

            {dms.map(dm => {
              const unread = Number(dm.unread_count || 0);
              return (
                <button
                  key={dm.id}
                  onClick={() => {
                    setActiveDM(dm);
                    if (unread > 0) {
                      markDMRead(dm.id);
                      api.post(`/dms/${dm.id}/read`).catch(() => {});
                    }
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-150
                    ${activeDM?.id === dm.id ? 'nexus-active-channel' : unread > 0 ? 'text-white hover:bg-discord-lighter/20' : 'text-discord-text-muted hover:bg-discord-lighter/20 hover:text-discord-text'}`}
                  style={{ width: 'calc(100% - 12px)', marginLeft: '6px' }}
                >
                  <div className="relative flex-shrink-0">
                    {dm.avatar
                      ? <img src={dm.avatar} alt={dm.username} className="w-7 h-7 rounded-full" />
                      : <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: 'linear-gradient(135deg, #ff6b35, #ff2d55)' }}>
                          {(dm.username || '?')[0].toUpperCase()}
                        </div>
                    }
                    <div
                      className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
                      style={{ backgroundColor: statusColor(dm.status), borderColor: 'rgba(10,4,3,0.8)' }}
                    />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className={`text-xs truncate ${unread > 0 ? 'font-bold text-white' : 'font-medium'}`}>{dm.username}</div>
                    {dm.last_message && (
                      <div className="text-xs truncate" style={{ color: 'rgba(240,226,222,0.4)' }}>{dm.last_message}</div>
                    )}
                  </div>
                  {unread > 0 && (
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #ff6b35, #ff2d55)', minWidth: '16px', fontSize: '9px' }}
                    >
                      {unread > 9 ? '9+' : unread}
                    </div>
                  )}
                </button>
              );
            })}
          </>
        )}
      </div>

      <div className="nexus-user-bar flex items-center px-3 py-2 gap-2">
        <button
          onClick={() => setShowUserSettings(true)}
          className="flex items-center gap-2 flex-1 min-w-0 rounded-xl p-1.5 hover:bg-discord-lighter/20 transition-colors text-left"
        >
          <div className="relative flex-shrink-0">
            {user?.avatar
              ? <img src={user.avatar} alt={user.username} className="w-8 h-8 rounded-full" />
              : <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg, #ff6b35, #ff2d55)' }}>
                  {user?.username[0].toUpperCase()}
                </div>
            }
            <div
              className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
              style={{ backgroundColor: statusColor(user?.status), borderColor: 'rgba(5,2,2,0.9)' }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white text-xs font-semibold truncate">{user?.username}</div>
            <div className="text-xs truncate" style={{ color: 'rgba(240,226,222,0.38)' }}>#{user?.discriminator}</div>
          </div>
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" style={{ color: 'rgba(240,226,222,0.3)' }}>
            <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {showCreateServer && <CreateServerModal onClose={() => setShowCreateServer(false)} />}
      {showJoinServer && <JoinServerModal onClose={() => setShowJoinServer(false)} />}
      {showServerSettings && <ServerSettingsModal onClose={() => setShowServerSettings(false)} />}
      {showCreateChannel && <CreateChannelModal onClose={() => setShowCreateChannel(false)} />}
      {showUserSettings && <UserSettingsModal onClose={() => setShowUserSettings(false)} />}
    </div>
  );
};

export default Navigator;
