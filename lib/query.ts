import { QueryClient } from '@tanstack/react-query';

// One client for the app. Retries are kept low: a booking flow should surface a
// failure fast rather than hammer a free-tier project.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
