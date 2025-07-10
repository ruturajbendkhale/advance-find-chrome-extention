document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const clearBtn = document.getElementById('clearBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const matchCaseCheckbox = document.getElementById('matchCase');
    const wholeWordCheckbox = document.getElementById('wholeWord');
    const visibleCountElement = document.getElementById('visibleCount');
    const hiddenCountElement = document.getElementById('hiddenCount');
    const triggerCountElement = document.getElementById('triggerCount');
    const toggleFloatingWidgetBtn = document.getElementById('toggleFloatingWidget');
    
    let currentMatchIndex = 0;
    let totalMatches = 0;
    let lastSearchText = '';
    
    // Focus on search input when popup opens
    searchInput.focus();
    
    // Load saved preferences
    chrome.storage.sync.get(['matchCase', 'wholeWord'], function(result) {
        matchCaseCheckbox.checked = result.matchCase || false;
        wholeWordCheckbox.checked = result.wholeWord || false;
    });
    
    // Save preferences when changed
    matchCaseCheckbox.addEventListener('change', function() {
        chrome.storage.sync.set({matchCase: this.checked});
        if (searchInput.value.trim()) {
            performSearch();
        }
    });
    
    wholeWordCheckbox.addEventListener('change', function() {
        chrome.storage.sync.set({wholeWord: this.checked});
        if (searchInput.value.trim()) {
            performSearch();
        }
    });
    
    // Search functionality
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('input', performSearch);
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                navigateToMatch('previous');
            } else {
                navigateToMatch('next');
            }
        }
    });

    // Clear search
    clearBtn.addEventListener('click', function() {
        searchInput.value = '';
        searchInput.focus();
        clearSearch();
    });
    
    // Navigation
    prevBtn.addEventListener('click', () => navigateToMatch('previous'));
    nextBtn.addEventListener('click', () => navigateToMatch('next'));
    
    // Floating widget toggle
    toggleFloatingWidgetBtn.addEventListener('click', function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'toggleFloatingWidget'});
        });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'ArrowUp') {
            e.preventDefault();
            navigateToMatch('previous');
        } else if (e.ctrlKey && e.key === 'ArrowDown') {
            e.preventDefault();
            navigateToMatch('next');
        }
    });
    
    function performSearch() {
        const searchText = searchInput.value.trim();
        if (!searchText) {
            clearSearch();
            return;
        }
        
        lastSearchText = searchText;
        
        const options = {
            matchCase: matchCaseCheckbox.checked,
            wholeWord: wholeWordCheckbox.checked
        };

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'search',
                text: searchText,
                options: options
            }, function(response) {
                if (chrome.runtime.lastError) {
                    console.error('Error:', chrome.runtime.lastError);
                    return;
                }
                
                if (response && response.success) {
                    updateResults(response.results);
                } else {
                    console.error('Search failed:', response);
                }
            });
        });
    }
    
    function clearSearch() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'clearHighlights'});
        });
        
        updateResults({visible: 0, hidden: 0, triggers: 0});
        currentMatchIndex = 0;
        totalMatches = 0;
        lastSearchText = '';
    }
    
    function updateResults(results) {
        const visibleCount = results.visible || 0;
        const hiddenCount = results.hidden || 0;
        const triggerCount = results.triggers || 0;
        
        visibleCountElement.textContent = visibleCount;
        hiddenCountElement.textContent = hiddenCount;
        triggerCountElement.textContent = triggerCount;
        
        totalMatches = visibleCount;
        
        // Update navigation buttons
        prevBtn.disabled = totalMatches === 0;
        nextBtn.disabled = totalMatches === 0;
        
        // Reset current match index if no matches
        if (totalMatches === 0) {
            currentMatchIndex = 0;
        } else if (currentMatchIndex >= totalMatches) {
            currentMatchIndex = totalMatches - 1;
        }
        
        // Show information about hidden matches
        if (hiddenCount > 0) {
            console.log(`Found ${hiddenCount} hidden matches with ${triggerCount} clickable triggers`);
        }
    }
    
    function navigateToMatch(direction) {
        if (totalMatches === 0) return;
        
        if (direction === 'next') {
            currentMatchIndex = (currentMatchIndex + 1) % totalMatches;
        } else {
            currentMatchIndex = (currentMatchIndex - 1 + totalMatches) % totalMatches;
        }
        
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'navigateToMatch',
                index: currentMatchIndex
            });
        });
    }
    
    // Initialize the popup
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        // Check if content script is loaded
        chrome.tabs.sendMessage(tabs[0].id, {action: 'ping'}, function(response) {
            if (chrome.runtime.lastError) {
                console.log('Content script not loaded, injecting...');
                // Inject content script if not already loaded
                chrome.scripting.executeScript({
                    target: {tabId: tabs[0].id},
                    files: ['content.js']
                }, function() {
                    if (chrome.runtime.lastError) {
                        console.error('Failed to inject content script:', chrome.runtime.lastError);
                    }
                });
            }
        });
    });
    
    // Auto-perform search if there's text in the input
    if (searchInput.value.trim()) {
        performSearch();
    }
});
