import { useMemo } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';

const navLinks = [
  { to: '/', label: 'Dashboard', emoji: '📊' },
  { to: '/bills', label: 'Bills', emoji: '💳' },
  { to: '/reminders', label: 'Reminders', emoji: '⏰' },
];

export function AppLayout() {
  const location = useLocation();

  const pageTitle = useMemo(() => {
    if (location.pathname.startsWith('/bills')) return 'Bills & Payments';
    if (location.pathname.startsWith('/reminders')) return 'Reminders';
    return 'Dashboard Overview';
  }, [location.pathname]);

  const today = useMemo(
    () => new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(new Date()),
    []
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__logo">Personal Fortress</span>
          <span className="sidebar__subtitle">Your home mission control</span>
        </div>
        <nav>
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}
            >
              <span className="nav-link__icon" aria-hidden>{link.emoji}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__footer">
          <strong>Stay ahead of every bill.</strong><br />
          Tailored reminders, color-coded insights, and a calm command center for your home.
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div className="topbar__meta">
            <p className="topbar__subtitle">{today}</p>
            <h1 className="topbar__title">{pageTitle}</h1>
            <span className="topbar__badge">Beta mission control</span>
          </div>
          <div className="topbar__actions">
            <Link to="/login" className="ghost-button">Log in</Link>
            <button type="button" className="primary-button" disabled>
              New reminder (soon)
            </button>
            <div className="topbar__profile">
              <span className="topbar__profile-avatar">PF</span>
              <div className="topbar__profile-details">
                <span className="topbar__profile-name">Alex Morgan</span>
                <span className="topbar__profile-role">Household captain</span>
              </div>
            </div>
          </div>
        </header>
        <div className="content-area">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
