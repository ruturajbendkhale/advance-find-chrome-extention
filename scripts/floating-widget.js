// Debug: Log when script loads
console.log('Floating widget script loaded');

// Add direct keyboard shortcut handling at the top level
document.addEventListener('keydown', (e) => {
    // Toggle floating widget with Ctrl+Shift+M (or Cmd+Shift+M on Mac)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'M') {
        console.log('🎯 Floating widget toggle shortcut detected!');
        e.preventDefault();
        e.stopPropagation();
        
        if (window.toggleFloatingWidget) {
            window.toggleFloatingWidget();
            console.log('✅ Floating widget toggled');
        } else {
            console.log('❌ toggleFloatingWidget function not available');
        }
        return false;
    }
}, true);

// Floating Search Widget
class FloatingSearchWidget {
    constructor() {
        this.widget = null;
        this.isVisible = false;
        this.currentSearchText = '';
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.debounceTimeout = null;
        
        this.createWidget();
        this.setupEventListeners();
    }

    createWidget() {
        // Create main widget container
        this.widget = document.createElement('div');
        this.widget.id = 'atf-floating-widget';
        this.widget.innerHTML = `
            <div class="atf-widget-header">
                <div class="atf-widget-title">
                    <span class="atf-widget-icon">🔍</span>
                    Advanced Text Finder
                </div>
                <div class="atf-widget-controls">
                    <button class="atf-widget-btn atf-minimize-btn" title="Minimize">−</button>
                    <button class="atf-widget-btn atf-close-btn" title="Close">×</button>
                </div>
            </div>
            
            <div class="atf-widget-content">
                <div class="atf-search-section">
                    <div class="atf-search-input-container">
                        <input type="text" id="atf-widget-search" placeholder="Enter text to search..." autocomplete="off">
                        <button class="atf-widget-clear-btn" title="Clear search">×</button>
                    </div>
                </div>
                
                <div class="atf-options-section">
                    <label class="atf-option-label">
                        <input type="checkbox" id="atf-widget-match-case">
                        <span class="atf-option-text">Match case</span>
                    </label>
                    <label class="atf-option-label">
                        <input type="checkbox" id="atf-widget-whole-word">
                        <span class="atf-option-text">Whole word</span>
                    </label>
                </div>
                
                <div class="atf-results-section">
                    <div class="atf-match-info">
                        <div class="atf-counts">
                            <span id="atf-widget-visible-count" class="atf-count-item">0</span> visible
                            <span class="atf-separator">•</span>
                            <span id="atf-widget-hidden-count" class="atf-count-item">0</span> hidden
                            <span class="atf-separator">•</span>
                            <span id="atf-widget-trigger-count" class="atf-count-item">0</span> triggers
                        </div>
                    </div>
                    
                    <div class="atf-navigation-section">
                        <button id="atf-widget-prev" class="atf-nav-btn" title="Previous match">◀</button>
                        <button id="atf-widget-next" class="atf-nav-btn" title="Next match">▶</button>
                    </div>
                </div>
                
                <div class="atf-help-section">
                    <small>
                        <strong>Ctrl+Shift+M</strong>: Toggle widget • <strong>Enter</strong>: Next match<br>
                        Orange badges show where to click for hidden matches
                    </small>
                </div>
            </div>
        `;

        // Add styles
        this.addStyles();
        
        // Position widget
        this.widget.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 300px;
            z-index: 999999;
            transition: transform 0.3s ease;
        `;
        
        // Start hidden (moved off-screen)
        this.widget.classList.add('hidden');
        
        document.body.appendChild(this.widget);
        
        // Debug: Confirm widget was added to DOM
        console.log('Floating widget added to DOM:', {
            exists: !!document.getElementById('atf-floating-widget'),
            parentElement: this.widget.parentElement?.tagName,
            initialClasses: this.widget.className
        });
    }

    addStyles() {
        if (document.getElementById('atf-widget-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'atf-widget-styles';
        styles.textContent = `
            #atf-floating-widget {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: white;
                border: 1px solid #e0e0e0;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
                backdrop-filter: blur(10px);
                overflow: hidden;
                user-select: none;
                font-size: 14px;
                color: #333;
                max-width: 300px;
            }
            
            #atf-floating-widget.hidden {
                transform: translateX(calc(100% + 40px));
                opacity: 0;
                pointer-events: none;
            }
            
            #atf-floating-widget.minimized .atf-widget-content {
                display: none;
            }
            
            .atf-widget-header {
                background: linear-gradient(135deg, #4285f4, #1976d2);
                color: white;
                padding: 10px 14px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
                user-select: none;
            }
            
            .atf-widget-title {
                display: flex;
                align-items: center;
                gap: 6px;
                font-weight: 600;
                font-size: 13px;
                line-height: 1;
            }
            
            .atf-widget-icon {
                font-size: 14px;
            }
            
            .atf-widget-controls {
                display: flex;
                gap: 2px;
            }
            
            .atf-widget-btn {
                width: 20px;
                height: 20px;
                border: none;
                background: rgba(255, 255, 255, 0.1);
                color: white;
                border-radius: 4px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                transition: background 0.2s;
            }
            
            .atf-widget-btn:hover {
                background: rgba(255, 255, 255, 0.2);
            }
            
            .atf-widget-content {
                padding: 14px;
                background: white;
            }
            
            .atf-search-section {
                margin-bottom: 12px;
            }
            
            .atf-search-input-container {
                position: relative;
            }
            
            #atf-widget-search {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #dadce0;
                border-radius: 6px;
                font-size: 14px;
                outline: none;
                transition: border-color 0.2s;
                box-sizing: border-box;
            }
            
            #atf-widget-search:focus {
                border-color: #4285f4;
                box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.1);
            }
            
            .atf-widget-clear-btn {
                position: absolute;
                top: 50%;
                right: 8px;
                transform: translateY(-50%);
                background: none;
                border: none;
                color: #888;
                cursor: pointer;
                font-size: 16px;
                padding: 2px 4px;
                line-height: 1;
                display: none;
            }
            
            .atf-widget-clear-btn:hover {
                color: #555;
            }
            
            #atf-widget-search:not(:placeholder-shown) + .atf-widget-clear-btn {
                display: block;
            }
            
            .atf-options-section {
                display: flex;
                gap: 16px;
                margin-bottom: 12px;
            }
            
            .atf-option-label {
                display: flex;
                align-items: center;
                gap: 6px;
                cursor: pointer;
                font-size: 13px;
                color: #5f6368;
            }
            
            .atf-option-label input[type="checkbox"] {
                margin: 0;
                accent-color: #4285f4;
            }
            
            .atf-option-text {
                font-size: 13px;
                color: #5f6368;
            }
            
            .atf-results-section {
                margin-bottom: 12px;
                padding: 10px;
                background: #f8f9fa;
                border-radius: 6px;
                border: 1px solid #e8eaed;
            }
            
            .atf-match-info {
                margin-bottom: 8px;
                text-align: center;
            }
            
            .atf-counts {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
                font-size: 13px;
                color: #5f6368;
            }
            
            .atf-count-item {
                font-weight: 600;
                color: #333;
            }
            
            .atf-separator {
                font-size: 12px;
                color: #888;
                margin: 0 2px;
            }
            
            .atf-navigation-section {
                display: flex;
                gap: 6px;
                justify-content: center;
            }
            
            .atf-nav-btn {
                background: #f8f9fa;
                border: 1px solid #dadce0;
                border-radius: 4px;
                padding: 6px 10px;
                cursor: pointer;
                font-size: 13px;
                color: #5f6368;
                transition: all 0.2s;
                min-width: 36px;
            }
            
            .atf-nav-btn:hover {
                background: #e8eaed;
                border-color: #bdc1c6;
            }
            
            .atf-nav-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .atf-help-section {
                font-size: 11px;
                color: #5f6368;
                text-align: center;
                line-height: 1.3;
                border-top: 1px solid #e8eaed;
                padding-top: 8px;
            }
            
            .atf-help-section strong {
                color: #333;
            }
            
            /* Responsive adjustments */
            @media (max-width: 768px) {
                #atf-floating-widget {
                    width: 280px;
                    font-size: 13px;
                }
                
                .atf-widget-content {
                    padding: 12px;
                }
                
                .atf-options-section {
                    flex-direction: column;
                    gap: 8px;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }

    setupEventListeners() {
        const searchInput = this.widget.querySelector('#atf-widget-search');
        const clearBtn = this.widget.querySelector('.atf-widget-clear-btn');
        const matchCaseCheckbox = this.widget.querySelector('#atf-widget-match-case');
        const wholeWordCheckbox = this.widget.querySelector('#atf-widget-whole-word');
        const prevBtn = this.widget.querySelector('#atf-widget-prev');
        const nextBtn = this.widget.querySelector('#atf-widget-next');
        const minimizeBtn = this.widget.querySelector('.atf-minimize-btn');
        const closeBtn = this.widget.querySelector('.atf-close-btn');
        const header = this.widget.querySelector('.atf-widget-header');
        
        // Search functionality - only when widget is visible
        searchInput.addEventListener('input', () => {
            if (!this.isVisible) {
                console.log('🚫 Input event fired but widget not visible, ignoring');
                return; // Don't interfere with popup searches
            }
            
            const currentValue = searchInput.value;
            console.log('⌨️ Input event fired:', {
                value: `"${currentValue}"`,
                length: currentValue.length,
                isOdd: currentValue.length % 2 === 1,
                timestamp: Date.now()
            });
            
            clearTimeout(this.debounceTimeout);
            
            this.debounceTimeout = setTimeout(() => {
                console.log('⏰ Debounce timer triggered, calling performSearch');
                this.performSearch();
            }, 300);
            
            console.log('⏱️ Debounce timer set for 300ms');
        });
        
        // Clear search
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchInput.focus();
            if (this.isVisible) {
                this.performSearch();
            }
        });
        
        // Options - only when widget is visible
        matchCaseCheckbox.addEventListener('change', () => {
            if (this.isVisible) {
                this.performSearch();
            }
        });
        
        wholeWordCheckbox.addEventListener('change', () => {
            if (this.isVisible) {
                this.performSearch();
            }
        });
        
        // Navigation
        prevBtn.addEventListener('click', () => {
            this.navigateMatches(-1);
        });
        
        nextBtn.addEventListener('click', () => {
            this.navigateMatches(1);
        });
        
        // Widget controls
        minimizeBtn.addEventListener('click', () => {
            this.toggleMinimize();
        });
        
        closeBtn.addEventListener('click', () => {
            this.hide();
        });
        
        // Dragging
        header.addEventListener('mousedown', (e) => {
            this.startDrag(e);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.drag(e);
            }
        });
        
        document.addEventListener('mouseup', () => {
            this.endDrag();
        });
        
        // Keyboard shortcuts - only when widget is visible and focused
        searchInput.addEventListener('keydown', (e) => {
            if (!this.isVisible) return;
            
            if (e.key === 'Enter') {
                e.preventDefault();
                if (e.shiftKey) {
                    this.navigateMatches(-1);
                } else {
                    this.navigateMatches(1);
                }
            } else if (e.key === 'Escape') {
                this.hide();
            }
        });
        
        // Global keyboard shortcuts (when widget is focused)
        this.widget.addEventListener('keydown', (e) => {
            if (!this.isVisible) return;
            
            if (e.ctrlKey) {
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.navigateMatches(-1);
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.navigateMatches(1);
                }
            }
        });
    }

    performSearch() {
        // Don't perform search if widget is not visible
        if (!this.isVisible) {
            console.log('🚫 Widget not visible, skipping search');
            return;
        }
        
        const searchText = this.widget.querySelector('#atf-widget-search').value;
        console.log('🔍 FloatingWidget performSearch called:', {
            searchText: `"${searchText}"`,
            length: searchText.length,
            isOdd: searchText.length % 2 === 1,
            isVisible: this.isVisible
        });
        
        this.currentSearchText = searchText;
        
        const options = {
            matchCase: this.widget.querySelector('#atf-widget-match-case').checked,
            wholeWord: this.widget.querySelector('#atf-widget-whole-word').checked
        };

        if (!searchText) {
            console.log('📝 Empty search text, clearing highlights');
            window.clearHighlights();
            this.updateMatchDisplay({
                visibleCount: 0,
                hiddenCount: 0,
                triggerCount: 0
            });
            return;
        }

        try {
            console.log('🧹 Clearing previous highlights before new search');
            window.clearHighlights();
            
            console.log('🚀 Starting search with options:', options);
            const searchResults = window.performSearch(searchText, options);
            console.log('📊 Search results:', searchResults);
            
            const highlightResults = window.highlightMatches(searchResults, searchText);
            console.log('🎨 Highlight results:', highlightResults);
            
            let visibleCount, hiddenCount, triggerCount;
            
            if (typeof highlightResults === 'number') {
                visibleCount = highlightResults;
                hiddenCount = 0;
                triggerCount = 0;
                console.log('📈 Using legacy format:', { visibleCount });
            } else {
                visibleCount = highlightResults.visible || 0;
                hiddenCount = highlightResults.hidden || 0;
                triggerCount = highlightResults.triggers || 0;
                console.log('📈 Using new format:', { visibleCount, hiddenCount, triggerCount });
            }
            
            this.updateMatchDisplay({
                visibleCount: visibleCount,
                hiddenCount: hiddenCount,
                triggerCount: triggerCount
            });
            
            console.log('✅ Search completed successfully');
        } catch (error) {
            console.error('❌ Widget search error:', error);
            console.error('Error stack:', error.stack);
            this.updateMatchDisplay({
                visibleCount: 0,
                hiddenCount: 0,
                triggerCount: 0
            });
        }
    }

    updateMatchDisplay(response) {
        const visibleCount = this.widget.querySelector('#atf-widget-visible-count');
        const hiddenCount = this.widget.querySelector('#atf-widget-hidden-count');
        const triggerCount = this.widget.querySelector('#atf-widget-trigger-count');
        
        visibleCount.textContent = response.visibleCount || 0;
        hiddenCount.textContent = response.hiddenCount || 0;
        triggerCount.textContent = response.triggerCount || 0;
    }

    navigateMatches(direction) {
        if (window.currentHighlights && window.currentHighlights.length > 0) {
            let currentIndex = window.currentHighlightIndex || 0;
            const totalHighlights = window.currentHighlights.length;
            
            if (direction === 1) {
                currentIndex = (currentIndex + 1) % totalHighlights;
            } else {
                currentIndex = (currentIndex - 1 + totalHighlights) % totalHighlights;
            }
            
            window.updateCurrentHighlight(currentIndex);
            
            this.updateMatchDisplay({
                visibleCount: totalHighlights,
                hiddenCount: window.hiddenMatches ? window.hiddenMatches.reduce((sum, result) => sum + result.indices.length, 0) : 0,
                triggerCount: window.clickableTriggers ? window.clickableTriggers.length : 0
            });
        }
    }

    startDrag(e) {
        this.isDragging = true;
        this.widget.classList.add('dragging');
        
        const rect = this.widget.getBoundingClientRect();
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        e.preventDefault();
    }

    drag(e) {
        if (!this.isDragging) return;
        
        const x = e.clientX - this.dragOffset.x;
        const y = e.clientY - this.dragOffset.y;
        
        // Keep widget within viewport
        const maxX = window.innerWidth - this.widget.offsetWidth;
        const maxY = window.innerHeight - this.widget.offsetHeight;
        
        const constrainedX = Math.max(0, Math.min(x, maxX));
        const constrainedY = Math.max(0, Math.min(y, maxY));
        
        this.widget.style.left = constrainedX + 'px';
        this.widget.style.top = constrainedY + 'px';
        this.widget.style.right = 'auto';
        this.widget.style.transform = 'none';
    }

    endDrag() {
        this.isDragging = false;
        this.widget.classList.remove('dragging');
    }

    toggleMinimize() {
        this.widget.classList.toggle('minimized');
        const minimizeBtn = this.widget.querySelector('.atf-minimize-btn');
        minimizeBtn.textContent = this.widget.classList.contains('minimized') ? '+' : '−';
    }

    show() {
        console.log('Showing floating widget');
        this.isVisible = true;
        this.widget.classList.remove('hidden');
        
        // Ensure widget is visible by forcing position
        this.widget.style.transform = 'translateX(0)';
        this.widget.style.right = '20px';
        this.widget.style.top = '20px';
        
        // Debug: Log widget position and visibility
        const rect = this.widget.getBoundingClientRect();
        console.log('Widget position after show:', {
            top: rect.top,
            right: rect.right,
            width: rect.width,
            height: rect.height,
            visible: rect.width > 0 && rect.height > 0,
            transform: this.widget.style.transform,
            classes: this.widget.className
        });
        
        // Focus search input
        setTimeout(() => {
            this.widget.querySelector('#atf-widget-search').focus();
        }, 300);
    }

    hide() {
        console.log('Hiding floating widget');
        this.isVisible = false;
        this.widget.classList.add('hidden');
        
        // Move widget off-screen
        this.widget.style.transform = 'translateX(340px)';
        
        // Clear any active searches
        window.clearHighlights();
    }

    toggle() {
        console.log('Toggle called, current visibility:', this.isVisible);
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
}

// Initialize floating widget only when needed
let floatingWidget = null;

// Global toggle function
window.toggleFloatingWidget = function() {
    if (!floatingWidget) {
        console.log('Creating floating widget...');
        floatingWidget = new FloatingSearchWidget();
        window.floatingWidget = floatingWidget;
    }
    floatingWidget.toggle();
};

// Make widget accessible globally (but only when created)
window.floatingWidget = floatingWidget;

// Export for external use
window.FloatingSearchWidget = FloatingSearchWidget; 

// At the end of the file, add initialization confirmation
console.log('Floating widget script loaded. Toggle with Ctrl+Shift+M'); 