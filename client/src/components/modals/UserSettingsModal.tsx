import { useState } from 'react';
import api from '../../utils/api';
import useStore from '../../store/useStore';
import toast from 'react-hot-toast';
import UserBadges, { HYPESQUAD_BADGES_LIST, BADGE_DEFS } from '../UserBadges';

interface Props {
  onClose: () => void;
}

type Tab = 'profile' | 'account' | 'badges' | 'admin';

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

  const isStaff = user?.badges?.includes('staff') ?? false;
  const [adminSearch, setAdminSearch] = useState('');
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);

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
      const res = await api.patch('/users/me', formData);
      setUser(res.data);
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match'); return; }
    if (newPassword.length < 8) { setPasswordError('Password must be at least 8 characters'); return; }
    setSavingPassword(true);
    try {
      await api.patch('/users/me/password', { currentPassword, newPassword });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      toast.success('Password changed!');
    } catch (err: any) {
      setPasswordError(err.response?.data?.error || 'Failed to change password');
    } finally { setSavingPassword(false); }
  };

  const fetchAdminUsers = async (q?: string) => {
    setAdminLoading(true);
    try {
      const res = await api.get('/users/admin/users', { params: q ? { q } : {} });
      setAdminUsers(res.data);
    } catch { toast.error('Failed to load users'); }
    finally { setAdminLoading(false); }
  };

  const handleAwardBadge = async (targetUserId: string, badgeType: string) => {
    try {
      await api.post('/users/me/badges/award', { target_user_id: targetUserId, badge_type: badgeType });
      setAdminUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, badges: [...(u.badges || []), badgeType] } : u));
      toast.success('Badge awarded!');
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to award badge'); }
  };

  const handleRevokeBadge = async (targetUserId: string, badgeType: string) => {
    try {
      await api.delete('/users/badges/revoke', { data: { target_user_id: targetUserId, badge_type: badgeType } });
      setAdminUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, badges: (u.badges || []).filter((b: string) => b !== badgeType) } : u));
      toast.success('Badge revoked!');
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to revoke badge'); }
  };

  const handleHypeSquad = async (house: string) => {
    setSavingHypeSquad(true);
    try {
      const res = await api.patch('/users/me/hypesquad', { house });
      setBadges(res.data.badges);
      toast.success('HypeSquad updated!');
    } catch { toast.error('Failed to update HypeSquad'); }
    finally { setSavingHypeSquad(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    logout();
    onClose();
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'profile',
      label: 'My Profile',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
        </svg>
      ),
    },
    {
      id: 'badges',
      label: 'Badges',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ),
    },
    {
      id: 'account',
      label: 'Account',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
        </svg>
      ),
    },
    ...(isStaff ? [{
      id: 'admin' as Tab,
      label: 'Admin',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
        </svg>
      ),
    }] : []),
  ];

  const statusOptions = [
    { value: 'online', label: 'Online', color: '#22c55e' },
    { value: 'idle', label: 'Idle', color: '#f59e0b' },
    { value: 'dnd', label: 'Do Not Disturb', color: '#ff3b55' },
    { value: 'invisible', label: 'Invisible', color: '#6b7280' },
  ];

  const inputClass = "w-full rounded-lg px-3.5 py-2.5 text-sm nexus-glass-input";
  const labelClass = "block text-xs font-bold uppercase tracking-widest mb-2" as const;

  return (
    <div
      className="fixed inset-0 z-50 flex"
      style={{ background: 'rgba(4, 1, 1, 0.92)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="m-auto flex w-full max-w-5xl rounded-2xl overflow-hidden"
        style={{
          height: '82vh',
          background: 'rgba(10, 4, 3, 0.96)',
          border: '1px solid rgba(255, 107, 53, 0.14)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,107,53,0.08)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Left sidebar */}
        <div
          className="flex flex-col w-56 flex-shrink-0 py-8 px-4"
          style={{
            background: 'rgba(6, 2, 2, 0.8)',
            borderRight: '1px solid rgba(255, 107, 53, 0.08)',
          }}
        >
          {/* User mini card */}
          <div className="flex items-center gap-3 px-2 mb-8">
            <div className="relative flex-shrink-0">
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base"
                  style={{ background: 'linear-gradient(135deg, #ff6b35, #ff2d55)' }}
                >
                  {user.username[0].toUpperCase()}
                </div>
              )}
              <div
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2"
                style={{
                  background: status === 'online' ? '#22c55e' : status === 'idle' ? '#f59e0b' : status === 'dnd' ? '#ff3b55' : '#6b7280',
                  borderColor: '#0a0403',
                }}
              />
            </div>
            <div className="min-w-0">
              <div className="text-white font-semibold text-sm truncate">{user.username}</div>
              <div className="text-xs truncate" style={{ color: 'rgba(240,226,222,0.4)' }}>#{user.discriminator}</div>
            </div>
          </div>

          <div className="text-xs font-bold uppercase tracking-widest px-2 mb-3" style={{ color: 'rgba(255,107,53,0.5)' }}>
            Settings
          </div>

          <div className="flex flex-col gap-0.5 flex-1">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); if (t.id === 'admin' && adminUsers.length === 0) fetchAdminUsers(); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left"
                style={{
                  background: tab === t.id ? 'linear-gradient(90deg, rgba(255,107,53,0.18) 0%, rgba(255,45,85,0.1) 100%)' : 'transparent',
                  color: tab === t.id ? '#ff8c42' : 'rgba(240,226,222,0.5)',
                  borderLeft: tab === t.id ? '2px solid #ff6b35' : '2px solid transparent',
                }}
              >
                <span style={{ color: tab === t.id ? '#ff6b35' : 'rgba(240,226,222,0.35)' }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-auto flex flex-col gap-0.5 pt-4" style={{ borderTop: '1px solid rgba(255,107,53,0.08)' }}>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left"
              style={{ color: '#ff3b55' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,59,85,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
              </svg>
              Log Out
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left"
              style={{ color: 'rgba(240,226,222,0.35)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'profile' && (
            <div className="flex h-full">
              {/* Form column */}
              <div className="flex-1 p-8 overflow-y-auto">
                <h1 className="text-xl font-bold text-white mb-7">My Profile</h1>

                <div className="space-y-5">
                  <div>
                    <label className={labelClass} style={{ color: 'rgba(255,107,53,0.7)' }}>Avatar</label>
                    <label className="flex items-center gap-4 cursor-pointer group">
                      <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                      <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center text-white font-bold text-2xl"
                            style={{ background: 'linear-gradient(135deg, #ff6b35, #ff2d55)' }}
                          >
                            {user.username[0].toUpperCase()}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                        </div>
                      </div>
                      <span className="text-sm" style={{ color: 'rgba(240,226,222,0.45)' }}>
                        Click avatar to change · PNG, JPG, GIF up to 8MB
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className={labelClass} style={{ color: 'rgba(255,107,53,0.7)' }}>Display Name</label>
                    <input value={username} onChange={e => setUsername(e.target.value)} className={inputClass} maxLength={32} />
                  </div>

                  <div>
                    <label className={labelClass} style={{ color: 'rgba(255,107,53,0.7)' }}>About Me</label>
                    <textarea
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      className={inputClass + ' resize-none'}
                      rows={3}
                      maxLength={190}
                      placeholder="Tell the world who you are..."
                    />
                    <div className="text-right mt-1 text-xs" style={{ color: 'rgba(240,226,222,0.3)' }}>{bio.length}/190</div>
                  </div>

                  <div>
                    <label className={labelClass} style={{ color: 'rgba(255,107,53,0.7)' }}>Custom Status</label>
                    <input
                      value={customStatus}
                      onChange={e => setCustomStatus(e.target.value)}
                      className={inputClass}
                      placeholder="What are you up to?"
                      maxLength={128}
                    />
                  </div>

                  <div>
                    <label className={labelClass} style={{ color: 'rgba(255,107,53,0.7)' }}>Status</label>
                    <div className="grid grid-cols-2 gap-2">
                      {statusOptions.map(s => (
                        <label
                          key={s.value}
                          className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all duration-150"
                          style={{
                            background: status === s.value ? `${s.color}18` : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${status === s.value ? s.color + '55' : 'rgba(255,107,53,0.1)'}`,
                          }}
                        >
                          <input type="radio" name="status" value={s.value} checked={status === s.value} onChange={() => setStatus(s.value)} className="sr-only" />
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} />
                          <span className="text-sm" style={{ color: status === s.value ? '#f0e2de' : 'rgba(240,226,222,0.55)' }}>{s.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="nexus-gradient-btn w-full py-2.5 rounded-lg font-semibold text-sm"
                  >
                    {savingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>

              {/* Live preview column */}
              <div
                className="w-64 flex-shrink-0 p-6 flex flex-col gap-4 overflow-y-auto"
                style={{ borderLeft: '1px solid rgba(255,107,53,0.08)' }}
              >
                <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,107,53,0.5)' }}>Preview</div>
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: 'rgba(14,7,6,0.9)',
                    border: '1px solid rgba(255,107,53,0.12)',
                  }}
                >
                  <div className="h-16 w-full" style={{ background: 'linear-gradient(135deg, #ff6b35, #ff2d55)' }} />
                  <div className="px-4 pb-5 -mt-8">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-4 mb-3" style={{ borderColor: '#0e0706' }}>
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl" style={{ background: 'linear-gradient(135deg, #ff6b35, #ff2d55)' }}>
                          {(username || user.username)[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="text-white font-bold text-base">{username || user.username}</div>
                    <div className="text-xs mb-2" style={{ color: 'rgba(240,226,222,0.4)' }}>#{user.discriminator}</div>
                    {user.badges && user.badges.length > 0 && (
                      <div className="mb-2">
                        <UserBadges badges={user.badges} size="sm" />
                      </div>
                    )}
                    {customStatus && (
                      <div className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(255,107,53,0.12)', color: '#ff8c42' }}>
                        {customStatus}
                      </div>
                    )}
                    {bio && (
                      <div className="mt-2 text-xs" style={{ color: 'rgba(240,226,222,0.55)' }}>{bio}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'badges' && (
            <div className="p-8 max-w-2xl">
              <h1 className="text-xl font-bold text-white mb-1">Badges</h1>
              <p className="text-sm mb-8" style={{ color: 'rgba(240,226,222,0.45)' }}>Your earned badges are shown on your profile card.</p>

              <div
                className="rounded-xl p-5 mb-6"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,107,53,0.1)' }}
              >
                <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,107,53,0.6)' }}>Earned Badges</div>
                {user.badges && user.badges.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {user.badges.map(badge => {
                      const def = BADGE_DEFS[badge as keyof typeof BADGE_DEFS];
                      if (!def) return null;
                      return (
                        <div key={badge} className="flex items-center gap-2.5 px-3 py-2 rounded-lg" style={{ background: `${def.color}15`, border: `1px solid ${def.color}30` }}>
                          <div className="w-6 h-6 flex-shrink-0" style={{ color: def.color }}>{def.icon}</div>
                          <span className="text-sm font-medium" style={{ color: def.color }}>{def.label}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: 'rgba(240,226,222,0.3)' }}>No badges yet. Keep using Nexus to earn them!</p>
                )}
              </div>

              <div
                className="rounded-xl p-5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,107,53,0.1)' }}
              >
                <div className="text-white font-bold mb-1">HypeSquad House</div>
                <p className="text-sm mb-5" style={{ color: 'rgba(240,226,222,0.4)' }}>Choose your house. You can switch at any time.</p>
                <div className="grid grid-cols-3 gap-3">
                  {HYPESQUAD_BADGES_LIST.map(house => {
                    const def = BADGE_DEFS[house as keyof typeof BADGE_DEFS];
                    const isSelected = currentHypeSquad === house;
                    return (
                      <button
                        key={house}
                        onClick={() => handleHypeSquad(house)}
                        disabled={savingHypeSquad || isSelected}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-150"
                        style={{
                          background: isSelected ? `${def.color}18` : 'rgba(255,255,255,0.04)',
                          border: `2px solid ${isSelected ? def.color : 'rgba(255,107,53,0.1)'}`,
                        }}
                      >
                        <div className="w-10 h-10" style={{ color: def.color }}>{def.icon}</div>
                        <span className="text-xs font-medium text-center" style={{ color: isSelected ? def.color : 'rgba(240,226,222,0.6)' }}>
                          {def.label.replace('HypeSquad ', '')}
                        </span>
                        {isSelected && <span className="text-xs font-bold" style={{ color: def.color }}>✓ Active</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'account' && (
            <div className="p-8 max-w-xl">
              <h1 className="text-xl font-bold text-white mb-1">Account</h1>
              <p className="text-sm mb-8" style={{ color: 'rgba(240,226,222,0.45)' }}>Manage your account security.</p>

              <div
                className="rounded-xl p-5 mb-6"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,107,53,0.1)' }}
              >
                <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,107,53,0.6)' }}>Account Info</div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: 'rgba(240,226,222,0.4)' }}>Email</div>
                    <div className="text-sm text-white">{user.email}</div>
                  </div>
                </div>
              </div>

              <div
                className="rounded-xl p-5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,107,53,0.1)' }}
              >
                <div className="text-white font-bold mb-1">Change Password</div>
                {passwordError && (
                  <div className="rounded-lg px-3 py-2 text-sm mb-4" style={{ background: 'rgba(255,59,85,0.12)', color: '#ff3b55', border: '1px solid rgba(255,59,85,0.25)' }}>
                    {passwordError}
                  </div>
                )}
                <form onSubmit={handleChangePassword} className="space-y-4 mt-4">
                  <div>
                    <label className={labelClass} style={{ color: 'rgba(255,107,53,0.7)' }}>Current Password</label>
                    <input type="password" value={currentPassword} onChange={e => { setCurrentPassword(e.target.value); setPasswordError(''); }} className={inputClass} required />
                  </div>
                  <div>
                    <label className={labelClass} style={{ color: 'rgba(255,107,53,0.7)' }}>New Password</label>
                    <input type="password" value={newPassword} onChange={e => { setNewPassword(e.target.value); setPasswordError(''); }} className={inputClass} required minLength={8} />
                  </div>
                  <div>
                    <label className={labelClass} style={{ color: 'rgba(255,107,53,0.7)' }}>Confirm New Password</label>
                    <input type="password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setPasswordError(''); }} className={inputClass} required />
                  </div>
                  <button type="submit" disabled={savingPassword} className="nexus-gradient-btn w-full py-2.5 rounded-lg font-semibold text-sm">
                    {savingPassword ? 'Changing...' : 'Change Password'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {tab === 'admin' && isStaff && (
            <div className="p-8">
              <h1 className="text-xl font-bold text-white mb-1">Admin Panel</h1>
              <p className="text-sm mb-7" style={{ color: 'rgba(240,226,222,0.45)' }}>Manage users and assign badges.</p>

              <div className="flex gap-2 mb-6">
                <input
                  value={adminSearch}
                  onChange={e => setAdminSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchAdminUsers(adminSearch)}
                  placeholder="Search by username..."
                  className="flex-1 nexus-glass-input rounded-lg px-3.5 py-2.5 text-sm"
                />
                <button
                  onClick={() => fetchAdminUsers(adminSearch)}
                  disabled={adminLoading}
                  className="nexus-gradient-btn px-5 py-2.5 rounded-lg text-sm font-semibold flex-shrink-0"
                >
                  {adminLoading ? '...' : 'Search'}
                </button>
              </div>

              <div className="space-y-4">
                {adminUsers.map(u => (
                  <div
                    key={u.id}
                    className="rounded-xl p-4"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,107,53,0.1)' }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.username} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #ff6b35, #ff2d55)' }}>
                          {u.username[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-white font-semibold text-sm">{u.username}<span className="font-normal" style={{ color: 'rgba(240,226,222,0.4)' }}>#{u.discriminator}</span></div>
                        <div className="text-xs" style={{ color: 'rgba(240,226,222,0.35)' }}>{u.email}</div>
                      </div>
                      {u.badges?.length > 0 && <div className="ml-auto"><UserBadges badges={u.badges} size="sm" /></div>}
                    </div>
                    <div className="pt-3" style={{ borderTop: '1px solid rgba(255,107,53,0.08)' }}>
                      <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,107,53,0.5)' }}>Badges</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(BADGE_DEFS).map(([badgeKey, def]) => {
                          const hasIt = (u.badges || []).includes(badgeKey);
                          return (
                            <button
                              key={badgeKey}
                              onClick={() => hasIt ? handleRevokeBadge(u.id, badgeKey) : handleAwardBadge(u.id, badgeKey)}
                              title={hasIt ? `Remove ${def.label}` : `Award ${def.label}`}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
                              style={{
                                background: hasIt ? 'rgba(255,59,85,0.12)' : 'rgba(255,255,255,0.05)',
                                border: `1px solid ${hasIt ? 'rgba(255,59,85,0.3)' : 'rgba(255,107,53,0.12)'}`,
                                color: hasIt ? '#ff3b55' : 'rgba(240,226,222,0.5)',
                              }}
                            >
                              <span style={{ color: def.color }} className="w-3.5 h-3.5 inline-flex flex-shrink-0">{def.icon}</span>
                              {hasIt ? '−' : '+'} {def.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                {adminUsers.length === 0 && !adminLoading && (
                  <div className="text-center py-12" style={{ color: 'rgba(240,226,222,0.25)' }}>
                    <div className="text-4xl mb-3 opacity-40">🔍</div>
                    <div className="text-sm">Search for a user to manage their badges</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSettingsModal;
