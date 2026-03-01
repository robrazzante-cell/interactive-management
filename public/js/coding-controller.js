// Coding & Factors Tab Controller
// Connects UI with Coding Engine

// Global state
let codingEngine = null;
let currentThemeCount = 12;
let generatedThemes = [];
let draggedThemeIndex = null;

// Initialize coding engine
function initCodingEngine() {
    if (typeof CodingEngine === 'undefined') {
        console.error('CodingEngine not loaded');
        return;
    }
    codingEngine = new CodingEngine();
    console.log('✅ Coding Engine initialized');
}

// Load ideas and initialize
async function initCodingTab() {
    console.log('🎯 Initializing Coding & Factors tab...');
    console.log('📊 Current AppState:', {
        hasProject: !!AppState.currentProject,
        projectId: AppState.currentProject?.id,
        projectTitle: AppState.currentProject?.title
    });
    
    if (!AppState.currentProject) {
        showToast('Please select a project first', 'error');
        console.error('❌ No project selected in AppState');
        return;
    }

    // Initialize engine
    if (!codingEngine) {
        initCodingEngine();
    }

    // Load saved themes first (if any exist)
    console.log('🔄 Checking for saved themes...');
    await loadSavedThemes();
    
    // Load ideas from Idea Generation (auto-load on tab open)
    console.log('🔄 Auto-loading ideas from Idea Generation...');
    const ideas = await loadIdeasForCoding();
    
    console.log(`📊 initCodingTab complete: Loaded ${ideas?.length || 0} ideas`);
    
    // If no ideas loaded, make sure reload button is visible and status shows guidance
    if (!ideas || ideas.length === 0) {
        const statusEl = document.getElementById('ideas-load-status');
        if (statusEl) {
            statusEl.innerHTML = `⚠️ No ideas loaded. <strong>Click "Reload Ideas" button above</strong>`;
            statusEl.style.color = '#ea580c';
            statusEl.style.fontSize = '0.95rem';
        }
    }
    
    // If no ideas loaded, show helpful message
    if (ideas.length === 0) {
        console.warn('⚠️ No ideas loaded automatically. Click "Reload Ideas" button.');
        const statusEl = document.getElementById('ideas-load-status');
        if (statusEl) {
            statusEl.innerHTML = '⚠️ Ideas did not auto-load. <strong>Click "Reload Ideas" button</strong> above.';
            statusEl.style.color = '#ea580c';
            statusEl.style.fontWeight = '600';
        }
    }
}

// Load saved themes from database
async function loadSavedThemes() {
    try {
        console.log('📥 Loading saved themes from database...');
        
        if (!AppState.currentProject || !AppState.currentProject.id) {
            console.warn('⚠️ No project selected, skipping theme load');
            return [];
        }
        
        const response = await fetch('tables/coded_themes?limit=1000');
        const data = await response.json();
        
        let themes = [];
        if (Array.isArray(data)) {
            themes = data;
        } else if (data.data && Array.isArray(data.data)) {
            themes = data.data;
        }
        
        // Filter by current project
        const projectThemes = themes.filter(t => 
            String(t.project_id) === String(AppState.currentProject.id)
        );
        
        console.log(`📊 Found ${projectThemes.length} saved themes for this project`);
        
        if (projectThemes.length > 0) {
            // Load into generatedThemes array
            generatedThemes = projectThemes;
            
            // Display themes
            displayThemes(generatedThemes);
            
            // Enable proceed button if it exists
            const proceedBtn = document.getElementById('proceed-voting-btn');
            if (proceedBtn) proceedBtn.disabled = false;

            showToast(`Loaded ${projectThemes.length} saved factors`, 'success');
            console.log('✅ Saved themes loaded and displayed');
        } else {
            console.log('ℹ️ No saved themes found for this project');
            generatedThemes = [];
            displayThemes([]);
        }
        
        return projectThemes;
        
    } catch (error) {
        console.error('❌ Error loading saved themes:', error);
        showToast('Error loading saved factors', 'error');
        return [];
    }
}

// Load ideas from idea_responses table
async function loadIdeasForCoding() {
    try {
        console.log('🔍 Loading ideas for project:', AppState.currentProject?.id);
        console.log('🔍 Full AppState.currentProject:', AppState.currentProject);
        
        // Check if project is selected
        if (!AppState.currentProject || !AppState.currentProject.id) {
            console.error('❌ No project selected! AppState.currentProject is:', AppState.currentProject);
            showToast('Please select a project first', 'error');
            document.getElementById('total-ideas-count').textContent = 0;
            return [];
        }
        
        const response = await fetch(`tables/idea_responses?limit=1000`);
        const data = await response.json();
        
        console.log('📥 Raw API response:', data);
        console.log('📥 Response type:', typeof data);
        console.log('📥 Is array?', Array.isArray(data));
        console.log('📥 Has .data?', data.hasOwnProperty('data'));
        
        let ideas = [];
        if (Array.isArray(data)) {
            ideas = data;
        } else if (data.data && Array.isArray(data.data)) {
            ideas = data.data;
        }

        console.log(`📊 Total ideas from API: ${ideas.length}`);
        
        // Show first idea for debugging
        if (ideas.length > 0) {
            console.log('📝 Sample idea:', ideas[0]);
            console.log('📝 Sample idea project_id:', ideas[0].project_id, 'Type:', typeof ideas[0].project_id);
        }

        // Filter by current project (handle both string and number comparison)
        const currentProjectId = AppState.currentProject.id;
        console.log('🔍 Filtering for project ID:', currentProjectId, 'Type:', typeof currentProjectId);
        
        // Show all unique project IDs in the ideas
        const uniqueProjectIds = [...new Set(ideas.map(i => i.project_id))];
        console.log('📊 Unique project IDs in ideas:', uniqueProjectIds);
        
        ideas = ideas.filter(idea => {
            // Compare both as strings to handle type mismatches
            const ideaProjectId = String(idea.project_id);
            const currentProjectIdStr = String(currentProjectId);
            const matches = ideaProjectId === currentProjectIdStr;
            
            if (!matches) {
                console.log(`❌ Filtering out idea with project_id: "${idea.project_id}" (type: ${typeof idea.project_id}) vs current: "${currentProjectId}" (type: ${typeof currentProjectId})`);
            } else {
                console.log(`✅ Keeping idea with project_id: "${idea.project_id}"`);
            }
            return matches;
        });

        console.log(`✅ Ideas after filtering by project: ${ideas.length}`);

        // Update UI
        const countEl = document.getElementById('total-ideas-count');
        if (countEl) {
            countEl.textContent = ideas.length;
        } else {
            console.error('❌ Element "total-ideas-count" not found!');
        }
        
        // Update status message
        const statusEl = document.getElementById('ideas-load-status');
        if (statusEl) {
            if (ideas.length > 0) {
                statusEl.textContent = `✅ Successfully loaded ${ideas.length} ideas`;
                statusEl.style.color = '#16a34a';
            } else {
                statusEl.textContent = `⚠️ No ideas found for this project. Check Idea Generation tab.`;
                statusEl.style.color = '#ea580c';
            }
        }

        // Store for processing
        if (codingEngine) {
            codingEngine.ideas = ideas;
            console.log('✅ Stored ideas in codingEngine');
            console.log('🔍 Verification: codingEngine.ideas =', codingEngine.ideas);
            console.log('🔍 Verification: codingEngine.ideas.length =', codingEngine.ideas.length);
            console.log('🔍 Verification: typeof codingEngine.ideas =', typeof codingEngine.ideas);
        } else {
            console.error('❌ codingEngine not initialized!');
        }

        console.log(`✅ Loaded ${ideas.length} ideas for coding`);

        if (ideas.length === 0) {
            showToast('No ideas found. Please check if ideas belong to this project.', 'warning');
            console.warn('⚠️ Zero ideas after filtering. Check project ID matching.');
        } else {
            showToast(`Loaded ${ideas.length} ideas successfully`, 'success');
        }

        return ideas;

    } catch (error) {
        console.error('❌ Error loading ideas:', error);
        console.error('❌ Error stack:', error.stack);
        showToast('Error loading ideas', 'error');
        document.getElementById('total-ideas-count').textContent = 0;
        return [];
    }
}

// Select theme count
function selectThemeCount(count) {
    currentThemeCount = count;
    
    // Update UI
    document.querySelectorAll('.theme-num-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.count) === count) {
            btn.classList.add('active');
        }
    });
    
    // Clear custom input
    document.getElementById('custom-theme-count').value = '';
    
    // Log decision
    if (typeof codingLog !== 'undefined' && codingLog) {
        codingLog.logDecision(
            `Set target theme count to ${count}`,
            `Selected ${count} themes based on data volume and research objectives`
        );
    }

    console.log('✅ Theme count set to:', count);
}

// ==================== AI Theme Generation ====================

// Update this URL with your own Cloud Function endpoint (see SETUP.md)
const AI_THEMES_URL = '/api/generateAIThemes';

// Extract key phrases from idea texts for the codes field
function extractKeyPhrases(ideaTexts) {
    const stopWords = new Set(['the','a','an','is','are','was','were','be','been','being','have','has','had',
        'do','does','did','will','would','could','should','may','might','shall','can','need',
        'to','of','in','for','on','with','at','by','from','as','into','through','during','before',
        'after','above','below','between','out','off','over','under','again','further','then','once',
        'here','there','when','where','why','how','all','both','each','few','more','most','other',
        'some','such','no','nor','not','only','own','same','so','than','too','very','just','because',
        'and','but','or','if','while','about','that','this','these','those','it','its','i','we','our',
        'my','your','they','their','them','what','which','who','whom']);

    const phraseCounts = {};
    ideaTexts.forEach(text => {
        const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
        // Extract 2-3 word phrases
        for (let i = 0; i < words.length - 1; i++) {
            const bigram = words[i] + ' ' + words[i+1];
            phraseCounts[bigram] = (phraseCounts[bigram] || 0) + 1;
            if (i < words.length - 2) {
                const trigram = bigram + ' ' + words[i+2];
                phraseCounts[trigram] = (phraseCounts[trigram] || 0) + 1;
            }
        }
    });

    return Object.entries(phraseCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(e => e[0]);
}

// Transform AI output to platform theme schema
function transformAIThemesToSchema(aiThemes, ideas) {
    const now = Date.now();
    return aiThemes.map((theme, index) => {
        const themeIdeas = theme.ideaIndices
            .filter(i => i >= 0 && i < ideas.length)
            .map(i => ideas[i]);
        const ideaIds = themeIdeas.map(idea => idea.id);
        const ideaTexts = themeIdeas.map(idea => idea.idea_text);
        const codes = extractKeyPhrases(ideaTexts).slice(0, 10);

        return {
            id: 'THEME-' + now + '-' + index,
            name: theme.name,
            processCode: theme.name,
            descriptiveCode: theme.name,
            description: theme.description || '',
            ideaCount: ideaIds.length,
            ideaIds: ideaIds,
            codeCount: ideaIds.length,
            rank: index + 1,
            codes: codes,
            allCodes: codes,
            frequency: 0,
            frequencyPercentage: '0',
            mostFrequentCode: theme.name
        };
    });
}

// Generate themes using Platform AI (Claude API)
async function generateThemes() {
    const btn = document.getElementById('generate-themes-btn');

    if (!AppState.currentProject) {
        showToast('Please select a project first', 'error');
        return;
    }

    const loadedIdeas = await loadIdeasForCoding();
    if (!loadedIdeas || loadedIdeas.length === 0) {
        showToast('No ideas available. Please complete Idea Generation first.', 'error');
        return;
    }

    const letAIDecide = document.getElementById('let-ai-decide-checkbox')?.checked;
    const themeCount = letAIDecide ? 0 : (parseInt(document.getElementById('theme-count-input').value) || 8);

    // Clear old themes
    await clearOldThemesForProject();

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing with Claude...';

    try {
        const response = await fetch(AI_THEMES_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ideas: loadedIdeas.map(i => ({ id: i.id, idea_text: i.idea_text, clarification: i.clarification || '' })),
                targetThemeCount: themeCount,
                letAIDecide: letAIDecide,
                triggerQuestion: AppState.currentProject.trigger_question || '',
                contextStatement: AppState.currentProject.context_statement || ''
            })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Theme generation failed');

        // Track unassigned ideas before transforming
        const allAssignedIndices = new Set();
        result.themes.forEach(t => t.ideaIndices.forEach(i => allAssignedIndices.add(i)));
        const unassignedIdeasList = loadedIdeas.filter((_, i) => !allAssignedIndices.has(i));

        generatedThemes = transformAIThemesToSchema(result.themes, loadedIdeas);

        displayThemes(generatedThemes);
        displayUnassignedIdeas(unassignedIdeasList, loadedIdeas);
        await saveThemesAsDraft();

        // Show analysis summary if available
        displayAnalysisSummary(result.analysisSummary);

        const proceedBtn = document.getElementById('proceed-voting-btn');
        if (proceedBtn) proceedBtn.disabled = false;

        showToast(`Generated ${generatedThemes.length} themes`, 'success');

    } catch (error) {
        console.error('AI theme generation error:', error);
        showToast('Error: ' + error.message, 'error');
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-robot"></i> Generate with Claude';
}

// ==================== Bring Your Own AI (BYOAI) ====================

// BYOAI state for multi-prompt batching
let byoaiPrompts = [];        // Array of prompt strings (1 for small sets, 2+ for large)
let byoaiCurrentPrompt = 0;   // Which prompt is currently displayed
let byoaiBatchResponses = [];  // Collected responses from each batch
let byoaiIdeas = [];           // Ideas at the time modal was opened

const BYOAI_WORD_LIMIT = 3000; // Max words per prompt (safe for most AI tools)

// Toggle "Let AI decide" checkbox
function toggleLetAIDecide(checked) {
    const input = document.getElementById('theme-count-input');
    if (checked) {
        input.disabled = true;
        input.style.opacity = '0.5';
    } else {
        input.disabled = false;
        input.style.opacity = '1';
    }
}

// Get theme count instruction based on UI state
function getThemeCountInstruction() {
    const letAIDecide = document.getElementById('let-ai-decide-checkbox')?.checked;
    if (letAIDecide) {
        return { text: 'as many themes as naturally emerge from the data (typically 8-15 for 100+ ideas)', exact: false, count: null };
    }
    const count = parseInt(document.getElementById('theme-count-input').value) || 8;
    return { text: `approximately ${count} themes. If ${count} doesn't feel right for the data, adjust to whatever number best captures the natural groupings`, exact: false, count: count };
}

// Count words in a string
function countWords(text) {
    return text.split(/\s+/).filter(w => w.length > 0).length;
}

// Build the core prompt header (without ideas)
function buildPromptHeader(themeInstruction, totalIdeaCount, batchInfo) {
    const triggerQ = AppState.currentProject.trigger_question || '';
    const contextS = AppState.currentProject.context_statement || '';

    let header = `You are a qualitative research analyst performing thematic analysis on participant responses.

${triggerQ ? `Research question: "${triggerQ}"` : ''}
${contextS ? `Context: ${contextS}` : ''}

`;

    if (batchInfo) {
        header += batchInfo + '\n\n';
    }

    header += `Rules:
1. Every idea must be assigned to exactly one theme. Use the idea's index number (0-based) for assignment.
2. Theme names must be clear, descriptive noun phrases of 2-5 words.
3. Good theme names: "Mental Health Resources", "Leadership Accountability", "Cross-Department Communication"
4. Bad theme names: "Professional Standards Indicate", "One Area Improvement" — these are sentence fragments, not theme names.
5. Sort themes by number of ideas (largest group first).
6. For each theme, write a one-sentence description explaining what the theme captures.
7. Every idea index listed below must appear in exactly one theme's ideaIndices array.

Return ONLY valid JSON in this exact format (no markdown, no explanation, just JSON):
{
  "themes": [
    {
      "name": "Theme Name Here",
      "description": "One sentence describing what this theme captures.",
      "ideaIndices": [0, 3, 7, 12]
    }
  ]
}`;

    return header;
}

// Build BYOAI prompts — splits by word count if needed
function generateBYOAIPrompts() {
    if (!AppState.currentProject) {
        showToast('Please select a project first', 'error');
        return [];
    }

    const ideas = codingEngine ? codingEngine.ideas : [];
    if (!ideas || ideas.length === 0) {
        showToast('No ideas loaded. Click "Reload Ideas" first.', 'error');
        return [];
    }

    byoaiIdeas = ideas;
    const themeInstruction = getThemeCountInstruction();

    // Build all idea lines with their indices
    const ideaLines = ideas.map((idea, i) => {
        let text = `${i}. ${idea.idea_text}`;
        if (idea.clarification) text += ` (Clarification: ${idea.clarification})`;
        return text;
    });

    // Build single prompt first to check word count
    const singleHeader = buildPromptHeader(themeInstruction, ideas.length,
        `Below are ${ideas.length} participant ideas. Group them into ${themeInstruction.text}.`);
    const singlePrompt = singleHeader + '\n\nIDEAS:\n' + ideaLines.join('\n');

    if (countWords(singlePrompt) <= BYOAI_WORD_LIMIT) {
        // Fits in one prompt
        return [singlePrompt];
    }

    // Need to split into batches by word count
    const prompts = [];
    const headerWordBudget = 500; // Reserve words for instructions
    const wordsPerIdea = ideaLines.map(l => countWords(l));
    const availableWords = BYOAI_WORD_LIMIT - headerWordBudget;

    let batchStart = 0;
    let batchNum = 0;

    // First pass: figure out how many batches we need
    const batches = [];
    let tempStart = 0;
    while (tempStart < ideaLines.length) {
        let wordCount = 0;
        let tempEnd = tempStart;
        while (tempEnd < ideaLines.length && wordCount + wordsPerIdea[tempEnd] <= availableWords) {
            wordCount += wordsPerIdea[tempEnd];
            tempEnd++;
        }
        if (tempEnd === tempStart) tempEnd = tempStart + 1; // At least one idea per batch
        batches.push({ start: tempStart, end: tempEnd });
        tempStart = tempEnd;
    }

    // Build each batch prompt
    for (let b = 0; b < batches.length; b++) {
        const batch = batches[b];
        const batchIdeas = ideaLines.slice(batch.start, batch.end);

        let batchInfo;
        if (b === 0) {
            batchInfo = `This is BATCH ${b + 1} of ${batches.length}. Below are ideas ${batch.start} through ${batch.end - 1} (out of ${ideas.length} total). Group these ideas into ${themeInstruction.text}.`;
        } else {
            batchInfo = `This is BATCH ${b + 1} of ${batches.length}. Below are ideas ${batch.start} through ${batch.end - 1} (out of ${ideas.length} total).

IMPORTANT: You are continuing from a previous batch. Assign each idea below to one of the themes you created in your previous response, OR create new themes if these ideas don't fit existing ones. Use the same JSON format.`;
        }

        const header = buildPromptHeader(themeInstruction, ideas.length, batchInfo);
        prompts.push(header + '\n\nIDEAS:\n' + batchIdeas.join('\n'));
    }

    return prompts;
}

// Open the BYOAI modal wizard
async function openBYOAIModal() {
    if (!AppState.currentProject) {
        showToast('Please select a project first', 'error');
        return;
    }

    const loadedIdeas = await loadIdeasForCoding();
    if (!loadedIdeas || loadedIdeas.length === 0) {
        showToast('No ideas available. Please complete Idea Generation first.', 'error');
        return;
    }
    if (codingEngine) codingEngine.ideas = loadedIdeas;

    // Generate prompts (may be split into batches)
    byoaiPrompts = generateBYOAIPrompts();
    if (byoaiPrompts.length === 0) return;

    byoaiCurrentPrompt = 0;
    byoaiBatchResponses = [];

    // Display first prompt
    updateBYOAIPromptDisplay();

    document.getElementById('byoai-response-text').value = '';
    document.getElementById('byoai-validation-msg').innerHTML = '';
    showBYOAIStep(1);
    document.getElementById('byoai-modal').style.display = 'flex';

    // Update Step 3 batch UI
    updateBYOAIBatchUI();
}

// Update the prompt display and navigation
function updateBYOAIPromptDisplay() {
    const textarea = document.getElementById('byoai-prompt-text');
    const nav = document.getElementById('byoai-prompt-nav');
    const pageLabel = document.getElementById('byoai-prompt-page');
    const prevBtn = document.getElementById('byoai-prompt-prev');
    const nextBtn = document.getElementById('byoai-prompt-next');

    textarea.value = byoaiPrompts[byoaiCurrentPrompt];

    if (byoaiPrompts.length > 1) {
        nav.style.display = 'flex';
        pageLabel.textContent = `Prompt ${byoaiCurrentPrompt + 1} of ${byoaiPrompts.length}`;
        prevBtn.disabled = byoaiCurrentPrompt === 0;
        nextBtn.disabled = byoaiCurrentPrompt === byoaiPrompts.length - 1;
    } else {
        nav.style.display = 'none';
    }
}

// Navigate between prompts
function navigateBYOAIPrompt(direction) {
    const newIndex = byoaiCurrentPrompt + direction;
    if (newIndex >= 0 && newIndex < byoaiPrompts.length) {
        byoaiCurrentPrompt = newIndex;
        updateBYOAIPromptDisplay();
    }
}

// Update Step 3 batch progress UI
function updateBYOAIBatchUI() {
    const batchProgress = document.getElementById('byoai-batch-progress');
    const step3Label = document.getElementById('byoai-step3-label');
    const processBtn = document.getElementById('byoai-process-btn');

    if (byoaiPrompts.length > 1) {
        const currentBatch = byoaiBatchResponses.length + 1;
        batchProgress.style.display = 'block';
        document.getElementById('byoai-current-batch').textContent = currentBatch;
        document.getElementById('byoai-total-batches').textContent = byoaiPrompts.length;
        step3Label.innerHTML = `<strong>Step 3:</strong> Paste the response for <strong>Prompt ${currentBatch}</strong> below.`;

        if (currentBatch < byoaiPrompts.length) {
            processBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Save & Continue to Next Batch';
        } else {
            processBtn.innerHTML = '<i class="fas fa-check"></i> Process All Responses';
        }
    } else {
        batchProgress.style.display = 'none';
        step3Label.innerHTML = '<strong>Step 3:</strong> Paste the AI\'s complete response below.';
        processBtn.innerHTML = '<i class="fas fa-check"></i> Process Response';
    }
}

// Navigate BYOAI wizard steps
function showBYOAIStep(step) {
    document.querySelectorAll('.byoai-step').forEach(el => el.style.display = 'none');
    document.getElementById('byoai-step-' + step).style.display = 'block';
    document.querySelectorAll('.byoai-step-indicator').forEach((el, i) => {
        if (i < step) {
            el.style.background = 'var(--forest-green)';
            el.style.color = 'white';
        } else {
            el.style.background = '#e0e0e0';
            el.style.color = '#666';
        }
    });
}

// Copy current prompt to clipboard
function copyBYOAIPrompt() {
    const text = document.getElementById('byoai-prompt-text').value;
    navigator.clipboard.writeText(text).then(() => {
        const label = byoaiPrompts.length > 1 ? `Prompt ${byoaiCurrentPrompt + 1} copied` : 'Prompt copied to clipboard';
        showToast(label, 'success');
        const btn = document.getElementById('byoai-copy-btn');
        btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => { btn.innerHTML = '<i class="fas fa-copy"></i> Copy to Clipboard'; }, 2000);
    });
}

// Parse and validate BYOAI response
function parseBYOAIResponse(text) {
    let parsed;

    try {
        parsed = JSON.parse(text);
    } catch (e) {
        const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) {
            try { parsed = JSON.parse(fenceMatch[1].trim()); } catch (e2) { /* continue */ }
        }
        if (!parsed) {
            const braceMatch = text.match(/\{[\s\S]*\}/);
            if (braceMatch) {
                try { parsed = JSON.parse(braceMatch[0]); } catch (e3) { /* continue */ }
            }
        }
    }

    if (!parsed) {
        return { success: false, error: 'Could not find valid JSON in the response. Make sure your AI returned the exact JSON format requested.' };
    }

    if (!parsed.themes || !Array.isArray(parsed.themes) || parsed.themes.length === 0) {
        return { success: false, error: 'Response is missing the "themes" array. Make sure your AI followed the format instructions.' };
    }

    for (let i = 0; i < parsed.themes.length; i++) {
        const t = parsed.themes[i];
        if (!t.name) return { success: false, error: `Theme ${i + 1} is missing a "name" field.` };
        if (!Array.isArray(t.ideaIndices)) return { success: false, error: `Theme "${t.name}" is missing the "ideaIndices" array.` };
    }

    return { success: true, data: parsed };
}

// Merge themes from multiple batch responses
function mergeBatchThemes(batchResults) {
    const mergedThemeMap = {};

    for (const batch of batchResults) {
        for (const theme of batch.themes) {
            const key = theme.name.toLowerCase().trim();
            if (mergedThemeMap[key]) {
                // Merge idea indices into existing theme
                mergedThemeMap[key].ideaIndices.push(...theme.ideaIndices);
                if (theme.description && !mergedThemeMap[key].description) {
                    mergedThemeMap[key].description = theme.description;
                }
            } else {
                mergedThemeMap[key] = {
                    name: theme.name,
                    description: theme.description || '',
                    ideaIndices: [...theme.ideaIndices]
                };
            }
        }
    }

    // Convert to array, sort by idea count (largest first)
    const merged = Object.values(mergedThemeMap);
    merged.sort((a, b) => b.ideaIndices.length - a.ideaIndices.length);
    return { themes: merged };
}

// Process the pasted BYOAI response
async function processBYOAIResponse() {
    const text = document.getElementById('byoai-response-text').value.trim();
    const msgEl = document.getElementById('byoai-validation-msg');

    if (!text) {
        msgEl.innerHTML = '<p style="color:#e74c3c;">Please paste the AI response first.</p>';
        return;
    }

    const result = parseBYOAIResponse(text);
    if (!result.success) {
        msgEl.innerHTML = `<p style="color:#e74c3c;"><i class="fas fa-exclamation-circle"></i> ${result.error}</p>`;
        return;
    }

    // Multi-batch: collect this response and check if more batches remain
    if (byoaiPrompts.length > 1) {
        byoaiBatchResponses.push(result.data);

        if (byoaiBatchResponses.length < byoaiPrompts.length) {
            // More batches to go — show success, clear textarea, advance to next prompt
            const currentBatch = byoaiBatchResponses.length;
            msgEl.innerHTML = `<p style="color:#27ae60;"><i class="fas fa-check-circle"></i> Batch ${currentBatch} processed (${result.data.themes.length} themes found). Now paste the response for Prompt ${currentBatch + 1}.</p>`;

            // Advance prompt view to next batch
            byoaiCurrentPrompt = currentBatch;
            updateBYOAIPromptDisplay();

            // Clear response textarea for next batch
            document.getElementById('byoai-response-text').value = '';
            updateBYOAIBatchUI();

            // Quick flash — go back to Step 1 to copy next prompt
            setTimeout(() => {
                showBYOAIStep(1);
                showToast(`Batch ${currentBatch} saved. Copy Prompt ${currentBatch + 1} and repeat.`, 'info');
            }, 1000);
            return;
        }

        // All batches collected — merge themes
        const mergedData = mergeBatchThemes(byoaiBatchResponses);
        result.data = mergedData;
    }

    // Final processing (single prompt or merged multi-batch)
    const ideas = byoaiIdeas.length > 0 ? byoaiIdeas : (codingEngine ? codingEngine.ideas : await loadIdeasForCoding());
    if (!ideas || ideas.length === 0) {
        msgEl.innerHTML = '<p style="color:#e74c3c;">No ideas loaded. Please go back and reload.</p>';
        return;
    }

    // Track unassigned ideas (show transparently, don't force into a theme)
    const allIndices = new Set();
    result.data.themes.forEach(t => t.ideaIndices.forEach(i => allIndices.add(i)));
    const unassignedIndices = [];
    for (let i = 0; i < ideas.length; i++) {
        if (!allIndices.has(i)) unassignedIndices.push(i);
    }
    const unassignedIdeasList = unassignedIndices.map(i => ideas[i]);

    await clearOldThemesForProject();
    generatedThemes = transformAIThemesToSchema(result.data.themes, ideas);
    displayThemes(generatedThemes);
    displayUnassignedIdeas(unassignedIdeasList, ideas);
    await saveThemesAsDraft();

    // Generate and display local analysis summary for BYOAI
    const assignedCount = ideas.length - unassignedIdeasList.length;
    const localSummary = generateLocalSummary(generatedThemes, assignedCount);
    displayAnalysisSummary(localSummary);

    const proceedBtn = document.getElementById('proceed-voting-btn');
    if (proceedBtn) proceedBtn.disabled = false;

    let warnings = '';
    if (unassignedIdeasList.length > 0) {
        warnings = `<p style="color:#f39c12;"><i class="fas fa-exclamation-triangle"></i> ${unassignedIdeasList.length} idea(s) were not categorized. See details below the themes list.</p>`;
    }
    msgEl.innerHTML = `${warnings}<p style="color:#27ae60;"><i class="fas fa-check-circle"></i> Successfully generated ${generatedThemes.length} themes from ${ideas.length} ideas!</p>`;

    setTimeout(() => {
        closeBYOAIModal();
        showToast(`Generated ${generatedThemes.length} themes`, 'success');
    }, 1500);
}

function closeBYOAIModal() {
    document.getElementById('byoai-modal').style.display = 'none';
    byoaiBatchResponses = [];
    byoaiPrompts = [];
}

// Display the AI analysis summary bubble
function displayAnalysisSummary(summaryText) {
    const container = document.getElementById('ai-analysis-summary');
    const textEl = document.getElementById('ai-analysis-text');
    if (!container || !textEl) return;

    if (summaryText && summaryText.trim()) {
        textEl.textContent = summaryText;
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
    }
}

// Display unassigned ideas section with transparency
function displayUnassignedIdeas(unassignedIdeas, allIdeas) {
    const section = document.getElementById('unassigned-ideas-section');
    const explanation = document.getElementById('unassigned-ideas-explanation');
    const list = document.getElementById('unassigned-ideas-list');
    if (!section || !explanation || !list) return;

    if (!unassignedIdeas || unassignedIdeas.length === 0) {
        section.style.display = 'none';
        return;
    }

    const total = allIdeas.length;
    const assignedCount = total - unassignedIdeas.length;
    const pct = Math.round((assignedCount / total) * 100);

    explanation.textContent = `${assignedCount} of ${total} ideas (${pct}%) were categorized into themes above. The following ${unassignedIdeas.length} idea(s) could not be confidently grouped into any theme — they may be unique perspectives, outliers, or ideas that span multiple categories. This is normal in qualitative analysis and reflects the diversity of participant input. You can manually assign them by adding a custom theme or expanding an existing theme.`;

    list.innerHTML = unassignedIdeas.map(idea => `
        <div style="padding: 0.5rem 0.75rem; background: white; border-left: 3px solid #e8a838; border-radius: 0.25rem; margin-bottom: 0.4rem; font-size: 0.85rem; line-height: 1.4; color: #333;">
            ${idea.idea_text}
        </div>
    `).join('');

    section.style.display = 'block';
}

// Generate a client-side summary for BYOAI (no API call needed)
function generateLocalSummary(themes, totalIdeas) {
    if (!themes || themes.length === 0) return '';

    const sorted = [...themes].sort((a, b) => (b.ideaCount || b.ideaIndices?.length || 0) - (a.ideaCount || a.ideaIndices?.length || 0));
    const top3 = sorted.slice(0, 3).map(t => `"${t.name}"`);
    const topCount = sorted.slice(0, 3).reduce((sum, t) => sum + (t.ideaCount || t.ideaIndices?.length || 0), 0);
    const topPct = Math.round((topCount / totalIdeas) * 100);

    const triggerQ = AppState.currentProject?.trigger_question || 'the research question';
    const contextS = AppState.currentProject?.context_statement || '';

    return `All ${totalIdeas} participant ideas have been systematically analyzed and organized into ${themes.length} distinct themes, ensuring 100% coverage of the data. The strongest areas of consensus center around ${top3.join(', ')}, which together account for ${topPct}% of all responses. ${contextS ? `In the context of ${contextS}, t` : 'T'}hese themes suggest participants see a multifaceted path forward — from structural and policy changes to cultural and interpersonal improvements. You can review, rename, reorder, or add custom themes below before proceeding to voting.`;
}

// Display themes in UI with drag-and-drop
function displayThemes(themes) {
    const container = document.getElementById('themes-list');
    
    if (!themes || themes.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-gray);">
                <i class="fas fa-info-circle" style="font-size: 2.5rem; margin-bottom: 0.75rem; opacity: 0.3;"></i>
                <p style="margin: 0;">No themes generated yet.</p>
            </div>
        `;
        return;
    }

    // Update count
    document.getElementById('theme-count-display').textContent = `(${themes.length} themes)`;

    // Generate HTML - SIMPLE COMPACT LAYOUT like ISM page
    container.innerHTML = themes.map((theme, index) => `
        <div class="theme-card" 
             draggable="true"
             ondragstart="handleDragStart(event, ${index})"
             ondragover="handleDragOver(event)"
             ondrop="handleDrop(event, ${index})"
             ondragend="handleDragEnd(event)"
             data-theme-id="${theme.id}"
             id="theme-${index}">
            
            <div class="theme-header" style="display: flex; align-items: center; padding: 0.75rem 1rem; gap: 1rem;">
                <!-- Factor Number (like ISM page) -->
                <div style="min-width: 45px; text-align: center;">
                    <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #0B2B26 0%, #1a4d45 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1rem; box-shadow: 0 2px 6px rgba(11, 43, 38, 0.2);">
                        ${index + 1}
                    </div>
                </div>
                
                <!-- Factor Name and Description -->
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                        <h4 style="margin: 0; color: #0B2B26; font-size: 1rem; font-weight: 600; cursor: pointer;" onclick="toggleThemeEdit(${index})" id="theme-title-${index}">
                            ${theme.name}
                        </h4>
                        <span style="color: #666; font-size: 0.8rem;">(${theme.ideaCount} ideas)</span>
                    </div>
                    
                    <!-- Edit mode -->
                    <div style="display: none;" id="theme-edit-${index}">
                        <input type="text" 
                               style="width: 100%; padding: 0.4rem; border: 1px solid #0B2B26; border-radius: 0.25rem; font-size: 0.95rem;"
                               value="${theme.name}" 
                               id="theme-name-input-${index}"
                               onkeypress="if(event.key==='Enter') saveThemeName(${index})"
                               onblur="saveThemeName(${index})">
                    </div>
                    
                    <div id="theme-description-display-${index}" style="margin-top: 0.5rem;">
                        ${theme.description ? `
                            <div style="color: #666; font-size: 0.85rem; line-height: 1.3; font-style: italic;">
                                ${theme.description}
                            </div>
                            <button onclick="editThemeDescription(${index})" style="margin-top: 0.35rem; padding: 0.3rem 0.6rem; background: none; border: 1px solid #0B2B26; color: #0B2B26; border-radius: 0.25rem; cursor: pointer; font-size: 0.75rem; transition: all 0.2s;" onmouseover="this.style.background='#0B2B26'; this.style.color='white';" onmouseout="this.style.background='none'; this.style.color='#0B2B26';">
                                <i class="fas fa-edit"></i> Edit Description
                            </button>
                        ` : `
                            <button onclick="editThemeDescription(${index})" style="padding: 0.4rem 0.8rem; background: #0B2B26; color: white; border: none; border-radius: 0.25rem; cursor: pointer; font-size: 0.8rem; font-weight: 600; transition: all 0.2s;" onmouseover="this.style.background='#164039';" onmouseout="this.style.background='#0B2B26';">
                                <i class="fas fa-plus-circle"></i> Add Description
                            </button>
                        `}
                    </div>
                </div>
                
                <!-- Actions (right side) -->
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <button id="toggle-btn-${index}" onclick="toggleThemeDetails(${index})" style="background: none; border: none; color: #0B2B26; cursor: pointer; padding: 0.4rem 0.75rem; font-size: 0.85rem; font-weight: 600; transition: color 0.2s;">
                        <i class="fas fa-chevron-down"></i> Show Details
                    </button>
                    <button onclick="toggleThemeEdit(${index})" title="Edit" style="background: none; border: none; color: #666; cursor: pointer; padding: 0.4rem; font-size: 1rem; transition: color 0.2s;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteTheme(${index})" title="Delete" style="background: none; border: none; color: #0B2B26; cursor: pointer; padding: 0.4rem; font-size: 1rem; transition: color 0.2s;">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                    <i class="fas fa-grip-vertical" style="color: #999; font-size: 1rem; cursor: grab;" title="Drag to reorder"></i>
                </div>
            </div>
            
            <!-- Details Panel (collapsed by default) -->
            <div style="display: none; padding: 1rem; border-top: 1px solid #e0e0e0; background: #f8f9fa;" id="theme-details-${index}">
                <div style="margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 2px solid #0B2B26;">
                    <h4 style="margin: 0; color: #0B2B26; font-size: 1.1rem; font-weight: 700;">${theme.name}</h4>
                    <div style="color: #666; font-size: 0.8rem; margin-top: 0.25rem;">${theme.ideaCount} ideas \u2022 ${theme.codeCount} codes</div>
                </div>
                <div style="margin-bottom: 1rem;">
                    <strong style="display: block; margin-bottom: 0.5rem; color: #0B2B26; font-size: 0.9rem;">Key Codes:</strong>
                    <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                        ${theme.codes.map(code => `<span style="padding: 0.25rem 0.6rem; background: #FAF3DD; border: 1px solid #ddd; border-radius: 0.25rem; font-size: 0.8rem; color: #0B2B26;">${code}</span>`).join('')}
                    </div>
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <strong style="display: block; margin-bottom: 0.5rem; color: #0B2B26; font-size: 0.9rem;">Related Ideas (${theme.ideaCount}):</strong>
                    <div style="max-height: 200px; overflow-y: auto;">
                        ${getIdeasForTheme(theme.ideaIds).map(idea => `
                            <div style="padding: 0.5rem; background: white; border-left: 3px solid #0B2B26; border-radius: 0.25rem; margin-bottom: 0.4rem; font-size: 0.85rem; line-height: 1.4;">
                                ${idea.idea_text}
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div style="background: #FFF8DC; padding: 1rem; border-radius: 0.5rem; border: 2px solid #0B2B26;">
                    <label style="display: block; margin-bottom: 0.5rem; color: #0B2B26; font-size: 1rem; font-weight: 700;">
                        <i class="fas fa-edit"></i> Theme Description
                    </label>
                    <p style="font-size: 0.8rem; color: #666; margin-bottom: 0.75rem; line-height: 1.4;">
                        Add a conceptual definition for this theme based on the codes and ideas. Describe what this theme represents in your organizational context.
                    </p>
                    <textarea id="theme-desc-${index}" 
                              style="width: 100%; padding: 0.75rem; border: 2px solid #0B2B26; border-radius: 0.25rem; font-size: 0.9rem; min-height: 100px; font-family: inherit; line-height: 1.5;"
                              placeholder="Enter a conceptual description for this theme...&#10;&#10;Example: The ability to share and interpret messages in a clear and concise manner, facilitating understanding and meaningful exchange of information.">${theme.description || ''}</textarea>
                    <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                        <button onclick="saveThemeDescription(${index})" style="padding: 0.5rem 1rem; background: #0B2B26; color: #FAF3DD; border: none; border-radius: 0.25rem; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: all 0.2s;" onmouseover="this.style.background='#FAF3DD'; this.style.color='#0B2B26';" onmouseout="this.style.background='#0B2B26'; this.style.color='#FAF3DD';">
                            <i class="fas fa-save"></i> Save Description
                        </button>
                        <button onclick="document.getElementById('theme-desc-${index}').value = ''; saveThemeDescription(${index});" style="padding: 0.5rem 1rem; background: #0B2B26; color: #FAF3DD; border: none; border-radius: 0.25rem; cursor: pointer; font-size: 0.85rem; transition: all 0.2s;" onmouseover="this.style.background='#FAF3DD'; this.style.color='#0B2B26';" onmouseout="this.style.background='#0B2B26'; this.style.color='#FAF3DD';">
                            <i class="fas fa-times"></i> Clear
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Get ideas for a theme
function getIdeasForTheme(ideaIds) {
    if (!codingEngine || !codingEngine.ideas) return [];
    
    // Safety check: ensure ideaIds is an array
    if (!ideaIds) return [];
    
    // Convert to array if it's a Set or object
    let ideaIdsArray;
    if (Array.isArray(ideaIds)) {
        ideaIdsArray = ideaIds;
    } else if (ideaIds instanceof Set) {
        ideaIdsArray = Array.from(ideaIds);
    } else if (typeof ideaIds === 'object') {
        // If it's an object (from JSON.parse of a Set), get values
        ideaIdsArray = Object.values(ideaIds);
    } else {
        return [];
    }
    
    return codingEngine.ideas.filter(idea => ideaIdsArray.includes(idea.id));
}

// Toggle theme details
function toggleThemeDetails(index) {
    const details = document.getElementById(`theme-details-${index}`);
    const btn = document.getElementById(`toggle-btn-${index}`);
    const themeName = document.getElementById(`theme-title-${index}`);
    const themeDescription = document.getElementById(`theme-description-display-${index}`);
    
    if (details.style.display === 'none' || !details.style.display) {
        details.style.display = 'block';
        btn.innerHTML = `<i class="fas fa-chevron-up"></i> Hide Details`;
        // Show theme name in details panel header, hide from collapsed view
        themeName.style.display = 'none';
        themeDescription.style.display = 'none';
    } else {
        details.style.display = 'none';
        btn.innerHTML = '<i class="fas fa-chevron-down"></i> Show Details';
        // Restore theme name and description to collapsed view
        themeName.style.display = '';
        themeDescription.style.display = '';
    }
}

// Toggle theme edit mode
function toggleThemeEdit(index) {
    const titleDisplay = document.getElementById(`theme-title-${index}`);
    const titleEdit = document.getElementById(`theme-edit-${index}`);
    
    if (titleDisplay.style.display === 'none') {
        titleDisplay.style.display = '';
        titleEdit.style.display = 'none';
    } else {
        titleDisplay.style.display = 'none';
        titleEdit.style.display = 'block';
        // Focus input
        setTimeout(() => document.getElementById(`theme-name-input-${index}`).focus(), 10);
    }
}

// Save theme name
function saveThemeName(index) {
    const input = document.getElementById(`theme-name-input-${index}`);
    const newName = input.value.trim();
    
    if (!newName) {
        showToast('Theme name cannot be empty', 'error');
        return;
    }

    // Update theme
    generatedThemes[index].name = newName;
    
    // Update display
    document.getElementById(`theme-title-${index}`).textContent = newName;
    cancelThemeEdit(index);
    
    showToast('Theme name updated', 'success');
}

// Cancel theme edit (with auto-save)
async function cancelThemeEdit(index) {
    const titleDisplay = document.getElementById(`theme-title-${index}`);
    const titleEdit = document.getElementById(`theme-edit-${index}`);
    
    // Auto-save before closing
    await autoSaveThemes();
    
    titleDisplay.style.display = '';
    titleEdit.style.display = 'none';
}

// Auto-save themes in background (no toast notification)
async function autoSaveThemes() {
    try {
        await saveThemesAsDraft();
        console.log('✅ Themes auto-saved');
    } catch (error) {
        console.error('❌ Auto-save failed:', error);
    }
}

// Open description editor (opens details panel and focuses on textarea)
function editThemeDescription(index) {
    // Expand the details panel if collapsed
    const details = document.getElementById(`theme-details-${index}`);
    const btn = document.getElementById(`toggle-btn-${index}`);
    const themeName = document.getElementById(`theme-title-${index}`);
    const themeDescription = document.getElementById(`theme-description-display-${index}`);
    
    if (details.style.display === 'none' || !details.style.display) {
        details.style.display = 'block';
        btn.innerHTML = `<i class="fas fa-chevron-up"></i> Hide Details`;
        themeName.style.display = 'none';
        themeDescription.style.display = 'none';
    }
    
    // Focus on the textarea
    setTimeout(() => {
        const textarea = document.getElementById(`theme-desc-${index}`);
        if (textarea) {
            textarea.focus();
            textarea.select();
        }
    }, 100);
}

// Save theme description (with auto-save to database)
async function saveThemeDescription(index) {
    const textarea = document.getElementById(`theme-desc-${index}`);
    const newDescription = textarea.value.trim();
    generatedThemes[index].description = newDescription;
    
    // Re-render the themes to update the display (including Add/Edit button)
    displayThemes(generatedThemes);
    
    // Auto-save to database
    await autoSaveThemes();
    
    showToast('Description saved', 'success');
}

// Drag and drop handlers
function handleDragStart(event, index) {
    draggedThemeIndex = index;
    event.currentTarget.style.opacity = '0.4';
}

function handleDragOver(event) {
    event.preventDefault();
    return false;
}

function handleDrop(event, dropIndex) {
    event.stopPropagation();
    
    if (draggedThemeIndex === null || draggedThemeIndex === dropIndex) {
        return false;
    }

    // Reorder themes
    const draggedTheme = generatedThemes[draggedThemeIndex];
    generatedThemes.splice(draggedThemeIndex, 1);
    generatedThemes.splice(dropIndex, 0, draggedTheme);

    // Update ranks
    generatedThemes.forEach((theme, idx) => {
        theme.rank = idx + 1;
    });

    // Refresh display
    displayThemes(generatedThemes);
    autoSaveThemes();

    showToast('Theme reordered', 'success');
    return false;
}

function handleDragEnd(event) {
    event.currentTarget.style.opacity = '1';
    draggedThemeIndex = null;
}

// Delete theme
function deleteTheme(index) {
    if (!confirm(`Delete theme "${generatedThemes[index].name}"?`)) {
        return;
    }

    generatedThemes.splice(index, 1);
    
    // Update ranks
    generatedThemes.forEach((theme, idx) => {
        theme.rank = idx + 1;
    });

    displayThemes(generatedThemes);
    autoSaveThemes();
    showToast('Theme deleted', 'success');
}

// Add custom theme
function addCustomTheme() {
    const name = prompt('Enter theme name:');
    if (!name) return;

    const customTheme = {
        id: 'THEME-CUSTOM-' + Date.now(),
        name: name,
        processCode: name,
        descriptiveCode: name,
        description: 'Custom theme added manually',
        ideaCount: 0,
        ideaIds: [],
        frequency: 0,
        rank: generatedThemes.length + 1,
        codes: []
    };

    generatedThemes.push(customTheme);
    displayThemes(generatedThemes);
    autoSaveThemes();
    showToast('Custom theme added', 'success');
}

// Reset themes
function resetThemes() {
    if (!confirm('Reset all themes? This will clear the current theme list.')) {
        return;
    }

    generatedThemes = [];
    displayThemes([]);
    displayAnalysisSummary('');
    displayUnassignedIdeas([], []);
    const proceedBtn = document.getElementById('proceed-voting-btn');
    if (proceedBtn) proceedBtn.disabled = true;
    showToast('Themes reset', 'info');
}

// Expand/collapse all
function expandAllThemes() {
    generatedThemes.forEach((theme, index) => {
        const details = document.getElementById(`theme-details-${index}`);
        const btn = document.getElementById(`toggle-btn-${index}`);
        const themeName = document.getElementById(`theme-title-${index}`);
        const themeDescription = document.getElementById(`theme-description-display-${index}`);
        if (details && (details.style.display === 'none' || !details.style.display)) {
            details.style.display = 'block';
            if (btn) btn.innerHTML = '<i class="fas fa-chevron-up"></i> Hide Details';
            if (themeName) themeName.style.display = 'none';
            if (themeDescription) themeDescription.style.display = 'none';
        }
    });
}

function collapseAllThemes() {
    generatedThemes.forEach((theme, index) => {
        const details = document.getElementById(`theme-details-${index}`);
        const btn = document.getElementById(`toggle-btn-${index}`);
        const themeName = document.getElementById(`theme-title-${index}`);
        const themeDescription = document.getElementById(`theme-description-display-${index}`);
        if (details && details.style.display !== 'none') {
            details.style.display = 'none';
            if (btn) btn.innerHTML = '<i class="fas fa-chevron-down"></i> Show Details';
            if (themeName) themeName.style.display = '';
            if (themeDescription) themeDescription.style.display = '';
        }
    });
}

// Save themes (to database)
async function saveThemesAsDraft() {
    if (generatedThemes.length === 0) {
        showToast('No themes to save', 'warning');
        return;
    }

    try {
        // Reduced verbosity - only show summary
        
        // STEP 1: Delete all old themes for this project
        const existingThemesResp = await fetch('tables/coded_themes?limit=1000');
        const existingThemesData = await existingThemesResp.json();
        const existingThemes = (existingThemesData.data || []).filter(t => 
            String(t.project_id) === String(AppState.currentProject.id)
        );
        
        if (existingThemes.length > 0) {
            for (const theme of existingThemes) {
                await fetch(`tables/coded_themes/${theme.id}`, {
                    method: 'DELETE'
                });
            }
        }
        
        // STEP 2: Save new themes (in parallel for speed)
        console.log(`💾 Saving ${generatedThemes.length} new themes...`);
        const savePromises = generatedThemes.map(theme => {
            const themeData = {
                ...theme,
                project_id: AppState.currentProject.id,
                created_at: Date.now(),
                updated_at: Date.now()
            };

            return fetch('tables/coded_themes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(themeData)
            });
        });

        // Wait for ALL themes to be saved
        await Promise.all(savePromises);
        console.log(`✅ All ${generatedThemes.length} themes saved to database`);
        
        // Extra verification: confirm themes are in database
        const timestamp = Date.now();
        const verifyResp = await fetch(`tables/coded_themes?limit=1000&_t=${timestamp}`);
        const verifyData = await verifyResp.json();
        const savedThemes = (verifyData.data || []).filter(t => 
            String(t.project_id) === String(AppState.currentProject.id)
        );
        console.log(`✅ Verification: ${savedThemes.length} themes now in database for this project`);
        console.log(`🔍 Theme details:`, savedThemes.map(t => ({
            name: t.name,
            project_id: t.project_id,
            id: t.id
        })));

        console.log(`✅ Themes updated: ${generatedThemes.length} themes ready for voting`);
        showToast(`Saved ${generatedThemes.length} themes`, 'success');
    } catch (error) {
        console.error('❌ Error saving themes:', error);
        showToast('Error saving themes', 'error');
    }
}

// Proceed to voting
async function proceedToVoting() {
    if (generatedThemes.length === 0) {
        showToast('Please generate themes first', 'warning');
        return;
    }

    if (generatedThemes.length < 2) {
        showToast('Please generate at least 2 themes for voting', 'warning');
        return;
    }

    console.log('🚀 Proceeding to voting with', generatedThemes.length, 'themes');

    try {
        // CRITICAL: Ensure themes are saved to database before switching tabs
        showToast(`Saving ${generatedThemes.length} factors...`, 'info');
        
        console.log('💾 Ensuring themes are saved to database...');
        await saveThemesAsDraft();
        console.log('✅ Themes saved, ready to switch to voting');
        
        // Wait for database commit to complete
        console.log('⏳ Waiting for database to commit themes...');
        await new Promise(resolve => setTimeout(resolve, 1500)); // Increased to 1.5 seconds
        
        console.log('✅ Database commit should be complete');
        showToast(`Opening ISM tab with ${generatedThemes.length} factors...`, 'success');
        
        // Switch to voting tab - this will trigger initializeVotingPhase
        switchTab('voting');
        
        console.log('✅ Switched to voting tab');
        
    } catch (error) {
        console.error('❌ Error switching to voting:', error);
        showToast('Error opening ISM tab. Please try again.', 'error');
    }
}

// Clear all old themes from database for this project
async function clearOldThemes() {
    console.log('🔵 clearOldThemes() function called');
    
    if (!AppState.currentProject) {
        console.log('❌ No project selected');
        showToast('Please select a project first', 'warning');
        return;
    }

    console.log('✅ Current project:', AppState.currentProject.id, AppState.currentProject.title);

    const confirmed = confirm(
        '⚠️ This will DELETE all existing themes for this project from the database.\n\n' +
        'You will need to generate themes again.\n\n' +
        'Are you sure?'
    );

    if (!confirmed) {
        console.log('❌ User cancelled deletion');
        return;
    }

    console.log('✅ User confirmed deletion');

    try {
        console.log('🗑️ Starting deletion process for project:', AppState.currentProject.id);
        
        // Load existing themes
        console.log('📡 Fetching themes from database...');
        const existingThemesResp = await fetch('tables/coded_themes?limit=1000');
        const existingThemesData = await existingThemesResp.json();
        
        console.log('📊 Total themes in database:', existingThemesData.data?.length || 0);
        console.log('📊 Raw data:', existingThemesData);
        
        const existingThemes = (existingThemesData.data || []).filter(t => {
            const matches = String(t.project_id) === String(AppState.currentProject.id);
            console.log(`Theme "${t.name}" (project_id: ${t.project_id}) - ${matches ? '✅ MATCH' : '❌ skip'}`);
            return matches;
        });
        
        console.log(`🗑️ Found ${existingThemes.length} themes to delete for this project`);
        
        if (existingThemes.length === 0) {
            console.log('❌ No themes found for this project');
            showToast('No themes found to clear', 'info');
            alert('No themes found for this project in the database.');
            return;
        }
        
        // Delete each theme
        console.log('🗑️ Starting deletion of themes...');
        let deletedCount = 0;
        for (const theme of existingThemes) {
            console.log(`🗑️ Deleting theme: ${theme.name} (ID: ${theme.id})`);
            const deleteResp = await fetch(`tables/coded_themes/${theme.id}`, {
                method: 'DELETE'
            });
            console.log(`   Response: ${deleteResp.status} ${deleteResp.statusText}`);
            deletedCount++;
        }
        
        console.log(`✅ Successfully deleted ${deletedCount} themes from database`);
        
        // Clear the local generated themes array too
        console.log('🗑️ Clearing local theme array...');
        generatedThemes = [];
        displayThemes(generatedThemes);
        console.log('✅ Local theme array cleared');
        
        // Show prominent success message
        showToast(`✅ Successfully deleted ${deletedCount} old themes from database`, 'success');
        alert(`✅ SUCCESS!\n\nDeleted ${deletedCount} old themes from the database.\n\nYou can now generate fresh themes.`);
        
    } catch (error) {
        console.error('❌ Error clearing themes:', error);
        console.error('❌ Error stack:', error.stack);
        showToast('Error clearing themes', 'error');
        alert(`❌ ERROR!\n\n${error.message}\n\nCheck console (F12) for details.`);
    }
}

// Load themes into voting tab
function loadThemesInVoting() {
    const container = document.getElementById('voting-factors-display');
    const countEl = document.getElementById('factors-for-voting');

    if (!generatedThemes || generatedThemes.length === 0) {
        container.innerHTML = '<p style="color: var(--text-gray);">No themes available for voting.</p>';
        countEl.textContent = '0';
        return;
    }

    countEl.textContent = generatedThemes.length;

    const pairCount = generatedThemes.length * (generatedThemes.length - 1);

    container.innerHTML = `
        <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 1rem; border-radius: 0.375rem; margin-bottom: 2rem;">
            <strong>📊 Voting Overview:</strong><br>
            ${generatedThemes.length} factors = ${pairCount} pairwise comparison questions<br>
            Estimated time per participant: ${Math.ceil(pairCount * 8 / 60)} minutes
        </div>

        <div style="display: flex; gap: 1rem; margin-bottom: 2rem;">
            <button class="btn btn-primary" onclick="previewVotingTask()">
                <i class="fas fa-eye"></i> Preview Voting Task
            </button>
            <button class="btn btn-primary" onclick="sendVotingEmails()">
                <i class="fas fa-paper-plane"></i> Send Voting Emails
            </button>
            <button class="btn btn-outline" onclick="toggleReorderMode()">
                <i class="fas fa-sort"></i> Reorder Factors
            </button>
        </div>

        <div id="reorder-controls" style="display: none; background: var(--light-tan); padding: 1rem; border-radius: 0.375rem; margin-bottom: 1rem;">
            <p><strong>💡 Tip:</strong> Drag factors to reorder, or click the rank number to enter a new position.</p>
            <button class="btn btn-sm" onclick="saveFactorOrder()">
                <i class="fas fa-save"></i> Save Order
            </button>
            <button class="btn btn-sm btn-outline" onclick="cancelReorder()">
                Cancel
            </button>
        </div>

        <div class="factors-list-voting" id="factors-list-voting">
            ${generatedThemes.map((theme, index) => `
                <div class="factor-card-voting" 
                     draggable="true"
                     data-theme-id="${theme.id}"
                     data-index="${index}"
                     ondragstart="handleFactorDragStart(event, ${index})"
                     ondragover="handleFactorDragOver(event)"
                     ondrop="handleFactorDrop(event, ${index})"
                     ondragend="handleFactorDragEnd(event)">
                    <div class="factor-drag-handle">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <div class="factor-number-voting" onclick="promptRankChange(${index})" title="Click to change rank">
                        ${theme.rank}
                    </div>
                    <div class="factor-content-voting">
                        <h4>${theme.name}</h4>
                        <p>${theme.description || `Based on ${theme.ideaCount} participant ideas`}</p>
                        <span class="factor-meta">${theme.ideaCount} ideas</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Drag and drop handlers for voting factors
let draggedFactorIndex = null;

function handleFactorDragStart(event, index) {
    draggedFactorIndex = index;
    event.currentTarget.style.opacity = '0.4';
}

function handleFactorDragOver(event) {
    event.preventDefault();
    return false;
}

function handleFactorDrop(event, dropIndex) {
    event.stopPropagation();
    event.preventDefault();
    
    if (draggedFactorIndex === null || draggedFactorIndex === dropIndex) {
        return false;
    }

    // Reorder themes
    const draggedTheme = generatedThemes[draggedFactorIndex];
    generatedThemes.splice(draggedFactorIndex, 1);
    generatedThemes.splice(dropIndex, 0, draggedTheme);

    // Update ranks
    generatedThemes.forEach((theme, idx) => {
        theme.rank = idx + 1;
    });

    // Refresh display
    loadThemesInVoting();
    
    showToast('Factor reordered - remember to save order', 'info');
    return false;
}

function handleFactorDragEnd(event) {
    event.currentTarget.style.opacity = '1';
    draggedFactorIndex = null;
}

function toggleReorderMode() {
    const controls = document.getElementById('reorder-controls');
    const isVisible = controls.style.display !== 'none';
    controls.style.display = isVisible ? 'none' : 'block';
}

function promptRankChange(index) {
    const newRank = prompt(`Enter new rank for "${generatedThemes[index].name}" (1-${generatedThemes.length}):`, generatedThemes[index].rank);
    if (newRank) {
        const rank = parseInt(newRank);
        if (rank >= 1 && rank <= generatedThemes.length) {
            const theme = generatedThemes[index];
            generatedThemes.splice(index, 1);
            generatedThemes.splice(rank - 1, 0, theme);
            
            // Update ranks
            generatedThemes.forEach((t, idx) => {
                t.rank = idx + 1;
            });
            
            loadThemesInVoting();
            showToast('Rank updated - remember to save order', 'info');
        } else {
            showToast('Invalid rank number', 'error');
        }
    }
}

function saveFactorOrder() {
    showToast('Factor order saved', 'success');
    document.getElementById('reorder-controls').style.display = 'none';
}

function cancelReorder() {
    document.getElementById('reorder-controls').style.display = 'none';
}

// Clear old themes for current project
async function clearOldThemesForProject() {
    if (!AppState.currentProject) {
        console.log('⚠️ No project selected, skipping theme cleanup');
        return 0;
    }
    
    try {
        console.log('🗑️ STEP 1: Fetching existing themes from database...');
        const response = await fetch(`tables/coded_themes?limit=1000`);
        const data = await response.json();
        
        console.log(`📊 Total themes in database: ${data.data?.length || 0}`);
        
        const oldThemes = (data.data || []).filter(t => {
            const matches = String(t.project_id) === String(AppState.currentProject.id);
            if (matches) {
                console.log(`   - Found old theme: "${t.name}" (ID: ${t.id})`);
            }
            return matches;
        });
        
        console.log(`🗑️ STEP 2: Deleting ${oldThemes.length} old themes for project ${AppState.currentProject.id}...`);
        
        if (oldThemes.length === 0) {
            console.log('✅ No old themes to delete (clean slate)');
            return 0;
        }
        
        let deletedCount = 0;
        for (const theme of oldThemes) {
            console.log(`   🗑️ Deleting: "${theme.name}" (ID: ${theme.id})`);
            const deleteResponse = await fetch(`tables/coded_themes/${theme.id}`, {
                method: 'DELETE'
            });
            console.log(`      Response: ${deleteResponse.status} ${deleteResponse.statusText}`);
            deletedCount++;
        }
        
        console.log(`✅ CLEANUP COMPLETE: Deleted ${deletedCount} old themes`);
        return deletedCount;
    } catch (error) {
        console.error('❌ Error clearing old themes:', error);
        console.error('❌ Error stack:', error.stack);
        return 0;
    }
}

// Initialize when tab is loaded
document.addEventListener('DOMContentLoaded', () => {
    initCodingEngine();
});
