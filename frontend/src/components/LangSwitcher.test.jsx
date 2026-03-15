import { render, screen, fireEvent } from '@testing-library/react'
import { LangProvider } from '../context/LangContext'
import LangSwitcher from './LangSwitcher'

function renderSwitcher() {
  return render(
    <LangProvider>
      <LangSwitcher />
    </LangProvider>
  )
}

describe('LangSwitcher — rendering', () => {
  it('renders RU and EN buttons', () => {
    renderSwitcher()
    expect(screen.getByRole('button', { name: 'RU' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'EN' })).toBeDefined()
  })

  it('RU button is disabled by default (ru is active)', () => {
    renderSwitcher()
    expect(screen.getByRole('button', { name: 'RU' }).disabled).toBe(true)
  })

  it('EN button is not disabled by default', () => {
    renderSwitcher()
    expect(screen.getByRole('button', { name: 'EN' }).disabled).toBe(false)
  })
})

describe('LangSwitcher — switching', () => {
  it('clicking EN disables EN button and enables RU', () => {
    renderSwitcher()
    fireEvent.click(screen.getByRole('button', { name: 'EN' }))
    expect(screen.getByRole('button', { name: 'EN' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'RU' }).disabled).toBe(false)
  })

  it('clicking RU after EN switches back', () => {
    renderSwitcher()
    fireEvent.click(screen.getByRole('button', { name: 'EN' }))
    fireEvent.click(screen.getByRole('button', { name: 'RU' }))
    expect(screen.getByRole('button', { name: 'RU' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'EN' }).disabled).toBe(false)
  })
})
