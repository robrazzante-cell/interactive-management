// Folder Management System for Projects

let folders = [];
let currentFolderFilter = 'all';

// Load folders from database
async function loadFolders() {
    try {
        const response = await fetch('tables/project_folders?limit=100&sort=sort_order');
        const data = await response.json();
        folders = data.data || [];
        renderFolders();
        updateFolderCounts();
    } catch (error) {
        console.error('Error loading folders:', error);
    }
}

// Render folders in sidebar
function renderFolders() {
    const foldersList = document.getElementById('folders-list');
    
    // Keep "All Projects" and "Uncategorized" at top
    const defaultFolders = foldersList.querySelectorAll('[data-folder-id="all"], [data-folder-id="uncategorized"]');
    
    // Remove custom folders
    const customFolders = foldersList.querySelectorAll('.folder-item-custom');
    customFolders.forEach(folder => folder.remove());
    
    // Add custom folders
    folders.forEach(folder => {
        const folderElement = document.createElement('div');
        folderElement.className = 'folder-item folder-item-custom';
        folderElement.setAttribute('data-folder-id', folder.id);
        folderElement.setAttribute('draggable', 'false');
        folderElement.innerHTML = `
            <i class="fas ${folder.icon || 'fa-folder'}" style="color: ${folder.color || '#718096'}"></i>
            <span>${folder.name}</span>
            <span class="folder-count" id="folder-count-${folder.id}">0</span>
            <div class="folder-actions">
                <button onclick="editFolder('${folder.id}')" title="Edit folder">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteFolder('${folder.id}')" title="Delete folder">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        folderElement.onclick = (e) => {
            if (!e.target.closest('.folder-actions')) {
                filterByFolder(folder.id);
            }
        };
        foldersList.appendChild(folderElement);
    });
    
    // Enable drop on folder items
    enableFolderDropZones();
}

// Filter projects by folder
function filterByFolder(folderId) {
    currentFolderFilter = folderId;
    
    // Update active state
    document.querySelectorAll('.folder-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-folder-id="${folderId}"]`).classList.add('active');
    
    // Filter projects
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach(card => {
        const projectFolderId = card.getAttribute('data-folder-id') || 'uncategorized';
        
        if (folderId === 'all') {
            card.style.display = 'block';
        } else if (folderId === 'uncategorized') {
            card.style.display = (!projectFolderId || projectFolderId === 'uncategorized') ? 'block' : 'none';
        } else {
            card.style.display = (projectFolderId === folderId) ? 'block' : 'none';
        }
    });
}

// Update folder counts
function updateFolderCounts() {
    const projectCards = document.querySelectorAll('.project-card');
    
    // Count all projects
    document.getElementById('all-projects-count').textContent = projectCards.length;
    
    // Count uncategorized
    const uncategorized = Array.from(projectCards).filter(card => {
        const folderId = card.getAttribute('data-folder-id');
        return !folderId || folderId === 'uncategorized';
    });
    document.getElementById('uncategorized-count').textContent = uncategorized.length;
    
    // Count for each custom folder
    folders.forEach(folder => {
        const count = Array.from(projectCards).filter(card => {
            return card.getAttribute('data-folder-id') === folder.id;
        }).length;
        const countElement = document.getElementById(`folder-count-${folder.id}`);
        if (countElement) {
            countElement.textContent = count;
        }
    });
}

// Create new folder
function createFolder() {
    const colors = ['#0B2B26', '#2D7A5E', '#667eea', '#f56565', '#ed8936', '#48bb78', '#38b2ac', '#9f7aea'];
    
    const modalHTML = `
        <div class="folder-modal" id="folder-modal">
            <div class="folder-modal-content">
                <div class="folder-modal-header">
                    <h3>Create New Folder</h3>
                    <button class="folder-modal-close" onclick="closeFolderModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form onsubmit="saveFolderForm(event)">
                    <div class="folder-form-group">
                        <label for="folder-name">Folder Name</label>
                        <input type="text" id="folder-name" required placeholder="e.g., Active Projects">
                    </div>
                    <div class="folder-form-group">
                        <label>Folder Color</label>
                        <div class="folder-color-picker">
                            ${colors.map((color, idx) => `
                                <div class="color-option ${idx === 0 ? 'selected' : ''}" 
                                     style="background: ${color}" 
                                     data-color="${color}"
                                     onclick="selectColor(this)">
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="folder-modal-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeFolderModal()">Cancel</button>
                        <button type="submit" class="btn btn-primary">Create Folder</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Select color in folder modal
function selectColor(element) {
    document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');
}

// Close folder modal
function closeFolderModal() {
    const modal = document.getElementById('folder-modal');
    if (modal) modal.remove();
}

// Save folder from form
async function saveFolderForm(event) {
    event.preventDefault();
    
    const folderName = document.getElementById('folder-name').value.trim();
    const selectedColor = document.querySelector('.color-option.selected').getAttribute('data-color');
    
    try {
        const newFolder = {
            name: folderName,
            color: selectedColor,
            icon: 'fa-folder',
            sort_order: folders.length,
            created_at: new Date().toISOString()
        };
        
        const response = await fetch('tables/project_folders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newFolder)
        });
        
        if (response.ok) {
            closeFolderModal();
            await loadFolders();
            showNotification('Folder created successfully', 'success');
        } else {
            showNotification('Failed to create folder', 'error');
        }
    } catch (error) {
        console.error('Error creating folder:', error);
        showNotification('Error creating folder', 'error');
    }
}

// Edit folder
async function editFolder(folderId) {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    
    const colors = ['#0B2B26', '#2D7A5E', '#667eea', '#f56565', '#ed8936', '#48bb78', '#38b2ac', '#9f7aea'];
    
    const modalHTML = `
        <div class="folder-modal" id="folder-modal">
            <div class="folder-modal-content">
                <div class="folder-modal-header">
                    <h3>Edit Folder</h3>
                    <button class="folder-modal-close" onclick="closeFolderModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form onsubmit="updateFolderForm(event, '${folderId}')">
                    <div class="folder-form-group">
                        <label for="folder-name">Folder Name</label>
                        <input type="text" id="folder-name" required value="${folder.name}">
                    </div>
                    <div class="folder-form-group">
                        <label>Folder Color</label>
                        <div class="folder-color-picker">
                            ${colors.map(color => `
                                <div class="color-option ${color === folder.color ? 'selected' : ''}" 
                                     style="background: ${color}" 
                                     data-color="${color}"
                                     onclick="selectColor(this)">
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="folder-modal-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeFolderModal()">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Update folder from form
async function updateFolderForm(event, folderId) {
    event.preventDefault();
    
    const folderName = document.getElementById('folder-name').value.trim();
    const selectedColor = document.querySelector('.color-option.selected').getAttribute('data-color');
    
    try {
        const updatedFolder = {
            name: folderName,
            color: selectedColor
        };
        
        const response = await fetch(`tables/project_folders/${folderId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedFolder)
        });
        
        if (response.ok) {
            closeFolderModal();
            await loadFolders();
            showNotification('Folder updated successfully', 'success');
        } else {
            showNotification('Failed to update folder', 'error');
        }
    } catch (error) {
        console.error('Error updating folder:', error);
        showNotification('Error updating folder', 'error');
    }
}

// Delete folder
async function deleteFolder(folderId) {
    if (!confirm('Delete this folder? Projects in this folder will be moved to Uncategorized.')) {
        return;
    }
    
    try {
        // Delete folder
        const response = await fetch(`tables/project_folders/${folderId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            // Move projects to uncategorized
            const projectsInFolder = document.querySelectorAll(`[data-folder-id="${folderId}"]`);
            for (const projectCard of projectsInFolder) {
                const projectId = projectCard.getAttribute('data-project-id');
                if (projectId) {
                    await updateProjectFolder(projectId, 'uncategorized');
                }
            }
            
            await loadFolders();
            filterByFolder('all');
            showNotification('Folder deleted successfully', 'success');
        } else {
            showNotification('Failed to delete folder', 'error');
        }
    } catch (error) {
        console.error('Error deleting folder:', error);
        showNotification('Error deleting folder', 'error');
    }
}

// Enable drag and drop
function enableFolderDropZones() {
    // Make project cards draggable
    document.querySelectorAll('.project-card').forEach(card => {
        card.setAttribute('draggable', 'true');
        
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('projectId', card.getAttribute('data-project-id'));
            card.classList.add('dragging');
        });
        
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
        });
    });
    
    // Make folder items drop zones
    document.querySelectorAll('.folder-item').forEach(folder => {
        folder.addEventListener('dragover', (e) => {
            e.preventDefault();
            folder.classList.add('drag-over');
        });
        
        folder.addEventListener('dragleave', () => {
            folder.classList.remove('drag-over');
        });
        
        folder.addEventListener('drop', async (e) => {
            e.preventDefault();
            folder.classList.remove('drag-over');
            
            const projectId = e.dataTransfer.getData('projectId');
            const folderId = folder.getAttribute('data-folder-id');
            
            if (projectId && folderId !== 'all') {
                await updateProjectFolder(projectId, folderId);
            }
        });
    });
}

// Update project's folder
async function updateProjectFolder(projectId, folderId) {
    try {
        const response = await fetch(`tables/projects/${projectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder_id: folderId })
        });
        
        if (response.ok) {
            // Update UI
            const projectCard = document.querySelector(`[data-project-id="${projectId}"]`);
            if (projectCard) {
                projectCard.setAttribute('data-folder-id', folderId);
            }
            updateFolderCounts();
            filterByFolder(currentFolderFilter);
            showNotification('Project moved to folder', 'success');
        }
    } catch (error) {
        console.error('Error updating project folder:', error);
        showNotification('Error moving project', 'error');
    }
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#48bb78' : '#f56565'};
        color: white;
        border-radius: 0.5rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 10001;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Initialize folders on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFolders);
} else {
    loadFolders();
}
