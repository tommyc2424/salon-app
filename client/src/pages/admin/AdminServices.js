import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useSalon } from '../../context/SalonContext';

const EMPTY = { name: '', description: '', price: '', duration_minutes: 60, category_id: '', is_active: true };

export default function AdminServices({ embedded, salonId: propSalonId }) {
  const { currentSalon } = useSalon();
  const salonId = propSalonId ?? currentSalon?.id;
  const [services, setServices]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm]             = useState(EMPTY);
  const [editing, setEditing]       = useState(null);
  const [showForm, setShowForm]     = useState(false);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    if (!salonId) return;
    Promise.all([
      api.get(`/api/salons/${salonId}/admin/services`),
      api.get('/api/categories'),
    ]).then(([svcs, cats]) => {
      setServices(svcs);
      setCategories(cats);
    }).finally(() => setLoading(false));
  }, [salonId]);

  function openNew() { setForm(EMPTY); setEditing(null); setShowForm(true); }
  function openEdit(s) {
    setForm({ name: s.name, description: s.description ?? '', price: s.price, duration_minutes: s.duration_minutes, category_id: s.category_id ?? '', is_active: s.is_active });
    setEditing(s.id);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const base = `/api/salons/${salonId}/admin`;
    const payload = { ...form, price: parseFloat(form.price), duration_minutes: parseInt(form.duration_minutes), category_id: form.category_id || null };
    if (editing) {
      const updated = await api.patch(`${base}/services/${editing}`, payload);
      setServices(prev => prev.map(s => s.id === editing ? { ...s, ...updated } : s));
    } else {
      const created = await api.post(`${base}/services`, payload);
      setServices(prev => [...prev, created]);
    }
    setShowForm(false);
  }

  async function toggleActive(s) {
    const updated = await api.patch(`/api/salons/${salonId}/admin/services/${s.id}`, { is_active: !s.is_active });
    setServices(prev => prev.map(x => x.id === s.id ? { ...x, ...updated } : x));
  }

  async function deleteService(id) {
    if (!window.confirm('Delete this service?')) return;
    await api.delete(`/api/salons/${salonId}/admin/services/${id}`);
    setServices(prev => prev.filter(s => s.id !== id));
  }

  if (loading) return <div className={embedded ? '' : 'page'}><p>Loading...</p></div>;

  return (
    <div className={embedded ? '' : 'page'}>
      <div className="page-header">
        {embedded ? <h3>Services</h3> : <h1>Services</h1>}
        <button className="btn-primary" onClick={openNew}>+ Add Service</button>
      </div>

      {showForm && (
        <div className="admin-form-card">
          <h2>{editing ? 'Edit Service' : 'New Service'}</h2>
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-row">
              <label>Name</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-row">
              <label>Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="form-row-group">
              <div className="form-row">
                <label>Price ($)</label>
                <input required type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              </div>
              <div className="form-row">
                <label>Duration (min)</label>
                <input required type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <label>Category</label>
              <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                <option value="">No category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn-primary">{editing ? 'Save' : 'Create'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="admin-table">
        <div className="admin-table-header">
          <span>Name</span>
          <span>Category</span>
          <span>Price</span>
          <span>Duration</span>
          <span>Status</span>
          <span></span>
        </div>
        {services.map(s => (
          <div key={s.id} className={`admin-table-row ${!s.is_active ? 'inactive' : ''}`}>
            <span className="admin-table-name">{s.name}</span>
            <span>{s.category_name ?? '—'}</span>
            <span>${Number(s.price).toFixed(2)}</span>
            <span>{s.duration_minutes} min</span>
            <span>
              <button className={`toggle-btn ${s.is_active ? 'active' : ''}`} onClick={() => toggleActive(s)}>
                {s.is_active ? 'Active' : 'Inactive'}
              </button>
            </span>
            <span className="admin-table-actions">
              <button className="action-btn" onClick={() => openEdit(s)}>Edit</button>
              <button className="action-btn danger" onClick={() => deleteService(s.id)}>Delete</button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
