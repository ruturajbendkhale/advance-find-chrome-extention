document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const matchCaseCheckbox = document.getElementById('matchCase');
    const wholeWordCheckbox = document.getElementById('wholeWord');
    const matchCount = document.getElementById('matchCount');

    let debounceTimeout;

    // Function to navigate matches
    const navigateMatches = (direction) => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "navigateHighlight",
                direction: direction
            }, (response) => {
                if (response && response.currentMatch !== undefined) {
                    matchCount.textContent = `${response.currentMatch}/${response.matchCount}`;
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
                e.preventDefault(); // Prevent default scroll behavior
                navigateMatches(-1);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault(); // Prevent default scroll behavior
                navigateMatches(1);
            }
        }
    });

    // Function to perform search
    const performSearch = () => {
        const searchText = searchInput.value;
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
                    return;
                }
                if (response && response.matchCount !== undefined) {
                    matchCount.textContent = `${response.currentMatch}/${response.matchCount}`;
                }
            });
        });
    };

    // Add event listeners
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimeout);
        // If the search box is empty or being modified, clear highlights immediately
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "performSearch",
                searchText: searchInput.value,
                options: {
                    matchCase: matchCaseCheckbox.checked,
                    wholeWord: wholeWordCheckbox.checked
                }
            });
            if (!searchInput.value) {
                matchCount.textContent = "0/0";
            }
        });
        
        if (searchInput.value) {
            debounceTimeout = setTimeout(performSearch, 300); // Debounce search
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

    // Focus search input when popup opens
    searchInput.focus();

    // Prevent popup from closing when clicking outside
    window.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.focus();
    });

    // Prevent Escape key from closing the popup
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
        }
    });

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

    // Close button click handler - only way to close the popup
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
