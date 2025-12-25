/**
 * LASSO ENGINE (js/lasso.js)
 * Only active when explicitly enabled via toggle.
 */

let selectoInstance = null;
let isLassoEnabled = false;

export function initLasso(renderCallback) {
    const listContainer = document.getElementById('history-list');
    const selectionBar = document.getElementById('selection-bar');
    const countSpan = document.getElementById('select-count');

    selectoInstance = new Selecto({
        container: document.body,
        dragContainer: listContainer,
        selectableTargets: ['.native-row'],
        hitRate: 0,
        selectByClick: true, // Allow clicking rows to select when mode is active
        selectFromInside: false,
        toggleInside: true,
        ratio: 0,
    });

    // Initially Disabled
    selectoInstance.destroy(); 

    // Re-bind method to toggle
    window.toggleLassoInternal = () => {
        isLassoEnabled = !isLassoEnabled;
        if (isLassoEnabled) {
            selectoInstance = new Selecto({
                container: document.body,
                dragContainer: listContainer,
                selectableTargets: ['.native-row'],
                hitRate: 0,
                selectByClick: true, // Click selects row
                selectFromInside: false,
                toggleInside: true,
                ratio: 0,
            });
            bindEvents(renderCallback);
        } else {
            selectoInstance.destroy(); // Completely kill drag events
            clearSelection();
        }
        return isLassoEnabled;
    };

    // Shared functionality
    function bindEvents(cb) {
        selectoInstance.on("select", e => {
            e.added.forEach(el => {
                el.classList.add("selected");
                const checkbox = el.querySelector('.native-checkbox');
                if(checkbox) checkbox.checked = true;
            });
            e.removed.forEach(el => {
                el.classList.remove("selected");
                const checkbox = el.querySelector('.native-checkbox');
                if(checkbox) checkbox.checked = false;
            });
            updateUI();
        });
    }

    function updateUI() {
        const count = document.querySelectorAll('.native-row.selected').length;
        if (count > 0) {
            selectionBar.classList.remove('hidden');
            countSpan.textContent = `${count} selected`;
        } else {
            selectionBar.classList.add('hidden');
        }
    }

    function clearSelection() {
         document.querySelectorAll('.native-row.selected').forEach(el => {
             el.classList.remove('selected');
             el.querySelector('.native-checkbox').checked = false;
         });
         selectionBar.classList.add('hidden');
    }
    
    // Action Buttons
    document.getElementById('cancel-select').addEventListener('click', clearSelection);
    document.getElementById('delete-select').addEventListener('click', async () => {
        const selected = document.querySelectorAll('.native-row.selected');
        const urls = Array.from(selected).map(el => el.dataset.url);
        if(cb) await cb('delete', urls);
    });
}

export function toggleLasso() {
    if(window.toggleLassoInternal) return window.toggleLassoInternal();
    return false;
}
