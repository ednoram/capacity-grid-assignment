import { memo } from 'react'
import { Button } from '../../components/Button'
import { ErrorNotice } from '../../components/ErrorNotice'
import type { PersonCapacity } from './api'
import { allocationStatus, type AllocationStatus } from './allocation'
import { formatHours } from './format'
import { useWeeklyHoursSave } from './queries'
import { cell, stickyCell } from './tableStyles'
import { WeeklyHoursEditor } from './WeeklyHoursEditor'

type Props = {
  person: PersonCapacity
  weeks: string[]
  index: number
  measureRef: (element: HTMLElement | null) => void
}

const statusStyles: Record<AllocationStatus, string> = {
  free: 'text-gray-400 dark:text-gray-600',
  under: '',
  full: 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  over: 'bg-red-50 font-semibold text-red-800 dark:bg-red-950 dark:text-red-200',
}

// Memoised so a save, which replaces only the edited person, re-renders one row.
export const PersonRow = memo(function PersonRow({ person, weeks, index, measureRef }: Props) {
  const { state, save, dismiss } = useWeeklyHoursSave(person.id)
  const isSaving = state.status === 'pending'
  const capacity = isSaving ? state.hours : person.weeklyHours

  return (
    <tbody ref={measureRef} data-index={index}>
      <tr aria-rowindex={index + 2} aria-busy={isSaving} className={isSaving ? 'opacity-60' : ''}>
        <th scope="row" className={`${cell} ${stickyCell} left-0 text-left font-normal`}>
          <div className="flex items-center gap-2">
            <span dir="auto" title={person.name} className="truncate">
              {person.name}
            </span>
            {isSaving && <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">Saving…</span>}
          </div>
        </th>
        <td className={`${cell} text-right`}>
          <WeeklyHoursEditor
            name={person.name}
            hours={capacity}
            disabled={isSaving}
            onSave={save}
          />
        </td>
        {weeks.map((week, i) => (
          <AllocationCell key={week} allocated={person.allocated[i]} capacity={capacity} />
        ))}
      </tr>
      {state.status === 'error' && (
        <tr>
          <td colSpan={weeks.length + 2} className={cell}>
            <ErrorNotice message={`Couldn't save ${formatHours(state.hours)}h for ${person.name}: ${state.error.message}`}>
              <div className="mt-2 flex gap-2">
                <Button variant="danger" onClick={() => save(state.hours)}>
                  Retry
                </Button>
                <Button variant="dangerGhost" onClick={dismiss}>
                  Dismiss
                </Button>
              </div>
            </ErrorNotice>
          </td>
        </tr>
      )}
    </tbody>
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
