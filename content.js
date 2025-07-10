// Listen for messages (now only for floating widget)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggleFloatingWidget") {
        // Toggle the floating widget
        if (window.toggleFloatingWidget) {
            window.toggleFloatingWidget();
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false, message: 'Floating widget not available' });
        }
        return true;
    } else if (request.action === "ping") {
        // Simple ping to check if content script is loaded
        sendResponse({ success: true, message: 'Content script is loaded' });
        return true;
    }
    return true;
});