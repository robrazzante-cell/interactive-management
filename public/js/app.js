// ISM Application - Core Functions
// Interactive Management Platform

// Global State
const AppState = {
    currentProject: null,
    currentUser: null,
    projects: [],
    participants: [],
    ideas: [],
    categories: [],
    structuringResponses: [],
    isAdmin: false
};

// Initialize Application
function initApp() {
    console.log('ISM Application initialized');
    loadFromStorage();
    
    // Disable project-specific tabs on load (they'll be enabled when a project is selected)
    if (!AppState.currentProject) {
        if (typeof disableProjectSpecificTabs === 'function') {
            disableProjectSpecificTabs();
        }
    } else {
        // If a project was previously selected, enable tabs
        if (typeof enableProjectSpecificTabs === 'function') {
            enableProjectSpecificTabs();
        }
    }
}

// Local Storage Functions
function saveToStorage() {
    localStorage.setItem('ism_app_state', JSON.stringify(AppState));
}

function loadFromStorage() {
    try {
        const stored = localStorage.getItem('ism_app_state');
        if (stored) {
            const data = JSON.parse(stored);
            Object.assign(AppState, data);
        }
    } catch (e) {
        console.error('❌ loadFromStorage failed:', e.message);
    }
}

// Tab Switching
function switchTab(tabName) {
    const tabContents = document.querySelectorAll('.tab-content');
    
    // FORCE hide all tabs with inline styles
    tabContents.forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
        content.style.visibility = 'hidden';
        content.style.height = '0';
        content.style.overflow = 'hidden';
    });
    
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => btn.classList.remove('active'));
    
    const selectedContent = document.getElementById(`${tabName}-content`);
    if (selectedContent) {
        selectedContent.classList.add('active');
        // FORCE show selected tab with inline styles
        selectedContent.style.display = 'block';
        selectedContent.style.visibility = 'visible';
        selectedContent.style.height = 'auto';
        selectedContent.style.overflow = 'visible';
    }
    
    const selectedBtn = document.getElementById(`${tabName}-tab`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
    
    loadTabData(tabName);
}

function loadTabData(tabName) {
    // Get current project ID if available
    const projectId = AppState.currentProject?.id;
    
    switch(tabName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'projects':
            loadProjects();
            break;
        case 'workshop':
            if (projectId) loadProjectData();
            break;
        case 'participants':
            if (projectId) loadParticipants();
            break;
        case 'ideageneration':
            if (projectId) IdeaGeneration.init(projectId);
            break;
        case 'coding':
            console.log('📍 Switching to coding tab, projectId:', projectId);
            if (projectId) {
                if (typeof initCodingTab === 'function') {
                    console.log('✅ Calling initCodingTab()');
                    initCodingTab();
                } else {
                    console.error('❌ initCodingTab function not found!');
                }
            } else {
                console.error('❌ No projectId when switching to coding tab');
            }
            break;
        case 'voting':
            if (projectId) {
                initializeVotingPhase(projectId);
            }
            break;
        case 'emaillog':
            if (projectId) EmailLog.init(projectId);
            break;
        case 'analysis':
            if (projectId) loadNetworkAnalysis();
            break;
        case 'aggregate':
            // Load INLINE aggregate metastructure (NO MORE IFRAME!)
            if (projectId) {
                console.log('✅ Calling loadInlineAggregate() for project:', projectId);
                if (typeof loadInlineAggregate === 'function') {
                    loadInlineAggregate();
                } else {
                    console.error('❌ loadInlineAggregate function not found!');
                }
            } else {
                console.error('❌ No project selected - cannot load aggregate');
            }
            break;
        case 'testing':
            // Workflow tab - no special initialization needed
            console.log('✅ Workflow tab loaded');
            break;
        case 'security':
            // Security dashboard - initialize bot protection monitoring
            console.log('✅ Security dashboard tab loaded');
            if (typeof initSecurityDashboard === 'function') {
                initSecurityDashboard();
            } else {
                console.error('❌ initSecurityDashboard function not found!');
            }
            break;
    }
}



// Modal Functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// Generate Unique ID
function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Format Date
function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Show Toast Notification
function showToast(message, type = 'info') {
    // Skip success toasts - no annoying banners
    if (type === 'success') return;
    
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'error' ? '#3E0505' : '#0B2B26'};
        color: white;
        border-radius: 0.5rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// API Functions
const API = {
    async fetchProjects() {
        try {
            console.log('📍 API.fetchProjects() starting...');
            const response = await fetch('tables/projects?limit=100');
            console.log('📍 API.fetchProjects() response:', response.status, response.ok);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            console.log('📍 API.fetchProjects() got', data.data ? data.data.length : 0, 'projects');
            AppState.projects = data.data || [];
            return data.data || [];
        } catch (error) {
            console.error('❌ Error fetching projects:', error.message, error.stack);
            // Return empty array instead of failing completely
            AppState.projects = [];
            return [];
        }
    },
    
    async createProject(projectData) {
        try {
            const response = await fetch('tables/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projectData)
            });
            const data = await response.json();
            AppState.projects.push(data);
            saveToStorage();

            // Create project_access doc for security rules
            var currentUid = firebase.auth().currentUser ? firebase.auth().currentUser.uid : null;
            if (currentUid && projectData.id) {
                try {
                    await db.collection('project_access').doc(projectData.id).set({
                        authorized_uids: [currentUid]
                    });
                    console.log('Created project_access for', projectData.id);
                } catch (e) {
                    console.warn('Could not create project_access:', e.message);
                }
            }

            return data;
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
    },
    
    async updateProject(projectId, updates) {
        try {
            const response = await fetch(`tables/projects/${projectId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            return await response.json();
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
    },
    
    async deleteProject(projectId) {
        try {
            const response = await fetch(`tables/projects/${projectId}`, {
                method: 'DELETE'
            });
            // Remove from AppState
            AppState.projects = AppState.projects.filter(p => p.id !== projectId);
            saveToStorage();

            // Delete project_access doc
            try {
                await db.collection('project_access').doc(projectId).delete();
                console.log('Deleted project_access for', projectId);
            } catch (e) {
                console.warn('Could not delete project_access:', e.message);
            }

            return true;
        } catch (error) {
            console.error('Error:', error);
            return false;
        }
    },
    
    async fetchParticipants(projectId) {
        try {
            const response = await fetch(`tables/participants?search=${projectId}`);
            const data = await response.json();
            return data.data.filter(p => p.project_id === projectId);
        } catch (error) {
            console.error('Error:', error);
            return [];
        }
    },
    
    async addParticipant(participantData) {
        try {
            const response = await fetch('tables/participants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(participantData)
            });
            return await response.json();
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
    },
    
    async updateParticipant(projectId, participantId, updates) {
        try {
            const response = await fetch(`tables/participants/${participantId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            return await response.json();
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
    },
    
    async fetchIdeas(projectId) {
        try {
            const response = await fetch(`tables/ideas?search=${projectId}`);
            const data = await response.json();
            return data.data.filter(i => i.project_id === projectId);
        } catch (error) {
            console.error('Error:', error);
            return [];
        }
    },
    
    async addIdea(ideaData) {
        try {
            const response = await fetch('tables/ideas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ideaData)
            });
            return await response.json();
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
    },
    
    async saveStructuringResponse(responseData) {
        try {
            const response = await fetch('tables/structuring_responses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(responseData)
            });
            return await response.json();
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
    },
    
    async fetchStructuringResponses(projectId) {
        try {
            const response = await fetch(`tables/structuring_responses?search=${projectId}`);
            const data = await response.json();
            return data.data.filter(r => r.project_id === projectId);
        } catch (error) {
            console.error('Error:', error);
            return [];
        }
    }
};

// Export Functions
function exportToJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

function exportToCSV(data, filename) {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}