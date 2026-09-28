import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { format, parseISO } from 'date-fns';
import { Button } from '../../components/Button';
import { ErrorNotice } from '../../components/ErrorNotice';
import { TableSpacer } from '../../components/TableSpacer';
import { PersonRow } from './PersonRow';
import { useCapacity } from './queries';
import { cell, stickyCell } from './tableStyles';
import type { WeekRange } from './weekRange';

type Props = {
  range: WeekRange;
};

const ESTIMATED_ROW_HEIGHT = 45;
const COLUMN_WIDTHS_REM = { name: 16, hours: 9, week: 6 };

export function CapacityGrid({ range }: Props) {
  const { data, error, refetch, isPlaceholderData } = useCapacity(range);
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: data?.people.length ?? 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 10,
  });

  if (!data) {
    if (!error) return <p role="status">Loading capacity…</p>;
    return (
      <ErrorNotice message={`Couldn't load capacity: ${error.message}`}>
        <Button variant="danger" className="mt-2" onClick={() => refetch()}>
          Try again
        </Button>
      </ErrorNotice>
    );
  }

  const rows = virtualizer.getVirtualItems();
  const paddingTop = rows[0]?.start ?? 0;
  const paddingBottom = virtualizer.getTotalSize() - (rows.at(-1)?.end ?? 0);
  const columnCount = data.weeks.length + 2;
  const tableWidth = COLUMN_WIDTHS_REM.name + COLUMN_WIDTHS_REM.hours + COLUMN_WIDTHS_REM.week * data.weeks.length;

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
        ref={scrollRef}
        aria-busy={isPlaceholderData}
        className={`max-h-[calc(100vh-12rem)] overflow-auto transition-opacity ${isPlaceholderData ? 'opacity-50' : ''}`}
      >
        <table
          aria-rowcount={data.people.length + 1}
          style={{ width: `${tableWidth}rem` }}
          className="table-fixed border-separate border-spacing-0 tabular-nums"
        >
          <colgroup>
            <col style={{ width: `${COLUMN_WIDTHS_REM.name}rem` }} />
            <col style={{ width: `${COLUMN_WIDTHS_REM.hours}rem` }} />
            {data.weeks.map((week) => (
              <col key={week} style={{ width: `${COLUMN_WIDTHS_REM.week}rem` }} />
            ))}
          </colgroup>
          <thead>
            <tr aria-rowindex={1}>
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
          {paddingTop > 0 && <TableSpacer height={paddingTop} columns={columnCount} />}
          {rows.map((row) => {
            const person = data.people[row.index];
            return (
              <PersonRow
                key={person.id}
                person={person}
                weeks={data.weeks}
                index={row.index}
                measureRef={virtualizer.measureElement}
              />
            );
          })}
          {paddingBottom > 0 && <TableSpacer height={paddingBottom} columns={columnCount} />}
        </table>
      </div>
    </>
  );
}
