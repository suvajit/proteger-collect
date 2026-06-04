import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';

interface Issue {
  id: string;
  itemTitle: string;
  categoryName: string;
  remark: string | null;
  completedAt: string | null;
  isResolved: boolean;
  resolvedAt: string | null;
  resolutionRemark: string | null;
  sheet: { id: string; sheetDate: string; supervisor: { fullName: string } };
}

function formatDuration(from: string, to: string): string {
  const hours = (new Date(to).getTime() - new Date(from).getTime()) / 3_600_000;
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export default function IssuesPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ data: Issue[]; total: number }>({
    queryKey: ['issues', from, to],
    queryFn: () => {
      const p = new URLSearchParams();
      if (from) p.set('from', from);
      if (to) p.set('to', to);
      return api.get(`/admin/issues?${p}`);
    },
  });

  const issues = (data?.data ?? []).filter(i =>
    filter === 'all' ? true : filter === 'open' ? !i.isResolved : i.isResolved
  );

  return (
    <div style={{ padding: 32 }}>
      <PageHeader title="Issues" subtitle={`${data?.total ?? 0} flagged items`} />

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ fontSize: 13, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
          From <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={inp} />
        </label>
        <label style={{ fontSize: 13, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
          To <input type="date" value={to} onChange={e => setTo(e.target.value)} style={inp} />
        </label>
        <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 3, gap: 2 }}>
          {(['all', 'open', 'resolved'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '5px 14px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: filter === f ? '#fff' : 'transparent',
                color: filter === f ? '#111827' : '#6b7280',
                boxShadow: filter === f ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>Loading…</div>
        ) : issues.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>No issues found</div>
        ) : issues.map(i => (
          <div key={i.id}>
            <div
              onClick={() => setExpanded(expanded === i.id ? null : i.id)}
              style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #f3f4f6', gap: 14, cursor: 'pointer' }}
            >
              {/* Status dot */}
              <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                background: i.isResolved ? '#059669' : '#dc2626' }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{i.itemTitle}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  {i.categoryName} · {i.sheet.supervisor.fullName} · {new Date(i.sheet.sheetDate).toLocaleDateString()}
                </div>
                {i.remark && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, fontStyle: 'italic' }}>"{i.remark}"</div>}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                {i.isResolved ? (
                  <Badge label="Resolved" variant="success" />
                ) : (
                  <Badge label="Open" variant="danger" />
                )}
                {i.completedAt && i.isResolved && i.resolvedAt && (
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>
                    TTR: {formatDuration(i.completedAt, i.resolvedAt)}
                  </span>
                )}
                <Link to={`/sheets/${i.sheet.id}`} onClick={e => e.stopPropagation()} style={{ color: '#1a56db', fontSize: 13, fontWeight: 500 }}>Sheet →</Link>
                <span style={{ color: '#d1d5db', fontSize: 16 }}>{expanded === i.id ? '▴' : '▾'}</span>
              </div>
            </div>

            {/* Expanded resolution detail */}
            {expanded === i.id && (
              <div style={{ background: '#f9fafb', padding: '16px 20px 16px 44px', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 }}>Issue Details</div>
                    <div style={{ fontSize: 13 }}><span style={{ color: '#9ca3af' }}>Reported: </span>{i.completedAt ? new Date(i.completedAt).toLocaleString() : '—'}</div>
                    <div style={{ fontSize: 13, marginTop: 4 }}><span style={{ color: '#9ca3af' }}>Remark: </span>{i.remark || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 }}>Resolution</div>
                    {i.isResolved ? (
                      <>
                        <div style={{ fontSize: 13 }}><span style={{ color: '#9ca3af' }}>Resolved at: </span>{new Date(i.resolvedAt!).toLocaleString()}</div>
                        <div style={{ fontSize: 13, marginTop: 4 }}><span style={{ color: '#9ca3af' }}>Remark: </span>{i.resolutionRemark || '—'}</div>
                        {i.completedAt && <div style={{ fontSize: 13, marginTop: 4 }}><span style={{ color: '#9ca3af' }}>Time to resolve: </span><strong>{formatDuration(i.completedAt, i.resolvedAt!)}</strong></div>}
                      </>
                    ) : (
                      <div style={{ fontSize: 13, color: '#dc2626' }}>Not yet resolved</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const inp: React.CSSProperties = { border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '6px 10px', fontSize: 13, outline: 'none' };
