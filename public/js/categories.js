// Categories Management Functions

async function loadCategories() {
    if (!AppState.currentProject) {
        showToast('Please select a project first', 'error');
        return;
    }
    
    try {
        const response = await fetch(`tables/categories?search=${AppState.currentProject.id}`);
        const data = await response.json();
        const categories = data.data.filter(c => c.project_id === AppState.currentProject.id);
        
        AppState.categories = categories;
        displayCategories(categories);
        populateCategoryDropdown(categories);
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function displayCategories(categories) {
    const container = document.getElementById('categories-container');
    if (!container) return;
    
    if (categories.length === 0) {
        container.innerHTML = '<p>No categories yet. Create your first category!</p>';
        return;
    }
    
    container.innerHTML = categories.map(cat => `
        <div class="category-box" style="border-color: ${cat.color};">
            <div class="category-header">
                <span class="category-name" style="color: ${cat.color};">
                    <i class="fas fa-tag"></i> ${cat.name}
                </span>
                <button class="btn btn-sm btn-danger" onclick="deleteCategory('${cat.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="category-ideas" id="cat-${cat.id}">
                ${getIdeasForCategory(cat.name)}
            </div>
        </div>
    `).join('');
}

function getIdeasForCategory(categoryName) {
    const ideas = AppState.ideas.filter(i => i.category === categoryName);
    
    if (ideas.length === 0) {
        return '<p style="font-size: 0.875rem; color: #6b7280;">No ideas in this category yet.</p>';
    }
    
    return ideas.map(idea => `
        <div class="draggable-idea">
            ${idea.idea_text}
        </div>
    `).join('');
}

function createCategory() {
    const name = document.getElementById('new-category-name').value.trim();
    const color = document.getElementById('category-color').value;
    
    if (!name) {
        showToast('Please enter a category name', 'error');
        return;
    }
    
    addCategory(name, color);
}

async function addCategory(name, color = '#3b82f6') {
    if (!AppState.currentProject) {
        showToast('Please select a project first', 'error');
        return;
    }
    
    const categoryData = {
        id: generateId(),
        project_id: AppState.currentProject.id,
        name: name,
        color: color,
        description: ''
    };
    
    try {
        const response = await fetch('tables/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(categoryData)
        });
        
        const result = await response.json();
        AppState.categories.push(result);
        
        // Clear form
        document.getElementById('new-category-name').value = '';
        
        showToast('Category created successfully', 'success');
        loadCategories();
    } catch (error) {
        console.error('Error creating category:', error);
        showToast('Error creating category', 'error');
    }
}

async function deleteCategory(categoryId) {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
        await fetch(`tables/categories/${categoryId}`, {
            method: 'DELETE'
        });
        
        showToast('Category deleted', 'success');
        loadCategories();
    } catch (error) {
        console.error('Error deleting category:', error);
        showToast('Error deleting category', 'error');
    }
}

function populateCategoryDropdown(categories) {
    const select = document.getElementById('idea-category-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">No Category</option>' +
        categories.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join('');
}