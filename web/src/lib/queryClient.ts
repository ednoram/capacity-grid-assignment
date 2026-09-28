import { QueryClient, type MutationKey } from '@tanstack/react-query';
import { ApiError } from './apiClient';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => isRetryable(error) && failureCount < 2,
      },
    },
  });
}

function isRetryable(error: Error): boolean {
  return !(error instanceof ApiError) || error.status === 0 || error.status >= 500;
}

export function removeSettledMutations(queryClient: QueryClient, mutationKey: MutationKey) {
  const mutationCache = queryClient.getMutationCache();
  mutationCache
    .findAll({ mutationKey, predicate: (mutation) => mutation.state.status !== 'pending' })
    .forEach((mutation) => mutationCache.remove(mutation));
}
