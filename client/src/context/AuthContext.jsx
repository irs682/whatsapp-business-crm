import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('crm_token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize auth session on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('crm_token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          if (res.success && res.data) {
            setUser(res.data);
          }
        } catch (err) {
          console.error('Session restore failed:', err);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.success && res.data) {
      const { token: jwtToken, user: authUser } = res.data;
      localStorage.setItem('crm_token', jwtToken);
      localStorage.setItem('crm_user', JSON.stringify(authUser));
      setToken(jwtToken);
      setUser(authUser);
      return authUser;
    }
    throw new Error(res.message || 'Login failed');
  };

  const logout = () => {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    setToken(null);
    setUser(null);
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    return user.permissions?.includes(permission);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
