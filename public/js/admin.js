// Admin Dashboard Functions

async function loadDashboard() {
    // Load statistics
    const projects = await API.fetchProjects();
    
    const totalProjectsEl = document.getElementById('total-projects');
    if (totalProjectsEl) totalProjectsEl.textContent = projects.length;
    
    let totalParticipants = 0;
    let completedSessions = 0;
    let totalIdeas = 0;
    
    const projectStats = await Promise.all(projects.map(async (project) => {
        const [participants, ideas] = await Promise.all([
            API.fetchParticipants(project.id),
            API.fetchIdeas(project.id)
        ]);
        return {
            participantCount: participants.length,
            completedCount: participants.filter(p => p.completion_status === 'completed').length,
            ideaCount: ideas.length
        };
    }));
    projectStats.forEach(stats => {
        totalParticipants += stats.participantCount;
        completedSessions += stats.completedCount;
        totalIdeas += stats.ideaCount;
    });
    
    const totalParticipantsEl = document.getElementById('total-participants');
    const completedSessionsEl = document.getElementById('completed-sessions');
    const totalIdeasEl = document.getElementById('total-ideas');
    
    if (totalParticipantsEl) totalParticipantsEl.textContent = totalParticipants;
    if (completedSessionsEl) completedSessionsEl.textContent = completedSessions;
    if (totalIdeasEl) totalIdeasEl.textContent = totalIdeas;
    
    // Sort by most recently accessed and load recent projects
    const sortedProjects = [...projects].sort((a, b) => {
        const aTime = a.last_accessed || a.created_at || 0;
        const bTime = b.last_accessed || b.created_at || 0;
        return bTime - aTime;
    });
    displayRecentProjects(sortedProjects.slice(0, 5));
}

function displayRecentProjects(projects) {
    // Update to show current project stats instead
    updateProjectSpecificDashboard();
}

async function updateProjectSpecificDashboard() {
    const currentProject = AppState.currentProject;
    const projectSpecificDiv = document.getElementById('project-specific-stats');
    const noProjectDiv = document.getElementById('no-project-selected');
    
    if (!currentProject) {
        if (projectSpecificDiv) projectSpecificDiv.style.display = 'none';
        if (noProjectDiv) noProjectDiv.style.display = 'block';
        return;
    }
    
    // Show project-specific stats
    if (projectSpecificDiv) projectSpecificDiv.style.display = 'block';
    if (noProjectDiv) noProjectDiv.style.display = 'none';
    
    // Fetch project data
    const participants = await API.fetchParticipants(currentProject.id);
    const ideas = await API.fetchIdeas(currentProject.id);
    
    // Update stats (with safety checks)
    const currentProjectParticipantsEl = document.getElementById('current-project-participants');
    const currentProjectIdeasEl = document.getElementById('current-project-ideas');
    const currentProjectStatusEl = document.getElementById('current-project-status');
    
    if (currentProjectParticipantsEl) currentProjectParticipantsEl.textContent = participants.length;
    if (currentProjectIdeasEl) currentProjectIdeasEl.textContent = ideas.length;
    if (currentProjectStatusEl) currentProjectStatusEl.textContent = currentProject.status || 'Active';
    
    // Update project info
    const projectInfo = document.getElementById('current-project-info');
    if (projectInfo) {
        projectInfo.innerHTML = `
            <div style="margin-bottom: 0.75rem;">
                <h4 style="margin: 0 0 0.5rem 0; color: #2d3748; font-size: 1.125rem;">${currentProject.title}</h4>
                <p style="margin: 0; color: #718096; font-size: 0.875rem;">${currentProject.organization || 'No organization'}</p>
            </div>
            <div style="font-size: 0.875rem; color: #4a5568; line-height: 1.6;">
                <p style="margin: 0.5rem 0;"><strong>Trigger Question:</strong> ${currentProject.trigger_question || 'Not set'}</p>
                <p style="margin: 0.5rem 0;"><strong>Relational Phrase:</strong> ${currentProject.relational_phrase || 'significantly support'}</p>
                <p style="margin: 0.5rem 0;"><strong>Mode:</strong> ${currentProject.session_mode === 'async' ? 'Asynchronous' : 'In-Person Facilitated'}</p>
            </div>
        `;
    }
}

function createNewProject() {
    // Clear current project when creating new
    AppState.currentProject = null;
    resetProjectForm();
    disableProjectSpecificTabs(); // Disable until project is saved
    switchTab('workshop');
}

function quickCreateProject() {
    createNewProject();
}

function viewAllProjects() {
    switchTab('projects');
}

async function loadProjects() {
    console.log('📍 loadProjects() called');
    try {
        const projects = await API.fetchProjects();
        console.log('📍 API.fetchProjects() returned:', projects ? projects.length : 'null', 'projects');
        if (projects && projects.length > 0) {
            console.log(`✅ Loaded ${projects.length} project(s)`);
        } else {
            console.warn('⚠️ loadProjects: No projects returned from API');
        }
        AppState.projects = projects || []; // Store in AppState
        displayProjectsGrid(projects || []);
        // Update folder counts AFTER project cards are rendered (fixes race condition)
        if (typeof updateFolderCounts === 'function') {
            updateFolderCounts();
        }
    } catch (error) {
        console.error('❌ Error loading projects:', error.message);
        const grid = document.getElementById('projects-grid');
        if (grid) {
            grid.innerHTML = '<p style="color: #d32f2f; padding: 20px;">Unable to load projects. Please check your connection and refresh the page.</p>';
        }
        // Return empty array to prevent cascading errors
        AppState.projects = [];
    }
}

function displayProjectsGrid(projects) {
    const grid = document.getElementById('projects-grid');
    if (!grid) return;
    
    if (projects.length === 0) {
        grid.innerHTML = '<p>No projects yet.</p>';
        return;
    }
    
    // Sort by most recently accessed (most recent first), exclude demo project
    const sortedProjects = [...projects].filter(p => p.id !== 'public-demo').sort((a, b) => {
        const aTime = a.last_accessed || a.created_at || 0;
        const bTime = b.last_accessed || b.created_at || 0;
        return bTime - aTime;
    });
    
    grid.innerHTML = sortedProjects.map(project => {
        const isPublic = project.session_mode === 'public_project';
        return `
        <div class="project-card" style="position: relative;">
            <div style="position: absolute; top: 10px; left: 10px; z-index: 10;">
                <input type="checkbox" 
                       class="project-checkbox" 
                       data-project-id="${project.id}" 
                       onclick="event.stopPropagation(); toggleProjectSelection();"
                       style="width: 20px; height: 20px; cursor: pointer;">
            </div>
            ${isPublic ? `
            <div style="position: absolute; bottom: 10px; right: 10px; z-index: 10;">
                <span style="background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);">
                    <i class="fas fa-globe"></i> PUBLIC
                </span>
            </div>
            ` : ''}
            <div onclick="openProject('${project.id}')" style="cursor: pointer; padding-left: 30px;">
                <h3>${project.title}</h3>
                <p class="project-meta">${project.organization || 'N/A'}</p>
                <p class="project-meta">${formatDate(project.created_at)}</p>
                <span class="project-status ${project.status}">${project.status}</span>
            </div>
        </div>
    `;
    }).join('');
}

async function openProject(projectId) {
    AppState.currentProject = AppState.projects.find(p => p.id === projectId);
    if (AppState.currentProject) {
        // Update last_accessed timestamp
        try {
            await API.updateProject(AppState.currentProject.id, {
                ...AppState.currentProject,
                last_accessed: Date.now()
            });
            AppState.currentProject.last_accessed = Date.now();
        } catch (error) {
            console.error('Error updating last accessed:', error);
        }
        
        enableProjectSpecificTabs(); // Enable tabs when project is opened
        loadProjectData();
        updateProjectSpecificDashboard(); // Update dashboard with project stats
        
        // Update public participants section visibility
        if (typeof updatePublicSectionVisibility === 'function') {
            updatePublicSectionVisibility();
        }
        
        // Update aggregate metastructure iframe with project ID
        updateAggregateIframe();
        
        switchTab('workshop');
    }
}

function enableProjectSpecificTabs() {
    const projectTabs = document.querySelectorAll('.project-specific-tab');
    projectTabs.forEach(tab => {
        tab.disabled = false;
        tab.removeAttribute('title');
    });
}

function disableProjectSpecificTabs() {
    const projectTabs = document.querySelectorAll('.project-specific-tab');
    projectTabs.forEach(tab => {
        tab.disabled = true;
        tab.setAttribute('title', 'Select a project first');
    });
}

function updateAggregateIframe() {
    const iframe = document.querySelector('#aggregate-content iframe');
    if (iframe && AppState.currentProject) {
        const projectId = AppState.currentProject.id;
        const timestamp = Date.now();
        const newSrc = `aggregate-metastructure-DEC19-2025.html?_t=${timestamp}&project=${projectId}&source=admin`;
        
        // Only update if the URL has changed
        if (!iframe.src.includes(`project=${projectId}`)) {
            console.log('🔄 Updating aggregate iframe with project ID:', projectId);
            iframe.src = newSrc;
        }
    } else if (iframe && !AppState.currentProject) {
        // Clear iframe if no project is selected
        const timestamp = Date.now();
        iframe.src = `aggregate-metastructure-DEC19-2025.html?_t=${timestamp}`;
    }
}

// Clear voting data for current project (Admin only)
async function clearVotingDataAdmin() {
    if (!AppState.currentProject) {
        alert('⚠️ Please select a project first');
        return;
    }
    
    const projectId = AppState.currentProject.id;
    const projectTitle = AppState.currentProject.title;
    
    const confirmed = confirm(
        '⚠️ CLEAR OLD VOTING DATA?\n\n' +
        `Project: "${projectTitle}"\n\n` +
        'This will DELETE all voting responses for this project.\n\n' +
        'Use this if you changed the factors and need to start fresh.\n\n' +
        '✅ Factors will NOT be deleted\n' +
        '✅ Project will NOT be deleted\n' +
        '❌ All voting data WILL be deleted\n\n' +
        'Participants will need to vote again to see aggregate data.\n\n' +
        'Continue?'
    );
    
    if (!confirmed) {
        console.log('❌ Admin cancelled clearing voting data');
        return;
    }
    
    try {
        console.log('🗑️ [ADMIN] Clearing voting data for project:', projectId);
        
        // Fetch voting responses scoped to this project
        const response = await fetch(`tables/ism_votes?search=${projectId}&limit=10000`);

        if (!response.ok) {
            if (response.status === 422) {
                alert('ℹ️ No voting data exists yet. Nothing to clear.');
                return;
            }
            throw new Error(`Failed to fetch voting responses: ${response.status}`);
        }

        const data = await response.json();
        const projectVotes = data.data || [];

        console.log(`📊 Found ${projectVotes.length} voting responses for this project`);

        if (projectVotes.length === 0) {
            alert(`ℹ️ No voting data found for "${projectTitle}". Nothing to clear.`);
            return;
        }

        // Delete votes in parallel batches of 50
        let deletedCount = 0;
        const BATCH_SIZE = 50;
        for (let i = 0; i < projectVotes.length; i += BATCH_SIZE) {
            const batch = projectVotes.slice(i, i + BATCH_SIZE);
            const results = await Promise.all(batch.map(vote =>
                fetch(`tables/ism_votes/${vote.id}`, { method: 'DELETE' })
                    .then(r => r.ok ? 1 : 0)
                    .catch(() => 0)
            ));
            deletedCount += results.reduce((a, b) => a + b, 0);
        }
        
        console.log(`✅ [ADMIN] Deleted ${deletedCount} voting responses`);
        
        showToast(`✅ Deleted ${deletedCount} old voting responses for "${projectTitle}"`, 'success');
        
        alert(
            `✅ SUCCESS!\n\n` +
            `Deleted ${deletedCount} old voting responses.\n\n` +
            `Project: "${projectTitle}"\n\n` +
            `Participants can now vote again with the current factors.`
        );
        
        // Reload the iframe to refresh the metastructure view
        const iframe = document.querySelector('#aggregate-content iframe');
        if (iframe) {
            iframe.src = iframe.src; // Force reload
        }
        
    } catch (error) {
        console.error('❌ [ADMIN] Error clearing voting data:', error);
        showToast('Error clearing voting data', 'error');
        alert(`❌ ERROR!\n\n${error.message}\n\nCheck console (F12) for details.`);
    }
}

async function loadProjectData() {
    if (!AppState.currentProject) return;
    
    // Show delete button for existing projects
    const deleteBtn = document.getElementById('delete-project-btn');
    if (deleteBtn) {
        deleteBtn.style.display = 'inline-flex';
    }
    
    // Load project details into form
    document.getElementById('project-title').value = AppState.currentProject.title || '';
    document.getElementById('context-statement').value = AppState.currentProject.context_statement || '';
    document.getElementById('trigger-question').value = AppState.currentProject.trigger_question || '';
    document.getElementById('host-organization').value = AppState.currentProject.organization || '';
    document.getElementById('org-use-the').checked = !!AppState.currentProject.org_use_the;
    const locEl = document.getElementById('workshop-location');
    if (locEl) locEl.value = AppState.currentProject.location || '';
    document.getElementById('workshop-objectives').value = AppState.currentProject.objectives || '';
    document.getElementById('relational-phrase').value = AppState.currentProject.relational_phrase || 'significantly support';
    
    // Set mode
    const mode = AppState.currentProject.session_mode || 'async';
    document.querySelector(`input[name="session-mode"][value="${mode}"]`).checked = true;

    // Restore logo
    const logo = AppState.currentProject.company_logo;
    if (logo) {
        window.companyLogoDataUrl = logo;
        const preview = document.getElementById('logo-preview');
        const previewImg = document.getElementById('logo-preview-img');
        if (preview && previewImg) {
            previewImg.src = logo;
            preview.style.display = 'block';
        }
    } else {
        window.companyLogoDataUrl = '';
        const preview = document.getElementById('logo-preview');
        if (preview) preview.style.display = 'none';
    }
}

async function saveWorkshopSetup() {
    const title = document.getElementById('project-title').value.trim();
    const contextStatement = document.getElementById('context-statement').value.trim();
    const triggerQuestion = document.getElementById('trigger-question').value.trim();
    const organization = document.getElementById('host-organization').value.trim();
    const orgUseThe = document.getElementById('org-use-the').checked;
    const locationEl = document.getElementById('workshop-location');
    const location = locationEl ? locationEl.value.trim() : (AppState.currentProject?.location || '');
    const objectives = document.getElementById('workshop-objectives').value.trim();
    const relationalPhrase = document.getElementById('relational-phrase').value.trim();
    const mode = document.querySelector('input[name="session-mode"]:checked').value;
    
    if (!title || !triggerQuestion) {
        showToast('Please enter at least a title and trigger question', 'error');
        return;
    }
    
    let logoValue = window.companyLogoDataUrl || '';
    console.log('💾 Saving project — logo length:', logoValue.length, 'chars (' + Math.round(logoValue.length / 1024) + 'KB)');
    // Safety: if compressed logo is still over 800KB, skip it to avoid Firestore 1MB doc limit
    if (logoValue.length > 800000) {
        console.warn('⚠️ Logo too large even after compression (' + Math.round(logoValue.length / 1024) + 'KB) — skipping');
        showToast('Logo image is too large to save. Try a smaller image.', 'error');
        logoValue = '';
    }

    const projectData = {
        title,
        context_statement: contextStatement,
        trigger_question: triggerQuestion,
        organization,
        org_use_the: orgUseThe,
        location,
        objectives,
        relational_phrase: relationalPhrase,
        session_mode: mode,
        status: 'active',
        admin_email: AppState.currentUser?.email || 'admin@example.com',
        company_logo: logoValue
    };
    
    // Add public project specific fields
    if (mode === 'public_project') {
        const publicProjectType = document.querySelector('input[name="public-project-type"]:checked')?.value || 'ism_only';
        const collectDemographics = document.getElementById('collect-demographics').checked;
        const demographicQuestions = getDemographicQuestions();
        
        projectData.public_project_type = publicProjectType;
        projectData.collect_demographics = collectDemographics;
        projectData.demographic_questions = JSON.stringify(demographicQuestions);
        projectData.public_link = generateUniqueLink(); // Generate unique public link
    }
    
    try {
        if (AppState.currentProject) {
            // Update existing project
            const result = await API.updateProject(AppState.currentProject.id, projectData);
            if (!result || result.error) {
                console.error('❌ Project update failed:', result?.error || 'null response');
                showToast('Error saving project: ' + (result?.error || 'unknown error'), 'error');
                return;
            }
            console.log('✅ Project saved successfully. Logo in response:', result.company_logo ? result.company_logo.length + ' chars' : 'none');
            AppState.currentProject = {...AppState.currentProject, ...projectData};
            // Sync updated project back into projects array so re-open doesn't lose data
            const idx = AppState.projects.findIndex(pp => pp.id === AppState.currentProject.id);
            if (idx >= 0) AppState.projects[idx] = AppState.currentProject;
            saveToStorage();
        } else {
            // Create new project — generate links only on first save
            projectData.id = generateId();
            projectData.participant_link = generateUniqueLink();
            const result = await API.createProject(projectData);
            AppState.currentProject = result;
            showToast('Project created successfully', 'success');
        }
        
        // Show public link if it's a public project
        if (mode === 'public_project') {
            const publicLinkUrl = window.location.origin + '/public-voting.html?project=' + (AppState.currentProject.id || projectData.id);
            document.getElementById('public-link-url').value = publicLinkUrl;
            document.getElementById('public-link-display').style.display = 'block';
            showToast('🌍 Public project created! Copy the link to share.', 'success');
        }
        
        enableProjectSpecificTabs(); // Enable tabs after saving project
        updateProjectSpecificDashboard(); // Update dashboard stats
        
        // For public projects, stay on workshop tab to see the link
        if (mode !== 'public_project') {
            switchTab('participants');
        }
    } catch (error) {
        console.error('Error saving project:', error);
        showToast('Error saving project', 'error');
    }
}

function generateUniqueLink() {
    return 'ISM-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

async function deleteCurrentProject() {
    if (!AppState.currentProject) {
        showToast('No project selected', 'error');
        return;
    }
    
    const confirmMsg = `Are you sure you want to delete "${AppState.currentProject.title}"?\n\nThis will permanently delete:\n- All participants\n- All ideas and submissions\n- All factors and votes\n- All email tracking data\n\nThis action cannot be undone.`;
    
    if (!confirm(confirmMsg)) {
        return;
    }
    
    try {
        // Delete project
        await API.deleteProject(AppState.currentProject.id);
        
        // Delete all related data
        // Note: In production, this should be handled by backend cascade delete
        // For now, we'll just remove the project
        
        showToast('Project deleted successfully', 'success');
        
        // Clear current project
        AppState.currentProject = null;
        
        // Reload dashboard
        switchTab('dashboard');
        loadDashboard();
    } catch (error) {
        console.error('Error deleting project:', error);
        showToast('Error deleting project', 'error');
    }
}

function createNewProject() {
    // Clear current project
    AppState.currentProject = null;
    
    // Hide delete button
    const deleteBtn = document.getElementById('delete-project-btn');
    if (deleteBtn) {
        deleteBtn.style.display = 'none';
    }
    
    // Clear form
    document.getElementById('project-title').value = '';
    document.getElementById('context-statement').value = '';
    document.getElementById('trigger-question').value = '';
    document.getElementById('host-organization').value = '';
    document.getElementById('workshop-location').value = '';
    document.getElementById('workshop-objectives').value = '';
    document.getElementById('relational-phrase').value = 'significantly support';
    
    // Set default mode
    const asyncRadio = document.querySelector('input[name="session-mode"][value="async"]');
    if (asyncRadio) asyncRadio.checked = true;
    
    // Switch to workshop tab
    switchTab('workshop');
}

function quickCreateProject() {
    createNewProject();
}

function viewAllProjects() {
    switchTab('projects');
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        AppState.isAdmin = false;
        AppState.currentUser = null;
        AppState.currentProject = null;
        saveToStorage();
        window.location.href = 'index.html';
    }
}

function exportAllData() {
    const data = {
        projects: AppState.projects,
        timestamp: new Date().toISOString()
    };
    exportToJSON(data, `ISM_Export_${Date.now()}.json`);
    showToast('Data exported successfully', 'success');
}

// Copy example text to corresponding field
function copyExample(type) {
    let exampleText = '';
    let targetFieldId = '';
    
    if (type === 'context') {
        exampleText = document.getElementById('context-example').textContent.trim();
        targetFieldId = 'context-statement';
    } else if (type === 'trigger') {
        exampleText = document.getElementById('trigger-example').textContent.trim();
        targetFieldId = 'trigger-question';
    } else if (type === 'objectives') {
        // Remove <br> tags and format properly
        exampleText = document.getElementById('objectives-example').innerHTML
            .replace(/<br>/g, '\n')
            .replace(/<[^>]*>/g, '')
            .trim();
        targetFieldId = 'workshop-objectives';
    }
    
    if (exampleText && targetFieldId) {
        document.getElementById(targetFieldId).value = exampleText;
        showToast('Example copied to field', 'success');
    }
}

// Toggle project selection and update UI
function toggleProjectSelection() {
    const checkboxes = document.querySelectorAll('.project-checkbox');
    const checkedBoxes = Array.from(checkboxes).filter(cb => cb.checked);
    const count = checkedBoxes.length;
    
    // Update count display
    const countDisplay = document.getElementById('selected-count');
    if (countDisplay) {
        countDisplay.textContent = count;
    }
    
    // Show/hide delete button
    const deleteBtn = document.getElementById('bulk-delete-btn');
    if (deleteBtn) {
        deleteBtn.style.display = count > 0 ? 'inline-flex' : 'none';
    }
}

// Bulk delete selected projects
async function bulkDeleteProjects() {
    const checkboxes = document.querySelectorAll('.project-checkbox:checked');
    const selectedIds = Array.from(checkboxes).map(cb => cb.dataset.projectId);
    
    if (selectedIds.length === 0) {
        showToast('No projects selected', 'error');
        return;
    }
    
    const confirmMsg = `Are you sure you want to delete ${selectedIds.length} project(s)?\n\nThis will permanently delete:\n- All participants\n- All ideas and submissions\n- All factors and votes\n- All email tracking data\n\nThis action cannot be undone.`;
    
    if (!confirm(confirmMsg)) {
        return;
    }
    
    try {
        let deletedCount = 0;
        
        for (const projectId of selectedIds) {
            await API.deleteProject(projectId);
            deletedCount++;
        }
        
        showToast(`${deletedCount} project(s) deleted successfully`, 'success');
        
        // Clear current project if it was deleted
        if (AppState.currentProject && selectedIds.includes(AppState.currentProject.id)) {
            AppState.currentProject = null;
        }
        
        // Reload projects
        await loadProjects();
        await loadDashboard();
        
        // Hide delete button
        const deleteBtn = document.getElementById('bulk-delete-btn');
        if (deleteBtn) {
            deleteBtn.style.display = 'none';
        }
    } catch (error) {
        console.error('Error deleting projects:', error);
        showToast('Error deleting some projects', 'error');
    }
}

// Logo upload handling — resizes to fit Firestore's 1MB doc limit
function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('Please upload an image file', 'error');
        return;
    }

    // Validate file size (max 5MB input — will be compressed)
    if (file.size > 5 * 1024 * 1024) {
        showToast('Image must be less than 5MB', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        // Resize via canvas to keep Firestore doc under 1MB
        const img = new Image();
        img.onload = function() {
            try {
                const MAX_DIM = 300;
                let w = img.width, h = img.height;
                console.log('📸 Original image:', w + 'x' + h);
                if (w > MAX_DIM || h > MAX_DIM) {
                    if (w > h) { h = Math.round(h * MAX_DIM / w); w = MAX_DIM; }
                    else { w = Math.round(w * MAX_DIM / h); h = MAX_DIM; }
                }
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                // Do NOT fill background — preserve alpha channel for transparent PNGs
                ctx.clearRect(0, 0, w, h);
                ctx.drawImage(img, 0, 0, w, h);
                // Export as PNG to preserve transparency
                let compressed = canvas.toDataURL('image/png');
                console.log('📸 Logo as PNG:', Math.round(compressed.length / 1024) + 'KB', w + 'x' + h);
                // If PNG is too large for Firestore, fall back to JPEG (loses transparency)
                if (compressed.length > 500000) {
                    compressed = canvas.toDataURL('image/jpeg', 0.7);
                    console.warn('⚠️ PNG too large, fell back to JPEG (' + Math.round(compressed.length / 1024) + 'KB) — transparency lost');
                    showToast('Logo saved as JPEG — transparent background was removed due to file size. Use a smaller PNG for transparency.', 'error');
                }
                window.companyLogoDataUrl = compressed;

                // Show preview
                const preview = document.getElementById('logo-preview');
                const previewImg = document.getElementById('logo-preview-img');
                previewImg.src = compressed;
                preview.style.display = 'flex';
                preview.style.alignItems = 'center';
            } catch (err) {
                console.error('❌ Logo compression failed:', err);
                showToast('Error processing logo image', 'error');
            }
        };
        img.onerror = function() {
            showToast('Could not load image file', 'error');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function removeLogo() {
    window.companyLogoDataUrl = '';
    document.getElementById('company-logo').value = '';
    document.getElementById('logo-preview').style.display = 'none';
    showToast('Logo removed', 'success');
}

// Initialize admin dashboard
window.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    if (!AppState.isAdmin) {
        window.location.href = 'index.html';
        return;
    }
    
    // Display admin name
    const adminNameEl = document.getElementById('admin-name');
    if (adminNameEl && AppState.currentUser) {
        adminNameEl.textContent = AppState.currentUser.name;
    }
    
    // Load dashboard
    loadDashboard();
});

