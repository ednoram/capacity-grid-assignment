import { CapacityGrid, RangeControls, useWeekRangeParams, weeksStarting } from './features/capacity'

const DEFAULT_WEEKS = 8

export function App() {
  const [range, setRange] = useWeekRangeParams(() => weeksStarting(new Date(), DEFAULT_WEEKS))

  return (
    <main className="p-8">
      <header className="mb-4 space-y-4">
        <h1 className="text-2xl font-semibold">Team capacity</h1>
        <RangeControls range={range} onChange={setRange} />
      </header>
      <CapacityGrid range={range} />
    </main>
  )
}
