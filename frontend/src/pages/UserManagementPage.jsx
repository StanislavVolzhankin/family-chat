import { useState, useEffect } from 'react'
import { useLang } from '../context/LangContext'
import { getUsers, createUser, updateUser } from '../utils/api'
import AppHeader from '../components/AppHeader'
import styles from './UserManagementPage.module.css'

function UserManagementPage() {
  const { t } = useLang()
  const [users, setUsers] = useState([])
  const [loadFailed, setLoadFailed] = useState(false)
  const [createUsername, setCreateUsername] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createError, setCreateError] = useState(null)
  const [creating, setCreating] = useState(false)
  const [changingPasswordFor, setChangingPasswordFor] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [actionErrors, setActionErrors] = useState({})

  useEffect(() => {
    getUsers().then(setUsers).catch(() => setLoadFailed(true))
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setCreateError(null)
    setCreating(true)
    try {
      const user = await createUser(createUsername, createPassword)
      setUsers(prev => [...prev, user])
      setCreateUsername('')
      setCreatePassword('')
    } catch (err) {
      setCreateError(t.users.errors?.[err.message] ?? t.errors.service_unavailable)
    } finally {
      setCreating(false)
    }
  }

  async function handleToggleActive(user) {
    setActionErrors(prev => ({ ...prev, [user.id]: null }))
    try {
      const updated = await updateUser(user.id, { is_active: !user.is_active })
      setUsers(prev => prev.map(u => u.id === user.id ? updated : u))
    } catch (err) {
      setActionErrors(prev => ({
        ...prev,
        [user.id]: t.users.errors?.[err.message] ?? t.errors.service_unavailable,
      }))
    }
  }

  async function handleChangePassword(userId) {
    setActionErrors(prev => ({ ...prev, [userId]: null }))
    try {
      await updateUser(userId, { password: newPassword })
      setChangingPasswordFor(null)
      setNewPassword('')
    } catch (err) {
      setActionErrors(prev => ({
        ...prev,
        [userId]: t.users.errors?.[err.message] ?? t.errors.service_unavailable,
      }))
    }
  }

  function cancelPasswordChange() {
    setChangingPasswordFor(null)
    setNewPassword('')
  }

  return (
    <>
      <AppHeader />
      <div className={styles.container}>
      <h1 className={styles.title}>{t.users.title}</h1>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t.users.create}</h2>
        <form onSubmit={handleCreate} className={styles.createForm}>
          <input
            type="text"
            placeholder={t.users.username}
            value={createUsername}
            onChange={e => setCreateUsername(e.target.value)}
            required
            className={styles.input}
          />
          <input
            type="password"
            placeholder={t.users.password}
            value={createPassword}
            onChange={e => setCreatePassword(e.target.value)}
            required
            className={styles.input}
          />
          <button type="submit" disabled={creating} className={styles.button}>
            {creating ? '...' : t.users.create}
          </button>
        </form>
        {createError && <p className={styles.error}>{createError}</p>}
      </section>

      <section className={styles.section}>
        {loadFailed && <p className={styles.error}>{t.errors.service_unavailable}</p>}
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t.users.username}</th>
              <th>{t.users.role}</th>
              <th>{t.users.active}</th>
              <th>{t.users.actions}</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>{user.role}</td>
                <td>{user.is_active ? t.users.active : t.users.inactive}</td>
                <td>
                  {user.role !== 'parent' && (
                    <>
                      <button onClick={() => handleToggleActive(user)} className={styles.actionButton}>
                        {user.is_active ? t.users.deactivate : t.users.activate}
                      </button>

                      {changingPasswordFor === user.id ? (
                        <span className={styles.passwordForm}>
                          <input
                            type="password"
                            placeholder={t.users.new_password}
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            className={styles.input}
                          />
                          <button onClick={() => handleChangePassword(user.id)} className={styles.actionButton}>
                            {t.users.save}
                          </button>
                          <button onClick={cancelPasswordChange} className={styles.actionButton}>
                            {t.users.cancel}
                          </button>
                        </span>
                      ) : (
                        <button onClick={() => setChangingPasswordFor(user.id)} className={styles.actionButton}>
                          {t.users.change_password}
                        </button>
                      )}

                      {actionErrors[user.id] && (
                        <p className={styles.error}>{actionErrors[user.id]}</p>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
    </>
  )
}

export default UserManagementPage
