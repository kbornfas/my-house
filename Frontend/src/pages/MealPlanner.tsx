import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    CalendarAccount,
    MealPlanPayload,
    completeGoogleConnection,
    connectAppleCalendar,
    createGoogleAuthLink,
    fetchDailyMealPlan,
    fetchUpcomingMealPlans,
    getCalendarAccounts,
    saveMealOverride,
    triggerCalendarSync,
} from '../lib/api';
import { useAuth } from '../lib/auth';

function decodeState(state: string) {
  try {
    const normalized = state.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const json = atob(padded);
    return JSON.parse(json) as { userId: string; redirectUri: string };
  } catch (err) {
    return null;
  }
}

function groupsFromPlan(plan?: MealPlanPayload) {
  if (!plan) return [];
  return Object.entries(plan.courses ?? {});
}

const demoRedirect = `${window.location.origin}/meal-planner`;

function PlannerHeader() {
  return (
    <div className="page">
      <section className="insight-grid">
        <article className="insight-card">
          <header className="insight-card__title">
            <span>Daily Fuel</span>
            <span role="img" aria-label="bento">🍱</span>
          </header>
          <div className="insight-card__value">Stay nourished & on-time</div>
          <footer className="insight-card__footer">
            <span>Sync calendars, never miss a holiday.</span>
            <span className="trend-positive">Balanced menus ready</span>
          </footer>
        </article>
        <article className="insight-card">
          <header className="insight-card__title">
            <span>Automation</span>
            <span role="img" aria-label="sparkles">✨</span>
          </header>
          <div className="insight-card__value">Holiday-aware planning</div>
          <footer className="insight-card__footer">
            <span>Celebratory menus auto-curated</span>
            <span className="trend-neutral">Customize any course</span>
          </footer>
        </article>
      </section>
    </div>
  );
}

interface CalendarListProps {
  accounts?: CalendarAccount[];
  disabled?: boolean;
  onSync(accountId: string): Promise<void>;
}

function CalendarConnections({ accounts, disabled, onSync }: CalendarListProps) {
  return (
    <section className="panel__body">
      <header className="topbar__meta">
        <h2 className="topbar__title">Calendar Connections</h2>
        <p className="topbar__subtitle">Google and Apple feeds power your holiday-aware menus.</p>
      </header>
      <div className="panel__body panel__body--split">
        {(accounts ?? []).map((account) => (
          <article key={account.id} className="insight-card">
            <header className="insight-card__title">
              <span>{account.label ?? account.provider.toUpperCase()}</span>
              <span className="badge">{account.provider}</span>
            </header>
            <div className="insight-card__value" style={{ fontSize: '18px' }}>{account.email ?? 'Connected'}</div>
            <footer className="insight-card__footer">
              <span>Last sync {account.lastSyncedAt ? new Date(account.lastSyncedAt).toLocaleString() : 'pending'}</span>
              <button type="button" className="ghost-button" onClick={() => onSync(account.id)} disabled={disabled}>
                Sync now
              </button>
            </footer>
          </article>
        ))}
      </div>
      {!accounts?.length && (
        <p style={{ color: 'var(--text-secondary)' }}>No calendar linked yet. Connect below.</p>
      )}
    </section>
  );
}

interface MealPlanViewProps {
  plan?: MealPlanPayload;
  onCustomize(): void;
}

function MealPlanView({ plan, onCustomize }: MealPlanViewProps) {
  if (!plan) {
    return <p style={{ color: 'var(--text-secondary)' }}>Select a date to view the plan.</p>;
  }
  return (
    <section className="panel__body">
      <header className="topbar__meta">
        <div className="badge badge--accent">{plan.dateKey}</div>
        <h2 className="topbar__title">
          {plan.isHoliday ? `Holiday Feast (${plan.holiday?.name ?? 'Holiday'})` : 'Balanced Day Plan'}
        </h2>
        <p className="topbar__subtitle">Macros align around {plan.calories ?? 0} kcal • Source: {plan.source}</p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {Object.entries(plan.macros ?? {}).map(([macro, value]) => (
            <span key={macro} className="badge">{macro}: {Math.round(value)}g</span>
          ))}
        </div>
      </header>
      <div className="panel__body panel__body--split">
        {groupsFromPlan(plan).map(([course, items]) => (
          <article key={course} className="insight-card">
            <header className="insight-card__title" style={{ justifyContent: 'flex-start', gap: '8px' }}>
              <span>{course.toUpperCase()}</span>
            </header>
            <ul className="panel__list">
              {items.map((item) => (
                <li key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontWeight: 600 }}>{item.title}</span>
                  {item.nutrients?.calories && (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{Math.round(item.nutrients.calories)} kcal</span>
                  )}
                  {item.sourceUrl && (
                    <a href={item.sourceUrl} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: 'var(--accent-500)' }}>View recipe ↗</a>
                  )}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" className="primary-button" onClick={onCustomize}>Customize plan</button>
      </div>
    </section>
  );
}

interface OverrideEditorProps {
  plan?: MealPlanPayload;
  onSave(payload: Record<string, string>): void;
  onClose(): void;
}

function OverrideEditor({ plan, onSave, onClose }: OverrideEditorProps) {
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const courses: Record<string, string> = {};
    for (const [course, items] of groupsFromPlan(plan)) {
      courses[course] = items.map((item) => item.title).join('\n');
    }
    return courses;
  });

  return (
    <div className="insight-card" style={{ position: 'relative' }}>
      <button type="button" className="ghost-button" style={{ position: 'absolute', top: 16, right: 16 }} onClick={onClose}>Close</button>
      <h3 style={{ marginTop: 0 }}>Customize courses</h3>
      <div className="panel__body">
        {Object.entries(draft).map(([course, value]) => (
          <label key={course} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontWeight: 600 }}>{course.toUpperCase()}</span>
            <textarea
              value={value}
              onChange={(event) => setDraft((prev) => ({ ...prev, [course]: event.target.value }))}
              rows={3}
              style={{ resize: 'vertical', borderRadius: '12px', padding: '12px', background: 'rgba(15,23,42,0.6)', color: 'var(--text-primary)', border: '1px solid rgba(148,163,184,0.2)' }}
            />
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button
          type="button"
          className="primary-button"
          onClick={() => onSave(draft)}
        >
          Save override
        </button>
      </div>
    </div>
  );
}

export default function MealPlanner() {
  const { user } = useAuth();
  const isAuthenticated = Boolean(user);
  const [userId, setUserId] = useState('');
  const [appleEmail, setAppleEmail] = useState('');
  const [applePassword, setApplePassword] = useState('');
  const [showOverrideEditor, setShowOverrideEditor] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const oauthCode = searchParams.get('code');
  const oauthState = searchParams.get('state');
  const [oauthHandled, setOauthHandled] = useState(false);

  useEffect(() => {
    if (user?.id) {
      setUserId(user.id);
    } else {
      setUserId('');
    }
  }, [user?.id]);

  const { data: accounts, refetch: refetchAccounts } = useQuery({
    queryKey: ['calendar-accounts', userId],
    queryFn: () => getCalendarAccounts(userId),
    enabled: Boolean(userId),
  });

  const { data: plan } = useQuery({
    queryKey: ['meal-plan', userId, selectedDate],
    queryFn: () => fetchDailyMealPlan(userId, selectedDate),
    enabled: Boolean(userId),
  });

  const { data: upcoming } = useQuery({
    queryKey: ['meal-plan-upcoming', userId],
    queryFn: () => fetchUpcomingMealPlans(userId, 5),
    enabled: Boolean(userId),
  });

  const googleConnectMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('userId missing');
      const url = await createGoogleAuthLink(userId, demoRedirect);
      window.location.assign(url);
    },
  });

  const appleConnectMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('userId missing');
      if (!appleEmail || !applePassword) throw new Error('Apple credentials missing');
      await connectAppleCalendar({ userId, email: appleEmail, appSpecificPassword: applePassword });
      await refetchAccounts();
      setApplePassword('');
    },
  });

  const syncMutation = useMutation({
    mutationFn: (accountId: string) => triggerCalendarSync(accountId),
    onSuccess: () => refetchAccounts(),
  });

  const overrideMutation = useMutation({
    mutationFn: async (draft: Record<string, string>) => {
      if (!plan || !userId) return;
      const payloadCourses: Record<string, { id: number; title: string }[]> = {};
      Object.entries(draft).forEach(([course, value]) => {
        payloadCourses[course] = value
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((title, index) => ({ id: Date.now() + index, title }));
      });
      await saveMealOverride({ userId, dateKey: plan.dateKey, courses: payloadCourses, holidayId: plan.holiday?.id ?? null });
      await queryClient.invalidateQueries({ queryKey: ['meal-plan', userId, selectedDate] });
      await queryClient.invalidateQueries({ queryKey: ['meal-plan-upcoming', userId] });
    },
    onSuccess: () => setShowOverrideEditor(false),
  });

  useEffect(() => {
    if (oauthCode && oauthState && !oauthHandled) {
      const parsed = decodeState(oauthState);
      if (!parsed) return;
      setOauthHandled(true);
      const targetUser = parsed.userId;
      setUserId((prev) => prev || targetUser);
      completeGoogleConnection({ userId: targetUser, code: oauthCode, redirectUri: demoRedirect })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['calendar-accounts', targetUser] });
        })
        .catch((err) => {
          // eslint-disable-next-line no-alert
          alert(err instanceof Error ? err.message : 'Failed to link Google calendar');
        })
        .finally(() => {
          const params = new URLSearchParams(location.search);
          params.delete('code');
          params.delete('state');
          navigate({ pathname: '/meal-planner', search: params.toString() ? `?${params.toString()}` : '' }, { replace: true });
        });
    }
  }, [oauthCode, oauthState, oauthHandled, location.search, navigate, queryClient]);

  return (
    <div className="page" style={{ gap: '32px' }}>
      <PlannerHeader />

      <section className="insight-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ margin: 0 }}>User context</h2>
        {!isAuthenticated && (
          <p style={{ color: 'var(--warning-400)' }}>
            Sign in to Personal Fortress to connect calendars and meal overrides to your household account.
          </p>
        )}
        <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '320px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>User ID</span>
          <input
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="Paste user id"
            disabled={Boolean(user?.id)}
            style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(15,23,42,0.6)', color: 'var(--text-primary)' }}
          />
        </label>
        {user?.email && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Logged in as <strong>{user.email}</strong></p>
        )}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="primary-button"
            onClick={() => googleConnectMutation.mutate()}
            disabled={!isAuthenticated || !userId || googleConnectMutation.isPending}
          >
            {googleConnectMutation.isPending ? 'Redirecting...' : 'Connect Google Calendar'}
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => appleConnectMutation.mutate()}
            disabled={!isAuthenticated || !userId || appleConnectMutation.isPending}
          >
            {appleConnectMutation.isPending ? 'Connecting...' : 'Connect Apple Calendar'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            value={appleEmail}
            onChange={(event) => setAppleEmail(event.target.value)}
            placeholder="Apple ID email"
            disabled={!isAuthenticated}
            style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(15,23,42,0.6)', color: 'var(--text-primary)' }}
          />
          <input
            type="password"
            value={applePassword}
            onChange={(event) => setApplePassword(event.target.value)}
            placeholder="App-specific password"
            disabled={!isAuthenticated}
            style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(15,23,42,0.6)', color: 'var(--text-primary)' }}
          />
        </div>
      </section>

      <CalendarConnections
        accounts={accounts}
        disabled={!isAuthenticated || !userId}
        onSync={async (accountId) => {
          await syncMutation.mutateAsync(accountId);
        }}
      />

      <section className="insight-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <header className="topbar__meta">
          <h2 className="topbar__title">Meal timeline</h2>
          <p className="topbar__subtitle">Look ahead and see which days carry holiday menus.</p>
        </header>
        <div className="panel__body panel__body--split">
          {(upcoming ?? []).map((item) => (
            <article key={item.dateKey} className="insight-card">
              <header className="insight-card__title" style={{ justifyContent: 'space-between' }}>
                <span>{item.dateKey}</span>
                {item.isHoliday && <span className="badge badge--accent">{item.holiday?.name ?? 'Holiday'}</span>}
              </header>
              <div className="insight-card__value" style={{ fontSize: '22px' }}>{item.isHoliday ? 'Celebration Menu' : 'Balanced Day'}</div>
              <footer className="insight-card__footer">
                <span>{Math.round(item.calories ?? 0)} kcal</span>
                <button type="button" className="ghost-button" onClick={() => setSelectedDate(item.dateKey)}>Focus</button>
              </footer>
            </article>
          ))}
        </div>
      </section>

      <section className="insight-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <header className="topbar__meta">
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <h2 className="topbar__title" style={{ margin: 0 }}>Daily plan</h2>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(15,23,42,0.6)', color: 'var(--text-primary)' }}
            />
          </div>
        </header>
        <MealPlanView plan={plan} onCustomize={() => setShowOverrideEditor(true)} />
        {showOverrideEditor && (
          <OverrideEditor
            plan={plan}
            onClose={() => setShowOverrideEditor(false)}
            onSave={(draft) => overrideMutation.mutate(draft)}
          />
        )}
      </section>
    </div>
  );
}
