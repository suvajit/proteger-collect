import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import PageHeader from '../components/PageHeader';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ComposedChart, Legend,
} from 'recharts';

interface Summary {
  totalSheets: number; submittedSheets: number; completionPct: number;
  openIssues: number; totalEntries: number; completedEntries: number;
}

interface IssueStats {
  totalIssues: number; openIssues: number; resolvedIssues: number;
  mttrHours: number | null; mtbfHours: number | null;
  paretoChart: { category: string; count: number; cumulativePct: number }[];
  ageChart: { bucket: string; count: number }[];
}

function KpiCard({ label, value, sub, color = '#1a56db' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function formatHours(h: number | null): string {
  if (h === null) return '—';
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, color: '#111827' }}>{title}</h3>
      {children}
    </div>
  );
}

const PARETO_COLORS = ['#1a56db', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#eff6ff'];

function sevenDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [summaryDate, setSummaryDate] = useState(today);
  const [from, setFrom] = useState(sevenDaysAgo());
  const [to, setTo] = useState(today);

  const { data: summary, isLoading: sumLoading, isError: sumError } = useQuery<Summary>({
    queryKey: ['dashboard', summaryDate],
    queryFn: () => api.get(`/admin/dashboard/summary?date=${summaryDate}`),
  });

  const { data: stats, isLoading: statsLoading, isError: statsError } = useQuery<IssueStats>({
    queryKey: ['issue-stats', from, to],
    queryFn: () => {
      const p = new URLSearchParams();
      if (from) p.set('from', from);
      if (to) p.set('to', to);
      return api.get(`/admin/issues/stats?${p}`);
    },
  });

  return (
    <div style={{ padding: 32 }}>
      <PageHeader title="Dashboard" />

      {/* Daily summary row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Daily Summary for</span>
        <input type="date" value={summaryDate} onChange={e => setSummaryDate(e.target.value)} style={dateInp} />
      </div>

      {/* Today KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 16, marginBottom: 32 }}>
        {sumLoading ? <p style={{ color: '#9ca3af' }}>Loading…</p>
          : sumError ? <p style={{ color: '#dc2626' }}>Failed to load summary</p>
          : !summary ? null : <>
          <KpiCard label="Sheets Submitted" value={`${summary.submittedSheets}/${summary.totalSheets}`} sub={summaryDate} color="#1a56db" />
          <KpiCard label="Completion" value={`${summary.completionPct}%`} sub={`${summary.completedEntries}/${summary.totalEntries} items`} color="#059669" />
          <KpiCard label="Open Issues" value={summary.openIssues} sub="flagged" color={summary.openIssues > 0 ? '#dc2626' : '#059669'} />
        </>}
      </div>

      {/* Issue analytics date filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Issue Analytics</span>
        <label style={{ fontSize: 13, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
          From <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={dateInp} />
        </label>
        <label style={{ fontSize: 13, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
          To <input type="date" value={to} onChange={e => setTo(e.target.value)} style={dateInp} />
        </label>
        <button onClick={() => { setFrom(sevenDaysAgo()); setTo(today); }} style={clearBtn}>Reset</button>
      </div>

      {/* MTTR / MTBF + resolution KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 16, marginBottom: 32 }}>
        {statsLoading ? <p style={{ color: '#9ca3af' }}>Loading…</p>
          : statsError ? <p style={{ color: '#dc2626' }}>Failed to load issue stats</p>
          : !stats ? null : <>
          <KpiCard label="Total Issues" value={stats.totalIssues} sub="in range" color="#6366f1" />
          <KpiCard label="Resolved" value={stats.resolvedIssues} sub={stats.totalIssues ? `${Math.round(stats.resolvedIssues / stats.totalIssues * 100)}% resolution rate` : '—'} color="#059669" />
          <KpiCard label="Open" value={stats.openIssues} sub="awaiting resolution" color={stats.openIssues > 0 ? '#dc2626' : '#9ca3af'} />
          <KpiCard
            label="MTTR"
            value={formatHours(stats.mttrHours)}
            sub="mean time to resolve"
            color="#f59e0b"
          />
          <KpiCard
            label="MTBF"
            value={formatHours(stats.mtbfHours)}
            sub="mean time between issues"
            color="#8b5cf6"
          />
        </>}
      </div>

      {/* Charts row */}
      {!statsLoading && stats && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>

          {/* Pareto chart */}
          <ChartCard title="Issue Pareto — by Category">
            {stats.paretoChart.length === 0 ? (
              <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>No issues in range</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={stats.paretoChart} margin={{ top: 4, right: 24, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value, name) => name === 'cumulativePct' ? `${value}%` : value} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                  <Bar yAxisId="left" dataKey="count" name="Issues" fill="#1a56db" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="cumulativePct" name="Cumulative %" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Issue Age chart */}
          <ChartCard title="Open Issue Age Distribution">
            {stats.ageChart.every(b => b.count === 0) ? (
              <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>No open issues</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.ageChart} margin={{ top: 4, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Open Issues" radius={[4, 4, 0, 0]}
                    fill="#dc2626"
                    label={{ position: 'top', fontSize: 12, fill: '#374151' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      )}
    </div>
  );
}

const dateInp: React.CSSProperties = { border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '6px 10px', fontSize: 13, outline: 'none' };
const clearBtn: React.CSSProperties = { background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '6px 12px', fontSize: 13, color: '#6b7280', cursor: 'pointer' };
