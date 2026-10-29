import { after, before, beforeEach, describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

const RULES_PATH = new URL('../../firestore.rules', import.meta.url);
const [emulatorHost, emulatorPort] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':');

const ALICE = { uid: 'alice', email: 'alice@example.com' };
const BOB = { uid: 'bob', email: 'bob@example.com' };

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

  it('rejects changing accountStatus', async () => {
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