import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  login as apiLogin,
  logout as apiLogout,
  getAuthToken,
  SESSION_NONCE_VALUE,
} from '../services/api';

// Reactive auth state on top of the in-memory token store.
// Token is memory-only (no sessionStorage) — a page refresh requires re-login.
// This is the correct security trade-off for a banking workstation (VULN-06).
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Token starts null — memory-only, no sessionStorage bootstrap (VULN-06)
  const [token, setToken] = useState(() => getAuthToken());

  const login = async (username, password) => {
    const data = await apiLogin(username, password);
    setToken(getAuthToken());
    return data;
  };

  const logout = () => {
    apiLogout();
    setToken(null);
  };

  // VULN-09: verify the nonce before acting on session-expired events.
  // A bare CustomEvent dispatched by malicious JS will not carry the correct nonce
  // and will be ignored, preventing forced-logout denial-of-service.
  useEffect(() => {
    const onExpired = (e) => {
      if (e?.detail?.nonce === SESSION_NONCE_VALUE) {
        setToken(null);
      }
    };
    window.addEventListener('session-expired', onExpired);
    return () => window.removeEventListener('session-expired', onExpired);
  }, []);

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
