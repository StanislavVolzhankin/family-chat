import { useLang } from '../context/LangContext'
import styles from './OnlineUsers.module.css'

const BOT_NAME = import.meta.env.VITE_BOT_NAME ?? 'Lulu'

const LULU = { id: 'bot', username: BOT_NAME, is_bot: true }

function OnlineUsers({ users }) {
  const { t } = useLang()

  const sorted = [...users]
    .filter(u => !u.is_bot)
    .sort((a, b) => a.username.localeCompare(b.username))

  const list = [LULU, ...sorted]

  return (
    <aside className={styles.sidebar}>
      <h3 className={styles.title}>{t.online_users.title}</h3>
      <ul className={styles.list}>
        {list.map(user => (
          <li key={user.id} className={styles.item}>
            <span className={styles.dot} />
            <span className={styles.username}>{user.username}</span>
            {user.is_bot && <span className={styles.botIcon}>🤖</span>}
          </li>
        ))}
      </ul>
    </aside>
  )
}

export default OnlineUsers
