# Firebase Setup

## 1. Create the Firebase project (in the browser)

1. Open the Firebase console and create a project.
2. Project settings > General > Your apps > add a Web app. Copy the config values.
3. Authentication > Sign-in method: enable Email/Password.
4. Firestore Database > Create database. Choose a region and start in production mode.
5. Deploy the rules only after the verification steps in section 5 pass, and only with
   authorization.

## 2. Local environment variables

1. Copy `.env.example` to `.env.local`.
2. Fill in `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`
   and `VITE_FIREBASE_APP_ID`.
3. Leave `VITE_FIREBASE_USE_EMULATOR=false` for a real project. Set it to `true` only when
   the emulators are running.
4. Restart `npm run dev` after any change. Vite reads variables only at startup.

If configuration is missing, the app shows a notice. Accounts and saving are then
unavailable, and demo data is shown.

## About the web configuration

The values are public client identifiers. They are not secrets. Security comes from
Firestore Security Rules and Authentication.

Never place Firebase Admin SDK credentials or service-account JSON in the frontend, in
any `VITE_` variable, or in the repository. `.env`, `.env.local` and `.env.*.local` are
excluded by `.gitignore`. Check with:

```powershell
git check-ignore -v .env.local
git ls-files | Select-String "env"
```

The second command should list only `.env.example`.

## 3. Run the app

```powershell
npm install
npm run dev
```

## 4. Emulators and rule tests

```powershell
npx firebase login
npx firebase use --add
```

Run the full security suite (requires Java and the Firebase CLI):

```powershell
npm run test:rules
```

This runs the Firestore rules, profile, transaction, recurring rules, recurring processing
and profile initialization suites, one at a time.

## 5. Verification before any deployment

Run these locally and record the results in the docs before asking for deployment
authorization:

```powershell
node --test tests/unit/*.test.js
npm run lint
npm run build
npm run test:rules
```

## 6. Deployment (authorization required, not performed)

Do not run these commands without written authorization from the project owner. They
change the live project `paisapilot-79e63`.

```powershell
npx firebase deploy --only firestore:rules --project paisapilot-79e63
```

This deploys only the Firestore rules. It does not change indexes or hosting.
Production deployment has NOT been performed for this package.

## Verification status

- Unit tests, lint, build, and rule tests: not run in this package. Record actual results
  in section 5 above.
- Live Firestore connection: not tested.
- Emulator run: not verified in this package.
