/**
 * LASSO ENGINE (js/lasso.js)
 * Updated for LIST VIEW ROW selection.
 */

export function initLasso(renderCallback) {
    console.log("Lasso: Initializing for LIST VIEW...");

    // Selection State
    let selectedIds = new Set();
    const actionDock = document.getElementById('action-dock');
    const countLabel = document.getElementById('selected-count');

    // Init Selecto
    const selecto = new Selecto({
        container: document.body,
        dragContainer: '#history-container', // New container ID
        selectableTargets: ['.history-row'], // Target rows now
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

    // Cancel
    document.getElementById('btn-cancel').addEventListener('click', () => {
        selecto.setSelectedTargets([]);
        document.querySelectorAll('.history-row.selected').forEach(el => el.classList.remove('selected'));
        selectedIds.clear();
        updateDock();
    });

    // Delete
    document.getElementById('btn-delete').addEventListener('click', async () => {
        const selectedEls = document.querySelectorAll('.history-row.selected');
        const urls = Array.from(selectedEls).map(el => el.dataset.url);

        if (renderCallback) {
             const btn = document.getElementById('btn-delete');
             btn.textContent = "Deleting...";
             await renderCallback('delete', urls);
             // Render callback usually reloads, so no UI cleanup needed here
        }
    });
}
