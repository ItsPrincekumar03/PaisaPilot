# Module 10: Admin Tools & Account Suspension

This document describes the architecture, authorization model, security boundaries, and operational procedures for PaisaPilot Module 10: **Admin Tools & Account Suspension**.

---

## 1. Architecture Overview

PaisaPilot is a client-side Single-Page Application (SPA) built with Vite, React, and Firebase.
Because the client cannot be trusted as an authorization boundary, administrative privileges rely on two complementary security tiers:

1. **Firebase Authentication Custom Claims (`token.admin == true`)**:
   - Out-of-band provisioning via Firebase Admin SDK.
   - Client inspection (`getIdTokenResult(true)`) strictly for UI routing and presentation state.
2. **Cloud Firestore Security Rules Enforcement**:
   - The authoritative enforcement layer for all reads and mutations.
   - Evaluates `request.auth.token.admin == true` on incoming Firestore operations.

```
+----------------------------------------------------------------------------+
|                          Client SPA (React + Vite)                         |
|                                                                            |
|  [AdminRoute] ---- checks claims via useIsAdmin()                          |
|         │                                                                  |
|         ▼                                                                  |
|  [AdminPage] (Dashboard)                                                   |
|    - User Listing & Search                                                 |
|    - Metrics (Total, Active, Suspended)                                    |
|    - Suspension / Restoration Modal                                        |
|    - Self-Lockout Prevention UI (Protected)                                |
|         │                                                                  |
|         ▼                                                                  |
|  [adminService.js] & [adminValidation.js]                                  |
+----------------------------------------------------------------------------+
                                      │
                                      │ (Firestore API)
                                      ▼
+----------------------------------------------------------------------------+
|                        Cloud Firestore Security Rules                      |
|                                                                            |
|  /users/{userId}                                                           |
|    - Read:   isOwner(userId) || isAdmin()                                  |
|    - Update:                                                               |
|        (Owner: Safe preference changes, accountStatus immutable)           |
|        OR                                                                  |
|        (Admin: request.auth.uid != userId && accountStatus in ['active',   |
|                'suspended'])                                               |
+----------------------------------------------------------------------------+
```

---

## 2. Authorization & Claims Model

### Out-of-Band Admin Provisioning

Administrator accounts cannot be self-declared or granted from the client. To promote an account to administrator:

1. Create or identify the user in Firebase Authentication (`admin@example.com`).
2. Run an isolated, backend administrative script using `firebase-admin` with a service account key kept outside the repository:

```javascript
import admin from 'firebase-admin';

// Initialize admin with credentials stored outside repo (e.g. C:\secrets\paisapilot-admin.json)
const user = await admin.auth().getUserByEmail('admin@example.com');
await admin.auth().setCustomUserClaims(user.uid, { admin: true });
console.log(`Granted admin claim to ${user.email} (${user.uid})`);
```

3. When the user signs in or refreshes their token (`getIdTokenResult(true)`), `token.claims.admin === true` is recognized.

---

## 3. Account Suspension Semantics

### Status Model
User profiles in `/users/{userId}` support two verified statuses:
- `'active'`: Full standard user access to expenses, categories, and budgets.
- `'suspended'`: Account flagged by an administrator.

### Rules & Constraints
1. **Self-Lockout Prevention**:
   - An administrator cannot suspend, restore, or modify their own account status (`request.auth.uid != userId` in rules, and validated in `adminValidation.js`).
2. **Owner Status Immutability**:
   - Standard users cannot alter their own `accountStatus` or elevate privileges (enforced in `firestore.rules`).
3. **Timestamp Integrity**:
   - `createdAt` is immutable across updates.
   - `updatedAt` is tied to `request.time`.

---

## 4. UI Implementation Details

- **Route Protection**: `/admin` is guarded by `AdminRoute`, which inspects refreshed authentication claims. Non-admins are redirected safely to `/dashboard`.
- **Admin Dashboard (`src/pages/admin/AdminPage.jsx`)**:
  - Displays registered accounts summary: Total accounts, Active accounts, Suspended accounts.
  - Search filter by Name, Email, or UID.
  - Status filter buttons: All, Active, Suspended.
  - Status transition modal requiring explicit confirmation.
  - Action button disables with "Protected (Self)" for the currently signed-in administrator.
  - Inline alerts for success and error handling.

---

## 5. Verification & Testing

### Unit Tests
Pure validation logic is tested in `tests/unit/admin.pure.test.js`:
- `hasAdminClaim`: validates boolean true, rejects truthy strings, numbers, or empty claims.
- `isValidAccountStatus`: verifies allowed statuses (`active`, `suspended`).
- `canTransitionStatus`: validates status changes, disallows no-op transitions.
- `validateSuspensionAction`: enforces admin identity, target identity, and self-suspension rejection.

Run unit tests:
```powershell
node --test tests/unit/admin.pure.test.js
```

### Security Rules Tests
Rules are tested against the Firebase Local Emulator in `tests/security/profile.rules.test.js` and `tests/security/firestore.rules.test.js`:
- Allows admin token (`admin: true`) to read any user profile.
- Allows admin token to suspend an active user.
- Allows admin token to restore a suspended user.
- Rejects admin setting invalid status (e.g., `'banned'`).
- Enforces self-lockout prevention (admin suspending themselves is denied).
- Denies non-admin users from reading other profiles or updating `accountStatus`.

Run security tests:
```powershell
npm run test:rules
npx firebase emulators:exec --only firestore "node --test tests/security/profile.rules.test.js"
```
