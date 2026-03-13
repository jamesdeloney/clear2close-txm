import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const STAGES = [
  { key: 'pre_listing', label: 'Pre-Listing' },
  { key: 'active_listing', label: 'Active Listing' },
  { key: 'under_contract', label: 'Under Contract' },
  { key: 'closing', label: 'Closing' },
];

const STAGE_ORDER = { pre_listing: 0, active_listing: 1, under_contract: 2, closing: 3, closed: 4 };

const STATUS_COLORS = {
  pending: '#E5E7EB',
  in_progress: '#F59E0B',
  completed: '#2ECC71',
  skipped: '#9CA3AF',
};

const EMAIL_STATUS_COLORS = {
  pending: '#F59E0B',
  sent: '#2ECC71',
  failed: '#EF4444',
  cancelled: '#9CA3AF',
};

export default function TransactionDetail() {
  const { id } = useParams();
  const [tx, setTx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);

  const load = () => {
    fetch(`/api/transactions/${id}`)
      .then(r => r.json())
      .then(data => { setTx(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const advanceStage = async () => {
    if (!tx) return;
    const currentIdx = STAGE_ORDER[tx.current_stage] ?? -1;
    const next = STAGES[currentIdx + 1];
    if (!next) return;
    setAdvancing(true);
    try {
      await fetch(`/api/transactions/${id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: next.key }),
      });
      load();
    } finally {
      setAdvancing(false);
    }
  };

  const toggleTask = async (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, completed_by: 'agent' }),
    });
    load();
  };

  if (loading) return <div style={{ padding: 40, color: '#6B7280' }}>Loading...</div>;
  if (!tx) return <div style={{ padding: 40, color: '#6B7280' }}>Transaction not found.</div>;

  const currentIdx = STAGE_ORDER[tx.current_stage] ?? 0;
  const nextStage = STAGES[currentIdx + 1];

  return (
    <div>
      <Link to="/transactions" style={{ fontSize: 13, color: '#6B7280', marginBottom: 16, display: 'inline-block' }}>
        ← Back to Transactions
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{tx.property_address}</h1>
          <div style={{ fontSize: 14, color: '#6B7280' }}>
            {[tx.city, tx.state, tx.zip].filter(Boolean).join(', ')}
            {tx.mls_number && ` · MLS# ${tx.mls_number}`}
          </div>
        </div>
        {nextStage && (
          <button onClick={advanceStage} disabled={advancing} style={{
            background: '#2ECC71', color: '#fff', border: 'none', borderRadius: 8,
            padding: '10px 20px', fontWeight: 600, fontSize: 14, opacity: advancing ? 0.7 : 1,
          }}>
            {advancing ? 'Advancing...' : `Advance to ${nextStage.label}`}
          </button>
        )}
      </div>

      {/* Stage Progress Bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 32 }}>
        {STAGES.map((s, i) => (
          <div key={s.key} style={{
            flex: 1, height: 8, borderRadius: 4,
            background: i <= currentIdx ? '#2ECC71' : '#E5E7EB',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32, marginTop: -24 }}>
        {STAGES.map((s, i) => (
          <div key={s.key} style={{
            fontSize: 11, fontWeight: i === currentIdx ? 700 : 500,
            color: i <= currentIdx ? '#1E3A5F' : '#9CA3AF', textAlign: 'center', flex: 1,
          }}>
            {s.label}
          </div>
        ))}
      </div>

      {/* Info Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
        <div style={cardStyle}>
          <h3 style={cardTitle}>Transaction Details</h3>
          <div style={fieldRow}><span style={fieldLabel}>Type</span><span>{tx.transaction_type || '—'}</span></div>
          <div style={fieldRow}><span style={fieldLabel}>List Price</span><span>{tx.list_price ? `$${Number(tx.list_price).toLocaleString()}` : '—'}</span></div>
          <div style={fieldRow}><span style={fieldLabel}>Contract Price</span><span>{tx.contract_price ? `$${Number(tx.contract_price).toLocaleString()}` : '—'}</span></div>
          <div style={fieldRow}><span style={fieldLabel}>Closing Date</span><span>{tx.closing_date ? new Date(tx.closing_date).toLocaleDateString() : '—'}</span></div>
          <div style={fieldRow}><span style={fieldLabel}>Title Company</span><span>{tx.title_company || '—'}</span></div>
        </div>
        <div style={cardStyle}>
          <h3 style={cardTitle}>Contacts</h3>
          <div style={fieldRow}><span style={fieldLabel}>Seller</span><span>{tx.seller_name || '—'} {tx.seller_email && `(${tx.seller_email})`}</span></div>
          <div style={fieldRow}><span style={fieldLabel}>Buyer</span><span>{tx.buyer_name || '—'}</span></div>
          <div style={fieldRow}><span style={fieldLabel}>Buyer Agent</span><span>{tx.buyer_agent_name || '—'}</span></div>
          <div style={fieldRow}><span style={fieldLabel}>Lender</span><span>{tx.lender_name || '—'}</span></div>
          <div style={fieldRow}><span style={fieldLabel}>Title Contact</span><span>{tx.title_contact_email || '—'}</span></div>
        </div>
      </div>

      {/* Task Checklist by Stage */}
      <div style={{ ...cardStyle, marginBottom: 32 }}>
        <h3 style={cardTitle}>Task Checklist</h3>
        {tx.tasks && Object.keys(tx.tasks).length > 0 ? (
          Object.entries(tx.tasks).map(([stageKey, tasks]) => (
            <div key={stageKey} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {STAGES.find(s => s.key === stageKey)?.label || stageKey}
                <span style={{ color: '#6B7280', fontWeight: 400, marginLeft: 8 }}>
                  {tasks.filter(t => t.status === 'completed').length}/{tasks.length}
                </span>
              </div>
              {tasks.map(task => (
                <div key={task.id} onClick={() => toggleTask(task)} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0',
                  borderBottom: '1px solid #F3F4F6', cursor: 'pointer',
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 4, border: `2px solid ${STATUS_COLORS[task.status]}`,
                    background: task.status === 'completed' ? '#2ECC71' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {task.status === 'completed' && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 500,
                      textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                      color: task.status === 'completed' ? '#9CA3AF' : '#1A1A2E',
                    }}>
                      {task.task_name}
                    </div>
                    {task.task_description && (
                      <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{task.task_description}</div>
                    )}
                  </div>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 10,
                    background: task.assigned_to === 'agent' ? '#EFF6FF' : '#FEF3C7',
                    color: task.assigned_to === 'agent' ? '#1E3A5F' : '#92400E',
                    fontWeight: 500,
                  }}>
                    {task.assigned_to}
                  </span>
                  {task.due_date && (
                    <span style={{ fontSize: 11, color: '#6B7280' }}>
                      {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))
        ) : (
          <div style={{ color: '#6B7280', padding: 16 }}>No tasks yet.</div>
        )}
      </div>

      {/* Email Queue Timeline */}
      <div style={cardStyle}>
        <h3 style={cardTitle}>Email Queue</h3>
        {tx.emails && tx.emails.length > 0 ? (
          tx.emails.map(email => (
            <div key={email.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
              borderBottom: '1px solid #F3F4F6',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: EMAIL_STATUS_COLORS[email.status] || '#9CA3AF', flexShrink: 0,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{email.subject}</div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>
                  To: {email.to_addresses?.join(', ') || '—'}
                </div>
              </div>
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 500,
                background: email.status === 'sent' ? '#D1FAE5' : email.status === 'failed' ? '#FEE2E2' : '#FEF3C7',
                color: email.status === 'sent' ? '#065F46' : email.status === 'failed' ? '#991B1B' : '#92400E',
              }}>
                {email.status}
              </span>
              <span style={{ fontSize: 11, color: '#6B7280', minWidth: 80, textAlign: 'right' }}>
                {email.scheduled_for ? new Date(email.scheduled_for).toLocaleDateString() : '—'}
              </span>
            </div>
          ))
        ) : (
          <div style={{ color: '#6B7280', padding: 16 }}>No emails queued.</div>
        )}
      </div>
    </div>
  );
}

const cardStyle = { background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB', padding: 24 };
const cardTitle = { fontSize: 15, fontWeight: 600, marginBottom: 16, color: '#1A1A2E' };
const fieldRow = { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F3F4F6', fontSize: 14 };
const fieldLabel = { color: '#6B7280', fontWeight: 500 };
