# Firebase Emulator Testing

## Requirements
- Node.js and npm (already used by the project)
- Java 11 or newer (`java -version`)
- Dev dependencies `@firebase/rules-unit-testing` and `firebase-tools`, installed after approval

## Run the rules tests
```powershell
npm run test:rules
```
This starts the Firestore emulator, runs `tests/security/firestore.rules.test.js`, and stops the emulator.

## Open the emulator UI (optional)
```powershell
npx firebase emulators:start --only auth,firestore
```
Then open http://127.0.0.1:4000.

## Local app against the emulators
Set `VITE_FIREBASE_USE_EMULATOR=true` in `.env.local`, start the emulators, then run `npm run dev`.
Use fake sample data only. Do not use real financial information with the emulators.

## What the tests cover
- Unauthenticated read and write denial
- Owner access to their own data
- Cross-user read, write, update, and delete denial
- Transaction, budget, and profile field validation
- Protection against self-assigned roles and status changes
- Denial of audit log writes and unspecified collections

## Status
Tests are written and **have not been run**. Do not treat the rules as verified until the test output is pasted and reviewed.