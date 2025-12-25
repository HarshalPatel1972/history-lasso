/**
 * RENDER ENGINE (js/render.js)
 * Bridges Data Layer <-> UI <-> Lasso
 */

import { fetchAllHistory, deleteItems, deleteRange } from './data.js';
import { initLasso } from './lasso.js';

const grid = document.getElementById('grid-container');
let globalHistory = [];

/**
 * ENTRY POINT
 */
async function init() {
    console.log("Render: Booting...");
    
    // 1. Initial Data Fetch
    await reloadData();
    
    // 2. Initialize Lasso with action callback
    initLasso(async (action, payload) => {
        if (action === 'delete') {
             await deleteItems(payload); // Perform Delete
             await reloadData();         // Re-render
        }
    });

    // 3. UI Event Listeners
    setupFilters();
}

async function reloadData(startTime = 0) {
    try {
        globalHistory = await fetchAllHistory(startTime);
        renderGrid(globalHistory);
    } catch (e) {
        console.error("Render Failed:", e);
    }
}

/**
 * Render Cards to Grid
 */
function renderGrid(items) {
    grid.innerHTML = '';
    
    if (!items || items.length === 0) {
        document.getElementById('empty-state').classList.remove('hidden');
        return;
    } else {
        document.getElementById('empty-state').classList.add('hidden');
    }

    const frag = document.createDocumentFragment();

    items.forEach(item => {
        const title = item.title || item.url;
        // Simple Domain Parse
        let domain = "web";
        try { domain = new URL(item.url).hostname.replace('www.',''); } catch(e){}

        const card = document.createElement('div');
        card.className = 'history-card';
        card.dataset.id = item.id;
        card.dataset.url = item.url; // Critical for deletion

        card.innerHTML = `
            <div class="card-top">
                <img src="_favicon/?pageUrl=${encodeURIComponent(item.url)}&size=32" class="card-icon" loading="lazy">
                <span class="card-domain">${domain}</span>
            </div>
            <div class="card-title" title="${title}">${title}</div>
            <div class="card-time">${new Date(item.lastVisitTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
        `;
        
        // Navigation Click (only if NOT selecting)
        card.addEventListener('click', (e) => {
             // Let Lasso handle Ctrl/Shift or Drag interactions.
             // We only navigate on a pure, clean click.
             // (Logic simplified for MVP: If we have selections, don't nav)
             const hasSelection = document.querySelectorAll('.history-card.selected').length > 0;
             if (!hasSelection && !e.ctrlKey && !e.shiftKey) {
                  window.location.href = item.url;
             }
        });

        frag.appendChild(card);
    });

    grid.appendChild(frag);
}

function setupFilters() {
    // Search
    document.getElementById('search-input').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        const filtered = globalHistory.filter(h => 
            (h.title && h.title.toLowerCase().includes(q)) || 
            (h.url && h.url.toLowerCase().includes(q))
        );
        renderGrid(filtered);
    });
    
    // Time Filter
    document.getElementById('time-filter').addEventListener('change', async (e) => {
        const val = e.target.value;
        let start = 0;
        const now = Date.now();
        const day = 24*60*60*1000;
        
        if (val === 'today') start = now - day;
        if (val === 'week') start = now - (7 * day);
        if (val === 'month') start = now - (30 * day);
        
        await reloadData(start);
    });
}

// Start
init();
