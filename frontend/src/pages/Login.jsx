import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import useStore from '../store/useStore';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setUser = useStore(s => s.setUser);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-discord-light flex items-center justify-center">
      <div className="bg-discord-gray rounded-lg p-8 w-full max-w-md shadow-2xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">Welcome back!</h1>
          <p className="text-discord-text-muted mt-1">We're so excited to see you again!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-1">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full bg-discord-darkest rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-discord-accent"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-1">
              Password
            </label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full bg-discord-darkest rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-discord-accent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-discord-accent hover:bg-discord-accent-hover text-white font-medium py-2 rounded transition-colors disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="mt-4 text-discord-text-muted text-sm">
          Need an account?{' '}
          <Link to="/register" className="text-discord-accent hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
