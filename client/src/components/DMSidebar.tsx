import React, { useState } from 'react';
import useStore from '../store/useStore';
import UserSettingsModal from './modals/UserSettingsModal';
import api from '../utils/api';

const statusColor = (status?: string) => {
  if (status === 'online') return 'bg-discord-green';
  if (status === 'idle') return 'bg-discord-yellow';
  if (status === 'dnd') return 'bg-discord-red';
  return 'bg-gray-500';
};

const DMSidebar = () => {
  const { dms, activeDM, setActiveDM, setActiveServer, user, markDMRead } = useStore();
  const [search, setSearch] = useState('');
  const [showUserSettings, setShowUserSettings] = useState(false);

  const filtered = dms.filter(dm =>
    !search || (dm.username || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-60 bg-discord-gray flex flex-col flex-shrink-0">
      <div className="px-3 py-2 border-b border-discord-darker shadow-sm">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Find or start a conversation"
          className="w-full bg-discord-darker text-discord-text text-sm rounded px-3 py-1.5 focus:outline-none placeholder-discord-text-muted"
        />
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-2">
          <button
            onClick={() => { setActiveDM(null); setActiveServer(null); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors mb-1
              ${!activeDM ? 'bg-discord-lighter text-white' : 'text-discord-text-muted hover:bg-discord-lighter/50 hover:text-discord-text'}`}
          >
            <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
            </svg>
            <span className="font-medium">Friends</span>
          </button>
        </div>

        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
          <span className="text-discord-text-muted text-xs font-bold uppercase tracking-wide">
            Direct Messages
          </span>
          <button
            className="text-discord-text-muted hover:text-discord-text transition-colors text-lg leading-none"
            title="New Direct Message"
          >
            +
          </button>
        </div>

        {filtered.map(dm => {
          const unread = Number(dm.unread_count || 0);
          const handleOpen = () => {
            setActiveDM(dm);
            if (unread > 0) {
              markDMRead(dm.id);
              api.post(`/dms/${dm.id}/read`).catch(() => {});
            }
          };
          return (
            <div key={dm.id} className="px-2">
              <button
                onClick={handleOpen}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors group
                  ${activeDM?.id === dm.id ? 'bg-discord-lighter text-white' : unread > 0 ? 'text-white hover:bg-discord-lighter/50' : 'text-discord-text-muted hover:bg-discord-lighter/50 hover:text-discord-text'}`}
              >
                <div className="relative flex-shrink-0">
                  {dm.avatar ? (
                    <img src={dm.avatar} alt={dm.username} className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-discord-accent flex items-center justify-center text-white text-xs font-bold">
                      {(dm.username || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-discord-gray ${statusColor(dm.status)}`} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className={`truncate ${unread > 0 ? 'font-bold' : 'font-medium'}`}>{dm.username}</div>
                  {dm.last_message && (
                    <div className={`text-xs truncate ${unread > 0 ? 'text-discord-text font-medium' : 'text-discord-text-muted'}`}>{dm.last_message}</div>
                  )}
                </div>
                {unread > 0 && (
                  <div className="flex-shrink-0 min-w-[18px] h-[18px] bg-discord-red rounded-full flex items-center justify-center text-white text-xs font-bold px-1">
                    {unread > 99 ? '99+' : unread}
                  </div>
                )}
                <button
                  onClick={e => { e.stopPropagation(); }}
                  className="opacity-0 group-hover:opacity-100 text-discord-text-muted hover:text-white transition-opacity text-xs"
                  title="Close DM"
                >
                  ✕
                </button>
              </button>
            </div>
          );
        })}
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
          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-discord-dark ${statusColor(user?.status)}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-medium truncate">{user?.username}</div>
          <div className="text-discord-text-muted text-xs">#{user?.discriminator}</div>
        </div>
        <button
          onClick={() => setShowUserSettings(true)}
          className="text-discord-text-muted hover:text-white p-1 transition-colors"
          title="User Settings"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {showUserSettings && <UserSettingsModal onClose={() => setShowUserSettings(false)} />}
    </div>
  );
};

export default DMSidebar;
