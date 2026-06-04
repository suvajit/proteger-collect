import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { sheetsApi, Sheet, EntryStatus } from '../../src/api/sheets';

const STATUS_TEXT: Record<EntryStatus, string> = {
  pending: 'Pending',
  done: '✓ Done',
  issue: '⚠ Issue',
  na: 'N/A',
};

const STATUS_COLORS: Record<EntryStatus, { bg: string; text: string }> = {
  pending: { bg: '#f3f4f6', text: '#6b7280' },
  done: { bg: '#d1fae5', text: '#065f46' },
  issue: { bg: '#fee2e2', text: '#991b1b' },
  na: { bg: '#f3f4f6', text: '#374151' },
};

export default function SheetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    sheetsApi
      .getSheet(id)
      .then(setSheet)
      .catch((e) => Alert.alert('Error', e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a56db" />
      </View>
    );
  }

  if (!sheet) return null;

  const allEntries = sheet.categories.flatMap((c) =>
    [{ type: 'header', title: c.categoryName, id: `h-${c.categoryName}` } as any,
    ...c.entries.map((e) => ({ ...e, type: 'entry' }))]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>
            {new Date(sheet.sheetDate).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
          <Text style={styles.headerSub}>
            {sheet.progress.completed}/{sheet.progress.total} completed
            {sheet.submittedAt
              ? ` · Submitted ${new Date(sheet.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : ''}
          </Text>
        </View>
      </View>

      <FlatList
        data={allEntries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return <Text style={styles.categoryHeader}>{item.title}</Text>;
          }
          const colors = STATUS_COLORS[item.status as EntryStatus];
          return (
            <View style={[styles.entryRow, { backgroundColor: colors.bg }]}>
              <View style={styles.entryInfo}>
                <Text style={styles.entryTitle}>{item.itemTitle}</Text>
                {item.remark ? <Text style={styles.entryRemark}>{item.remark}</Text> : null}
              </View>
              <View style={styles.entryRight}>
                <Text style={[styles.entryStatus, { color: colors.text }]}>
                  {STATUS_TEXT[item.status as EntryStatus]}
                </Text>
                {item.completedAt && (
                  <Text style={styles.entryTime}>
                    {new Date(item.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}
              </View>
            </View>
          );
        }}
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
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: { padding: 4 },
  backText: { color: '#bfdbfe', fontSize: 18 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerSub: { color: '#bfdbfe', fontSize: 12, marginTop: 2 },
  categoryHeader: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  entryInfo: { flex: 1 },
  entryTitle: { fontSize: 14, color: '#111827', fontWeight: '500' },
  entryRemark: { fontSize: 12, color: '#6b7280', marginTop: 2, fontStyle: 'italic' },
  entryRight: { alignItems: 'flex-end', marginLeft: 12 },
  entryStatus: { fontSize: 12, fontWeight: '700' },
  entryTime: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
});
