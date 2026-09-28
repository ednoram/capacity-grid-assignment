import { memo, type ReactNode } from 'react'
import { format, parseISO } from 'date-fns'
import type { PersonCapacity } from './api'
import { allocationStatus, type AllocationStatus } from './allocation'
import { formatHours } from './format'
import { useCapacity, useUpdateWeeklyHours } from './queries'
import { WeeklyHoursEditor } from './WeeklyHoursEditor'
import type { WeekRange } from './weekRange'

type Props = {
  range: WeekRange
}

const cell = 'border-b border-gray-200 px-3 py-2 dark:border-gray-800'
const stickyCell = 'sticky bg-white dark:bg-gray-950'
const button = 'rounded-md px-3 py-1.5 text-sm font-medium'

const statusStyles: Record<AllocationStatus, string> = {
  free: 'text-gray-400 dark:text-gray-600',
  under: '',
  full: 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  over: 'bg-red-50 font-semibold text-red-800 dark:bg-red-950 dark:text-red-200',
}

export function CapacityGrid({ range }: Props) {
  const { data, error, refetch, isPlaceholderData } = useCapacity(range)

  if (!data) {
    if (!error) return <p role="status">Loading capacity…</p>
    return (
      <ErrorNotice message={`Couldn't load capacity: ${error.message}`}>
        <button type="button" onClick={() => refetch()} className={`${button} mt-2 bg-red-700 text-white hover:bg-red-800`}>
          Try again
        </button>
      </ErrorNotice>
    )
  }

  return (
    <>
      {error && <ErrorNotice message={`Couldn't refresh capacity, showing the last loaded numbers: ${error.message}`} />}
      <p role="status" className="mb-2 h-5 text-sm text-gray-500 dark:text-gray-400">
        {isPlaceholderData && 'Updating…'}
      </p>
      <div
        aria-busy={isPlaceholderData}
        className={`max-h-[calc(100vh-12rem)] overflow-auto transition-opacity ${isPlaceholderData ? 'opacity-50' : ''}`}
      >
        <table className="border-separate border-spacing-0 tabular-nums">
          <thead>
            <tr>
              <th scope="col" className={`${cell} ${stickyCell} top-0 left-0 z-20 text-left font-medium`}>
                Person
              </th>
              <th scope="col" className={`${cell} ${stickyCell} top-0 z-10 text-right font-medium`}>
                Weekly hours
                <span className="block text-xs font-normal text-gray-500 dark:text-gray-400">click to edit</span>
              </th>
              {data.weeks.map((week) => (
                <th scope="col" key={week} className={`${cell} ${stickyCell} top-0 z-10 text-right font-medium`}>
                  <time dateTime={week}>{format(parseISO(week), 'd MMM')}</time>
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

// Memoised so a save, which replaces only the edited person, re-renders one row.
const PersonRow = memo(function PersonRow({ person, weeks }: { person: PersonCapacity; weeks: string[] }) {
  const save = useUpdateWeeklyHours(person.id)
  const capacity = save.isPending ? save.variables : person.weeklyHours

  return (
    <>
      <tr aria-busy={save.isPending} className={save.isPending ? 'opacity-60' : ''}>
        <th scope="row" dir="auto" className={`${cell} ${stickyCell} left-0 text-left font-normal whitespace-nowrap`}>
          {person.name}
          {save.isPending && <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">Saving…</span>}
        </th>
        <td className={`${cell} text-right`}>
          <WeeklyHoursEditor
            name={person.name}
            hours={capacity}
            disabled={save.isPending}
            onSave={(hours) => save.mutate(hours)}
          />
        </td>
        {weeks.map((week, i) => (
          <AllocationCell key={week} allocated={person.allocated[i]} capacity={capacity} />
        ))}
      </tr>
      {save.isError && (
        <tr>
          <td colSpan={weeks.length + 2} className={cell}>
            <ErrorNotice message={`Couldn't save ${formatHours(save.variables)}h for ${person.name}: ${save.error.message}`}>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => save.mutate(save.variables)}
                  className={`${button} bg-red-700 text-white hover:bg-red-800`}
                >
                  Retry
                </button>
                <button type="button" onClick={() => save.reset()} className={`${button} hover:bg-red-100 dark:hover:bg-red-900`}>
                  Dismiss
                </button>
              </div>
            </ErrorNotice>
          </td>
        </tr>
      )}
    </>
  )
})

function AllocationCell({ allocated, capacity }: { allocated: number; capacity: number }) {
  const status = allocationStatus(allocated, capacity)
  return (
    <td
      className={`${cell} text-right ${statusStyles[status]}`}
      title={`${formatHours(allocated)} of ${formatHours(capacity)} hours`}
    >
      {formatHours(allocated)}
      {status === 'over' && <span className="ml-1.5 text-xs">+{formatHours(allocated - capacity)}</span>}
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
