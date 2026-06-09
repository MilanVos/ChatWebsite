import React, { useState } from 'react';
import api from '../../utils/api';
import useStore from '../../store/useStore';

interface Props {
  onClose: () => void;
}

type ChannelType = 'text' | 'voice';

const CreateChannelModal: React.FC<Props> = ({ onClose }) => {
  const { activeServer, addChannel } = useStore();
  const [name, setName] = useState('');
  const [type, setType] = useState<ChannelType>('text');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !activeServer) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post(`/servers/${activeServer.id}/channels`, {
        name: name.trim().toLowerCase().replace(/\s+/g, '-'),
        type,
        topic: topic.trim() || undefined,
      });
      addChannel(res.data);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create channel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-discord-gray rounded-xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-white text-xl font-bold">Create Channel</h2>
          <button onClick={onClose} className="text-discord-text-muted hover:text-white transition-colors text-xl">✕</button>
        </div>
        <p className="text-discord-text-muted text-sm mb-5">In {activeServer?.name}</p>

        {error && <div className="bg-red-500/20 text-discord-red rounded p-3 mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="block text-discord-text-muted text-xs font-bold uppercase tracking-wide mb-2">
              Channel Type
            </label>
            <div className="flex flex-col gap-2">
              {(['text', 'voice'] as ChannelType[]).map(t => (
                <label
                  key={t}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors
                    ${type === t ? 'bg-discord-lighter border-discord-accent' : 'bg-discord-dark border-transparent hover:border-discord-lighter'}`}
                >
                  <input
                    type="radio"
                    name="type"
                    value={t}
                    checked={type === t}
                    onChange={() => setType(t)}
                    className="sr-only"
                  />
                  <span className="text-xl">{t === 'text' ? '#' : '🔊'}</span>
                  <div>
                    <div className="text-white font-medium text-sm capitalize">{t}</div>
                    <div className="text-discord-text-muted text-xs">
                      {t === 'text' ? 'Send messages, images, GIFs, and more' : 'Hang out together with voice and video'}
                    </div>
                  </div>
                  {type === t && (
                    <svg className="w-5 h-5 text-discord-accent ml-auto flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                    </svg>
                  )}
                </label>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-discord-text-muted text-xs font-bold uppercase tracking-wide mb-1.5">
              Channel Name
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-discord-text-muted font-bold">
                {type === 'text' ? '#' : '🔊'}
              </span>
              <input
                value={name}
                onChange={e => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                className="w-full bg-discord-dark text-discord-text rounded pl-8 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-discord-accent text-sm"
                placeholder="new-channel"
                maxLength={100}
                required
              />
            </div>
          </div>

          {type === 'text' && (
            <div className="mb-6">
              <label className="block text-discord-text-muted text-xs font-bold uppercase tracking-wide mb-1.5">
                Topic <span className="normal-case font-normal">(optional)</span>
              </label>
              <input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                className="w-full bg-discord-dark text-discord-text rounded px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-discord-accent text-sm"
                placeholder="Let everyone know how to use this channel!"
                maxLength={1024}
              />
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-white rounded font-medium hover:underline transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2.5 bg-discord-accent hover:bg-discord-accent-hover text-white rounded font-medium transition-colors disabled:opacity-50"
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
