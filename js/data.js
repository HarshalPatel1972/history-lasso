/**
 * DATA LAYER (js/data.js)
 * Implements Infinite Scroll via "Cursor-based Fetching".
 */

export class HistoryLoader {
    constructor() {
        this.cursorTime = Date.now(); // Start fetching from NOW
        this.isFinished = false;      // True if Chrome says no more items
        this.isLoading = false;
        // Search specific
        this.searchQuery = '';
    }

    /**
     * Resets the loader (e.g. when user types new search)
     */
    reset(query = '') {
        this.cursorTime = Date.now();
        this.isFinished = false;
        this.searchQuery = query;
        this.isLoading = false;
        console.log("HistoryLoader: Reset. Query:", query);
    }

    /**
     * Fetches the next batch of simple history items.
     * @param {number} pageSize 
     * @returns {Promise<Array>}
     */
    async loadNextBatch(pageSize = 100) {
        if (this.isFinished || this.isLoading) return [];

        this.isLoading = true;

        return new Promise((resolve) => {
            console.log(`HistoryLoader: Fetching batch ending at ${this.cursorTime}...`);

            chrome.history.search({
                text: this.searchQuery || '',
                endTime: this.cursorTime,
                startTime: 0, // CRITICAL: Default is 24hrs ago. 0 means "The Big Bang"
                maxResults: pageSize
            }, (results) => {
                this.isLoading = false;

                if (!results || results.length === 0) {
                    this.isFinished = true;
                    resolve([]);
                    return;
                }

                // CRITICAL FIX: Force sort results by time (newest first)
                // Chrome doesn't guarantee order, which causes date headers to duplicate
                results.sort((a, b) => b.lastVisitTime - a.lastVisitTime);

                // Update cursor to the timestamp of the LAST item (oldest in this batch)
                const lastItem = results[results.length - 1];
                
                // Chrome's 'endTime' is exclusive (items < endTime), subtract 1ms for safety
                this.cursorTime = lastItem.lastVisitTime - 1; 

                // If we got fewer than requested, we are likely done
                if (results.length < pageSize) {
                    this.isFinished = true;
                }

                console.log(`HistoryLoader: Fetched ${results.length} items. Oldest: ${new Date(lastItem.lastVisitTime).toLocaleString()}`);
                resolve(results);
            });
        });
    }

    /**
     * Deletes a specific set of URLs
     */
    async deleteItems(urls) {
        if(!urls || urls.length===0) return;
        const promises = urls.map(url => {
            return new Promise(r => chrome.history.deleteUrl({url}, r));
        });
        await Promise.all(promises);
    }
}
