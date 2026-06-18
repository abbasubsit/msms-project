import React, { createContext, useState, useEffect, useContext } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../api/axios';

export const AuthContext = createContext();

// ─── Custom hook for easy access ──────────────────────────────────────────────
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Restore session from localStorage on mount ──────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) {
          // Token expired — try refresh
          _tryRefresh().finally(() => setLoading(false));
        } else {
          setUser(decoded);
          setLoading(false);
        }
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  // ── Internal: attempt silent token refresh ───────────────────────────────────
  const _tryRefresh = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return;
    try {
      const res = await api.post('/auth/refresh', { refreshToken });
      const newToken = res.data.token;
      localStorage.setItem('token', newToken);
      setUser(jwtDecode(newToken));
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  // ── Login (supports email OR username for backward compat) ───────────────────
  const login = async (emailOrUsername, password) => {
    try {
      const isEmail = emailOrUsername.includes('@');
      const payload = isEmail
        ? { email: emailOrUsername, password }
        : { username: emailOrUsername, password };

      const res = await api.post('/auth/login', payload);
      const { token, refreshToken } = res.data;

      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);

      const decoded = jwtDecode(token);
      setUser(decoded);

      return { success: true, isFirstLogin: decoded.isFirstLogin };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Login failed',
      };
    }
  };

  // ── Change password (for first-login forced change & voluntary change) ────────
  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    try {
      const res = await api.put('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      // Server returns new token with isFirstLogin=false
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
        setUser(jwtDecode(res.data.token));
      }
      return { success: true, message: res.data.message };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Password change failed',
      };
    }
  };

  // ── Update profile ────────────────────────────────────────────────────────────
  const updateProfile = async (data) => {
    try {
      const res = await api.put('/auth/profile', data);
      // Refresh user state from profile endpoint
      const profileRes = await api.get('/auth/profile');
      // Update local token if returned
      return { success: true, user: profileRes.data.user };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Profile update failed',
      };
    }
  };

  // ── Forgot password ───────────────────────────────────────────────────────────
  const forgotPassword = async (email) => {
    try {
      const res = await api.post('/auth/forgot-password', { email });
      return { success: true, message: res.data.message, data: res.data };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to send reset email',
      };
    }
  };

  // ── Reset password via token ──────────────────────────────────────────────────
  const resetPassword = async (token, newPassword, confirmPassword) => {
    try {
      const res = await api.post(`/auth/reset-password/${token}`, {
        newPassword,
        confirmPassword,
      });
      return { success: true, message: res.data.message };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Password reset failed',
      };
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch { /* ignore */ }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  // ── Legacy register (disabled — kept for backward compat) ────────────────────
  const register = async () => {
    return { success: false, message: 'Registration is disabled. Contact your administrator.' };
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      register,        // kept for backward compat
      changePassword,
      updateProfile,
      forgotPassword,
      resetPassword,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
