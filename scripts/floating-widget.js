// Debug: Log when script loads
console.log('Floating widget script loaded');

// Add direct keyboard shortcut handling at the top level
document.addEventListener('keydown', (e) => {
    // Toggle floating widget with Ctrl+Shift+M (or Cmd+Shift+M on Mac)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'M') {
        console.log('Floating widget toggle shortcut detected!');
        e.preventDefault();
        e.stopPropagation();
        
        if (window.toggleFloatingWidget) {
            window.toggleFloatingWidget();
            console.log('Floating widget toggled');
        } else {
            console.log('toggleFloatingWidget function not available');
        }
        return false;
    }
    
    // Also handle Ctrl+Shift+Q for popup fallback
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Q') {
        console.log('Popup shortcut detected!');
        e.preventDefault();
        e.stopPropagation();
        
        // If floating widget exists and is visible, focus it instead of opening popup
        if (window.floatingWidget && window.floatingWidget.isVisible) {
            const searchInput = document.querySelector('#atf-widget-search');
            if (searchInput) {
                searchInput.focus();
                console.log('Focused floating widget instead of opening popup');
                return false;
            }
        }
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
                    <input type="text" id="atf-widget-search" placeholder="Search text..." autocomplete="off">
                    
                    <div class="atf-options-section">
                        <label class="atf-option-label">
                            <input type="checkbox" id="atf-widget-match-case">
                            <span>Match case</span>
                        </label>
                        <label class="atf-option-label">
                            <input type="checkbox" id="atf-widget-whole-word">
                            <span>Whole word</span>
                        </label>
                    </div>
                </div>
                
                <div class="atf-results-section">
                    <div class="atf-match-info">
                        <div class="atf-primary-count" id="atf-widget-match-count">0/0</div>
                        <div class="atf-detailed-counts">
                            <span id="atf-widget-visible-count" class="atf-count-badge visible">0 visible</span>
                            <span id="atf-widget-hidden-count" class="atf-count-badge hidden">0 hidden</span>
                            <span id="atf-widget-expandable-count" class="atf-count-badge expandable">0 expandable</span>
                        </div>
                    </div>
                    
                    <div class="atf-navigation-section">
                        <button id="atf-widget-prev" class="atf-nav-btn" title="Previous match">
                            <svg width="12" height="12" viewBox="0 0 12 12">
                                <path d="M8 10L4 6l4-4" stroke="currentColor" stroke-width="2" fill="none"/>
                            </svg>
                        </button>
                        <button id="atf-widget-next" class="atf-nav-btn" title="Next match">
                            <svg width="12" height="12" viewBox="0 0 12 12">
                                <path d="M4 2l4 4-4 4" stroke="currentColor" stroke-width="2" fill="none"/>
                            </svg>
                        </button>
                        <button id="atf-widget-expand-all" class="atf-expand-btn" title="Expand all hidden elements">
                            <svg width="12" height="12" viewBox="0 0 12 12">
                                <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="2" fill="none"/>
                            </svg>
                            Expand All
                        </button>
                    </div>
                </div>
                
                <div class="atf-help-section">
                    <small>
                        <strong>Ctrl+Shift+M</strong>: Toggle widget • <strong>Enter</strong>: Next match<br>
                        <strong>Ctrl+↑/↓</strong>: Navigate • Orange badges show hidden matches
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
            width: 320px;
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
            }
            
            .atf-widget-header {
                background: linear-gradient(135deg, #4285f4, #1976d2);
                color: white;
                padding: 12px 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
                user-select: none;
            }
            
            .atf-widget-title {
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: 600;
                font-size: 14px;
            }
            
            .atf-widget-icon {
                font-size: 16px;
            }
            
            .atf-widget-controls {
                display: flex;
                gap: 4px;
            }
            
            .atf-widget-btn {
                width: 24px;
                height: 24px;
                border: none;
                background: rgba(255, 255, 255, 0.2);
                color: white;
                border-radius: 4px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                font-weight: bold;
                transition: background 0.2s;
            }
            
            .atf-widget-btn:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            
            .atf-widget-content {
                padding: 16px;
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            
            .atf-search-section {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            #atf-widget-search {
                width: 100%;
                padding: 10px 12px;
                border: 2px solid #e1e5e9;
                border-radius: 8px;
                font-size: 14px;
                outline: none;
                transition: border-color 0.2s;
                box-sizing: border-box;
            }
            
            #atf-widget-search:focus {
                border-color: #4285f4;
                box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.1);
            }
            
            .atf-options-section {
                display: flex;
                gap: 16px;
            }
            
            .atf-option-label {
                display: flex;
                align-items: center;
                gap: 6px;
                cursor: pointer;
                font-size: 13px;
                color: #5f6368;
                user-select: none;
            }
            
            .atf-option-label input[type="checkbox"] {
                width: 16px;
                height: 16px;
                accent-color: #4285f4;
            }
            
            .atf-results-section {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .atf-match-info {
                display: flex;
                flex-direction: column;
                gap: 8px;
                align-items: center;
            }
            
            .atf-primary-count {
                font-size: 18px;
                font-weight: 600;
                color: #333;
            }
            
            .atf-detailed-counts {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                justify-content: center;
            }
            
            .atf-count-badge {
                font-size: 11px;
                padding: 3px 8px;
                border-radius: 12px;
                font-weight: 500;
                display: none;
            }
            
            .atf-count-badge.visible {
                background: #e8f5e8;
                color: #2e7d32;
                border: 1px solid #4caf50;
            }
            
            .atf-count-badge.hidden {
                background: #fff3e0;
                color: #f57c00;
                border: 1px solid #ffb74d;
            }
            
            .atf-count-badge.hidden.has-hidden {
                background: #ff6600;
                color: white;
                animation: atf-badge-pulse 2s infinite;
            }
            
            .atf-count-badge.expandable {
                background: #e3f2fd;
                color: #1976d2;
                border: 1px solid #2196f3;
            }
            
            @keyframes atf-badge-pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
            
            .atf-navigation-section {
                display: flex;
                gap: 8px;
                justify-content: center;
                align-items: center;
            }
            
            .atf-nav-btn, .atf-expand-btn {
                background: #f8f9fa;
                border: 1px solid #dadce0;
                border-radius: 6px;
                padding: 8px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                color: #5f6368;
                font-size: 12px;
            }
            
            .atf-nav-btn:hover, .atf-expand-btn:hover {
                background: #e8eaed;
                border-color: #bdc1c6;
            }
            
            .atf-expand-btn {
                gap: 4px;
                font-weight: 500;
                background: #4285f4;
                color: white;
                border-color: #4285f4;
                display: none;
            }
            
            .atf-expand-btn:hover {
                background: #3367d6;
                border-color: #3367d6;
            }
            
            .atf-help-section {
                text-align: center;
                padding-top: 8px;
                border-top: 1px solid #e8eaed;
            }
            
            .atf-help-section small {
                color: #5f6368;
                font-size: 11px;
                line-height: 1.4;
            }
            
            .atf-help-section strong {
                color: #333;
                font-weight: 600;
            }
            
            /* Minimized state */
            #atf-floating-widget.minimized .atf-widget-content {
                display: none;
            }
            
            #atf-floating-widget.minimized {
                width: 200px;
            }
            
            /* Hidden state */
            #atf-floating-widget.hidden {
                transform: translateX(340px) !important;
            }
            
            /* Visible state */
            #atf-floating-widget:not(.hidden) {
                transform: translateX(0) !important;
            }
            
            /* Dragging state */
            #atf-floating-widget.dragging {
                transition: none;
                cursor: grabbing;
            }
        `;
        
        document.head.appendChild(styles);
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = this.widget.querySelector('#atf-widget-search');
        const matchCaseCheckbox = this.widget.querySelector('#atf-widget-match-case');
        const wholeWordCheckbox = this.widget.querySelector('#atf-widget-whole-word');
        
        searchInput.addEventListener('input', () => {
            clearTimeout(this.debounceTimeout);
            this.debounceTimeout = setTimeout(() => {
                this.performSearch();
            }, 300);
        });
        
        matchCaseCheckbox.addEventListener('change', () => this.performSearch());
        wholeWordCheckbox.addEventListener('change', () => this.performSearch());
        
        // Navigation
        this.widget.querySelector('#atf-widget-prev').addEventListener('click', () => {
            this.navigateMatches(-1);
        });
        
        this.widget.querySelector('#atf-widget-next').addEventListener('click', () => {
            this.navigateMatches(1);
        });
        
        this.widget.querySelector('#atf-widget-expand-all').addEventListener('click', () => {
            this.expandAllElements();
        });
        
        // Widget controls
        this.widget.querySelector('.atf-minimize-btn').addEventListener('click', () => {
            this.toggleMinimize();
        });
        
        this.widget.querySelector('.atf-close-btn').addEventListener('click', () => {
            this.hide();
        });
        
        // Drag functionality
        const header = this.widget.querySelector('.atf-widget-header');
        header.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.endDrag());
        
        // Widget-specific keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.isVisible) {
                if (e.key === 'Enter' && !e.ctrlKey && document.activeElement === searchInput) {
                    this.navigateMatches(1);
                } else if (e.ctrlKey && e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.navigateMatches(-1);
                } else if (e.ctrlKey && e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.navigateMatches(1);
                } else if (e.ctrlKey && e.key === 'e') {
                    e.preventDefault();
                    this.expandAllElements();
                }
            }
        });
    }

    performSearch() {
        const searchText = this.widget.querySelector('#atf-widget-search').value;
        this.currentSearchText = searchText;
        
        const options = {
            matchCase: this.widget.querySelector('#atf-widget-match-case').checked,
            wholeWord: this.widget.querySelector('#atf-widget-whole-word').checked
        };

        if (!searchText) {
            window.clearHighlights();
            this.updateMatchDisplay({
                matchCount: 0,
                currentMatch: 0,
                visibleCount: 0,
                hiddenCount: 0,
                expandableCount: 0
            });
            return;
        }

        try {
            const searchResults = window.performSearch(searchText, options);
            const highlightResults = window.highlightMatches(searchResults, searchText);
            
            let visibleCount, hiddenCount, expandableCount;
            
            if (typeof highlightResults === 'number') {
                visibleCount = highlightResults;
                hiddenCount = 0;
                expandableCount = 0;
            } else {
                visibleCount = highlightResults.visible || 0;
                hiddenCount = highlightResults.hidden || 0;
                expandableCount = highlightResults.expandable || 0;
            }
            
            this.updateMatchDisplay({
                matchCount: visibleCount,
                currentMatch: visibleCount > 0 ? 1 : 0,
                visibleCount: visibleCount,
                hiddenCount: hiddenCount,
                expandableCount: expandableCount
            });
        } catch (error) {
            console.error('Widget search error:', error);
            this.updateMatchDisplay({
                matchCount: 0,
                currentMatch: 0,
                visibleCount: 0,
                hiddenCount: 0,
                expandableCount: 0
            });
        }
    }

    updateMatchDisplay(response) {
        const matchCount = this.widget.querySelector('#atf-widget-match-count');
        const visibleCount = this.widget.querySelector('#atf-widget-visible-count');
        const hiddenCount = this.widget.querySelector('#atf-widget-hidden-count');
        const expandableCount = this.widget.querySelector('#atf-widget-expandable-count');
        const expandAllBtn = this.widget.querySelector('#atf-widget-expand-all');
        
        matchCount.textContent = `${response.currentMatch || 0}/${response.matchCount || 0}`;
        
        if (response.visibleCount !== undefined) {
            visibleCount.textContent = `${response.visibleCount} visible`;
            visibleCount.style.display = response.visibleCount > 0 ? 'inline' : 'none';
        }
        
        if (response.hiddenCount !== undefined) {
            hiddenCount.textContent = `${response.hiddenCount} hidden`;
            hiddenCount.style.display = response.hiddenCount > 0 ? 'inline' : 'none';
            
            if (response.hiddenCount > 0) {
                hiddenCount.classList.add('has-hidden');
            } else {
                hiddenCount.classList.remove('has-hidden');
            }
        }
        
        if (response.expandableCount !== undefined) {
            expandableCount.textContent = `${response.expandableCount} expandable`;
            expandableCount.style.display = response.expandableCount > 0 ? 'inline' : 'none';
            expandAllBtn.style.display = response.expandableCount > 0 ? 'inline-flex' : 'none';
        }
    }

    navigateMatches(direction) {
        const currentIndex = window.currentHighlightIndex;
        const totalHighlights = window.currentHighlights.length;
        
        if (totalHighlights > 0) {
            let newIndex = currentIndex + direction;
            if (newIndex >= totalHighlights) newIndex = 0;
            if (newIndex < 0) newIndex = totalHighlights - 1;
            
            window.updateCurrentHighlight(newIndex);
            
            this.updateMatchDisplay({
                currentMatch: newIndex + 1,
                matchCount: totalHighlights,
                visibleCount: totalHighlights,
                hiddenCount: window.hiddenMatches ? window.hiddenMatches.reduce((sum, result) => sum + result.indices.length, 0) : 0,
                expandableCount: window.expandableElements ? window.expandableElements.length : 0
            });
        }
    }

    expandAllElements() {
        if (!this.currentSearchText) return;
        
        if (window.expandableElements && window.expandableElements.length > 0) {
            console.log('Expanding all elements...');
            window.expandableElements.forEach(element => {
                window.expandElement(element, this.currentSearchText);
            });
            
            // Re-run search after expansion
            setTimeout(() => {
                this.performSearch();
            }, 500);
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

// Initialize floating widget
let floatingWidget = null;

// Create widget when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        floatingWidget = new FloatingSearchWidget();
    });
} else {
    floatingWidget = new FloatingSearchWidget();
}

// Global toggle function
window.toggleFloatingWidget = function() {
    if (floatingWidget) {
        floatingWidget.toggle();
    }
};

// Make widget accessible globally
window.floatingWidget = floatingWidget;

// Export for external use
window.FloatingSearchWidget = FloatingSearchWidget; 

// At the end of the file, add initialization confirmation
console.log('Floating widget initialization complete. Available functions:', {
    toggleFloatingWidget: typeof window.toggleFloatingWidget,
    floatingWidget: typeof window.floatingWidget,
    performSearch: typeof window.performSearch
}); 