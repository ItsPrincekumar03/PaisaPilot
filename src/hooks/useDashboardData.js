import { useCallback, useEffect, useState } from 'react';
import { DEMO_MONTH_KEY } from '../data/demoData.js';
import { fetchDashboardData } from '../services/dashboardService.js';

export function useDashboardData() {
  const [selectedMonthKey, setSelectedMonthKey] = useState(DEMO_MONTH_KEY);
  const [viewMode, setViewMode] = useState('active');
  const [status, setStatus] = useState('loading');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [reloadIndex, setReloadIndex] = useState(0);

  const refetch = useCallback(() => {
    setReloadIndex((previous) => previous + 1);
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