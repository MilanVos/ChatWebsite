import React, { useState } from 'react';
import api from '../../utils/api';
import useStore from '../../store/useStore';

interface Props {
  onClose: () => void;
}

const JoinServerModal: React.FC<Props> = ({ onClose }) => {
  const { addServer, setActiveServer } = useStore();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const extractCode = (input: string) => {
    const match = input.match(/(?:discord\.gg\/|invite\/)([a-zA-Z0-9-]+)/);
    return match ? match[1] : input.trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = extractCode(inviteCode);
    if (!code) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post(`/servers/join/${code}`);
      addServer(res.data);
      setActiveServer(res.data);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid invite link or code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-discord-gray rounded-xl p-8 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-white text-2xl font-bold text-center mb-2">Join a Server</h2>
        <p className="text-discord-text-muted text-sm text-center mb-6">
          Enter an invite link below to join an existing server.
        </p>

        {error && <div className="bg-red-500/20 text-discord-red rounded p-3 mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-discord-text-muted text-xs font-bold uppercase tracking-wide mb-1.5">
              Invite Link or Code
            </label>
            <input
              value={inviteCode}
              onChange={e => { setInviteCode(e.target.value); setError(''); }}
              className="w-full bg-discord-dark text-discord-text rounded px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-discord-accent text-sm"
              placeholder="https://discord.gg/hTKzmak"
              required
            />
          </div>

          <div className="bg-discord-dark rounded-lg p-4 mb-6">
            <div className="text-discord-text-muted text-xs font-bold uppercase mb-2">Invite links look like</div>
            <div className="text-discord-text-dim text-sm">hTKzmak</div>
            <div className="text-discord-text-dim text-sm">discord.gg/hTKzmak</div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-white rounded font-medium hover:underline transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading || !inviteCode.trim()}
              className="flex-1 bg-discord-accent hover:bg-discord-accent-hover text-white py-2.5 rounded font-medium transition-colors disabled:opacity-50"
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
