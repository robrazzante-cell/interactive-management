// New Idea Generation Flow
// Handles dynamic idea forms with tips and Learn More modal

const IdeaGenerationNew = {
    ideas: [],
    currentIdeaCount: 0,

    // Initialize with project data
    init: function(project, participant, campaignId) {
        console.log('=== IdeaGenerationNew.init() ===');
        
        this.project = project;
        this.participant = participant;
        this.campaignId = campaignId;
        this.ideas = [];
        this.currentIdeaCount = 0;

        console.log('Project:', project.project_title || project.title);
        console.log('Participant:', participant.full_name || participant.name);
        console.log('Campaign ID:', campaignId);

        // Display context statement
        const contextEl = document.getElementById('context-statement-display');
        if (contextEl) {
            const contextText = project.context_statement || 'No context provided';
            contextEl.textContent = contextText;
            console.log('✓ Context displayed:', contextText.substring(0, 50) + '...');
        } else {
            console.error('✗ context-statement-display element NOT FOUND');
        }
        
        // Display trigger question
        const triggerEl = document.getElementById('trigger-question-display');
        if (triggerEl) {
            const triggerText = project.trigger_question || 'No trigger question provided';
            triggerEl.textContent = triggerText;
            console.log('✓ Trigger question displayed:', triggerText.substring(0, 50) + '...');
        } else {
            console.error('✗ trigger-question-display element NOT FOUND');
        }

        // Add first idea form
        console.log('→ Adding first idea form...');
        this.addIdeaForm();
        console.log('=== IdeaGenerationNew.init() COMPLETE ===');
    },

    // Add a new idea form
    addIdeaForm: function() {
        console.log('→ addIdeaForm() called');
        
        const container = document.getElementById('ideas-container');
        if (!container) {
            console.error('✗ ideas-container element NOT FOUND!');
            alert('Error: Ideas container not found in page');
            return;
        }
        
        console.log('✓ ideas-container found');

        this.currentIdeaCount++;
        const formId = `idea-form-${this.currentIdeaCount}`;
        
        console.log(`→ Creating form #${this.currentIdeaCount} (${formId})`);
        
        const formHtml = `
            <div id="${formId}" class="idea-form-card" style="background: white; padding: 2rem; border-radius: 0.75rem; box-shadow: 0 4px 12px rgba(0,0,0,0.08); margin-bottom: 2rem; border: 2px solid #FAF3DD;">
                <h3 style="color: #0B2B26; margin: 0 0 1.5rem 0; display: flex; align-items: center; gap: 0.5rem;">
                    <span style="background: #0B2B26; color: #FAF3DD; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.9rem;">${this.currentIdeaCount}</span>
                    Your Idea
                </h3>
                
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; font-weight: 600; color: #0B2B26; margin-bottom: 0.5rem;">
                        Idea <span style="color: #3E0505;">*</span>
                    </label>
                    <textarea 
                        id="${formId}-idea"
                        placeholder="Use short phrases (e.g., ability to adapt, presence of clear goals, lack of communication)"
                        required
                        style="width: 100%; min-height: 80px; padding: 1rem; border: 2px solid #ddd; border-radius: 0.5rem; font-family: 'Open Sans', sans-serif; font-size: 1rem; resize: vertical; transition: border-color 0.2s;"
                        onfocus="this.style.borderColor='#0B2B26'"
                        onblur="this.style.borderColor='#ddd'"
                    ></textarea>
                    <small style="color: #666; font-style: italic; display: block; margin-top: 0.5rem;">
                        💡 Examples: "ability to collaborate", "presence of leadership", "lack of resources", "willingness to change"
                    </small>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; font-weight: 600; color: #0B2B26; margin-bottom: 0.5rem;">
                        Clarification <span style="color: #666; font-weight: 400;">(Optional)</span>
                    </label>
                    <textarea 
                        id="${formId}-clarification"
                        placeholder="Explain what you mean by this idea in more detail..."
                        style="width: 100%; min-height: 100px; padding: 1rem; border: 2px solid #ddd; border-radius: 0.5rem; font-family: 'Open Sans', sans-serif; font-size: 0.95rem; resize: vertical; transition: border-color 0.2s;"
                        onfocus="this.style.borderColor='#0B2B26'"
                        onblur="this.style.borderColor='#ddd'"
                    ></textarea>
                    <small style="color: #666; font-style: italic; display: block; margin-top: 0.5rem;">
                        ℹ️ Help others understand your thinking by providing context, examples, or details
                    </small>
                </div>

                <div style="text-align: right;">
                    <button class="btn btn-primary" onclick="IdeaGenerationNew.submitIdea('${formId}')" style="padding: 0.75rem 2rem;">
                        <i class="fas fa-check"></i> Submit This Idea
                    </button>
                </div>
            </div>
        `;

        document.getElementById('ideas-container').insertAdjacentHTML('beforeend', formHtml);
        console.log('✓ Form HTML inserted into ideas-container');

        // Verify form was created
        const createdForm = document.getElementById(formId);
        if (createdForm) {
            console.log(`✓ Form ${formId} successfully created and visible`);
        } else {
            console.error(`✗ Form ${formId} was NOT created!`);
        }

        // Hide add more and finish buttons when showing new form
        const addMoreContainer = document.getElementById('add-more-container');
        const finishContainer = document.getElementById('finish-container');
        
        if (addMoreContainer) addMoreContainer.style.display = 'none';
        if (finishContainer) finishContainer.style.display = 'none';

        // Scroll to new form
        setTimeout(() => {
            const formToScroll = document.getElementById(formId);
            if (formToScroll) {
                formToScroll.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
        
        console.log('=== addIdeaForm() COMPLETE ===');
    },

    // Submit an idea
    submitIdea: async function(formId) {
        const ideaInput = document.getElementById(`${formId}-idea`);
        const clarificationInput = document.getElementById(`${formId}-clarification`);

        const idea = ideaInput.value.trim();
        const clarification = clarificationInput.value.trim();

        if (!idea) {
            alert('Please enter an idea before submitting.');
            ideaInput.focus();
            return;
        }

        try {
            // Create idea data
            const ideaData = {
                id: `IDEA-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                project_id: this.project.id,
                participant_id: this.participant.id,
                participant_name: this.participant.full_name || this.participant.name,
                idea_text: idea,
                clarification: clarification,
                submitted_at: Date.now(),
                campaign_id: this.campaignId || 'MANUAL'
            };

            // Save to database
            await fetch('/tables/idea_responses', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(ideaData)
            });

            // Add to local array
            this.ideas.push(ideaData);

            // Transform form to submitted state
            this.markFormAsSubmitted(formId, idea, clarification);

            // Show add more and finish buttons
            document.getElementById('add-more-container').style.display = 'block';
            document.getElementById('finish-container').style.display = 'block';

            // Scroll to buttons
            setTimeout(() => {
                document.getElementById('add-more-container').scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);

        } catch (error) {
            console.error('Error submitting idea:', error);
            alert('Error submitting idea. Please try again.');
        }
    },

    // Mark form as submitted
    markFormAsSubmitted: function(formId, idea, clarification) {
        const formCard = document.getElementById(formId);
        formCard.style.border = '2px solid #4caf50';
        formCard.style.background = '#f1f8f4';

        formCard.innerHTML = `
            <div style="display: flex; align-items: start; gap: 1rem;">
                <div style="font-size: 2rem; color: #4caf50; flex-shrink: 0;">✓</div>
                <div style="flex: 1;">
                    <h4 style="color: #2e7d32; margin: 0 0 0.75rem 0;">Idea Submitted</h4>
                    <div style="background: white; padding: 1rem; border-radius: 0.5rem; margin-bottom: 0.75rem;">
                        <strong style="color: #0B2B26;">${idea}</strong>
                    </div>
                    ${clarification ? `
                        <div style="background: white; padding: 1rem; border-radius: 0.5rem; font-size: 0.95rem; color: #666;">
                            ${clarification}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
};

// Global functions
function addAnotherIdeaForm() {
    IdeaGenerationNew.addIdeaForm();
}

function finishIdeaGeneration() {
    // Hide idea generation screen
    document.getElementById('idea-generation-screen').style.display = 'none';
    
    // Show completion screen
    document.getElementById('completion-screen').style.display = 'block';
    
    // Update tracking if not temporary participant
    if (window.ParticipantSession && window.ParticipantSession.tracking) {
        updateCompletionTracking();
    }
}

async function updateCompletionTracking() {
    try {
        const tracking = window.ParticipantSession.tracking;
        if (tracking && tracking.id) {
            await fetch(`/tables/email_tracking/${tracking.id}`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    task_completed: true,
                    completed_at: Date.now()
                })
            });
        }
    } catch (error) {
        console.error('Error updating tracking:', error);
    }
}

function showLearnMore() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header" style="background: linear-gradient(135deg, #0B2B26 0%, #3E0505 100%); color: white; position: sticky; top: 0; z-index: 10;">
                <h3><i class="fas fa-book-open"></i> About the ISM Process</h3>
                <button class="close-btn" onclick="this.closest('.modal').remove()" style="color: white;">&times;</button>
            </div>
            <div class="modal-body" style="padding: 2rem;">
                <h4 style="color: #0B2B26; margin: 0 0 1rem 0;">What Happens Next?</h4>
                
                <div style="background: #FAF3DD; padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 2rem; border-left: 4px solid #0B2B26;">
                    <p style="margin: 0; line-height: 1.8; color: #0B2B26;">
                        Your ideas will be combined with others' contributions and transformed into <strong>factors</strong> 
                        through a process called <strong>Interactive Structural Modeling (ISM)</strong>. This collaborative 
                        approach helps organizations understand complex challenges by mapping how different factors influence each other.
                    </p>
                </div>

                <h4 style="color: #0B2B26; margin: 2rem 0 1rem 0;">The Process</h4>
                
                <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                    <!-- Phase 1: Idea Generation -->
                    <div style="display: flex; gap: 1rem; align-items: start;">
                        <div style="flex-shrink: 0; width: 48px; height: 48px; background: #0B2B26; color: #FAF3DD; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.2rem;">
                            1
                        </div>
                        <div style="flex: 1;">
                            <h5 style="margin: 0 0 0.5rem 0; color: #0B2B26;">Idea Generation</h5>
                            <p style="margin: 0; color: #666; line-height: 1.6;">
                                Participants like you share ideas responding to a trigger question. This captures diverse perspectives from across the organization.
                            </p>
                            <div style="background: #e8f5e9; padding: 0.75rem; border-radius: 0.375rem; margin-top: 0.75rem;">
                                <small style="color: #2e7d32;"><strong>✓ You just completed this phase!</strong></small>
                            </div>
                        </div>
                    </div>

                    <!-- Phase 2: Coding & Factor Selection -->
                    <div style="display: flex; gap: 1rem; align-items: start;">
                        <div style="flex-shrink: 0; width: 48px; height: 48px; background: #666; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.2rem;">
                            2
                        </div>
                        <div style="flex: 1;">
                            <h5 style="margin: 0 0 0.5rem 0; color: #0B2B26;">Coding & Factor Selection</h5>
                            <p style="margin: 0; color: #666; line-height: 1.6;">
                                Facilitators analyze all submitted ideas and consolidate them into key <strong>factors</strong>—
                                the essential elements that influence your organization's challenge. Ideas with similar themes 
                                are grouped together, refined, and clarified.
                            </p>
                        </div>
                    </div>

                    <!-- Phase 3: Structural Voting -->
                    <div style="display: flex; gap: 1rem; align-items: start;">
                        <div style="flex-shrink: 0; width: 48px; height: 48px; background: #3E0505; color: #FAF3DD; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.2rem;">
                            3
                        </div>
                        <div style="flex: 1;">
                            <h5 style="margin: 0 0 0.5rem 0; color: #0B2B26;">Structural Voting (ISM)</h5>
                            <p style="margin: 0; color: #666; line-height: 1.6;">
                                You'll receive another email asking you to evaluate relationships between factors. 
                                For each pair, you'll indicate whether one factor significantly influences another. 
                                This creates a <strong>structural map</strong> showing how factors interconnect.
                            </p>
                        </div>
                    </div>

                    <!-- Phase 4: Analysis -->
                    <div style="display: flex; gap: 1rem; align-items: start;">
                        <div style="flex-shrink: 0; width: 48px; height: 48px; background: #666; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.2rem;">
                            4
                        </div>
                        <div style="flex: 1;">
                            <h5 style="margin: 0 0 0.5rem 0; color: #0B2B26;">Analysis & Action</h5>
                            <p style="margin: 0; color: #666; line-height: 1.6;">
                                The facilitator creates a visual map revealing which factors are most influential 
                                and how they connect. This helps your organization identify where to focus energy 
                                for maximum impact and develop targeted action plans.
                            </p>
                        </div>
                    </div>
                </div>

                <div style="background: #e3f2fd; padding: 1.5rem; border-radius: 0.5rem; margin-top: 2rem; border-left: 4px solid #2196f3;">
                    <h5 style="margin: 0 0 0.75rem 0; color: #1565c0;">
                        <i class="fas fa-lightbulb"></i> Why This Matters
                    </h5>
                    <p style="margin: 0; color: #1565c0; line-height: 1.7;">
                        ISM is a research-based methodology used worldwide to tackle complex organizational challenges. 
                        Unlike traditional surveys, ISM captures the <strong>relationships</strong> between issues, 
                        revealing system-level patterns that aren't visible otherwise. Your participation helps create 
                        shared understanding and actionable insights.
                    </p>
                </div>

                <div style="background: #fff3e0; padding: 1.5rem; border-radius: 0.5rem; margin-top: 1.5rem; border-left: 4px solid #f57c00;">
                    <p style="margin: 0; color: #e65100; line-height: 1.7;">
                        <strong><i class="fas fa-info-circle"></i> What to Expect:</strong> 
                        Watch for an email invitation to participate in the voting phase. You'll evaluate 
                        factor relationships using your expertise and perspective. The entire process typically 
                        takes 20-30 minutes.
                    </p>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Make globally available
window.IdeaGenerationNew = IdeaGenerationNew;
