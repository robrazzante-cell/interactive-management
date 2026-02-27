// Participant Selection and Bulk Actions
// Functions for checkbox selection, bulk delete, and bulk email

// Global state for multi-select
let lastSelectedCheckbox = null;

// Toggle all participant checkboxes
function toggleAllParticipants(checked) {
    const checkboxes = document.querySelectorAll('.participant-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = checked;
    });
    updateSelectedCount();
}

// Handle multi-select with Shift+Click (like file selection)
function handleParticipantCheckboxClick(event, checkbox) {
    // Get all visible checkboxes
    const allCheckboxes = Array.from(document.querySelectorAll('.participant-checkbox:not([style*="display: none"])'));
    
    // If shift key is pressed and we have a last selected checkbox
    if (event.shiftKey && lastSelectedCheckbox && lastSelectedCheckbox !== checkbox) {
        const start = allCheckboxes.indexOf(lastSelectedCheckbox);
        const end = allCheckboxes.indexOf(checkbox);
        
        if (start !== -1 && end !== -1) {
            const [min, max] = start < end ? [start, end] : [end, start];
            const shouldCheck = checkbox.checked;
            
            // Select all checkboxes in range
            for (let i = min; i <= max; i++) {
                allCheckboxes[i].checked = shouldCheck;
            }
        }
    }
    
    // Update last selected
    lastSelectedCheckbox = checkbox;
    
    // Update the UI
    updateSelectedCount();
}

// Update selected count and show/hide bulk action buttons
function updateSelectedCount() {
    const checkboxes = document.querySelectorAll('.participant-checkbox:checked');
    const count = checkboxes.length;
    
    // Update count displays
    const countSpans = document.querySelectorAll('#selected-count, #selected-email-count, #selected-flowchart-count');
    countSpans.forEach(span => {
        span.textContent = count;
    });
    
    // Show/hide bulk action buttons
    const deleteBtn = document.getElementById('delete-selected-btn');
    const emailBtn = document.getElementById('email-selected-btn');
    const flowchartBtn = document.getElementById('download-flowcharts-btn');
    
    if (count > 0) {
        if (deleteBtn) deleteBtn.style.display = 'inline-block';
        if (emailBtn) emailBtn.style.display = 'inline-block';
        if (flowchartBtn) flowchartBtn.style.display = 'inline-block';
    } else {
        if (deleteBtn) deleteBtn.style.display = 'none';
        if (emailBtn) emailBtn.style.display = 'none';
        if (flowchartBtn) flowchartBtn.style.display = 'none';
    }
    
    // Update "select all" checkbox state
    const selectAllCheckbox = document.getElementById('select-all-participants');
    const allCheckboxes = document.querySelectorAll('.participant-checkbox');
    if (selectAllCheckbox && allCheckboxes.length > 0) {
        selectAllCheckbox.checked = count === allCheckboxes.length;
        selectAllCheckbox.indeterminate = count > 0 && count < allCheckboxes.length;
    }
}

// Delete selected participants
async function deleteSelectedParticipants() {
    const checkboxes = document.querySelectorAll('.participant-checkbox:checked');
    
    if (checkboxes.length === 0) {
        showToast('No participants selected', 'warning');
        return;
    }
    
    const participantNames = Array.from(checkboxes).map(cb => cb.dataset.name).join(', ');
    const confirmMsg = `Are you sure you want to delete ${checkboxes.length} participant(s)?\n\n${participantNames}\n\nThis action cannot be undone.`;
    
    if (!confirm(confirmMsg)) {
        return;
    }
    
    try {
        let successCount = 0;
        let errorCount = 0;
        
        // Show progress
        showToast(`Deleting ${checkboxes.length} participants...`, 'info');
        
        // Delete each selected participant
        for (const checkbox of checkboxes) {
            const participantId = checkbox.value;
            
            try {
                const response = await fetch(`/tables/participants/${participantId}`, {
                    method: 'DELETE'
                });
                
                if (response.ok || response.status === 204) {
                    successCount++;
                    console.log(`✅ Deleted participant ${participantId}`);
                } else if (response.status === 404) {
                    // Participant doesn't exist in database (phantom record)
                    successCount++; // Count as success since it's already gone
                    console.warn(`⚠️ Participant ${participantId} not found in database (phantom record)`);
                } else {
                    errorCount++;
                    const errorText = await response.text();
                    console.error(`❌ Failed to delete participant ${participantId}:`, response.status, errorText);
                }
            } catch (error) {
                errorCount++;
                console.error(`❌ Error deleting participant ${participantId}:`, error);
            }
        }
        
        // Show results
        if (errorCount === 0) {
            showToast(`✅ Successfully deleted ${successCount} participant(s)`, 'success');
        } else {
            showToast(`⚠️ Deleted ${successCount} participant(s), ${errorCount} failed`, 'warning');
        }
        
        // Reload participants table
        await loadParticipants();
        
        // Reset checkboxes
        const selectAllCheckbox = document.getElementById('select-all-participants');
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
        updateSelectedCount();
        
    } catch (error) {
        console.error('Error deleting participants:', error);
        showToast('Error deleting participants', 'error');
    }
}

// Send emails to selected participants
async function sendEmailsToSelected() {
    const checkboxes = document.querySelectorAll('.participant-checkbox:checked');
    
    if (checkboxes.length === 0) {
        showToast('No participants selected', 'warning');
        return;
    }
    
    // Get selected participant IDs
    const selectedIds = Array.from(checkboxes).map(cb => cb.value);
    const selectedNames = Array.from(checkboxes).map(cb => cb.dataset.name);
    
    // Show email type selection modal
    showEmailTypeModal(selectedIds, selectedNames);
}

// Show email type selection modal for selected participants
function showEmailTypeModal(participantIds, participantNames) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header" style="background: #0B2B26; color: #FAF3DD;">
                <h3 style="color: #FAF3DD;"><i class="fas fa-envelope"></i> Send Emails to Selected Participants</h3>
                <button class="close-btn" onclick="this.closest('.modal').remove()" style="color: #FAF3DD;">&times;</button>
            </div>
            <div class="modal-body" style="padding: 2rem;">
                <p style="margin: 0 0 1rem 0; color: #FAF3DD;">
                    <strong style="color: #FAF3DD;">${participantIds.length} participant(s) selected:</strong><br>
                    <span style="font-size: 0.9rem; color: #FAF3DD;">${participantNames.slice(0, 5).join(', ')}${participantIds.length > 5 ? `, and ${participantIds.length - 5} more...` : ''}</span>
                </p>
                
                <p style="margin: 0 0 1.5rem 0; color: #FAF3DD;">
                    Select which email type to send to the selected participants:
                </p>
                
                <div style="display: grid; gap: 1rem;">
                    <button class="btn btn-primary" 
                            onclick="sendBulkEmails(${JSON.stringify(participantIds)}, 'idea_generation'); this.closest('.modal').remove();"
                            style="background: var(--burgundy); border: none; padding: 1rem; font-size: 1rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                        <i class="fas fa-lightbulb"></i>
                        <span>Idea Generation Email</span>
                    </button>
                    
                    <button class="btn btn-primary" 
                            onclick="sendBulkEmails(${JSON.stringify(participantIds)}, 'factor_voting'); this.closest('.modal').remove();"
                            style="background: var(--burgundy); border: none; padding: 1rem; font-size: 1rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                        <i class="fas fa-vote-yea"></i>
                        <span>Factor Voting Email</span>
                    </button>
                </div>
                
                <div style="background: #FAF3DD; padding: 1rem; border-radius: 0.375rem; margin-top: 1.5rem; font-size: 0.85rem;">
                    <strong><i class="fas fa-info-circle"></i> Note:</strong> Emails will only be sent to participants who have email addresses and haven't completed the selected task.
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Send emails to specific participants (bulk)
async function sendBulkEmails(participantIds, emailType) {
    if (!AppState.currentProject) {
        showToast('Please select a project first', 'error');
        return;
    }
    
    try {
        showToast(`Preparing to send ${emailType === 'idea_generation' ? 'idea generation' : 'voting'} emails to ${participantIds.length} participant(s)...`, 'info');
        
        // Use project from AppState
        const project = AppState.currentProject;
        
        // Use already-loaded participants from AppState (avoid 404 error)
        const allParticipants = AppState.participants || [];
        
        console.log(`📧 Using ${allParticipants.length} loaded participants from AppState`);
        
        // Filter to only selected participants with emails
        const selectedParticipants = allParticipants.filter(p => 
            participantIds.includes(p.id) && 
            p.email
        );
        
        console.log(`✅ Filtered to ${selectedParticipants.length} selected participants with emails`);
        
        if (selectedParticipants.length === 0) {
            showToast('None of the selected participants have email addresses', 'warning');
            return;
        }
        
        // Filter out participants who already completed the task
        const recipientsToSend = selectedParticipants.filter(p => {
            if (emailType === 'idea_generation') {
                return !p.idea_task_completed;
            } else if (emailType === 'factor_voting') {
                return !p.voting_task_completed;
            }
            return true;
        });
        
        if (recipientsToSend.length === 0) {
            const taskName = emailType === 'idea_generation' ? 'idea generation' : 'voting';
            showToast(`All selected participants have already completed ${taskName}`, 'info');
            return;
        }
        
        // Use the existing email sending system with selected participants
        if (typeof ParticipantEmails !== 'undefined' && ParticipantEmails.sendEmails) {
            // Call the email service with the selected participants (not all)
            await ParticipantEmails.sendEmails(emailType, selectedParticipants);
            
            console.log(`✅ Email preparation complete for ${selectedParticipants.length} selected participant(s)`);
        } else {
            showToast('Email service not available', 'error');
        }
        
    } catch (error) {
        console.error('Error sending bulk emails:', error);
        showToast(`Error sending emails: ${error.message}`, 'error');
    }
}
