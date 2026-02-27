// Qualitative Coding Engine - Version 3.7.0
// FREQUENCY-WEIGHTED CLUSTERING - Option 2 Implementation
// 
// NEW v3.7.0: FREQUENCY-BASED CLUSTERING - Respect Participant Voice!
// ====================================================================
// Approach: What participants mention MOST becomes central to themes
// 
// Key Innovation - Frequency Weighting:
// 1. Count how often each essence code appears
// 2. Weight clustering by frequency (most common = most important)
// 3. Theme names = most frequent code in cluster
// 4. Report frequencies for academic rigor (e.g., "n=15, 15% of ideas")
// 
// SMART PREFIX APPLICATION (User Request):
// Apply sentence starters ONLY when phrase needs help:
// - Being... Embracing... Advocacy for... Presence of... Support of...
// - Willingness to... Policies that... Existence of... Ability to...
// - Understanding of... Norms of...
// 
// Rule: If phrase is good on its own (e.g., "Diverse Hiring Practices"), 
//       leave it as-is. Only add prefix to incomplete/generic phrases.
// 
// Academic Justification:
// - Saturation principle: Themes emerge through repetition
// - Democratic: Honors what participants emphasize most
// - Transparent: Frequencies reported for publication
// - Defensible: Standard qualitative analysis practice
// 
// Result: "Better Communication Tools" (n=15) - stands alone, no prefix
//         "Transparency" (n=8) → "Presence of Transparency" - needs context

class CodingEngine {
    constructor() {
        console.log('🏗️ CodingEngine constructor called');
        this.ideas = [];
        this.primaryCodes = [];
        this.themes = [];
        this.triggerQuestionContext = null; // For etic analysis
        this.stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'it', 'its', 'they', 'their', 'them']);
        console.log('✅ CodingEngine initialized with empty ideas array:', this.ideas);
        
        // Action verbs for process coding
        this.actionVerbs = new Set(['break', 'build', 'create', 'develop', 'enhance', 'establish', 'expand', 'foster', 'improve', 'increase', 'integrate', 'optimize', 'reduce', 'remove', 'strengthen', 'support', 'transform', 'upgrade', 'address', 'align', 'balance', 'bridge', 'coordinate', 'cultivate', 'eliminate', 'facilitate', 'implement', 'innovate', 'invest', 'modernize', 'prioritize', 'promote', 'resolve', 'scale', 'shift', 'standardize', 'streamline', 'transition']);
    }
    
    // Set trigger question context for etic analysis
    setTriggerQuestionContext(triggerQuestion) {
        if (!triggerQuestion || triggerQuestion.trim() === '') {
            this.triggerQuestionContext = null;
            console.log('📋 No trigger question - using general framing');
            return;
        }
        
        const lowerQ = triggerQuestion.toLowerCase();
        
        // Detect domain from trigger question
        let domain = 'general';
        
        if (lowerQ.match(/inclusi(on|ve)|divers(ity|e)|equit(y|able)|belong(ing)?|representation|cultural/)) {
            domain = 'inclusion';
        } else if (lowerQ.match(/wellbeing|well-being|thriv(e|ing)|health|balance|stress|burnout|wellness/)) {
            domain = 'wellbeing';
        } else if (lowerQ.match(/leader(ship)?|manage(r|ment)|supervisor|accountab(le|ility)|vision/)) {
            domain = 'leadership';
        } else if (lowerQ.match(/communicat(e|ion)|feedback|transparen(t|cy)|dialogue|information|sharing/)) {
            domain = 'communication';
        }
        
        this.triggerQuestionContext = {
            question: triggerQuestion,
            domain: domain
        };
        
        console.log(`📋 Trigger question context set: "${triggerQuestion}"`);
        console.log(`🎯 Detected domain: ${domain}`);
        console.log(`✨ Etic framing will use ${domain}-specific theoretical lens`);
    }

    // PRIMARY CYCLE CODING: Extract ONE essence code per idea
    // Tracy's Phronetic-Iterative Approach: Capture the core meaning of each idea
    async primaryCycleCoding(ideas) {
        if (!ideas || !Array.isArray(ideas)) {
            console.error('❌ PRIMARY CYCLE ERROR: ideas is not an array:', ideas);
            throw new Error('Ideas must be an array for primary cycle coding');
        }
        if (ideas.length === 0) {
            console.warn('⚠️ PRIMARY CYCLE WARNING: No ideas provided');
            throw new Error('No ideas available for coding');
        }
        console.log('🔍 PRIMARY CYCLE CODING: Extracting essence codes from', ideas.length, 'ideas...');
        console.log('📚 Using Tracy\'s Phronetic-Iterative Approach: ONE code per idea');
        
        this.ideas = ideas;
        this.primaryCodes = [];

        // Generate ONE essence code for EACH idea
        for (const idea of ideas) {
            const essenceCode = this.extractEssenceCode(idea);
            
            this.primaryCodes.push({
                code: essenceCode,
                ideaId: idea.id,
                ideaText: idea.idea_text,
                clarification: idea.clarification || '',
                context: idea.idea_text.substring(0, 150)
            });
        }
        
        // NEW v3.7.0: Calculate code frequencies for frequency-weighted clustering
        this.codeFrequencies = this.calculateCodeFrequencies(this.primaryCodes);
        
        console.log(`✅ Primary Cycle Complete: Generated ${this.primaryCodes.length} essence codes (one per idea)`);
        console.log(`📊 Unique codes: ${Object.keys(this.codeFrequencies).length}`);
        console.log('📋 Each code captures the core meaning of its corresponding idea');
        
        // Show top 5 most frequent codes
        const topCodes = Object.entries(this.codeFrequencies)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5);
        console.log('📊 Top 5 most frequent codes:');
        topCodes.forEach(([code, data]) => {
            const percentage = ((data.count / this.primaryCodes.length) * 100).toFixed(1);
            console.log(`   "${code}" (n=${data.count}, ${percentage}%)`);
        });
        
        console.log('📋 Ready for Secondary Cycle: Frequency-weighted clustering');
        
        return this.primaryCodes;
    }
    
    // Extract the ESSENCE of an idea as a descriptive phrase (preserving meaning)
    // CRITICAL: Keep the phrase intact - don't reduce to just 2 words!
    extractEssenceCode(idea) {
        const fullText = idea.idea_text + ' ' + (idea.clarification || '');
        const lowerText = fullText.toLowerCase();
        
        // Strategy: Extract meaningful 3-5 word phrases that capture the essence
        // Don't over-reduce - preserve the actual meaning!
        
        // Clean and tokenize
        const words = lowerText
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2 && !this.stopWords.has(w));
        
        // Look for meaningful noun phrases (action + object patterns)
        // These preserve essence better than single words
        const meaningfulPhrases = [];
        
        // Pattern 1: verb + noun + noun (e.g., "improve team communication")
        for (let i = 0; i < words.length - 2; i++) {
            const phrase = `${words[i]} ${words[i+1]} ${words[i+2]}`;
            if (this.seemsMeaningfulPhrase(phrase)) {
                meaningfulPhrases.push(phrase);
            }
        }
        
        // Pattern 2: adjective + noun (or noun + noun)
        for (let i = 0; i < words.length - 1; i++) {
            const phrase = `${words[i]} ${words[i+1]}`;
            if (this.seemsMeaningfulPhrase(phrase)) {
                meaningfulPhrases.push(phrase);
            }
        }
        
        // Select best phrase (prefer longer, more specific ones)
        let essenceCode = '';
        if (meaningfulPhrases.length > 0) {
            // Prefer 3-word phrases over 2-word
            const threeWordPhrases = meaningfulPhrases.filter(p => p.split(' ').length >= 3);
            if (threeWordPhrases.length > 0) {
                essenceCode = threeWordPhrases[0];
            } else {
                essenceCode = meaningfulPhrases[0];
            }
        } else {
            // Fallback: take first 3-4 significant words
            essenceCode = words.slice(0, Math.min(4, words.length)).join(' ');
        }
        
        // Capitalize properly for readability
        essenceCode = essenceCode
            .split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');
        
        return essenceCode || 'Unspecified Topic';
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FREQUENCY-BASED METHODS (v3.7.0)
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Calculate frequency of each unique code
    calculateCodeFrequencies(primaryCodes) {
        const frequencies = {};
        
        for (const codeObj of primaryCodes) {
            const code = codeObj.code;
            
            if (!frequencies[code]) {
                frequencies[code] = {
                    count: 0,
                    ideaIds: [],
                    examples: []
                };
            }
            
            frequencies[code].count++;
            frequencies[code].ideaIds.push(codeObj.ideaId);
            
            // Store first 3 examples for reference
            if (frequencies[code].examples.length < 3) {
                frequencies[code].examples.push({
                    ideaId: codeObj.ideaId,
                    ideaText: codeObj.ideaText,
                    context: codeObj.context
                });
            }
        }
        
        console.log(`📊 Code frequency analysis: ${Object.keys(frequencies).length} unique codes`);
        return frequencies;
    }
    
    // Get frequency weight for a code (used in clustering)
    getFrequencyWeight(code) {
        if (!this.codeFrequencies || !this.codeFrequencies[code]) {
            return 1; // Default weight
        }
        
        const frequency = this.codeFrequencies[code].count;
        const totalCodes = this.primaryCodes.length;
        
        // Weight = frequency as percentage (0.01 to 1.0)
        // More frequent codes have higher weight in clustering
        return frequency / totalCodes;
    }
    
    // Calculate weighted similarity between two codes
    calculateWeightedSimilarity(code1, code2) {
        // Base similarity (word overlap)
        const baseSimilarity = this.calculateSimilarity(code1, code2);
        
        // Frequency weights
        const weight1 = this.getFrequencyWeight(code1);
        const weight2 = this.getFrequencyWeight(code2);
        
        // Average weight (both codes matter)
        const avgWeight = (weight1 + weight2) / 2;
        
        // Boost similarity for frequent codes
        // Frequent codes act as "anchors" for clustering
        const weightedSimilarity = baseSimilarity * (1 + avgWeight);
        
        return weightedSimilarity;
    }
    
    // Get most frequent code from a cluster
    getMostFrequentCode(cluster) {
        if (!cluster.codes || cluster.codes.length === 0) {
            return null;
        }
        
        let maxFrequency = 0;
        let mostFrequentCode = cluster.codes[0].code;
        
        for (const codeObj of cluster.codes) {
            const code = codeObj.code;
            const frequency = this.codeFrequencies[code]?.count || 0;
            
            if (frequency > maxFrequency) {
                maxFrequency = frequency;
                mostFrequentCode = code;
            }
        }
        
        const percentage = ((maxFrequency / this.primaryCodes.length) * 100).toFixed(1);
        
        return {
            code: mostFrequentCode,
            frequency: maxFrequency,
            percentage: percentage
        };
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Check if a phrase seems meaningful (contains domain-relevant words)
    seemsMeaningfulPhrase(phrase) {
        const meaningfulWords = [
            // Actions
            'improve', 'increase', 'reduce', 'provide', 'support', 'develop', 'create',
            'enhance', 'strengthen', 'build', 'establish', 'promote', 'ensure',
            // Subjects (organizational context)
            'leadership', 'management', 'communication', 'training', 'development',
            'culture', 'environment', 'team', 'employee', 'staff', 'people',
            'policy', 'process', 'system', 'program', 'resource', 'support',
            'feedback', 'recognition', 'engagement', 'wellbeing', 'health',
            'diversity', 'inclusion', 'equity', 'belonging', 'safety',
            // Descriptors  
            'better', 'clear', 'transparent', 'regular', 'consistent', 'effective',
            'supportive', 'inclusive', 'diverse', 'adequate', 'sufficient',
            'flexible', 'open', 'collaborative', 'professional'
        ];
        
        const phraseLower = phrase.toLowerCase();
        return meaningfulWords.some(word => phraseLower.includes(word));
    }
    
    // Extract key subjects (nouns and noun phrases)
    extractKeySubjects(text) {
        const words = text.split(/\s+/).filter(w => w.length > 3 && !this.stopWords.has(w));
        
        // Common subject words in organizational/workplace context
        const subjectIndicators = [
            'leadership', 'management', 'manager', 'supervisor', 'leader', 'executive',
            'employee', 'worker', 'staff', 'team', 'people', 'person',
            'communication', 'feedback', 'information', 'message', 'dialogue',
            'culture', 'environment', 'climate', 'atmosphere',
            'training', 'development', 'learning', 'education', 'skill',
            'policy', 'procedure', 'process', 'system', 'structure',
            'safety', 'health', 'wellness', 'wellbeing',
            'performance', 'productivity', 'efficiency', 'quality',
            'engagement', 'involvement', 'participation', 'input',
            'trust', 'respect', 'support', 'recognition',
            'change', 'innovation', 'improvement', 'transformation'
        ];
        
        // Find subjects in text
        const subjects = [];
        for (let i = 0; i < words.length - 1; i++) {
            const twoWord = words[i] + ' ' + words[i + 1];
            if (subjectIndicators.some(s => twoWord.includes(s))) {
                subjects.push(twoWord);
            }
        }
        
        // Single word subjects
        words.forEach(word => {
            if (subjectIndicators.includes(word)) {
                subjects.push(word);
            }
        });
        
        return [...new Set(subjects)]; // Remove duplicates
    }
    
    // Extract key descriptors (adjectives, verbs, qualities)
    extractKeyDescriptors(text) {
        const words = text.split(/\s+/).filter(w => w.length > 3 && !this.stopWords.has(w));
        
        // Common descriptors in organizational context
        const descriptorIndicators = [
            'clear', 'transparent', 'open', 'honest', 'direct',
            'effective', 'efficient', 'consistent', 'regular', 'frequent',
            'supportive', 'collaborative', 'cooperative', 'inclusive',
            'safe', 'secure', 'protected', 'healthy',
            'strong', 'weak', 'better', 'improved', 'enhanced',
            'lacking', 'missing', 'needed', 'required', 'necessary',
            'good', 'poor', 'excellent', 'adequate', 'sufficient',
            'timely', 'prompt', 'immediate', 'responsive',
            'accessible', 'available', 'provided', 'offered',
            'meaningful', 'valuable', 'important', 'critical'
        ];
        
        const descriptors = words.filter(word => 
            descriptorIndicators.includes(word)
        );
        
        return [...new Set(descriptors)]; // Remove duplicates
    }

    // SECONDARY CYCLE CODING: Consolidate into themes
    async secondaryCycleCoding(targetThemeCount = 8) {
        console.log('🎯 SECONDARY CYCLE CODING: First-level clustering of codes...');
        
        // CRITICAL CHECK: Ensure this.ideas is still available
        if (!this.ideas || !Array.isArray(this.ideas) || this.ideas.length === 0) {
            console.error('❌ CRITICAL ERROR in secondaryCycleCoding: ideas not available!');
            throw new Error('Ideas array lost between primary and secondary coding');
        }
        
        // Calculate intermediate cluster count (roughly 2-3x target themes)
        const intermediateCount = Math.ceil(targetThemeCount * 2.5);
        
        console.log(`📊 Clustering ${this.primaryCodes.length} codes into ${intermediateCount} intermediate groups...`);
        
        // SECONDARY CYCLE: Group similar codes into intermediate clusters
        const secondaryClusters = this.clusterCodes(this.primaryCodes, intermediateCount);
        
        console.log(`✅ Secondary Cycle: Created ${secondaryClusters.length} code groups`);
        
        // Store secondary clusters for inspection
        this.secondaryClusters = secondaryClusters;
        
        return secondaryClusters;
    }
    
    async tertiaryCycleCoding(targetThemeCount = 8) {
        console.log('🎯 TERTIARY CYCLE CODING: Second-level clustering (intermediate reduction)...');
        
        if (!this.secondaryClusters || this.secondaryClusters.length === 0) {
            throw new Error('No secondary clusters available for tertiary coding');
        }
        
        // Calculate intermediate target (between secondary and final themes)
        // This provides more reliable data before final theme generation
        const intermediateTarget = Math.ceil(targetThemeCount * 1.5);
        
        console.log(`📊 Clustering ${this.secondaryClusters.length} code groups into ${intermediateTarget} intermediate clusters...`);
        console.log(`   (Final theme count will be ${targetThemeCount})`);
        
        // TERTIARY CYCLE: Cluster the clusters into intermediate groups
        const tertiaryClusters = this.clusterClusters(this.secondaryClusters, intermediateTarget);
        
        console.log(`✅ Tertiary Cycle: Created ${tertiaryClusters.length} intermediate clusters`);
        
        // Store tertiary clusters
        this.tertiaryClusters = tertiaryClusters;
        
        return tertiaryClusters;
    }
    
    async finalClusteringToThemes(targetThemeCount = 8) {
        console.log('🎨 FINAL CLUSTERING: Reducing to target theme count...');
        
        if (!this.tertiaryClusters || this.tertiaryClusters.length === 0) {
            throw new Error('No tertiary clusters available for final clustering');
        }
        
        console.log(`📊 Final clustering: ${this.tertiaryClusters.length} intermediate clusters → ${targetThemeCount} final themes`);
        
        // FINAL CLUSTERING: One more round of clustering to reach target theme count
        const finalClusters = this.clusterClusters(this.tertiaryClusters, targetThemeCount);
        
        console.log(`✅ Final Clustering Complete: ${finalClusters.length} theme clusters created`);
        
        // Store final clusters
        this.finalClusters = finalClusters;
        
        return finalClusters;
    }
    
    async generateThemesFromClusters(targetThemeCount = 8) {
        console.log('🏷️ THEME GENERATION: Naming and balancing final clusters...');
        
        if (!this.finalClusters || this.finalClusters.length === 0) {
            throw new Error('No final clusters available for theme generation');
        }
        
        // Balance cluster sizes for optimal distribution
        const balancedClusters = this.balanceClusterSizes(this.finalClusters, targetThemeCount);
        
        console.log(`📊 Cluster balancing complete: ${this.finalClusters.length} → ${balancedClusters.length} balanced clusters`);
        
        // Generate themes from the balanced clusters
        this.themes = await this.generateThemes(balancedClusters);
        
        console.log('✅ Theme Generation Complete:', this.themes.length, 'themes generated');
        return this.themes;
    }
    
    // Balance cluster sizes by splitting oversized clusters and merging undersized ones
    balanceClusterSizes(clusters, targetCount) {
        console.log('⚖️ BALANCING CLUSTER SIZES for better theme distribution...');
        
        // Calculate statistics
        const totalCodes = clusters.reduce((sum, c) => sum + c.codes.length, 0);
        const avgCodesPerCluster = totalCodes / targetCount;
        const minAcceptable = Math.max(3, Math.floor(avgCodesPerCluster * 0.4)); // At least 40% of average, min 3
        const maxAcceptable = Math.ceil(avgCodesPerCluster * 2.5); // No more than 250% of average
        
        console.log(`   Total codes: ${totalCodes}`);
        console.log(`   Target clusters: ${targetCount}`);
        console.log(`   Average codes per cluster: ${avgCodesPerCluster.toFixed(1)}`);
        console.log(`   Acceptable range: ${minAcceptable} - ${maxAcceptable} codes per cluster`);
        
        let balancedClusters = [...clusters];
        let iterations = 0;
        const maxIterations = 10;
        
        while (iterations < maxIterations) {
            iterations++;
            let needsBalancing = false;
            const newClusters = [];
            
            for (const cluster of balancedClusters) {
                const size = cluster.codes.length;
                
                // SPLIT: Cluster too large - split into sub-themes
                if (size > maxAcceptable && size >= 6) { // Need at least 6 codes to split meaningfully
                    console.log(`   📍 Splitting large cluster (${size} codes) into sub-themes...`);
                    
                    // Determine number of splits (aim for clusters around avgCodesPerCluster)
                    const numSplits = Math.min(
                        Math.ceil(size / avgCodesPerCluster),
                        Math.floor(size / minAcceptable) // Don't create too many tiny clusters
                    );
                    
                    // Re-cluster this large cluster into smaller sub-clusters
                    const subClusters = this.clusterCodes(cluster.codes, numSplits);
                    
                    console.log(`   ✂️ Split into ${subClusters.length} sub-clusters:`, 
                                subClusters.map(sc => sc.codes.length).join(', '));
                    
                    newClusters.push(...subClusters);
                    needsBalancing = true;
                }
                // KEEP: Cluster size is acceptable
                else {
                    newClusters.push(cluster);
                }
            }
            
            balancedClusters = newClusters;
            
            // Check if we're done
            if (!needsBalancing) {
                break;
            }
            
            // Safety: Don't create too many clusters
            if (balancedClusters.length > targetCount * 2) {
                console.log(`   ⚠️ Too many clusters (${balancedClusters.length}), stopping split...`);
                break;
            }
        }
        
        // Now merge very small clusters if we have too many
        if (balancedClusters.length > targetCount * 1.5) {
            console.log(`   🔗 Too many clusters (${balancedClusters.length}), merging smallest ones...`);
            
            // Sort by size
            balancedClusters.sort((a, b) => a.codes.length - b.codes.length);
            
            while (balancedClusters.length > targetCount * 1.3) {
                // Merge two smallest clusters
                const smallest1 = balancedClusters.shift();
                const smallest2 = balancedClusters.shift();
                
                const merged = {
                    codes: [...smallest1.codes, ...smallest2.codes],
                    mainCode: smallest1.codes[0]?.code || '',
                    ideaIds: new Set([...smallest1.ideaIds, ...smallest2.ideaIds]),
                    codeCount: smallest1.codes.length + smallest2.codes.length
                };
                
                balancedClusters.push(merged);
                balancedClusters.sort((a, b) => a.codes.length - b.codes.length);
            }
            
            console.log(`   ✅ Merged to ${balancedClusters.length} clusters`);
        }
        
        // CRITICAL: Ensure we have EXACTLY the target count
        if (balancedClusters.length > targetCount) {
            console.log(`⚠️ Have ${balancedClusters.length} clusters, need ${targetCount}. Trimming excess...`);
            // Sort by size (descending) and keep the largest clusters
            balancedClusters.sort((a, b) => b.codes.length - a.codes.length);
            balancedClusters = balancedClusters.slice(0, targetCount);
            console.log(`✂️ Trimmed to exactly ${targetCount} clusters`);
        } else if (balancedClusters.length < targetCount) {
            console.log(`⚠️ Have ${balancedClusters.length} clusters, need ${targetCount}. This is acceptable - keeping all.`);
        }
        
        // Final report
        console.log(`⚖️ Final cluster distribution:`);
        const sizes = balancedClusters.map(c => c.codes.length).sort((a, b) => b - a);
        console.log(`   Count: ${balancedClusters.length} (target: ${targetCount})`);
        console.log(`   Sizes: ${sizes.join(', ')}`);
        console.log(`   Min: ${Math.min(...sizes)}, Max: ${Math.max(...sizes)}, Avg: ${(totalCodes / balancedClusters.length).toFixed(1)}`);
        
        return balancedClusters;
    }
    
    // New method: Cluster clusters (meta-clustering)
    clusterClusters(clusters, targetCount) {
        console.log(`🔄 Meta-clustering: ${clusters.length} groups → ${targetCount} final clusters`);
        
        // Create cluster representatives (aggregate codes from each cluster)
        const clusterReps = clusters.map((cluster, index) => {
            // Each cluster is an object with {codes: [...], mainCode: '...', ideaIds: Set}
            // Combine all codes in this cluster into a representative phrase
            const allCodes = cluster.codes.map(code => code.code).join(' ');
            return {
                id: index,
                representative: allCodes,
                originalCluster: cluster,
                size: cluster.codes.length
            };
        });
        
        // Hierarchical clustering on cluster representatives
        let currentClusters = clusterReps.map(rep => [rep]);
        
        while (currentClusters.length > targetCount) {
            let maxSimilarity = -1;
            let mergeIndices = [0, 1];
            
            // Find most similar pair of clusters
            for (let i = 0; i < currentClusters.length; i++) {
                for (let j = i + 1; j < currentClusters.length; j++) {
                    // Calculate similarity between cluster representatives
                    const rep1 = currentClusters[i].map(r => r.representative).join(' ');
                    const rep2 = currentClusters[j].map(r => r.representative).join(' ');
                    const similarity = this.calculateSimilarity(rep1, rep2);
                    
                    if (similarity > maxSimilarity) {
                        maxSimilarity = similarity;
                        mergeIndices = [i, j];
                    }
                }
            }
            
            // Merge the two most similar clusters
            const [i, j] = mergeIndices;
            const merged = [...currentClusters[i], ...currentClusters[j]];
            
            // Remove old clusters and add merged one
            currentClusters = currentClusters.filter((_, idx) => idx !== i && idx !== j);
            currentClusters.push(merged);
        }
        
        // Flatten back to code clusters
        const finalClusters = currentClusters.map(metaCluster => {
            // Merge all codes from all original clusters in this meta-cluster
            const allCodes = [];
            const allIdeaIds = new Set();
            
            metaCluster.forEach(rep => {
                // rep.originalCluster is an object with {codes: [...], ideaIds: Set}
                allCodes.push(...rep.originalCluster.codes);
                rep.originalCluster.ideaIds.forEach(id => allIdeaIds.add(id));
            });
            
            return {
                codes: allCodes,
                mainCode: allCodes[0]?.code || '',
                ideaIds: allIdeaIds,
                codeCount: allCodes.length
            };
        });
        
        console.log(`✅ Meta-clustering complete: ${finalClusters.length} final clusters created`);
        
        return finalClusters;
    }

    // ETIC THEME NAMING: Generate contextually relevant theme names
    // Implements etic analysis - themes related to overarching theory/concepts of trigger question
    // Uses Tracy-based sentence starters only when grammatically appropriate
    generateProcessCode(codeGroup) {
        // ISM-appropriate prefixes - Tracy-based sentence starters (varied selection)
        const prefixes = [
            'Being',
            'Embracing',
            'Advocacy for',
            'Presence of',
            'Support of',
            'Willingness to',
            'Policies that',
            'Existence of',
            'Ability to',
            'Understanding of',
            'Norms of'
        ];
        
        // Track which prefixes have been used recently to ensure variety
        if (!this.recentPrefixes) {
            this.recentPrefixes = [];
        }
        
        // Extract main concept with etic framing
        const concept = this.applyEticFraming(codeGroup.mainConcept, codeGroup.codes);
        
        // Determine if concept needs a prefix or stands alone
        const conceptLower = concept.toLowerCase();
        
        // Check if concept is already a complete, grammatical phrase
        const isCompleteConcept = this.isCompletePhrase(concept);
        
        if (isCompleteConcept) {
            // Concept stands alone - DON'T add prefix
            console.log(`📝 ✅ THEME (no prefix needed): "${concept}"`);
            console.log(`   Reason: Complete phrase that stands on its own`);
            return concept;
        }
        
        // Phrase needs help - select appropriate prefix
        console.log(`📝 ⚠️ Phrase needs context: "${concept}"`);
        let selectedPrefix = this.selectContextualPrefix(conceptLower, prefixes);
        console.log(`   Selected prefix: "${selectedPrefix}"`);
        
        // Track prefix usage for variety
        this.recentPrefixes.push(selectedPrefix);
        if (this.recentPrefixes.length > 5) {
            this.recentPrefixes.shift(); // Keep only last 5
        }
        
        // Construct theme name with grammatically appropriate format
        const themeName = this.constructThemeName(selectedPrefix, concept);
        console.log(`📝 ✅ THEME (with prefix): "${themeName}"`);
        
        return themeName;
    }
    
    // Apply etic framing: Relate concepts to the theoretical framework of the trigger question
    // UPDATED: Only apply subtle refinements, don't replace the essence
    applyEticFraming(mainConcept, codes) {
        // CRITICAL: The mainConcept is already a good essence code from Primary Cycle
        // Don't be too aggressive in replacing it!
        
        // Get trigger question context if available
        const triggerContext = this.triggerQuestionContext || {};
        
        // If no trigger context, return as-is (preserve essence!)
        if (!triggerContext.domain) {
            return mainConcept;
        }
        
        // Extract domain-specific terminology from codes
        const allCodesText = codes.join(' ').toLowerCase();
        
        // Only apply SUBTLE refinements - don't replace the whole concept!
        let refinedConcept = mainConcept;
        
        // ETIC FRAMING BY DOMAIN (SUBTLE - only refine if concept is too generic)
        const isGeneric = /^(general|additional|regular|various|overall|support|improve)/i.test(mainConcept);
        
        if (isGeneric) {
            // Only refine generic concepts
            if (triggerContext.domain === 'inclusion' || triggerContext.domain === 'diversity') {
                refinedConcept = this.applyInclusionFraming(mainConcept, allCodesText);
            } else if (triggerContext.domain === 'wellbeing' || triggerContext.domain === 'thriving') {
                refinedConcept = this.applyWellbeingFraming(mainConcept, allCodesText);
            } else if (triggerContext.domain === 'leadership') {
                refinedConcept = this.applyLeadershipFraming(mainConcept, allCodesText);
            } else if (triggerContext.domain === 'communication') {
                refinedConcept = this.applyCommunicationFraming(mainConcept, allCodesText);
            }
        }
        
        return refinedConcept;
    }
    
    // Check if concept is already a complete, grammatical phrase that stands alone
    // v3.7.0: SMART detection - only add prefixes when phrase needs help
    isCompletePhrase(concept) {
        const words = concept.split(/\s+/).filter(w => w.length > 0);
        const conceptLower = concept.toLowerCase();
        
        // Patterns that indicate a complete, good phrase (DON'T add prefix)
        const completePatterns = [
            // Action + Object patterns
            /^(better|improved|effective|enhanced|clear|strong|diverse|inclusive|equitable|adequate|sufficient)\s+\w+/i,
            // Descriptive + Noun patterns
            /^(cultural|organizational|leadership|management|employee|team|professional|personal)\s+\w+/i,
            // Multi-word noun phrases
            /^(hiring|recruitment|training|development|communication|feedback|recognition|support)\s+(practices|processes|systems|programs|initiatives|strategies|approaches)/i,
            // Already complete concepts
            /personnel|practices|strategies|initiatives|programs|resources|opportunities|environment|culture|policies|procedures$/i
        ];
        
        // Check if matches any complete pattern
        if (completePatterns.some(pattern => pattern.test(concept))) {
            console.log(`   ✅ Complete phrase detected: "${concept}" (no prefix needed)`);
            return true;
        }
        
        // 2+ word phrases are usually complete
        if (words.length >= 2) {
            // But check for incomplete fragments
            const incompletFragments = /^(and|or|the|a|an|of|in|on|at|to|for|with|by)\s/i;
            if (incompletFragments.test(concept)) {
                console.log(`   ⚠️ Incomplete fragment: "${concept}" (needs prefix)`);
                return false;
            }
            console.log(`   ✅ Multi-word phrase: "${concept}" (no prefix needed)`);
            return true;
        }
        
        // Single words: check if specific and strong enough
        if (words.length === 1) {
            const strongNouns = /^(training|leadership|resources|policies|communication|diversity|inclusion|wellbeing|development|collaboration|transparency|accountability|innovation|engagement|recognition|flexibility)$/i;
            if (strongNouns.test(concept)) {
                console.log(`   ✅ Strong noun: "${concept}" (no prefix needed)`);
                return true;
            }
            console.log(`   ⚠️ Generic single word: "${concept}" (needs prefix)`);
            return false;
        }
        
        return false;
    }
    
    // Select contextually appropriate prefix
    selectContextualPrefix(conceptLower, prefixes) {
        // Context-aware prefix selection based on semantic meaning
        if (conceptLower.includes('policy') || conceptLower.includes('policies') || conceptLower.includes('rule') || conceptLower.includes('regulation')) {
            return 'Policies that';
        } else if (conceptLower.includes('leader') || conceptLower.includes('management') || conceptLower.includes('supervisor')) {
            return 'Support of';
        } else if (conceptLower.includes('culture') || conceptLower.includes('norm') || conceptLower.includes('standard')) {
            return 'Norms of';
        } else if (conceptLower.includes('understand') || conceptLower.includes('aware') || conceptLower.includes('knowledge')) {
            return 'Understanding of';
        } else if (conceptLower.includes('communication') || conceptLower.includes('feedback') || conceptLower.includes('transparency')) {
            return 'Presence of';
        } else if (conceptLower.includes('willing') || conceptLower.includes('ready') || conceptLower.includes('openness')) {
            return 'Willingness to';
        } else if (conceptLower.includes('exist') || conceptLower.includes('available') || conceptLower.includes('provision')) {
            return 'Existence of';
        } else if (conceptLower.includes('able') || conceptLower.includes('capacity') || conceptLower.includes('capability')) {
            return 'Ability to';
        } else if (conceptLower.includes('advocat') || conceptLower.includes('champion') || conceptLower.includes('promote')) {
            return 'Advocacy for';
        } else if (conceptLower.includes('embrac') || conceptLower.includes('adopt') || conceptLower.includes('accept')) {
            return 'Embracing';
        } else if (conceptLower.match(/^(being|identity|state|condition)/)) {
            return 'Being';
        } else {
            // Select a prefix that hasn't been used recently to ensure variety
            const availablePrefixes = prefixes.filter(p => !this.recentPrefixes.includes(p));
            if (availablePrefixes.length === 0) {
                this.recentPrefixes = [];
                return prefixes[Math.floor(Math.random() * prefixes.length)];
            } else {
                return availablePrefixes[Math.floor(Math.random() * availablePrefixes.length)];
            }
        }
    }
    
    // Construct grammatically correct theme name
    constructThemeName(prefix, concept) {
        // Handle different prefix types grammatically
        if (prefix === 'Policies that' || prefix === 'Willingness to' || prefix === 'Ability to') {
            // These need verb forms
            return `${prefix} ${this.ensureVerbForm(concept)}`;
        } else if (prefix.endsWith('of')) {
            // "Support of", "Presence of", "Existence of", "Understanding of", "Norms of"
            return `${prefix} ${this.ensureNounForm(concept)}`;
        } else if (prefix === 'Being' || prefix === 'Embracing') {
            // Can take noun or gerund
            return `${prefix} ${concept}`;
        } else if (prefix === 'Advocacy for') {
            return `${prefix} ${this.ensureNounForm(concept)}`;
        } else {
            return `${prefix} ${concept}`;
        }
    }
    
    // Ensure concept is in verb form (for "Policies that...", "Willingness to...", "Ability to...")
    ensureVerbForm(concept) {
        // If already starts with a verb, use as-is
        const verbStarters = /^(provide|support|promote|ensure|enhance|improve|increase|reduce|develop|create|establish|maintain|foster)/i;
        if (verbStarters.test(concept)) {
            return concept.charAt(0).toLowerCase() + concept.slice(1); // lowercase first letter
        }
        
        // Otherwise, add appropriate verb
        return `support ${concept.toLowerCase()}`;
    }
    
    // Ensure concept is in noun form
    ensureNounForm(concept) {
        // Concept should already be a noun phrase from etic framing
        return concept;
    }
    
    // DOMAIN-SPECIFIC ETIC FRAMING METHODS
    
    applyInclusionFraming(concept, codesText) {
        // Inclusion/Diversity theoretical framework
        const inclusionTerms = {
            'personnel': 'Diverse Personnel',
            'people': 'Diverse Representation',
            'hiring': 'Inclusive Hiring Practices',
            'recruitment': 'Equitable Recruitment',
            'training': 'Cultural Competency Training',
            'leadership': 'Inclusive Leadership',
            'environment': 'Inclusive Environment',
            'culture': 'Culture of Belonging',
            'policies': 'Equity-Focused Policies',
            'support': 'Culturally Responsive Support',
            'communication': 'Inclusive Communication',
            'access': 'Equitable Access'
        };
        
        const conceptLower = concept.toLowerCase();
        for (const [key, framedTerm] of Object.entries(inclusionTerms)) {
            if (conceptLower.includes(key) || codesText.includes(key)) {
                return framedTerm;
            }
        }
        
        return concept;
    }
    
    applyWellbeingFraming(concept, codesText) {
        // Wellbeing/Thriving theoretical framework
        const wellbeingTerms = {
            'balance': 'Work-Life Balance',
            'stress': 'Stress Management Resources',
            'health': 'Mental Health Support',
            'wellness': 'Holistic Wellness Programs',
            'burnout': 'Burnout Prevention',
            'support': 'Emotional Support Systems',
            'resources': 'Wellbeing Resources',
            'time': 'Flexible Time Arrangements',
            'workload': 'Manageable Workload',
            'environment': 'Psychologically Safe Environment',
            'care': 'Self-Care Practices',
            'thriving': 'Conditions for Thriving'
        };
        
        const conceptLower = concept.toLowerCase();
        for (const [key, framedTerm] of Object.entries(wellbeingTerms)) {
            if (conceptLower.includes(key) || codesText.includes(key)) {
                return framedTerm;
            }
        }
        
        return concept;
    }
    
    applyLeadershipFraming(concept, codesText) {
        // Leadership theoretical framework
        const leadershipTerms = {
            'support': 'Supportive Leadership Practices',
            'communication': 'Transparent Leadership Communication',
            'accountability': 'Leadership Accountability',
            'vision': 'Clear Leadership Vision',
            'development': 'Leadership Development',
            'feedback': 'Constructive Leadership Feedback',
            'trust': 'Trust-Building Leadership',
            'empowerment': 'Employee Empowerment',
            'decision': 'Inclusive Decision-Making',
            'presence': 'Leadership Presence'
        };
        
        const conceptLower = concept.toLowerCase();
        for (const [key, framedTerm] of Object.entries(leadershipTerms)) {
            if (conceptLower.includes(key) || codesText.includes(key)) {
                return framedTerm;
            }
        }
        
        return concept;
    }
    
    applyCommunicationFraming(concept, codesText) {
        // Communication theoretical framework
        const communicationTerms = {
            'feedback': 'Bi-Directional Feedback Systems',
            'transparency': 'Organizational Transparency',
            'channels': 'Open Communication Channels',
            'meetings': 'Structured Communication Forums',
            'updates': 'Regular Information Updates',
            'listening': 'Active Listening Practices',
            'dialogue': 'Meaningful Dialogue Opportunities',
            'sharing': 'Information Sharing Protocols'
        };
        
        const conceptLower = concept.toLowerCase();
        for (const [key, framedTerm] of Object.entries(communicationTerms)) {
            if (conceptLower.includes(key) || codesText.includes(key)) {
                return framedTerm;
            }
        }
        
        return concept;
    }
    
    applyGeneralAcademicFraming(concept, codesText) {
        // General academic/organizational development terminology
        const academicTerms = {
            'personnel': 'Adequate Personnel',
            'resources': 'Sufficient Resources',
            'training': 'Professional Development',
            'support': 'Organizational Support',
            'time': 'Time Allocation',
            'workload': 'Workload Management',
            'environment': 'Supportive Environment',
            'collaboration': 'Collaborative Practices',
            'processes': 'Efficient Processes',
            'systems': 'Organizational Systems'
        };
        
        const conceptLower = concept.toLowerCase();
        for (const [key, framedTerm] of Object.entries(academicTerms)) {
            if (conceptLower.includes(key)) {
                return framedTerm;
            }
        }
        
        return concept;
    }

    // DESCRIPTIVE CODING: Generate noun-based descriptive names
    generateDescriptiveCode(codeGroup) {
        // Extract main nouns and noun phrases
        const nouns = this.extractNouns(codeGroup.codes);
        
        // Create descriptive label
        const mainNoun = nouns[0] || codeGroup.mainConcept;
        
        // Add qualifiers if needed
        const qualifiers = this.extractQualifiers(codeGroup.codes);
        const qualifier = qualifiers[0] || '';
        
        return qualifier ? `${qualifier} ${mainNoun}` : mainNoun;
    }

    // Extract keywords using simple term frequency
    // Tracy's approach: Extract ALL significant keywords (frequency >= 2) or all unique keywords if text is short
    extractKeywords(text) {
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3 && !this.stopWords.has(word));

        // Get unique keywords with frequency
        const frequency = {};
        words.forEach(word => {
            frequency[word] = (frequency[word] || 0) + 1;
        });

        // Extract ALL keywords that appear more than once, or all if text is short
        const sortedKeywords = Object.keys(frequency)
            .sort((a, b) => frequency[b] - frequency[a]);
        
        // For longer text: take keywords with frequency >= 2
        // For shorter text: take top keywords (adaptive)
        if (words.length > 20) {
            return sortedKeywords.filter(word => frequency[word] >= 2);
        } else {
            // For short text, take top 5 to avoid noise
            return sortedKeywords.slice(0, 5);
        }
    }

    // Extract key phrases (2-3 word combinations)
    // Tracy's approach: Extract ALL meaningful phrases, not just top few
    extractPhrases(text) {
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3 && !this.stopWords.has(word));

        const phraseMap = {};
        
        // 2-word phrases
        for (let i = 0; i < words.length - 1; i++) {
            const phrase = words[i] + ' ' + words[i + 1];
            phraseMap[phrase] = (phraseMap[phrase] || 0) + 1;
        }

        // 3-word phrases
        for (let i = 0; i < words.length - 2; i++) {
            const phrase = words[i] + ' ' + words[i + 1] + ' ' + words[i + 2];
            phraseMap[phrase] = (phraseMap[phrase] || 0) + 1;
        }

        // Return ALL phrases (they'll be consolidated later)
        // Or filter by frequency if there are too many
        const sortedPhrases = Object.keys(phraseMap)
            .sort((a, b) => phraseMap[b] - phraseMap[a]);
        
        // For very long text with many phrases, take phrases that repeat
        if (sortedPhrases.length > 20) {
            return sortedPhrases.filter(p => phraseMap[p] >= 2).slice(0, 10);
        }
        
        // For moderate text, take all unique phrases (up to 10)
        return sortedPhrases.slice(0, 10);
    }

    // Consolidate similar codes
    consolidateCodes(codes) {
        const codeMap = {};
        
        codes.forEach(code => {
            const key = code.code;
            if (!codeMap[key]) {
                codeMap[key] = {
                    code: key,
                    frequency: 0,
                    ideaIds: [],
                    contexts: []
                };
            }
            codeMap[key].frequency++;
            codeMap[key].ideaIds.push(code.ideaId);
            codeMap[key].contexts.push(code.context);
        });

        return Object.values(codeMap)
            .sort((a, b) => b.frequency - a.frequency);
    }

    // SECONDARY CYCLE: Cluster similar essence codes into themes
    // Groups codes with similar meaning together
    clusterCodes(codes, targetCount) {
        console.log(`🔍 Clustering ${codes.length} essence codes into ${targetCount} themes...`);
        
        if (codes.length === 0) {
            console.error('❌ No codes to cluster!');
            return [];
        }
        
        if (codes.length <= targetCount) {
            // If we have fewer codes than target themes, each code becomes its own theme
            console.log(`⚠️ Only ${codes.length} codes for ${targetCount} themes - each code becomes a theme`);
            return codes.map(code => ({
                mainCode: code.code,
                codes: [code],
                ideaIds: new Set([code.ideaId]),
                codeCount: 1
            }));
        }
        
        // Step 1: Calculate similarity between all pairs of codes
        console.log('📊 Calculating code similarities...');
        const similarities = this.calculateAllSimilarities(codes);
        
        // Step 2: Use hierarchical clustering to group similar codes
        console.log('🎯 Grouping similar codes...');
        const clusters = this.hierarchicalClustering(codes, similarities, targetCount);
        
        console.log(`✅ Created ${clusters.length} clusters`);
        clusters.forEach((cluster, i) => {
            console.log(`   Cluster ${i + 1}: ${cluster.codes.length} codes, ${cluster.ideaIds.size} ideas`);
        });
        
        return clusters;
    }
    
    // Calculate similarity between all pairs of codes
    // v3.7.0: Now uses frequency-weighted similarity
    calculateAllSimilarities(codes) {
        const similarities = [];
        
        console.log('📊 Using frequency-weighted similarity (v3.7.0)');
        console.log('   More frequent codes have stronger influence on clustering');
        
        for (let i = 0; i < codes.length; i++) {
            similarities[i] = [];
            for (let j = 0; j < codes.length; j++) {
                if (i === j) {
                    similarities[i][j] = 1.0; // Perfect similarity with self
                } else {
                    // NEW: Use frequency-weighted similarity
                    similarities[i][j] = this.calculateWeightedSimilarity(codes[i].code, codes[j].code);
                }
            }
        }
        
        return similarities;
    }
    
    // Hierarchical clustering: Group most similar codes together
    hierarchicalClustering(codes, similarities, targetCount) {
        // Initialize: each code starts as its own cluster
        let clusters = codes.map((code, index) => ({
            indices: [index],
            codes: [code],
            mainCode: code.code,
            ideaIds: new Set([code.ideaId]),
            codeCount: 1
        }));
        
        // Merge clusters until we reach target count
        while (clusters.length > targetCount) {
            // Find two most similar clusters
            let maxSim = -1;
            let mergeI = 0;
            let mergeJ = 1;
            
            for (let i = 0; i < clusters.length; i++) {
                for (let j = i + 1; j < clusters.length; j++) {
                    // Average similarity between all codes in the two clusters
                    let totalSim = 0;
                    let count = 0;
                    
                    clusters[i].indices.forEach(idx1 => {
                        clusters[j].indices.forEach(idx2 => {
                            totalSim += similarities[idx1][idx2];
                            count++;
                        });
                    });
                    
                    const avgSim = totalSim / count;
                    
                    if (avgSim > maxSim) {
                        maxSim = avgSim;
                        mergeI = i;
                        mergeJ = j;
                    }
                }
            }
            
            // Merge the two most similar clusters
            const merged = {
                indices: [...clusters[mergeI].indices, ...clusters[mergeJ].indices],
                codes: [...clusters[mergeI].codes, ...clusters[mergeJ].codes],
                mainCode: clusters[mergeI].codes.length >= clusters[mergeJ].codes.length 
                    ? clusters[mergeI].mainCode 
                    : clusters[mergeJ].mainCode,
                ideaIds: new Set([...clusters[mergeI].ideaIds, ...clusters[mergeJ].ideaIds]),
                codeCount: clusters[mergeI].codeCount + clusters[mergeJ].codeCount
            };
            
            // Remove old clusters and add merged one
            clusters = clusters.filter((_, idx) => idx !== mergeI && idx !== mergeJ);
            clusters.push(merged);
        }
        
        return clusters;
    }

    // Calculate simple word similarity
    calculateSimilarity(str1, str2) {
        const words1 = new Set(str1.split(/\s+/));
        const words2 = new Set(str2.split(/\s+/));
        
        let overlap = 0;
        words1.forEach(word => {
            if (words2.has(word)) overlap++;
        });

        return overlap / Math.max(words1.size, words2.size);
    }

    // Generate themes from clusters
    async generateThemes(clusters) {
        console.log('🎨 generateThemes called');
        console.log('🔍 this.ideas:', this.ideas);
        console.log('🔍 this.ideas type:', typeof this.ideas);
        console.log('🔍 this.ideas is array?', Array.isArray(this.ideas));
        console.log('🔍 this.ideas length:', this.ideas?.length);
        
        // CRITICAL CHECK: Ensure this.ideas exists
        if (!this.ideas || !Array.isArray(this.ideas)) {
            console.error('❌ CRITICAL ERROR: this.ideas is not an array in generateThemes!');
            console.error('❌ this.ideas value:', this.ideas);
            throw new Error('Ideas array not properly initialized in CodingEngine');
        }
        
        if (this.ideas.length === 0) {
            console.error('❌ CRITICAL ERROR: this.ideas is empty in generateThemes!');
            throw new Error('No ideas available for theme generation');
        }
        
        console.log(`✅ Ideas validation passed: ${this.ideas.length} ideas available`);
        const themes = [];

        for (let i = 0; i < clusters.length; i++) {
            const cluster = clusters[i];
            
            console.log(`🔍 Processing cluster ${i + 1}, ideaIds:`, cluster.ideaIds);
            
            // Get ideas for this cluster
            const clusterIdeas = this.ideas.filter(idea => 
                cluster.ideaIds.has(idea.id)
            );

            // Extract main concept
            const mainConcept = this.extractMainConcept(cluster);
            
            // Prepare code group for naming
            const codeGroup = {
                codes: cluster.codes.map(c => c.code),
                mainConcept: mainConcept,
                ideas: clusterIdeas,
                codeCount: cluster.codeCount || cluster.codes.length
            };

            // Generate both coding styles
            let processCode = this.generateProcessCode(codeGroup);
            const descriptiveCode = this.generateDescriptiveCode(codeGroup);
            
            // Validate and clean theme name
            processCode = this.validateThemeName(processCode, cluster.codes);
            
            // Create hybrid name (prefer process coding as per methodology)
            const hybridName = processCode;

            // v3.7.0: Calculate frequency statistics for this theme
            const mostFrequent = this.getMostFrequentCode(cluster);
            const percentage = ((clusterIdeas.length / this.ideas.length) * 100).toFixed(1);
            
            // Generate conceptual description
            const conceptualDescription = this.generateConceptualDescription(hybridName, cluster.codes, clusterIdeas);
            
            themes.push({
                id: 'THEME-' + Date.now() + '-' + i,
                name: hybridName,
                processCode: processCode,
                descriptiveCode: descriptiveCode,
                description: conceptualDescription,
                ideaCount: clusterIdeas.length,
                ideaIds: Array.from(cluster.ideaIds),
                codeCount: cluster.codes.length,
                rank: i + 1,
                codes: cluster.codes.map(c => c.code).slice(0, 10), // Show up to 10 codes
                allCodes: cluster.codes.map(c => c.code), // Keep all for logging
                // v3.7.0: Add frequency statistics
                frequency: mostFrequent ? mostFrequent.frequency : 0,
                frequencyPercentage: percentage,
                mostFrequentCode: mostFrequent ? mostFrequent.code : hybridName
            });
        }

        console.log('✅ Themes generated, checking for duplicates...');
        
        // Check for duplicate theme names and fix them
        const themesWithUniqueness = this.ensureUniqueThemeNames(themes);
        
        console.log('✅ All themes validated, sorting by idea count...');
        return themesWithUniqueness.sort((a, b) => b.ideaCount - a.ideaCount);
    }
    
    // Generate conceptual description for a theme
    // Leave blank - user will manually add descriptions
    generateConceptualDescription(themeName, codes, ideas) {
        // Return empty string - user will add their own research-based description
        return '';
    }
    
    // Ensure all theme names are unique
    ensureUniqueThemeNames(themes) {
        const namesSeen = new Map(); // name -> count
        const uniqueThemes = [];
        
        for (const theme of themes) {
            let baseName = theme.name;
            const lowerName = baseName.toLowerCase();
            
            // Check if we've seen this name before
            if (namesSeen.has(lowerName)) {
                const count = namesSeen.get(lowerName);
                console.log(`⚠️ Duplicate theme name detected: "${baseName}"`);
                
                // Try to find a distinguishing feature from the codes
                const distinctivePhrase = this.findDistinctivePhrase(theme.allCodes, uniqueThemes.map(t => t.allCodes).flat());
                
                if (distinctivePhrase && distinctivePhrase.toLowerCase() !== lowerName) {
                    baseName = this.cleanAndCapitalize(distinctivePhrase);
                    console.log(`   → Renamed to: "${baseName}"`);
                } else {
                    // Fallback: add specificity
                    baseName = `${baseName} (${count + 1})`;
                    console.log(`   → Numbered as: "${baseName}"`);
                }
                
                namesSeen.set(lowerName, count + 1);
            } else {
                namesSeen.set(lowerName, 1);
            }
            
            uniqueThemes.push({
                ...theme,
                name: baseName
            });
        }
        
        return uniqueThemes;
    }
    
    // Find a distinctive phrase that differentiates this cluster from others
    findDistinctivePhrase(clusterCodes, otherCodes) {
        // Find words/phrases unique to this cluster
        const clusterText = clusterCodes.join(' ').toLowerCase();
        const otherText = otherCodes.join(' ').toLowerCase();
        
        const clusterWords = clusterText.split(/\s+/).filter(w => w.length > 3 && !this.stopWords.has(w));
        const otherWords = new Set(otherText.split(/\s+/));
        
        // Find words that appear in this cluster but not much in others
        const distinctiveWords = clusterWords.filter(word => {
            const clusterCount = clusterWords.filter(w => w === word).length;
            const otherCount = [...otherWords].filter(w => w === word).length;
            return clusterCount > otherCount * 2; // At least 2x more common in this cluster
        });
        
        if (distinctiveWords.length === 0) {
            return null;
        }
        
        // Try to find a 2-3 word phrase with distinctive words
        for (const code of clusterCodes) {
            const codeLower = code.toLowerCase();
            for (const word of distinctiveWords) {
                if (codeLower.includes(word)) {
                    // Found a code with a distinctive word - use it
                    return code;
                }
            }
        }
        
        return null;
    }

    // Extract main concept from cluster by finding most representative code
    // v3.7.0: NOW USES MOST FREQUENT CODE (participant voice!)
    extractMainConcept(cluster) {
        console.log(`🔍 Extracting concept from cluster with ${cluster.codes.length} codes`);
        
        // Get all codes as complete phrases
        const codes = cluster.codes.map(c => c.code);
        
        // Log first few codes to see what we're working with
        console.log(`   Sample codes:`, codes.slice(0, 5));
        
        // NEW v3.7.0: Use getMostFrequentCode to find what participants said MOST
        const mostFrequent = this.getMostFrequentCode(cluster);
        
        if (mostFrequent) {
            console.log(`   📊 Most frequent: "${mostFrequent.code}" (n=${mostFrequent.frequency}, ${mostFrequent.percentage}%)`);
            
            // Check if most frequent code is garbled
            if (!this.seemsGarbled(mostFrequent.code)) {
                console.log(`   ✅ Using most frequent code as theme (participant voice!)`);
                return this.cleanAndCapitalize(mostFrequent.code);
            } else {
                console.log(`   ⚠️ Most frequent code is garbled, falling back to scoring...`);
            }
        }
        
        // FALLBACK: If most frequent is garbled or not available, use scoring approach
        console.log(`   Using scoring approach for theme selection...`);
        
        // Filter out garbled codes first
        const cleanCodes = codes.filter(code => !this.seemsGarbled(code));
        const workingSet = cleanCodes.length > 0 ? cleanCodes : codes;
        
        console.log(`   Working with ${workingSet.length} clean codes`);
        
        // Score each code based on:
        // 1. FREQUENCY (NEW - most important!)
        // 2. Length (prefer 3-4 words)
        // 3. Specificity (not too generic)
        // 4. Semantic centrality
        let bestCode = workingSet[0];
        let bestScore = -1;
        
        for (const candidateCode of workingSet) {
            const words = candidateCode.split(' ');
            let score = 0;
            
            // 1. FREQUENCY SCORE (NEW - most important!)
            const frequency = this.codeFrequencies[candidateCode]?.count || 0;
            const freqScore = (frequency / this.primaryCodes.length) * 20; // Weight heavily
            score += freqScore;
            
            // 2. Length score (prefer 3-4 words)
            if (words.length === 3 || words.length === 4) {
                score += 3;
            } else if (words.length === 2) {
                score += 2;
            } else if (words.length >= 5) {
                score += 1;
            }
            
            // 3. Specificity score (avoid generic words)
            const genericWords = ['general', 'additional', 'regular', 'various', 'overall'];
            const hasGeneric = words.some(w => genericWords.includes(w.toLowerCase()));
            if (!hasGeneric) {
                score += 2;
            }
            
            // 4. Semantic centrality (how similar to other codes)
            let similaritySum = 0;
            for (const otherCode of workingSet) {
                if (candidateCode !== otherCode) {
                    similaritySum += this.calculateSimilarity(candidateCode, otherCode);
                }
            }
            const avgSimilarity = similaritySum / (workingSet.length - 1);
            score += avgSimilarity * 5;
            
            console.log(`   "${candidateCode}" → Freq: ${frequency}, Score: ${score.toFixed(2)}`);
            
            if (score > bestScore) {
                bestScore = score;
                bestCode = candidateCode;
            }
        }
        
        console.log(`   ✅ Selected: "${bestCode}" (score: ${bestScore.toFixed(2)})`);
        
        // Clean and capitalize, but DON'T reconstruct
        let concept = this.cleanAndCapitalize(bestCode);
        
        return concept;
    }
    
    // Check if a phrase seems garbled (repeated words, nonsensical patterns)
    seemsGarbled(phrase) {
        if (!phrase || phrase.trim() === '') return true;
        
        const words = phrase.toLowerCase().split(/\s+/).filter(w => w.length > 0);
        
        if (words.length === 0) return true;
        
        // Check for repeated words next to each other
        for (let i = 0; i < words.length - 1; i++) {
            if (words[i] === words[i + 1]) {
                console.log(`   ⚠️ Garbled: repeated word "${words[i]}"`);
                return true; // "Team Team" pattern
            }
        }
        
        // Check for repeated words at start and end
        if (words.length >= 3 && words[0] === words[words.length - 1]) {
            console.log(`   ⚠️ Garbled: "X ... X" pattern`);
            return true; // "Team Perspective Team" pattern
        }
        
        // Check for very short repeated patterns
        if (words.length === 2 && words[0] === words[1]) {
            return true; // "Area Area" pattern
        }
        
        return false;
    }
    
    // Extract a clean noun phrase from multiple codes
    extractCleanNounPhrase(codes) {
        // Find complete, meaningful phrases (2-4 words with actual content)
        const meaningfulPhrases = [];
        
        for (const code of codes) {
            const words = code.toLowerCase().split(' ').filter(w => w.length > 2);
            if (words.length >= 2 && words.length <= 4) {
                // This is a complete phrase
                meaningfulPhrases.push(code);
            }
        }
        
        if (meaningfulPhrases.length === 0) {
            // Fall back to longest code
            return codes.reduce((longest, current) => 
                current.length > longest.length ? current : longest, codes[0]);
        }
        
        // Find most common meaningful phrase
        const phraseFreq = {};
        for (const phrase of meaningfulPhrases) {
            const normalized = phrase.toLowerCase().trim();
            phraseFreq[normalized] = (phraseFreq[normalized] || 0) + 1;
        }
        
        // Get most frequent
        let bestPhrase = meaningfulPhrases[0];
        let maxFreq = 0;
        for (const [phrase, freq] of Object.entries(phraseFreq)) {
            if (freq > maxFreq) {
                maxFreq = freq;
                bestPhrase = phrase;
            }
        }
        
        return bestPhrase;
    }
    
    // Clean and properly capitalize a phrase
    cleanAndCapitalize(phrase) {
        if (!phrase) return '';
        
        // Remove extra spaces
        phrase = phrase.trim().replace(/\s+/g, ' ');
        
        // Split into words
        const words = phrase.split(' ');
        
        // Capitalize each word (except small conjunctions/prepositions if in middle)
        const smallWords = new Set(['of', 'for', 'and', 'the', 'to', 'in', 'on', 'at', 'by', 'with']);
        
        return words.map((word, index) => {
            // Always capitalize first word
            if (index === 0) {
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }
            // Don't capitalize small words in middle
            if (smallWords.has(word.toLowerCase())) {
                return word.toLowerCase();
            }
            // Capitalize other words
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(' ');
    }
    
    // Validate theme name for quality and fix common issues
    validateThemeName(themeName, codes) {
        if (!themeName || themeName.trim() === '') {
            // Fallback to first code if theme name is empty
            return this.cleanAndCapitalize(codes[0]?.code || 'Unnamed Theme');
        }
        
        // Remove any prefix remnants if they're duplicated
        const prefixes = ['Being', 'Embracing', 'Advocacy for', 'Presence of', 'Support of', 
                         'Willingness to', 'Policies that', 'Existence of', 'Ability to', 
                         'Understanding of', 'Norms of'];
        
        let cleaned = themeName;
        
        // Check for duplicate words (e.g., "Supportive Supportive Leadership")
        const words = cleaned.split(' ');
        const uniqueWords = [];
        for (let i = 0; i < words.length; i++) {
            // Don't add if same as previous word
            if (i === 0 || words[i].toLowerCase() !== words[i-1].toLowerCase()) {
                uniqueWords.push(words[i]);
            }
        }
        cleaned = uniqueWords.join(' ');
        
        // Check for "X Y X" patterns (e.g., "Team Perspective Team")
        if (this.seemsGarbled(cleaned)) {
            console.log(`⚠️ Detected garbled pattern: "${cleaned}"`);
            // Extract a clean phrase from the actual codes
            const cleanPhrase = this.extractCleanNounPhrase(codes.map(c => c.code));
            if (cleanPhrase && !this.seemsGarbled(cleanPhrase)) {
                console.log(`   → Replaced with: "${cleanPhrase}"`);
                cleaned = cleanPhrase;
            }
        }
        
        // Check for garbled patterns (single words that don't make sense, or very short themes)
        if (cleaned.split(' ').length === 1 && cleaned.length < 8) {
            // Single short word - likely garbled, try to get a better phrase
            console.log(`⚠️ Detected potentially garbled theme name: "${cleaned}"`);
            
            // Try to extract a better phrase from the codes
            const allCodesText = codes.map(c => c.code).join(' ');
            const betterPhrase = this.extractBestPhrase(allCodesText);
            
            if (betterPhrase && betterPhrase !== cleaned) {
                console.log(`   → Replaced with: "${betterPhrase}"`);
                cleaned = betterPhrase;
            }
        }
        
        // Check for incomplete phrases like "Based Experience Active" or "Practice Team"
        // These usually have adjectives/verbs without proper nouns
        if (this.seemsIncomplete(cleaned)) {
            console.log(`⚠️ Detected incomplete phrase: "${cleaned}"`);
            
            // Try to extract noun phrase from codes
            const nounPhrase = this.extractNounPhrase(codes);
            if (nounPhrase && nounPhrase !== cleaned) {
                console.log(`   → Replaced with: "${nounPhrase}"`);
                cleaned = nounPhrase;
            }
        }
        
        // Final validation: must have at least 2 words and reasonable length
        if (cleaned.split(' ').length < 2 || cleaned.length < 5) {
            // Last resort: use most common meaningful phrase from codes
            const fallback = this.extractFallbackPhrase(codes);
            console.log(`⚠️ Theme name too short: "${cleaned}" → "${fallback}"`);
            cleaned = fallback;
        }
        
        return this.cleanAndCapitalize(cleaned);
    }
    
    // Extract best phrase from text
    extractBestPhrase(text) {
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 3 && !this.stopWords.has(w));
        
        if (words.length < 2) return text;
        
        // Look for noun phrases (common patterns in organizational context)
        const nounIndicators = ['training', 'support', 'leadership', 'communication', 'resources', 
                               'development', 'management', 'policies', 'programs', 'systems',
                               'practices', 'processes', 'environment', 'culture', 'personnel'];
        
        // Find 2-3 word phrases containing nouns
        for (let i = 0; i < words.length - 1; i++) {
            const phrase2 = `${words[i]} ${words[i+1]}`;
            if (nounIndicators.some(n => phrase2.includes(n))) {
                return this.cleanAndCapitalize(phrase2);
            }
            
            if (i < words.length - 2) {
                const phrase3 = `${words[i]} ${words[i+1]} ${words[i+2]}`;
                if (nounIndicators.some(n => phrase3.includes(n))) {
                    return this.cleanAndCapitalize(phrase3);
                }
            }
        }
        
        // Default: return first 2-3 words
        return this.cleanAndCapitalize(words.slice(0, 2).join(' '));
    }
    
    // Check if phrase seems incomplete
    seemsIncomplete(phrase) {
        const words = phrase.toLowerCase().split(' ');
        
        // Incomplete if it's just adjectives/verbs without nouns
        const weakWords = ['based', 'active', 'practice', 'support', 'improve', 'better', 'more', 'less'];
        const hasOnlyWeakWords = words.every(w => weakWords.includes(w) || w.length < 4);
        
        return hasOnlyWeakWords;
    }
    
    // Extract clear noun phrase from codes
    extractNounPhrase(codes) {
        const allText = codes.map(c => c.code).join(' ').toLowerCase();
        const words = allText.replace(/[^\w\s]/g, ' ').split(/\s+/)
            .filter(w => w.length > 3 && !this.stopWords.has(w));
        
        // Count word frequency
        const freq = {};
        words.forEach(w => freq[w] = (freq[w] || 0) + 1);
        
        // Get most common nouns
        const commonNouns = ['training', 'support', 'leadership', 'communication', 'resources',
                           'development', 'management', 'policies', 'programs', 'time',
                           'staff', 'personnel', 'workload', 'environment', 'culture'];
        
        const foundNouns = Object.entries(freq)
            .filter(([word]) => commonNouns.includes(word))
            .sort((a, b) => b[1] - a[1]);
        
        if (foundNouns.length > 0) {
            const mainNoun = foundNouns[0][0];
            
            // Find adjective that goes with this noun
            for (let i = 0; i < words.length - 1; i++) {
                if (words[i+1] === mainNoun) {
                    return this.cleanAndCapitalize(`${words[i]} ${mainNoun}`);
                }
            }
            
            return this.cleanAndCapitalize(mainNoun);
        }
        
        // Fallback: most common 2-word phrase
        return this.extractBestPhrase(allText);
    }
    
    // Last resort fallback phrase
    extractFallbackPhrase(codes) {
        const allText = codes.map(c => c.code).join(' ');
        const words = allText.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 3 && !this.stopWords.has(w));
        
        // Get 2 most common words
        const freq = {};
        words.forEach(w => freq[w] = (freq[w] || 0) + 1);
        const top2 = Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(([w]) => w);
        
        return this.cleanAndCapitalize(top2.join(' ') || 'Organizational Theme');
    }

    // Convert verb to gerund form
    toGerund(verb) {
        if (!verb) return 'addressing';
        
        // Handle common patterns
        if (verb.endsWith('e') && !verb.endsWith('ee')) {
            return verb.slice(0, -1) + 'ing'; // create -> creating
        }
        if (verb.match(/[^aeiou][aeiou][^aeiou]$/)) {
            return verb + verb.slice(-1) + 'ing'; // run -> running
        }
        return verb + 'ing';
    }

    // Extract nouns from codes
    extractNouns(codes) {
        // Simple noun detection - words that appear frequently
        const wordFreq = {};
        
        codes.forEach(code => {
            const words = code.split(/\s+/);
            words.forEach(word => {
                if (word.length > 3 && !this.stopWords.has(word)) {
                    wordFreq[word] = (wordFreq[word] || 0) + 1;
                }
            });
        });

        return Object.keys(wordFreq)
            .sort((a, b) => wordFreq[b] - wordFreq[a])
            .slice(0, 3)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1));
    }

    // Extract qualifiers (adjectives)
    extractQualifiers(codes) {
        const qualifiers = ['insufficient', 'inadequate', 'limited', 'poor', 'weak', 'outdated', 'inconsistent', 'fragmented', 'ineffective', 'suboptimal'];
        const found = [];
        
        codes.forEach(code => {
            qualifiers.forEach(q => {
                if (code.includes(q) && !found.includes(q)) {
                    found.push(q.charAt(0).toUpperCase() + q.slice(1));
                }
            });
        });

        return found;
    }

    // Get most frequent item
    getMostFrequent(arr) {
        if (!arr.length) return null;
        
        const freq = {};
        arr.forEach(item => {
            freq[item] = (freq[item] || 0) + 1;
        });

        return Object.keys(freq)
            .sort((a, b) => freq[b] - freq[a])[0];
    }

    // Infer action verb from context
    inferActionVerb(codes) {
        const codeText = codes.join(' ').toLowerCase();
        
        // Common patterns
        if (codeText.includes('lack') || codeText.includes('insufficient') || codeText.includes('inadequate')) {
            return 'strengthen';
        }
        if (codeText.includes('outdated') || codeText.includes('legacy')) {
            return 'upgrade';
        }
        if (codeText.includes('inconsistent') || codeText.includes('variation')) {
            return 'standardize';
        }
        if (codeText.includes('barrier') || codeText.includes('silo')) {
            return 'break';
        }
        if (codeText.includes('gap') || codeText.includes('missing')) {
            return 'bridge';
        }
        
        return 'improve';
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CodingEngine;
}
