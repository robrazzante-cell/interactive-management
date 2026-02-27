// Session Control Functions
// Manages session launch, monitoring, and control

async function loadSessionControl() {
    if (!AppState.currentProject) {
        showToast('Please select a project first', 'error');
        return;
    }
    
    const mode = AppState.currentProject.session_mode || 'async';
    updateSessionModeDisplay(mode);
    
    // Only async (internal) and public_project modes now - in-person removed
    if (mode === 'async' || mode === 'public_project') {
        showAsyncControls();
        await updateParticipationProgress();
    }
}

function updateSessionModeDisplay(mode) {
    const display = document.getElementById('current-mode-display');
    if (display) {
        if (mode === 'async') {
            display.textContent = 'Internal Project';
        } else if (mode === 'public_project') {
            display.textContent = 'Public Project';
        } else {
            display.textContent = 'Internal Project'; // default
        }
    }
}

function showAsyncControls() {
    const asyncControls = document.getElementById('async-controls');
    const inPersonControls = document.getElementById('inperson-controls');
    
    if (asyncControls) asyncControls.classList.remove('hidden');
    if (inPersonControls) inPersonControls.classList.add('hidden');
    
    // Display participant link
    if (AppState.currentProject && AppState.currentProject.participant_link) {
        const linkInput = document.getElementById('participant-link');
        if (linkInput) {
            const fullLink = `${window.location.origin}/participant.html?code=${AppState.currentProject.participant_link}`;
            linkInput.value = fullLink;
        }
    }
}

// showInPersonControls() removed - in-person mode no longer supported

async function updateParticipationProgress() {
    if (!AppState.currentProject) return;
    
    try {
        const participants = await API.fetchParticipants(AppState.currentProject.id);
        const completed = participants.filter(p => p.completion_status === 'completed').length;
        const total = participants.length;
        
        // Update progress bar
        const progressBar = document.getElementById('participation-progress');
        if (progressBar) {
            const percentage = total > 0 ? (completed / total) * 100 : 0;
            progressBar.style.width = `${percentage}%`;
        }
        
        // Update counts
        const completedCount = document.getElementById('completed-count');
        const totalCount = document.getElementById('total-count');
        if (completedCount) completedCount.textContent = completed;
        if (totalCount) totalCount.textContent = total;
        
        // Display individual progress
        displayParticipantProgress(participants);
        
    } catch (error) {
        console.error('Error updating progress:', error);
    }
}

function displayParticipantProgress(participants) {
    const container = document.getElementById('participant-progress-list');
    if (!container) return;
    
    if (participants.length === 0) {
        container.innerHTML = '<p>No participants added yet.</p>';
        return;
    }
    
    container.innerHTML = participants.map(p => {
        const status = p.completion_status || 'not_started';
        const statusIcon = status === 'completed' ? 'check-circle' : 
                          status === 'in_progress' ? 'clock' : 'circle';
        const statusColor = status === 'completed' ? '#10b981' : 
                           status === 'in_progress' ? '#f59e0b' : '#6b7280';
        
        return `
            <div style="display: flex; justify-content: space-between; padding: 0.75rem; border-bottom: 1px solid #e9ecef;">
                <span>${p.name} <span style="font-size: 0.875rem; color: #6b7280;">(${p.position || 'N/A'})</span></span>
                <span style="color: ${statusColor};">
                    <i class="fas fa-${statusIcon}"></i> ${status.replace('_', ' ')}
                </span>
            </div>
        `;
    }).join('');
}

function copyLink() {
    const linkInput = document.getElementById('participant-link');
    if (linkInput) {
        linkInput.select();
        document.execCommand('copy');
        showToast('Link copied to clipboard!', 'success');
    }
}

async function generateNewLink() {
    if (!AppState.currentProject) return;
    
    const newLink = 'ISM-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    
    try {
        await API.updateProject(AppState.currentProject.id, {
            participant_link: newLink
        });
        
        AppState.currentProject.participant_link = newLink;
        showAsyncControls();
        showToast('New link generated!', 'success');
    } catch (error) {
        console.error('Error generating link:', error);
        showToast('Error generating link', 'error');
    }
}

// In-person session control functions removed - feature simplified to Internal and Public projects only

// Auto-refresh progress every 10 seconds
setInterval(() => {
    if (AppState.currentProject && AppState.currentProject.session_mode === 'async') {
        updateParticipationProgress();
    }
}, 10000);