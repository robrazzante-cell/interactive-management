// Data Analysis Log System
// Implements detailed evidence tracking for phronetic-iterative coding
// Based on Tracy (2020) - Qualitative Research Methods

class CodingLog {
    constructor() {
        this.log = {
            projectId: null,
            projectTitle: null,
            timestamp: new Date().toISOString(),
            methodology: 'Phronetic-Iterative Analysis with Primary and Secondary Cycle Coding',
            methodologyReference: 'Tracy, S. J. (2020). Qualitative Research Methods: Collecting Evidence, Crafting Analysis, Communicating Impact. Wiley.',
            
            // Data source
            dataSource: {
                totalIdeas: 0,
                dateRange: null,
                participantCount: 0
            },
            
            // Primary cycle coding
            primaryCycle: {
                startTime: null,
                endTime: null,
                duration: null,
                initialCodes: [],
                codeFrequencies: {},
                extractionMethod: 'Keyword extraction, phrase analysis, and concept identification',
                immersionNotes: []
            },
            
            // Secondary cycle coding
            secondaryCycle: {
                startTime: null,
                endTime: null,
                duration: null,
                clusteringMethod: 'Semantic similarity and frequency-based clustering',
                targetThemeCount: 0,
                actualThemeCount: 0,
                themes: []
            },
            
            // Theme development
            themeEvidence: [],
            
            // Audit trail
            decisions: [],
            revisions: []
        };
    }

    // Initialize log for a project
    startLog(projectId, projectTitle, ideas) {
        // Validate ideas parameter - DON'T throw error, just return
        if (!ideas || !Array.isArray(ideas)) {
            console.error('❌ CodingLog.startLog ERROR: ideas is not an array:', ideas);
            console.error('❌ Received parameters:', { projectId, projectTitle, ideasType: typeof ideas });
            console.error('❌ Logging will be skipped, but theme generation will continue');
            return; // Don't throw - just skip logging
        }
        
        if (ideas.length === 0) {
            console.warn('⚠️ CodingLog.startLog WARNING: ideas array is empty');
            return; // Don't log empty data
        }
        
        console.log(`📋 CodingLog.startLog: Processing ${ideas.length} ideas...`);
        
        try {
            this.log.projectId = projectId;
            this.log.projectTitle = projectTitle;
            this.log.dataSource.totalIdeas = ideas.length;
            
            // Safe participant count with validation
            const validIdeas = ideas.filter(i => i && i.participant_id);
            this.log.dataSource.participantCount = new Set(validIdeas.map(i => i.participant_id)).size;
        
            // Calculate date range with safe date handling
            const validDates = ideas
                .map(i => i.created_at)
                .filter(d => d != null)
                .map(d => new Date(d))
                .filter(d => !isNaN(d.getTime()));
            
            if (validDates.length > 0) {
                this.log.dataSource.dateRange = {
                    start: new Date(Math.min(...validDates.map(d => d.getTime()))).toISOString(),
                    end: new Date(Math.max(...validDates.map(d => d.getTime()))).toISOString()
                };
            }
            
            console.log('✅ Coding log initialized successfully for project:', projectTitle);
        } catch (error) {
            console.error('❌ Error in CodingLog.startLog:', error);
            console.error('❌ Logging will be incomplete but theme generation will continue');
            // Don't throw - allow theme generation to proceed
        }
    }

    // Log primary cycle coding
    logPrimaryCycle(codes, immersionNotes = []) {
        // Validate codes parameter - DON'T throw, just return
        if (!codes || !Array.isArray(codes)) {
            console.error('❌ CodingLog.logPrimaryCycle ERROR: codes is not an array:', codes);
            console.error('❌ Primary cycle logging skipped');
            return; // Don't throw - just skip logging
        }
        
        if (codes.length === 0) {
            console.warn('⚠️ CodingLog.logPrimaryCycle: No codes to log');
            return;
        }
        
        try {
            console.log(`📋 Logging primary cycle: ${codes.length} codes`);
            
            this.log.primaryCycle.startTime = new Date().toISOString();
            this.log.primaryCycle.initialCodes = codes.map(c => ({
                code: c && c.code ? c.code : 'unknown',
                frequency: c && c.frequency ? c.frequency : 0,
                ideaCount: c && c.ideaIds ? c.ideaIds.length : 0,
                sampleContext: c && c.contexts && c.contexts[0] ? c.contexts[0] : ''
            }));
            
            // Calculate code frequencies safely
            codes.forEach(c => {
                if (c && c.code && c.frequency != null) {
                    this.log.primaryCycle.codeFrequencies[c.code] = c.frequency;
                }
            });
        
            this.log.primaryCycle.immersionNotes = immersionNotes || [];
            this.log.primaryCycle.endTime = new Date().toISOString();
            this.log.primaryCycle.duration = this.calculateDuration(
                this.log.primaryCycle.startTime, 
                this.log.primaryCycle.endTime
            );
            
            console.log('✅ Primary cycle logged successfully:', codes.length, 'codes');
        } catch (error) {
            console.error('❌ Error in logPrimaryCycle:', error);
            console.error('❌ Primary cycle logging incomplete');
            // Don't throw - allow theme generation to continue
        }
    }

    // Log secondary cycle coding
    logSecondaryCycle(themes, targetCount) {
        // Validate themes parameter - DON'T throw, just return
        if (!themes || !Array.isArray(themes)) {
            console.error('❌ CodingLog.logSecondaryCycle ERROR: themes is not an array:', themes);
            console.error('❌ Secondary cycle logging skipped');
            return; // Don't throw - just skip logging
        }
        
        if (themes.length === 0) {
            console.warn('⚠️ CodingLog.logSecondaryCycle: No themes to log');
            return;
        }
        
        try {
            console.log(`📋 Logging secondary cycle: ${themes.length} themes`);
            
            this.log.secondaryCycle.startTime = new Date().toISOString();
            this.log.secondaryCycle.targetThemeCount = targetCount || themes.length;
            this.log.secondaryCycle.actualThemeCount = themes.length;
            
            // SAFE theme mapping with validation
            this.log.secondaryCycle.themes = themes.map(t => ({
                name: t && t.name ? t.name : 'Unnamed Theme',
                ideaCount: t && t.ideaCount ? t.ideaCount : (t && t.ideas && Array.isArray(t.ideas) ? t.ideas.length : 0),
                primaryCodes: t && t.primaryCodes ? t.primaryCodes : (t && t.codes ? t.codes : []),
                description: t && t.description ? t.description : ''
            }));
            
            this.log.secondaryCycle.endTime = new Date().toISOString();
            this.log.secondaryCycle.duration = this.calculateDuration(
                this.log.secondaryCycle.startTime,
                this.log.secondaryCycle.endTime
            );
            
            console.log('✅ Secondary cycle logged successfully:', themes.length, 'themes');
        } catch (error) {
            console.error('❌ Error in logSecondaryCycle:', error);
            console.error('❌ Secondary cycle logging incomplete');
            // Don't throw - allow theme generation to continue
        }
    }

    // Log theme evidence
    logThemeEvidence(themeName, ideas, primaryCodes, rationale) {
        const evidence = {
            themeName: themeName,
            ideaCount: ideas.length,
            ideas: ideas.map(idea => ({
                id: idea.id,
                text: idea.idea_text,
                participantId: idea.participant_id,
                primaryCodes: this.extractCodesForIdea(idea.id, primaryCodes)
            })),
            primaryCodes: primaryCodes.map(c => ({
                code: c.code,
                frequency: c.frequency,
                relevance: 'High' // Could be calculated
            })),
            rationale: rationale,
            dateLogged: new Date().toISOString()
        };
        
        this.log.themeEvidence.push(evidence);
        console.log('📌 Evidence logged for theme:', themeName);
    }

    // Log analytical decisions
    logDecision(decision, rationale) {
        this.log.decisions.push({
            timestamp: new Date().toISOString(),
            decision: decision,
            rationale: rationale
        });
        console.log('💡 Decision logged:', decision);
    }

    // Log revisions
    logRevision(themeId, themeName, changeType, oldValue, newValue, reason) {
        this.log.revisions.push({
            timestamp: new Date().toISOString(),
            themeId: themeId,
            themeName: themeName,
            changeType: changeType,
            oldValue: oldValue,
            newValue: newValue,
            reason: reason
        });
        console.log('✏️ Revision logged for theme:', themeName);
    }

    // Extract codes for a specific idea
    extractCodesForIdea(ideaId, allCodes) {
        return allCodes
            .filter(c => {
                if (!c.ideaIds) return false;
                
                // Convert to array if needed
                let ideaIdsArray;
                if (Array.isArray(c.ideaIds)) {
                    ideaIdsArray = c.ideaIds;
                } else if (c.ideaIds instanceof Set) {
                    ideaIdsArray = Array.from(c.ideaIds);
                } else if (typeof c.ideaIds === 'object') {
                    ideaIdsArray = Object.values(c.ideaIds);
                } else {
                    return false;
                }
                
                return ideaIdsArray.includes(ideaId);
            })
            .map(c => c.code);
    }

    // Calculate duration between two timestamps
    calculateDuration(start, end) {
        const startTime = new Date(start);
        const endTime = new Date(end);
        const durationMs = endTime - startTime;
        const seconds = Math.floor(durationMs / 1000);
        const minutes = Math.floor(seconds / 60);
        
        if (minutes > 0) {
            return `${minutes} minute(s) ${seconds % 60} second(s)`;
        }
        return `${seconds} second(s)`;
    }

    // Generate comprehensive report
    generateReport() {
        return {
            ...this.log,
            reportGenerated: new Date().toISOString(),
            summary: this.generateSummary()
        };
    }

    // Generate summary
    generateSummary() {
        return {
            overview: `Phronetic-iterative analysis of ${this.log.dataSource.totalIdeas} participant ideas, resulting in ${this.log.secondaryCycle.actualThemeCount} themes through two-cycle coding process.`,
            primaryCycle: `Initial coding identified ${this.log.primaryCycle.initialCodes.length} distinct codes through keyword extraction and phrase analysis.`,
            secondaryCycle: `Secondary cycle consolidated codes into ${this.log.secondaryCycle.actualThemeCount} themes using semantic clustering and frequency analysis.`,
            evidence: `Detailed evidence maintained for all ${this.log.themeEvidence.length} themes, including primary codes, idea mappings, and analytical rationale.`,
            auditTrail: `${this.log.decisions.length} analytical decisions and ${this.log.revisions.length} revisions documented for transparency and reproducibility.`
        };
    }

    // Export as JSON
    exportJSON() {
        return JSON.stringify(this.generateReport(), null, 2);
    }

    // Export as formatted text report
    exportTextReport() {
        const report = this.generateReport();
        let text = '';
        
        text += '═══════════════════════════════════════════════════════════════\n';
        text += '                    DATA ANALYSIS LOG                          \n';
        text += '           Phronetic-Iterative Qualitative Coding              \n';
        text += '═══════════════════════════════════════════════════════════════\n\n';
        
        text += `PROJECT: ${report.projectTitle}\n`;
        text += `PROJECT ID: ${report.projectId}\n`;
        text += `ANALYSIS DATE: ${new Date(report.timestamp).toLocaleDateString()}\n`;
        text += `REPORT GENERATED: ${new Date(report.reportGenerated).toLocaleString()}\n\n`;
        
        text += '───────────────────────────────────────────────────────────────\n';
        text += 'METHODOLOGY\n';
        text += '───────────────────────────────────────────────────────────────\n\n';
        text += `Approach: ${report.methodology}\n`;
        text += `Reference: ${report.methodologyReference}\n\n`;
        
        text += '───────────────────────────────────────────────────────────────\n';
        text += 'DATA SOURCE\n';
        text += '───────────────────────────────────────────────────────────────\n\n';
        text += `Total Ideas Analyzed: ${report.dataSource.totalIdeas}\n`;
        text += `Unique Participants: ${report.dataSource.participantCount}\n`;
        if (report.dataSource.dateRange) {
            text += `Data Collection Period: ${new Date(report.dataSource.dateRange.start).toLocaleDateString()} to ${new Date(report.dataSource.dateRange.end).toLocaleDateString()}\n`;
        }
        text += '\n';
        
        text += '───────────────────────────────────────────────────────────────\n';
        text += 'PRIMARY CYCLE CODING\n';
        text += '───────────────────────────────────────────────────────────────\n\n';
        text += `Start Time: ${new Date(report.primaryCycle.startTime).toLocaleString()}\n`;
        text += `End Time: ${new Date(report.primaryCycle.endTime).toLocaleString()}\n`;
        text += `Duration: ${report.primaryCycle.duration}\n`;
        text += `Method: ${report.primaryCycle.extractionMethod}\n`;
        text += `Initial Codes Identified: ${report.primaryCycle.initialCodes.length}\n\n`;
        
        // Show ALL primary codes (not just top 10)
        text += `Primary Cycle Codes (All ${report.primaryCycle.initialCodes.length} codes):\n`;
        text += '(Showing codes with frequency >= 3 for readability)\n\n';
        
        // Filter codes with frequency >= 3 for the report (or all if fewer than 50)
        const significantCodes = report.primaryCycle.initialCodes.length <= 50 
            ? report.primaryCycle.initialCodes 
            : report.primaryCycle.initialCodes.filter(c => c.frequency >= 3);
        
        significantCodes.forEach((code, i) => {
            text += `  ${i + 1}. "${code.code}" - Frequency: ${code.frequency}, Ideas: ${code.ideaCount}\n`;
        });
        
        if (report.primaryCycle.initialCodes.length > significantCodes.length) {
            const omittedCount = report.primaryCycle.initialCodes.length - significantCodes.length;
            text += `\n  ... and ${omittedCount} additional codes with frequency < 3\n`;
        }
        text += '\n';
        
        text += '───────────────────────────────────────────────────────────────\n';
        text += 'SECONDARY CYCLE CODING\n';
        text += '───────────────────────────────────────────────────────────────\n\n';
        text += `Start Time: ${new Date(report.secondaryCycle.startTime).toLocaleString()}\n`;
        text += `End Time: ${new Date(report.secondaryCycle.endTime).toLocaleString()}\n`;
        text += `Duration: ${report.secondaryCycle.duration}\n`;
        text += `Method: ${report.secondaryCycle.clusteringMethod}\n`;
        text += `Target Theme Count: ${report.secondaryCycle.targetThemeCount}\n`;
        text += `Actual Themes Generated: ${report.secondaryCycle.actualThemeCount}\n\n`;
        
        text += 'Generated Themes:\n';
        report.secondaryCycle.themes.forEach((theme, i) => {
            text += `  ${i + 1}. ${theme.name}\n`;
            text += `     - Ideas: ${theme.ideaCount}\n`;
            text += `     - Primary Codes: ${theme.primaryCodes.length}\n`;
            if (theme.description) {
                text += `     - Description: ${theme.description}\n`;
            }
        });
        text += '\n';
        
        text += '───────────────────────────────────────────────────────────────\n';
        text += 'THEME EVIDENCE\n';
        text += '───────────────────────────────────────────────────────────────\n\n';
        
        report.themeEvidence.forEach((evidence, i) => {
            text += `THEME ${i + 1}: ${evidence.themeName}\n`;
            text += `Ideas Coded: ${evidence.ideaCount}\n`;
            text += `Primary Codes: ${evidence.primaryCodes.map(c => c.code).join(', ')}\n`;
            text += `Rationale: ${evidence.rationale}\n`;
            text += `Date Logged: ${new Date(evidence.dateLogged).toLocaleString()}\n\n`;
            
            text += `Sample Ideas (first 5):\n`;
            evidence.ideas.slice(0, 5).forEach((idea, j) => {
                text += `  ${j + 1}. "${idea.text.substring(0, 100)}${idea.text.length > 100 ? '...' : ''}"\n`;
                text += `     Codes: ${idea.primaryCodes.join(', ')}\n`;
            });
            text += '\n';
        });
        
        if (report.decisions.length > 0) {
            text += '───────────────────────────────────────────────────────────────\n';
            text += 'ANALYTICAL DECISIONS\n';
            text += '───────────────────────────────────────────────────────────────\n\n';
            
            report.decisions.forEach((decision, i) => {
                text += `${i + 1}. [${new Date(decision.timestamp).toLocaleString()}]\n`;
                text += `   Decision: ${decision.decision}\n`;
                text += `   Rationale: ${decision.rationale}\n\n`;
            });
        }
        
        if (report.revisions.length > 0) {
            text += '───────────────────────────────────────────────────────────────\n';
            text += 'REVISIONS\n';
            text += '───────────────────────────────────────────────────────────────\n\n';
            
            report.revisions.forEach((revision, i) => {
                text += `${i + 1}. [${new Date(revision.timestamp).toLocaleString()}] ${revision.themeName}\n`;
                text += `   Type: ${revision.changeType}\n`;
                text += `   Old: ${revision.oldValue}\n`;
                text += `   New: ${revision.newValue}\n`;
                text += `   Reason: ${revision.reason}\n\n`;
            });
        }
        
        text += '───────────────────────────────────────────────────────────────\n';
        text += 'SUMMARY\n';
        text += '───────────────────────────────────────────────────────────────\n\n';
        text += `${report.summary.overview}\n\n`;
        text += `${report.summary.primaryCycle}\n\n`;
        text += `${report.summary.secondaryCycle}\n\n`;
        text += `${report.summary.evidence}\n\n`;
        text += `${report.summary.auditTrail}\n\n`;
        
        text += '═══════════════════════════════════════════════════════════════\n';
        text += '                      END OF REPORT                             \n';
        text += '═══════════════════════════════════════════════════════════════\n';
        
        return text;
    }
}

// Global coding log instance
let codingLog = new CodingLog();

// View data analysis log
function viewDataAnalysisLog() {
    if (!codingLog.log.projectId) {
        showToast('No coding analysis has been performed yet', 'info');
        return;
    }
    
    const report = codingLog.exportTextReport();
    
    // Create modal to display the log
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;';
    
    modal.innerHTML = `
        <div style="background: white; width: 90%; max-width: 1000px; max-height: 90vh; border-radius: 0.5rem; overflow: hidden; display: flex; flex-direction: column;">
            <div style="padding: 1.5rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: var(--forest-green); color: white;">
                <h2 style="margin: 0; color: white;"><i class="fas fa-file-alt"></i> Data Analysis Log</h2>
                <button onclick="this.closest('.modal').remove()" style="background: transparent; border: none; color: white; font-size: 1.5rem; cursor: pointer; padding: 0; width: 32px; height: 32px;">&times;</button>
            </div>
            <div style="padding: 2rem; overflow-y: auto; flex: 1; font-family: monospace; white-space: pre-wrap; font-size: 0.85rem; line-height: 1.6; background: #f7fafc;">
${report}
            </div>
            <div style="padding: 1rem; border-top: 1px solid #e2e8f0; display: flex; gap: 1rem; justify-content: flex-end; background: #f7fafc;">
                <button onclick="downloadCodingLog('text')" class="btn btn-secondary">
                    <i class="fas fa-download"></i> Download as Text
                </button>
                <button onclick="downloadCodingLog('json')" class="btn btn-secondary">
                    <i class="fas fa-download"></i> Download as JSON
                </button>
                <button onclick="this.closest('.modal').remove()" class="btn btn-primary">
                    Close
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Download coding log
function downloadCodingLog(format = 'text') {
    const projectTitle = codingLog.log.projectTitle || 'Project';
    const timestamp = new Date().toISOString().split('T')[0];
    
    let content, filename, mimeType;
    
    if (format === 'json') {
        content = codingLog.exportJSON();
        filename = `${projectTitle.replace(/\s+/g, '_')}_Coding_Log_${timestamp}.json`;
        mimeType = 'application/json';
    } else {
        content = codingLog.exportTextReport();
        filename = `${projectTitle.replace(/\s+/g, '_')}_Coding_Log_${timestamp}.txt`;
        mimeType = 'text/plain';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast(`Coding log downloaded as ${filename}`, 'success');
}
