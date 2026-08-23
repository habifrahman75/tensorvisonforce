// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('civicpulse_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); }
      catch { localStorage.removeItem('civicpulse_user'); }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login(email, password);
    setUser(res.user);
    localStorage.setItem('civicpulse_user', JSON.stringify(res.user));
    if (res.token) localStorage.setItem('civicpulse_token', res.token);
    return res.user;
  }, []);

  const register = useCallback(async (data) => {
    const res = await authApi.register(data);
    setUser(res.user);
    localStorage.setItem('civicpulse_user', JSON.stringify(res.user));
    if (res.token) localStorage.setItem('civicpulse_token', res.token);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    localStorage.removeItem('civicpulse_user');
    localStorage.removeItem('civicpulse_token');
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
