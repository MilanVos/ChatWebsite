import React from 'react';
import useStore from '../store/useStore';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

const statusColors = {
  online: 'bg-discord-green',
  idle: 'bg-discord-yellow',
  dnd: 'bg-discord-red',
  offline: 'bg-discord-text-muted',
  invisible: 'bg-discord-text-muted'
};

const MemberItem = ({ member }) => {
  const { memberStatuses } = useStore();
  const status = memberStatuses[member.id] || member.status || 'offline';
  const isOffline = status === 'offline' || status === 'invisible';

  return (
    <div className="flex items-center gap-3 px-2 py-1 rounded hover:bg-discord-lighter cursor-pointer group transition-colors">
      <div className="relative flex-shrink-0">
        {member.avatar ? (
          <img src={`${BACKEND_URL}${member.avatar}`} alt="" className={`w-8 h-8 rounded-full ${isOffline ? 'opacity-40' : ''}`} />
        ) : (
          <div className={`w-8 h-8 rounded-full bg-discord-accent flex items-center justify-center text-white text-xs font-bold ${isOffline ? 'opacity-40' : ''}`}>
            {member.username?.charAt(0).toUpperCase()}
          </div>
        )}
        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-discord-gray ${statusColors[status] || statusColors.offline}`} />
      </div>
      <div className="min-w-0">
        <p className={`text-sm font-medium truncate ${isOffline ? 'text-discord-text-muted' : 'text-discord-text group-hover:text-white'}`}
          style={member.role_color && !isOffline ? { color: member.role_color } : {}}>
          {member.nickname || member.username}
        </p>
        {member.custom_status && (
          <p className="text-xs text-discord-text-muted truncate">{member.custom_status}</p>
        )}
      </div>
    </div>
  );
};

const MembersList = () => {
  const { activeServer, memberStatuses } = useStore();
  const members = activeServer?.members || [];

  const getStatus = (member) => memberStatuses[member.id] || member.status || 'offline';

  const online = members.filter(m => ['online', 'idle', 'dnd'].includes(getStatus(m)));
  const offline = members.filter(m => ['offline', 'invisible'].includes(getStatus(m)));

  return (
    <div className="w-60 bg-discord-gray flex-shrink-0 overflow-y-auto py-4">
      {online.length > 0 && (
        <div>
          <p className="text-xs font-bold text-discord-text-muted uppercase tracking-wide px-4 mb-1">
            Online — {online.length}
          </p>
          {online.map(m => <MemberItem key={m.id} member={m} />)}
        </div>
      )}

      {offline.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-bold text-discord-text-muted uppercase tracking-wide px-4 mb-1">
            Offline — {offline.length}
          </p>
          {offline.map(m => <MemberItem key={m.id} member={m} />)}
        </div>
      )}
    </div>
  );
};

export default MembersList;
