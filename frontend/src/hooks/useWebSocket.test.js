import { renderHook, act } from '@testing-library/react'
import { useWebSocket } from './useWebSocket'

let stateChangeHandler = null
let newMessageHandler = null
const mockBind = vi.fn((event, handler) => {
  if (event === 'state_change') stateChangeHandler = handler
})
const mockListen = vi.fn((event, handler) => {
  if (event === '.new_message') newMessageHandler = handler
})
const mockLeaveChannel = vi.fn()
const mockDisconnect = vi.fn()
const mockChannel = vi.fn(() => ({ listen: mockListen }))

vi.mock('laravel-echo', () => ({
  default: vi.fn(() => ({
    connector: { pusher: { connection: { bind: mockBind } } },
    channel: mockChannel,
    leaveChannel: mockLeaveChannel,
    disconnect: mockDisconnect,
  })),
}))

vi.mock('pusher-js', () => ({ default: class Pusher {} }))

beforeEach(() => {
  stateChangeHandler = null
  newMessageHandler = null
  vi.clearAllMocks()
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
    act(() => { stateChangeHandler({ current: 'connected' }) })
    expect(result.current.status).toBe('online')
  })

  it('sets status to connecting when connecting state fires', () => {
    const { result } = renderHook(() => useWebSocket('tok', vi.fn()))
    act(() => { stateChangeHandler({ current: 'connected' }) })
    act(() => { stateChangeHandler({ current: 'connecting' }) })
    expect(result.current.status).toBe('connecting')
  })

  it('sets status to offline when disconnected state fires', () => {
    const { result } = renderHook(() => useWebSocket('tok', vi.fn()))
    act(() => { stateChangeHandler({ current: 'connected' }) })
    act(() => { stateChangeHandler({ current: 'disconnected' }) })
    expect(result.current.status).toBe('offline')
  })

  it('sets status to offline when unavailable state fires', () => {
    const { result } = renderHook(() => useWebSocket('tok', vi.fn()))
    act(() => { stateChangeHandler({ current: 'unavailable' }) })
    expect(result.current.status).toBe('offline')
  })

  it('calls onMessage when new_message event fires', () => {
    const onMessage = vi.fn()
    renderHook(() => useWebSocket('tok', onMessage))
    const msg = { id: 1, username: 'alice', content: 'hi', created_at: '2024-01-01T10:00:00Z' }
    act(() => { newMessageHandler(msg) })
    expect(onMessage).toHaveBeenCalledWith(msg)
  })

  it('subscribes to chat channel', () => {
    renderHook(() => useWebSocket('tok', vi.fn()))
    expect(mockChannel).toHaveBeenCalledWith('chat')
    expect(mockListen).toHaveBeenCalledWith('.new_message', expect.any(Function))
  })

  it('cleans up (leaveChannel + disconnect) on unmount', () => {
    const { unmount } = renderHook(() => useWebSocket('tok', vi.fn()))
    unmount()
    expect(mockLeaveChannel).toHaveBeenCalledWith('chat')
    expect(mockDisconnect).toHaveBeenCalled()
  })

  it('does not create Echo when token is null', () => {
    renderHook(() => useWebSocket(null, vi.fn()))
    expect(mockChannel).not.toHaveBeenCalled()
  })
})
