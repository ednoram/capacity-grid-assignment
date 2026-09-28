import {
  addWeeks,
  differenceInCalendarISOWeeks,
  endOfISOWeek,
  format,
  isValid,
  max,
  min,
  parseISO,
  startOfISOWeek,
} from 'date-fns'

// A Monday-to-Sunday span as YYYY-MM-DD strings, matching the API.
export type WeekRange = {
  from: string
  to: string
}

// Must match maxWeeks in api/capacity.go.
export const MAX_WEEKS = 26
export const EARLIEST_DATE = '2000-01-01'
export const LATEST_DATE = '2099-12-31'

export function weeksStarting(date: Date, weeks: number): WeekRange {
  const monday = startOfISOWeek(date)
  return toRange(monday, endOfISOWeek(addWeeks(monday, weeks - 1)))
}

export function shiftWeeks(range: WeekRange, weeks: number): WeekRange {
  return toRange(addWeeks(parseISO(range.from), weeks), addWeeks(parseISO(range.to), weeks))
}

export function weekCount(range: WeekRange): number {
  return differenceInCalendarISOWeeks(parseISO(range.to), parseISO(range.from)) + 1
}

export function withFrom(range: WeekRange, from: string): WeekRange {
  const start = startOfISOWeek(parseISO(from))
  const end = max([parseISO(range.to), start])
  const latestEnd = endOfISOWeek(addWeeks(start, MAX_WEEKS - 1))
  return toRange(start, min([end, latestEnd]))
}

export function withTo(range: WeekRange, to: string): WeekRange {
  const end = endOfISOWeek(parseISO(to))
  const start = min([parseISO(range.from), end])
  const earliestStart = startOfISOWeek(addWeeks(end, -(MAX_WEEKS - 1)))
  return toRange(max([start, earliestStart]), end)
}

export function parseWeekRange(from: string | null, to: string | null): WeekRange | null {
  if (!from || !to || !isSupportedDate(from) || !isSupportedDate(to) || from > to) return null
  const range = toRange(parseISO(from), parseISO(to))
  return weekCount(range) <= MAX_WEEKS ? range : null
}

// Date inputs emit values like 0002-01-05 while a year is still being typed.
export function isSupportedDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parseISO(value)) && value >= EARLIEST_DATE && value <= LATEST_DATE
  )
}

function toRange(from: Date, to: Date): WeekRange {
  return { from: formatDate(startOfISOWeek(from)), to: formatDate(endOfISOWeek(to)) }
}

function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}
