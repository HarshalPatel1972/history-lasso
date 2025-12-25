/**
 * RENDER ENGINE (js/render.js)
 * Handles Infinite Scroll Rendering & List View Logic modification
 */

import { HistoryLoader } from './data.js';
import { initLasso } from './lasso.js';

const container = document.getElementById('history-container');
const sentinel = document.getElementById('scroll-sentinel');
const loader = new HistoryLoader();

// State
let currentDateGroup = null; // Tracks current date header to avoid duplicates

async function init() {
    console.log("Render: Booting List View...");

    // 1. Initial Load
    await loadMoreItems();

    // 2. Setup Infinite Scroll Observer
    const observer = new IntersectionObserver(async (entries) => {
        if (entries[0].isIntersecting) {
            console.log("Render: Sentinel hit. Loading more...");
            await loadMoreItems();
        }
    }, { rootMargin: '400px' });
    
    observer.observe(sentinel);

    // 3. Init Lasso (Updated for list rows)
    initLasso(async (action, payload) => {
        if (action === 'delete') {
            await loader.deleteItems(payload); // from data.js
            window.location.reload(); // Simple reload for list view to simplify state
        }
    });

    // 4. Search
    setupSearch();
}

async function loadMoreItems() {
    const items = await loader.loadNextBatch(100);
    
    // Convert to visual rows
    renderList(items);
}

function renderList(items) {
    const frag = document.createDocumentFragment();

    items.forEach(item => {
        const dateObj = new Date(item.lastVisitTime);
        const dateStr = dateObj.toLocaleDateString(undefined, {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        // Date Header
        if (dateStr !== currentDateGroup) {
            const header = document.createElement('div');
            header.className = 'date-header';
            header.textContent = dateStr;
            frag.appendChild(header);
            currentDateGroup = dateStr;
        }

        // Row
        const row = document.createElement('div');
        row.className = 'history-row';
        row.dataset.id = item.id;
        row.dataset.url = item.url;
        
        // Navigation Logic
        row.addEventListener('click', (e) => {
            const hasSelection = document.querySelectorAll('.history-row.selected').length > 0;
            if(!hasSelection && !e.ctrlKey && !e.shiftKey) {
                window.location.href = item.url;
            }
        });

        const timeStr = dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        let domain = "";
        try { domain = new URL(item.url).hostname.replace('www.',''); } catch(e){}

        row.innerHTML = `
            <div class="row-checkbox"></div>
            <div class="row-time">${timeStr}</div>
            <img class="row-favicon" src="_favicon/?pageUrl=${encodeURIComponent(item.url)}&size=16" loading="lazy">
            <div class="row-content">
                <span class="row-title" title="${item.title}">${item.title || item.url}</span>
                <span class="row-domain">${domain}</span>
            </div>
        `;

        frag.appendChild(row);
    });

    // Insert before sentinel (keep sentinel at bottom)
    container.insertBefore(frag, sentinel);
}

function setupSearch() {
    let timer;
    document.getElementById('search-input').addEventListener('input', (e) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            // Reset Rendering
            currentDateGroup = null;
            // Clear existing rows (but keep sentinel)
            // Strategy: Remove everything except sentinel
            while(container.firstChild && container.firstChild !== sentinel) {
                container.removeChild(container.firstChild);
            }
            
            // Reset Loader
            loader.reset(e.target.value);
            loadMoreItems();
        }, 300);
    });
}

init();
