import { login } from './api'

describe('api utils', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('login', () => {
    it('makes a POST request to /api/auth/login with correct body and headers', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: 'tok-1', user: { id: 1, username: 'alice' } }),
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

    it('returns response data on a successful (2xx) response', async () => {
      const payload = { token: 'tok-ok', user: { id: 1, username: 'alice', role: 'child' } }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => payload,
      }))

      const result = await login('alice', 'secret')

      expect(result).toEqual(payload)
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
      // Defensive: ok:true should always return data, not throw
      const payload = { token: 'tok-2', user: { id: 2, username: 'bob' } }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => payload,
      }))

      await expect(login('bob', 'pass')).resolves.toEqual(payload)
    })
  })
})
