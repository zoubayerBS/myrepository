
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { AppUser } from '@/types';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (user: AppUser) => void;
  logout: () => void;
  userData: AppUser | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => { },
  logout: () => { },
  userData: null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Basic initialization - restored from localStorage for "classic" feel
    const savedUser = localStorage.getItem('vacation_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        console.log('[AUTH DEBUG] Restoring user from localStorage:', parsed.username, parsed.uid);
        setUser(parsed);
      } catch (e) {
        console.error('[AUTH DEBUG] Failed to parse saved user', e);
      }
    }
    setLoading(false);
  }, []);

  const login = (userData: AppUser) => {
    console.log('[AUTH DEBUG] Login called:', userData.username, userData.uid);
    setUser(userData);
    localStorage.setItem('vacation_user', JSON.stringify(userData));
  };

  const logout = () => {
    console.log('[AUTH DEBUG] Logout called');
    setUser(null);
    localStorage.removeItem('vacation_user');
  };

  const value = { user, userData: user, loading, login, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
