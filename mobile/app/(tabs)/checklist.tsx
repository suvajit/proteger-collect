import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { sheetsApi, Sheet, CheckEntry, EntryStatus, uploadPhoto } from '../../src/api/sheets';
import ProtegerLogo from '../../src/components/ProtegerLogo';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { enqueueEntry, getQueue, removeFromQueue, QueuedEntry } from '../../src/services/offlineQueue';
import 'react-native-get-random-values';

const STATUS_COLORS: Record<EntryStatus, string> = {
  pending: '#e5e7eb',
  done: '#d1fae5',
  issue: '#fee2e2',
  na: '#f3f4f6',
};

const STATUS_TEXT: Record<EntryStatus, string> = {
  pending: 'Pending',
  done: 'Done',
  issue: 'Issue',
  na: 'N/A',
};

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total === 0 ? 0 : (completed / total) * 100;
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
      </View>
      <Text style={styles.progressText}>
        {completed}/{total} items
      </Text>
    </View>
  );
}

interface RemarkModalProps {
  visible: boolean;
  entry: CheckEntry | null;
  onClose: () => void;
  onSave: (remark: string) => void;
}

function RemarkModal({ visible, entry, onClose, onSave }: RemarkModalProps) {
  const [remark, setRemark] = useState('');
  useEffect(() => {
    if (visible) setRemark(entry?.remark ?? '');
  }, [visible, entry]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{entry?.itemTitle}</Text>
          {entry?.status === 'issue' && (
            <Text style={styles.modalRequired}>* Remark required for Issue Found</Text>
          )}
          <TextInput
            style={styles.remarkInput}
            placeholder="Add remark..."
            placeholderTextColor="#9ca3af"
            multiline
            value={remark}
            onChangeText={setRemark}
            autoFocus
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => onSave(remark)}
            >
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface ResolveModalProps {
  visible: boolean;
  entry: CheckEntry | null;
  onClose: () => void;
  onSave: (remark: string) => void;
}

function ResolveModal({ visible, entry, onClose, onSave }: ResolveModalProps) {
  const [remark, setRemark] = useState('');
  useEffect(() => { if (visible) setRemark(''); }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Mark as Resolved</Text>
          <Text style={styles.modalRequired}>{entry?.itemTitle}</Text>
          <TextInput
            style={styles.remarkInput}
            placeholder="Resolution remark (what was done)..."
            placeholderTextColor="#9ca3af"
            multiline
            value={remark}
            onChangeText={setRemark}
            autoFocus
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#059669' }]} onPress={() => onSave(remark)}>
              <Text style={styles.saveBtnText}>Mark Resolved</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface EntryRowProps {
  entry: CheckEntry;
  sheetId: string;
  submitted: boolean;
  isOnline: boolean;
  onUpdate: (entry: CheckEntry) => void;
  onQueueUpdate: () => void;
}

function EntryRow({ entry, sheetId, submitted, isOnline, onUpdate, onQueueUpdate }: EntryRowProps) {
  const [updating, setUpdating] = useState(false);
  const [remarkModal, setRemarkModal] = useState(false);
  const [resolveModal, setResolveModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const pendingStatus = useRef<EntryStatus | null>(null);

  const handlePickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access in Settings to upload photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });
    if (result.canceled) return;
    setUploading(true);
    try {
      const photoUrl = await uploadPhoto(result.assets[0].uri);
      const updated = await sheetsApi.updateEntry(sheetId, entry.id, { photoUrl } as any);
      onUpdate(updated);
    } catch (e: any) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow camera access in Settings to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
    });
    if (result.canceled) return;
    setUploading(true);
    try {
      const photoUrl = await uploadPhoto(result.assets[0].uri);
      const updated = await sheetsApi.updateEntry(sheetId, entry.id, { photoUrl } as any);
      onUpdate(updated);
    } catch (e: any) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploading(false);
    }
  };

  const showPhotoOptions = () => {
    Alert.alert('Add Photo', undefined, [
      { text: 'Take Photo', onPress: handleTakePhoto },
      { text: 'Choose from Library', onPress: handlePickPhoto },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const setStatus = async (status: EntryStatus) => {
    if (submitted) return;
    if (status === 'issue') {
      pendingStatus.current = status;
      setRemarkModal(true);
      return;
    }
    if (!isOnline) {
      // Queue offline — optimistically update UI
      const clientOpId = `${entry.id}-${Date.now()}`;
      await enqueueEntry({ clientOpId, sheetId, entryId: entry.id, data: { status }, timestamp: Date.now() });
      onUpdate({ ...entry, status: status as EntryStatus, completedAt: new Date().toISOString() });
      onQueueUpdate();
      return;
    }
    setUpdating(true);
    try {
      const updated = await sheetsApi.updateEntry(sheetId, entry.id, { status });
      onUpdate(updated);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setUpdating(false);
    }
  };

  const saveRemark = async (remark: string) => {
    const status = pendingStatus.current ?? entry.status;
    if (status === 'issue' && !remark.trim()) {
      Alert.alert('Required', 'Please add a remark for Issue Found');
      return;
    }
    setRemarkModal(false);
    if (!isOnline) {
      const clientOpId = `${entry.id}-${Date.now()}`;
      await enqueueEntry({ clientOpId, sheetId, entryId: entry.id, data: { status, remark }, timestamp: Date.now() });
      onUpdate({ ...entry, status: status as EntryStatus, remark, completedAt: new Date().toISOString() });
      onQueueUpdate();
      pendingStatus.current = null;
      return;
    }
    setUpdating(true);
    try {
      const updated = await sheetsApi.updateEntry(sheetId, entry.id, { status, remark });
      onUpdate(updated);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setUpdating(false);
      pendingStatus.current = null;
    }
  };

  const handleResolve = async (resolutionRemark: string) => {
    setResolveModal(false);
    setUpdating(true);
    try {
      const updated = await sheetsApi.resolveEntry(sheetId, entry.id, { resolutionRemark });
      onUpdate(updated);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setUpdating(false);
    }
  };

  const isIssueUnresolved = entry.status === 'issue' && !entry.isResolved;
  const isIssueResolved = entry.status === 'issue' && entry.isResolved;
  const rowBg = isIssueResolved ? '#d1fae5' : STATUS_COLORS[entry.status];

  return (
    <View style={[styles.entryRow, { backgroundColor: rowBg }]}>
      <View style={styles.entryInfo}>
        <View style={styles.entryTitleRow}>
          <Text style={[styles.entryTitle, { flex: 1 }]}>{entry.itemTitle}</Text>
          {entry.requiresPhoto && !submitted && (
            uploading
              ? <ActivityIndicator size="small" color="#1a56db" style={{ marginLeft: 6 }} />
              : <TouchableOpacity onPress={showPhotoOptions} style={styles.photoBtn}>
                  <Text style={styles.photoBtnText}>{entry.photoUrl ? '📷✓' : '📷*'}</Text>
                </TouchableOpacity>
          )}
          {!entry.requiresPhoto && !submitted && entry.status !== 'issue' && (
            uploading
              ? <ActivityIndicator size="small" color="#9ca3af" style={{ marginLeft: 6 }} />
              : <TouchableOpacity onPress={showPhotoOptions} style={styles.photoBtn}>
                  <Text style={[styles.photoBtnText, { opacity: 0.45 }]}>{entry.photoUrl ? '📷✓' : '📷'}</Text>
                </TouchableOpacity>
          )}
        </View>
        {entry.requiresPhoto && !entry.photoUrl && !submitted && (
          <Text style={styles.photoRequired}>* Photo required</Text>
        )}
        {entry.photoUrl ? (
          <Image source={{ uri: entry.photoUrl }} style={styles.photoThumb} />
        ) : null}
        {entry.remark ? (
          <Text style={styles.entryRemark}>⚠ {entry.remark}</Text>
        ) : null}
        {isIssueResolved && entry.resolutionRemark ? (
          <Text style={[styles.entryRemark, { color: '#059669' }]}>✓ {entry.resolutionRemark}</Text>
        ) : null}
        {isIssueResolved && entry.resolvedAt ? (
          <Text style={styles.entryTime}>
            Resolved {new Date(entry.resolvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        ) : entry.completedAt ? (
          <Text style={styles.entryTime}>
            {new Date(entry.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        ) : null}
      </View>

      {!submitted && (
        <View style={styles.entryActions}>
          {updating ? (
            <ActivityIndicator size="small" color="#1a56db" />
          ) : isIssueUnresolved ? (
            // Issue not yet resolved — show resolve button prominently
            <TouchableOpacity
              style={styles.resolveBtn}
              onPress={() => setResolveModal(true)}
            >
              <Text style={styles.resolveBtnText}>Resolve</Text>
            </TouchableOpacity>
          ) : isIssueResolved ? (
            <View style={styles.resolvedBadge}>
              <Text style={styles.resolvedBadgeText}>✓ Resolved</Text>
            </View>
          ) : (
            <>
              {(['done', 'issue', 'na'] as EntryStatus[]).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.statusBtn, entry.status === s && styles.statusBtnActive]}
                  onPress={() => setStatus(s)}
                >
                  <Text style={[styles.statusBtnText, entry.status === s && styles.statusBtnTextActive]}>
                    {STATUS_TEXT[s]}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.remarkBtn}
                onPress={() => { pendingStatus.current = null; setRemarkModal(true); }}
              >
                <Text style={styles.remarkBtnText}>✎</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {submitted && (
        <View style={styles.entryStatusBadge}>
          <Text style={styles.entryStatusText}>
            {isIssueResolved ? '✓ Resolved' : STATUS_TEXT[entry.status]}
          </Text>
        </View>
      )}

      <RemarkModal
        visible={remarkModal}
        entry={entry}
        onClose={() => { setRemarkModal(false); pendingStatus.current = null; }}
        onSave={saveRemark}
      />
      <ResolveModal
        visible={resolveModal}
        entry={entry}
        onClose={() => setResolveModal(false)}
        onSave={handleResolve}
      />
    </View>
  );
}

interface CategorySectionProps {
  categoryName: string;
  entries: CheckEntry[];
  sheetId: string;
  submitted: boolean;
  isOnline: boolean;
  onUpdate: (entry: CheckEntry) => void;
  onQueueUpdate: () => void;
}

function CategorySection({ categoryName, entries, sheetId, submitted, isOnline, onUpdate, onQueueUpdate }: CategorySectionProps) {
  const [expanded, setExpanded] = useState(true);
  const doneCount = entries.filter((e) => e.status !== 'pending').length;
  const issueCount = entries.filter((e) => e.status === 'issue').length;

  return (
    <View style={styles.categorySection}>
      <TouchableOpacity style={styles.categoryHeader} onPress={() => setExpanded((v) => !v)} activeOpacity={0.7}>
        <View style={styles.categoryHeaderLeft}>
          <Text style={styles.categoryHeaderText}>{categoryName}</Text>
          <Text style={styles.categoryHeaderMeta}>
            {doneCount}/{entries.length}
            {issueCount > 0 ? `  ·  ⚠ ${issueCount}` : ''}
          </Text>
        </View>
        <Text style={styles.categoryChevron}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && entries.map((entry) => (
        <EntryRow
          key={entry.id}
          entry={entry}
          sheetId={sheetId}
          submitted={submitted}
          isOnline={isOnline}
          onUpdate={onUpdate}
          onQueueUpdate={onQueueUpdate}
        />
      ))}
    </View>
  );
}

export default function ChecklistScreen() {
  const { user, logout } = useAuth();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingSync, setPendingSync] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const isOnline = useNetworkStatus();

  const syncQueue = useCallback(async () => {
    const queue = await getQueue();
    if (queue.length === 0) return;
    setSyncing(true);
    let synced = 0;
    for (const item of queue) {
      try {
        await sheetsApi.updateEntry(item.sheetId, item.entryId, item.data as any);
        await removeFromQueue(item.clientOpId);
        synced++;
      } catch (_) {
        // Keep in queue, retry next time
      }
    }
    setSyncing(false);
    const remaining = await getQueue();
    setPendingSync(remaining.length);
    if (synced > 0) fetchSheet();
  }, []);

  const fetchSheet = useCallback(async () => {
    try {
      const s = await sheetsApi.getToday();
      setSheet(s);
    } catch (e: any) {
      if (!e.message?.includes('Session expired') && !e.message?.includes('Network')) {
        Alert.alert('Error', e.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Sync queued entries when coming back online
  useEffect(() => {
    if (isOnline) {
      syncQueue();
      fetchSheet();
    }
  }, [isOnline]);

  // Keep pending count updated
  useEffect(() => {
    getQueue().then((q) => setPendingSync(q.length));
  }, [sheet]);

  useEffect(() => {
    // Initial load — only fetch if we have a token
    import('@react-native-async-storage/async-storage').then(({ default: AS }) =>
      AS.getItem('accessToken').then((token) => { if (token) fetchSheet(); else setLoading(false); })
    );
  }, [fetchSheet]);

  useEffect(() => {
    // Refresh when app comes back to foreground (catches admin unlock)
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') { fetchSheet(); if (isOnline) syncQueue(); }
    });
    return () => sub.remove();
  }, [fetchSheet, isOnline, syncQueue]);

  useEffect(() => {
    // Poll every 30 seconds so unlock reflects without any user action
    const interval = setInterval(() => { fetchSheet(); if (isOnline) syncQueue(); }, 30_000);
    return () => clearInterval(interval);
  }, [fetchSheet]);

  const updateEntry = useCallback((updated: CheckEntry) => {
    setSheet((prev) => {
      if (!prev) return prev;
      const categories = prev.categories.map((cat) => ({
        ...cat,
        entries: cat.entries.map((e) => (e.id === updated.id ? updated : e)),
      }));
      const allEntries = categories.flatMap((c) => c.entries);
      const completed = allEntries.filter((e) => e.status !== 'pending').length;
      return { ...prev, categories, progress: { ...prev.progress, completed } };
    });
  }, []);

  const handleSubmit = async () => {
    if (!sheet) return;
    const pending = sheet.progress.total - sheet.progress.completed;
    const doSubmit = async () => {
      setSubmitting(true);
      try {
        await sheetsApi.submit(sheet.id);
        await fetchSheet();
      } catch (e: any) {
        Alert.alert('Error', e.message);
      } finally {
        setSubmitting(false);
      }
    };

    if (pending > 0) {
      Alert.alert(
        'Pending items',
        `${pending} item${pending > 1 ? 's are' : ' is'} still pending. Submit anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit', style: 'destructive', onPress: doSubmit },
        ],
      );
    } else {
      Alert.alert('Submit sheet?', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Submit', onPress: doSubmit },
      ]);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a56db" />
      </View>
    );
  }

  if (!sheet) return null;

  const submitted = sheet.status === 'submitted';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <ProtegerLogo width={110} color="#ffffff" />
          <Text style={styles.headerDate}>
            {new Date(sheet.sheetDate).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Offline / sync status banner */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            📴 Offline — entries will sync when reconnected{pendingSync > 0 ? ` (${pendingSync} pending)` : ''}
          </Text>
        </View>
      )}
      {isOnline && syncing && (
        <View style={styles.syncBanner}>
          <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.syncBannerText}>Syncing {pendingSync} queued entries…</Text>
        </View>
      )}
      {isOnline && !syncing && pendingSync > 0 && (
        <View style={styles.syncBanner}>
          <Text style={styles.syncBannerText}>⟳ {pendingSync} entries pending sync</Text>
        </View>
      )}

      <ProgressBar completed={sheet.progress.completed} total={sheet.progress.total} />

      {submitted && (
        <View style={styles.submittedBanner}>
          <Text style={styles.submittedBannerText}>
            ✓ Submitted {sheet.submittedAt ? new Date(sheet.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSheet(); }} />
        }
      >
        {sheet.categories.map((cat) => (
          <CategorySection
            key={cat.categoryName}
            categoryName={cat.categoryName}
            entries={cat.entries}
            sheetId={sheet.id}
            submitted={submitted}
            isOnline={isOnline}
            onUpdate={updateEntry}
            onQueueUpdate={() => getQueue().then((q) => setPendingSync(q.length))}
          />
        ))}
      </ScrollView>

      {!submitted && (
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Day's Sheet</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a56db',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerDate: { color: '#bfdbfe', fontSize: 12, marginTop: 2 },
  logoutText: { color: '#bfdbfe', fontSize: 14 },
  progressContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  progressBg: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, marginBottom: 6 },
  progressFill: { height: 8, backgroundColor: '#1a56db', borderRadius: 4 },
  progressText: { fontSize: 12, color: '#6b7280' },
  offlineBanner: {
    backgroundColor: '#374151',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  offlineBannerText: { color: '#f9fafb', fontSize: 12, fontWeight: '500' },
  syncBanner: {
    backgroundColor: '#1a56db',
    paddingHorizontal: 16,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncBannerText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  submittedBanner: {
    backgroundColor: '#d1fae5',
    padding: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#a7f3d0',
  },
  submittedBannerText: { color: '#065f46', fontWeight: '600', fontSize: 14 },
  list: { flex: 1 },
  listContent: { paddingBottom: 16 },
  categorySection: { marginBottom: 2 },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#e8edf5',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d9e8',
  },
  categoryHeaderLeft: { flex: 1 },
  categoryHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e3a6e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryHeaderMeta: { fontSize: 11, color: '#6b7280', marginTop: 1 },
  categoryChevron: { fontSize: 11, color: '#6b7280', marginLeft: 8 },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 12,
  },
  entryInfo: { flex: 1 },
  entryTitleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  entryTitle: { fontSize: 14, color: '#111827', fontWeight: '500', lineHeight: 20 },
  entryRemark: { fontSize: 12, color: '#6b7280', marginTop: 2, fontStyle: 'italic' },
  entryTime: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  photoRequired: { fontSize: 11, color: '#dc2626', marginTop: 2, fontWeight: '600' },
  photoBtn: { marginLeft: 6, padding: 2 },
  photoBtnText: { fontSize: 16 },
  photoThumb: { width: 56, height: 56, borderRadius: 6, marginTop: 6 },
  entryActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  statusBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    minWidth: 44,
    alignItems: 'center',
  },
  statusBtnActive: { borderColor: '#1a56db', backgroundColor: '#eff6ff' },
  statusBtnText: { fontSize: 11, color: '#6b7280', fontWeight: '500' },
  statusBtnTextActive: { color: '#1a56db', fontWeight: '700' },
  remarkBtn: { padding: 5 },
  remarkBtnText: { fontSize: 16, color: '#6b7280' },
  entryStatusBadge: {
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  entryStatusText: { fontSize: 11, fontWeight: '600', color: '#374151' },
  submitContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  submitBtn: {
    backgroundColor: '#1a56db',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 },
  modalRequired: { fontSize: 12, color: '#ef4444', marginBottom: 8 },
  remarkInput: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#111827',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#e5e7eb', alignItems: 'center' },
  cancelBtnText: { color: '#6b7280', fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#1a56db', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  resolveBtn: { backgroundColor: '#059669', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  resolveBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  resolvedBadge: { backgroundColor: '#d1fae5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  resolvedBadgeText: { color: '#065f46', fontSize: 12, fontWeight: '700' },
});
