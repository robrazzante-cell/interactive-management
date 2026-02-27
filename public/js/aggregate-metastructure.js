/**
 * Aggregate Metastructure Calculator
 * Calculates ISM metastructure from multiple individual flowcharts
 * Based on Tracy's methodology with AI-learned thematic names
 * Version: 4.8.2-FIXED
 */

class AggregateMetastructureCalculator {
    constructor() {
        this.flowcharts = [];
        this.factors = [];
    }
    
    /**
     * Calculate metastructure from multiple flowcharts
     * @param {Array} flowcharts - Array of individual flowchart objects
     * @param {Array} themes - Array of theme objects
     * @param {Object} filters - Optional demographic filters
     * @returns {Object} Metastructure with scores and rankings
     */
    calculateAggregate(flowcharts, themes, filters = {}) {
        console.log('📊 CALCULATING METASTRUCTURE');
        console.log(`   Processing ${flowcharts.length} individual flowcharts`);
        console.log(`   Analyzing ${themes.length} themes/factors`);
        
        // Apply demographic filters if provided
        const filteredFlowcharts = this.applyFilters(flowcharts, filters);
        console.log(`   After filtering: ${filteredFlowcharts.length} flowcharts`);
        
        if (filteredFlowcharts.length === 0) {
            throw new Error('No flowcharts match the filter criteria');
        }
        
        this.flowcharts = filteredFlowcharts;
        this.themes = themes;
        
        // Calculate scores for each theme across all flowcharts
        const aggregateScores = [];
        
        for (let themeIndex = 0; themeIndex < themes.length; themeIndex++) {
            const theme = themes[themeIndex];
            const scores = this.calculateThemeScores(themeIndex, filteredFlowcharts);
            
            aggregateScores.push({
                themeIndex: themeIndex,
                themeName: theme.name,
                ...scores
            });
        }
        
        // Sort by average influence score (descending)
        aggregateScores.sort((a, b) => b.averageInfluenceScore - a.averageInfluenceScore);
        
        // Assign ranks and group into stages
        const rankedFactors = this.assignRanksAndStages(aggregateScores);
        
        console.log('✅ Aggregate metastructure calculated successfully');
        
        return {
            factors: rankedFactors,
            flowchartCount: filteredFlowcharts.length,
            themeCount: themes.length,
            filters: filters,
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * Apply demographic filters to flowcharts
     */
    applyFilters(flowcharts, filters) {
        if (!filters || Object.keys(filters).length === 0) {
            return flowcharts;
        }
        
        return flowcharts.filter(fc => {
            // Gender filter
            if (filters.gender && fc.demographics?.gender !== filters.gender) {
                return false;
            }
            
            // Tenure filter (in years)
            if (filters.tenureMin !== undefined && fc.demographics?.tenure < filters.tenureMin) {
                return false;
            }
            if (filters.tenureMax !== undefined && fc.demographics?.tenure > filters.tenureMax) {
                return false;
            }
            
            // Rank/level filter
            if (filters.rank && fc.demographics?.rank !== filters.rank) {
                return false;
            }
            
            // Age filter
            if (filters.ageMin !== undefined && fc.demographics?.age < filters.ageMin) {
                return false;
            }
            if (filters.ageMax !== undefined && fc.demographics?.age > filters.ageMax) {
                return false;
            }
            
            return true;
        });
    }
    
    /**
     * Calculate all scores for a single theme across all flowcharts
     */
    calculateThemeScores(themeIndex, flowcharts) {
        const influenceScores = [];
        
        for (const flowchart of flowcharts) {
            const scores = this.calculateIndividualScores(themeIndex, flowchart);
            influenceScores.push(scores.influenceScore);
        }
        
        // Calculate average influence score
        const averageInfluenceScore = influenceScores.reduce((sum, score) => sum + score, 0) / influenceScores.length;
        
        // Calculate standard deviation for variability analysis
        const mean = averageInfluenceScore;
        const variance = influenceScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / influenceScores.length;
        const stdDev = Math.sqrt(variance);
        
        return {
            averageInfluenceScore: averageInfluenceScore,
            standardDeviation: stdDev,
            individualScores: influenceScores,
            minScore: Math.min(...influenceScores),
            maxScore: Math.max(...influenceScores)
        };
    }
    
    /**
     * Calculate scores for a single theme in a single flowchart
     * 
     * OFFICIAL CALCULATION METHOD - v6.24.0 UPDATED
     * Verified and tested in ism-metastructure-tester.html
     * 
     * STEP 1: Position Score - Stage/column number (1 = LEFTMOST = highest influencing)
     * STEP 2: Antecedent Score - ALL factors that can reach this one (direct OR indirect via reachability)
     * STEP 3: Succedent Score - ALL factors this one can reach (direct OR indirect via reachability)
     * STEP 4: Activity Score = Antecedent + Succedent (total connectivity)
     * STEP 5: Net Influence Score = Succedent - Antecedent
     * STEP 6: Influence Score = Position Score + Net Influence Score
     */
    calculateIndividualScores(themeIndex, flowchart) {
        const { adjacencyMatrix, levels, components, reachability } = flowchart.flowchart;
        const n = flowchart.flowchart.themeCount;
        
        // Use reachability matrix if available (for indirect paths), otherwise fall back to adjacency
        const reachMatrix = reachability || adjacencyMatrix;
        
        // Check if factor is in the flowchart (has a valid level)
        // If not in flowchart (isolated/filtered), return blank scores
        if (levels[themeIndex] === undefined || levels[themeIndex] === null) {
            return {
                positionScore: '',
                antecedentScore: '',
                succedentScore: '',
                activityScore: '',
                netInfluenceScore: '',
                influenceScore: ''
            };
        }
        
        // STEP 1: Position Score
        const level = levels[themeIndex];
        const positionScore = level + 1;
        
        // Identify which component this theme belongs to
        let myComponent = null;
        let myComponentFactors = [];
        if (components) {
            for (let compIdx = 0; compIdx < components.length; compIdx++) {
                if (components[compIdx].includes(themeIndex)) {
                    myComponent = compIdx;
                    myComponentFactors = components[compIdx];
                    break;
                }
            }
        }
        
        // STEP 2: Antecedent Score (ALL factors that can reach this one)
        // Uses REACHABILITY MATRIX to count direct AND indirect paths
        // IMPORTANT: For factors in a cycle, count ALL other factors in the same cycle
        let antecedentScore = 0;
        for (let i = 0; i < n; i++) {
            if (i === themeIndex) continue; // Skip self
            
            // If both factors are in the same cycle (component with >1 factor)
            if (myComponentFactors.length > 1 && myComponentFactors.includes(i)) {
                antecedentScore++; // All factors in cycle support each other
            } else if (reachMatrix[i][themeIndex] === 1) {
                antecedentScore++; // Factor i can reach this factor (direct OR indirect path)
            }
        }
        
        // STEP 3: Succedent Score (ALL factors this one can reach)
        // Uses REACHABILITY MATRIX to count direct AND indirect paths
        // IMPORTANT: For factors in a cycle, count ALL other factors in the same cycle
        let succedentScore = 0;
        for (let j = 0; j < n; j++) {
            if (j === themeIndex) continue; // Skip self
            
            // If both factors are in the same cycle (component with >1 factor)
            if (myComponentFactors.length > 1 && myComponentFactors.includes(j)) {
                succedentScore++; // All factors in cycle support each other
            } else if (reachMatrix[themeIndex][j] === 1) {
                succedentScore++; // This factor can reach factor j (direct OR indirect path)
            }
        }
        
        // STEP 4: Activity Score
        const activityScore = antecedentScore + succedentScore;
        
        // STEP 5: Net Influence Score
        const netInfluenceScore = succedentScore - antecedentScore;
        
        // STEP 6: Influence Score
        const influenceScore = positionScore + netInfluenceScore;
        
        return {
            positionScore,
            antecedentScore,
            succedentScore,
            activityScore,
            netInfluenceScore,
            influenceScore
        };
    }
    
    /**
     * Assign ranks and group factors into stages based on average influence scores
     */
    assignRanksAndStages(aggregateScores) {
        const ranked = aggregateScores.map((factor, index) => ({
            ...factor,
            rank: index + 1
        }));
        
        // Group into stages based on score ranges
        const scores = ranked.map(f => f.averageInfluenceScore);
        const stages = this.identifyStages(scores, ranked);  // Pass ranked factors too
        
        // Assign stage number to each factor first
        ranked.forEach(factor => {
            for (let i = 0; i < stages.length; i++) {
                if (factor.averageInfluenceScore >= stages[i].min && 
                    factor.averageInfluenceScore <= stages[i].max) {
                    factor.stage = i + 1;
                    factor.stageName = stages[i].name;
                    break;
                }
            }
        });
        
        return ranked;
    }
    
    /**
     * Identify natural stages/groupings in the influence scores
     * Returns score ranges with AI-learned thematic names
     */
    identifyStages(scores, rankedFactors) {
        if (scores.length === 0) return [];
        
        const min = Math.min(...scores);
        const max = Math.max(...scores);
        const range = max - min;
        
        // Divide into 4 stages (typical for ISM analysis)
        const quartileSize = range / 4;
        
        // Get AI-learned thematic names based on factor content
        const themeNames = this.getAILearnedThemeNames(rankedFactors);
        
        return [
            {
                stage: 1,
                name: themeNames[0] || 'Stage 1',
                min: max - quartileSize,
                max: max,
                description: 'Highest influence - Drive other factors'
            },
            {
                stage: 2,
                name: themeNames[1] || 'Stage 2',
                min: max - 2 * quartileSize,
                max: max - quartileSize - 0.01,
                description: 'High influence - Organizational level'
            },
            {
                stage: 3,
                name: themeNames[2] || 'Stage 3',
                min: max - 3 * quartileSize,
                max: max - 2 * quartileSize - 0.01,
                description: 'Moderate influence - Interpersonal level'
            },
            {
                stage: 4,
                name: themeNames[3] || 'Stage 4',
                min: min,
                max: max - 3 * quartileSize - 0.01,
                description: 'Lower influence - Results/manifestations'
            }
        ];
    }
    
    /**
     * Get AI-learned thematic names from coding training game
     * Returns array of 4 theme names based on learned patterns from the factors in each stage
     */
    getAILearnedThemeNames(rankedFactors) {
        try {
            // Try BOTH data sources: new connections game AND old training game
            const connectionsDataStr = localStorage.getItem('codingConnectionsData');
            const oldTrainingDataStr = localStorage.getItem('dataAnalysisTrainingData');
            
            const themes = [];
            
            // Load from NEW connections game
            if (connectionsDataStr) {
                const connectionsData = JSON.parse(connectionsDataStr);
                if (connectionsData.history && connectionsData.history.length > 0) {
                    connectionsData.history.forEach(game => {
                        if (game.groups) {
                            game.groups.forEach(group => {
                                if (group.name) themes.push(group.name);
                            });
                        }
                    });
                    console.log(`🎮 Loaded ${themes.length} theme names from NYT Connections game`);
                }
            }
            
            // Load from OLD training game (backward compatibility)
            if (oldTrainingDataStr) {
                const oldData = JSON.parse(oldTrainingDataStr);
                if (oldData.naming && oldData.naming.length > 0) {
                    const oldThemes = oldData.naming.map(r => r.themeName);
                    themes.push(...oldThemes);
                    console.log(`📚 Loaded ${oldThemes.length} theme names from old training game`);
                }
            }
            
            if (themes.length === 0) {
                console.log('📊 No coding game data found - using default stage names');
                return [null, null, null, null];
            }
            
            if (themes.length < 4) {
                console.log('📊 Insufficient training data (need 4+ themes) - using defaults');
                console.log(`   Found: ${themes.length} themes`);
                return [null, null, null, null];
            }
            
            // Analyze user's actual naming patterns from coding game
            const namingPatterns = this.analyzeNamingPatterns(themes);
            console.log(`🎨 Your naming patterns (from ${themes.length} theme names):`, namingPatterns);
            
            // Generate thematic names based on actual factor content + learned patterns
            const generatedNames = this.generateThematicNamesFromContent(rankedFactors, namingPatterns);
            console.log('✅ AI-learned theme names from YOUR patterns:', generatedNames);
            
            return generatedNames;
            
        } catch (error) {
            console.warn('⚠️ Could not load AI themes:', error.message);
            return [null, null, null, null];
        }
    }
    
    /**
     * Analyze user's actual naming patterns from coding game
     */
    analyzeNamingPatterns(themes) {
        // Extract the first words users actually use
        const starters = themes.map(theme => {
            const firstWord = theme.split(' ')[0];
            return firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
        });
        
        // Count frequency of starting words
        const starterFreq = {};
        starters.forEach(starter => {
            starterFreq[starter] = (starterFreq[starter] || 0) + 1;
        });
        
        // Get top 3 most common starting words
        const topStarters = Object.entries(starterFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([starter]) => starter);
        
        // Detect if user prefers action words or descriptive terms
        const actionWords = ['building', 'creating', 'fostering', 'cultivating', 'promoting', 
                           'developing', 'establishing', 'implementing', 'generating', 'producing'];
        
        const hasActionStyle = themes.some(theme => 
            actionWords.some(word => theme.toLowerCase().includes(word))
        );
        
        // Extract common words across all themes
        const allWords = [];
        themes.forEach(theme => {
            const words = theme.toLowerCase().split(/\s+/).filter(w => w.length > 3);
            allWords.push(...words);
        });
        
        const wordFreq = {};
        allWords.forEach(word => {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        });
        
        const commonWords = Object.entries(wordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word]) => word);
        
        return {
            topStarters,
            style: hasActionStyle ? 'action' : 'descriptive',
            commonWords
        };
    }
    
    /**
     * Generate thematic names based on actual factor content + learned patterns
     */
    generateThematicNamesFromContent(rankedFactors, patterns) {
        if (!rankedFactors || rankedFactors.length === 0) {
            return [null, null, null, null];
        }
        
        // Divide factors into 4 stages based on quartiles
        const quartileSize = Math.ceil(rankedFactors.length / 4);
        const stages = [
            rankedFactors.slice(0, quartileSize),                          // Stage 1: Top 25%
            rankedFactors.slice(quartileSize, quartileSize * 2),          // Stage 2: 26-50%
            rankedFactors.slice(quartileSize * 2, quartileSize * 3),      // Stage 3: 51-75%
            rankedFactors.slice(quartileSize * 3)                          // Stage 4: Bottom 25%
        ];
        
        // Generate theme name for each stage based on its factor content
        return stages.map((stageFactors, index) => {
            if (stageFactors.length === 0) return `Stage ${index + 1}`;
            
            // Extract factor names
            const factorNames = stageFactors.map(f => f.themeName || f.factor || '');
            
            // Find common concepts across factors in this stage
            const allWords = [];
            factorNames.forEach(name => {
                const words = name.toLowerCase().split(/\s+/).filter(w => w.length > 3);
                allWords.push(...words);
            });
            
            // Count word frequency
            const wordFreq = {};
            allWords.forEach(word => {
                wordFreq[word] = (wordFreq[word] || 0) + 1;
            });
            
            // Get most common word (the core concept)
            const sortedWords = Object.entries(wordFreq)
                .sort((a, b) => b[1] - a[1]);
            
            if (sortedWords.length === 0) return `Stage ${index + 1}`;
            
            const coreConcept = sortedWords[0][0];
            
            // Capitalize properly
            const capitalizedConcept = coreConcept.charAt(0).toUpperCase() + coreConcept.slice(1);
            
            // Apply user's learned style
            if (patterns.style === 'action') {
                // Use action verbs from user's patterns
                const actionStarters = ['Building', 'Creating', 'Fostering', 'Developing'];
                const starter = patterns.topStarters.find(s => actionStarters.includes(s)) || 'Building';
                return `${starter} ${capitalizedConcept}`;
            } else {
                // Use descriptive terms
                return capitalizedConcept;
            }
        });
    }
}

/**
 * AI Coding Assistant - Learns from YOUR coding patterns across all game levels
 * Analyzes primary, secondary, tertiary, and thematic coding to understand YOUR methodology
 */
class AICodingAssistant {
    constructor() {
        this.patterns = {
            primary: null,
            secondary: null,
            tertiary: null,
            thematic: null
        };
    }
    
    /**
     * Learn from all coding game data
     */
    learnFromGames() {
        const connectionsData = this.loadConnectionsData();
        const oldGameData = this.loadOldGameData();
        
        if (connectionsData || oldGameData) {
            this.learnPrimaryCoding(connectionsData, oldGameData);
            this.learnSecondaryCoding(connectionsData, oldGameData);
            this.learnTertiaryCoding(connectionsData, oldGameData);
            this.learnThematicNaming(connectionsData, oldGameData);
            
            console.log('🤖 AI Coding Assistant learned your patterns:', this.patterns);
            return true;
        }
        
        return false;
    }
    
    loadConnectionsData() {
        try {
            const dataStr = localStorage.getItem('codingConnectionsData');
            return dataStr ? JSON.parse(dataStr) : null;
        } catch (e) {
            return null;
        }
    }
    
    loadOldGameData() {
        try {
            const dataStr = localStorage.getItem('dataAnalysisTrainingData');
            return dataStr ? JSON.parse(dataStr) : null;
        } catch (e) {
            return null;
        }
    }
    
    /**
     * Learn PRIMARY coding: How you extract 2-3 word phrases from ideas
     */
    learnPrimaryCoding(connectionsData, oldGameData) {
        const phrases = [];
        
        // Extract all phrases you've worked with
        if (connectionsData && connectionsData.history) {
            connectionsData.history.forEach(game => {
                if (game.groups) {
                    game.groups.forEach(group => {
                        if (group.phrases) phrases.push(...group.phrases);
                    });
                }
            });
        }
        
        if (oldGameData && oldGameData.primary) {
            oldGameData.primary.forEach(entry => {
                if (entry.code) phrases.push(entry.code);
            });
        }
        
        if (phrases.length > 0) {
            const wordCounts = phrases.map(p => p.split(' ').length);
            this.patterns.primary = {
                totalPhrases: phrases.length,
                avgWordCount: wordCounts.reduce((a,b) => a+b, 0) / wordCounts.length,
                commonWords: this.extractTopWords(phrases, 15),
                examples: phrases.slice(0, 10)
            };
            console.log(`📝 Learned PRIMARY coding from ${phrases.length} phrases`);
        }
    }
    
    /**
     * Learn SECONDARY coding: How you cluster phrases into groups
     */
    learnSecondaryCoding(connectionsData, oldGameData) {
        const clusters = [];
        
        if (connectionsData && connectionsData.history) {
            connectionsData.history.forEach(game => {
                if (game.phase === 'secondary' && game.groups) {
                    clusters.push(...game.groups);
                }
            });
        }
        
        if (clusters.length > 0) {
            const sizes = clusters.map(c => c.phrases ? c.phrases.length : 0);
            this.patterns.secondary = {
                totalClusters: clusters.length,
                avgClusterSize: sizes.reduce((a,b) => a+b, 0) / sizes.length,
                handlesMISC: clusters.some(c => c.name && c.name.toUpperCase().includes('MISC')),
                clusterNames: clusters.map(c => c.name),
                examples: clusters.slice(0, 5)
            };
            console.log(`🔗 Learned SECONDARY clustering from ${clusters.length} groups`);
        }
    }
    
    /**
     * Learn TERTIARY coding: How you create hierarchical structures
     */
    learnTertiaryCoding(connectionsData, oldGameData) {
        const hierarchies = [];
        
        if (connectionsData && connectionsData.history) {
            connectionsData.history.forEach(game => {
                if (game.phase === 'tertiary' && game.groups) {
                    hierarchies.push(game.groups);
                }
            });
        }
        
        if (hierarchies.length > 0) {
            this.patterns.tertiary = {
                totalHierarchies: hierarchies.length,
                avgGroupsPerHierarchy: hierarchies.reduce((sum, h) => sum + h.length, 0) / hierarchies.length,
                examples: hierarchies.slice(0, 3)
            };
            console.log(`🏗️ Learned TERTIARY hierarchies from ${hierarchies.length} structures`);
        }
    }
    
    /**
     * Learn THEMATIC naming: How you name conceptual clusters
     */
    learnThematicNaming(connectionsData, oldGameData) {
        const themeNames = [];
        
        if (connectionsData && connectionsData.history) {
            connectionsData.history.forEach(game => {
                if (game.groups) {
                    game.groups.forEach(g => {
                        if (g.name) themeNames.push(g.name);
                    });
                }
            });
        }
        
        if (oldGameData && oldGameData.naming) {
            oldGameData.naming.forEach(entry => {
                if (entry.themeName) themeNames.push(entry.themeName);
            });
        }
        
        if (themeNames.length > 0) {
            const starters = themeNames.map(t => t.split(' ')[0]);
            const starterFreq = {};
            starters.forEach(s => {
                starterFreq[s] = (starterFreq[s] || 0) + 1;
            });
            
            const actionWords = ['building', 'creating', 'fostering', 'developing', 'establishing', 'promoting'];
            const actionCount = themeNames.filter(t => 
                actionWords.some(a => t.toLowerCase().includes(a))
            ).length;
            
            this.patterns.thematic = {
                totalThemes: themeNames.length,
                topStarters: Object.entries(starterFreq)
                    .sort((a,b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([word]) => word),
                prefersActionOriented: (actionCount / themeNames.length) > 0.3,
                avgLength: themeNames.reduce((sum, t) => sum + t.split(' ').length, 0) / themeNames.length,
                examples: themeNames.slice(0, 10)
            };
            console.log(`🎨 Learned THEMATIC naming from ${themeNames.length} theme names`);
        }
    }
    
    /**
     * Helper: Extract most common words
     */
    extractTopWords(phrases, count = 10) {
        const wordFreq = {};
        phrases.forEach(phrase => {
            phrase.toLowerCase().split(/\s+/).forEach(word => {
                if (word.length > 3) {
                    wordFreq[word] = (wordFreq[word] || 0) + 1;
                }
            });
        });
        return Object.entries(wordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, count)
            .map(([word, freq]) => ({ word, freq }));
    }
    
    /**
     * Get summary of learned patterns
     */
    getSummary() {
        return {
            primary: this.patterns.primary ? 
                `Learned from ${this.patterns.primary.totalPhrases} phrases (avg ${this.patterns.primary.avgWordCount.toFixed(1)} words)` : 
                'No primary coding data',
            secondary: this.patterns.secondary ? 
                `Learned from ${this.patterns.secondary.totalClusters} clusters (avg size ${this.patterns.secondary.avgClusterSize.toFixed(1)})` : 
                'No secondary coding data',
            tertiary: this.patterns.tertiary ? 
                `Learned from ${this.patterns.tertiary.totalHierarchies} hierarchies` : 
                'No tertiary coding data',
            thematic: this.patterns.thematic ? 
                `Learned from ${this.patterns.thematic.totalThemes} theme names (${this.patterns.thematic.prefersActionOriented ? 'action-oriented' : 'descriptive'} style)` : 
                'No thematic naming data'
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PublicSimulatorAggregateCalculator, AICodingAssistant };
}

// Export to window for browser use
if (typeof window !== 'undefined') {
    window.AICodingAssistant = AICodingAssistant;
}
