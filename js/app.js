/**
 * APP ENGINE (js/app.js)
 * The logic core for the Universal Minimalist History Dashboard.
 */

import { HistoryLoader } from './data.js';

// --- STATE ---
const loader = new HistoryLoader();
let selectoInstance = null;
let isLassoActive = false;
let lastDateHeader = null;

// --- DOM ELEMENTS ---
const container = document.getElementById('history-container');
const sentinel = document.getElementById('scroll-sentinel');
const searchInput = document.getElementById('search-input');
const selectionBar = document.getElementById('selection-bar');
const selectionCount = document.getElementById('selection-count');
const btnLasso = document.getElementById('btn-lasso');

/**
 * INIT
 */
async function init() {
    console.log("App: Booting Universal Minimalist UI...");

    // 1. Load Initial Data
    await loadNextBatch();

    // 2. Infinite Scroll Observer
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            loadNextBatch();
        }
    }, { rootMargin: '400px' });
    observer.observe(sentinel);

    // 3. Setup Listeners
    setupSearch();
    setupLassoToggle();
    setupActions();
}

/**
 * DATA FETCHING & RENDERING
 */
async function loadNextBatch() {
    const items = await loader.loadNextBatch(100);
    renderRows(items);
}

function renderRows(items) {
    const fragment = document.createDocumentFragment();

    items.forEach(item => {
        // Date Grouping
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

        // Row Content
        const row = document.createElement('div');
        row.className = 'history-row';
        row.dataset.id = item.id; 
        row.dataset.url = item.url;
        
        let domain = "";
        try { domain = new URL(item.url).hostname.replace('www.', ''); } catch(e){}

        row.innerHTML = `
            <div class="checkbox"></div>
            <span class="time">${dateObj.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
            <img class="favicon" src="_favicon/?pageUrl=${encodeURIComponent(item.url)}&size=16" loading="lazy">
            <div class="content">
                <span class="title">${item.title || item.url}</span>
                <span class="domain">${domain}</span>
            </div>
        `;

        // Click to Open (Unless Lasso is ON)
        row.addEventListener('click', (e) => {
             if (!isLassoActive && !e.ctrlKey && !e.shiftKey) {
                 window.location.href = item.url;
             }
        });

        fragment.appendChild(row);
    });

    container.insertBefore(fragment, sentinel);
}

/**
 * SEARCH LOGIC
 */
function setupSearch() {
    let timer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            // Hard Reset
            lastDateHeader = null;
            // Remove all rows (keep sentinel)
            while(container.firstChild && container.firstChild !== sentinel) {
                container.removeChild(container.firstChild);
            }
            // Reset Loader
            loader.reset(e.target.value);
            loadNextBatch();
        }, 300);
    });
}

/**
 * LASSO TOGGLE LOGIC
 */
function setupLassoToggle() {
    // Determine container for Selecto
    // It scans the whole list.
    
    // Create Selecto (Paused state initially)
    selectoInstance = new Selecto({
        container: document.body,
        dragContainer: '#history-container',
        selectableTargets: ['.history-row'],
        hitRate: 0,
        selectByClick: true,
        selectFromInside: false,
        toggleInside: true,
        ratio: 0,
    });
    
    // Destroy immediately so it's not active by default
    selectoInstance.destroy();

    // The Toggle Button
    btnLasso.addEventListener('click', () => {
        isLassoActive = !isLassoActive;

        if (isLassoActive) {
            // ACTIVATE
            btnLasso.classList.add('active');
            btnLasso.textContent = "🖱️ Lasso: ON";
            
            // Re-instantiate Selecto
            selectoInstance = new Selecto({
                container: document.body,
                dragContainer: '#history-container',
                selectableTargets: ['.history-row'],
                hitRate: 0,
                selectByClick: true,
                selectFromInside: false,
                toggleInside: true,
                ratio: 0,
            });
            
            // Bind Events
            selectoInstance.on("select", e => {
                e.added.forEach(el => el.classList.add("selected"));
                e.removed.forEach(el => el.classList.remove("selected"));
                updateSelectionState();
            });

        } else {
            // DEACTIVATE
            btnLasso.classList.remove('active');
            btnLasso.textContent = "🖱️ Lasso";
            
            cancelSelection();
            if(selectoInstance) selectoInstance.destroy();
        }
    });
}

function updateSelectionState() {
    const selected = document.querySelectorAll('.history-row.selected');
    const count = selected.length;
    
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
 * ACTIONS (Delete, etc)
 */
function setupActions() {
    document.getElementById('btn-cancel').addEventListener('click', () => {
        cancelSelection();
        if(selectoInstance) selectoInstance.setSelectedTargets([]);
    });

    document.getElementById('btn-delete').addEventListener('click', async () => {
        const selected = document.querySelectorAll('.history-row.selected');
        const urls = Array.from(selected).map(el => el.dataset.url);
        
        if (urls.length > 0) {
            const btn = document.getElementById('btn-delete');
            btn.textContent = "Deleting...";
            await loader.deleteItems(urls);
            window.location.reload(); 
        }
    });

    // Date Range / Group Placeholders
    document.getElementById('btn-date').addEventListener('click', () => {
        alert("Date Range Picker would appear here.");
    });
    document.getElementById('btn-group').addEventListener('click', () => {
        alert("Switching to 'Folders' view...");
    });
}

// Start
init();
