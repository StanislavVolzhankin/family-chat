import { useState } from 'react'
import { useLang } from '../context/LangContext'
import UserContextMenu from './UserContextMenu'
import styles from './OnlineUsers.module.css'

const BOT_NAME = import.meta.env.VITE_BOT_NAME ?? 'Lulu'

function OnlineUsers({ users, currentUserId, existingChats, botUserId, onCreateChat, onOpenChat }) {
  const { t } = useLang()
  const [contextMenu, setContextMenu] = useState(null)

  const luluEntry = { id: botUserId ?? 'lulu-bot', username: BOT_NAME, is_bot: true }

  const sorted = [...users]
    .filter(u => !u.is_bot)
    .sort((a, b) => a.username.localeCompare(b.username))

  const list = [luluEntry, ...sorted]

  function handleContextMenu(e, user) {
    if (user.id === currentUserId) return
    e.preventDefault()
    setContextMenu({ user, x: e.clientX, y: e.clientY })
  }

  function handleCreateChat() {
    if (!contextMenu) return
    const { user } = contextMenu
    setContextMenu(null)
    onCreateChat(user)
  }

  function handleIconClick(e, chatId) {
    e.stopPropagation()
    onOpenChat(chatId)
  }

  return (
    <aside className={styles.sidebar}>
      <h3 className={styles.title}>{t.online_users.title}</h3>
      <ul className={styles.list}>
        {list.map(user => {
          const chatId = existingChats?.[user.id]
          const isSelf = user.id === currentUserId
          return (
            <li
              key={user.id}
              className={styles.item}
              onContextMenu={e => handleContextMenu(e, user)}
            >
              <span className={styles.dot} />
              <span className={styles.username}>{user.username}</span>
              {user.is_bot && <span className={styles.botIcon}>🤖</span>}
              {!isSelf && chatId && (
                <button
                  className={styles.chatIcon}
                  onClick={e => handleIconClick(e, chatId)}
                  title={t.private_chat.open}
                >
                  💬
                </button>
              )}
            </li>
          )
        })}
      </ul>

      {contextMenu && (
        <UserContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onCreateChat={handleCreateChat}
          onClose={() => setContextMenu(null)}
        />
      )}
    </aside>
  )
}

export default OnlineUsers
