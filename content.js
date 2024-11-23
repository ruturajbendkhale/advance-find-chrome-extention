// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "performSearch") {
        const { searchText, options } = request;

        // Debug log
        console.log('Content script received search text:', searchText);

        // Always clear existing highlights first
        window.clearHighlights();

        if (!searchText) {
            sendResponse({ matchCount: 0, currentMatch: 0 });
            return true;
        }

        try {
            const matches = window.performSearch(searchText, options);
            console.log('Search found matches:', matches);
            
            const highlightCount = window.highlightMatches(matches, searchText);
            console.log('Highlighted count:', highlightCount);
            
            sendResponse({ 
                matchCount: highlightCount, 
                currentMatch: highlightCount > 0 ? 1 : 0 
            });
        } catch (error) {
            console.error('Search error:', error);
            sendResponse({ matchCount: 0, currentMatch: 0 });
        }
    } else if (request.action === "navigateHighlight") {
        const currentIndex = window.currentHighlightIndex;
        const totalHighlights = window.currentHighlights.length;
        
        if (totalHighlights > 0) {
            let newIndex = currentIndex + request.direction;
            if (newIndex >= totalHighlights) newIndex = 0;
            if (newIndex < 0) newIndex = totalHighlights - 1;
            
            updateCurrentHighlight(newIndex);
            sendResponse({
                currentMatch: newIndex + 1,
                matchCount: totalHighlights
            });
        }
        return true;
    }
    return true;
});