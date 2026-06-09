import React, { useState } from 'react';
import api from '../utils/api';
import useStore from '../store/useStore';

type Tab = 'all' | 'online' | 'pending';

const FriendsPage = () => {
  const { friends, setActiveDM, addDM, updateFriend, user } = useStore();
  const [tab, setTab] = useState<Tab>('all');
  const [addInput, setAddInput] = useState('');
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  const accepted = friends.filter(f => f.status === 'accepted');
  const pending = friends.filter(f => f.status === 'pending');

  const displayed = tab === 'pending' ? pending : accepted;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');
    const parts = addInput.trim().split('#');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      setAddError('Please use the format Username#0000');
      return;
    }
    try {
      await api.post('/friends', { username: parts[0], discriminator: parts[1] });
      setAddInput('');
      setAddSuccess('Friend request sent!');
    } catch (err: any) {
      setAddError(err.response?.data?.message || 'Failed to send friend request');
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await api.patch(`/friends/${id}`, { action: 'accept' });
      updateFriend(id, { status: 'accepted' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDecline = async (id: string) => {
    try {
      await api.patch(`/friends/${id}`, { action: 'decline' });
      updateFriend(id, { status: 'declined' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleMessage = async (friend: any) => {
    try {
      const friendUserId = friend.friend_user_id ||
        (friend.addressee_id !== user?.id ? friend.addressee_id : friend.requester_id);
      const res = await api.post('/dms', { user_id: friendUserId });
      addDM(res.data);
      setActiveDM(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const isIncoming = (f: any) => f.addressee_id === user?.id;

  return (
    <div className="flex flex-col h-full bg-discord-light overflow-hidden">
      <div className="h-12 flex items-center px-4 gap-4 border-b border-discord-darker shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2 border-r border-discord-lighter pr-4">
          <svg className="w-5 h-5 text-discord-text-muted" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
          </svg>
          <span className="text-white font-bold text-sm">Friends</span>
        </div>
        <div className="flex gap-1">
          {([['all', 'All'], ['online', 'Online'], ['pending', `Pending${pending.length > 0 ? ` (${pending.length})` : ''}`]] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors
                ${tab === t ? 'bg-discord-lighter text-white' : 'text-discord-text-muted hover:bg-discord-lighter/40 hover:text-discord-text'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6">
          <div className="bg-discord-gray rounded-lg p-4 mb-6">
            <h2 className="text-white font-bold mb-1">Add Friend</h2>
            <p className="text-discord-text-muted text-sm mb-3">
              You can add friends with their Discord Tag. It's cAsE sEnSiTiVe!
            </p>
            <form onSubmit={handleAdd} className="flex gap-2">
              <input
                value={addInput}
                onChange={e => { setAddInput(e.target.value); setAddError(''); setAddSuccess(''); }}
                placeholder="Enter a Username#0000"
                className="flex-1 bg-discord-dark text-discord-text rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-discord-accent placeholder-discord-text-muted"
              />
              <button
                type="submit"
                className="bg-discord-accent hover:bg-discord-accent-hover text-white px-4 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap"
              >
                Send Friend Request
              </button>
            </form>
            {addError && <p className="text-discord-red text-sm mt-2">{addError}</p>}
            {addSuccess && <p className="text-discord-green text-sm mt-2">{addSuccess}</p>}
          </div>

          <div className="text-discord-text-muted text-xs font-bold uppercase tracking-wide mb-3">
            {tab === 'pending'
              ? `Pending — ${pending.length}`
              : tab === 'online'
              ? `Online — ${accepted.length}`
              : `All Friends — ${accepted.length}`}
          </div>

          <div className="flex flex-col gap-1">
            {displayed.map(friend => (
              <div
                key={friend.id}
                className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-discord-gray group transition-colors"
              >
                <div className="relative flex-shrink-0">
                  {friend.avatar ? (
                    <img src={friend.avatar} alt={friend.username} className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-discord-accent flex items-center justify-center text-white font-bold">
                      {(friend.username || '?')[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium text-sm">{friend.username}</div>
                  <div className="text-discord-text-muted text-xs">
                    {friend.status === 'pending'
                      ? isIncoming(friend) ? 'Incoming Friend Request' : 'Outgoing Friend Request'
                      : `#${friend.discriminator || '0000'}`}
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {friend.status === 'pending' && isIncoming(friend) && (
                    <>
                      <button
                        onClick={() => handleAccept(friend.id)}
                        title="Accept"
                        className="w-9 h-9 rounded-full bg-discord-dark hover:bg-discord-green text-discord-text-muted hover:text-white flex items-center justify-center transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDecline(friend.id)}
                        title="Decline"
                        className="w-9 h-9 rounded-full bg-discord-dark hover:bg-discord-red text-discord-text-muted hover:text-white flex items-center justify-center transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  )}
                  {friend.status === 'accepted' && (
                    <button
                      onClick={() => handleMessage(friend)}
                      title="Send Message"
                      className="w-9 h-9 rounded-full bg-discord-dark hover:bg-discord-lighter text-discord-text-muted hover:text-white flex items-center justify-center transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {displayed.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-6xl mb-4">
                {tab === 'pending' ? '📬' : '👋'}
              </div>
              <div className="text-discord-text-muted text-sm">
                {tab === 'pending' ? 'No pending friend requests' : 'No friends yet. Add some!'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendsPage;
