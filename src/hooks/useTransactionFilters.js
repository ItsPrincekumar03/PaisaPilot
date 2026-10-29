import { useCallback, useMemo, useState } from 'react';
import { EMPTY_FILTERS, validateFilters } from '../utils/transactionFilters.js';

export default function useTransactionFilters() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const errors = useMemo(() => validateFilters(filters), [filters]);
  const hasErrors = Object.keys(errors).length > 0;

  const hasActiveFilters = useMemo(
    () =>
      Object.keys(EMPTY_FILTERS).some(
        (key) => String(filters[key]).trim() !== String(EMPTY_FILTERS[key])
      ),
    [filters]
  );

  const updateFilter = useCallback((key, value) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
  }, []);

  return { filters, errors, hasErrors, hasActiveFilters, updateFilter, clearFilters };
}
