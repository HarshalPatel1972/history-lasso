// BACKGROUND.JS
// Handles extension icon click -> Open Dashboard
chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: 'dashboard.html' });
});
