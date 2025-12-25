/**
 * DATA LAYER (js/data.js)
 * Responsible for Chrome API interactions (Fetch, Delete).
 * Designed for reliability and bulk operations.
 */

const MAX_RESULTS = 15000; // Increased to ensure deep archives are fetched

/**
 * Fetch ALL history items from the past
 * @param {number} startTime - specific timestamp to filter from (optional)
 * @returns {Promise<Array>}
 */
export async function fetchAllHistory(startTime = 0, endTime = Date.now()) {
    console.log(`Data Layer: Fetching items from ${new Date(startTime).toLocaleString()} to ${new Date(endTime).toLocaleString()}`);
    
    return new Promise((resolve, reject) => {
        chrome.history.search({
            text: '', 
            startTime: startTime,
            endTime: endTime,
            maxResults: MAX_RESULTS
        }, (results) => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else {
                console.log(`Data Layer: Successfully fetched ${results.length} items`);
                resolve(results);
            }
        });
    });
}

/**
 * Delete a list of URLs
 * @param {Array<string>} urls 
 * @returns {Promise<void>}
 */
export async function deleteItems(urls) {
    if (!urls || urls.length === 0) return;
    
    console.log(`Data Layer: Deleting ${urls.length} items...`);
    
    const promises = urls.map(url => {
        return new Promise(resolve => {
            chrome.history.deleteUrl({ url: url }, () => resolve());
        });
    });

    await Promise.all(promises);
    console.log("Data Layer: Deletion complete.");
}

/**
 * Hard Nuke: Delete range
 */
export async function deleteRange(startTime, endTime) {
    return new Promise(resolve => {
        chrome.history.deleteRange({
            startTime: startTime,
            endTime: endTime
        }, () => {
            console.log("Data Layer: Range Deleted.");
            resolve();
        });
    });
}
