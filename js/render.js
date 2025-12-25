/**
 * RENDER ENGINE
 * Fetches history from Chrome API and renders it to the grid.
 */

import { initLasso } from './lasso.js';

const grid = document.getElementById('history-grid');
let allHistoryItems = [];

export async function initRender() {
    console.log("Render Engine: Initializing...");
    
    // Setup Controls
    document.getElementById('group-domain-btn').addEventListener('click', toggleGrouping);
    
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => handleSearch(e.target.value));

    await loadHistory();
    initLasso();
}

let currentGrouping = 'domain'; // Default
let allItemsCache = []; // Renamed for clarity within module scope

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

async function loadHistory() {
    try {
        const items = await chrome.history.search({
            text: '', 
            maxResults: 2000, // Limit for performance
            startTime: 0 
        });
        allItemsCache = items;
        renderItems(items);
    } catch (e) {
        console.error("History error:", e);
        // Dev Mock Data if API fails (for local testing purposes)
        if (!chrome.history) {
            renderMockData();
        }
    }
}

function renderMockData() {
    grid.innerHTML = '<div style="color:white; padding:20px;">Chrome History API not available (Local Dev Mode).</div>';
}

export function renderItems(items, groupBy = 'domain') {
    grid.innerHTML = '';
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
