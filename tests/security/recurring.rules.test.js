import { after, before, beforeEach, describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import {
    initializeTestEnvironment,
    assertFails,
    assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
    Timestamp,
    deleteDoc,
    doc,
    getDoc,
    serverTimestamp,
    setDoc,
    updateDoc,
} from 'firebase/firestore';

const RULES_PATH = new URL('../../firestore.rules', import.meta.url);

const [emulatorHost, emulatorPort] = (
    process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'
).split(':');

// Unique project ID so this file never clears data used by another rules suite.
const PROJECT_ID = 'paisapilot-recurring-rules-test';

const ALICE = 'alice';
const BOB = 'bob';
const ADMIN = 'admin-user';
const SCHEDULE_ID = 'sched_alice_1';

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

function dbFor(uid, claims = {}) {
    return testEnv
        .authenticatedContext(uid, { email: `${uid}@example.com`, ...claims })
        .firestore();
}

/** Writes test data while bypassing rules. Test setup only. */
async function seed(path, data) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), path), data);
    });
}

function profile(accountStatus = 'active') {
    return {
        displayName: 'Test User',
        email: 'user@example.com',
        currency: 'INR',
        theme: 'light',
        accountStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
}

function schedule(overrides = {}) {
    return {
        type: 'expense',
        amountPaise: 49900,
        categoryId: 'cat_food',
        description: 'Monthly groceries',
        frequency: 'monthly',
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

async function seedUsers({ alice = 'active', bob = 'active' } = {}) {
    await seed(`users/${ALICE}`, profile(alice));
    await seed(`users/${BOB}`, profile(bob));
}

async function seedAliceSchedule(overrides = {}) {
    await seed(`users/${ALICE}/recurring/${SCHEDULE_ID}`, schedule(overrides));
}

function scheduleRef(db, ownerId, id = SCHEDULE_ID) {
    return doc(db, 'users', ownerId, 'recurring', id);
}

describe('recurring schedules: active owner', () => {
    it('lets an active owner create a valid schedule', async () => {
        await seedUsers();
        await assertSucceeds(
            setDoc(scheduleRef(dbFor(ALICE), ALICE, 'sched_new'), schedule())
        );
    });

    it('lets an active owner read their schedule', async () => {
        await seedUsers();
        await seedAliceSchedule();
        await assertSucceeds(getDoc(scheduleRef(dbFor(ALICE), ALICE)));
    });

    it('lets an active owner update a schedule', async () => {
        await seedUsers();
        await seedAliceSchedule();
        await assertSucceeds(
            updateDoc(scheduleRef(dbFor(ALICE), ALICE), {
                description: 'Updated groceries',
                updatedAt: serverTimestamp(),
            })
        );
    });

    it('lets an active owner delete a schedule', async () => {
        await seedUsers();
        await seedAliceSchedule();
        await assertSucceeds(deleteDoc(scheduleRef(dbFor(ALICE), ALICE)));
    });
});

describe('recurring schedules: field validation on create', () => {
    const cases = [
        ['an extra field', () => ({ ...schedule(), notes: 'extra' })],
        ['an unknown type', () => schedule({ type: 'transfer' })],
        ['an unknown frequency', () => schedule({ frequency: 'hourly' })],
        ['an invalid status', () => schedule({ status: 'deleted' })],
        ['a malformed start date', () => schedule({ startDate: '2026/10/01' })],
        ['an impossible calendar date', () => schedule({ startDate: '2026-02-30' })],
        ['an end date before the start date', () => schedule({ endDate: '2026-09-01' })],
        ['a negative nextIndex', () => schedule({ nextIndex: -1 })],
        ['a fractional nextIndex', () => schedule({ nextIndex: 1.5 })],
        ['a zero amount', () => schedule({ amountPaise: 0 })],
        ['an amount above the maximum', () => schedule({ amountPaise: 1000000001 })],
        ['an empty description', () => schedule({ description: '' })],
        [
            'a missing description',
            () => {
                const data = schedule();
                delete data.description;
                return data;
            },
        ],
    ];

    for (const [label, build] of cases) {
        it(`rejects a schedule with ${label}`, async () => {
            await seedUsers();
            await assertFails(
                setDoc(scheduleRef(dbFor(ALICE), ALICE, 'sched_bad'), build())
            );
        });
    }

    it('rejects a client-supplied createdAt on create', async () => {
        await seedUsers();
        await assertFails(
            setDoc(
                scheduleRef(dbFor(ALICE), ALICE, 'sched_bad'),
                schedule({ createdAt: Timestamp.fromDate(new Date('2020-01-01')) })
            )
        );
    });
});

describe('recurring schedules: user isolation and admin access', () => {
    it('denies Bob reading Alice schedule', async () => {
        await seedUsers();
        await seedAliceSchedule();
        await assertFails(getDoc(scheduleRef(dbFor(BOB), ALICE)));
    });

    it('denies Bob creating a schedule under Alice path', async () => {
        await seedUsers();
        await assertFails(
            setDoc(scheduleRef(dbFor(BOB), ALICE, 'sched_planted'), schedule())
        );
    });

    it('denies Bob updating Alice schedule', async () => {
        await seedUsers();
        await seedAliceSchedule();
        await assertFails(
            updateDoc(scheduleRef(dbFor(BOB), ALICE), {
                description: 'Changed by Bob',
                updatedAt: serverTimestamp(),
            })
        );
    });

    it('denies Bob deleting Alice schedule', async () => {
        await seedUsers();
        await seedAliceSchedule();
        await assertFails(deleteDoc(scheduleRef(dbFor(BOB), ALICE)));
    });

    it('denies an administrator reading, updating or deleting another user schedule', async () => {
        await seedUsers();
        await seedAliceSchedule();
        const admin = dbFor(ADMIN, { admin: true });
        await assertFails(getDoc(scheduleRef(admin, ALICE)));
        await assertFails(
            updateDoc(scheduleRef(admin, ALICE), {
                description: 'Changed by admin',
                updatedAt: serverTimestamp(),
            })
        );
        await assertFails(deleteDoc(scheduleRef(admin, ALICE)));
    });
});

describe('recurring schedules: suspended accounts', () => {
    it('denies a suspended user creating a schedule', async () => {
        await seedUsers({ alice: 'suspended' });
        await assertFails(
            setDoc(scheduleRef(dbFor(ALICE), ALICE, 'sched_new'), schedule())
        );
    });

    it('denies a suspended user updating a schedule', async () => {
        await seedUsers({ alice: 'suspended' });
        await seedAliceSchedule();
        await assertFails(
            updateDoc(scheduleRef(dbFor(ALICE), ALICE), {
                description: 'Blocked edit',
                updatedAt: serverTimestamp(),
            })
        );
    });

    it('denies a suspended user deleting a schedule', async () => {
        await seedUsers({ alice: 'suspended' });
        await seedAliceSchedule();
        await assertFails(deleteDoc(scheduleRef(dbFor(ALICE), ALICE)));
    });

    it('still lets a suspended user read their own schedule', async () => {
        await seedUsers({ alice: 'suspended' });
        await seedAliceSchedule();
        await assertSucceeds(getDoc(scheduleRef(dbFor(ALICE), ALICE)));
    });
});

describe('recurring schedules: nextIndex progression guard', () => {
    it('denies a client decreasing nextIndex', async () => {
        await seedUsers();
        await seedAliceSchedule({ nextIndex: 5, nextDate: '2027-03-01' });
        await assertFails(
            updateDoc(scheduleRef(dbFor(ALICE), ALICE), {
                nextIndex: 4,
                updatedAt: serverTimestamp(),
            })
        );
    });

    it('denies resetting nextIndex to zero', async () => {
        await seedUsers();
        await seedAliceSchedule({ nextIndex: 5, nextDate: '2027-03-01' });
        await assertFails(
            updateDoc(scheduleRef(dbFor(ALICE), ALICE), {
                nextIndex: 0,
                updatedAt: serverTimestamp(),
            })
        );
    });

    it('denies a decrease even alongside a valid detail edit', async () => {
        await seedUsers();
        await seedAliceSchedule({ nextIndex: 5, nextDate: '2027-03-01' });
        await assertFails(
            updateDoc(scheduleRef(dbFor(ALICE), ALICE), {
                description: 'Edited',
                nextIndex: 2,
                updatedAt: serverTimestamp(),
            })
        );
    });

    it('allows a detail edit that leaves nextIndex unchanged', async () => {
        await seedUsers();
        await seedAliceSchedule({ nextIndex: 5, nextDate: '2027-03-01' });
        await assertSucceeds(
            updateDoc(scheduleRef(dbFor(ALICE), ALICE), {
                description: 'Edited',
                updatedAt: serverTimestamp(),
            })
        );
    });

    it('allows nextIndex to advance', async () => {
        await seedUsers();
        await seedAliceSchedule({ nextIndex: 5, nextDate: '2027-03-01' });
        await assertSucceeds(
            updateDoc(scheduleRef(dbFor(ALICE), ALICE), {
                nextIndex: 7,
                nextDate: '2027-05-01',
                updatedAt: serverTimestamp(),
            })
        );
    });
});

describe('recurring schedules: update validation', () => {
    it('denies an invalid status value on update', async () => {
        await seedUsers();
        await seedAliceSchedule();
        await assertFails(
            updateDoc(scheduleRef(dbFor(ALICE), ALICE), {
                status: 'deleted',
                updatedAt: serverTimestamp(),
            })
        );
    });

    it('allows pausing and then resuming a schedule', async () => {
        await seedUsers();
        await seedAliceSchedule();
        const db = dbFor(ALICE);
        await assertSucceeds(
            updateDoc(scheduleRef(db, ALICE), { status: 'paused', updatedAt: serverTimestamp() })
        );
        await assertSucceeds(
            updateDoc(scheduleRef(db, ALICE), { status: 'active', updatedAt: serverTimestamp() })
        );
    });

    it('denies changing createdAt on update', async () => {
        await seedUsers();
        await seedAliceSchedule();
        await assertFails(
            updateDoc(scheduleRef(dbFor(ALICE), ALICE), {
                createdAt: Timestamp.fromDate(new Date('2020-01-01')),
                updatedAt: serverTimestamp(),
            })
        );
    });

    it('denies a client-supplied updatedAt', async () => {
        await seedUsers();
        await seedAliceSchedule();
        await assertFails(
            updateDoc(scheduleRef(dbFor(ALICE), ALICE), {
                description: 'Edited',
                updatedAt: Timestamp.fromDate(new Date('2020-01-01')),
            })
        );
    });
});
