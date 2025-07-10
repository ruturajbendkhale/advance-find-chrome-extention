function findClickableTrigger(hiddenElement) {
    let current = hiddenElement;
    
    // Walk up the DOM tree to find the clickable trigger
    while (current && current !== document.body) {
        // Check if current element or its siblings are clickable triggers
        const trigger = findTriggerForElement(current);
        if (trigger) {
            return trigger;
        }
        current = current.parentElement;
    }
    
    return null;
}

function findTriggerForElement(element) {
    if (!element) return null;
    
    // Common patterns for clickable triggers
    const triggers = [];
    
    // 1. Look for buttons/links that control this element
    const potentialTriggers = document.querySelectorAll(`
        button[data-target*="${element.id}"],
        button[data-bs-target*="${element.id}"],
        button[aria-controls="${element.id}"],
        a[data-target*="${element.id}"],
        a[data-bs-target*="${element.id}"],
        a[aria-controls="${element.id}"],
        [data-toggle][data-target*="${element.id}"],
        [data-bs-toggle][data-bs-target*="${element.id}"]
    `);
    
    triggers.push(...potentialTriggers);
    
    // 2. Look for parent/sibling elements that might be triggers
    if (element.parentElement) {
        const parent = element.parentElement;
        
        // Check for summary/details pattern
        const summary = parent.querySelector('summary');
        if (summary && parent.tagName === 'DETAILS') {
            triggers.push(summary);
        }
        
        // Check for accordion headers (common patterns)
        const accordionHeaders = parent.querySelectorAll(`
            .accordion-header button,
            .card-header button,
            .panel-heading a,
            .collapsible-header,
            .toggle-header,
            [role="tab"],
            [role="button"][aria-expanded]
        `);
        triggers.push(...accordionHeaders);
        
        // Check for dropdown triggers
        const dropdownTriggers = parent.querySelectorAll(`
            .dropdown-toggle,
            .dropdown-button,
            [data-toggle="dropdown"],
            [data-bs-toggle="dropdown"],
            button[aria-haspopup="true"]
        `);
        triggers.push(...dropdownTriggers);
        
        // Check previous sibling elements (often the trigger is right before hidden content)
        let sibling = element.previousElementSibling;
        while (sibling) {
            if (isLikelyTrigger(sibling)) {
                triggers.push(sibling);
                break;
            }
            sibling = sibling.previousElementSibling;
        }
    }
    
    // 3. Check for elements with click handlers that might control visibility
    const clickableElements = document.querySelectorAll(`
        [onclick*="${element.id}"],
        [onclick*="toggle"],
        [onclick*="show"],
        [onclick*="expand"],
        [onclick*="collapse"]
    `);
    triggers.push(...clickableElements);
    
    // Return the most appropriate trigger
    return findBestTrigger(triggers, element);
}

function isLikelyTrigger(element) {
    const tagName = element.tagName.toLowerCase();
    const className = (element.className && typeof element.className === 'string') ? element.className.toLowerCase() : '';
    const textContent = element.textContent ? element.textContent.toLowerCase() : '';
    
    // Check tag types
    if (['button', 'a', 'summary'].includes(tagName)) {
        return true;
    }
    
    // Check for common trigger classes
    if (className.includes('toggle') || 
        className.includes('expand') || 
        className.includes('collapse') ||
        className.includes('dropdown') ||
        className.includes('accordion') ||
        className.includes('tab')) {
        return true;
    }
    
    // Check for trigger-like text content
    if (textContent.includes('show') ||
        textContent.includes('more') ||
        textContent.includes('expand') ||
        textContent.includes('▼') ||
        textContent.includes('▲') ||
        textContent.includes('►') ||
        textContent.includes('▶') ||
        textContent.includes('⯈') ||
        textContent.includes('⯆')) {
        return true;
    }
    
    // Check for ARIA attributes
    if (element.hasAttribute('aria-expanded') ||
        element.hasAttribute('aria-controls') ||
        element.getAttribute('role') === 'button' ||
        element.getAttribute('role') === 'tab') {
        return true;
    }
    
    return false;
}

function findBestTrigger(triggers, targetElement) {
    if (triggers.length === 0) return null;
    if (triggers.length === 1) return triggers[0];
    
    // Score triggers based on how likely they are to be the right one
    const scoredTriggers = triggers.map(trigger => ({
        element: trigger,
        score: scoreTrigger(trigger, targetElement)
    }));
    
    // Sort by score (highest first)
    scoredTriggers.sort((a, b) => b.score - a.score);
    
    return scoredTriggers[0].element;
}

function scoreTrigger(trigger, targetElement) {
    let score = 0;
    
    // Higher score for closer proximity
    if (trigger.parentElement === targetElement.parentElement) score += 50;
    if (trigger.nextElementSibling === targetElement) score += 30;
    
    // Higher score for semantic relationships
    if (trigger.getAttribute('aria-controls') === targetElement.id) score += 100;
    if (trigger.dataset.target && targetElement.id && trigger.dataset.target.includes(targetElement.id)) score += 80;
    
    // Higher score for appropriate tag names
    if (trigger.tagName === 'BUTTON') score += 20;
    if (trigger.tagName === 'SUMMARY') score += 40;
    
    // Higher score for trigger-like classes
    const className = (trigger.className && typeof trigger.className === 'string') ? trigger.className.toLowerCase() : '';
    if (className.includes('toggle')) score += 15;
    if (className.includes('expand')) score += 15;
    if (className.includes('dropdown')) score += 15;
    
    return score;
}

function performSearch(text, options = {}) {
    const {
        matchCase = false,
        wholeWord = false,
        searchHidden = true
    } = options;

    if (!text) return { visible: [], hidden: [], clickableTriggers: [] };

    // Reset re-searching flag at start of new search
    window.isReSearching = false;

    console.log('Searching for:', text, 'with options:', options);

    const visibleResults = [];
    const hiddenResults = [];
    const clickableTriggers = new Map(); // Map trigger -> hidden matches count
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
                
                // Find the clickable trigger for this hidden content
                const trigger = findClickableTrigger(node.parentElement);
                if (trigger) {
                    const currentCount = clickableTriggers.get(trigger) || 0;
                    clickableTriggers.set(trigger, currentCount + indices.length);
                }
            }
        }
    }

    console.log('Search found:', visibleResults.length, 'visible results,', hiddenResults.length, 'hidden results');
    console.log('Found', clickableTriggers.size, 'clickable triggers with hidden matches');

    return {
        visible: visibleResults,
        hidden: hiddenResults,
        clickableTriggers: Array.from(clickableTriggers.entries()).map(([trigger, count]) => ({
            element: trigger,
            hiddenCount: count
        }))
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

function isAlphanumeric(char) {
    return char && /[\w\u00C0-\u024F\u0100-\u017F\u0180-\u024F]/.test(char);
}

// Keep backward compatibility while extending functionality
window.performSearch = performSearch;