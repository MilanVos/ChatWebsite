import React from 'react';
import useStore from '../store/useStore';

const statusColor = (status: string) => {
  if (status === 'online') return 'bg-discord-green';
  if (status === 'idle') return 'bg-discord-yellow';
  if (status === 'dnd') return 'bg-discord-red';
  return 'bg-gray-500';
};

interface MemberItemProps {
  member: {
    id: string;
    username: string;
    avatar?: string;
    nickname?: string;
    role_name?: string;
    role_color?: string;
    custom_status?: string;
  };
  status: string;
}

const MemberItem: React.FC<MemberItemProps> = ({ member, status }) => (
  <div className="flex items-center gap-3 px-3 py-1.5 rounded mx-2 hover:bg-discord-lighter cursor-pointer">
    <div className="relative flex-shrink-0">
      {member.avatar ? (
        <img src={member.avatar} alt={member.username} className="w-8 h-8 rounded-full" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-discord-accent flex items-center justify-center text-white text-sm font-bold">
          {member.username[0].toUpperCase()}
        </div>
      )}
      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-discord-gray ${statusColor(status)}`} />
    </div>
    <div className="min-w-0">
      <div
        className={`text-sm font-medium truncate ${status === 'offline' ? 'text-discord-text-muted' : 'text-discord-text'}`}
        style={member.role_color && member.role_color !== '#000000' ? { color: member.role_color } : undefined}
      >
        {member.nickname || member.username}
      </div>
      {member.custom_status && status !== 'offline' && (
        <div className="text-discord-text-muted text-xs truncate">{member.custom_status}</div>
      )}
    </div>
  </div>
);

const MembersList = () => {
  const { activeServer, memberStatuses } = useStore();
  const members = activeServer?.members || [];

  const getStatus = (m: { id: string; status: string }) => memberStatuses[m.id] || m.status;

  const online = members.filter(m => getStatus(m) !== 'offline');
  const offline = members.filter(m => getStatus(m) === 'offline');

  const roleGroups: Record<string, typeof members> = {};
  const noRole: typeof members = [];

  online.forEach(m => {
    if (m.role_name) {
      if (!roleGroups[m.role_name]) roleGroups[m.role_name] = [];
      roleGroups[m.role_name].push(m);
    } else {
      noRole.push(m);
    }
  });

  return (
    <div className="w-60 bg-discord-gray flex-shrink-0 overflow-y-auto py-4">
      {Object.entries(roleGroups).map(([roleName, roleMembers]) => (
        <div key={roleName} className="mb-2">
          <div className="px-4 py-1 text-discord-text-muted text-xs font-bold uppercase tracking-wide">
            {roleName} — {roleMembers.length}
          </div>
          {roleMembers.map(m => (
            <MemberItem key={m.id} member={m} status={getStatus(m)} />
          ))}
        </div>
      ))}

      {noRole.length > 0 && (
        <div className="mb-2">
          <div className="px-4 py-1 text-discord-text-muted text-xs font-bold uppercase tracking-wide">
            Online — {noRole.length}
          </div>
          {noRole.map(m => (
            <MemberItem key={m.id} member={m} status={getStatus(m)} />
          ))}
        </div>
      )}

      {offline.length > 0 && (
        <div>
          <div className="px-4 py-1 text-discord-text-muted text-xs font-bold uppercase tracking-wide">
            Offline — {offline.length}
          </div>
          {offline.map(m => (
            <MemberItem key={m.id} member={m} status="offline" />
          ))}
        </div>
      )}
    </div>
  );
};

export default MembersList;
