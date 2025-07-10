window.currentHighlightIndex = -1;
window.currentHighlights = [];
window.hiddenMatches = [];
window.expandableElements = [];

function highlightMatches(searchResults, searchText) {
    clearHighlights();
    
    if (!searchResults || (!searchResults.visible && !searchResults.length)) {
        return { visible: 0, hidden: 0, expandable: 0 };
    }

    console.log('Highlighting matches for:', searchText);

    // Handle backward compatibility - if searchResults is an array, treat as visible results
    let visibleResults = Array.isArray(searchResults) ? searchResults : searchResults.visible || [];
    let hiddenResults = Array.isArray(searchResults) ? [] : searchResults.hidden || [];
    let expandableElements = Array.isArray(searchResults) ? [] : searchResults.expandableElements || [];

    // Store hidden matches and expandable elements globally
    window.hiddenMatches = hiddenResults;
    window.expandableElements = expandableElements;

    let totalVisibleHighlights = 0;

    // Highlight visible matches
    if (visibleResults.length > 0) {
        visibleResults.forEach(({ node, indices, originalText }) => {
            if (!node || !node.parentNode || indices.length === 0) return;

            totalVisibleHighlights += highlightTextNode(node, indices, originalText, searchText, false);
        });
    }

    // Add indicators for expandable elements with hidden matches
    expandableElements.forEach(element => {
        const hiddenCount = getHiddenMatchCount(element, hiddenResults);
        if (hiddenCount > 0) {
            addHiddenMatchIndicator(element, hiddenCount, searchText);
        }
    });

    // Reverse the highlights array since we built it backwards
    window.currentHighlights.reverse();

    console.log('Total visible highlights:', totalVisibleHighlights);
    console.log('Hidden matches in', expandableElements.length, 'expandable elements');

    if (window.currentHighlights.length > 0) {
        updateCurrentHighlight(0);
    }

    return {
        visible: totalVisibleHighlights,
        hidden: hiddenResults.reduce((sum, result) => sum + result.indices.length, 0),
        expandable: expandableElements.length
    };
}

function highlightTextNode(node, indices, originalText, searchText, isHidden = false) {
    // Sort indices in descending order to replace from end to beginning
    const sortedIndices = [...indices].sort((a, b) => b - a);
    
    // Create document fragment to build the new content
    const fragment = document.createDocumentFragment();
    let lastIndex = originalText.length;
    let highlightCount = 0;
    
    // Process indices from right to left (highest to lowest)
    sortedIndices.forEach(index => {
        // Add text after this match (if any)
        if (lastIndex > index + searchText.length) {
            const afterText = originalText.substring(index + searchText.length, lastIndex);
            fragment.insertBefore(
                document.createTextNode(afterText),
                fragment.firstChild
            );
        }
        
        // Create highlight span for the match
        const highlight = document.createElement('span');
        highlight.className = isHidden ? 'atf-highlight atf-hidden-highlight' : 'atf-highlight';
        highlight.textContent = originalText.substring(index, index + searchText.length);
        fragment.insertBefore(highlight, fragment.firstChild);
        
        if (!isHidden) {
            window.currentHighlights.unshift(highlight);
        }
        highlightCount++;
        
        lastIndex = index;
    });
    
    // Add text before the first match (if any)
    if (lastIndex > 0) {
        const beforeText = originalText.substring(0, lastIndex);
        fragment.insertBefore(
            document.createTextNode(beforeText),
            fragment.firstChild
        );
    }
    
    // Replace the text node with our highlighted fragment
    const parent = node.parentNode;
    parent.insertBefore(fragment, node);
    parent.removeChild(node);
    
    return highlightCount;
}

function getHiddenMatchCount(expandableElement, hiddenResults) {
    let count = 0;
    hiddenResults.forEach(result => {
        if (expandableElement.contains(result.node)) {
            count += result.indices.length;
        }
    });
    return count;
}

function addHiddenMatchIndicator(element, hiddenCount, searchText) {
    // Check if indicator already exists
    const existingIndicator = element.querySelector('.atf-hidden-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }

    // Create indicator element
    const indicator = document.createElement('div');
    indicator.className = 'atf-hidden-indicator';
    indicator.innerHTML = `
        <span class="atf-indicator-badge">${hiddenCount}</span>
        <span class="atf-indicator-text">hidden matches</span>
        <button class="atf-expand-btn" title="Click to expand and reveal hidden matches">
            <svg width="12" height="12" viewBox="0 0 12 12">
                <path d="M6 9L1 4h10L6 9z" fill="currentColor"/>
            </svg>
        </button>
    `;
    
    // Position indicator
    indicator.style.cssText = `
        position: absolute;
        top: -8px;
        right: -8px;
        z-index: 10000;
        background: #ff6600;
        color: white;
        padding: 2px 6px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: bold;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
    `;

    // Make sure the parent element has relative positioning
    const parentStyle = window.getComputedStyle(element);
    if (parentStyle.position === 'static') {
        element.style.position = 'relative';
    }

    // Add click handler to expand element
    const expandBtn = indicator.querySelector('.atf-expand-btn');
    expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        expandElement(element, searchText);
    });

    element.appendChild(indicator);
}

function expandElement(element, searchText) {
    console.log('Attempting to expand element:', element);
    
    // Try different expansion methods
    try {
        // Method 1: Click the element if it's clickable
        if (element.tagName === 'DETAILS') {
            element.open = true;
        } else if (element.getAttribute('aria-expanded') === 'false') {
            element.setAttribute('aria-expanded', 'true');
            element.click();
        } else if (element.hasAttribute('data-toggle') || element.hasAttribute('data-bs-toggle')) {
            element.click();
        } else {
            // Generic click attempt
            element.click();
        }

        // Wait a moment then re-search to highlight newly visible content
        setTimeout(() => {
            const hiddenMatches = window.hiddenMatches.filter(result => 
                element.contains(result.node) && isElementVisible(result.node)
            );
            
            if (hiddenMatches.length > 0) {
                console.log('Found', hiddenMatches.length, 'newly visible matches after expansion');
                hiddenMatches.forEach(({ node, indices, originalText }) => {
                    highlightTextNode(node, indices, originalText, searchText, false);
                });
                
                // Update the indicator
                const indicator = element.querySelector('.atf-hidden-indicator');
                if (indicator) {
                    const remainingHidden = getHiddenMatchCount(element, window.hiddenMatches);
                    if (remainingHidden === 0) {
                        indicator.remove();
                    } else {
                        const badge = indicator.querySelector('.atf-indicator-badge');
                        badge.textContent = remainingHidden;
                    }
                }
            }
        }, 200);
        
    } catch (error) {
        console.error('Error expanding element:', error);
    }
}

function clearHighlights() {
    console.log('Clearing', window.currentHighlights.length, 'highlights');
    
    // Remove all highlight spans and replace with their text content
    window.currentHighlights.forEach(highlight => {
        if (highlight && highlight.parentNode) {
            const textNode = document.createTextNode(highlight.textContent);
            highlight.parentNode.replaceChild(textNode, highlight);
        }
    });
    
    // Remove hidden match indicators
    document.querySelectorAll('.atf-hidden-indicator').forEach(indicator => {
        indicator.remove();
    });
    
    // Clean up arrays
    window.currentHighlights = [];
    window.hiddenMatches = [];
    window.expandableElements = [];
    window.currentHighlightIndex = -1;
    
    // Normalize text nodes that might have been split
    normalizeTextNodes(document.body);
}

function normalizeTextNodes(element) {
    // Merge adjacent text nodes that might have been created during highlight removal
    let child = element.firstChild;
    while (child) {
        if (child.nodeType === Node.TEXT_NODE && child.nextSibling && child.nextSibling.nodeType === Node.TEXT_NODE) {
            child.textContent += child.nextSibling.textContent;
            element.removeChild(child.nextSibling);
        } else {
            if (child.nodeType === Node.ELEMENT_NODE) {
                normalizeTextNodes(child);
            }
            child = child.nextSibling;
        }
    }
}

function updateCurrentHighlight(index) {
    // Remove current highlight class from previous highlight
    if (window.currentHighlightIndex !== -1 && 
        window.currentHighlightIndex < window.currentHighlights.length &&
        window.currentHighlights[window.currentHighlightIndex]) {
        window.currentHighlights[window.currentHighlightIndex].classList.remove('atf-current-highlight');
    }
    
    // Set new current highlight
    window.currentHighlightIndex = index;
    const current = window.currentHighlights[index];
    
    if (current && current.parentNode) {
        current.classList.add('atf-current-highlight');
        
        // Scroll to the current highlight with better positioning
        current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
        });
        
        console.log('Navigated to highlight:', index + 1, 'of', window.currentHighlights.length);
    }
}

// Import isElementVisible function for expansion checking
function isElementVisible(node) {
    let element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    
    while (element && element !== document.body) {
        const style = window.getComputedStyle(element);
        
        if (style.display === 'none' ||
            style.visibility === 'hidden' ||
            style.opacity === '0' ||
            element.hidden ||
            element.getAttribute('aria-hidden') === 'true') {
            return false;
        }
        
        if (element.getAttribute('aria-expanded') === 'false' ||
            element.classList.contains('collapsed') ||
            element.classList.contains('closed')) {
            return false;
        }
        
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
            return false;
        }
        
        element = element.parentElement;
    }
    
    return true;
}

// Make functions available globally
window.highlightMatches = highlightMatches;
window.clearHighlights = clearHighlights;
window.updateCurrentHighlight = updateCurrentHighlight;
window.expandElement = expandElement;