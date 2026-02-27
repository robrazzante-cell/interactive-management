// Workshop Setup Functions
// Handles project configuration and setup

function loadWorkshopTab() {
    if (AppState.currentProject) {
        populateWorkshopForm();
    }
}

function populateWorkshopForm() {
    const project = AppState.currentProject;
    if (!project) return;
    
    // Populate form fields
    document.getElementById('project-title').value = project.title || '';
    document.getElementById('context-statement').value = project.context_statement || '';
    document.getElementById('trigger-question').value = project.trigger_question || '';
    document.getElementById('host-organization').value = project.organization || '';
    document.getElementById('workshop-location').value = project.location || '';
    document.getElementById('workshop-objectives').value = project.objectives || '';
    document.getElementById('relational-phrase').value = project.relational_phrase || 'significantly aggravates';
    
    // Set mode
    const mode = project.session_mode || 'async';
    const modeRadio = document.querySelector(`input[name="session-mode"][value="${mode}"]`);
    if (modeRadio) {
        modeRadio.checked = true;
        updateModeUI(mode);
    }
    
    // Populate public project settings if applicable
    if (mode === 'public_project') {
        const publicTypeRadio = document.querySelector(`input[name="public-project-type"][value="${project.public_project_type || 'ism_only'}"]`);
        if (publicTypeRadio) {
            publicTypeRadio.checked = true;
        }
        
        document.getElementById('collect-demographics').checked = project.collect_demographics !== false;
        
        // Load demographic questions
        if (project.demographic_questions) {
            loadDemographicQuestions(JSON.parse(project.demographic_questions));
        }
        
        // Show public link if it exists
        if (project.public_link) {
            document.getElementById('public-link-url').value = window.location.origin + '/public-voting.html?project=' + project.id;
            document.getElementById('public-link-display').style.display = 'block';
        }
    }
}

// Mode change handler
document.addEventListener('DOMContentLoaded', () => {
    const modeRadios = document.querySelectorAll('input[name="session-mode"]');
    modeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            updateModeUI(e.target.value);
        });
    });
    
    // Demographics checkbox handler
    const demographicsCheckbox = document.getElementById('collect-demographics');
    if (demographicsCheckbox) {
        demographicsCheckbox.addEventListener('change', updateDemographicQuestionsVisibility);
    }
});

function updateModeUI(mode) {
    // Show/hide public project settings
    const publicSettings = document.getElementById('public-project-settings');
    const demographicSection = document.getElementById('demographic-questions-section');
    
    if (mode === 'public_project') {
        publicSettings.style.display = 'block';
        showToast('🌍 Public project mode selected. Configure demographic survey and access settings.', 'info');
        updateDemographicQuestionsVisibility();
    } else {
        publicSettings.style.display = 'none';
        if (mode === 'in_person') {
            showToast('In-person mode selected. You can present questions to the group.', 'info');
        } else {
            showToast('Async mode selected. Generate a shareable link for participants.', 'info');
        }
    }
}

function updateDemographicQuestionsVisibility() {
    const collectDemographics = document.getElementById('collect-demographics').checked;
    const demographicSection = document.getElementById('demographic-questions-section');
    demographicSection.style.display = collectDemographics ? 'block' : 'none';
}

function addDemographicQuestion() {
    const list = document.getElementById('demographic-questions-list');
    const item = document.createElement('div');
    item.className = 'demographic-question-item';
    item.style.cssText = 'display: flex; gap: 0.5rem; margin-bottom: 0.5rem;';
    item.innerHTML = `
        <input type="text" class="demographic-question" placeholder="Enter question..." style="flex: 1;">
        <button type="button" onclick="removeDemographicQuestion(this)" class="btn-icon" style="color: #e53e3e;">
            <i class="fas fa-times"></i>
        </button>
    `;
    list.appendChild(item);
}

function removeDemographicQuestion(button) {
    button.closest('.demographic-question-item').remove();
}

function loadDemographicQuestions(questions) {
    const list = document.getElementById('demographic-questions-list');
    list.innerHTML = '';
    
    questions.forEach(question => {
        const item = document.createElement('div');
        item.className = 'demographic-question-item';
        item.style.cssText = 'display: flex; gap: 0.5rem; margin-bottom: 0.5rem;';
        item.innerHTML = `
            <input type="text" class="demographic-question" value="${question}" style="flex: 1;">
            <button type="button" onclick="removeDemographicQuestion(this)" class="btn-icon" style="color: #e53e3e;">
                <i class="fas fa-times"></i>
            </button>
        `;
        list.appendChild(item);
    });
}

function copyPublicLink() {
    const linkInput = document.getElementById('public-link-url');
    linkInput.select();
    document.execCommand('copy');
    showToast('✅ Public link copied to clipboard!', 'success');
}

function getDemographicQuestions() {
    const questions = [];
    document.querySelectorAll('.demographic-question').forEach(input => {
        const value = input.value.trim();
        if (value) {
            questions.push(value);
        }
    });
    return questions;
}