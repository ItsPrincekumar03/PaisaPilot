import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../features/auth/useAuth.js';
import { getCurrentMonthKey } from '../utils/dates.js';
import { fetchDashboardData } from '../services/dashboardService.js';
import { onTransactionsChanged } from '../services/transactionService.js';

export function useDashboardData() {
  const { user } = useAuth();
  const ownerId = user?.uid ?? null;
  const [selectedMonthKey, setSelectedMonthKey] = useState(getCurrentMonthKey);
  const [viewMode, setViewMode] = useState('active');
  const [status, setStatus] = useState('loading');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [reloadIndex, setReloadIndex] = useState(0);

  const refetch = useCallback(() => {
    setReloadIndex((previous) => previous + 1);
  }, []);

  useEffect(() => {
    return onTransactionsChanged(() => {
      setReloadIndex((previous) => previous + 1);
    });
  }, []);

  useEffect(() => {
    let isCancelled = false;
    setStatus('loading');
    setError(null);

    fetchDashboardData({ monthKey: selectedMonthKey, mode: viewMode, ownerId })
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
  }, [selectedMonthKey, viewMode, ownerId, reloadIndex]);

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