# Firestore Data Model

All private data lives under the owner's Firebase Auth UID. The UID comes from
`request.auth.uid`, never from a client field.

## Collections

| Path | Purpose | Document ID |
|---|---|---|
| `users/{uid}` | Profile and preferences | `uid` |
| `users/{uid}/transactions/{id}` | Income and expense records | Auto ID, or `{scheduleId}_{date}` for recurring occurrences |
| `users/{uid}/budgets/{id}` | Category budgets (`YYYY-MM_categoryId`) | Composite ID |
| `users/{uid}/recurring/{id}` | Recurring schedules | Auto ID |
| `users/{uid}/categories/{id}` | Personal categories (reserved, unused) | Auto ID |
| `categories/{id}` | Global categories, read-only to users | Slug |
| `auditLogs/{id}` | Server-only events | Auto ID |

## Fields

**users/{uid}**: `displayName` (1 to 80 characters), `email` (must equal the sign-in email),
`currency` (`INR`, `USD`, `EUR`, `GBP`), `theme` (`light`, `dark`, `system`), `language`
(`en`, optional), `accountStatus` (`active` or `suspended`), `createdAt`, `updatedAt`.

**transactions**: `type` (`income` or `expense`), `amountPaise` (positive integer, up to
1,000,000,000), `categoryId` (text up to 64 characters), `date` (`YYYY-MM-DD`),
`description` (1 to 200 characters), `createdAt`, `updatedAt`.

**budgets**: `monthKey` (`YYYY-MM`), `categoryId`, `limitPaise` (positive integer),
`createdAt`, `updatedAt`. The document ID must equal `monthKey_categoryId`.

**recurring**: `type`, `amountPaise`, `categoryId`, `description`, `frequency` (`daily`,
`weekly`, `monthly`, `yearly`), `startDate`, `endDate` (`null` or a date on or after the
start date), `status` (`active`, `paused`, `cancelled`), `nextIndex` (integer, zero or
more), `nextDate` (`null` or a date), `createdAt`, `updatedAt`.

## Recurring occurrences

Each due occurrence becomes a transaction with the document ID `{scheduleId}_{date}`.
The same occurrence therefore cannot be created twice. An existing occurrence document is
never overwritten. Processing runs in one Firestore transaction. If any occurrence fails
validation, nothing is written and `nextIndex` does not move.

## Money and timestamps

Amounts are integers in paise. Convert to rupees only for display.

Clients send `serverTimestamp()` for `createdAt` and `updatedAt`. The rules require the
value to equal `request.time`. `createdAt` cannot change after creation.

## Profile creation

The profile is created during registration, through `createProfileIfMissing`, using
the signed-in user's own uid and token email. A missing profile on login is reported,
not created. The user can then choose "Finish setup".

## Known gaps (deferred)

- Category existence and category/type matching are not enforced server-side. This needs
  a verified category migration first.
- Account deletion is not implemented.
- Personal categories are reserved and unused.
- Full-collection reads: dashboard, reports, budgets and the admin user list load all
  documents and filter in memory. Not paginated.
- No composite indexes are needed. Every current query is either a single-field `orderBy`
  or unfiltered. `firestore.indexes.json` stays empty until a filtered query is added.
