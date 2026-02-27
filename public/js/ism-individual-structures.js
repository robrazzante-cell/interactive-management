/**
 * Individual ISM Structures - Per Participant
 * Generates and displays individual ISM structures for each participant
 * Following Warfield's methodology
 */

class IndividualISMStructure {
    constructor(participantId, projectId) {
        this.participantId = participantId;
        this.projectId = projectId;
        this.factors = [];
        this.matrix = [];
        this.reachabilityMatrix = [];
        this.levels = [];
        this.influenceScores = [];
    }

    /**
     * Generate individual structure from participant's votes
     * @param {Array} votingResponses - This participant's responses only
     * @param {Array} factors - All factors
     */
    async generateIndividualStructure(votingResponses, factors) {
        console.log(`🔄 Generating individual structure for participant ${this.participantId}`);
        
        this.factors = factors;
        const n = factors.length;
        
        // Initialize matrix
        this.matrix = Array(n).fill(0).map(() => Array(n).fill(0));
        
        // Fill matrix with participant's votes
        votingResponses.forEach(response => {
            const i = response.from_factor_index;
            const j = response.to_factor_index;
            
            // Binary: 5 = Yes (1), 1-4 = No (0)
            this.matrix[i][j] = response.vote_value === 5 ? 1 : 0;
        });
        
        // Calculate reachability matrix
        this.calculateReachabilityMatrix();
        
        // Calculate influence scores
        this.calculateInfluenceScores();
        
        // Calculate hierarchical levels
        this.calculateLevels();
        
        // Generate structure
        const structure = this.generateStructuralModel();
        
        // Save to database
        await this.saveToDatabase(structure);
        
        console.log(`✅ Individual structure generated for participant ${this.participantId}`);
        
        return structure;
    }

    /**
     * Calculate reachability matrix for this participant
     */
    calculateReachabilityMatrix() {
        const n = this.factors.length;
        this.reachabilityMatrix = this.matrix.map(row => [...row]);
        
        // Warfield's transitive closure
        for (let k = 0; k < n; k++) {
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    if (this.reachabilityMatrix[i][k] === 1 && this.reachabilityMatrix[k][j] === 1) {
                        this.reachabilityMatrix[i][j] = 1;
                    }
                }
            }
        }
    }

    /**
     * Calculate influence scores for this participant
     */
    calculateInfluenceScores() {
        const n = this.factors.length;
        this.influenceScores = [];
        
        for (let i = 0; i < n; i++) {
            let infScore = 0;
            let supScore = 0;
            
            // Influence: how many factors this factor reaches
            for (let j = 0; j < n; j++) {
                if (this.reachabilityMatrix[i][j] === 1) {
                    infScore++;
                }
            }
            
            // Support: how many factors reach this factor
            for (let j = 0; j < n; j++) {
                if (this.reachabilityMatrix[j][i] === 1) {
                    supScore++;
                }
            }
            
            this.influenceScores.push({
                factorIndex: i,
                factorName: this.factors[i].name,
                influenceScore: infScore,
                supportScore: supScore
            });
        }
    }

    /**
     * Calculate hierarchical levels
     */
    calculateLevels() {
        const n = this.factors.length;
        const assigned = new Set();
        this.levels = [];
        
        const workingMatrix = this.reachabilityMatrix.map(row => [...row]);
        
        while (assigned.size < n) {
            const currentLevel = [];
            
            // Find top-level factors
            for (let i = 0; i < n; i++) {
                if (assigned.has(i)) continue;
                
                // Reachability set
                const reachability = [i];
                for (let j = 0; j < n; j++) {
                    if (workingMatrix[i][j] === 1 && i !== j && !assigned.has(j)) {
                        reachability.push(j);
                    }
                }
                
                // Antecedent set
                const antecedent = [i];
                for (let j = 0; j < n; j++) {
                    if (workingMatrix[j][i] === 1 && i !== j && !assigned.has(j)) {
                        antecedent.push(j);
                    }
                }
                
                // Intersection
                const intersection = reachability.filter(x => antecedent.includes(x));
                
                // Top level if reachability = intersection
                if (JSON.stringify(reachability.sort()) === JSON.stringify(intersection.sort())) {
                    currentLevel.push(i);
                }
            }
            
            if (currentLevel.length === 0) {
                // Find any unassigned factor
                for (let i = 0; i < n; i++) {
                    if (!assigned.has(i)) {
                        currentLevel.push(i);
                        break;
                    }
                }
            }
            
            this.levels.push(currentLevel);
            currentLevel.forEach(idx => {
                assigned.add(idx);
                for (let i = 0; i < n; i++) {
                    workingMatrix[i][idx] = 0;
                }
            });
        }
    }

    /**
     * Generate structural model
     */
    generateStructuralModel() {
        const nodes = [];
        const edges = [];
        
        // Create nodes
        this.levels.forEach((level, levelIndex) => {
            level.forEach(factorIndex => {
                const factor = this.factors[factorIndex];
                const scoreData = this.influenceScores.find(s => s.factorIndex === factorIndex);
                
                nodes.push({
                    id: factor.id,
                    label: factor.name,
                    description: factor.description,
                    level: levelIndex + 1,
                    factorIndex: factorIndex,
                    influenceScore: scoreData.influenceScore,
                    supportScore: scoreData.supportScore
                });
            });
        });
        
        // Create edges
        const n = this.factors.length;
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (this.matrix[i][j] === 1) {
                    edges.push({
                        from: this.factors[i].id,
                        to: this.factors[j].id,
                        fromIndex: i,
                        toIndex: j,
                        isCycle: this.matrix[j][i] === 1
                    });
                }
            }
        }
        
        return {
            participantId: this.participantId,
            projectId: this.projectId,
            nodes,
            edges,
            levels: this.levels,
            influenceScores: this.influenceScores,
            matrix: this.matrix,
            reachabilityMatrix: this.reachabilityMatrix
        };
    }

    /**
     * Save individual structure to database
     */
    async saveToDatabase(structure) {
        try {
            const data = {
                participant_id: this.participantId,
                project_id: this.projectId,
                structure: structure,
                created_at: Date.now()
            };
            
            const response = await fetch('tables/individual_ism_structures', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to save: ${response.status}`);
            }
            
            console.log('✅ Individual structure saved to database');
            
        } catch (error) {
            console.error('❌ Error saving individual structure:', error);
            throw error;
        }
    }
}

/**
 * Metastructure Calculator
 * Aggregates individual structures using average influence scores
 */
class MetastructureCalculator {
    constructor(projectId) {
        this.projectId = projectId;
        this.individualStructures = [];
        this.factors = [];
        this.averageInfluenceScores = [];
    }

    /**
     * Load all individual structures for this project
     */
    async loadIndividualStructures() {
        try {
            const response = await fetch(`tables/individual_ism_structures?limit=1000`);
            const data = await response.json();
            
            this.individualStructures = data.data.filter(s => 
                s.project_id === this.projectId
            );
            
            console.log(`✅ Loaded ${this.individualStructures.length} individual structures`);
            
            if (this.individualStructures.length > 0) {
                this.factors = this.individualStructures[0].structure.nodes.map(n => ({
                    id: n.id,
                    name: n.label,
                    description: n.description,
                    factorIndex: n.factorIndex
                }));
            }
            
            return this.individualStructures;
            
        } catch (error) {
            console.error('❌ Error loading individual structures:', error);
            throw error;
        }
    }

    /**
     * Calculate average influence scores across all participants
     * Following the methodology from ISM Metastructure Scores.pdf
     */
    calculateAverageInfluenceScores() {
        console.log('🔄 Calculating average influence scores for metastructure...');
        
        const n = this.factors.length;
        const numParticipants = this.individualStructures.length;
        
        if (numParticipants === 0) {
            console.error('❌ No individual structures to aggregate');
            return [];
        }
        
        // Initialize scores for each factor
        const aggregateScores = Array(n).fill(0).map((_, i) => ({
            factorIndex: i,
            factorName: this.factors[i].name,
            totalInfluence: 0,
            totalSupport: 0,
            participantScores: []
        }));
        
        // Collect scores from each participant
        this.individualStructures.forEach((structure, participantIdx) => {
            structure.structure.influenceScores.forEach(score => {
                aggregateScores[score.factorIndex].totalInfluence += score.influenceScore;
                aggregateScores[score.factorIndex].totalSupport += score.supportScore;
                aggregateScores[score.factorIndex].participantScores.push({
                    participantId: structure.participant_id,
                    influenceScore: score.influenceScore,
                    supportScore: score.supportScore
                });
            });
        });
        
        // Calculate averages
        this.averageInfluenceScores = aggregateScores.map(agg => ({
            factorIndex: agg.factorIndex,
            factorName: agg.factorName,
            averageInfluenceScore: agg.totalInfluence / numParticipants,
            averageSupportScore: agg.totalSupport / numParticipants,
            totalInfluence: agg.totalInfluence,
            totalSupport: agg.totalSupport,
            numParticipants: numParticipants,
            participantScores: agg.participantScores
        }));
        
        // Sort by average influence score (descending)
        this.averageInfluenceScores.sort((a, b) => 
            b.averageInfluenceScore - a.averageInfluenceScore
        );
        
        console.log('✅ Average influence scores calculated');
        console.log('📊 Metastructure Rankings:');
        this.averageInfluenceScores.forEach((score, rank) => {
            console.log(`  ${rank + 1}. ${score.factorName}: AVG INF=${score.averageInfluenceScore.toFixed(2)}, AVG SUP=${score.averageSupportScore.toFixed(2)}`);
        });
        
        return this.averageInfluenceScores;
    }

    /**
     * Generate theme-based metastructure
     * Groups factors by average influence scores
     */
    generateMetastructure(themeLevels = null) {
        console.log('🔄 Generating theme-based metastructure...');
        
        if (!themeLevels) {
            // Auto-generate 4 theme levels based on quartiles
            const scores = this.averageInfluenceScores.map(s => s.averageInfluenceScore);
            const q1 = this.percentile(scores, 25);
            const q2 = this.percentile(scores, 50);
            const q3 = this.percentile(scores, 75);
            
            themeLevels = [
                { name: 'Foundational Drivers', threshold: Infinity },
                { name: 'Enabling Conditions', threshold: q3 },
                { name: 'Supporting Factors', threshold: q2 },
                { name: 'Outcome Factors', threshold: 0 }
            ];
        }
        
        // Group factors by theme
        const themes = themeLevels.map(theme => ({
            name: theme.name,
            factors: []
        }));
        
        this.averageInfluenceScores.forEach(score => {
            // Find appropriate theme level
            for (let i = 0; i < themeLevels.length; i++) {
                if (score.averageInfluenceScore >= themeLevels[i].threshold || i === themeLevels.length - 1) {
                    themes[i].factors.push({
                        name: score.factorName,
                        factorIndex: score.factorIndex,
                        avgInf: score.averageInfluenceScore.toFixed(2),
                        avgSup: score.averageSupportScore.toFixed(2)
                    });
                    break;
                }
            }
        });
        
        const metastructure = {
            projectId: this.projectId,
            numParticipants: this.individualStructures.length,
            themes: themes,
            averageInfluenceScores: this.averageInfluenceScores,
            createdAt: Date.now()
        };
        
        console.log('✅ Metastructure generated');
        
        return metastructure;
    }

    /**
     * Calculate percentile
     */
    percentile(arr, p) {
        const sorted = arr.slice().sort((a, b) => a - b);
        const index = (p / 100) * (sorted.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index - lower;
        
        return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    }

    /**
     * Save metastructure to database
     */
    async saveMetastructure(metastructure) {
        try {
            const response = await fetch('tables/ism_metastructure', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(metastructure)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to save: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('✅ Metastructure saved to database:', result.id);
            
            return result;
            
        } catch (error) {
            console.error('❌ Error saving metastructure:', error);
            throw error;
        }
    }
}

// Export for global access
window.IndividualISMStructure = IndividualISMStructure;
window.MetastructureCalculator = MetastructureCalculator;
