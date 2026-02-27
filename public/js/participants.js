// Participant Management Functions with Unique Links & Email

// Sorting state
let participantSortColumn = 'name';
let participantSortDirection = 'asc';

// Pagination state
let participantPageSize = 50;
let participantCurrentPage = 1;
let participantPageData = [];       // Full sorted array for current display
let participantPageTrackingMap = {}; // Email tracking map for current display

// Function to sort participants
async function sortParticipants(column) {
    // Toggle direction if same column
    if (participantSortColumn === column) {
        participantSortDirection = participantSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        participantSortColumn = column;
        participantSortDirection = 'asc';
    }
    
    console.log(`🔄 Sorting by ${column} (${participantSortDirection})`);
    
    // Update sort icons
    updateSortIcons();
    
    // Reload participants with new sort
    await loadParticipants();
}

// Update sort direction icons
function updateSortIcons() {
    // Reset all headers to default sort icon
    const headers = document.querySelectorAll('th[onclick^="sortParticipants"]');
    headers.forEach(header => {
        const icon = header.querySelector('.fa-sort, .fa-sort-up, .fa-sort-down');
        if (icon) {
            icon.className = 'fas fa-sort';
            icon.style.color = '#a0aec0';
        }
    });
    
    // Find the active column header and update its icon
    headers.forEach(header => {
        const columnMatch = header.getAttribute('onclick').match(/sortParticipants\('(.+?)'\)/);
        if (columnMatch && columnMatch[1] === participantSortColumn) {
            const icon = header.querySelector('.fas');
            if (icon) {
                if (participantSortDirection === 'asc') {
                    icon.className = 'fas fa-sort-up';
                    icon.style.color = '#0B2B26';
                } else {
                    icon.className = 'fas fa-sort-down';
                    icon.style.color = '#0B2B26';
                }
            }
        }
    });
}

// Function to debug participant status tracking
async function debugParticipantStatus(participantName) {
    console.log(`🔍 Debugging status for: ${participantName}`);
    
    try {
        // Fetch all email tracking
        const trackingResponse = await fetch('tables/email_tracking?limit=1000');
        const trackingData = await trackingResponse.json();
        
        // Find records for this participant
        const participantTracking = trackingData.data.filter(t => 
            (t.participant_name && t.participant_name.toLowerCase().includes(participantName.toLowerCase())) ||
            (t.email && t.email.toLowerCase().includes(participantName.toLowerCase()))
        );
        
        console.log(`📊 Found ${participantTracking.length} tracking records:`, participantTracking);
        
        // Fetch participant record
        const participantResponse = await fetch('tables/participants?limit=1000');
        const participantData = await participantResponse.json();
        
        const participant = participantData.data.find(p => 
            p.name && p.name.toLowerCase().includes(participantName.toLowerCase())
        );
        
        console.log('👤 Participant record:', participant);
        
        // Check for issues
        if (!participant) {
            console.error('❌ No participant record found!');
            return;
        }
        
        if (participantTracking.length === 0) {
            console.warn('⚠️ No email tracking records found! Status won\'t update.');
            console.log('💡 Solution: Send an email to this participant to create tracking record');
            return;
        }
        
        participantTracking.forEach(track => {
            console.log(`\n📧 ${track.email_type}:`);
            console.log('  - participant_id:', track.participant_id);
            console.log('  - email_sent:', track.email_sent);
            console.log('  - opened:', track.opened);
            console.log('  - completed_at:', track.completed_at ? new Date(track.completed_at).toLocaleString() : 'NULL');
            console.log('  - task_completed:', track.task_completed);
            
            if (track.completed_at) {
                console.log('  ✅ Should show GREEN circle');
            } else if (track.opened) {
                console.log('  🔵 Should show BLUE envelope');
            } else if (track.email_sent) {
                console.log('  🟠 Should show ORANGE envelope');
            } else {
                console.log('  ⚪ Should show GRAY circle');
            }
        });
        
    } catch (error) {
        console.error('Error debugging status:', error);
    }
}

// Function to update public participants section visibility
function updatePublicSectionVisibility() {
    const publicSection = document.getElementById('public-participants-section');
    
    if (!AppState.currentProject) {
        if (publicSection) publicSection.style.display = 'none';
        return;
    }
    
    const isPublicProject = AppState.currentProject.session_mode === 'public_project';
    
    console.log('🔍 updatePublicSectionVisibility:', {
        projectId: AppState.currentProject.id,
        projectTitle: AppState.currentProject.title,
        session_mode: AppState.currentProject.session_mode,
        isPublicProject: isPublicProject
    });
    
    if (isPublicProject) {
        console.log('✅ PUBLIC PROJECT - Showing public participants section');
        if (publicSection) publicSection.style.display = 'block';
    } else {
        console.log('❌ NON-PUBLIC PROJECT (async/in-person) - Completely hiding section');
        if (publicSection) {
            // Use display:none AND move it out of view for extra safety
            publicSection.style.display = 'none';
            publicSection.style.visibility = 'hidden';
            publicSection.style.height = '0';
            publicSection.style.overflow = 'hidden';
            publicSection.style.margin = '0';
            publicSection.style.padding = '0';
        }
    }
}

async function loadParticipants() {
    console.log('🔵 loadParticipants() called');
    
    if (!AppState.currentProject) {
        console.error('❌ No project selected!');
        showToast('Please select a project first', 'error');
        return;
    }
    
    console.log('✅ Project selected:', AppState.currentProject.title, 'ID:', AppState.currentProject.id);
    
    console.log('📡 Fetching participants...');
    let participants = await API.fetchParticipants(AppState.currentProject.id);
    console.log('✅ Fetched participants:', participants.length);
    
    // HARD FILTER: Remove these specific names from display
    const namesToHide = ['DeWitt, Natalie', 'Cunningham, Kat', 'Connery, Mollie', 'Montero, Norma', 'Powers, Meriah'];
    const beforeFilter = participants.length;
    participants = participants.filter(p => {
        const name = (p.name || p.full_name || '').trim();
        return !namesToHide.some(hiddenName => name.toLowerCase() === hiddenName.toLowerCase());
    });
    
    if (beforeFilter !== participants.length) {
        console.log(`🧹 Filtered out ${beforeFilter - participants.length} hidden participant(s)`);
    }
    
    console.log('✅ Visible participants:', participants.length);
    
    // Fetch ALL email tracking for this project in one query (not per-participant)
    const emailTrackingMap = {};
    try {
        const trackingResponse = await fetch(`/tables/email_tracking?search=${AppState.currentProject.id}&limit=10000`);
        if (trackingResponse.ok) {
            const trackingData = await trackingResponse.json();
            if (trackingData && Array.isArray(trackingData.data)) {
                trackingData.data.forEach(t => {
                    if (t.participant_id) {
                        if (!emailTrackingMap[t.participant_id]) {
                            emailTrackingMap[t.participant_id] = [];
                        }
                        emailTrackingMap[t.participant_id].push(t);
                    }
                });
            }
        }
    } catch (error) {
        console.warn('Could not load email tracking:', error.message);
    }
    
    // Sort participants alphabetically by last name
    participants.sort((a, b) => {
        // Extract last name from full name
        const getLastName = (fullName) => {
            if (!fullName) return '';
            // If already formatted as "Last, First", use the part before comma
            if (fullName.includes(',')) {
                return fullName.split(',')[0].trim().toLowerCase();
            }
            // Otherwise, get the last word (after removing titles)
            const cleanName = fullName.replace(/\b(Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.|PhD|MD)\b/gi, '').trim();
            const parts = cleanName.split(/\s+/);
            return parts[parts.length - 1].toLowerCase();
        };
        
        const lastNameA = getLastName(a.name);
        const lastNameB = getLastName(b.name);
        return lastNameA.localeCompare(lastNameB);
    });
    
    displayParticipantsTable(participants, emailTrackingMap);
    populateManagerDropdown(participants);
    
    // Load completion dashboard
    console.log('🎯 Calling loadCompletionDashboard from participants.js...');
    if (typeof window.loadCompletionDashboard === 'function') {
        window.loadCompletionDashboard();
    } else {
        console.warn('⚠️ loadCompletionDashboard not yet defined, will retry...');
        setTimeout(() => {
            if (typeof window.loadCompletionDashboard === 'function') {
                console.log('🔄 Retrying loadCompletionDashboard...');
                window.loadCompletionDashboard();
            } else {
                console.error('❌ loadCompletionDashboard still not available!');
            }
        }, 500);
    }
    
    // Auto-debug: Check for participants with missing tracking
    const participantsWithoutTracking = participants.filter(p => {
        const tracking = emailTrackingMap[p.id] || [];
        return tracking.length === 0;
    });
    
    if (participantsWithoutTracking.length > 0) {
        console.warn(`⚠️ ${participantsWithoutTracking.length} participants have NO email tracking records:`, 
            participantsWithoutTracking.map(p => p.name));
        console.log('💡 These participants\' status circles will not update until they are sent an email.');
    }
    
    // Log participant completion status for debugging
    console.log('📊 Participant Status Summary:', {
        total: participants.length,
        ideaCompleted: participants.filter(p => p.idea_task_completed).length,
        votingCompleted: participants.filter(p => p.voting_task_completed).length,
        withTracking: participants.length - participantsWithoutTracking.length
    });
    
    // Detailed status for each participant
    participants.forEach(p => {
        const tracking = emailTrackingMap[p.id] || [];
        const ideaTracking = tracking.find(t => t.email_type === 'idea_generation');
        const voteTracking = tracking.find(t => t.email_type === 'factor_voting');
        
        console.log(`👤 ${p.name}:`, {
            idea_task_completed: p.idea_task_completed || false,
            voting_task_completed: p.voting_task_completed || false,
            ideaTracking: ideaTracking ? { sent: !!ideaTracking.email_sent, completed: !!ideaTracking.completed_at } : 'none',
            voteTracking: voteTracking ? { sent: !!voteTracking.email_sent, completed: !!voteTracking.completed_at } : 'none'
        });
    });
    
    // Update public participants section visibility
    updatePublicSectionVisibility();
    
    // ✅ AUTO-SYNC COMPLETION STATUS (runs silently in background)
    autoSyncCompletionStatus();
    
    // Load public participants if this is a public project
    if (AppState.currentProject.session_mode === 'public_project') {
        await loadPublicParticipants();
    }
}

async function loadPublicParticipants() {
    try {
        const response = await fetch(`tables/public_participants?limit=1000`);
        if (!response.ok) {
            return; // Table may not exist yet
        }
        
        const result = await response.json();
        const publicParticipants = result.data.filter(p => p.project_id === AppState.currentProject.id);
        
        displayPublicParticipantsTable(publicParticipants);
        document.getElementById('public-participants-section').style.display = 'block';
    } catch (error) {
        console.error('Error loading public participants:', error);
    }
}

function displayPublicParticipantsTable(publicParticipants) {
    const tbody = document.getElementById('public-participants-tbody');
    if (!tbody) return;
    
    if (publicParticipants.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #999; padding: 2rem;">No public participants yet. Share your public link to start collecting responses!</td></tr>';
        return;
    }
    
    tbody.innerHTML = publicParticipants.map(p => {
        const demographicData = JSON.parse(p.demographic_data || '{}');
        const voteResponses = JSON.parse(p.vote_responses || '[]');
        const ideas = JSON.parse(p.idea_submissions || '[]');
        const demographicSummary = Object.entries(demographicData)
            .slice(0, 2) // Show first 2 questions only
            .map(([q, a]) => `<div style="font-size: 0.85rem; margin-bottom: 0.25rem;"><strong>${q.substring(0, 30)}:</strong> ${a}</div>`)
            .join('') || '<span style="color: #999;">No data</span>';
        
        const completedDate = p.completed_at ? new Date(p.completed_at).toLocaleDateString() : 'In progress';
        
        // Determine badge color
        let badgeColor = '#3E0505'; // pending
        if (p.completion_status === 'voting_completed') badgeColor = '#0B2B26'; // green
        if (p.completion_status === 'full_completed') badgeColor = '#0B2B26'; // purple
        
        return `
            <tr style="font-size: 0.875rem;">
                <td><code style="font-size: 0.75rem; background: #f7fafc; padding: 0.25rem 0.5rem; border-radius: 4px;">${p.session_id.substring(0, 18)}...</code></td>
                <td style="max-width: 200px;">${demographicSummary}</td>
                <td style="text-align: center;">
                    ${ideas.length > 0 ? 
                        `<span style="font-weight: 600; color: #0B2B26;">${ideas.length}</span>` : 
                        `<span style="color: #cbd5e0;">—</span>`
                    }
                </td>
                <td style="text-align: center;">
                    <span class="badge" style="background: ${badgeColor}; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">
                        ${p.completion_status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                </td>
                <td style="text-align: center; color: #4a5568;">${completedDate}</td>
                <td style="text-align: center; font-weight: 600; color: #0B2B26;">${voteResponses.length}</td>
                <td style="text-align: center;">
                    <button class="btn btn-sm" onclick="viewPublicParticipantData('${p.id}')" title="View detailed responses" style="font-size: 0.7rem; padding: 0.375rem 0.75rem; background: #0B2B26; color: white;">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function viewPublicAggregate() {
    // Switch to aggregate tab
    switchTab('aggregate');
    showToast('📊 Viewing aggregate metastructure including all public participants', 'info');
}

async function viewPublicParticipantData(participantId) {
    try {
        const response = await fetch(`tables/public_participants/${participantId}`);
        if (!response.ok) {
            throw new Error('Failed to load participant data');
        }
        
        const participant = await response.json();
        const demographicData = JSON.parse(participant.demographic_data || '{}');
        const voteResponses = JSON.parse(participant.vote_responses || '[]');
        const ideas = JSON.parse(participant.idea_submissions || '[]');
        
        // Create detailed view modal
        let detailsHTML = `
            <div style="max-width: 800px; max-height: 70vh; overflow-y: auto;">
                <h3 style="margin-bottom: 1rem; color: var(--forest-green);">
                    <i class="fas fa-user-circle"></i> Public Participant Details
                </h3>
                
                <div style="background: #f7fafc; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <strong>Session ID:</strong> <code>${participant.session_id}</code><br>
                    <strong>Status:</strong> <span class="badge" style="background: #0B2B26; color: white; padding: 0.25rem 0.5rem; border-radius: 4px;">${participant.completion_status.replace(/_/g, ' ')}</span>
                </div>
                
                ${Object.keys(demographicData).length > 0 ? `
                    <div style="margin-bottom: 1.5rem;">
                        <h4 style="color: var(--burgundy); margin-bottom: 0.5rem;">📋 Demographic Data</h4>
                        ${Object.entries(demographicData).map(([q, a]) => `
                            <div style="margin-bottom: 0.5rem; padding: 0.5rem; background: white; border-left: 3px solid #e2e8f0;">
                                <strong style="color: #4a5568;">${q}</strong><br>
                                <span style="color: #0B2B26;">${a}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                ${ideas.length > 0 ? `
                    <div style="margin-bottom: 1.5rem;">
                        <h4 style="color: var(--burgundy); margin-bottom: 0.5rem;">💡 Submitted Ideas (${ideas.length})</h4>
                        ${ideas.map((idea, idx) => `
                            <div style="margin-bottom: 0.75rem; padding: 1rem; background: #FAF3DD; border-left: 4px solid #0B2B26; border-radius: 4px;">
                                <strong style="color: #0B2B26;">Idea ${idx + 1}:</strong><br>
                                <p style="margin: 0.5rem 0 0 0; color: #0B2B26; line-height: 1.5;">${idea.idea_text}</p>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="color: var(--burgundy); margin-bottom: 0.5rem;">🗳️ Vote Responses (${voteResponses.length})</h4>
                    <p style="font-size: 0.9rem; color: #718096;">This participant completed ${voteResponses.length} ISM voting comparisons.</p>
                </div>
            </div>
        `;
        
        // Show in modal (assuming you have a modal system)
        showModal('Public Participant Data', detailsHTML);
        
    } catch (error) {
        console.error('Error viewing public participant:', error);
        showToast('Error loading participant data', 'error');
    }
}

function displayParticipantsTable(participants, emailTrackingMap = {}) {
    console.log('🔵 displayParticipantsTable() called with', participants.length, 'participants');
    
    const tbody = document.getElementById('participants-tbody');
    if (!tbody) {
        console.error('❌ participants-tbody element not found!');
        return;
    }
    
    console.log('✅ Found tbody element');
    
    if (participants.length === 0) {
        console.log('⚠️ No participants - showing empty message');
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 2rem; color: #666;">No participants yet. Add your first participant!</td></tr>';
        return;
    }
    
    console.log('✅ Rendering', participants.length, 'participants to table');
    
    // ✅ SORT PARTICIPANTS
    // Helper function to extract last name for sorting
    const getLastName = (name) => {
        if (!name) return '';
        const cleanName = name.toLowerCase().trim();
        
        // If name has comma, assume "Last, First" format
        if (cleanName.includes(',')) {
            const parts = cleanName.split(',');
            return parts[0].trim(); // Return last name
        }
        
        // If no comma, assume "First Last" format
        const nameParts = cleanName.split(/\s+/);
        if (nameParts.length >= 2) {
            return nameParts[nameParts.length - 1]; // Return last word as last name
        }
        
        return cleanName; // Single name, use as-is
    };
    
    participants.sort((a, b) => {
        let aVal = '';
        let bVal = '';
        
        if (participantSortColumn === 'name') {
            // Sort by LAST NAME first, then FULL NAME for tie-breaking
            const aLast = getLastName(a.name || a.full_name || '');
            const bLast = getLastName(b.name || b.full_name || '');
            
            // Compare last names first
            const lastNameCompare = aLast.localeCompare(bLast);
            if (lastNameCompare !== 0) {
                return participantSortDirection === 'asc' ? lastNameCompare : -lastNameCompare;
            }
            
            // If last names equal, compare full names
            aVal = (a.name || a.full_name || '').toLowerCase();
            bVal = (b.name || b.full_name || '').toLowerCase();
        } else if (participantSortColumn === 'position') {
            aVal = (a.position || a.title || '').toLowerCase();
            bVal = (b.position || b.title || '').toLowerCase();
        } else if (participantSortColumn === 'email') {
            aVal = (a.email || '').toLowerCase();
            bVal = (b.email || '').toLowerCase();
        }
        
        if (participantSortDirection === 'asc') {
            return aVal.localeCompare(bVal);
        } else {
            return bVal.localeCompare(aVal);
        }
    });
    
    // Helper function to format name as "Last, First, Title"
    const formatNameDisplay = (name) => {
        if (!name) return '';
        
        // Extract title from name if embedded
        const titles = ['Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.', 'PhD', 'MD', 'DDS', 'RN', 'DVM'];
        let cleanName = name;
        let extractedTitle = '';
        
        for (const title of titles) {
            const regex = new RegExp(`\\b${title}\\b`, 'gi');
            if (regex.test(cleanName)) {
                extractedTitle = title;
                cleanName = cleanName.replace(regex, '').trim();
                // Remove extra commas and spaces
                cleanName = cleanName.replace(/,\s*,/g, ',').replace(/^,\s*|\s*,$/g, '').trim();
                break;
            }
        }
        
        // Now format the clean name
        if (cleanName.includes(',')) {
            // Already has comma - check format
            const parts = cleanName.split(',').map(p => p.trim()).filter(p => p);
            
            if (parts.length === 2) {
                // Could be "Last, First" or "Wang, Dr. Lisa" format
                // Check if second part looks like "Title Name"
                const secondPart = parts[1];
                const hasSpaceInSecond = secondPart.includes(' ');
                
                if (hasSpaceInSecond) {
                    // Likely "Last, First Middle" - already correct
                    const formatted = `${parts[0]}, ${parts[1]}`;
                    return extractedTitle ? `${formatted}, ${extractedTitle}` : formatted;
                } else {
                    // Likely "Last, First" - correct
                    const formatted = `${parts[0]}, ${parts[1]}`;
                    return extractedTitle ? `${formatted}, ${extractedTitle}` : formatted;
                }
            } else if (parts.length > 2) {
                // Already has title: "Last, First, Title"
                return name;
            }
        } else {
            // No comma - parse "First Last" into "Last, First"
            const nameParts = cleanName.trim().split(/\s+/);
            if (nameParts.length >= 2) {
                const lastName = nameParts[nameParts.length - 1];
                const firstName = nameParts.slice(0, -1).join(' ');
                const formatted = `${lastName}, ${firstName}`;
                return extractedTitle ? `${formatted}, ${extractedTitle}` : formatted;
            }
        }
        
        return name; // Return original if can't parse
    };
    
    // Store full dataset for pagination
    participantPageData = participants;
    participantPageTrackingMap = emailTrackingMap;
    participantCurrentPage = 1;
    renderParticipantPage();
}

// Render a single row for the participants table
function renderParticipantRow(p, emailTrackingMap, formatNameDisplay) {
    const displayName = formatNameDisplay(p.name);
    const tracking = emailTrackingMap[p.id] || [];
    const ideaGenTracking = tracking.find(t => t.email_type === 'idea_generation');
    const votingTracking = tracking.find(t => t.email_type === 'factor_voting');

    const renderTaskStatus = (participantCompleted, trackingData) => {
        if (participantCompleted) {
            return '<span style="color: #0B2B26;" title="Task completed"><i class="fas fa-check-circle"></i></span>';
        }
        if (!trackingData || !trackingData.email_sent) {
            return '<span style="color: #9ca3af;" title="Not started"><i class="fas fa-circle"></i></span>';
        }
        if (trackingData.completed_at) {
            return '<span style="color: #0B2B26;" title="Task completed"><i class="fas fa-check-circle"></i></span>';
        }
        if (trackingData.opened) {
            return '<span style="color: #0B2B26;" title="Email opened - in progress"><i class="fas fa-envelope-open"></i></span>';
        }
        return '<span style="color: #3E0505;" title="Email sent - awaiting response"><i class="fas fa-envelope"></i></span>';
    };

    const ideaStatus = renderTaskStatus(p.idea_task_completed, ideaGenTracking);
    const votingStatus = renderTaskStatus(p.voting_task_completed || p.ism_completed, votingTracking);

    return `
        <tr style="font-size: 0.875rem;" data-participant-id="${p.id}">
            <td style="text-align: center;">
                <input type="checkbox" class="participant-checkbox"
                       value="${p.id}"
                       data-email="${p.email || ''}"
                       data-name="${p.name || ''}"
                       data-token="${p.access_token || ''}"
                       onclick="handleParticipantCheckboxClick(event, this)"
                       style="cursor: pointer; width: 16px; height: 16px;">
            </td>
            <td><strong style="color: #0B2B26;">${displayName}</strong></td>
            <td style="color: #4a5568;">${p.email || '<span style="color: #cbd5e0;">—</span>'}</td>
            <td style="text-align: center; padding: 0.5rem;">
                <button onclick="copyAccessToken('${p.access_token}', this)"
                        title="Click to copy access token to clipboard"
                        style="background: #FFF8DC; padding: 0.75rem 1rem; border-radius: 6px; border: 2px solid #0B2B26; cursor: pointer; font-size: 0.85rem; font-weight: 600; color: #0B2B26; transition: all 0.15s ease; display: flex; align-items: center; gap: 0.5rem; margin: 0 auto;"
                        onmouseover="this.style.background='#F5E6C8'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.15)';"
                        onmousedown="this.style.transform='translateY(1px) scale(0.98)'; this.style.boxShadow='0 1px 2px rgba(0,0,0,0.1)';"
                        onmouseup="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.15)';"
                        onmouseout="if (!this.classList.contains('copied')) { this.style.background='#FFF8DC'; this.style.transform=''; this.style.boxShadow=''; }">
                    <i class="fas fa-copy"></i> Token
                </button>
            </td>
            <td style="text-align: center; padding: 0.5rem;">
                <button onclick="copyParticipantLink('${p.access_token}', this)"
                        title="Click to copy participant portal link"
                        style="background: #FFF8DC; padding: 0.75rem 1rem; border-radius: 6px; border: 2px solid #0B2B26; cursor: pointer; font-size: 0.85rem; font-weight: 600; color: #0B2B26; transition: all 0.15s ease; display: flex; align-items: center; gap: 0.5rem; margin: 0 auto;"
                        onmouseover="this.style.background='#F5E6C8'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.15)';"
                        onmousedown="this.style.transform='translateY(1px) scale(0.98)'; this.style.boxShadow='0 1px 2px rgba(0,0,0,0.1)';"
                        onmouseup="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.15)';"
                        onmouseout="if (!this.classList.contains('copied')) { this.style.background='#FFF8DC'; this.style.transform=''; this.style.boxShadow=''; }">
                    <i class="fas fa-link"></i> Link
                </button>
            </td>
            <td style="text-align: center;" title="Idea Generation Status">
                <span style="font-size: 1rem;">${ideaStatus}</span>
            </td>
            <td style="text-align: center;" title="ISM Voting Status">
                <span style="font-size: 1rem;">${votingStatus}</span>
            </td>
            <td style="text-align: center;">
                <button class="btn btn-sm" onclick="viewParticipantFlowchart('${p.id}', '${p.name}')"
                        title="View ISM Flowchart" style="font-size: 0.7rem; padding: 0.375rem 0.75rem; background: #0B2B26; color: white;">
                    <i class="fas fa-project-diagram"></i> View
                </button>
            </td>
            <td style="text-align: center;">
                <div style="display: flex; gap: 0.375rem; justify-content: center;">
                    <button class="btn btn-sm" onclick="editParticipant('${p.id}')"
                            title="Edit participant info" style="font-size: 0.7rem; padding: 0.25rem 0.5rem; background: #0B2B26; color: #FAF3DD;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteParticipant('${p.id}')"
                            title="Delete participant" style="font-size: 0.7rem; padding: 0.25rem 0.5rem;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// Render the current page of participants
function renderParticipantPage() {
    const tbody = document.getElementById('participants-tbody');
    if (!tbody) return;

    const total = participantPageData.length;
    const totalPages = Math.max(1, Math.ceil(total / participantPageSize));
    participantCurrentPage = Math.max(1, Math.min(participantCurrentPage, totalPages));

    const startIdx = (participantCurrentPage - 1) * participantPageSize;
    const pageSlice = participantPageData.slice(startIdx, startIdx + participantPageSize);

    // Reuse the formatNameDisplay from the closure — define inline
    const formatNameDisplay = (name) => {
        if (!name) return '';
        const titles = ['Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.', 'PhD', 'MD', 'DDS', 'RN', 'DVM'];
        let cleanName = name;
        let extractedTitle = '';
        for (const title of titles) {
            const regex = new RegExp(`\\b${title}\\b`, 'gi');
            if (regex.test(cleanName)) {
                extractedTitle = title;
                cleanName = cleanName.replace(regex, '').trim();
                cleanName = cleanName.replace(/,\s*,/g, ',').replace(/^,\s*|\s*,$/g, '').trim();
                break;
            }
        }
        if (cleanName.includes(',')) {
            const parts = cleanName.split(',').map(p => p.trim()).filter(p => p);
            if (parts.length === 2) {
                const formatted = `${parts[0]}, ${parts[1]}`;
                return extractedTitle ? `${formatted}, ${extractedTitle}` : formatted;
            } else if (parts.length > 2) {
                return name;
            }
        } else {
            const nameParts = cleanName.trim().split(/\s+/);
            if (nameParts.length >= 2) {
                const lastName = nameParts[nameParts.length - 1];
                const firstName = nameParts.slice(0, -1).join(' ');
                const formatted = `${lastName}, ${firstName}`;
                return extractedTitle ? `${formatted}, ${extractedTitle}` : formatted;
            }
        }
        return name;
    };

    tbody.innerHTML = pageSlice.map(p => renderParticipantRow(p, participantPageTrackingMap, formatNameDisplay)).join('');

    // Render pagination controls
    let controlsEl = document.getElementById('participant-pagination');
    if (!controlsEl) {
        const table = tbody.closest('table');
        if (table) {
            controlsEl = document.createElement('div');
            controlsEl.id = 'participant-pagination';
            table.parentNode.insertBefore(controlsEl, table.nextSibling);
        }
    }
    if (controlsEl) {
        const showStart = total === 0 ? 0 : startIdx + 1;
        const showEnd = Math.min(startIdx + participantPageSize, total);
        controlsEl.style.cssText = 'display:flex; justify-content:center; align-items:center; gap:10px; padding:0.75rem; flex-wrap:wrap; font-size:0.875rem;';
        controlsEl.innerHTML = `
            <span style="color:#4a5568;">Showing ${showStart}–${showEnd} of ${total}</span>
            <button onclick="goToParticipantPage(1)" ${participantCurrentPage === 1 ? 'disabled' : ''}
                    style="padding:4px 10px; border:1px solid #cbd5e0; border-radius:4px; cursor:pointer; background:#fff;">First</button>
            <button onclick="goToParticipantPage(${participantCurrentPage - 1})" ${participantCurrentPage === 1 ? 'disabled' : ''}
                    style="padding:4px 10px; border:1px solid #cbd5e0; border-radius:4px; cursor:pointer; background:#fff;">Prev</button>
            <span style="font-weight:600;">Page ${participantCurrentPage} of ${totalPages}</span>
            <button onclick="goToParticipantPage(${participantCurrentPage + 1})" ${participantCurrentPage >= totalPages ? 'disabled' : ''}
                    style="padding:4px 10px; border:1px solid #cbd5e0; border-radius:4px; cursor:pointer; background:#fff;">Next</button>
            <button onclick="goToParticipantPage(${totalPages})" ${participantCurrentPage >= totalPages ? 'disabled' : ''}
                    style="padding:4px 10px; border:1px solid #cbd5e0; border-radius:4px; cursor:pointer; background:#fff;">Last</button>
        `;
    }
}

function goToParticipantPage(page) {
    const totalPages = Math.max(1, Math.ceil(participantPageData.length / participantPageSize));
    participantCurrentPage = Math.max(1, Math.min(page, totalPages));
    renderParticipantPage();
}

function showAddParticipant() {
    // Clear form
    const nameInput = document.getElementById('p-name');
    const emailInput = document.getElementById('p-email');
    const positionInput = document.getElementById('p-position');
    const departmentInput = document.getElementById('p-department');
    const phoneInput = document.getElementById('p-phone');
    const managerInput = document.getElementById('p-manager');
    
    if (nameInput) {
        nameInput.value = '';
        delete nameInput.dataset.editId; // Clear edit flag for new participant
    }
    if (emailInput) emailInput.value = '';
    if (positionInput) positionInput.value = '';
    if (departmentInput) departmentInput.value = '';
    if (phoneInput) phoneInput.value = '';
    if (managerInput) managerInput.value = '';
    
    // Update modal title
    const modalTitle = document.querySelector('#add-participant-modal .modal-header h3');
    if (modalTitle) modalTitle.textContent = 'Add Participants';
    
    showModal('add-participant-modal');
}

async function editParticipant(participantId) {
    if (!AppState.currentProject) {
        showToast('Please select a project first', 'error');
        return;
    }
    
    try {
        // Fetch all participants to find the one to edit
        const participants = await API.fetchParticipants(AppState.currentProject.id);
        const participant = participants.find(p => p.id === participantId);
        
        if (!participant) {
            showToast('Participant not found', 'error');
            return;
        }
        
        // Populate form with participant data
        const nameInput = document.getElementById('p-name');
        const emailInput = document.getElementById('p-email');
        const positionInput = document.getElementById('p-position');
        const departmentInput = document.getElementById('p-department');
        const phoneInput = document.getElementById('p-phone');
        const managerInput = document.getElementById('p-manager');
        
        if (nameInput) {
            nameInput.value = participant.name || '';
            nameInput.dataset.editId = participantId; // Set edit mode
        }
        if (emailInput) emailInput.value = participant.email || '';
        if (positionInput) positionInput.value = participant.position || '';
        if (departmentInput) departmentInput.value = participant.department || '';
        if (phoneInput) phoneInput.value = participant.phone || '';
        if (managerInput) managerInput.value = participant.manager_id || '';
        
        // Update modal title
        const modalTitle = document.querySelector('#add-participant-modal .modal-header h3');
        if (modalTitle) modalTitle.textContent = 'Edit Participant';
        
        // Switch to manual entry tab
        if (typeof switchParticipantTab === 'function') {
            switchParticipantTab('manual');
        }
        
        // Show modal
        showModal('add-participant-modal');
    } catch (error) {
        console.error('Error loading participant for edit:', error);
        showToast('Error loading participant data', 'error');
    }
}

async function submitParticipant(event) {
    event.preventDefault();
    
    if (!AppState.currentProject) {
        showToast('Please select a project first', 'error');
        return;
    }
    
    const nameInput = document.getElementById('p-name');
    const name = nameInput.value.trim();
    const email = document.getElementById('p-email').value.trim();
    const position = document.getElementById('p-position').value.trim();
    const department = document.getElementById('p-department').value.trim();
    const phone = document.getElementById('p-phone').value.trim();
    const managerId = document.getElementById('p-manager').value;
    const sendEmail = document.getElementById('send-email')?.checked || false;
    
    // Check if this is an edit or new participant
    const isEdit = nameInput.dataset.editId;
    
    try {
        if (isEdit) {
            // UPDATE existing participant
            const updateData = {
                name: name,
                email: email,
                position: position,
                department: department,
                phone: phone,
                manager_id: managerId
            };
            
            await API.updateParticipant(AppState.currentProject.id, isEdit, updateData);
            showToast('Participant updated successfully', 'success');
            
            // Clear edit flag
            delete nameInput.dataset.editId;
        } else {
            // CREATE new participant
            // Generate unique permanent access token
            const accessToken = generatePermanentToken();
            const linkDomain = window.location.origin;
            const uniqueLink = `${linkDomain}/participant.html?token=${accessToken}`;
            
            const participantData = {
                id: generateId(),
                project_id: AppState.currentProject.id,
                name: name,
                email: email,
                position: position,
                department: department,
                phone: phone,
                manager_id: managerId,
                access_token: accessToken,
                unique_link: uniqueLink,
                completion_status: 'not_started',
                session_count: 0,
                email_sent: false
            };
            
            const result = await API.addParticipant(participantData);
            
            // Send email if requested
            if (sendEmail && email) {
                await sendInvitationEmail(result.id, name, email, uniqueLink);
            }
            
            showToast('Participant added successfully', 'success');
        }
        
        closeModal('add-participant-modal');
        loadParticipants();
    } catch (error) {
        console.error('Error saving participant:', error);
        showToast(`Error ${isEdit ? 'updating' : 'adding'} participant`, 'error');
    }
}

function generatePermanentToken() {
    // Generate a long, unique token that doesn't expire
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 16);
    const hash = Math.random().toString(36).substr(2, 16);
    return `ISM-${timestamp}-${random}-${hash}`.toUpperCase();
}

async function sendInvitationEmail(participantId, name, email, uniqueLink) {
    try {
        // Construct email content
        const subject = `Invitation: ISM Structuring Session - ${AppState.currentProject?.title || 'Organizational Study'}`;
        
        const emailBody = `
Dear ${name},

You've been invited to participate in an Interpretive Structural Modeling (ISM) session.

PROJECT: ${AppState.currentProject?.title || 'N/A'}
ORGANIZATION: ${AppState.currentProject?.organization || 'N/A'}

Your unique participation link:
${uniqueLink}

This link is permanent and personal to you. You can:
- Complete the structuring session at your convenience
- Save your progress and return anytime
- Submit multiple times (each new submission replaces the previous one)
- Access your link anytime you need it

The session typically takes 20-30 minutes to complete.

If you have any questions, please contact your session facilitator.

Thank you for your participation!

---
Interactive Management Platform
        `.trim();
        
        // In production, this would call an email API
        // For now, we'll simulate email sending
        console.log('Email would be sent:', {
            to: email,
            subject: subject,
            body: emailBody
        });
        
        // Update participant record
        await fetch(`tables/participants/${participantId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email_sent: true })
        });
        
        showToast(`Invitation email sent to ${email}`, 'success');
        
        // In production, implement actual email sending here:
        // await fetch('/api/send-email', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ to: email, subject, body: emailBody })
        // });
        
    } catch (error) {
        console.error('Error sending email:', error);
        showToast('Error sending email', 'error');
    }
}

async function sendEmailToParticipant(participantId) {
    try {
        const participants = await API.fetchParticipants(AppState.currentProject.id);
        const participant = participants.find(p => p.id === participantId);
        
        if (!participant || !participant.email) {
            showToast('Participant email not found', 'error');
            return;
        }
        
        await sendInvitationEmail(
            participant.id,
            participant.name,
            participant.email,
            participant.unique_link
        );
        
        loadParticipants();
    } catch (error) {
        console.error('Error:', error);
        showToast('Error sending email', 'error');
    }
}

function copyParticipantLink(link, type = 'Link') {
    navigator.clipboard.writeText(link).then(() => {
        showToast(`${type} link copied to clipboard!`, 'success');
    }).catch(() => {
        // Fallback for older browsers
        const input = document.createElement('input');
        input.value = link;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showToast(`${type} link copied to clipboard!`, 'success');
    });
}

// Edit participant function
async function editParticipant(participantId) {
    try {
        if (!AppState.currentProject) {
            showToast('Please select a project first', 'error');
            return;
        }
        
        const participants = await API.fetchParticipants(AppState.currentProject.id);
        const participant = participants.find(p => p.id === participantId);
        
        if (!participant) {
            showToast('Participant not found', 'error');
            return;
        }
        
        // Populate the form with participant data
        const nameInput = document.getElementById('p-name');
        const emailInput = document.getElementById('p-email');
        const positionInput = document.getElementById('p-position');
        const departmentInput = document.getElementById('p-department');
        const phoneInput = document.getElementById('p-phone');
        const managerInput = document.getElementById('p-manager');
        
        if (nameInput) nameInput.value = participant.name || '';
        if (emailInput) emailInput.value = participant.email || '';
        if (positionInput) positionInput.value = participant.position || '';
        if (departmentInput) departmentInput.value = participant.department || '';
        if (phoneInput) phoneInput.value = participant.phone || '';
        if (managerInput) managerInput.value = participant.manager || '';
        
        // Store the participant ID for update
        if (nameInput) nameInput.dataset.editId = participantId;
        
        showModal('add-participant-modal');
    } catch (error) {
        console.error('Error loading participant:', error);
        showToast('Error loading participant data', 'error');
    }
}

async function viewParticipantSessions(participantId) {
    try {
        const participants = await API.fetchParticipants(AppState.currentProject.id);
        const participant = participants.find(p => p.id === participantId);
        
        if (!participant) return;
        
        // Fetch all sessions for this participant
        const allResponses = await API.fetchStructuringResponses(AppState.currentProject.id);
        const participantResponses = allResponses.filter(r => r.participant_id === participantId);
        
        // Group by session number
        const sessions = {};
        participantResponses.forEach(response => {
            const sessionNum = response.session_number || 1;
            if (!sessions[sessionNum]) {
                sessions[sessionNum] = [];
            }
            sessions[sessionNum].push(response);
        });
        
        let message = `${participant.name} - Session History:\n\n`;
        message += `Total Sessions: ${Object.keys(sessions).length}\n`;
        message += `Last Session: ${participant.last_session_date ? new Date(participant.last_session_date).toLocaleDateString() : 'N/A'}\n\n`;
        
        for (const sessionNum in sessions) {
            message += `Session ${sessionNum}: ${sessions[sessionNum].length} responses\n`;
        }
        
        alert(message);
    } catch (error) {
        console.error('Error:', error);
        showToast('Error loading session history', 'error');
    }
}

function populateManagerDropdown(participants) {
    const select = document.getElementById('p-manager');
    if (!select) return;
    
    select.innerHTML = '<option value="">None (Top Level)</option>' +
        participants.map(p => `<option value="${p.id}">${p.name} - ${p.position || 'N/A'}</option>`).join('');
}

async function deleteParticipant(participantId) {
    if (!confirm('Are you sure you want to remove this participant? This will also delete their structuring responses.')) return;
    
    try {
        await fetch(`tables/participants/${participantId}`, {
            method: 'DELETE'
        });
        showToast('Participant removed', 'success');
        loadParticipants();
    } catch (error) {
        console.error('Error deleting participant:', error);
        showToast('Error removing participant', 'error');
    }
}

async function importParticipants() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const text = await file.text();
        const rows = text.split('\n').map(row => row.split(','));
        const headers = rows[0].map(h => h.trim().toLowerCase());
        
        let imported = 0;
        
        for (let i = 1; i < rows.length; i++) {
            if (rows[i].length < 2) continue;
            
            const accessToken = generatePermanentToken();
            // Get the full path including /api/code_sandbox_light/preview/xxx
            const currentPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
            const fullBaseUrl = window.location.origin + currentPath;
            
            const participant = {
                id: generateId(),
                project_id: AppState.currentProject.id,
                access_token: accessToken,
                unique_link: `${fullBaseUrl}/participant.html?token=${accessToken}`,
                completion_status: 'not_started',
                session_count: 0,
                email_sent: false
            };
            
            headers.forEach((header, index) => {
                const value = rows[i][index]?.trim() || '';
                if (header === 'name') participant.name = value;
                else if (header === 'email') participant.email = value;
                else if (header === 'position' || header === 'title') participant.position = value;
                else if (header === 'department') participant.department = value;
                else if (header === 'phone') participant.phone = value;
                else if (header === 'manager' || header === 'manager_name') {
                    // Would need to match manager name to ID - for now store as reference
                    participant.manager_name_ref = value;
                }
            });
            
            if (participant.name) {
                try {
                    const result = await API.addParticipant(participant);
                    
                    // Optionally send email to imported participants
                    if (participant.email) {
                        await sendInvitationEmail(
                            result.id,
                            participant.name,
                            participant.email,
                            participant.unique_link
                        );
                    }
                    
                    imported++;
                } catch (error) {
                    console.error('Error importing participant:', error);
                }
            }
        }
        
        showToast(`Imported ${imported} participants and sent invitation emails`, 'success');
        loadParticipants();
    };
    
    input.click();
}

async function uploadOrgChart() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        showToast('Processing organizational chart...', 'info');
        
        // Parse org chart file
        const text = await file.text();
        const rows = text.split('\n').map(row => row.split(','));
        const headers = rows[0].map(h => h.trim().toLowerCase());
        
        // First pass: Create all participants
        const participantMap = new Map();
        
        for (let i = 1; i < rows.length; i++) {
            if (rows[i].length < 2) continue;
            
            const accessToken = generatePermanentToken();
            // Get the full path including /api/code_sandbox_light/preview/xxx
            const currentPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
            const fullBaseUrl = window.location.origin + currentPath;
            
            const participant = {
                id: generateId(),
                project_id: AppState.currentProject.id,
                access_token: accessToken,
                unique_link: `${fullBaseUrl}/participant.html?token=${accessToken}`,
                completion_status: 'not_started',
                session_count: 0,
                email_sent: false
            };
            
            let managerName = '';
            
            headers.forEach((header, index) => {
                const value = rows[i][index]?.trim() || '';
                if (header === 'name' || header === 'employee_name') participant.name = value;
                else if (header === 'email') participant.email = value;
                else if (header === 'position' || header === 'title' || header === 'job_title') participant.position = value;
                else if (header === 'department') participant.department = value;
                else if (header === 'manager' || header === 'manager_name' || header === 'reports_to') {
                    managerName = value;
                }
            });
            
            if (participant.name) {
                participantMap.set(participant.name, {
                    data: participant,
                    managerName: managerName
                });
            }
        }
        
        // Second pass: Link managers
        let imported = 0;
        for (const [name, info] of participantMap.entries()) {
            if (info.managerName && participantMap.has(info.managerName)) {
                // Will be set after all participants are created
                info.data.manager_name_ref = info.managerName;
            }
            
            try {
                const result = await API.addParticipant(info.data);
                info.data.id = result.id;
                imported++;
            } catch (error) {
                console.error('Error importing participant:', error);
            }
        }
        
        // Third pass: Update manager IDs
        for (const [name, info] of participantMap.entries()) {
            if (info.managerName && participantMap.has(info.managerName)) {
                const managerId = participantMap.get(info.managerName).data.id;
                try {
                    await fetch(`tables/participants/${info.data.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ manager_id: managerId })
                    });
                } catch (error) {
                    console.error('Error updating manager relationship:', error);
                }
            }
        }
        
        showToast(`Imported ${imported} participants from organizational chart`, 'success');
        loadParticipants();
    };
    
    input.click();
}

// Send individual idea generation email
async function sendIndividualIdeaEmail(participantId) {
    if (!AppState.currentProject) {
        showToast('Please select a project first', 'error');
        return;
    }

    try {
        // Get project and participant
        const projectResponse = await fetch(`/tables/projects/${AppState.currentProject.id}`);
        const project = await projectResponse.json();
        
        const participantsResponse = await fetch(`/tables/participants?search=${AppState.currentProject.id}`);
        const participantsData = await participantsResponse.json();
        const allParticipants = Array.isArray(participantsData) ? participantsData : (participantsData.data || []);
        const participant = allParticipants.find(p => p.id === participantId);

        if (!participant || !participant.email) {
            showToast('Participant email not found', 'error');
            return;
        }

        if (!project.trigger_question || !project.context_statement) {
            showToast('Please complete Workshop Setup first (trigger question and context statement required)', 'error');
            return;
        }

        // Generate email
        const email = EmailService.generateIdeaGenerationEmail(participant, project);
        
        // Show choice modal: Gmail or Email Client
        showSendChoiceModal(email, 'idea_generation', participant);

        // Create or update email tracking
        const trackingId = `TRK-${Date.now()}-${participant.id.substring(0, 8)}`;
        await fetch('/tables/email_tracking', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                id: trackingId,
                campaign_id: `IND-IDEA-${Date.now()}`,
                participant_id: participant.id,
                participant_name: participant.name,
                participant_email: participant.email,
                email_type: 'idea_generation',
                email_sent: true,
                opened: false,
                completed_at: null,
                sent_at: Date.now()
            })
        });

        showToast(`Idea generation email opened for ${participant.name}`, 'success');
        
        // Reload participants to update status
        setTimeout(() => loadParticipants(), 1000);
    } catch (error) {
        console.error('Error sending email:', error);
        showToast('Error sending email', 'error');
    }
}

// Send individual voting email
async function sendIndividualVotingEmail(participantId) {
    if (!AppState.currentProject) {
        showToast('Please select a project first', 'error');
        return;
    }

    try {
        // Get project and participant
        const projectResponse = await fetch(`/tables/projects/${AppState.currentProject.id}`);
        const project = await projectResponse.json();
        
        const participantsResponse = await fetch(`/tables/participants?search=${AppState.currentProject.id}`);
        const participantsData = await participantsResponse.json();
        const allParticipants = Array.isArray(participantsData) ? participantsData : (participantsData.data || []);
        const participant = allParticipants.find(p => p.id === participantId);

        if (!participant || !participant.email) {
            showToast('Participant email not found', 'error');
            return;
        }

        // Get themes from coded_themes (all themes auto-flow to voting, no selection needed)
        const themesResponse = await fetch(`/tables/coded_themes?search=${AppState.currentProject.id}`);
        const themesData = await themesResponse.json();
        const themes = (themesData.data || []).filter(f => f.project_id === AppState.currentProject.id);

        if (themes.length === 0) {
            showToast('Please generate themes first before sending voting emails', 'error');
            return;
        }
        
        const factors = themes; // Use themes as factors for voting

        if (!project.context_statement) {
            showToast('Please complete Workshop Setup first (context statement required)', 'error');
            return;
        }

        // Generate email
        const email = EmailService.generateVotingEmail(participant, project, factors);
        
        // Open email client
        EmailService.sendViaMailto(email.to, email.subject, email.body);

        // Create or update email tracking
        const trackingId = `TRK-${Date.now()}-${participant.id.substring(0, 8)}`;
        await fetch('/tables/email_tracking', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                id: trackingId,
                campaign_id: `IND-VOTE-${Date.now()}`,
                participant_id: participant.id,
                participant_name: participant.name,
                participant_email: participant.email,
                email_type: 'factor_voting',
                email_sent: true,
                opened: false,
                completed_at: null,
                sent_at: Date.now()
            })
        });

        // Show choice modal: Gmail or Email Client
        showSendChoiceModal(email, 'voting', participant);
        
    } catch (error) {
        console.error('Error sending email:', error);
        showToast('Error sending email', 'error');
    }
}

// Helper function to show send choice modal for individual emails
function showSendChoiceModal(email, emailType, participant) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 550px;">
            <div class="modal-header" style="background: #0B2B26; color: #FAF3DD;">
                <h3 style="color: #FAF3DD;"><i class="fas fa-paper-plane"></i> Send Email to ${participant.name || participant.full_name}</h3>
                <button class="close-btn" onclick="this.closest('.modal').remove()" style="color: #FAF3DD;">&times;</button>
            </div>
            <div class="modal-body">
                <p style="margin: 0 0 1.5rem 0; color: #FAF3DD;">
                    Choose how you want to send this email:
                </p>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div style="border: 2px solid #0B2B26; border-radius: 0.5rem; padding: 1.25rem; cursor: pointer; transition: all 0.15s;" onclick="sendViaGmailWeb('${email.to.replace(/'/g, "\\'")}', \`${email.subject.replace(/`/g, '\\`')}\`, \`${email.body.replace(/`/g, '\\`')}\`, '${emailType}', '${participant.id}'); this.closest('.modal').remove();" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(66,133,244,0.3)';" onmousedown="this.style.transform='scale(0.98)'; this.style.boxShadow='0 1px 2px rgba(66,133,244,0.2)';" onmouseup="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(66,133,244,0.3)';" onmouseout="this.style.transform=''; this.style.boxShadow='';">
                        <div style="text-align: center;">
                            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">
                                <i class="fab fa-google" style="color: #0B2B26;"></i>
                            </div>
                            <h4 style="margin: 0 0 0.5rem 0; color: #0B2B26; font-size: 1rem;">Gmail Web</h4>
                            <p style="font-size: 0.8rem; color: #666; margin: 0;">
                                Copy & paste<br>(Recommended)
                            </p>
                        </div>
                    </div>

                    <div style="border: 2px solid #666; border-radius: 0.5rem; padding: 1.25rem; cursor: pointer; transition: all 0.15s;" onclick="EmailService.sendViaMailto('${email.to}', \`${email.subject.replace(/`/g, '\\`')}\`, \`${email.body.replace(/`/g, '\\`')}\`); trackEmailSent('${emailType}', '${participant.id}'); this.closest('.modal').remove();" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';" onmousedown="this.style.transform='scale(0.98)'; this.style.boxShadow='0 1px 2px rgba(0,0,0,0.05)';" onmouseup="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';" onmouseout="this.style.transform=''; this.style.boxShadow='';">
                        <div style="text-align: center;">
                            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">
                                <i class="fas fa-envelope" style="color: #666;"></i>
                            </div>
                            <h4 style="margin: 0 0 0.5rem 0; color: #0B2B26; font-size: 1rem;">Email Client</h4>
                            <p style="font-size: 0.8rem; color: #666; margin: 0;">
                                Open in<br>Outlook/Mail
                            </p>
                        </div>
                    </div>
                </div>

                <div style="background: #FAF3DD; padding: 1rem; border-radius: 0.375rem; margin-top: 1.5rem; font-size: 0.85rem;">
                    <strong>💡 Tip:</strong> Gmail Web is easier if you use webmail!
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Send via Gmail web browser
async function sendViaGmailWeb(to, subject, body, emailType, participantId) {
    if (typeof GmailHelper !== 'undefined') {
        GmailHelper.copyAndOpenGmail(to, subject, body, 1, 1);
    } else {
        // Fallback to mailto
        EmailService.sendViaMailto(to, subject, body);
    }
    await trackEmailSent(emailType, participantId);
    
    // Show confirmation
    const emailTypeName = emailType === 'idea_generation' ? 'Idea Generation' : 'Voting';
    showToast(`✅ ${emailTypeName} email sent successfully!`, 'success');
}

// Track email sent
async function trackEmailSent(emailType, participantId) {
    try {
        const trackingId = `TRK-${Date.now()}-${participantId.substring(0, 8)}`;
        await fetch('/tables/email_tracking', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                id: trackingId,
                campaign_id: `IND-${emailType.toUpperCase()}-${Date.now()}`,
                participant_id: participantId,
                email_type: emailType,
                email_sent: true,
                opened: false,
                completed_at: null,
                sent_at: Date.now()
            })
        });
        
        // Show confirmation toast
        const emailTypeName = emailType === 'idea_generation' ? 'Idea Generation' : 'Voting';
        showToast(`✅ ${emailTypeName} email sent successfully!`, 'success');
        
        // Reload participants to update status
        setTimeout(() => loadParticipants(), 1000);
    } catch (error) {
        console.error('Error tracking email:', error);
        showToast('❌ Error tracking email', 'error');
    }
}

// View participant flowchart (fullscreen overlay)
async function viewParticipantFlowchart(participantId, participantName) {
    try {
        console.log('Loading flowchart for participant:', participantId);

        // Load factors (themes) first
        const themesResponse = await fetch(`/tables/coded_themes?limit=1000`);
        const themesData = await themesResponse.json();
        const projectThemes = themesData.data.filter(t => t.project_id === AppState.currentProject.id);

        // Fetch participant data (which includes flowchart)
        const response = await fetch(`/tables/participants/${participantId}`);
        if (!response.ok) throw new Error('Failed to load participant data');

        const participant = await response.json();

        // Try stored flowchart_data first, fall back to participant.flowchart
        let storedData = null;
        if (participant.flowchart_data) {
            try {
                storedData = typeof participant.flowchart_data === 'string' ? JSON.parse(participant.flowchart_data) : participant.flowchart_data;
            } catch(e) { /* ignore parse error */ }
        }

        const levels = (storedData && storedData.levels) || (participant.flowchart && participant.flowchart.levels);
        const matrix = (storedData && storedData.adjacencyMatrix) || (participant.flowchart && participant.flowchart.adjacencyMatrix);
        const factors = (storedData && storedData.factors) || projectThemes;

        if (!levels || !matrix) {
            showToast(`${participantName} has not completed voting yet`, 'info');
            return;
        }

        // Generate full ISM flowchart data using Warfield's algorithm
        const flowchartData = FlowchartISM.generateFlowchartData(factors, matrix);

        // Use stored levels if available (they're validated at save time)
        if (storedData && storedData.levels) {
            flowchartData.levels = storedData.levels;
        }

        // Show fullscreen flowchart overlay
        FlowchartISM.showFullscreen(flowchartData, factors, 'ISM Hierarchical Structure - ' + participantName);

        console.log('Flowchart displayed successfully');

    } catch (error) {
        console.error('Error loading flowchart:', error);
        showToast('Error loading flowchart', 'error');
    }
}

// Draw participant flowchart on admin canvas
function drawParticipantFlowchart(levels, G) {
    const canvas = document.getElementById('participant-flowchart-canvas');
    if (!canvas) {
        console.error('❌ Canvas element not found');
        return;
    }
    const ctx = canvas.getContext('2d');
    
    console.log('🎨 Drawing participant flowchart with', levels.length, 'levels');
    
    // Get factors from window state (loaded from voting page)
    const factors = window.votingFactors || [];
    
    // Fixed dimensions
    const boxWidth = 200;
    const boxHeight = 80;
    const levelSpacing = 300;
    
    // Calculate canvas size
    const canvasWidth = Math.max(800, 200 + (levels.length * levelSpacing));
    const canvasHeight = 400;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    console.log('📐 Canvas dimensions:', canvasWidth, 'x', canvasHeight);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Calculate node positions
    const nodePositions = [];
    levels.forEach((level, idx) => {
        const x = 100 + (idx * levelSpacing);
        const y = canvasHeight / 2;
        nodePositions.push({
            x: x,
            y: y,
            factors: level
        });
    });
    
    // Draw edges (arrows) first
    for (let fromLevel = 0; fromLevel < levels.length; fromLevel++) {
        for (let toLevel = 0; toLevel < levels.length; toLevel++) {
            if (fromLevel === toLevel) continue;
            
            // Check if there's any edge between these levels
            let hasEdge = false;
            for (const fromFactor of levels[fromLevel]) {
                for (const toFactor of levels[toLevel]) {
                    if (G[fromFactor][toFactor] === 1) {
                        hasEdge = true;
                        break;
                    }
                }
                if (hasEdge) break;
            }
            
            if (hasEdge) {
                const fromPos = nodePositions[fromLevel];
                const toPos = nodePositions[toLevel];
                
                // Draw arrow
                ctx.beginPath();
                ctx.strokeStyle = '#0B2B26';
                ctx.lineWidth = 2.5;
                ctx.setLineDash([]);
                
                const fromX = fromPos.x + boxWidth / 2;
                const fromY = fromPos.y;
                const toX = toPos.x - boxWidth / 2;
                const toY = toPos.y;
                
                ctx.moveTo(fromX, fromY);
                ctx.lineTo(toX, toY);
                ctx.stroke();
                
                // Draw arrowhead
                const angle = Math.atan2(toY - fromY, toX - fromX);
                const arrowSize = 12;
                ctx.beginPath();
                ctx.fillStyle = '#0B2B26';
                ctx.moveTo(toX, toY);
                ctx.lineTo(toX - arrowSize * Math.cos(angle - Math.PI / 6), 
                           toY - arrowSize * Math.sin(angle - Math.PI / 6));
                ctx.lineTo(toX - arrowSize * Math.cos(angle + Math.PI / 6), 
                           toY - arrowSize * Math.sin(angle + Math.PI / 6));
                ctx.closePath();
                ctx.fill();
            }
        }
    }
    
    // Draw nodes (boxes)
    nodePositions.forEach((pos, levelIdx) => {
        const factorsInLevel = pos.factors;
        const numFactors = factorsInLevel.length;
        const height = Math.max(boxHeight, 60 + numFactors * 25);
        
        const x = pos.x - boxWidth / 2;
        const y = pos.y - height / 2;
        
        // Standard box styling for all factors
        ctx.fillStyle = '#FAF3DD';
        ctx.strokeStyle = '#0B2B26';
        ctx.lineWidth = 3;
        
        // Draw shadow
        ctx.shadowColor = 'rgba(11, 43, 38, 0.2)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
        
        ctx.beginPath();
        
        // Use roundRect if available
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(x, y, boxWidth, height, 8);
        } else {
            ctx.rect(x, y, boxWidth, height);
        }
        ctx.fill();
        ctx.stroke();
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Draw factor names
        ctx.fillStyle = '#0B2B26';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (numFactors === 1) {
            // Single factor
            const factorName = factors[factorsInLevel[0]]?.name || `Factor ${factorsInLevel[0]}`;
            ctx.fillText(factorName, pos.x, pos.y);
        } else {
            // Multiple factors in same box (cycle/SCC)
            ctx.font = 'bold 14px Arial';
            const lineHeight = 22;
            const startY = pos.y - ((numFactors - 1) * lineHeight) / 2;
            
            factorsInLevel.forEach((factorIdx, idx) => {
                const factorName = factors[factorIdx]?.name || `Factor ${factorIdx}`;
                const factorY = startY + idx * lineHeight;
                ctx.fillText(factorName, pos.x, factorY);
            });
        }
    });
    
    // Initialize drag functionality
    initializeAdminFlowchartDrag();
    
    // Start zoomed out 1x (0.83x scale) for better overview
    canvas.style.transform = 'scale(0.83)';
    canvas.style.transformOrigin = 'center center';
    console.log('🔍 Initial zoom set to 0.83x (zoomed out 1x)');
    
    console.log('✅ Participant flowchart rendered successfully');
}

// Initialize drag functionality for admin flowchart viewer
function initializeAdminFlowchartDrag() {
    const canvas = document.getElementById('participant-flowchart-canvas');
    const wrapper = document.getElementById('participant-flowchart-wrapper');
    if (!canvas || !wrapper) return;
    
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let scrollLeft = 0;
    let scrollTop = 0;
    
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.pageX - wrapper.offsetLeft;
        startY = e.pageY - wrapper.offsetTop;
        scrollLeft = wrapper.scrollLeft;
        scrollTop = wrapper.scrollTop;
        canvas.style.cursor = 'grabbing';
    });
    
    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
        canvas.style.cursor = 'grab';
    });
    
    canvas.addEventListener('mouseup', () => {
        isDragging = false;
        canvas.style.cursor = 'grab';
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - wrapper.offsetLeft;
        const y = e.pageY - wrapper.offsetTop;
        const walkX = (x - startX) * 1.5;
        const walkY = (y - startY) * 1.5;
        wrapper.scrollLeft = scrollLeft - walkX;
        wrapper.scrollTop = scrollTop - walkY;
    });
    
    console.log('✅ Admin flowchart drag functionality initialized');
}

// Close participant flowchart viewer
function closeParticipantFlowchart() {
    const section = document.getElementById('participant-flowchart-section');
    if (section) {
        section.style.display = 'none';
    }
}

// Save All Participants to Database
async function saveAllParticipants() {
    if (!AppState.currentProject) {
        showToast('Please select a project first', 'error');
        return;
    }
    
    try {
        console.log('🔄 Starting to save all participants to database...');
        
        // Show loading toast
        showToast('Saving participants to database...', 'info');
        
        // Get current participants from the view
        const participants = await API.fetchParticipants(AppState.currentProject.id);
        
        console.log(`Found ${participants.length} participants to verify/save`);
        
        if (participants.length === 0) {
            showToast('No participants to save. Add participants first!', 'warning');
            return;
        }
        
        let savedCount = 0;
        let alreadyExistsCount = 0;
        let errorCount = 0;
        
        // Process each participant
        for (const participant of participants) {
            try {
                // Check if participant already exists in database
                const checkResponse = await fetch(`/tables/participants/${participant.id}`);
                
                if (checkResponse.ok) {
                    // Participant exists, update it to ensure all fields are current
                    const updateResponse = await fetch(`/tables/participants/${participant.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(participant)
                    });
                    
                    if (updateResponse.ok) {
                        alreadyExistsCount++;
                        console.log(`✓ Updated participant: ${participant.name}`);
                    } else {
                        errorCount++;
                        console.error(`✗ Failed to update participant: ${participant.name}`);
                    }
                } else {
                    // Participant doesn't exist, create it
                    const createResponse = await fetch('/tables/participants', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(participant)
                    });
                    
                    if (createResponse.ok) {
                        savedCount++;
                        console.log(`✓ Created participant: ${participant.name}`);
                    } else {
                        errorCount++;
                        console.error(`✗ Failed to create participant: ${participant.name}`);
                    }
                }
            } catch (error) {
                errorCount++;
                console.error(`✗ Error processing participant ${participant.name}:`, error);
            }
        }
        
        // Show summary
        const total = savedCount + alreadyExistsCount + errorCount;
        let message = `Participants saved: ${savedCount} new, ${alreadyExistsCount} updated`;
        if (errorCount > 0) {
            message += `, ${errorCount} errors`;
        }
        
        console.log(`\n📊 Summary:
        • Total processed: ${total}
        • New participants saved: ${savedCount}
        • Existing participants updated: ${alreadyExistsCount}
        • Errors: ${errorCount}`);
        
        showToast(message, errorCount > 0 ? 'warning' : 'success');
        
        // Reload participants to reflect any changes
        setTimeout(() => loadParticipants(), 500);
        
        // Also show a confirmation modal with details
        showSaveConfirmation(savedCount, alreadyExistsCount, errorCount, participants.length);
        
    } catch (error) {
        console.error('Error saving participants:', error);
        showToast('Error saving participants to database', 'error');
    }
}

// Show save confirmation modal
function showSaveConfirmation(newCount, updatedCount, errorCount, total) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    const successIcon = errorCount === 0 ? '✅' : '⚠️';
    const statusColor = errorCount === 0 ? '#0B2B26' : '#0B2B26';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3><i class="fas fa-save"></i> Save Participants Complete</h3>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div style="text-align: center; padding: 1.5rem 0;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">
                        ${successIcon}
                    </div>
                    <h2 style="color: ${statusColor}; margin-bottom: 1rem;">
                        Participants Saved!
                    </h2>
                </div>
                
                <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 1rem;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; text-align: center;">
                        <div>
                            <div style="font-size: 2rem; font-weight: bold; color: #0B2B26;">
                                ${newCount}
                            </div>
                            <div style="color: #666; font-size: 0.9rem;">
                                New Saved
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 2rem; font-weight: bold; color: #0B2B26;">
                                ${updatedCount}
                            </div>
                            <div style="color: #666; font-size: 0.9rem;">
                                Updated
                            </div>
                        </div>
                    </div>
                    ${errorCount > 0 ? `
                        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #ddd; text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: #3E0505;">
                                ${errorCount}
                            </div>
                            <div style="color: #666; font-size: 0.9rem;">
                                Errors
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div style="background: #FAF3DD; padding: 1rem; border-radius: 0.375rem; margin-bottom: 1rem;">
                    <p style="margin: 0; font-size: 0.9rem;">
                        <strong>✓ Total participants processed:</strong> ${total}
                    </p>
                    <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">
                        All participants are now in the database and ready to receive links!
                    </p>
                </div>
                
                <div style="text-align: center;">
                    <button class="btn btn-primary" onclick="this.closest('.modal').remove()">
                        Got It!
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Copy access token to clipboard
function copyAccessToken(token, buttonElement) {
    navigator.clipboard.writeText(token).then(() => {
        // Change button text to "Copied" temporarily
        if (buttonElement) {
            const originalHTML = buttonElement.innerHTML;
            buttonElement.innerHTML = '<i class="fas fa-check"></i> Copied';
            buttonElement.style.background = '#0B2B26'; // Green background
            buttonElement.style.color = 'white';
            
            // Revert after 2 seconds
            setTimeout(() => {
                buttonElement.innerHTML = originalHTML;
                buttonElement.style.background = '#FFF8DC';
                buttonElement.style.color = '#0B2B26';
            }, 2000);
        }
        showToast('✅ Access token copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Error copying token:', err);
        showToast('❌ Failed to copy token', 'error');
    });
}

// Copy participant portal link to clipboard
function copyParticipantLink(token, buttonElement) {
    if (!token) {
        showToast('No token available', 'error');
        return;
    }
    
    // Build the full participant portal URL
    const baseUrl = window.location.origin + window.location.pathname.replace('admin.html', '');
    const portalUrl = `${baseUrl}participant-portal.html?token=${token}`;
    
    navigator.clipboard.writeText(portalUrl).then(() => {
        // Visual feedback
        if (buttonElement) {
            const originalHTML = buttonElement.innerHTML;
            buttonElement.innerHTML = '<i class="fas fa-check"></i> Copied';
            buttonElement.style.background = '#0B2B26'; // Green background
            buttonElement.style.color = 'white';
            
            // Revert after 2 seconds
            setTimeout(() => {
                buttonElement.innerHTML = originalHTML;
                buttonElement.style.background = '#FFF8DC';
                buttonElement.style.color = '#0B2B26';
            }, 2000);
        }
        showToast('✅ Participant link copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Error copying link:', err);
        showToast('❌ Failed to copy link', 'error');
    });
}

// Preview participant portal
function previewParticipantPortal(accessToken) {
    // Open the REAL interactive portal with the actual token
    // This allows admin to complete tasks on behalf of participants
    const portalUrl = `participant.html?token=${accessToken}`;
    
    // Open in new tab
    window.open(portalUrl, '_blank');
    
    showToast('📋 Opening live participant portal - changes will be saved', 'info');
}

// Auto-sync completion status (runs silently on page load)
async function autoSyncCompletionStatus() {
    console.log('🔍 AUTO-SYNC STARTING...');
    
    if (!AppState.currentProject?.id) {
        console.log('❌ No project selected - skipping auto-sync');
        return;
    }
    
    const projectId = AppState.currentProject.id;
    console.log('✅ Project found:', AppState.currentProject.projectTitle);
    console.log('✅ Project ID:', projectId);
    
    try {
        console.log('📊 Fetching data for project:', projectId);
        
        // Fetch all data
        const [participantsResp, ideasResp, votesResp] = await Promise.all([
            fetch(`tables/participants?project_id=${projectId}`),
            fetch(`tables/idea_responses?project_id=${projectId}`),
            fetch(`tables/ism_votes?project_id=${projectId}`)
        ]);
        
        const participantsData = await participantsResp.json();
        const ideasData = await ideasResp.json();
        const votesData = await votesResp.json();
        
        const participants = Array.isArray(participantsData) ? participantsData : (participantsData.data || []);
        const ideas = Array.isArray(ideasData) ? ideasData : (ideasData.data || []);
        const votes = Array.isArray(votesData) ? votesData : (votesData.data || []);
        
        console.log(`📊 Data loaded: ${participants.length} participants, ${ideas.length} ideas, ${votes.length} votes`);
        
        // Show which participants have ideas
        const participantsWithIdeas = [];
        ideas.forEach(idea => {
            const name = idea.participant_name || 'Unknown';
            if (!participantsWithIdeas.includes(name)) {
                participantsWithIdeas.push(name);
            }
        });
        console.log('💡 Participants with submitted ideas:', participantsWithIdeas);
        
        let updatedCount = 0;
        
        // Check each participant
        for (const participant of participants) {
            // ID-ONLY MATCHING - Most reliable, no false positives!
            // participant.html saves participant_id when submitting ideas
            const participantIdeas = ideas.filter(idea => {
                // Match ONLY by participant ID (bulletproof!)
                return idea.participant_id === participant.id;
            });
            
            // Match votes by ID only (same logic)
            const participantVotes = votes.filter(vote => {
                return vote.participant_id === participant.id;
            });
            
            const shouldHaveIdeaCompleted = participantIdeas.length > 0;
            const shouldHaveVotingCompleted = participantVotes.length > 0;
            
            // Log each participant with ideas (simple and clear)
            if (shouldHaveIdeaCompleted) {
                console.log(`✅ ${participant.name} (ID: ${participant.id}) has ${participantIdeas.length} idea(s)`);
                participantIdeas.forEach((idea, idx) => {
                    console.log(`   💡 Idea ${idx + 1}: "${idea.idea_text?.substring(0, 60)}..."`);
                });
            }
            
            // Update if needed (with detailed logging)
            if (shouldHaveIdeaCompleted !== participant.idea_task_completed || 
                shouldHaveVotingCompleted !== participant.voting_task_completed) {
                
                console.log(`🔄 UPDATING ${participant.name} (ID: ${participant.id}):`);
                console.log(`   - idea_completed: ${participant.idea_task_completed} → ${shouldHaveIdeaCompleted}`);
                console.log(`   - voting_completed: ${participant.voting_task_completed} → ${shouldHaveVotingCompleted}`);
                console.log(`   - Reason: Found ${participantIdeas.length} idea(s), ${participantVotes.length} vote(s)`);
                
                const updates = {
                    idea_task_completed: shouldHaveIdeaCompleted,
                    voting_task_completed: shouldHaveVotingCompleted
                };
                
                await fetch(`tables/participants/${participant.id}`, {
                    method: 'PATCH',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(updates)
                });
                
                updatedCount++;
            }
        }
        
        if (updatedCount > 0) {
            console.log(`🔄 Auto-synced ${updatedCount} participant status(es)`);
            // Silently reload to show updated status
            setTimeout(() => loadParticipants(), 500);
        }
    } catch (error) {
        console.error('Auto-sync error (non-critical):', error);
    }
}

// DEBUG: Show detailed status sync information
async function debugStatusSync() {
    console.log('🐛 ==================== DEBUG STATUS SYNC ====================');
    
    if (!AppState.currentProject?.id) {
        alert('No project selected!');
        return;
    }
    
    const projectId = AppState.currentProject.id;
    console.log('📊 Project ID:', projectId);
    console.log('📊 Project Title:', AppState.currentProject.projectTitle);
    
    try {
        // Fetch all data
        const [participantsResp, ideasResp, votesResp] = await Promise.all([
            fetch(`tables/participants?project_id=${projectId}`),
            fetch(`tables/idea_responses?project_id=${projectId}`),
            fetch(`tables/ism_votes?project_id=${projectId}`)
        ]);
        
        const participantsData = await participantsResp.json();
        const ideasData = await ideasResp.json();
        const votesData = await votesResp.json();
        
        const participants = Array.isArray(participantsData) ? participantsData : (participantsData.data || []);
        const ideas = Array.isArray(ideasData) ? ideasData : (ideasData.data || []);
        const votes = Array.isArray(votesData) ? votesData : (votesData.data || []);
        
        console.log('📊 Total Participants:', participants.length);
        console.log('📊 Total Ideas:', ideas.length);
        console.log('📊 Total Votes:', votes.length);
        
        // Show all ideas with participant names
        console.log('\n💡 ALL SUBMITTED IDEAS:');
        ideas.forEach((idea, index) => {
            console.log(`  ${index + 1}. Participant: "${idea.participant_name}" (ID: ${idea.participant_id})`);
            console.log(`     Idea: "${idea.idea_text?.substring(0, 50)}..."`);
        });
        
        // Show all participants with their current status
        console.log('\n👥 ALL PARTICIPANTS:');
        participants.forEach((p, index) => {
            // ID-ONLY MATCHING (consistent with auto-sync)
            const participantIdeas = ideas.filter(idea => idea.participant_id === p.id);
            
            console.log(`  ${index + 1}. "${p.name}" (ID: ${p.id})`);
            console.log(`     Ideas Found (by ID): ${participantIdeas.length}`);
            console.log(`     Current Status: idea_completed=${p.idea_task_completed}, voting_completed=${p.voting_task_completed}`);
            
            if (participantIdeas.length > 0) {
                participantIdeas.forEach(idea => {
                    console.log(`       ✓ Idea: "${idea.idea_text?.substring(0, 40)}..."`);
                });
            }
        });
        
        // Check for orphaned ideas (ideas with no matching participant ID)
        console.log('\n⚠️ CHECKING FOR ORPHANED IDEAS (no matching participant ID):');
        const orphanedIdeas = ideas.filter(idea => {
            return !participants.some(p => p.id === idea.participant_id);
        });
        
        if (orphanedIdeas.length > 0) {
            console.log(`⚠️ Found ${orphanedIdeas.length} orphaned idea(s):`);
            orphanedIdeas.forEach(idea => {
                console.log(`   - "${idea.idea_text?.substring(0, 40)}..." (saved with ID: ${idea.participant_id}, name: ${idea.participant_name})`);
                // Find close matches
                const ideaName = idea.participant_name || '';
                participantNames.forEach(pName => {
                    if (pName.toLowerCase().includes(ideaName.toLowerCase()) || 
                        ideaName.toLowerCase().includes(pName.toLowerCase())) {
                        console.log(`   → Possible match: "${pName}"`);
                    }
                });
            });
        }
        
        console.log('🐛 ==================== END DEBUG ====================\n');
        
        alert('Debug info printed to console! Press F12 to view.');
        
    } catch (error) {
        console.error('❌ Debug error:', error);
        alert('Debug error: ' + error.message);
    }
}

// Sync completion status based on submitted ideas and votes (manual button)
async function syncCompletionStatus() {
    if (!AppState.currentProject?.project_id) {
        showToast('Please select a project first', 'error');
        return;
    }
    
    if (!confirm('This will update completion status for all participants based on their submitted ideas and votes. Continue?')) {
        return;
    }
    
    try {
        showToast('🔄 Syncing completion status...', 'info');
        
        const projectId = AppState.currentProject.project_id;
        
        // Fetch all participants for this project
        const participantsResponse = await fetch(`tables/participants?project_id=${projectId}`);
        const participantsData = await participantsResponse.json();
        const participants = Array.isArray(participantsData) ? participantsData : (participantsData.data || []);
        
        // Fetch all idea responses
        const ideasResponse = await fetch(`tables/idea_responses?project_id=${projectId}`);
        const ideasData = await ideasResponse.json();
        const ideas = Array.isArray(ideasData) ? ideasData : (ideasData.data || []);
        
        // Fetch all votes
        const votesResponse = await fetch(`tables/ism_votes?project_id=${projectId}`);
        const votesData = await votesResponse.json();
        const votes = Array.isArray(votesData) ? votesData : (votesData.data || []);
        
        console.log(`📊 Found ${participants.length} participants, ${ideas.length} ideas, ${votes.length} votes`);
        
        let updatedCount = 0;
        
        // Check each participant
        for (const participant of participants) {
            // Check if participant has submitted ideas
            const participantIdeas = ideas.filter(idea => 
                idea.participant_id === participant.id || 
                idea.participant_name === participant.name ||
                idea.participant_name === participant.full_name
            );
            
            // Check if participant has submitted votes
            const participantVotes = votes.filter(vote =>
                vote.participant_id === participant.id ||
                vote.participant_email === participant.email
            );
            
            const shouldHaveIdeaCompleted = participantIdeas.length > 0;
            const shouldHaveVotingCompleted = participantVotes.length > 0;
            
            // Update if needed
            if (shouldHaveIdeaCompleted !== participant.idea_task_completed || 
                shouldHaveVotingCompleted !== participant.voting_task_completed) {
                
                const updates = {
                    idea_task_completed: shouldHaveIdeaCompleted,
                    voting_task_completed: shouldHaveVotingCompleted
                };
                
                await fetch(`tables/participants/${participant.id}`, {
                    method: 'PATCH',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(updates)
                });
                
                console.log(`✅ Updated ${participant.name}: Ideas=${shouldHaveIdeaCompleted}, Votes=${shouldHaveVotingCompleted}`);
                updatedCount++;
            }
        }
        
        showToast(`✅ Synced ${updatedCount} participant(s)`, 'success');
        
        // Reload participants table to show updated status
        await loadParticipants();
        
    } catch (error) {
        console.error('Error syncing completion status:', error);
        showToast('Error syncing completion status', 'error');
    }
}