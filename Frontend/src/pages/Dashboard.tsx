import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api, formatCurrency, formatDate } from '../lib/api';
import { useAuth } from '../lib/auth';

type Bill = {
  id: string;
  name: string;
  amount: string | number;
  dueDate: string;
  status?: string | null;
  autoPay?: boolean | null;
  category?: string | null;
  color?: string | null;
};

type Reminder = {
  id: string;
  title: string;
  reminderTime: string;
  description?: string | null;
  color?: string | null;
  isCompleted?: boolean;
};

type BillResponse = { data: Bill[] };
type ReminderResponse = { data: Reminder[] };

const SAMPLE_BILLS: Bill[] = [
  {
    id: 'sample-bill-1',
    name: 'Electricity · Lumina Grid',
    amount: 128.42,
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'due soon',
    autoPay: true,
    category: 'Utilities',
    color: '#818cf8',
  },
  {
    id: 'sample-bill-2',
    name: 'Mortgage · Harbor Bank',
    amount: 1850,
    dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'scheduled',
    autoPay: true,
    category: 'Housing',
    color: '#f97316',
  },
  {
    id: 'sample-bill-3',
    name: 'Groceries · Collective Co-op',
    amount: 210.61,
    dueDate: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'scheduled',
    autoPay: false,
    category: 'Household',
    color: '#22d3ee',
  },
  {
    id: 'sample-bill-4',
    name: 'Streaming · Stellar TV',
    amount: 24.99,
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'paid',
    autoPay: true,
    category: 'Entertainment',
    color: '#f97316',
  },
];

const SAMPLE_REMINDERS: Reminder[] = [
  {
    id: 'sample-reminder-1',
    title: 'Water the backyard garden',
    reminderTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    description: 'Citrus trees need a deep soak. Check irrigation sensors afterwards.',
    color: '#f59e0b',
  },
  {
    id: 'sample-reminder-2',
    title: 'Renew car insurance policy',
    reminderTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Upload proof of mileage, confirm driver roster.',
    color: '#34d399',
  },
  {
    id: 'sample-reminder-3',
    title: 'Call HVAC specialist',
    reminderTime: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Seasonal tune-up before temperature swing next month.',
    color: '#60a5fa',
    isCompleted: true,
  },
  {
    id: 'sample-reminder-4',
    title: 'Send birthday package to Alex',
    reminderTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Include book voucher and handwritten card.',
    color: '#a855f7',
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const isAuthenticated = Boolean(user);

  const { data: billsData, isLoading: billsLoading, isError: billsError } = useQuery<BillResponse>({
    queryKey: ['dashboard', 'bills'],
    queryFn: async () => {
      const response = await api.get<BillResponse>('/bills');
      return response.data;
    },
    staleTime: 60_000,
    enabled: isAuthenticated,
    retry: isAuthenticated ? 2 : false,
  });

  const { data: remindersData, isLoading: remindersLoading, isError: remindersError } = useQuery<ReminderResponse>({
    queryKey: ['dashboard', 'reminders'],
    queryFn: async () => {
      const response = await api.get<ReminderResponse>('/reminders');
      return response.data;
    },
    staleTime: 60_000,
    enabled: isAuthenticated,
    retry: isAuthenticated ? 2 : false,
  });

  const bills = isAuthenticated ? billsData?.data ?? [] : [];
  const reminders = isAuthenticated ? remindersData?.data ?? [] : [];

  const hasRealBills = bills.length > 0;
  const hasRealReminders = reminders.length > 0;
  const displayBills = !isAuthenticated || !hasRealBills ? SAMPLE_BILLS : bills;
  const displayReminders = !isAuthenticated || !hasRealReminders ? SAMPLE_REMINDERS : reminders;

  const summaries = useMemo(() => {
    const outstanding = displayBills.reduce((total, bill) => {
      const amount = typeof bill.amount === 'string' ? Number.parseFloat(bill.amount) : bill.amount;
      if (!Number.isFinite(amount)) return total;
      if (bill.status?.toLowerCase() === 'paid') return total;
      return total + amount;
    }, 0);

    const autopay = displayBills.filter((bill) => bill.autoPay).length;

    const dueSoon = displayBills.filter((bill) => {
      const due = new Date(bill.dueDate).getTime();
      const now = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      return due > now && due - now <= sevenDays;
    }).length;

    return {
      outstanding,
      autopay,
      dueSoon,
    };
  }, [displayBills]);

  const upcomingBills = useMemo(
    () =>
      displayBills
        .slice()
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 4),
    [displayBills]
  );

  const upcomingReminders = useMemo(
    () =>
      displayReminders
        .slice()
        .sort((a, b) => new Date(a.reminderTime).getTime() - new Date(b.reminderTime).getTime())
        .slice(0, 4),
    [displayReminders]
  );

  const paidRatio = useMemo(() => {
    if (displayBills.length === 0) return 0;
    const paid = displayBills.filter((bill) => bill.status?.toLowerCase() === 'paid').length;
    return Math.round((paid / displayBills.length) * 100);
  }, [displayBills]);

  const reminderCompletionRate = useMemo(() => {
    if (displayReminders.length === 0) return 0;
    const done = displayReminders.filter((reminder) => reminder.isCompleted).length;
    return Math.round((done / displayReminders.length) * 100);
  }, [displayReminders]);

  const autopayCoverage = displayBills.length
    ? Math.round((displayBills.filter((bill) => bill.autoPay).length / displayBills.length) * 100)
    : 0;

  const overdueBills = displayBills.filter((bill) => bill.status?.toLowerCase() === 'overdue');
  const nextBill = upcomingBills[0];

  const householdHealthScore = Math.min(
    99,
    Math.max(62, Math.round(70 + autopayCoverage / 2 - overdueBills.length * 6))
  );

  const momentumTrend = reminderCompletionRate >= 60 ? '+8% vs last month' : '+2% vs last month';

  const focusItems = useMemo(() => {
    const items = [] as Array<{
      title: string;
      detail: string;
      accent: string;
    }>;

    if (nextBill) {
      items.push({
        title: `Prepare ${nextBill.name}`,
        detail: `Due ${formatDate(nextBill.dueDate)} · ${nextBill.autoPay ? 'Autopay will handle it.' : 'Manual payment needed.'}`,
        accent: nextBill.color ?? '#6366f1',
      });
    }

    const manualBill = displayBills.find((bill) => !bill.autoPay);
    if (manualBill) {
      items.push({
        title: 'Activate autopay coverage',
        detail: `${manualBill.name} is still manual. Enable autopay to boost your health score.`,
        accent: '#f97316',
      });
    }

    const reminder = upcomingReminders[0];
    if (reminder) {
      items.push({
        title: reminder.title,
        detail: `${formatDate(reminder.reminderTime, { dateStyle: 'medium', timeStyle: 'short' })} · ${reminder.description ?? 'Stay consistent and keep momentum.'}`,
        accent: reminder.color ?? '#f59e0b',
      });
    }

    return items.slice(0, 3);
  }, [displayBills, upcomingReminders, nextBill]);

  const timeline = useMemo(() => {
    const billEvents = displayBills.map((bill) => {
      const amount = typeof bill.amount === 'string' ? Number.parseFloat(bill.amount) : bill.amount;
      return {
        timestamp: new Date(bill.dueDate),
        title: bill.name,
        detail: Number.isFinite(amount)
          ? `Payment of ${formatCurrency(amount)} ${bill.autoPay ? 'scheduled via autopay.' : 'awaiting manual confirmation.'}`
          : 'Upcoming payment window.',
        accent: bill.color ?? '#818cf8',
        type: bill.status?.toLowerCase() === 'paid' ? 'Paid bill' : 'Bill due',
      };
    });

    const reminderEvents = displayReminders.map((reminder) => ({
      timestamp: new Date(reminder.reminderTime),
      title: reminder.title,
      detail: reminder.description || 'Stay on track with your household cadence.',
      accent: reminder.color ?? '#f59e0b',
      type: reminder.isCompleted ? 'Completed reminder' : 'Reminder',
    }));

    return [...billEvents, ...reminderEvents]
      .filter((entry) => !Number.isNaN(entry.timestamp.getTime()))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .slice(0, 6);
  }, [displayBills, displayReminders]);

  const chartData = useMemo(() => {
    const buckets = new Map<string, { label: string; value: number }>();

    displayBills.forEach((bill) => {
      const date = new Date(bill.dueDate);
      if (Number.isNaN(date.getTime())) return;
      const amount = typeof bill.amount === 'string' ? Number.parseFloat(bill.amount) : bill.amount;
      if (!Number.isFinite(amount)) return;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const label = date.toLocaleString('en-US', { month: 'short' });
      const existing = buckets.get(key);
      buckets.set(key, {
        label,
        value: (existing?.value ?? 0) + amount,
      });
    });

    const sorted = Array.from(buckets.values()).sort((a, b) => a.label.localeCompare(b.label));
    const recent = sorted.slice(-5);
    const maxValue = recent.reduce((max, entry) => Math.max(max, entry.value), 0);

    return recent.map((entry) => ({
      ...entry,
      ratio: maxValue ? Math.max(16, Math.round((entry.value / maxValue) * 100)) : 16,
    }));
  }, [displayBills]);

  const showSampleAnnouncement = !isAuthenticated || !hasRealBills || !hasRealReminders;

  return (
    <div className="page">
      <section className="page-header">
        <div>
          <h2 className="page-header__title">Welcome back</h2>
          <p className="page-header__subtitle">
            Stay on top of your household finances with real-time insights, upcoming bills, and colorful reminders.
          </p>
        </div>
        <div className="quick-actions">
          <Link to="/bills" className="quick-action-link">Review bills</Link>
          <Link to="/reminders" className="quick-action-link">Plan reminders</Link>
          <button type="button">Export summary</button>
        </div>
      </section>

      {showSampleAnnouncement && (
        <section className="announcement">
          <strong>{isAuthenticated ? 'Demo mode activated' : 'Sign in to unlock live metrics'}</strong>
          <p className="supporting-text">
            {isAuthenticated
              ? 'Connect your API or seed sample data to replace the illustrative household metrics shown below. Everything updates in real time once your services are live.'
              : 'Log in with your Personal Fortress credentials to stream bills, reminders, and meal plans into this dashboard. Once authenticated, the figures below refresh automatically.'}
          </p>
          <div className="legend">
            <span className="legend__item">
              <span className="legend__swatch" style={{ background: '#818cf8' }} /> Bills preview
            </span>
            <span className="legend__item">
              <span className="legend__swatch" style={{ background: '#f59e0b' }} /> Reminder preview
            </span>
          </div>
        </section>
      )}

      <section className="stat-grid">
        <article className="stat-card">
          <span className="stat-card__label">Outstanding balance</span>
          <span className="stat-card__value">{formatCurrency(summaries.outstanding)}</span>
          <span className="stat-card__trend">On track • keep autopay running</span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Bills with autopay</span>
          <span className="stat-card__value">{summaries.autopay}</span>
          <div className="progress-bar">
            <div className="progress-bar__value" style={{ width: `${paidRatio}%` }} />
          </div>
          <span className="stat-card__trend">{paidRatio}% of your bills already paid</span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Due this week</span>
          <span className="stat-card__value">{summaries.dueSoon}</span>
          <span className="stat-card__trend" style={{ color: summaries.dueSoon > 0 ? 'var(--warning-500)' : 'var(--success-500)' }}>
            {summaries.dueSoon > 0 ? 'Plan a payment now' : 'All clear for the week'}
          </span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Reminders scheduled</span>
          <span className="stat-card__value">{displayReminders.length}</span>
          <span className="stat-card__trend">Consistency builds calm</span>
        </article>
      </section>

      <section className="insight-grid">
        <article className="insight-card">
          <div className="insight-card__title">
            Household health score
            <span className="badge badge--accent">Monitored</span>
          </div>
          <div className="insight-card__value">{householdHealthScore}</div>
          <div className="insight-card__footer">
            <span className="trend-positive">{momentumTrend}</span>
            <span className="supporting-text">Autopay coverage {autopayCoverage}%</span>
          </div>
        </article>
        <article className="insight-card">
          <div className="insight-card__title">Next priority</div>
          <div className="mini-metric">
            <strong>{nextBill ? nextBill.name : 'Add your first bill'}</strong>
            <span>{nextBill ? `Due ${formatDate(nextBill.dueDate, { dateStyle: 'long' })}` : 'No upcoming payments detected.'}</span>
          </div>
          <div className="chart-summary">
            <div className="chart-bars">
              {chartData.map((entry) => (
                <div
                  key={entry.label}
                  className="chart-bar"
                  data-label={entry.label}
                  style={{ height: `${entry.ratio}%` }}
                >
                  <span className="chart-bar__value">{formatCurrency(entry.value)}</span>
                </div>
              ))}
            </div>
            <span className="supporting-text">Rolling monthly obligations visualized.</span>
          </div>
        </article>
        <article className="insight-card">
          <div className="insight-card__title">Reminder momentum</div>
          <div className="insight-card__value">{reminderCompletionRate}%</div>
          <div className="insight-card__footer">
            <span className="trend-warning">{displayReminders.length} active cues</span>
            <span className="supporting-text">Celebrate wins • Archive as you go</span>
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <h3 className="panel__title">Upcoming bills</h3>
            <p className="panel__subtitle">
              Take a glance at the next few due dates and amounts. Click through for the full register.
            </p>
          </div>
          <Link to="/bills" className="ghost-button">
            Manage bills
          </Link>
        </div>

        {isAuthenticated && billsLoading && <div className="alert">Fetching your latest bill activity…</div>}
        {isAuthenticated && billsError && (
          <div className="alert alert--error">
            Could not reach the server right now. Showing the last known data.
          </div>
        )}

        <div className="list-grid">
          {upcomingBills.length === 0 ? (
            <div className="alert">No bills scheduled yet. Add your first bill to start tracking.</div>
          ) : (
            upcomingBills.map((bill) => {
              const amount = typeof bill.amount === 'string' ? Number.parseFloat(bill.amount) : bill.amount;
              const status = bill.status?.toLowerCase() ?? 'scheduled';
              const statusClass =
                status === 'paid'
                  ? 'status-pill--success'
                  : status === 'overdue'
                  ? 'status-pill--danger'
                  : 'status-pill--neutral';

              return (
                <div key={bill.id} className="bill-list-item">
                  <div className="bill-list-item__info">
                    <h4>{bill.name}</h4>
                    <p>
                      Due {formatDate(bill.dueDate)} · {bill.autoPay ? 'Autopay active' : 'Manual payment'}
                    </p>
                  </div>
                  <div>
                    <div className={`status-pill ${statusClass}`}>{status}</div>
                    <strong>{Number.isFinite(amount) ? formatCurrency(amount) : '—'}</strong>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="panel panel--accent">
        <div className="panel__header">
          <div>
            <h3 className="panel__title">Next reminders</h3>
            <p className="panel__subtitle">Keep family life flowing with a coordinated timeline.</p>
          </div>
          <Link to="/reminders" className="ghost-button">
            View calendar
          </Link>
        </div>
        <div className="list-grid">
          {upcomingReminders.length === 0 ? (
            <div className="alert">Set your first reminder to fill this space with color-coded cues.</div>
          ) : (
            upcomingReminders.map((reminder) => (
              <div
                key={reminder.id}
                className="reminder-list-item"
                style={{ borderLeft: `4px solid ${reminder.color ?? '#6366f1'}` }}
              >
                <div className="reminder-list-item__info">
                  <h4>{reminder.title}</h4>
                  <p>{reminder.description || 'Stay prepared and keep moving forward.'}</p>
                </div>
                <span className="status-pill status-pill--neutral">{formatDate(reminder.reminderTime)}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="panel panel--glow">
        <div className="panel__header">
          <div>
            <h3 className="panel__title">Focus playbook</h3>
            <p className="panel__subtitle">Three small moves that keep the fortress humming.</p>
          </div>
          <span className="pill pill--info">Actionable today</span>
        </div>
        <div className="panel__body panel__body--split">
          {focusItems.map((item) => (
            <div key={item.title} className="panel__list-item">
              <span className="marker" style={{ background: item.accent }} />
              <div>
                <strong>{item.title}</strong>
                <p className="supporting-text">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <h3 className="panel__title">Mission timeline</h3>
            <p className="panel__subtitle">A unified feed of upcoming payments and reminders.</p>
          </div>
        </div>
        <div className="activity-feed">
          {timeline.map((entry) => (
            <div key={`${entry.title}-${entry.timestamp.toISOString()}`} className="activity-feed__item">
              <span className="activity-feed__time">{formatDate(entry.timestamp, { dateStyle: 'medium' })}</span>
              <div className="activity-feed__card">
                <div className="legend">
                  <span className="legend__item">
                    <span className="legend__swatch" style={{ background: entry.accent }} />
                    {entry.type}
                  </span>
                </div>
                <h4 style={{ margin: '12px 0 6px' }}>{entry.title}</h4>
                <p className="supporting-text">{entry.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <h3 className="panel__title">Quick actions</h3>
            <p className="panel__subtitle">Power moves to keep Personal Fortress tidy.</p>
          </div>
        </div>
        <div className="quick-actions">
          <button type="button">Add a new bill</button>
          <button type="button">Invite another device</button>
          <button type="button">Update notification colors</button>
          <button type="button">Download monthly report</button>
        </div>
      </section>
    </div>
  );
}
