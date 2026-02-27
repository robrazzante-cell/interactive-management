// Network Analysis & Conflict Detection
// Analyzes weighted perceptions and organizational hierarchy conflicts

async function loadNetworkAnalysis() {
    if (!AppState.currentProject) {
        showToast('Please select a project first', 'error');
        return;
    }
    
    // Load all responses for this project
    const responses = await API.fetchStructuringResponses(AppState.currentProject.id);
    const participants = await API.fetchParticipants(AppState.currentProject.id);
    const ideas = await API.fetchIdeas(AppState.currentProject.id);
    
    // Build network data
    const networkData = buildNetworkData(responses, participants, ideas);
    
    // Detect conflicts
    const conflicts = detectPerceptionConflicts(networkData, participants);
    
    // Visualize
    visualizeNetwork(networkData);
    displayConflicts(conflicts);
    displayInsights(networkData, conflicts);
}

function buildNetworkData(responses, participants, ideas) {
    const network = {
        nodes: [],
        edges: [],
        perceptionMap: {}
    };
    
    // Create nodes from ideas
    ideas.forEach(idea => {
        network.nodes.push({
            id: idea.id,
            label: idea.idea_text.substring(0, 50) + '...',
            fullText: idea.idea_text
        });
    });
    
    // Build edges with weighted perceptions
    const edgeMap = {};
    
    responses.forEach(response => {
        const key = `${response.idea_a_id}-${response.idea_b_id}`;
        
        if (!edgeMap[key]) {
            edgeMap[key] = {
                from: response.idea_a_id,
                to: response.idea_b_id,
                weights: [],
                participants: [],
                avgWeight: 0
            };
        }
        
        edgeMap[key].weights.push(response.likert_score);
        edgeMap[key].participants.push({
            id: response.participant_id,
            score: response.likert_score
        });
    });
    
    // Calculate average weights and create edges
    Object.values(edgeMap).forEach(edge => {
        const sum = edge.weights.reduce((a, b) => a + b, 0);
        edge.avgWeight = sum / edge.weights.length;
        
        // Only include edges with avgWeight >= 3 (moderate or higher)
        if (edge.avgWeight >= 3) {
            network.edges.push({
                from: edge.from,
                to: edge.to,
                value: edge.avgWeight,
                title: `Average perception: ${edge.avgWeight.toFixed(2)}`,
                participants: edge.participants
            });
        }
    });
    
    return network;
}

function detectPerceptionConflicts(networkData, participants) {
    const conflicts = [];
    
    // Build manager-report map
    const hierarchyMap = {};
    participants.forEach(p => {
        if (p.manager_id) {
            if (!hierarchyMap[p.manager_id]) {
                hierarchyMap[p.manager_id] = [];
            }
            hierarchyMap[p.manager_id].push(p.id);
        }
    });
    
    // Check each edge for conflicts
    networkData.edges.forEach(edge => {
        const perceptions = edge.participants;
        
        // Find manager-report pairs in this edge
        perceptions.forEach(p1 => {
            perceptions.forEach(p2 => {
                // Check if p1 is manager of p2 or vice versa
                const isManagerReport = 
                    (hierarchyMap[p1.id] && hierarchyMap[p1.id].includes(p2.id)) ||
                    (hierarchyMap[p2.id] && hierarchyMap[p2.id].includes(p1.id));
                
                if (isManagerReport) {
                    const diff = Math.abs(p1.score - p2.score);
                    
                    // Flag conflicts with difference >= 2
                    if (diff >= 2) {
                        const manager = hierarchyMap[p1.id] ? p1 : p2;
                        const report = hierarchyMap[p1.id] ? p2 : p1;
                        
                        conflicts.push({
                            managerId: manager.id,
                            reportId: report.id,
                            edgeFrom: edge.from,
                            edgeTo: edge.to,
                            managerScore: manager.score,
                            reportScore: report.score,
                            difference: diff,
                            severity: diff >= 3 ? 'high' : 'medium'
                        });
                    }
                }
            });
        });
    });
    
    return conflicts;
}

function visualizeNetwork(networkData) {
    const container = document.getElementById('network-graph');
    if (!container) return;
    
    // Clear existing
    container.innerHTML = '';
    
    // Use vis-network for visualization
    const data = {
        nodes: new vis.DataSet(networkData.nodes),
        edges: new vis.DataSet(networkData.edges.map(e => ({
            ...e,
            arrows: 'to',
            color: getEdgeColor(e.value),
            width: e.value
        })))
    };
    
    const options = {
        nodes: {
            shape: 'box',
            margin: 10,
            widthConstraint: {
                maximum: 200
            },
            font: {
                size: 14
            },
            color: {
                border: '#0B2B26',
                background: '#F8F9FA',
                highlight: {
                    border: '#0B2B26',
                    background: '#FFF'
                }
            }
        },
        edges: {
            smooth: {
                type: 'cubicBezier'
            }
        },
        physics: {
            enabled: true,
            solver: 'hierarchicalRepulsion',
            hierarchicalRepulsion: {
                nodeDistance: 150
            }
        },
        layout: {
            hierarchical: {
                direction: 'LR',
                sortMethod: 'directed'
            }
        }
    };
    
    new vis.Network(container, data, options);
}

function getEdgeColor(weight) {
    // Color by weight strength
    if (weight >= 4.5) return '#0B2B26'; // Strong - green
    if (weight >= 4) return '#0B2B26'; // Considerable - gold
    if (weight >= 3.5) return '#0B2B26'; // Moderate+ - blue
    return '#6b7280'; // Moderate - gray
}

function displayConflicts(conflicts) {
    const container = document.getElementById('conflicts-list');
    if (!container) return;
    
    if (conflicts.length === 0) {
        container.innerHTML = '<p style="color: #0B2B26;"><i class="fas fa-check-circle"></i> No significant conflicts detected!</p>';
        return;
    }
    
    // Group by severity
    const highSeverity = conflicts.filter(c => c.severity === 'high');
    const mediumSeverity = conflicts.filter(c => c.severity === 'medium');
    
    let html = '';
    
    if (highSeverity.length > 0) {
        html += `<h4 style="color: #3E0505;"><i class="fas fa-exclamation-triangle"></i> High Priority Conflicts (${highSeverity.length})</h4>`;
        html += '<div class="conflict-items">';
        highSeverity.forEach(c => {
            html += renderConflictItem(c);
        });
        html += '</div>';
    }
    
    if (mediumSeverity.length > 0) {
        html += `<h4 style="color: #3E0505; margin-top: 1.5rem;"><i class="fas fa-exclamation-circle"></i> Medium Priority Conflicts (${mediumSeverity.length})</h4>`;
        html += '<div class="conflict-items">';
        mediumSeverity.forEach(c => {
            html += renderConflictItem(c);
        });
        html += '</div>';
    }
    
    container.innerHTML = html;
}

function renderConflictItem(conflict) {
    return `
        <div class="conflict-item" style="padding: 1rem; border-left: 4px solid ${conflict.severity === 'high' ? '#3E0505' : '#3E0505'}; background: #FAF3DD; margin-bottom: 0.75rem; border-radius: 0.5rem;">
            <p><strong>Manager-Report Perception Gap</strong></p>
            <p style="font-size: 0.875rem; color: #6b7280;">
                Manager rated: <strong>${conflict.managerScore}</strong> | 
                Report rated: <strong>${conflict.reportScore}</strong> | 
                Difference: <strong>${conflict.difference}</strong>
            </p>
            <p style="font-size: 0.875rem; margin-top: 0.5rem;">
                <i class="fas fa-lightbulb" style="color: #0B2B26;"></i> 
                <em>Recommendation: Consider one-on-one coaching to align perceptions</em>
            </p>
        </div>
    `;
}

function displayInsights(networkData, conflicts) {
    const container = document.getElementById('insights-content');
    if (!container) return;
    
    const totalEdges = networkData.edges.length;
    const strongEdges = networkData.edges.filter(e => e.value >= 4).length;
    const avgWeight = networkData.edges.length > 0 
        ? (networkData.edges.reduce((sum, e) => sum + e.value, 0) / networkData.edges.length).toFixed(2)
        : 0;
    
    const conflictRate = conflicts.length > 0 && totalEdges > 0
        ? ((conflicts.length / totalEdges) * 100).toFixed(1)
        : 0;
    
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
            <div style="padding: 1rem; background: #FAF3DD; border-radius: 0.5rem;">
                <h4 style="color: #0B2B26;">${totalEdges}</h4>
                <p style="font-size: 0.875rem; color: #6b7280;">Total Relationships</p>
            </div>
            <div style="padding: 1rem; background: #FAF3DD; border-radius: 0.5rem;">
                <h4 style="color: #0B2B26;">${strongEdges}</h4>
                <p style="font-size: 0.875rem; color: #6b7280;">Strong Influences (4+)</p>
            </div>
            <div style="padding: 1rem; background: #FAF3DD; border-radius: 0.5rem;">
                <h4 style="color: #0B2B26;">${avgWeight}</h4>
                <p style="font-size: 0.875rem; color: #6b7280;">Avg Perception Weight</p>
            </div>
            <div style="padding: 1rem; background: #FAF3DD; border-radius: 0.5rem;">
                <h4 style="color: ${conflictRate > 10 ? '#3E0505' : '#0B2B26'}">${conflictRate}%</h4>
                <p style="font-size: 0.875rem; color: #6b7280;">Conflict Rate</p>
            </div>
        </div>
        
        <div style="margin-top: 2rem; padding: 1.5rem; background: #FAF3DD; border-radius: 0.5rem; border-left: 4px solid #0B2B26;">
            <h4 style="color: #0B2B26; margin-bottom: 0.5rem;"><i class="fas fa-info-circle"></i> Key Insights</h4>
            <ul style="color: #0B2B26; line-height: 1.8;">
                <li>${totalEdges} significant relationships identified (perception ≥ 3.0)</li>
                <li>${strongEdges} relationships rated as strong or very strong (≥ 4.0)</li>
                <li>${conflicts.length} perception conflicts detected between managers and reports</li>
                ${conflictRate > 10 
                    ? '<li><strong>Action Recommended:</strong> High conflict rate suggests need for alignment workshops</li>'
                    : '<li><strong>Positive:</strong> Low conflict rate indicates good perception alignment</li>'
                }
            </ul>
        </div>
    `;
}

function refreshAnalysis() {
    loadNetworkAnalysis();
    showToast('Analysis refreshed', 'success');
}

async function exportAnalysis() {
    if (!AppState.currentProject) return;
    
    const responses = await API.fetchStructuringResponses(AppState.currentProject.id);
    const participants = await API.fetchParticipants(AppState.currentProject.id);
    const ideas = await API.fetchIdeas(AppState.currentProject.id);
    
    const networkData = buildNetworkData(responses, participants, ideas);
    const conflicts = detectPerceptionConflicts(networkData, participants);
    
    const report = {
        project: AppState.currentProject.title,
        date: new Date().toISOString(),
        network: networkData,
        conflicts: conflicts,
        summary: {
            totalRelationships: networkData.edges.length,
            totalConflicts: conflicts.length,
            avgWeight: networkData.edges.length > 0 
                ? networkData.edges.reduce((sum, e) => sum + e.value, 0) / networkData.edges.length
                : 0
        }
    };
    
    exportToJSON(report, `Network_Analysis_${AppState.currentProject.title}_${Date.now()}.json`);
    showToast('Analysis exported', 'success');
}