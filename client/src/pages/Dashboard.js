import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const STATUS_COLORS = {
  pending:   '#f59e0b',
  confirmed: '#10b981',
  cancelled: '#ef4444',
  completed: '#6366f1',
  no_show:   '#9ca3af',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('upcoming');

  useEffect(() => {
    api.get('/api/my/bookings')
      .then(setBookings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user.id]);

  async function cancelBooking(id) {
    if (!window.confirm('Cancel this appointment?')) return;
    await api.patch(`/api/my/bookings/${id}/status`, { status: 'cancelled' });
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
  }

  const now = new Date();
  const filtered = bookings.filter(b => {
    if (filter === 'upcoming')  return new Date(b.starts_at) >= now && b.status !== 'cancelled';
    if (filter === 'past')      return new Date(b.starts_at) < now || b.status === 'completed';
    if (filter === 'cancelled') return b.status === 'cancelled';
    return true;
  });

  return (
    <div className="page">
      <div className="page-header">
        <h1>My Bookings</h1>
        <Link to="/salons" className="btn-primary">Book Appointment</Link>
      </div>

      <div className="filter-bar">
        {['upcoming', 'past', 'cancelled'].map(f => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >{f.charAt(0).toUpperCase() + f.slice(1)}</button>
        ))}
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p>No {filter} bookings.</p>
          {filter === 'upcoming' && <Link to="/salons" className="btn-primary">Find a Salon</Link>}
        </div>
      ) : (
        <div className="booking-list">
          {filtered.map(b => (
            <div key={b.id} className="booking-item">
              <div className="booking-date-col">
                <div className="booking-month">
                  {new Date(b.starts_at).toLocaleDateString('en-US', { month: 'short' })}
                </div>
                <div className="booking-day">
                  {new Date(b.starts_at).getDate()}
                </div>
              </div>
              <div className="booking-info">
                <div className="booking-services">
                  {b.services.map((s, i) => <span key={i} className="tag">{s.name}</span>)}
                </div>
                <div className="booking-meta">
                  <span>{new Date(b.starts_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                  {b.staff?.full_name && <span>with {b.staff.full_name}</span>}
                  <span>${Number(b.total_price).toFixed(2)}</span>
                </div>
              </div>
              <div className="booking-status-col">
                <span className="status-badge" style={{ background: STATUS_COLORS[b.status] }}>
                  {b.status}
                </span>
                {b.status === 'confirmed' && new Date(b.starts_at) > now && (
                  <button className="btn-cancel" onClick={() => cancelBooking(b.id)}>Cancel</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
