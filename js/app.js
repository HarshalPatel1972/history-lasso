/**
 * APP ENGINE (js/app.js)
 * v6.0 - DEEP FIX: Bulletproof Date Header Logic with Guards
 */

import { HistoryLoader } from './data.js';

// --- GLOBAL STATE (PERSISTENT ACROSS BATCHES) ---
let lastRenderedDateLabel = null;
let isCurrentlyRendering = false; // Guard against race conditions

const loader = new HistoryLoader();
let selectoInstance = null;
let isLassoActive = false;

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
    console.log("🚀 App: Initializing v6.0 (Deep Fix)...");
    
    // Initial Reset
    resetState();
    
    // Infinite Scroll Observer with guard
    let observerTimeout = null;
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !isCurrentlyRendering) {
            // Debounce rapid fire
            clearTimeout(observerTimeout);
            observerTimeout = setTimeout(() => {
                console.log("📜 Scroll Sentinel triggered");
                loadNextBatch();
            }, 100);
        }
    }, { root: null, rootMargin: '400px', threshold: 0.1 });
    
    observer.observe(sentinel);

    // Initial Load
    await loadNextBatch();

    // Listeners
    setupSearch();
    setupLassoToggle();
    setupActions();
}

/**
 * RESET STATE
 */
function resetState(searchQuery = null) {
    console.log("🔄 Resetting state...");
    lastRenderedDateLabel = null;
    isCurrentlyRendering = false;
    
    container.innerHTML = '';
    container.appendChild(sentinel);
    
    loader.reset(searchQuery);
}

/**
 * LOAD NEXT BATCH
 */
async function loadNextBatch() {
    if (isCurrentlyRendering) {
        console.warn("⚠️ Already rendering, skipping duplicate call");
        return;
    }
    if (loader.isLoading) {
        console.warn("⚠️ Loader busy, skipping");
        return;
    }

    isCurrentlyRendering = true;
    const items = await loader.loadNextBatch(100);
    renderRows(items);
    isCurrentlyRendering = false;
}

/**
 * RENDER ROWS (The Critical Function)
 */
function renderRows(items) {
    if (!items || items.length === 0) {
        console.log("✅ No more items to render");
        return;
    }

    console.log(`📦 Rendering ${items.length} items...`);
    const fragment = document.createDocumentFragment();
    
    // Date Helpers
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    items.forEach((item, index) => {
        // --- DATE HEADER LOGIC ---
        const dateObj = new Date(item.lastVisitTime);
        const itemDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
        
        // Formats
        const datePart = dateObj.toLocaleDateString('en-US', { 
            year: 'numeric', month: 'long', day: 'numeric' 
        });
        const fullDatePart = dateObj.toLocaleDateString('en-US', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        });

        let currentLabel = fullDatePart;

        if (itemDate.getTime() === today.getTime()) {
            currentLabel = "Today - " + datePart;
        } else if (itemDate.getTime() === yesterday.getTime()) {
            currentLabel = "Yesterday - " + datePart;
        }

        // Normalize (trim whitespace to prevent false mismatches)
        currentLabel = currentLabel.trim();

        // --- THE CRITICAL CHECK ---
        if (currentLabel !== lastRenderedDateLabel) {
            console.log(`📅 New Date Header: "${currentLabel}" (Previous: "${lastRenderedDateLabel}")`);
            
            const header = document.createElement('div');
            header.className = 'date-header';
            header.textContent = currentLabel;
            fragment.appendChild(header);
            
            // UPDATE GLOBAL STATE IMMEDIATELY
            lastRenderedDateLabel = currentLabel;
        }

        // --- ROW RENDER ---
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

        // Interaction
        row.addEventListener('click', (e) => {
             if (e.target.closest('.checkbox')) { toggleRowSelection(row); return; }
             if (isLassoActive) { toggleRowSelection(row); return; }
             if (!e.ctrlKey && !e.shiftKey && !e.metaKey) { window.location.href = item.url; }
        });

        fragment.appendChild(row);
    });

    // Insert before sentinel
    container.insertBefore(fragment, sentinel);
    console.log(`✅ Rendered ${items.length} items. Current date context: "${lastRenderedDateLabel}"`);
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
            resetState(e.target.value);
            loadNextBatch();
        }, 300);
    });
}

/**
 * LASSO & UI
 */
function setupLassoToggle() {
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
            selectoInstance.destroy();
        }
    });

    document.getElementById('btn-exit').addEventListener('click', () => {
        if(confirm("Open Extensions Settings to disable?")) {
            chrome.tabs.create({ url: "chrome://extensions" });
        }
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
 * ACTIONS
 */
function setupActions() {
    document.getElementById('btn-cancel').addEventListener('click', () => {
        cancelSelection();
        if(selectoInstance) selectoInstance.setSelectedTargets([]);
    });

    document.getElementById('btn-delete').addEventListener('click', async () => {
        const selected = document.querySelectorAll('.history-row.selected');
        const urls = Array.from(selected).map(el => el.dataset.url);
        if (urls.length > 0 && confirm(`Delete ${urls.length} items?`)) {
            await loader.deleteItems(urls);
            window.location.reload();
        }
    });

    // Date Popover
    const btnDate = document.getElementById('btn-date');
    const datePopup = document.getElementById('date-popup');
    const btnDateDelete = document.getElementById('btn-date-delete');

    btnDate.addEventListener('click', (e) => {
        e.stopPropagation();
        datePopup.classList.toggle('hidden');
        btnDate.classList.toggle('active');
        if(!document.getElementById('date-start').value) {
             const ds = new Date().toISOString().split('T')[0];
             document.getElementById('date-start').value = ds;
             document.getElementById('date-end').value = ds;
        }
    });
    document.addEventListener('click', (e) => {
        if (!datePopup.contains(e.target) && e.target !== btnDate) {
            datePopup.classList.add('hidden');
            btnDate.classList.remove('active');
        }
    });
    btnDateDelete.addEventListener('click', () => {
        const s = document.getElementById('date-start').value;
        const e = document.getElementById('date-end').value;
        if(s && e) {
            btnDateDelete.textContent = "Deleting...";
            chrome.history.deleteRange({
                startTime: new Date(s).getTime(),
                endTime: new Date(e).setHours(23,59,59,999)
            }, () => window.location.reload());
        }
    });

    // Group View
    const btnGroup = document.getElementById('btn-group');
    let isGroupMode = false;
    btnGroup.addEventListener('click', async () => {
        if(isGroupMode) { window.location.reload(); return; }
        isGroupMode = true;
        btnGroup.classList.add('active');
        btnGroup.innerHTML = "🏢 List View";
        
        container.innerHTML = '<div style="padding:40px; text-align:center;">Scanning...</div>';
        const items = await loader.loadNextBatch(5000);
        
        const groups = {};
        items.forEach(item => {
            let domain = "unknown";
            try { domain = new URL(item.url).hostname.replace('www.', ''); } catch(e){}
            if (!groups[domain]) groups[domain] = [];
            groups[domain].push(item);
        });

        const sortedDomains = Object.keys(groups).sort((a,b) => groups[b].length - groups[a].length);
        container.innerHTML = ''; 

        sortedDomains.forEach(domain => {
            const count = groups[domain].length;
            if (count < 2) return; 
            const groupEl = document.createElement('div');
            groupEl.className = 'history-row';
            groupEl.style.cursor = 'pointer';
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
                if(confirm('Delete all?')) {
                    await loader.deleteItems(groups[domain].map(i=>i.url));
                    groupEl.remove();
                }
            });
            container.appendChild(groupEl);
        });
        sentinel.style.display = 'none';
    });
}

init();
