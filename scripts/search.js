function performSearch(text, options = {}) {
    const {
        matchCase = false,
        wholeWord = false,
        searchHidden = true // New option to search hidden elements
    } = options;

    if (!text) return { visible: [], hidden: [], expandableElements: [] };

    console.log('Searching for:', text, 'with options:', options);

    const visibleResults = [];
    const hiddenResults = [];
    const expandableElements = new Set();
    const searchText = matchCase ? text : text.toLowerCase();

    // Create a tree walker to iterate through ALL text nodes (including hidden ones)
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: (node) => {
                const parent = node.parentElement;
                // Skip script, style, and highlight elements, but include hidden content
                if (!parent || 
                    parent.tagName === 'SCRIPT' || 
                    parent.tagName === 'STYLE' || 
                    parent.tagName === 'NOSCRIPT' ||
                    parent.classList.contains('atf-highlight') ||
                    parent.classList.contains('atf-hidden-indicator')) {
                    return NodeFilter.FILTER_REJECT;
                }
                // Only process nodes with actual text content
                if (!node.textContent.trim()) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    let node;
    while (node = walker.nextNode()) {
        const nodeText = matchCase ? node.textContent : node.textContent.toLowerCase();
        
        if (!nodeText) continue;

        // Find all occurrences of the search text in this node
        let startIndex = 0;
        const indices = [];
        
        while (true) {
            const index = nodeText.indexOf(searchText, startIndex);
            if (index === -1) break;

            // Check whole word constraint if needed
            if (wholeWord) {
                const prevChar = nodeText[index - 1];
                const nextChar = nodeText[index + searchText.length];
                if (isAlphanumeric(prevChar) || isAlphanumeric(nextChar)) {
                    startIndex = index + 1;
                    continue;
                }
            }

            indices.push(index);
            startIndex = index + 1;
        }

        if (indices.length > 0) {
            const isVisible = isElementVisible(node);
            const result = {
                node: node,
                indices: indices,
                originalText: node.textContent,
                isVisible: isVisible
            };

            if (isVisible) {
                visibleResults.push(result);
            } else {
                hiddenResults.push(result);
                // Find the closest expandable parent element
                const expandableParent = findExpandableParent(node);
                if (expandableParent) {
                    expandableElements.add(expandableParent);
                }
            }
        }
    }

    console.log('Search found:', visibleResults.length, 'visible results,', hiddenResults.length, 'hidden results');
    console.log('Expandable elements with hidden matches:', expandableElements.size);

    return {
        visible: visibleResults,
        hidden: hiddenResults,
        expandableElements: Array.from(expandableElements)
    };
}

function isElementVisible(node) {
    let element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    
    while (element && element !== document.body) {
        const style = window.getComputedStyle(element);
        
        // Check for common ways elements are hidden
        if (style.display === 'none' ||
            style.visibility === 'hidden' ||
            style.opacity === '0' ||
            element.hidden ||
            element.getAttribute('aria-hidden') === 'true') {
            return false;
        }
        
        // Check for collapsed state
        if (element.getAttribute('aria-expanded') === 'false' ||
            element.classList.contains('collapsed') ||
            element.classList.contains('closed')) {
            return false;
        }
        
        // Check if element is outside viewport (might be in hidden scrollable area)
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
            return false;
        }
        
        element = element.parentElement;
    }
    
    return true;
}

function findExpandableParent(node) {
    let element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    
    while (element && element !== document.body) {
        // Check for common expandable element patterns
        if (isExpandableElement(element)) {
            return element;
        }
        
        // Check if parent might be the expandable trigger
        const parent = element.parentElement;
        if (parent && isExpandableElement(parent)) {
            return parent;
        }
        
        element = parent;
    }
    
    return null;
}

function isExpandableElement(element) {
    if (!element) return false;
    
    // Check for common expandable patterns
    const tagName = element.tagName.toLowerCase();
    const classNames = element.className.toLowerCase();
    const role = element.getAttribute('role');
    
    // Common dropdown/expandable patterns
    if (tagName === 'details' ||
        role === 'button' && element.getAttribute('aria-expanded') !== null ||
        role === 'tabpanel' ||
        classNames.includes('dropdown') ||
        classNames.includes('accordion') ||
        classNames.includes('collaps') ||
        classNames.includes('expand') ||
        classNames.includes('toggle') ||
        element.hasAttribute('data-toggle') ||
        element.hasAttribute('data-bs-toggle') ||
        element.hasAttribute('data-target') ||
        element.hasAttribute('data-bs-target')) {
        return true;
    }
    
    // Check for click handlers that might expand content
    if (element.onclick || 
        element.getAttribute('onclick') ||
        element.addEventListener) {
        // Additional heuristics for expandable elements
        const text = element.textContent.toLowerCase();
        if (text.includes('show') || text.includes('more') || text.includes('expand') ||
            text.includes('▼') || text.includes('▲') || text.includes('►') || text.includes('▶')) {
            return true;
        }
    }
    
    return false;
}

function isAlphanumeric(char) {
    return char && /[\w\u00C0-\u024F\u0100-\u017F\u0180-\u024F]/.test(char);
}

// Keep backward compatibility while extending functionality
window.performSearch = performSearch;