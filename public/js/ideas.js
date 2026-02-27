// Ideas Management Functions

async function loadIdeas() {
    if (!AppState.currentProject) {
        showToast('Please select a project first', 'error');
        return;
    }
    
    const ideas = await API.fetchIdeas(AppState.currentProject.id);
    AppState.ideas = ideas;
    
    displayIdeasList(ideas);
    displayStructuringSet(ideas.filter(i => i.selected_for_structuring));
}

function displayIdeasList(ideas) {
    const container = document.getElementById('ideas-list');
    if (!container) return;
    
    if (ideas.length === 0) {
        container.innerHTML = '<p>No ideas yet. Add ideas generated from your brainstorming session.</p>';
        return;
    }
    
    container.innerHTML = ideas.map((idea, index) => `
        <div class="idea-card" data-id="${idea.id}">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <input type="checkbox" id="idea-${idea.id}" ${idea.selected_for_structuring ? 'checked' : ''}>
                    <label for="idea-${idea.id}" style="margin-left: 0.5rem;">
                        <strong>${index + 1}.</strong> ${idea.idea_text}
                    </label>
                    ${idea.category ? `<div class="idea-category">${idea.category}</div>` : ''}
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-sm btn-outline" onclick="editIdea('${idea.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteIdea('${idea.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    // Add change listeners
    ideas.forEach(idea => {
        const checkbox = document.getElementById(`idea-${idea.id}`);
        if (checkbox) {
            checkbox.addEventListener('change', () => toggleIdeaSelection(idea.id, checkbox.checked));
        }
    });
}

function displayStructuringSet(ideas) {
    const container = document.getElementById('structuring-ideas-list');
    if (!container) return;
    
    if (ideas.length === 0) {
        container.innerHTML = '<p>No ideas selected. Select ideas from the list to add them for structuring.</p>';
        return;
    }
    
    container.innerHTML = ideas.map((idea, index) => `
        <div class="idea-card" style="background: #eff6ff; border-left: 3px solid #3b82f6;">
            <strong>${index + 1}.</strong> ${idea.idea_text}
            ${idea.category ? `<div class="idea-category">${idea.category}</div>` : ''}
        </div>
    `).join('');
    
    // Update count info
    const count = ideas.length;
    const questionCount = count * (count - 1); // n × (n-1) for directed pairs
    
    const infoBox = document.querySelector('.structuring-set h3');
    if (infoBox) {
        infoBox.innerHTML = `Ideas Selected for Structuring (${count}) - ${questionCount} questions will be generated`;
    }
}

function showAddIdea() {
    document.getElementById('idea-text').value = '';
    document.getElementById('idea-category-select').value = '';
    showModal('add-idea-modal');
}

async function submitIdea(event) {
    event.preventDefault();
    
    if (!AppState.currentProject) {
        showToast('Please select a project first', 'error');
        return;
    }
    
    const ideaText = document.getElementById('idea-text').value.trim();
    const category = document.getElementById('idea-category-select').value;
    
    if (!ideaText) {
        showToast('Please enter idea text', 'error');
        return;
    }
    
    const ideaData = {
        id: generateId(),
        project_id: AppState.currentProject.id,
        idea_text: ideaText,
        category: category,
        order_number: AppState.ideas.length + 1,
        vote_count: 0,
        weighted_score: 0,
        selected_for_structuring: false
    };
    
    try {
        await API.addIdea(ideaData);
        showToast('Idea added successfully', 'success');
        closeModal('add-idea-modal');
        loadIdeas();
    } catch (error) {
        console.error('Error adding idea:', error);
        showToast('Error adding idea', 'error');
    }
}

async function toggleIdeaSelection(ideaId, selected) {
    try {
        await fetch(`tables/ideas/${ideaId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ selected_for_structuring: selected })
        });
        
        loadIdeas();
    } catch (error) {
        console.error('Error updating idea:', error);
        showToast('Error updating selection', 'error');
    }
}

function selectAllIdeas() {
    AppState.ideas.forEach(async (idea) => {
        await toggleIdeaSelection(idea.id, true);
    });
    setTimeout(loadIdeas, 500);
}

function deselectAllIdeas() {
    AppState.ideas.forEach(async (idea) => {
        await toggleIdeaSelection(idea.id, false);
    });
    setTimeout(loadIdeas, 500);
}

async function markSelectedForStructuring() {
    const selected = AppState.ideas.filter(i => 
        document.getElementById(`idea-${i.id}`)?.checked
    );
    
    if (selected.length === 0) {
        showToast('Please select at least one idea', 'error');
        return;
    }
    
    showToast(`${selected.length} ideas added to structuring set`, 'success');
    loadIdeas();
}

async function deleteIdea(ideaId) {
    if (!confirm('Are you sure you want to delete this idea?')) return;
    
    try {
        await fetch(`tables/ideas/${ideaId}`, {
            method: 'DELETE'
        });
        showToast('Idea deleted', 'success');
        loadIdeas();
    } catch (error) {
        console.error('Error deleting idea:', error);
        showToast('Error deleting idea', 'error');
    }
}

async function importIdeas() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.txt';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const text = await file.text();
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        
        let imported = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const ideaText = lines[i];
            if (!ideaText || ideaText.toLowerCase() === 'idea' || ideaText.toLowerCase() === 'ideas') continue;
            
            const ideaData = {
                id: generateId(),
                project_id: AppState.currentProject.id,
                idea_text: ideaText,
                order_number: AppState.ideas.length + imported + 1,
                vote_count: 0,
                weighted_score: 0,
                selected_for_structuring: false
            };
            
            try {
                await API.addIdea(ideaData);
                imported++;
            } catch (error) {
                console.error('Error importing idea:', error);
            }
        }
        
        showToast(`Imported ${imported} ideas`, 'success');
        loadIdeas();
    };
    
    input.click();
}