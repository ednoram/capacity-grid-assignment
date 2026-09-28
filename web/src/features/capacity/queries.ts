import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchCapacity, updateWeeklyHours, type CapacityResponse, type Person } from './api'
import type { WeekRange } from './weekRange'

const capacityKeys = {
  all: ['capacity'] as const,
  range: (range: WeekRange) => [...capacityKeys.all, range.from, range.to] as const,
}

export function useCapacity(range: WeekRange) {
  return useQuery({
    queryKey: capacityKeys.range(range),
    queryFn: ({ signal }) => fetchCapacity(range, signal),
    placeholderData: keepPreviousData,
  })
}

export function useUpdateWeeklyHours(personId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (weeklyHours: number) => updateWeeklyHours(personId, weeklyHours),
    onSuccess: (person) => {
      queryClient.setQueriesData<CapacityResponse>({ queryKey: capacityKeys.all }, (data) => data && withPerson(data, person))
      // A range fetch that started before the save may still return the old value.
      void queryClient.invalidateQueries({
        queryKey: capacityKeys.all,
        predicate: (query) => query.state.fetchStatus === 'fetching',
      })
    },
  })
}

function withPerson(data: CapacityResponse, person: Person): CapacityResponse {
  return {
    ...data,
    people: data.people.map((p) => (p.id === person.id ? { ...p, ...person } : p)),
  }
}
