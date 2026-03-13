import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import AppHeader from './AppHeader'
import { LangProvider } from '../context/LangContext'

vi.mock('../utils/auth', () => ({ clearAuth: vi.fn() }))
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockNavigate = vi.fn()

import { clearAuth } from '../utils/auth'

function renderHeader() {
  return render(
    <LangProvider>
      <AppHeader />
    </LangProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AppHeader', () => {
  it('renders logout button', () => {
    renderHeader()
    expect(screen.getByRole('button', { name: 'Выйти' })).toBeDefined()
  })

  it('calls clearAuth and navigates to /login on logout click', () => {
    renderHeader()
    fireEvent.click(screen.getByRole('button', { name: 'Выйти' }))
    expect(clearAuth).toHaveBeenCalledOnce()
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
  })
})
