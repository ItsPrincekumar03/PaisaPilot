import { after, before, beforeEach, describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

const RULES_PATH = new URL('../../firestore.rules', import.meta.url);
const [emulatorHost, emulatorPort] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':');

const ALICE = { uid: 'alice', email: 'alice@example.com' };
const BOB = { uid: 'bob', email: 'bob@example.com' };
const MAX_AMOUNT_PAISE = 1000000000;

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'paisapilot-transactions-rules-test',
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

async function seed(path, data) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), path), data);
  });
}

function txData(overrides = {}) {
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

const ALICE_TX = 'users/alice/transactions/t1';

describe('transaction create', () => {
  it('lets the owner create an expense', async () => {
    await assertSucceeds(setDoc(doc(dbFor(ALICE), 'users/alice/transactions/new1'), txData()));
  });

  it('lets the owner create an income', async () => {
    await assertSucceeds(
      setDoc(doc(dbFor(ALICE), 'users/alice/transactions/new2'), txData({ type: 'income', categoryId: 'salary' }))
    );
  });

  it('accepts the exact maximum amount', async () => {
    await assertSucceeds(
      setDoc(doc(dbFor(ALICE), 'users/alice/transactions/max'), txData({ amountPaise: MAX_AMOUNT_PAISE }))
    );
  });

  it('rejects an amount above the maximum', async () => {
    await assertFails(
      setDoc(doc(dbFor(ALICE), 'users/alice/transactions/over'), txData({ amountPaise: MAX_AMOUNT_PAISE + 1 }))
    );
  });

  it('rejects zero and negative amounts', async () => {
    await assertFails(setDoc(doc(dbFor(ALICE), 'users/alice/transactions/z'), txData({ amountPaise: 0 })));
    await assertFails(setDoc(doc(dbFor(ALICE), 'users/alice/transactions/n'), txData({ amountPaise: -100 })));
  });

  it('rejects a description longer than 200 characters', async () => {
    await assertFails(
      setDoc(doc(dbFor(ALICE), 'users/alice/transactions/long'), txData({ description: 'a'.repeat(201) }))
    );
  });

  it('rejects an ownerId or uid field supplied by the client', async () => {
    await assertFails(
      setDoc(doc(dbFor(ALICE), 'users/alice/transactions/spoof1'), txData({ ownerId: 'bob' }))
    );
    await assertFails(
      setDoc(doc(dbFor(ALICE), 'users/alice/transactions/spoof2'), txData({ uid: 'bob' }))
    );
  });

  it('rejects creating a transaction under another user', async () => {
    await assertFails(setDoc(doc(dbFor(ALICE), 'users/bob/transactions/t2'), txData()));
  });

  it('denies unauthenticated creation', async () => {
    await assertFails(setDoc(doc(dbFor(null), 'users/alice/transactions/anon'), txData()));
  });

  it('rejects a client-supplied createdAt value', async () => {
    await assertFails(
      setDoc(doc(dbFor(ALICE), 'users/alice/transactions/clientts'), txData({ createdAt: new Date() }))
    );
  });
});

describe('transaction read', () => {
  it('lets the owner read their own transaction', async () => {
    await seed(ALICE_TX, txData());
    await assertSucceeds(getDoc(doc(dbFor(ALICE), ALICE_TX)));
  });

  it('denies another user reading the transaction', async () => {
    await seed(ALICE_TX, txData());
    await assertFails(getDoc(doc(dbFor(BOB), ALICE_TX)));
  });

  it('denies unauthenticated reads', async () => {
    await seed(ALICE_TX, txData());
    await assertFails(getDoc(doc(dbFor(null), ALICE_TX)));
  });
});

describe('transaction update', () => {
  it('lets the owner change the description', async () => {
    await seed(ALICE_TX, txData());
    await assertSucceeds(
      updateDoc(doc(dbFor(ALICE), ALICE_TX), { description: 'Updated', updatedAt: serverTimestamp() })
    );
  });

  it('lets the owner change the amount to the maximum', async () => {
    await seed(ALICE_TX, txData());
    await assertSucceeds(
      updateDoc(doc(dbFor(ALICE), ALICE_TX), { amountPaise: MAX_AMOUNT_PAISE, updatedAt: serverTimestamp() })
    );
  });

  it('rejects an update that exceeds the maximum amount', async () => {
    await seed(ALICE_TX, txData());
    await assertFails(
      updateDoc(doc(dbFor(ALICE), ALICE_TX), { amountPaise: MAX_AMOUNT_PAISE + 1, updatedAt: serverTimestamp() })
    );
  });

  it('rejects changing createdAt', async () => {
    await seed(ALICE_TX, txData());
    await assertFails(
      updateDoc(doc(dbFor(ALICE), ALICE_TX), { createdAt: new Date(), updatedAt: serverTimestamp() })
    );
  });

  it('rejects adding an ownership field during update', async () => {
    await seed(ALICE_TX, txData());
    await assertFails(
      updateDoc(doc(dbFor(ALICE), ALICE_TX), { ownerId: 'bob', updatedAt: serverTimestamp() })
    );
  });

  it('denies another user updating the transaction', async () => {
    await seed(ALICE_TX, txData());
    await assertFails(
      updateDoc(doc(dbFor(BOB), ALICE_TX), { description: 'Hacked', updatedAt: serverTimestamp() })
    );
  });

  it('denies unauthenticated updates', async () => {
    await seed(ALICE_TX, txData());
    await assertFails(
      updateDoc(doc(dbFor(null), ALICE_TX), { description: 'Anon', updatedAt: serverTimestamp() })
    );
  });
});

describe('transaction delete', () => {
  it('lets the owner delete their transaction', async () => {
    await seed(ALICE_TX, txData());
    await assertSucceeds(deleteDoc(doc(dbFor(ALICE), ALICE_TX)));
  });

  it('denies another user deleting the transaction', async () => {
    await seed(ALICE_TX, txData());
    await assertFails(deleteDoc(doc(dbFor(BOB), ALICE_TX)));
  });

  it('denies unauthenticated deletion', async () => {
    await seed(ALICE_TX, txData());
    await assertFails(deleteDoc(doc(dbFor(null), ALICE_TX)));
  });
});