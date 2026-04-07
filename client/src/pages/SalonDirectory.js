import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useSalon } from '../context/SalonContext';

export default function SalonDirectory() {
  const navigate = useNavigate();
  const { setCurrentSalon, currentSalon } = useSalon();
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/my/salons').then(setSalons).finally(() => setLoading(false));
  }, []);

  function pickSalon(salon) {
    setCurrentSalon({
      id:       salon.id,
      name:     salon.name,
      slug:     salon.slug,
      logo_url: salon.logo_url,
      settings: salon.settings ?? {},
    });
    navigate('/services');
  }

  if (loading) return <div className="page"><p>Loading...</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>My Salons</h1>
      </div>
      <div className="salon-grid">
        {salons.map(salon => (
          <div
            key={salon.id}
            className={`salon-card ${currentSalon?.id === salon.id ? 'selected' : ''}`}
            onClick={() => pickSalon(salon)}
          >
            <div className="salon-avatar">
              {salon.logo_url
                ? <img src={salon.logo_url} alt={salon.name} />
                : <span>{salon.name[0]}</span>}
            </div>
            <div className="salon-info">
              <h3>{salon.name}</h3>
              {salon.description && <p>{salon.description}</p>}
              {salon.address && <p className="salon-address">{salon.address}</p>}
            </div>
            <button className="btn-primary salon-select-btn">
              {currentSalon?.id === salon.id ? 'Selected' : 'Select'}
            </button>
          </div>
        ))}
        {salons.length === 0 && (
          <div className="empty-state">
            <p>No salons yet.</p>
            <p className="settings-hint">Ask your salon for their booking link or QR code to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
