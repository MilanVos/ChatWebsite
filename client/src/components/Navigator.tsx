import React, { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import api from '../utils/api';
import ServerSettingsModal from './modals/ServerSettingsModal';
import CreateChannelModal from './modals/CreateChannelModal';

const statusColor = (status?: string): string => {
  if (status === 'online') return '#22c55e';
  if (status === 'idle') return '#f59e0b';
  if (status === 'dnd') return '#ff3b55';
  return '#4a3636';
};

interface ChannelItemProps {
  channel: { id: string; name: string; type: string; topic?: string };
  isActive: boolean;
  inVoice?: boolean;
  voiceParticipants?: Array<{ id: string; username: string; avatar?: string }>;
  onClick: () => void;
}

const ChannelItem: React.FC<ChannelItemProps> = ({ channel, isActive, inVoice, voiceParticipants = [], onClick }) => (
  <>
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-[5px] rounded-lg text-xs font-medium transition-all duration-150
        ${isActive ? 'nexus-active-channel' : 'text-discord-text-muted hover:bg-white/5 hover:text-discord-text-dim'}`}
      style={{ marginLeft: 4, width: 'calc(100% - 8px)' }}
    >
      {channel.type === 'voice' ? (
        <svg className={`w-3.5 h-3.5 flex-shrink-0 ${inVoice ? 'text-discord-green' : ''}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
        </svg>
      ) : (
        <span className="font-bold text-sm leading-none flex-shrink-0 opacity-40">#</span>
      )}
      <span className="truncate">{channel.name}</span>
      {inVoice && <span className="ml-auto text-discord-green text-xs">●</span>}
    </button>
    {channel.type === 'voice' && voiceParticipants.map(p => (
      <div key={p.id} className="flex items-center gap-2 pl-8 pr-3 py-0.5 ml-1 text-xs" style={{ color: 'rgba(240,226,222,0.4)' }}>
        {p.avatar
          ? <img src={p.avatar} alt={p.username} className="w-4 h-4 rounded-full flex-shrink-0" />
          : <div className="w-4 h-4 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg,#ff6b35,#ff2d55)', fontSize: '8px' }}>{p.username[0].toUpperCase()}</div>
        }
        <span className="truncate">{p.username}</span>
      </div>
    ))}
  </>
);

const Navigator = () => {
  const {
    servers, activeServer, setActiveChannel, activeChannel,
    dms, activeDM, setActiveDM, markDMRead,
    user, updateServer, voiceChannelId, voiceParticipants,
  } = useStore();

  const [showServerSettings, setShowServerSettings] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!activeServer) return;
    api.get(`/servers/${activeServer.id}`).then(res => updateServer(res.data)).catch(console.error);
  }, [activeServer?.id]);

  const isOwner = user?.id === activeServer?.owner_id;
  const channels = activeServer?.channels || [];
  const categories = [...(activeServer?.categories || [])].sort((a, b) => a.position - b.position);
  const uncategorized = channels.filter(c => !c.category_id).sort((a, b) => a.position - b.position);

  return (
    <div
      className="flex flex-col flex-shrink-0 overflow-hidden"
      style={{
        width: 220,
        background: 'rgba(7, 3, 2, 0.88)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255,107,53,0.1)',
      }}
    >
      {activeServer ? (
        <>
          {/* Server name header */}
          <div
            className="h-11 flex items-center px-4 gap-2 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(255,107,53,0.1)' }}
          >
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-sm truncate">{activeServer.name}</div>
              <div className="text-[10px] truncate" style={{ color: 'rgba(255,107,53,0.55)' }}>
                {channels.length} channel{channels.length !== 1 ? 's' : ''}
              </div>
            </div>
            {isOwner && (
              <button
                onClick={() => setShowServerSettings(true)}
                className="p-1.5 rounded-lg transition-all flex-shrink-0"
                style={{ color: 'rgba(255,107,53,0.4)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,107,53,0.12)'; e.currentTarget.style.color = '#ff6b35'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,107,53,0.4)'; }}
                title="Server Settings"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>

          {/* Channels */}
          <div className="flex-1 overflow-y-auto py-2">
            {uncategorized.map(ch => (
              <ChannelItem
                key={ch.id}
                channel={ch}
                isActive={activeChannel?.id === ch.id}
                inVoice={voiceChannelId === ch.id}
                voiceParticipants={voiceParticipants[ch.id] || []}
                onClick={() => setActiveChannel(ch)}
              />
            ))}

            {categories.map(cat => (
              <div key={cat.id} className="mt-3">
                <div
                  className="flex items-center justify-between px-3 py-0.5 cursor-pointer group"
                  onClick={() => setCollapsed(c => ({ ...c, [cat.id]: !c[cat.id] }))}
                >
                  <span className="nexus-category-header font-bold uppercase flex items-center gap-1 text-[10px]">
                    <svg className={`w-2 h-2 transition-transform flex-shrink-0 ${collapsed[cat.id] ? '-rotate-90' : ''}`} fill="currentColor" viewBox="0 0 8 8">
                      <path d="M0 2l4 4 4-4z" />
                    </svg>
                    {cat.name}
                  </span>
                  {isOwner && (
                    <button
                      onClick={e => { e.stopPropagation(); setShowCreateChannel(true); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-base leading-none"
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
                      inVoice={voiceChannelId === ch.id}
                      voiceParticipants={voiceParticipants[ch.id] || []}
                      onClick={() => setActiveChannel(ch)}
                    />
                  ))
                }
              </div>
            ))}

            {isOwner && (
              <button
                onClick={() => setShowCreateChannel(true)}
                className="flex items-center gap-1.5 text-xs px-4 mt-3 py-1 w-full transition-colors"
                style={{ color: 'rgba(255,107,53,0.45)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ff6b35')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,107,53,0.45)')}
              >
                <span className="text-base leading-none">+</span>
                <span>Add Channel</span>
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Home header */}
          <div
            className="h-11 flex items-center px-4 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(255,107,53,0.1)' }}
          >
            <span className="text-white font-bold text-sm">Direct Messages</span>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {/* Friends */}
            <button
              onClick={() => setActiveDM(null)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 mb-1
                ${!activeDM ? 'nexus-active-channel' : 'text-discord-text-muted hover:bg-white/5 hover:text-discord-text'}`}
              style={{ marginLeft: 4, width: 'calc(100% - 8px)' }}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
              Friends
            </button>

            <div className="px-3 pt-2 pb-1">
              <span className="nexus-category-header font-bold uppercase text-[10px]">Conversations</span>
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
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs transition-all duration-150
                    ${activeDM?.id === dm.id
                      ? 'nexus-active-channel'
                      : unread > 0
                        ? 'text-white hover:bg-white/5'
                        : 'text-discord-text-muted hover:bg-white/5 hover:text-discord-text'}`}
                  style={{ marginLeft: 4, width: 'calc(100% - 8px)' }}
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
                      style={{ backgroundColor: statusColor(dm.status), borderColor: 'rgba(7,3,2,0.95)' }}
                    />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className={`truncate ${unread > 0 ? 'font-bold text-white' : 'font-medium'}`}>{dm.username}</div>
                    {dm.last_message && (
                      <div className="truncate" style={{ color: 'rgba(240,226,222,0.32)', fontSize: '10px' }}>{dm.last_message}</div>
                    )}
                  </div>
                  {unread > 0 && (
                    <div
                      className="min-w-[16px] h-4 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #ff6b35, #ff2d55)', fontSize: '9px', padding: '0 3px' }}
                    >
                      {unread > 9 ? '9+' : unread}
                    </div>
                  )}
                </button>
              );
            })}

            {dms.length === 0 && (
              <div className="px-4 py-6 text-center">
                <p className="text-xs" style={{ color: 'rgba(240,226,222,0.25)' }}>No conversations yet</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,107,53,0.4)' }}>Go to Friends to start one</p>
              </div>
            )}
          </div>
        </>
      )}

      {showServerSettings && <ServerSettingsModal onClose={() => setShowServerSettings(false)} />}
      {showCreateChannel && <CreateChannelModal onClose={() => setShowCreateChannel(false)} />}
    </div>
  );
};

export default Navigator;
