import React, { useState, useRef, useEffect } from 'react';
import useStore from '../store/useStore';
import UserBadges from './UserBadges';
import UserProfileModal from './modals/UserProfileModal';
import api from '../utils/api';
import toast from 'react-hot-toast';

const statusColor = (status: string) => {
  if (status === 'online') return 'bg-discord-green';
  if (status === 'idle') return 'bg-discord-yellow';
  if (status === 'dnd') return 'bg-discord-red';
  return 'bg-gray-500';
};

interface Role { id: string; name: string; color: string; }

interface MemberItemProps {
  member: {
    id: string;
    username: string;
    avatar?: string;
    nickname?: string;
    role_id?: string;
    role_name?: string;
    role_color?: string;
    custom_status?: string;
    badges?: string[];
  };
  status: string;
  roles: Role[];
  isOwner: boolean;
  serverId: string;
  onOpenProfile: (id: string) => void;
  onRoleChange: (memberId: string, roleId: string, roleName: string, roleColor: string) => void;
}

const MemberItem: React.FC<MemberItemProps> = ({ member, status, roles, isOwner, serverId, onOpenProfile, onRoleChange }) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showRoleMenu) return;
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowRoleMenu(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showRoleMenu]);

  const handleAssignRole = async (role: Role) => {
    setAssigning(true);
    try {
      await api.patch(`/servers/${serverId}/members/${member.id}/role`, { role_id: role.id });
      onRoleChange(member.id, role.id, role.name, role.color);
      toast.success(`Assigned ${role.name} to ${member.username}`);
    } catch {
      toast.error('Failed to assign role');
    } finally {
      setAssigning(false);
      setShowRoleMenu(false);
    }
  };

  return (
    <div className="relative flex items-center gap-3 px-3 py-1.5 rounded-lg mx-2 hover:bg-discord-lighter/20 cursor-pointer group transition-colors nexus-message-hover">
      <div className="flex items-center gap-3 flex-1 min-w-0" onClick={() => onOpenProfile(member.id)}>
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
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <div
              className={`text-sm font-medium truncate ${status === 'offline' ? 'text-discord-text-muted' : 'text-discord-text'}`}
              style={member.role_color && member.role_color !== '#000000' ? { color: member.role_color } : undefined}
            >
              {member.nickname || member.username}
            </div>
            {member.badges && member.badges.length > 0 && (
              <UserBadges badges={member.badges} size="sm" />
            )}
          </div>
          {member.custom_status && status !== 'offline' && (
            <div className="text-discord-text-muted text-xs truncate">{member.custom_status}</div>
          )}
        </div>
      </div>

      {isOwner && (
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            onClick={e => { e.stopPropagation(); setShowRoleMenu(v => !v); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-discord-dark text-discord-text-muted hover:text-white"
            title="Assign role"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 top-7 rounded-xl shadow-2xl py-1.5 z-50 min-w-[160px] nexus-glass-panel">
              <div className="px-3 py-1 nexus-category-header font-bold uppercase mb-1">
                Assign Role
              </div>
              {roles.filter(r => r.name !== '@everyone').map(role => (
                <button
                  key={role.id}
                  disabled={assigning || member.role_id === role.id}
                  onClick={() => handleAssignRole(role)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors text-left
                    ${member.role_id === role.id
                      ? 'text-discord-text-muted cursor-default'
                      : 'text-discord-text hover:bg-discord-lighter/60'
                    }`}
                >
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: role.color }} />
                  <span className="truncate">{role.name}</span>
                  {member.role_id === role.id && (
                    <svg className="w-3 h-3 ml-auto flex-shrink-0 text-discord-green" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
              <div className="border-t border-discord-lighter/30 mt-1 pt-1">
                <button
                  disabled={assigning || !member.role_id}
                  onClick={async () => {
                    const everyoneRole = roles.find(r => r.name === '@everyone');
                    if (everyoneRole) await handleAssignRole(everyoneRole);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-discord-text-muted hover:bg-discord-lighter/60 hover:text-discord-text transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Remove role
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MembersList = () => {
  const { activeServer, user, updateServer, memberStatuses } = useStore();
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const members = activeServer?.members || [];
  const roles: Role[] = activeServer?.roles || [];

  const isOwner = user?.id === activeServer?.owner_id;

  const getStatus = (m: { id: string; status: string }) => memberStatuses[m.id] || m.status;

  const handleRoleChange = (memberId: string, roleId: string, roleName: string, roleColor: string) => {
    if (!activeServer) return;
    updateServer({
      id: activeServer.id,
      members: members.map(m =>
        m.id === memberId ? { ...m, role_id: roleId, role_name: roleName, role_color: roleColor } : m
      ),
    });
  };

  const online = members.filter(m => getStatus(m) !== 'offline');
  const offline = members.filter(m => getStatus(m) === 'offline');

  const roleGroups: Record<string, typeof members> = {};
  const noRole: typeof members = [];

  online.forEach(m => {
    if (m.role_name && m.role_name !== '@everyone') {
      if (!roleGroups[m.role_name]) roleGroups[m.role_name] = [];
      roleGroups[m.role_name].push(m);
    } else {
      noRole.push(m);
    }
  });

  const itemProps = { roles, isOwner, serverId: activeServer?.id || '', onOpenProfile: setProfileUserId, onRoleChange: handleRoleChange };

  return (
    <>
      <div className="w-60 nexus-glass flex-shrink-0 overflow-y-auto py-4">
        {Object.entries(roleGroups).map(([roleName, roleMembers]) => (
          <div key={roleName} className="mb-2">
            <div className="px-4 py-1 nexus-category-header font-bold uppercase">
              {roleName} — {roleMembers.length}
            </div>
            {roleMembers.map(m => (
              <MemberItem key={m.id} member={m} status={getStatus(m)} {...itemProps} />
            ))}
          </div>
        ))}

        {noRole.length > 0 && (
          <div className="mb-2">
            <div className="px-4 py-1 nexus-category-header font-bold uppercase">
              Online — {noRole.length}
            </div>
            {noRole.map(m => (
              <MemberItem key={m.id} member={m} status={getStatus(m)} {...itemProps} />
            ))}
          </div>
        )}

        {offline.length > 0 && (
          <div>
            <div className="px-4 py-1 nexus-category-header font-bold uppercase">
              Offline — {offline.length}
            </div>
            {offline.map(m => (
              <MemberItem key={m.id} member={m} status="offline" {...itemProps} />
            ))}
          </div>
        )}
      </div>

      {profileUserId && (
        <UserProfileModal userId={profileUserId} onClose={() => setProfileUserId(null)} />
      )}
    </>
  );
};

export default MembersList;
