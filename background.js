chrome.commands.onCommand.addListener((command) => {
    if (command === "toggle_floating_widget") {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {action: "toggleFloatingWidget"});
        });
    }
});

// Handle installation
chrome.runtime.onInstalled.addListener(() => {
    // Initialize extension
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            // Check if tab and tab.url exist and it's a valid URL for injection
            if (tab && tab.url && 
                !tab.url.startsWith('chrome://') && 
                !tab.url.startsWith('chrome-extension://') &&
                !tab.url.startsWith('edge://') &&
                !tab.url.startsWith('about:')) {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                }).catch(err => console.log('Script injection failed for tab:', tab.id));
            }
        });
    });
});