window.currentHighlightIndex = -1;
window.currentHighlights = [];
window.hiddenMatches = [];
window.clickableTriggers = [];
window.isReSearching = false; // Flag to prevent recursive searches

function highlightMatches(searchResults, searchText) {
    clearHighlights();
    
    if (!searchResults || (!searchResults.visible && !searchResults.length)) {
        return { visible: 0, hidden: 0, triggers: 0 };
    }

    console.log('Highlighting matches for:', searchText);

    // Handle backward compatibility - if searchResults is an array, treat as visible results
    let visibleResults = Array.isArray(searchResults) ? searchResults : searchResults.visible || [];
    let hiddenResults = Array.isArray(searchResults) ? [] : searchResults.hidden || [];
    let clickableTriggers = Array.isArray(searchResults) ? [] : searchResults.clickableTriggers || [];

    // Store hidden matches and clickable triggers globally
    window.hiddenMatches = hiddenResults;
    window.clickableTriggers = clickableTriggers;

    let totalVisibleHighlights = 0;

    // Highlight visible matches
    if (visibleResults.length > 0) {
        visibleResults.forEach(({ node, indices, originalText }) => {
            if (!node || !node.parentNode || indices.length === 0) return;

            totalVisibleHighlights += highlightTextNode(node, indices, originalText, searchText, false);
        });
    }

    // Add indicators to clickable triggers (not hidden containers)
    clickableTriggers.forEach(({ element, hiddenCount }) => {
        if (hiddenCount > 0) {
            addTriggerIndicator(element, hiddenCount, searchText);
        }
    });

    // Reverse the highlights array since we built it backwards
    window.currentHighlights.reverse();

    console.log('Total visible highlights:', totalVisibleHighlights);
    console.log('Clickable triggers with indicators:', clickableTriggers.length);

    if (window.currentHighlights.length > 0) {
        updateCurrentHighlight(0);
    }

    return {
        visible: totalVisibleHighlights,
        hidden: hiddenResults.reduce((sum, result) => sum + result.indices.length, 0),
        triggers: clickableTriggers.length
    };
}

function addTriggerIndicator(triggerElement, hiddenCount, searchText) {
    // Remove any existing indicator
    const existingIndicator = triggerElement.querySelector('.atf-trigger-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }

    // Check if this trigger already has our event listener to prevent duplicates
    if (triggerElement.hasAttribute('data-atf-trigger-attached')) {
        console.log('Trigger already has event listener, skipping...');
        
        // Just update the indicator, don't add new listeners
        const indicator = document.createElement('div');
        indicator.className = 'atf-trigger-indicator';
        indicator.innerHTML = `
            <div class="atf-trigger-badge">
                <span class="atf-trigger-count">${hiddenCount}</span>
                <span class="atf-trigger-text">hidden</span>
            </div>
            <div class="atf-trigger-hint">Click to reveal matches</div>
        `;
        
        positionIndicatorOnTrigger(indicator, triggerElement);
        triggerElement.appendChild(indicator);
        return;
    }

    // Create a prominent indicator that overlays on the trigger
    const indicator = document.createElement('div');
    indicator.className = 'atf-trigger-indicator';
    indicator.innerHTML = `
        <div class="atf-trigger-badge">
            <span class="atf-trigger-count">${hiddenCount}</span>
            <span class="atf-trigger-text">hidden</span>
        </div>
        <div class="atf-trigger-hint">Click to reveal matches</div>
    `;
    
    // Position indicator strategically on the trigger
    positionIndicatorOnTrigger(indicator, triggerElement);
    
    // Add click handler to the trigger (not the indicator) - ONLY ONCE
    const triggerClickHandler = function(e) {
        // Prevent recursive searching
        if (window.isReSearching) {
            console.log('🚫 Already re-searching, ignoring click');
            return;
        }
        
        console.log('🎯 Trigger clicked:', triggerElement.tagName, triggerElement.className || triggerElement.id || 'no-id');
        console.log('🔄 Starting re-search process...');
        window.isReSearching = true;
        
        // Wait for the content to expand, then re-search
        setTimeout(() => {
            if (window.performSearch && window.highlightMatches) {
                const currentSearch = document.querySelector('#searchInput, #atf-widget-search');
                if (currentSearch && currentSearch.value) {
                    console.log('🔍 Re-searching for:', currentSearch.value);
                    const options = {
                        matchCase: document.querySelector('#matchCase, #atf-widget-match-case')?.checked || false,
                        wholeWord: document.querySelector('#wholeWord, #atf-widget-whole-word')?.checked || false
                    };
                    
                    const searchResults = window.performSearch(currentSearch.value, options);
                    const highlightResults = window.highlightMatches(searchResults, currentSearch.value);
                    console.log('✅ Re-search completed. Results:', highlightResults);
                    
                    // Update floating widget display if it's visible
                    if (window.floatingWidget && window.floatingWidget.isVisible) {
                        console.log('📱 Updating floating widget display...');
                        window.floatingWidget.updateMatchDisplay({
                            visibleCount: highlightResults.visible || 0,
                            hiddenCount: highlightResults.hidden || 0,
                            triggerCount: highlightResults.triggers || 0
                        });
                    }
                    
                } else {
                    console.log('❌ No search input found or empty value');
                }
            } else {
                console.log('❌ Search functions not available');
            }
            
            // Reset the flag after re-search is complete
            setTimeout(() => {
                window.isReSearching = false;
                console.log('🔓 Re-search flag reset - ready for new clicks');
            }, 100);
        }, 300);
    };
    
    // Store the handler reference and mark this trigger as having our listener
    triggerElement._atfClickHandler = triggerClickHandler;
    triggerElement.setAttribute('data-atf-trigger-attached', 'true');
    triggerElement.addEventListener('click', triggerClickHandler);
    
    // Add hover effects
    indicator.addEventListener('mouseenter', () => {
        triggerElement.style.boxShadow = '0 0 8px rgba(255, 102, 0, 0.5)';
        triggerElement.style.transform = 'scale(1.02)';
        triggerElement.style.transition = 'all 0.2s ease';
    });
    
    indicator.addEventListener('mouseleave', () => {
        triggerElement.style.boxShadow = '';
        triggerElement.style.transform = '';
    });
    
    triggerElement.appendChild(indicator);
}

function positionIndicatorOnTrigger(indicator, triggerElement) {
    // Get trigger dimensions and positioning
    const rect = triggerElement.getBoundingClientRect();
    const triggerStyle = window.getComputedStyle(triggerElement);
    
    // Make sure trigger has relative positioning for absolute children
    if (triggerStyle.position === 'static') {
        triggerElement.style.position = 'relative';
    }
    
    // Position based on trigger size and type
    let position = 'top-right'; // default
    
    // For small triggers (like icons or small buttons), overlay more prominently
    if (rect.width < 60 || rect.height < 30) {
        position = 'overlay-center';
    }
    // For wide triggers (like accordion headers), position at the end
    else if (rect.width > 200) {
        position = 'center-right';
    }
    
    // Apply positioning styles
    indicator.style.cssText = getIndicatorPositionCSS(position);
}

function getIndicatorPositionCSS(position) {
    const baseCSS = `
        position: absolute;
        z-index: 10001;
        pointer-events: none;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 11px;
        font-weight: bold;
        border-radius: 8px;
        animation: atf-trigger-glow 2s infinite;
        opacity: 0.3;
        transition: opacity 0.2s ease;
    `;
    
    switch (position) {
        case 'overlay-center':
            return baseCSS + `
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(255, 102, 0, 0.3);
                color: white;
                padding: 4px 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                backdrop-filter: blur(2px);
            `;
        
        case 'center-right':
            return baseCSS + `
                top: 50%;
                right: 8px;
                transform: translateY(-50%);
                background: rgba(255, 102, 0, 0.3);
                color: white;
                padding: 3px 6px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.15);
                backdrop-filter: blur(2px);
            `;
        
        case 'top-right':
        default:
            return baseCSS + `
                top: -6px;
                right: -6px;
                background: rgba(255, 102, 0, 0.3);
                color: white;
                padding: 3px 6px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.15);
                border: 2px solid rgba(255, 255, 255, 0.3);
                backdrop-filter: blur(2px);
            `;
    }
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

function clearHighlights() {
    console.log('Clearing', window.currentHighlights.length, 'highlights');
    
    // Remove all highlight spans and replace with their text content
    window.currentHighlights.forEach(highlight => {
        if (highlight && highlight.parentNode) {
            const textNode = document.createTextNode(highlight.textContent);
            highlight.parentNode.replaceChild(textNode, highlight);
        }
    });
    
    // Remove trigger indicators and clean up event listeners
    document.querySelectorAll('.atf-trigger-indicator').forEach(indicator => {
        indicator.remove();
    });
    
    // Clean up trigger event listeners and attributes
    document.querySelectorAll('[data-atf-trigger-attached]').forEach(trigger => {
        // Remove our event listener if it exists
        if (trigger._atfClickHandler) {
            trigger.removeEventListener('click', trigger._atfClickHandler);
            delete trigger._atfClickHandler;
        }
        
        // Remove our attribute
        trigger.removeAttribute('data-atf-trigger-attached');
        
        // Reset any styling we applied
        trigger.style.boxShadow = '';
        trigger.style.transform = '';
        trigger.style.transition = '';
    });
    
    // Reset the re-searching flag
    window.isReSearching = false;
    
    // Clean up arrays
    window.currentHighlights = [];
    window.hiddenMatches = [];
    window.clickableTriggers = [];
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

// Make functions available globally
window.highlightMatches = highlightMatches;
window.clearHighlights = clearHighlights;
window.updateCurrentHighlight = updateCurrentHighlight;