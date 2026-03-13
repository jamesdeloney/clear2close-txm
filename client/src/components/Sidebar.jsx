import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '□' },
  { to: '/transactions', label: 'Transactions', icon: '⇄' },
  { to: '/templates', label: 'Email Templates', icon: '✉' },
  { to: '/documents', label: 'Documents', icon: '📄' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

const styles = {
  sidebar: {
    width: 240,
    minHeight: '100vh',
    background: '#1E3A5F',
    display: 'flex',
    flexDirection: 'column',
    padding: '0',
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 100,
  },
  logo: {
    padding: '24px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  logoText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: '-0.3px',
  },
  logoAccent: {
    color: '#2ECC71',
  },
  nav: {
    padding: '16px 0',
    flex: 1,
  },
  linkBase: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 500,
    color: 'rgba(255,255,255,0.65)',
    transition: 'all 0.15s ease',
    borderLeft: '3px solid transparent',
  },
  linkActive: {
    color: '#fff',
    background: 'rgba(46, 204, 113, 0.12)',
    borderLeftColor: '#2ECC71',
  },
  icon: {
    fontSize: 16,
    width: 20,
    textAlign: 'center',
  },
};

export default function Sidebar() {
  return (
    <div style={styles.sidebar}>
      <div style={styles.logo}>
        <div style={styles.logoText}>
          Clear<span style={styles.logoAccent}>2</span>Close
        </div>
        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 2 }}>
          Transaction Management
        </div>
      </div>
      <nav style={styles.nav}>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            style={({ isActive }) => ({
              ...styles.linkBase,
              ...(isActive ? styles.linkActive : {}),
            })}
          >
            <span style={styles.icon}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
        v1.0.0
      </div>
    </div>
  );
}
