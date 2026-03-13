import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const STAGE_LABELS = {
  pre_listing: 'Pre-Listing',
  active_listing: 'Active',
  under_contract: 'Under Contract',
  closing: 'Closing',
  closed: 'Closed',
};

const STAGE_COLORS = {
  pre_listing: '#6B7280',
  active_listing: '#2ECC71',
  under_contract: '#F59E0B',
  closing: '#3B82F6',
  closed: '#1E3A5F',
};

export default function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/transactions')
      .then(r => r.json())
      .then(data => { setTransactions(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const active = transactions.filter(t => t.status === 'active');
  const closedThisMonth = transactions.filter(t => {
    if (t.status !== 'closed') return false;
    const d = new Date(t.updated_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const tasksDueToday = active.reduce((sum, t) => {
    return sum + Number(t.total_tasks || 0) - Number(t.completed_tasks || 0);
  }, 0);

  const cards = [
    { label: 'Active Transactions', value: active.length, color: '#2ECC71' },
    { label: 'Tasks Due Today', value: tasksDueToday, color: '#F59E0B' },
    { label: 'Emails Pending', value: '—', color: '#3B82F6' },
    { label: 'Closed This Month', value: closedThisMonth.length, color: '#1E3A5F' },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
        {cards.map(card => (
          <div key={card.label} style={{
            background: '#fff', borderRadius: 10, padding: '20px 24px',
            border: '1px solid #E5E7EB', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: card.color }} />
            <div style={{ fontSize: 13, color: '#6B7280', fontWeight: 500, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#1A1A2E' }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #E5E7EB', fontWeight: 600, fontSize: 15 }}>
          Recent Transactions
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>Loading...</div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>
            No transactions yet. <Link to="/transactions" style={{ color: '#2ECC71', fontWeight: 500 }}>Create your first one.</Link>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#F8F9FA', textAlign: 'left' }}>
                <th style={thStyle}>Address</th>
                <th style={thStyle}>Seller</th>
                <th style={thStyle}>Stage</th>
                <th style={thStyle}>Tasks</th>
                <th style={thStyle}>Closing Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 10).map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={tdStyle}>
                    <Link to={`/transactions/${t.id}`} style={{ color: '#1E3A5F', fontWeight: 500 }}>
                      {t.property_address}
                    </Link>
                  </td>
                  <td style={tdStyle}>{t.seller_name || '—'}</td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-block', padding: '3px 10px', borderRadius: 12,
                      fontSize: 12, fontWeight: 600, color: '#fff',
                      background: STAGE_COLORS[t.current_stage] || '#6B7280',
                    }}>
                      {STAGE_LABELS[t.current_stage] || t.current_stage}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {t.completed_tasks}/{t.total_tasks}
                  </td>
                  <td style={tdStyle}>
                    {t.closing_date ? new Date(t.closing_date).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const thStyle = { padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' };
const tdStyle = { padding: '12px 16px' };
