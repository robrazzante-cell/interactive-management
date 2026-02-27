// Email Service Module
// Handles actual email sending via mailto or third-party services

const EmailService = {
    // Helper function to convert to gerund form
    makeGerund: function(text) {
        if (!text) return text;

        // Common patterns for converting to gerund
        text = text.trim();

        // If it already ends with "ing", return as-is
        if (text.endsWith('ing')) return text;

        // If starts with "to ", convert to gerund
        if (text.toLowerCase().startsWith('to ')) {
            text = text.substring(3).trim();
        }

        // Simple gerund rules
        if (text.endsWith('e') && !text.endsWith('ee')) {
            return text.slice(0, -1) + 'ing';
        } else if (text.match(/[^aeiou][aeiou][^aeiou]$/)) {
            // Double consonant for CVC pattern
            return text + text.slice(-1) + 'ing';
        } else {
            return text + 'ing';
        }
    },

    // Helper: prepend "the" to org name if flag is set
    theOrg: function(org, useThe) {
        if (!org) return '';
        return useThe ? 'the ' + org : org;
    },

    // Email templates
    templates: {
        ideaGeneration: {
            getSubject: (projectTitle) => `Collective Intelligence: Idea Generation`,
            getBody: (data) => {
                const contextStatement = data.contextStatement || '';
                const displayOrg = EmailService.theOrg(data.organization, data.orgUseThe);
                const orgBranding = displayOrg || 'Interactive Management Platform';
                return `Dear ${data.participantName},

Your organization is committed to ${contextStatement}.

Consider this question: ${data.triggerQuestion}

Please enter your responses here:
${data.participantLink}

Thank you for your participation!

${orgBranding}`;
            }
        },

        factorVoting: {
            getSubject: (projectTitle) => `Collective Intelligence: Voting`,
            getBody: (data) => {
                const displayOrg = EmailService.theOrg(data.organization, data.orgUseThe);
                const orgName = displayOrg || 'Your organization';
                const orgBranding = displayOrg || 'Interactive Management Platform';

                const factorCount = data.factors.length;

                return `Dear ${data.participantName},

Your organization is committed to ${data.contextStatement} and your continued input is valued.

From the idea generation task, ${orgName} as an organization identified ${factorCount} primary influential factors.

Factors for Voting:
${data.factors.map((f, i) => {
    return `${i + 1}. ${f.factor_name}${f.clarification ? ' - ' + f.clarification : ''}`;
}).join('\n')}

Please dedicate 20-30 minutes to complete your next task. This exercise will help indicate which of these factors are most influential for ${data.contextStatement}.

Please click your personal link here to begin voting:
${data.participantLink}

Thank you for your participation!

${orgBranding}`;
            }
        },

        reminder: {
            getSubject: (projectTitle, type) => `Reminder: ${type === 'idea_generation' ? 'Idea Generation' : 'Factor Voting'} - ${projectTitle}`,
            getBody: (data) => {
                const displayOrg = EmailService.theOrg(data.organization, data.orgUseThe);
                const orgBranding = displayOrg || 'Interactive Management Platform';
                return `Dear ${data.participantName},

This is a friendly reminder to complete the ${data.campaignType === 'idea_generation' ? 'idea generation' : 'factor voting'} task for: ${data.projectTitle}

${data.campaignType === 'idea_generation' ?
    'Your organization is committed to ' + data.contextStatement + '. Please take a moment to respond to this question with as many ideas and clarifications as you\'d like. Please list one idea at a time.' :
    'Your organization is committed to ' + data.contextStatement + '. Please dedicate 20-30 minutes to complete this voting exercise.'}

Your personal link:
${data.participantLink}

Thank you!

${orgBranding}`;
            }
        },

        projectResults: {
            getSubject: (projectTitle) => `Collective Intelligence: Final Report`,
            getBody: (data) => {
                const displayOrg = EmailService.theOrg(data.organization, data.orgUseThe);
                const orgBranding = displayOrg || 'Interactive Management Platform';
                const reportLine = data.reportUrl ? `\nYou can view and download the full report at the link below:\n${data.reportUrl}\n` : '';
                return `Dear ${data.participantName},

Thank you for participating in ${data.projectTitle}'s Collective Intelligence project!

The project is complete, and we're pleased to share the final results with you.
${reportLine}
Thank you for your valuable contribution to this project.

Sincerely,

${orgBranding}`;
            }
        }
    },

    // Send email using mailto (opens email client)
    sendViaMailto: function(to, subject, body) {
        const mailtoLink = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailtoLink, '_blank');
    },

    // Send multiple emails via mailto (batch)
    sendBatchViaMailto: function(emails) {
        let successCount = 0;

        emails.forEach((email, index) => {
            setTimeout(() => {
                this.sendViaMailto(email.to, email.subject, email.body);
                successCount++;

                // Show progress
                if (successCount === emails.length) {
                    setTimeout(() => {
                        alert(`Email client opened for ${successCount} email(s).\n\nPlease send the emails from your email client.`);
                    }, 500);
                }
            }, index * 500); // Stagger by 500ms to avoid browser blocking
        });

        return successCount;
    },

    // Generate email content for idea generation
    generateIdeaGenerationEmail: function(participant, project) {
        // Get the correct base URL (handles both preview and production)
        const baseUrl = window.location.href.includes('/preview/')
            ? window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'))
            : window.location.origin;
        const participantLink = `${baseUrl}/participant.html?token=${participant.access_token}`;

        return {
            to: participant.email,
            subject: this.templates.ideaGeneration.getSubject(project.title || project.project_title),
            body: this.templates.ideaGeneration.getBody({
                participantName: participant.name || participant.full_name,
                contextStatement: project.context_statement,
                triggerQuestion: project.trigger_question,
                participantLink: participantLink,
                organization: project.organization,
                orgUseThe: project.org_use_the
            })
        };
    },

    // Generate email content for factor voting
    generateVotingEmail: function(participant, project, factors) {
        // Get the correct base URL (handles both preview and production)
        const baseUrl = window.location.href.includes('/preview/')
            ? window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'))
            : window.location.origin;
        // Use participant-voting.html for ISM voting emails
        const participantLink = `${baseUrl}/participant-voting.html?token=${participant.access_token}`;

        return {
            to: participant.email,
            subject: this.templates.factorVoting.getSubject(project.title || project.project_title),
            body: this.templates.factorVoting.getBody({
                participantName: participant.name || participant.full_name,
                contextStatement: project.context_statement,
                factors: factors,
                participantLink: participantLink,
                organization: project.organization,
                orgUseThe: project.org_use_the
            })
        };
    },

    // Generate reminder email
    generateReminderEmail: function(participant, project, campaignType) {
        // Get the correct base URL (handles both preview and production)
        const baseUrl = window.location.href.includes('/preview/')
            ? window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'))
            : window.location.origin;
        const participantLink = `${baseUrl}/participant.html?token=${participant.access_token}`;

        return {
            to: participant.email,
            subject: this.templates.reminder.getSubject(project.title || project.project_title, campaignType),
            body: this.templates.reminder.getBody({
                participantName: participant.name || participant.full_name,
                projectTitle: project.title || project.project_title,
                campaignType: campaignType,
                contextStatement: project.context_statement,
                participantLink: participantLink,
                organization: project.organization,
                orgUseThe: project.org_use_the
            })
        };
    },

    // Generate project results email
    generateResultsEmail: function(participant, project) {
        const reportUrl = window.location.origin + '/results.html?project=' + encodeURIComponent(project.id);

        return {
            to: participant.email,
            subject: this.templates.projectResults.getSubject(project.title || project.project_title),
            body: this.templates.projectResults.getBody({
                participantName: participant.name || participant.full_name,
                projectTitle: project.title || project.project_title,
                organization: project.organization,
                orgUseThe: project.org_use_the,
                reportUrl: reportUrl
            })
        };
    },

    // Generate categorization table HTML for email
    generateCategorizationTableHTML: function(projectId) {
        const saved = localStorage.getItem(`categorization_${projectId}`);

        if (!saved) {
            return '[No categorization data available. Please categorize factors in the Metastructure tab first.]';
        }

        let categoryData;
        try {
            categoryData = JSON.parse(saved);
        } catch (e) {
            return '[Error loading categorization data]';
        }

        if (!categoryData.columns || categoryData.columns.length === 0) {
            return '[No categories defined]';
        }

        // Generate plain text table for email
        let tableText = '\n';

        // Add headers
        const headers = categoryData.columns.map(col => col.name).join(' | ');
        tableText += headers + '\n';
        tableText += '-'.repeat(headers.length) + '\n';

        // Find max rows
        const maxRows = Math.max(...categoryData.columns.map(col => col.factors.length));

        // Add rows
        for (let i = 0; i < maxRows; i++) {
            const rowData = categoryData.columns.map(col => {
                const factor = col.factors[i];
                return factor ? factor.name : '';
            });
            tableText += rowData.join(' | ') + '\n';
        }

        return tableText;
    },

    // Show email preview modal
    showEmailPreview: function(emailData) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3><i class="fas fa-envelope"></i> Email Preview</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-section">
                        <label><strong>To:</strong></label>
                        <p style="color: #666;">${emailData.to}</p>
                    </div>
                    <div class="form-section">
                        <label><strong>Subject:</strong></label>
                        <p style="color: #666;">${emailData.subject}</p>
                    </div>
                    <div class="form-section">
                        <label><strong>Body:</strong></label>
                        <textarea readonly style="width: 100%; min-height: 300px; font-family: monospace; font-size: 0.9rem; padding: 1rem; border: 1px solid #ddd; border-radius: 0.375rem; background: #f9f9f9;">${emailData.body}</textarea>
                    </div>
                </div>
                <div class="modal-footer" style="display: flex; gap: 1rem; justify-content: flex-end; padding: 1rem; border-top: 1px solid #ddd;">
                    <button class="btn btn-outline" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn btn-primary" onclick="EmailService.sendViaMailto('${emailData.to}', '${emailData.subject.replace(/'/g, "\\'")}', \`${emailData.body.replace(/`/g, '\\`')}\`); this.closest('.modal').remove();">
                        <i class="fas fa-paper-plane"></i> Open in Email Client
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    // Copy email content to clipboard
    copyToClipboard: function(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);

        // Show toast notification
        if (typeof showToast === 'function') {
            showToast('Copied to clipboard!', 'success');
        }
    },

    // Show batch email options
    showBatchEmailOptions: function(emails, onComplete) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 650px;">
                <div class="modal-header">
                    <h3><i class="fas fa-envelope-open-text"></i> Send ${emails.length} Email(s)</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                        <div style="border: 2px solid #0B2B26; border-radius: 0.5rem; padding: 1.5rem; cursor: pointer; transition: all 0.2s;" onclick="EmailService.executeBatchSend(${JSON.stringify(emails).replace(/"/g, '&quot;')}, ${onComplete}); this.closest('.modal').remove();" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 16px rgba(0,0,0,0.1)';" onmouseout="this.style.transform=''; this.style.boxShadow='';">
                            <div style="text-align: center;">
                                <div style="font-size: 3rem; margin-bottom: 0.5rem;">
                                    <i class="fas fa-envelope" style="color: #0B2B26;"></i>
                                </div>
                                <h4 style="margin: 0 0 0.5rem 0; color: #0B2B26;">Email Client</h4>
                                <p style="font-size: 0.85rem; color: #666; margin: 0;">
                                    Opens in your default email app
                                </p>
                            </div>
                        </div>

                        <div style="border: 2px solid #666; border-radius: 0.5rem; padding: 1.5rem; cursor: pointer; transition: all 0.2s;" onclick="EmailService.sendAsBCC(${JSON.stringify(emails).replace(/"/g, '&quot;')}); this.closest('.modal').remove();" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 16px rgba(0,0,0,0.1)';" onmouseout="this.style.transform=''; this.style.boxShadow='';">
                            <div style="text-align: center;">
                                <div style="font-size: 3rem; margin-bottom: 0.5rem;">
                                    <i class="fas fa-users" style="color: #666;"></i>
                                </div>
                                <h4 style="margin: 0 0 0.5rem 0; color: #0B2B26;">BCC (All at once)</h4>
                                <p style="font-size: 0.85rem; color: #666; margin: 0;">
                                    One email with all recipients in BCC
                                </p>
                            </div>
                        </div>
                    </div>

                    <div style="background: #FAF3DD; padding: 1rem; border-radius: 0.375rem; margin-bottom: 1rem;">
                        <h4 style="margin: 0 0 0.5rem 0; color: #0B2B26;">Recipients (${emails.length}):</h4>
                        <div style="max-height: 200px; overflow-y: auto;">
                            ${emails.map(e => `
                                <div style="padding: 0.25rem 0; color: #666; font-size: 0.9rem;">
                                    <i class="fas fa-user"></i> ${e.to}
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div style="background: white; padding: 1rem; border-radius: 0.375rem; border: 1px solid #ddd;">
                        <h4 style="margin: 0 0 0.5rem 0; color: #0B2B26;">Email Preview:</h4>
                        <div style="font-size: 0.9rem; color: #666;">
                            <strong>Subject:</strong> ${emails[0].subject}
                        </div>
                        <div style="margin-top: 0.5rem; padding: 0.75rem; background: #f9f9f9; border-radius: 0.25rem; max-height: 200px; overflow-y: auto; font-size: 0.85rem; font-family: monospace; white-space: pre-wrap;">
${emails[0].body}
                        </div>
                    </div>
                </div>
                <div class="modal-footer" style="display: flex; gap: 1rem; justify-content: flex-end; padding: 1rem; border-top: 1px solid #ddd;">
                    <button class="btn btn-outline" onclick="EmailService.copyAllEmailsInfo(${JSON.stringify(emails).replace(/"/g, '&quot;')})">
                        <i class="fas fa-copy"></i> Copy All
                    </button>
                    <button class="btn btn-outline" onclick="this.closest('.modal').remove()">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    // Execute batch send
    executeBatchSend: function(emails, onComplete) {
        this.sendBatchViaMailto(emails);
        if (onComplete) {
            setTimeout(onComplete, 1000);
        }
    },

    // Copy all email info
    copyAllEmailsInfo: function(emails) {
        let text = 'EMAIL BATCH INFORMATION\n';
        text += '='.repeat(50) + '\n\n';

        emails.forEach((email, index) => {
            text += `EMAIL ${index + 1} of ${emails.length}\n`;
            text += '-'.repeat(50) + '\n';
            text += `To: ${email.to}\n`;
            text += `Subject: ${email.subject}\n\n`;
            text += `Body:\n${email.body}\n\n`;
            text += '='.repeat(50) + '\n\n';
        });

        this.copyToClipboard(text);
    },

    // Send as BCC
    sendAsBCC: function(emails) {
        if (emails.length === 0) return;

        const bccAddresses = emails.map(e => e.to).join(',');
        const subject = emails[0].subject;
        const body = emails[0].body;

        const mailtoLink = `mailto:?bcc=${encodeURIComponent(bccAddresses)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailtoLink, '_blank');
    }
};

// Make globally available
window.EmailService = EmailService;
