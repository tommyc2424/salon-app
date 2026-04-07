import { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { useSalon, loadGoogleFont } from '../../context/SalonContext';

const COLOR_PRESETS = [
  { id: 'midnight',  label: 'Midnight',  color: '#1a1a1a' },
  { id: 'slate',     label: 'Slate',     color: '#475569' },
  { id: 'ocean',     label: 'Ocean',     color: '#0284c7' },
  { id: 'teal',      label: 'Teal',      color: '#0d9488' },
  { id: 'forest',    label: 'Forest',    color: '#15803d' },
  { id: 'rose',      label: 'Rose',      color: '#e11d48' },
  { id: 'lavender',  label: 'Lavender',  color: '#7c3aed' },
  { id: 'champagne', label: 'Champagne', color: '#b07d56' },
];

const FONTS = [
  { family: 'Inter',              label: 'Inter'          },
  { family: 'Playfair Display',   label: 'Playfair'       },
  { family: 'Cormorant Garamond', label: 'Cormorant'      },
  { family: 'Montserrat',         label: 'Montserrat'     },
  { family: 'Raleway',            label: 'Raleway'        },
  { family: 'Josefin Sans',       label: 'Josefin Sans'   },
  { family: 'Dancing Script',     label: 'Dancing Script' },
  { family: 'Libre Baskerville',  label: 'Baskerville'    },
];

export default function SalonSettings({ salon, onClose }) {
  const { updateCurrentSalon, currentSalon } = useSalon();

  const fileInputRef = useRef(null);

  // logoState tracks what we'll save:
  //   'keep'   — no change to logo (use existing salon.logo_url)
  //   'remove' — explicitly set logo_url to null
  //   File obj — a new file to upload
  const [logoState, setLogoState]       = useState('keep');
  const [logoPreview, setLogoPreview]   = useState(salon.logo_url ?? '');
  const [uploading, setUploading]       = useState(false);

  const [showTitle, setShowTitle]       = useState(salon.settings?.show_title !== false);
  const [landingPage, setLandingPage]   = useState(salon.settings?.landing_page ?? 'login');
  const [primaryColor, setPrimaryColor] = useState(salon.settings?.primary_color ?? '#1a1a1a');
  const [fontFamily, setFontFamily]     = useState(salon.settings?.font_family ?? 'Inter');
  const [customColor, setCustomColor]   = useState(
    !COLOR_PRESETS.some(p => p.color === (salon.settings?.primary_color ?? '#1a1a1a'))
  );
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [copied, setCopied]   = useState(false);

  const isActive = currentSalon?.id === salon.salon_id;

  // ── Logo handlers ──────────────────────────────────────────
  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLogoState(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function removeLogo() {
    setLogoState('remove');
    setLogoPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function resolveLogoUrl() {
    if (logoState === 'keep')   return { logoUrl: salon.logo_url ?? null, changed: false };
    if (logoState === 'remove') return { logoUrl: null, changed: true };

    // logoState is a File — upload it
    setUploading(true);
    try {
      const file = logoState;
      const ext  = file.name.split('.').pop().toLowerCase();
      const path = `salon-${salon.salon_id}.${ext}`; // same path = overwrites previous
      const { error } = await supabase.storage
        .from('salon-logos')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw new Error(error.message);
      const { data: { publicUrl } } = supabase.storage
        .from('salon-logos')
        .getPublicUrl(path);
      return { logoUrl: publicUrl, changed: true };
    } finally {
      setUploading(false);
    }
  }

  // ── Color / font handlers ───────────────────────────────────
  function pickColor(color) {
    setPrimaryColor(color);
    setCustomColor(false);
    if (isActive) document.documentElement.style.setProperty('--brand-color', color);
  }

  function pickFont(family) {
    setFontFamily(family);
    loadGoogleFont(family);
  }

  // ── Save ────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const { logoUrl, changed: logoChanged } = await resolveLogoUrl();

      const patchBody = { settings: { primary_color: primaryColor, font_family: fontFamily, show_title: showTitle, landing_page: landingPage } };
      if (logoChanged) patchBody.logo_url = logoUrl; // only send logo_url when it changed

      await api.patch(`/api/salons/${salon.salon_id}`, patchBody);

      // Keep local context in sync
      if (isActive) {
        updateCurrentSalon(
          logoChanged ? { logo_url: logoUrl } : {},
          { primary_color: primaryColor, font_family: fontFamily, show_title: showTitle, landing_page: landingPage }
        );
      }

      // Settle state so re-opening the panel shows the saved logo
      setLogoPreview(logoUrl ?? '');
      setLogoState('keep');

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  // Load all fonts once for the picker
  FONTS.forEach(f => { if (f.family !== 'Inter') loadGoogleFont(f.family); });

  const previewStyle = {
    fontFamily,
    color: primaryColor,
    fontSize: '1.4rem',
    fontWeight: 700,
    letterSpacing: '-0.5px',
    padding: '1rem 1.5rem',
    background: '#fafafa',
    border: `2px solid ${primaryColor}`,
    borderRadius: 10,
    display: 'inline-block',
    marginTop: '0.5rem',
  };

  return (
    <div className="salon-settings-panel">
      <div className="settings-panel-header">
        <h2>Customize — {salon.name}</h2>
        <button className="settings-close-btn" onClick={onClose} title="Close">✕</button>
      </div>

      {/* Live Preview */}
      <div className="settings-section">
        <label className="settings-label">Preview</label>
        <div style={previewStyle}>{showTitle ? salon.name : '—'}</div>
        <label className="settings-checkbox-row">
          <input
            type="checkbox"
            checked={showTitle}
            onChange={e => setShowTitle(e.target.checked)}
          />
          Display salon name in navigation
        </label>
      </div>

      {/* Logo — one at a time */}
      <div className="settings-section">
        <label className="settings-label">Logo</label>
        <p className="settings-hint">
          Appears below the salon name in the navigation bar. PNG or SVG with a transparent background works best.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <div className="logo-upload-area">
          {logoPreview ? (
            // Logo exists — show it, allow removal only
            <div className="logo-upload-preview">
              <img src={logoPreview} alt="Current logo" className="logo-upload-img" />
              <div className="logo-upload-actions">
                <button className="action-btn danger" onClick={removeLogo}>Remove Logo</button>
              </div>
            </div>
          ) : (
            // No logo — show upload zone
            <button className="logo-upload-dropzone" onClick={() => fileInputRef.current.click()}>
              <span className="logo-upload-icon">↑</span>
              <span>Click to upload logo</span>
              <span className="settings-hint">PNG, JPG, SVG, WebP</span>
            </button>
          )}
          {uploading && <p className="settings-hint" style={{ marginTop: '0.5rem' }}>Uploading…</p>}
        </div>
      </div>

      {/* Color Scheme */}
      <div className="settings-section">
        <label className="settings-label">Color Scheme</label>
        <p className="settings-hint">Applied to buttons, selections, and accents throughout the booking experience.</p>
        <div className="color-presets">
          {COLOR_PRESETS.map(p => (
            <button
              key={p.id}
              className={`color-swatch ${!customColor && primaryColor === p.color ? 'selected' : ''}`}
              style={{ background: p.color }}
              title={p.label}
              onClick={() => pickColor(p.color)}
            />
          ))}
          <button
            className={`color-swatch custom-swatch ${customColor ? 'selected' : ''}`}
            title="Custom color"
            onClick={() => setCustomColor(true)}
            style={{ background: customColor ? primaryColor : '#f3f4f6' }}
          >
            {!customColor && <span className="custom-swatch-icon">+</span>}
          </button>
        </div>
        {customColor && (
          <div className="custom-color-row">
            <input
              type="color"
              value={primaryColor}
              onChange={e => {
                setPrimaryColor(e.target.value);
                if (isActive) document.documentElement.style.setProperty('--brand-color', e.target.value);
              }}
              className="color-picker-input"
            />
            <span className="color-picker-hex">{primaryColor}</span>
          </div>
        )}
      </div>

      {/* Font */}
      <div className="settings-section">
        <label className="settings-label">Salon Name Font</label>
        <p className="settings-hint">Applies to the salon name in the navigation bar.</p>
        <div className="font-grid">
          {FONTS.map(f => (
            <button
              key={f.family}
              className={`font-option ${fontFamily === f.family ? 'selected' : ''}`}
              onClick={() => pickFont(f.family)}
            >
              <span className="font-option-name">{f.label}</span>
              <span className="font-option-preview" style={{ fontFamily: f.family }}>Salon</span>
            </button>
          ))}
        </div>
      </div>

      {/* Landing Page Mode */}
      <div className="settings-section">
        <label className="settings-label">Landing Page</label>
        <p className="settings-hint">
          Choose what visitors see when they scan your QR code or visit your salon link.
        </p>
        <div className="landing-toggle">
          <button
            className={`landing-toggle-btn ${landingPage === 'login' ? 'active' : ''}`}
            style={landingPage === 'login' ? { background: primaryColor, color: '#fff' } : {}}
            onClick={() => setLandingPage('login')}
          >
            Login Page
          </button>
          <button
            className={`landing-toggle-btn ${landingPage === 'standard' ? 'active' : ''}`}
            style={landingPage === 'standard' ? { background: primaryColor, color: '#fff' } : {}}
            onClick={() => setLandingPage('standard')}
          >
            Standard Page
          </button>
        </div>
        <p className="settings-hint" style={{ marginTop: '0.5rem' }}>
          {landingPage === 'login'
            ? 'Visitors must sign in before seeing your salon.'
            : 'Visitors see your salon info and services without signing in.'}
        </p>
      </div>

      {/* QR Code */}
      {salon.slug && (
        <div className="settings-section">
          <label className="settings-label">Booking QR Code</label>
          <p className="settings-hint">
            Scan to open this salon's booking page. Print or display it so customers can book directly.
          </p>
          <div className="qr-code-wrapper">
            <QRCodeCanvas
              id={`qr-${salon.salon_id}`}
              value={`${window.location.origin}/${landingPage === 'standard' ? 'p' : 's'}/${salon.slug}`}
              size={160}
              fgColor={primaryColor}
              bgColor="#ffffff"
              level="M"
            />
            <div className="qr-code-actions">
              <button
                className="btn-secondary"
                onClick={() => {
                  const canvas = document.getElementById(`qr-${salon.salon_id}`);
                  const link = document.createElement('a');
                  link.download = `${salon.slug}-qr.png`;
                  link.href = canvas.toDataURL('image/png');
                  link.click();
                }}
              >
                Download PNG
              </button>
              <div className="qr-url-row">
                <span className="settings-hint qr-url">{window.location.origin}/{landingPage === 'standard' ? 'p' : 's'}/{salon.slug}</span>
                <button
                  className="btn-secondary btn-copy"
                  onClick={() => {
                    const url = `${window.location.origin}/${landingPage === 'standard' ? 'p' : 's'}/${salon.slug}`;
                    navigator.clipboard.writeText(url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >{copied ? 'Copied!' : 'Copy'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="settings-actions">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleSave} disabled={saving || uploading}>
          {uploading ? 'Uploading…' : saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
