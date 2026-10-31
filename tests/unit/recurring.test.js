import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  daysInMonth,
  getOccurrenceDate,
  getDueOccurrences,
} from '../../src/features/recurring/recurringDates.js';
import { validateSchedule } from '../../src/features/recurring/recurringValidation.js';
import {
  getOccurrenceId,
  planScheduleRun,
} from '../../src/features/recurring/recurringProcessor.js';
import {
  MAX_CATCH_UP_PER_RUN,
  SCHEDULE_STATUS,
} from '../../src/features/recurring/recurringConstants.js';

describe('Module 11 - Recurring Transactions Unit Tests', () => {
  // --- 1. Date Arithmetic & Frequencies ---
  it('1. calculates daysInMonth correctly for standard, leap, and 30/31-day months', () => {
    assert.equal(daysInMonth(2026, 2), 28);
    assert.equal(daysInMonth(2024, 2), 29); // Leap year
    assert.equal(daysInMonth(2026, 4), 30);
    assert.equal(daysInMonth(2026, 1), 31);
  });

  it('2. advances daily and weekly frequencies without drift', () => {
    assert.equal(getOccurrenceDate('2026-01-01', 'daily', 0), '2026-01-01');
    assert.equal(getOccurrenceDate('2026-01-01', 'daily', 5), '2026-01-06');
    assert.equal(getOccurrenceDate('2026-01-01', 'weekly', 2), '2026-01-15');
  });

  it('3. advances monthly recurrence and clamps to month-end without cascading drift', () => {
    // Jan 31 -> Feb 28 -> Mar 31 (not Mar 28)
    assert.equal(getOccurrenceDate('2026-01-31', 'monthly', 0), '2026-01-31');
    assert.equal(getOccurrenceDate('2026-01-31', 'monthly', 1), '2026-02-28');
    assert.equal(getOccurrenceDate('2026-01-31', 'monthly', 2), '2026-03-31');
    assert.equal(getOccurrenceDate('2026-01-31', 'monthly', 3), '2026-04-30');
  });

  it('4. advances yearly recurrence and handles leap day clamping on non-leap years', () => {
    // 2024-02-29 (leap) -> 2025-02-28 -> 2028-02-29 (leap)
    assert.equal(getOccurrenceDate('2024-02-29', 'yearly', 0), '2024-02-29');
    assert.equal(getOccurrenceDate('2024-02-29', 'yearly', 1), '2025-02-28');
    assert.equal(getOccurrenceDate('2024-02-29', 'yearly', 4), '2028-02-29');
  });

  it('5. throws an error for invalid start dates, negative index, or unsupported frequency', () => {
    assert.throws(() => getOccurrenceDate('not-a-date', 'monthly', 0), /valid YYYY-MM-DD/);
    assert.throws(() => getOccurrenceDate('2026-02-30', 'monthly', 0), /valid YYYY-MM-DD/);
    assert.throws(() => getOccurrenceDate('2026-01-01', 'monthly', -1), /whole number/);
    assert.throws(() => getOccurrenceDate('2026-01-01', 'hourly', 0), /Unsupported frequency/);
  });

  // --- 2. Due Occurrences & Boundaries ---
  it('6. retrieves due occurrences up to todayIso without exceeding limit', () => {
    const due = getDueOccurrences({
      startDate: '2026-01-01',
      frequency: 'daily',
      fromIndex: 0,
      todayIso: '2026-01-05',
      limit: 3,
    });
    assert.equal(due.length, 3);
    assert.deepEqual(due.map((d) => d.date), ['2026-01-01', '2026-01-02', '2026-01-03']);
  });

  it('7. respects endDate in getDueOccurrences when endDate is reached before todayIso', () => {
    const due = getDueOccurrences({
      startDate: '2026-01-01',
      endDate: '2026-01-03',
      frequency: 'daily',
      fromIndex: 0,
      todayIso: '2026-01-10',
      limit: 10,
    });
    assert.equal(due.length, 3);
    assert.deepEqual(due.map((d) => d.date), ['2026-01-01', '2026-01-02', '2026-01-03']);
  });

  // --- 3. Schedule Planning & Idempotency ---
  it('8. generates deterministic occurrenceId for duplicate prevention', () => {
    const id1 = getOccurrenceId('sched_123', '2026-05-01');
    const id2 = getOccurrenceId('sched_123', '2026-05-01');
    const id3 = getOccurrenceId('sched_123', '2026-05-02');
    assert.equal(id1, 'sched_123_2026-05-01');
    assert.equal(id1, id2);
    assert.notEqual(id1, id3);
  });

  it('9. plans schedule run correctly for active recurring items', () => {
    const schedule = {
      id: 'sch_rent',
      status: SCHEDULE_STATUS.ACTIVE,
      type: 'expense',
      amountPaise: 2500000,
      categoryId: 'cat_housing',
      description: 'Monthly Apartment Rent',
      frequency: 'monthly',
      startDate: '2026-01-01',
      endDate: null,
      nextIndex: 0,
    };

    const plan = planScheduleRun(schedule, '2026-03-15');
    assert.equal(plan.skipped, false);
    assert.equal(plan.items.length, 3);
    assert.equal(plan.items[0].date, '2026-01-01');
    assert.equal(plan.items[0].transaction.amountPaise, 2500000);
    assert.equal(plan.items[0].occurrenceId, 'sch_rent_2026-01-01');
    assert.equal(plan.items[2].date, '2026-03-01');
    assert.equal(plan.nextIndex, 3);
    assert.equal(plan.nextDate, '2026-04-01');
  });

  it('10. skips planning and generates no items when schedule is paused or cancelled', () => {
    const paused = {
      id: 'sch_paused',
      status: SCHEDULE_STATUS.PAUSED,
      startDate: '2026-01-01',
      frequency: 'monthly',
      nextIndex: 2,
    };
    const planPaused = planScheduleRun(paused, '2026-05-01');
    assert.equal(planPaused.skipped, true);
    assert.equal(planPaused.items.length, 0);
    assert.equal(planPaused.nextIndex, 2);
    assert.equal(planPaused.nextDate, null);

    const cancelled = {
      id: 'sch_cancelled',
      status: SCHEDULE_STATUS.CANCELLED,
      startDate: '2026-01-01',
      frequency: 'monthly',
      nextIndex: 1,
    };
    const planCancelled = planScheduleRun(cancelled, '2026-05-01');
    assert.equal(planCancelled.skipped, true);
    assert.equal(planCancelled.items.length, 0);
  });

  it('11. respects MAX_CATCH_UP_PER_RUN to prevent huge unbounded runs', () => {
    const schedule = {
      id: 'sch_daily',
      status: SCHEDULE_STATUS.ACTIVE,
      type: 'expense',
      amountPaise: 10000,
      categoryId: 'cat_misc',
      description: 'Daily Coffee',
      frequency: 'daily',
      startDate: '2024-01-01',
      endDate: null,
      nextIndex: 0,
    };

    // More than 500 days between 2024-01-01 and 2026-01-01
    const plan = planScheduleRun(schedule, '2026-01-01');
    assert.equal(plan.items.length, MAX_CATCH_UP_PER_RUN);
    assert.equal(plan.nextIndex, MAX_CATCH_UP_PER_RUN);
  });

  it('12. sets nextDate to null when schedule exceeds endDate after run', () => {
    const schedule = {
      id: 'sch_loan',
      status: SCHEDULE_STATUS.ACTIVE,
      type: 'expense',
      amountPaise: 500000,
      categoryId: 'cat_debt',
      description: 'Term Loan Payment',
      frequency: 'monthly',
      startDate: '2026-01-01',
      endDate: '2026-03-01',
      nextIndex: 0,
    };

    const plan = planScheduleRun(schedule, '2026-03-15');
    assert.equal(plan.items.length, 3);
    assert.equal(plan.nextIndex, 3);
    assert.equal(plan.nextDate, null); // Next candidate is 2026-04-01 > endDate
  });

  // --- 4. Validation Suite ---
  it('13. validates and accepts a complete valid recurring schedule input', () => {
    const valid = {
      type: 'expense',
      amount: '1500.50',
      categoryId: 'cat_bills',
      description: 'Internet Broadband Bill',
      frequency: 'monthly',
      startDate: '2026-04-01',
      endDate: '2026-12-31',
    };
    const categories = [{ id: 'cat_bills', type: 'expense', name: 'Bills' }];
    const res = validateSchedule(valid, categories);

    assert.deepEqual(res.errors, {});
    assert.ok(res.values);
    assert.equal(res.values.type, 'expense');
    assert.equal(res.values.amountPaise, 150050);
    assert.equal(res.values.frequency, 'monthly');
    assert.equal(res.values.startDate, '2026-04-01');
    assert.equal(res.values.endDate, '2026-12-31');
  });

  it('14. rejects invalid or missing transaction type', () => {
    const res1 = validateSchedule({ type: 'transfer' });
    assert.equal(res1.errors.type, 'Choose income or expense.');

    const res2 = validateSchedule({});
    assert.equal(res2.errors.type, 'Choose income or expense.');
  });

  it('15. rejects invalid, zero, negative, or excessive amounts', () => {
    assert.equal(validateSchedule({ amount: '0' }).errors.amount, 'Amount must be greater than zero.');
    assert.equal(validateSchedule({ amount: '-50' }).errors.amount, 'Enter an amount such as 500 or 500.50.');
    assert.equal(validateSchedule({ amount: 'abc' }).errors.amount, 'Enter an amount such as 500 or 500.50.');
    assert.equal(validateSchedule({ amount: '' }).errors.amount, 'Enter an amount.');
    assert.equal(validateSchedule({ amount: '10000000000' }).errors.amount, 'Amount is too large.');
  });

  it('16. validates category existence and type-matching against provided category list', () => {
    const categories = [{ id: 'cat_salary', type: 'income', name: 'Salary' }];

    const notFound = validateSchedule({ type: 'income', categoryId: 'cat_unknown' }, categories);
    assert.equal(notFound.errors.categoryId, 'This category is no longer available.');

    const mismatch = validateSchedule({ type: 'expense', categoryId: 'cat_salary' }, categories);
    assert.equal(mismatch.errors.categoryId, 'The category does not match the transaction type.');
  });

  it('17. validates description length and frequency choices', () => {
    const blankDesc = validateSchedule({ description: '   ' });
    assert.match(blankDesc.errors.description, /Enter a description/);

    const longDesc = validateSchedule({ description: 'a'.repeat(201) });
    assert.match(longDesc.errors.description, /Enter a description/);

    const badFreq = validateSchedule({ frequency: 'biweekly' });
    assert.equal(badFreq.errors.frequency, 'Choose a frequency.');
  });

  it('18. validates start date and verifies end date is on or after start date', () => {
    // Bad start date
    const badStart = validateSchedule({ startDate: 'invalid-date' });
    assert.equal(badStart.errors.startDate, 'Enter a valid start date.');

    // Bad end date format
    const badEnd = validateSchedule({ startDate: '2026-05-01', endDate: 'invalid-date' });
    assert.equal(badEnd.errors.endDate, 'Enter a valid end date.');

    // Reversed date range (endDate < startDate)
    const reversed = validateSchedule({ startDate: '2026-05-10', endDate: '2026-05-01' });
    assert.equal(reversed.errors.endDate, 'The end date must be on or after the start date.');
  });
});
