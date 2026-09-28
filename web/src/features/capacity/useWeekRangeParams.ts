import { useEffect, useState } from 'react'
import { parseWeekRange, type WeekRange } from './weekRange'

export function useWeekRangeParams(fallback: () => WeekRange) {
  const [range, setRange] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return parseWeekRange(params.get('from'), params.get('to')) ?? fallback()
  })

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('from', range.from)
    url.searchParams.set('to', range.to)
    window.history.replaceState(null, '', url)
  }, [range])

  return [range, setRange] as const
}
