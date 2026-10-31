import { useCallback, useEffect, useState } from 'react';
import { DEMO_CATEGORIES } from '../data/demoData.js';
import { todayIsoDate } from '../features/transactions/transactionValidation.js';
import {
  createRecurringSchedule,
  deleteRecurringSchedule,
  listRecurringSchedules,
  processDueRecurringSchedules,
  setScheduleStatus,
  updateRecurringSchedule,
} from '../services/recurringService.js';

export default function useRecurringManager({ ownerId } = {}) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [error, setError] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [categories] = useState(DEMO_CATEGORIES);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastProcessedCount, setLastProcessedCount] = useState(0);

  const loadData = useCallback(async () => {
    if (!ownerId) {
      setStatus('ready');
      setSchedules([]);
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      // 1. Process any due occurrences automatically on page open
      const processed = await processDueRecurringSchedules(ownerId, todayIsoDate());
      setLastProcessedCount(processed.length);

      // 2. Fetch updated schedules list
      const items = await listRecurringSchedules(ownerId);
      setSchedules(items);
      setStatus('ready');
    } catch (err) {
      setError(err.message || 'Could not load recurring schedules.');
      setStatus('error');
    }
  }, [ownerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addSchedule = async (formData) => {
    const created = await createRecurringSchedule(ownerId, formData, categories);
    // Re-process immediately if start date is today or earlier
    if (created.startDate <= todayIsoDate()) {
      await processDueRecurringSchedules(ownerId, todayIsoDate());
    }
    await loadData();
    return created;
  };

  const editSchedule = async (scheduleId, formData) => {
    const updated = await updateRecurringSchedule(ownerId, scheduleId, formData, categories);
    await loadData();
    return updated;
  };

  const changeStatus = async (scheduleId, nextStatus) => {
    await setScheduleStatus(ownerId, scheduleId, nextStatus);
    if (nextStatus === 'active') {
      await processDueRecurringSchedules(ownerId, todayIsoDate());
    }
    await loadData();
  };

  const removeSchedule = async (scheduleId) => {
    await deleteRecurringSchedule(ownerId, scheduleId);
    await loadData();
  };

  const triggerManualProcess = async () => {
    setIsProcessing(true);
    try {
      const processed = await processDueRecurringSchedules(ownerId, todayIsoDate());
      setLastProcessedCount(processed.length);
      await loadData();
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    status,
    error,
    schedules,
    categories,
    isProcessing,
    lastProcessedCount,
    retry: loadData,
    addSchedule,
    editSchedule,
    changeStatus,
    removeSchedule,
    triggerManualProcess,
  };
}
