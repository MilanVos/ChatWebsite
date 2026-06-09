import React, { useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import useStore from '../../store/useStore';
import { getSocket } from '../../hooks/useSocket';

const JoinServerModal = ({ onClose }) => {
  const [invite, setInvite] = useState('');
  const [loading, setLoading] = useState(false);
  const { addServer, setActiveServer } = useStore();

  const extractCode = (input) => {
    const match = input.match(/([A-Z0-9]{6,16})/i);
    return match ? match[1].toUpperCase() : input.toUpperCase();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = extractCode(invite.trim());
    if (!code) return toast.error('Enter an invite code');
    setLoading(true);
    try {
      const res = await api.post(`/servers/join/${code}`);
      addServer(res.data);

      const full = await api.get(`/servers/${res.data.id}`);
      setActiveServer(full.data);

      const socket = getSocket();
      if (socket) socket.emit('server:join', res.data.id);

      toast.success(`Joined ${res.data.name}!`);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid invite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-discord-gray rounded-lg p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-white text-center mb-1">Join a Server</h2>
        <p className="text-discord-text-muted text-sm text-center mb-6">
          Enter an invite code to join an existing server.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-1">
              Invite Link or Code
            </label>
            <input
              type="text"
              value={invite}
              onChange={e => setInvite(e.target.value)}
              className="w-full bg-discord-darkest rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-discord-accent"
              placeholder="ABC123XY"
              autoFocus
            />
            <p className="text-xs text-discord-text-muted mt-1">Invites look like: ABC123XY</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 text-discord-text hover:text-white py-2 rounded transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !invite.trim()}
              className="flex-1 bg-discord-accent hover:bg-discord-accent-hover text-white font-medium py-2 rounded disabled:opacity-50 transition-colors"
            >
              {loading ? 'Joining...' : 'Join Server'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JoinServerModal;
