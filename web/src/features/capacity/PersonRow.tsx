import { memo } from 'react'
import { Button } from '../../components/Button'
import { ErrorNotice } from '../../components/ErrorNotice'
import type { PersonCapacity } from './api'
import { allocationStatus, type AllocationStatus } from './allocation'
import { formatHours } from './format'
import { useUpdateWeeklyHours } from './queries'
import { cell, stickyCell } from './tableStyles'
import { WeeklyHoursEditor } from './WeeklyHoursEditor'

type Props = {
  person: PersonCapacity
  weeks: string[]
}

const statusStyles: Record<AllocationStatus, string> = {
  free: 'text-gray-400 dark:text-gray-600',
  under: '',
  full: 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  over: 'bg-red-50 font-semibold text-red-800 dark:bg-red-950 dark:text-red-200',
}

// Memoised so a save, which replaces only the edited person, re-renders one row.
export const PersonRow = memo(function PersonRow({ person, weeks }: Props) {
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
                <Button variant="danger" onClick={() => save.mutate(save.variables)}>
                  Retry
                </Button>
                <Button variant="dangerGhost" onClick={() => save.reset()}>
                  Dismiss
                </Button>
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
