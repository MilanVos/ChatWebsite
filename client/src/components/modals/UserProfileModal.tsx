import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import useStore from '../../store/useStore';
import UserBadges from '../UserBadges';
import { format } from 'date-fns';

interface Props {
  userId: string;
  onClose: () => void;
}

interface ProfileUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  banner?: string;
  bio?: string;
  status: string;
  custom_status?: string;
  created_at: string;
  badges: string[];
}

const statusLabel = (status: string) => {
  if (status === 'online') return { text: 'Online', color: 'text-discord-green' };
  if (status === 'idle') return { text: 'Idle', color: 'text-discord-yellow' };
  if (status === 'dnd') return { text: 'Do Not Disturb', color: 'text-discord-red' };
  return { text: 'Offline', color: 'text-discord-text-muted' };
};

const statusDotColor = (status: string) => {
  if (status === 'online') return 'bg-discord-green';
  if (status === 'idle') return 'bg-discord-yellow';
  if (status === 'dnd') return 'bg-discord-red';
  return 'bg-gray-500';
};

const UserProfileModal: React.FC<Props> = ({ userId, onClose }) => {
  const currentUser = useStore(s => s.user);
  const { setActiveDM, addDM } = useStore();
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/users/${userId}`)
      .then(res => setProfile(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  const handleOpenDM = async () => {
    try {
      const res = await api.post(`/dms/open/${userId}`);
      const dmRes = await api.get('/dms');
      const dm = dmRes.data.find((d: any) => d.id === res.data.id);
      if (dm) {
        addDM(dm);
        setActiveDM(dm);
      }
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  const isSelf = currentUser?.id === userId;
  const st = profile ? statusLabel(profile.status) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-discord-gray rounded-xl shadow-2xl overflow-hidden w-80"
        onClick={e => e.stopPropagation()}
      >
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="w-8 h-8 border-2 border-discord-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : profile ? (
          <>
            <div className="relative">
              {profile.banner ? (
                <div className="h-24 w-full">
                  <img src={profile.banner} alt="banner" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="h-24 w-full bg-gradient-to-br from-discord-accent to-purple-700" />
              )}

              <div className="absolute left-4 -bottom-8">
                <div className="relative">
                  {profile.avatar ? (
                    <img
                      src={profile.avatar}
                      alt={profile.username}
                      className="w-16 h-16 rounded-full border-4 border-discord-gray"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full border-4 border-discord-gray bg-discord-accent flex items-center justify-center text-white font-bold text-2xl">
                      {profile.username[0].toUpperCase()}
                    </div>
                  )}
                  <div className={`absolute bottom-1 right-0 w-4 h-4 rounded-full border-2 border-discord-gray ${statusDotColor(profile.status)}`} />
                </div>
              </div>
            </div>

            <div className="pt-10 px-4 pb-4">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <div className="text-white font-bold text-lg leading-tight">
                    {profile.username}
                    <span className="text-discord-text-muted font-normal text-sm">#{profile.discriminator}</span>
                  </div>
                  {st && (
                    <div className={`text-xs font-medium ${st.color}`}>{st.text}</div>
                  )}
                  {profile.custom_status && (
                    <div className="text-discord-text-muted text-xs mt-0.5">{profile.custom_status}</div>
                  )}
                </div>
                {profile.badges.length > 0 && (
                  <UserBadges badges={profile.badges} size="md" />
                )}
              </div>

              <div className="border-t border-discord-lighter my-3" />

              {profile.bio && (
                <div className="mb-3">
                  <div className="text-discord-text-muted text-xs font-bold uppercase tracking-wide mb-1">About Me</div>
                  <p className="text-discord-text text-sm leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
                </div>
              )}

              <div className="mb-4">
                <div className="text-discord-text-muted text-xs font-bold uppercase tracking-wide mb-1">Member Since</div>
                <div className="text-discord-text text-sm">
                  {format(new Date(profile.created_at), 'MMM d, yyyy')}
                </div>
              </div>

              {!isSelf && (
                <button
                  onClick={handleOpenDM}
                  className="w-full bg-discord-accent hover:bg-discord-accent-hover text-white text-sm font-medium py-2 rounded transition-colors"
                >
                  Send Message
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="p-8 text-discord-text-muted text-center text-sm">User not found</div>
        )}
      </div>
    </div>
  );
};

export default UserProfileModal;
