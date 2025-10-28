
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { findUserById } from './local-data';
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
  login: () => {},
  logout: () => {},
  userData: null,
});

const USER_SESSION_KEY = 'user_session_uid';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserSession = async () => {
      setLoading(true);
      try {
        const storedUid = localStorage.getItem(USER_SESSION_KEY);
        if (storedUid) {
          const userData = await findUserById(storedUid);
          if (userData) {
            setUser(userData);
          } else {
            localStorage.removeItem(USER_SESSION_KEY);
            setUser(null);
          }
        }
      } catch (e) {
        console.error("Failed to restore session", e);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkUserSession();
  }, []);

  const login = (userData: AppUser) => {
    localStorage.setItem(USER_SESSION_KEY, userData.uid);
    setUser(userData);
  };  
  
  const logout = () => {
    localStorage.removeItem(USER_SESSION_KEY);
    setUser(null);
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
