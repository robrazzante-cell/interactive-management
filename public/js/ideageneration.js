// Idea Generation Module
// Handles the first phase of ISM - collecting ideas from participants

const IdeaGeneration = {
    currentProject: null,
    currentCampaign: null,
    submissions: [],

    // Initialize the idea generation tab
    async init(projectId) {
        this.currentProject = projectId;
        await this.loadCampaign();
        await this.loadSubmissions();
        this.renderSubmissions();
        this.updateStats();
    },

    // Load existing campaign or create new one
    async loadCampaign() {
        try {
            const response = await fetch(`tables/email_campaigns?search=${this.currentProject}`);
            const data = await response.json();
            
            const ideaCampaign = data.data.find(c => 
                c.project_id === this.currentProject && 
                c.campaign_type === 'idea_generation'
            );
            
            if (ideaCampaign) {
                this.currentCampaign = ideaCampaign;
            }
        } catch (error) {
            console.error('Error loading campaign:', error);
        }
    },

    // Load all idea submissions for this project
    async loadSubmissions() {
        try {
            console.log('📥 Loading idea submissions for project:', this.currentProject);
            const response = await fetch(`tables/idea_responses?limit=1000`);
            const data = await response.json();
            
            console.log('📊 Raw API response:', data);
            
            let allIdeas = [];
            if (Array.isArray(data)) {
                allIdeas = data;
            } else if (data.data && Array.isArray(data.data)) {
                allIdeas = data.data;
            }
            
            console.log(`📊 Total ideas from API: ${allIdeas.length}`);
            
            this.submissions = allIdeas.filter(s => s.project_id === this.currentProject);
            
            console.log(`✅ Filtered to ${this.submissions.length} ideas for this project`);
        } catch (error) {
            console.error('❌ Error loading submissions:', error);
        }
    },

    // Update statistics
    updateStats() {
        const totalSubmissions = this.submissions.length;
        const uniqueParticipants = new Set(this.submissions.map(s => s.participant_id)).size;
        const uniqueIdeas = new Set(this.submissions.map(s => s.idea_text)).size;

        document.getElementById('total-submissions').textContent = totalSubmissions;
        document.getElementById('participants-submitted').textContent = uniqueParticipants;
        document.getElementById('unique-ideas').textContent = uniqueIdeas;
    },

    // Render submissions in the UI
    renderSubmissions() {
        const container = document.getElementById('submissions-display');
        
        if (this.submissions.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 2rem; color: #666;">
                    <i class="fas fa-inbox" style="font-size: 2.5rem; margin-bottom: 0.75rem; color: #0B2B26; opacity: 0.3;"></i>
                    <p style="font-size: 1rem; margin-bottom: 0.25rem;">No idea submissions yet</p>
                    <p style="font-size: 0.85rem;">Send the idea generation email to participants to collect ideas.</p>
                </div>
            `;
            return;
        }

        // Group by participant
        const groupedByParticipant = {};
        this.submissions.forEach(sub => {
            if (!groupedByParticipant[sub.participant_name]) {
                groupedByParticipant[sub.participant_name] = [];
            }
            groupedByParticipant[sub.participant_name].push(sub);
        });

        // Flatten all submissions into a single list (no grouping by participant)
        let html = '';
        
        this.submissions.forEach(sub => {
            html += `
                <div class="idea-card" style="background: white; padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem; border: 1.5px solid #e0e0e0; box-shadow: 0 2px 8px rgba(0,0,0,0.05); transition: all 0.2s; cursor: pointer;" 
                     title="Contributed by: ${sub.participant_name}&#10;Submitted: ${new Date(sub.created_at).toLocaleString()}"
                     onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'; this.style.transform='translateY(-2px)'"
                     onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.05)'; this.style.transform=''">
                    <div class="idea-text" style="font-weight: 600; margin-bottom: 0.5rem; color: var(--forest-green); font-size: 1rem; line-height: 1.4;">
                        ${sub.idea_text}
                    </div>
                    ${sub.clarification ? `
                        <div class="idea-clarification" style="font-size: 0.9rem; color: #555; font-style: italic; margin-top: 0.5rem; padding-left: 1.25rem; border-left: 2px solid #ccc;">
                            <i class="fas fa-comment" style="color: var(--burgundy);"></i> ${sub.clarification}
                        </div>
                    ` : ''}
                    ${sub.coded_factor ? `
                        <div class="coded-factor-badge" style="display: inline-block; background: var(--burgundy); color: white; padding: 0.4rem 0.8rem; border-radius: 1rem; font-size: 0.8rem; margin-top: 0.5rem; font-weight: 600;">
                            <i class="fas fa-tag"></i> ${sub.coded_factor}
                        </div>
                    ` : ''}
                </div>
            `;
        });

        container.innerHTML = html;
    },

    // Send idea generation email to all participants
    async sendEmail() {
        const project = await this.getProject();
        if (!project) {
            alert('Please select a project first');
            return;
        }

        const participants = await this.getParticipants();
        if (participants.length === 0) {
            alert('No participants added yet. Please add participants first.');
            return;
        }

        if (!project.trigger_question || !project.context_statement) {
            alert('Please complete the Workshop Setup first (trigger question and context statement are required).');
            return;
        }

        try {
            // Generate emails for all participants
            const emails = participants.map(participant => 
                EmailService.generateIdeaGenerationEmail(participant, project)
            );

            // Show batch email modal
            EmailService.showBatchEmailOptions(emails, async () => {
                // After sending, create campaign and tracking records
                const campaignId = this.currentCampaign?.id || `CAM-${Date.now()}`;
                
                const campaignData = {
                    id: campaignId,
                    project_id: this.currentProject,
                    campaign_type: 'idea_generation',
                    subject: `Idea Generation: ${project.title || project.project_title}`,
                    trigger_question: project.trigger_question,
                    context_statement: project.context_statement,
                    sent_count: participants.length,
                    opened_count: 0,
                    completed_count: 0,
                    sent_at: Date.now(),
                    status: 'sent'
                };

                if (this.currentCampaign) {
                    await fetch(`/tables/email_campaigns/${campaignId}`, {
                        method: 'PUT',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(campaignData)
                    });
                } else {
                    await fetch('/tables/email_campaigns', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(campaignData)
                    });
                }

                // Create tracking records for each participant
                for (const participant of participants) {
                    const trackingId = `TRK-${Date.now()}-${participant.id.substring(0, 8)}`;
                    await fetch('/tables/email_tracking', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            id: trackingId,
                            campaign_id: campaignId,
                            participant_id: participant.id,
                            participant_name: participant.full_name,
                            participant_email: participant.email,
                            email_sent: true,
                            email_opened: false,
                            task_completed: false,
                            reminder_sent: false,
                            reminder_count: 0
                        })
                    });
                }

                this.currentCampaign = campaignData;
                
                // Update button state
                document.getElementById('send-idea-email-btn').innerHTML = '<i class="fas fa-paper-plane"></i> Resend Email';
            });
            
        } catch (error) {
            console.error('Error sending email:', error);
            alert('Error sending emails. Please try again.');
        }
    },

    // Get current project
    async getProject() {
        try {
            const response = await fetch(`/tables/projects/${this.currentProject}`);
            return await response.json();
        } catch (error) {
            console.error('Error getting project:', error);
            return null;
        }
    },

    // Get participants for this project
    async getParticipants() {
        try {
            const response = await fetch(`/tables/participants?search=${this.currentProject}`);
            const data = await response.json();
            
            // Handle both response formats: {data: [...]} or [...]
            const allParticipants = Array.isArray(data) ? data : (data.data || []);
            return allParticipants.filter(p => p.project_id === this.currentProject);
        } catch (error) {
            console.error('Error getting participants:', error);
            return [];
        }
    },

    // Download ideas as Word document
    async downloadIdeasAsWord() {
        if (this.submissions.length === 0) {
            alert('No ideas to download. Please collect ideas first.');
            return;
        }

        try {
            // Get project info
            const project = await this.getProject();
            const projectTitle = project?.project_title || project?.title || 'ISM Project';
            
            // Group by participant
            const groupedByParticipant = {};
            this.submissions.forEach(sub => {
                if (!groupedByParticipant[sub.participant_name]) {
                    groupedByParticipant[sub.participant_name] = [];
                }
                groupedByParticipant[sub.participant_name].push(sub);
            });

            // Build HTML content for Word document
            let htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.6; margin: 1in; }
                        h1 { color: #0B2B26; font-size: 18pt; margin-bottom: 0.5em; }
                        h2 { color: #3E0505; font-size: 14pt; margin-top: 1.5em; margin-bottom: 0.5em; }
                        h3 { color: #0B2B26; font-size: 12pt; margin-top: 1em; margin-bottom: 0.3em; }
                        .idea { margin-bottom: 1em; padding: 0.5em; background-color: #FFF8DC; border-left: 3px solid #0B2B26; }
                        .idea-text { font-weight: bold; margin-bottom: 0.3em; }
                        .clarification { font-style: italic; color: #555; margin-left: 1em; margin-top: 0.3em; }
                        .timestamp { font-size: 9pt; color: #999; margin-top: 0.3em; }
                        .stats { background-color: #f0f0f0; padding: 1em; margin: 1em 0; }
                        .coded-factor { display: inline-block; background-color: #3E0505; color: white; padding: 0.2em 0.6em; border-radius: 3px; font-size: 9pt; margin-top: 0.3em; }
                    </style>
                </head>
                <body>
                    <h1>${projectTitle}</h1>
                    <h2>Idea Generation Phase - All Submissions</h2>
                    
                    <div class="stats">
                        <strong>Summary Statistics:</strong><br>
                        Total Submissions: ${this.submissions.length}<br>
                        Participants Responded: ${Object.keys(groupedByParticipant).length}<br>
                        Unique Ideas: ${new Set(this.submissions.map(s => s.idea_text)).size}<br>
                        Generated: ${new Date().toLocaleString()}
                    </div>
            `;

            // Add each participant's ideas
            Object.entries(groupedByParticipant).forEach(([name, subs]) => {
                htmlContent += `<h3>${name} (${subs.length} ${subs.length === 1 ? 'idea' : 'ideas'})</h3>`;
                
                subs.forEach((sub, idx) => {
                    htmlContent += `
                        <div class="idea">
                            <div class="idea-text">${idx + 1}. ${sub.idea_text}</div>
                            ${sub.clarification ? `<div class="clarification">Clarification: ${sub.clarification}</div>` : ''}
                            ${sub.coded_factor ? `<div class="coded-factor">Theme: ${sub.coded_factor}</div>` : ''}
                            <div class="timestamp">Submitted: ${new Date(sub.created_at).toLocaleString()}</div>
                        </div>
                    `;
                });
            });

            htmlContent += `
                </body>
                </html>
            `;

            // Create blob and download
            const blob = new Blob([htmlContent], { type: 'application/msword' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${projectTitle.replace(/[^a-z0-9]/gi, '_')}_Ideas_${Date.now()}.doc`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            console.log('✅ Word document downloaded successfully');
        } catch (error) {
            console.error('❌ Error downloading Word document:', error);
            alert('Error downloading document. Please try again.');
        }
    }
};

// Global function for button click
async function sendIdeaGenerationEmail() {
    await IdeaGeneration.sendEmail();
}
