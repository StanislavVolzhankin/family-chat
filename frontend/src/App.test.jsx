import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

// --- Mocks ---

// Replace BrowserRouter with MemoryRouter so we can control the initial URL.
// All other react-router-dom exports (Routes, Route, Navigate, etc.) stay real.
let memoryRouterInitialEntries = ['/']

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    BrowserRouter: ({ children }) => (
      <actual.MemoryRouter initialEntries={memoryRouterInitialEntries}>
        {children}
      </actual.MemoryRouter>
    ),
  }
})

vi.mock('./utils/auth', () => ({
  isAuthenticated: vi.fn(),
}))

vi.mock('./context/LangContext', () => ({
  LangProvider: ({ children }) => <>{children}</>,
}))

vi.mock('./pages/LoginPage', () => ({
  default: () => <div>LoginPage</div>,
}))

vi.mock('./pages/ChatPage', () => ({
  default: () => <div>ChatPage</div>,
}))

vi.mock('./pages/UserManagementPage', () => ({
  default: () => <div>UserManagementPage</div>,
}))

// --- Imports that depend on mocks ---
import { isAuthenticated } from './utils/auth'
import App from './App'

// Helper: set initial URL and render App
function renderAt(path) {
  memoryRouterInitialEntries = [path]
  return render(<App />)
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// 1. "/" redirects to "/login"
// ---------------------------------------------------------------------------
describe('Route /', () => {
  it('redirects to /login regardless of auth state', () => {
    isAuthenticated.mockReturnValue(false)
    renderAt('/')
    expect(screen.getByText('LoginPage')).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// 2-3. "/login" — PublicRoute
// ---------------------------------------------------------------------------
describe('Route /login', () => {
  it('shows LoginPage when NOT authenticated', () => {
    isAuthenticated.mockReturnValue(false)
    renderAt('/login')
    expect(screen.getByText('LoginPage')).toBeDefined()
  })

  it('redirects to /chat when authenticated', () => {
    isAuthenticated.mockReturnValue(true)
    renderAt('/login')
    expect(screen.queryByText('LoginPage')).toBeNull()
    expect(screen.getByText('ChatPage')).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// 4-5. "/chat" — PrivateRoute
// ---------------------------------------------------------------------------
describe('Route /chat', () => {
  it('shows ChatPage when authenticated', () => {
    isAuthenticated.mockReturnValue(true)
    renderAt('/chat')
    expect(screen.getByText('ChatPage')).toBeDefined()
  })

  it('redirects to /login when NOT authenticated', () => {
    isAuthenticated.mockReturnValue(false)
    renderAt('/chat')
    expect(screen.queryByText('ChatPage')).toBeNull()
    expect(screen.getByText('LoginPage')).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// 6-7. "/users" — PrivateRoute
// ---------------------------------------------------------------------------
describe('Route /users', () => {
  it('shows UserManagementPage when authenticated', () => {
    isAuthenticated.mockReturnValue(true)
    renderAt('/users')
    expect(screen.getByText('UserManagementPage')).toBeDefined()
  })

  it('redirects to /login when NOT authenticated', () => {
    isAuthenticated.mockReturnValue(false)
    renderAt('/users')
    expect(screen.queryByText('UserManagementPage')).toBeNull()
    expect(screen.getByText('LoginPage')).toBeDefined()
  })
})
