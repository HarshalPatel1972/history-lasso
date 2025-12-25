/**
 * RENDER ENGINE
 * Fetches history from Chrome API and renders it to the grid.
 */

import { initLasso } from './lasso.js';
import { injectIcons } from './icons.js';

const grid = document.getElementById('history-grid');
let allHistoryItems = [];

export async function initRender() {
    console.log("Render Engine: Initializing...");
    
    // Inject Icons (Initial static icons)
    injectIcons();
    
    // Setup Controls
    document.getElementById('group-domain-btn').addEventListener('click', toggleGrouping);
    document.getElementById('date-filter').addEventListener('change', handleDateFilter);
    
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => handleSearch(e.target.value));

    await loadHistory();
    initLasso();
}

let currentGrouping = 'domain'; 
let allItemsCache = []; 

async function handleDateFilter(e) {
    const val = e.target.value;
    let startTime = 0;
    const now = Date.now();
    
    if (val === '24h') startTime = now - (24 * 60 * 60 * 1000);
    else if (val === '7d') startTime = now - (7 * 24 * 60 * 60 * 1000);
    else if (val === '30d') startTime = now - (30 * 24 * 60 * 60 * 1000);
    
    console.log(`Filtering history from: ${new Date(startTime).toLocaleString()}`);
    await loadHistory(startTime);
    initLasso();
}

function toggleGrouping() {
    currentGrouping = (currentGrouping === 'domain') ? 'flat' : 'domain';
    renderItems(allItemsCache, currentGrouping);
    // Re-init lasso because DOM changed
    initLasso();
}

function handleSearch(query) {
    const lowerQ = query.toLowerCase();
    const filtered = allItemsCache.filter(item => {
        return (item.title && item.title.toLowerCase().includes(lowerQ)) || 
               (item.url && item.url.toLowerCase().includes(lowerQ));
    });
    renderItems(filtered, currentGrouping);
    initLasso();
}

/**
 * Fetch history from Chrome API
 */
async function loadHistory(startTime = 0) {
    try {
        const items = await chrome.history.search({
            text: '', 
            maxResults: 10000, // Increased capacity
            startTime: startTime 
        });
        allItemsCache = items;
        renderItems(items);
    } catch (e) {
        console.error("History error:", e);
        grid.innerHTML = `<div class="error-msg" style="padding: 20px; color: #ef4444;">
            <h3>Error Loading History</h3>
            <p>${e.message}</p>
            <p>Please ensure you have visited sites or check console for details.</p>
        </div>`;
    }
}

function renderMockData() {
    grid.innerHTML = '<div style="color:white; padding:20px;">Chrome History API not available (Local Dev Mode).</div>';
}

export function renderItems(items, groupBy = 'domain') {
    grid.innerHTML = '';
    
    if (!items || items.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 50px; color: var(--text-secondary);">No history items found matching your criteria.</div>';
        return;
    }

    const fragment = document.createDocumentFragment();

    if (groupBy === 'domain') {
        const groups = {};
        
        // 1. Group items
        items.forEach(item => {
            let domain = 'unknown';
            try {
                const url = new URL(item.url);
                domain = url.hostname.replace('www.', '');
            } catch(e) {}
            
            if (!groups[domain]) groups[domain] = [];
            groups[domain].push(item);
        });

        // 2. Sort domains by count (descending)
        const sortedDomains = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);

        // 3. Render Groups
        sortedDomains.forEach(domain => {
            // Group Header
            const header = document.createElement('div');
            header.className = 'group-header';
            header.textContent = `${domain} (${groups[domain].length})`;
            fragment.appendChild(header);

            // Cards
            groups[domain].forEach(item => {
                fragment.appendChild(createCard(item, domain));
            });
        });

    } else {
        // Flat list
        items.forEach(item => {
            fragment.appendChild(createCard(item));
        });
    }

    grid.appendChild(fragment);
    
    // Inject icons for the newly rendered cards
    injectIcons();
}

function createCard(item, domainName) {
    const el = document.createElement('div');
    el.className = 'history-card';
    el.dataset.id = item.id; 
    el.dataset.url = item.url;
    el.dataset.title = item.title;

    if (!domainName) {
         try { domainName = new URL(item.url).hostname.replace('www.', ''); } catch(e) { domainName = 'unknown'; }
    }

    const date = new Date(item.lastVisitTime);
    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    // Use a clearer favicon service or fallback
    // chrome://favicon/ is native but restricted. 
    // _favicon/ is the MV3 way.
    const faviconUrl = `_favicon/?pageUrl=${encodeURIComponent(item.url)}&size=32`;

    el.innerHTML = `
        <div class="card-header">
            <img src="${faviconUrl}" class="card-favicon" alt="">
            <span class="card-domain">${domainName}</span>
        </div>
        <div class="card-title" title="${item.title || item.url}">${item.title || 'No Title'}</div>
        <div class="card-time">${dateStr}</div>
    `;

    // Click navigation
    el.addEventListener('click', (e) => {
        // If selecting, don't navigate
        if (el.classList.contains('selected') || e.ctrlKey || e.shiftKey) return;
        
        // Check if Selecto is dragging (approximate by checking a global flag if needed)
        // For now, rely on standard click
        window.location.href = item.url;
    });

    return el;
}
