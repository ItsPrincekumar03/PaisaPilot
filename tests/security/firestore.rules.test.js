import { after, before, beforeEach, describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

const RULES_PATH = new URL('../../firestore.rules', import.meta.url);
const [emulatorHost, emulatorPort] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':');

const ALICE = { uid: 'alice', email: 'alice@example.com' };
const BOB = { uid: 'bob', email: 'bob@example.com' };

let testEnv;

before(async () => {
    testEnv = await initializeTestEnvironment({
        projectId: 'paisapilot-rules-test',
        firestore: {
            rules: readFileSync(RULES_PATH, 'utf8'),
            host: emulatorHost,
            port: Number(emulatorPort),
        },
    });
});

after(async () => {
    await testEnv.cleanup();
});

beforeEach(async () => {
    await testEnv.clearFirestore();
});

function dbFor(user) {
    const context = user
        ? testEnv.authenticatedContext(user.uid, { email: user.email })
        : testEnv.unauthenticatedContext();
    return context.firestore();
}

/** Writes test data while bypassing rules. Used only for setup. */
async function seed(path, data) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), path), data);
    });
}

function profileData(email, overrides = {}) {
    return {
        displayName: 'Test User',
        email,
        currency: 'INR',
        theme: 'light',
        accountStatus: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...overrides,
    };
}

function transactionData(overrides = {}) {
    return {
        type: 'expense',
        amountPaise: 54000,
        categoryId: 'food',
        date: '2026-10-08',
        description: 'Weekly groceries',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...overrides,
    };
}

function budgetData(overrides = {}) {
    return {
        monthKey: '2026-10',
        limitPaise: 4000000,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...overrides,
    };
}

describe('unauthenticated access', () => {
    it('denies reading a private transaction', async () => {
        await seed('users/alice/transactions/t1', transactionData());
        await assertFails(getDoc(doc(dbFor(null), 'users/alice/transactions/t1')));
    });

    it('denies creating a transaction', async () => {
        await assertFails(setDoc(doc(dbFor(null), 'users/alice/transactions/t2'), transactionData()));
    });

    it('denies reading a profile', async () => {
        await seed('users/alice', profileData(ALICE.email));
        await assertFails(getDoc(doc(dbFor(null), 'users/alice')));
    });
});

describe('owner access', () => {
    it('lets a user create their own profile', async () => {
        await assertSucceeds(setDoc(doc(dbFor(ALICE), 'users/alice'), profileData(ALICE.email)));
    });

    it('lets a user create and read their own transaction', async () => {
        const ref = doc(dbFor(ALICE), 'users/alice/transactions/t1');
        await assertSucceeds(setDoc(ref, transactionData()));
        await assertSucceeds(getDoc(ref));
    });

    it('lets a user update and delete their own transaction', async () => {
        await seed('users/alice/transactions/t1', transactionData());
        const ref = doc(dbFor(ALICE), 'users/alice/transactions/t1');
        await assertSucceeds(updateDoc(ref, { description: 'Updated', updatedAt: serverTimestamp() }));
        await assertSucceeds(deleteDoc(ref));
    });

    it('lets a user create a valid monthly budget', async () => {
        await assertSucceeds(setDoc(doc(dbFor(ALICE), 'users/alice/budgets/2026-10'), budgetData()));
    });
});

describe('cross-user isolation', () => {
    it('denies Alice reading Bob transaction', async () => {
        await seed('users/bob/transactions/t1', transactionData());
        await assertFails(getDoc(doc(dbFor(ALICE), 'users/bob/transactions/t1')));
    });

    it('denies Alice creating a transaction under Bob', async () => {
        await assertFails(setDoc(doc(dbFor(ALICE), 'users/bob/transactions/t2'), transactionData()));
    });

    it('denies Alice updating Bob transaction', async () => {
        await seed('users/bob/transactions/t1', transactionData());
        const ref = doc(dbFor(ALICE), 'users/bob/transactions/t1');
        await assertFails(updateDoc(ref, { description: 'Hacked', updatedAt: serverTimestamp() }));
    });

    it('denies Alice deleting Bob transaction', async () => {
        await seed('users/bob/transactions/t1', transactionData());
        await assertFails(deleteDoc(doc(dbFor(ALICE), 'users/bob/transactions/t1')));
    });

    it('denies Alice reading Bob budget and profile', async () => {
        await seed('users/bob/budgets/2026-10', budgetData());
        await seed('users/bob', profileData(BOB.email));
        await assertFails(getDoc(doc(dbFor(ALICE), 'users/bob/budgets/2026-10')));
        await assertFails(getDoc(doc(dbFor(ALICE), 'users/bob')));
    });
});

describe('transaction validation', () => {
    const invalidCases = [
        ['zero amount', { amountPaise: 0 }],
        ['negative amount', { amountPaise: -100 }],
        ['decimal amount', { amountPaise: 540.5 }],
        ['unknown type', { type: 'transfer' }],
        ['malformed date', { date: '08/10/2026' }],
        ['invalid month', { date: '2026-13-08' }],
        ['invalid day', { date: '2026-10-32' }],
        ['impossible calendar date', { date: '2026-99-99' }],
        ['non-leap year February 29', { date: '2025-02-29' }],
        ['February 30', { date: '2026-02-30' }],
        ['April 31', { date: '2026-04-31' }],
        ['extra ownership field', { ownerId: 'bob' }],
        ['client-supplied createdAt', { createdAt: new Date() }],
    ];

    for (const [name, overrides] of invalidCases) {
        it(`rejects ${name}`, async () => {
            const ref = doc(dbFor(ALICE), 'users/alice/transactions/bad');
            await assertFails(setDoc(ref, transactionData(overrides)));
        });
    }

    it('accepts a valid leap-year date', async () => {
        const ref = doc(dbFor(ALICE), 'users/alice/transactions/leap-day');
        await assertSucceeds(
            setDoc(ref, transactionData({ date: '2024-02-29' }))
        );
    });
});

describe('profile and admin protection', () => {
    it('rejects a self-assigned role field', async () => {
        const ref = doc(dbFor(ALICE), 'users/alice');
        await assertFails(setDoc(ref, profileData(ALICE.email, { role: 'admin' })));
    });

    it('rejects creating a profile with a non-active status', async () => {
        const ref = doc(dbFor(ALICE), 'users/alice');
        await assertFails(setDoc(ref, profileData(ALICE.email, { accountStatus: 'admin' })));
    });

    it('rejects changing accountStatus during update', async () => {
        await seed('users/alice', profileData(ALICE.email));
        const ref = doc(dbFor(ALICE), 'users/alice');
        await assertFails(updateDoc(ref, { accountStatus: 'suspended', updatedAt: serverTimestamp() }));
    });

    it('allows a safe display name update', async () => {
        await seed('users/alice', profileData(ALICE.email));
        const ref = doc(dbFor(ALICE), 'users/alice');
        await assertSucceeds(updateDoc(ref, { displayName: 'Alice', updatedAt: serverTimestamp() }));
    });

    it('denies client deletion of a profile', async () => {
        await seed('users/alice', profileData(ALICE.email));
        await assertFails(deleteDoc(doc(dbFor(ALICE), 'users/alice')));
    });
});

describe('budgets and categories', () => {
    it('rejects a budget whose monthKey does not match its document ID', async () => {
        const ref = doc(dbFor(ALICE), 'users/alice/budgets/2026-10');
        await assertFails(setDoc(ref, budgetData({ monthKey: '2026-09' })));
    });

    it('rejects an invalid month document ID', async () => {
        const ref = doc(dbFor(ALICE), 'users/alice/budgets/2026-13');
        await assertFails(setDoc(ref, budgetData({ monthKey: '2026-13' })));
    });

    it('rejects a budget with a zero limit', async () => {
        const ref = doc(dbFor(ALICE), 'users/alice/budgets/2026-10');
        await assertFails(setDoc(ref, budgetData({ limitPaise: 0 })));
    });

    it('lets a signed-in user read global categories but not write them', async () => {
        await seed('categories/food', {
            name: 'Food',
            type: 'expense',
            color: '#F16D65',
            icon: 'utensils',
            active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        const ref = doc(dbFor(ALICE), 'categories/food');
        await assertSucceeds(getDoc(ref));
        await assertFails(setDoc(doc(dbFor(ALICE), 'categories/new'), { name: 'Hack' }));
    });
});

describe('audit logs and unspecified collections', () => {
    it('denies writes to auditLogs even for a signed-in user', async () => {
        await assertFails(setDoc(doc(dbFor(ALICE), 'auditLogs/log1'), { action: 'fake' }));
    });

    it('denies access to an unspecified collection', async () => {
        await assertFails(setDoc(doc(dbFor(ALICE), 'secrets/alice'), { value: 'x' }));
        await assertFails(getDoc(doc(dbFor(ALICE), 'secrets/alice')));
    });
});