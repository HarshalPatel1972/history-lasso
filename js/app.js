/**
 * APP ENGINE (js/app.js)
 * High-performance Infinite Scroll & Minimalist Logic.
 */

import { HistoryLoader } from './data.js';

// --- STATE ---
const loader = new HistoryLoader();
let selectoInstance = null;
let isLassoActive = false;
let lastDateHeader = null;

// --- DOM ---
const container = document.getElementById('history-container');
const sentinel = document.getElementById('scroll-sentinel');
const searchInput = document.getElementById('search-input');
const selectionBar = document.getElementById('selection-bar');
const selectionCount = document.getElementById('selection-count');
const btnLasso = document.getElementById('btn-lasso');

/**
 * ENTRY POINT
 */
async function init() {
    console.log("App: Initializing Minimalist Dashboard...");

    // 1. Initial Data
    await loadNextBatch();

    // 2. Infinite Scroll Observer
    // We observe the sentinel at the bottom. When visible, load more.
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            console.log("App: Scroll Sentinel hit. Loading more...");
            loadNextBatch();
        }
    }, { root: null, rootMargin: '400px', threshold: 0.1 }); // Load well before bottom
    
    observer.observe(sentinel);

    // 3. Setup Listeners
    setupSearch();
    setupLassoToggle();
    setupActions();
}

/**
 * FETCH & RENDER
 */
async function loadNextBatch() {
    const items = await loader.loadNextBatch(100);
    renderRows(items);
}

function renderRows(items) {
    if (!items || items.length === 0) return;

    const fragment = document.createDocumentFragment();

    items.forEach(item => {
        // Simple Date Grouping
        const dateObj = new Date(item.lastVisitTime);
        const dateStr = dateObj.toLocaleDateString(undefined, { 
            weekday: 'long', month: 'long', day: 'numeric' 
        });

        if (dateStr !== lastDateHeader) {
            const header = document.createElement('div');
            header.className = 'date-header';
            header.textContent = dateStr;
            fragment.appendChild(header);
            lastDateHeader = dateStr;
        }

        // Row Element
        const row = document.createElement('div');
        row.className = 'history-row';
        row.dataset.id = item.id; 
        row.dataset.url = item.url;
        
        let domain = "";
        try { domain = new URL(item.url).hostname.replace('www.', ''); } catch(e){}
        const timeStr = dateObj.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

        row.innerHTML = `
            <div class="checkbox"></div>
            <span class="time">${timeStr}</span>
            <img class="favicon" src="_favicon/?pageUrl=${encodeURIComponent(item.url)}&size=16" loading="lazy">
            <div class="content">
                <span class="title">${item.title || item.url}</span>
                <span class="domain">${domain}</span>
            </div>
        `;

        // Click Handler: Toggle Selection vs Navigation
        row.addEventListener('click', (e) => {
             // If clicking Checkbox directly, toggle selection
             if (e.target.closest('.checkbox')) {
                 toggleRowSelection(row);
                 return;
             }
             
             // If Lasso Mode is ON, clicking row toggles selection
             if (isLassoActive) {
                 toggleRowSelection(row);
                 return;
             }

             // Normal Mode: Navigate (Ctrl+Click opens in new tab natively)
             if (!e.ctrlKey && !e.shiftKey && !e.metaKey) {
                 window.location.href = item.url;
             }
        });

        fragment.appendChild(row);
    });

    // Insert before sentinel to maintain scroll position capability
    container.insertBefore(fragment, sentinel);
}

function toggleRowSelection(row) {
    row.classList.toggle('selected');
    updateSelectionState();
}

/**
 * SEARCH
 */
function setupSearch() {
    let timer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            lastDateHeader = null;
            // Clear content but keep sentinel
            while(container.children.length > 1) { 
                container.removeChild(container.firstChild); 
            }
            loader.reset(e.target.value);
            loadNextBatch();
        }, 300);
    });
}

/**
 * LASSO
 */
function setupLassoToggle() {
    // Init Selecto for Drag functionality
    selectoInstance = new Selecto({
        container: document.body,
        dragContainer: '#history-container',
        selectableTargets: ['.history-row'],
        hitRate: 0,
        selectByClick: false, // We handle click manually for hybrid feel
        selectFromInside: false,
        toggleInside: true,
        ratio: 0,
    });
    // Immediately disable
    selectoInstance.destroy();

    btnLasso.addEventListener('click', () => {
        isLassoActive = !isLassoActive;

        if (isLassoActive) {
            btnLasso.classList.add('active');
            btnLasso.innerHTML = "🖱️ Lasso: ON";
            // Re-activate Selecto
            selectoInstance = new Selecto({
                container: document.body,
                dragContainer: '#history-container',
                selectableTargets: ['.history-row'],
                hitRate: 0,
                selectByClick: false, // Let our click listener handle singular taps
                selectFromInside: false,
                toggleInside: true,
                ratio: 0,
            });
            selectoInstance.on("select", e => {
                e.added.forEach(el => el.classList.add("selected"));
                e.removed.forEach(el => el.classList.remove("selected"));
                updateSelectionState();
            });
        } else {
            btnLasso.classList.remove('active');
            btnLasso.innerHTML = "🖱️ Lasso";
            cancelSelection();
            if(selectoInstance) selectoInstance.destroy();
        }
    });

    // Cancel Button
    document.getElementById('btn-cancel').addEventListener('click', () => {
        cancelSelection();
        // If in Lasso mode, we keep Lasso mode ON but clear selection? 
        // Or turn off? User probably just wants to de-select.
        if (selectoInstance) selectoInstance.setSelectedTargets([]);
    });
}

function updateSelectionState() {
    const count = document.querySelectorAll('.history-row.selected').length;
    if (count > 0) {
        selectionBar.classList.remove('hidden');
        selectionCount.textContent = `${count} Selected`;
    } else {
        selectionBar.classList.add('hidden');
    }
}

function cancelSelection() {
    document.querySelectorAll('.history-row.selected').forEach(el => el.classList.remove('selected'));
    updateSelectionState();
}

/**
 * DELETE & ACTIONS
 */
function setupActions() {
    document.getElementById('btn-delete').addEventListener('click', async () => {
        const selected = document.querySelectorAll('.history-row.selected');
        const urls = Array.from(selected).map(el => el.dataset.url);
        
        if (urls.length > 0) {
            if(confirm(`Delete ${urls.length} items?`)) {
                await loader.deleteItems(urls);
                // Simple Refresh to show accurate state
                window.location.reload();
            }
        }
    });
}

init();
