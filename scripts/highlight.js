window.currentHighlightIndex = -1;
window.currentHighlights = [];

function highlightMatches(matches, searchText) {
    clearHighlights();
    
    if (!matches.length) return 0;

    matches.forEach(({ node, indices }) => {
        // Get the parent element to work with the complete text
        const parent = node.parentElement;
        const fullText = parent.textContent;
        
        // Create a new fragment for the complete text
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;

        // Find all occurrences of the search text in the full text
        let startIndex = 0;
        const matches = [];
        
        while ((startIndex = fullText.indexOf(searchText, startIndex)) !== -1) {
            matches.push(startIndex);
            startIndex += searchText.length;
        }

        // Highlight all matches
        matches.forEach(index => {
            // Add text before match
            if (index > lastIndex) {
                fragment.appendChild(
                    document.createTextNode(fullText.substring(lastIndex, index))
                );
            }

            // Add highlighted match
            const highlight = document.createElement('span');
            highlight.className = 'atf-highlight';
            highlight.textContent = fullText.substring(index, index + searchText.length);
            fragment.appendChild(highlight);
            window.currentHighlights.push(highlight);

            lastIndex = index + searchText.length;
        });

        // Add remaining text
        if (lastIndex < fullText.length) {
            fragment.appendChild(
                document.createTextNode(fullText.substring(lastIndex))
            );
        }

        // Replace the parent's content with our highlighted version
        parent.textContent = '';
        parent.appendChild(fragment);
    });

    if (window.currentHighlights.length > 0) {
        updateCurrentHighlight(0);
    }

    return window.currentHighlights.length;
}

function clearHighlights() {
    window.currentHighlights.forEach(highlight => {
        if (highlight && highlight.parentNode) {
            const parent = highlight.parentNode;
            parent.replaceChild(
                document.createTextNode(highlight.textContent),
                highlight
            );
        }
    });
    window.currentHighlights = [];
    window.currentHighlightIndex = -1;
}

function updateCurrentHighlight(index) {
    if (window.currentHighlightIndex !== -1 && window.currentHighlights[window.currentHighlightIndex]) {
        window.currentHighlights[window.currentHighlightIndex].classList.remove('atf-current-highlight');
    }
    window.currentHighlightIndex = index;
    const current = window.currentHighlights[index];
    if (current) {
        current.classList.add('atf-current-highlight');
        current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Make functions available globally
window.highlightMatches = highlightMatches;
window.clearHighlights = clearHighlights;