export type AllocationStatus = 'free' | 'under' | 'full' | 'over'

export function allocationStatus(allocated: number, capacity: number): AllocationStatus {
  if (allocated > capacity) return 'over'
  if (allocated === 0) return 'free'
  if (allocated === capacity) return 'full'
  return 'under'
}
