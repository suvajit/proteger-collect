import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './client';

const BASE_URL = 'http://localhost:3000';

export async function uploadPhoto(uri: string): Promise<string> {
  const token = await AsyncStorage.getItem('accessToken');
  const filename = uri.split('/').pop() ?? 'photo.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  const formData = new FormData();
  formData.append('file', { uri, name: filename, type: mimeType } as any);

  const res = await fetch(`${BASE_URL}/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? `Upload failed (${res.status})`);
  }
  const data = await res.json();
  return data.photoUrl;
}

export type EntryStatus = 'pending' | 'done' | 'issue' | 'na';

export interface CheckEntry {
  id: string;
  itemId: string;
  itemTitle: string;
  categoryName: string;
  status: EntryStatus;
  completedAt: string | null;
  remark: string | null;
  photoUrl: string | null;
  requiresPhoto: boolean;
  isResolved: boolean;
  resolvedAt: string | null;
  resolutionRemark: string | null;
}

export interface CategoryGroup {
  categoryName: string;
  entries: CheckEntry[];
}

export interface Sheet {
  id: string;
  sheetDate: string;
  status: 'draft' | 'submitted';
  submittedAt: string | null;
  progress: { completed: number; total: number };
  categories: CategoryGroup[];
}

export const sheetsApi = {
  getToday: () => api.get<Sheet>('/sheets/today'),
  getMine: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return api.get<Sheet[]>(`/sheets/mine${params.toString() ? '?' + params : ''}`);
  },
  getSheet: (id: string) => api.get<Sheet>(`/sheets/${id}`),
  updateEntry: (sheetId: string, entryId: string, data: { status?: EntryStatus; remark?: string }) =>
    api.patch<CheckEntry>(`/sheets/${sheetId}/entries/${entryId}`, data),
  submit: (sheetId: string) => api.post<{ status: string }>(`/sheets/${sheetId}/submit`, {}),
  resolveEntry: (sheetId: string, entryId: string, data: { resolutionRemark?: string }) =>
    api.post<CheckEntry>(`/sheets/${sheetId}/entries/${entryId}/resolve`, data),
};
