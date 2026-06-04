import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import PageHeader from '../components/PageHeader';

interface Settings { notification_email?: string; }

export default function SettingsPage() {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: () => api.get('/admin/settings'),
  });

  useEffect(() => {
    if (data?.notification_email) setEmail(data.notification_email);
  }, [data]);

  const save = useMutation({
    mutationFn: (d: Settings) => api.patch('/admin/settings', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const saveError = (save.error as Error)?.message;

  return (
    <div style={{ padding: 32, maxWidth: 600 }}>
      <PageHeader title="Settings" subtitle="System configuration" />

      <div style={{ background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Email Notifications</h3>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
          When a supervisor submits a checksheet, an alert email will be sent to this address
          with a summary of the submission and any issues reported.
        </p>

        {saveError && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {saveError}
          </div>
        )}

        {saved && (
          <div style={{ background: '#d1fae5', color: '#065f46', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            ✓ Settings saved successfully
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Notification email address
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="manager@yourcompany.com"
            disabled={isLoading}
            style={{
              width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8,
              padding: '10px 14px', fontSize: 14, outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>
            Leave blank to disable email notifications.
          </p>
        </div>

        <button
          onClick={() => save.mutate({ notification_email: email || undefined })}
          disabled={save.isPending}
          style={{
            background: '#1a56db', color: '#fff', border: 'none',
            padding: '10px 24px', borderRadius: 8, fontWeight: 600,
            fontSize: 14, cursor: 'pointer', opacity: save.isPending ? 0.7 : 1,
          }}
        >
          {save.isPending ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Email content</h3>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>Each notification email includes:</p>
        <ul style={{ fontSize: 13, color: '#374151', lineHeight: 2, paddingLeft: 20 }}>
          <li>Supervisor name and submission date</li>
          <li>Completion summary (Done / Issues / Pending / Completion %)</li>
          <li>Full table of all issues found with category, item, and remark</li>
          <li>Sheet ID and submission timestamp</li>
        </ul>
        <div style={{ marginTop: 16, padding: '12px 16px', background: '#f0f9ff', borderRadius: 8, borderLeft: '3px solid #1a56db' }}>
          <p style={{ fontSize: 12, color: '#1e40af', margin: 0 }}>
            <strong>SMTP configuration</strong> is set in the server <code>.env</code> file
            (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS). Contact your DevOps engineer to configure the mail server.
          </p>
        </div>
      </div>
    </div>
  );
}
