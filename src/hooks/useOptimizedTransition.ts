import { useState, useTransition, useCallback } from 'react';

/**
 * Custom hook to execute search, filter, and heavy tab calculations
 * in a non-blocking React transition (maintains 60 FPS on input).
 */
export function useOptimizedSearch<T>(
  items: T[],
  filterFn: (item: T, query: string) => boolean,
  initialQuery = ''
) {
  const [query, setQuery] = useState(initialQuery);
  const [deferredQuery, setDeferredQuery] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();

  const handleQueryChange = useCallback((newQuery: string) => {
    // Urgent update: immediate input display
    setQuery(newQuery);

    // Non-urgent update: deferred background filtering
    startTransition(() => {
      setDeferredQuery(newQuery);
    });
  }, []);

  const filteredItems = items.filter((item) => filterFn(item, deferredQuery));

  return {
    query,
    setQuery: handleQueryChange,
    filteredItems,
    isPending,
  };
}
