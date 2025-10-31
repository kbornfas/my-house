import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api, formatDate } from '../lib/api';
import { useAuth } from '../lib/auth';

type Reminder = {
  id: string;
  userId?: string;
  title: string;
  description?: string | null;
  reminderTime: string;
  category?: string | null;
  color?: string | null;
  isCompleted?: boolean;
};

type ReminderResponse = {
  data: Reminder[];
};

const SAMPLE_REMINDERS: Reminder[] = [
  {
    id: 'sample-reminder-1',
    title: 'Water the backyard garden',
    reminderTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    description: 'Citrus trees need a deep soak. Check irrigation sensors afterwards.',
    color: '#f59e0b',
    category: 'Home',
  },
  {
    id: 'sample-reminder-2',
    title: 'Renew car insurance policy',
    reminderTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Upload proof of mileage, confirm driver roster.',
    color: '#34d399',
    category: 'Finance',
  },
  {
    id: 'sample-reminder-3',
    title: 'Call HVAC specialist',
    reminderTime: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Seasonal tune-up before temperature swing next month.',
    color: '#60a5fa',
    category: 'Maintenance',
    isCompleted: true,
  },
  {
    id: 'sample-reminder-4',
    title: 'Send birthday package to Alex',
    reminderTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Include book voucher and handwritten card.',
    color: '#a855f7',
    category: 'Family',
  },
  {
    id: 'sample-reminder-5',
    title: 'Run weekly budget sync',
    reminderTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Review autopay queue and reconcile receipts.',
    color: '#6366f1',
    category: 'Finance',
  },
];

export default function Reminders() {
  const { user } = useAuth();
  const isAuthenticated = Boolean(user);

  const { data, isLoading, isError } = useQuery<ReminderResponse>({
    queryKey: ['reminders'],
    queryFn: async () => {
      const response = await api.get<ReminderResponse>('/reminders');
      return response.data;
    },
    staleTime: 60_000,
    enabled: isAuthenticated,
    retry: isAuthenticated ? 2 : false,
  });

  const reminders = isAuthenticated ? data?.data ?? [] : [];
  const hasRealReminders = reminders.length > 0;
  const usingSampleData = !isAuthenticated || !hasRealReminders;
  const displayReminders = usingSampleData ? SAMPLE_REMINDERS : reminders;

  const grouped = useMemo(() => {
    const upcoming = displayReminders
      .filter((reminder) => !reminder.isCompleted)
      .sort((a, b) => new Date(a.reminderTime).getTime() - new Date(b.reminderTime).getTime());
    const completed = displayReminders
      .filter((reminder) => reminder.isCompleted)
      .sort((a, b) => new Date(b.reminderTime).getTime() - new Date(a.reminderTime).getTime());

    return { upcoming, completed };
  }, [displayReminders]);

  const cadence = useMemo(() => {
    const total = displayReminders.length;
    const completed = displayReminders.filter((reminder) => reminder.isCompleted).length;
    const today = new Date();
    const upcomingToday = grouped.upcoming.filter((reminder) => {
      const time = new Date(reminder.reminderTime);
      return time.getDate() === today.getDate() && time.getMonth() === today.getMonth();
    }).length;
    return {
      total,
      completed,
      completionRate: total ? Math.round((completed / total) * 100) : 0,
      today: upcomingToday,
    };
  }, [displayReminders, grouped.upcoming]);

  const categoryInsights = useMemo(() => {
    const buckets = new Map<string, number>();
    displayReminders.forEach((reminder) => {
      const key = reminder.category ?? 'General';
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    });
    const entries = Array.from(buckets.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
    return entries;
  }, [displayReminders]);

  const rituals = useMemo(() => {
    const topCategory = categoryInsights[0]?.category ?? 'your routines';
    return [
      {
        title: 'Batch reminders by theme',
        detail: `Bundle ${topCategory.toLowerCase()} events into a single weekly slot to reduce alert fatigue.`,
        accent: '#34d399',
      },
      {
        title: 'Set a daily calm window',
        detail: 'Pick a quiet moment to review the next 24 hours—Personal Fortress will highlight anything urgent.',
        accent: '#f97316',
      },
      {
        title: 'Archive with intent',
        detail: 'Use completion notes to capture learnings and keep family members in sync.',
        accent: '#60a5fa',
      },
    ];
  }, [categoryInsights]);

  const schedulePreview = useMemo(() => {
    return grouped.upcoming.slice(0, 6).map((reminder) => ({
      id: reminder.id,
      label: formatDate(reminder.reminderTime, { dateStyle: 'medium', timeStyle: 'short' }),
      title: reminder.title,
      detail: reminder.description || 'Staying on top of your household cadence.',
      accent: reminder.color ?? '#6366f1',
    }));
  }, [grouped.upcoming]);

  return (
    <div className="page">
      <section className="page-header">
        <div>
          <h2 className="page-header__title">Reminder timeline</h2>
          <p className="page-header__subtitle">
            Color-coded alerts keep your household calm and on schedule. Tap into the timeline for a quick briefing.
          </p>
        </div>
        <div className="quick-actions">
          <button type="button">Add reminder (soon)</button>
          <button type="button">Invite a family member</button>
        </div>
      </section>

      {usingSampleData && (
        <section className="announcement">
          <strong>{isAuthenticated ? 'Showing demo reminders' : 'Sign in to review your reminders'}</strong>
          <p className="supporting-text">
            {isAuthenticated
              ? 'Connect Firebase Cloud Messaging or seed Prisma data to populate this experience with live reminders per user.'
              : 'Log in to Personal Fortress so your scheduled reminders appear in this timeline. Everything refreshes automatically after authentication.'}
          </p>
        </section>
      )}

      <section className="insight-grid">
        <article className="insight-card">
          <div className="insight-card__title">Reminder cadence</div>
          <div className="insight-card__value">{cadence.total}</div>
          <div className="insight-card__footer">
            <span className="trend-positive">{cadence.completionRate}% completion</span>
            <span className="supporting-text">{cadence.today} scheduled today</span>
          </div>
        </article>
        <article className="insight-card">
          <div className="insight-card__title">Focus channel</div>
          <div className="panel__list">
            {categoryInsights.slice(0, 3).map((entry) => (
              <div key={entry.category} className="panel__list-item" style={{ padding: '10px 12px', background: 'rgba(15, 23, 42, 0.65)' }}>
                <span className="marker" style={{ background: '#f59e0b' }} />
                <div>
                  <strong>{entry.category}</strong>
                  <p className="supporting-text">{entry.count} reminders in rotation</p>
                </div>
              </div>
            ))}
          </div>
        </article>
        <article className="insight-card">
          <div className="insight-card__title">Calm streak</div>
          <div className="insight-card__value">{Math.max(1, cadence.completed)}</div>
          <div className="insight-card__footer">
            <span className="trend-neutral">Keep celebrating small wins</span>
            <span className="supporting-text">Archive promptly to build momentum</span>
          </div>
        </article>
      </section>

      <div className="panel">
        <div className="panel__header">
          <div>
            <h3 className="panel__title">Upcoming reminders</h3>
            <p className="panel__subtitle">All the important pings, lined up in chronological order.</p>
          </div>
          <span className="status-pill status-pill--neutral">{grouped.upcoming.length} scheduled</span>
        </div>

        {isAuthenticated && isLoading && <div className="alert">Loading reminders…</div>}
        {isAuthenticated && isError && (
          <div className="alert alert--error">
            Could not load reminders from the server. Showing the latest cached view instead.
          </div>
        )}

        <div className="timeline">
          {grouped.upcoming.length === 0 && !isLoading ? (
            <div className="alert">
              Everything looks quiet. Create your first reminder to keep the momentum going.
            </div>
          ) : (
            grouped.upcoming.map((reminder) => (
              <article key={reminder.id} className="timeline-item">
                <div className="timeline-item__time">
                  {formatDate(reminder.reminderTime, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </div>
                <div
                  className="timeline-item__card"
                  style={{
                    borderColor: reminder.color ?? 'rgba(99, 102, 241, 0.45)',
                    boxShadow: `0 10px 30px ${reminder.color ?? 'rgba(99, 102, 241, 0.25)'}`,
                  }}
                >
                  <h4>{reminder.title}</h4>
                  <p>{reminder.description || 'No extra details provided.'}</p>
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      <section className="panel panel--glow">
        <div className="panel__header">
          <div>
            <h3 className="panel__title">Calm rituals</h3>
            <p className="panel__subtitle">Embedding routines that keep Personal Fortress delightful.</p>
          </div>
          <span className="pill pill--info">Lifestyle ready</span>
        </div>
        <div className="panel__body panel__body--split">
          {rituals.map((ritual) => (
            <div key={ritual.title} className="panel__list-item">
              <span className="marker" style={{ background: ritual.accent }} />
              <div>
                <strong>{ritual.title}</strong>
                <p className="supporting-text">{ritual.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <h3 className="panel__title">Completed</h3>
            <p className="panel__subtitle">Filed away but always accessible for reference.</p>
          </div>
          <span className="status-pill status-pill--success">{grouped.completed.length} done</span>
        </div>

        <div className="timeline">
          {grouped.completed.length === 0 ? (
            <div className="alert">No completed reminders yet. Stay tuned!</div>
          ) : (
            grouped.completed.map((reminder) => (
              <article key={reminder.id} className="timeline-item">
                <div className="timeline-item__time">
                  {formatDate(reminder.reminderTime, { dateStyle: 'medium' })}
                </div>
                <div className="timeline-item__card" style={{ borderColor: 'rgba(34, 197, 94, 0.35)' }}>
                  <h4>{reminder.title}</h4>
                  <p>{reminder.description || 'Marked complete with confidence.'}</p>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <h3 className="panel__title">Schedule preview</h3>
            <p className="panel__subtitle">A compact punch-list for the next few days.</p>
          </div>
        </div>
        <div className="activity-feed">
          {schedulePreview.map((entry) => (
            <div key={entry.id} className="activity-feed__item">
              <span className="activity-feed__time">{entry.label}</span>
              <div className="activity-feed__card">
                <div className="legend">
                  <span className="legend__item">
                    <span className="legend__swatch" style={{ background: entry.accent }} />
                    Upcoming reminder
                  </span>
                </div>
                <h4 style={{ margin: '12px 0 6px' }}>{entry.title}</h4>
                <p className="supporting-text">{entry.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
