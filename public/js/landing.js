// Landing Page Functions

function showAdminLogin() {
    showModal('admin-login-modal');
}

function showCreateAccount() {
    showModal('create-account-modal');
}

// Create Account — Firebase Auth + Firestore admin_users doc
async function createAccount(event) {
    event.preventDefault();

    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-password-confirm').value;

    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }

    const btn = document.getElementById('create-account-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    btn.disabled = true;

    try {
        // Create Firebase Auth user
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const uid = userCredential.user.uid;

        // Create admin_users document
        await db.collection('admin_users').doc(uid).set({
            uid: uid,
            email: email,
            display_name: name,
            role: 'platform_admin',
            created_at: new Date().toISOString()
        });

        AppState.isAdmin = true;
        AppState.currentUser = {
            email: email,
            name: name,
            role: 'admin'
        };
        saveToStorage();

        // Show confirmation in the modal
        closeModal('create-account-modal');
        showAccountConfirmation(name, email);
    } catch (error) {
        console.error('Create account error:', error);
        if (error.code === 'auth/email-already-in-use') {
            showToast('An account with this email already exists. Please log in instead.', 'error');
        } else if (error.code === 'auth/weak-password') {
            showToast('Password must be at least 6 characters', 'error');
        } else {
            showToast('Error creating account: ' + error.message, 'error');
        }
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
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

// Show account creation confirmation
function showAccountConfirmation(name, email) {
    // Create and show confirmation modal
    var existing = document.getElementById('account-confirmation-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'account-confirmation-modal';
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content modal-small">
            <div class="modal-header">
                <h3>Account Created</h3>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body" style="text-align: center; padding: 2rem;">
                <div style="font-size: 3rem; color: #0B2B26; margin-bottom: 1rem;">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h4 style="color: #0B2B26; margin-bottom: 0.5rem;">Welcome, ${name}!</h4>
                <p style="color: #666; margin-bottom: 1rem;">Your administrator account has been created successfully.</p>
                <p style="color: #666; font-size: 0.9rem; margin-bottom: 1.5rem;">A confirmation has been sent to <strong>${email}</strong></p>
                <button class="btn btn-primary btn-block" onclick="window.location.href='admin.html?v=1.0.0&t=' + Date.now()">
                    <i class="fas fa-arrow-right"></i> Go to Admin Dashboard
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
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