import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';

interface User { id: string; fullName: string; username: string; email: string | null; role: string; isActive: boolean; mustResetPw: boolean; createdAt: string; }

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 440, boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: '#9ca3af', cursor: 'pointer' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function UsersPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [tempPw, setTempPw] = useState('');
  const [form, setForm] = useState({ fullName: '', username: '', email: '', role: 'supervisor', tempPassword: '' });

  const { data: users } = useQuery<User[]>({ queryKey: ['users'], queryFn: () => api.get('/admin/users') });

  const createUser = useMutation({
    mutationFn: (d: any) => api.post('/admin/users', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setShowModal(false); setForm({ fullName: '', username: '', email: '', role: 'supervisor', tempPassword: '' }); },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.patch(`/admin/users/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const resetPw = useMutation({
    mutationFn: ({ id, tempPassword }: { id: string; tempPassword: string }) => api.post(`/admin/users/${id}/reset-password`, { tempPassword }),
    onSuccess: () => { setResetUser(null); setTempPw(''); },
  });

  return (
    <div style={{ padding: 32 }}>
      <PageHeader title="Users" subtitle={`${users?.length ?? 0} accounts`}
        action={<button onClick={() => setShowModal(true)} style={primaryBtn}>+ New User</button>}
      />

      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            {['Name', 'Username', 'Role', 'Status', 'Must Reset', 'Actions'].map(h => <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {users?.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6', opacity: u.isActive ? 1 : 0.55 }}>
                <td style={td}><div style={{ fontWeight: 500 }}>{u.fullName}</div><div style={{ fontSize: 12, color: '#9ca3af' }}>{u.email || ''}</div></td>
                <td style={td}><code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4, fontSize: 13 }}>{u.username}</code></td>
                <td style={td}><Badge label={u.role} variant={u.role === 'admin' ? 'blue' : 'gray'} /></td>
                <td style={td}><Badge label={u.isActive ? 'Active' : 'Inactive'} variant={u.isActive ? 'success' : 'gray'} /></td>
                <td style={td}>{u.mustResetPw ? <Badge label="Yes" variant="warning" /> : <span style={{ color: '#9ca3af' }}>No</span>}</td>
                <td style={td}>
                  <button onClick={() => { setResetUser(u); }} style={ghostBtn}>Reset PW</button>
                  <button onClick={() => toggleActive.mutate({ id: u.id, isActive: !u.isActive })} style={{ ...ghostBtn, color: u.isActive ? '#dc2626' : '#059669', marginLeft: 4 }}>
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title="New User" onClose={() => setShowModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input style={formInp} placeholder="Full name" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
            <input style={formInp} placeholder="Username" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
            <input style={formInp} placeholder="Email (optional)" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <select style={formInp} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Admin</option>
            </select>
            <input style={formInp} placeholder="Temporary password (min 8 chars)" type="password" value={form.tempPassword} onChange={e => setForm(f => ({ ...f, tempPassword: e.target.value }))} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => setShowModal(false)} style={outlineBtn}>Cancel</button>
              <button onClick={() => createUser.mutate(form)} style={primaryBtn}>Create</button>
            </div>
          </div>
        </Modal>
      )}

      {resetUser && (
        <Modal title={`Reset password — ${resetUser.fullName}`} onClose={() => { setResetUser(null); setTempPw(''); }}>
          <input style={{ ...formInp, marginBottom: 20 }} placeholder="New temporary password" type="password" value={tempPw} onChange={e => setTempPw(e.target.value)} autoFocus />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => { setResetUser(null); setTempPw(''); }} style={outlineBtn}>Cancel</button>
            <button onClick={() => resetPw.mutate({ id: resetUser.id, tempPassword: tempPw })} style={primaryBtn}>Reset</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const td: React.CSSProperties = { padding: '12px 16px', fontSize: 14 };
const primaryBtn: React.CSSProperties = { background: '#1a56db', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' };
const outlineBtn: React.CSSProperties = { background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb', padding: '8px 18px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' };
const ghostBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#1a56db', fontSize: 13, fontWeight: 500, cursor: 'pointer' };
const formInp: React.CSSProperties = { width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none' };
