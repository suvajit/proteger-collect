import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Layout.module.css';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '⊞' },
  { to: '/sheets', label: 'Submissions', icon: '☰' },
  { to: '/issues', label: 'Issues', icon: '⚠' },
  { to: '/checklist', label: 'Checklist', icon: '✓' },
  { to: '/users', label: 'Users', icon: '👤' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <img src="/logo_white.svg" alt="Proteger" className={styles.logoImg} />
          <span>Admin Portal</span>
        </div>
        <nav className={styles.nav}>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
              <span className={styles.icon}>{n.icon}</span> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className={styles.userArea}>
          <div className={styles.userName}>{user?.fullName}</div>
          <div className={styles.userRole}>{user?.role}</div>
          <button className={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
