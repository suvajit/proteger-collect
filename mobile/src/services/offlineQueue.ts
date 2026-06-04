import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'offline_entry_queue';

export interface QueuedEntry {
  clientOpId: string;
  sheetId: string;
  entryId: string;
  data: { status?: string; remark?: string; photoUrl?: string };
  timestamp: number;
}

export async function enqueueEntry(entry: QueuedEntry): Promise<void> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const queue: QueuedEntry[] = raw ? JSON.parse(raw) : [];
  // Replace if same entryId already queued (latest wins)
  const filtered = queue.filter((q) => q.entryId !== entry.entryId);
  filtered.push(entry);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

export async function getQueue(): Promise<QueuedEntry[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function removeFromQueue(clientOpId: string): Promise<void> {
  const queue = await getQueue();
  const filtered = queue.filter((q) => q.clientOpId !== clientOpId);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
