import { firebaseStatus } from '../../lib/firebase.js';

export default function FirebaseConfigNotice() {
    if (firebaseStatus.isConfigured) {
        return null;
    }

    return (
        <div className="demo-banner" role="note">
            <strong>Firebase is not configured.</strong> The app is showing demo data only, and nothing
            is saved. To connect, add these variables to a local .env.local file and restart the development server with npm run dev:{' '}
            {firebaseStatus.missing.join(', ')}.
        </div>
    );
}