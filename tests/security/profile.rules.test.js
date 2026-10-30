import { after, before, beforeEach, describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

const RULES_PATH = new URL('../../firestore.rules', import.meta.url);
const [emulatorHost, emulatorPort] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':');

const ALICE = { uid: 'alice', email: 'alice@example.com' };
const BOB = { uid: 'bob', email: 'bob@example.com' };
const ADMIN = { uid: 'admin_user', email: 'admin@example.com', token: { admin: true } };

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'paisapilot-profile-rules-test',
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
  if (!user) {
    return testEnv.unauthenticatedContext().firestore();
  }
  const token = {
    email: user.email,
    ...(user.token || {}),
  };
  return testEnv.authenticatedContext(user.uid, token).firestore();
}

async function seed(path, data) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), path), data);
  });
}

function profileData(email, overrides = {}) {
  return {
    displayName: 'Alice',
    email,
    currency: 'INR',
    theme: 'system',
    language: 'en',
    accountStatus: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

function validTxData(overrides = {}) {
  return {
    type: 'expense',
    amountPaise: 50000,
    categoryId: 'food_dining',
    date: '2026-10-30',
    description: 'Groceries',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

function validBudgetData(overrides = {}) {
  return {
    monthKey: '2026-10',
    categoryId: 'food_dining',
    limitPaise: 1000000,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

function updateOwnProfile(changes) {
  return seed('users/alice', profileData(ALICE.email)).then(() =>
    updateDoc(doc(dbFor(ALICE), 'users/alice'), { ...changes, updatedAt: serverTimestamp() })
  );
}

describe('profile reads and creation', () => {
  it('lets the owner read their profile', async () => {
    await seed('users/alice', profileData(ALICE.email));
    await assertSucceeds(getDoc(doc(dbFor(ALICE), 'users/alice')));
  });

  it('denies unauthenticated reads', async () => {
    await seed('users/alice', profileData(ALICE.email));
    await assertFails(getDoc(doc(dbFor(null), 'users/alice')));
  });

  it('lets the owner create a profile with the default preferences', async () => {
    await assertSucceeds(setDoc(doc(dbFor(ALICE), 'users/alice'), profileData(ALICE.email)));
  });

  it('lets the owner create a profile without the optional language field', async () => {
    const data = profileData(ALICE.email);
    delete data.language;
    await assertSucceeds(setDoc(doc(dbFor(ALICE), 'users/alice'), data));
  });

  it('rejects creating another user profile', async () => {
    await assertFails(setDoc(doc(dbFor(ALICE), 'users/bob'), profileData(BOB.email)));
  });

  it('rejects creating a profile with an unsupported currency', async () => {
    await assertFails(
      setDoc(doc(dbFor(ALICE), 'users/alice'), profileData(ALICE.email, { currency: 'JPY' }))
    );
  });
});

describe('owner profile updates', () => {
  it('lets the owner update their display name', async () => {
    await assertSucceeds(updateOwnProfile({ displayName: 'Alice Kumar' }));
  });

  it('lets the owner save allowed currency, theme, and language values', async () => {
    await assertSucceeds(updateOwnProfile({ currency: 'USD', theme: 'dark', language: 'en' }));
  });

  it('rejects an unsupported currency', async () => {
    await assertFails(updateOwnProfile({ currency: 'JPY' }));
  });

  it('rejects an unsupported theme', async () => {
    await assertFails(updateOwnProfile({ theme: 'purple' }));
  });

  it('rejects an unsupported language', async () => {
    await assertFails(updateOwnProfile({ language: 'fr' }));
  });

  it('rejects an empty display name', async () => {
    await assertFails(updateOwnProfile({ displayName: '' }));
  });

  it('rejects a display name longer than 80 characters', async () => {
    await assertFails(updateOwnProfile({ displayName: 'a'.repeat(81) }));
  });
});

describe('privileged and protected fields', () => {
  it('rejects a self-assigned role field', async () => {
    await assertFails(updateOwnProfile({ role: 'admin' }));
  });

  it('rejects an admin flag', async () => {
    await assertFails(updateOwnProfile({ isAdmin: true }));
  });

  it('rejects changing accountStatus by normal user', async () => {
    await assertFails(updateOwnProfile({ accountStatus: 'suspended' }));
  });

  it('rejects changing the email address', async () => {
    await assertFails(updateOwnProfile({ email: 'someone-else@example.com' }));
  });

  it('rejects changing createdAt', async () => {
    await assertFails(updateOwnProfile({ createdAt: new Date() }));
  });
});

describe('cross-user profile isolation', () => {
  it('denies Alice reading Bob profile', async () => {
    await seed('users/bob', profileData(BOB.email));
    await assertFails(getDoc(doc(dbFor(ALICE), 'users/bob')));
  });

  it('denies Alice updating Bob profile', async () => {
    await seed('users/bob', profileData(BOB.email));
    await assertFails(
      updateDoc(doc(dbFor(ALICE), 'users/bob'), { displayName: 'Hacked', updatedAt: serverTimestamp() })
    );
  });

  it('denies profile deletion by the owner', async () => {
    await seed('users/alice', profileData(ALICE.email));
    await assertFails(deleteDoc(doc(dbFor(ALICE), 'users/alice')));
  });
});

describe('admin privileges and account suspension', () => {
  it('allows an admin to read any user profile', async () => {
    await seed('users/alice', profileData(ALICE.email));
    await assertSucceeds(getDoc(doc(dbFor(ADMIN), 'users/alice')));
  });

  it('allows an admin to suspend a user account', async () => {
    await seed('users/alice', profileData(ALICE.email, { accountStatus: 'active' }));
    await assertSucceeds(
      updateDoc(doc(dbFor(ADMIN), 'users/alice'), {
        accountStatus: 'suspended',
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('allows an admin to restore a suspended user account', async () => {
    await seed('users/alice', profileData(ALICE.email, { accountStatus: 'suspended' }));
    await assertSucceeds(
      updateDoc(doc(dbFor(ADMIN), 'users/alice'), {
        accountStatus: 'active',
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('rejects an admin setting an invalid account status', async () => {
    await seed('users/alice', profileData(ALICE.email, { accountStatus: 'active' }));
    await assertFails(
      updateDoc(doc(dbFor(ADMIN), 'users/alice'), {
        accountStatus: 'banned',
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('prevents an admin from suspending their own account (self-lockout prevention)', async () => {
    await seed('users/admin_user', profileData(ADMIN.email, { accountStatus: 'active' }));
    await assertFails(
      updateDoc(doc(dbFor(ADMIN), 'users/admin_user'), {
        accountStatus: 'suspended',
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('prevents non-admin user Bob from suspending Alice', async () => {
    await seed('users/alice', profileData(ALICE.email, { accountStatus: 'active' }));
    await assertFails(
      updateDoc(doc(dbFor(BOB), 'users/alice'), {
        accountStatus: 'suspended',
        updatedAt: serverTimestamp(),
      })
    );
  });
});

describe('suspended-user write restrictions on transactions and budgets', () => {
  it('allows an active user to create and update a transaction', async () => {
    await seed('users/alice', profileData(ALICE.email, { accountStatus: 'active' }));
    const txRef = doc(dbFor(ALICE), 'users/alice/transactions/tx_1');
    await assertSucceeds(setDoc(txRef, validTxData()));
    await assertSucceeds(
      updateDoc(txRef, {
        description: 'Updated Groceries',
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('denies a suspended user creating a transaction', async () => {
    await seed('users/alice', profileData(ALICE.email, { accountStatus: 'suspended' }));
    const txRef = doc(dbFor(ALICE), 'users/alice/transactions/tx_1');
    await assertFails(setDoc(txRef, validTxData()));
  });

  it('denies a suspended user updating a transaction', async () => {
    await seed('users/alice', profileData(ALICE.email, { accountStatus: 'suspended' }));
    await seed('users/alice/transactions/tx_1', validTxData());
    const txRef = doc(dbFor(ALICE), 'users/alice/transactions/tx_1');
    await assertFails(
      updateDoc(txRef, {
        description: 'Hacked Groceries',
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('allows an active user to create and update a budget', async () => {
    await seed('users/alice', profileData(ALICE.email, { accountStatus: 'active' }));
    const budgetRef = doc(dbFor(ALICE), 'users/alice/budgets/2026-10_food_dining');
    await assertSucceeds(setDoc(budgetRef, validBudgetData()));
    await assertSucceeds(
      updateDoc(budgetRef, {
        limitPaise: 1200000,
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('denies a suspended user creating a budget', async () => {
    await seed('users/alice', profileData(ALICE.email, { accountStatus: 'suspended' }));
    const budgetRef = doc(dbFor(ALICE), 'users/alice/budgets/2026-10_food_dining');
    await assertFails(setDoc(budgetRef, validBudgetData()));
  });

  it('denies a suspended user updating a budget', async () => {
    await seed('users/alice', profileData(ALICE.email, { accountStatus: 'suspended' }));
    await seed('users/alice/budgets/2026-10_food_dining', validBudgetData());
    const budgetRef = doc(dbFor(ALICE), 'users/alice/budgets/2026-10_food_dining');
    await assertFails(
      updateDoc(budgetRef, {
        limitPaise: 1500000,
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('denies transaction creation when user profile does not exist', async () => {
    const txRef = doc(dbFor(ALICE), 'users/alice/transactions/tx_1');
    await assertFails(setDoc(txRef, validTxData()));
  });

  it('denies transaction creation when profile has missing accountStatus', async () => {
    const brokenProfile = profileData(ALICE.email);
    delete brokenProfile.accountStatus;
    await seed('users/alice', brokenProfile);
    const txRef = doc(dbFor(ALICE), 'users/alice/transactions/tx_1');
    await assertFails(setDoc(txRef, validTxData()));
  });

  it('permits a suspended user to read existing transactions and budgets', async () => {
    await seed('users/alice', profileData(ALICE.email, { accountStatus: 'suspended' }));
    await seed('users/alice/transactions/tx_1', validTxData());
    await seed('users/alice/budgets/2026-10_food_dining', validBudgetData());

    await assertSucceeds(getDoc(doc(dbFor(ALICE), 'users/alice/transactions/tx_1')));
    await assertSucceeds(getDoc(doc(dbFor(ALICE), 'users/alice/budgets/2026-10_food_dining')));
  });
});
