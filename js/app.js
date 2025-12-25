/**
 * APP ENGINE (js/app.js)
 * High-performance Infinite Scroll & Minimalist Logic.
 * Rewrite: v3.0 - Robust State Management & Date Deduplication.
 */

import { HistoryLoader } from './data.js';

// --- GLOBAL STATE ---
const loader = new HistoryLoader();
let selectoInstance = null;
let isLassoActive = false;

// CRITICAL: Global tracker for the last rendered date header.
// This persists across infinite scroll batches to prevent duplicate headers.
// Only reset this when the list is fully cleared (e.g., Search or Refresh).
let globalLastDateString = null; 

// --- DOM ELEMENTS ---
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
    console.log("App: Initializing Minimalist Dashboard v3.0...");

    // 1. Initial Data Load
    globalLastDateString = null; 
    await loadNextBatch();

    // 2. Infinite Scroll Observer
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            loadNextBatch();
        }
    }, { root: null, rootMargin: '400px', threshold: 0.1 });
    
    observer.observe(sentinel);

    // 3. Setup Listeners
    setupSearch();
    setupLassoToggle();
    setupActions();
}

/**
 * FETCH & RENDER LOOP
 */
async function loadNextBatch() {
    const items = await loader.loadNextBatch(100);
    renderRows(items);
}

function renderRows(items) {
    if (!items || items.length === 0) return;

    const fragment = document.createDocumentFragment();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    items.forEach(item => {
        const dateObj = new Date(item.lastVisitTime);
        const itemDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
        
        // 1. Determine the Date Header String
        const datePart = dateObj.toLocaleDateString('en-US', { 
            year: 'numeric', month: 'long', day: 'numeric' 
        });
        const fullDatePart = dateObj.toLocaleDateString('en-US', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        });

        let finalHeader = fullDatePart; // Default: "Tuesday, December 23, 2025"

        if (itemDate.getTime() === today.getTime()) {
            finalHeader = "Today - " + datePart;
        } else if (itemDate.getTime() === yesterday.getTime()) {
            finalHeader = "Yesterday - " + datePart;
        }

        // 2. CHECK GLOBAL STATE to determine if we need a new header
        if (finalHeader !== globalLastDateString) {
            const header = document.createElement('div');
            header.className = 'date-header';
            header.textContent = finalHeader;
            fragment.appendChild(header);
            
            // UPDATE GLOBAL STATE
            globalLastDateString = finalHeader;
        }

        // 3. Render the Row
        const row = document.createElement('div');
        row.className = 'history-row';
        row.dataset.id = item.id; 
        row.dataset.url = item.url;
        
        // Domain parsing
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

        // Click Handler
        row.addEventListener('click', (e) => {
             if (e.target.closest('.checkbox')) {
                 toggleRowSelection(row);
                 return;
             }
             if (isLassoActive) {
                 toggleRowSelection(row);
                 return;
             }
             if (!e.ctrlKey && !e.shiftKey && !e.metaKey) {
                 window.location.href = item.url;
             }
        });

        fragment.appendChild(row);
    });

    // Append batch before Sentinel
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
            // CRITICAL: Reset the Global Date State on new search
            globalLastDateString = null;
            
            // Clear DOM
            container.innerHTML = '';
            container.appendChild(sentinel); 

            loader.reset(e.target.value);
            loadNextBatch();
        }, 300);
    });
}

/**
 * LASSO TOGGLE
 */
function setupLassoToggle() {
    // Init Selecto (Global Drag)
    selectoInstance = new Selecto({
        container: document.body,
        dragContainer: document.body, 
        selectableTargets: ['.history-row'],
        hitRate: 0,
        selectByClick: false, 
        selectFromInside: false, 
        toggleInside: true,
        ratio: 0,
    });
    selectoInstance.destroy();

    btnLasso.addEventListener('click', () => {
        isLassoActive = !isLassoActive;

        if (isLassoActive) {
            btnLasso.classList.add('active');
            btnLasso.innerHTML = "🖱️ Lasso: ON";
            
            selectoInstance = new Selecto({
                container: document.body,
                dragContainer: document.body,
                selectableTargets: ['.history-row'],
                hitRate: 0,
                selectByClick: false, 
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

    // Exit Button
    document.getElementById('btn-exit').addEventListener('click', () => {
        if(confirm("To disable History Lasso, please toggle it OFF in the Chrome Extensions page.\n\nOpen Extensions Settings now?")) {
            chrome.tabs.create({ url: "chrome://extensions" });
        }
    });
}

// Selection Helpers
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
 * ACTION HANDLERS
 */
function setupActions() {
    // Cancel Selection
    document.getElementById('btn-cancel').addEventListener('click', () => {
        cancelSelection();
        if(selectoInstance) selectoInstance.setSelectedTargets([]);
    });

    // Delete Selected
    document.getElementById('btn-delete').addEventListener('click', async () => {
        const selected = document.querySelectorAll('.history-row.selected');
        const urls = Array.from(selected).map(el => el.dataset.url);
        
        if (urls.length > 0) {
            if(confirm(`Delete ${urls.length} items?`)) {
                await loader.deleteItems(urls);
                window.location.reload();
            }
        }
    });

    // --- DATE RANGE UI ---
    const btnDate = document.getElementById('btn-date');
    const datePopup = document.getElementById('date-popup');
    const btnDateDelete = document.getElementById('btn-date-delete');

    btnDate.addEventListener('click', (e) => {
        e.stopPropagation(); 
        const isHidden = datePopup.classList.contains('hidden');
        if (isHidden) {
            datePopup.classList.remove('hidden');
            btnDate.classList.add('active'); 
            // Defaults
            if(!document.getElementById('date-start').value) {
                 document.getElementById('date-start').value = new Date().toISOString().split('T')[0];
                 document.getElementById('date-end').value = new Date().toISOString().split('T')[0];
            }
        } else {
            datePopup.classList.add('hidden');
            btnDate.classList.remove('active');
        }
    });
    document.addEventListener('click', (e) => {
        if (!datePopup.classList.contains('hidden') && !datePopup.contains(e.target) && e.target !== btnDate) {
            datePopup.classList.add('hidden');
            btnDate.classList.remove('active');
        }
    });
    btnDateDelete.addEventListener('click', () => {
        const startStr = document.getElementById('date-start').value;
        const endStr = document.getElementById('date-end').value;
        if (!startStr || !endStr) { alert("Please select both dates."); return; }
        const startTime = new Date(startStr).getTime();
        const endTime = new Date(endStr).setHours(23, 59, 59, 999);
        btnDateDelete.textContent = "Deleting...";
        chrome.history.deleteRange({ startTime, endTime }, () => { window.location.reload(); });
    });

    // --- GROUP BY SITE ---
    const btnGroup = document.getElementById('btn-group');
    let isGroupMode = false;

    btnGroup.addEventListener('click', async () => {
        if (isGroupMode) { window.location.reload(); return; }
        isGroupMode = true;
        btnGroup.classList.add('active');
        btnGroup.innerHTML = "🏢 List View";

        // Fetch deep history 
        container.innerHTML = '<div style="padding:40px; text-align:center; color:var(--text-secondary);">Scanning history clusters...</div>';
        const items = await loader.loadNextBatch(5000); 
        
        const groups = {};
        items.forEach(item => {
            let domain = "unknown";
            try { domain = new URL(item.url).hostname.replace('www.', ''); } catch(e){}
            if (!groups[domain]) groups[domain] = [];
            groups[domain].push(item);
        });

        const sortedDomains = Object.keys(groups).sort((a,b) => groups[b].length - groups[a].length);
        container.innerHTML = ''; // Clear loading

        sortedDomains.forEach(domain => {
            const count = groups[domain].length;
            if (count < 2) return; 

            const groupEl = document.createElement('div');
            groupEl.className = 'history-row';
            groupEl.style.cursor = 'pointer';
            
            // ALIGNMENT FIX: Spacers to match list view columns
            groupEl.innerHTML = `
                <div class="checkbox" style="visibility:hidden"></div>
                <span class="time" style="visibility:hidden">00:00</span>
                <img class="favicon" src="_favicon/?pageUrl=https://${domain}&size=16">
                <div class="content">
                    <span class="title" style="font-weight:600">${domain}</span>
                    <span class="domain">(${count} items)</span>
                </div>
                <button class="pill-btn danger" style="padding:4px 10px; font-size:11px; margin-left:auto;">Delete All</button>
            `;

            groupEl.querySelector('button').addEventListener('click', async (e) => {
                e.stopPropagation();
                if(confirm(`Delete all ${count} visits to ${domain}?`)) {
                    await loader.deleteItems(groups[domain].map(i => i.url));
                    groupEl.remove();
                }
            });

            container.appendChild(groupEl);
        });
        
        if(sentinel) sentinel.style.display = 'none';
    });
}

init();
