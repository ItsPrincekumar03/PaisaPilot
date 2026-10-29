# Firebase Setup

## 1. Create the Firebase project (manual, in the browser)
1. Open https://console.firebase.google.com and create a project.
2. Project settings > General > Your apps > add a **Web app**. Copy the config values.
3. Authentication > Sign-in method: enable **Email/Password** (needed in Module 3).
4. Firestore Database > Create database. Choose a region and start in **production mode**.
   The rules in `firestore.rules` are the real protection. Deploy them before live use.

## 2. Configure local environment variables
1. Copy `.env.example` to `.env.local`.
2. Fill in `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_APP_ID`.
3. Leave `VITE_FIREBASE_USE_EMULATOR=false` for a real project.
4. Restart `npm run dev` after any change. Vite reads variables only at startup.

## About the Firebase web config
The values are public client identifiers. They tell the SDK which project to use and are not secret.
Authorization comes from Firestore Security Rules and Authentication, not from keeping these values hidden.
Never place Firebase Admin SDK credentials or service-account JSON in the frontend or in any `VITE_` variable.

## 3. Run the app
```powershell
npm install
npm run dev
```
If configuration is missing, the app shows a notice and continues to show demo data. Nothing is saved.

## 4. Firebase CLI (for rules and emulators)
```powershell
npx firebase login
npx firebase use --add   # select your project; writes .firebaserc
```
Do not run `firebase deploy` until Module 12 or until you have reviewed the rules.

## Verification status
- Firebase initialization: code written. Not yet tested against a real project.
- Live Firestore connection: not tested.
- Emulator setup: documented; not yet run.