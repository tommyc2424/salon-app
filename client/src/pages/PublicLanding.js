import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { loadGoogleFont } from '../context/SalonContext';
import Calendar from '../components/bookings/Calendar';

const NAV_SECTIONS = [
  { id: 'home',     label: 'Home' },
  { id: 'about',    label: 'About Us' },
  { id: 'services', label: 'Our Services' },
  { id: 'team',     label: 'Our Team' },
  { id: 'gifts',    label: 'Gift Cards' },
  { id: 'careers',  label: 'Career Opportunities' },
  { id: 'contact',  label: 'Contact Us' },
];

const TIMES = [
  '09:00','09:30','10:00','10:30','11:00','11:30',
  '12:00','12:30','13:00','13:30','14:00','14:30',
  '15:00','15:30','16:00','16:30','17:00',
];

function formatTime(t) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function PublicLanding() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [salon, setSalon]               = useState(null);
  const [services, setServices]         = useState([]);
  const [categories, setCategories]     = useState([]);
  const [staff, setStaff]               = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeSection, setActiveSection]   = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading]           = useState(true);

  // Booking state
  const [bookStep, setBookStep]             = useState(0);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedStaff, setSelectedStaff]   = useState(null);
  const [selectedDate, setSelectedDate]     = useState('');
  const [selectedTime, setSelectedTime]     = useState('');
  const [unavailableTimes, setUnavailableTimes] = useState([]);
  const [guestName, setGuestName]           = useState('');
  const [guestEmail, setGuestEmail]         = useState('');
  const [guestPhone, setGuestPhone]         = useState('');
  const [submitting, setSubmitting]         = useState(false);
  const [bookError, setBookError]           = useState('');
  const [bookSuccess, setBookSuccess]       = useState(false);

  useEffect(() => {
    api.get(`/api/salons/by-slug/${slug}`)
      .then(s => {
        setSalon(s);
        if (s.settings?.font_family) loadGoogleFont(s.settings.font_family);
        return Promise.all([
          api.get('/api/categories'),
          api.get(`/api/salons/${s.id}/services?active=true`),
          api.get(`/api/salons/${s.id}/staff`),
        ]).then(([cats, svcs, stf]) => {
          setCategories(cats);
          setServices(svcs);
          setStaff(stf);
        });
      })
      .catch(() => navigate('/', { replace: true }))
      .finally(() => setLoading(false));
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch availability when date changes
  const totalDuration = selectedServices.reduce((s, svc) => s + svc.duration_minutes, 0);
  const totalPrice    = selectedServices.reduce((s, svc) => s + parseFloat(svc.price), 0);

  useEffect(() => {
    if (!selectedDate || !salon) return;
    const params = new URLSearchParams({ date: selectedDate, duration: totalDuration });
    if (selectedStaff) params.set('staff_id', selectedStaff.id);
    api.get(`/api/salons/${salon.id}/availability?${params}`)
      .then(data => setUnavailableTimes(data.unavailable))
      .catch(() => setUnavailableTimes([]));
  }, [selectedDate, selectedStaff, totalDuration, salon?.id]);

  function goToSection(id) {
    setActiveSection(id);
    setMobileMenuOpen(false);
    window.scrollTo(0, 0);
  }

  function startBooking(preselected, preselectedStaff) {
    setBookStep(0);
    setSelectedServices(preselected ? [preselected] : []);
    setSelectedStaff(preselectedStaff ?? null);
    setSelectedDate('');
    setSelectedTime('');
    setGuestName('');
    setGuestEmail('');
    setGuestPhone('');
    setBookError('');
    setBookSuccess(false);
    goToSection('book');
  }

  function toggleService(svc) {
    setSelectedServices(prev =>
      prev.find(s => s.id === svc.id) ? prev.filter(s => s.id !== svc.id) : [...prev, svc]
    );
  }

  function pickStaff(s) {
    setSelectedStaff(s);
    // Remove any selected services this staff member can't perform
    if (s?.services) {
      const canDo = new Set(s.services.map(sv => sv.id));
      setSelectedServices(prev => prev.filter(sv => canDo.has(sv.id)));
    }
  }

  async function handleGuestSubmit() {
    setBookError('');
    if (!selectedServices.length) { setBookError('Please select at least one service.'); return; }
    if (!guestEmail || !guestName) { setBookError('Name and email are required.'); return; }
    setSubmitting(true);
    try {
      await api.post(`/api/salons/${salon.id}/book-guest`, {
        email:       guestEmail,
        phone:       guestPhone,
        full_name:   guestName,
        staff_id:    selectedStaff?.id ?? null,
        starts_at:   new Date(`${selectedDate}T${selectedTime}:00`).toISOString(),
        service_ids: selectedServices.map(s => s.id),
      });
      setBookSuccess(true);
    } catch (err) {
      setBookError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !salon) return <div className="loading">Loading…</div>;

  const color = salon.settings?.primary_color ?? '#1a1a1a';
  const font  = salon.settings?.font_family ?? 'Inter';
  const filtered = activeCategory ? services.filter(s => s.category_id === activeCategory) : services;
  const BOOK_STEPS = ['Services', 'Staff', 'Date & Time', 'Your Info', 'Confirm'];
  const guestInfoValid = guestName.trim() && guestEmail.trim() && guestEmail.includes('@');

  return (
    <div className="public-landing">
      {/* Navigation */}
      <nav className="public-nav" style={{ borderBottomColor: color }}>
        <div className="public-nav-top">
          <div className="public-nav-brand" onClick={() => goToSection('home')} style={{ cursor: 'pointer' }}>
            {salon.logo_url && <img src={salon.logo_url} alt={salon.name} className="public-nav-logo" />}
            <span style={{ fontFamily: font, color }}>{salon.name}</span>
          </div>
          <div className="public-nav-actions">
            <a
              href="#"
              className="public-nav-book"
              style={{ background: color }}
              onClick={e => { e.preventDefault(); startBooking(); }}
            >Book Now</a>
          </div>
          <button
            className="public-nav-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
        <div className={`public-nav-links ${mobileMenuOpen ? 'open' : ''}`}>
          {NAV_SECTIONS.map(s => (
            <a
              key={s.id}
              href="#"
              className={activeSection === s.id ? 'active' : ''}
              style={activeSection === s.id ? { color } : {}}
              onClick={e => { e.preventDefault(); goToSection(s.id); }}
            >{s.label}</a>
          ))}
          <a
            href="#"
            className="public-nav-login"
            onClick={e => { e.preventDefault(); navigate(`/s/${slug}`); }}
          >Log In</a>
        </div>
      </nav>

      {/* Page content */}
      <div className="public-page-content">
        {activeSection === 'home' && (() => {
          const heroImg = salon.settings?.hero_image;
          const heroOp  = salon.settings?.hero_opacity ?? 0.3;
          const heroGs  = salon.settings?.hero_grayscale;
          const imgFilter = heroGs ? 'grayscale(100%)' : 'none';
          return (
            <section className="public-section public-hero">
              {heroImg && (
                <>
                  <div
                    className="public-hero-bg"
                    style={{
                      backgroundImage: `url(${heroImg})`,
                      opacity: heroOp,
                      filter: imgFilter,
                    }}
                  />
                  <div className="public-hero-overlay" />
                </>
              )}
              <div className="public-hero-content">
                {salon.settings?.show_title !== false && (
                  <h1 style={{ fontFamily: font, color: heroImg ? '#fff' : color }}>{salon.name}</h1>
                )}
                {salon.logo_url && <img src={salon.logo_url} alt={salon.name} className="public-hero-logo" />}
                {salon.description && <p className="public-hero-tagline" style={heroImg ? { color: '#e5e7eb' } : {}}>{salon.description}</p>}
                <button
                  className="btn-primary public-hero-btn"
                  style={{ background: color }}
                  onClick={() => startBooking()}
                >Book an Appointment</button>
              </div>
            </section>
          );
        })()}

        {activeSection === 'about' && (
          <section className="public-section">
            <h2>About Us</h2>
            <div className="public-about-content">
              <p>{salon.description || `Welcome to ${salon.name}. We are dedicated to providing exceptional salon services in a warm, welcoming environment.`}</p>
              {salon.address && <p><strong>Location:</strong> {salon.address}</p>}
              {salon.phone && <p><strong>Phone:</strong> {salon.phone}</p>}
              {salon.email && <p><strong>Email:</strong> {salon.email}</p>}
            </div>
            {salon.address && (
              <div className="public-map">
                <iframe
                  title="Salon Location"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(salon.address)}&output=embed`}
                  width="100%"
                  height="350"
                  style={{ border: 0, borderRadius: 12 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            )}
          </section>
        )}

        {activeSection === 'services' && (
          <section className="public-section">
            <h2>Our Services</h2>
            <div className="filter-bar">
              <button
                className={`filter-btn ${!activeCategory ? 'active' : ''}`}
                style={!activeCategory ? { background: color, color: '#fff' } : {}}
                onClick={() => setActiveCategory(null)}
              >All</button>
              {categories.map(c => (
                <button
                  key={c.id}
                  className={`filter-btn ${activeCategory === c.id ? 'active' : ''}`}
                  style={activeCategory === c.id ? { background: color, color: '#fff' } : {}}
                  onClick={() => setActiveCategory(c.id)}
                >{c.name}</button>
              ))}
            </div>
            <div className="service-grid">
              {filtered.map(s => (
                <div key={s.id} className="service-card selectable" onClick={() => startBooking(s)}>
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
          </section>
        )}

        {activeSection === 'team' && (
          <section className="public-section">
            <h2>Our Team</h2>
            <div className="public-team-grid">
              {staff.map(m => (
                <div key={m.id} className="public-team-card">
                  <div className="public-team-avatar" style={{ background: color }}>
                    {m.avatar_url
                      ? <img src={m.avatar_url} alt={m.full_name} />
                      : <span>{m.full_name.split(' ').map(n => n[0]).join('')}</span>}
                  </div>
                  <h3>{m.full_name}</h3>
                  {m.bio && <p>{m.bio}</p>}
                  <button
                    className="btn-primary public-team-book-btn"
                    style={{ background: color }}
                    onClick={() => startBooking(null, m)}
                  >Book with {m.full_name.split(' ')[0]}</button>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeSection === 'gifts' && (
          <section className="public-section">
            <h2>Gift Cards</h2>
            <div className="public-placeholder">
              <p>Give the gift of beauty and relaxation. Gift cards are available in any denomination.</p>
              <p>Contact us at {salon.phone || 'the salon'} to purchase.</p>
            </div>
          </section>
        )}

        {activeSection === 'careers' && (
          <section className="public-section">
            <h2>Career Opportunities</h2>
            <div className="public-placeholder">
              <p>We're always looking for talented professionals to join our team.</p>
              <p>Send your resume to {salon.email || 'our salon'} or stop by in person.</p>
            </div>
          </section>
        )}

        {activeSection === 'contact' && (
          <section className="public-section">
            <h2>Contact Us</h2>
            <div className="public-contact-grid">
              {salon.address && (
                <div className="public-contact-item">
                  <strong>Address</strong>
                  <p>{salon.address}</p>
                </div>
              )}
              {salon.phone && (
                <div className="public-contact-item">
                  <strong>Phone</strong>
                  <p>{salon.phone}</p>
                </div>
              )}
              {salon.email && (
                <div className="public-contact-item">
                  <strong>Email</strong>
                  <p>{salon.email}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Booking Flow ───────────────────────────────── */}
        {activeSection === 'book' && (
          <section className="public-section">
            <h2>Book an Appointment</h2>

            {bookSuccess ? (
              <div className="public-book-success">
                <div className="success-icon" style={{ color }}>✓</div>
                <h3>Booking Confirmed!</h3>
                <p>We've sent a confirmation to <strong>{guestEmail}</strong>.</p>
                <p>See you on {new Date(`${selectedDate}T${selectedTime}`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {formatTime(selectedTime)}.</p>
                <button className="btn-primary" style={{ background: color }} onClick={() => goToSection('home')}>
                  Back to Home
                </button>
              </div>
            ) : (
              <>
                {/* Stepper */}
                <div className="stepper">
                  {BOOK_STEPS.map((s, i) => (
                    <div key={s} className={`step ${i === bookStep ? 'active' : ''} ${i < bookStep ? 'done' : ''}`}>
                      <div className="step-dot" style={i === bookStep ? { background: color, color: '#fff' } : {}}>
                        {i < bookStep ? '✓' : i + 1}
                      </div>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>

                <div className="step-content">
                  {/* Step 0: Services */}
                  {bookStep === 0 && (() => {
                    const staffServiceIds = selectedStaff?.services
                      ? new Set(selectedStaff.services.map(s => s.id))
                      : null;
                    return (
                    <div>
                      <div className="step-title-row">
                        <h3>Select Services{selectedStaff ? ` — with ${selectedStaff.full_name}` : ''}</h3>
                        <button className="btn-primary" style={{ background: color }} disabled={!selectedServices.length} onClick={() => setBookStep(1)}>Next</button>
                      </div>
                      {categories.map(cat => {
                        const catSvcs = services.filter(s => s.category_id === cat.id);
                        if (!catSvcs.length) return null;
                        return (
                          <div key={cat.id} className="category-group">
                            <h3>{cat.name}</h3>
                            <div className="service-grid">
                              {catSvcs.map(svc => {
                                const unavailable = staffServiceIds && !staffServiceIds.has(svc.id);
                                return (
                                  <div
                                    key={svc.id}
                                    className={`service-card selectable ${selectedServices.find(s => s.id === svc.id) ? 'selected' : ''} ${unavailable ? 'unavailable' : ''}`}
                                    onClick={() => !unavailable && toggleService(svc)}
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
                    );
                  })()}

                  {/* Step 1: Staff */}
                  {bookStep === 1 && (() => {
                    const selectedSvcIds = new Set(selectedServices.map(s => s.id));
                    const eligibleStaff = staff.filter(s =>
                      s.services?.some(svc => selectedSvcIds.has(svc.id))
                    );
                    return (
                    <div>
                      <div className="step-title-row">
                        <h3>Choose a Stylist</h3>
                        <div className="step-nav-btns">
                          <button className="btn-secondary" onClick={() => setBookStep(0)}>Back</button>
                          <button className="btn-primary" style={{ background: color }} onClick={() => setBookStep(2)}>Next</button>
                        </div>
                      </div>
                      <div className="staff-grid">
                        <div className={`staff-card ${!selectedStaff ? 'selected' : ''}`} onClick={() => pickStaff(null)}>
                          <div className="staff-avatar">✦</div>
                          <h3>No Preference</h3>
                          <p>We'll assign the best available stylist</p>
                        </div>
                        {eligibleStaff.map(s => (
                          <div key={s.id} className={`staff-card ${selectedStaff?.id === s.id ? 'selected' : ''}`} onClick={() => pickStaff(s)}>
                            <div className="staff-avatar">
                              {s.avatar_url ? <img src={s.avatar_url} alt={s.full_name} className="staff-avatar-img" /> : s.full_name[0]}
                            </div>
                            <h3>{s.full_name}</h3>
                            <p>{s.bio}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    );
                  })()}

                  {/* Step 2: Date & Time */}
                  {bookStep === 2 && (
                    <div>
                      <div className="step-title-row">
                        <h3>Pick a Date & Time</h3>
                        <div className="step-nav-btns">
                          <button className="btn-secondary" onClick={() => setBookStep(1)}>Back</button>
                          <button className="btn-primary" style={{ background: color }} disabled={!selectedDate || !selectedTime} onClick={() => setBookStep(3)}>Next</button>
                        </div>
                      </div>
                      <div className="datetime-picker">
                        <Calendar selectedDate={selectedDate} onSelectDate={d => { setSelectedDate(d); setSelectedTime(''); }} />
                        {selectedDate && (
                          <div className="time-picker">
                            <label>
                              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </label>
                            <div className="time-grid">
                              {TIMES.map(t => {
                                const blocked = unavailableTimes.includes(t);
                                return (
                                  <button key={t} className={`time-slot ${selectedTime === t ? 'selected' : ''} ${blocked ? 'blocked' : ''}`} disabled={blocked} onClick={() => !blocked && setSelectedTime(t)}>
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

                  {/* Step 3: Guest Info */}
                  {bookStep === 3 && (
                    <div>
                      <div className="step-title-row">
                        <h3>Your Information</h3>
                        <div className="step-nav-btns">
                          <button className="btn-secondary" onClick={() => setBookStep(2)}>Back</button>
                          <button className="btn-primary" style={{ background: color }} disabled={!guestInfoValid} onClick={() => setBookStep(4)}>Next</button>
                        </div>
                      </div>
                      <div className="guest-info-form">
                        <div className="form-group">
                          <label>Full Name *</label>
                          <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Jane Doe" />
                        </div>
                        <div className="form-group">
                          <label>Email *</label>
                          <input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="jane@example.com" />
                        </div>
                        <div className="form-group">
                          <label>Phone</label>
                          <input type="tel" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="(555) 555-0100" />
                        </div>
                        <p className="settings-hint">We'll create an account so you can manage your bookings later.</p>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Confirm */}
                  {bookStep === 4 && (
                    <div className="confirm-step">
                      <div className="step-title-row">
                        <h3>Confirm Booking</h3>
                        <div className="step-nav-btns">
                          <button className="btn-secondary" onClick={() => setBookStep(3)}>Back</button>
                          <button className="btn-primary" style={{ background: color }} onClick={handleGuestSubmit} disabled={submitting}>
                            {submitting ? 'Booking…' : 'Confirm Booking'}
                          </button>
                        </div>
                      </div>
                      <div className="confirm-card">
                        <div className="confirm-row"><span>Name</span><span>{guestName}</span></div>
                        <div className="confirm-row"><span>Email</span><span>{guestEmail}</span></div>
                        {guestPhone && <div className="confirm-row"><span>Phone</span><span>{guestPhone}</span></div>}
                        <div className="confirm-row"><span>Services</span><div>{selectedServices.map(s => <div key={s.id}>{s.name}</div>)}</div></div>
                        <div className="confirm-row"><span>Staff</span><span>{selectedStaff?.full_name ?? 'No preference'}</span></div>
                        <div className="confirm-row"><span>Date</span><span>{new Date(`${selectedDate}T${selectedTime}`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span></div>
                        <div className="confirm-row"><span>Time</span><span>{formatTime(selectedTime)}</span></div>
                        <div className="confirm-row"><span>Duration</span><span>{totalDuration} min</span></div>
                        <div className="confirm-row total"><span>Total</span><span>${totalPrice.toFixed(2)}</span></div>
                      </div>
                      {bookError && <p className="auth-error">{bookError}</p>}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="public-footer">
        <p>&copy; {new Date().getFullYear()} {salon.name}. All rights reserved.</p>
      </footer>
    </div>
  );
}
