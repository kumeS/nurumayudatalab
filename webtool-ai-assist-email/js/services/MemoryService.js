/**
 * Memory Service
 * Manages session context and editing history for AI features
 */
class MemoryService {
    constructor() {
        this.sessionMemory = {
            content: '',
            selectionHistory: [],
            editingHistory: [],
            userPatterns: {},
            contextWindow: []
        };
        
        this.maxHistorySize = 50;
        this.maxContextWindow = 10;
    }

    /**
     * Update current content
     * @param {string} content - Current editor content
     */
    updateContent(content) {
        const previousContent = this.sessionMemory.content;
        this.sessionMemory.content = content;
        
        // Track editing patterns
        if (previousContent !== content) {
            this.addToEditingHistory(previousContent, content);
            this.analyzeEditingPattern(previousContent, content);
        }
    }

    /**
     * Update current selection
     * @param {Object} selection - Selection data {start, end}
     */
    updateSelection(selection) {
        this.sessionMemory.selectionHistory.push({
            selection,
            timestamp: Date.now(),
            content: this.sessionMemory.content.substring(selection.start, selection.end)
        });
        
        // Keep only recent selections
        if (this.sessionMemory.selectionHistory.length > this.maxHistorySize) {
            this.sessionMemory.selectionHistory.shift();
        }
    }

    /**
     * Add to editing history
     * @param {string} before - Content before edit
     * @param {string} after - Content after edit
     */
    addToEditingHistory(before, after) {
        const edit = {
            before,
            after,
            timestamp: Date.now(),
            type: this.detectEditType(before, after),
            changes: this.calculateChanges(before, after)
        };
        
        this.sessionMemory.editingHistory.push(edit);
        
        // Keep only recent edits
        if (this.sessionMemory.editingHistory.length > this.maxHistorySize) {
            this.sessionMemory.editingHistory.shift();
        }
        
        // Update context window
        this.updateContextWindow(edit);
    }

    /**
     * Detect type of edit
     * @param {string} before - Content before
     * @param {string} after - Content after
     * @returns {string} Edit type
     */
    detectEditType(before, after) {
        if (after.length > before.length) {
            return 'addition';
        } else if (after.length < before.length) {
            return 'deletion';
        } else {
            return 'modification';
        }
    }

    /**
     * Calculate changes between two texts
     * @param {string} before - Content before
     * @param {string} after - Content after
     * @returns {Object} Change information
     */
    calculateChanges(before, after) {
        const lengthDiff = after.length - before.length;
        const wordsBefore = before.trim().split(/\s+/).length;
        const wordsAfter = after.trim().split(/\s+/).length;
        
        return {
            lengthChange: lengthDiff,
            wordChange: wordsAfter - wordsBefore,
            isSignificant: Math.abs(lengthDiff) > 10 || Math.abs(wordsAfter - wordsBefore) > 2
        };
    }

    /**
     * Analyze editing patterns for user behavior
     * @param {string} before - Content before
     * @param {string} after - Content after
     */
    analyzeEditingPattern(before, after) {
        // Analyze common patterns
        const patterns = this.sessionMemory.userPatterns;
        
        // Track preferred sentence length
        const sentences = after.split(/[.!?]+/).filter(s => s.trim());
        if (sentences.length > 0) {
            const avgLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
            patterns.avgSentenceLength = patterns.avgSentenceLength 
                ? (patterns.avgSentenceLength * 0.8 + avgLength * 0.2)
                : avgLength;
        }
        
        // Track writing style indicators
        const formalWords = ['however', 'therefore', 'furthermore', 'consequently'];
        const casualWords = ['but', 'so', 'also', 'then'];
        
        let formalCount = 0;
        let casualCount = 0;
        
        formalWords.forEach(word => {
            if (after.toLowerCase().includes(word)) formalCount++;
        });
        
        casualWords.forEach(word => {
            if (after.toLowerCase().includes(word)) casualCount++;
        });
        
        patterns.formalityScore = formalCount - casualCount;
    }

    /**
     * Update context window
     * @param {Object} edit - Edit information
     */
    updateContextWindow(edit) {
        if (edit.changes.isSignificant) {
            this.sessionMemory.contextWindow.push({
                timestamp: edit.timestamp,
                type: edit.type,
                summary: this.summarizeEdit(edit),
                relevance: 1.0
            });
            
            // Keep only recent significant changes
            if (this.sessionMemory.contextWindow.length > this.maxContextWindow) {
                this.sessionMemory.contextWindow.shift();
            }
            
            // Decay relevance of older items
            this.sessionMemory.contextWindow.forEach((item, index) => {
                const age = Date.now() - item.timestamp;
                const hours = age / (1000 * 60 * 60);
                item.relevance = Math.max(0.1, 1.0 - (hours * 0.1));
            });
        }
    }

    /**
     * Summarize an edit for context
     * @param {Object} edit - Edit information
     * @returns {string} Edit summary
     */
    summarizeEdit(edit) {
        const { type, changes } = edit;
        
        if (type === 'addition') {
            return `Added ${changes.wordChange} words`;
        } else if (type === 'deletion') {
            return `Removed ${Math.abs(changes.wordChange)} words`;
        } else {
            return `Modified content (${changes.lengthChange > 0 ? '+' : ''}${changes.lengthChange} chars)`;
        }
    }

    /**
     * Get current context for AI
     * @returns {Object} Context information
     */
    getContext() {
        return {
            currentContent: this.sessionMemory.content,
            recentEdits: this.sessionMemory.editingHistory.slice(-5),
            recentSelections: this.sessionMemory.selectionHistory.slice(-3),
            userPatterns: this.sessionMemory.userPatterns,
            contextWindow: this.sessionMemory.contextWindow,
            sessionStats: this.getSessionStats()
        };
    }

    /**
     * Get context for specific selection
     * @param {number} start - Selection start
     * @param {number} end - Selection end
     * @returns {Object} Selection context
     */
    getSelectionContext(start, end) {
        const selectedText = this.sessionMemory.content.substring(start, end);
        const beforeText = this.sessionMemory.content.substring(Math.max(0, start - 200), start);
        const afterText = this.sessionMemory.content.substring(end, Math.min(this.sessionMemory.content.length, end + 200));
        
        return {
            selectedText,
            beforeText,
            afterText,
            position: { start, end },
            surroundingContext: beforeText + afterText,
            relatedEdits: this.findRelatedEdits(start, end)
        };
    }

    /**
     * Find edits related to a text range
     * @param {number} start - Range start
     * @param {number} end - Range end
     * @returns {Array} Related edits
     */
    findRelatedEdits(start, end) {
        // This is a simplified implementation
        // In a full version, this would analyze edit positions relative to the range
        return this.sessionMemory.editingHistory.slice(-3);
    }

    /**
     * Get session statistics
     * @returns {Object} Session stats
     */
    getSessionStats() {
        const content = this.sessionMemory.content;
        const edits = this.sessionMemory.editingHistory;
        
        return {
            totalEdits: edits.length,
            contentLength: content.length,
            wordCount: content.trim() ? content.trim().split(/\s+/).length : 0,
            sessionDuration: edits.length > 0 
                ? Date.now() - edits[0].timestamp 
                : 0,
            editFrequency: edits.length > 0 
                ? edits.length / ((Date.now() - edits[0].timestamp) / 60000) // edits per minute
                : 0
        };
    }

    /**
     * Get writing style suggestions based on patterns
     * @returns {Array} Style suggestions
     */
    getStyleSuggestions() {
        const patterns = this.sessionMemory.userPatterns;
        const suggestions = [];
        
        if (patterns.avgSentenceLength > 30) {
            suggestions.push({
                type: 'sentence-length',
                message: 'Consider breaking down long sentences for better readability',
                confidence: 0.7
            });
        }
        
        if (patterns.formalityScore > 3) {
            suggestions.push({
                type: 'tone',
                message: 'Your writing style appears very formal - consider a more conversational tone if appropriate',
                confidence: 0.6
            });
        } else if (patterns.formalityScore < -3) {
            suggestions.push({
                type: 'tone',
                message: 'Your writing style appears casual - consider more formal language if needed',
                confidence: 0.6
            });
        }
        
        return suggestions;
    }

    /**
     * Clear session memory
     */
    clearSession() {
        this.sessionMemory = {
            content: '',
            selectionHistory: [],
            editingHistory: [],
            userPatterns: {},
            contextWindow: []
        };
    }

    /**
     * Export session data for analysis
     * @returns {Object} Session data
     */
    exportSession() {
        return {
            ...this.sessionMemory,
            exportedAt: Date.now(),
            sessionStats: this.getSessionStats()
        };
    }

    /**
     * Import session data
     * @param {Object} sessionData - Previously exported session data
     */
    importSession(sessionData) {
        if (sessionData && sessionData.content !== undefined) {
            this.sessionMemory = {
                content: sessionData.content || '',
                selectionHistory: sessionData.selectionHistory || [],
                editingHistory: sessionData.editingHistory || [],
                userPatterns: sessionData.userPatterns || {},
                contextWindow: sessionData.contextWindow || []
            };
        }
    }
}

export default MemoryService;
