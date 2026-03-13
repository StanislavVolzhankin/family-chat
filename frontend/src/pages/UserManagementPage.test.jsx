import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import UserManagementPage from './UserManagementPage'
import { LangProvider } from '../context/LangContext'

vi.mock('../utils/api', () => ({
  getUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
}))

vi.mock('../utils/auth', () => ({ clearAuth: vi.fn() }))

import { getUsers, createUser, updateUser } from '../utils/api'

const mockUsers = [
  { id: 1, username: 'alice', role: 'child', is_active: true },
  { id: 2, username: 'bob', role: 'child', is_active: false },
]

function renderPage() {
  return render(
    <MemoryRouter>
      <LangProvider>
        <UserManagementPage />
      </LangProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  getUsers.mockResolvedValue(mockUsers)
})

// ---------------------------------------------------------------------------
// Initial render
// ---------------------------------------------------------------------------

describe('Initial render', () => {
  it('renders the page title', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1 })).toBeDefined()
  })

  it('loads and displays users after mount', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('alice')).toBeDefined()
      expect(screen.getByText('bob')).toBeDefined()
    })
  })

  it('shows service unavailable error when loading fails', async () => {
    getUsers.mockRejectedValue(new Error('server_error'))
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Сервис временно недоступен, попробуйте позже')).toBeDefined()
    })
  })
})

// ---------------------------------------------------------------------------
// Create user
// ---------------------------------------------------------------------------

describe('Create user', () => {
  it('calls createUser with correct args and adds user to list', async () => {
    const newUser = { id: 3, username: 'charlie', role: 'child', is_active: true }
    createUser.mockResolvedValue(newUser)
    renderPage()
    await waitFor(() => screen.getByText('alice'))

    fireEvent.change(screen.getByPlaceholderText('Логин'), { target: { value: 'charlie' } })
    fireEvent.change(screen.getByPlaceholderText('Пароль'), { target: { value: 'secret123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Создать пользователя' }))

    await waitFor(() => {
      expect(createUser).toHaveBeenCalledWith('charlie', 'secret123')
      expect(screen.getByText('charlie')).toBeDefined()
    })
  })

  it('clears form fields after successful creation', async () => {
    createUser.mockResolvedValue({ id: 3, username: 'charlie', role: 'child', is_active: true })
    renderPage()
    await waitFor(() => screen.getByText('alice'))

    const usernameInput = screen.getByPlaceholderText('Логин')
    fireEvent.change(usernameInput, { target: { value: 'charlie' } })
    fireEvent.change(screen.getByPlaceholderText('Пароль'), { target: { value: 'secret123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Создать пользователя' }))

    await waitFor(() => expect(usernameInput.value).toBe(''))
  })

  it('shows username_taken error when createUser fails', async () => {
    createUser.mockRejectedValue(new Error('username_taken'))
    renderPage()
    await waitFor(() => screen.getByText('alice'))

    fireEvent.change(screen.getByPlaceholderText('Логин'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByPlaceholderText('Пароль'), { target: { value: 'pass123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Создать пользователя' }))

    await waitFor(() => {
      expect(screen.getByText('Логин уже занят')).toBeDefined()
    })
  })
})

// ---------------------------------------------------------------------------
// Toggle active
// ---------------------------------------------------------------------------

describe('Toggle active', () => {
  it('calls updateUser with is_active:false for active user', async () => {
    updateUser.mockResolvedValue({ ...mockUsers[0], is_active: false })
    renderPage()
    await waitFor(() => screen.getByText('alice'))

    fireEvent.click(screen.getAllByRole('button', { name: 'Деактивировать' })[0])

    await waitFor(() => {
      expect(updateUser).toHaveBeenCalledWith(1, { is_active: false })
    })
  })

  it('calls updateUser with is_active:true for inactive user', async () => {
    updateUser.mockResolvedValue({ ...mockUsers[1], is_active: true })
    renderPage()
    await waitFor(() => screen.getByText('bob'))

    fireEvent.click(screen.getByRole('button', { name: 'Активировать' }))

    await waitFor(() => {
      expect(updateUser).toHaveBeenCalledWith(2, { is_active: true })
    })
  })
})

// ---------------------------------------------------------------------------
// Change password
// ---------------------------------------------------------------------------

describe('Change password', () => {
  it('shows password input when change password is clicked', async () => {
    renderPage()
    await waitFor(() => screen.getByText('alice'))

    fireEvent.click(screen.getAllByRole('button', { name: 'Сменить пароль' })[0])

    expect(screen.getByPlaceholderText('Новый пароль')).toBeDefined()
  })

  it('calls updateUser with new password and hides form on save', async () => {
    updateUser.mockResolvedValue(mockUsers[0])
    renderPage()
    await waitFor(() => screen.getByText('alice'))

    fireEvent.click(screen.getAllByRole('button', { name: 'Сменить пароль' })[0])
    fireEvent.change(screen.getByPlaceholderText('Новый пароль'), { target: { value: 'newpass' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => {
      expect(updateUser).toHaveBeenCalledWith(1, { password: 'newpass' })
      expect(screen.queryByPlaceholderText('Новый пароль')).toBeNull()
    })
  })

  it('hides password form when cancel is clicked', async () => {
    renderPage()
    await waitFor(() => screen.getByText('alice'))

    fireEvent.click(screen.getAllByRole('button', { name: 'Сменить пароль' })[0])
    expect(screen.getByPlaceholderText('Новый пароль')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }))
    expect(screen.queryByPlaceholderText('Новый пароль')).toBeNull()
  })
})
