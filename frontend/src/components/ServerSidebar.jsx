import React, { useState } from 'react';
import useStore from '../store/useStore';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { getSocket } from '../hooks/useSocket';
import CreateServerModal from './modals/CreateServerModal';
import JoinServerModal from './modals/JoinServerModal';

const StatusDot = ({ status }) => {
  const colors = {
    online: 'bg-discord-green',
    idle: 'bg-discord-yellow',
    dnd: 'bg-discord-red',
    offline: 'bg-discord-text-muted',
    invisible: 'bg-discord-text-muted'
  };
  return (
    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-discord-darker ${colors[status] || colors.offline}`} />
  );
};

const ServerIcon = ({ server, isActive, onClick }) => {
  const firstLetter = server.name.charAt(0).toUpperCase();
  return (
    <div className="relative flex items-center group mb-2" onClick={onClick}>
      <div className={`absolute left-0 w-1 bg-white rounded-r transition-all ${isActive ? 'h-10' : 'h-0 group-hover:h-5'}`} />
      <div className={`server-icon ml-3 w-12 h-12 flex items-center justify-center cursor-pointer transition-all overflow-hidden
        ${isActive ? 'rounded-2xl bg-discord-accent' : 'rounded-3xl bg-discord-gray hover:bg-discord-accent'}`}>
        {server.icon ? (
          <img src={server.icon} alt={server.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-white font-bold text-sm">{firstLetter}</span>
        )}
      </div>
      <div className="absolute left-16 bg-discord-darkest text-white text-sm px-2 py-1 rounded pointer-events-none
        opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
        {server.name}
      </div>
    </div>
  );
};

const ServerSidebar = () => {
  const { servers, activeServer, setActiveServer, user, setUser, logout } = useStore();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const handleServerClick = async (server) => {
    if (activeServer?.id === server.id) return;
    try {
      const res = await api.get(`/servers/${server.id}`);
      setActiveServer(res.data);
      const socket = getSocket();
      if (socket) socket.emit('server:join', server.id);
    } catch (err) {
      toast.error('Failed to load server');
    }
  };

  const handleStatusChange = async (status) => {
    try {
      await api.patch('/users/me', { status });
      setUser({ ...user, status });
      const socket = getSocket();
      if (socket) socket.emit('status:update', { status });
      setShowStatusMenu(false);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    localStorage.removeItem('token');
    logout();
    window.location.href = '/login';
  };

  const statuses = [
    { value: 'online', label: 'Online', color: 'bg-discord-green' },
    { value: 'idle', label: 'Idle', color: 'bg-discord-yellow' },
    { value: 'dnd', label: 'Do Not Disturb', color: 'bg-discord-red' },
    { value: 'invisible', label: 'Invisible', color: 'bg-discord-text-muted' }
  ];

  return (
    <div className="w-[72px] bg-discord-darker flex flex-col items-center py-3 overflow-y-auto overflow-x-hidden">
      <div
        className={`server-icon w-12 h-12 flex items-center justify-center cursor-pointer mb-2 transition-all
          ${!activeServer ? 'rounded-2xl bg-discord-accent' : 'rounded-3xl bg-discord-gray hover:bg-discord-accent'}`}
        onClick={() => setActiveServer(null)}
      >
        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 3c1.93 0 3.5 1.57 3.5 3.5S13.93 14 12 14s-3.5-1.57-3.5-3.5S10.07 7 12 7zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 17.18 9.64 16 12 16s4.53 1.18 6.24 2.19c.48.38.76.97.76 1.58V20z"/>
        </svg>
      </div>

      <div className="w-8 h-0.5 bg-discord-lighter rounded-full mb-2" />

      {servers.map(server => (
        <ServerIcon
          key={server.id}
          server={server}
          isActive={activeServer?.id === server.id}
          onClick={() => handleServerClick(server)}
        />
      ))}

      <div className="w-8 h-0.5 bg-discord-lighter rounded-full my-2" />

      <div
        className="server-icon w-12 h-12 flex items-center justify-center cursor-pointer rounded-3xl bg-discord-gray hover:bg-discord-green hover:rounded-2xl transition-all mb-2 group"
        onClick={() => setShowCreate(true)}
        title="Create Server"
      >
        <span className="text-discord-green group-hover:text-white text-2xl font-light">+</span>
      </div>

      <div
        className="server-icon w-12 h-12 flex items-center justify-center cursor-pointer rounded-3xl bg-discord-gray hover:bg-discord-green hover:rounded-2xl transition-all group"
        onClick={() => setShowJoin(true)}
        title="Join Server"
      >
        <svg className="w-5 h-5 text-discord-green group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </div>

      <div className="flex-1" />

      <div className="relative w-full flex flex-col items-center">
        <div
          className="relative cursor-pointer"
          onClick={() => setShowStatusMenu(!showStatusMenu)}
        >
          {user?.avatar ? (
            <img src={user.avatar} alt="" className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-discord-accent flex items-center justify-center text-white text-xs font-bold">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
          )}
          <StatusDot status={user?.status || 'offline'} />
        </div>

        {showStatusMenu && (
          <div className="absolute bottom-12 left-16 bg-discord-darkest border border-discord-lighter rounded-lg p-2 z-50 w-48 shadow-xl">
            <p className="text-xs text-discord-text-muted px-2 pb-2 font-semibold">SET STATUS</p>
            {statuses.map(s => (
              <button
                key={s.value}
                onClick={() => handleStatusChange(s.value)}
                className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded hover:bg-discord-lighter text-discord-text text-sm"
              >
                <span className={`w-3 h-3 rounded-full ${s.color}`} />
                {s.label}
              </button>
            ))}
            <div className="border-t border-discord-lighter mt-2 pt-2">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded hover:bg-discord-lighter text-discord-red text-sm"
              >
                Log Out
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreate && <CreateServerModal onClose={() => setShowCreate(false)} />}
      {showJoin && <JoinServerModal onClose={() => setShowJoin(false)} />}
    </div>
  );
};

export default ServerSidebar;
