import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useSalon } from '../../context/SalonContext';

const EMPTY = { full_name: '', bio: '', avatar_url: '' };

export default function AdminStaff() {
  const { currentSalon } = useSalon();
  const [staff, setStaff]       = useState([]);
  const [form, setForm]         = useState(EMPTY);
  const [editing, setEditing]   = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!currentSalon) return;
    api.get(`/api/salons/${currentSalon.id}/admin/staff`).then(setStaff).finally(() => setLoading(false));
  }, [currentSalon?.id]);

  function openNew() { setForm(EMPTY); setEditing(null); setShowForm(true); }
  function openEdit(s) {
    setForm({ full_name: s.full_name, bio: s.bio ?? '', avatar_url: s.avatar_url ?? '' });
    setEditing(s.id);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const base = `/api/salons/${currentSalon.id}/admin`;
    if (editing) {
      const updated = await api.patch(`${base}/staff/${editing}`, form);
      setStaff(prev => prev.map(s => s.id === editing ? { ...s, ...updated } : s));
    } else {
      const created = await api.post(`${base}/staff`, form);
      setStaff(prev => [...prev, created]);
    }
    setShowForm(false);
  }

  async function toggleActive(s) {
    const updated = await api.patch(`/api/salons/${currentSalon.id}/admin/staff/${s.id}`, { is_active: !s.is_active });
    setStaff(prev => prev.map(x => x.id === s.id ? { ...x, ...updated } : x));
  }

  if (loading) return <div className="page"><p>Loading…</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Staff</h1>
        <button className="btn-primary" onClick={openNew}>+ Add Staff</button>
      </div>

      {showForm && (
        <div className="admin-form-card">
          <h2>{editing ? 'Edit Staff Member' : 'New Staff Member'}</h2>
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-row">
              <label>Full Name</label>
              <input required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="form-row">
              <label>Bio</label>
              <textarea rows={3} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
            </div>
            <div className="form-row">
              <label>Avatar URL</label>
              <input value={form.avatar_url} onChange={e => setForm(f => ({ ...f, avatar_url: e.target.value }))} />
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn-primary">{editing ? 'Save' : 'Create'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="staff-admin-grid">
        {staff.map(s => (
          <div key={s.id} className={`staff-admin-card ${!s.is_active ? 'inactive' : ''}`}>
            <div className="staff-avatar">{s.full_name[0]}</div>
            <div className="staff-admin-info">
              <h3>{s.full_name}</h3>
              <p>{s.bio}</p>
            </div>
            <div className="staff-admin-actions">
              <button className={`toggle-btn ${s.is_active ? 'active' : ''}`} onClick={() => toggleActive(s)}>
                {s.is_active ? 'Active' : 'Inactive'}
              </button>
              <button className="action-btn" onClick={() => openEdit(s)}>Edit</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
