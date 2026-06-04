import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { sheetsApi, Sheet } from '../../src/api/sheets';

function SheetRow({ sheet, onPress }: { sheet: Sheet; onPress: () => void }) {
  const date = new Date(sheet.sheetDate);
  const pct =
    sheet.progress.total === 0
      ? 0
      : Math.round((sheet.progress.completed / sheet.progress.total) * 100);

  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowDate}>
          {date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
        </Text>
        <Text style={styles.rowProgress}>
          {sheet.progress.completed}/{sheet.progress.total} items · {pct}%
        </Text>
        {sheet.submittedAt && (
          <Text style={styles.rowTime}>
            Submitted {new Date(sheet.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
      </View>
      <View style={[styles.statusBadge, sheet.status === 'submitted' ? styles.badgeSubmitted : styles.badgeDraft]}>
        <Text style={[styles.statusText, sheet.status === 'submitted' ? styles.textSubmitted : styles.textDraft]}>
          {sheet.status === 'submitted' ? 'Submitted' : 'Draft'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const data = await sheetsApi.getMine();
      setSheets(data);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a56db" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>My Submissions</Text>
      </View>
      <FlatList
        data={sheets}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => (
          <SheetRow
            sheet={item}
            onPress={() => router.push(`/sheet/${item.id}` as any)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No submissions yet</Text>
          </View>
        }
        contentContainerStyle={sheets.length === 0 ? styles.emptyContainer : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBar: {
    backgroundColor: '#1a56db',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  rowLeft: { flex: 1 },
  rowDate: { fontSize: 15, fontWeight: '600', color: '#111827' },
  rowProgress: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  rowTime: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeSubmitted: { backgroundColor: '#d1fae5' },
  badgeDraft: { backgroundColor: '#fef3c7' },
  statusText: { fontSize: 12, fontWeight: '600' },
  textSubmitted: { color: '#065f46' },
  textDraft: { color: '#92400e' },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 48 },
  emptyText: { color: '#9ca3af', fontSize: 16 },
});
