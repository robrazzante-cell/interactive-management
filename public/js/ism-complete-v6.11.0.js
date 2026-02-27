/**
 * ============================================================================
 * ISM COMPLETE ALGORITHM - MATRIX TO FLOWCHART ENGINE
 * ============================================================================
 * 
 * Version: v6.11.0-CLASSIC-ISM-STYLE-STATIC
 * Build: 20251216-181500
 * Status: PRODUCTION READY - STATIC DISPLAY, ARROWS VISIBLE
 * 
 * This is the TESTED, WORKING algorithm from the guided-matrix-validator tool.
 * 
 * COMPLETE ISM PIPELINE:
 * - Step 1: Calculate Reachability Matrix (Boolean operations)
 * - Step 2: Find Strong Components (Cycles detection)
 * - Step 3: Calculate ISM Levels (Warfield's R∩A method)
 * - Step 4: Generate Skeleton Matrix (BFS transitive reduction)
 * - Step 5: Filter Isolated Nodes
 * - Step 6: Render SVG Flowchart (LEFT-TO-RIGHT with grouped cycles)
 * 
 * Based on:
 * - Warfield, J. N. (1973-1974) - ISM Methodology
 * - Settanni et al. (2022) - Modern ISM Analysis
 * - Graph Theory - Transitive Reduction
 * 
 * ============================================================================
 */

console.log('🚀 ISM Complete Algorithm v6.28.15-PUBLIC-SYNC - Build 20251218-280000');
console.log('🎯 POSITION 1 = RIGHTMOST + Position labels removed for cleaner UI');
console.log('✅ Features: 10×10 arrowheads, perfect tip alignment, no position numbers');

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create empty n×n matrix
 */
function createEmptyMatrix(n) {
    return Array(n).fill(0).map(() => Array(n).fill(0));
}

/**
 * Copy matrix
 */
function matrixCopy(M) {
    return M.map(row => [...row]);
}

/**
 * Check if two matrices are equal
 */
function matricesEqual(M1, M2) {
    const n = M1.length;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (M1[i][j] !== M2[i][j]) return false;
        }
    }
    return true;
}

/**
 * Boolean matrix multiplication: C = A × B
 * C[i][j] = OR over k of (A[i][k] AND B[k][j])
 */
function booleanMatrixMultiply(A, B) {
    const n = A.length;
    const C = createEmptyMatrix(n);
    
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            let sum = 0;
            for (let k = 0; k < n; k++) {
                sum = sum || (A[i][k] && B[k][j]);
            }
            C[i][j] = sum ? 1 : 0;
        }
    }
    
    return C;
}

// ============================================================================
// STEP 1: CALCULATE REACHABILITY MATRIX
// ============================================================================

/**
 * Calculate Reachability Matrix M = (I + G)^(n-1)
 * Uses Boolean matrix operations
 */
function calculateReachabilityMatrix(G) {
    console.log('📐 Step 1: Calculate Reachability Matrix');
    console.log('M = (I + G)^(n-1) using Boolean operations');
    
    const n = G.length;
    
    // DEBUG: Check input matrix
    let inputEdges = 0;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i !== j && G[i][j] === 1) inputEdges++;
        }
    }
    console.log(`🔍 DEBUG: Input matrix G has ${inputEdges} edges`);
    
    // B = I + G (add self-loops)
    const B = createEmptyMatrix(n);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            B[i][j] = (i === j) ? 1 : G[i][j];
        }
    }
    
    console.log('→ B = I + G computed (adds self-loops)');
    
    // Compute powers until convergence: M^p = M^(p+1)
    let M = matrixCopy(B);
    let prevM = null;
    let power = 1;
    
    while (power < n) {
        prevM = matrixCopy(M);
        M = booleanMatrixMultiply(M, B);
        
        if (matricesEqual(M, prevM)) {
            console.log(`→ Converged at power ${power}`);
            break;
        }
        
        power++;
    }
    
    // Count reachable pairs
    let reachableCount = 0;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (M[i][j] === 1) reachableCount++;
        }
    }
    
    const density = ((reachableCount / (n * n)) * 100).toFixed(1);
    console.log(`→ Reachability: ${reachableCount}/${n * n} pairs (${density}% density)`);
    
    // DEBUG: Check if input matrix G was mutated
    let afterEdges = 0;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i !== j && G[i][j] === 1) afterEdges++;
        }
    }
    console.log(`🔍 DEBUG: After Step 1, input matrix G still has ${afterEdges} edges`);
    
    return M;
}

// ============================================================================
// STEP 2: FIND STRONG COMPONENTS (CYCLES)
// ============================================================================

/**
 * Find strongly connected components (mutual influences)
 * Identifies factors that can reach each other (cycles)
 */
function findStrongComponents(M) {
    console.log('📐 Step 2: Find Strong Components (Cycles)');
    
    const n = M.length;
    const visited = new Array(n).fill(false);
    const components = [];
    
    for (let i = 0; i < n; i++) {
        if (visited[i]) continue;
        
        const component = [i];
        visited[i] = true;
        
        // Find all factors mutually reachable with i
        for (let j = i + 1; j < n; j++) {
            if (!visited[j] && M[i][j] === 1 && M[j][i] === 1) {
                component.push(j);
                visited[j] = true;
            }
        }
        
        // Log cycles
        if (component.length > 1) {
            const factorNames = component.map(idx => `${idx + 1}`).join(' ↔ ');
            console.log(`→ Cycle found: ${factorNames} (will be grouped)`);
        }
        
        components.push(component);
    }
    
    const cycleCount = components.filter(c => c.length > 1).length;
    console.log(`→ Total: ${components.length} components (${cycleCount} cycles)`);
    
    return components;
}

// ============================================================================
// STEP 3: CALCULATE ISM LEVELS
// ============================================================================

/**
 * Calculate ISM Levels using Warfield's algorithm
 * R(i) = reachability set, A(i) = antecedent set
 * S(i) = R(i) ∩ A(i)
 * TOP LEVEL: where R(i) = S(i)
 */
function calculateISMLevels(M, components) {
    console.log('📐 Step 3: Calculate ISM Levels (Warfield)');
    
    const n = M.length;
    const levels = [];
    const remaining = Array.from({length: n}, (_, i) => i);
    let levelNum = 0;
    
    while (remaining.length > 0) {
        const currentLevel = [];
        
        // For each remaining vertex
        for (const i of remaining) {
            // R(vi): Reachability set
            const R = [];
            for (const j of remaining) {
                if (M[i][j] === 1) R.push(j);
            }
            
            // A(vi): Antecedent set
            const A = [];
            for (const j of remaining) {
                if (M[j][i] === 1) A.push(j);
            }
            
            // S(vi): Intersection
            const S = R.filter(x => A.includes(x));
            
            // Check TOP LEVEL: R(i) = S(i)
            const isTopLevel = R.length === S.length && R.every(x => S.includes(x));
            
            if (isTopLevel) {
                currentLevel.push(i);
            }
        }
        
        // If no top level, check BOTTOM LEVEL
        if (currentLevel.length === 0) {
            for (const i of remaining) {
                const R = [];
                for (const j of remaining) {
                    if (M[i][j] === 1) R.push(j);
                }
                
                const A = [];
                for (const j of remaining) {
                    if (M[j][i] === 1) A.push(j);
                }
                
                const S = R.filter(x => A.includes(x));
                
                // Check BOTTOM LEVEL: A(i) = S(i)
                const isBottomLevel = A.length === S.length && A.every(x => S.includes(x));
                
                if (isBottomLevel) {
                    currentLevel.push(i);
                }
            }
        }
        
        // If still no level, all remaining are strongly connected
        if (currentLevel.length === 0) {
            console.log('⚠️ Strongly connected component detected');
            currentLevel.push(...remaining);
        }
        
        // Remove from remaining
        for (const vertex of currentLevel) {
            const idx = remaining.indexOf(vertex);
            if (idx > -1) remaining.splice(idx, 1);
        }
        
        levels.push(currentLevel);
        const names = currentLevel.map(idx => `${idx + 1}`).join(', ');
        console.log(`→ Level ${levelNum + 1}: Factors ${names}`);
        
        levelNum++;
        
        // Safety limit
        if (levelNum > n) {
            console.log('⚠️ Safety limit - breaking');
            break;
        }
    }
    
    console.log(`✅ ${levels.length} levels calculated`);
    return levels;
}

// ============================================================================
// STEP 4: GENERATE SKELETON MATRIX (BFS TRANSITIVE REDUCTION)
// ============================================================================

/**
 * Generate Skeleton Matrix using BFS-based transitive reduction
 * KEY INNOVATION: Remove edge i→j only if j still reachable without it
 */
function generateSkeletonMatrix(adjacency, reachability, levels) {
    console.log('📐 Step 4: Generate Skeleton Matrix (BFS Transitive Reduction)');
    
    const n = adjacency.length;
    
    // DEBUG: Show adjacency matrix BEFORE transitive reduction
    let inputEdges = 0;
    console.log('🔍 DEBUG: Adjacency Matrix (INPUT to skeleton):');
    for (let i = 0; i < n; i++) {
        const row = adjacency[i].map(val => val === 1 ? '1' : '0').join(' ');
        console.log(`   Factor ${i + 1}: [${row}]`);
        for (let j = 0; j < n; j++) {
            if (i !== j && adjacency[i][j] === 1) inputEdges++;
        }
    }
    console.log(`→ Input has ${inputEdges} edges`);
    
    const S = createEmptyMatrix(n);
    
    // Copy adjacency matrix
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            S[i][j] = adjacency[i][j];
        }
    }
    
    let removed = 0;
    
    // Try removing each edge
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i === j || S[i][j] === 0) continue;
            
            // Temporarily remove edge
            S[i][j] = 0;
            
            // BFS: Check if j still reachable from i
            const queue = [i];
            const visited = new Array(n).fill(false);
            visited[i] = true;
            let stillReachable = false;
            
            while (queue.length > 0 && !stillReachable) {
                const current = queue.shift();
                
                for (let next = 0; next < n; next++) {
                    if (S[current][next] === 1 && !visited[next]) {
                        if (next === j) {
                            stillReachable = true;
                            break;
                        }
                        visited[next] = true;
                        queue.push(next);
                    }
                }
            }
            
            if (stillReachable) {
                // Transitive - keep removed
                removed++;
            } else {
                // Essential - restore
                S[i][j] = 1;
            }
        }
    }
    
    // Remove self-loops
    for (let i = 0; i < n; i++) {
        S[i][i] = 0;
    }
    
    // DEBUG: Count remaining edges
    let remainingEdges = 0;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i !== j && S[i][j] === 1) remainingEdges++;
        }
    }
    
    console.log(`→ Removed ${removed} transitive edges`);
    console.log(`→ Skeleton has ${remainingEdges} edges remaining`);
    return S;
}

// ============================================================================
// STEP 5: FILTER ISOLATED NODES
// ============================================================================

/**
 * Filter out isolated nodes (no connections)
 */
function filterIsolatedNodes(skeleton, levels) {
    console.log('📐 Step 5: Filter Isolated Nodes');
    
    const n = skeleton.length;
    const isolatedNodes = new Set();
    
    // DEBUG: Show skeleton matrix
    console.log('🔍 DEBUG: Skeleton Matrix:');
    for (let i = 0; i < n; i++) {
        const row = skeleton[i].map(val => val === 1 ? '1' : '0').join(' ');
        console.log(`   Factor ${i + 1}: [${row}]`);
    }
    
    for (let i = 0; i < n; i++) {
        let hasConnections = false;
        let outgoing = 0;
        let incoming = 0;
        
        // Check outgoing
        for (let j = 0; j < n; j++) {
            if (i !== j && skeleton[i][j] === 1) {
                hasConnections = true;
                outgoing++;
            }
        }
        
        // Check incoming
        for (let j = 0; j < n; j++) {
            if (i !== j && skeleton[j][i] === 1) {
                hasConnections = true;
                incoming++;
            }
        }
        
        console.log(`   Factor ${i + 1}: ${outgoing} outgoing, ${incoming} incoming → ${hasConnections ? 'CONNECTED' : 'ISOLATED'}`);
        
        if (!hasConnections) {
            isolatedNodes.add(i);
        }
    }
    
    // Filter levels — defensive: ensure each level is an array
    // (Firestore can return nested arrays as objects with numeric keys)
    const filteredLevels = levels.map(level => {
        const arr = Array.isArray(level) ? level : Object.values(level || {}).map(Number);
        return arr.filter(idx => !isolatedNodes.has(idx));
    }).filter(level => level.length > 0);
    
    if (isolatedNodes.size > 0) {
        console.log(`→ Filtered ${isolatedNodes.size} isolated node(s)`);
    }
    
    return { filteredLevels, isolatedNodes };
}

// ============================================================================
// STEP 6: RENDER SVG FLOWCHART
// ============================================================================

/**
 * Render ISM Flowchart with LEFT-TO-RIGHT layout and grouped cycles
 */
function renderFlowchartSVG(svgId, levels, skeleton, factors, components) {
    console.log('📐 Step 6: Render Flowchart (SVG)');
    console.log('Layout: LEFT-TO-RIGHT with grouped cycles');
    
    // Support both SVG element and string ID
    const svg = typeof svgId === 'string' ? document.getElementById(svgId) : svgId;
    if (!svg) {
        console.error(`❌ SVG element '${svgId}' not found!`);
        return { success: false, error: 'SVG not found' };
    }
    
    svg.innerHTML = '';
    
    // Layout config - TALLER BOXES with larger font
    const nodeHeight = 120;  // Increased from 100
    const nodeWidth = 320;
    const levelWidth = 450;
    const verticalSpacing = 60;  // More spacing
    
    const totalHeight = levels.reduce((sum, level) => {
        return sum + (level.length * nodeHeight) + ((level.length - 1) * verticalSpacing);
    }, 0);
    
    // Calculate actual dimensions - move content up and right with more left margin
    const svgWidth = levels.length * levelWidth + 600;  // Even more left padding
    const svgHeight = totalHeight + 120;  // Reduced padding after removing position labels
    
    // Set fixed size (no scaling, no compression)
    svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
    svg.setAttribute('width', '100%');  // Responsive width
    svg.setAttribute('height', `${svgHeight}`);  // Set actual height in pixels
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');  // Center and maintain aspect ratio
    svg.style.background = '#FFFFFF';  // White background
    svg.style.display = 'block';
    svg.style.margin = '0 auto';
    svg.style.maxWidth = `${svgWidth}px`;  // Limit to original width
    svg.style.maxHeight = `${svgHeight}px`;  // Limit to original height
    
    // Create component map
    const componentMap = new Map();
    components.forEach((component, idx) => {
        component.forEach(factorIdx => {
            componentMap.set(factorIdx, idx);
        });
    });
    
    console.log(`🔍 Component map: ${componentMap.size} factors`);
    
    // Calculate positions and groups
    const nodePositions = {};
    const factorGroups = {};
    
    // Calculate center Y position - adjusted after removing position labels
    const centerY = totalHeight / 2 + 50;  // Centered vertically with minimal top margin
    
    levels.forEach((level, levelIdx) => {
        const x = 200 + levelIdx * levelWidth;  // Increased to 200 to prevent cutoff
        const positionNum = levelIdx + 1;  // Position counting from LEFT to RIGHT (Position 1 = leftmost = highest influencing)
        
        // Position label - REMOVED per user request (participants don't need to see position numbers)
        
        // Vertical guideline - REMOVED per user request
        
        // Group factors by component
        const processedFactors = new Set();
        
        // First pass: collect all groups in this level
        const levelGroups = [];
        
        level.forEach((factorIdx) => {
            if (processedFactors.has(factorIdx)) return;
            
            const componentIdx = componentMap.get(factorIdx);
            const group = [factorIdx];
            
            // Find others in same component
            if (componentIdx !== undefined && components[componentIdx].length > 1) {
                level.forEach(otherIdx => {
                    if (otherIdx !== factorIdx && 
                        componentMap.get(otherIdx) === componentIdx && 
                        components[componentIdx].length > 1) {
                        group.push(otherIdx);
                        processedFactors.add(otherIdx);
                    }
                });
            }
            
            processedFactors.add(factorIdx);
            levelGroups.push({ factors: group, componentIdx });
        });
        
        // Calculate total height of all groups in this level
        const totalLevelHeight = levelGroups.reduce((sum, g) => {
            return sum + (g.factors.length * 24 + 24) + verticalSpacing;
        }, -verticalSpacing);
        
        // Start Y position to center all groups vertically
        let levelY = centerY - totalLevelHeight / 2;
        
        // Second pass: position groups centered vertically
        levelGroups.forEach((groupData) => {
            const groupId = `${levelIdx}-${groupData.componentIdx || groupData.factors[0]}`;
            const groupHeight = groupData.factors.length * 24 + 24;
            
            factorGroups[groupId] = {
                factors: groupData.factors,
                x: x,
                y: levelY,
                width: nodeWidth,
                height: groupHeight
            };
            
            console.log(`🎨 Group ${groupId}: ${groupData.factors.length} factor(s)`);
            
            groupData.factors.forEach(idx => {
                nodePositions[idx] = { 
                    x: x, 
                    y: levelY,
                    width: nodeWidth,
                    height: groupHeight
                };
            });
            
            levelY += groupHeight + verticalSpacing;
        });
    });
    
    // Draw factor boxes
    const boxBoundaries = [];
    
    Object.entries(factorGroups).forEach(([groupId, group]) => {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', group.x - nodeWidth / 2);
        rect.setAttribute('y', group.y);
        rect.setAttribute('width', nodeWidth);
        rect.setAttribute('height', group.height);
        rect.setAttribute('fill', '#FAF3DD');  // Cream fill
        rect.setAttribute('stroke', '#0B2B26');  // Dark green outline
        rect.setAttribute('stroke-width', '3');
        rect.setAttribute('rx', '5');
        svg.appendChild(rect);
        
        boxBoundaries.push({
            left: group.x - nodeWidth / 2,
            right: group.x + nodeWidth / 2,
            top: group.y,
            bottom: group.y + group.height
        });
        
        group.factors.forEach((factorIdx, idx) => {
            const factor = factors[factorIdx];
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', group.x);
            label.setAttribute('y', group.y + 18 + (idx * 28));
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('fill', '#0B2B26');  // Dark green text
            label.setAttribute('font-size', '16');  // Increased from 14
            label.setAttribute('font-weight', '300');  // Thin weight
            label.setAttribute('font-family', 'Open Sans, sans-serif');
            const factorName = factor.name || factor.theme_name || `Factor ${factorIdx + 1}`;
            label.textContent = `${factorName} (${factorIdx + 1})`;
            svg.appendChild(label);
        });
    });
    
    console.log(`✅ Drew ${Object.keys(factorGroups).length} boxes`);
    
    // Draw arrows
    console.log('🎨 Drawing arrows...');
    
    const n = skeleton.length;
    let edgeCount = 0;
    let skippedSameGroup = 0;
    let skippedMissingNodes = 0;
    
    // Calculate outgoing edges
    const outgoingEdges = {};
    for (let i = 0; i < n; i++) {
        outgoingEdges[i] = [];
        for (let j = 0; j < n; j++) {
            if (skeleton[i][j] === 1) {
                outgoingEdges[i].push(j);
            }
        }
    }
    
    // Draw each arrow
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (skeleton[i][j] === 1) {
                // Check nodes exist
                if (!nodePositions[i] || !nodePositions[j]) {
                    skippedMissingNodes++;
                    continue;
                }
                
                // Check same group (skip arrows within cycles)
                let sameGroup = false;
                for (const group of Object.values(factorGroups)) {
                    if (group.factors.includes(i) && group.factors.includes(j)) {
                        sameGroup = true;
                        break;
                    }
                }
                
                if (sameGroup) {
                    skippedSameGroup++;
                    continue;
                }
                
                // CORRECT DIRECTION: skeleton[i][j]=1 means i→j, draw FROM i TO j
                // (No reversal needed now that levels are properly ordered)
                const from = nodePositions[i]; // i is the source
                const to = nodePositions[j];   // j is the target
                
                // Calculate exit Y for multiple outgoing lines from the RIGHT side of box
                const outgoingCount = outgoingEdges[i].length;
                const outgoingIndex = outgoingEdges[i].indexOf(j);
                
                let exitY = from.y + (from.height || 100) / 2; // Center of box
                if (outgoingCount > 1) {
                    // Distribute exit points vertically on the right side
                    const spacing = Math.min(30, (from.height || 100) / (outgoingCount + 1));
                    const totalSpacing = (outgoingCount - 1) * spacing;
                    exitY = from.y + (from.height || 100) / 2 - totalSpacing / 2 + outgoingIndex * spacing;
                }
                
                // Entry point: CONVERGE all incoming lines to single point on LEFT side
                const entryY = to.y + (to.height || 100) / 2; // Center of target box
                
                // Exit from RIGHT side of source box
                // Note: from.x is CENTER of box, so right edge is from.x + width/2
                const exitX = from.x + (from.width || 320) / 2;
                
                // Enter at LEFT side of target box
                // Note: to.x is CENTER of box, so left edge is to.x - width/2
                // Arrowhead: refX=0 (connects at back), 10px wide, so subtract 10px for tip to touch box edge
                const entryX = to.x - (to.width || 320) / 2 - 10;
                
                // Draw smooth curved arrow
                drawSmartArrow(svg, exitX, exitY, entryX, entryY, boxBoundaries);
                edgeCount++;
            }
        }
    }
    
    console.log(`✅ Drew ${edgeCount} arrows`);
    console.log(`   Skipped ${skippedSameGroup} (same group)`);
    console.log(`   Skipped ${skippedMissingNodes} (missing nodes)`);

    // Auto-fit viewBox to actual content bounds
    try {
        var bbox = svg.getBBox();
        if (bbox && bbox.width > 0 && bbox.height > 0) {
            var pad = 40;
            var fitX = bbox.x - pad;
            var fitY = bbox.y - pad;
            var fitW = bbox.width + pad * 2;
            var fitH = bbox.height + pad * 2;
            svg.setAttribute('viewBox', fitX + ' ' + fitY + ' ' + fitW + ' ' + fitH);
            svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            svg.removeAttribute('height');
            svg.style.maxWidth = '';
            svg.style.maxHeight = '';
            svg.style.minHeight = '';
            // Set a natural aspect-ratio height based on container width
            var aspectRatio = fitH / fitW;
            svg.style.aspectRatio = (fitW / fitH).toFixed(3);
            console.log('📐 Auto-fit viewBox:', fitX, fitY, fitW, fitH, 'aspect:', (fitW/fitH).toFixed(2));
        }
    } catch(e) {
        console.warn('⚠️ getBBox failed (SVG may not be visible yet):', e.message);
    }

    return {
        success: true,
        nodes: Object.keys(nodePositions).length,
        edges: edgeCount,
        levels: levels.length
    };
}

/**
 * Draw smart arrow with bezier curves
 */
function drawSmartArrow(svg, x1, y1, x2, y2, boxBoundaries) {
    const deltaY = Math.abs(y2 - y1);
    const isHorizontal = (deltaY < 10);
    
    let pathData;
    if (isHorizontal) {
        pathData = `M ${x1} ${y1} L ${x2} ${y2}`;
    } else {
        const cp1x = x1 + (x2 - x1) * 0.3;
        const cp2x = x1 + (x2 - x1) * 0.7;
        pathData = `M ${x1} ${y1} C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`;
    }
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('stroke', '#0B2B26');  // Dark green arrows
    path.setAttribute('stroke-width', '3');
    path.setAttribute('fill', 'none');
    path.setAttribute('marker-end', 'url(#arrowhead)');
    svg.appendChild(path);
    
    ensureArrowheadMarker(svg);
}

/**
 * Ensure arrowhead marker exists
 */
function ensureArrowheadMarker(svg) {
    if (svg.querySelector('#arrowhead')) return;
    
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '10');
    marker.setAttribute('refX', '0');  // Line connects at back of arrow
    marker.setAttribute('refY', '5');
    marker.setAttribute('orient', 'auto');
    marker.setAttribute('markerUnits', 'userSpaceOnUse');
    
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '0 0, 10 5, 0 10');
    polygon.setAttribute('fill', '#0B2B26');  // Dark green arrowheads
    
    marker.appendChild(polygon);
    defs.appendChild(marker);
    svg.insertBefore(defs, svg.firstChild);
}

// ============================================================================
// MAIN ISM ALGORITHM
// ============================================================================

/**
 * Complete ISM Algorithm - Entry Point
 * Takes adjacency matrix, returns complete ISM results
 */
function ismAlgorithm(adjacencyMatrix, factors) {
    console.log('═══════════════════════════════════════════════════');
    console.log('🚀 COMPLETE ISM Algorithm v6.18.0-ARROW-TIP-PLACEMENT');
    console.log('Build: 20251216-260000');
    console.log('Status: TIP TOUCHES BOX - Arrowhead Does Not Penetrate');
    console.log('═══════════════════════════════════════════════════');
    
    const n = adjacencyMatrix.length;
    console.log(`Input: ${n}×${n} adjacency matrix, ${factors.length} factors`);
    
    // Step 1: Reachability Matrix
    const reachability = calculateReachabilityMatrix(adjacencyMatrix);
    
    // Step 2: Strong Components
    const components = findStrongComponents(reachability);
    
    // Step 3: ISM Levels
    const levels = calculateISMLevels(reachability, components);
    
    // Step 4: Skeleton Matrix
    const skeleton = generateSkeletonMatrix(adjacencyMatrix, reachability, levels);
    
    // Step 5: Filter Isolated Nodes
    const { filteredLevels, isolatedNodes } = filterIsolatedNodes(skeleton, levels);
    
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ ISM Algorithm Complete');
    console.log(`   Levels: ${filteredLevels.length}`);
    console.log(`   Isolated: ${isolatedNodes.size}`);
    console.log('═══════════════════════════════════════════════════');
    
    return {
        reachability,
        components,
        levels,
        skeleton,
        filteredLevels,
        isolatedNodes
    };
}

// ============================================================================
// PUBLIC API - FlowchartISM Object
// ============================================================================

const FlowchartISM = {
    /**
     * Generate flowchart data from factors and voting matrix
     */
    generateFlowchartData: function(factors, votingMatrix) {
        console.log('📊 FlowchartISM.generateFlowchartData()');
        console.log(`   Factors: ${factors.length}`);
        console.log(`   Matrix: ${votingMatrix.length}×${votingMatrix[0].length}`);
        
        // Convert voting matrix to adjacency matrix (0/1)
        // Handle both boolean (true/false) and integer (1/0) formats
        const n = votingMatrix.length;
        const adjacencyMatrix = Array(n).fill(0).map(() => Array(n).fill(0));

        for (let i = 0; i < n; i++) {
            const row = Array.isArray(votingMatrix[i]) ? votingMatrix[i] : Object.values(votingMatrix[i] || {});
            for (let j = 0; j < n; j++) {
                adjacencyMatrix[i][j] = row[j] ? 1 : 0;
            }
        }
        
        // DEBUG: Check adjacency matrix BEFORE passing to algorithm
        let edgeCount = 0;
        console.log('🔍 DEBUG: Adjacency matrix BEFORE ismAlgorithm():');
        for (let i = 0; i < n; i++) {
            const row = adjacencyMatrix[i].map(v => v === 1 ? '1' : '0').join(' ');
            console.log(`   Factor ${i + 1}: [${row}]`);
            for (let j = 0; j < n; j++) {
                if (i !== j && adjacencyMatrix[i][j] === 1) edgeCount++;
            }
        }
        console.log(`→ Adjacency matrix has ${edgeCount} edges`);
        
        // Run ISM algorithm
        const results = ismAlgorithm(adjacencyMatrix, factors);
        
        return {
            skeleton: results.skeleton,
            reachability: results.reachability,
            levels: results.filteredLevels,
            components: results.components,
            isolatedNodes: results.isolatedNodes
        };
    },
    
    /**
     * Draw flowchart to SVG element
     */
    drawFlowchart: function(svgId, flowchartData, factors) {
        console.log('🎨 FlowchartISM.drawFlowchart()');
        console.log(`   SVG ID: ${svgId}`);
        console.log(`   Flowchart data keys: ${Object.keys(flowchartData).join(', ')}`);
        console.log(`   Components: ${flowchartData.components ? flowchartData.components.length : 'undefined'}`);
        console.log(`   Levels: ${flowchartData.levels ? flowchartData.levels.length : 'undefined'}`);
        
        if (!flowchartData.components) {
            console.error('❌ flowchartData.components is undefined!');
            return { success: false, error: 'Missing components data' };
        }
        
        // CRITICAL FIX: Reverse levels for proper LEFT-TO-RIGHT display
        // ISM calculates bottom-up (outcomes first), but we display top-down (drivers first)
        // Position 1 (LEFT) = Highest Influencing Factors → Position N (RIGHT) = Outcomes
        const reversedLevels = [...flowchartData.levels].reverse();
        console.log('🔄 Levels reversed for LEFT-TO-RIGHT display (Position 1 = LEFT = drivers → outcomes)');
        
        return renderFlowchartSVG(
            svgId, 
            reversedLevels, 
            flowchartData.skeleton, 
            factors, 
            flowchartData.components
        );
    },

    /**
     * Show flowchart in fullscreen overlay with Download PNG + Return button
     * @param {Object} flowchartData - ISM flowchart data (levels, skeleton, reachability, components, isolatedNodes)
     * @param {Array} factors - Array of factor objects with .name property
     * @param {string} title - Title to show in the header bar (e.g. participant name or "Your Perceived Flow of Influence")
     * @param {Function} [onClose] - Optional callback when overlay is closed
     */
    showFullscreen: function(flowchartData, factors, title, onClose) {
        title = title || 'ISM Hierarchical Structure';

        // Calculate stats
        var n = factors.length;
        var totalEdges = 0;
        if (flowchartData.skeleton) {
            for (var ei = 0; ei < n; ei++) {
                for (var ej = 0; ej < n; ej++) {
                    if (ei !== ej && flowchartData.skeleton[ei][ej] === 1) totalEdges++;
                }
            }
        }
        var levelCount = flowchartData.levels ? flowchartData.levels.length : 0;

        // Remove any existing fullscreen flowchart overlay
        var existing = document.getElementById('fullscreen-flowchart-overlay');
        if (existing) existing.remove();

        // Unique SVG ID to avoid conflicts
        var svgId = 'fullscreen-flowchart-svg-' + Date.now();

        // Build overlay HTML
        var safeTitle = title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        var overlayHTML = '<div id="fullscreen-flowchart-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:#fff;z-index:10001;display:flex;flex-direction:column;">' +
            '<div style="background:linear-gradient(135deg,#0B2B26 0%,#1a4d43 100%);padding:1rem 1.5rem;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;flex-wrap:wrap;gap:0.5rem;">' +
            '<h2 style="margin:0;font-size:1.3rem;color:#FAF3DD;font-family:Merriweather,serif;">' + title + '</h2>' +
            '<div style="display:flex;gap:0.75rem;align-items:center;flex-wrap:wrap;">' +
            '<span style="color:rgba(250,243,221,0.7);font-size:0.85rem;">' + n + ' Factors | ' + totalEdges + ' Connections | ' + levelCount + ' Levels</span>' +
            '<button id="fullscreen-flowchart-download" style="background:#FAF3DD;border:none;color:#0B2B26;padding:0.5rem 1rem;border-radius:6px;cursor:pointer;font-weight:600;font-size:0.85rem;"><i class="fas fa-download"></i> Download PNG</button>' +
            '<button id="fullscreen-flowchart-close" style="background:rgba(250,243,221,0.15);border:1px solid rgba(250,243,221,0.4);color:#FAF3DD;padding:0.5rem 1rem;border-radius:6px;cursor:pointer;font-weight:600;font-size:0.85rem;"><i class="fas fa-arrow-left"></i> Return</button>' +
            '</div></div>' +
            '<div style="flex:1;display:flex;align-items:center;justify-content:center;padding:1rem;overflow:auto;background:#fff;">' +
            '<svg id="' + svgId + '" style="display:block;width:100%;height:100%;background:#FFFFFF;"></svg>' +
            '</div></div>';

        document.body.insertAdjacentHTML('beforeend', overlayHTML);

        // Wire up close button
        var closeBtn = document.getElementById('fullscreen-flowchart-close');
        closeBtn.addEventListener('click', function() {
            var overlay = document.getElementById('fullscreen-flowchart-overlay');
            if (overlay) overlay.remove();
            if (typeof onClose === 'function') onClose();
        });

        // Wire up download button
        var downloadBtn = document.getElementById('fullscreen-flowchart-download');
        downloadBtn.addEventListener('click', function() {
            var svg = document.getElementById(svgId);
            if (!svg) { alert('No flowchart to download'); return; }

            var svgData = new XMLSerializer().serializeToString(svg);
            var svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            var url = URL.createObjectURL(svgBlob);

            var img = new Image();
            img.onload = function() {
                var canvas = document.createElement('canvas');
                var scale = 2;
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                var ctx = canvas.getContext('2d');
                ctx.scale(scale, scale);
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, img.width, img.height);
                ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(url);

                var a = document.createElement('a');
                var safeName = title.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
                a.download = 'ISM-Flowchart-' + safeName + '.png';
                a.href = canvas.toDataURL('image/png');
                a.click();
            };
            img.onerror = function() {
                URL.revokeObjectURL(url);
                alert('Failed to generate PNG. Try right-clicking the flowchart to save as image.');
            };
            img.src = url;
        });

        // Render flowchart into the overlay SVG after DOM insertion
        var self = this;
        setTimeout(function() {
            try {
                var result = self.drawFlowchart(svgId, flowchartData, factors);
                console.log('Fullscreen flowchart drawn:', result);
                if (!result || !result.success || result.nodes === 0) {
                    var svgEl = document.getElementById(svgId);
                    if (svgEl) {
                        svgEl.innerHTML = '<text x="50%" y="50%" text-anchor="middle" fill="#666" font-size="18" font-family="Open Sans,sans-serif">No flowchart structure to display.</text>';
                    }
                }
            } catch (err) {
                console.error('Fullscreen flowchart error:', err);
                var svgEl = document.getElementById(svgId);
                if (svgEl) {
                    svgEl.innerHTML = '<text x="50%" y="50%" text-anchor="middle" fill="red" font-size="16">Error rendering flowchart: ' + err.message + '</text>';
                }
            }
        }, 100);
    }
};

// Make globally available
window.FlowchartISM = FlowchartISM;

console.log('✅ ISM Complete Algorithm v6.28.12-FLOWCHART-CLEANUP loaded successfully');
console.log('📊 Position labels REMOVED (cleaner for participants)');
console.log('✅ FlowchartISM API available globally');
console.log('🎯 Adjusted spacing for optimal layout without position labels');
