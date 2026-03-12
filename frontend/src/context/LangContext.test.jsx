import { describe, it, expect } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { LangProvider, useLang } from './LangContext'
import ru from '../locales/ru.json'
import en from '../locales/en.json'

// Helper component that exposes the context value via data attributes
function LangConsumer({ onRender }) {
  const ctx = useLang()
  onRender(ctx)
  return <div data-testid="consumer">rendered</div>
}

// Helper: renders LangProvider with a consumer and captures context value
function renderWithProvider() {
  let captured = {}
  render(
    <LangProvider>
      <LangConsumer onRender={(ctx) => { captured = ctx }} />
    </LangProvider>
  )
  return { captured }
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('LangProvider', () => {
  it('renders children', () => {
    render(
      <LangProvider>
        <span data-testid="child">hello</span>
      </LangProvider>
    )
    expect(screen.getByTestId('child')).toBeDefined()
    expect(screen.getByTestId('child').textContent).toBe('hello')
  })
})

describe('useLang — default state', () => {
  it('returns lang = "ru" by default', () => {
    const { captured } = renderWithProvider()
    expect(captured.lang).toBe('ru')
  })

  it('returns setLang function', () => {
    const { captured } = renderWithProvider()
    expect(typeof captured.setLang).toBe('function')
  })

  it('returns t equal to the Russian locale dictionary', () => {
    const { captured } = renderWithProvider()
    expect(captured.t).toEqual(ru)
  })

  it('t.login.title equals Russian value', () => {
    const { captured } = renderWithProvider()
    expect(captured.t.login.title).toBe(ru.login.title)
  })
})

describe('useLang — after setLang("en")', () => {
  it('switches lang to "en"', () => {
    let captured = {}

    function SwitchConsumer() {
      const ctx = useLang()
      captured = ctx
      return null
    }

    render(
      <LangProvider>
        <SwitchConsumer />
      </LangProvider>
    )

    act(() => {
      captured.setLang('en')
    })

    expect(captured.lang).toBe('en')
  })

  it('switches t to the English locale dictionary after setLang("en")', () => {
    let captured = {}

    function SwitchConsumer() {
      const ctx = useLang()
      captured = ctx
      return null
    }

    render(
      <LangProvider>
        <SwitchConsumer />
      </LangProvider>
    )

    act(() => {
      captured.setLang('en')
    })

    expect(captured.t).toEqual(en)
  })

  it('t.login.title equals English value after switching', () => {
    let captured = {}

    function SwitchConsumer() {
      const ctx = useLang()
      captured = ctx
      return null
    }

    render(
      <LangProvider>
        <SwitchConsumer />
      </LangProvider>
    )

    act(() => {
      captured.setLang('en')
    })

    expect(captured.t.login.title).toBe(en.login.title)
  })

  it('switching back to "ru" restores Russian dictionary', () => {
    let captured = {}

    function SwitchConsumer() {
      const ctx = useLang()
      captured = ctx
      return null
    }

    render(
      <LangProvider>
        <SwitchConsumer />
      </LangProvider>
    )

    act(() => { captured.setLang('en') })
    act(() => { captured.setLang('ru') })

    expect(captured.lang).toBe('ru')
    expect(captured.t).toEqual(ru)
  })
})

describe('useLang — outside LangProvider', () => {
  it('throws an error when called outside LangProvider', () => {
    // Suppress React error boundary noise in test output
    const originalError = console.error
    console.error = () => {}

    function BadConsumer() {
      useLang() // should throw
      return null
    }

    expect(() => {
      render(<BadConsumer />)
    }).toThrow('useLang must be used within LangProvider')

    console.error = originalError
  })
})
