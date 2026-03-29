import { useState, useEffect, useRef, useCallback } from 'react'
import AppHeader from '../components/AppHeader'
import OnlineUsers from '../components/OnlineUsers'
import PrivateChatWindow from '../components/PrivateChatWindow'
import { useLang } from '../context/LangContext'
import { getToken, getUser } from '../utils/auth'
import { getMessages, sendMessage, getPrivateChats, getOrCreatePrivateChat, getOrCreatePrivateChatByUsername } from '../utils/api'
import { useWebSocket } from '../hooks/useWebSocket'
import styles from './ChatPage.module.css'

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Minsk' })
}

function ChatPage() {
  const { t } = useLang()
  const token = getToken()
  const currentUser = getUser()
  const [messages, setMessages] = useState([])
  const [content, setContent] = useState('')
  const [sendError, setSendError] = useState(null)
  const [sending, setSending] = useState(false)
  const [showBadge, setShowBadge] = useState(false)
  const [existingChats, setExistingChats] = useState({})
  const [chatsMeta, setChatsMeta] = useState({})
  const [botUserId, setBotUserId] = useState(null)
  const [openChats, setOpenChats] = useState([])
  const listRef = useRef(null)
  const atBottomRef = useRef(true)

  function scrollToBottom() {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }

  function handleScroll() {
    if (!listRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = listRef.current
    atBottomRef.current = scrollHeight - scrollTop - clientHeight < 100
    if (atBottomRef.current) setShowBadge(false)
  }

  const handleNewMessage = useCallback((msg) => {
    setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
  }, [])

  const { status, attempt, maxAttempts, onlineUsers, echoRef } = useWebSocket(token, handleNewMessage)

  useEffect(() => {
    getMessages()
      .then(msgs => setMessages(msgs))
      .catch(() => {})
  }, [])

  useEffect(() => {
    getPrivateChats()
      .then(chats => applyPrivateChats(chats))
      .catch(() => {})
  }, [])

  function applyPrivateChats(chats) {
    const map = {}
    const meta = {}
    let foundBotId = null
    for (const chat of chats) {
      const others = chat.members.filter(m => m.id !== currentUser?.id)
      for (const member of others) {
        map[member.id] = chat.chat_id
        if (member.is_bot) foundBotId = member.id
      }
      const partnerName = others.map(m => m.username).join(', ')
      meta[chat.chat_id] = { partnerName }
    }
    setExistingChats(prev => ({ ...prev, ...map }))
    setChatsMeta(prev => ({ ...prev, ...meta }))
    if (foundBotId) setBotUserId(foundBotId)
  }

  async function handleCreateChat(user) {
    try {
      const chat = user.is_bot
        ? await getOrCreatePrivateChatByUsername(user.username)
        : await getOrCreatePrivateChat(user.id)
      applyPrivateChats([chat])
    } catch {
      // silently ignore — chat creation failure is non-critical
    }
  }

  function handleOpenChat(chatId) {
    setOpenChats(prev => prev.includes(chatId) ? prev : [...prev, chatId])
  }

  function handleCloseChat(chatId) {
    setOpenChats(prev => prev.filter(id => id !== chatId))
  }

  useEffect(() => {
    if (messages.length === 0) return
    if (atBottomRef.current) {
      scrollToBottom()
    } else {
      setShowBadge(true)
    }
  }, [messages])

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
    if (e.key === 'Enter' && !e.shiftKey) handleSend(e)
  }

  const canSend = status === 'online' && !sending && content.trim().length > 0
  const inputDisabled = status !== 'online' || sending

  function getMessageType(msg) {
    if (msg.is_bot) return 'bot'
    if (msg.user_id === currentUser?.id) return 'own'
    return 'other'
  }

  const statusText = status === 'offline'
    ? t.chat.status.offline.replace('{{attempt}}', attempt).replace('{{max}}', maxAttempts)
    : t.chat.status[status]

  return (
    <>
    <div className={styles.page}>
      <AppHeader />
      <div className={styles.chatLayout}>
      <div className={styles.container}>
        <div className={`${styles.statusBar} ${styles[`status_${status}`]}`}>
          <span className={styles.statusDot} />
          <span>{statusText}</span>
        </div>
        <div className={styles.messageList} ref={listRef} onScroll={handleScroll}>
          {messages.map(msg => {
            const type = getMessageType(msg)
            return (
              <div key={msg.id} className={`${styles.messageWrapper} ${styles[type]}`}>
                <div className={styles.messageMeta}>
                  <span className={styles.metaUsername}>
                    {msg.username}
                    {msg.is_bot && <span className={styles.botBadge}> 🤖</span>}
                  </span>
                  <span className={styles.metaTime}>{formatTime(msg.created_at)}</span>
                </div>
                <div className={styles.bubble}>{msg.content}</div>
              </div>
            )
          })}
        </div>
        {showBadge && (
          <button className={styles.newMessageBadge} onClick={() => { scrollToBottom(); setShowBadge(false) }}>
            {t.chat.new_message}
          </button>
        )}
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
      <OnlineUsers
        users={onlineUsers}
        currentUserId={currentUser?.id}
        existingChats={existingChats}
        botUserId={botUserId}
        onCreateChat={handleCreateChat}
        onOpenChat={handleOpenChat}
      />
      </div>
    </div>

    {openChats.map((chatId, idx) => (
      <PrivateChatWindow
        key={chatId}
        chatId={chatId}
        partnerName={chatsMeta[chatId]?.partnerName ?? '...'}
        currentUserId={currentUser?.id}
        echoRef={echoRef}
        wsStatus={status}
        index={idx}
        onClose={() => handleCloseChat(chatId)}
      />
    ))}
    </>
  )
}

export default ChatPage
