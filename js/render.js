/**
 * RENDER ENGINE (js/render.js)
 * Mimics Native Chrome History List logic.
 */

import { HistoryLoader } from './data.js';
import { initLasso, toggleLasso } from './lasso.js';

const listContainer = document.getElementById('history-list');
const sentinel = document.getElementById('scroll-sentinel');
const loader = new HistoryLoader();
let lastRenderedDate = null;
let currentMode = 'list'; // 'list' or 'grouped'

async function init() {
    console.log("Renderer: Initializing Native Clone...");

    // 1. Initial Load
    await loadNextPage();

    // 2. Observer for Infinite Scroll
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && currentMode === 'list') {
            loadNextPage();
        }
    }, { rootMargin: '200px' });
    observer.observe(sentinel);

    // 3. UI Hooks
    setupSuperToolbar();
    setupSearch();
    
    // 4. Lasso Init (passed callback for delete)
    initLasso(async (action, payload) => {
        if (action === 'delete') {
            await loader.deleteItems(payload); // from data.js
            window.location.reload(); 
        }
    });
}

/**
 * Loads and appends the next batch of items
 */
async function loadNextPage() {
    const items = await loader.loadNextBatch(150); // Fetch 150 at a time
    renderNativeRows(items);
}

/**
 * Renders standard native rows
 */
function renderNativeRows(items) {
    const fragment = document.createDocumentFragment();

    items.forEach(item => {
        // Date Grouping
        const dateStr = new Date(item.lastVisitTime).toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric', year:'numeric'});
        
        if (dateStr !== lastRenderedDate) {
            const header = document.createElement('h2');
            header.className = 'native-date-header';
            header.textContent = dateStr;
            fragment.appendChild(header);
            lastRenderedDate = dateStr;
        }

        // Row Item
        const row = document.createElement('div');
        row.className = 'native-row';
        row.dataset.id = item.id;
        row.dataset.url = item.url;
        
        // Data prep
        const timeStr = new Date(item.lastVisitTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        let domain = "";
        try{ domain = new URL(item.url).hostname; }catch(e){}

        row.innerHTML = `
            <div class="checkbox-area">
                <input type="checkbox" class="native-checkbox" tabindex="-1">
            </div>
            <span class="time">${timeStr}</span>
            <div class="favicon-wrapper">
                <img src="_favicon/?pageUrl=${encodeURIComponent(item.url)}&size=16">
            </div>
            <div class="meta-area">
                <a href="${item.url}" class="title" title="${item.title}">${item.title || item.url}</a>
                <span class="domain">${domain}</span>
            </div>
            <div class="actions-area">
                 <!-- Hamburger menu placeholder -->
                 <span class="more-btn">⋮</span>
            </div>
        `;

        // Click Logic (Navigation vs Selection)
        row.addEventListener('click', (e) => {
             // If clicking checkbox/action area, don't navigate
             if(e.target.closest('.checkbox-area') || e.target.closest('.actions-area')) return;
             
             // If Lasso is ON, block nav
             if (document.body.classList.contains('lasso-active')) {
                 e.preventDefault();
                 return;
             }
             // Else, the <a href> handles nav natively
        });

        fragment.appendChild(row);
    });

    listContainer.insertBefore(fragment, sentinel);
}

/**
 * Super Toolbar Logic
 */
function setupSuperToolbar() {
    // 1. Date Range
    document.getElementById('tab-date').addEventListener('click', () => {
        document.getElementById('date-popover').classList.toggle('hidden');
    });

    // 2. Lasso Toggle
    const lassoBtn = document.getElementById('tab-lasso');
    const statusText = document.getElementById('lasso-status');
    
    lassoBtn.addEventListener('click', () => {
        const isActive = toggleLasso(); // Helper in lasso.js
        if (isActive) {
            document.body.classList.add('lasso-active');
            statusText.textContent = "ON";
            statusText.style.color = "#1a73e8"; // Active Blue
        } else {
            document.body.classList.remove('lasso-active');
            statusText.textContent = "OFF";
            statusText.style.color = "inherit";
        }
    });
    
    // Group By Site (Simple refresh with sort/cluster logic, placeholder for now)
    document.getElementById('tab-group').addEventListener('click', async () => {
        if(currentMode === 'list') {
             // Switch to Group mode (mockup logic)
             currentMode = 'grouped';
             alert("Group by Site view would trigger here (Sorting by domain).");
        } else {
             currentMode = 'list';
             window.location.reload();
        }
    });
}

function setupSearch() {
    let timer;
    document.getElementById('search-input').addEventListener('input', (e) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            // Hard Reset
            lastRenderedDate = null;
            // Clear all rows except sentinel
            Array.from(listContainer.children).forEach(child => {
                if (child.id !== 'scroll-sentinel') child.remove(); 
            });
            loader.reset(e.target.value);
            loadNextPage();
        }, 300);
    });
}

init();
