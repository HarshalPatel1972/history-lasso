/**
 * ACTION ENGINE
 * Handles user actions: Deletion, Clearing Selection.
 */

import { clearSelection } from './lasso.js';

export function initActions() {
    console.log("Action Engine: Initializing...");
    
    // Delete Button
    const deleteBtn = document.getElementById('delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', deleteSelected);
    }

    // Cancel / Clear Selection Button
    const clearBtn = document.getElementById('clear-selection-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearSelection);
    }
}

/**
 * Delete all selected history items
 */
async function deleteSelected() {
    const selectedEls = document.querySelectorAll('.history-card.selected');
    const count = selectedEls.length;

    if (count === 0) return;

    const confirmed = confirm(`Are you sure you want to delete ${count} history items? This cannot be undone.`);
    if (!confirmed) return;

    // 1. Gather URLs
    const urlsToDelete = [];
    selectedEls.forEach(el => {
        const url = el.dataset.url;
        if (url) urlsToDelete.push(url);
    });

    // 2. Perform Deletion
    // We do this individually or in batches. deleteUrl takes one at a time.
    let successCount = 0;
    
    // UI Feedback: Show loading state or processing
    const deleteBtn = document.getElementById('delete-btn');
    const originalText = deleteBtn.innerHTML;
    deleteBtn.textContent = "Deleting...";

    try {
        const deletePromises = urlsToDelete.map(url => {
            return chrome.history.deleteUrl({ url: url });
        });

        await Promise.all(deletePromises);
        
        // 3. Update UI
        selectedEls.forEach(el => el.remove());
        clearSelection(); // Hide bar
        
        console.log(`Successfully deleted ${urlsToDelete.length} items`);

    } catch (e) {
        alert("An error occurred while deleting. Some items may not have been deleted.");
        console.error("Delete Error:", e);
    } finally {
        deleteBtn.innerHTML = originalText;
    }
}

initActions();
