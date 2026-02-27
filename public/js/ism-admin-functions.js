/**
 * ISM Admin Functions
 * Functions for viewing individual structures and generating metastructures
 */

/**
 * Generate individual ISM structures for all participants who completed voting
 */
async function generateIndividualStructures() {
    console.log('🚀 Generating individual ISM structures...');
    
    try {
        const projectId = AppState.currentProject?.id;
        if (!projectId) {
            alert('Please select a project first');
            return;
        }
        
        // Load factors
        const themesResponse = await fetch(`tables/coded_themes?limit=1000`);
        const themesData = await themesResponse.json();
        const factors = themesData.data
            .filter(theme => theme.project_id === projectId)
            .sort((a, b) => (a.rank || 0) - (b.rank || 0));
        
        if (factors.length === 0) {
            alert('No factors found. Please complete the Coding & Factors phase first.');
            return;
        }
        
        // Load all voting responses
        console.log('📊 Loading voting responses from API...');
        const responsesData = await fetch(`tables/ism_votes?limit=10000`);
        
        if (!responsesData.ok) {
            console.error('❌ API Error:', responsesData.status, responsesData.statusText);
            if (responsesData.status === 422) {
                alert('No voting data available. Please ensure participants have completed voting first.');
                return;
            }
            throw new Error(`API Error: ${responsesData.status}`);
        }
        
        const allResponses = await responsesData.json();
        console.log('✅ API Response:', allResponses);
        
        // Validate response structure
        if (!allResponses || !allResponses.data || !Array.isArray(allResponses.data)) {
            console.error('❌ Invalid API response structure:', allResponses);
            alert('Invalid voting data format. Please contact support.');
            return;
        }
        
        console.log(`📦 Loaded ${allResponses.data.length} voting responses`);
        
        // Group by participant
        const participantResponses = {};
        allResponses.data.forEach(response => {
            if (response.project_id === projectId) {
                if (!participantResponses[response.participant_id]) {
                    participantResponses[response.participant_id] = [];
                }
                participantResponses[response.participant_id].push(response);
            }
        });
        
        const participantIds = Object.keys(participantResponses);
        console.log(`Found ${participantIds.length} participants with voting responses`);
        
        if (participantIds.length === 0) {
            alert('No voting responses found. Participants must complete voting first.');
            return;
        }
        
        // Generate structure for each participant
        let completed = 0;
        for (const participantId of participantIds) {
            const responses = participantResponses[participantId];
            
            // Check if they answered all questions
            const totalQuestions = factors.length * (factors.length - 1);
            if (responses.length < totalQuestions) {
                console.warn(`Participant ${participantId} incomplete: ${responses.length}/${totalQuestions} questions`);
                continue;
            }
            
            // Generate individual structure
            const ismStructure = new IndividualISMStructure(participantId, projectId);
            await ismStructure.generateIndividualStructure(responses, factors);
            completed++;
        }
        
        console.log(`✅ Generated ${completed} individual structures`);
        showToast(`Generated ${completed} individual structures successfully`, 'success');
        
        // Refresh display
        await viewIndividualStructures();
        
    } catch (error) {
        console.error('❌ Error generating individual structures:', error);
        showToast('Failed to generate individual structures', 'error');
    }
}

/**
 * View all individual ISM structures
 */
async function viewIndividualStructures() {
    console.log('📊 Loading individual ISM structures...');
    
    try {
        const projectId = AppState.currentProject?.id;
        if (!projectId) {
            alert('Please select a project first');
            return;
        }
        
        // Load individual structures
        const response = await fetch(`tables/individual_ism_structures?limit=1000`);
        const data = await response.json();
        
        const structures = data.data.filter(s => s.project_id === projectId);
        
        if (structures.length === 0) {
            // Try to generate them
            if (confirm('No individual structures found. Generate them now from voting responses?')) {
                await generateIndividualStructures();
                return;
            }
        }
        
        // Load participant names
        const participantsResponse = await fetch(`tables/participants?limit=1000`);
        const participantsData = await participantsResponse.json();
        const participantsMap = {};
        participantsData.data.forEach(p => {
            participantsMap[p.id] = p;
        });
        
        // Display structures
        const section = document.getElementById('individual-structures-section');
        const list = document.getElementById('individual-structures-list');
        
        let html = `
            <div style="margin-bottom: 1.5rem;">
                <strong>Total Individual Structures:</strong> ${structures.length}
            </div>
            <div style="display: grid; gap: 1rem;">
        `;
        
        structures.forEach(structure => {
            const participant = participantsMap[structure.participant_id];
            const participantName = participant ? participant.name : 'Unknown Participant';
            const structureData = structure.structure;
            
            html += `
                <div class="individual-structure-card" style="border: 1px solid #dee2e6; border-radius: 0.5rem; padding: 1.5rem; background: #f8f9fa;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <div>
                            <h4 style="margin: 0; color: #2c3e50;">${participantName}</h4>
                            <p style="margin: 0.25rem 0 0 0; color: #666; font-size: 0.875rem;">
                                ${structureData.levels.length} hierarchical levels, 
                                ${structureData.edges.length} direct relationships
                            </p>
                        </div>
                        <button class="btn btn-outline" onclick="displayIndividualStructure('${structure.participant_id}', '${structure.id}')">
                            <i class="fas fa-eye"></i> View Structure
                        </button>
                    </div>
                    
                    <div class="individual-structure-preview" id="structure-${structure.id}" style="display: none; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #dee2e6;">
                        <!-- Structure will be rendered here -->
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
        
        list.innerHTML = html;
        section.style.display = 'block';
        
        console.log(`✅ Displayed ${structures.length} individual structures`);
        
    } catch (error) {
        console.error('❌ Error loading individual structures:', error);
        showToast('Failed to load individual structures', 'error');
    }
}

/**
 * Display a specific participant's ISM structure
 */
async function displayIndividualStructure(participantId, structureId) {
    console.log(`📊 Displaying structure for participant ${participantId}`);
    
    try {
        // Load structure
        const response = await fetch(`tables/individual_ism_structures/${structureId}`);
        const structure = await response.json();
        
        const container = document.getElementById(`structure-${structureId}`);
        
        // Toggle visibility
        if (container.style.display === 'block') {
            container.style.display = 'none';
            return;
        }
        
        // Create visualization container
        container.innerHTML = `
            <div id="individual-flowchart-${structureId}" style="height: 500px; border: 1px solid #ddd; border-radius: 0.5rem; background: white;"></div>
            
            <div style="margin-top: 1rem; padding: 1rem; background: white; border-radius: 0.5rem; border: 1px solid #dee2e6;">
                <h5 style="margin: 0 0 0.5rem 0;">Influence Scores</h5>
                <table style="width: 100%; font-size: 0.875rem;">
                    <thead>
                        <tr style="border-bottom: 2px solid #dee2e6;">
                            <th style="padding: 0.5rem; text-align: left;">Factor</th>
                            <th style="padding: 0.5rem; text-align: center;">INF Score</th>
                            <th style="padding: 0.5rem; text-align: center;">SUP Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${structure.structure.influenceScores.map(score => `
                            <tr style="border-bottom: 1px solid #f1f1f1;">
                                <td style="padding: 0.5rem;">${score.factorName}</td>
                                <td style="padding: 0.5rem; text-align: center;">${score.influenceScore}</td>
                                <td style="padding: 0.5rem; text-align: center;">${score.supportScore}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        container.style.display = 'block';
        
        // Render flowchart
        renderIndividualFlowchart(structure.structure, `individual-flowchart-${structureId}`);
        
    } catch (error) {
        console.error('❌ Error displaying individual structure:', error);
        showToast('Failed to display structure', 'error');
    }
}

/**
 * Render individual flowchart
 */
function renderIndividualFlowchart(structuralModel, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Prepare nodes
    const nodes = new vis.DataSet(structuralModel.nodes.map(node => ({
        id: node.id,
        label: `${node.label}\n[INF: ${node.influenceScore}]`,
        title: `${node.description}\n\nInfluence Score: ${node.influenceScore}\nSupport Score: ${node.supportScore}\nLevel: ${node.level}`,
        level: node.level,
        color: {
            background: getNodeColor(node.level),
            border: '#2B7CE9'
        },
        font: { size: 12, color: '#ffffff' },
        shape: 'box',
        margin: 10
    })));
    
    // Prepare edges
    const edges = new vis.DataSet(structuralModel.edges.map(edge => ({
        from: edge.from,
        to: edge.to,
        arrows: 'to',
        color: {
            color: edge.isCycle ? '#e74c3c' : '#848484',
            highlight: edge.isCycle ? '#c0392b' : '#2B7CE9'
        },
        width: edge.isCycle ? 3 : 2,
        dashes: edge.isCycle ? [5, 5] : false
    })));
    
    const data = { nodes, edges };
    
    const options = {
        layout: {
            hierarchical: {
                enabled: true,
                direction: 'UD',
                sortMethod: 'directed',
                levelSeparation: 120,
                nodeSpacing: 150
            }
        },
        physics: { enabled: false },
        interaction: { hover: true, tooltipDelay: 200 }
    };
    
    new vis.Network(container, data, options);
}

/**
 * Generate metastructure from all individual structures
 */
async function generateMetastructure() {
    console.log('🚀 Generating metastructure...');
    
    try {
        const projectId = AppState.currentProject?.id;
        if (!projectId) {
            alert('Please select a project first');
            return;
        }
        
        // Create calculator
        const calculator = new MetastructureCalculator(projectId);
        
        // Load individual structures
        await calculator.loadIndividualStructures();
        
        if (calculator.individualStructures.length === 0) {
            if (confirm('No individual structures found. Generate them now from voting responses?')) {
                await generateIndividualStructures();
                // Retry after generation
                await calculator.loadIndividualStructures();
            } else {
                return;
            }
        }
        
        if (calculator.individualStructures.length < 2) {
            alert('At least 2 individual structures are needed to create a metastructure.');
            return;
        }
        
        // Calculate average influence scores
        calculator.calculateAverageInfluenceScores();
        
        // Generate metastructure
        const metastructure = calculator.generateMetastructure();
        
        // Save to database
        await calculator.saveMetastructure(metastructure);
        
        // Display
        displayMetastructure(metastructure);
        
        console.log('✅ Metastructure generated successfully');
        showToast(`Metastructure generated from ${metastructure.numParticipants} participants`, 'success');
        
    } catch (error) {
        console.error('❌ Error generating metastructure:', error);
        showToast('Failed to generate metastructure', 'error');
    }
}

/**
 * Display metastructure
 */
function displayMetastructure(metastructure) {
    const section = document.getElementById('metastructure-section');
    const display = document.getElementById('metastructure-display');
    
    let html = `
        <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 1.5rem;">
            <h4 style="margin: 0 0 1rem 0; color: #2c3e50;">
                <i class="fas fa-info-circle"></i> Metastructure Summary
            </h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                <div>
                    <strong>Participants:</strong> ${metastructure.numParticipants}
                </div>
                <div>
                    <strong>Theme Levels:</strong> ${metastructure.themes.length}
                </div>
                <div>
                    <strong>Total Factors:</strong> ${metastructure.averageInfluenceScores.length}
                </div>
            </div>
        </div>
        
        <div style="margin-top: 1.5rem;">
            <h4 style="margin: 0 0 1rem 0; color: #2c3e50;">Theme-Based Groupings</h4>
    `;
    
    metastructure.themes.forEach((theme, index) => {
        if (theme.factors.length === 0) return;
        
        html += `
            <div style="background: white; border: 1px solid #dee2e6; border-radius: 0.5rem; padding: 1.5rem; margin-bottom: 1rem;">
                <h5 style="margin: 0 0 1rem 0; color: #8B7355;">
                    ${theme.name} (${theme.factors.length} factors)
                </h5>
                <div style="display: grid; gap: 0.75rem;">
                    ${theme.factors.map(factor => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: #f8f9fa; border-radius: 0.25rem;">
                            <span style="font-weight: 500;">${factor.name}</span>
                            <div style="font-size: 0.875rem; color: #666;">
                                <span style="margin-right: 1rem;">AVG INF: ${factor.avgInf}</span>
                                <span>AVG SUP: ${factor.avgSup}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });
    
    html += `
        </div>
        
        <div style="margin-top: 1.5rem;">
            <h4 style="margin: 0 0 1rem 0; color: #2c3e50;">Average Influence Scores (All Factors)</h4>
            <table style="width: 100%; font-size: 0.875rem; background: white; border: 1px solid #dee2e6; border-radius: 0.5rem;">
                <thead>
                    <tr style="border-bottom: 2px solid #dee2e6; background: #f8f9fa;">
                        <th style="padding: 0.75rem; text-align: left;">Rank</th>
                        <th style="padding: 0.75rem; text-align: left;">Factor</th>
                        <th style="padding: 0.75rem; text-align: center;">Avg INF</th>
                        <th style="padding: 0.75rem; text-align: center;">Avg SUP</th>
                        <th style="padding: 0.75rem; text-align: center;">Participants</th>
                    </tr>
                </thead>
                <tbody>
                    ${metastructure.averageInfluenceScores.map((score, index) => `
                        <tr style="border-bottom: 1px solid #f1f1f1;">
                            <td style="padding: 0.75rem; font-weight: 600;">${index + 1}</td>
                            <td style="padding: 0.75rem;">${score.factorName}</td>
                            <td style="padding: 0.75rem; text-align: center;">${score.averageInfluenceScore.toFixed(2)}</td>
                            <td style="padding: 0.75rem; text-align: center;">${score.averageSupportScore.toFixed(2)}</td>
                            <td style="padding: 0.75rem; text-align: center;">${score.numParticipants}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    display.innerHTML = html;
    section.style.display = 'block';
    
    // Scroll to metastructure
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Helper function from voting-controller.js
function getNodeColor(level) {
    const colors = [
        '#e74c3c', '#e67e22', '#f39c12', '#27ae60', 
        '#3498db', '#9b59b6', '#34495e'
    ];
    return colors[Math.min(level - 1, colors.length - 1)];
}

// Export functions
window.generateIndividualStructures = generateIndividualStructures;
window.viewIndividualStructures = viewIndividualStructures;
window.displayIndividualStructure = displayIndividualStructure;
window.generateMetastructure = generateMetastructure;
window.displayMetastructure = displayMetastructure;
