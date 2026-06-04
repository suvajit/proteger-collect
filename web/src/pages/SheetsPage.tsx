import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';

interface Sheet { id: string; sheetDate: string; status: string; submittedAt: string | null; supervisor: { fullName: string }; progress: { completed: number; total: number }; issueCount: number; completionPct: number; }
interface Response { data: Sheet[]; total: number; }

export default function SheetsPage() {
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('');

  const { data, isLoading, isError } = useQuery<Response>({
    queryKey: ['sheets', date, status],
    queryFn: () => {
      const params = new URLSearchParams();
      if (date) params.set('date', date);
      if (status) params.set('status', status);
      return api.get(`/admin/sheets?${params}`);
    },
  });

  return (
    <div style={{ padding: 32 }}>
      <PageHeader title="Submissions" subtitle={`${data?.total ?? 0} sheets`} />

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} />
        <select value={status} onChange={e => setStatus(e.target.value)} style={inp}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
        </select>
        {(date || status) && <button onClick={() => { setDate(''); setStatus(''); }} style={clearBtn}>Clear</button>}
      </div>

      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {['Date', 'Supervisor', 'Progress', 'Issues', 'Status', 'Submitted At', ''].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>Loading…</td></tr>
            ) : isError ? (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#dc2626' }}>Failed to load — your session may have expired. Try logging out and back in.</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>No submissions found</td></tr>
            ) : data?.data.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={td}>{new Date(s.sheetDate).toLocaleDateString()}</td>
                <td style={td}>{s.supervisor.fullName}</td>
                <td style={td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 80, height: 6, background: '#e5e7eb', borderRadius: 3 }}>
                      <div style={{ width: `${s.completionPct}%`, height: 6, background: '#1a56db', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{s.completionPct}%</span>
                  </div>
                </td>
                <td style={td}>{s.issueCount > 0 ? <Badge label={`${s.issueCount} issues`} variant="danger" /> : <span style={{ color: '#9ca3af' }}>—</span>}</td>
                <td style={td}><Badge label={s.status} variant={s.status === 'submitted' ? 'success' : 'warning'} /></td>
                <td style={td}>{s.submittedAt ? new Date(s.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                <td style={td}><Link to={`/sheets/${s.id}`} style={{ color: '#1a56db', fontWeight: 500 }}>View →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
const inp: React.CSSProperties = { border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none' };
const clearBtn: React.CSSProperties = { border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', background: '#fff', color: '#6b7280', fontSize: 14 };
const td: React.CSSProperties = { padding: '12px 16px', fontSize: 14, color: '#111827' };
