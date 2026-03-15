import { renderHook, act } from '@testing-library/react'
import { useWebSocket } from './useWebSocket'

let stateChangeHandler = null
let newMessageHandler = null
let hereHandler = null
let joiningHandler = null
let leavingHandler = null

const mockBind = vi.fn((event, handler) => {
  if (event === 'state_change') stateChangeHandler = handler
})

const mockChannelObj = {
  here: vi.fn((handler) => { hereHandler = handler; return mockChannelObj }),
  joining: vi.fn((handler) => { joiningHandler = handler; return mockChannelObj }),
  leaving: vi.fn((handler) => { leavingHandler = handler; return mockChannelObj }),
  listen: vi.fn((event, handler) => {
    if (event === '.new_message') newMessageHandler = handler
    return mockChannelObj
  }),
}

const mockJoin = vi.fn(() => mockChannelObj)
const mockLeaveChannel = vi.fn()
const mockDisconnect = vi.fn()

vi.mock('laravel-echo', () => ({
  default: vi.fn(() => ({
    connector: { pusher: { connection: { bind: mockBind } } },
    join: mockJoin,
    leaveChannel: mockLeaveChannel,
    disconnect: mockDisconnect,
  })),
}))

vi.mock('pusher-js', () => ({ default: class Pusher {} }))

beforeEach(() => {
  stateChangeHandler = null
  newMessageHandler = null
  hereHandler = null
  joiningHandler = null
  leavingHandler = null
  vi.clearAllMocks()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useWebSocket', () => {
  it('starts with connecting status when token is provided', () => {
    const { result } = renderHook(() => useWebSocket('tok', vi.fn()))
    expect(result.current.status).toBe('connecting')
  })

  it('sets status to offline when no token', () => {
    const { result } = renderHook(() => useWebSocket(null, vi.fn()))
    expect(result.current.status).toBe('offline')
  })

  it('sets status to online when connected state fires', () => {
    const { result } = renderHook(() => useWebSocket('tok', vi.fn()))
    act(() => vi.runAllTimers())
    act(() => { stateChangeHandler({ current: 'connected' }) })
    expect(result.current.status).toBe('online')
  })

  it('sets status to connecting when connecting state fires', () => {
    const { result } = renderHook(() => useWebSocket('tok', vi.fn()))
    act(() => vi.runAllTimers())
    act(() => { stateChangeHandler({ current: 'connected' }) })
    act(() => { stateChangeHandler({ current: 'connecting' }) })
    expect(result.current.status).toBe('connecting')
  })

  it('sets status to offline when disconnected state fires', () => {
    const { result } = renderHook(() => useWebSocket('tok', vi.fn()))
    act(() => vi.runAllTimers())
    act(() => { stateChangeHandler({ current: 'connected' }) })
    act(() => { stateChangeHandler({ current: 'disconnected' }) })
    expect(result.current.status).toBe('offline')
  })

  it('sets status to offline when unavailable state fires', () => {
    const { result } = renderHook(() => useWebSocket('tok', vi.fn()))
    act(() => vi.runAllTimers())
    act(() => { stateChangeHandler({ current: 'unavailable' }) })
    expect(result.current.status).toBe('offline')
  })

  it('calls onMessage when new_message event fires', () => {
    const onMessage = vi.fn()
    renderHook(() => useWebSocket('tok', onMessage))
    act(() => vi.runAllTimers())
    const msg = { id: 1, username: 'alice', content: 'hi', created_at: '2024-01-01T10:00:00Z' }
    act(() => { newMessageHandler(msg) })
    expect(onMessage).toHaveBeenCalledWith(msg)
  })

  it('subscribes to presence chat channel', () => {
    renderHook(() => useWebSocket('tok', vi.fn()))
    act(() => vi.runAllTimers())
    expect(mockJoin).toHaveBeenCalledWith('chat')
    expect(mockChannelObj.listen).toHaveBeenCalledWith('.new_message', expect.any(Function))
  })

  it('cleans up (leaveChannel + disconnect) on unmount', () => {
    const { unmount } = renderHook(() => useWebSocket('tok', vi.fn()))
    act(() => vi.runAllTimers())
    unmount()
    expect(mockLeaveChannel).toHaveBeenCalledWith('presence-chat')
    expect(mockDisconnect).toHaveBeenCalled()
  })

  it('does not create Echo when token is null', () => {
    renderHook(() => useWebSocket(null, vi.fn()))
    act(() => vi.runAllTimers())
    expect(mockJoin).not.toHaveBeenCalled()
  })

  it('here event sets onlineUsers', () => {
    const { result } = renderHook(() => useWebSocket('tok', vi.fn()))
    act(() => vi.runAllTimers())
    const users = [{ id: 1, username: 'alice', is_bot: false }]
    act(() => { hereHandler(users) })
    expect(result.current.onlineUsers).toEqual(users)
  })

  it('joining event adds user to onlineUsers', () => {
    const { result } = renderHook(() => useWebSocket('tok', vi.fn()))
    act(() => vi.runAllTimers())
    act(() => { hereHandler([{ id: 1, username: 'alice', is_bot: false }]) })
    act(() => { joiningHandler({ id: 2, username: 'bob', is_bot: false }) })
    expect(result.current.onlineUsers).toHaveLength(2)
    expect(result.current.onlineUsers.find(u => u.username === 'bob')).toBeDefined()
  })

  it('leaving event removes user from onlineUsers', () => {
    const { result } = renderHook(() => useWebSocket('tok', vi.fn()))
    act(() => vi.runAllTimers())
    act(() => { hereHandler([
      { id: 1, username: 'alice', is_bot: false },
      { id: 2, username: 'bob', is_bot: false },
    ]) })
    act(() => { leavingHandler({ id: 2, username: 'bob', is_bot: false }) })
    expect(result.current.onlineUsers).toHaveLength(1)
    expect(result.current.onlineUsers[0].username).toBe('alice')
  })
})
