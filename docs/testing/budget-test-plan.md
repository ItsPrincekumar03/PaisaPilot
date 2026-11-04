# PaisaPilot — Budget Module Comprehensive Test Plan

**Project:** PaisaPilot  
**Document:** Budget Module Verification & Regression Test Plan  
**Path:** `docs/testing/budget-test-plan.md`  
**Target Branch:** `feature/module-12`  
**Reference Document:** `docs/testing/budget-diagnostic-report.md`

---

## 1. Overview & Objective

This test plan defines the testing strategy, test cases, automated suites, and manual verification steps required to validate all functionality across the Budget Module (Module 8) and its cross-module integrations (Dashboard, Transactions, Firestore Security Rules).

---

## 2. Test Environment Matrix

| Parameter | Specification |
|---|---|
| **Node.js** | v20+ / v22+ |
| **Vite** | 8.3.5 |
| **Frontend Framework** | React 18 / 19 |
| **Firebase Backend** | Cloud Firestore (`paisapilot-79e63`) / Firebase Local Emulator |
| **Authentication** | Firebase Auth (Email/Password) |
| **Test Runners** | Vitest (`npm test`), Firebase Rules Unit Tests |

---

## 3. Test Suites & Test Cases

### 3.1. Category Budget Creation (TC-BUD-01 to TC-BUD-05)

| Case ID | Objective | Input / Action | Expected Result |
|---|---|---|---|
| **TC-BUD-01** | Create valid category budget | Month: current (`2026-11`), Category: `food`, Limit: `₹8,000` | Document created at `users/{uid}/budgets/2026-11_food`. UI updates row with ₹8,000 limit, 0% usage. |
| **TC-BUD-02** | Prevent duplicate category in same month | Select `food` when `2026-11_food` already exists | Category `food` disabled/hidden in dropdown; validation rejects with error. |
| **TC-BUD-03** | Zero limit validation | Limit: `0` | Form validation error: Limit must be greater than ₹0. Firestore write blocked. |
| **TC-BUD-04** | Negative limit validation | Limit: `-500` | Form validation error: Invalid amount. Form does not submit. |
| **TC-BUD-05** | Exceed max limit (> ₹1 Crore) | Limit: `₹1,00,00,001` | Form validation error: Limit cannot exceed ₹1 Crore (1,000,000,000 paise). |

### 3.2. Budget Reading & Calculation (TC-BUD-06 to TC-BUD-10)

| Case ID | Objective | Input / Action | Expected Result |
|---|---|---|---|
| **TC-BUD-06** | Spending aggregation matching category | Budget: `food` ₹10,000. Transactions: 2 food expenses totaling ₹4,500 in same month | `spentPaise` = 450000 (₹4,500), `remainingPaise` = 550000 (₹5,500), `usagePercent` = 45%, `status` = `normal`. |
| **TC-BUD-07** | Warning threshold detection (>=80%) | Budget: `food` ₹10,000. Transactions: ₹8,200 food expense in month | `usagePercent` = 82%, `status` = `warning`. Warning badge and yellow visual indicator rendered. |
| **TC-BUD-08** | Exceeded budget detection (>=100%) | Budget: `food` ₹10,000. Transactions: ₹11,500 food expense in month | `usagePercent` = 115%, `status` = `exceeded`. Exceeded badge, red visual indicator, over amount calculated. |
| **TC-BUD-09** | Cross-month transaction isolation | Budget: `2026-11`. Transaction dated `2026-10-31` | Transaction is NOT summed into `2026-11` budget row. `spentPaise` remains ₹0. |
| **TC-BUD-10** | Income transaction exclusion | Budget: `food`. Transaction: `income` of ₹50,000 with category `food` | Income transactions are excluded from expense budget calculations. |

### 3.3. Budget Updating & Deletion (TC-BUD-11 to TC-BUD-14)

| Case ID | Objective | Input / Action | Expected Result |
|---|---|---|---|
| **TC-BUD-11** | Update budget limit | Change limit from ₹8,000 to ₹12,000 | Firestore document `limitPaise` updated to `1200000`. Recalculates usage and remaining immediately. |
| **TC-BUD-12** | Immutable category & month key | Open edit modal for existing budget | Category select and month key are read-only / static. |
| **TC-BUD-13** | Delete budget | Click Delete -> Confirm in DeleteBudgetDialog | Firestore document `users/{uid}/budgets/{id}` deleted. Row removed from list; overview metrics update. |
| **TC-BUD-14** | Re-creation after deletion | Delete `food` budget for month, then re-add `food` | Category `food` reappears in dropdown and successfully creates new document. |

### 3.4. Month-Key & Timezone Handling (TC-BUD-15 to TC-BUD-17)

| Case ID | Objective | Input / Action | Expected Result |
|---|---|---|---|
| **TC-BUD-15** | Dynamic current month default | Open `/budgets` on any calendar date | Active month matches the actual calendar month (e.g. `2026-11`), NOT demo `2026-10`. |
| **TC-BUD-16** | End-of-month UTC timestamp safety | Transaction on `2026-11-30T23:59:59` | UTC-safe month filtering accurately maps transaction to `2026-11`. No timezone offset shifts it to `2026-12`. |
| **TC-BUD-17** | Forward month planning | Select next month in selector | Allows configuring upcoming month's budgets prior to month start. |

### 3.5. Dashboard & Cross-Module Integration (TC-BUD-18 to TC-BUD-22)

| Case ID | Objective | Input / Action | Expected Result |
|---|---|---|---|
| **TC-BUD-18** | Dashboard active budget limit aggregation | User has 2 budgets in active month: Food (₹10,000) and Transport (₹5,000) | Dashboard `BudgetProgress` shows Monthly limit: ₹15,000 (sum of category limits). |
| **TC-BUD-19** | Dashboard zero-state behavior | User has no budgets for active month | Dashboard shows `EmptyState` ("No monthly budget set") with button navigating to `/budgets`. |
| **TC-BUD-20** | Transaction creation triggers budget update | User creates expense on `/transactions`, then views `/budgets` | Spent amount reflects new transaction without requiring hard page refresh. |
| **TC-BUD-21** | Recurring transaction realization | Recurring schedule executes new transaction | Realized transaction impacts budgeted category spent calculations accurately. |
| **TC-BUD-22** | User data isolation | User B logs in on same browser session | User B cannot view or modify User A's budgets. Firestore rules deny cross-user access. |

### 3.6. Firestore Security Rules (TC-BUD-23 to TC-BUD-25)

| Case ID | Objective | Rule Target | Expected Result |
|---|---|---|---|
| **TC-BUD-23** | Unauthenticated write rejection | `match /users/{userId}/budgets/{budgetId}` | Unauthenticated write fails with `PERMISSION_DENIED`. |
| **TC-BUD-24** | Malformed budget document ID | Write doc `2026-11` with category fields | Rule fails condition `budgetId == data.monthKey + '_' + data.categoryId`. |
| **TC-BUD-25** | Extraneous field injection | Attempt to write `{ categoryId, monthKey, limitPaise, maliciousField: 'hack' }` | Fails `data.keys().hasOnly(['categoryId', 'monthKey', 'limitPaise', 'updatedAt'])`. |

---

## 4. Manual Browser Verification Procedure

1. **Sign-In Verification:**
   - Log into `https://paisapilotapp.web.app` (or local dev server).
   - Verify user UID is loaded.
2. **Current Month Navigation:**
   - Navigate to `/budgets`.
   - Verify the displayed month selector is set to the current calendar month.
3. **Add First Category Budget:**
   - Click "Add category budget".
   - Select "Food & Dining", enter `5000`, click Save.
   - Confirm card appears with limit ₹5,000 and spent matches existing transactions in that category.
4. **Dashboard Verification:**
   - Navigate to `/dashboard`.
   - Verify `BudgetProgress` card renders with limit ₹5,000 (not 0 or blank).
5. **Add Transaction & Check Live Sync:**
   - Navigate to `/transactions`.
   - Add expense: Food & Dining ₹1,200.
   - Return to `/budgets`: Verify Food & Dining spent is now ₹1,200, remaining ₹3,800, usage 24%.
   - Return to `/dashboard`: Verify progress bar reflects ₹1,200 / ₹5,000.
6. **Edit & Delete:**
   - On `/budgets`, edit limit to ₹10,000. Check update.
   - Delete the budget. Check removal and dashboard reset to empty state.

---

## 5. Automated Test Execution Commands

```powershell
# Run Budget unit tests
npm test -- tests/unit/budget.test.js

# Run Firestore security rules test suite
npm test -- tests/security/firestore.rules.test.js

# Run full project test suite
npm test
```
