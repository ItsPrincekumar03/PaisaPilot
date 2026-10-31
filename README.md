# PaisaPilot

**PaisaPilot** is a personal finance and expense-tracking web application built with React, JavaScript, Vite, Firebase Authentication, and Cloud Firestore. It helps users record income and expenses, manage budgets, review financial reports, and automate recurring transactions.

## Live application

- **Primary website:** <https://paisapilot-79e63.web.app>
- **Additional website:** <https://paisapilotapp.web.app>
- **GitHub repository:** <https://github.com/ItsPrincekumar03/PaisaPilot>

Both websites are Firebase Hosting sites associated with the same Firebase project, `paisapilot-79e63`.

## Features

- **Authentication and profiles:** User registration, login, profile management, and profile initialization.
- **Transactions:** Record and manage income and expenses.
- **Dashboard:** Review financial summaries and transaction activity.
- **Budgets:** Create and manage monthly and category-based budgets.
- **Reports and analytics:** Visualize financial activity and export reports where supported by the application.
- **Recurring transactions:** Create, edit, pause, resume, and process recurring schedules, with deterministic occurrence IDs to help prevent duplicates.
- **Administration:** Admin tools for user management and account suspension, protected by Firebase custom claims and Firestore rules.
- **Responsive interface:** React-based application with lazy-loaded Reports and Admin routes.

## Technology stack

| Area | Technology |
|---|---|
| Frontend | React, JavaScript (ES modules) |
| Build tool | Vite |
| Authentication | Firebase Authentication |
| Database | Cloud Firestore |
| Authorization | Firestore Security Rules and Firebase custom claims |
| Charts | Chart.js |
| PDF export | jsPDF |
| CSV processing/export | PapaParse |
| Hosting | Firebase Hosting |
| Testing | Node.js test runner, Firebase Emulator and rules-unit-testing |

## Project setup

### Prerequisites

Install the following before starting:

- Node.js and npm
- Git
- Firebase CLI
- Java runtime if you plan to run the Firebase Emulator test suites

### 1. Clone the repository

```powershell
git clone https://github.com/ItsPrincekumar03/PaisaPilot.git
cd PaisaPilot
```

### 2. Install dependencies

```powershell
npm ci
```

### 3. Configure Firebase environment variables

Create a local environment file using the repository's example:

```powershell
Copy-Item .env.example .env.local
```

Open `.env.local` and fill in the variable names and values documented in `.env.example` using the Firebase web app configuration for the `paisapilot-79e63` project.

Do not copy service-account credentials or Firebase Admin SDK private keys into frontend environment variables. Never commit `.env.local` or other files containing secrets.

### 4. Start the development server

```powershell
npm run dev
```

Use the local URL printed by Vite in the terminal.

## Production build and local preview

Create an optimized production build:

```powershell
npm run build
```

Preview the generated build locally:

```powershell
npm run preview
```

The generated static site is written to `dist/`.

## Testing and quality checks

Run the unit tests:

```powershell
node --test tests/unit/*.test.js
```

Run all configured Firebase security and emulator suites:

```powershell
npm run test:rules
```

Run linting:

```powershell
npm run lint
```

Build the production application:

```powershell
npm run build
```

The Firebase Emulator test command requires the Firebase CLI and a working Java runtime. Consult the Firebase Emulator documentation and the project's `firebase.json` for the configured emulator ports.

## Firebase configuration

The repository is configured for Firebase project:

```text
paisapilot-79e63
```

The Firebase configuration files include:

- `.firebaserc` — Firebase project selection and Hosting target mappings.
- `firebase.json` — Hosting, Firestore and Emulator configuration.
- `firestore.rules` — Firestore security rules.
- `firestore.indexes.json` — Firestore index configuration.

### Multiple Firebase Hosting sites

The project has two Hosting targets that serve the Vite production output in `dist/`:

| Target | Site ID | URL |
|---|---|---|
| `main` | `paisapilot-79e63` | <https://paisapilot-79e63.web.app> |
| `app` | `paisapilotapp` | <https://paisapilotapp.web.app> |

Deploy only the additional `app` website:

```powershell
npm run build
firebase deploy --only hosting:app --project paisapilot-79e63
```

Deploy only the original `main` website:

```powershell
npm run build
firebase deploy --only hosting:main --project paisapilot-79e63
```

These commands deploy Hosting only. They do not deploy Firestore rules or indexes.

### Firestore rules deployment

Deploying security rules changes production access control. Review the local `firestore.rules`, compare it with the currently deployed rules, and run the relevant Emulator tests before deployment. Only an authorized maintainer should run:

```powershell
firebase deploy --only firestore:rules --project paisapilot-79e63
```

Do not run a broad `firebase deploy` unless every configured Firebase resource is intentionally included in the release.

> **Production rules status:** The reported deployment of `paisapilotapp.web.app` deployed Hosting only. That Hosting deployment did not publish the Module 12 Firestore rules. Verify the current production rules in the Firebase Console before assuming they match the repository.

## Security notes

- User data is organized under user-owned Firestore paths and protected by ownership checks.
- Admin privileges are based on Firebase Authentication custom claims, not client-side UI checks alone.
- Suspended users are restricted from creating, updating, or deleting recurring schedules under the Module 12 rules.
- Owners can still increase `nextIndex`; the current monotonicity rule prevents decreasing it but does not prove that every advancement corresponds to processed occurrences.
- Category existence and transaction/category type matching are not currently enforced server-side; this work was deferred.
- Never expose service-account credentials or private keys in frontend code, `VITE_` variables, source control, or client bundles.

## Known limitations and future work

- Full-collection reads in some dashboard, reporting, budget, and admin flows may need pagination or query optimization as usage grows.
- Server-side category existence and category/type validation remain future work.
- Stronger protection against arbitrary forward changes to recurring `nextIndex` would require a trusted processing design, such as a suitably secured backend or Cloud Function.
- Processing errors are not yet surfaced through a dedicated user-facing interface in all cases.

## Contributing and Git workflow

The Module 12 work was developed on the `feature/module-12` branch. Review the current branch and working tree before making changes:

```powershell
git branch --show-current
git status --short --branch
git log -1 --oneline
```

Use a feature branch for changes and run the tests before opening a pull request. Do not commit local environment files, credentials, generated secrets, or unrelated local artifacts.

## Documentation

Additional project documentation is available under `docs/`, including database setup, Firestore data model, security rules, testing, and administration information.

---

**PaisaPilot** — personal finance tracking with Firebase-backed data and reporting.
