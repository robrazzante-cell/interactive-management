/**
 * ============================================================================
 * ISM FLOWCHART RENDERER - CLASSIC ISM STYLE (vis.js)
 * ============================================================================
 * 
 * Version: v7.0.0-CLASSIC-ISM
 * Build: 20251216-180000
 * Status: PRODUCTION READY - Classic ISM Software Style
 * 
 * Uses vis.js for automatic hierarchical layout matching original ISM software
 * 
 * Features:
 * - Yellow/gold rectangular boxes
 * - Factor names with numbers in parentheses
 * - Clean hierarchical left-to-right layout
 * - Automatic positioning
 * - Professional academic appearance
 * 
 * ============================================================================
 */

console.log('🎨 ISM Classic Renderer v7.0.0 - vis.js Hierarchical Layout');
console.log('✅ Matches original ISM software style');

// Global namespace for Classic ISM Renderer
window.ClassicISMRenderer = {
    /**
     * Render ISM flowchart using vis.js hierarchical layout
     * @param {string} containerId - ID of the container div
     * @param {array} factors - Array of factor objects with {id, name, level}
     * @param {array} edges - Array of edge objects with {from, to}
     * @param {object} options - Optional configuration
     */
    render: function(containerId, factors, edges, options = {}) {
        console.log('🎨 ClassicISMRenderer.render()');
        console.log(`   Container: ${containerId}`);
        console.log(`   Factors: ${factors.length}`);
        console.log(`   Edges: ${edges.length}`);
        
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`❌ Container #${containerId} not found!`);
            return { success: false, error: 'Container not found' };
        }
        
        // Clear container
        container.innerHTML = '';
        
        // Configuration
        const config = {
            boxWidth: options.boxWidth || 180,
            boxHeight: options.boxHeight || 60,
            boxColor: options.boxColor || '#FFD700',
            boxBorder: options.boxBorder || '#FFA500',
            arrowColor: options.arrowColor || '#666',
            fontSize: options.fontSize || 12,
            levelSeparation: options.levelSeparation || 200,
            nodeSpacing: options.nodeSpacing || 80,
            ...options
        };
        
        // Create vis.js nodes
        const visNodes = new vis.DataSet(
            factors.map(factor => {
                // Format label: "Factor Name (1)"
                const label = `${factor.name || 'Factor ' + factor.id} (${factor.id})`;
                
                return {
                    id: factor.id,
                    label: label,
                    level: this.calculateVisLevel(factor.level, factors),
                    shape: 'box',
                    widthConstraint: { minimum: config.boxWidth, maximum: config.boxWidth },
                    heightConstraint: { minimum: config.boxHeight, maximum: config.boxHeight },
                    color: {
                        background: config.boxColor,
                        border: config.boxBorder,
                        highlight: {
                            background: '#FFC700',
                            border: '#FF8C00'
                        }
                    },
                    font: {
                        color: '#000',
                        size: config.fontSize,
                        face: 'Arial, sans-serif',
                        multi: 'html',
                        bold: { color: '#000' }
                    },
                    margin: {
                        top: 10,
                        right: 15,
                        bottom: 10,
                        left: 15
                    }
                };
            })
        );
        
        // Create vis.js edges
        const visEdges = new vis.DataSet(
            edges.map(edge => ({
                from: edge.from,
                to: edge.to,
                arrows: {
                    to: {
                        enabled: true,
                        scaleFactor: 0.8
                    }
                },
                color: {
                    color: config.arrowColor,
                    highlight: '#000',
                    hover: '#000'
                },
                width: 2,
                smooth: {
                    enabled: true,
                    type: 'cubicBezier',
                    forceDirection: 'horizontal',
                    roundness: 0.3
                }
            }))
        );
        
        // Create network
        const data = {
            nodes: visNodes,
            edges: visEdges
        };
        
        const visOptions = {
            layout: {
                hierarchical: {
                    enabled: true,
                    direction: 'LR',  // Left to Right
                    sortMethod: 'directed',
                    levelSeparation: config.levelSeparation,
                    nodeSpacing: config.nodeSpacing,
                    treeSpacing: 50,
                    blockShifting: true,
                    edgeMinimization: true,
                    parentCentralization: true
                }
            },
            physics: {
                enabled: false  // Disable physics for static hierarchical layout
            },
            edges: {
                smooth: {
                    enabled: true,
                    type: 'cubicBezier',
                    forceDirection: 'horizontal',
                    roundness: 0.3
                }
            },
            interaction: {
                dragNodes: false,  // Disable dragging for clean static layout
                dragView: true,    // Allow panning
                zoomView: true     // Allow zooming
            },
            nodes: {
                shape: 'box'
            }
        };
        
        // Create the network
        const network = new vis.Network(container, data, visOptions);
        
        // Fit to view after rendering
        network.once('stabilizationIterationsDone', function() {
            network.fit({
                animation: {
                    duration: 500,
                    easingFunction: 'easeInOutQuad'
                }
            });
        });
        
        console.log('✅ Classic ISM flowchart rendered successfully');
        
        return {
            success: true,
            network: network,
            nodes: factors.length,
            edges: edges.length
        };
    },
    
    /**
     * Calculate vis.js level (reverse ISM level for left-to-right display)
     * Highest ISM level (drivers) should be leftmost (level 0 in vis.js)
     */
    calculateVisLevel: function(ismLevel, factors) {
        // Find max ISM level
        const maxLevel = Math.max(...factors.map(f => f.level));
        
        // Reverse: highest ISM level = lowest vis level (leftmost)
        return maxLevel - ismLevel;
    },
    
    /**
     * Convert ISM data to Classic ISM format and render
     * @param {string} containerId - Container div ID
     * @param {object} ismData - ISM data from algorithm (levels, skeleton, etc.)
     * @param {array} factorNames - Array of factor names
     */
    renderFromISM: function(containerId, ismData, factorNames) {
        console.log('🎨 ClassicISMRenderer.renderFromISM()');
        
        // Convert ISM levels to factor array
        const factors = [];
        ismData.levels.forEach((level, levelIdx) => {
            level.forEach(factorIdx => {
                factors.push({
                    id: factorIdx + 1,  // 1-indexed for display
                    name: factorNames[factorIdx],
                    level: ismData.levels.length - levelIdx  // Reverse for left-to-right
                });
            });
        });
        
        // Convert skeleton matrix to edges
        const edges = [];
        const skeleton = ismData.skeleton;
        for (let i = 0; i < skeleton.length; i++) {
            for (let j = 0; j < skeleton[i].length; j++) {
                if (skeleton[i][j] === 1) {
                    // Check if in same component (skip internal cycle arrows)
                    let sameComponent = false;
                    for (const component of ismData.components) {
                        if (component.includes(i) && component.includes(j)) {
                            sameComponent = true;
                            break;
                        }
                    }
                    
                    if (!sameComponent) {
                        edges.push({
                            from: i + 1,  // 1-indexed
                            to: j + 1     // 1-indexed
                        });
                    }
                }
            }
        }
        
        console.log(`   Converted to ${factors.length} factors and ${edges.length} edges`);
        
        // Render
        return this.render(containerId, factors, edges);
    }
};

console.log('✅ Classic ISM Renderer loaded and ready');
console.log('📊 Usage: ClassicISMRenderer.render(containerId, factors, edges)');
