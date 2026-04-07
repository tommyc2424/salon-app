import { useEffect, useState } from 'react';
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

export default function AdminBookings() {
  const { currentSalon } = useSalon();
  const [bookings, setBookings] = useState([]);
  const [staff, setStaff]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filters, setFilters]   = useState({ status: '', date: '', staff_id: '' });

  useEffect(() => {
    if (!currentSalon) return;
    api.get(`/api/salons/${currentSalon.id}/admin/staff`).then(setStaff);
    loadBookings({});
  }, [currentSalon?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadBookings(f) {
    if (!currentSalon) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (f.status)   params.set('status',   f.status);
    if (f.date)     params.set('date',     f.date);
    if (f.staff_id) params.set('staff_id', f.staff_id);
    const data = await api.get(`/api/salons/${currentSalon.id}/admin/bookings?${params}`).catch(() => []);
    setBookings(data);
    setLoading(false);
  }

  function setFilter(key, value) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    loadBookings(next);
  }

  async function updateStatus(id, status) {
    await api.patch(`/api/salons/${currentSalon.id}/admin/bookings/${id}/status`, { status });
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  }

  return (
    <div className="page">
      <div className="page-header"><h1>All Bookings</h1></div>

      <div className="admin-filters">
        <select value={filters.status} onChange={e => setFilter('status', e.target.value)} className="admin-select">
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          type="date"
          value={filters.date}
          onChange={e => setFilter('date', e.target.value)}
          className="admin-date-input"
        />
        <select value={filters.staff_id} onChange={e => setFilter('staff_id', e.target.value)} className="admin-select">
          <option value="">All Staff</option>
          {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
        <button className="btn-secondary" onClick={() => { setFilters({ status:'', date:'', staff_id:'' }); loadBookings({}); }}>
          Clear
        </button>
      </div>

      {loading ? <p>Loading...</p> : bookings.length === 0 ? (
        <div className="empty-state"><p>No bookings found.</p></div>
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
    </div>
  );
}
