import { useCallback, useMemo } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const navLinks = [
  { to: '/', label: 'Dashboard', emoji: '📊' },
  { to: '/bills', label: 'Bills', emoji: '💳' },
  { to: '/reminders', label: 'Reminders', emoji: '⏰' },
  { to: '/meal-planner', label: 'Wellness', emoji: '🥗' },
];

const sidebarHighlights = [
  { label: 'Agenda synced', accent: 'purple', to: '/' },
  { label: 'Reminder cadence tuned', accent: 'teal', to: '/reminders' },
  { label: 'Meal plan curated', accent: 'pink', to: '/meal-planner' },
];

const contactChannels = [
  { label: 'Support', value: 'support@personalfortress.app', href: 'mailto:support@personalfortress.app' },
  { label: 'Partnerships', value: 'partnerships@personalfortress.app', href: 'mailto:partnerships@personalfortress.app' },
  { label: 'Community', value: 'Join the lounge', href: 'https://community.personalfortress.app', external: true },
];

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const pageTitle = useMemo(() => {
    if (location.pathname.startsWith('/bills')) return 'Bills & Payments';
    if (location.pathname.startsWith('/reminders')) return 'Reminders';
    if (location.pathname.startsWith('/meal-planner')) return 'Wellness & Calendar';
    return 'Dashboard Overview';
  }, [location.pathname]);

  const today = useMemo(
    () => new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(new Date()),
    []
  );

  const initials = useMemo(() => {
    if (user?.fullName) {
      return user.fullName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((segment) => segment[0]?.toUpperCase())
        .join('');
    }
    if (user?.email) {
      return user.email[0]?.toUpperCase() ?? 'PF';
    }
    return 'PF';
  }, [user]);

  const profileName = user?.fullName || user?.email || 'Guest captain';
  const profileRole = user ? 'Authenticated' : 'Household captain';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleContactClick = useCallback((channel: (typeof contactChannels)[number]) => {
    if (!channel.href) return;
    if (channel.href.startsWith('http')) {
      window.open(channel.href, channel.external ? '_blank' : '_self', channel.external ? 'noopener,noreferrer' : undefined);
      return;
    }
    window.location.href = channel.href;
  }, []);

  const pageContext = useMemo(() => {
    if (location.pathname.startsWith('/bills')) {
      return {
        eyebrow: 'Finance pulse',
        description: 'Track upcoming invoices, automate payments, and stay informed on cash flow in one glance.',
        metrics: [
          { label: 'Invoices ready', value: '4', hint: 'Due within 7 days' },
          { label: 'Auto-pay enabled', value: '6', hint: 'Cards + ACH' },
          { label: 'Spend trend', value: '▼ 8%', hint: 'vs. last month' },
        ],
      } as const;
    }
    if (location.pathname.startsWith('/reminders')) {
      return {
        eyebrow: 'Routine tracker',
        description: 'Your household rituals and maintenance tasks, prioritised and spaced to avoid surprise rushes.',
        metrics: [
          { label: 'Active reminders', value: '12', hint: '3 flagged high priority' },
          { label: 'Snoozed items', value: '2', hint: 'Circling back tomorrow' },
          { label: 'Completion rate', value: '92%', hint: 'Last 30 days' },
        ],
      } as const;
    }
    if (location.pathname.startsWith('/meal-planner')) {
      return {
        eyebrow: 'Wellness spotlight',
        description: 'Balanced meals and holiday treats are lined up—personalise servings while we sync your calendars.',
        metrics: [
          { label: 'Calories today', value: '2,050 kcal', hint: 'Aligned with goal' },
          { label: 'Holiday menus', value: '3', hint: 'Ready for November' },
          { label: 'Shopping gaps', value: '2 items', hint: 'Auto-added to list' },
        ],
      } as const;
    }
    return {
      eyebrow: 'Command centre digest',
      description: 'Financial health, smart devices, and routines harmonised so you can run your home with confidence.',
      metrics: [
        { label: 'Systems online', value: '5 of 5', hint: 'Monitoring in real-time' },
        { label: 'Alerts acknowledged', value: '18', hint: 'Past 24 hours' },
        { label: 'Wellness streak', value: '11 days', hint: 'Family check-ins' },
      ],
    } as const;
  }, [location.pathname]);

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
        <section className="sidebar__section">
          <h3 className="sidebar__section-title">Today&apos;s focus</h3>
          <ul className="sidebar__chips">
            {sidebarHighlights.map((item) => (
              <li key={item.label}>
                <Link to={item.to} className="sidebar__chip" data-accent={item.accent}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="sidebar__section">
          <h3 className="sidebar__section-title">About Personal Fortress</h3>
          <p className="sidebar__text">
            Personal Fortress keeps bills, reminders, devices, and wellbeing plans working in concert. Every insight updates in real time so the household stays calm, coordinated, and informed.
          </p>
          <ul className="sidebar__list">
            <li>Unified command centre for finances, routines, and wellness.</li>
            <li>Calendar-aware automations that surface the right tasks at the right moment.</li>
            <li>Privacy-first: encrypted tokens, opt-in sharing, and clear audit trails.</li>
          </ul>
        </section>
        <section className="sidebar__section sidebar__section--contact">
          <h3 className="sidebar__section-title">Get in touch</h3>
          <div className="sidebar__contact-grid">
            {contactChannels.map((channel) => (
              <button
                key={channel.label}
                type="button"
                className="sidebar__contact-button"
                onClick={() => handleContactClick(channel)}
              >
                <span className="sidebar__contact-label">{channel.label}</span>
                <span className="sidebar__contact-value">{channel.value}</span>
              </button>
            ))}
          </div>
        </section>
        <div className="sidebar__footer">
          <p className="sidebar__footer-title">Need a walkthrough?</p>
          <p className="sidebar__footer-text">Book a 20-minute onboarding to configure bank feeds, reminder cadences, and wellness goals with a product specialist.</p>
          <a className="sidebar__footer-action" href="mailto:hello@personalfortress.app?subject=Schedule%20a%20Personal%20Fortress%20demo">Schedule a demo</a>
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
            {user ? (
              <button type="button" className="ghost-button" onClick={handleLogout}>
                Log out
              </button>
            ) : (
                <Link to="/login" className="ghost-button">Log in</Link>
            )}
            <button type="button" className="primary-button" disabled>
              New reminder (soon)
            </button>
            <div className="topbar__profile">
              <span className="topbar__profile-avatar">{initials}</span>
              <div className="topbar__profile-details">
                <span className="topbar__profile-name">{profileName}</span>
                <span className="topbar__profile-role">{profileRole}</span>
              </div>
            </div>
          </div>
        </header>
        <section className="page-overview">
          <div className="page-overview__primary">
            <span className="page-overview__eyebrow">{pageContext.eyebrow}</span>
            <p className="page-overview__description">{pageContext.description}</p>
          </div>
          <div className="page-overview__metrics">
            {pageContext.metrics.map((metric) => (
              <article key={metric.label} className="page-overview__metric">
                <span className="page-overview__metric-value">{metric.value}</span>
                <span className="page-overview__metric-label">{metric.label}</span>
                {metric.hint ? <span className="page-overview__metric-hint">{metric.hint}</span> : null}
              </article>
            ))}
          </div>
        </section>
        <div className="content-area">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
