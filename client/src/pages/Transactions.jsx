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

const inputStyle = {
  padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 6,
  fontSize: 14, width: '100%', outline: 'none',
};

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    property_address: '', city: '', state: 'TX', zip: '',
    seller_name: '', seller_email: '', seller_phone: '',
    transaction_type: 'listing', list_price: '', closing_date: '',
    title_company: '', title_contact_email: '', notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const loadTransactions = () => {
    fetch('/api/transactions')
      .then(r => r.json())
      .then(data => { setTransactions(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadTransactions(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ property_address: '', city: '', state: 'TX', zip: '', seller_name: '', seller_email: '', seller_phone: '', transaction_type: 'listing', list_price: '', closing_date: '', title_company: '', title_contact_email: '', notes: '' });
        loadTransactions();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Transactions</h1>
        <button onClick={() => setShowForm(!showForm)} style={{
          background: '#2ECC71', color: '#fff', border: 'none', borderRadius: 8,
          padding: '10px 20px', fontWeight: 600, fontSize: 14,
        }}>
          {showForm ? 'Cancel' : '+ New Transaction'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{
          background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB',
          padding: 24, marginBottom: 24,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Property Address *</label>
              <input style={inputStyle} value={form.property_address} onChange={updateField('property_address')} required />
            </div>
            <div>
              <label style={labelStyle}>City</label>
              <input style={inputStyle} value={form.city} onChange={updateField('city')} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={labelStyle}>State</label>
                <input style={inputStyle} value={form.state} onChange={updateField('state')} />
              </div>
              <div>
                <label style={labelStyle}>ZIP</label>
                <input style={inputStyle} value={form.zip} onChange={updateField('zip')} />
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Seller Name</label>
              <input style={inputStyle} value={form.seller_name} onChange={updateField('seller_name')} />
            </div>
            <div>
              <label style={labelStyle}>Seller Email</label>
              <input style={inputStyle} type="email" value={form.seller_email} onChange={updateField('seller_email')} />
            </div>
            <div>
              <label style={labelStyle}>Seller Phone</label>
              <input style={inputStyle} value={form.seller_phone} onChange={updateField('seller_phone')} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Type</label>
              <select style={inputStyle} value={form.transaction_type} onChange={updateField('transaction_type')}>
                <option value="listing">Listing</option>
                <option value="buyer">Buyer</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>List Price</label>
              <input style={inputStyle} type="number" value={form.list_price} onChange={updateField('list_price')} />
            </div>
            <div>
              <label style={labelStyle}>Closing Date</label>
              <input style={inputStyle} type="date" value={form.closing_date} onChange={updateField('closing_date')} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Title Company</label>
              <input style={inputStyle} value={form.title_company} onChange={updateField('title_company')} />
            </div>
            <div>
              <label style={labelStyle}>Title Contact Email</label>
              <input style={inputStyle} type="email" value={form.title_contact_email} onChange={updateField('title_contact_email')} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.notes} onChange={updateField('notes')} />
          </div>
          <button type="submit" disabled={submitting} style={{
            background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 8,
            padding: '10px 24px', fontWeight: 600, fontSize: 14, opacity: submitting ? 0.7 : 1,
          }}>
            {submitting ? 'Creating...' : 'Create Transaction'}
          </button>
        </form>
      )}

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>Loading...</div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>No transactions yet.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#F8F9FA', textAlign: 'left' }}>
                <th style={thStyle}>Address</th>
                <th style={thStyle}>Seller</th>
                <th style={thStyle}>Stage</th>
                <th style={thStyle}>Progress</th>
                <th style={thStyle}>Closing Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => {
                const total = Number(t.total_tasks || 0);
                const completed = Number(t.completed_tasks || 0);
                const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={tdStyle}>
                      <Link to={`/transactions/${t.id}`} style={{ color: '#1E3A5F', fontWeight: 500 }}>
                        {t.property_address}
                      </Link>
                      {t.city && <div style={{ fontSize: 12, color: '#6B7280' }}>{t.city}, {t.state} {t.zip}</div>}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: '#2ECC71', borderRadius: 3, transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontSize: 12, color: '#6B7280', minWidth: 36 }}>{pct}%</span>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      {t.closing_date ? new Date(t.closing_date).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 4 };
const thStyle = { padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' };
const tdStyle = { padding: '12px 16px' };
