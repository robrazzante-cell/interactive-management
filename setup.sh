#!/bin/bash
# ============================================================
#  Interactive Management Platform — Quick Setup
#  This script automates Firebase project setup and deployment.
#  Run: bash setup.sh
# ============================================================

set -e

echo ""
echo "========================================"
echo "  Interactive Management Platform Setup"
echo "========================================"
echo ""

# --- Check prerequisites ---
echo "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "  ❌ Node.js not found. Install it from https://nodejs.org/"
    exit 1
fi
echo "  ✅ Node.js $(node -v)"

if ! command -v npx &> /dev/null; then
    echo "  ❌ npx not found. Install Node.js from https://nodejs.org/"
    exit 1
fi

# Install Firebase CLI if needed
if ! command -v firebase &> /dev/null; then
    echo "  📦 Installing Firebase CLI..."
    npm install -g firebase-tools
fi
echo "  ✅ Firebase CLI $(firebase --version)"

echo ""

# --- Firebase login ---
echo "Step 1: Firebase Authentication"
echo "  A browser window will open. Sign in with your Google account."
echo ""
firebase login

echo ""
echo "  ✅ Logged in to Firebase"

# --- Create or select Firebase project ---
echo ""
echo "========================================"
echo "  Step 2: Firebase Project"
echo "========================================"
echo ""
echo "  You need a Firebase project. You can create a new one or use an existing one."
echo ""

read -p "  Create a NEW project? (y/n): " -n 1 -r CREATE_PROJECT
echo ""

if [[ $CREATE_PROJECT =~ ^[Yy]$ ]]; then
    echo ""
    read -p "  Enter a project ID (lowercase, hyphens ok, e.g., my-ism-platform): " PROJECT_ID
    echo ""
    echo "  Creating Firebase project: $PROJECT_ID ..."
    firebase projects:create "$PROJECT_ID" --display-name "Interactive Management Platform" || {
        echo "  ⚠️  Project creation failed. It may already exist or the ID is taken."
        echo "  Try a different project ID or use an existing project."
        read -p "  Enter your existing project ID: " PROJECT_ID
    }
else
    echo ""
    echo "  Your existing Firebase projects:"
    firebase projects:list
    echo ""
    read -p "  Enter your project ID: " PROJECT_ID
fi

echo ""
echo "  ✅ Using project: $PROJECT_ID"

# --- Link project ---
echo ""
echo "  Linking project to this directory..."
firebase use "$PROJECT_ID"

# --- Enable services ---
echo ""
echo "========================================"
echo "  Step 3: Enable Firebase Services"
echo "========================================"
echo ""
echo "  ⚠️  You need to manually enable these in the Firebase console:"
echo ""
echo "  1. Go to: https://console.firebase.google.com/project/$PROJECT_ID/firestore"
echo "     → Click 'Create database' → Select 'Start in test mode' → Choose a location → Click 'Enable'"
echo ""
echo "  2. Go to: https://console.firebase.google.com/project/$PROJECT_ID/authentication"
echo "     → Click 'Get started' → Enable 'Email/Password' → Enable 'Anonymous'"
echo ""
read -p "  Press Enter once you've done both steps..."

# --- Get Firebase config ---
echo ""
echo "========================================"
echo "  Step 4: Firebase Configuration"
echo "========================================"
echo ""
echo "  Go to: https://console.firebase.google.com/project/$PROJECT_ID/settings/general"
echo "  Scroll to 'Your apps' → Click the web icon (</>) → Register app → Copy the config values"
echo ""

read -p "  Paste your apiKey: " API_KEY
read -p "  Paste your authDomain (or press Enter for $PROJECT_ID.firebaseapp.com): " AUTH_DOMAIN
AUTH_DOMAIN=${AUTH_DOMAIN:-"$PROJECT_ID.firebaseapp.com"}
read -p "  Paste your storageBucket (or press Enter for $PROJECT_ID.firebasestorage.app): " STORAGE_BUCKET
STORAGE_BUCKET=${STORAGE_BUCKET:-"$PROJECT_ID.firebasestorage.app"}
read -p "  Paste your messagingSenderId: " SENDER_ID
read -p "  Paste your appId: " APP_ID

# --- Write config ---
echo ""
echo "  Writing Firebase config..."

cat > public/js/firebase-init.js << FIREBASE_EOF
// Interactive Management Platform — Firebase Configuration
// See SETUP.md for instructions on setting up your own Firebase project
const firebaseConfig = {
    apiKey: "$API_KEY",
    authDomain: "$AUTH_DOMAIN",
    projectId: "$PROJECT_ID",
    storageBucket: "$STORAGE_BUCKET",
    messagingSenderId: "$SENDER_ID",
    appId: "$APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

auth.onAuthStateChanged(function(user) {
    if (user) {
        console.log("Firebase auth: signed in as", user.isAnonymous ? "anonymous" : user.email);
    } else if (!window._skipAnonymousAuth) {
        auth.signInAnonymously().catch(function(error) {
            console.warn("Anonymous auth failed:", error.message);
        });
    }
});

window.db = db;
window.auth = auth;
window.firebase = firebase;
console.log("Firebase initialized");
FIREBASE_EOF

echo "  ✅ Config written to public/js/firebase-init.js"

# --- Deploy ---
echo ""
echo "========================================"
echo "  Step 5: Deploy"
echo "========================================"
echo ""
echo "  Deploying to Firebase Hosting..."

firebase deploy --only hosting

echo ""
echo "========================================"
echo "  ✅ Setup Complete!"
echo "========================================"
echo ""
echo "  Your platform is live at:"
echo "  → https://$PROJECT_ID.web.app"
echo ""
echo "  Next steps:"
echo "  1. Open https://$PROJECT_ID.web.app"
echo "  2. Click 'Create an Account' to set up your admin account"
echo "  3. Log in and start creating projects!"
echo ""
echo "  For production security rules, see SETUP.md Step 6."
echo ""
