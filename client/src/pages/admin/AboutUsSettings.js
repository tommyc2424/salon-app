import { useState } from 'react';
import { api } from '../../lib/api';
import { useSalon } from '../../context/SalonContext';

export default function AboutUsSettings({ salon }) {
  const { updateCurrentSalon, currentSalon } = useSalon();

  const [description, setDescription] = useState(salon.description ?? '');
  const [address, setAddress]         = useState(salon.address ?? '');
  const [phone, setPhone]             = useState(salon.phone ?? '');
  const [email, setEmail]             = useState(salon.email ?? '');
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);

  const isActive = currentSalon?.id === salon.salon_id;

  function formatPhone(value) {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length >= 7) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
    if (digits.length >= 4) return `(${digits.slice(0,3)}) ${digits.slice(3)}`;
    if (digits.length > 0) return `(${digits}`;
    return '';
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await api.patch(`/api/salons/${salon.salon_id}`, {
        description: description || null,
        address:     address || null,
        phone:       phone || null,
        email:       email || null,
      });

      // Keep membership data in sync so the salon tile and other tabs reflect changes
      if (isActive) {
        updateCurrentSalon({ description, address, phone, email });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="salon-page-settings">
      <h3>About Us</h3>
      <p className="settings-hint">This information appears on your public About Us page.</p>

      <div className="about-settings-form">
        <div className="form-group">
          <label>Business Description</label>
          <textarea
            rows={4}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Tell visitors about your salon..."
          />
        </div>

        <div className="form-group">
          <label>Address</label>
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="123 Main Street, Austin, TX 78701"
          />
        </div>

        <div className="form-row-group">
          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(formatPhone(e.target.value))}
              placeholder="(555) 555-5555"
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="hello@yoursalon.com"
            />
          </div>
        </div>

        {/* Live preview */}
        <div className="about-preview">
          <label className="settings-label">Preview</label>
          <div className="about-preview-card">
            {description && <p>{description}</p>}
            {address && <p><strong>Location:</strong> {address}</p>}
            {phone && <p><strong>Phone:</strong> {phone}</p>}
            {email && <p><strong>Email:</strong> {email}</p>}
            {!description && !address && !phone && !email && (
              <p className="settings-hint">Fill in the fields above to see a preview.</p>
            )}
          </div>
        </div>

        <div className="settings-actions">
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
