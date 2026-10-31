# Firestore Security Rules

The rules file is `firestore.rules`. This page describes what the rules enforce. It is
not verified by this document. Test results are recorded in the Status section.

## Principles

1. Deny by default. A catch-all rule denies anything not explicitly allowed.
2. Owners only. Private data is accessible only when `request.auth.uid` matches the path.
3. Validate structure. Rules check allowed fields, types, ranges and timestamps.
4. No self-granted roles. Clients cannot set admin claims, roles or account status.
5. Administrators are identified by the `admin` custom claim (`isAdmin()`), set outside
   the app through the Firebase Admin SDK. Admins can read user profiles and change only
   `accountStatus` on other users. They have no access to transactions, budgets or
   recurring schedules.
6. Audit logs are server-only.

## Rules by collection

| Path | Read | Create | Update | Delete |
|---|---|---|---|---|
| `users/{uid}` | Owner, or admin | Owner only. Must be `active`. Email must equal the token email. | Owner: preferences only, `accountStatus` and `createdAt` locked. Admin: `accountStatus` only, on another user. | Never (`false`). |
| `users/{uid}/transactions/{id}` | Owner (also when suspended) | Active owner only | Active owner only | Active owner only |
| `users/{uid}/budgets/{id}` | Owner (also when suspended) | Active owner only | Active owner only | Active owner only |
| `users/{uid}/recurring/{id}` | Owner (also when suspended) | Active owner only | Active owner only, and `nextIndex` may not decrease | Active owner only |
| `users/{uid}/categories/{id}` | Owner | Owner (reserved, unused) | Owner (reserved, unused) | Owner (reserved, unused) |
| `categories/{id}` | Any signed-in user | Never | Never | Never |
| `auditLogs/{id}` | Never | Never | Never | Never |
| Everything else | Never | Never | Never | Never |

"Active owner" means `isActiveUser(userId)`: the signed-in uid matches the path and
`users/{uid}.accountStatus == 'active'`.

## Profile lifecycle

- A profile is created by the client only for the signed-in user, only as `active`, and
  only when no document exists. Creation happens during registration. An explicit
  "Finish setup" step covers a missing profile on a signed-in account. Login never
  creates a profile.
- A suspended account keeps its profile. The owner can still edit preferences (this is
  intentional). Only an administrator can change `accountStatus`, and the owner cannot
  set it back to `active`.

## Recurring schedule rules

- Suspended users cannot create, edit or delete schedules. They can read their own.
- Administrators have no access to recurring data.
- `nextIndex` may not decrease on update. This blocks replaying occurrences.

**Limitation:** `nextIndex` may still be increased by the owner. The rules cannot check
that the skipped occurrences were processed. Stopping this needs trusted processing
(a Cloud Function), which is not implemented. Impact is limited to the owner's own data.

## Known gaps

- Category existence is not checked by the rules. Category and type matching is also not
  checked. Both are deferred to a future module, pending a verified category migration.
- Future dates are rejected by the client, not by the rules.
- Budgets: the month key is enforced. A category budget's document ID must equal
  `monthKey_categoryId`, and a legacy overall budget's ID must equal its `monthKey`.

## Status

Not verified in this package. Record the result of `npm run test:rules` here after
running it on your machine: `<date> <passed> / <total>`.
