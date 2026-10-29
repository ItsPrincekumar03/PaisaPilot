# Firestore Data Model

All private data lives under the owner's Firebase Auth UID. The UID comes from `request.auth.uid`, never from a client field.

## Collections

| Path | Purpose | Document ID |
|---|---|---|
| `users/{uid}` | Profile and preferences | `uid` |
| `users/{uid}/transactions/{id}` | Income and expense records | auto ID |
| `users/{uid}/budgets/{YYYY-MM}` | One overall budget per month | `2026-10` |
| `users/{uid}/categories/{id}` | Personal categories (reserved) | auto ID |
| `categories/{id}` | Global categories, read-only to users | slug |
| `auditLogs/{id}` | Trusted backend events only | auto ID |

## Fields

**users/{uid}**: `displayName` (string, max 80), `email` (must match sign-in email), `currency` (`"INR"`), `theme` (`light`, `dark`, or `system`), `accountStatus` (`active`, set by trusted code only), `createdAt`, `updatedAt`.

**transactions**: `type` (`income` or `expense`), `amountPaise` (positive integer), `categoryId` (string, max 64), `date` (`YYYY-MM-DD`), `description` (1 to 200 characters), `createdAt`, `updatedAt`.

**budgets**: `monthKey` (must equal the document ID), `limitPaise` (positive integer), `createdAt`, `updatedAt`.

**categories**: `name`, `type`, `color` (`#RRGGBB`), `icon`, `active` (boolean), `createdAt`, `updatedAt`.

## Money rules
Amounts are integers in paise. Convert to rupees only for display (`src/utils/currency.js`).

## Timestamps
Clients send `serverTimestamp()` for `createdAt` and `updatedAt`. The rules require the value to equal `request.time`.

## Known gaps (deferred)
- The rules do not check that `categoryId` exists or that its type matches the transaction. This needs a `get()` lookup, which Module 5 will add when real categories exist.
- Transaction queries by date and type will need composite indexes in Module 5.
- Account deletion must remove subcollections through trusted code. Module 3 or 10 will implement this.
## User profile (Module 4)

Document: users/{uid}, where uid is the signed-in Firebase Auth UID.

| Field | Type | Who writes it | Notes |
|---|---|---|---|
| displayName | string, 1 to 80 characters | user | Trimmed before save |
| email | string | created from Auth | Must equal the sign-in email. Read-only in the app |
| currency | INR, USD, EUR, GBP | user | Display preference only. Stored amounts are never converted |
| theme | light, dark, system | user | Saved only. Not applied yet |
| language | en (optional) | user | Saved only. Only English exists |
| accountStatus | ctive | created by the app as ctive, locked after creation | Suspension enforcement is planned for Module 10 |
| createdAt | timestamp | server | Locked after creation |
| updatedAt | timestamp | server | Required on every write |

Not stored: passwords, tokens, roles, admin flags, photo URLs, or any transaction or budget data.

Profile creation: ensureUserProfile runs when the user first opens /profile. It uses a transaction so the document is created only once.

Limitations: currency conversion, global theme switching, and full localization are not implemented.
