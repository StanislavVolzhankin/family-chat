import { useState, useEffect, useRef } from 'react'
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

const REVERB_KEY = import.meta.env.VITE_REVERB_APP_KEY ?? 'family-chat-key'
const REVERB_HOST = import.meta.env.VITE_REVERB_HOST ?? 'localhost'
const REVERB_PORT = Number(import.meta.env.VITE_REVERB_PORT ?? 8080)

export function useWebSocket(token, onMessage) {
  const [status, setStatus] = useState('connecting')
  const onMessageRef = useRef(onMessage)

  useEffect(() => {
    onMessageRef.current = onMessage
  })

  useEffect(() => {
    if (!token) {
      setStatus('offline')
      return
    }

    let echo = null
    let active = true

    const timer = setTimeout(() => {
      if (!active) return

      window.Pusher = Pusher

      echo = new Echo({
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

      const conn = echo.connector.pusher.connection
      conn.bind('state_change', ({ current }) => {
        if (current === 'connected') setStatus('online')
        else if (current === 'connecting') setStatus('connecting')
        else setStatus('offline')
      })

      echo.channel('chat').listen('.new_message', (msg) => {
        onMessageRef.current(msg)
      })
    }, 0)

    return () => {
      active = false
      clearTimeout(timer)
      if (echo) {
        echo.leaveChannel('chat')
        echo.disconnect()
      }
    }
  }, [token])

  return { status }
}
