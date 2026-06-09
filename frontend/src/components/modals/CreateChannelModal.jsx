import React, { useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import useStore from '../../store/useStore';

const CreateChannelModal = ({ categoryId, onClose }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('text');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const { activeServer, addChannel } = useStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Channel name required');
    setLoading(true);
    try {
      const res = await api.post('/channels', {
        server_id: activeServer.id,
        category_id: categoryId,
        name: name.trim(),
        type,
        topic: topic.trim() || undefined
      });
      addChannel(res.data);
      toast.success('Channel created!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create channel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-discord-gray rounded-lg p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-white mb-4">Create Channel</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-2">Channel Type</label>
            <div className="space-y-2">
              {[['text', 'Text Channel', '# A text-based channel for messages'], ['voice', 'Voice Channel', '🔊 A voice-based channel for calls']].map(([val, label, desc]) => (
                <label key={val} className={`flex items-start gap-3 p-3 rounded cursor-pointer border transition-colors
                  ${type === val ? 'bg-discord-lighter border-discord-accent' : 'bg-discord-darkest border-transparent hover:bg-discord-lighter'}`}>
                  <input type="radio" value={val} checked={type === val} onChange={() => setType(val)} className="mt-1" />
                  <div>
                    <p className="text-white font-medium text-sm">{label}</p>
                    <p className="text-discord-text-muted text-xs">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-1">Channel Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              className="w-full bg-discord-darkest rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-discord-accent"
              placeholder="new-channel"
              maxLength={100}
              autoFocus
            />
          </div>

          {type === 'text' && (
            <div>
              <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-1">Channel Topic (optional)</label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                className="w-full bg-discord-darkest rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-discord-accent"
                placeholder="What's this channel about?"
                maxLength={1024}
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 text-discord-text hover:text-white py-2 rounded transition-colors">Cancel</button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 bg-discord-accent hover:bg-discord-accent-hover text-white font-medium py-2 rounded disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating...' : 'Create Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateChannelModal;
