import { useCallback, useEffect, useState } from 'react';
import { getPresetRange, validateDateRange } from '../utils/reportFilters.js';
import { loadReportData } from '../services/reportService.js';

export default function useReports() {
  const [preset, setPreset] = useState('this-month');
  const initialRange = getPresetRange('this-month');
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);
  const [rangeErrors, setRangeErrors] = useState({});

  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const handleSelectPreset = useCallback((nextPreset) => {
    setPreset(nextPreset);
    if (nextPreset !== 'custom') {
      const range = getPresetRange(nextPreset);
      if (range) {
        setStartDate(range.startDate);
        setEndDate(range.endDate);
        setRangeErrors({});
      }
    }
  }, []);

  const handleChangeStartDate = useCallback(
    (newStart) => {
      setStartDate(newStart);
      const errors = validateDateRange({ startDate: newStart, endDate });
      setRangeErrors(errors);
    },
    [endDate]
  );

  const handleChangeEndDate = useCallback(
    (newEnd) => {
      setEndDate(newEnd);
      const errors = validateDateRange({ startDate, endDate: newEnd });
      setRangeErrors(errors);
    },
    [startDate]
  );

  const refetch = useCallback(() => {
    setReloadKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const errors = validateDateRange({ startDate, endDate });
    if (Object.keys(errors).length > 0) {
      setRangeErrors(errors);
      return;
    }
    setRangeErrors({});

    let isActive = true;
    setStatus('loading');
    setError(null);

    loadReportData({ startDate, endDate })
      .then((data) => {
        if (isActive) {
          setReportData(data);
          setStatus('ready');
        }
      })
      .catch((err) => {
        if (isActive) {
          setError(err.message || 'Failed to load report data.');
          setStatus('error');
        }
      });

    return () => {
      isActive = false;
    };
  }, [startDate, endDate, reloadKey]);

  return {
    preset,
    startDate,
    endDate,
    rangeErrors,
    hasRangeErrors: Object.keys(rangeErrors).length > 0,
    status,
    isLoading: status === 'loading',
    isReady: status === 'ready',
    isError: status === 'error',
    reportData,
    error,
    selectPreset: handleSelectPreset,
    changeStartDate: handleChangeStartDate,
    changeEndDate: handleChangeEndDate,
    refetch,
  };
}
