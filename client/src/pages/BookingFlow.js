import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSalon } from '../context/SalonContext';
import { api } from '../lib/api';
import Calendar from '../components/bookings/Calendar';

const STEPS = ['Services', 'Staff', 'Date & Time', 'Confirm'];

const TIMES = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00',
];

function formatTime(t) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function BookingFlow() {
  const { user } = useAuth();
  const { currentSalon } = useSalon();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [step, setStep] = useState(0);

  const [services, setServices]     = useState([]);
  const [staff, setStaff]           = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  const [selectedServices, setSelectedServices] = useState(
    state?.preselectedService ? [state.preselectedService] : []
  );
  const [selectedStaff, setSelectedStaff]       = useState(null);
  const [selectedDate, setSelectedDate]         = useState('');
  const [selectedTime, setSelectedTime]         = useState('');
  const [unavailableTimes, setUnavailableTimes] = useState([]);

  useEffect(() => {
    if (!currentSalon) { setLoading(false); return; }
    Promise.all([
      api.get(`/api/salons/${currentSalon.id}/services?active=true`),
      api.get(`/api/salons/${currentSalon.id}/staff`),
      api.get('/api/categories'),
    ]).then(([svcs, stf, cats]) => {
      setServices(svcs);
      setStaff(stf);
      setCategories(cats);
    }).finally(() => setLoading(false));
  }, [currentSalon?.id]);

  const totalPrice    = selectedServices.reduce((s, svc) => s + parseFloat(svc.price), 0);
  const totalDuration = selectedServices.reduce((s, svc) => s + svc.duration_minutes, 0);

  useEffect(() => {
    if (!selectedDate || !currentSalon) return;
    const params = new URLSearchParams({ date: selectedDate, duration: totalDuration, customer_id: user.id });
    if (selectedStaff) params.set('staff_id', selectedStaff.id);
    api.get(`/api/salons/${currentSalon.id}/availability?${params}`)
      .then(data => setUnavailableTimes(data.unavailable))
      .catch(() => setUnavailableTimes([]));
  }, [selectedDate, selectedStaff, totalDuration, currentSalon?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleService(svc) {
    setSelectedServices(prev =>
      prev.find(s => s.id === svc.id)
        ? prev.filter(s => s.id !== svc.id)
        : [...prev, svc]
    );
  }

  async function handleSubmit() {
    setError('');
    setSubmitting(true);
    const startsAt = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();
    try {
      await api.post(`/api/salons/${currentSalon.id}/bookings`, {
        customer_id: user.id,
        staff_id:    selectedStaff?.id ?? null,
        starts_at:   startsAt,
        service_ids: selectedServices.map(s => s.id),
      });
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!currentSalon) {
    return (
      <div className="page">
        <div className="empty-state">
          <p>Please select a salon before booking.</p>
          <Link to="/salons" className="btn-primary">Find a Salon</Link>
        </div>
      </div>
    );
  }

  if (loading) return <div className="page"><p>Loading...</p></div>;

  return (
    <div className="page">
      <h1>Book at {currentSalon.name}</h1>

      <div className="stepper">
        {STEPS.map((s, i) => (
          <div key={s} className={`step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
            <div className="step-dot">{i < step ? '✓' : i + 1}</div>
            <span>{s}</span>
          </div>
        ))}
      </div>

      <div className="step-content">

        {/* STEP 0: Services */}
        {step === 0 && (
          <div>
            <div className="step-title-row">
              <h2>Select Services</h2>
              <button
                className="btn-primary"
                disabled={selectedServices.length === 0}
                onClick={() => setStep(1)}
              >Next</button>
            </div>
            {categories.map(cat => {
              const catServices = services.filter(s => s.category_id === cat.id);
              if (!catServices.length) return null;
              return (
                <div key={cat.id} className="category-group">
                  <h3>{cat.name}</h3>
                  <div className="service-grid">
                    {catServices.map(svc => {
                      const selected = selectedServices.find(s => s.id === svc.id);
                      return (
                        <div
                          key={svc.id}
                          className={`service-card selectable ${selected ? 'selected' : ''}`}
                          onClick={() => toggleService(svc)}
                        >
                          <div className="service-card-body">
                            <h3>{svc.name}</h3>
                            <p>{svc.description}</p>
                          </div>
                          <div className="service-card-footer">
                            <span className="service-duration">{svc.duration_minutes} min</span>
                            <span className="service-price">${Number(svc.price).toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {selectedServices.length > 0 && (
              <div className="selection-summary">
                {selectedServices.length} service(s) — {totalDuration} min — ${totalPrice.toFixed(2)}
              </div>
            )}
          </div>
        )}

        {/* STEP 1: Staff */}
        {step === 1 && (
          <div>
            <div className="step-title-row">
              <h2>Choose a Staff Member</h2>
              <div className="step-nav-btns">
                <button className="btn-secondary" onClick={() => setStep(0)}>Back</button>
                <button className="btn-primary" onClick={() => setStep(2)}>Next</button>
              </div>
            </div>
            <div className="staff-grid">
              <div
                className={`staff-card ${!selectedStaff ? 'selected' : ''}`}
                onClick={() => setSelectedStaff(null)}
              >
                <div className="staff-avatar">✦</div>
                <h3>No Preference</h3>
                <p>We'll assign the best available stylist</p>
              </div>
              {staff.map(s => (
                <div
                  key={s.id}
                  className={`staff-card ${selectedStaff?.id === s.id ? 'selected' : ''}`}
                  onClick={() => setSelectedStaff(s)}
                >
                  <div className="staff-avatar">{s.full_name[0]}</div>
                  <h3>{s.full_name}</h3>
                  <p>{s.bio}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Date & Time */}
        {step === 2 && (
          <div>
            <div className="step-title-row">
              <h2>Pick a Date & Time</h2>
              <div className="step-nav-btns">
                <button className="btn-secondary" onClick={() => setStep(1)}>Back</button>
                <button
                  className="btn-primary"
                  disabled={!selectedDate || !selectedTime}
                  onClick={() => setStep(3)}
                >Next</button>
              </div>
            </div>
            <div className="datetime-picker">
              <Calendar
                selectedDate={selectedDate}
                onSelectDate={date => { setSelectedDate(date); setSelectedTime(''); }}
              />
              {selectedDate && (
                <div className="time-picker">
                  <label>
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'long', month: 'long', day: 'numeric'
                    })}
                  </label>
                  <div className="time-grid">
                    {TIMES.map(t => {
                      const blocked = unavailableTimes.includes(t);
                      return (
                        <button
                          key={t}
                          className={`time-slot ${selectedTime === t ? 'selected' : ''} ${blocked ? 'blocked' : ''}`}
                          disabled={blocked}
                          onClick={() => !blocked && setSelectedTime(t)}
                        >
                          {formatTime(t)}
                          {blocked && <span className="time-slot-x">✕</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Confirm */}
        {step === 3 && (
          <div className="confirm-step">
            <div className="step-title-row">
              <h2>Confirm Booking</h2>
              <div className="step-nav-btns">
                <button className="btn-secondary" onClick={() => setStep(2)}>Back</button>
                <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Booking...' : 'Confirm Booking'}
                </button>
              </div>
            </div>
            <div className="confirm-card">
              <div className="confirm-row">
                <span>Services</span>
                <div>{selectedServices.map(s => <div key={s.id}>{s.name}</div>)}</div>
              </div>
              <div className="confirm-row">
                <span>Staff</span>
                <span>{selectedStaff?.full_name ?? 'No preference'}</span>
              </div>
              <div className="confirm-row">
                <span>Date</span>
                <span>{new Date(`${selectedDate}T${selectedTime}`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
              </div>
              <div className="confirm-row">
                <span>Time</span>
                <span>{formatTime(selectedTime)}</span>
              </div>
              <div className="confirm-row">
                <span>Duration</span>
                <span>{totalDuration} min</span>
              </div>
              <div className="confirm-row total">
                <span>Total</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
            </div>
            {error && <p className="auth-error">{error}</p>}
          </div>
        )}
      </div>

    </div>
  );
}
