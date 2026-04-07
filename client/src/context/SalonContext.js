import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

const SalonContext = createContext(null);

export function loadGoogleFont(fontFamily) {
  if (!fontFamily || fontFamily === 'Inter') return;
  const id = `gfont-${fontFamily.replace(/\s+/g, '-')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:ital,wght@0,400;0,600;0,700;1,400&display=swap`;
  document.head.appendChild(link);
}

function applyTheme(settings) {
  const color = settings?.primary_color ?? '#1a1a1a';
  const font  = settings?.font_family  ?? null;
  document.documentElement.style.setProperty('--brand-color', color);
  // derive a readable text color based on luminance
  const r = parseInt(color.slice(1,3), 16);
  const g = parseInt(color.slice(3,5), 16);
  const b = parseInt(color.slice(5,7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  document.documentElement.style.setProperty('--brand-text', luminance > 0.55 ? '#1a1a1a' : '#ffffff');
  if (font) loadGoogleFont(font);
}

export function SalonProvider({ children }) {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState([]);
  const [currentSalon, _setCurrentSalon] = useState(() => {
    try { return JSON.parse(localStorage.getItem('currentSalon')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  function setCurrentSalon(salon) {
    _setCurrentSalon(salon);
    if (salon) {
      localStorage.setItem('currentSalon', JSON.stringify(salon));
      applyTheme(salon.settings);
    } else {
      localStorage.removeItem('currentSalon');
      applyTheme(null);
    }
  }

  // Apply theme on initial mount if salon is already in localStorage
  useEffect(() => {
    if (currentSalon?.settings) applyTheme(currentSalon.settings);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) {
      setMemberships([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api.get('/api/salons/my/memberships')
      .then(data => {
        setMemberships(data);
        if (data.length > 0) {
          const saved = currentSalon?.id;
          const match = data.find(m => m.salon_id === saved);
          const m = match ?? data[0];
          setCurrentSalon({
            id:       m.salon_id,
            name:     m.name,
            slug:     m.slug,
            logo_url: m.logo_url,
            settings: m.settings ?? {},
          });
        }
      })
      .catch(() => setMemberships([]))
      .finally(() => setLoading(false));
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const salonRole = currentSalon
    ? (memberships.find(m => m.salon_id === currentSalon.id)?.role ?? null)
    : null;

  function switchSalon(salonId) {
    const m = memberships.find(m => m.salon_id === salonId);
    if (m) setCurrentSalon({ id: m.salon_id, name: m.name, slug: m.slug, logo_url: m.logo_url, settings: m.settings ?? {} });
  }

  // Called after salon is saved so context stays in sync.
  // topPatch:      direct salon fields to merge (e.g. { logo_url })
  // settingsPatch: sub-fields to merge into salon.settings
  function updateCurrentSalon(topPatch = {}, settingsPatch = null) {
    _setCurrentSalon(prev => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        ...topPatch,
        settings: settingsPatch ? { ...prev.settings, ...settingsPatch } : prev.settings,
      };
      localStorage.setItem('currentSalon', JSON.stringify(updated));
      applyTheme(updated.settings);
      return updated;
    });
    setMemberships(prev => prev.map(m =>
      m.salon_id === currentSalon?.id
        ? {
            ...m,
            ...topPatch,
            settings: settingsPatch ? { ...(m.settings ?? {}), ...settingsPatch } : m.settings,
          }
        : m
    ));
  }

  return (
    <SalonContext.Provider value={{
      memberships, currentSalon, setCurrentSalon, switchSalon,
      salonRole, loading, updateCurrentSalon,
    }}>
      {children}
    </SalonContext.Provider>
  );
}

export function useSalon() {
  return useContext(SalonContext);
}
