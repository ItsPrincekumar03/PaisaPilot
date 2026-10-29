import { useCallback, useEffect, useState } from 'react';
import { DEMO_MONTH_KEY } from '../data/demoData.js';
import { fetchDashboardData } from '../services/dashboardService.js';

/**
 * Custom hook to fetch and manage financial dashboard state.
 * Handles loading, error, empty, and success states as well as period selection.
 */
export function useDashboardData() {
  const [selectedMonthKey, setSelectedMonthKey] = useState(DEMO_MONTH_KEY);
  const [viewMode, setViewMode] = useState('demo'); // 'demo' | 'empty' | 'error'
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [reloadIndex, setReloadIndex] = useState(0);

  const refetch = useCallback(() => {
    setReloadIndex((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let isCancelled = false;
    setStatus('loading');
    setError(null);

    fetchDashboardData({ monthKey: selectedMonthKey, mode: viewMode })
      .then((result) => {
        if (!isCancelled) {
          setData(result);
          setStatus('success');
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setError(err);
          setStatus('error');
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedMonthKey, viewMode, reloadIndex]);

  return {
    status,
    isLoading: status === 'loading',
    isError: status === 'error',
    isSuccess: status === 'success',
    data,
    error,
    selectedMonthKey,
    setSelectedMonthKey,
    viewMode,
    setViewMode,
    refetch,
  };
}
