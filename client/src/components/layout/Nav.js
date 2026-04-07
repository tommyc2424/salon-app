import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSalon } from '../../context/SalonContext';

export default function Nav() {
  const { user, signOut } = useAuth();
  const { currentSalon, memberships, switchSalon, salonRole } = useSalon();

  const isAdmin = salonRole === 'owner' || salonRole === 'admin';
  const isStaff = salonRole === 'staff';
  const hasMultipleSalons = memberships.length > 1;

  return (
    <nav className="nav">
      <div className="nav-brand">
        {currentSalon
          ? <>
              {currentSalon.settings?.show_title !== false && (
                <span style={{ fontFamily: currentSalon.settings?.font_family ?? 'inherit' }}>
                  {currentSalon.name}
                </span>
              )}
              {currentSalon.logo_url && (
                <img src={currentSalon.logo_url} alt={currentSalon.name} className="nav-logo" />
              )}
            </>
          : 'Salon'}
      </div>
      <div className="nav-links">
        {isAdmin && <>
          <NavLink to="/admin" end>Dashboard</NavLink>
          <NavLink to="/admin/bookings">Bookings</NavLink>
          <NavLink to="/admin/clients">Clients</NavLink>
          <NavLink to="/admin/salons">My Salons</NavLink>
        </>}
        {isStaff && !isAdmin && <>
          <NavLink to="/staff">My Schedule</NavLink>
          <NavLink to="/services">Services</NavLink>
        </>}
        {!isAdmin && !isStaff && <>
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/salons">Salons</NavLink>
          <NavLink to="/services">Services</NavLink>
          <NavLink to="/book">Book</NavLink>
        </>}
      </div>
      <div className="nav-user">
        {hasMultipleSalons && (
          <select
            className="salon-switcher"
            value={currentSalon?.id ?? ''}
            onChange={e => switchSalon(Number(e.target.value))}
          >
            {memberships.map(m => (
              <option key={m.salon_id} value={m.salon_id}>{m.name}</option>
            ))}
          </select>
        )}
        {salonRole && <span className={`role-badge ${salonRole}`}>{salonRole}</span>}
        <span>{user?.email}</span>
        <button onClick={signOut}>Sign Out</button>
      </div>
    </nav>
  );
}
