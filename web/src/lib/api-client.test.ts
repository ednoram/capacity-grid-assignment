import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, request } from './api-client'

function stubFetch(impl: () => Promise<Response>) {
  vi.stubGlobal('fetch', vi.fn(impl))
}

describe('request', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("surfaces the server's error message", async () => {
    stubFetch(async () => Response.json({ error: 'from must not be after to' }, { status: 400 }))
    await expect(request('/api/capacity')).rejects.toEqual(new ApiError('from must not be after to', 400))
  })

  it('falls back to a generic message when the body is not JSON', async () => {
    stubFetch(async () => new Response('Bad Gateway', { status: 502 }))
    await expect(request('/api/capacity')).rejects.toMatchObject({
      status: 502,
      message: 'The server is having trouble. Try again in a moment.',
    })
  })

  it('reports an unreachable server as status 0', async () => {
    stubFetch(async () => {
      throw new TypeError('Failed to fetch')
    })
    await expect(request('/api/capacity')).rejects.toMatchObject({ status: 0 })
  })
})
