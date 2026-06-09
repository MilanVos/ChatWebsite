import React, { useState } from 'react';
import api from '../../utils/api';
import useStore from '../../store/useStore';
import toast from 'react-hot-toast';
import UserBadges, { HYPESQUAD_BADGES_LIST, BADGE_DEFS } from '../UserBadges';

interface Props {
  onClose: () => void;
}

type Tab = 'profile' | 'account' | 'badges';

const UserSettingsModal: React.FC<Props> = ({ onClose }) => {
  const { user, setUser, setBadges, logout } = useStore();
  const [tab, setTab] = useState<Tab>('profile');

  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [customStatus, setCustomStatus] = useState(user?.custom_status || '');
  const [status, setStatus] = useState(user?.status || 'online');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const currentHypeSquad = user?.badges?.find(b => HYPESQUAD_BADGES_LIST.includes(b as typeof HYPESQUAD_BADGES_LIST[number])) || null;
  const [savingHypeSquad, setSavingHypeSquad] = useState(false);

  if (!user) return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const formData = new FormData();
      formData.append('username', username.trim());
      formData.append('bio', bio.trim());
      formData.append('custom_status', customStatus.trim());
      formData.append('status', status);
      if (avatar) formData.append('avatar', avatar);
      const res = await api.patch('/auth/profile', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUser(res.data);
      toast.success('Profile updated!');
    } catch (e) {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    setSavingPassword(true);
    try {
      await api.patch('/auth/password', { current_password: currentPassword, new_password: newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed!');
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleHypeSquad = async (house: string) => {
    setSavingHypeSquad(true);
    try {
      const res = await api.patch('/users/me/hypesquad', { house });
      setBadges(res.data.badges);
      toast.success('HypeSquad updated!');
    } catch {
      toast.error('Failed to update HypeSquad');
    } finally {
      setSavingHypeSquad(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    logout();
    onClose();
  };

  const statusOptions = [
    { value: 'online', label: 'Online', color: 'bg-discord-green' },
    { value: 'idle', label: 'Idle', color: 'bg-discord-yellow' },
    { value: 'dnd', label: 'Do Not Disturb', color: 'bg-discord-red' },
    { value: 'invisible', label: 'Invisible', color: 'bg-gray-500' },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 flex z-50" onClick={onClose}>
      <div className="flex w-full max-w-4xl m-auto bg-discord-gray rounded-xl shadow-2xl overflow-hidden" style={{ height: '80vh' }} onClick={e => e.stopPropagation()}>
        <div className="w-48 bg-discord-dark flex flex-col py-6 px-3 flex-shrink-0">
          <div className="text-discord-text-muted text-xs font-bold uppercase tracking-wide px-2 mb-2">
            User Settings
          </div>
          {(['profile', 'badges', 'account'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-left px-2 py-1.5 rounded text-sm mb-0.5 capitalize transition-colors
                ${tab === t ? 'bg-discord-lighter text-white' : 'text-discord-text-muted hover:bg-discord-lighter/50 hover:text-discord-text'}`}
            >
              {t}
            </button>
          ))}
          <div className="mt-2 border-t border-discord-lighter pt-2">
            <button
              onClick={handleLogout}
              className="text-left px-2 py-1.5 rounded text-sm text-discord-red hover:bg-discord-red/10 transition-colors w-full"
            >
              Log Out
            </button>
          </div>
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
          {tab === 'profile' && (
            <div>
              <h2 className="text-white text-xl font-bold mb-6">My Profile</h2>

              <div className="bg-discord-dark rounded-xl overflow-hidden mb-6">
                <div className="h-20 bg-gradient-to-r from-discord-accent to-purple-600" />
                <div className="px-4 pb-4 -mt-8">
                  <label className="cursor-pointer group inline-block">
                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                    <div className="w-20 h-20 rounded-full border-4 border-discord-dark overflow-hidden relative">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-discord-accent flex items-center justify-center text-white font-bold text-2xl">
                          {user.username[0].toUpperCase()}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="text-white text-[10px] font-bold text-center">CHANGE AVATAR</span>
                      </div>
                    </div>
                  </label>
                  <div className="text-white font-bold mt-2">{user.username}<span className="text-discord-text-muted font-normal">#{user.discriminator}</span></div>
                  {user.badges && user.badges.length > 0 && (
                    <UserBadges badges={user.badges} size="md" className="mt-1" />
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-discord-text-muted text-xs font-bold uppercase tracking-wide mb-1.5">
                    Display Name
                  </label>
                  <input
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full bg-discord-dark text-discord-text rounded px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-discord-accent text-sm"
                    maxLength={32}
                  />
                </div>

                <div>
                  <label className="block text-discord-text-muted text-xs font-bold uppercase tracking-wide mb-1.5">
                    About Me
                  </label>
                  <textarea
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    className="w-full bg-discord-dark text-discord-text rounded px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-discord-accent text-sm resize-none"
                    rows={3}
                    maxLength={190}
                    placeholder="Tell us about yourself!"
                  />
                  <div className="text-discord-text-muted text-xs text-right">{bio.length}/190</div>
                </div>

                <div>
                  <label className="block text-discord-text-muted text-xs font-bold uppercase tracking-wide mb-1.5">
                    Custom Status
                  </label>
                  <input
                    value={customStatus}
                    onChange={e => setCustomStatus(e.target.value)}
                    className="w-full bg-discord-dark text-discord-text rounded px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-discord-accent text-sm"
                    placeholder="What are you up to?"
                    maxLength={128}
                  />
                </div>

                <div>
                  <label className="block text-discord-text-muted text-xs font-bold uppercase tracking-wide mb-2">
                    Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {statusOptions.map(s => (
                      <label
                        key={s.value}
                        className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer border transition-colors
                          ${status === s.value ? 'border-discord-accent bg-discord-accent/10' : 'border-discord-lighter bg-discord-dark hover:border-discord-text-muted'}`}
                      >
                        <input
                          type="radio"
                          name="status"
                          value={s.value}
                          checked={status === s.value}
                          onChange={() => setStatus(s.value)}
                          className="sr-only"
                        />
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${s.color}`} />
                        <span className="text-discord-text text-sm">{s.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="bg-discord-accent hover:bg-discord-accent-hover text-white px-6 py-2.5 rounded font-medium transition-colors disabled:opacity-50"
                >
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {tab === 'badges' && (
            <div>
              <h2 className="text-white text-xl font-bold mb-2">Your Badges</h2>
              <p className="text-discord-text-muted text-sm mb-6">Badges are displayed on your profile and next to your name.</p>

              {user.badges && user.badges.length > 0 ? (
                <div className="bg-discord-dark rounded-lg p-4 mb-6">
                  <div className="text-discord-text-muted text-xs font-bold uppercase tracking-wide mb-3">Earned Badges</div>
                  <div className="flex flex-wrap gap-4">
                    {user.badges.map(badge => {
                      const def = BADGE_DEFS[badge as keyof typeof BADGE_DEFS];
                      if (!def) return null;
                      return (
                        <div key={badge} className="flex items-center gap-2">
                          <div className="w-8 h-8" style={{ color: def.color }}>{def.icon}</div>
                          <span className="text-discord-text text-sm">{def.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-discord-dark rounded-lg p-4 mb-6 text-discord-text-muted text-sm">
                  No badges yet. Keep using the app to earn them!
                </div>
              )}

              <div className="bg-discord-dark rounded-lg p-4">
                <div className="text-white font-bold mb-1">HypeSquad</div>
                <p className="text-discord-text-muted text-sm mb-4">Choose your HypeSquad house. You can change it at any time.</p>
                <div className="grid grid-cols-3 gap-3">
                  {HYPESQUAD_BADGES_LIST.map(house => {
                    const def = BADGE_DEFS[house as keyof typeof BADGE_DEFS];
                    const isSelected = currentHypeSquad === house;
                    return (
                      <button
                        key={house}
                        onClick={() => handleHypeSquad(house)}
                        disabled={savingHypeSquad || isSelected}
                        className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
                          ${isSelected
                            ? 'border-opacity-100 bg-opacity-20'
                            : 'border-discord-lighter bg-discord-darker hover:border-opacity-80'
                          }`}
                        style={isSelected ? { borderColor: def.color, backgroundColor: `${def.color}22` } : {}}
                      >
                        <div className="w-10 h-10" style={{ color: def.color }}>{def.icon}</div>
                        <span className="text-discord-text text-xs font-medium text-center">{def.label.replace('HypeSquad ', '')}</span>
                        {isSelected && <span className="text-xs font-bold" style={{ color: def.color }}>Selected</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'account' && (
            <div>
              <h2 className="text-white text-xl font-bold mb-6">Account Information</h2>

              <div className="bg-discord-dark rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-discord-text-muted text-xs font-bold uppercase tracking-wide mb-1">Email</div>
                    <div className="text-discord-text text-sm">{user.email}</div>
                  </div>
                </div>
              </div>

              <div className="bg-discord-dark rounded-lg p-4">
                <h3 className="text-white font-bold mb-4">Change Password</h3>
                {passwordError && (
                  <div className="bg-red-500/20 text-discord-red rounded p-3 mb-4 text-sm">{passwordError}</div>
                )}
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-discord-text-muted text-xs font-bold uppercase tracking-wide mb-1.5">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={e => { setCurrentPassword(e.target.value); setPasswordError(''); }}
                      className="w-full bg-discord-lighter text-discord-text rounded px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-discord-accent text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-discord-text-muted text-xs font-bold uppercase tracking-wide mb-1.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => { setNewPassword(e.target.value); setPasswordError(''); }}
                      className="w-full bg-discord-lighter text-discord-text rounded px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-discord-accent text-sm"
                      required
                      minLength={8}
                    />
                  </div>
                  <div>
                    <label className="block text-discord-text-muted text-xs font-bold uppercase tracking-wide mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                      className="w-full bg-discord-lighter text-discord-text rounded px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-discord-accent text-sm"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="bg-discord-accent hover:bg-discord-accent-hover text-white px-6 py-2.5 rounded font-medium transition-colors disabled:opacity-50"
                  >
                    {savingPassword ? 'Changing...' : 'Change Password'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSettingsModal;
