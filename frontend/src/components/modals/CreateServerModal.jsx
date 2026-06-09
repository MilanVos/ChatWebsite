import React, { useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import useStore from '../../store/useStore';
import { getSocket } from '../../hooks/useSocket';

const CreateServerModal = ({ onClose }) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const { addServer, setActiveServer } = useStore();

  const handleIconChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIcon(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Server name is required');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      if (icon) formData.append('icon', icon);

      const res = await api.post('/servers', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      addServer(res.data);

      const fullServer = await api.get(`/servers/${res.data.id}`);
      setActiveServer(fullServer.data);

      const socket = getSocket();
      if (socket) socket.emit('server:join', res.data.id);

      toast.success('Server created!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-discord-gray rounded-lg p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-white text-center mb-1">Customize your server</h2>
        <p className="text-discord-text-muted text-sm text-center mb-6">
          Give your server a personality with a name and icon.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-center">
            <label className="cursor-pointer">
              <div className="w-20 h-20 rounded-full bg-discord-lighter flex items-center justify-center border-2 border-dashed border-discord-text-muted hover:border-white transition-colors overflow-hidden">
                {preview ? (
                  <img src={preview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <svg className="w-8 h-8 text-discord-text-muted mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <p className="text-xs text-discord-text-muted mt-1">Upload</p>
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleIconChange} />
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-1">
              Server Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-discord-darkest rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-discord-accent"
              placeholder="My Awesome Server"
              required
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-transparent text-discord-text hover:text-white py-2 rounded transition-colors">
              Back
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 bg-discord-accent hover:bg-discord-accent-hover text-white font-medium py-2 rounded disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateServerModal;
