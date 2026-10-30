import { useCallback, useEffect, useMemo, useState } from 'react';
import { createBudget, deleteBudget, listBudgets, updateBudget } from '../services/budgetService.js';
import { loadBudgetSourceData } from '../services/budgetTransactionAdapter.js';
import { buildCategoryBudgetRows, buildMonthlyHistory, summarizeBudgetRows } from '../utils/budgetCalculations.js';
import { PREVIEW_OWNER_ID } from '../utils/budgetConstants.js';

export default function useBudgetManager({ monthKey, historyMonthKeys, ownerId = PREVIEW_OWNER_ID }) {
  const [source, setSource] = useState({
    status: 'loading',
    budgets: [],
    transactions: [],
    categories: [],
    isSampleData: true,
    error: null,
  });
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let isActive = true;

    Promise.all([listBudgets(ownerId), loadBudgetSourceData()])
      .then(([budgets, transactionSource]) => {
        if (isActive) {
          setSource({
            status: 'ready',
            budgets,
            transactions: transactionSource.transactions,
            categories: transactionSource.categories,
            isSampleData: transactionSource.isSampleData,
            error: null,
          });
        }
      })
      .catch((err) => {
        if (isActive) {
          setSource((previous) => ({
            ...previous,
            status: 'error',
            error: err.message || 'Could not load budgets.',
          }));
        }
      });

    return () => {
      isActive = false;
    };
  }, [ownerId, reloadKey]);

  const retry = useCallback(() => {
    setSource((previous) => ({ ...previous, status: 'loading', error: null }));
    setReloadKey((key) => key + 1);
  }, []);

  const refreshBudgets = useCallback(async () => {
    const budgets = await listBudgets(ownerId);
    setSource((previous) => ({ ...previous, budgets }));
  }, [ownerId]);

  const saveBudget = useCallback(
    async ({ budgetId, monthKey: targetMonthKey, categoryId, limitPaise }) => {
      try {
        if (budgetId) {
          await updateBudget(ownerId, budgetId, { limitPaise });
        } else {
          await createBudget(ownerId, { monthKey: targetMonthKey, categoryId, limitPaise });
        }
        await refreshBudgets();
        setNotice({ type: 'success', text: budgetId ? 'Budget updated.' : 'Budget created.' });
        return true;
      } catch (err) {
        setNotice({ type: 'error', text: err.message || 'The budget could not be saved.' });
        return false;
      }
    },
    [ownerId, refreshBudgets]
  );

  const removeBudget = useCallback(
    async (budgetId) => {
      try {
        await deleteBudget(ownerId, budgetId);
        await refreshBudgets();
        setNotice({ type: 'success', text: 'Budget deleted.' });
        return true;
      } catch (err) {
        setNotice({ type: 'error', text: err.message || 'The budget could not be deleted.' });
        return false;
      }
    },
    [ownerId, refreshBudgets]
  );

  const { budgets, transactions, categories } = source;

  const rows = useMemo(
    () => buildCategoryBudgetRows({ budgets, transactions, categories, monthKey }),
    [budgets, transactions, categories, monthKey]
  );

  const summary = useMemo(() => summarizeBudgetRows(rows), [rows]);

  const history = useMemo(
    () => buildMonthlyHistory({ budgets, transactions, categories, monthKeys: historyMonthKeys }),
    [budgets, transactions, categories, historyMonthKeys]
  );

  return {
    status: source.status,
    error: source.error,
    isSampleData: source.isSampleData,
    notice,
    budgets,
    categories,
    rows,
    summary,
    history,
    retry,
    saveBudget,
    removeBudget,
  };
}
