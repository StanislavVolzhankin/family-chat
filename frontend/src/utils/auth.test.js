import { saveAuth, getToken, getUser, clearAuth, isAuthenticated } from './auth'

describe('auth utils', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('saveAuth', () => {
    it('saves token to localStorage', () => {
      saveAuth('tok-123', { id: 1, username: 'alice' })
      expect(localStorage.getItem('fc_token')).toBe('tok-123')
    })

    it('saves user as JSON string to localStorage', () => {
      const user = { id: 1, username: 'alice', role: 'child' }
      saveAuth('tok-123', user)
      expect(localStorage.getItem('fc_user')).toBe(JSON.stringify(user))
    })
  })

  describe('getToken', () => {
    it('returns the saved token', () => {
      saveAuth('tok-abc', { id: 2, username: 'bob' })
      expect(getToken()).toBe('tok-abc')
    })

    it('returns null when no token is stored', () => {
      expect(getToken()).toBeNull()
    })
  })

  describe('getUser', () => {
    it('returns the parsed user object', () => {
      const user = { id: 3, username: 'carol', role: 'parent' }
      saveAuth('tok-xyz', user)
      expect(getUser()).toEqual(user)
    })

    it('returns null when no user is stored', () => {
      expect(getUser()).toBeNull()
    })
  })

  describe('clearAuth', () => {
    it('removes both token and user from localStorage', () => {
      saveAuth('tok-del', { id: 4, username: 'dave' })
      clearAuth()
      expect(localStorage.getItem('fc_token')).toBeNull()
      expect(localStorage.getItem('fc_user')).toBeNull()
    })

    it('does not throw when localStorage is already empty', () => {
      expect(() => clearAuth()).not.toThrow()
    })
  })

  describe('isAuthenticated', () => {
    it('returns true when a token is present', () => {
      saveAuth('tok-auth', { id: 5, username: 'eve' })
      expect(isAuthenticated()).toBe(true)
    })

    it('returns false when no token is stored', () => {
      expect(isAuthenticated()).toBe(false)
    })

    it('returns false after clearAuth is called', () => {
      saveAuth('tok-auth', { id: 5, username: 'eve' })
      clearAuth()
      expect(isAuthenticated()).toBe(false)
    })
  })
})
