import { useState, useEffect, useCallback } from 'react'
import AppHeader from '../components/AppHeader'
import { useLang } from '../context/LangContext'
import { getToken } from '../utils/auth'
import { getMessages, sendMessage } from '../utils/api'
import { useWebSocket } from '../hooks/useWebSocket'
import styles from './ChatPage.module.css'

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Minsk' })
}

function ChatPage() {
  const { t } = useLang()
  const token = getToken()
  const [messages, setMessages] = useState([])
  const [content, setContent] = useState('')
  const [sendError, setSendError] = useState(null)
  const [sending, setSending] = useState(false)
  const handleNewMessage = useCallback((msg) => {
    setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
  }, [])

  const { status, attempt, maxAttempts } = useWebSocket(token, handleNewMessage)

  useEffect(() => {
    getMessages()
      .then(msgs => setMessages(msgs))
      .catch(() => {})
  }, [])

  async function handleSend(e) {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed || status !== 'online' || sending) return
    setSendError(null)
    setSending(true)
    try {
      await sendMessage(trimmed)
      setContent('')
    } catch (err) {
      setSendError(t.chat.errors?.[err.message] ?? t.chat.errors.send_failed)
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && e.ctrlKey) handleSend(e)
  }

  const canSend = status === 'online' && !sending && content.trim().length > 0
  const inputDisabled = status !== 'online' || sending

  return (
    <>
      <AppHeader />
      <div className={styles.container}>
        <div className={styles.statusBar}>
          <span className={styles[`status_${status}`]}>
            {status === 'offline'
              ? t.chat.status.offline
                  .replace('{{attempt}}', attempt)
                  .replace('{{max}}', maxAttempts)
              : t.chat.status[status]}
          </span>
        </div>
        <div className={styles.messageList}>
          {messages.map(msg => (
            <div key={msg.id} className={styles.message}>
              <span className={styles.username}>{msg.username}</span>
              <span className={styles.messageContent}>{msg.content}</span>
              <span className={styles.time}>{formatTime(msg.created_at)}</span>
            </div>
          ))}
        </div>
        <form onSubmit={handleSend} className={styles.form}>
          {sendError && <p className={styles.error} role="alert">{sendError}</p>}
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.chat.placeholder}
            maxLength={150}
            disabled={inputDisabled}
            className={styles.textarea}
            rows={2}
            aria-label={t.chat.placeholder}
          />
          <div className={styles.formFooter}>
            <span className={styles.charCount}>
              {t.chat.char_count.replace('{{count}}', content.length)}
            </span>
            <button type="submit" disabled={!canSend} className={styles.sendButton}>
              {t.chat.send}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

export default ChatPage
