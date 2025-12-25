/**
 * LASSO ENGINE
 * Handles drag-to-select functionality using Selecto.js
 */

export let selectoInstance = null;

export function initLasso() {
    if (selectoInstance) selectoInstance.destroy();

    const container = document.body;
    const dragContainer = document.getElementById('history-grid');

    if (typeof Selecto === 'undefined') {
        console.warn("Selecto not found");
        return;
    }

    selectoInstance = new Selecto({
        // The container to allow dragging in
        container: container,
        // The area where the scroll happens and items live
        dragContainer: '#history-grid',
        // Example targets
        selectableTargets: ['.history-card'],
        // Algorithm
        hitRate: 0,
        selectByClick: false, // We use Click for navigation, unless Ctrl is held (handled manually or by Selecto config)
        selectFromInside: false, 
        toggleInside: true,
        ratio: 0,
    });

    // Events
    selectoInstance.on("select", e => {
        e.added.forEach(el => el.classList.add("selected"));
        e.removed.forEach(el => el.classList.remove("selected"));
        updateUI(e.selected);
    });
}

function updateUI(selectedElements) {
    const actionBar = document.getElementById('action-bar');
    const countSpan = document.getElementById('selection-count');
    
    // Find all currently selected (Selecto event gives delta/all, but we can query DOM for truth)
    const allSelected = document.querySelectorAll('.history-card.selected');
    
    if (allSelected.length > 0) {
        actionBar.classList.remove('hidden');
        countSpan.textContent = `${allSelected.length} items selected`;
    } else {
        actionBar.classList.add('hidden');
    }
}

export function clearSelection() {
    if (selectoInstance) {
        selectoInstance.setSelectedTargets([]);
    }
    const allSelected = document.querySelectorAll('.history-card.selected');
    allSelected.forEach(el => el.classList.remove('selected'));
    updateUI([]);
}
