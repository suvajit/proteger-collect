import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';

interface Category { id: string; name: string; sortOrder: number; isActive: boolean; _count: { items: number } }
interface Item { id: string; title: string; description: string | null; frequency: string; requiresPhoto: boolean; isActive: boolean; sortOrder: number; category: { id: string; name: string } }

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480, boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: '#9ca3af', cursor: 'pointer' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function ChecklistPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'categories' | 'items'>('items');
  const [showCatModal, setShowCatModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({ name: '' });
  const [itemForm, setItemForm] = useState({ categoryId: '', title: '', description: '', frequency: 'daily', requiresPhoto: false });

  const { data: cats } = useQuery<Category[]>({ queryKey: ['categories'], queryFn: () => api.get('/admin/categories') });
  const { data: items } = useQuery<Item[]>({ queryKey: ['items'], queryFn: () => api.get('/admin/items') });

  const createCat = useMutation({ mutationFn: (d: any) => api.post('/admin/categories', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setShowCatModal(false); setCatForm({ name: '' }); } });
  const updateCat = useMutation({ mutationFn: ({ id, ...d }: any) => api.patch(`/admin/categories/${id}`, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setEditCat(null); } });
  const deleteCat = useMutation({ mutationFn: (id: string) => api.delete(`/admin/categories/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }) });

  const createItem = useMutation({ mutationFn: (d: any) => api.post('/admin/items', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['items'] }); setShowItemModal(false); setItemForm({ categoryId: '', title: '', description: '', frequency: 'daily', requiresPhoto: false }); } });
  const updateItem = useMutation({ mutationFn: ({ id, ...d }: any) => api.patch(`/admin/items/${id}`, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['items'] }); setEditItem(null); } });
  const deleteItem = useMutation({ mutationFn: (id: string) => api.delete(`/admin/items/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }) });

  const openEditItem = (item: Item) => { setEditItem(item); setItemForm({ categoryId: item.category.id, title: item.title, description: item.description ?? '', frequency: item.frequency, requiresPhoto: item.requiresPhoto }); setShowItemModal(true); };
  const openEditCat = (cat: Category) => { setEditCat(cat); setCatForm({ name: cat.name }); setShowCatModal(true); };
  const closeItemModal = () => { setShowItemModal(false); setEditItem(null); setItemForm({ categoryId: '', title: '', description: '', frequency: 'daily', requiresPhoto: false }); };
  const closeCatModal = () => { setShowCatModal(false); setEditCat(null); setCatForm({ name: '' }); };

  return (
    <div style={{ padding: 32 }}>
      <PageHeader title="Checklist Management"
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowCatModal(true)} style={outlineBtn}>+ Category</button>
            <button onClick={() => setShowItemModal(true)} style={primaryBtn}>+ Item</button>
          </div>
        }
      />

      <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: '#f3f4f6', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {(['items', 'categories'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 13, background: tab === t ? '#fff' : 'transparent', color: tab === t ? '#111827' : '#6b7280', boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer' }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'categories' && (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          {cats?.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #f3f4f6', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600 }}>{c.name}</span>
                <span style={{ color: '#9ca3af', fontSize: 12, marginLeft: 10 }}>{c._count.items} active items</span>
              </div>
              <Badge label={c.isActive ? 'Active' : 'Inactive'} variant={c.isActive ? 'success' : 'gray'} />
              <button onClick={() => openEditCat(c)} style={ghostBtn}>Edit</button>
              {c.isActive && <button onClick={() => deleteCat.mutate(c.id)} style={{ ...ghostBtn, color: '#dc2626' }}>Deactivate</button>}
            </div>
          ))}
        </div>
      )}

      {tab === 'items' && (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {['Category', 'Item', 'Frequency', 'Photo', 'Status', ''].map(h => <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {items?.map(i => (
                <tr key={i.id} style={{ borderBottom: '1px solid #f3f4f6', opacity: i.isActive ? 1 : 0.5 }}>
                  <td style={td}><span style={{ fontSize: 12, color: '#6b7280' }}>{i.category.name}</span></td>
                  <td style={td}>{i.title}</td>
                  <td style={td}><Badge label={i.frequency} variant="blue" /></td>
                  <td style={td}>{i.requiresPhoto ? <Badge label="Required" variant="warning" /> : <span style={{ color: '#9ca3af' }}>—</span>}</td>
                  <td style={td}><Badge label={i.isActive ? 'Active' : 'Inactive'} variant={i.isActive ? 'success' : 'gray'} /></td>
                  <td style={td}>
                    <button onClick={() => openEditItem(i)} style={ghostBtn}>Edit</button>
                    {i.isActive && <button onClick={() => deleteItem.mutate(i.id)} style={{ ...ghostBtn, color: '#dc2626', marginLeft: 8 }}>Remove</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCatModal && (
        <Modal title={editCat ? 'Edit Category' : 'New Category'} onClose={closeCatModal}>
          <input style={{ ...formInp, marginBottom: 20 }} placeholder="Category name" value={catForm.name} onChange={e => setCatForm({ name: e.target.value })} autoFocus />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={closeCatModal} style={outlineBtn}>Cancel</button>
            <button onClick={() => editCat ? updateCat.mutate({ id: editCat.id, name: catForm.name }) : createCat.mutate(catForm)} style={primaryBtn}>
              {editCat ? 'Save' : 'Create'}
            </button>
          </div>
        </Modal>
      )}

      {showItemModal && (
        <Modal title={editItem ? 'Edit Item' : 'New Item'} onClose={closeItemModal}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <select style={formInp} value={itemForm.categoryId} onChange={e => setItemForm(f => ({ ...f, categoryId: e.target.value }))}>
              <option value="">Select category…</option>
              {cats?.filter(c => c.isActive).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input style={formInp} placeholder="Item title" value={itemForm.title} onChange={e => setItemForm(f => ({ ...f, title: e.target.value }))} />
            <input style={formInp} placeholder="Description (optional)" value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))} />
            <select style={formInp} value={itemForm.frequency} onChange={e => setItemForm(f => ({ ...f, frequency: e.target.value }))}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <input type="checkbox" checked={itemForm.requiresPhoto} onChange={e => setItemForm(f => ({ ...f, requiresPhoto: e.target.checked }))} />
              Requires photo
            </label>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={closeItemModal} style={outlineBtn}>Cancel</button>
              <button onClick={() => editItem ? updateItem.mutate({ id: editItem.id, ...itemForm }) : createItem.mutate(itemForm)} style={primaryBtn}>
                {editItem ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const td: React.CSSProperties = { padding: '12px 16px', fontSize: 14 };
const primaryBtn: React.CSSProperties = { background: '#1a56db', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' };
const outlineBtn: React.CSSProperties = { background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb', padding: '8px 18px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' };
const ghostBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#1a56db', fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '4px 8px' };
const formInp: React.CSSProperties = { width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none' };
