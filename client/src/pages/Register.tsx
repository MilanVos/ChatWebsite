import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import useStore from '../store/useStore';

const Register = () => {
  const navigate = useNavigate();
  const { setUser } = useStore();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/register', { username, email, password });
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-discord-darker flex items-center justify-center p-4">
      <div className="bg-discord-gray rounded-lg p-8 w-full max-w-md shadow-xl">
        <h1 className="text-white text-2xl font-bold text-center mb-2">Create an account</h1>
        <p className="text-discord-text-muted text-center mb-6 text-sm">Join the conversation today!</p>
        {error && <div className="bg-red-500/20 text-discord-red rounded p-3 mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-discord-text-muted text-xs font-bold uppercase tracking-wide mb-1.5">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-discord-dark text-discord-text rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-discord-accent text-sm"
              required
              minLength={2}
              maxLength={32}
            />
          </div>
          <div>
            <label className="block text-discord-text-muted text-xs font-bold uppercase tracking-wide mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-discord-dark text-discord-text rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-discord-accent text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-discord-text-muted text-xs font-bold uppercase tracking-wide mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-discord-dark text-discord-text rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-discord-accent text-sm"
              required
              minLength={8}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-discord-accent hover:bg-discord-accent-hover text-white rounded py-2.5 font-medium transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? 'Creating account...' : 'Continue'}
          </button>
        </form>
        <p className="text-discord-text-muted text-sm mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-discord-accent hover:underline">Log In</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
