import { request } from '../../lib/api-client'
import type { WeekRange } from './weekRange'

export type PersonCapacity = {
  id: number
  name: string
  weeklyHours: number
  // allocated[i] is the hours booked in CapacityResponse.weeks[i].
  allocated: number[]
}

export type CapacityResponse = {
  from: string
  to: string
  weeks: string[]
  people: PersonCapacity[]
}

export function fetchCapacity(range: WeekRange, signal?: AbortSignal): Promise<CapacityResponse> {
  const params = new URLSearchParams(range)
  return request(`/api/capacity?${params}`, { signal })
}
