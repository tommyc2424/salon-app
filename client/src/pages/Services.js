import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useSalon } from '../context/SalonContext';

export default function Services() {
  const navigate = useNavigate();
  const { currentSalon } = useSalon();
  const [categories, setCategories] = useState([]);
  const [services, setServices]     = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentSalon) { setLoading(false); return; }
    Promise.all([
      api.get('/api/categories'),
      api.get(`/api/salons/${currentSalon.id}/services?active=true`),
    ]).then(([cats, svcs]) => {
      setCategories(cats);
      setServices(svcs);
    }).finally(() => setLoading(false));
  }, [currentSalon?.id]);

  if (!currentSalon) {
    return (
      <div className="page">
        <div className="empty-state">
          <p>Please select a salon first.</p>
          <Link to="/salons" className="btn-primary">Find a Salon</Link>
        </div>
      </div>
    );
  }

  const filtered = activeCategory
    ? services.filter(s => s.category_id === activeCategory)
    : services;

  if (loading) return <div className="page"><p>Loading...</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Our Services</h1>
        <Link to="/book" className="btn-primary">Book Now</Link>
      </div>

      <div className="filter-bar">
        <button
          className={`filter-btn ${!activeCategory ? 'active' : ''}`}
          onClick={() => setActiveCategory(null)}
        >All</button>
        {categories.map(c => (
          <button
            key={c.id}
            className={`filter-btn ${activeCategory === c.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(c.id)}
          >{c.name}</button>
        ))}
      </div>

      <div className="service-grid">
        {filtered.map(s => (
          <div
            key={s.id}
            className="service-card selectable"
            onClick={() => navigate('/book', { state: { preselectedService: s } })}
          >
            <div className="service-card-body">
              <span className="service-category">{s.category_name}</span>
              <h3>{s.name}</h3>
              <p>{s.description}</p>
            </div>
            <div className="service-card-footer">
              <span className="service-duration">{s.duration_minutes} min</span>
              <span className="service-price">${Number(s.price).toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
