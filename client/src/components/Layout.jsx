import Sidebar from './Sidebar';

const styles = {
  wrapper: {
    display: 'flex',
    minHeight: '100vh',
  },
  main: {
    marginLeft: 240,
    flex: 1,
    padding: '32px 40px',
    maxWidth: 1200,
  },
};

export default function Layout({ children }) {
  return (
    <div style={styles.wrapper}>
      <Sidebar />
      <main style={styles.main}>{children}</main>
    </div>
  );
}
