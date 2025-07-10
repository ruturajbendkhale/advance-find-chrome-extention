document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const matchCaseCheckbox = document.getElementById('matchCase');
    const wholeWordCheckbox = document.getElementById('wholeWord');
    const matchCount = document.getElementById('matchCount');
    const visibleCount = document.getElementById('visibleCount');
    const hiddenCount = document.getElementById('hiddenCount');
    const expandableCount = document.getElementById('expandableCount');
    const expandAllBtn = document.getElementById('expandAll');

    let debounceTimeout;
    let currentSearchText = '';

    // Function to update match count display
    const updateMatchDisplay = (response) => {
        if (response) {
            // Update main counter (for backward compatibility)
            matchCount.textContent = `${response.currentMatch || 0}/${response.matchCount || 0}`;
            
            // Update detailed counts
            if (response.visibleCount !== undefined) {
                visibleCount.textContent = `${response.visibleCount} visible`;
                visibleCount.style.display = response.visibleCount > 0 ? 'inline' : 'none';
            }
            
            if (response.hiddenCount !== undefined) {
                hiddenCount.textContent = `${response.hiddenCount} hidden`;
                hiddenCount.style.display = response.hiddenCount > 0 ? 'inline' : 'none';
                
                // Add visual emphasis for hidden matches
                if (response.hiddenCount > 0) {
                    hiddenCount.classList.add('has-hidden');
                } else {
                    hiddenCount.classList.remove('has-hidden');
                }
            }
            
            if (response.expandableCount !== undefined) {
                expandableCount.textContent = `${response.expandableCount} expandable`;
                expandableCount.style.display = response.expandableCount > 0 ? 'inline' : 'none';
                
                // Show/hide expand all button
                expandAllBtn.style.display = response.expandableCount > 0 ? 'inline-flex' : 'none';
            }
        }
    };

    // Function to navigate matches
    const navigateMatches = (direction) => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "navigateHighlight",
                direction: direction
            }, (response) => {
                updateMatchDisplay(response);
            });
        });
    };

    // Function to expand all hidden elements
    const expandAllElements = () => {
        if (!currentSearchText) return;
        
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "expandAll",
                searchText: currentSearchText
            }, (response) => {
                if (response && response.success) {
                    console.log('Expanding all elements...');
                    // Re-run search after a short delay to update counts
                    setTimeout(() => {
                        performSearch();
                    }, 500);
                } else {
                    console.log('No expandable elements to expand');
                }
            });
        });
    };

    // Add keyboard event listener
    document.addEventListener('keydown', (e) => {
        // Enter key for next match
        if (e.key === 'Enter' && !e.ctrlKey) {
            navigateMatches(1);
        }
        // Ctrl + Up/Down arrows for navigation
        if (e.ctrlKey) {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                navigateMatches(-1);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                navigateMatches(1);
            }
        }
        // Ctrl + E to expand all
        if (e.ctrlKey && e.key === 'e') {
            e.preventDefault();
            expandAllElements();
        }
    });

    // Function to perform search
    const performSearch = () => {
        const searchText = searchInput.value;
        currentSearchText = searchText;
        
        const options = {
            matchCase: matchCaseCheckbox.checked,
            wholeWord: wholeWordCheckbox.checked
        };

        // Send message to content script
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            // Check if we can inject into this tab
            if (!tabs[0]?.url || 
                tabs[0].url.startsWith('chrome://') || 
                tabs[0].url.startsWith('chrome-extension://') ||
                tabs[0].url.startsWith('edge://') ||
                tabs[0].url.startsWith('about:')) {
                matchCount.textContent = 'N/A';
                visibleCount.style.display = 'none';
                hiddenCount.style.display = 'none';
                expandableCount.style.display = 'none';
                expandAllBtn.style.display = 'none';
                return;
            }

            // Send the message
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "performSearch",
                searchText,
                options
            }, (response) => {
                if (chrome.runtime.lastError) {
                    if (chrome.runtime.lastError.message) {
                        console.error('Runtime error:', chrome.runtime.lastError.message);
                    }
                    matchCount.textContent = 'N/A';
                    visibleCount.style.display = 'none';
                    hiddenCount.style.display = 'none';
                    expandableCount.style.display = 'none';
                    expandAllBtn.style.display = 'none';
                    return;
                }
                updateMatchDisplay(response);
            });
        });
    };

    // Add event listeners
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimeout);
        
        // Clear highlights immediately if search box is empty
        if (!searchInput.value) {
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "performSearch",
                    searchText: "",
                    options: {
                        matchCase: matchCaseCheckbox.checked,
                        wholeWord: wholeWordCheckbox.checked
                    }
                });
            });
            matchCount.textContent = "0/0";
            visibleCount.style.display = 'none';
            hiddenCount.style.display = 'none';
            expandableCount.style.display = 'none';
            expandAllBtn.style.display = 'none';
            return;
        }
        
        if (searchInput.value) {
            debounceTimeout = setTimeout(performSearch, 300);
        }
    });

    matchCaseCheckbox.addEventListener('change', performSearch);
    wholeWordCheckbox.addEventListener('change', performSearch);

    // Add click handlers for navigation buttons
    document.getElementById('prevMatch').addEventListener('click', () => {
        navigateMatches(-1);
    });

    document.getElementById('nextMatch').addEventListener('click', () => {
        navigateMatches(1);
    });

    // Add click handler for expand all button
    expandAllBtn.addEventListener('click', expandAllElements);

    // Focus search input when popup opens and keep it focused
    searchInput.focus();
    
    // Continuously keep popup focused
    setInterval(() => {
        if (!document.hasFocus()) {
            searchInput.focus();
        }
    }, 100);

    // Prevent popup from auto-closing
    document.addEventListener('mousedown', (e) => {
        if (!e.target.closest('#closeButton')) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#closeButton')) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }, true);

    // Keep popup focused
    window.addEventListener('blur', (e) => {
        setTimeout(() => {
            if (document.hasFocus()) {
                window.focus();
            }
        }, 0);
    });

    // Prevent context menu
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
    }, true);

    // Create close button with proper accessibility
    const closeButton = document.createElement('button');
    closeButton.id = 'closeButton';
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Close popup');
    
    // Create SVG icon
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('aria-hidden', 'true');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z');
    path.setAttribute('fill', 'currentColor');
    
    svg.appendChild(path);
    closeButton.appendChild(svg);
    document.body.insertBefore(closeButton, document.body.firstChild);

    // Close button click handler
    closeButton.addEventListener('click', (e) => {
        // Add water ripple effect
        const ripple = document.createElement('div');
        ripple.className = 'ripple';
        const rect = closeButton.getBoundingClientRect();
        ripple.style.left = (e.clientX - rect.left) + 'px';
        ripple.style.top = (e.clientY - rect.top) + 'px';
        closeButton.appendChild(ripple);

        // Remove ripple after animation
        setTimeout(() => ripple.remove(), 1000);
        
        // Close the popup
        window.close();
    });
});
