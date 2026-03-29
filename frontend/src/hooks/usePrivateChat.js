import { useState, useEffect, useCallback, useRef } from 'react'
import { useLang } from '../context/LangContext'
import { getPrivateChatMessages, sendPrivateMessage } from '../utils/api'

export function usePrivateChat(chatId, echoRef, wsStatus) {
  const { t } = useLang()
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState(null)
  const channelRef = useRef(null)

  useEffect(() => {
    getPrivateChatMessages(chatId)
      .then(msgs => setMessages(msgs))
      .catch(() => {})
  }, [chatId])

  useEffect(() => {
    if (wsStatus !== 'online') return
    const echo = echoRef?.current
    if (!echo) return

    const channel = echo.private(`private-chat.${chatId}`)
    channel.listen('.new_private_message', (msg) => {
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
    })
    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
    }
  }, [chatId, echoRef, wsStatus])

  const send = useCallback(async (content) => {
    setSendError(null)
    setSending(true)
    try {
      const msg = await sendPrivateMessage(chatId, content)
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
    } catch (err) {
      setSendError(t.chat.errors?.[err.message] ?? t.chat.errors.send_failed)
      throw err
    } finally {
      setSending(false)
    }
  }, [chatId, t])

  return { messages, sending, sendError, send }
}
