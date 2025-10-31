import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api, formatCurrency, formatDate } from '../lib/api';
import { useAuth } from '../lib/auth';

type Bill = {
  id: string;
  name: string;
  amount: string | number;
  dueDate: string;
  status?: string | null;
  category?: string | null;
  autoPay?: boolean | null;
  color?: string | null;
};

type BillResponse = {
  data: Bill[];
};

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
    color: '#a855f7',
  },
  {
    id: 'sample-bill-5',
    name: 'Water · City Works',
    amount: 62.13,
    dueDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'scheduled',
    autoPay: false,
    category: 'Utilities',
    color: '#38bdf8',
  },
];

function getStatusClass(status: string) {
  if (status === 'paid') return 'status-pill status-pill--success';
  if (status === 'overdue') return 'status-pill status-pill--danger';
  if (status === 'due soon') return 'status-pill status-pill--warning';
  return 'status-pill status-pill--neutral';
}

export default function Bills() {
  const { user } = useAuth();
  const isAuthenticated = Boolean(user);

  const { data, isLoading, isError } = useQuery<BillResponse>({
    queryKey: ['bills'],
    queryFn: async () => {
      const response = await api.get<BillResponse>('/bills');
      return response.data;
    },
    staleTime: 60_000,
    enabled: isAuthenticated,
    retry: isAuthenticated ? 2 : false,
  });

  const bills = isAuthenticated ? data?.data ?? [] : [];
  const hasRealBills = bills.length > 0;
  const usingSampleData = !isAuthenticated || !hasRealBills;
  const displayBills = usingSampleData ? SAMPLE_BILLS : bills;

  const sortedBills = useMemo(
    () =>
      displayBills
        .slice()
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
    [displayBills]
  );

  const totals = useMemo(() => {
    let total = 0;
    let autopay = 0;
    let paid = 0;

    for (const bill of displayBills) {
      const amount = typeof bill.amount === 'string' ? Number.parseFloat(bill.amount) : bill.amount;
      if (Number.isFinite(amount)) total += amount;
      if (bill.autoPay) autopay += 1;
      if (bill.status?.toLowerCase() === 'paid') paid += 1;
    }

    return {
      total,
      autopay,
      paid,
    };
  }, [displayBills]);

  const autopayCoverage = displayBills.length
    ? Math.round((displayBills.filter((bill) => bill.autoPay).length / displayBills.length) * 100)
    : 0;

  const averageTicket = displayBills.length
    ? totals.total / displayBills.length
    : 0;

  const highestBill = useMemo(() => {
    return displayBills.reduce(
      (acc, bill) => {
        const amount = typeof bill.amount === 'string' ? Number.parseFloat(bill.amount) : bill.amount;
        if (Number.isFinite(amount) && amount > acc.amount) {
          return { label: bill.name, amount };
        }
        return acc;
      },
      { label: '—', amount: 0 }
    );
  }, [displayBills]);

  const categoryBreakdown = useMemo(() => {
    const totalsByCategory = new Map<string, number>();
    displayBills.forEach((bill) => {
      const amount = typeof bill.amount === 'string' ? Number.parseFloat(bill.amount) : bill.amount;
      if (!Number.isFinite(amount)) return;
      const category = bill.category ?? 'General';
      totalsByCategory.set(category, (totalsByCategory.get(category) ?? 0) + amount);
    });

    const entries = Array.from(totalsByCategory.entries()).map(([category, value]) => ({
      category,
      value,
    }));

    const totalAmount = entries.reduce((acc, entry) => acc + entry.value, 0);
    return entries
      .sort((a, b) => b.value - a.value)
      .map((entry) => ({
        ...entry,
        percent: totalAmount ? Math.round((entry.value / totalAmount) * 100) : 0,
      }));
  }, [displayBills]);

  const suggestions = useMemo(() => {
    const items: Array<{ title: string; detail: string; accent: string }> = [];

    if (autopayCoverage < 80) {
      items.push({
        title: 'Boost autopay coverage',
        detail: 'Enable autopay on your recurring utilities to raise the household health score and avoid late fees.',
        accent: '#818cf8',
      });
    }

    if (categoryBreakdown.length > 0) {
      const topCategory = categoryBreakdown[0];
      items.push({
        title: `Audit ${topCategory.category}`,
        detail: `${topCategory.percent}% of your monthly spend lives here. Scan for opportunities to renegotiate or bundle services.`,
        accent: '#f97316',
      });
    }

    const manualBill = displayBills.find((bill) => !bill.autoPay);
    if (manualBill) {
      items.push({
        title: `${manualBill.name} is manual`,
        detail: 'Set a reminder the day before it is due or enroll it into autopay to lock in your calm cadence.',
        accent: manualBill.color ?? '#22d3ee',
      });
    }

    if (items.length === 0) {
      items.push({
        title: 'Systems are humming',
        detail: 'Everything is paid and automated. Keep an eye on category drift with quick exports.',
        accent: '#34d399',
      });
    }

    return items;
  }, [autopayCoverage, categoryBreakdown, displayBills]);

  const journal = useMemo(() => {
    return displayBills
      .slice()
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .map((bill) => {
        const amount = typeof bill.amount === 'string' ? Number.parseFloat(bill.amount) : bill.amount;
        return {
          id: bill.id,
          date: formatDate(bill.dueDate, { dateStyle: 'medium' }),
          name: bill.name,
          detail: `${bill.status ?? 'Scheduled'} · ${bill.autoPay ? 'Autopay' : 'Manual'} · ${Number.isFinite(amount) ? formatCurrency(amount) : '—'}`,
          accent: bill.color ?? '#6366f1',
        };
      })
      .slice(0, 6);
  }, [displayBills]);

  return (
    <div className="page">
      <section className="page-header">
        <div>
          <h2 className="page-header__title">Bills &amp; payments</h2>
          <p className="page-header__subtitle">
            Track every subscription, utility, and payment rhythm from one vibrant command center.
          </p>
        </div>
        <div className="quick-actions">
          <button type="button">Add bill (coming soon)</button>
          <button type="button">Color code categories</button>
          <button type="button">Download CSV</button>
        </div>
      </section>

      {usingSampleData && (
        <section className="announcement">
          <strong>{isAuthenticated ? 'Previewing sample billing data' : 'Sign in to load household bills'}</strong>
          <p className="supporting-text">
            {isAuthenticated
              ? 'Connect your backend API to replace these reference figures with live household statements. The interface is ready for complete CRUD flows.'
              : 'Use your Personal Fortress account to retrieve live statements. Once signed in, refreshed data appears instantly across the dashboard.'}
          </p>
        </section>
      )}

      <section className="stat-grid">
        <article className="stat-card">
          <span className="stat-card__label">Total scheduled</span>
          <span className="stat-card__value">{formatCurrency(totals.total)}</span>
          <span className="stat-card__trend">Across {displayBills.length} active bills</span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Autopay enabled</span>
          <span className="stat-card__value">{totals.autopay}</span>
          <span className="stat-card__trend">Coverage {autopayCoverage}%</span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Paid this month</span>
          <span className="stat-card__value">{totals.paid}</span>
          <span className="stat-card__trend">Keep the streak alive</span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Average ticket</span>
          <span className="stat-card__value">{formatCurrency(averageTicket || 0)}</span>
          <span className="stat-card__trend">Highest: {formatCurrency(highestBill.amount)}</span>
        </article>
      </section>

      <section className="insight-grid">
        <article className="insight-card">
          <div className="insight-card__title">Category mix</div>
          <div className="legend">
            {categoryBreakdown.map((category) => (
              <span key={category.category} className="legend__item">
                <span className="legend__swatch" style={{ background: '#818cf8' }} />
                {category.category} · {category.percent}%
              </span>
            ))}
          </div>
          <span className="supporting-text">Balance spend by setting category-specific reminders.</span>
        </article>
        <article className="insight-card">
          <div className="insight-card__title">Vendor spotlight</div>
          <div className="panel__list">
            {sortedBills.slice(0, 3).map((bill) => (
              <div key={bill.id} className="panel__list-item" style={{ padding: '10px 12px', background: 'rgba(15, 23, 42, 0.65)' }}>
                <span className="marker" style={{ background: bill.color ?? '#4f46e5' }} />
                <div>
                  <strong>{bill.name}</strong>
                  <p className="supporting-text">Due {formatDate(bill.dueDate)} · {bill.autoPay ? 'Autopay' : 'Manual'} · {bill.category ?? 'General'}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
        <article className="insight-card">
          <div className="insight-card__title">Risk radar</div>
          <div className="panel__list">
            {displayBills.filter((bill) => bill.status?.toLowerCase() === 'overdue').length === 0 ? (
              <p className="supporting-text">No overdue bills on the radar. Keep the cadence steady.</p>
            ) : (
              displayBills
                .filter((bill) => bill.status?.toLowerCase() === 'overdue')
                .map((bill) => (
                  <div key={bill.id} className="panel__list-item" style={{ padding: '10px 12px', background: 'rgba(76, 5, 25, 0.35)', borderColor: 'rgba(244, 63, 94, 0.45)' }}>
                    <span className="marker" style={{ background: '#f43f5e' }} />
                    <div>
                      <strong>{bill.name}</strong>
                      <p className="supporting-text">Due {formatDate(bill.dueDate)} · escalate within 24 hours.</p>
                    </div>
                  </div>
                ))
            )}
          </div>
        </article>
      </section>

      <section className="panel panel--glow">
        <div className="panel__header">
          <div>
            <h3 className="panel__title">Optimization suggestions</h3>
            <p className="panel__subtitle">Automations and nudges that deliver calmer household finances.</p>
          </div>
          <span className="pill pill--info">Strategic insights</span>
        </div>
        <div className="panel__body panel__body--split">
          {suggestions.map((suggestion) => (
            <div key={suggestion.title} className="panel__list-item">
              <span className="marker" style={{ background: suggestion.accent }} />
              <div>
                <strong>{suggestion.title}</strong>
                <p className="supporting-text">{suggestion.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <h3 className="panel__title">All bills</h3>
            <p className="panel__subtitle">Sorted by due date so you always know what&apos;s next.</p>
          </div>
          <button type="button" className="ghost-button">Filter view</button>
        </div>

        {isAuthenticated && isLoading && <div className="alert">Loading bills from your vault…</div>}
        {isAuthenticated && isError && (
          <div className="alert alert--error">
            We couldn&apos;t reach the server. This table shows the latest cached information.
          </div>
        )}

        <div className="panel__table-wrapper">
          <table className="bill-table">
            <thead>
              <tr>
                <th>Bill</th>
                <th>Due date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Category</th>
                <th>Autopay</th>
              </tr>
            </thead>
            <tbody>
              {sortedBills.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="alert">No bills yet—add your first bill to unlock tracking.</div>
                  </td>
                </tr>
              ) : (
                sortedBills.map((bill) => {
                  const amount = typeof bill.amount === 'string' ? Number.parseFloat(bill.amount) : bill.amount;
                  const status = bill.status?.toLowerCase() ?? 'scheduled';
                  return (
                    <tr key={bill.id} className="table-row">
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <strong>{bill.name}</strong>
                          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                            ID: {bill.id.slice(0, 8)}…
                          </span>
                        </div>
                      </td>
                      <td>{formatDate(bill.dueDate)}</td>
                      <td>{Number.isFinite(amount) ? formatCurrency(amount) : '—'}</td>
                      <td>
                        <span className={getStatusClass(status)}>{status}</span>
                      </td>
                      <td>
                        <span className="status-pill status-pill--neutral">
                          {bill.category || 'General'}
                        </span>
                      </td>
                      <td>{bill.autoPay ? 'Yes' : 'No'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <h3 className="panel__title">Payment journal</h3>
            <p className="panel__subtitle">Recent activity so you can brief the household in seconds.</p>
          </div>
        </div>
        <div className="activity-feed">
          {journal.map((entry) => (
            <div key={entry.id} className="activity-feed__item">
              <span className="activity-feed__time">{entry.date}</span>
              <div className="activity-feed__card">
                <div className="legend">
                  <span className="legend__item">
                    <span className="legend__swatch" style={{ background: entry.accent }} />
                    Bill
                  </span>
                </div>
                <h4 style={{ margin: '12px 0 6px' }}>{entry.name}</h4>
                <p className="supporting-text">{entry.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
