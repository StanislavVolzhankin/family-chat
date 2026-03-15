import { NavLink, useNavigate } from 'react-router-dom'
import { clearAuth, getUser } from '../utils/auth'
import { useLang } from '../context/LangContext'
import styles from './AppHeader.module.css'

function AppHeader() {
  const navigate = useNavigate()
  const { t } = useLang()
  const user = getUser()

  function handleLogout() {
    clearAuth()
    navigate('/login', { replace: true })
  }

  function navClass({ isActive }) {
    return isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
  }

  return (
    <header className={styles.header}>
      {user?.role === 'parent' && (
        <nav className={styles.nav}>
          <NavLink to="/chat" className={navClass}>{t.nav.chat}</NavLink>
          <NavLink to="/users" className={navClass}>{t.nav.users}</NavLink>
        </nav>
      )}
      <div className={styles.right}>
        {user?.username && <span className={styles.username}>{user.username}</span>}
        <button onClick={handleLogout} className={styles.logoutButton}>
          {t.nav.logout}
        </button>
      </div>
    </header>
  )
}

export default AppHeader
