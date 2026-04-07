import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useSalon } from '../context/SalonContext';

export default function SalonLanding() {
  const { slug } = useParams();
  const { setCurrentSalon } = useSalon();
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/api/salons/by-slug/${slug}`)
      .then(salon => {
        setCurrentSalon({
          id:       salon.id,
          name:     salon.name,
          slug:     salon.slug,
          logo_url: salon.logo_url,
          settings: salon.settings ?? {},
        });
        navigate('/services', { replace: true });
      })
      .catch(() => navigate('/', { replace: true }));
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div className="loading">Loading…</div>;
}
