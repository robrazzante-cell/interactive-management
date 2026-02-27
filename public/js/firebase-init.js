// Interactive Management Platform — Firebase Configuration
// See SETUP.md for instructions on setting up your own Firebase project
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
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
