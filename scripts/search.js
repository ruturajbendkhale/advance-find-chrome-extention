function performSearch(text, options = {}) {
    const {
        matchCase = false,
        wholeWord = false
    } = options;

    if (!text) return [];

    console.log('Searching for:', text, 'with options:', options);

    const results = [];
    let currentNode = null;
    let combinedText = '';
    let offsetMap = [];

    // First, collect and combine text nodes
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: (node) => {
                const parent = node.parentElement;
                if (parent.tagName === 'SCRIPT' || 
                    parent.tagName === 'STYLE' || 
                    parent.tagName === 'NOSCRIPT' ||
                    parent.classList.contains('atf-highlight')) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    while (node = walker.nextNode()) {
        if (!node.textContent.trim()) continue;

        // If this is a new text block
        if (!currentNode || !areNodesAdjacent(currentNode, node)) {
            if (currentNode) {
                // Process the previous block
                processTextBlock(combinedText, offsetMap, results, text, options);
                // Reset for new block
                combinedText = '';
                offsetMap = [];
            }
            currentNode = node;
        }

        // Add to current block
        offsetMap.push({
            node: node,
            start: combinedText.length,
            length: node.textContent.length
        });
        combinedText += node.textContent;
    }

    // Process the last block
    if (combinedText) {
        processTextBlock(combinedText, offsetMap, results, text, options);
    }

    console.log('Total results:', results);
    return results;
}

function processTextBlock(text, offsetMap, results, searchText, options) {
    let blockText = text;
    let search = searchText;

    if (!options.matchCase) {
        blockText = blockText.toLowerCase();
        search = search.toLowerCase();
    }

    let startIndex = 0;
    while (true) {
        const index = blockText.indexOf(search, startIndex);
        if (index === -1) break;

        // Check whole word if needed
        if (options.wholeWord) {
            const prevChar = blockText[index - 1];
            const nextChar = blockText[index + search.length];
            if (isAlphanumeric(prevChar) || isAlphanumeric(nextChar)) {
                startIndex = index + 1;
                continue;
            }
        }

        // Find which node contains this match
        for (let i = 0; i < offsetMap.length; i++) {
            const mapping = offsetMap[i];
            if (index >= mapping.start && 
                index < mapping.start + mapping.length) {
                
                const nodeIndex = index - mapping.start;
                const existingResult = results.find(r => r.node === mapping.node);
                
                if (existingResult) {
                    existingResult.indices.push(nodeIndex);
                } else {
                    results.push({
                        node: mapping.node,
                        indices: [nodeIndex]
                    });
                }
                break;
            }
        }

        startIndex = index + search.length;
    }
}

function areNodesAdjacent(node1, node2) {
    // Check if nodes are part of the same text block
    // This is a simplified check, might need enhancement
    return node1.parentElement === node2.parentElement;
}

function isAlphanumeric(char) {
    return char && /[\w\u00C0-\u024F]/.test(char);
}

window.performSearch = performSearch;