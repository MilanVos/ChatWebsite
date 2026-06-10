import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import useStore from '../store/useStore';

const Login = () => {
  const navigate = useNavigate();
  const { setUser } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="nexus-orb w-96 h-96 bg-orange-600 -top-24 -left-24" style={{ animationDelay: '0s' }} />
      <div className="nexus-orb w-80 h-80 bg-red-700 -bottom-16 -right-16" style={{ animationDelay: '4s' }} />
      <div className="nexus-orb w-64 h-64 bg-orange-500 top-1/2 left-1/2" style={{ animationDelay: '8s', transform: 'translate(-50%,-50%)' }} />

      <div className="relative z-10 w-full max-w-md">
        <div className="nexus-glass-panel rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
              style={{ background: 'linear-gradient(135deg, #ff6b35, #ff2d55)', boxShadow: '0 8px 32px rgba(255,107,53,0.4)' }}>
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
            <p className="text-sm" style={{ color: 'rgba(240,226,222,0.55)' }}>Sign in to your Nexus account</p>
          </div>

          {error && (
            <div className="rounded-lg px-4 py-3 mb-5 text-sm flex items-center gap-2"
              style={{ background: 'rgba(255,59,85,0.12)', border: '1px solid rgba(255,59,85,0.3)', color: '#ff6b7a' }}>
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgba(240,226,222,0.5)' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="nexus-glass-input w-full rounded-lg px-4 py-2.5 text-sm"
                placeholder="Enter your email"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgba(240,226,222,0.5)' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="nexus-glass-input w-full rounded-lg px-4 py-2.5 text-sm"
                placeholder="Enter your password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="nexus-gradient-btn w-full rounded-xl py-3 text-sm mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center mt-6 text-sm" style={{ color: 'rgba(240,226,222,0.45)' }}>
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold" style={{ color: '#ff8c42' }}>
              Create one
            </Link>
          </p>
        </div>

        <p className="text-center mt-4 text-xs" style={{ color: 'rgba(240,226,222,0.25)' }}>
          Nexus Chat — Connect without limits
        </p>
      </div>
    </div>
  );
};

export default Login;
