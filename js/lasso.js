/**
 * LASSO ENGINE (js/lasso.js)
 * High-performance drag-selection logic.
 */

export function initLasso(renderCallback) {
    console.log("Lasso Engine: Initializing...");

    // Selection State
    let selectedIds = new Set();
    const actionDock = document.getElementById('action-dock');
    const countLabel = document.getElementById('selected-count');

    // Init Selecto
    const selecto = new Selecto({
        container: document.body,
        dragContainer: '#main-canvas',
        selectableTargets: ['.history-card'],
        hitRate: 0,
        selectByClick: false,
        selectFromInside: false,
        toggleInside: true,
        ratio: 0,
    });

    // Events
    selecto.on("select", e => {
        e.added.forEach(el => {
            el.classList.add("selected");
            selectedIds.add(el.dataset.id);
        });
        e.removed.forEach(el => {
            el.classList.remove("selected");
            selectedIds.delete(el.dataset.id);
        });
        updateDock();
    });

    function updateDock() {
        const count = selectedIds.size;
        countLabel.textContent = count;
        
        if (count > 0) actionDock.classList.remove('hidden');
        else actionDock.classList.add('hidden');
    }

    // Cancel Button
    document.getElementById('btn-cancel').addEventListener('click', () => {
        selecto.setSelectedTargets([]);
        document.querySelectorAll('.history-card.selected').forEach(el => el.classList.remove('selected'));
        selectedIds.clear();
        updateDock();
    });

    // Delete Button Logic Hook
    document.getElementById('btn-delete').addEventListener('click', async () => {
        // Find URLs of selected items
        const selectedEls = document.querySelectorAll('.history-card.selected');
        const urls = Array.from(selectedEls).map(el => el.dataset.url);

        // Call External Render Callback (which bridges Data Layer)
        if (renderCallback) {
             await renderCallback('delete', urls);
             // Clear state after delete
             selecto.setSelectedTargets([]);
             selectedIds.clear();
             updateDock();
        }
    });
}
