import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Register from './pages/Register';
import MainApp from './pages/MainApp';
import useStore from './store/useStore';
import api from './utils/api';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const user = useStore(s => s.user);
  if (!localStorage.getItem('token') || !user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App = () => {
  const { user, setUser } = useStore();
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !user) {
      api.get('/auth/me').then(res => setUser(res.data)).catch(() => localStorage.removeItem('token'));
    }
  }, []);

  return (
    <BrowserRouter>
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#18191c', color: '#dcddde', border: '1px solid #40444b' } }} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/*" element={<ProtectedRoute><MainApp /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
};
export default App;
