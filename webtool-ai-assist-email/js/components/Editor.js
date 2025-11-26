import { getCursorPosition, setCursorPosition } from '../utils/ui.js';
import { debounce } from '../utils/debounce.js';

/**
 * Editor Component
 * Main text editor with contenteditable functionality
 */
class Editor {
    constructor(options = {}) {
        this.container = options.container;
        this.onChange = options.onChange || (() => {});
        this.onSelectionChange = options.onSelectionChange || (() => {});
        
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 100;
        this.lastSavedContent = '';
        
        this.isUpdatingHistory = false;
        this.selectionData = { start: 0, end: 0 };
        
        this.init();
    }

    /**
     * Initialize the editor
     */
    init() {
        if (!this.container) {
            throw new Error('Editor container is required');
        }

        this.setupEditor();
        this.setupEventListeners();
        this.addToHistory(''); // Initial empty state
    }

    /**
     * Setup the editor container
     */
    setupEditor() {
        // Make sure the container is contenteditable
        this.container.setAttribute('contenteditable', 'true');
        this.container.setAttribute('role', 'textbox');
        this.container.setAttribute('aria-multiline', 'true');
        
        // Set initial placeholder
        if (!this.container.textContent.trim()) {
            this.container.innerHTML = '';
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Content change events
        const debouncedContentChange = debounce(() => {
            this.handleContentChange();
        }, 300);

        this.container.addEventListener('input', debouncedContentChange);
        this.container.addEventListener('paste', (e) => this.handlePaste(e));
        
        // Selection change events
        document.addEventListener('selectionchange', () => {
            if (this.container.contains(document.getSelection().anchorNode) || 
                this.container === document.getSelection().anchorNode) {
                this.handleSelectionChange();
            }
        });

        // Keyboard shortcuts
        this.container.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        // Focus events
        this.container.addEventListener('focus', () => this.handleFocus());
        this.container.addEventListener('blur', () => this.handleBlur());

        // Prevent unwanted formatting from drag and drop
        this.container.addEventListener('drop', (e) => this.handleDrop(e));
    }

    /**
     * Handle content changes
     */
    handleContentChange() {
        const content = this.getContent();
        
        if (!this.isUpdatingHistory) {
            this.addToHistory(content);
        }
        
        // Update save status
        this.lastSavedContent = content;
        
        // Trigger change callback
        this.onChange(content);
        
        // Update word count and other metrics
        this.updateEditorStats(content);
    }

    /**
     * Handle selection changes
     */
    handleSelectionChange() {
        const selection = getCursorPosition(this.container);
        this.selectionData = selection;
        this.onSelectionChange(selection);
    }

    /**
     * Handle paste events
     */
    handlePaste(event) {
        event.preventDefault();
        
        // Get plain text from clipboard
        const paste = (event.clipboardData || window.clipboardData).getData('text/plain');
        
        if (paste) {
            // Clean the pasted text
            const cleanText = this.sanitizeText(paste);
            this.insertText(cleanText);
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyDown(event) {
        // Handle Enter key for proper line breaks
        if (event.key === 'Enter') {
            event.preventDefault();
            this.insertText('\n');
            return;
        }

        // Handle Tab key (prevent default to avoid losing focus)
        if (event.key === 'Tab') {
            event.preventDefault();
            // Let the main app handle AI suggestions
            return;
        }

        // Handle formatting shortcuts
        if (event.ctrlKey || event.metaKey) {
            switch (event.key.toLowerCase()) {
                case 'b':
                    event.preventDefault();
                    this.applyFormat('bold');
                    break;
                case 'i':
                    event.preventDefault();
                    this.applyFormat('italic');
                    break;
                case 'u':
                    event.preventDefault();
                    this.applyFormat('underline');
                    break;
                default:
                    // Let other shortcuts bubble up
                    break;
            }
        }
    }

    /**
     * Handle focus events
     */
    handleFocus() {
        this.container.classList.add('focused');
    }

    /**
     * Handle blur events
     */
    handleBlur() {
        this.container.classList.remove('focused');
    }

    /**
     * Handle drop events
     */
    handleDrop(event) {
        event.preventDefault();
        
        // Only allow text drops
        const text = event.dataTransfer.getData('text/plain');
        if (text) {
            const cleanText = this.sanitizeText(text);
            this.insertText(cleanText);
        }
    }

    /**
     * Get the current content of the editor
     * @returns {string} The current content
     */
    getContent() {
        return this.container.textContent || '';
    }

    /**
     * Set the content of the editor
     * @param {string} content - The content to set
     */
    setContent(content) {
        const sanitized = this.sanitizeText(content);
        this.container.textContent = sanitized;
        this.addToHistory(sanitized);
        this.handleContentChange();
    }

    /**
     * Get selected text
     * @returns {string} The selected text
     */
    getSelectedText() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            return selection.toString();
        }
        return '';
    }

    /**
     * Replace selected text
     * @param {string} newText - The new text to replace selection with
     */
    replaceSelection(newText) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(newText));
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
            this.handleContentChange();
        }
    }

    /**
     * Insert text at current cursor position
     * @param {string} text - The text to insert
     */
    insertText(text) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            
            // Convert newlines to <br> for display
            const lines = text.split('\n');
            lines.forEach((line, index) => {
                if (index > 0) {
                    range.insertNode(document.createElement('br'));
                }
                if (line) {
                    range.insertNode(document.createTextNode(line));
                }
            });
            
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
            this.handleContentChange();
        }
    }

    /**
     * Apply formatting to selected text
     * @param {string} format - The format to apply (bold, italic, underline)
     */
    applyFormat(format) {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        if (range.collapsed) return; // No selection

        const selectedText = range.toString();
        if (!selectedText) return;

        // Create formatted element
        let element;
        switch (format) {
            case 'bold':
                element = document.createElement('strong');
                break;
            case 'italic':
                element = document.createElement('em');
                break;
            case 'underline':
                element = document.createElement('u');
                break;
            case 'list':
                // Handle list formatting differently
                this.applyListFormat();
                return;
            default:
                return;
        }

        // Check if selection is already formatted
        const parentElement = range.commonAncestorContainer.parentElement;
        if (parentElement && parentElement.tagName.toLowerCase() === element.tagName.toLowerCase()) {
            // Remove formatting
            const textNode = document.createTextNode(parentElement.textContent);
            parentElement.parentNode.replaceChild(textNode, parentElement);
        } else {
            // Apply formatting
            element.textContent = selectedText;
            range.deleteContents();
            range.insertNode(element);
        }

        // Restore selection
        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(element);
        selection.addRange(newRange);

        this.handleContentChange();
    }

    /**
     * Apply list formatting
     */
    applyListFormat() {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;

        const content = this.getContent();
        const lines = content.split('\n');
        const cursorPos = getCursorPosition(this.container);
        
        // Find current line
        let charCount = 0;
        let currentLine = 0;
        for (let i = 0; i < lines.length; i++) {
            if (charCount + lines[i].length >= cursorPos.start) {
                currentLine = i;
                break;
            }
            charCount += lines[i].length + 1; // +1 for newline
        }

        // Toggle list item
        if (lines[currentLine].trim().startsWith('•')) {
            lines[currentLine] = lines[currentLine].replace(/^\s*•\s*/, '');
        } else {
            lines[currentLine] = '• ' + lines[currentLine];
        }

        this.setContent(lines.join('\n'));
    }

    /**
     * Apply AI suggestion
     * @param {Object} suggestion - The suggestion object
     */
    applySuggestion(suggestion) {
        if (suggestion.type === 'completion') {
            this.insertText(suggestion.text);
        } else if (suggestion.type === 'replacement') {
            if (suggestion.range) {
                // Replace specific range
                this.replaceRange(suggestion.range.start, suggestion.range.end, suggestion.text);
            } else {
                // Replace selected text or insert
                if (this.getSelectedText()) {
                    this.replaceSelection(suggestion.text);
                } else {
                    this.insertText(suggestion.text);
                }
            }
        }
    }

    /**
     * Apply grammar fix
     * @param {Object} fix - The grammar fix object
     */
    applyGrammarFix(fix) {
        this.replaceRange(fix.range.start, fix.range.end, fix.replacement);
    }

    /**
     * Replace text in a specific range
     * @param {number} start - Start position
     * @param {number} end - End position
     * @param {string} replacement - Replacement text
     */
    replaceRange(start, end, replacement) {
        const content = this.getContent();
        const newContent = content.substring(0, start) + replacement + content.substring(end);
        this.setContent(newContent);
        
        // Set cursor after replacement
        setCursorPosition(this.container, start + replacement.length);
    }

    /**
     * Replace entire content
     * @param {string} newContent - The new content
     */
    replaceContent(newContent) {
        this.setContent(newContent);
    }

    /**
     * Insert template at cursor position
     * @param {Object} template - The template object
     */
    insertTemplate(template) {
        if (template.content) {
            this.insertText(template.content);
        }
    }

    /**
     * Check if editor has unsaved changes
     * @returns {boolean} True if there are unsaved changes
     */
    hasUnsavedChanges() {
        return this.getContent() !== this.lastSavedContent;
    }

    /**
     * Mark content as saved
     */
    markAsSaved() {
        this.lastSavedContent = this.getContent();
    }

    /**
     * Add content to history
     * @param {string} content - The content to add
     */
    addToHistory(content) {
        if (this.isUpdatingHistory) return;
        
        // Don't add if content is the same as last entry
        if (this.history.length > 0 && this.history[this.historyIndex] === content) {
            return;
        }

        // Remove future history if we're not at the end
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        // Add new content
        this.history.push(content);
        this.historyIndex = this.history.length - 1;

        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    /**
     * Undo last change
     */
    undo() {
        if (this.canUndo()) {
            this.historyIndex--;
            this.restoreFromHistory();
        }
    }

    /**
     * Redo last undone change
     */
    redo() {
        if (this.canRedo()) {
            this.historyIndex++;
            this.restoreFromHistory();
        }
    }

    /**
     * Check if undo is available
     * @returns {boolean} True if undo is available
     */
    canUndo() {
        return this.historyIndex > 0;
    }

    /**
     * Check if redo is available
     * @returns {boolean} True if redo is available
     */
    canRedo() {
        return this.historyIndex < this.history.length - 1;
    }

    /**
     * Restore content from history
     */
    restoreFromHistory() {
        if (this.historyIndex >= 0 && this.historyIndex < this.history.length) {
            this.isUpdatingHistory = true;
            
            const content = this.history[this.historyIndex];
            this.container.textContent = content;
            
            // Trigger change event
            setTimeout(() => {
                this.isUpdatingHistory = false;
                this.onChange(content);
            }, 0);
        }
    }

    /**
     * Sanitize text input
     * @param {string} text - The text to sanitize
     * @returns {string} Sanitized text
     */
    sanitizeText(text) {
        // Remove any HTML tags and normalize whitespace
        return text
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/\r\n/g, '\n')  // Normalize line endings
            .replace(/\r/g, '\n');   // Normalize line endings
    }

    /**
     * Update editor statistics
     * @param {string} content - The content to analyze
     */
    updateEditorStats(content) {
        const words = content.trim() ? content.trim().split(/\s+/).length : 0;
        const chars = content.length;
        const lines = content.split('\n').length;

        // Dispatch custom event with stats
        const event = new CustomEvent('editorStatsUpdate', {
            detail: { words, chars, lines }
        });
        this.container.dispatchEvent(event);
    }

    /**
     * Focus the editor
     */
    focus() {
        this.container.focus();
    }

    /**
     * Blur the editor
     */
    blur() {
        this.container.blur();
    }

    /**
     * Get editor statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        const content = this.getContent();
        return {
            words: content.trim() ? content.trim().split(/\s+/).length : 0,
            characters: content.length,
            lines: content.split('\n').length,
            paragraphs: content.split(/\n\s*\n/).length
        };
    }

    /**
     * Destroy the editor and clean up
     */
    destroy() {
        // Remove event listeners
        this.container.removeEventListener('input', this.handleContentChange);
        this.container.removeEventListener('paste', this.handlePaste);
        this.container.removeEventListener('keydown', this.handleKeyDown);
        
        // Clear content
        this.container.innerHTML = '';
        
        // Clear history
        this.history = [];
        this.historyIndex = -1;
    }
}

export default Editor;
