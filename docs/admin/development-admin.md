# Development administrator account

This document describes how to provision the PaisaPilot development administrator account securely.

## Requested development credentials

- Email: `admin@example.com`
- Password: `Myadmin@123`

These credentials are for local development only. They must never be committed, logged, or embedded in frontend source.

## Important limitation

PaisaPilot is currently a client-side Vite Single-Page Application with no trusted backend or server-side execution environment in this repository. Administrator access cannot and must not be established by client-side code or by matching an email address in frontend logic. Privileges must be granted exclusively via Firebase Authentication custom claims set by a trusted server-side process using the Firebase Admin SDK.

## Secure provisioning steps

1. Enable Email/Password authentication in the Firebase Console (`paisapilot-79e63`).
2. Create the administrator user in Firebase Authentication using the Firebase Console or an isolated administrative CLI script.
3. In a separate, secure environment outside this repository (or an untracked local Node script):
   - Install `firebase-admin`.
   - Initialize the Admin SDK with a private service-account key stored securely outside the repository and outside any `VITE_` environment variable.
4. Set the custom claim on the admin account using the Admin SDK:

   ```js
   import admin from 'firebase-admin';

   // Initialize admin with service account
   const user = await admin.auth().getUserByEmail('admin@example.com');
   await admin.auth().setCustomUserClaims(user.uid, { admin: true });
   ```

5. Never commit service-account keys or write admin credentials into repository source files.
6. Revoke or rotate the development credentials when they are no longer needed.

## Verifying admin authorization

1. **Client-side claim verification:**
   In the browser or client SDK, verify that the custom claim has been attached to the ID token:
   ```js
   const tokenResult = await auth.currentUser.getIdTokenResult(true);
   console.log('Admin claim active:', Boolean(tokenResult.claims.admin));
   ```
2. **Firestore security enforcement:**
   Firestore security rules strictly prevent privilege escalation:
   - Ordinary clients cannot assign themselves roles or change their status (`tests/security/firestore.rules.test.js` verifies `rejects a self-assigned role field`).
   - Audit logs (`/auditLogs/`) and global categories (`/categories/`) writes are completely denied to client tokens (`allow write: if false;`), ensuring only trusted Admin SDK processes can modify system data.

## What this frontend does

The frontend only authenticates users through Firebase Authentication. It does not create admin roles, modify custom claims, or bypass Firestore security rules. Any future admin features must verify trusted custom claims or server-side authorization before exposing privileged actions.

## Minimum permissions

Until an admin feature set exists, no additional permissions are granted. The account should have only the standard authenticated-user permissions already allowed by Firestore security rules.

## Remaining manual steps

1. In the Firebase Console for project `paisapilot-79e63`, navigate to **Authentication > Users**.
2. If `admin@example.com` is not yet created, create the user with the development password.
3. In a secure server or local administrative environment (outside client code), run the Admin SDK script to set `{ admin: true }` custom claim on the user's UID.
4. Have the administrator sign in via `/login` to receive an ID token containing the `admin` custom claim.
