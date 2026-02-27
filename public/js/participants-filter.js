// Participant Roster Filter Functions

// Filter participants table based on search inputs
function filterParticipants() {
    const nameFilter = document.getElementById('filter-name')?.value.toLowerCase() || '';
    const positionFilter = document.getElementById('filter-position')?.value.toLowerCase() || '';
    const emailFilter = document.getElementById('filter-email')?.value.toLowerCase() || '';
    
    const table = document.getElementById('participants-table');
    if (!table) return;
    
    const rows = table.querySelectorAll('tbody tr');
    let visibleCount = 0;
    
    rows.forEach(row => {
        // Get cell values (skip checkbox column)
        const cells = row.querySelectorAll('td');
        if (cells.length < 4) return;
        
        const name = cells[1]?.textContent.toLowerCase() || '';
        const position = cells[2]?.textContent.toLowerCase() || '';
        const email = cells[3]?.textContent.toLowerCase() || '';
        
        // Check if row matches all filters
        const nameMatch = !nameFilter || name.includes(nameFilter);
        const positionMatch = !positionFilter || position.includes(positionFilter);
        const emailMatch = !emailFilter || email.includes(emailFilter);
        
        // Show/hide row
        if (nameMatch && positionMatch && emailMatch) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    // Update filter count display
    updateFilterCount(visibleCount, rows.length);
}

// Clear all filters
function clearFilters() {
    document.getElementById('filter-name').value = '';
    document.getElementById('filter-position').value = '';
    document.getElementById('filter-email').value = '';
    filterParticipants();
}

// Update filter count display
function updateFilterCount(visible, total) {
    // Check if count display exists, if not create it
    let countDisplay = document.getElementById('filter-count-display');
    
    if (!countDisplay) {
        // Create count display element
        const filterBar = document.querySelector('div[style*="background: #FAF3DD"]');
        if (filterBar) {
            countDisplay = document.createElement('div');
            countDisplay.id = 'filter-count-display';
            countDisplay.style.cssText = 'margin-top: 0.5rem; font-size: 0.85rem; color: #0B2B26; font-weight: 600;';
            filterBar.appendChild(countDisplay);
        }
    }
    
    if (countDisplay) {
        if (visible === total) {
            countDisplay.textContent = `Showing all ${total} participants`;
        } else {
            countDisplay.textContent = `Showing ${visible} of ${total} participants`;
        }
    }
}
