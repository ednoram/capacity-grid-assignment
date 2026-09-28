import { Button } from '../../components/Button';
import {
  EARLIEST_DATE,
  isSupportedDate,
  LATEST_DATE,
  shiftWeeks,
  weekCount,
  weeksStarting,
  withFrom,
  withTo,
  type WeekRange,
} from './weekRange';

type Props = {
  range: WeekRange;
  onChange: (range: WeekRange) => void;
};

const dateInput = 'rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700';

export function RangeControls({ range, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <div className="flex gap-2">
        <Button onClick={() => onChange(shiftWeeks(range, -1))}>← Previous week</Button>
        <Button onClick={() => onChange(weeksStarting(new Date(), weekCount(range)))}>This week</Button>
        <Button onClick={() => onChange(shiftWeeks(range, 1))}>Next week →</Button>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          From
          <input
            type="date"
            className={dateInput}
            value={range.from}
            min={EARLIEST_DATE}
            max={LATEST_DATE}
            onChange={(e) => isSupportedDate(e.target.value) && onChange(withFrom(range, e.target.value))}
          />
        </label>
        <label className="flex items-center gap-2">
          To
          <input
            type="date"
            className={dateInput}
            value={range.to}
            min={EARLIEST_DATE}
            max={LATEST_DATE}
            onChange={(e) => isSupportedDate(e.target.value) && onChange(withTo(range, e.target.value))}
          />
        </label>
        <span className="text-gray-500 dark:text-gray-400">
          {weekCount(range)} {weekCount(range) === 1 ? 'week' : 'weeks'}
        </span>
      </div>
    </div>
  );
}
