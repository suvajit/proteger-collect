import React, { createContext, useContext, useState } from 'react';
import { api } from '../api/client';

interface User { id: string; username: string; fullName: string; role: string; mustResetPw: boolean; }
interface AuthCtx { user: User | null; login: (u: string, p: string) => Promise<void>; logout: () => void; }

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const s = localStorage.getItem('user');
    return s ? JSON.parse(s) : null;
  });

  const login = async (username: string, password: string) => {
    const res = await api.post<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', { username, password });
    localStorage.setItem('accessToken', res.accessToken);
    localStorage.setItem('refreshToken', res.refreshToken);
    localStorage.setItem('user', JSON.stringify(res.user));
    setUser(res.user);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
}
