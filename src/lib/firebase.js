import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

/** Maps internal config keys to the Vite environment variable names. */
const REQUIRED_ENV = {
    apiKey: 'VITE_FIREBASE_API_KEY',
    authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
    projectId: 'VITE_FIREBASE_PROJECT_ID',
    appId: 'VITE_FIREBASE_APP_ID',
};

const EMULATOR_AUTH_URL = 'http://127.0.0.1:9099';
const EMULATOR_FIRESTORE_HOST = '127.0.0.1';
const EMULATOR_FIRESTORE_PORT = 8080;

/**
 * Reads and validates the Firebase web configuration.
 * Returns variable NAMES that are missing, never their values, so nothing sensitive is exposed.
 */
export function getFirebaseConfigStatus(env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {}) {
    const config = {};
    const missing = [];

    for (const [configKey, envName] of Object.entries(REQUIRED_ENV)) {
        const raw = env[envName];
        const value = typeof raw === 'string' ? raw.trim() : '';

        if (!value || value.startsWith('your-')) {
            missing.push(envName);
        }
        config[configKey] = value;
    }

    return { isConfigured: missing.length === 0, missing, config };
}

export const firebaseStatus = getFirebaseConfigStatus();

// Services are null until configuration is valid. Callers must check firebaseStatus.isConfigured.
let app = null;
let auth = null;
let db = null;

if (firebaseStatus.isConfigured) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseStatus.config);
    auth = getAuth(app);
    db = getFirestore(app);

    if (import.meta.env?.VITE_FIREBASE_USE_EMULATOR === 'true') {
        connectAuthEmulator(auth, EMULATOR_AUTH_URL, { disableWarnings: true });
        connectFirestoreEmulator(db, EMULATOR_FIRESTORE_HOST, EMULATOR_FIRESTORE_PORT);
    }
}

export { app, auth, db };