import React, { useState } from 'react';
import useStore from '../store/useStore';
import api from '../utils/api';
import toast from 'react-hot-toast';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

const statusColors = {
  online: 'bg-discord-green',
  idle: 'bg-discord-yellow',
  dnd: 'bg-discord-red',
  offline: 'bg-discord-text-muted'
};

const FriendsPage = () => {
  const { friends, user, setFriends, setActiveDM } = useStore();
  const [tab, setTab] = useState('all');
  const [addForm, setAddForm] = useState('');
  const [sending, setSending] = useState(false);

  const accepted = friends.filter(f => f.status === 'accepted');
  const pending = friends.filter(f => f.status === 'pending');
  const incoming = pending.filter(f => f.addressee_id === user?.id);
  const outgoing = pending.filter(f => f.requester_id === user?.id);

  const handleAddFriend = async (e) => {
    e.preventDefault();
    const parts = addForm.split('#');
    if (parts.length !== 2) return toast.error('Format: Username#0000');
    const [username, discriminator] = parts;
    setSending(true);
    try {
      await api.post('/friends', { username: username.trim(), discriminator: discriminator.trim() });
      toast.success('Friend request sent!');
      setAddForm('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send request');
    } finally {
      setSending(false);
    }
  };

  const handleAccept = async (id) => {
    try {
      await api.patch(`/friends/${id}`, { action: 'accept' });
      const res = await api.get('/friends');
      setFriends(res.data);
      toast.success('Friend request accepted!');
    } catch {
      toast.error('Failed to accept request');
    }
  };

  const handleDecline = async (id) => {
    try {
      await api.patch(`/friends/${id}`, { action: 'decline' });
      setFriends(friends.filter(f => f.id !== id));
    } catch {
      toast.error('Failed to decline request');
    }
  };

  const handleRemove = async (userId) => {
    if (!confirm('Remove this friend?')) return;
    try {
      await api.delete(`/friends/${userId}`);
      const res = await api.get('/friends');
      setFriends(res.data);
    } catch {
      toast.error('Failed to remove friend');
    }
  };

  const handleOpenDM = async (friendId) => {
    try {
      const res = await api.post(`/dms/open/${friendId}`);
      const friend = accepted.find(f => f.friend_user_id === friendId);
      setActiveDM({ ...res.data, friend_id: friendId, username: friend?.username, avatar: friend?.avatar });
    } catch {
      toast.error('Failed to open DM');
    }
  };

  const displayFriends = tab === 'online'
    ? accepted.filter(f => f.status === 'online' || f.status === 'idle' || f.status === 'dnd')
    : tab === 'pending' ? [...incoming, ...outgoing] : accepted;

  return (
    <div className="flex flex-col h-full bg-discord-light">
      <div className="h-12 px-4 flex items-center gap-4 border-b border-discord-darker">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-discord-text-muted" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
          </svg>
          <span className="text-white font-bold">Friends</span>
        </div>
        <div className="w-px h-5 bg-discord-lighter" />
        {[['all', 'All'], ['online', 'Online'], ['pending', `Pending${incoming.length > 0 ? ` (${incoming.length})` : ''}`]].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-2 py-0.5 rounded text-sm font-medium transition-colors ${tab === key ? 'bg-discord-lighter text-white' : 'text-discord-text-muted hover:text-white'}`}
          >
            {label}
          </button>
        ))}
        <div className="ml-auto">
          <button
            onClick={() => setTab('add')}
            className="bg-discord-green hover:bg-green-500 text-white text-sm font-medium px-3 py-1 rounded transition-colors"
          >
            Add Friend
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'add' ? (
          <div className="max-w-xl">
            <h3 className="text-white font-bold text-lg mb-1">Add Friend</h3>
            <p className="text-discord-text-muted text-sm mb-4">You can add a friend with their username and tag.</p>
            <form onSubmit={handleAddFriend} className="flex gap-2">
              <input
                value={addForm}
                onChange={e => setAddForm(e.target.value)}
                placeholder="Enter a Username#0000"
                className="flex-1 bg-discord-darkest rounded px-4 py-2 text-white placeholder-discord-text-muted focus:outline-none focus:ring-2 focus:ring-discord-accent"
              />
              <button
                type="submit"
                disabled={sending || !addForm}
                className="bg-discord-accent hover:bg-discord-accent-hover text-white px-4 py-2 rounded font-medium disabled:opacity-50 transition-colors"
              >
                Send Friend Request
              </button>
            </form>
          </div>
        ) : (
          <>
            <p className="text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-3">
              {tab === 'pending' ? 'PENDING' : tab === 'online' ? 'ONLINE' : 'ALL FRIENDS'} — {displayFriends.length}
            </p>
            {displayFriends.map(friend => (
              <div key={friend.id} className="flex items-center gap-4 px-3 py-2 rounded hover:bg-discord-lighter cursor-pointer border-t border-discord-darker group">
                <div className="relative flex-shrink-0">
                  {friend.avatar ? (
                    <img src={`${BACKEND_URL}${friend.avatar}`} alt="" className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-discord-accent flex items-center justify-center text-white font-bold">
                      {friend.username?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {friend.status && (
                    <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-discord-light ${statusColors[friend.status] || statusColors.offline}`} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{friend.username}</p>
                  <p className="text-discord-text-muted text-xs">
                    {friend.status === 'pending'
                      ? (friend.addressee_id === user?.id ? 'Incoming Friend Request' : 'Outgoing Friend Request')
                      : (friend.custom_status || friend.status || 'offline')
                    }
                  </p>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {friend.status === 'accepted' && (
                    <>
                      <button
                        onClick={() => handleOpenDM(friend.friend_user_id)}
                        className="w-8 h-8 bg-discord-gray rounded-full flex items-center justify-center text-discord-text-muted hover:text-white transition-colors"
                        title="Message"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleRemove(friend.friend_user_id)}
                        className="w-8 h-8 bg-discord-gray rounded-full flex items-center justify-center text-discord-text-muted hover:text-discord-red transition-colors"
                        title="Remove Friend"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  )}
                  {friend.addressee_id === user?.id && friend.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleAccept(friend.id)}
                        className="w-8 h-8 bg-discord-gray rounded-full flex items-center justify-center text-discord-text-muted hover:text-discord-green transition-colors"
                        title="Accept"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDecline(friend.id)}
                        className="w-8 h-8 bg-discord-gray rounded-full flex items-center justify-center text-discord-text-muted hover:text-discord-red transition-colors"
                        title="Decline"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {displayFriends.length === 0 && (
              <div className="text-center py-16 text-discord-text-muted">
                <div className="text-6xl mb-4">🥺</div>
                <p>No friends to show here!</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FriendsPage;
