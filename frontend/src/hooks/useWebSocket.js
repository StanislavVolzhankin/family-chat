import { useState, useEffect, useRef, useCallback } from 'react'
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { getMessages } from '../utils/api'

const REVERB_KEY = import.meta.env.VITE_REVERB_APP_KEY ?? 'family-chat-key'
const REVERB_HOST = import.meta.env.VITE_REVERB_HOST ?? 'localhost'
const REVERB_PORT = Number(import.meta.env.VITE_REVERB_PORT ?? 8080)

const MAX_ATTEMPTS = 10
const BACKOFF_DELAYS = [500, 1000, 2000, 4000, 8000, 16000]

function getDelay(attempt) {
  return BACKOFF_DELAYS[Math.min(attempt, BACKOFF_DELAYS.length - 1)]
}

export function useWebSocket(token, onMessage) {
  const [status, setStatus] = useState('connecting')
  const [attempt, setAttempt] = useState(0)
  const [onlineUsers, setOnlineUsers] = useState([])
  const onMessageRef = useRef(onMessage)
  const attemptRef = useRef(0)
  const timeoutRef = useRef(null)
  const echoRef = useRef(null)
  const lastTimestampRef = useRef(null)

  useEffect(() => {
    onMessageRef.current = onMessage
  })

  const disconnect = useCallback(() => {
    if (echoRef.current) {
      echoRef.current.leaveChannel('presence-chat')
      echoRef.current.disconnect()
      echoRef.current = null
    }
  }, [])

  const connect = useCallback(() => {
    if (!token) {
      setStatus('offline')
      return
    }

    window.Pusher = Pusher

    const echo = new Echo({
      broadcaster: 'reverb',
      key: REVERB_KEY,
      wsHost: REVERB_HOST,
      wsPort: REVERB_PORT,
      wssPort: REVERB_PORT,
      forceTLS: false,
      enabledTransports: ['ws'],
      authEndpoint: '/api/broadcasting/auth',
      auth: {
        headers: { Authorization: `Bearer ${token}` },
      },
    })

    echoRef.current = echo

    const conn = echo.connector.pusher.connection

    conn.bind('state_change', ({ current }) => {
      if (current === 'connected') {
        attemptRef.current = 0
        setAttempt(0)
        setStatus('online')

        if (lastTimestampRef.current) {
          getMessages({ since: lastTimestampRef.current })
            .then(msgs => msgs.forEach(msg => onMessageRef.current(msg)))
            .catch(() => {})
        }
      } else if (current === 'connecting') {
        setStatus('connecting')
      } else if (current === 'disconnected' || current === 'unavailable') {
        disconnect()

        if (attemptRef.current >= MAX_ATTEMPTS) {
          setStatus('failed')
          return
        }

        const nextAttempt = attemptRef.current + 1
        attemptRef.current = nextAttempt
        setAttempt(nextAttempt)
        setStatus('offline')

        timeoutRef.current = setTimeout(() => {
          connect()
        }, getDelay(nextAttempt - 1))
      }
    })

    echo.join('chat')
      .here(users => setOnlineUsers(users))
      .joining(user => setOnlineUsers(prev => [...prev.filter(u => u.id !== user.id), user]))
      .leaving(user => setOnlineUsers(prev => prev.filter(u => u.id !== user.id)))
      .listen('.new_message', (msg) => {
        lastTimestampRef.current = msg.created_at
        onMessageRef.current(msg)
      })
  }, [token, disconnect])

  useEffect(() => {
    if (!token) {
      setStatus('offline')
      return
    }

    connect()

    return () => {
      clearTimeout(timeoutRef.current)
      disconnect()
    }
  }, [token, connect, disconnect])

  return { status, attempt, maxAttempts: MAX_ATTEMPTS, onlineUsers, echoRef }
}
