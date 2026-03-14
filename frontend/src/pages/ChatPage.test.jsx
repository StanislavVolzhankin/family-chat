import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import ChatPage from './ChatPage'
import { LangProvider } from '../context/LangContext'

vi.mock('../hooks/useWebSocket', () => ({
  useWebSocket: vi.fn(() => ({ status: 'online' })),
}))

vi.mock('../utils/api', () => ({
  getMessages: vi.fn(),
  sendMessage: vi.fn(),
}))

vi.mock('../utils/auth', () => ({
  getToken: vi.fn(() => 'test-token'),
  clearAuth: vi.fn(),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockNavigate = vi.fn()

import { useWebSocket } from '../hooks/useWebSocket'
import { getMessages, sendMessage } from '../utils/api'

function renderChatPage() {
  return render(
    <MemoryRouter>
      <LangProvider>
        <ChatPage />
      </LangProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  useWebSocket.mockReturnValue({ status: 'online' })
  getMessages.mockResolvedValue([])
})

describe('ChatPage rendering', () => {
  it('renders the send button and textarea', async () => {
    renderChatPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Отправить' })).toBeDefined()
      expect(screen.getByRole('textbox')).toBeDefined()
    })
  })

  it('shows online status', async () => {
    renderChatPage()
    await waitFor(() => {
      expect(screen.getByText('В сети')).toBeDefined()
    })
  })

  it('shows char count 0/150 initially', async () => {
    renderChatPage()
    await waitFor(() => {
      expect(screen.getByText('0/150')).toBeDefined()
    })
  })

  it('loads and displays history messages', async () => {
    getMessages.mockResolvedValue([
      { id: 1, user_id: 1, username: 'alice', content: 'Привет!', created_at: '2024-01-01T10:00:00Z' },
      { id: 2, user_id: 2, username: 'bob', content: 'Как дела?', created_at: '2024-01-01T10:01:00Z' },
    ])
    renderChatPage()
    await waitFor(() => {
      expect(screen.getByText('Привет!')).toBeDefined()
      expect(screen.getByText('Как дела?')).toBeDefined()
    })
  })

  it('shows usernames in message list', async () => {
    getMessages.mockResolvedValue([
      { id: 1, user_id: 1, username: 'alice', content: 'Hello', created_at: '2024-01-01T10:00:00Z' },
    ])
    renderChatPage()
    await waitFor(() => {
      expect(screen.getByText('alice')).toBeDefined()
    })
  })
})

describe('Status states', () => {
  it('disables textarea and send button when offline', async () => {
    useWebSocket.mockReturnValue({ status: 'offline', attempt: 2, maxAttempts: 10 })
    renderChatPage()
    await waitFor(() => {
      expect(screen.getByText('Переподключение… попытка 2 из 10')).toBeDefined()
      expect(screen.getByRole('textbox').disabled).toBe(true)
      expect(screen.getByRole('button', { name: 'Отправить' }).disabled).toBe(true)
    })
  })

  it('disables send button when connecting', async () => {
    useWebSocket.mockReturnValue({ status: 'connecting' })
    renderChatPage()
    await waitFor(() => {
      expect(screen.getByText('Подключение...')).toBeDefined()
      expect(screen.getByRole('button', { name: 'Отправить' }).disabled).toBe(true)
    })
  })
})

describe('Char counter', () => {
  it('updates char count as user types', async () => {
    renderChatPage()
    await waitFor(() => screen.getByRole('textbox'))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } })
    expect(screen.getByText('5/150')).toBeDefined()
  })
})

describe('Sending messages', () => {
  it('calls sendMessage with trimmed content on form submit', async () => {
    sendMessage.mockResolvedValue({ id: 10, user_id: 1, username: 'alice', content: 'hello', created_at: '2024-01-01T10:00:00Z' })
    renderChatPage()
    await waitFor(() => screen.getByRole('textbox'))

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  hello  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Отправить' }))

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith('hello')
    })
  })

  it('clears textarea after successful send', async () => {
    sendMessage.mockResolvedValue({ id: 10, user_id: 1, username: 'alice', content: 'hi', created_at: '2024-01-01T10:00:00Z' })
    renderChatPage()
    await waitFor(() => screen.getByRole('textbox'))

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hi' } })
    fireEvent.click(screen.getByRole('button', { name: 'Отправить' }))

    await waitFor(() => {
      expect(screen.getByRole('textbox').value).toBe('')
    })
  })

  it('does not call sendMessage when content is empty', async () => {
    renderChatPage()
    await waitFor(() => screen.getByRole('textbox'))

    fireEvent.click(screen.getByRole('button', { name: 'Отправить' }))

    expect(sendMessage).not.toHaveBeenCalled()
  })

  it('shows rate_limit_exceeded error on 429', async () => {
    sendMessage.mockRejectedValue(new Error('rate_limit_exceeded'))
    renderChatPage()
    await waitFor(() => screen.getByRole('textbox'))

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hi' } })
    fireEvent.click(screen.getByRole('button', { name: 'Отправить' }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe('Слишком часто, подождите секунду')
    })
  })

  it('shows send_failed error on unknown error', async () => {
    sendMessage.mockRejectedValue(new Error('server_error'))
    renderChatPage()
    await waitFor(() => screen.getByRole('textbox'))

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hi' } })
    fireEvent.click(screen.getByRole('button', { name: 'Отправить' }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe('Не удалось отправить сообщение')
    })
  })

  it('sends on Ctrl+Enter', async () => {
    sendMessage.mockResolvedValue({ id: 11, user_id: 1, username: 'alice', content: 'test', created_at: '2024-01-01T10:00:00Z' })
    renderChatPage()
    await waitFor(() => screen.getByRole('textbox'))

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } })
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', ctrlKey: true })

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith('test')
    })
  })
})

describe('Bot messages', () => {
  it('shows bot icon for message with is_bot=true', async () => {
    getMessages.mockResolvedValue([
      { id: 1, user_id: 10, username: 'Lulu', is_bot: true, content: 'Привет!', created_at: '2024-01-01T10:00:00Z' },
    ])
    renderChatPage()
    await waitFor(() => {
      expect(screen.getByText('🤖')).toBeDefined()
    })
  })

  it('does not show bot icon for regular message', async () => {
    getMessages.mockResolvedValue([
      { id: 1, user_id: 1, username: 'alice', is_bot: false, content: 'Привет!', created_at: '2024-01-01T10:00:00Z' },
    ])
    renderChatPage()
    await waitFor(() => screen.getByText('Привет!'))
    expect(screen.queryByText('🤖')).toBeNull()
  })
})

describe('New messages from WebSocket', () => {
  it('adds new message received via onMessage callback', async () => {
    let capturedOnMessage
    useWebSocket.mockImplementation((_token, onMessage) => {
      capturedOnMessage = onMessage
      return { status: 'online' }
    })
    getMessages.mockResolvedValue([])
    renderChatPage()

    await waitFor(() => expect(capturedOnMessage).toBeDefined())

    act(() => {
      capturedOnMessage({ id: 99, user_id: 2, username: 'bob', content: 'from ws', created_at: '2024-01-01T11:00:00Z' })
    })

    await waitFor(() => {
      expect(screen.getByText('from ws')).toBeDefined()
    })
  })

  it('does not duplicate a message that is already in history', async () => {
    const existing = { id: 1, user_id: 1, username: 'alice', content: 'hi', created_at: '2024-01-01T10:00:00Z' }
    getMessages.mockResolvedValue([existing])

    let capturedOnMessage
    useWebSocket.mockImplementation((_token, onMessage) => {
      capturedOnMessage = onMessage
      return { status: 'online' }
    })

    renderChatPage()
    await waitFor(() => screen.getByText('hi'))
    await waitFor(() => expect(capturedOnMessage).toBeDefined())

    act(() => { capturedOnMessage(existing) })

    await waitFor(() => {
      expect(screen.getAllByText('hi').length).toBe(1)
    })
  })
})
