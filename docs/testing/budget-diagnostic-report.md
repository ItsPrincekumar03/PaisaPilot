# PaisaPilot — Budget Module Complete Error Diagnostic Report

**Project:** PaisaPilot  
**Repository:** `https://github.com/ItsPrincekumar03/PaisaPilot`  
**Working Directory:** `D:\Projects\other project\PaisaPilot`  
**Branch:** `feature/module-12`  
**Date:** November 2026  
**Status:** **BUDGET DEFECTS IDENTIFIED — FIX REQUIRED**

---

## 1. Executive Summary

A comprehensive, end-to-end investigation of the Budget Module (Module 8) and its integration with Transactions (Module 5), Dashboard (Module 6), Reports (Module 9), Recurring Transactions (Module 11), and Firestore Security Rules was conducted.

While individual unit tests for calculation helpers (`budget.test.js`) pass in isolation, the real-world application runtime suffers from **critical architectural disconnections and hardcoded demo values** that prevent live authenticated users from effectively utilizing budgets in production.

### Key Metrics
- **Overall Health:** Degraded / Dysfunctional in Production
- **Confirmed High/Critical Bugs:** 4
- **Confirmed Medium/Edge Issues:** 3
- **Primary Root Cause:** Hardcoded static month anchors (`DEMO_MONTH_KEY = '2026-10'`) and hardcoded zero budget limits (`budgetLimitPaise = 0`) in live dashboard aggregation, severing live budget tracking.

---

## 2. End-to-End Data Flow Analysis

The intended budget architecture operates across seven tiers:
```
[User Interface]
       │
       ▼
[useBudgetManager & useDashboardData Hooks]
       │
       ▼
[budgetService & dashboardService]
       │
       ▼
[budgetTransactionAdapter & transactionRepository]
       │
       ▼
[Cloud Firestore (users/{uid}/budgets)]
       │
       ▼
[firestore.rules Security Verification]
```

### Trace Findings Across Tiers:
1. **Frontend UI (`BudgetPage.jsx`):** 
   - Period selector is anchored strictly to `DEMO_MONTH_KEY` (`'2026-10'`). When the real calendar advances past October 2026 (such as current date November 2026 or later), the user has no UI mechanism to navigate to the current or future months.
2. **Dashboard UI (`BudgetProgress.jsx`):**
   - The dashboard card relies on `limitPaise` and `spentPaise` from `fetchDashboardData`.
3. **Dashboard Service (`dashboardService.js`):**
   - In active mode (`mode === 'active'`), `fetchDashboardData` completely bypasses Firestore's `budgets` collection, hardcoding `budgetLimitPaise: 0`. This causes `getBudgetStatus()` to return `{ status: 'none' }`, leaving the dashboard permanently in an empty state.
4. **Data Model Divergence:**
   - `budgetService.js` manages per-category budgets with composite IDs `${monthKey}_${categoryId}`.
   - `dashboardService.js` expects a single scalar `budgetLimitPaise` for the entire month and has no aggregation logic to sum up category budgets.
5. **Security Rules (`firestore.rules`):**
   - Rules support both legacy overall monthly budgets (`users/{uid}/budgets/{YYYY-MM}`) and category budgets (`users/{uid}/budgets/{YYYY-MM}_{categoryId}`). However, `budgetService.js` strictly discards documents missing `categoryId`, leading to a subtle discrepancy if any overall budget is stored.

---

## 3. Detailed Defect Registry

| Defect ID | Severity | Affected File | Line(s) | Description | Impact |
|---|---|---|---|---|---|
| **BUG-01** | **CRITICAL** | `src/pages/budgets/BudgetPage.jsx`, `src/hooks/useDashboardData.js` | `BudgetPage.jsx:19-25`, `useDashboardData.js:14` | Hardcoded `DEMO_MONTH_KEY` (`'2026-10'`) used as the active and selector anchor instead of dynamic current month. | Active users in November 2026+ cannot manage or track budgets for the current real-world month. |
| **BUG-02** | **CRITICAL** | `src/services/dashboardService.js` | Lines 94–105 | Active live mode sets `budgetLimitPaise: 0` without fetching or aggregating Firestore budget documents. | Dashboard Budget Progress Widget is permanently blank ("No monthly budget set") for all live authenticated users. |
| **BUG-03** | **HIGH** | `src/services/dashboardService.js`, `src/services/budgetService.js` | `dashboardService.js:33-43` | Schema mismatch: Dashboard expects scalar monthly limit; Budget service stores per-category budgets. | Even if fetched, category budgets are not summed to provide total monthly budget limit on Dashboard. |
| **BUG-04** | **MEDIUM** | `src/services/budgetTransactionAdapter.js`, `src/hooks/useBudgetManager.js` | `budgetTransactionAdapter.js:11-20`, `useBudgetManager.js:28-36` | Missing reactive cross-module synchronization between transactions and budgets. | When a user creates, edits, or deletes a transaction in Module 5, budget spent progress does not update until manual refresh. |
| **BUG-05** | **MEDIUM** | `src/utils/dates.js`, `src/pages/budgets/BudgetPage.jsx` | `dates.js:26-34`, `BudgetPage.jsx:19-20` | Month selector only renders backwards from the anchor (`getRecentMonthKeys`), preventing budget planning for upcoming months. | Users cannot plan budgets for next month (e.g. Setting December budget in November). |
| **BUG-06** | **LOW** | `firestore.rules`, `src/services/budgetService.js` | `firestore.rules:112-129`, `budgetService.js:46-52` | Legacy budget document schema allowance in rules vs silent drop in service. | If legacy document exists in user subcollection, `listBudgets` silently filters it out, causing orphaned documents. |
| **BUG-07** | **LOW** | `src/components/budgets/BudgetForm.jsx` | Lines 17–23 | Category options dropdown displays only unbudgeted categories without explicit empty helper notice if all categories are budgeted. | Minor UX confusion when a user has budgeted all expense categories. |

---

## 4. Root Cause Evidence & Analysis

### 4.1. Root Cause 1: Static Anchor `DEMO_MONTH_KEY`
In `src/pages/budgets/BudgetPage.jsx`:
```javascript
const MONTH_KEYS_NEWEST_FIRST = getRecentMonthKeys(DEMO_MONTH_KEY, BUDGET_HISTORY_MONTH_COUNT).reverse();
// DEMO_MONTH_KEY is imported from src/data/demoData.js as '2026-10'
const [selectedMonthKey, setSelectedMonthKey] = useState(DEMO_MONTH_KEY);
```
`getRecentMonthKeys('2026-10', 6)` produces `['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']`.
As of November 2026 (`2026-11`), `2026-11` is impossible to select in the UI.

### 4.2. Root Cause 2: Hardcoded 0 Budget in Dashboard Service
In `src/services/dashboardService.js`:
```javascript
if (mode === 'active') {
  const transactions = await listTransactions();
  return buildPayload({
    monthKey,
    transactions,
    isDemo: false,
    isEmpty: transactions.length === 0,
    budgetLimitPaise: 0, // <--- DIRECT CAUSE OF DASHBOARD DISCONNECT
  });
}
```
`listBudgets(uid)` is never invoked. The total monthly budget limit is passed as `0`, triggering:
```javascript
export function getBudgetStatus(limitPaise, spentPaise) {
  if (!Number.isSafeInteger(limitPaise) || limitPaise <= 0) {
    return { limitPaise: 0, spentPaise: 0, status: 'none', usagePercent: 0, remainingPaise: 0 };
  }
  ...
}
```
The Dashboard Progress widget displays `EmptyState` ("No monthly budget set") 100% of the time in production.

---

## 5. Firestore Schema & Security Rules Verification

### Rules Inspection (`firestore.rules`):
```
match /users/{userId}/budgets/{budgetId} {
  allow read: if isOwner(userId);
  allow create: if isOwner(userId) && isValidBudget(request.resource.data, budgetId);
  allow update: if isOwner(userId) && isValidBudget(request.resource.data, budgetId);
  allow delete: if isOwner(userId);
}
```
Validation logic:
```javascript
function isValidCategoryBudget(data, budgetId) {
  return data.keys().hasOnly(['categoryId', 'monthKey', 'limitPaise', 'updatedAt'])
    && budgetId == data.monthKey + '_' + data.categoryId
    && isMonthKey(data.monthKey)
    && isNonEmptyString(data.categoryId)
    && isValidAmount(data.limitPaise);
}
```
- **Rule Verdict:** PASS. Security rules correctly enforce owner-only access and validate category budget documents matching `${monthKey}_${categoryId}` with safe integer limits.
- **Service Alignment:** `budgetService.js` writes exactly `{ categoryId, monthKey, limitPaise, updatedAt: serverTimestamp() }` to doc `${monthKey}_${categoryId}`. Write operations satisfy all security constraints.

---

## 6. Cross-Module Impact Assessment

1. **Module 5 (Transactions):**
   - Transactions are queried by `budgetTransactionAdapter.js`.
   - Category IDs must match standard predefined categories (`food`, `transport`, `housing`, `utilities`, `entertainment`, `healthcare`, `shopping`, `other`). Any mismatched category ID in transactions results in expenses being counted under uncategorized rather than the budgeted category row.
2. **Module 6 (Dashboard):**
   - Severely impacted by BUG-02. Fix requires fetching user's category budgets for `selectedMonthKey`, summing `limitPaise`, and supplying the sum to `buildPayload`.
3. **Module 9 (Reports & Analytics):**
   - Reports use transactions independently. Reports are unaffected by budget defects, but aligning date utility functions is crucial so reports and budgets use consistent month definitions.
4. **Module 11 (Recurring Transactions):**
   - When recurring transactions generate new expense transactions, budget spent amounts will only update once reactive cache invalidation or refresh is wired up.

---

## 7. Recommended Implementation Order for Fixes

1. **Step 1: Date & Month Key Modernization**
   - Introduce `getCurrentMonthKey()` in `src/utils/dates.js`.
   - Update `BudgetPage.jsx` and `useDashboardData.js` to default to current month key instead of `DEMO_MONTH_KEY`.
   - Allow month selector to display 6 recent months plus upcoming month for forward planning.
2. **Step 2: Dashboard Service Integration**
   - In `src/services/dashboardService.js`, import `listBudgets` from `budgetService.js`.
   - In active mode, retrieve category budgets for `ownerId`, filter for `monthKey`, and calculate `budgetLimitPaise = sum(limitPaise)`.
   - Pass computed `budgetLimitPaise` to `buildPayload`.
3. **Step 3: Cross-Module Cache Invalidation**
   - Ensure transaction modifications (create/edit/delete) trigger refresh in `useBudgetManager` or provide a shared refresh signal.
4. **Step 4: Regression Testing**
   - Execute test cases detailed in `docs/testing/budget-test-plan.md`.

---

## 8. Conclusion

The Budget Module core business logic (`budgetCalculations.js`) is mathematically sound. However, the system cannot function properly in production due to static demo-month tethering and hardcoded zero budget aggregation in the dashboard service. Implementing the 4-step remediation plan will fully restore production readiness.
