import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import Badge from '../components/Badge';

type EntryStatus = 'pending' | 'done' | 'issue' | 'na';
interface Entry { id: string; itemTitle: string; categoryName: string; status: EntryStatus; completedAt: string | null; remark: string | null; }
interface Sheet { id: string; sheetDate: string; status: string; submittedAt: string | null; supervisor: { fullName: string; username: string }; entries: Entry[]; }

const STATUS_VARIANT: Record<EntryStatus, 'success' | 'danger' | 'gray' | 'warning'> = { done: 'success', issue: 'danger', na: 'gray', pending: 'warning' };
const STATUS_LABEL: Record<EntryStatus, string> = { done: '✓ Done', issue: '⚠ Issue', na: 'N/A', pending: 'Pending' };

export default function SheetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const { data: sheet, isLoading } = useQuery<Sheet>({
    queryKey: ['sheet', id],
    queryFn: () => api.get(`/admin/sheets/${id}`),
  });

  const unlock = useMutation({
    mutationFn: () => api.post(`/admin/sheets/${id}/unlock`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sheet', id] });
      qc.invalidateQueries({ queryKey: ['sheets'] });
      setConfirming(false);
    },
  });

  if (isLoading) return <div style={{ padding: 32, color: '#9ca3af' }}>Loading…</div>;
  if (!sheet) return null;

  const grouped = sheet.entries.reduce<Record<string, Entry[]>>((acc, e) => {
    (acc[e.categoryName] ??= []).push(e);
    return acc;
  }, {});

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <Link to="/sheets" style={{ color: '#6b7280', fontSize: 13, display: 'inline-block', marginBottom: 16 }}>← Back to Submissions</Link>

      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>{new Date(sheet.sheetDate).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h2>
            <p style={{ color: '#6b7280', marginTop: 4 }}>Supervisor: <strong>{sheet.supervisor.fullName}</strong></p>
            {sheet.submittedAt && <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>Submitted at {new Date(sheet.submittedAt).toLocaleTimeString()}</p>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Badge label={sheet.status} variant={sheet.status === 'submitted' ? 'success' : 'warning'} />
            {sheet.status === 'submitted' && !confirming && (
              <button onClick={() => setConfirming(true)} style={unlockBtn}>
                🔓 Allow Resubmission
              </button>
            )}
            {confirming && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>Unlock for editing?</span>
                <button onClick={() => unlock.mutate()} disabled={unlock.isPending} style={{ ...unlockBtn, background: '#dc2626', color: '#fff', border: 'none' }}>
                  {unlock.isPending ? 'Unlocking…' : 'Confirm'}
                </button>
                <button onClick={() => setConfirming(false)} style={{ ...unlockBtn, color: '#6b7280' }}>Cancel</button>
              </div>
            )}
            {sheet.status === 'draft' && (
              <Badge label="Unlocked — awaiting resubmission" variant="warning" />
            )}
          </div>
        </div>
      </div>

      {Object.entries(grouped).map(([cat, entries]) => (
        <div key={cat} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ background: '#f3f4f6', padding: '10px 20px', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', color: '#374151', letterSpacing: 0.5 }}>{cat}</div>
          {entries.map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #f3f4f6', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{e.itemTitle}</div>
                {e.remark && <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2, fontStyle: 'italic' }}>{e.remark}</div>}
              </div>
              <div style={{ textAlign: 'right', minWidth: 120 }}>
                <Badge label={STATUS_LABEL[e.status]} variant={STATUS_VARIANT[e.status]} />
                {e.completedAt && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{new Date(e.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const unlockBtn: React.CSSProperties = { background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151' };
