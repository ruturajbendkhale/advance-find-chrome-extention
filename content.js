// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "performSearch") {
        const { searchText, options } = request;

        // Debug log
        console.log('Content script received search text:', searchText);

        // Always clear existing highlights first
        window.clearHighlights();

        if (!searchText) {
            sendResponse({ 
                matchCount: 0, 
                currentMatch: 0,
                visibleCount: 0,
                hiddenCount: 0,
                expandableCount: 0
            });
            return true;
        }

        try {
            const searchResults = window.performSearch(searchText, options);
            console.log('Search found results:', searchResults);
            
            const highlightResults = window.highlightMatches(searchResults, searchText);
            console.log('Highlight results:', highlightResults);
            
            // Handle both old and new result formats
            let visibleCount, hiddenCount, expandableCount;
            
            if (typeof highlightResults === 'number') {
                // Old format - just visible count
                visibleCount = highlightResults;
                hiddenCount = 0;
                expandableCount = 0;
            } else {
                // New format with detailed counts
                visibleCount = highlightResults.visible || 0;
                hiddenCount = highlightResults.hidden || 0;
                expandableCount = highlightResults.expandable || 0;
            }
            
            sendResponse({ 
                matchCount: visibleCount, // For backward compatibility
                currentMatch: visibleCount > 0 ? 1 : 0,
                visibleCount: visibleCount,
                hiddenCount: hiddenCount,
                expandableCount: expandableCount
            });
        } catch (error) {
            console.error('Search error:', error);
            sendResponse({ 
                matchCount: 0, 
                currentMatch: 0,
                visibleCount: 0,
                hiddenCount: 0,
                expandableCount: 0
            });
        }
    } else if (request.action === "navigateHighlight") {
        const currentIndex = window.currentHighlightIndex;
        const totalHighlights = window.currentHighlights.length;
        
        if (totalHighlights > 0) {
            let newIndex = currentIndex + request.direction;
            if (newIndex >= totalHighlights) newIndex = 0;
            if (newIndex < 0) newIndex = totalHighlights - 1;
            
            window.updateCurrentHighlight(newIndex);
            sendResponse({
                currentMatch: newIndex + 1,
                matchCount: totalHighlights,
                visibleCount: totalHighlights,
                hiddenCount: window.hiddenMatches ? window.hiddenMatches.reduce((sum, result) => sum + result.indices.length, 0) : 0,
                expandableCount: window.expandableElements ? window.expandableElements.length : 0
            });
        } else {
            sendResponse({
                currentMatch: 0,
                matchCount: 0,
                visibleCount: 0,
                hiddenCount: window.hiddenMatches ? window.hiddenMatches.reduce((sum, result) => sum + result.indices.length, 0) : 0,
                expandableCount: window.expandableElements ? window.expandableElements.length : 0
            });
        }
        return true;
    } else if (request.action === "expandAll") {
        // New action to expand all elements with hidden matches
        if (window.expandableElements && window.expandableElements.length > 0) {
            console.log('Expanding all elements with hidden matches...');
            window.expandableElements.forEach(element => {
                window.expandElement(element, request.searchText);
            });
            
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false, message: 'No expandable elements found' });
        }
        return true;
    } else if (request.action === "toggleFloatingWidget") {
        // Toggle the floating widget
        if (window.toggleFloatingWidget) {
            window.toggleFloatingWidget();
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false, message: 'Floating widget not available' });
        }
        return true;
    }
    return true;
});