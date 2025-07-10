# Advanced Text Finder Chrome Extension

A powerful Chrome extension that searches for text on web pages with advanced features like case sensitivity, whole word matching, navigation between matches, and **hidden element detection**. Features both a popup interface and a floating search widget.

## 🚀 Key Features

- **Complete Page Search**: Searches through all visible AND hidden text content on any web page
- **Hidden Element Detection**: Finds text in dropdown menus, accordions, collapsed sections, and other hidden elements
- **Visual Indicators**: Shows orange badges on elements containing hidden matches
- **Smart Expansion**: Click indicators or use "Expand All" to reveal hidden content
- **Case Sensitive Search**: Toggle case-sensitive matching on/off
- **Whole Word Search**: Find complete words only (not partial matches)
- **Real-time Results**: Shows detailed match counts as you type
- **Dual Interface**: Choose between popup or floating widget
- **Navigation**: Navigate between matches with keyboard shortcuts

## 🎯 Two Interface Options

### 1. Popup Interface
- **Shortcut**: `Ctrl+Shift+Q`
- **Quick access** from browser toolbar
- **Compact design** for simple searches

### 2. Floating Widget (NEW!)
- **Shortcut**: `Ctrl+Shift+M`
- **Persistent** - stays open while you interact with the page
- **Draggable** - position anywhere on screen
- **Minimizable** - reduce to title bar when not needed
- **Perfect for hidden element detection** - stays visible while you expand dropdowns

## 🔍 Hidden Element Detection

This extension's **superpower** is finding text that regular browser search can't:

- **Dropdown menus** and select boxes
- **Accordion sections** and collapsible content  
- **Hidden tabs** and panels
- **Collapsed navigation** menus
- **Modal dialogs** and overlays
- **Any element** with `display: none` or `visibility: hidden`

### How It Works:
1. **Search** for your text (finds both visible and hidden matches)
2. **Orange badges** appear on elements containing hidden matches
3. **Click badges** to expand individual elements
4. **Use "Expand All"** to reveal all hidden content at once
5. **Navigate** through all matches seamlessly

## 🎮 How to Use

### Popup Interface:
1. Press `Ctrl+Shift+Q` or click the extension icon
2. Type your search text
3. Use checkboxes for case sensitivity and whole word matching
4. Navigate with `Enter` or `Ctrl+↑/↓`
5. Click "Expand All" when you see expandable elements

### Floating Widget:
1. Press `Ctrl+Shift+M` to toggle the floating widget
2. **Drag** by the blue header to position anywhere
3. **Minimize** with the `−` button to save space
4. **Same functionality** as popup but stays visible
5. **Perfect for testing** hidden element detection

## ⌨️ Keyboard Shortcuts

- `Ctrl+Shift+Q`: Open popup interface
- `Ctrl+Shift+M`: Toggle floating widget
- `Enter`: Navigate to next match
- `Ctrl+↑`: Navigate to previous match
- `Ctrl+↓`: Navigate to next match
- `Ctrl+E`: Expand all hidden elements (when widget is open)

**Note**: On Mac, use `Cmd` instead of `Ctrl` for shortcuts.

### Troubleshooting Shortcuts:
1. **Reload the extension** if shortcuts don't work
2. **Check Chrome://extensions/shortcuts** to see if shortcuts are registered
3. **Try the direct shortcuts** - they're built into the page content
4. **Open browser console** to see debug messages when pressing shortcuts

## 🎯 Match Information

The extension shows detailed match counts:
- **Visible matches**: Currently visible on the page
- **Hidden matches**: Found in collapsed/hidden elements
- **Expandable elements**: Number of elements that can be expanded

## 🔧 Technical Advantages

This extension surpasses regular browser find because it:
- **Searches ALL text nodes** including hidden ones
- **Preserves DOM structure** during highlighting
- **Detects expandable elements** automatically
- **Handles complex layouts** and dynamic content
- **Works with modern frameworks** (React, Vue, Angular, etc.)
- **Provides visual feedback** for hidden content

## 📥 Installation

1. Load the extension in Chrome's developer mode
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select this directory
5. Pin the extension to your toolbar for easy access

## 🚀 Perfect For

- **Web developers** testing hidden content
- **Content auditors** finding all text instances
- **Accessibility testing** of hidden elements
- **Data extraction** from complex websites
- **Research** on sites with lots of hidden content

## 🎨 Visual Features

- **Yellow highlights** for regular matches
- **Orange highlights** for current match
- **Pulsing orange badges** for hidden matches
- **Smooth animations** for navigation
- **Professional UI** with modern design

Try the floating widget - it's perfect for your hidden element detection needs! 🎯
 
