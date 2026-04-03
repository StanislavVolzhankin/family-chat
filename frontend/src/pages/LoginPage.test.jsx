import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import LoginPage from './LoginPage'
import { LangProvider } from '../context/LangContext'

vi.mock('../utils/api', () => ({ login: vi.fn() }))
vi.mock('../utils/auth', () => ({ saveAuth: vi.fn() }))
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockNavigate = vi.fn()

import { login } from '../utils/api'
import { saveAuth } from '../utils/auth'

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LangProvider>
        <LoginPage />
      </LangProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Form rendering', () => {
  it('renders username input, password input, submit button and title', () => {
    renderLoginPage()
    expect(screen.getByRole('heading')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Войти' })).toBeDefined()
    expect(screen.getAllByRole('textbox').length).toBeGreaterThanOrEqual(1)
  })

  it('shows no error on initial render', () => {
    renderLoginPage()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('Successful login', () => {
  it('calls saveAuth and navigates to /chat on success', async () => {
    login.mockResolvedValue({ access_token: 'tok123', user: { id: 1, username: 'parent', role: 'parent' } })
    renderLoginPage()

    fireEvent.change(screen.getByLabelText(/логин/i), { target: { value: 'parent' } })
    fireEvent.change(screen.getByLabelText(/пароль/i), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }))

    await waitFor(() => {
      expect(saveAuth).toHaveBeenCalledWith('tok123', { id: 1, username: 'parent', role: 'parent' })
      expect(mockNavigate).toHaveBeenCalledWith('/chat', { replace: true })
    })
  })
})

describe('Login errors', () => {
  it('shows invalid_credentials message', async () => {
    login.mockRejectedValue(new Error('invalid_credentials'))
    renderLoginPage()

    fireEvent.change(screen.getByLabelText(/логин/i), { target: { value: 'parent' } })
    fireEvent.change(screen.getByLabelText(/пароль/i), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }))

    await waitFor(() => {
      expect(screen.getByText('Неверный логин или пароль')).toBeDefined()
    })
  })

  it('shows user_inactive message', async () => {
    login.mockRejectedValue(new Error('user_inactive'))
    renderLoginPage()

    fireEvent.change(screen.getByLabelText(/логин/i), { target: { value: 'parent' } })
    fireEvent.change(screen.getByLabelText(/пароль/i), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }))

    await waitFor(() => {
      expect(screen.getByText('Аккаунт отключён')).toBeDefined()
    })
  })

  it('shows service_unavailable for unknown error', async () => {
    login.mockRejectedValue(new Error('server_error'))
    renderLoginPage()

    fireEvent.change(screen.getByLabelText(/логин/i), { target: { value: 'parent' } })
    fireEvent.change(screen.getByLabelText(/пароль/i), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }))

    await waitFor(() => {
      expect(screen.getByText('Сервис временно недоступен, попробуйте позже')).toBeDefined()
    })
  })
})

describe('Loading state', () => {
  it('disables button and shows ... while loading', async () => {
    login.mockReturnValue(new Promise(() => {}))
    renderLoginPage()

    fireEvent.change(screen.getByLabelText(/логин/i), { target: { value: 'parent' } })
    fireEvent.change(screen.getByLabelText(/пароль/i), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }))

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: '...' })
      expect(btn.disabled).toBe(true)
    })
  })
})

describe('Language switch', () => {
  it('switches to EN and updates texts', async () => {
    renderLoginPage()

    fireEvent.click(screen.getByRole('button', { name: 'EN' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeDefined()
    })
  })
})
