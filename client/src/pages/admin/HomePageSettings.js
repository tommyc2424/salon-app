import { useRef, useState } from 'react';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { useSalon } from '../../context/SalonContext';

export default function HomePageSettings({ salon }) {
  const { updateCurrentSalon, currentSalon } = useSalon();
  const isActive = currentSalon?.id === salon.salon_id;

  const fileInputRef = useRef(null);
  const [photoState, setPhotoState]     = useState('keep');
  const [photoPreview, setPhotoPreview] = useState(salon.settings?.hero_image ?? '');
  const [heroGrayscale, setHeroGrayscale] = useState(salon.settings?.hero_grayscale ?? false);
  const [heroOpacity, setHeroOpacity]     = useState(salon.settings?.hero_opacity ?? 0.3);
  const [uploading, setUploading]       = useState(false);
  const [saving, setSaving]             = useState(false);
  const [saved, setSaved]               = useState(false);

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

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      let heroImage = salon.settings?.hero_image ?? null;

      if (photoState === 'remove') {
        heroImage = null;
      } else if (photoState !== 'keep') {
        setUploading(true);
        const file = photoState;
        const ext = file.name.split('.').pop().toLowerCase();
        const path = `salon-${salon.salon_id}-hero.${ext}`;
        const { error } = await supabase.storage
          .from('salon-logos')
          .upload(path, file, { upsert: true, contentType: file.type });
        if (error) throw new Error(error.message);
        const { data: { publicUrl } } = supabase.storage
          .from('salon-logos')
          .getPublicUrl(path);
        heroImage = publicUrl;
        setUploading(false);
      }

      await api.patch(`/api/salons/${salon.salon_id}`, {
        settings: { hero_image: heroImage, hero_grayscale: heroGrayscale, hero_opacity: heroOpacity },
      });

      if (isActive) {
        updateCurrentSalon({}, { hero_image: heroImage, hero_grayscale: heroGrayscale, hero_opacity: heroOpacity });
      }

      setPhotoPreview(heroImage ?? '');
      setPhotoState('keep');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  const previewFilter = heroGrayscale ? 'grayscale(100%)' : 'none';

  return (
    <div className="salon-page-settings">
      <h3>Home Page Settings</h3>
      <p className="settings-hint">
        Add a photo of your salon. It will display as a background on your public home page.
      </p>

      <div className="settings-section">
        <label className="settings-label">Salon Photo</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <div className="logo-upload-area">
          {photoPreview ? (
            <div className="hero-photo-preview">
              <div className="hero-photo-demo">
                <img
                  src={photoPreview}
                  alt="Salon hero"
                  className="hero-photo-demo-img"
                  style={{ filter: previewFilter, opacity: heroOpacity }}
                />
              </div>
              <div className="staff-photo-actions">
                <button type="button" className="action-btn" onClick={() => fileInputRef.current.click()}>Change</button>
                <button type="button" className="action-btn danger" onClick={removePhoto}>Remove</button>
              </div>
            </div>
          ) : (
            <button className="logo-upload-dropzone" onClick={() => fileInputRef.current.click()}>
              <span className="logo-upload-icon">↑</span>
              <span>Upload salon photo</span>
              <span className="settings-hint">PNG, JPG, WebP — landscape works best</span>
            </button>
          )}
          {uploading && <p className="settings-hint">Uploading…</p>}
        </div>
      </div>

      {photoPreview && (
        <>
          <div className="settings-section">
            <label className="settings-label">Display Mode</label>
            <div className="landing-toggle">
              <button
                className={`landing-toggle-btn ${!heroGrayscale ? 'active' : ''}`}
                style={!heroGrayscale ? { background: 'var(--brand-color, #1a1a1a)', color: '#fff' } : {}}
                onClick={() => setHeroGrayscale(false)}
              >Color</button>
              <button
                className={`landing-toggle-btn ${heroGrayscale ? 'active' : ''}`}
                style={heroGrayscale ? { background: 'var(--brand-color, #1a1a1a)', color: '#fff' } : {}}
                onClick={() => setHeroGrayscale(true)}
              >Grayscale</button>
            </div>
          </div>

          <div className="settings-section">
            <label className="settings-label">Photo Visibility</label>
            <p className="settings-hint">
              Adjust how visible the background photo is. Lower values make the photo more transparent.
            </p>
            <div className="hero-opacity-slider">
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={heroOpacity}
                onChange={e => setHeroOpacity(parseFloat(e.target.value))}
              />
              <span className="hero-opacity-value">{Math.round(heroOpacity * 100)}%</span>
            </div>
          </div>
        </>
      )}

      <div className="settings-actions">
        <button className="btn-primary" onClick={handleSave} disabled={saving || uploading}>
          {uploading ? 'Uploading…' : saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
