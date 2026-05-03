// Note: Styles are loaded directly in HTML

// Import components and services
import Editor from './components/Editor.js';
import AIPanel from './components/AIPanel.js';
import Toolbar from './components/Toolbar.js';
import TemplateManager from './components/TemplateManager.js';
import AIService from './services/AIService.js';
import StorageService from './services/StorageService.js';
import MemoryService from './services/MemoryService.js';
import { debounce } from './utils/debounce.js';
import { showToast, showLoading, hideLoading } from './utils/ui.js';

/**
 * Main Application Class
 * Orchestrates all components and manages global app state
 */
class AIWebEditor {
    constructor() {
        this.isInitialized = false;
        this.components = {};
        this.services = {};
        this.state = {
            isAIPanelOpen: false,
            isGrammarCheckEnabled: true,
            isAutoSaveEnabled: true,
            currentTone: 'formal',
            fontSize: 16
        };
        
        this.eventHandlers = new Map();
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setup());
            } else {
                this.setup();
            }
        } catch (error) {
            console.error('Failed to initialize AIWebEditor:', error);
            showToast('アプリケーションの初期化に失敗しました', 'error');
        }
    }

    /**
     * Setup the application after DOM is ready
     */
    async setup() {
        try {
            // Initialize services first
            await this.initializeServices();
            
            // Initialize components
            this.initializeComponents();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load user preferences
            await this.loadUserPreferences();
            
            // Setup keyboard shortcuts
            this.setupKeyboardShortcuts();
            
            // Setup auto-save
            this.setupAutoSave();
            
            // Show welcome message for first-time users
            this.showWelcomeMessage();
            
            this.isInitialized = true;
            console.log('AIWebEditor initialized successfully');
            
        } catch (error) {
            console.error('Failed to setup application:', error);
            showToast('アプリケーションのセットアップに失敗しました', 'error');
        }
    }

    /**
     * Initialize all services
     */
    async initializeServices() {
        this.services.storage = new StorageService();
        this.services.memory = new MemoryService();
        this.services.ai = new AIService();
        
        // Initialize AI service with configuration
        await this.services.ai.initialize({
            apiKey: process.env.IO_INTELLIGENCE_API_KEY,
            model: 'gpt-oss-120B',
            maxTokens: 8000
        });
    }

    /**
     * Initialize all components
     */
    initializeComponents() {
        // Initialize main editor
        this.components.editor = new Editor({
            container: document.getElementById('main-editor'),
            onChange: (content) => this.handleEditorChange(content),
            onSelectionChange: (selection) => this.handleSelectionChange(selection)
        });

        // Initialize AI panel
        this.components.aiPanel = new AIPanel({
            container: document.getElementById('ai-panel'),
            onSuggestionClick: (suggestion) => this.handleSuggestionClick(suggestion),
            onGrammarFix: (fix) => this.handleGrammarFix(fix),
            onToneChange: (tone) => this.handleToneChange(tone)
        });

        // Initialize toolbar
        this.components.toolbar = new Toolbar({
            container: document.querySelector('.toolbar'),
            onFormatClick: (format) => this.handleFormatClick(format),
            onAIClick: () => this.toggleAIPanel(),
            onUndoClick: () => this.handleUndo(),
            onRedoClick: () => this.handleRedo()
        });

        // Initialize template manager
        this.components.templateManager = new TemplateManager({
            container: document.getElementById('templates-section'),
            onTemplateSelect: (template) => this.handleTemplateSelect(template)
        });
    }

    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        // Settings modal
        const settingsBtn = document.getElementById('settings-btn');
        const settingsModal = document.getElementById('settings-modal');
        const closeSettingsBtn = document.getElementById('close-settings-modal');
        
        settingsBtn.addEventListener('click', () => this.showSettings());
        closeSettingsBtn.addEventListener('click', () => this.hideSettings());
        
        // Settings controls
        const fontSizeSlider = document.getElementById('font-size-slider');
        const fontSizeDisplay = document.getElementById('font-size-display');
        const autoSaveToggle = document.getElementById('auto-save-toggle');
        const grammarToggle = document.getElementById('grammar-check-toggle');
        
        fontSizeSlider.addEventListener('input', (e) => {
            const size = parseInt(e.target.value);
            this.updateFontSize(size);
            fontSizeDisplay.textContent = `${size}px`;
        });
        
        autoSaveToggle.addEventListener('change', (e) => {
            this.state.isAutoSaveEnabled = e.target.checked;
            this.saveUserPreferences();
        });
        
        grammarToggle.addEventListener('change', (e) => {
            this.state.isGrammarCheckEnabled = e.target.checked;
            this.saveUserPreferences();
        });

        // AI prompt input
        const promptInput = document.getElementById('ai-prompt-input');
        const promptSubmit = document.getElementById('prompt-submit-btn');
        const promptSuggestions = document.querySelectorAll('.prompt-suggestion');
        
        promptSubmit.addEventListener('click', () => this.handlePromptSubmit());
        promptInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handlePromptSubmit();
            }
        });
        
        promptSuggestions.forEach(btn => {
            btn.addEventListener('click', (e) => {
                promptInput.value = e.target.dataset.prompt;
                this.handlePromptSubmit();
            });
        });

        // Window events
        window.addEventListener('beforeunload', (e) => {
            if (this.components.editor && this.components.editor.hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = '';
            }
        });

        // Close modals on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideSettings();
                this.closeAIPanel();
            }
        });
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        const shortcuts = {
            'Tab': (e) => {
                if (this.components.aiPanel.hasSuggestions()) {
                    e.preventDefault();
                    this.components.aiPanel.acceptFirstSuggestion();
                }
            },
            'Ctrl+g': (e) => {
                e.preventDefault();
                this.triggerGrammarCheck();
            },
            'Cmd+g': (e) => {
                e.preventDefault();
                this.triggerGrammarCheck();
            },
            'Ctrl+t': (e) => {
                e.preventDefault();
                this.showToneSelector();
            },
            'Cmd+t': (e) => {
                e.preventDefault();
                this.showToneSelector();
            },
            'Ctrl+s': (e) => {
                e.preventDefault();
                this.saveDocument();
            },
            'Cmd+s': (e) => {
                e.preventDefault();
                this.saveDocument();
            },
            'Ctrl+z': (e) => {
                e.preventDefault();
                this.handleUndo();
            },
            'Cmd+z': (e) => {
                e.preventDefault();
                this.handleUndo();
            },
            'Ctrl+y': (e) => {
                e.preventDefault();
                this.handleRedo();
            },
            'Cmd+y': (e) => {
                e.preventDefault();
                this.handleRedo();
            }
        };

        document.addEventListener('keydown', (e) => {
            const key = this.getShortcutKey(e);
            if (shortcuts[key]) {
                shortcuts[key](e);
            }
        });
    }

    /**
     * Get keyboard shortcut key combination
     */
    getShortcutKey(event) {
        const parts = [];
        
        if (event.ctrlKey || event.metaKey) {
            parts.push(event.metaKey ? 'Cmd' : 'Ctrl');
        }
        if (event.altKey) parts.push('Alt');
        if (event.shiftKey) parts.push('Shift');
        
        parts.push(event.key);
        return parts.join('+');
    }

    /**
     * Setup auto-save functionality
     */
    setupAutoSave() {
        this.autoSaveHandler = debounce(() => {
            if (this.state.isAutoSaveEnabled) {
                this.saveDocument();
            }
        }, 30000); // Save every 30 seconds
    }

    /**
     * Handle editor content change
     */
    handleEditorChange(content) {
        // Update memory service with new content
        this.services.memory.updateContent(content);
        
        // Trigger auto-save
        if (this.state.isAutoSaveEnabled) {
            this.autoSaveHandler();
        }
        
        // Update save status
        this.updateSaveStatus('unsaved');
        
        // Trigger grammar check if enabled
        if (this.state.isGrammarCheckEnabled) {
            this.scheduleGrammarCheck(content);
        }
    }

    /**
     * Handle text selection change
     */
    handleSelectionChange(selection) {
        this.services.memory.updateSelection(selection);
        this.updateToolbarState();
    }

    /**
     * Handle AI suggestion click
     */
    handleSuggestionClick(suggestion) {
        this.components.editor.applySuggestion(suggestion);
        showToast('AI提案を適用しました', 'success');
    }

    /**
     * Handle grammar fix
     */
    handleGrammarFix(fix) {
        this.components.editor.applyGrammarFix(fix);
        showToast('文法修正を適用しました', 'success');
    }

    /**
     * Handle tone change
     */
    async handleToneChange(tone) {
        if (tone !== this.state.currentTone) {
            this.state.currentTone = tone;
            await this.applyToneAdjustment(tone);
            this.saveUserPreferences();
        }
    }

    /**
     * Handle formatting click
     */
    handleFormatClick(format) {
        this.components.editor.applyFormat(format);
    }

    /**
     * Handle template selection
     */
    handleTemplateSelect(template) {
        this.components.editor.insertTemplate(template);
        showToast(`テンプレート「${template.name}」を挿入しました`, 'success');
    }

    /**
     * Handle AI prompt submission
     */
    async handlePromptSubmit() {
        const input = document.getElementById('ai-prompt-input');
        const prompt = input.value.trim();
        
        if (!prompt) return;
        
        try {
            showLoading('AI処理中...');
            
            const currentContent = this.components.editor.getContent();
            const context = this.services.memory.getContext();
            
            const response = await this.services.ai.processPrompt(prompt, {
                content: currentContent,
                context: context,
                tone: this.state.currentTone
            });
            
            if (response.suggestions) {
                this.components.aiPanel.updateSuggestions(response.suggestions);
            }
            
            if (response.replacement) {
                this.components.editor.replaceContent(response.replacement);
                showToast('AI処理を適用しました', 'success');
            }
            
            input.value = '';
            
        } catch (error) {
            console.error('AI prompt processing failed:', error);
            showToast('AI処理に失敗しました', 'error');
        } finally {
            hideLoading();
        }
    }

    /**
     * Handle undo action
     */
    handleUndo() {
        if (this.components.editor.canUndo()) {
            this.components.editor.undo();
            this.updateToolbarState();
        }
    }

    /**
     * Handle redo action
     */
    handleRedo() {
        if (this.components.editor.canRedo()) {
            this.components.editor.redo();
            this.updateToolbarState();
        }
    }

    /**
     * Toggle AI panel visibility
     */
    toggleAIPanel() {
        if (this.state.isAIPanelOpen) {
            this.closeAIPanel();
        } else {
            this.openAIPanel();
        }
    }

    /**
     * Open AI panel
     */
    openAIPanel() {
        const panel = document.getElementById('ai-panel');
        panel.classList.add('show');
        this.state.isAIPanelOpen = true;
        
        // Focus on first interactive element
        const firstFocusable = panel.querySelector('button, input, [tabindex]');
        if (firstFocusable) {
            firstFocusable.focus();
        }
    }

    /**
     * Close AI panel
     */
    closeAIPanel() {
        const panel = document.getElementById('ai-panel');
        panel.classList.remove('show');
        this.state.isAIPanelOpen = false;
    }

    /**
     * Schedule grammar check with debounce
     */
    scheduleGrammarCheck(content) {
        if (this.grammarCheckTimer) {
            clearTimeout(this.grammarCheckTimer);
        }
        
        this.grammarCheckTimer = setTimeout(async () => {
            await this.performGrammarCheck(content);
        }, 1000); // Check after 1 second of inactivity
    }

    /**
     * Perform grammar check
     */
    async performGrammarCheck(content) {
        if (!content.trim()) return;
        
        try {
            const issues = await this.services.ai.checkGrammar(content);
            this.components.aiPanel.updateGrammarResults(issues);
        } catch (error) {
            console.error('Grammar check failed:', error);
        }
    }

    /**
     * Trigger grammar check manually
     */
    async triggerGrammarCheck() {
        const content = this.components.editor.getContent();
        if (content.trim()) {
            showLoading('文法をチェック中...');
            await this.performGrammarCheck(content);
            hideLoading();
            this.openAIPanel();
        }
    }

    /**
     * Apply tone adjustment
     */
    async applyToneAdjustment(tone) {
        const content = this.components.editor.getSelectedText() || 
                      this.components.editor.getContent();
        
        if (!content.trim()) return;
        
        try {
            showLoading('トーンを調整中...');
            
            const adjustedText = await this.services.ai.adjustTone(content, tone);
            
            if (this.components.editor.getSelectedText()) {
                this.components.editor.replaceSelection(adjustedText);
            } else {
                this.components.editor.setContent(adjustedText);
            }
            
            showToast(`トーンを${tone}に調整しました`, 'success');
            
        } catch (error) {
            console.error('Tone adjustment failed:', error);
            showToast('トーン調整に失敗しました', 'error');
        } finally {
            hideLoading();
        }
    }

    /**
     * Show tone selector
     */
    showToneSelector() {
        this.openAIPanel();
        // Focus on tone section
        const toneSection = document.getElementById('tone-section');
        toneSection.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Save document
     */
    async saveDocument() {
        try {
            const content = this.components.editor.getContent();
            const metadata = {
                lastModified: new Date().toISOString(),
                wordCount: content.split(/\s+/).length,
                characterCount: content.length
            };
            
            await this.services.storage.saveDocument('current', {
                content,
                metadata
            });
            
            this.updateSaveStatus('saved');
            
        } catch (error) {
            console.error('Failed to save document:', error);
            this.updateSaveStatus('error');
            showToast('保存に失敗しました', 'error');
        }
    }

    /**
     * Load user preferences
     */
    async loadUserPreferences() {
        try {
            const preferences = await this.services.storage.getPreferences();
            
            if (preferences) {
                this.state = { ...this.state, ...preferences };
                this.applyUserPreferences();
            }
        } catch (error) {
            console.error('Failed to load preferences:', error);
        }
    }

    /**
     * Save user preferences
     */
    async saveUserPreferences() {
        try {
            await this.services.storage.savePreferences(this.state);
        } catch (error) {
            console.error('Failed to save preferences:', error);
        }
    }

    /**
     * Apply user preferences to UI
     */
    applyUserPreferences() {
        // Apply font size
        this.updateFontSize(this.state.fontSize);
        
        // Update settings controls
        const fontSizeSlider = document.getElementById('font-size-slider');
        const fontSizeDisplay = document.getElementById('font-size-display');
        const autoSaveToggle = document.getElementById('auto-save-toggle');
        const grammarToggle = document.getElementById('grammar-check-toggle');
        
        if (fontSizeSlider) {
            fontSizeSlider.value = this.state.fontSize;
            fontSizeDisplay.textContent = `${this.state.fontSize}px`;
        }
        
        if (autoSaveToggle) {
            autoSaveToggle.checked = this.state.isAutoSaveEnabled;
        }
        
        if (grammarToggle) {
            grammarToggle.checked = this.state.isGrammarCheckEnabled;
        }
    }

    /**
     * Update font size
     */
    updateFontSize(size) {
        this.state.fontSize = size;
        document.documentElement.style.setProperty('--editor-font-size', `${size}px`);
        this.saveUserPreferences();
    }

    /**
     * Update save status indicator
     */
    updateSaveStatus(status) {
        const indicator = document.getElementById('save-indicator');
        if (!indicator) return;
        
        // Remove existing classes
        indicator.classList.remove('saving', 'saved', 'error');
        
        // Add new class and update text
        switch (status) {
            case 'saving':
                indicator.classList.add('saving');
                indicator.textContent = '保存中...';
                break;
            case 'saved':
                indicator.classList.add('saved');
                indicator.textContent = '保存済み';
                break;
            case 'error':
                indicator.classList.add('error');
                indicator.textContent = '保存エラー';
                break;
            case 'unsaved':
                indicator.textContent = '未保存';
                break;
        }
    }

    /**
     * Update toolbar button states
     */
    updateToolbarState() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        
        if (undoBtn) {
            undoBtn.disabled = !this.components.editor.canUndo();
        }
        
        if (redoBtn) {
            redoBtn.disabled = !this.components.editor.canRedo();
        }
    }

    /**
     * Show settings modal
     */
    showSettings() {
        const modal = document.getElementById('settings-modal');
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        
        // Focus first input
        const firstInput = modal.querySelector('input, button');
        if (firstInput) {
            firstInput.focus();
        }
    }

    /**
     * Hide settings modal
     */
    hideSettings() {
        const modal = document.getElementById('settings-modal');
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
    }

    /**
     * Show welcome message for new users
     */
    showWelcomeMessage() {
        const hasSeenWelcome = localStorage.getItem('awe-welcome-seen');
        if (!hasSeenWelcome) {
            setTimeout(() => {
                showToast('AI-powered Web Editor にようこそ！', 'success');
                localStorage.setItem('awe-welcome-seen', 'true');
            }, 1000);
        }
    }

    /**
     * Get application state for debugging
     */
    getState() {
        return {
            state: this.state,
            isInitialized: this.isInitialized,
            components: Object.keys(this.components),
            services: Object.keys(this.services)
        };
    }
}

// Initialize application when script loads
const app = new AIWebEditor();

// Expose app to global scope for debugging
if (typeof window !== 'undefined') {
    window.aiWebEditor = app;
}

export default AIWebEditor;
