import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://localhost:3000';

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem('accessToken');
}

async function tryRefresh(): Promise<string | null> {
  const refreshToken = await AsyncStorage.getItem('refreshToken');
  const userId = await AsyncStorage.getItem('userId');
  if (!refreshToken || !userId) return null;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken, userId }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    await AsyncStorage.multiSet([
      ['accessToken', data.accessToken],
      ['refreshToken', data.refreshToken],
    ]);
    return data.accessToken;
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // On 401, try a token refresh once then retry
  if (res.status === 401 && !path.includes('/auth/')) {
    token = await tryRefresh();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      const retry = await fetch(`${BASE_URL}${path}`, { ...options, headers });
      if (!retry.ok) {
        // Refresh didn't help — clear auth so app redirects to login
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userId', 'user']);
        throw new Error('Session expired. Please log in again.');
      }
      return retry.json();
    }
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userId', 'user']);
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || body?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  get: <T>(path: string) => request<T>(path),
};
