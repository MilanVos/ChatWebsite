import React, { useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import useStore from '../../store/useStore';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

const UserSettingsModal = ({ onClose }) => {
  const { user, setUser } = useStore();
  const [tab, setTab] = useState('profile');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [customStatus, setCustomStatus] = useState(user?.custom_status || '');
  const [avatar, setAvatar] = useState(null);
  const [preview, setPreview] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleProfileSave = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      if (username !== user.username) formData.append('username', username);
      if (bio !== user.bio) formData.append('bio', bio);
      if (customStatus !== user.custom_status) formData.append('custom_status', customStatus);
      if (avatar) formData.append('avatar', avatar);

      const res = await api.patch('/users/me', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUser({ ...user, ...res.data });
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword) return toast.error('Fill in all fields');
    if (newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await api.patch('/users/me/password', { currentPassword, newPassword });
      toast.success('Password changed!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-discord-gray rounded-lg w-full max-w-2xl max-h-[85vh] flex shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="w-48 bg-discord-darker p-4">
          <h3 className="text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-2">User Settings</h3>
          {[['profile', 'My Profile'], ['account', 'Account']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`text-left w-full px-2 py-1.5 rounded text-sm mb-0.5 transition-colors
                ${tab === key ? 'bg-discord-lighter text-white' : 'text-discord-text-muted hover:text-white hover:bg-discord-lighter'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">
              {tab === 'profile' ? 'My Profile' : 'Account Settings'}
            </h2>
            <button onClick={onClose} className="text-discord-text-muted hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {tab === 'profile' && (
            <div className="space-y-4">
              <div className="bg-discord-darker rounded-lg p-4">
                <div className="flex items-center gap-4 mb-4">
                  <label className="cursor-pointer">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-discord-accent flex items-center justify-center">
                      {preview ? (
                        <img src={preview} alt="" className="w-full h-full object-cover" />
                      ) : user?.avatar ? (
                        <img src={`${BACKEND_URL}${user.avatar}`} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-bold text-white">{user?.username?.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const f = e.target.files[0];
                      if (f) { setAvatar(f); setPreview(URL.createObjectURL(f)); }
                    }} />
                  </label>
                  <div>
                    <p className="text-white font-bold text-lg">{user?.username}<span className="text-discord-text-muted font-normal">#{user?.discriminator}</span></p>
                    <p className="text-xs text-discord-text-muted mt-1">Click avatar to change</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-1">Username</label>
                <input value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-discord-darkest rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-discord-accent" maxLength={32} />
              </div>

              <div>
                <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-1">Custom Status</label>
                <input value={customStatus} onChange={e => setCustomStatus(e.target.value)} className="w-full bg-discord-darkest rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-discord-accent" placeholder="What's on your mind?" maxLength={128} />
              </div>

              <div>
                <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-1">About Me</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className="w-full bg-discord-darkest rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-discord-accent resize-none" placeholder="Tell people a bit about yourself!" maxLength={500} />
              </div>

              <button onClick={handleProfileSave} disabled={loading} className="bg-discord-accent hover:bg-discord-accent-hover text-white px-4 py-2 rounded font-medium disabled:opacity-50 transition-colors">
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          {tab === 'account' && (
            <div className="space-y-4">
              <div className="bg-discord-darker rounded-lg p-4 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-1">Email</label>
                  <p className="text-white">{user?.email}</p>
                </div>
              </div>

              <div>
                <h3 className="text-white font-bold mb-3">Change Password</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-1">Current Password</label>
                    <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full bg-discord-darkest rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-discord-accent" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-1">New Password</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-discord-darkest rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-discord-accent" />
                  </div>
                  <button onClick={handlePasswordChange} disabled={loading} className="bg-discord-accent hover:bg-discord-accent-hover text-white px-4 py-2 rounded font-medium disabled:opacity-50 transition-colors">
                    {loading ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSettingsModal;
