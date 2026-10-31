# PaisaPilot 💰

### Smart Expense Tracking & Budget Insights

PaisaPilot is a personal finance management web application designed to help users track income and expenses, manage budgets, monitor spending habits, and understand their financial health through visual reports and insights.

🔗 **Live Demo:** <https://paisapilotapp.web.app/dashboard>
🌐 **Alternative Website:** <https://paisapilot-79e63.web.app>

---

## ✨ Features

- **Dashboard:** View financial summaries and key spending information.
- **Income & Expense Tracking:** Record and manage financial transactions.
- **Budget Management:** Create and monitor budgets to control spending.
- **Reports & Analytics:** Visualize financial activity using interactive charts.
- **Recurring Transactions:** Manage scheduled, repeating financial entries.
- **User Authentication:** Register, log in, and access a personal account.
- **Profile Management:** Manage personal profile information and preferences.
- **Admin Panel:** Access administrative functionality based on assigned permissions.
- **Data Export:** Export financial reports where supported by the application (CSV & PDF).
- **Secure Database Access:** Use Firebase Authentication and Cloud Firestore security rules to protect user data.
- **Responsive Interface:** Access the application on supported desktop and mobile browsers.

---

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| React | User interface |
| JavaScript (ES modules) | Application logic |
| Vite | Development server and production build |
| Firebase Authentication | User authentication |
| Cloud Firestore | Cloud database |
| React Router | Client-side navigation |
| Chart.js / react-chartjs-2 | Financial visualizations |
| jsPDF / jspdf-autotable | PDF export generation |
| PapaParse | CSV data processing & export |
| ESLint | Code quality checks |
| Firebase Emulator Suite | Local Firebase development and testing |

---

## 📋 Prerequisites

Before getting started, make sure you have:
- Node.js (v18 or higher recommended)
- npm
- Git
- A Firebase project (Cloud Firestore & Authentication enabled)

---

## 🚀 Getting Started

### 1. Clone the Repository
```powershell
git clone https://github.com/ItsPrincekumar03/PaisaPilot.git
cd PaisaPilot
```

### 2. Install Dependencies
```powershell
npm install
```

### 3. Configure Firebase Environment Variables
Create a `.env.local` file in the project root and configure the following variables using values from your Firebase web app:
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_FIREBASE_USE_EMULATOR=false
```
Replace the example values with your actual Firebase configuration.

> **Security Note:** Never commit `.env.local`, service-account credentials, private keys, or other secrets to GitHub.

### 4. Start the Development Server
```powershell
npm run dev
```
Open the local URL printed by Vite in your terminal.

### 5. Build for Production
```powershell
npm run build
```
The production files are generated in the `dist/` directory.

### 6. Preview the Production Build
```powershell
npm run preview
```
Open the local preview URL printed by Vite.

---

## 🧪 Testing and Code Quality

Run the available project checks:

```powershell
# Unit tests
node --test tests/unit/*.test.js

# Code quality
npm run lint

# Security rules test suite (requires Firebase Emulator Suite)
npm run test:rules
```

---

## 🔥 Firebase Configuration

Before deploying:
1. Configure the Firebase web app and environment variables.
2. Enable the authentication providers required by the application (Email/Password).
3. Configure authorized domains for the production website (`paisapilotapp.web.app`).
4. Review and test Firestore Security Rules.
5. Deploy the required Firestore indexes.
6. Verify that production builds do not connect to local emulators.
7. Configure Firebase Hosting or another compatible hosting provider.

Deploying to Firebase:
```powershell
# Deploy Firestore security rules
firebase deploy --only firestore:rules --project paisapilot-79e63

# Deploy Hosting (app target)
firebase deploy --only hosting:app --project paisapilot-79e63
```

---

## 📁 Project Structure

The application is organized into feature-based frontend modules:

```text
PaisaPilot/
├── docs/                      # Technical documentation & architecture reviews
├── src/
│   ├── app/                   # Navigation & route definitions
│   ├── components/            # Reusable UI components (budgets, charts, forms)
│   ├── features/              # Feature logic & state (auth, admin, profile, recurring)
│   ├── lib/                   # Firebase initialization & client helpers
│   ├── pages/                 # Route page components
│   ├── services/              # Firestore repositories & data services
│   ├── styles/                # Modular CSS styles
│   └── utils/                 # Calculation, formatting & export utilities
├── tests/
│   ├── security/              # Firestore rules emulator test suites
│   └── unit/                  # Business logic unit tests
├── public/                    # Static public assets
├── dist/                      # Generated production build
├── firebase.json              # Firebase Hosting, Firestore & Emulator setup
├── firestore.rules            # Cloud Firestore security rules
├── firestore.indexes.json     # Firestore composite indexes
├── package.json
├── vite.config.js
└── README.md
```

---

## 🔐 Security Notes

- Authentication and Firestore rules enforce access permissions independently of frontend route guards.
- Users can only access data they are authorized to view or modify (`isOwner(userId)`).
- Administrative permissions are verified through trusted Firebase custom claims (`token.admin == true`).
- Suspended accounts are prevented from creating, updating, or deleting financial records.
- Recurring transactions use atomic transactions with deterministic occurrence IDs to prevent duplicate entries.
- Never expose private credentials or commit local environment files.

---

## 🌐 Deployment

PaisaPilot is deployed as a static single-page application using Firebase Hosting:
- The production build uses `dist/` as its public directory.
- SPA rewrite rules route client-side application paths to `/index.html`.
- Content-hashed static assets in `/assets/**` are cached with 1-year immutable caching headers.

---

## 🗺️ Future Improvements

- More detailed spending insights and trend predictions.
- Enhanced budgeting recommendations and notifications.
- Additional report filters and multi-year comparisons.
- Improved accessibility and mobile usability.
- Trusted server-side Cloud Function execution for automated recurring transactions.

---

## 🤝 Contributing

Contributions and suggestions are welcome:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Make and test your changes.
4. Open a pull request describing your changes.

*Do not include secrets or unrelated generated files in contributions.*

---

## 📄 License

PaisaPilot is licensed under the **MIT License**.

You are permitted to use, copy, modify, merge, publish, distribute, sublicense, and sell copies of the software, subject to the conditions of the MIT License.

See the [LICENSE](LICENSE) file for the complete license terms.

---

## 👨‍💻 Author

**Prince Kumar**
GitHub: [@ItsPrincekumar03](https://github.com/ItsPrincekumar03)

---

## 🌟 Support

If you find PaisaPilot useful, consider starring the repository on GitHub and sharing suggestions for future improvements!

*PaisaPilot — Understand your spending. Manage your budget. Build better financial habits.*
```
