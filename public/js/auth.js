// Authentication Functions
// Simple demo authentication system

function checkAuth() {
    loadFromStorage();
    
    if (!AppState.isAdmin || !AppState.currentUser) {
        // Not authenticated
        return false;
    }
    
    return true;
}

function requireAuth() {
    if (!checkAuth()) {
        window.location.href = 'index.html';
    }
}

// Check auth on protected pages
if (window.location.pathname.includes('admin.html')) {
    requireAuth();
}