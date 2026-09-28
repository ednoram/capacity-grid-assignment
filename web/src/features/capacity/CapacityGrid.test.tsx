import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { CapacityResponse } from './api'
import { CapacityGrid } from './CapacityGrid'

const range = { from: '2026-01-05', to: '2026-01-18' }

const capacity: CapacityResponse = {
  ...range,
  weeks: ['2026-01-05', '2026-01-12'],
  people: [
    { id: 4, name: 'Dee Okafor', weeklyHours: 40, allocated: [45, 40] },
    { id: 5, name: 'Eli Nakamura', weeklyHours: 0, allocated: [20, 0] },
  ],
}

let patchResponse: () => Promise<Response>
const fetchMock = vi.fn((path: string, init?: RequestInit) => {
  if (init?.method === 'PATCH') return patchResponse()
  return Promise.resolve(Response.json(capacity))
})

function renderGrid(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  const { unmount } = render(
    <QueryClientProvider client={client}>
      <CapacityGrid range={range} />
    </QueryClientProvider>,
  )
  return { client, unmount }
}

function row(name: string) {
  return screen.getByRole('rowheader', { name: new RegExp(name) }).closest('tr')!
}

async function editWeeklyHours(name: string, value: string) {
  fireEvent.click(await screen.findByRole('button', { name: new RegExp(`Edit weekly hours for ${name}`) }))
  const input = screen.getByRole('spinbutton', { name: `Weekly hours for ${name}` })
  fireEvent.change(input, { target: { value } })
  // Browsers activate the refocused edit button on keypress unless Enter is cancelled.
  const notCancelled = fireEvent.keyDown(input, { key: 'Enter' })
  expect(notCancelled).toBe(false)
}

// jsdom has no layout; give elements a box so the virtualised grid renders rows.
beforeAll(() => {
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(800)
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(1200)
})
afterAll(() => {
  vi.restoreAllMocks()
})

describe('editing weekly hours', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    cleanup()
    fetchMock.mockClear()
    vi.unstubAllGlobals()
  })

  it('shows the pending value, then keeps the saved value without refetching', async () => {
    let resolve!: (response: Response) => void
    patchResponse = () => new Promise((r) => (resolve = r))
    renderGrid()

    await editWeeklyHours('Dee Okafor', '50')
    expect(await within(row('Dee Okafor')).findByText('Saving…')).toBeTruthy()
    expect(document.activeElement).toBe(within(row('Dee Okafor')).getByRole('button', { name: /Edit weekly hours/ }))
    expect(within(row('Dee Okafor')).queryByText('+5')).toBeNull()

    resolve(Response.json({ id: 4, name: 'Dee Okafor', weeklyHours: 50 }))
    await waitFor(() => expect(within(row('Dee Okafor')).queryByText('Saving…')).toBeNull())
    expect(within(row('Dee Okafor')).getByRole('button', { name: /currently 50/ })).toBeTruthy()
    expect(within(row('Dee Okafor')).queryByText('+5')).toBeNull()
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method !== 'PATCH')).toHaveLength(1)
  })

  it('reverts to the confirmed value and offers a retry when the save fails', async () => {
    patchResponse = async () => Response.json({ error: 'database unavailable' }, { status: 500 })
    renderGrid()

    await editWeeklyHours('Dee Okafor', '50')
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain("Couldn't save 50h for Dee Okafor: database unavailable")
    expect(within(row('Dee Okafor')).getByRole('button', { name: /currently 40/ })).toBeTruthy()
    expect(within(row('Dee Okafor')).getByText('+5')).toBeTruthy()

    patchResponse = async () => Response.json({ id: 4, name: 'Dee Okafor', weeklyHours: 50 })
    fireEvent.click(within(alert).getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(within(row('Dee Okafor')).getByRole('button', { name: /currently 50/ })).toBeTruthy()
  })

  // Virtualised rows unmount when scrolled out of view; remounting the grid does the same to every row.
  it('keeps a pending save and its lock when the row remounts', async () => {
    let resolve!: (response: Response) => void
    patchResponse = () => new Promise((r) => (resolve = r))
    const { client, unmount } = renderGrid()

    await editWeeklyHours('Dee Okafor', '50')
    await within(row('Dee Okafor')).findByText('Saving…')
    unmount()
    const remounted = renderGrid(client)

    expect(await within(row('Dee Okafor')).findByText('Saving…')).toBeTruthy()
    const editButton = within(row('Dee Okafor')).getByRole('button', { name: /currently 50/ })
    expect(editButton.getAttribute('aria-disabled')).toBe('true')

    remounted.unmount()
    resolve(Response.json({ id: 4, name: 'Dee Okafor', weeklyHours: 50 }))
    await waitFor(() => expect(client.isMutating()).toBe(0))
    renderGrid(client)
    expect(await within(row('Dee Okafor')).findByRole('button', { name: /currently 50/ })).toBeTruthy()
  })

  it('keeps a failed save until it is dismissed, even across remounts', async () => {
    patchResponse = async () => Response.json({ error: 'database unavailable' }, { status: 500 })
    const { client, unmount } = renderGrid()

    await editWeeklyHours('Dee Okafor', '50')
    await screen.findByRole('alert')
    unmount()
    const remounted = renderGrid(client)

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain("Couldn't save 50h for Dee Okafor")
    fireEvent.click(within(alert).getByRole('button', { name: 'Dismiss' }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())

    remounted.unmount()
    renderGrid(client)
    await screen.findByText('Dee Okafor')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(client.getMutationCache().getAll()).toHaveLength(0)
  })

  it('does not send invalid values', async () => {
    renderGrid()

    await editWeeklyHours('Eli Nakamura', '-1')
    expect(screen.getByText('Enter 0–168 hours')).toBeTruthy()
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false)
  })
})
