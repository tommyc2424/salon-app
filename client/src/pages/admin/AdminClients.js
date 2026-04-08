import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useSalon } from '../../context/SalonContext';

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}yr ago`;
}

function futureDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminClients() {
  const { currentSalon, isAllSalons, memberships } = useSalon();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    if (!currentSalon) return;
    setLoading(true);
    setClients([]);
    setSearch('');
    if (isAllSalons) {
      const adminSalons = memberships.filter(m => m.role === 'owner' || m.role === 'admin');
      Promise.all(adminSalons.map(m =>
        api.get(`/api/salons/${m.salon_id}/admin/clients`).then(clients =>
          clients.map(c => ({ ...c, salon_name: m.name }))
        ).catch(() => [])
      ))
        .then(results => {
          // Dedupe clients by id, merge stats
          const map = new Map();
          results.flat().forEach(c => {
            if (map.has(c.id)) {
              const prev = map.get(c.id);
              prev.visit_count = (Number(prev.visit_count) || 0) + (Number(c.visit_count) || 0);
              prev.total_spent = (Number(prev.total_spent) || 0) + (Number(c.total_spent) || 0);
              if (c.last_visit && (!prev.last_visit || new Date(c.last_visit) > new Date(prev.last_visit))) prev.last_visit = c.last_visit;
              if (c.next_appointment && (!prev.next_appointment || new Date(c.next_appointment) < new Date(prev.next_appointment))) prev.next_appointment = c.next_appointment;
            } else {
              map.set(c.id, { ...c });
            }
          });
          setClients([...map.values()]);
        })
        .finally(() => setLoading(false));
    } else {
      api.get(`/api/salons/${currentSalon.id}/admin/clients`)
        .then(setClients)
        .finally(() => setLoading(false));
    }
  }, [currentSalon?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = clients.filter(c =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>Clients</h1>
      </div>

      <div className="clients-toolbar">
        <input
          className="clients-search"
          placeholder="Search by name or phone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span className="clients-count">{filtered.length} client{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? <p>Loading…</p> : filtered.length === 0 ? (
        <div className="empty-state"><p>No clients found.</p></div>
      ) : (
        <div className="client-grid">
          {filtered.map(c => (
            <div key={c.id} className="client-card">
              <div className="client-avatar">
                {c.full_name ? c.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?'}
              </div>
              <div className="client-info">
                {isAllSalons && c.salon_name && <span className="client-salon-name">{c.salon_name}</span>}
                <h3 className="client-name">{c.full_name ?? 'Unknown'}</h3>
                {c.phone && <p className="client-phone">{c.phone}</p>}
              </div>
              <div className="client-stats">
                <div className="client-stat">
                  <span className="client-stat-value">{c.visit_count ?? 0}</span>
                  <span className="client-stat-label">Visits</span>
                </div>
                <div className="client-stat">
                  <span className="client-stat-value">
                    {c.total_spent ? `$${Number(c.total_spent).toFixed(0)}` : '$0'}
                  </span>
                  <span className="client-stat-label">Spent</span>
                </div>
                <div className="client-stat">
                  <span className="client-stat-value">{timeAgo(c.last_visit) ?? '—'}</span>
                  <span className="client-stat-label">Last Visit</span>
                </div>
                <div className={`client-stat ${c.next_appointment ? 'client-stat-upcoming' : ''}`}>
                  <span className="client-stat-value">
                    {c.next_appointment ? futureDate(c.next_appointment) : '—'}
                  </span>
                  <span className="client-stat-label">Next Appt</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
