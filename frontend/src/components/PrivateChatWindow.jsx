import { useState, useRef, useEffect } from 'react'
import { useLang } from '../context/LangContext'
import { usePrivateChat } from '../hooks/usePrivateChat'
import styles from './PrivateChatWindow.module.css'

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Minsk' })
}

function PrivateChatWindow({ chatId, partnerName, hasLulu, currentUserId, echoRef, wsStatus, index, onClose, onAddLulu, onRemoveLulu }) {
  const { t } = useLang()
  const { messages, sending, sendError, send } = usePrivateChat(chatId, echoRef, wsStatus)
  const [content, setContent] = useState('')
  const listRef = useRef(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  async function handleSend(e) {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed || sending) return
    try {
      await send(trimmed)
      setContent('')
    } catch {
      // error shown via sendError
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) handleSend(e)
  }

  const rightOffset = 16 + index * 296

  return (
    <div className={styles.window} style={{ right: rightOffset }}>
      <div className={styles.header}>
        {partnerName ? (
          <>
            <span className={styles.title}>{partnerName}</span>
            {hasLulu ? (
              <span className={styles.luluTag}>
                Lulu 🤖
                <button className={styles.removeLuluBtn} onClick={onRemoveLulu} aria-label={t.private_chat.remove_lulu}>×</button>
              </span>
            ) : (
              <button className={styles.addLuluBtn} onClick={onAddLulu}>{t.private_chat.add_lulu}</button>
            )}
          </>
        ) : (
          <span className={styles.title}>Lulu 🤖</span>
        )}
        <button className={styles.closeBtn} onClick={onClose} aria-label={t.private_chat.close}>✕</button>
      </div>

      <div className={styles.messageList} ref={listRef}>
        {messages.map(msg => {
          const isOwn = msg.user_id === currentUserId
          return (
            <div key={msg.id} className={`${styles.messageWrapper} ${isOwn ? styles.own : styles.other}`}>
              {!isOwn && (
                <span className={styles.msgUsername}>
                  {msg.username}
                  {msg.is_bot && ' 🤖'}
                </span>
              )}
              <div className={styles.bubble}>{msg.content}</div>
              <span className={styles.time}>{formatTime(msg.created_at)}</span>
            </div>
          )
        })}
      </div>

      <form onSubmit={handleSend} className={styles.form}>
        {sendError && <p className={styles.error}>{sendError}</p>}
        <div className={styles.inputRow}>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.chat.placeholder}
            maxLength={150}
            disabled={sending}
            className={styles.textarea}
            rows={2}
          />
          <button
            type="submit"
            disabled={sending || !content.trim()}
            className={styles.sendBtn}
          >
            {t.chat.send}
          </button>
        </div>
      </form>
    </div>
  )
}

export default PrivateChatWindow
