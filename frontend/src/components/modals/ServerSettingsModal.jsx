import React, { useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import useStore from '../../store/useStore';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

const ServerSettingsModal = ({ onClose }) => {
  const { activeServer, updateServer, removeServer, setActiveServer, user } = useStore();
  const [tab, setTab] = useState('overview');
  const [name, setName] = useState(activeServer?.name || '');
  const [description, setDescription] = useState(activeServer?.description || '');
  const [icon, setIcon] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState(activeServer?.invite_code || '');
  const [copied, setCopied] = useState(false);

  const isOwner = activeServer?.owner_id === user?.id;

  const handleSave = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      if (name !== activeServer.name) formData.append('name', name);
      if (description !== activeServer.description) formData.append('description', description);
      if (icon) formData.append('icon', icon);

      const res = await api.patch(`/servers/${activeServer.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      updateServer(res.data);
      toast.success('Server updated!');
    } catch {
      toast.error('Failed to update server');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${activeServer.name}"? This cannot be undone!`)) return;
    try {
      await api.delete(`/servers/${activeServer.id}`);
      removeServer(activeServer.id);
      setActiveServer(null);
      toast.success('Server deleted');
      onClose();
    } catch {
      toast.error('Failed to delete server');
    }
  };

  const handleLeave = async () => {
    if (!confirm(`Leave "${activeServer.name}"?`)) return;
    try {
      await api.delete(`/servers/${activeServer.id}/leave`);
      removeServer(activeServer.id);
      setActiveServer(null);
      toast.success('Left server');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to leave server');
    }
  };

  const handleKick = async (memberId) => {
    if (!confirm('Kick this member?')) return;
    try {
      await api.delete(`/servers/${activeServer.id}/members/${memberId}`);
      toast.success('Member kicked');
      const res = await api.get(`/servers/${activeServer.id}`);
      updateServer(res.data);
    } catch {
      toast.error('Failed to kick member');
    }
  };

  const handleBan = async (memberId) => {
    const reason = prompt('Ban reason (optional):');
    if (reason === null) return;
    try {
      await api.post(`/servers/${activeServer.id}/ban/${memberId}`, { reason });
      toast.success('Member banned');
      const res = await api.get(`/servers/${activeServer.id}`);
      updateServer(res.data);
    } catch {
      toast.error('Failed to ban member');
    }
  };

  const regenerateInvite = async () => {
    try {
      const res = await api.post(`/servers/${activeServer.id}/invite/regenerate`);
      setInviteCode(res.data.invite_code);
      toast.success('Invite regenerated');
    } catch {
      toast.error('Failed to regenerate invite');
    }
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'invite', label: 'Invite' },
    { key: 'members', label: 'Members' },
    ...(isOwner ? [{ key: 'danger', label: 'Danger Zone' }] : [])
  ];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-discord-gray rounded-lg w-full max-w-2xl max-h-[85vh] flex shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="w-48 bg-discord-darker p-4 flex flex-col">
          <h3 className="text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-2 truncate">{activeServer?.name}</h3>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`text-left px-2 py-1.5 rounded text-sm mb-0.5 transition-colors
                ${tab === t.key ? 'bg-discord-lighter text-white' : 'text-discord-text-muted hover:text-white hover:bg-discord-lighter'}`}
            >
              {t.label}
            </button>
          ))}
          <div className="flex-1" />
          {!isOwner && (
            <button onClick={handleLeave} className="text-left px-2 py-1.5 rounded text-sm text-discord-red hover:bg-discord-lighter">Leave Server</button>
          )}
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Server Settings</h2>
            <button onClick={onClose} className="text-discord-text-muted hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="cursor-pointer">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-discord-lighter flex items-center justify-center">
                    {preview ? (
                      <img src={preview} alt="" className="w-full h-full object-cover" />
                    ) : activeServer?.icon ? (
                      <img src={`${BACKEND_URL}${activeServer.icon}`} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-white">{activeServer?.name?.charAt(0)}</span>
                    )}
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    const f = e.target.files[0];
                    if (f) { setIcon(f); setPreview(URL.createObjectURL(f)); }
                  }} />
                </label>
                <div>
                  <p className="text-white font-semibold">Server Icon</p>
                  <p className="text-discord-text-muted text-sm">Click to change</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-1">Server Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={!isOwner}
                  className="w-full bg-discord-darkest rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-discord-accent disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  disabled={!isOwner}
                  rows={3}
                  className="w-full bg-discord-darkest rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-discord-accent resize-none disabled:opacity-50"
                  placeholder="Tell people about this server..."
                />
              </div>

              {isOwner && (
                <button onClick={handleSave} disabled={loading} className="bg-discord-accent hover:bg-discord-accent-hover text-white px-4 py-2 rounded font-medium disabled:opacity-50 transition-colors">
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              )}
            </div>
          )}

          {tab === 'invite' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-2">Server Invite Code</label>
                <div className="flex gap-2">
                  <input readOnly value={inviteCode} className="flex-1 bg-discord-darkest rounded px-3 py-2 text-white focus:outline-none" />
                  <button onClick={copyInvite} className="bg-discord-accent hover:bg-discord-accent-hover text-white px-4 py-2 rounded transition-colors">
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-discord-text-muted mt-1">Share this code so people can join your server</p>
              </div>
              {isOwner && (
                <button onClick={regenerateInvite} className="text-discord-red hover:text-red-400 text-sm transition-colors">
                  Regenerate invite code
                </button>
              )}
            </div>
          )}

          {tab === 'members' && (
            <div className="space-y-2">
              {activeServer?.members?.filter(m => m.id !== user?.id).map(member => (
                <div key={member.id} className="flex items-center gap-3 p-2 rounded hover:bg-discord-lighter">
                  <div className="w-8 h-8 rounded-full bg-discord-accent flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {member.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{member.username}</p>
                    {member.role_name && <p className="text-xs text-discord-text-muted">{member.role_name}</p>}
                  </div>
                  {isOwner && (
                    <div className="flex gap-2">
                      <button onClick={() => handleKick(member.id)} className="text-xs text-discord-text-muted hover:text-discord-yellow px-2 py-1 rounded hover:bg-discord-gray transition-colors">Kick</button>
                      <button onClick={() => handleBan(member.id)} className="text-xs text-discord-text-muted hover:text-discord-red px-2 py-1 rounded hover:bg-discord-gray transition-colors">Ban</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'danger' && isOwner && (
            <div className="space-y-4">
              <div className="border border-discord-red rounded p-4">
                <h3 className="text-discord-red font-bold mb-2">Delete Server</h3>
                <p className="text-discord-text-muted text-sm mb-4">Once you delete a server, there is no going back. Please be certain.</p>
                <button onClick={handleDelete} className="bg-discord-red hover:bg-red-600 text-white px-4 py-2 rounded font-medium transition-colors">
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
