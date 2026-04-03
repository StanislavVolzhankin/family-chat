import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import AppHeader from './AppHeader'
import { LangProvider } from '../context/LangContext'

const mockNavigate = vi.fn()

vi.mock('../utils/auth', () => ({
  clearAuth: vi.fn(),
  getUser: vi.fn(),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

import { clearAuth, getUser } from '../utils/auth'

function renderHeader(initialPath = '/chat') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <LangProvider>
        <AppHeader />
      </LangProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AppHeader — parent role', () => {
  beforeEach(() => {
    getUser.mockReturnValue({ username: 'admin', role: 'parent' })
  })

  it('shows nav links for parent', () => {
    renderHeader()
    expect(screen.getByRole('link', { name: 'Чат' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Менеджмент пользователей' })).toBeDefined()
  })

  it('shows username', () => {
    renderHeader()
    expect(screen.getByText('admin')).toBeDefined()
  })

  it('shows logout button', () => {
    renderHeader()
    expect(screen.getByRole('button', { name: 'Выйти' })).toBeDefined()
  })

  it('active link has active class when on /chat', () => {
    renderHeader('/chat')
    const chatLink = screen.getByRole('link', { name: 'Чат' })
    expect(chatLink.className).toContain('active')
    const usersLink = screen.getByRole('link', { name: 'Менеджмент пользователей' })
    expect(usersLink.className).not.toContain('active')
  })

  it('active link has active class when on /users', () => {
    renderHeader('/users')
    const usersLink = screen.getByRole('link', { name: 'Менеджмент пользователей' })
    expect(usersLink.className).toContain('active')
    const chatLink = screen.getByRole('link', { name: 'Чат' })
    expect(chatLink.className).not.toContain('active')
  })
})

describe('AppHeader — child role', () => {
  beforeEach(() => {
    getUser.mockReturnValue({ username: 'kid1', role: 'child' })
  })

  it('does not show nav links for child', () => {
    renderHeader()
    expect(screen.queryByRole('link', { name: 'Чат' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Менеджмент пользователей' })).toBeNull()
  })

  it('shows username for child', () => {
    renderHeader()
    expect(screen.getByText('kid1')).toBeDefined()
  })

  it('shows logout button for child', () => {
    renderHeader()
    expect(screen.getByRole('button', { name: 'Выйти' })).toBeDefined()
  })
})

describe('AppHeader — lang switcher', () => {
  beforeEach(() => {
    getUser.mockReturnValue({ username: 'admin', role: 'parent' })
  })

  it('shows RU and EN buttons', () => {
    renderHeader()
    expect(screen.getByRole('button', { name: 'RU' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'EN' })).toBeDefined()
  })

  it('RU button is disabled by default', () => {
    renderHeader()
    expect(screen.getByRole('button', { name: 'RU' }).disabled).toBe(true)
  })
})

describe('AppHeader — logout', () => {
  beforeEach(() => {
    getUser.mockReturnValue({ username: 'admin', role: 'parent' })
  })

  it('calls clearAuth and navigates to /login on logout click', () => {
    renderHeader()
    fireEvent.click(screen.getByRole('button', { name: 'Выйти' }))
    expect(clearAuth).toHaveBeenCalledOnce()
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
  })
})
