import React from 'react';
import useStore from '../store/useStore';

interface Props {
  showMembers: boolean;
  onToggleMembers: () => void;
}

const TopBar: React.FC<Props> = ({ showMembers, onToggleMembers }) => {
  const { activeServer, activeChannel, activeDM } = useStore();

  return (
    <div
      className="h-14 flex items-center px-5 gap-4 z-20 flex-shrink-0"
      style={{
        background: 'rgba(4, 2, 1, 0.88)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255, 107, 53, 0.12)',
      }}
    >
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #ff6b35, #ff2d55)',
            boxShadow: '0 4px 16px rgba(255, 107, 53, 0.45)',
          }}
        >
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>
        <span className="font-extrabold text-base tracking-tight hidden sm:block nexus-gradient-text">NEXUS</span>
      </div>

      {(activeServer || activeDM) && (
        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="text-discord-text-muted select-none">/</span>
          {activeServer && (
            <span className="text-white font-semibold truncate max-w-[140px]">{activeServer.name}</span>
          )}
          {activeChannel && (
            <>
              <span className="text-discord-text-muted select-none">/</span>
              <span className="font-medium truncate max-w-[120px]" style={{ color: '#ff8c42' }}>
                #{activeChannel.name}
              </span>
            </>
          )}
          {activeDM && (
            <>
              <span className="text-discord-text-muted select-none">/</span>
              <span className="font-medium truncate max-w-[120px]" style={{ color: '#ff8c42' }}>
                @{activeDM.username}
              </span>
            </>
          )}
        </div>
      )}

      <div className="flex-1" />

      {activeServer && (
        <button
          onClick={onToggleMembers}
          className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200"
          style={
            showMembers
              ? { background: 'rgba(255,107,53,0.18)', color: '#ff8c42', border: '1px solid rgba(255,107,53,0.35)' }
              : { background: 'rgba(255,255,255,0.05)', color: 'rgba(240,226,222,0.45)', border: '1px solid rgba(255,255,255,0.07)' }
          }
          title="Toggle Members"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
          </svg>
          <span>Members</span>
        </button>
      )}
    </div>
  );
};

export default TopBar;
