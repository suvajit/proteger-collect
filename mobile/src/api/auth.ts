import { api } from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: string;
  mustResetPw: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/auth/login', { username, password });
  await AsyncStorage.multiSet([
    ['accessToken', res.accessToken],
    ['refreshToken', res.refreshToken],
    ['userId', res.user.id],
    ['user', JSON.stringify(res.user)],
  ]);
  return res;
}

export async function logout() {
  const refreshToken = await AsyncStorage.getItem('refreshToken');
  const userId = await AsyncStorage.getItem('userId');
  if (refreshToken && userId) {
    await api.post('/auth/logout', { refreshToken, userId }).catch(() => {});
  }
  await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userId', 'user']);
}

export async function getStoredUser(): Promise<User | null> {
  const raw = await AsyncStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}
