import { useNavigate } from 'react-router-dom'
import { clearAuth } from '../utils/auth'
import { useLang } from '../context/LangContext'
import styles from './AppHeader.module.css'

function AppHeader() {
  const navigate = useNavigate()
  const { t } = useLang()

  function handleLogout() {
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <header className={styles.header}>
      <button onClick={handleLogout} className={styles.logoutButton}>
        {t.logout}
      </button>
    </header>
  )
}

export default AppHeader
