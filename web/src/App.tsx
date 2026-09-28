import { CapacityGrid } from './features/capacity/CapacityGrid'

// The range the grid loads. Widen it if you want to see more.
const FROM = '2025-12-29'
const TO = '2026-01-16'

export function App() {
  return (
    <main className="p-8">
      <h1 className="mb-1 text-2xl font-semibold">Team capacity</h1>
      <p className="mb-6 text-gray-500 tabular-nums dark:text-gray-400">
        {FROM} to {TO}
      </p>
      <CapacityGrid from={FROM} to={TO} />
    </main>
  )
}
