import React, { useState, useRef, useEffect } from 'react';
import useStore from '../store/useStore';
import CreateServerModal from './modals/CreateServerModal';
import JoinServerModal from './modals/JoinServerModal';
import UserSettingsModal from './modals/UserSettingsModal';

const statusDot = (status?: string) => {
  if (status === 'online') return '#22c55e';
  if (status === 'idle') return '#f59e0b';
  if (status === 'dnd') return '#ff3b55';
  return '#4a3636';
};

interface ServerPillProps {
  label: string;
  icon?: string;
  initials: string;
  active: boolean;
  unread?: number;
  onClick: () => void;
}

const ServerPill: React.FC<ServerPillProps> = ({ label, icon, initials, active, unread, onClick }) => (
  <button
    onClick={onClick}
    title={label}
    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex-shrink-0 relative"
    style={{
      background: active
        ? 'linear-gradient(135deg, #ff6b35, #ff2d55)'
        : 'rgba(255,255,255,0.06)',
      color: active ? '#fff' : 'rgba(240,226,222,0.55)',
      border: active ? 'none' : '1px solid rgba(255,107,53,0.13)',
      boxShadow: active ? '0 2px 14px rgba(255,107,53,0.38)' : 'none',
    }}
  >
    {icon ? (
      <img src={icon} alt={label} className="w-4 h-4 rounded-full flex-shrink-0" />
    ) : (
      <span
        className="w-4 h-4 rounded-full flex items-center justify-center text-white font-extrabold flex-shrink-0"
        style={{ background: active ? 'rgba(255,255,255,0.25)' : 'rgba(255,107,53,0.3)', fontSize: '8px' }}
      >
        {initials}
      </span>
    )}
    <span className="truncate max-w-[90px]">{label}</span>
    {!active && unread && unread > 0 ? (
      <span
        className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 rounded-full flex items-center justify-center text-white font-bold"
        style={{ background: '#ff3b55', fontSize: '8px', padding: '0 3px' }}
      >
        {unread > 9 ? '9+' : unread}
      </span>
    ) : null}
  </button>
);

const TopBar: React.FC = () => {
  const { servers, activeServer, setActiveServer, setActiveChannel, setActiveDM, user, dms } = useStore();

  const [showCreateServer, setShowCreateServer] = useState(false);
  const [showJoinServer, setShowJoinServer] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showAddMenu) return;
    const h = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) setShowAddMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showAddMenu]);

  const totalDMUnread = dms.reduce((s, d) => s + Number(d.unread_count || 0), 0);
  const isHome = !activeServer;

  return (
    <>
      <div
        className="h-13 flex items-center px-4 gap-3 flex-shrink-0 z-30"
        style={{
          height: 52,
          background: 'rgba(4, 1, 1, 0.94)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderBottom: '1px solid rgba(255,107,53,0.1)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 flex-shrink-0 mr-2">
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #ff6b35, #ff2d55)',
              boxShadow: '0 3px 14px rgba(255,107,53,0.45)',
            }}
          >
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span className="font-extrabold text-sm tracking-tight nexus-gradient-text hidden md:block">NEXUS</span>
        </div>

        <div className="w-px h-5 flex-shrink-0" style={{ background: 'rgba(255,107,53,0.15)' }} />

        {/* Server pills — horizontally scrollable */}
        <div className="flex items-center gap-2 overflow-x-auto flex-1 min-w-0 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
          {/* Home pill */}
          <ServerPill
            label="Home"
            initials="H"
            active={isHome}
            unread={isHome ? 0 : totalDMUnread}
            onClick={() => { setActiveServer(null); setActiveChannel(null); }}
          />

          {servers.map(server => (
            <ServerPill
              key={server.id}
              label={server.name}
              icon={server.icon}
              initials={server.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
              active={activeServer?.id === server.id}
              onClick={() => { setActiveServer(server); setActiveDM(null); }}
            />
          ))}
        </div>

        {/* Add server */}
        <div className="relative flex-shrink-0" ref={addMenuRef}>
          <button
            onClick={() => setShowAddMenu(v => !v)}
            className="h-7 w-7 rounded-full flex items-center justify-center text-base font-bold transition-all duration-200"
            style={{
              background: showAddMenu ? 'rgba(255,107,53,0.22)' : 'rgba(255,107,53,0.1)',
              color: '#ff6b35',
              border: '1px dashed rgba(255,107,53,0.4)',
            }}
            title="Add or join server"
          >
            +
          </button>
          {showAddMenu && (
            <div
              className="absolute right-0 top-10 z-50 rounded-xl py-1.5 min-w-[165px] shadow-2xl"
              style={{ background: 'rgba(12,5,4,0.98)', border: '1px solid rgba(255,107,53,0.18)' }}
            >
              <button
                onClick={() => { setShowCreateServer(true); setShowAddMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                style={{ color: 'rgba(240,226,222,0.8)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,107,53,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#ff6b35' }}>
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </svg>
                Create Server
              </button>
              <button
                onClick={() => { setShowJoinServer(true); setShowAddMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                style={{ color: 'rgba(240,226,222,0.8)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,107,53,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: '#ff6b35' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Join with Invite
              </button>
            </div>
          )}
        </div>

        <div className="w-px h-5 flex-shrink-0" style={{ background: 'rgba(255,107,53,0.12)' }} />

        {/* User avatar + settings */}
        <button
          onClick={() => setShowUserSettings(true)}
          className="flex items-center gap-2 rounded-xl px-2 py-1 transition-all duration-150 flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.04)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,107,53,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
          title="Settings"
        >
          <div className="relative">
            {user?.avatar
              ? <img src={user.avatar} alt={user.username} className="w-7 h-7 rounded-full object-cover" />
              : <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs"
                  style={{ background: 'linear-gradient(135deg, #ff6b35, #ff2d55)' }}
                >
                  {user?.username[0].toUpperCase()}
                </div>
            }
            <div
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
              style={{ backgroundColor: statusDot(user?.status), borderColor: 'rgba(4,1,1,0.95)' }}
            />
          </div>
          <span className="text-xs font-semibold hidden md:block max-w-[80px] truncate" style={{ color: 'rgba(240,226,222,0.8)' }}>
            {user?.username}
          </span>
          <svg className="w-3 h-3 flex-shrink-0 hidden md:block" fill="currentColor" viewBox="0 0 24 24" style={{ color: 'rgba(255,107,53,0.5)' }}>
            <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {showCreateServer && <CreateServerModal onClose={() => setShowCreateServer(false)} />}
      {showJoinServer && <JoinServerModal onClose={() => setShowJoinServer(false)} />}
      {showUserSettings && <UserSettingsModal onClose={() => setShowUserSettings(false)} />}
    </>
  );
};

export default TopBar;
