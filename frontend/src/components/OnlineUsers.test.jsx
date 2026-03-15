import { render, screen } from '@testing-library/react'
import { LangProvider } from '../context/LangContext'
import OnlineUsers from './OnlineUsers'

function renderOnlineUsers(users) {
  return render(
    <LangProvider>
      <OnlineUsers users={users} />
    </LangProvider>
  )
}

describe('OnlineUsers', () => {
  it('renders sidebar title', () => {
    renderOnlineUsers([])
    expect(screen.getByText('В сети')).toBeDefined()
  })

  it('always shows Lulu first with bot icon', () => {
    renderOnlineUsers([])
    const items = screen.getAllByRole('listitem')
    expect(items[0].textContent).toContain('Lulu')
    expect(items[0].textContent).toContain('🤖')
  })

  it('shows regular users after Lulu', () => {
    renderOnlineUsers([{ id: 1, username: 'alice', is_bot: false }])
    const items = screen.getAllByRole('listitem')
    expect(items[0].textContent).toContain('Lulu')
    expect(items[1].textContent).toContain('alice')
  })

  it('sorts regular users alphabetically', () => {
    renderOnlineUsers([
      { id: 2, username: 'charlie', is_bot: false },
      { id: 1, username: 'alice', is_bot: false },
      { id: 3, username: 'bob', is_bot: false },
    ])
    const items = screen.getAllByRole('listitem')
    expect(items[1].textContent).toContain('alice')
    expect(items[2].textContent).toContain('bob')
    expect(items[3].textContent).toContain('charlie')
  })

  it('filters out bots from presence users list', () => {
    renderOnlineUsers([
      { id: 1, username: 'alice', is_bot: false },
      { id: 99, username: 'SomeBot', is_bot: true },
    ])
    const items = screen.getAllByRole('listitem')
    // Lulu + alice only (SomeBot filtered out)
    expect(items).toHaveLength(2)
    expect(screen.queryByText('SomeBot')).toBeNull()
  })

  it('shows only Lulu when users list is empty', () => {
    renderOnlineUsers([])
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(items[0].textContent).toContain('Lulu')
  })

  it('does not show bot icon for regular users', () => {
    renderOnlineUsers([{ id: 1, username: 'alice', is_bot: false }])
    const aliceItem = screen.getAllByRole('listitem')[1]
    expect(aliceItem.textContent).not.toContain('🤖')
  })
})
