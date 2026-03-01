# Firebase Setup Guide

This guide walks you through setting up a Firebase project to host the Interactive Management Platform.

## Prerequisites

- A **Google account** (for Firebase access)
- **Node.js** (version 16 or later) -- [download here](https://nodejs.org/)
- **Firebase CLI** -- install globally:
  ```bash
  npm install -g firebase-tools
  ```

---

## Step 1: Create a Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com/).
2. Click **"Create a project"** (or "Add project").
3. Enter a project name (e.g., `my-ism-platform`).
4. Enable or disable Google Analytics as you prefer (it is optional and not required for this platform).
5. Click **Create project** and wait for provisioning to complete.

---

## Step 2: Enable Firestore

1. In the Firebase console, navigate to **Build > Firestore Database**.
2. Click **"Create database"**.
3. Select **"Start in test mode"** for development. This allows open read/write access for 30 days. You will lock this down later for production (see Step 6).
4. Choose a **Cloud Firestore location** close to your users (e.g., `us-central1` for North America, `europe-west1` for Europe).
5. Click **Enable**.

---

## Step 3: Enable Authentication

1. In the Firebase console, navigate to **Build > Authentication**.
2. Click **"Get started"**.
3. Go to the **Sign-in method** tab.
4. Enable **Email/Password**:
   - Click on "Email/Password"
   - Toggle the first switch to enable it
   - Click **Save**
5. Enable **Anonymous**:
   - Click on "Anonymous"
   - Toggle the switch to enable it
   - Click **Save**

Anonymous authentication is used for participant access during workshops. Participants join with an access code and do not need to create an account.

---

## Step 4: Get Your Firebase Config

1. In the Firebase console, click the **gear icon** (Project Settings) next to "Project Overview".
2. Scroll down to the **"Your apps"** section.
3. Click the **Web icon** (`</>`).
4. Register your app with a nickname (e.g., `ISM Platform`). You do not need to enable Firebase Hosting at this step.
5. Copy the `firebaseConfig` object that is displayed. It will look like this:

   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "my-ism-platform.firebaseapp.com",
     projectId: "my-ism-platform",
     storageBucket: "my-ism-platform.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123"
   };
   ```

6. Open the file `public/js/firebase-init.js` in your local copy of this repository.
7. Replace the placeholder config with your own `firebaseConfig` values.
8. Save the file.

---

## Step 5: Create Your Admin Account

After deploying (Step 7), visit your platform and click **"Create an Account"** on the landing page. Enter your name, email, and password. The platform automatically creates your admin account -- no manual Firestore setup needed.

---

## Step 6: Set Firestore Security Rules

1. In the Firebase console, go to **Firestore Database > Rules** tab.

### For Development (test mode)

The default test mode rules allow open access for 30 days:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2026, 12, 31);
    }
  }
}
```

### For Production

Use rules that protect the `admin_users` collection and require authentication for writes:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Admin users collection: only readable/writable by authenticated admins
    match /admin_users/{doc} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && exists(/databases/$(database)/documents/admin_users/$(request.auth.uid));
    }

    // All other collections: authenticated users can read and write
    match /{collection}/{doc} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

2. Click **Publish** to apply the rules.

---

## Step 7: Deploy

From the root of this repository, run:

```bash
firebase login
```

If this is your first time using Firebase CLI in this project, initialize hosting:

```bash
firebase init hosting
```

When prompted:
- **What do you want to use as your public directory?** Enter `public`
- **Configure as a single-page app (rewrite all URLs to /index.html)?** Enter `No`
- **Set up automatic builds and deploys with GitHub?** Enter `No` (you can configure this later)
- If asked to overwrite `public/index.html`, enter `No`

Then deploy:

```bash
firebase deploy --only hosting
```

The CLI will output your hosting URL (e.g., `https://my-ism-platform.web.app`).

---

## Step 8: Verify

1. Open your browser and navigate to your hosting URL (e.g., `https://my-ism-platform.web.app`).
2. You should see the Interactive Management Platform landing page.
3. Click **"Administrator Login"**.
4. Enter the email and password you created in Step 5.
5. You should be taken to the admin dashboard where you can create projects and manage workshops.

---

## Troubleshooting

- **"Permission denied" errors in the browser console**: Check your Firestore security rules. Make sure authentication is enabled and your admin user document exists in the `admin_users` collection.
- **Login fails**: Verify that Email/Password authentication is enabled in the Firebase console. Double-check that your email and password match what you set up.
- **Blank page after deploy**: Make sure you selected `public` as the public directory during `firebase init hosting`. The `index.html` file must be inside the `public/` folder.
- **Firebase CLI errors**: Run `firebase login --reauth` to refresh your authentication token.
