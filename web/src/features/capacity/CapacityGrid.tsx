import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchCapacity, type PersonCapacity } from './api'
import { allocationStatus, type AllocationStatus } from './allocation'

type Props = {
  from: string
  to: string
}

// Week strings parse as UTC midnight, so they must be formatted in UTC too.
const weekLabel = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' })
const hours = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 })

const cell = 'border-b border-gray-200 px-3 py-2 dark:border-gray-800'
const stickyCell = 'sticky bg-white dark:bg-gray-950'

const statusStyles: Record<AllocationStatus, string> = {
  free: 'text-gray-400 dark:text-gray-600',
  under: '',
  full: 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  over: 'bg-red-50 font-semibold text-red-800 dark:bg-red-950 dark:text-red-200',
}

export function CapacityGrid({ from, to }: Props) {
  const { data, error, refetch } = useQuery({
    queryKey: ['capacity', from, to],
    queryFn: ({ signal }) => fetchCapacity(from, to, signal),
  })

  if (!data) {
    if (!error) return <p role="status">Loading capacity…</p>
    return (
      <ErrorNotice message={`Couldn't load capacity: ${error.message}`}>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-2 rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800"
        >
          Try again
        </button>
      </ErrorNotice>
    )
  }

  return (
    <>
      {error && <ErrorNotice message={`Couldn't refresh capacity, showing the last loaded numbers: ${error.message}`} />}
      <div className="max-h-[calc(100vh-9rem)] overflow-auto">
        <table className="border-separate border-spacing-0 tabular-nums">
          <thead>
            <tr>
              <th scope="col" className={`${cell} ${stickyCell} top-0 left-0 z-20 text-left font-medium`}>
                Person
              </th>
              <th scope="col" className={`${cell} ${stickyCell} top-0 z-10 text-right font-medium`}>
                Capacity
              </th>
              {data.weeks.map((week) => (
                <th scope="col" key={week} className={`${cell} ${stickyCell} top-0 z-10 text-right font-medium`}>
                  <time dateTime={week}>{weekLabel.format(new Date(week))}</time>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.people.map((person) => (
              <PersonRow key={person.id} person={person} weeks={data.weeks} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function PersonRow({ person, weeks }: { person: PersonCapacity; weeks: string[] }) {
  return (
    <tr>
      <th scope="row" dir="auto" className={`${cell} ${stickyCell} left-0 text-left font-normal whitespace-nowrap`}>
        {person.name}
      </th>
      <td className={`${cell} text-right`}>{hours.format(person.weeklyHours)}h</td>
      {weeks.map((week, i) => (
        <AllocationCell key={week} allocated={person.allocated[i]} capacity={person.weeklyHours} />
      ))}
    </tr>
  )
}

function AllocationCell({ allocated, capacity }: { allocated: number; capacity: number }) {
  const status = allocationStatus(allocated, capacity)
  return (
    <td
      className={`${cell} text-right ${statusStyles[status]}`}
      title={`${hours.format(allocated)} of ${hours.format(capacity)} hours`}
    >
      {hours.format(allocated)}
      {status === 'over' && <span className="ml-1.5 text-xs">+{hours.format(allocated - capacity)}</span>}
    </td>
  )
}

function ErrorNotice({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <div role="alert" className="mb-4 rounded-md bg-red-50 px-4 py-3 text-red-800 dark:bg-red-950 dark:text-red-200">
      <p>{message}</p>
      {children}
    </div>
  )
}
