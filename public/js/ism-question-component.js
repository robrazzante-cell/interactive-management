/**
 * ISM QUESTION COMPONENT - v6.24.0
 * Reusable question display and interaction for ISM voting
 * 
 * Date: December 17, 2024
 * Purpose: Provide consistent ISM question experience across all session types
 * Usage: Include this file and call ISMQuestionComponent.init()
 */

const ISMQuestionComponent = (function() {
    'use strict';
    
    // ============================================
    // PRIVATE STATE
    // ============================================
    let state = {
        factors: [],
        currentQuestionIndex: 0,
        allQuestions: [],
        matrix: [],
        responses: [],
        askedQuestions: [],
        project: null,
        currentRating: null,
        onRatingSelect: null,
        onNextQuestion: null,
        onPreviousQuestion: null
    };
    
    // ============================================
    // CONFIGURATION
    // ============================================
    const config = {
        ratingScale: [
            { value: 1, label: 'Strongly Disagree', description: 'No relationship' },
            { value: 2, label: 'Disagree', description: 'Little relationship' },
            { value: 3, label: 'Neutral', description: 'Unsure' },
            { value: 4, label: 'Agree', description: 'Some relationship' },
            { value: 5, label: 'Strongly Agree', description: 'Significant relationship' }
        ],
        containerId: 'question-container',
        progressContainerId: 'progress-container',
        groundRulesId: 'ground-rules',
        contextId: 'context-container'
    };
    
    // ============================================
    // PUBLIC API
    // ============================================
    
    /**
     * Initialize the component with project data and factors
     */
    function init(options) {
        state.project = options.project || null;
        state.factors = options.factors || [];
        state.allQuestions = options.questions || [];
        state.matrix = options.matrix || [];
        state.responses = options.responses || [];
        state.askedQuestions = options.askedQuestions || [];
        state.currentQuestionIndex = options.currentQuestionIndex || 0;
        
        // Callbacks
        state.onRatingSelect = options.onRatingSelect || null;
        state.onNextQuestion = options.onNextQuestion || null;
        state.onPreviousQuestion = options.onPreviousQuestion || null;
        
        // Update config if custom IDs provided
        if (options.containerId) config.containerId = options.containerId;
        if (options.progressContainerId) config.progressContainerId = options.progressContainerId;
        
        // Attach event listeners
        attachEventListeners();
        
        // Display first question
        displayCurrentQuestion();
        updateProgress();
    }
    
    /**
     * Display the current question
     */
    function displayCurrentQuestion() {
        if (state.currentQuestionIndex >= state.allQuestions.length) {
            console.warn('No more questions to display');
            return;
        }
        
        const q = state.allQuestions[state.currentQuestionIndex];
        const fromFactor = state.factors[q.from];
        const toFactor = state.factors[q.to];
        const relationalPhrase = state.project?.relational_phrase || 'significantly supports';
        
        // Get context
        let context = state.project?.context_statement || 
                     state.project?.trigger_question || 
                     'this context';
        context = context.replace(/^(What are the characteristics of|What is|What are)\s*/i, '');
        context = context.replace(/\?$/, '');
        
        // Build question HTML
        const questionHTML = buildQuestionHTML(fromFactor, toFactor, relationalPhrase, context, q);
        
        // Insert into container
        const container = document.getElementById(config.containerId);
        if (container) {
            container.innerHTML = questionHTML;
        }
        
        // Update ground rules
        updateGroundRules();
        
        // Update context display
        updateContextDisplay(context);
        
        // Clear selection
        clearSelection();
        
        // Update progress
        updateProgress();
    }
    
    /**
     * Build question HTML
     */
    function buildQuestionHTML(fromFactor, toFactor, relationalPhrase, context, question) {
        return `
            <div class="ism-voting-card">
                <div class="ism-question-header">
                    <div class="ism-question-number" id="question-number-display">Question ${state.currentQuestionIndex + 1}</div>
                    <div id="question-text">
                        <div style="text-align: center; margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid #e0e0e0;">
                            <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: #666; margin-bottom: 0.25rem; font-weight: 600;">CONTEXT</div>
                            <div style="font-size: 1rem; color: #0B2B26; font-weight: 500;">${context}</div>
                        </div>
                        <div class="ism-question-visual">
                            <div style="font-size: 0.85rem; font-weight: 500; color: #666; align-self: center;">
                                does
                            </div>
                            
                            <div class="ism-factor-box clickable-factor" onclick="ISMQuestionComponent.toggleFactorClarification('from-factor')" style="cursor: pointer;" title="Click to see clarification">
                                <div class="ism-factor-box-name">
                                    ${fromFactor.name}
                                </div>
                                <div style="font-size: 0.75rem; color: #0B2B26; font-weight: 600; margin-top: 0.25rem;">
                                    Factor #${question.from + 1}
                                </div>
                                <div id="from-factor-clarification" class="factor-clarification" style="display: none; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #ccc; font-size: 0.8rem; font-style: italic; color: #555; text-align: left;">
                                    ${fromFactor.description || 'No clarification available'}
                                </div>
                            </div>
                            
                            <div class="ism-arrow-container">
                                <div class="ism-arrow-icon">━━━▶</div>
                                <div class="ism-relational-phrase-badge">${relationalPhrase}</div>
                            </div>
                            
                            <div class="ism-factor-box clickable-factor" onclick="ISMQuestionComponent.toggleFactorClarification('to-factor')" style="cursor: pointer;" title="Click to see clarification">
                                <div class="ism-factor-box-name">
                                    ${toFactor.name}
                                </div>
                                <div style="font-size: 0.75rem; color: #0B2B26; font-weight: 600; margin-top: 0.25rem;">
                                    Factor #${question.to + 1}
                                </div>
                                <div id="to-factor-clarification" class="factor-clarification" style="display: none; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #ccc; font-size: 0.8rem; font-style: italic; color: #555; text-align: left;">
                                    ${toFactor.description || 'No clarification available'}
                                </div>
                            </div>
                            
                            <div style="font-size: 0.85rem; font-weight: 500; color: #666; align-self: center;">
                                ?
                            </div>
                        </div>
                    </div>
                </div>
                
                ${buildRatingScaleHTML()}
                
                <div class="ism-navigation-buttons">
                    <button id="prev-btn" class="ism-btn ism-btn-secondary" onclick="ISMQuestionComponent.previousQuestion()" ${state.askedQuestions.length === 0 ? 'disabled' : ''}>
                        <i class="fas fa-arrow-left"></i> Previous
                    </button>
                    <button id="next-btn" class="ism-btn ism-btn-primary" onclick="ISMQuestionComponent.nextQuestion()" disabled>
                        Next <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Build rating scale HTML
     */
    function buildRatingScaleHTML() {
        let html = '<div class="ism-rating-scale">';
        
        config.ratingScale.forEach(rating => {
            html += `
                <div class="ism-rating-button" data-value="${rating.value}">
                    <span class="ism-rating-number">${rating.value}</span>
                    <span class="ism-rating-label">${rating.label}</span>
                    <span class="ism-rating-description">${rating.description}</span>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }
    
    /**
     * Update progress bar
     */
    function updateProgress() {
        const totalPossible = state.allQuestions.length;
        const answered = state.allQuestions.filter(q => {
            const i = q.from;
            const j = q.to;
            return state.matrix[i] && state.matrix[i][j] !== null;
        }).length;
        const askedDirectly = state.askedQuestions.length + 1;
        
        const progress = totalPossible > 0 ? (answered / totalPossible) * 100 : 0;
        
        // Update progress text
        const questionNumber = document.getElementById('question-number');
        if (questionNumber) {
            questionNumber.textContent = `Question ${askedDirectly} (${answered} of ${totalPossible} answered)`;
        }
        
        // Update percentage
        const progressPercentage = document.getElementById('progress-percentage');
        if (progressPercentage) {
            progressPercentage.textContent = Math.round(progress) + '%';
        }
        
        // Update progress bar
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            progressBar.style.width = progress + '%';
        }
    }
    
    /**
     * Update ground rules display
     */
    function updateGroundRules() {
        const groundRulesBtn = document.getElementById('ground-rules-button-container');
        const groundRules = document.getElementById(config.groundRulesId);
        
        if (groundRulesBtn) {
            groundRulesBtn.classList.remove('hidden');
        }
        if (groundRules) {
            groundRules.classList.add('hidden'); // Start hidden
        }
    }
    
    /**
     * Update context display
     */
    function updateContextDisplay(context) {
        const contextContainer = document.getElementById(config.contextId);
        const contextText = document.getElementById('context-text');
        
        if (contextContainer && contextText) {
            contextText.textContent = context;
            contextContainer.classList.remove('hidden');
        }
    }
    
    /**
     * Toggle factor clarification
     */
    function toggleFactorClarification(factorId) {
        const clarification = document.getElementById(`${factorId}-clarification`);
        if (clarification) {
            clarification.style.display = clarification.style.display === 'none' ? 'block' : 'none';
        }
    }
    
    /**
     * Attach event listeners
     */
    function attachEventListeners() {
        // Rating button click handler
        document.addEventListener('click', (e) => {
            if (e.target.closest('.ism-rating-button')) {
                const button = e.target.closest('.ism-rating-button');
                const value = parseInt(button.dataset.value);
                
                // Clear previous selection
                clearSelection();
                
                // Select this button
                button.classList.add('selected');
                
                // Store current rating
                state.currentRating = value;
                
                // Enable next button
                const nextBtn = document.getElementById('next-btn');
                if (nextBtn) {
                    nextBtn.disabled = false;
                }
                
                // Call callback if provided
                if (state.onRatingSelect) {
                    state.onRatingSelect(value);
                }
            }
        });
    }
    
    /**
     * Clear rating selection
     */
    function clearSelection() {
        document.querySelectorAll('.ism-rating-button').forEach(btn => {
            btn.classList.remove('selected');
        });
        const nextBtn = document.getElementById('next-btn');
        if (nextBtn) {
            nextBtn.disabled = true;
        }
        state.currentRating = null;
    }
    
    /**
     * Move to next question
     */
    function nextQuestion() {
        if (!state.currentRating) {
            alert('Please select a rating before continuing.');
            return;
        }
        
        // Add to responses
        state.responses.push(state.currentRating);
        
        // Update matrix
        const q = state.allQuestions[state.currentQuestionIndex];
        if (state.matrix[q.from]) {
            state.matrix[q.from][q.to] = (state.currentRating === 5) ? 1 : 0;
        }
        
        // Add to asked questions
        state.askedQuestions.push(state.currentQuestionIndex);
        
        // Call callback if provided
        if (state.onNextQuestion) {
            state.onNextQuestion(state.currentRating, q);
        }
        
        // Move to next question
        state.currentQuestionIndex++;
        
        // Check if done
        if (state.currentQuestionIndex >= state.allQuestions.length) {
            // Voting complete
            console.log('ISM voting complete');
            return;
        }
        
        // Display next question
        displayCurrentQuestion();
    }
    
    /**
     * Move to previous question
     */
    function previousQuestion() {
        if (state.askedQuestions.length === 0) {
            return; // Can't go back further
        }
        
        // Get previous question index
        const prevIndex = state.askedQuestions.pop();
        state.currentQuestionIndex = prevIndex;
        
        // Remove last response
        state.responses.pop();
        
        // Call callback if provided
        if (state.onPreviousQuestion) {
            state.onPreviousQuestion();
        }
        
        // Display previous question
        displayCurrentQuestion();
    }
    
    /**
     * Get current state
     */
    function getState() {
        return { ...state };
    }
    
    /**
     * Update state
     */
    function updateState(newState) {
        state = { ...state, ...newState };
        displayCurrentQuestion();
        updateProgress();
    }
    
    // ============================================
    // EXPORT PUBLIC API
    // ============================================
    return {
        init,
        displayCurrentQuestion,
        nextQuestion,
        previousQuestion,
        toggleFactorClarification,
        clearSelection,
        updateProgress,
        getState,
        updateState
    };
})();

// Make available globally
window.ISMQuestionComponent = ISMQuestionComponent;
