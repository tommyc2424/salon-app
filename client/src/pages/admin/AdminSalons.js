import { useState } from 'react';
import { api } from '../../lib/api';
import { useSalon } from '../../context/SalonContext';
import SalonSettings from './SalonSettings';

const EMPTY = { name: '', slug: '', description: '', address: '', phone: '', email: '' };

export default function AdminSalons() {
  const { memberships, currentSalon, switchSalon } = useSalon();
  const [showForm, setShowForm]         = useState(false);
  const [form, setForm]                 = useState(EMPTY);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');
  const [selectedSalonId, setSelectedSalonId] = useState(null);

  const mySalons = memberships.filter(m => m.role === 'owner' || m.role === 'admin');
  const selectedSalon = mySalons.find(m => m.salon_id === selectedSalonId) ?? null;

  function toggleSettings(salonId) {
    setSelectedSalonId(prev => prev === salonId ? null : salonId);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/api/salons', form);
      window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>My Salons</h1>
        <button className="btn-primary" onClick={() => setShowForm(s => !s)}>
          {showForm ? 'Cancel' : '+ New Salon'}
        </button>
      </div>

      {showForm && (
        <div className="admin-form-card">
          <h2>Create New Salon</h2>
          <form onSubmit={handleCreate} className="admin-form">
            <div className="form-row-group">
              <div className="form-row">
                <label>Salon Name</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-row">
                <label>URL Slug</label>
                <input required placeholder="my-salon" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} />
              </div>
            </div>
            <div className="form-row">
              <label>Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="form-row">
              <label>Address</label>
              <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="form-row-group">
              <div className="form-row">
                <label>Phone</label>
                <input
                  type="tel"
                  placeholder="(555) 555-5555"
                  value={form.phone}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    let formatted = digits;
                    if (digits.length >= 7) formatted = `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
                    else if (digits.length >= 4) formatted = `(${digits.slice(0,3)}) ${digits.slice(3)}`;
                    else if (digits.length > 0) formatted = `(${digits}`;
                    setForm(f => ({ ...f, phone: formatted }));
                  }}
                />
              </div>
              <div className="form-row">
                <label>Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            {error && <p className="auth-error">{error}</p>}
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="salon-list">
        {mySalons.map(m => (
          <div key={m.salon_id}>
            <div
              className={`salon-admin-card clickable ${currentSalon?.id === m.salon_id ? 'active-salon' : ''} ${selectedSalonId === m.salon_id ? 'settings-open' : ''}`}
              onClick={() => toggleSettings(m.salon_id)}
            >
              <div className="salon-admin-avatar">
                {m.logo_url
                  ? <img src={m.logo_url} alt={m.name} />
                  : <span>{m.name[0]}</span>}
              </div>
              <div className="salon-admin-info">
                <h3>{m.name}</h3>
                <span className={`role-badge ${m.role}`}>{m.role}</span>
              </div>
              <div className="salon-admin-actions" onClick={e => e.stopPropagation()}>
                {currentSalon?.id === m.salon_id
                  ? <span className="active-label">Active</span>
                  : <button className="btn-secondary" onClick={() => switchSalon(m.salon_id)}>Switch</button>
                }
                <span className="settings-chevron">{selectedSalonId === m.salon_id ? '▲' : '▼'}</span>
              </div>
            </div>

            {selectedSalonId === m.salon_id && selectedSalon && (
              <SalonSettings
                salon={selectedSalon}
                onClose={() => setSelectedSalonId(null)}
              />
            )}
          </div>
        ))}
        {mySalons.length === 0 && (
          <div className="empty-state"><p>You don't manage any salons yet. Create one above.</p></div>
        )}
      </div>
    </div>
  );
}
