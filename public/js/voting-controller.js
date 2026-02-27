/**
 * Voting Controller - ISM Voting Phase Management (Warfield Methodology)
 * Handles voting tab UI, preview generation, email sending, and Warfield ISM analysis
 */

let votingState = {
    projectId: null,
    factors: [],
    votingPairs: [],
    ismMatrix: null,
    userMatrix: null,          // User's answer matrix (0 or 1)
    sourceMatrix: null,        // Source tracking: 0=unknown, 1=direct answer, 2=inferred
    reachabilityMatrix: null,  // [DEPRECATED - use userMatrix] Tracks inferred relationships (Warfield's algorithm)
    askedMatrix: null,         // [DEPRECATED - use sourceMatrix] Tracks which questions were actually asked
    currentPairIndex: 0,
    questionsAsked: 0,
    questionsSkipped: 0,
    project: null,
    participants: []
};

/**
 * Generate all voting pairs using Warfield's ISM methodology
 * Implements TRANSITIVE REDUCTION: Skip questions whose answers can be inferred
 * Order: 0→1, 1→0, 0→2, 1→2, 2→0, 2→1, 0→3, 1→3, 2→3, 3→0, 3→1, 3→2, ...
 * Pattern: For each column j, ask all rows i where i < j, then reverses
 * @param {Array} factors - Array of factors
 * @returns {Array} All pairwise combinations (will be filtered dynamically during voting)
 */
function generateAllPairs(factors) {
    const pairs = [];
    const n = factors.length;
    
    // Generate all n(n-1) pairs, but we'll skip redundant ones during voting
    for (let j = 1; j < n; j++) {
        // First: Ask all factors BEFORE j → j (0→j, 1→j, 2→j, ... (j-1)→j)
        for (let i = 0; i < j; i++) {
            pairs.push({
                from: factors[i],
                to: factors[j],
                fromIndex: i,
                toIndex: j,
                originalQuestionNumber: pairs.length + 1,
                skipped: false,
                inferredAnswer: null
            });
        }
        
        // Then: Ask reverse (j→0, j→1, j→2, ... j→(j-1))
        for (let i = 0; i < j; i++) {
            pairs.push({
                from: factors[j],
                to: factors[i],
                fromIndex: j,
                toIndex: i,
                originalQuestionNumber: pairs.length + 1,
                skipped: false,
                inferredAnswer: null
            });
        }
    }
    
    console.log(`📋 Generated ${pairs.length} total pairs (Warfield's algorithm will skip redundant questions)`);
    return pairs;
}

/**
 * Initialize reachability matrix (Warfield's transitive closure tracking)
 * NOW USES: userMatrix + sourceMatrix (perfected algorithm from guided-matrix-validator.html)
 * @param {number} n - Number of factors
 */
function initializeReachabilityMatrix(n) {
    // NEW: userMatrix tracks actual values (0 or 1)
    const U = Array(n).fill(null).map(() => Array(n).fill(0));
    
    // NEW: sourceMatrix tracks how we know each cell:
    // 0 = unknown (not yet asked/inferred)
    // 1 = direct answer from user
    // 2 = inferred via transitive closure
    const S = Array(n).fill(null).map(() => Array(n).fill(0));
    
    // DEPRECATED (keep for backwards compatibility during transition)
    const R = Array(n).fill(null).map(() => Array(n).fill(0));
    const A = Array(n).fill(null).map(() => Array(n).fill(0));
    
    votingState.userMatrix = U;
    votingState.sourceMatrix = S;
    votingState.reachabilityMatrix = R;  // Keep for compatibility
    votingState.askedMatrix = A;         // Keep for compatibility
    votingState.questionsAsked = 0;
    votingState.questionsSkipped = 0;
    
    console.log(`✅ Initialized ${n}×${n} matrix (userMatrix + sourceMatrix) for Warfield's ENHANCED algorithm`);
    console.log(`   📊 sourceMatrix: 0=unknown, 1=direct, 2=inferred`);
}

/**
 * Check if a question is redundant (answer can be inferred)
 * NOW USES: sourceMatrix (perfected algorithm)
 * @param {number} i - From factor index
 * @param {number} j - To factor index
 * @returns {boolean} True if question can be skipped
 */
function isQuestionRedundant(i, j) {
    // If we already know i→j (either direct or inferred), skip the question
    // sourceMatrix > 0 means we have an answer (1=direct, 2=inferred)
    return votingState.sourceMatrix[i][j] > 0;
}

/**
 * Update matrices after a vote - PERFECTED ALGORITHM from guided-matrix-validator.html
 * Implements ENHANCED INFERENCE with:
 * - Multi-round iterative transitive closure
 * - Negative inference from blocked paths
 * - sourceMatrix tracking (1=direct, 2=inferred)
 * 
 * @param {number} from - From factor index
 * @param {number} to - To factor index
 * @param {boolean} answer - User's vote (true = YES, false = NO)
 */
function updateReachabilityMatrix(from, to, answer) {
    const n = votingState.userMatrix.length;
    
    // Mark this question as asked
    votingState.questionsAsked++;
    
    // Set the answer
    if (answer) {
        votingState.userMatrix[from][to] = 1;
        votingState.sourceMatrix[from][to] = 1;  // 1 = direct answer
        console.log(`   ✅ ${from}→${to} = YES (running enhanced inference...)`);
        console.log(`   ➡️ Set userMatrix[${from}][${to}] = 1, sourceMatrix = 1`);
        
        // Run enhanced transitive inference
        runTransitiveInference(from, to);
    } else {
        votingState.userMatrix[from][to] = 0;
        votingState.sourceMatrix[from][to] = 1;  // 1 = direct answer (value is 0)
        console.log(`   ⚪ ${from}→${to} = NO (checking negative inferences...)`);
        console.log(`   ➡️ Set userMatrix[${from}][${to}] = 0, sourceMatrix = 1`);
        
        // Run negative inference check
        runNegativeInference();
    }
    
    // Also update deprecated reachabilityMatrix for backwards compatibility
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (votingState.userMatrix[i][j] === 1) {
                votingState.reachabilityMatrix[i][j] = 1;
            }
        }
    }
}

/**
 * ENHANCED TRANSITIVE INFERENCE - Multi-round iterative algorithm
 * Adapted from guided-matrix-validator.html lines 966-1040
 * Keeps inferring until no more inferences can be made (full transitive closure)
 * 
 * @param {number} from - From factor index that was just answered
 * @param {number} to - To factor index that was just answered
 */
function runTransitiveInference(from, to) {
    const n = votingState.factors.length;
    let totalInferred = 0;
    let madeProgress = true;
    let iterations = 0;
    
    console.log(`   🧠 Starting enhanced inference from ${votingState.factors[from]?.name || from}→${votingState.factors[to]?.name || to}`);
    console.log(`   📊 Matrix size: ${n}x${n}`);
    
    // Keep inferring until no more inferences can be made (full transitive closure)
    while (madeProgress && iterations < 10) {
        madeProgress = false;
        iterations++;
        let inferredThisRound = 0;
        
        console.log(`   🔄 Starting Round ${iterations}...`);
        
        // PHASE 1: Positive Transitive Closure (A→B ∧ B→C ⇒ A→C)
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i === j) continue;
                if (votingState.sourceMatrix[i][j] > 0) continue; // Already known
                
                // Check if there exists a k such that i→k and k→j
                for (let k = 0; k < n; k++) {
                    if (k === i || k === j) continue;
                    
                    if (votingState.userMatrix[i][k] === 1 && votingState.userMatrix[k][j] === 1) {
                        votingState.userMatrix[i][j] = 1;
                        votingState.sourceMatrix[i][j] = 2; // Mark as inferred
                        console.log(`      ✓ Inferred YES: ${votingState.factors[i]?.name || i}→${votingState.factors[j]?.name || j} (via ${votingState.factors[k]?.name || k})`);
                        inferredThisRound++;
                        totalInferred++;
                        madeProgress = true;
                        break;
                    }
                }
            }
        }
        
        if (inferredThisRound > 0) {
            console.log(`   📊 Round ${iterations}: Inferred ${inferredThisRound} relationships`);
        } else {
            console.log(`   ⭕ Round ${iterations}: No new inferences (stopping)`);
        }
    }
    
    if (totalInferred > 0) {
        console.log(`   ✅ Total inferred: ${totalInferred} relationships in ${iterations} round(s)`);
    } else {
        console.log(`   ℹ️ No inferences made from this answer`);
    }
}

/**
 * NEGATIVE INFERENCE - Infer "NO" answers from blocked paths
 * Adapted from guided-matrix-validator.html lines 1009-1024
 * If all paths from i to j are blocked, then i does NOT influence j
 */
function runNegativeInference() {
    const n = votingState.factors.length;
    let inferredCount = 0;
    
    // For all unknown relationships, check if we can infer NO
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i === j) continue;
            if (votingState.sourceMatrix[i][j] > 0) continue; // Already known
            
            // Check if i→j is IMPOSSIBLE based on known "NO" answers
            if (isPathBlocked(i, j, n)) {
                votingState.userMatrix[i][j] = 0;
                votingState.sourceMatrix[i][j] = 2; // Mark as inferred
                console.log(`      ✓ Inferred NO: ${votingState.factors[i]?.name || i}→${votingState.factors[j]?.name || j} (no path exists)`);
                inferredCount++;
            }
        }
    }
    
    if (inferredCount > 0) {
        console.log(`   💡 Made ${inferredCount} negative inferences`);
    }
}

/**
 * Helper: Check if all paths from i to j are blocked
 * Adapted from guided-matrix-validator.html lines 1042-1080
 * 
 * @param {number} i - From factor
 * @param {number} j - To factor
 * @param {number} n - Matrix size
 * @returns {boolean} True if all paths are blocked
 */
function isPathBlocked(i, j, n) {
    // We can infer i→j is "NO" if ALL possible paths are proven to be blocked
    // This happens when:
    // 1. For every intermediate node k, at least one of these is true:
    //    - i→k is known to be "NO"
    //    - k→j is known to be "NO"
    
    let hasUnknownPath = false;
    let hasOpenPath = false;
    
    for (let k = 0; k < n; k++) {
        if (k === i || k === j) continue;
        
        // Check status of i→k
        const ikKnown = votingState.sourceMatrix[i][k] > 0;
        const ikYes = votingState.userMatrix[i][k] === 1;
        
        // Check status of k→j
        const kjKnown = votingState.sourceMatrix[k][j] > 0;
        const kjYes = votingState.userMatrix[k][j] === 1;
        
        // If i→k is YES and k→j is YES, there's an open path
        if (ikYes && kjYes) {
            hasOpenPath = true;
            break;
        }
        
        // If either i→k or k→j is unknown, we can't rule out this path yet
        if (!ikKnown || !kjKnown) {
            hasUnknownPath = true;
        }
    }
    
    // We can only infer "NO" if:
    // - There are NO open paths (no k where i→k=YES and k→j=YES)
    // - ALL paths are known (no unknown connections)
    return !hasOpenPath && !hasUnknownPath;
}

/**
 * Initialize voting phase with factors from coding
 */
async function initializeVotingPhase(projectId) {
    console.log('🚀 Initializing voting phase for project:', projectId);
    
    try {
        votingState.projectId = projectId;
        
        // Load project details
        const projectResponse = await fetch(`tables/projects/${projectId}`);
        votingState.project = await projectResponse.json();
        
        // Load factors from coded_themes
        // Note: API has max limit validation, use reasonable number
        // Add cache-busting timestamp to ensure fresh data
        const timestamp = Date.now();
        const themesResponse = await fetch(`tables/coded_themes?limit=100&_t=${timestamp}`);
        const themesData = await themesResponse.json();
        
        console.log('📊 Raw themes data:', themesData);
        
        // Check for API errors
        if (themesData.status && themesData.status < 0) {
            console.error('❌ API Error:', themesData.message, themesData.errors);
            throw new Error(`API Error: ${themesData.message}`);
        }
        
        console.log('📊 API Response:', {
            total: themesData.total,
            returned: themesData.data?.length || 0,
            page: themesData.page,
            limit: themesData.limit
        });
        
        // Check if we need to handle pagination
        if (themesData.total > themesData.data?.length) {
            console.warn('⚠️ PAGINATION ISSUE: API returned', themesData.data?.length, 'but total is', themesData.total);
            console.warn('⚠️ This means some factors are missing!');
        }
        
        // Filter themes for this project and sort by rank (handle type mismatch)
        const allThemes = themesData.data || [];
        console.log('🔍 Filtering themes for project:', projectId, 'Type:', typeof projectId);
        
        // DEBUG: Log ALL themes before filtering
        console.log('🔍 ALL THEMES IN DATABASE:', allThemes.map(t => ({
            name: t.name,
            project_id: t.project_id,
            project_id_type: typeof t.project_id
        })));
        
        console.log('🔍 CURRENT PROJECT ID:', projectId, 'Type:', typeof projectId);
        
        votingState.factors = allThemes
            .filter(theme => {
                // Handle type mismatch - compare as strings
                const themeProjectId = String(theme.project_id);
                const currentProjectId = String(projectId);
                const matches = themeProjectId === currentProjectId;
                
                if (!matches) {
                    console.log(`❌ EXCLUDED: "${theme.name}" (project_id: "${theme.project_id}" vs current: "${projectId}")`);
                } else {
                    console.log(`✅ INCLUDED: "${theme.name}" (project_id: "${theme.project_id}")`);
                }
                
                return matches;
            })
            .sort((a, b) => (a.rank || 0) - (b.rank || 0))
            .map((theme, index) => ({
                id: theme.id,
                name: theme.name,
                description: theme.description || '',
                rank: theme.rank || index + 1,
                index: index
            }));
        
        console.log(`✅ Loaded ${votingState.factors.length} factors for voting (from ${allThemes.length} total themes)`);
        
        // Check if no themes found - provide helpful guidance
        if (votingState.factors.length === 0) {
            // Check if ideas exist
            const ideasResponse = await fetch(`tables/idea_responses?limit=1000`);
            const ideasData = await ideasResponse.json();
            const ideas = (ideasData.data || []).filter(i => String(i.project_id) === String(projectId));
            
            if (ideas.length > 0) {
                // Ideas exist but themes don't
                console.log(`⚠️ Found ${ideas.length} ideas but no themes - need to generate themes`);
                showNoThemesMessage(ideas.length);
                return false;
            } else {
                // No ideas either
                console.log('⚠️ No ideas found - need to complete Idea Generation');
                showNoIdeasMessage();
                return false;
            }
        }
        
        // Initialize Warfield ISM
        votingState.ismMatrix = new ISMWarfield(projectId);
        votingState.ismMatrix.setFactors(votingState.factors);
        
        // Generate voting pairs (all n²-n for participant voting)
        votingState.votingPairs = generateAllPairs(votingState.factors);
        
        // Initialize reachability matrix for Warfield's transitive reduction
        initializeReachabilityMatrix(votingState.factors.length);
        
        // Update UI
        updateVotingTabUI();
        
        return true;
        
    } catch (error) {
        console.error('❌ Error initializing voting phase:', error);
        throw error;
    }
}

/**
 * Show message when ideas exist but themes don't
 */
function showNoThemesMessage(ideaCount) {
    const factorsList = document.getElementById('voting-factors-list');
    if (!factorsList) return;
    
    factorsList.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 3rem; max-width: 600px; margin: 0 auto;">
            <i class="fas fa-tasks" style="font-size: 3.5rem; margin-bottom: 1.5rem; color: #3E0505; opacity: 0.4;"></i>
            <h3 style="color: #0B2B26; font-size: 1.5rem; margin-bottom: 1rem;">No Themes Generated Yet</h3>
            <p style="color: #666; font-size: 1.1rem; margin-bottom: 1.5rem;">
                Good news! You have <strong>${ideaCount} ideas</strong> submitted. 
                Now you need to generate themes from these ideas before voting can begin.
            </p>
            <div style="background: #FAF3DD; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #ea580c; margin-bottom: 1.5rem; text-align: left;">
                <h4 style="margin: 0 0 1rem 0; color: #0B2B26;">
                    <i class="fas fa-info-circle"></i> Next Steps:
                </h4>
                <ol style="margin: 0; padding-left: 1.5rem; color: #4a5568; line-height: 1.8;">
                    <li>Go to the <strong>Coding & Factors</strong> tab</li>
                    <li>Select your desired number of themes (8-15 recommended)</li>
                    <li>Click <strong>"Generate Themes"</strong> button</li>
                    <li>Wait for the qualitative coding engine to analyze ideas</li>
                    <li>Return to this <strong>Voting</strong> tab</li>
                </ol>
            </div>
            <button onclick="switchTab('coding')" class="btn btn-primary" style="font-size: 1rem; padding: 0.75rem 2rem;">
                <i class="fas fa-arrow-right"></i> Go to Coding & Factors
            </button>
        </div>
    `;
    
    // Also show toast
    showToast(`Found ${ideaCount} ideas! Please generate themes in Coding & Factors tab first.`, 'warning');
}

/**
 * Show message when no ideas exist yet
 */
function showNoIdeasMessage() {
    const factorsList = document.getElementById('voting-factors-list');
    if (!factorsList) return;
    
    factorsList.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 3rem; max-width: 600px; margin: 0 auto;">
            <i class="fas fa-comments" style="font-size: 3.5rem; margin-bottom: 1.5rem; color: #3E0505; opacity: 0.4;"></i>
            <h3 style="color: #0B2B26; font-size: 1.5rem; margin-bottom: 1rem;">No Ideas Submitted Yet</h3>
            <p style="color: #666; font-size: 1.1rem; margin-bottom: 1.5rem;">
                Before voting can begin, participants need to submit ideas first.
            </p>
            <div style="background: #FAF3DD; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #ea580c; margin-bottom: 1.5rem; text-align: left;">
                <h4 style="margin: 0 0 1rem 0; color: #0B2B26;">
                    <i class="fas fa-info-circle"></i> Workflow:
                </h4>
                <ol style="margin: 0; padding-left: 1.5rem; color: #4a5568; line-height: 1.8;">
                    <li><strong>Idea Generation</strong> - Participants submit ideas</li>
                    <li><strong>Coding & Factors</strong> - Admin generates themes from ideas</li>
                    <li><strong>Voting</strong> - Participants vote on theme relationships</li>
                </ol>
            </div>
            <button onclick="switchTab('ideageneration')" class="btn btn-primary" style="font-size: 1rem; padding: 0.75rem 2rem;">
                <i class="fas fa-arrow-right"></i> Go to Idea Generation
            </button>
        </div>
    `;
    
    showToast('No ideas found. Please complete Idea Generation phase first.', 'warning');
}

/**
 * Update voting tab UI with factor list and controls
 */
function updateVotingTabUI() {
    const factorsList = document.getElementById('voting-factors-list');
    const factorCount = document.getElementById('voting-factor-count');
    const pairCount = document.getElementById('voting-pair-count');
    
    if (!factorsList) {
        console.error('❌ Voting factors list element not found');
        return;
    }
    
    // Update counts
    if (factorCount) factorCount.textContent = votingState.factors.length;
    if (pairCount) pairCount.textContent = votingState.votingPairs.length;
    
    // Build sortable factors list with improved drag-and-drop
    factorsList.innerHTML = votingState.factors.map((factor, index) => `
        <div class="voting-factor-item" draggable="true" 
             data-factor-id="${factor.id}" 
             data-index="${index}"
             ondragstart="handleVotingDragStart(event)"
             ondragover="handleVotingDragOver(event)"
             ondrop="handleVotingDrop(event)"
             ondragend="handleVotingDragEnd(event)">
            <div class="voting-factor-rank">${index + 1}</div>
            <div class="voting-factor-content">
                <div class="voting-factor-name">${factor.name}</div>
                <div class="voting-factor-description">${factor.description}</div>
            </div>
            <div class="voting-factor-actions">
                <button class="btn-icon" onclick="moveFactorUp(${index})" 
                        ${index === 0 ? 'disabled' : ''} title="Move up">
                    <i class="fas fa-arrow-up"></i>
                </button>
                <button class="btn-icon" onclick="moveFactorDown(${index})" 
                        ${index === votingState.factors.length - 1 ? 'disabled' : ''} title="Move down">
                    <i class="fas fa-arrow-down"></i>
                </button>
                <button class="btn-icon drag-handle" title="Drag to reorder">
                    <i class="fas fa-grip-vertical"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    console.log('✅ Voting UI updated');
}

/**
 * Move factor up in the list
 */
function moveFactorUp(index) {
    if (index === 0) return;
    
    // Swap with previous
    const temp = votingState.factors[index];
    votingState.factors[index] = votingState.factors[index - 1];
    votingState.factors[index - 1] = temp;
    
    // Update ranks
    votingState.factors.forEach((f, i) => f.rank = i + 1);
    
    // Regenerate voting pairs and update UI
    votingState.ismMatrix.setFactors(votingState.factors);
    votingState.votingPairs = votingState.ismMatrix.generateVotingPairs();
    updateVotingTabUI();
}

/**
 * Move factor down in the list
 */
function moveFactorDown(index) {
    if (index === votingState.factors.length - 1) return;
    
    // Swap with next
    const temp = votingState.factors[index];
    votingState.factors[index] = votingState.factors[index + 1];
    votingState.factors[index + 1] = temp;
    
    // Update ranks
    votingState.factors.forEach((f, i) => f.rank = i + 1);
    
    // Regenerate voting pairs and update UI
    votingState.ismMatrix.setFactors(votingState.factors);
    votingState.votingPairs = votingState.ismMatrix.generateVotingPairs();
    updateVotingTabUI();
}

// Drag and drop handlers
let draggedElement = null;
let draggedIndex = null;

function handleVotingDragStart(e) {
    draggedElement = e.currentTarget;
    draggedIndex = parseInt(e.currentTarget.dataset.index);
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleVotingDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    
    const target = e.currentTarget;
    if (target !== draggedElement) {
        target.classList.add('drag-over');
    }
    
    return false;
}

function handleVotingDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    const target = e.currentTarget;
    target.classList.remove('drag-over');
    
    if (draggedElement !== target) {
        const targetIndex = parseInt(target.dataset.index);
        
        // Reorder factors array
        const item = votingState.factors.splice(draggedIndex, 1)[0];
        votingState.factors.splice(targetIndex, 0, item);
        
        // Update ranks
        votingState.factors.forEach((f, i) => {
            f.rank = i + 1;
            f.index = i;
        });
        
        // Regenerate voting pairs and update UI
        votingState.ismMatrix.setFactors(votingState.factors);
        votingState.votingPairs = votingState.ismMatrix.generateVotingPairs();
        updateVotingTabUI();
    }
    
    return false;
}

function handleVotingDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    
    // Remove all drag-over classes
    document.querySelectorAll('.voting-factor-item').forEach(item => {
        item.classList.remove('drag-over');
    });
}

/**
 * Preview voting questions before sending to participants
 */
function previewVotingQuestions() {
    console.log('🔍 Generating voting preview...');
    
    const modal = document.getElementById('voting-preview-modal');
    const previewContent = document.getElementById('voting-preview-content');
    
    if (!modal || !previewContent) {
        alert('Preview modal not found');
        return;
    }
    
    const context = votingState.project.trigger_question || 'this context';
    const relationalPhrase = votingState.project.relational_phrase || 'significantly supports';
    
    // Generate preview HTML
    let html = `
        <div class="preview-header">
            <h3>ISM Voting Preview</h3>
            <p class="preview-info">
                <strong>Context:</strong> ${context}<br>
                <strong>Relational Phrase:</strong> "${relationalPhrase}"<br>
                <strong>Total Questions:</strong> ${votingState.votingPairs.length} (${votingState.factors.length} factors)
            </p>
        </div>
        
        <div class="preview-instructions">
            <h4>Instructions for Participants:</h4>
            <p>For each question, rate on a scale of 1-5:</p>
            <ul>
                <li><strong>5</strong> = Strongly Agree (Significant relationship)</li>
                <li><strong>4</strong> = Agree</li>
                <li><strong>3</strong> = Neutral</li>
                <li><strong>2</strong> = Disagree</li>
                <li><strong>1</strong> = Strongly Disagree (No relationship)</li>
            </ul>
            <p class="preview-note"><em>Note: Only ratings of 5 will be counted as "Yes" in the final ISM analysis.</em></p>
        </div>
        
        <div class="preview-questions">
            <h4>Sample Questions (first 10 of ${votingState.votingPairs.length}):</h4>
    `;
    
    // Show first 10 questions as sample
    const samplePairs = votingState.votingPairs.slice(0, 10);
    
    samplePairs.forEach(pair => {
        html += `
            <div class="preview-question">
                <div class="question-number">Question ${pair.questionNumber}</div>
                <div class="question-text">
                    In the context of <strong>"${context}"</strong>,<br>
                    does <strong>"${pair.from.name}"</strong> <em>${relationalPhrase}</em> <strong>"${pair.to.name}"</strong>?
                </div>
                <div class="rating-scale">
                    <div class="rating-button" data-value="1">
                        <div class="rating-bubble"></div>
                        <span class="rating-number">1</span>
                        <span class="rating-label">Strongly Disagree</span>
                        <span class="rating-description">No relationship</span>
                    </div>
                    <div class="rating-button" data-value="2">
                        <div class="rating-bubble"></div>
                        <span class="rating-number">2</span>
                        <span class="rating-label">Disagree</span>
                        <span class="rating-description">Little relationship</span>
                    </div>
                    <div class="rating-button" data-value="3">
                        <div class="rating-bubble"></div>
                        <span class="rating-number">3</span>
                        <span class="rating-label">Neutral</span>
                        <span class="rating-description">Unsure</span>
                    </div>
                    <div class="rating-button" data-value="4">
                        <div class="rating-bubble"></div>
                        <span class="rating-number">4</span>
                        <span class="rating-label">Agree</span>
                        <span class="rating-description">Some relationship</span>
                    </div>
                    <div class="rating-button" data-value="5">
                        <div class="rating-bubble"></div>
                        <span class="rating-number">5</span>
                        <span class="rating-label">Strongly Agree</span>
                        <span class="rating-description">Significant relationship</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    if (votingState.votingPairs.length > 10) {
        html += `<p class="preview-more">... and ${votingState.votingPairs.length - 10} more questions</p>`;
    }
    
    html += `</div>`;
    
    previewContent.innerHTML = html;
    modal.style.display = 'block';
    
    console.log('✅ Preview generated');
}

/**
 * Close preview modal
 */
function closeVotingPreview() {
    const modal = document.getElementById('voting-preview-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Preview ISM Task - Opens participant voting page in new window
 */
function previewISMTask() {
    console.log('🔍 Opening ISM Task preview...');
    
    // Check if we have factors
    if (!votingState.factors || votingState.factors.length === 0) {
        alert('⚠️ No factors available for preview.\n\nPlease generate themes in the Coding & Factors tab first.');
        return;
    }
    
    // Check if we have a project
    if (!votingState.project || !votingState.projectId) {
        alert('⚠️ No project selected.\n\nPlease select a project first.');
        return;
    }
    
    // Create a preview token
    const previewToken = 'PREVIEW-' + Date.now();
    
    // Create preview participant data in sessionStorage (temporary, not saved to database)
    const previewParticipant = {
        id: 'preview-participant',
        name: 'Preview User (Administrator)',
        email: 'preview@admin.local',
        project_id: votingState.projectId,
        access_token: previewToken,
        role: 'preview'
    };
    
    // Store preview data temporarily
    sessionStorage.setItem('preview_participant', JSON.stringify(previewParticipant));
    sessionStorage.setItem('preview_project', JSON.stringify(votingState.project));
    sessionStorage.setItem('preview_factors', JSON.stringify(votingState.factors));
    
    // Open participant voting page in new window/tab with cache-busting
    const cacheBuster = Date.now();
    const previewURL = `participant-voting.html?token=${previewToken}&v=6.28.11&_=${cacheBuster}`;
    const previewWindow = window.open(previewURL, '_blank');
    
    if (previewWindow) {
        console.log('✅ Preview window opened');
        showToast('✅ Preview opened in new tab', 'success');
    } else {
        alert('⚠️ Popup blocked!\n\nPlease allow popups for this site to preview the ISM task.\n\nAlternatively, you can manually open:\n' + previewURL);
    }
}

/**
 * Save current factor order to database
 */
async function saveFactorOrder() {
    console.log('💾 Saving factor order...');
    
    try {
        // Update each factor's rank in the database
        const updates = votingState.factors.map((factor, index) => {
            return fetch(`tables/coded_themes/${factor.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rank: index + 1 })
            });
        });
        
        await Promise.all(updates);
        
        console.log('✅ Factor order saved successfully');
        showToast('Factor order saved successfully', 'success');
        
    } catch (error) {
        console.error('❌ Error saving factor order:', error);
        showToast('Failed to save factor order', 'error');
    }
}

/**
 * Send voting emails to participants
 */
async function sendVotingEmails() {
    console.log('📧 Preparing to send voting emails...');
    
    try {
        // Save factor order first
        await saveFactorOrder();
        
        // Get participants from AppState (already loaded)
        const participants = AppState.participants?.filter(p => 
            p.project_id === votingState.projectId && p.email
        ) || [];
        
        if (participants.length === 0) {
            alert('No participants found. Please add participants first.');
            return;
        }
        
        console.log(`📧 Found ${participants.length} participants with email addresses`);
        
        // Confirm before sending
        if (!confirm(`Send voting invitations to ${participants.length} participant(s)?\n\nThis will send ${votingState.votingPairs.length} questions to each participant.`)) {
            return;
        }
        
        // Use the new sequential email sender with ParticipantEmails
        if (typeof ParticipantEmails !== 'undefined' && ParticipantEmails.sendEmails) {
            await ParticipantEmails.sendEmails('factor_voting', participants);
        } else {
            console.error('❌ ParticipantEmails not loaded');
            alert('Email system not ready. Please refresh the page and try again.');
        }
        
    } catch (error) {
        console.error('❌ Error sending voting emails:', error);
        alert('Failed to send voting emails. Check console for details.');
    }
}

/**
 * Load and display voting results
 */
async function loadVotingResults() {
    console.log('📊 Loading voting results...');
    
    try {
        const responsesData = await fetch(`tables/ism_votes?limit=10000`);
        
        if (!responsesData.ok) {
            console.error('❌ API Error loading voting results:', responsesData.status);
            if (responsesData.status === 422) {
                console.log('⚠️ No voting data available yet');
                return; // Silently fail, no results to display
            }
            throw new Error(`API Error: ${responsesData.status}`);
        }
        
        const responses = await responsesData.json();
        
        if (!responses || !responses.data || !Array.isArray(responses.data)) {
            console.error('❌ Invalid voting results structure:', responses);
            return;
        }
        
        const projectResponses = responses.data.filter(r => 
            r.project_id === votingState.projectId
        );
        
        const resultsContainer = document.getElementById('voting-results');
        if (!resultsContainer) return;
        
        // Calculate completion stats
        const totalParticipants = votingState.participants.length;
        
        // Get participants who have completed voting (voting_task_completed = true)
        const completedParticipants = votingState.participants.filter(p => p.voting_task_completed).length;
        
        // Get participants who have started (have at least one response)
        const participantsWithResponses = new Set(projectResponses.map(r => r.participant_id));
        const startedParticipants = participantsWithResponses.size;
        
        // Calculate opened (started but not completed)
        const openedParticipants = startedParticipants - completedParticipants;
        
        // Calculate yet to open (no responses at all)
        const yetToOpenParticipants = totalParticipants - startedParticipants;
        
        const totalQuestions = votingState.votingPairs.length;
        const completionRate = totalParticipants > 0 
            ? ((completedParticipants / totalParticipants) * 100).toFixed(1) 
            : 0;
        
        resultsContainer.innerHTML = `
            <div class="voting-stats">
                <div class="stat-card">
                    <div class="stat-value">${completedParticipants}</div>
                    <div class="stat-label">Completed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${openedParticipants}</div>
                    <div class="stat-label">Opened (In Progress)</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${yetToOpenParticipants}</div>
                    <div class="stat-label">Yet to Open</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${totalParticipants}</div>
                    <div class="stat-label">Total Participants</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${completionRate}%</div>
                    <div class="stat-label">Completion Rate</div>
                </div>
            </div>
            
            ${projectResponses.length > 0 ? `
                <p style="color: #666; margin-top: 1rem; font-size: 0.9rem;">
                    <i class="fas fa-info-circle"></i> ${projectResponses.length} total votes received across ${totalQuestions} questions per participant
                </p>
            ` : `
                <p class="no-data">Waiting for participants to complete voting...</p>
            `}
        `;
        
        console.log(`✅ Loaded ${projectResponses.length} voting responses`);
        
    } catch (error) {
        console.error('❌ Error loading voting results:', error);
    }
}

/**
 * Generate ISM flowchart from voting results
 */
async function generateISMResults() {
    console.log('🚀 Generating ISM flowchart...');
    
    try {
        // Load all voting responses
        const responsesData = await fetch(`tables/ism_votes?limit=10000`);
        
        if (!responsesData.ok) {
            console.error('❌ API Error:', responsesData.status);
            if (responsesData.status === 422) {
                alert('No voting data available. Participants must complete voting first.');
                return;
            }
            throw new Error(`API Error: ${responsesData.status}`);
        }
        
        const responses = await responsesData.json();
        
        if (!responses || !responses.data || !Array.isArray(responses.data)) {
            console.error('❌ Invalid API response structure:', responses);
            alert('Invalid voting data format.');
            return;
        }
        
        const projectResponses = responses.data.filter(r => 
            r.project_id === votingState.projectId
        );
        
        if (projectResponses.length === 0) {
            alert('No voting responses available to analyze.');
            return;
        }
        
        // Perform ISM analysis
        const results = await votingState.ismMatrix.performCompleteAnalysis(
            projectResponses,
            votingState.project.trigger_question,
            votingState.project.relational_phrase
        );
        
        console.log('✅ ISM analysis complete:', results);
        
        // Display flowchart
        displayISMFlowchart(results.structuralModel);
        
        // Also generate individual structures
        console.log('🔄 Generating individual structures...');
        try {
            await generateIndividualStructures();
        } catch (error) {
            console.warn('⚠️ Individual structures generation failed (non-critical):', error);
        }
        
        showToast('ISM flowchart generated successfully', 'success');
        
    } catch (error) {
        console.error('❌ Error generating ISM results:', error);
        showToast('Failed to generate ISM flowchart', 'error');
    }
}

/**
 * Display ISM flowchart using vis-network
 */
function displayISMFlowchart(structuralModel) {
    console.log('📊 Displaying ISM flowchart with influence scores and cycles...');
    
    const container = document.getElementById('ism-flowchart');
    if (!container) {
        console.error('❌ Flowchart container not found');
        return;
    }
    
    // Prepare nodes for vis-network with influence scores
    const nodes = new vis.DataSet(structuralModel.nodes.map(node => {
        const infScore = node.influenceScore || 0;
        const supScore = node.supportScore || 0;
        
        return {
            id: node.id,
            label: `${node.label}\n[INF: ${infScore}]`,
            title: `${node.description}\n\nInfluence Score: ${infScore}\nSupport Score: ${supScore}\nLevel: ${node.level}`,
            level: node.level,
            color: {
                background: getNodeColor(node.level),
                border: '#2B7CE9'
            },
            font: { size: 13, color: '#ffffff', multi: true },
            shape: 'box',
            margin: 15,
            borderWidth: 2,
            borderWidthSelected: 4
        };
    }));
    
    // Prepare edges for vis-network - highlight cycles
    const edges = new vis.DataSet(structuralModel.edges.map(edge => {
        const isCycle = edge.isCycle || false;
        
        return {
            from: edge.from,
            to: edge.to,
            arrows: 'to',
            color: {
                color: isCycle ? '#e74c3c' : '#848484',
                highlight: isCycle ? '#c0392b' : '#2B7CE9'
            },
            width: isCycle ? 3 : 2,
            dashes: isCycle ? [5, 5] : false,
            title: isCycle ? 'Mutual Support (Cycle)' : 'Supports'
        };
    }));
    
    const data = { nodes, edges };
    
    const options = {
        layout: {
            hierarchical: {
                enabled: true,
                direction: 'UD',
                sortMethod: 'directed',
                levelSeparation: 150,
                nodeSpacing: 200,
                treeSpacing: 250
            }
        },
        physics: {
            enabled: false
        },
        interaction: {
            hover: true,
            tooltipDelay: 200,
            navigationButtons: true,
            keyboard: true
        },
        nodes: {
            borderWidth: 2,
            shadow: true
        },
        edges: {
            smooth: {
                type: 'cubicBezier',
                forceDirection: 'vertical',
                roundness: 0.4
            }
        }
    };
    
    const network = new vis.Network(container, data, options);
    
    // Display summary information
    displayISMSummary(structuralModel);
    
    container.style.display = 'block';
    console.log('✅ ISM flowchart displayed with Warfield analysis');
}

/**
 * Display ISM analysis summary
 */
function displayISMSummary(structuralModel) {
    const summaryHtml = `
        <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 1rem;">
            <h4 style="margin: 0 0 1rem 0; color: #2c3e50;">
                <i class="fas fa-chart-line"></i> Warfield ISM Analysis Summary
            </h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                <div>
                    <strong>Total Factors:</strong> ${structuralModel.factors.length}
                </div>
                <div>
                    <strong>Hierarchical Levels:</strong> ${structuralModel.levels.length}
                </div>
                <div>
                    <strong>Direct Relationships:</strong> ${structuralModel.edges.length}
                </div>
                <div>
                    <strong>Mutual Support Cycles:</strong> ${structuralModel.cycles.length}
                </div>
            </div>
            
            ${structuralModel.cycles.length > 0 ? `
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #dee2e6;">
                    <strong style="color: #e74c3c;">
                        <i class="fas fa-sync-alt"></i> Cycles Detected:
                    </strong>
                    <ul style="margin: 0.5rem 0 0 1.5rem;">
                        ${structuralModel.cycles.map(cycle => `
                            <li>${cycle.map(f => f.name).join(' ↔ ')}</li>
                        `).join('')}
                    </ul>
                    <p style="margin-top: 0.5rem; font-size: 0.875rem; color: #666;">
                        These factors mutually support each other and should be addressed together.
                    </p>
                </div>
            ` : ''}
            
            <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #dee2e6;">
                <strong>Top Influencers (highest influence scores):</strong>
                <ol style="margin: 0.5rem 0 0 1.5rem;">
                    ${structuralModel.influenceScores.slice(0, 5).map(score => `
                        <li>${score.factor.name} (INF: ${score.influenceScore})</li>
                    `).join('')}
                </ol>
                <p style="margin-top: 0.5rem; font-size: 0.875rem; color: #666;">
                    These foundational factors support the most other factors in the system.
                </p>
            </div>
        </div>
    `;
    
    const container = document.getElementById('ism-flowchart');
    if (container.previousElementSibling) {
        // Insert summary before flowchart
        container.insertAdjacentHTML('beforebegin', summaryHtml);
    }
}

/**
 * Get node color based on hierarchical level
 */
function getNodeColor(level) {
    const colors = [
        '#e74c3c', // Red - Level 1 (top)
        '#e67e22', // Orange - Level 2
        '#f39c12', // Yellow - Level 3
        '#27ae60', // Green - Level 4
        '#3498db', // Blue - Level 5
        '#9b59b6', // Purple - Level 6
        '#34495e'  // Dark grey - Level 7+
    ];
    
    return colors[Math.min(level - 1, colors.length - 1)];
}

/**
 * Utility: Show toast notification
 */
function showToast(message, type = 'info') {
    // Skip success toasts - no annoying banners
    if (type === 'success') return;
    
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Export functions for global access
window.initializeVotingPhase = initializeVotingPhase;
window.previewVotingQuestions = previewVotingQuestions;
window.closeVotingPreview = closeVotingPreview;
window.moveFactorUp = moveFactorUp;
window.moveFactorDown = moveFactorDown;
window.handleVotingDragStart = handleVotingDragStart;
window.handleVotingDragOver = handleVotingDragOver;
window.handleVotingDrop = handleVotingDrop;
window.handleVotingDragEnd = handleVotingDragEnd;
window.saveFactorOrder = saveFactorOrder;
window.sendVotingEmails = sendVotingEmails;
window.generateISMResults = generateISMResults;

/**
 * Copy Public Voting Link to Clipboard
 * Generates and copies the public voting URL for the current project
 */
async function copyPublicVotingLink() {
    try {
        // Get current project ID
        const projectId = votingState.projectId || window.currentProjectId;
        
        if (!projectId) {
            alert('⚠️ Please select a project first');
            return;
        }
        
        // Generate the public voting link
        const baseUrl = window.location.origin + window.location.pathname.replace('admin-v6.33.html', '');
        const publicVotingUrl = `${baseUrl}public-voting.html?project=${projectId}`;
        
        // Copy to clipboard
        await navigator.clipboard.writeText(publicVotingUrl);
        
        // Show success notification
        const button = event.target.closest('button');
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Link Copied!';
        button.style.background = '#10B981';
        
        // Show additional info
        console.log('📋 Public Voting Link Copied:', publicVotingUrl);
        
        // Create a toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10B981;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            animation: slideInRight 0.3s ease-out;
        `;
        toast.innerHTML = `
            <i class="fas fa-check-circle" style="font-size: 1.25rem;"></i>
            <div>
                <div style="font-weight: 600; margin-bottom: 0.25rem;">Link Copied Successfully!</div>
                <div style="font-size: 0.85rem; opacity: 0.95;">${publicVotingUrl}</div>
            </div>
        `;
        
        // Add animation keyframes if not already present
        if (!document.getElementById('toast-animations')) {
            const style = document.createElement('style');
            style.id = 'toast-animations';
            style.textContent = `
                @keyframes slideInRight {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOutRight {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(toast);
        
        // Remove toast after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
        
        // Reset button after 2 seconds
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.style.background = '#0B8B00';
        }, 2000);
        
    } catch (error) {
        console.error('Error copying public voting link:', error);
        alert('❌ Failed to copy link. Please try again.');
    }
}

window.copyPublicVotingLink = copyPublicVotingLink;
