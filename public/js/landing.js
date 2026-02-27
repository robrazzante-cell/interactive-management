// Landing Page Functions

function showAdminLogin() {
    showModal('admin-login-modal');
}

function showParticipantAccess() {
    showModal('participant-access-modal');
}

// Admin Login — Firebase Auth (email/password)
async function adminLogin(event) {
    event.preventDefault();

    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;

    try {
        // Sign in with Firebase Auth
        await firebase.auth().signInWithEmailAndPassword(email, password);

        // Verify this user is a platform admin
        const uid = firebase.auth().currentUser.uid;
        const adminDoc = await db.collection('admin_users').doc(uid).get();

        if (!adminDoc.exists || adminDoc.data().role !== 'platform_admin') {
            await firebase.auth().signOut();
            showToast('Not authorized as platform admin', 'error');
            return;
        }

        AppState.isAdmin = true;
        AppState.currentUser = {
            email: email,
            name: adminDoc.data().display_name || 'Administrator',
            role: 'admin'
        };

        saveToStorage();
        showToast('Login successful!', 'success');

        setTimeout(() => {
            const timestamp = new Date().getTime();
            window.location.href = `admin.html?v=1.0.0&t=${timestamp}&nocache=true`;
        }, 500);
    } catch (error) {
        console.error('Admin login error:', error);
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            showToast('Invalid credentials', 'error');
        } else {
            showToast('Login failed: ' + error.message, 'error');
        }
    }
}

// Participant Access
async function participantAccess(event) {
    event.preventDefault();

    // Strip whitespace, invisible chars, and normalize case
    var rawValue = document.getElementById('access-code').value;
    var accessToken = rawValue.replace(/[^\x20-\x7E]/g, '').trim().toUpperCase();

    if (!accessToken) {
        showToast('Please enter an access token', 'error');
        return;
    }

    // Show loading state
    var submitBtn = event.target.querySelector('button[type="submit"]');
    var originalText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
        submitBtn.disabled = true;
    }

    try {
        // Fetch participants and find by access_token
        var response = await fetch('tables/participants?limit=1000');

        if (!response.ok) {
            throw new Error('server_error');
        }

        var data = await response.json();
        var participant = data.data.find(function(p) {
            if (!p.access_token) return false;
            return String(p.access_token).trim().toUpperCase() === accessToken;
        });

        if (participant) {
            // Valid token - redirect to participant portal
            console.log('✅ Valid access token for:', participant.name);
            window.location.href = 'participant-portal.html?token=' + participant.access_token;
        } else {
            showToast('Token not found. Please check your access token and try again.', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        if (error.message === 'server_error') {
            showToast('Unable to connect to server. Please check your internet connection and try again.', 'error');
        } else {
            showToast('Connection error. Please wait a moment and try again.', 'error');
        }
    } finally {
        if (submitBtn) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
}