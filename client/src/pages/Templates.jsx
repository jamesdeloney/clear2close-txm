import { useState, useEffect } from 'react';

const STAGE_LABELS = {
  pre_listing: 'Pre-Listing',
  active_listing: 'Active Listing',
  under_contract: 'Under Contract',
  closing: 'Closing',
};

const STAGE_COLORS = {
  pre_listing: '#6B7280',
  active_listing: '#2ECC71',
  under_contract: '#F59E0B',
  closing: '#3B82F6',
};

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const url = filter === 'all' ? '/api/emails' : `/api/emails?stage_key=${filter}`;
    fetch(url)
      .then(r => r.json())
      .then(data => { setTemplates(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filter]);

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Email Templates</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[{ key: 'all', label: 'All Stages' }, ...Object.entries(STAGE_LABELS).map(([k, v]) => ({ key: k, label: v }))].map(s => (
          <button key={s.key} onClick={() => setFilter(s.key)} style={{
            padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500,
            border: filter === s.key ? 'none' : '1px solid #E5E7EB',
            background: filter === s.key ? '#1E3A5F' : '#fff',
            color: filter === s.key ? '#fff' : '#6B7280',
          }}>
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>Loading...</div>
      ) : templates.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#6B7280', background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB' }}>
          No templates found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {templates.map(t => (
            <div key={t.id} style={{
              background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB', overflow: 'hidden',
            }}>
              <div
                onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px',
                  cursor: 'pointer',
                }}
              >
                <span style={{
                  display: 'inline-block', padding: '2px 10px', borderRadius: 10,
                  fontSize: 11, fontWeight: 600, color: '#fff',
                  background: STAGE_COLORS[t.stage_key] || '#6B7280',
                }}>
                  {STAGE_LABELS[t.stage_key] || t.stage_key}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E' }}>{t.template_name}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{t.subject}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 11, color: '#6B7280' }}>
                    Day {t.send_offset_days >= 0 ? `+${t.send_offset_days}` : t.send_offset_days}
                  </span>
                  <span style={{ fontSize: 11, color: '#6B7280' }}>
                    To: {t.send_to?.join(', ') || '—'}
                  </span>
                  <span style={{ fontSize: 18, color: '#9CA3AF', transform: expanded === t.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    ▾
                  </span>
                </div>
              </div>
              {expanded === t.id && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid #F3F4F6' }}>
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 8 }}>Preview</div>
                    <div
                      style={{
                        background: '#F8F9FA', borderRadius: 8, padding: 20,
                        fontSize: 14, lineHeight: 1.6,
                      }}
                      dangerouslySetInnerHTML={{ __html: t.body_html }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: '#6B7280' }}>
                    <span>Key: <code style={{ background: '#F3F4F6', padding: '1px 6px', borderRadius: 4 }}>{t.template_key}</code></span>
                    <span>Active: {t.is_active ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
