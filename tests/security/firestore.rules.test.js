
import { after, before, beforeEach, describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import {
    initializeTestEnvironment,
    assertFails,
    assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
} from 'firebase/firestore';

const RULES_PATH = new URL('../../firestore.rules', import.meta.url);

const [emulatorHost, emulatorPort] = (
    process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'
).split(':');

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
    if (testEnv) {
        await testEnv.cleanup();
    }
});

beforeEach(async () => {
    await testEnv.clearFirestore();
});

async function seedActiveUsers() {
    await seed('users/alice', profileData(ALICE.email));
    await seed('users/bob', profileData(BOB.email));
}

function dbFor(user) {
    const context = user
        ? testEnv.authenticatedContext(user.uid, {
            email: user.email,
        })
        : testEnv.unauthenticatedContext();

    return context.firestore();
}

/** Writes test data while bypassing rules. Used only for test setup. */
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
        await seed(
            'users/alice/transactions/t1',
            transactionData()
        );

        await assertFails(
            getDoc(
                doc(
                    dbFor(null),
                    'users/alice/transactions/t1'
                )
            )
        );
    });

    it('denies creating a transaction', async () => {
        await assertFails(
            setDoc(
                doc(
                    dbFor(null),
                    'users/alice/transactions/t2'
                ),
                transactionData()
            )
        );
    });

    it('denies reading a profile', async () => {
        await seed('users/alice', profileData(ALICE.email));

        await assertFails(
            getDoc(doc(dbFor(null), 'users/alice'))
        );
    });
});

describe('owner access', () => {
    it('lets a user create their own profile', async () => {
        await assertSucceeds(
            setDoc(
                doc(dbFor(ALICE), 'users/alice'),
                profileData(ALICE.email)
            )
        );
    });

    it('lets a user create and read their own transaction', async () => {
        await seedActiveUsers();
        const ref = doc(
            dbFor(ALICE),
            'users/alice/transactions/t1'
        );

        await assertSucceeds(setDoc(ref, transactionData()));
        await assertSucceeds(getDoc(ref));
    });

    it('lets a user update and delete their own transaction', async () => {
        await seedActiveUsers();
        await seed(
            'users/alice/transactions/t1',
            transactionData()
        );

        const ref = doc(
            dbFor(ALICE),
            'users/alice/transactions/t1'
        );

        await assertSucceeds(
            updateDoc(ref, {
                description: 'Updated',
                updatedAt: serverTimestamp(),
            })
        );

        await assertSucceeds(deleteDoc(ref));
    });

    it('lets a user create a valid monthly budget', async () => {
        await seedActiveUsers();
        const ref = doc(
            dbFor(ALICE),
            'users/alice/budgets/2026-10'
        );

        await assertSucceeds(setDoc(ref, budgetData()));
    });
});

describe('cross-user isolation', () => {
    it('denies Alice reading Bob transaction', async () => {
        await seed(
            'users/bob/transactions/t1',
            transactionData()
        );

        await assertFails(
            getDoc(
                doc(
                    dbFor(ALICE),
                    'users/bob/transactions/t1'
                )
            )
        );
    });

    it('denies Alice creating a transaction under Bob', async () => {
        await assertFails(
            setDoc(
                doc(
                    dbFor(ALICE),
                    'users/bob/transactions/t2'
                ),
                transactionData()
            )
        );
    });

    it('denies Alice updating Bob transaction', async () => {
        await seed(
            'users/bob/transactions/t1',
            transactionData()
        );

        const ref = doc(
            dbFor(ALICE),
            'users/bob/transactions/t1'
        );

        await assertFails(
            updateDoc(ref, {
                description: 'Hacked',
                updatedAt: serverTimestamp(),
            })
        );
    });

    it('denies Alice deleting Bob transaction', async () => {
        await seed(
            'users/bob/transactions/t1',
            transactionData()
        );

        await assertFails(
            deleteDoc(
                doc(
                    dbFor(ALICE),
                    'users/bob/transactions/t1'
                )
            )
        );
    });

    it('denies Alice reading Bob budget and profile', async () => {
        await seed(
            'users/bob/budgets/2026-10',
            budgetData()
        );

        await seed('users/bob', profileData(BOB.email));

        await assertFails(
            getDoc(
                doc(
                    dbFor(ALICE),
                    'users/bob/budgets/2026-10'
                )
            )
        );

        await assertFails(
            getDoc(doc(dbFor(ALICE), 'users/bob'))
        );
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
            const ref = doc(
                dbFor(ALICE),
                'users/alice/transactions/bad'
            );

            await assertFails(
                setDoc(ref, transactionData(overrides))
            );
        });
    }

    it('accepts a valid leap-year date', async () => {
        await seedActiveUsers();
        const ref = doc(
            dbFor(ALICE),
            'users/alice/transactions/leap-day'
        );

        await assertSucceeds(
            setDoc(
                ref,
                transactionData({ date: '2024-02-29' })
            )
        );
    });
});

describe('profile and admin protection', () => {
    it('rejects a self-assigned role field', async () => {
        const ref = doc(dbFor(ALICE), 'users/alice');

        await assertFails(
            setDoc(
                ref,
                profileData(ALICE.email, { role: 'admin' })
            )
        );
    });

    it('rejects creating a profile with a non-active status', async () => {
        const ref = doc(dbFor(ALICE), 'users/alice');

        await assertFails(
            setDoc(
                ref,
                profileData(ALICE.email, {
                    accountStatus: 'admin',
                })
            )
        );
    });

    it('rejects changing accountStatus during update', async () => {
        await seed('users/alice', profileData(ALICE.email));

        const ref = doc(dbFor(ALICE), 'users/alice');

        await assertFails(
            updateDoc(ref, {
                accountStatus: 'suspended',
                updatedAt: serverTimestamp(),
            })
        );
    });

    it('allows a safe display name update', async () => {
        await seed('users/alice', profileData(ALICE.email));

        const ref = doc(dbFor(ALICE), 'users/alice');

        await assertSucceeds(
            updateDoc(ref, {
                displayName: 'Alice',
                updatedAt: serverTimestamp(),
            })
        );
    });

    it('denies client deletion of a profile', async () => {
        await seed('users/alice', profileData(ALICE.email));

        await assertFails(
            deleteDoc(doc(dbFor(ALICE), 'users/alice'))
        );
    });
});

describe('budgets and categories', () => {
    it('allows a valid category-specific budget', async () => {
        await seedActiveUsers();
        const ref = doc(
            dbFor(ALICE),
            'users/alice/budgets/2026-10_food'
        );

        await assertSucceeds(
            setDoc(ref, {
                monthKey: '2026-10',
                categoryId: 'food',
                limitPaise: 4000000,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            })
        );
    });

    it('rejects a category budget whose document ID does not match', async () => {
        const ref = doc(
            dbFor(ALICE),
            'users/alice/budgets/2026-10_transport'
        );

        await assertFails(
            setDoc(ref, {
                monthKey: '2026-10',
                categoryId: 'food',
                limitPaise: 4000000,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            })
        );
    });

    it('rejects a budget whose monthKey does not match its document ID', async () => {
        const ref = doc(
            dbFor(ALICE),
            'users/alice/budgets/2026-10'
        );

        await assertFails(
            setDoc(
                ref,
                budgetData({ monthKey: '2026-09' })
            )
        );
    });

    it('rejects an invalid month document ID', async () => {
        const ref = doc(
            dbFor(ALICE),
            'users/alice/budgets/2026-13'
        );

        await assertFails(
            setDoc(
                ref,
                budgetData({ monthKey: '2026-13' })
            )
        );
    });

    it('rejects a budget with a zero limit', async () => {
        const ref = doc(
            dbFor(ALICE),
            'users/alice/budgets/2026-10'
        );

        await assertFails(
            setDoc(
                ref,
                budgetData({ limitPaise: 0 })
            )
        );
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

        await assertFails(
            setDoc(
                doc(dbFor(ALICE), 'categories/new'),
                { name: 'Hack' }
            )
        );
    });
});

describe('audit logs and unspecified collections', () => {
    it('denies writes to auditLogs even for a signed-in user', async () => {
        await assertFails(
            setDoc(
                doc(dbFor(ALICE), 'auditLogs/log1'),
                { action: 'fake' }
            )
        );
    });

    it('denies access to an unspecified collection', async () => {
        await assertFails(
            setDoc(
                doc(dbFor(ALICE), 'secrets/alice'),
                { value: 'x' }
            )
        );

        await assertFails(
            getDoc(doc(dbFor(ALICE), 'secrets/alice'))
        );
    });
});

describe('Module 10 hardened security: admin updates and suspended accounts', () => {
    const ADMIN = { uid: 'admin_user', email: 'admin@example.com', admin: true };
    const NON_ADMIN = { uid: 'non_admin_user', email: 'user@example.com' };

    function adminDb() {
        return testEnv.authenticatedContext(ADMIN.uid, {
            email: ADMIN.email,
            admin: true,
        }).firestore();
    }

    it('lets an active user create, update, and delete their own transaction', async () => {
        await seedActiveUsers();
        const ref = doc(dbFor(ALICE), 'users/alice/transactions/t_active');
        await assertSucceeds(setDoc(ref, transactionData()));
        await assertSucceeds(updateDoc(ref, { description: 'Updated desc', updatedAt: serverTimestamp() }));
        await assertSucceeds(deleteDoc(ref));
    });

    it('lets an active user create, update, and delete their own budget', async () => {
        await seedActiveUsers();
        const ref = doc(dbFor(ALICE), 'users/alice/budgets/2026-10');
        await assertSucceeds(setDoc(ref, budgetData()));
        await assertSucceeds(updateDoc(ref, { limitPaise: 9000000, updatedAt: serverTimestamp() }));
        await assertSucceeds(deleteDoc(ref));
    });

    it('denies a suspended user creating, updating, or deleting their own transaction', async () => {
        await seed('users/alice', profileData(ALICE.email, { accountStatus: 'suspended' }));
        await seed('users/alice/transactions/t_exist', transactionData());

        const newRef = doc(dbFor(ALICE), 'users/alice/transactions/t_new');
        const existRef = doc(dbFor(ALICE), 'users/alice/transactions/t_exist');

        await assertFails(setDoc(newRef, transactionData()));
        await assertFails(updateDoc(existRef, { description: 'Suspended update', updatedAt: serverTimestamp() }));
        await assertFails(deleteDoc(existRef));
    });

    it('denies a suspended user creating, updating, or deleting their own budget', async () => {
        await seed('users/alice', profileData(ALICE.email, { accountStatus: 'suspended' }));
        await seed('users/alice/budgets/2026-10', budgetData());

        const newRef = doc(dbFor(ALICE), 'users/alice/budgets/2026-11');
        const existRef = doc(dbFor(ALICE), 'users/alice/budgets/2026-10');

        await assertFails(setDoc(newRef, budgetData({ monthKey: '2026-11' })));
        await assertFails(updateDoc(existRef, { limitPaise: 8000000, updatedAt: serverTimestamp() }));
        await assertFails(deleteDoc(existRef));
    });

    it('denies a user accessing or modifying another users private financial records', async () => {
        await seedActiveUsers();
        await seed('users/bob/transactions/t_bob', transactionData());
        await seed('users/bob/budgets/2026-10', budgetData());

        const txRef = doc(dbFor(ALICE), 'users/bob/transactions/t_bob');
        const budgetRef = doc(dbFor(ALICE), 'users/bob/budgets/2026-10');

        await assertFails(getDoc(txRef));
        await assertFails(updateDoc(txRef, { description: 'Alice tampering' }));
        await assertFails(deleteDoc(txRef));

        await assertFails(getDoc(budgetRef));
        await assertFails(updateDoc(budgetRef, { limitPaise: 1 }));
        await assertFails(deleteDoc(budgetRef));
    });

    it('lets a valid admin suspend and restore another users account', async () => {
        await seed('users/alice', profileData(ALICE.email, { accountStatus: 'active' }));
        const aliceRef = doc(adminDb(), 'users/alice');

        // Suspend Alice
        await assertSucceeds(updateDoc(aliceRef, {
            accountStatus: 'suspended',
            updatedAt: serverTimestamp(),
        }));

        // Restore Alice
        await assertSucceeds(updateDoc(aliceRef, {
            accountStatus: 'active',
            updatedAt: serverTimestamp(),
        }));
    });

    it('denies a non-admin from suspending or restoring another users account', async () => {
        await seed('users/alice', profileData(ALICE.email, { accountStatus: 'active' }));
        const aliceRef = doc(dbFor(NON_ADMIN), 'users/alice');

        await assertFails(updateDoc(aliceRef, {
            accountStatus: 'suspended',
            updatedAt: serverTimestamp(),
        }));
    });

    it('denies an admin from suspending or modifying their own account status', async () => {
        await seed('users/admin_user', profileData(ADMIN.email, { accountStatus: 'active' }));
        const selfRef = doc(adminDb(), 'users/admin_user');

        await assertFails(updateDoc(selfRef, {
            accountStatus: 'suspended',
            updatedAt: serverTimestamp(),
        }));
    });

    it('denies an admin from altering another users profile preferences or fields while changing status', async () => {
        await seed('users/alice', profileData(ALICE.email, {
            displayName: 'Alice Original',
            currency: 'INR',
            theme: 'light',
            language: 'en',
            accountStatus: 'active',
        }));
        const aliceRef = doc(adminDb(), 'users/alice');

        // Trying to change displayName along with accountStatus
        await assertFails(updateDoc(aliceRef, {
            accountStatus: 'suspended',
            displayName: 'Alice Tampered',
            updatedAt: serverTimestamp(),
        }));

        // Trying to change currency along with accountStatus
        await assertFails(updateDoc(aliceRef, {
            accountStatus: 'suspended',
            currency: 'USD',
            updatedAt: serverTimestamp(),
        }));

        // Trying to change theme along with accountStatus
        await assertFails(updateDoc(aliceRef, {
            accountStatus: 'suspended',
            theme: 'dark',
            updatedAt: serverTimestamp(),
        }));
    });
});