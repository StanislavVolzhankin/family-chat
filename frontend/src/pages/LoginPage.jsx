import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../utils/api'
import { saveAuth } from '../utils/auth'
import { useLang } from '../context/LangContext'
import styles from './LoginPage.module.css'

function LoginPage() {
  const navigate = useNavigate()
  const { lang, setLang, t } = useLang()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const data = await login(username, password)
      saveAuth(data.access_token, data.user)
      navigate('/chat', { replace: true })
    } catch (err) {
      const key = err.message
      setError(t.login.errors?.[key] ?? t.errors.service_unavailable)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.langSwitch}>
          <button onClick={() => setLang('ru')} disabled={lang === 'ru'}>RU</button>
          <button onClick={() => setLang('en')} disabled={lang === 'en'}>EN</button>
        </div>

        <div className={styles.logo}>🚀</div>
        <h1 className={styles.appName}>Family Chat</h1>
        <p className={styles.title}>{t.login.title}</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            {t.login.username}
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoComplete="username"
              className={styles.input}
            />
          </label>

          <label className={styles.label}>
            {t.login.password}
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className={styles.input}
            />
          </label>

          {error && <p className={styles.error} role="alert">{error}</p>}

          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? '...' : t.login.submit}
          </button>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
