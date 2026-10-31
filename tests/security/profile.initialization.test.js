import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertFails, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import {
    createProfileIfMissing,
    readUserProfile,
} from '../../src/services/profile.service.js';

const RULES_PATH = new URL('../../firestore.rules', import.meta.url);

const [emulatorHost, emulatorPort] = (
    process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'
).split(':');

// Unique project ID so this file never clears data used by another suite.
const PROJECT_ID = 'paisapilot-profile-init-test';

const NEW_UID = 'newuser';
const EXISTING_UID = 'existing';
const SUSPENDED_UID = 'suspended';
const ADMIN_UID = 'admin-user';
const GHOST_UID = 'ghost';

const EMAIL = {
    [NEW_UID]: 'newuser@example.com',
    [EXISTING_UID]: 'existing@example.com',
    [SUSPENDED_UID]: 'suspended@example.com',
    [ADMIN_UID]: 'admin@example.com',
    [GHOST_UID]: 'ghost@example.com',
};

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

/** Firestore instance authenticated as uid, with the token email the rules compare against. */
function dbFor(uid, claims = {}) {
    return testEnv
        .authenticatedContext(uid, { email: EMAIL[uid], ...claims })
        .firestore();
}

async function seed(path, data) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), path), data);
    });
}

async function documentExists(path) {
    let exists = false;
    await testEnv.withSecurityRulesDisabled(async (context) => {
        exists = (await getDoc(doc(context.firestore(), path))).exists();
    });
    return exists;
}

function storedProfile(uid, overrides = {}) {
    return {
        displayName: 'Stored Name',
        email: EMAIL[uid],
        currency: 'USD',
        theme: 'dark',
        language: 'en',
        accountStatus: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...overrides,
    };
}

describe('registration: profile creation', () => {
    it('creates an active profile with a default name from the email', async () => {
        const result = await createProfileIfMissing(dbFor(NEW_UID), {
            uid: NEW_UID,
            email: EMAIL[NEW_UID],
            displayName: null,
        });

        assert.equal(result.ok, true);
        assert.equal(result.created, true);
        assert.equal(result.profile.accountStatus, 'active');

        const stored = (await readUserProfile(dbFor(NEW_UID), NEW_UID)).profile;
        assert.equal(stored.email, EMAIL[NEW_UID]);
        assert.equal(stored.displayName, 'newuser');
        assert.equal(stored.currency, 'INR');
        assert.equal(stored.theme, 'system');
        assert.equal(stored.language, 'en');
    });

    it('uses the account display name when one is present', async () => {
        await createProfileIfMissing(dbFor(NEW_UID), {
            uid: NEW_UID,
            email: EMAIL[NEW_UID],
            displayName: 'Priya Sharma',
        });

        const stored = (await readUserProfile(dbFor(NEW_UID), NEW_UID)).profile;
        assert.equal(stored.displayName, 'Priya Sharma');
    });

    it('is idempotent: a second call creates nothing and changes nothing', async () => {
        const user = { uid: NEW_UID, email: EMAIL[NEW_UID], displayName: null };
        const first = await createProfileIfMissing(dbFor(NEW_UID), user);
        assert.equal(first.created, true);
        const before = (await readUserProfile(dbFor(NEW_UID), NEW_UID)).profile;

        const second = await createProfileIfMissing(dbFor(NEW_UID), user);
        assert.equal(second.ok, true);
        assert.equal(second.created, false);

        const after = (await readUserProfile(dbFor(NEW_UID), NEW_UID)).profile;
        assert.equal(after.displayName, before.displayName);
        assert.equal(after.accountStatus, 'active');
    });

    it('denies creating a profile for a different user', async () => {
        const result = await createProfileIfMissing(dbFor(NEW_UID), {
            uid: EXISTING_UID,
            email: EMAIL[EXISTING_UID],
        });

        assert.equal(result.ok, false);
        assert.equal(result.code, 'profile/permission-denied');
        assert.equal(await documentExists(`users/${EXISTING_UID}`), false);
    });

    it('rejects a user record without an email, without touching the database', async () => {
        const result = await createProfileIfMissing(dbFor(NEW_UID), { uid: NEW_UID, email: '' });
        assert.equal(result.ok, false);
        assert.equal(result.code, 'profile/no-user');
    });
});

describe('normal login: existing profiles', () => {
    it('reads an active profile and leaves every field unchanged', async () => {
        await seed(`users/${EXISTING_UID}`, storedProfile(EXISTING_UID));

        const result = await readUserProfile(dbFor(EXISTING_UID), EXISTING_UID);

        assert.equal(result.ok, true);
        assert.equal(result.profile.displayName, 'Stored Name');
        assert.equal(result.profile.currency, 'USD');
        assert.equal(result.profile.accountStatus, 'active');

        const stored = (await readUserProfile(dbFor(EXISTING_UID), EXISTING_UID)).profile;
        assert.equal(stored.displayName, 'Stored Name');
    });

    it('createProfileIfMissing returns an existing profile without writing', async () => {
        await seed(`users/${EXISTING_UID}`, storedProfile(EXISTING_UID));

        const result = await createProfileIfMissing(dbFor(EXISTING_UID), {
            uid: EXISTING_UID,
            email: EMAIL[EXISTING_UID],
            displayName: 'Account Name',
        });

        assert.equal(result.ok, true);
        assert.equal(result.created, false);
        assert.equal(result.profile.displayName, 'Stored Name');
    });
});

describe('login with a missing profile: no automatic recreation', () => {
    it('reports not-found and does not create the document', async () => {
        const result = await readUserProfile(dbFor(NEW_UID), NEW_UID);

        assert.equal(result.ok, false);
        assert.equal(result.code, 'profile/not-found');
        assert.equal(await documentExists(`users/${NEW_UID}`), false);
    });

    it('creates the profile only when createProfileIfMissing is called explicitly', async () => {
        await readUserProfile(dbFor(NEW_UID), NEW_UID);
        assert.equal(await documentExists(`users/${NEW_UID}`), false);

        const result = await createProfileIfMissing(dbFor(NEW_UID), {
            uid: NEW_UID,
            email: EMAIL[NEW_UID],
        });
        assert.equal(result.created, true);
        assert.equal(await documentExists(`users/${NEW_UID}`), true);
    });
});

describe('suspended profiles', () => {
    it('reads a suspended profile without changing its status', async () => {
        await seed(
            `users/${SUSPENDED_UID}`,
            storedProfile(SUSPENDED_UID, { accountStatus: 'suspended', displayName: 'Held' })
        );

        const result = await readUserProfile(dbFor(SUSPENDED_UID), SUSPENDED_UID);
        assert.equal(result.ok, true);
        assert.equal(result.profile.accountStatus, 'suspended');
    });

    it('never reactivates a suspended profile through createProfileIfMissing', async () => {
        await seed(
            `users/${SUSPENDED_UID}`,
            storedProfile(SUSPENDED_UID, { accountStatus: 'suspended', displayName: 'Held' })
        );

        const result = await createProfileIfMissing(dbFor(SUSPENDED_UID), {
            uid: SUSPENDED_UID,
            email: EMAIL[SUSPENDED_UID],
        });

        assert.equal(result.ok, true);
        assert.equal(result.created, false);
        assert.equal(result.profile.accountStatus, 'suspended');

        const stored = (await readUserProfile(dbFor(SUSPENDED_UID), SUSPENDED_UID)).profile;
        assert.equal(stored.accountStatus, 'suspended');
        assert.equal(stored.displayName, 'Held');
    });

    it('denies a suspended user setting their own accountStatus back to active', async () => {
        await seed(
            `users/${SUSPENDED_UID}`,
            storedProfile(SUSPENDED_UID, { accountStatus: 'suspended' })
        );

        await assertFails(
            updateDoc(doc(dbFor(SUSPENDED_UID), 'users', SUSPENDED_UID), {
                accountStatus: 'active',
                updatedAt: serverTimestamp(),
            })
        );
    });
});

describe('administrator access to profiles', () => {
    it('lets an administrator read another user profile', async () => {
        await seed(`users/${EXISTING_UID}`, storedProfile(EXISTING_UID));

        const result = await readUserProfile(
            dbFor(ADMIN_UID, { admin: true }),
            EXISTING_UID
        );
        assert.equal(result.ok, true);
    });

    it('denies an administrator creating a missing profile for another user', async () => {
        const result = await createProfileIfMissing(dbFor(ADMIN_UID, { admin: true }), {
            uid: GHOST_UID,
            email: EMAIL[GHOST_UID],
        });

        assert.equal(result.ok, false);
        assert.equal(result.code, 'profile/permission-denied');
        assert.equal(await documentExists(`users/${GHOST_UID}`), false);
    });
});
