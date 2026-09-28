import {
  keepPreviousData,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
  type MutationState,
} from '@tanstack/react-query';
import { removeSettledMutations } from '../../lib/queryClient';
import { fetchCapacity, updateWeeklyHours, type CapacityResponse, type Person } from './api';
import type { WeekRange } from './weekRange';

const capacityKeys = {
  all: ['capacity'] as const,
  range: (range: WeekRange) => [...capacityKeys.all, range.from, range.to] as const,
};

const saveKeys = {
  person: (personId: number) => ['updateWeeklyHours', personId] as const,
};

export type SaveState =
  { status: 'idle' } | { status: 'pending'; hours: number } | { status: 'error'; hours: number; error: Error };

type WeeklyHoursSave = MutationState<Person, Error, number>;

export function useCapacity(range: WeekRange) {
  return useQuery({
    queryKey: capacityKeys.range(range),
    queryFn: ({ signal }) => fetchCapacity(range, signal),
    placeholderData: keepPreviousData,
  });
}

export function useWeeklyHoursSave(personId: number) {
  const queryClient = useQueryClient();
  const mutationKey = saveKeys.person(personId);

  const { mutate } = useMutation({
    mutationKey,
    mutationFn: (weeklyHours: number) => updateWeeklyHours(personId, weeklyHours),
    gcTime: Infinity,
    onMutate: () => removeSettledMutations(queryClient, mutationKey),
    onSuccess: (person) => {
      queryClient.setQueriesData<CapacityResponse>(
        { queryKey: capacityKeys.all },
        (data) => data && withPerson(data, person),
      );
      // A range fetch that started before the save may still return the old value.
      void queryClient.invalidateQueries({
        queryKey: capacityKeys.all,
        predicate: (query) => query.state.fetchStatus === 'fetching',
      });
    },
  });

  const latest = useMutationState({
    filters: { mutationKey },
    select: (mutation) => mutation.state as WeeklyHoursSave,
  }).at(-1);

  return {
    state: toSaveState(latest),
    save: mutate,
    dismiss: () => removeSettledMutations(queryClient, mutationKey),
  };
}

function toSaveState(save: WeeklyHoursSave | undefined): SaveState {
  if (save?.variables === undefined) return { status: 'idle' };
  if (save.status === 'pending') return { status: 'pending', hours: save.variables };
  if (save.status === 'error' && save.error) return { status: 'error', hours: save.variables, error: save.error };
  return { status: 'idle' };
}

function withPerson(data: CapacityResponse, person: Person): CapacityResponse {
  return {
    ...data,
    people: data.people.map((p) => (p.id === person.id ? { ...p, ...person } : p)),
  };
}
