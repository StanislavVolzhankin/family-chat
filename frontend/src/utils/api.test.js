import { login, getUsers, createUser, updateUser, getMessages, sendMessage } from './api'

vi.mock('./auth', () => ({
  getToken: () => 'test-token',
}))

describe('api utils', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('login', () => {
    it('makes a POST request to /api/auth/login with correct body and headers', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { token: 'tok-1', user: { id: 1, username: 'alice' } } }),
      })
      vi.stubGlobal('fetch', fetchMock)

      await login('alice', 'secret')

      expect(fetchMock).toHaveBeenCalledOnce()
      const [url, options] = fetchMock.mock.calls[0]
      expect(url).toBe('/api/auth/login')
      expect(options.method).toBe('POST')
      expect(options.headers['Content-Type']).toBe('application/json')
      expect(JSON.parse(options.body)).toEqual({ username: 'alice', password: 'secret' })
    })

    it('returns the unwrapped data payload on a successful (2xx) response', async () => {
      const inner = { token: 'tok-ok', user: { id: 1, username: 'alice', role: 'child' } }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: inner }),
      }))

      const result = await login('alice', 'secret')

      expect(result).toEqual(inner)
    })

    it('throws an Error with the server error code on a failed (4xx) response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'invalid_credentials' }),
      }))

      await expect(login('alice', 'wrong')).rejects.toThrow('invalid_credentials')
    })

    it('throws an Error with "server_error" when the response has no error field', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({}),
      }))

      await expect(login('alice', 'wrong')).rejects.toThrow('server_error')
    })

    it('does not throw on a successful response even if a body field named error exists', async () => {
      const inner = { token: 'tok-2', user: { id: 2, username: 'bob' } }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: inner }),
      }))

      await expect(login('bob', 'pass')).resolves.toEqual(inner)
    })
  })

  describe('getUsers', () => {
    it('makes a GET request to /api/users with Authorization header', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      })
      vi.stubGlobal('fetch', fetchMock)

      await getUsers()

      const [url, options] = fetchMock.mock.calls[0]
      expect(url).toBe('/api/users')
      expect(options.headers['Authorization']).toBe('Bearer test-token')
    })

    it('returns the unwrapped data array on success', async () => {
      const users = [{ id: 1, username: 'alice', role: 'child', is_active: true }]
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: users }),
      }))

      const result = await getUsers()

      expect(result).toEqual(users)
    })

    it('throws with error code on failed response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'unauthorized' }),
      }))

      await expect(getUsers()).rejects.toThrow('unauthorized')
    })
  })

  describe('createUser', () => {
    it('makes a POST request to /api/users with correct body and Authorization header', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 2, username: 'bob', role: 'child', is_active: true } }),
      })
      vi.stubGlobal('fetch', fetchMock)

      await createUser('bob', 'pass123')

      const [url, options] = fetchMock.mock.calls[0]
      expect(url).toBe('/api/users')
      expect(options.method).toBe('POST')
      expect(options.headers['Authorization']).toBe('Bearer test-token')
      expect(JSON.parse(options.body)).toEqual({ username: 'bob', password: 'pass123' })
    })

    it('returns the created user on success', async () => {
      const newUser = { id: 2, username: 'bob', role: 'child', is_active: true }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: newUser }),
      }))

      const result = await createUser('bob', 'pass123')

      expect(result).toEqual(newUser)
    })

    it('throws with error code on failed response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'username_taken' }),
      }))

      await expect(createUser('bob', 'pass123')).rejects.toThrow('username_taken')
    })
  })

  describe('updateUser', () => {
    it('makes a PATCH request to /api/users/:id with correct body and Authorization header', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 3, username: 'charlie', role: 'child', is_active: false } }),
      })
      vi.stubGlobal('fetch', fetchMock)

      await updateUser(3, { is_active: false })

      const [url, options] = fetchMock.mock.calls[0]
      expect(url).toBe('/api/users/3')
      expect(options.method).toBe('PATCH')
      expect(options.headers['Authorization']).toBe('Bearer test-token')
      expect(JSON.parse(options.body)).toEqual({ is_active: false })
    })

    it('returns the updated user on success', async () => {
      const updated = { id: 3, username: 'charlie', role: 'child', is_active: false }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: updated }),
      }))

      const result = await updateUser(3, { is_active: false })

      expect(result).toEqual(updated)
    })

    it('throws with error code on failed response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'user_not_found' }),
      }))

      await expect(updateUser(99, { password: 'x' })).rejects.toThrow('user_not_found')
    })

    it('sends only the fields provided in updates', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: {} }),
      })
      vi.stubGlobal('fetch', fetchMock)

      await updateUser(5, { password: 'newpass' })

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body).toEqual({ password: 'newpass' })
      expect(body).not.toHaveProperty('is_active')
    })
  })

  describe('getMessages', () => {
    it('makes a GET request to /api/messages with Authorization header', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      })
      vi.stubGlobal('fetch', fetchMock)

      await getMessages()

      const [url, options] = fetchMock.mock.calls[0]
      expect(url).toBe('/api/messages')
      expect(options.headers['Authorization']).toBe('Bearer test-token')
    })

    it('returns the unwrapped data array on success', async () => {
      const msgs = [{ id: 1, user_id: 1, username: 'alice', content: 'hi', created_at: '2024-01-01T10:00:00Z' }]
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: msgs }),
      }))

      const result = await getMessages()

      expect(result).toEqual(msgs)
    })

    it('throws with error code on failed response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'unauthorized' }),
      }))

      await expect(getMessages()).rejects.toThrow('unauthorized')
    })
  })

  describe('sendMessage', () => {
    it('makes a POST request to /api/messages with content and Authorization header', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 5, user_id: 1, username: 'alice', content: 'hello', created_at: '2024-01-01T10:00:00Z' } }),
      })
      vi.stubGlobal('fetch', fetchMock)

      await sendMessage('hello')

      const [url, options] = fetchMock.mock.calls[0]
      expect(url).toBe('/api/messages')
      expect(options.method).toBe('POST')
      expect(options.headers['Authorization']).toBe('Bearer test-token')
      expect(JSON.parse(options.body)).toEqual({ content: 'hello' })
    })

    it('returns the created message on success', async () => {
      const msg = { id: 5, user_id: 1, username: 'alice', content: 'hello', created_at: '2024-01-01T10:00:00Z' }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: msg }),
      }))

      const result = await sendMessage('hello')

      expect(result).toEqual(msg)
    })

    it('throws with rate_limit_exceeded on 429 response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'rate_limit_exceeded' }),
      }))

      await expect(sendMessage('hi')).rejects.toThrow('rate_limit_exceeded')
    })

    it('throws with server_error when no error field in response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({}),
      }))

      await expect(sendMessage('hi')).rejects.toThrow('server_error')
    })
  })
})
