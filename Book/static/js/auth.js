// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCdt0C1K1wJU-pcr1QvsNTAFP3iZgeNfyU",
    authDomain: "ebook-management-system-dbb5e.firebaseapp.com",
    projectId: "ebook-management-system-dbb5e",
    storageBucket: "ebook-management-system-dbb5e.firebasestorage.app",
    messagingSenderId: "261481978080",
    appId: "1:261481978080:web:109166ab653b1e7034d885",
    measurementId: "G-0ZGS2ZQZ28"
};

// Initialize Firebase (Compat)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Global instances for app.js to use
window.auth = firebase.auth();
window.db = firebase.firestore();

// Login Logic
const loginBtn = document.getElementById('google-login-btn');
if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider)
            .then((result) => {
                const user = result.user;
                // Save user to Firestore
                db.collection("users").doc(user.uid).set({
                    uid: user.uid,
                    name: user.displayName,
                    email: user.email,
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true }).then(() => {
                    window.location.href = "/home";
                });
            })
            .catch((error) => {
                console.error("Login Failed", error);
                const errorDiv = document.getElementById('auth-error');
                if (errorDiv) {
                    errorDiv.innerText = error.message;
                    errorDiv.style.display = 'block';
                }
            });
    });
}

// Global Auth Listener to protect routes
auth.onAuthStateChanged((user) => {
    const path = window.location.pathname;
    // Simple check: if path contains 'home' or is root
    // Note: Flask routes are / (index) and /home

    if (user) {
        // If on login page, go to home
        if (path === '/' || path.includes('index')) {
            window.location.href = "/home";
        }
    } else {
        // If on home page, go to login
        if (path.includes('home')) {
            window.location.href = "/";
        }
    }
});

// Logout Logic
function logout() {
    auth.signOut().then(() => {
        window.location.href = "/";
    });
}