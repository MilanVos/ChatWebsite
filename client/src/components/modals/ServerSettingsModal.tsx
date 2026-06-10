import React, { useState } from 'react';
import api from '../../utils/api';
import useStore from '../../store/useStore';
import toast from 'react-hot-toast';

interface Props {
  onClose: () => void;
}

interface Role {
  id: string;
  name: string;
  color: string;
  permissions: number;
  position: number;
}

type Tab = 'overview' | 'invite' | 'roles' | 'members' | 'danger';

const PERMISSION_FLAGS: { label: string; bit: number }[] = [
  { label: 'View Channels', bit: 1 << 10 },
  { label: 'Send Messages', bit: 1 << 11 },
  { label: 'Manage Messages', bit: 1 << 13 },
  { label: 'Embed Links', bit: 1 << 14 },
  { label: 'Attach Files', bit: 1 << 15 },
  { label: 'Read Message History', bit: 1 << 16 },
  { label: 'Mention Everyone', bit: 1 << 17 },
  { label: 'Use Voice', bit: 1 << 22 },
  { label: 'Kick Members', bit: 1 << 1 },
  { label: 'Ban Members', bit: 1 << 2 },
  { label: 'Manage Channels', bit: 1 << 4 },
  { label: 'Manage Server', bit: 1 << 5 },
  { label: 'Manage Roles', bit: 1 << 28 },
  { label: 'Administrator', bit: 1 << 3 },
];

const ServerSettingsModal: React.FC<Props> = ({ onClose }) => {
  const { activeServer, updateServer, removeServer, setActiveServer, user } = useStore();
  const [tab, setTab] = useState<Tab>('overview');
  const [serverName, setServerName] = useState(activeServer?.name || '');
  const [icon, setIcon] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState(activeServer?.icon || '');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const [roles, setRoles] = useState<Role[]>(activeServer?.roles || []);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleColor, setRoleColor] = useState('#99aab5');
  const [rolePerms, setRolePerms] = useState(0);
  const [savingRole, setSavingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [creatingRole, setCreatingRole] = useState(false);

  const [assignMemberId, setAssignMemberId] = useState('');
  const [assigningRole, setAssigningRole] = useState(false);

  if (!activeServer) return null;

  const isOwner = user?.id === activeServer.owner_id;

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIcon(file);
    setIconPreview(URL.createObjectURL(file));
  };

  const handleSaveOverview = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', serverName.trim());
      if (icon) formData.append('icon', icon);
      const res = await api.patch(`/servers/${activeServer.id}`, formData);
      updateServer(res.data);
      toast.success('Server updated!');
    } catch (e) {
      toast.error('Failed to update server');
    } finally {
      setSaving(false);
    }
  };

  const copyInvite = () => {
    const link = `${window.location.origin}/invite/${activeServer.invite_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKick = async (memberId: string) => {
    if (!window.confirm('Kick this member?')) return;
    try {
      await api.delete(`/servers/${activeServer.id}/members/${memberId}`);
      updateServer({ id: activeServer.id, members: activeServer.members?.filter(m => m.id !== memberId) });
      toast.success('Member kicked');
    } catch (e) {
      toast.error('Failed to kick member');
    }
  };

  const handleBan = async (memberId: string) => {
    if (!window.confirm('Ban this member?')) return;
    try {
      await api.post(`/servers/${activeServer.id}/ban/${memberId}`);
      updateServer({ id: activeServer.id, members: activeServer.members?.filter(m => m.id !== memberId) });
      toast.success('Member banned');
    } catch (e) {
      toast.error('Failed to ban member');
    }
  };

  const handleDeleteServer = async () => {
    if (deleteConfirm !== activeServer.name) return;
    try {
      await api.delete(`/servers/${activeServer.id}`);
      removeServer(activeServer.id);
      setActiveServer(null);
      onClose();
      toast.success('Server deleted');
    } catch (e) {
      toast.error('Failed to delete server');
    }
  };

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role);
    setRoleName(role.name);
    setRoleColor(role.color);
    setRolePerms(role.permissions);
  };

  const handleSaveRole = async () => {
    if (!selectedRole) return;
    setSavingRole(true);
    try {
      const res = await api.patch(`/servers/${activeServer.id}/roles/${selectedRole.id}`, {
        name: roleName, color: roleColor, permissions: rolePerms,
      });
      setRoles(prev => prev.map(r => r.id === selectedRole.id ? res.data : r));
      setSelectedRole(res.data);
      toast.success('Role updated!');
    } catch (e) {
      toast.error('Failed to update role');
    } finally {
      setSavingRole(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    setCreatingRole(true);
    try {
      const res = await api.post(`/servers/${activeServer.id}/roles`, { name: newRoleName.trim() });
      setRoles(prev => [...prev, res.data]);
      setNewRoleName('');
      toast.success('Role created!');
    } catch (e) {
      toast.error('Failed to create role');
    } finally {
      setCreatingRole(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!window.confirm('Delete this role?')) return;
    try {
      await api.delete(`/servers/${activeServer.id}/roles/${roleId}`);
      setRoles(prev => prev.filter(r => r.id !== roleId));
      if (selectedRole?.id === roleId) setSelectedRole(null);
      toast.success('Role deleted');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to delete role');
    }
  };

  const handleAssignRole = async (roleIdToAssign: string) => {
    if (!assignMemberId || !roleIdToAssign) return;
    setAssigningRole(true);
    try {
      await api.patch(`/servers/${activeServer.id}/members/${assignMemberId}/role`, { role_id: roleIdToAssign });
      const rName = roles.find(r => r.id === roleIdToAssign)?.name || '';
      updateServer({
        id: activeServer.id,
        members: activeServer.members?.map(m =>
          m.id === assignMemberId ? { ...m, role_id: roleIdToAssign, role_name: rName } : m
        ),
      });
      toast.success('Role assigned!');
    } catch (e) {
      toast.error('Failed to assign role');
    } finally {
      setAssigningRole(false);
    }
  };

  const togglePerm = (bit: number) => {
    setRolePerms(prev => (prev & bit) ? prev & ~bit : prev | bit);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'invite', label: 'Invite' },
    { key: 'roles', label: 'Roles' },
    { key: 'members', label: 'Members' },
    ...(isOwner ? [{ key: 'danger' as Tab, label: 'Danger Zone' }] : []),
  ];

  return (
    <div className="fixed inset-0 bg-black/70 flex z-50" onClick={onClose}>
      <div className="flex w-full max-w-4xl m-auto bg-discord-gray rounded-xl shadow-2xl overflow-hidden" style={{ height: '80vh' }} onClick={e => e.stopPropagation()}>
        <div className="w-48 bg-discord-dark flex flex-col py-6 px-3 flex-shrink-0">
          <div className="text-discord-text-muted text-xs font-bold uppercase tracking-wide px-2 mb-2 truncate">
            {activeServer.name}
          </div>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`text-left px-2 py-1.5 rounded text-sm mb-0.5 transition-colors
                ${tab === t.key ? 'bg-discord-lighter text-white' : 'text-discord-text-muted hover:bg-discord-lighter/50 hover:text-discord-text'}`}
            >
              {t.label}
            </button>
          ))}
          <div className="mt-auto">
            <button
              onClick={onClose}
              className="w-full text-left px-2 py-1.5 rounded text-sm text-discord-text-muted hover:bg-discord-lighter/50 hover:text-discord-text transition-colors"
            >
              ✕ Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {tab === 'overview' && (
            <div>
              <h2 className="text-white text-xl font-bold mb-6">Server Overview</h2>
              <div className="flex items-start gap-6 mb-6">
                <label className="cursor-pointer group flex-shrink-0">
                  <input type="file" accept="image/*" onChange={handleIconChange} className="hidden" />
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-dashed border-discord-text-muted group-hover:border-discord-accent transition-colors relative">
                    {iconPreview ? (
                      <img src={iconPreview} alt="Server icon" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-discord-lighter flex items-center justify-center text-white font-bold text-xl">
                        {activeServer.name[0].toUpperCase()}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                      <span className="text-white text-xs font-bold">CHANGE</span>
                    </div>
                  </div>
                </label>
                <div className="flex-1">
                  <label className="block text-discord-text-muted text-xs font-bold uppercase tracking-wide mb-1.5">
                    Server Name
                  </label>
                  <input
                    value={serverName}
                    onChange={e => setServerName(e.target.value)}
                    className="w-full bg-discord-dark text-discord-text rounded px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-discord-accent text-sm"
                    maxLength={100}
                  />
                </div>
              </div>
              <button
                onClick={handleSaveOverview}
                disabled={saving || !serverName.trim()}
                className="bg-discord-accent hover:bg-discord-accent-hover text-white px-4 py-2 rounded font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          {tab === 'invite' && (
            <div>
              <h2 className="text-white text-xl font-bold mb-6">Invite People</h2>
              <p className="text-discord-text-muted text-sm mb-4">
                Share this link with others to grant access to your server.
              </p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={`${window.location.origin}/invite/${activeServer.invite_code}`}
                  className="flex-1 bg-discord-dark text-discord-text rounded px-3 py-2.5 text-sm focus:outline-none"
                />
                <button
                  onClick={copyInvite}
                  className={`px-4 py-2.5 rounded font-medium text-white transition-colors ${copied ? 'bg-discord-green' : 'bg-discord-accent hover:bg-discord-accent-hover'}`}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="mt-4 text-discord-text-muted text-xs">
                Invite code: <span className="text-discord-text font-mono">{activeServer.invite_code}</span>
              </div>
            </div>
          )}

          {tab === 'roles' && (
            <div className="flex gap-6 h-full">
              <div className="w-48 flex-shrink-0">
                <h2 className="text-white text-lg font-bold mb-4">Roles</h2>
                <div className="flex flex-col gap-1 mb-4">
                  {roles.map(role => (
                    <div
                      key={role.id}
                      onClick={() => handleSelectRole(role)}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded cursor-pointer transition-colors group
                        ${selectedRole?.id === role.id ? 'bg-discord-lighter' : 'hover:bg-discord-lighter/50'}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: role.color }} />
                        <span className="text-discord-text text-sm truncate">{role.name}</span>
                      </div>
                      {isOwner && role.name !== '@everyone' && (
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteRole(role.id); }}
                          className="opacity-0 group-hover:opacity-100 text-discord-text-muted hover:text-discord-red text-xs transition-opacity"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {isOwner && (
                  <div className="flex gap-1">
                    <input
                      value={newRoleName}
                      onChange={e => setNewRoleName(e.target.value)}
                      placeholder="New role name"
                      className="flex-1 bg-discord-dark text-discord-text text-xs rounded px-2 py-1.5 focus:outline-none min-w-0"
                      onKeyDown={e => e.key === 'Enter' && handleCreateRole()}
                    />
                    <button
                      onClick={handleCreateRole}
                      disabled={creatingRole || !newRoleName.trim()}
                      className="bg-discord-accent hover:bg-discord-accent-hover text-white text-xs px-2 py-1.5 rounded transition-colors disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto">
                {selectedRole ? (
                  <div>
                    <h3 className="text-white font-bold mb-4">Edit Role — {selectedRole.name}</h3>

                    <div className="mb-4">
                      <label className="block text-discord-text-muted text-xs font-bold uppercase tracking-wide mb-1.5">Role Name</label>
                      <input
                        value={roleName}
                        onChange={e => setRoleName(e.target.value)}
                        disabled={selectedRole.name === '@everyone' || !isOwner}
                        className="w-full bg-discord-dark text-discord-text rounded px-3 py-2 text-sm focus:outline-none disabled:opacity-50"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-discord-text-muted text-xs font-bold uppercase tracking-wide mb-1.5">Role Color</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={roleColor}
                          onChange={e => setRoleColor(e.target.value)}
                          disabled={!isOwner}
                          className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent disabled:opacity-50"
                        />
                        <span className="text-discord-text text-sm font-mono">{roleColor}</span>
                      </div>
                    </div>

                    <div className="mb-6">
                      <label className="block text-discord-text-muted text-xs font-bold uppercase tracking-wide mb-2">Permissions</label>
                      <div className="grid grid-cols-1 gap-2">
                        {PERMISSION_FLAGS.map(perm => (
                          <label key={perm.bit} className="flex items-center gap-3 cursor-pointer group">
                            <div
                              className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${(rolePerms & perm.bit) ? 'bg-discord-green' : 'bg-discord-lighter'}`}
                              onClick={() => isOwner && togglePerm(perm.bit)}
                            >
                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${(rolePerms & perm.bit) ? 'translate-x-5' : 'translate-x-0.5'}`} />
                            </div>
                            <span className="text-discord-text text-sm">{perm.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {isOwner && selectedRole.name !== '@everyone' && (
                      <button
                        onClick={handleSaveRole}
                        disabled={savingRole}
                        className="bg-discord-accent hover:bg-discord-accent-hover text-white px-4 py-2 rounded font-medium text-sm transition-colors disabled:opacity-50"
                      >
                        {savingRole ? 'Saving...' : 'Save Role'}
                      </button>
                    )}

                    {isOwner && (
                      <div className="mt-6 pt-4 border-t border-discord-lighter">
                        <h4 className="text-discord-text-muted text-xs font-bold uppercase tracking-wide mb-3">Assign Role to Member</h4>
                        <div className="flex gap-2">
                          <select
                            value={assignMemberId}
                            onChange={e => setAssignMemberId(e.target.value)}
                            className="flex-1 bg-discord-dark text-discord-text rounded px-3 py-2 text-sm focus:outline-none"
                          >
                            <option value="">Select member...</option>
                            {(activeServer.members || []).map(m => (
                              <option key={m.id} value={m.id}>{m.nickname || m.username}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleAssignRole(selectedRole.id)}
                            disabled={!assignMemberId || assigningRole}
                            className="bg-discord-accent hover:bg-discord-accent-hover text-white px-3 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            {assigningRole ? '...' : 'Assign'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-discord-text-muted text-sm">
                    Select a role to edit it
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'members' && (
            <div>
              <h2 className="text-white text-xl font-bold mb-6">Members — {activeServer.members?.length || 0}</h2>
              <div className="flex flex-col gap-2">
                {(activeServer.members || []).map(member => (
                  <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-discord-dark group">
                    <div className="relative flex-shrink-0">
                      {member.avatar ? (
                        <img src={member.avatar} alt={member.username} className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-discord-accent flex items-center justify-center text-white text-sm font-bold">
                          {member.username[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium">{member.nickname || member.username}</div>
                      {member.role_name && (
                        <div className="text-xs" style={{ color: member.role_color || '#72767d' }}>{member.role_name}</div>
                      )}
                    </div>
                    {isOwner && member.id !== user?.id && (
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleKick(member.id)}
                          className="px-3 py-1 rounded text-xs font-medium bg-discord-dark text-discord-yellow hover:bg-discord-yellow hover:text-white transition-colors"
                        >
                          Kick
                        </button>
                        <button
                          onClick={() => handleBan(member.id)}
                          className="px-3 py-1 rounded text-xs font-medium bg-discord-dark text-discord-red hover:bg-discord-red hover:text-white transition-colors"
                        >
                          Ban
                        </button>
                      </div>
                    )}
                    {member.id === activeServer.owner_id && (
                      <span className="text-discord-yellow text-xs">👑 Owner</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'danger' && isOwner && (
            <div>
              <h2 className="text-discord-red text-xl font-bold mb-6">Danger Zone</h2>
              <div className="border border-discord-red/30 rounded-lg p-6 bg-discord-red/5">
                <h3 className="text-white font-bold mb-2">Delete This Server</h3>
                <p className="text-discord-text-muted text-sm mb-4">
                  Once you delete a server, there is no going back. All channels, messages, and members will be permanently removed.
                </p>
                <div className="mb-3">
                  <label className="block text-discord-text-muted text-xs font-bold uppercase tracking-wide mb-1.5">
                    Type <span className="text-white">{activeServer.name}</span> to confirm
                  </label>
                  <input
                    value={deleteConfirm}
                    onChange={e => setDeleteConfirm(e.target.value)}
                    className="w-full bg-discord-dark text-discord-text rounded px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-discord-red text-sm"
                    placeholder={activeServer.name}
                  />
                </div>
                <button
                  onClick={handleDeleteServer}
                  disabled={deleteConfirm !== activeServer.name}
                  className="bg-discord-red hover:bg-red-700 text-white px-4 py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete Server
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServerSettingsModal;
