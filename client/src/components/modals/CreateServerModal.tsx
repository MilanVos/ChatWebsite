import React, { useState } from 'react';
import api from '../../utils/api';
import useStore from '../../store/useStore';

interface Props {
  onClose: () => void;
}

const CreateServerModal: React.FC<Props> = ({ onClose }) => {
  const { addServer, setActiveServer } = useStore();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIcon(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      if (icon) formData.append('icon', icon);
      const res = await api.post('/servers', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      addServer(res.data);
      setActiveServer(res.data);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create server');
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
        <h2 className="text-white text-2xl font-bold text-center mb-2">Customize Your Server</h2>
        <p className="text-discord-text-muted text-sm text-center mb-6">
          Give your new server a personality with a name and an icon. You can always change it later.
        </p>

        {error && <div className="bg-red-500/20 text-discord-red rounded p-3 mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="flex justify-center mb-6">
            <label className="cursor-pointer group">
              <input type="file" accept="image/*" onChange={handleIconChange} className="hidden" />
              <div className="w-20 h-20 rounded-full bg-discord-dark border-2 border-dashed border-discord-text-muted group-hover:border-discord-accent flex items-center justify-center overflow-hidden transition-colors">
                {preview ? (
                  <img src={preview} alt="Server icon preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <div className="text-2xl">📷</div>
                    <div className="text-discord-text-muted text-[10px] font-bold uppercase mt-1">Upload</div>
                  </div>
                )}
              </div>
            </label>
          </div>

          <div className="mb-6">
            <label className="block text-discord-text-muted text-xs font-bold uppercase tracking-wide mb-1.5">
              Server Name
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-discord-dark text-discord-text rounded px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-discord-accent text-sm"
              placeholder="My Awesome Server"
              maxLength={100}
              required
            />
          </div>

          <p className="text-discord-text-muted text-xs mb-6">
            By creating a server, you agree to Discord's Community Guidelines.
          </p>

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
              disabled={loading || !name.trim()}
              className="flex-1 bg-discord-accent hover:bg-discord-accent-hover text-white py-2.5 rounded font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Server'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateServerModal;
