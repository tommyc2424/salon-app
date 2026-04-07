import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSalon } from '../../context/SalonContext';
import { api } from '../../lib/api';

const STATUS_COLORS = {
  pending:   '#f59e0b',
  confirmed: '#10b981',
  cancelled: '#ef4444',
  completed: '#6366f1',
  no_show:   '#9ca3af',
};

const STATUS_OPTIONS = ['pending', 'confirmed', 'completed', 'no_show', 'cancelled'];

export default function StaffDashboard() {
  const { profile } = useAuth();
  const { currentSalon } = useSalon();
  const [staffRecord, setStaffRecord] = useState(null);
  const [bookings, setBookings]       = useState([]);
  const [filter, setFilter]           = useState('today');
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    if (!currentSalon || !profile?.id) return;
    api.get(`/api/salons/${currentSalon.id}/staff`)
      .then(all => {
        const me = all.find(s => s.profile_id === profile.id);
        setStaffRecord(me ?? null);
        if (me) return fetchBookings(me.id, filter);
      })
      .finally(() => setLoading(false));
  }, [currentSalon?.id, profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchBookings(staffId, view) {
    const today = new Date().toISOString().split('T')[0];
    const qs = view === 'today'
      ? `staff_id=${staffId}&date=${today}`
      : `staff_id=${staffId}`;
    const data = await api.get(`/api/salons/${currentSalon.id}/bookings?${qs}`);
    setBookings(data);
  }

  async function changeFilter(view) {
    setFilter(view);
    if (staffRecord) {
      setLoading(true);
      await fetchBookings(staffRecord.id, view);
      setLoading(false);
    }
  }

  async function updateStatus(id, status) {
    await api.patch(`/api/salons/${currentSalon.id}/bookings/${id}/status`, { status });
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  }

  if (loading) return <div className="page"><p>Loading...</p></div>;

  if (!staffRecord) return (
    <div className="page">
      <div className="page-header"><h1>Staff Dashboard</h1></div>
      <div className="empty-state"><p>Your account is not linked to a staff record. Contact an admin.</p></div>
    </div>
  );

  const now = new Date();
  const displayed = filter === 'upcoming'
    ? bookings.filter(b => new Date(b.starts_at) >= now && b.status !== 'cancelled')
    : bookings;

  return (
    <div className="page">
      <div className="page-header">
        <h1>My Schedule</h1>
        <span className="role-badge staff">Staff</span>
      </div>

      <div className="filter-bar">
        {['today', 'upcoming', 'all'].map(f => (
          <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => changeFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div className="empty-state"><p>No appointments for this view.</p></div>
      ) : (
        <div className="booking-list">
          {displayed.map(b => (
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
