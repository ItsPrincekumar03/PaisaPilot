# Firestore Security Rules

## Principles
1. Deny by default. A catch-all rule denies everything not explicitly allowed.
2. Owners only. Private data is accessible only when `request.auth.uid` matches the path.
3. Validate structure. Rules check allowed fields, types, ranges, and timestamps.
4. No self-granted roles. The rules reject `role`, `admin`, and status changes from clients.
5. Admin access is denied for now. Admin functions must run in trusted code (Cloud Functions or the Firebase Admin SDK on a server). Those bypass these rules, so they must check authorization themselves. Module 3 defines this.
6. Audit logs are server-only.

## What the rules do not yet do
- They do not verify that a category exists.
- They do not enforce a transaction-type and category-type match.
- They do not block a user from writing a budget for any month key other than the document ID.

## Status
The rules are written. They are **not verified** until `npm run test:rules` passes against the Firestore emulator.