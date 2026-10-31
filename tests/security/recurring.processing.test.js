import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    serverTimestamp,
    setDoc,
} from 'firebase/firestore';
import { processScheduleOnServer } from '../../src/services/recurringService.js';

const RULES_PATH = new URL('../../firestore.rules', import.meta.url);

const [emulatorHost, emulatorPort] = (
    process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'
).split(':');

// Unique project ID so this file never clears data used by another suite.
const PROJECT_ID = 'paisapilot-recurring-processing-test';

const ALICE = 'alice';
const SCHEDULE_ID = 'sched_daily_1';
const TODAY = '2026-10-03';

let testEnv;

before(async () => {
    testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: {
            rules: readFileSync(RULES_PATH, 'utf8'),
            host: emulatorHost,
            port: Number(emulatorPort),
        },
    });
});

after(async () => {
    if (testEnv) {
        await testEnv.cleanup();
    }
});

beforeEach(async () => {
    await testEnv.clearFirestore();
});

function aliceDb() {
    return testEnv
        .authenticatedContext(ALICE, { email: 'alice@example.com' })
        .firestore();
}

async function seed(path, data) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), path), data);
    });
}

function profile(accountStatus = 'active') {
    return {
        displayName: 'Alice',
        email: 'alice@example.com',
        currency: 'INR',
        theme: 'light',
        accountStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
}

/** Stored schedule document, as Firestore holds it. */
function storedSchedule(overrides = {}) {
    return {
        type: 'expense',
        amountPaise: 25000,
        categoryId: 'cat_food',
        description: 'Daily tea',
        frequency: 'daily',
        startDate: '2026-10-01',
        endDate: null,
        status: 'active',
        nextIndex: 0,
        nextDate: '2026-10-01',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...overrides,
    };
}

/** Schedule object as the processor receives it from listRecurringSchedules. */
function scheduleInput(overrides = {}) {
    return {
        id: SCHEDULE_ID,
        type: 'expense',
        amountPaise: 25000,
        categoryId: 'cat_food',
        description: 'Daily tea',
        frequency: 'daily',
        startDate: '2026-10-01',
        endDate: null,
        status: 'active',
        nextIndex: 0,
        nextDate: '2026-10-01',
        ...overrides,
    };
}

async function setupAlice({ accountStatus = 'active', schedule = {} } = {}) {
    await seed(`users/${ALICE}`, profile(accountStatus));
    await seed(`users/${ALICE}/recurring/${SCHEDULE_ID}`, storedSchedule(schedule));
}

async function readSchedule(db) {
    const snap = await getDoc(doc(db, 'users', ALICE, 'recurring', SCHEDULE_ID));
    return snap.data();
}

async function transactionIds(db) {
    const snap = await getDocs(collection(db, 'users', ALICE, 'transactions'));
    return snap.docs.map((d) => d.id).sort();
}

const occurrenceId = (date) => `${SCHEDULE_ID}_${date}`;

describe('recurring processing: emulator transaction path', () => {
    it('creates one transaction per due occurrence and advances nextIndex', async () => {
        await setupAlice();
        const db = aliceDb();

        const created = await processScheduleOnServer(db, ALICE, scheduleInput(), TODAY);

        assert.equal(created.length, 3);
        assert.deepEqual(
            created.map((c) => c.date),
            ['2026-10-01', '2026-10-02', '2026-10-03']
        );
        assert.deepEqual(await transactionIds(db), [
            occurrenceId('2026-10-01'),
            occurrenceId('2026-10-02'),
            occurrenceId('2026-10-03'),
        ]);

        const after = await readSchedule(db);
        assert.equal(after.nextIndex, 3);
        assert.equal(after.nextDate, '2026-10-04');
    });

    it('creates no duplicates when processed again on the same day', async () => {
        await setupAlice();
        const db = aliceDb();

        await processScheduleOnServer(db, ALICE, scheduleInput(), TODAY);
        const second = await processScheduleOnServer(
            db,
            ALICE,
            scheduleInput({ nextIndex: 3, nextDate: '2026-10-04' }),
            TODAY
        );

        assert.equal(second.length, 0);
        assert.equal((await transactionIds(db)).length, 3);
        assert.equal((await readSchedule(db)).nextIndex, 3);
    });

    it('keeps an existing occurrence untouched and creates only the missing ones', async () => {
        await setupAlice();
        await seed(`users/${ALICE}/transactions/${occurrenceId('2026-10-02')}`, {
            type: 'expense',
            amountPaise: 1,
            categoryId: 'cat_food',
            date: '2026-10-02',
            description: 'Manual entry kept',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        const db = aliceDb();

        const created = await processScheduleOnServer(db, ALICE, scheduleInput(), TODAY);

        assert.deepEqual(
            created.map((c) => c.date),
            ['2026-10-01', '2026-10-03']
        );
        assert.equal((await transactionIds(db)).length, 3);

        const kept = await getDoc(doc(db, 'users', ALICE, 'transactions', occurrenceId('2026-10-02')));
        assert.equal(kept.data().description, 'Manual entry kept');
        assert.equal(kept.data().amountPaise, 1);
        assert.equal((await readSchedule(db)).nextIndex, 3);
    });

    it('respects the per-run limit and finishes on the next run', async () => {
        await setupAlice();
        const db = aliceDb();

        const first = await processScheduleOnServer(db, ALICE, scheduleInput(), TODAY, 2);
        assert.equal(first.length, 2);
        assert.equal((await readSchedule(db)).nextIndex, 2);

        const second = await processScheduleOnServer(
            db,
            ALICE,
            scheduleInput({ nextIndex: 2, nextDate: '2026-10-03' }),
            TODAY
        );
        assert.deepEqual(
            second.map((c) => c.date),
            ['2026-10-03']
        );
        assert.equal((await readSchedule(db)).nextIndex, 3);
        assert.equal((await transactionIds(db)).length, 3);
    });

    it('does not advance or write for a suspended user', async () => {
        await setupAlice({ accountStatus: 'suspended' });
        const db = aliceDb();

        await assert.rejects(
            processScheduleOnServer(db, ALICE, scheduleInput(), TODAY),
            { code: 'permission-denied' }
        );

        assert.equal((await readSchedule(db)).nextIndex, 0);
        assert.equal((await transactionIds(db)).length, 0);
    });

    it('writes nothing when the stored schedule is no longer active', async () => {
        await setupAlice({ schedule: { status: 'paused' } });
        const db = aliceDb();

        // The caller's copy is stale and still says active.
        const created = await processScheduleOnServer(db, ALICE, scheduleInput(), TODAY);

        assert.equal(created.length, 0);
        assert.equal((await readSchedule(db)).nextIndex, 0);
        assert.equal((await transactionIds(db)).length, 0);
    });

    it('aborts the schedule when an occurrence is invalid, and advances nothing', async () => {
        // Seeded directly, bypassing rules, to model a stored schedule that no longer validates.
        await setupAlice({ schedule: { amountPaise: 0 } });
        const db = aliceDb();

        await assert.rejects(
            processScheduleOnServer(db, ALICE, scheduleInput({ amountPaise: 0 }), TODAY),
            { code: 'validation/recurring-occurrence' }
        );

        assert.equal((await readSchedule(db)).nextIndex, 0);
        assert.equal((await transactionIds(db)).length, 0);
    });
});
