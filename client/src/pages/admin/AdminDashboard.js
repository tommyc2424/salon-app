import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useSalon } from '../../context/SalonContext';

const STATUS_COLORS = {
  pending:   '#f59e0b',
  confirmed: '#10b981',
  cancelled: '#ef4444',
  completed: '#6366f1',
  no_show:   '#9ca3af',
};

const STATUS_OPTIONS = ['pending', 'confirmed', 'completed', 'no_show', 'cancelled'];

export default function AdminDashboard() {
  const { currentSalon, salonRole } = useSalon();
  const [stats, setStats]       = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!currentSalon) return;
    const today = new Date().toISOString().split('T')[0];
    const base = `/api/salons/${currentSalon.id}/admin`;
    Promise.all([
      api.get(`${base}/stats`),
      api.get(`${base}/bookings?date=${today}`),
    ]).then(([s, b]) => {
      setStats(s);
      setBookings(b);
    }).finally(() => setLoading(false));
  }, [currentSalon?.id]);

  async function updateStatus(id, status) {
    await api.patch(`/api/salons/${currentSalon.id}/admin/bookings/${id}/status`, { status });
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  }

  if (loading) return <div className="page"><p>Loading...</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>{currentSalon?.name} Dashboard</h1>
        <span className={`role-badge ${salonRole}`}>{salonRole}</span>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats?.bookings_today ?? 0}</div>
          <div className="stat-label">Appointments Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">${Number(stats?.revenue_today ?? 0).toFixed(2)}</div>
          <div className="stat-label">Revenue Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.pending_bookings ?? 0}</div>
          <div className="stat-label">Pending Approval</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.total_customers ?? 0}</div>
          <div className="stat-label">Total Customers</div>
        </div>
      </div>

      <div className="admin-quick-links">
        <Link to="/admin/bookings"  className="admin-nav-card">All Bookings</Link>
        <Link to="/admin/services"  className="admin-nav-card">Manage Services</Link>
        <Link to="/admin/staff"     className="admin-nav-card">Manage Staff</Link>
        <Link to="/admin/salons"    className="admin-nav-card">My Salons</Link>
      </div>

      <section className="card-section">
        <h2>Today's Appointments</h2>
        {bookings.length === 0 ? (
          <div className="empty-state"><p>No appointments today.</p></div>
        ) : (
          <div className="booking-list">
            {bookings.map(b => (
              <div key={b.id} className="booking-item">
                <div className="booking-date-col">
                  <div className="booking-month">{new Date(b.starts_at).toLocaleDateString('en-US', { month: 'short' })}</div>
                  <div className="booking-day">{new Date(b.starts_at).getDate()}</div>
                </div>
                <div className="booking-info">
                  <div className="booking-services">
                    {b.services.map((s, i) => <span key={i} className="tag">{s.name}</span>)}
                  </div>
                  <div className="booking-meta">
                    <span>{new Date(b.starts_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                    {b.staff?.full_name && <span>{b.staff.full_name}</span>}
                    <span>${Number(b.total_price).toFixed(2)}</span>
                  </div>
                </div>
                <div className="booking-status-col">
                  <select
                    className="status-select"
                    value={b.status}
                    style={{ borderColor: STATUS_COLORS[b.status] }}
                    onChange={e => updateStatus(b.id, e.target.value)}
                  >
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
