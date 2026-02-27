/**
 * ISM Matrix Algorithm Implementation
 * Based on Razzante et al. (2023) Interactive Management Research in Organizational Communication
 * 
 * Implements Interpretive Structural Modeling (ISM) methodology:
 * 1. Binary voting: 5 = Yes (1), 1-4 = No (0)
 * 2. Reachability matrix construction from aggregated votes
 * 3. Transitive closure using Warshall's algorithm
 * 4. Hierarchical level calculation
 * 5. Structural model generation for flowchart visualization
 */

class ISMMatrix {
    constructor(projectId) {
        this.projectId = projectId;
        this.factors = [];
        this.matrix = [];
        this.reachabilityMatrix = [];
        this.levels = [];
    }

    /**
     * Initialize ISM process with ordered factors from coding
     * @param {Array} factors - Ordered array of factor objects {id, name, description, rank}
     */
    setFactors(factors) {
        this.factors = factors.map((f, index) => ({
            id: f.id,
            name: f.name,
            description: f.description || '',
            rank: f.rank || index + 1,
            index: index
        }));
        
        const n = this.factors.length;
        this.matrix = Array(n).fill(0).map(() => Array(n).fill(0));
        console.log(`✅ ISM Matrix initialized with ${n} factors`);
    }

    /**
     * Generate all factor pairs for ISM voting
     * Following CORRECT ISM matrix methodology:
     * Order: 0→1, 1→0, 0→2, 1→2, 2→0, 2→1, 0→3, 1→3, 2→3, 3→0, 3→1, 3→2, ...
     * @returns {Array} Array of question pairs [{from, to, fromIndex, toIndex}]
     */
    generateVotingPairs() {
        const pairs = [];
        const n = this.factors.length;
        
        // CORRECT matrix methodology: For each column j, ask all rows i where i < j, then reverses
        for (let j = 1; j < n; j++) {
            // First: Ask all factors BEFORE j → j (0→j, 1→j, 2→j, ... (j-1)→j)
            for (let i = 0; i < j; i++) {
                pairs.push({
                    from: this.factors[i],
                    to: this.factors[j],
                    fromIndex: i,
                    toIndex: j,
                    questionNumber: pairs.length + 1
                });
            }
            
            // Then: Ask reverse (j→0, j→1, j→2, ... j→(j-1))
            for (let i = 0; i < j; i++) {
                pairs.push({
                    from: this.factors[j],
                    to: this.factors[i],
                    fromIndex: j,
                    toIndex: i,
                    questionNumber: pairs.length + 1
                });
            }
        }
        
        console.log(`✅ Generated ${pairs.length} voting pairs for ${n} factors (CORRECT matrix order)`);
        return pairs;
    }

    /**
     * Process voting responses and build initial matrix
     * @param {Array} responses - All voting responses from database
     * @param {String} relationalPhrase - Project's relational phrase (e.g., "significantly supports")
     * @returns {Object} Aggregated voting results
     */
    async processVotingResponses(responses, relationalPhrase = 'significantly supports') {
        console.log(`🔄 Processing ${responses.length} voting responses...`);
        
        const n = this.factors.length;
        const voteMatrix = Array(n).fill(0).map(() => Array(n).fill({ yes: 0, no: 0, total: 0 }));
        
        // Initialize vote counts
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                voteMatrix[i][j] = { yes: 0, no: 0, total: 0 };
            }
        }
        
        // Aggregate votes
        responses.forEach(response => {
            const i = response.from_factor_index;
            const j = response.to_factor_index;
            const vote = response.vote_value;
            
            if (i >= 0 && i < n && j >= 0 && j < n && i !== j) {
                voteMatrix[i][j].total++;
                
                // Binary voting: 5 = Yes (1), 1-4 = No (0)
                if (vote === 5) {
                    voteMatrix[i][j].yes++;
                } else {
                    voteMatrix[i][j].no++;
                }
            }
        });
        
        // Build binary matrix based on majority vote
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i !== j) {
                    const votes = voteMatrix[i][j];
                    // Majority rule: if yes votes > no votes, set to 1
                    this.matrix[i][j] = votes.yes > votes.no ? 1 : 0;
                }
            }
        }
        
        console.log('✅ Vote aggregation complete');
        console.log('📊 Binary Matrix:', this.matrix);
        
        return {
            voteMatrix,
            binaryMatrix: this.matrix,
            totalResponses: responses.length
        };
    }

    /**
     * Apply transitive closure using Warshall's algorithm
     * Key ISM step: identifies indirect relationships
     */
    calculateTransitiveClosure() {
        const n = this.factors.length;
        this.reachabilityMatrix = this.matrix.map(row => [...row]);
        
        console.log('🔄 Calculating transitive closure...');
        
        // Warshall's algorithm
        for (let k = 0; k < n; k++) {
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    // If factor i reaches k AND k reaches j, then i reaches j
                    this.reachabilityMatrix[i][j] = 
                        this.reachabilityMatrix[i][j] || 
                        (this.reachabilityMatrix[i][k] && this.reachabilityMatrix[k][j]);
                }
            }
        }
        
        // Convert boolean to binary
        this.reachabilityMatrix = this.reachabilityMatrix.map(row => 
            row.map(val => val ? 1 : 0)
        );
        
        console.log('✅ Transitive closure complete');
        console.log('📊 Reachability Matrix:', this.reachabilityMatrix);
        
        return this.reachabilityMatrix;
    }

    /**
     * Calculate reachability and antecedent sets for each factor
     * @returns {Array} Array of sets for each factor
     */
    calculateSets() {
        const n = this.factors.length;
        const sets = [];
        
        for (let i = 0; i < n; i++) {
            // Reachability set: factors that i reaches (including self)
            const reachability = [i];
            for (let j = 0; j < n; j++) {
                if (this.reachabilityMatrix[i][j] === 1 && i !== j) {
                    reachability.push(j);
                }
            }
            
            // Antecedent set: factors that reach i (including self)
            const antecedent = [i];
            for (let j = 0; j < n; j++) {
                if (this.reachabilityMatrix[j][i] === 1 && i !== j) {
                    antecedent.push(j);
                }
            }
            
            // Intersection
            const intersection = reachability.filter(x => antecedent.includes(x));
            
            sets.push({
                factor: this.factors[i],
                reachability: reachability.sort(),
                antecedent: antecedent.sort(),
                intersection: intersection.sort(),
                isTopLevel: JSON.stringify(reachability.sort()) === JSON.stringify(intersection.sort())
            });
        }
        
        return sets;
    }

    /**
     * Calculate hierarchical levels using ISM partitioning algorithm
     * @returns {Array} Levels array where each level contains factor indices
     */
    calculateLevels() {
        console.log('🔄 Calculating hierarchical levels...');
        
        const n = this.factors.length;
        const assigned = new Set();
        this.levels = [];
        
        while (assigned.size < n) {
            const sets = this.calculateSets();
            const currentLevel = [];
            
            // Find factors where reachability = intersection (top-level factors)
            sets.forEach(set => {
                if (!assigned.has(set.factor.index) && set.isTopLevel) {
                    currentLevel.push(set.factor.index);
                    assigned.add(set.factor.index);
                }
            });
            
            if (currentLevel.length === 0) {
                console.warn('⚠️ No factors found for current level - breaking to prevent infinite loop');
                break;
            }
            
            this.levels.push(currentLevel);
            
            // Remove assigned factors from reachability matrix for next iteration
            currentLevel.forEach(factorIndex => {
                for (let i = 0; i < n; i++) {
                    this.reachabilityMatrix[i][factorIndex] = 0;
                }
            });
        }
        
        console.log(`✅ Calculated ${this.levels.length} hierarchical levels:`, this.levels);
        return this.levels;
    }

    /**
     * Generate structural model for visualization
     * @returns {Object} Nodes and edges for flowchart
     */
    generateStructuralModel() {
        console.log('🔄 Generating structural model for visualization...');
        
        const nodes = [];
        const edges = [];
        
        // Create nodes with level information
        this.levels.forEach((level, levelIndex) => {
            level.forEach(factorIndex => {
                const factor = this.factors[factorIndex];
                nodes.push({
                    id: factor.id,
                    label: factor.name,
                    description: factor.description,
                    level: levelIndex + 1,
                    rank: factor.rank,
                    index: factorIndex
                });
            });
        });
        
        // Create edges based on binary matrix (direct relationships only)
        const n = this.factors.length;
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (this.matrix[i][j] === 1) {
                    edges.push({
                        from: this.factors[i].id,
                        to: this.factors[j].id,
                        fromIndex: i,
                        toIndex: j,
                        label: ''
                    });
                }
            }
        }
        
        console.log(`✅ Generated structural model: ${nodes.length} nodes, ${edges.length} edges`);
        
        return {
            nodes,
            edges,
            levels: this.levels,
            factors: this.factors
        };
    }

    /**
     * Save ISM matrix results to database
     * @param {String} context - Project context/question
     * @param {String} relationalPhrase - Relational phrase used
     */
    async saveToDatabase(context, relationalPhrase) {
        console.log('💾 Saving ISM matrix to database...');
        
        try {
            const structuralModel = this.generateStructuralModel();
            
            const matrixData = {
                project_id: this.projectId,
                factors: this.factors,
                binary_matrix: this.matrix,
                reachability_matrix: this.reachabilityMatrix,
                levels: this.levels,
                structural_model: structuralModel,
                context_question: context,
                relational_phrase: relationalPhrase,
                created_at: Date.now()
            };
            
            const response = await fetch('tables/ism_matrix', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(matrixData)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to save ISM matrix: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('✅ ISM matrix saved to database:', result.id);
            
            return result;
            
        } catch (error) {
            console.error('❌ Error saving ISM matrix:', error);
            throw error;
        }
    }

    /**
     * Complete ISM analysis workflow
     * @param {Array} votingResponses - All voting responses
     * @param {String} context - Project context
     * @param {String} relationalPhrase - Relational phrase
     * @returns {Object} Complete ISM results
     */
    async performCompleteAnalysis(votingResponses, context, relationalPhrase) {
        console.log('🚀 Starting complete ISM analysis...');
        
        try {
            // Step 1: Process voting responses
            const votingResults = await this.processVotingResponses(votingResponses, relationalPhrase);
            
            // Step 2: Calculate transitive closure
            this.calculateTransitiveClosure();
            
            // Step 3: Calculate hierarchical levels
            this.calculateLevels();
            
            // Step 4: Generate structural model
            const structuralModel = this.generateStructuralModel();
            
            // Step 5: Save to database
            const saved = await this.saveToDatabase(context, relationalPhrase);
            
            console.log('✅ Complete ISM analysis finished successfully');
            
            return {
                votingResults,
                reachabilityMatrix: this.reachabilityMatrix,
                levels: this.levels,
                structuralModel,
                savedRecord: saved
            };
            
        } catch (error) {
            console.error('❌ ISM analysis failed:', error);
            throw error;
        }
    }
}

// Export for use in other modules
window.ISMMatrix = ISMMatrix;
