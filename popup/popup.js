document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const matchCaseCheckbox = document.getElementById('matchCase');
    const wholeWordCheckbox = document.getElementById('wholeWord');
    const matchCount = document.getElementById('matchCount');

    let debounceTimeout;

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

    // Focus search input when popup opens
    searchInput.focus();

    // Add these event listeners after your existing ones
    document.getElementById('prevMatch').addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "navigateHighlight",
                direction: -1
            }, (response) => {
                if (response && response.currentMatch !== undefined) {
                    matchCount.textContent = `${response.currentMatch}/${response.matchCount}`;
                }
            });
        });
    });

    document.getElementById('nextMatch').addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "navigateHighlight",
                direction: 1
            }, (response) => {
                if (response && response.currentMatch !== undefined) {
                    matchCount.textContent = `${response.currentMatch}/${response.matchCount}`;
                }
            });
        });
    });
});
