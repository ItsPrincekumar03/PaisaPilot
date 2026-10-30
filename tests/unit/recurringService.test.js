import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createRecurringSchedule,
  listRecurringSchedules,
  updateRecurringSchedule,
  setScheduleStatus,
  deleteRecurringSchedule,
  processDueRecurringSchedules,
  resetInMemorySchedules,
} from '../../src/services/recurringService.js';
import { SCHEDULE_STATUS } from '../../src/features/recurring/recurringConstants.js';

describe('recurringService (in-memory mode)', () => {
  const OWNER_ALICE = 'alice_uid_123';
  const OWNER_BOB = 'bob_uid_456';
  const categories = [
    { id: 'cat_sub', type: 'expense', name: 'Subscriptions' },
    { id: 'cat_salary', type: 'income', name: 'Salary' },
  ];

  beforeEach(() => {
    resetInMemorySchedules();
  });

  it('rejects calls without a valid ownerId', async () => {
    await assert.rejects(
      async () => listRecurringSchedules(''),
      /You must be signed in/
    );
    await assert.rejects(
      async () => createRecurringSchedule(null, {}),
      /You must be signed in/
    );
  });

  it('creates, lists, and isolates schedules per owner', async () => {
    const aliceSchedule = await createRecurringSchedule(
      OWNER_ALICE,
      {
        type: 'expense',
        amount: '499.00',
        categoryId: 'cat_sub',
        description: 'Netflix Monthly',
        frequency: 'monthly',
        startDate: '2026-01-01',
      },
      categories
    );

    const bobSchedule = await createRecurringSchedule(
      OWNER_BOB,
      {
        type: 'income',
        amount: '75000',
        categoryId: 'cat_salary',
        description: 'Tech Job Salary',
        frequency: 'monthly',
        startDate: '2026-01-01',
      },
      categories
    );

    const aliceList = await listRecurringSchedules(OWNER_ALICE);
    const bobList = await listRecurringSchedules(OWNER_BOB);

    assert.equal(aliceList.length, 1);
    assert.equal(aliceList[0].id, aliceSchedule.id);
    assert.equal(aliceList[0].description, 'Netflix Monthly');
    assert.equal(aliceList[0].amountPaise, 49900);

    assert.equal(bobList.length, 1);
    assert.equal(bobList[0].id, bobSchedule.id);
    assert.equal(bobList[0].description, 'Tech Job Salary');
  });

  it('updates an existing schedule', async () => {
    const created = await createRecurringSchedule(
      OWNER_ALICE,
      {
        type: 'expense',
        amount: '500',
        categoryId: 'cat_sub',
        description: 'Gym Membership',
        frequency: 'monthly',
        startDate: '2026-02-01',
      },
      categories
    );

    const updated = await updateRecurringSchedule(
      OWNER_ALICE,
      created.id,
      {
        type: 'expense',
        amount: '650',
        categoryId: 'cat_sub',
        description: 'Gym Membership Gold',
        frequency: 'monthly',
        startDate: '2026-02-01',
      },
      categories
    );

    assert.equal(updated.amountPaise, 65000);
    assert.equal(updated.description, 'Gym Membership Gold');
  });

  it('changes schedule status and deletes schedule', async () => {
    const created = await createRecurringSchedule(
      OWNER_ALICE,
      {
        type: 'expense',
        amount: '200',
        categoryId: 'cat_sub',
        description: 'Cloud Storage',
        frequency: 'monthly',
        startDate: '2026-01-01',
      },
      categories
    );

    await setScheduleStatus(OWNER_ALICE, created.id, SCHEDULE_STATUS.PAUSED);
    let list = await listRecurringSchedules(OWNER_ALICE);
    assert.equal(list[0].status, SCHEDULE_STATUS.PAUSED);

    await deleteRecurringSchedule(OWNER_ALICE, created.id);
    list = await listRecurringSchedules(OWNER_ALICE);
    assert.equal(list.length, 0);
  });

  it('processes due recurring schedules and prevents duplicates', async () => {
    const schedule = await createRecurringSchedule(
      OWNER_ALICE,
      {
        type: 'expense',
        amount: '300',
        categoryId: 'cat_sub',
        description: 'Domain Renewal',
        frequency: 'monthly',
        startDate: '2026-01-01',
      },
      categories
    );

    // Process up to 2026-03-01 -> Should generate 3 occurrences: Jan 1, Feb 1, Mar 1
    const generatedFirst = await processDueRecurringSchedules(OWNER_ALICE, '2026-03-01');
    assert.equal(generatedFirst.length, 3);
    assert.equal(generatedFirst[0].id, `${schedule.id}_2026-01-01`);

    // Process again on the same day -> Should generate 0 new transactions (idempotent)
    const generatedSecond = await processDueRecurringSchedules(OWNER_ALICE, '2026-03-01');
    assert.equal(generatedSecond.length, 0);

    // Process next month -> Should generate 1 occurrence: Apr 1
    const generatedThird = await processDueRecurringSchedules(OWNER_ALICE, '2026-04-01');
    assert.equal(generatedThird.length, 1);
    assert.equal(generatedThird[0].date, '2026-04-01');
  });
});
