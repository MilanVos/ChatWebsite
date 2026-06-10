import React, { useState } from 'react';
import useStore from '../store/useStore';
import CreateServerModal from './modals/CreateServerModal';
import JoinServerModal from './modals/JoinServerModal';
import UserSettingsModal from './modals/UserSettingsModal';

interface TooltipButtonProps {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  colorClass?: string;
}

const TooltipButton: React.FC<TooltipButtonProps> = ({ label, onClick, active, children, colorClass }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="relative flex items-center mb-2 group">
      {active && (
        <div className="absolute -left-3 w-1 h-10 rounded-r-full nexus-server-active-bar" />
      )}
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`w-12 h-12 flex items-center justify-center transition-all duration-200 overflow-hidden
          ${active
            ? `rounded-[16px] nexus-server-icon-active ${colorClass || ''}`
            : `rounded-[24px] bg-discord-dark hover:rounded-[16px] ${colorClass ? colorClass + ' hover:text-white' : 'hover:bg-discord-accent'}`
          }`}
      >
        {children}
      </button>
      {hovered && (
        <div className="absolute left-16 bg-discord-darkest text-white text-sm font-semibold rounded-lg px-3 py-1.5 whitespace-nowrap z-50 shadow-xl pointer-events-none"
          style={{ border: '1px solid rgba(255,107,53,0.2)' }}>
          {label}
          <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-discord-darkest" />
        </div>
      )}
    </div>
  );
};

const ServerSidebar = () => {
  const { servers, activeServer, setActiveServer, setActiveChannel, user, logout } = useStore();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);

  return (
    <div className="w-[72px] nexus-glass flex flex-col items-center pt-3 pb-2 overflow-y-auto flex-shrink-0 scrollbar-none">
      <TooltipButton
        label="Direct Messages"
        onClick={() => { setActiveServer(null); setActiveChannel(null); }}
        active={!activeServer}
        colorClass="hover:bg-discord-accent"
      >
        <span className="text-xl">🏠</span>
      </TooltipButton>

      <div className="w-8 h-px rounded-full mb-2" style={{ background: 'rgba(255,107,53,0.25)' }} />

      {servers.map(server => (
        <TooltipButton
          key={server.id}
          label={server.name}
          onClick={() => setActiveServer(server)}
          active={activeServer?.id === server.id}
        >
          {server.icon ? (
            <img src={server.icon} alt={server.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white text-sm font-bold select-none">
              {server.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
            </span>
          )}
        </TooltipButton>
      ))}

      <div className="w-8 h-px rounded-full my-1" style={{ background: 'rgba(255,107,53,0.25)' }} />

      <TooltipButton
        label="Add a Server"
        onClick={() => setShowCreate(true)}
        colorClass="text-discord-green hover:bg-discord-green"
      >
        <span className="text-2xl font-light leading-none">+</span>
      </TooltipButton>

      <TooltipButton
        label="Join a Server"
        onClick={() => setShowJoin(true)}
        colorClass="text-discord-green hover:bg-discord-green"
      >
        <span className="text-lg">🔗</span>
      </TooltipButton>

      <div className="flex-1" />

      {user && (
        <div className="relative group">
          <button
            onClick={() => setShowUserSettings(true)}
            className="w-12 h-12 rounded-full overflow-hidden hover:ring-2 hover:ring-discord-accent transition-all"
          >
            {user.avatar ? (
              <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-discord-accent flex items-center justify-center text-white font-bold text-lg">
                {user.username[0].toUpperCase()}
              </div>
            )}
          </button>
          <div
            className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-discord-darker
            ${user.status === 'online' ? 'bg-discord-green' : user.status === 'idle' ? 'bg-discord-yellow' : user.status === 'dnd' ? 'bg-discord-red' : 'bg-gray-500'}`}
          />
        </div>
      )}

      {showCreate && <CreateServerModal onClose={() => setShowCreate(false)} />}
      {showJoin && <JoinServerModal onClose={() => setShowJoin(false)} />}
      {showUserSettings && <UserSettingsModal onClose={() => setShowUserSettings(false)} />}
    </div>
  );
};

export default ServerSidebar;
