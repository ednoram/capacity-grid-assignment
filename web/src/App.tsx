import { CapacityGrid } from './features/capacity/CapacityGrid'
import { RangeControls } from './features/capacity/RangeControls'
import { useWeekRangeParams } from './features/capacity/useWeekRangeParams'
import { weeksStarting } from './features/capacity/weekRange'

const DEFAULT_WEEKS = 8

export function App() {
  const [range, setRange] = useWeekRangeParams(() => weeksStarting(new Date(), DEFAULT_WEEKS))

  return (
    <main className="p-8">
      <h1 className="mb-4 text-2xl font-semibold">Team capacity</h1>
      <RangeControls range={range} onChange={setRange} />
      <CapacityGrid range={range} />
    </main>
  )
}
