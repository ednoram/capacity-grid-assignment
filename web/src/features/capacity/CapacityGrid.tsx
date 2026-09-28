import { format, parseISO } from 'date-fns'
import { Button } from '../../components/Button'
import { ErrorNotice } from '../../components/ErrorNotice'
import { PersonRow } from './PersonRow'
import { useCapacity } from './queries'
import { cell, stickyCell } from './tableStyles'
import type { WeekRange } from './weekRange'

type Props = {
  range: WeekRange
}

export function CapacityGrid({ range }: Props) {
  const { data, error, refetch, isPlaceholderData } = useCapacity(range)

  if (!data) {
    if (!error) return <p role="status">Loading capacity…</p>
    return (
      <ErrorNotice message={`Couldn't load capacity: ${error.message}`}>
        <Button variant="danger" className="mt-2" onClick={() => refetch()}>
          Try again
        </Button>
      </ErrorNotice>
    )
  }

  return (
    <>
      {error && (
        <ErrorNotice
          className="mb-4"
          message={`Couldn't refresh capacity, showing the last loaded numbers: ${error.message}`}
        />
      )}
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
