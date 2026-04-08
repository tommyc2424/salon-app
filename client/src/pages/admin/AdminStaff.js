import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { useSalon } from '../../context/SalonContext';

const EMPTY = { full_name: '', bio: '' };

export default function AdminStaff({ embedded, salonId: propSalonId }) {
  const { currentSalon } = useSalon();
  const salonId = propSalonId ?? currentSalon?.id;
  const [staff, setStaff]             = useState([]);
  const [services, setServices]       = useState([]);
  const [form, setForm]               = useState(EMPTY);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [editing, setEditing]         = useState(null);
  const [showForm, setShowForm]       = useState(false);
  const [loading, setLoading]         = useState(true);

  // Photo state: 'keep' | 'remove' | File
  const [photoState, setPhotoState]     = useState('keep');
  const [photoPreview, setPhotoPreview] = useState('');
  const [uploading, setUploading]       = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!salonId) return;
    Promise.all([
      api.get(`/api/salons/${salonId}/admin/staff`),
      api.get(`/api/salons/${salonId}/admin/services`),
    ]).then(([stf, svcs]) => {
      setStaff(stf);
      setServices(svcs.filter(s => s.is_active));
    }).finally(() => setLoading(false));
  }, [salonId]);

  function openNew() {
    setForm(EMPTY); setEditing(null); setShowForm(true);
    setPhotoState('keep'); setPhotoPreview('');
    setSelectedServiceIds([]);
  }
  async function openEdit(s) {
    setForm({ full_name: s.full_name, bio: s.bio ?? '' });
    setEditing(s.id);
    setShowForm(true);
    setPhotoState('keep');
    setPhotoPreview(s.avatar_url ?? '');
    // Load existing service assignments
    const ids = await api.get(`/api/salons/${salonId}/admin/staff/${s.id}/services`).catch(() => []);
    setSelectedServiceIds(ids);
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoState(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function removePhoto() {
    setPhotoState('remove');
    setPhotoPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function resolveAvatarUrl(staffId) {
    if (photoState === 'keep')   return null; // no change
    if (photoState === 'remove') return '';   // explicit clear

    setUploading(true);
    try {
      const file = photoState;
      const ext  = file.name.split('.').pop().toLowerCase();
      const path = `staff-${staffId}.${ext}`;
      const { error } = await supabase.storage
        .from('salon-logos')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw new Error(error.message);
      const { data: { publicUrl } } = supabase.storage
        .from('salon-logos')
        .getPublicUrl(path);
      return publicUrl;
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const base = `/api/salons/${salonId}/admin`;
    let staffId;
    if (editing) {
      staffId = editing;
      const avatarUrl = await resolveAvatarUrl(editing);
      const body = { ...form };
      if (avatarUrl !== null) body.avatar_url = avatarUrl || null;
      const updated = await api.patch(`${base}/staff/${editing}`, body);
      setStaff(prev => prev.map(s => s.id === editing ? { ...s, ...updated } : s));
    } else {
      const created = await api.post(`${base}/staff`, form);
      staffId = created.id;
      const avatarUrl = await resolveAvatarUrl(created.id);
      if (avatarUrl) {
        const patched = await api.patch(`${base}/staff/${created.id}`, { avatar_url: avatarUrl });
        setStaff(prev => [...prev, { ...created, ...patched }]);
      } else {
        setStaff(prev => [...prev, created]);
      }
    }
    // Save service assignments
    await api.put(`${base}/staff/${staffId}/services`, { service_ids: selectedServiceIds });
    setShowForm(false);
  }

  async function toggleActive(s) {
    const updated = await api.patch(`/api/salons/${salonId}/admin/staff/${s.id}`, { is_active: !s.is_active });
    setStaff(prev => prev.map(x => x.id === s.id ? { ...x, ...updated } : x));
  }

  if (loading) return <div className={embedded ? '' : 'page'}><p>Loading…</p></div>;

  return (
    <div className={embedded ? '' : 'page'}>
      <div className="page-header">
        {embedded ? <h3>Staff</h3> : <h1>Staff</h1>}
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
              <label>Services Performed</label>
              <div className="staff-services-grid">
                {services.length === 0 ? (
                  <p className="settings-hint">No services found. Add services first.</p>
                ) : services.map(svc => (
                  <label key={svc.id} className="staff-service-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedServiceIds.includes(svc.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedServiceIds(prev => [...prev, svc.id]);
                        } else {
                          setSelectedServiceIds(prev => prev.filter(id => id !== svc.id));
                        }
                      }}
                    />
                    <span>{svc.name}</span>
                    <span className="settings-hint">${Number(svc.price).toFixed(0)} · {svc.duration_minutes}min</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="form-row">
              <label>Photo</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <div className="staff-photo-upload">
                {photoPreview ? (
                  <div className="staff-photo-preview">
                    <img src={photoPreview} alt="Staff" className="staff-photo-img" />
                    <div className="staff-photo-actions">
                      <button type="button" className="action-btn" onClick={() => fileInputRef.current.click()}>Change</button>
                      <button type="button" className="action-btn danger" onClick={removePhoto}>Remove</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className="logo-upload-dropzone" onClick={() => fileInputRef.current.click()}>
                    <span className="logo-upload-icon">↑</span>
                    <span>Upload photo</span>
                    <span className="settings-hint">PNG, JPG, WebP</span>
                  </button>
                )}
                {uploading && <p className="settings-hint">Uploading…</p>}
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={uploading}>
                {uploading ? 'Uploading…' : editing ? 'Save' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="staff-admin-grid">
        {staff.map(s => (
          <div key={s.id} className={`staff-admin-card ${!s.is_active ? 'inactive' : ''}`}>
            <div className="staff-avatar">
              {s.avatar_url ? <img src={s.avatar_url} alt={s.full_name} className="staff-avatar-img" /> : s.full_name[0]}
            </div>
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
