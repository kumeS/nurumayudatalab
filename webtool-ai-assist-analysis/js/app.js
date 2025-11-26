/**
 * AI Prompt Multi-Perspective Executor - Main Application
 * Implements auto-save functionality for form persistence
 */

(function() {
'use strict';

// Import handling - use globals from config.js
// Global constants are loaded via window object for non-module compatibility

const APP_CONFIG = window.APP_CONFIG;
const UI_STRINGS = window.UI_STRINGS;
const SAMPLE_PROMPTS = window.SAMPLE_PROMPTS;
const ICONS = window.ICONS;

// Verify constants loaded correctly
if (!APP_CONFIG || !UI_STRINGS || !SAMPLE_PROMPTS || !ICONS) {
    const errorMsg = 'Critical initialization error: Global constants not loaded. Please refresh the page.';
    document.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;">
        <div style="text-align:center;padding:2rem;">
            <h1 style="color:#ef4444;margin-bottom:1rem;">初期化エラー</h1>
            <p style="color:#64748b;margin-bottom:1rem;">アプリケーションの初期化に失敗しました。</p>
            <button onclick="location.reload()" style="padding:0.75rem 1.5rem;background:#ff6b35;color:white;border:none;border-radius:0.5rem;cursor:pointer;font-weight:600;">ページを再読み込み</button>
        </div>
    </div>`;
    throw new Error(errorMsg);
}

const debounce = window.debounce;
const throttle = window.throttle;
const query = window.query;
const queryAll = window.queryAll;
const createSVGIcon = window.createSVGIcon;
const validateInput = window.validateInput;
const sanitizeHTML = window.sanitizeHTML;
const formatText = window.formatText;
const generateId = window.generateId;
const deepClone = window.deepClone;
const safeAsync = window.safeAsync;
const safeSync = window.safeSync;

const Logger = window.Logger;
const ErrorHandler = window.ErrorHandler;
const CustomError = window.CustomError;
const ValidationError = window.ValidationError;
const NetworkError = window.NetworkError;

// Enhanced progress controller not available in bridge mode, will be null
const EnhancedProgressController = null;

class AIPromptTool {
    constructor() {
        try {
            // Initialize logging and error handling
            this.logger = new Logger(APP_CONFIG.LOG_LEVEL);
            this.errorHandler = new ErrorHandler(this.logger);
            this.errorHandler.setupGlobalHandlers();
            
            // Initialize accessibility manager
            this.accessibilityManager = window.accessibilityManager || null;
            
            // Initialize core services
            this.storageManager = new StorageManager();
            this.thinkingPatterns = new ThinkingPatterns();
            this.aiService = new AIService(this.storageManager);
            this.promptImprover = new PromptImprover(this.aiService);
            this.workflowManager = new WorkflowManager(
                this.thinkingPatterns,
                this.promptImprover,
                this.aiService,
                this.storageManager
            );
            
            // Initialize UI state
            this.currentExecution = null;
            this.autoSaveTimer = null;
            this.progressController = null;
            this.tooltipElement = null;
            this.tooltipHideTimer = null;
            this.activeTooltipTarget = null;
            this.tooltipRepositionHandler = null;
            this.tooltipPositionListenerAdded = false;
            this.presetValidationReport = null;
            
            // Debounced methods for performance
            this.debouncedAutoSave = debounce(() => this.saveFormData(), APP_CONFIG.AUTO_SAVE_DELAY);
            this.throttledPatternUpdate = throttle(() => this.updatePatternSummary(), 100);
            
            this.initializeApp();
            
        } catch (error) {
            this.logger?.error('Application initialization failed:', error) || console.error('Init error:', error);
            this.showCriticalError('アプリケーションの初期化に失敗しました。ページを再読み込みしてください。');
        }
    }

    /**
     * Get random sample prompt
     */
    getRandomSamplePrompt() {
        const randomIndex = Math.floor(Math.random() * SAMPLE_PROMPTS.length);
        return SAMPLE_PROMPTS[randomIndex];
    }

    /**
     * Insert sample prompt into text area
     */
    insertSamplePrompt() {
        return safeSync(() => {
            this.logger.debug('insertSamplePrompt called');

            if (!this.elements.promptInput) {
                this.logger.error('Prompt input element not found', {
                    elementExists: !!this.elements.promptInput,
                    allElements: Object.keys(this.elements)
                });
                throw new ValidationError(UI_STRINGS.ERRORS.PROMPT_INPUT_NOT_FOUND);
            }

            const samplePrompt = this.getRandomSamplePrompt();
            if (!samplePrompt) {
                this.logger.error('No sample prompt available');
                throw new Error('サンプルプロンプトが取得できませんでした');
            }

            this.logger.debug('Inserting sample prompt', { promptLength: samplePrompt.length });

            this.elements.promptInput.value = samplePrompt;

            // Focus on the text area and position cursor at the end
            this.elements.promptInput.focus();
            this.elements.promptInput.setSelectionRange(samplePrompt.length, samplePrompt.length);

            // Trigger auto-save using debounced method
            this.debouncedAutoSave();

            // Show brief feedback
            this.showSampleFeedback();

            this.logger.info('Sample prompt inserted successfully', { length: samplePrompt.length });

        }, this.errorHandler, 'insertSamplePrompt');
    }

    /**
     * Update character count display
     */
    updateCharCount() {
        if (this.elements.promptInput && this.elements.charCount) {
            const count = this.elements.promptInput.value.length;
            this.elements.charCount.textContent = count;
            
            // Add visual feedback for character limit
            if (count > 4500) {
                this.elements.charCount.style.color = 'var(--error-color)';
            } else if (count > 4000) {
                this.elements.charCount.style.color = 'var(--warning-color)';
            } else {
                this.elements.charCount.style.color = 'var(--primary-color)';
            }
        }
    }
    
    /**
     * Clear prompt input
     */
    clearPrompt() {
        if (this.elements.promptInput) {
            this.elements.promptInput.value = '';
            this.updateCharCount();
            this.debouncedAutoSave();
        }
    }
    
    /**
     * Show feedback when sample prompt is inserted
     */
    showSampleFeedback() {
        return safeSync(() => {
            const sampleBtn = this.elements.sampleBtn;
            if (!sampleBtn) {
                this.logger.warn('Sample button not found for feedback');
                return;
            }
            
            const originalHTML = sampleBtn.innerHTML;
            
            // Add loading state
            sampleBtn.classList.add('loading');
            sampleBtn.innerHTML = `
                ${createSVGIcon(ICONS.LOADING, 16)}
                ${UI_STRINGS.FEEDBACK.INSERTING}
            `;
            
            setTimeout(() => {
                // Show success state
                sampleBtn.classList.remove('loading');
                sampleBtn.innerHTML = `
                    ${createSVGIcon(ICONS.SUCCESS, 16)}
                    ${UI_STRINGS.FEEDBACK.INSERT_COMPLETE}
                `;
                sampleBtn.style.background = 'var(--success-gradient, linear-gradient(135deg, #38a169 0%, #48bb78 100%))';
                
                setTimeout(() => {
                    // Reset to original state
                    sampleBtn.innerHTML = originalHTML;
                    sampleBtn.style.background = '';
                }, APP_CONFIG.FEEDBACK_DURATION);
            }, APP_CONFIG.LOADING_DURATION);
            
        }, this.errorHandler, 'showSampleFeedback');
    }

    /**
     * Verify button functionality after initialization
     */
    verifyButtonFunctionality() {
        this.logger.debug('Verifying button functionality...');

        // Check sample button
        if (this.elements.sampleBtn) {
            this.logger.debug('Sample button found, testing click handler...');
            // Test programmatically
            try {
                // Don't actually insert, just test if handler exists
                this.logger.debug('Sample button handler test: OK');
            } catch (error) {
                this.logger.error('Sample button handler test failed:', error);
            }
        } else {
            this.logger.error('Sample button not found in DOM');
        }

        // Check settings button
        if (this.elements.settingsBtn) {
            this.logger.debug('Settings button found, testing click handler...');
            try {
                // Test if handler exists
                this.logger.debug('Settings button handler test: OK');
            } catch (error) {
                this.logger.error('Settings button handler test failed:', error);
            }
        } else {
            this.logger.error('Settings button not found in DOM');
        }

        this.logger.debug('Button functionality verification completed');
    }

    /**
     * Debug API key status
     */
    debugAPIKeyStatus() {
        this.logger.debug('=== API Key Debug ===');

        // Check DOM elements
        this.logger.debug('API Key DOM elements:', {
            ioApiKey: !!this.elements.ioApiKey,
            apiKeyInput: !!this.elements.apiKeyInput
        });

        // Check stored settings
        const settings = this.storageManager.loadSettings();
        this.logger.debug('Stored settings:', {
            hasSettings: !!settings,
            hasApiKey: !!(settings?.apiKey?.io),
            apiKeyLength: settings?.apiKey?.io?.length || 0
        });

        // Check ENV_CONFIG
        this.logger.debug('ENV_CONFIG status:', {
            exists: !!window.ENV_CONFIG,
            hasDefaultKey: !!(window.ENV_CONFIG?.DEFAULT_SETTINGS?.DEFAULT_API_KEY)
        });

        this.logger.debug('=== End API Key Debug ===');
    }

    /**
     * Debug pattern rendering issues
     */
    debugPatternRendering() {
        this.logger.debug('=== Pattern Rendering Debug ===');

        // Check if ThinkingPatterns is available
        this.logger.debug('ThinkingPatterns available:', !!this.thinkingPatterns);

        if (this.thinkingPatterns) {
            const allPatterns = this.thinkingPatterns.getAllPatterns();
            this.logger.debug('All patterns available:', Object.keys(allPatterns).length);

            // Check first few patterns
            const patternKeys = Object.keys(allPatterns).slice(0, 3);
            patternKeys.forEach(key => {
                this.logger.debug(`Pattern ${key}:`, {
                    name: allPatterns[key].name,
                    category: allPatterns[key].category
                });
            });
        }

        // Check containers
        this.logger.debug('Container elements:', {
            basicPatterns: {
                exists: !!this.elements.basicPatterns,
                innerHTML: this.elements.basicPatterns?.innerHTML?.substring(0, 100) || 'empty'
            },
            expertPatterns: {
                exists: !!this.elements.expertPatterns,
                innerHTML: this.elements.expertPatterns?.innerHTML?.substring(0, 100) || 'empty'
            }
        });

        this.logger.debug('=== End Debug ===');
    }

    /**
     * Initialize default API key from environment configuration
     */
    initializeDefaultAPIKey() {
        try {
            const defaultApiKey = window.ENV_CONFIG?.DEFAULT_SETTINGS?.DEFAULT_API_KEY;

            if (defaultApiKey) {
                // Check if API key is already saved in API_KEYS storage
                const savedApiKey = this.storageManager.loadApiKeys()?.io_intelligence;

                if (!savedApiKey) {
                    // Save the default API key to the dedicated API keys storage
                    this.storageManager.saveApiKeys({ io_intelligence: defaultApiKey });
                    this.logger.info('Default API key initialized from ENV_CONFIG into API keys storage');
                } else {
                    this.logger.debug('API key already exists, skipping default initialization');
                }
            } else {
                this.logger.warn('No default API key found in ENV_CONFIG');
            }
        } catch (error) {
            this.logger.error('Failed to initialize default API key:', error);
        }
    }

    /**
     * Toggle advanced thinking patterns visibility
     */
    toggleAdvancedPatterns(event) {
        // Prevent default button behavior and page jumping
        if (event) {
            event.preventDefault();
        }
        
        const grid = this.elements.advancedPatternsGrid;
        const toggleBtn = this.elements.toggleAdvancedPatterns;
        
        if (!grid || !toggleBtn) {
            console.error('Advanced patterns elements not found');
            return;
        }

        const isVisible = grid.classList.contains('visible');
        
        if (isVisible) {
            // Hide patterns
            grid.classList.remove('visible');
            toggleBtn.classList.remove('expanded');
            toggleBtn.setAttribute('aria-expanded', 'false');
            toggleBtn.querySelector('span').textContent = '詳細な思考パターンを選択';
            this.logger?.debug('Advanced patterns hidden');
        } else {
            // Show patterns
            grid.classList.add('visible');
            toggleBtn.classList.add('expanded');
            toggleBtn.setAttribute('aria-expanded', 'true');
            toggleBtn.querySelector('span').textContent = '詳細パターンを隠す';
            this.logger?.debug('Advanced patterns shown');
        }
    }

    /**
     * Initialize the application
     */
    initializeApp() {
        return safeAsync(async () => {
            this.initializeDOMReferences();
            await this.initializeProgressController();
            this.populateThinkingPatterns();
            this.initializeEventListeners();

        this.logger.debug('Event listeners initialized, checking button functionality...');

        // Verify button functionality
        this.verifyButtonFunctionality();

        // Debug API key status
        this.debugAPIKeyStatus();

            this.restoreFormData();
            this.initializeDefaultAPIKey();
            this.startAutoSave();
            this.initializeWorkflowCallbacks();
            
            this.logger.info('AI Prompt Tool initialized successfully');
            
        }, this.errorHandler, 'initializeApp');
    }
    
    /**
     * Initialize the enhanced progress controller
     */
    async initializeProgressController() {
        try {
            if (EnhancedProgressController) {
                this.progressController = new EnhancedProgressController({
                    modalId: 'progressModal',
                    stagesContainerId: 'progressList',
                    logger: this.logger
                });
                
                // Make it globally accessible for backward compatibility
                window.progressController = this.progressController;
                
                this.logger.info('Enhanced progress controller initialized');
            } else {
                this.logger.warn('Enhanced progress controller not available in bridge mode');
                // The legacy ProgressController will be used instead
            }
            
        } catch (error) {
            this.logger.error('Failed to initialize progress controller:', error);
            // Don't throw - app can still work without progress controller
        }
    }

    /**
     * Initialize DOM element references
     */
    initializeDOMReferences() {
        this.logger.debug('Initializing DOM references...');
        
        // Main form elements
        this.elements = {
            promptInput: query('#promptInput'),
            sampleBtn: query('#sampleBtn'),
            clearPromptBtn: query('#clearBtn'),
            executeBtn: query('#executeBtn'),
            cancelBtn: query('#cancelBtn'),
            settingsBtn: query('#settingsBtn'),
            historyBtn: query('#historyBtn'),
            
            // Pattern containers and controls
            patternsContainer: query('#patternsContainer'),
            patternPresetSelect: query('#patternPresetSelect'),
            toggleAdvancedPatterns: query('#toggleAdvancedPatterns'),
            advancedPatternsGrid: query('#advancedPatternsGrid'),
            basicPatterns: query('#basicPatterns'),
            expertPatterns: query('#expertPatterns'),
            selectAllBasicBtn: query('#selectAllBasic'),
            deselectAllBasicBtn: query('#deselectAllBasic'),
            selectAllExpertBtn: query('#selectAllExpert'),
            deselectAllExpertBtn: query('#deselectAllExpert'),
            selectAllBtn: query('#selectAllBtn'),
            deselectAllBtn: query('#deselectAllBtn'),
            resetToDefaultBtn: query('#resetToDefaultBtn'),
            charCount: query('#charCount'),
            patternSummary: query('#patternSummary'),
            
            // Results section
            resultsSection: query('#resultsSection'),
            improvedPromptContainer: query('#improvedPromptContainer'),
            improvedPromptContent: query('#improvedPromptContent'),
            patternResultsContainer: query('#patternResultsContainer'),
            exportResultsBtn: query('#exportResultsBtn'),
            clearResultsBtn: query('#clearResultsBtn'),
            
            // Progress
            progressWrapper: query('#progressWrapper'),
            progressTitle: query('#progressTitle'),
            progressBar: query('#progressBar'),
            progressMessage: query('#progressMessage'),
            closeProgressBtn: query('#closeProgressBtn'),
            
            // Settings modal
            settingsModal: query('#settingsModal'),
            closeSettingsBtn: query('#closeSettingsBtn'),
            saveSettingsBtn: query('#saveSettingsBtn'),
            cancelSettingsBtn: query('#cancelSettingsBtn'),
            ioIntelligenceApiKey: query('#ioIntelligenceApiKey'),
            autoSaveEnabled: query('#autoSaveEnabled'),
            darkModeEnabled: query('#darkModeEnabled'),
            
            // History modal
            historyModal: query('#historyModal'),
            closeHistoryBtn: query('#closeHistoryBtn'),
            closeHistoryModalBtn: query('#closeHistoryModalBtn'),
            clearHistoryBtn: query('#clearHistoryBtn'),
            historyContainer: query('#historyContainer'),
            
            // Toast container
            toastContainer: query('#toastContainer')
        };

        // Fallback mappings for updated markup
        this.elements.patternsContainer = this.elements.patternsContainer || query('#basicPatterns') || query('.pattern-list') || query('.thinking-patterns');
        this.elements.resultsSection = this.elements.resultsSection || query('#aiPanel') || query('.ai-panel');
        this.elements.enableImprovement = this.elements.enableImprovement || query('#enableImprovement');
        this.elements.panelStatus = this.elements.panelStatus || query('#panelStatus');
        this.elements.chatMessages = this.elements.chatMessages || query('#chatMessages');
        this.elements.chatProgress = this.elements.chatProgress || query('#chatProgress');
        this.elements.progressText = this.elements.progressText || query('#progressText');
        this.elements.progressOverlay = this.elements.progressOverlay || query('#progressOverlay');
        this.elements.progressFill = this.elements.progressFill || query('#progressFill');
        this.elements.ioIntelligenceApiKey = this.elements.ioIntelligenceApiKey || query('#ioApiKey');
        this.elements.autoImproveDefault = this.elements.autoImproveDefault || query('#autoImproveDefault');
        this.elements.saveSettingsModalBtn = this.elements.saveSettingsModalBtn || query('#saveSettingsModalBtn');
        this.elements.saveTokenBtn = this.elements.saveTokenBtn || query('#saveTokenBtn');
        this.elements.patternInfoModal = this.elements.patternInfoModal || query('#patternInfoModal');
        this.elements.patternInfoTitle = this.elements.patternInfoTitle || query('#patternInfoTitle');
        this.elements.patternInfoDescription = this.elements.patternInfoDescription || query('#patternInfoDescription');
        this.elements.patternInfoPrompt = this.elements.patternInfoPrompt || query('#patternInfoPrompt');
        this.elements.patternInfoCategory = this.elements.patternInfoCategory || query('#patternInfoCategory');
        this.elements.closePatternInfoBtn = this.elements.closePatternInfoBtn || query('#closePatternInfoBtn');
        this.elements.closePatternInfoModalBtn = this.elements.closePatternInfoModalBtn || query('#closePatternInfoModalBtn');

        // Validate critical elements
        this.validateCriticalElements();
    }
    
    /**
     * Validate that critical DOM elements are present
     */
    validateCriticalElements() {
        const criticalElements = [
            'promptInput', 'executeBtn', 'patternsContainer', 'resultsSection'
        ];
        
        const missing = criticalElements.filter(key => !this.elements[key]);
        
        if (missing.length > 0) {
            this.logger.error('Critical DOM elements missing:', missing);
            throw new ValidationError(`Critical DOM elements missing: ${missing.join(', ')}`);
        }
        
        this.logger.info('DOM elements validated', {
            total: Object.keys(this.elements).length,
            critical: criticalElements.length,
            patternsFound: !!this.elements.patternsContainer
        });
    }

    /**
     * Initialize event listeners
     */
    initializeEventListeners() {
        // Form auto-save listeners using debounced method
        if (this.elements.promptInput) {
            this.elements.promptInput.addEventListener('input', () => {
                this.debouncedAutoSave();
                this.updateCharCount();
            });
        }
        
        // Main action buttons
        if (this.elements.executeBtn) {
            this.elements.executeBtn.addEventListener('click', () => this.executePrompt());
        }
        
        if (this.elements.cancelBtn) {
            this.elements.cancelBtn.addEventListener('click', () => this.cancelExecution());
        }
        
        if (this.elements.clearPromptBtn) {
            this.elements.clearPromptBtn.addEventListener('click', () => this.clearForm());
        }
        if (this.elements.sampleBtn) {
            this.logger.debug('Adding click listener to sample button');
            this.elements.sampleBtn.addEventListener('click', (e) => {
                this.logger.info('Sample button clicked!');
                e.preventDefault();
                this.insertSamplePrompt();
            });
        } else {
            this.logger.error('Sample button not found during event listener setup!');
        }
        // Pattern selection controls
        if (this.elements.selectAllBasicBtn) {
            this.elements.selectAllBasicBtn.addEventListener('click', () => this.selectAllPatterns('basic'));
        }
        
        if (this.elements.deselectAllBasicBtn) {
            this.elements.deselectAllBasicBtn.addEventListener('click', () => this.deselectAllPatterns('basic'));
        }
        
        if (this.elements.selectAllExpertBtn) {
            this.elements.selectAllExpertBtn.addEventListener('click', () => this.selectAllPatterns('expert'));
        }
        
        if (this.elements.deselectAllExpertBtn) {
            this.elements.deselectAllExpertBtn.addEventListener('click', () => this.deselectAllPatterns('expert'));
        }

        if (this.elements.selectAllBtn) {
            this.elements.selectAllBtn.addEventListener('click', () => this.selectAllPatterns());
        }

        if (this.elements.deselectAllBtn) {
            this.elements.deselectAllBtn.addEventListener('click', () => this.deselectAllPatterns());
        }

        if (this.elements.resetToDefaultBtn) {
            this.elements.resetToDefaultBtn.addEventListener('click', () => this.resetToDefaultPatterns());
        }
        
        // Toggle advanced patterns
        if (this.elements.toggleAdvancedPatterns) {
            this.elements.toggleAdvancedPatterns.addEventListener('click', (e) => this.toggleAdvancedPatterns(e));
        }
        
        if (this.elements.patternPresetSelect) {
            this.elements.patternPresetSelect.addEventListener('change', (e) => this.applyPresetPattern(e.target.value));
        }
        
        // Result actions
        if (this.elements.exportResultsBtn) {
            this.elements.exportResultsBtn.addEventListener('click', () => this.exportResults());
        }
        
        if (this.elements.clearResultsBtn) {
            this.elements.clearResultsBtn.addEventListener('click', () => this.clearResults());
        }
        
        // Settings modal
        if (this.elements.settingsBtn) {
            this.elements.settingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSettingsModal();
            });
        }
        
        if (this.elements.closeSettingsBtn) {
            this.elements.closeSettingsBtn.addEventListener('click', () => this.hideSettingsModal());
        }
        
        if (this.elements.saveSettingsBtn) {
            this.elements.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        }
        
        if (this.elements.cancelSettingsBtn) {
            this.elements.cancelSettingsBtn.addEventListener('click', () => this.hideSettingsModal());
        }
        
        // History modal
        if (this.elements.historyBtn) {
            this.elements.historyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showHistoryModal();
            });
        }
        
        if (this.elements.closeHistoryBtn) {
            this.elements.closeHistoryBtn.addEventListener('click', () => this.hideHistoryModal());
        }
        
        if (this.elements.closeHistoryModalBtn) {
            this.elements.closeHistoryModalBtn.addEventListener('click', () => this.hideHistoryModal());
        }
        
        if (this.elements.clearHistoryBtn) {
            this.elements.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        }
        
        // API key visibility toggles
        document.querySelectorAll('.toggle-visibility').forEach(btn => {
            btn.addEventListener('click', (e) => this.togglePasswordVisibility(e.target));
        });

        // Pattern checkboxes - monitor changes
        document.addEventListener('change', (e) => {
            if (e.target.matches('.pattern-item input[type="checkbox"]')) {
                this.logger?.debug('Pattern checkbox changed:', e.target.value, e.target.checked);
                this.updatePatternCardState(e.target);
                this.updatePatternSummary();
                this.debouncedAutoSave();
            }
        });
        
        // Pattern item clicks (for better UX - click anywhere on card)
        document.addEventListener('click', (e) => {
            const patternItem = e.target.closest('.pattern-item');
            if (patternItem && !e.target.matches('input[type="checkbox"]') && !e.target.closest('.info-btn')) {
                const checkbox = patternItem.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        });

        // Preset patterns - Try multiple approaches for robustness
        const presetButtons = document.querySelectorAll('.preset-btn');
        this.logger?.debug('Found preset buttons:', presetButtons.length);
        
        presetButtons.forEach(btn => {
            this.logger?.debug('Adding event listener to preset button:', btn.dataset.preset);
            btn.addEventListener('click', (e) => {
                this.logger?.debug('Preset button clicked:', e.target.dataset.preset);
                this.applyPresetPattern(e.target.dataset.preset);
            });
        });

        // Also add event delegation for preset buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('preset-btn') || e.target.closest('.preset-btn')) {
                const btn = e.target.classList.contains('preset-btn') ? e.target : e.target.closest('.preset-btn');
                const presetKey = btn.dataset.preset;
                if (presetKey) {
                    this.logger?.debug('Preset button clicked via delegation:', presetKey);
                    this.applyPresetPattern(presetKey);
                }
            }
        });

        // Pattern control buttons (now handled in initializeEventListeners above)
        document.getElementById('deselectAllExpert')?.addEventListener('click', () => this.deselectCategoryPatterns('expert'));

        // Modal backdrop click
        if (this.elements.settingsModal) {
            this.elements.settingsModal.addEventListener('click', (e) => {
                if (e.target === this.elements.settingsModal) {
                    this.hideSettingsModal();
                }
            });
        }

        if (this.elements.historyModal) {
            this.elements.historyModal.addEventListener('click', (e) => {
                if (e.target === this.elements.historyModal) {
                    this.hideHistoryModal();
                }
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // Page unload warning for unsaved changes
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = '';
            }
        });

        if (!this.tooltipPositionListenerAdded) {
            this.tooltipRepositionHandler = () => this.updateTooltipPosition();
            window.addEventListener('scroll', this.tooltipRepositionHandler, { passive: true });
            window.addEventListener('resize', this.tooltipRepositionHandler);
            this.tooltipPositionListenerAdded = true;
        }
    }

    /**
     * Populate thinking patterns in the UI
     */
    populateThinkingPatterns() {
        this.logger.debug('populateThinkingPatterns() called');

        const allPatterns = this.thinkingPatterns.getAllPatterns();

        if (!allPatterns || Object.keys(allPatterns).length === 0) {
            this.logger.error('No thinking patterns available to render');
            return;
        }

        // Ensure tooltip availability for info buttons
        this.ensureTooltipElement();

        const categoryOrder = {
            basic: 0,
            professional: 1,
            advanced: 2,
            expert: 3,
            custom: 4,
            other: 5
        };

        const allPatternList = Object.values(allPatterns);
        const basicPatterns = allPatternList.filter(pattern => (pattern.category || 'basic') === 'basic');
        const expertPatterns = allPatternList
            .filter(pattern => (pattern.category || 'basic') !== 'basic')
            .sort((a, b) => {
                const categoryRankA = categoryOrder[a.category] ?? categoryOrder.other;
                const categoryRankB = categoryOrder[b.category] ?? categoryOrder.other;
                if (categoryRankA !== categoryRankB) {
                    return categoryRankA - categoryRankB;
                }
                return (a.name || '').localeCompare(b.name || '', 'ja');
            });

        const hasSeparateContainers = this.elements.basicPatterns && this.elements.expertPatterns;

        if (hasSeparateContainers) {
            this.renderPatternCollection(this.elements.basicPatterns, basicPatterns);
            this.renderPatternCollection(this.elements.expertPatterns, expertPatterns);
        } else if (this.elements.patternsContainer) {
            const combined = [...basicPatterns, ...expertPatterns];
            this.renderPatternCollection(this.elements.patternsContainer, combined);
        } else {
            this.logger.error('Pattern container not found!', {
                patternsContainer: !!this.elements.patternsContainer,
                basicPatterns: !!this.elements.basicPatterns,
                expertPatterns: !!this.elements.expertPatterns
            });
            return;
        }

        this.syncPatternCardStates();

        // Populate preset select
        if (this.elements.patternPresetSelect) {
            this.populatePresetSelect();
        }

        // Validate preset coverage and expose diagnostics for debugging
        this.presetValidationReport = this.thinkingPatterns.validatePresets();
        window.__presetValidationReport = this.presetValidationReport;

        if (!this.presetValidationReport.isValid) {
            this.logger.warn('Preset validation issues detected', this.presetValidationReport.invalidPresets);
        } else {
            this.logger.info('Preset validation completed', {
                presetCount: this.presetValidationReport.presetCount,
                coverageRatio: this.presetValidationReport.coverageRatio,
                averagePatterns: this.presetValidationReport.averagePatternsPerPreset,
                minPatterns: this.presetValidationReport.minPatternsPerPreset,
                maxPatterns: this.presetValidationReport.maxPatternsPerPreset
            });
        }

        if (this.presetValidationReport.unusedPatterns?.length) {
            this.logger.info('Preset validation uncovered unused patterns', {
                count: this.presetValidationReport.unusedPatterns.length,
                unused: JSON.stringify(this.presetValidationReport.unusedPatterns)
            });
        }

        // Check if patterns were rendered
        setTimeout(() => {
            const renderedPatterns = document.querySelectorAll('.pattern-item');
            this.logger.info('Patterns rendered successfully', {
                total: renderedPatterns.length
            });

            if (renderedPatterns.length === 0) {
                this.logger.error('No patterns were rendered!');
            }

            this.syncPatternCardStates();
        }, 50);
    }

    /**
     * Render provided patterns into a container
     * @param {Element} container - Target container element
     * @param {Array} patterns - Array of pattern definitions
     */
    renderPatternCollection(container, patterns = []) {
        if (!container) {
            this.logger.error('Pattern container is null');
            return;
        }
        
        container.innerHTML = '';

        if (!patterns || patterns.length === 0) {
            const emptyState = document.createElement('p');
            emptyState.className = 'pattern-empty';
            emptyState.textContent = '利用可能な思考パターンが見つかりません。';
            container.appendChild(emptyState);
            return;
        }
        
        const fragment = document.createDocumentFragment();
        patterns.forEach(pattern => {
            const patternElement = this.createPatternElement(pattern);
            if (patternElement) {
                fragment.appendChild(patternElement);
            }
        });
        container.appendChild(fragment);
    }
    
    getCategoryLabel(category) {
        const labels = {
            basic: '基本',
            professional: '専門',
            advanced: '高度',
            expert: '上級',
            custom: 'カスタム',
            other: 'その他'
        };
        return labels[category] || labels.other;
    }

    updatePatternCardState(checkbox) {
        if (!checkbox) {
            return;
        }
        const card = checkbox.closest('.pattern-item');
        if (!card) {
            return;
        }
        const isChecked = !!checkbox.checked;
        card.classList.toggle('selected', isChecked);
        card.setAttribute('data-selected', isChecked ? 'true' : 'false');
    }

    syncPatternCardStates() {
        document.querySelectorAll('.pattern-item input[type="checkbox"]').forEach(checkbox => {
            this.updatePatternCardState(checkbox);
        });
    }
    
    /**
     * Populate preset select dropdown
     */
    populatePresetSelect() {
        const presets = this.thinkingPatterns.getAllPresets();
        const select = this.elements.patternPresetSelect;
        
        if (!select) return;
        
        // Clear existing options except the first one
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        // Add preset options in alphabetical order for discoverability
        Object.entries(presets)
            .sort(([, a], [, b]) => (a.name || '').localeCompare(b.name || '', 'ja'))
            .forEach(([key, preset]) => {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = preset.name;
                option.dataset.patternCount = preset.patterns?.length || 0;
                select.appendChild(option);
            });
    }

    /**
     * Create a pattern element
     */
    createPatternElement(pattern) {
        if (!pattern) {
            return null;
        }

        const div = document.createElement('div');
        div.className = 'pattern-item';
        div.dataset.patternId = pattern.id;
        div.dataset.category = pattern.category || 'custom';
        div.dataset.defaultSelected = pattern.defaultSelected ? 'true' : 'false';

        const sanitize = typeof sanitizeHTML === 'function'
            ? sanitizeHTML
            : (value) => String(value ?? '');

        const rawName = pattern.name || '';
        const attributeSafeName = rawName.replace(/"/g, '&quot;');
        const nameHtml = sanitize(rawName);
        const descriptionHtml = sanitize(pattern.description || '').replace(/\n/g, '<br>');
        const categoryLabel = this.getCategoryLabel(pattern.category);
        const badgeClass = `pattern-badge--${pattern.category || 'custom'}`;

        div.innerHTML = `
            <input type="checkbox" id="pattern_${pattern.id}" value="${pattern.id}" aria-label="${attributeSafeName}を選択">
            <div class="pattern-info">
                <div class="pattern-name">
                    <span class="pattern-name__label">${nameHtml}</span>
                    <span class="pattern-badge ${badgeClass}">${categoryLabel}</span>
                    <button 
                        type="button"
                        class="info-btn"
                        data-pattern-id="${pattern.id}"
                        title="${attributeSafeName}のプロンプトを確認"
                        aria-label="${attributeSafeName}のプロンプトを確認"
                        aria-describedby="patternTooltip">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
                        </svg>
                    </button>
                </div>
                <div class="pattern-description">${descriptionHtml}</div>
            </div>
        `;
        
        const checkbox = div.querySelector('input[type="checkbox"]');
        checkbox.checked = !!pattern.defaultSelected;
        this.updatePatternCardState(checkbox);

        checkbox.addEventListener('change', () => {
            this.updatePatternCardState(checkbox);
            this.throttledPatternUpdate();
            this.debouncedAutoSave();
        });

        // Add info button event listener (hover-first UX)
        const infoBtn = div.querySelector('.info-btn');
        if (infoBtn) {
            infoBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                infoBtn.focus();
            });

            infoBtn.addEventListener('mouseenter', () => this.showPatternTooltip(infoBtn, pattern));
            infoBtn.addEventListener('mouseleave', () => this.hidePatternTooltip());
            infoBtn.addEventListener('focus', () => this.showPatternTooltip(infoBtn, pattern));
            infoBtn.addEventListener('blur', () => this.hidePatternTooltip());
            infoBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showPatternTooltip(infoBtn, pattern);
            }, { passive: false });
            infoBtn.addEventListener('touchend', () => this.hidePatternTooltip(2500));
            infoBtn.addEventListener('touchcancel', () => this.hidePatternTooltip());
        }
        
        return div;
    }

    ensureTooltipElement() {
        if (!this.tooltipElement) {
            const tooltip = document.createElement('div');
            tooltip.id = 'patternTooltip';
            tooltip.className = 'pattern-tooltip';
            tooltip.setAttribute('role', 'tooltip');
            tooltip.setAttribute('aria-hidden', 'true');
            document.body.appendChild(tooltip);
            this.tooltipElement = tooltip;
        }
        return this.tooltipElement;
    }

    showPatternTooltip(target, pattern) {
        if (!target || !pattern) {
            return;
        }

        if (this.tooltipHideTimer) {
            clearTimeout(this.tooltipHideTimer);
            this.tooltipHideTimer = null;
        }

        const tooltip = this.ensureTooltipElement();
        const sanitize = typeof sanitizeHTML === 'function' ? sanitizeHTML : (value) => String(value ?? '');
        const prompt = typeof pattern.prompt === 'string' ? pattern.prompt : '';
        const name = typeof pattern.name === 'string' ? pattern.name : '';
        const description = typeof pattern.description === 'string' ? pattern.description : '';
        const promptHtml = sanitize(prompt).replace(/\n/g, '<br>');
        const nameHtml = sanitize(name);
        const descriptionHtml = sanitize(description).replace(/\n/g, '<br>');
        const categoryLabel = this.getCategoryLabel(pattern.category);

        tooltip.innerHTML = `
            <div class="pattern-tooltip__title">${nameHtml}</div>
            <div class="pattern-tooltip__meta">${categoryLabel}</div>
            ${descriptionHtml ? `<div class="pattern-tooltip__description">${descriptionHtml}</div>` : ''}
            <div class="pattern-tooltip__prompt">${promptHtml}</div>
        `;
        tooltip.setAttribute('aria-hidden', 'false');
        tooltip.style.visibility = 'hidden';
        tooltip.classList.add('visible');

        this.activeTooltipTarget = target;
        this.positionTooltip(target);

        tooltip.style.visibility = '';
    }

    hidePatternTooltip(delay = 0) {
        if (this.tooltipHideTimer) {
            clearTimeout(this.tooltipHideTimer);
            this.tooltipHideTimer = null;
        }

        const performHide = () => {
            if (this.tooltipElement) {
                this.tooltipElement.classList.remove('visible');
                this.tooltipElement.setAttribute('aria-hidden', 'true');
                this.tooltipElement.dataset.position = '';
                this.tooltipElement.style.top = '-9999px';
                this.tooltipElement.style.left = '-9999px';
            }
            this.activeTooltipTarget = null;
        };

        if (delay > 0) {
            this.tooltipHideTimer = setTimeout(performHide, delay);
        } else {
            performHide();
        }
    }

    positionTooltip(target) {
        const tooltip = this.ensureTooltipElement();
        if (!tooltip) {
            return;
        }

        const rect = target.getBoundingClientRect();
        const margin = 12;
        const scrollY = window.scrollY || window.pageYOffset;
        const scrollX = window.scrollX || window.pageXOffset;

        const tooltipRect = tooltip.getBoundingClientRect();

        let top = rect.top + scrollY - tooltipRect.height - margin;
        let position = 'top';

        if (top < scrollY + 8) {
            top = rect.bottom + scrollY + margin;
            position = 'bottom';

            if (top + tooltipRect.height > scrollY + window.innerHeight - 8) {
                top = Math.max(scrollY + 8, rect.top + scrollY - tooltipRect.height - margin);
                position = 'top';
            }
        }

        if (top < scrollY + 8) {
            top = scrollY + 8;
        }

        let left = rect.left + scrollX + rect.width / 2 - tooltipRect.width / 2;
        const minLeft = scrollX + 8;
        const maxLeft = scrollX + window.innerWidth - tooltipRect.width - 8;

        if (left < minLeft) {
            left = minLeft;
        } else if (left > maxLeft) {
            left = maxLeft;
        }

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
        tooltip.dataset.position = position;
    }

    updateTooltipPosition() {
        if (this.tooltipElement?.classList.contains('visible') && this.activeTooltipTarget?.isConnected) {
            this.positionTooltip(this.activeTooltipTarget);
        }
    }

    /**
     * Schedule auto-save with debouncing
     */
    scheduleAutoSave() {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setTimeout(() => {
            this.saveFormData();
        }, 500); // Save after 0.5 seconds of inactivity (more responsive)
    }

    /**
     * Start auto-save functionality
     */
    startAutoSave() {
        // Save form data every 60 seconds as backup (less frequent but still safe)
        setInterval(() => {
            // Only save if there are changes to avoid unnecessary operations
            if (this.hasUnsavedChanges()) {
                this.saveFormData();
            }
        }, 60000);
    }


    /**
     * プリセットパターンを適用
     */
    applyPresetPattern(presetKey) {
        this.logger?.debug('applyPresetPattern() called with:', presetKey);
        const preset = this.thinkingPatterns.getPreset(presetKey);

        if (!preset) {
            console.error('Unknown preset pattern:', presetKey);
            return;
        }

        // 既存の選択をクリア
        document.querySelectorAll('.pattern-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });

        // プリセットボタンの状態を更新
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.remove('active');
            if (this.accessibilityManager) {
                this.accessibilityManager.updateAria(btn, { 'aria-checked': 'false' });
            }
        });
        
        const selectedBtn = document.querySelector(`[data-preset="${presetKey}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('active');
            if (this.accessibilityManager) {
                this.accessibilityManager.updateAria(selectedBtn, { 'aria-checked': 'true' });
            }
        }

        // プリセットパターンを選択
        preset.patterns.forEach(patternId => {
            const checkbox = document.querySelector(`input[value="${patternId}"]`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
        
        this.syncPatternCardStates();
        
        // Update ARIA states for screen readers
        if (this.accessibilityManager) {
            this.accessibilityManager.announce(
                `プリセット「${preset.name}」が選択され、${preset.patterns.length}個のパターンが適用されました`,
                'status'
            );
        }

        // パターン数の表示を更新
        this.updatePatternSummary();

        // フォームデータを保存
        this.debouncedAutoSave();

        // 通知を表示
        this.showNotification(`プリセット「${preset.name}」を適用しました`, 'success');
    }

    /**
     * Select all patterns
     * @param {string} category - 'basic', 'expert', or undefined for all
     */
    selectAllPatterns(category) {
        const selector = category 
            ? `#${category}Patterns .pattern-item input[type="checkbox"]`
            : '.pattern-item input[type="checkbox"]';
        document.querySelectorAll(selector).forEach(checkbox => {
            checkbox.checked = true;
        });
        this.syncPatternCardStates();
        this.updatePatternSummary();
        this.debouncedAutoSave();
        const message = category 
            ? `${category === 'basic' ? '基本' : '専門'}パターンを全選択しました`
            : '全パターンを選択しました';
        this.showNotification(message, 'success');
    }

    /**
     * Deselect all patterns
     * @param {string} category - 'basic', 'expert', or undefined for all
     */
    deselectAllPatterns(category) {
        const selector = category 
            ? `#${category}Patterns .pattern-item input[type="checkbox"]`
            : '.pattern-item input[type="checkbox"]';
        document.querySelectorAll(selector).forEach(checkbox => {
            checkbox.checked = false;
        });
        this.syncPatternCardStates();
        this.updatePatternSummary();
        this.debouncedAutoSave();
        const message = category 
            ? `${category === 'basic' ? '基本' : '専門'}パターンを全解除しました`
            : '全パターンを解除しました';
        this.showNotification(message, 'success');
    }

    /**
     * Reset to default patterns
     */
    resetToDefaultPatterns() {
        // 全解除
        document.querySelectorAll('.pattern-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // デフォルト選択を適用
        this.applyDefaultSelections();
        this.syncPatternCardStates();
        this.updatePatternSummary();
        this.debouncedAutoSave();
        this.showNotification('デフォルトパターンに戻しました', 'success');
    }

    /**
     * Select patterns by category
     */
    selectCategoryPatterns(category) {
        const patterns = category === 'basic' ? 
            this.thinkingPatterns.getBasicPatterns() : 
            this.thinkingPatterns.getExpertPatterns();

        Object.keys(patterns).forEach(patternId => {
            const checkbox = document.querySelector(`input[value="${patternId}"]`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });

        this.syncPatternCardStates();
        this.updatePatternSummary();
        this.debouncedAutoSave();
        const categoryName = category === 'basic' ? '基本思考' : '専門思考';
        this.showNotification(`${categoryName}パターンを全選択しました`, 'success');
    }

    /**
     * Deselect patterns by category
     */
    deselectCategoryPatterns(category) {
        const patterns = category === 'basic' ? 
            this.thinkingPatterns.getBasicPatterns() : 
            this.thinkingPatterns.getExpertPatterns();

        Object.keys(patterns).forEach(patternId => {
            const checkbox = document.querySelector(`input[value="${patternId}"]`);
            if (checkbox) {
                checkbox.checked = false;
            }
        });

        this.syncPatternCardStates();
        this.updatePatternSummary();
        this.debouncedAutoSave();
        const categoryName = category === 'basic' ? '基本思考' : '専門思考';
        this.showNotification(`${categoryName}パターンを全解除しました`, 'success');
    }

    /**
     * Update pattern summary display
     */
    updatePatternSummary() {
        const selectedCheckboxes = document.querySelectorAll('.pattern-item input[type="checkbox"]:checked');
        const count = selectedCheckboxes.length;
        const estimatedTime = count * 15; // 15 seconds per pattern

        const selectedCountElement = document.getElementById('selectedCount');
        const estimatedTimeElement = document.getElementById('estimatedTime');
        
        if (selectedCountElement) selectedCountElement.textContent = count;
        if (estimatedTimeElement) estimatedTimeElement.textContent = estimatedTime;
    }

    /**
     * Save current form data to localStorage
     */
    saveFormData() {
        const formData = this.collectFormData();
        this.storageManager.saveFormData(formData);
        // Form data auto-saved
        
        // Show temporary save indicator
        this.showSaveIndicator();
    }

    /**
     * Show a temporary save indicator to user (disabled)
     */
    showSaveIndicator() {
        // Auto-save indicator disabled per user request
        return;
    }

    /**
     * Collect current form data
     */
    collectFormData() {
        const selectedPatterns = {};
        
        // Collect pattern selections
        document.querySelectorAll('.pattern-item input[type="checkbox"]').forEach(checkbox => {
            selectedPatterns[checkbox.value] = checkbox.checked;
        });

        // Collect active preset if any
        const activePreset = document.querySelector('.preset-btn.active');
        
        return {
            promptText: this.elements.promptInput.value,
            enableImprovement: this.elements.enableImprovement.checked,
            selectedPatterns: selectedPatterns,
            activePreset: activePreset ? activePreset.dataset.preset : null,
            lastSaved: new Date().toISOString(),
            version: '1.0' // For future compatibility
        };
    }

    /**
     * Restore form data from localStorage
     */
    restoreFormData() {
        const savedData = this.storageManager.loadFormData();
        
        // Restore prompt text
        this.elements.promptInput.value = savedData.promptText || '';
        
        // Restore improvement setting
        this.elements.enableImprovement.checked = savedData.enableImprovement !== false;
        
        // Restore pattern selections
        if (savedData.selectedPatterns) {
            Object.keys(savedData.selectedPatterns).forEach(patternId => {
                const checkbox = document.getElementById(`pattern_${patternId}`);
                if (checkbox) {
                    checkbox.checked = savedData.selectedPatterns[patternId];
                }
            });
        } else {
            // Apply default selections if no saved data
            this.applyDefaultSelections();
        }

        // Restore active preset if any
        if (savedData.activePreset) {
            const presetBtn = document.querySelector(`[data-preset="${savedData.activePreset}"]`);
            if (presetBtn) {
                presetBtn.classList.add('active');
            }
        }
        
        // Update pattern summary after restoration
        this.updatePatternSummary();
        this.syncPatternCardStates();
        
        // Show restoration notification if data was found
        if (savedData.lastSaved && (savedData.promptText || Object.values(savedData.selectedPatterns || {}).some(Boolean))) {
            const savedTime = new Date(savedData.lastSaved);
            const timeAgo = this.getTimeAgo(savedTime);
            setTimeout(() => {
                this.showNotification(`前回の入力データを復元しました (${timeAgo})`, 'info');
            }, 1000); // Delay to ensure UI is fully loaded
        } else if (!savedData.lastSaved) {
            // First time user
            setTimeout(() => {
                this.showNotification('入力内容は自動的に保存されます 💾', 'info');
            }, 2000);
        }
        
        this.logger?.info('Form data restored from localStorage');
    }

    /**
     * Apply default pattern selections
     */
    applyDefaultSelections() {
        const defaultPatterns = this.thinkingPatterns.getDefaultSelectedPatterns();
        defaultPatterns.forEach(patternId => {
            const checkbox = document.getElementById(`pattern_${patternId}`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
        this.syncPatternCardStates();
    }

    /**
     * Clear form and remove from localStorage
     */
    clearForm() {
        const savedData = this.storageManager.loadFormData();
        const hasData = savedData.promptText || Object.values(savedData.selectedPatterns || {}).some(Boolean);
        
        let message = 'フォームの内容をすべてクリアしますか？';
        if (hasData) {
            const savedTime = savedData.lastSaved ? new Date(savedData.lastSaved) : null;
            const timeAgo = savedTime ? this.getTimeAgo(savedTime) : '不明';
            message += `\n\n保存されたデータ (${timeAgo}) も削除されます。`;
        }
        message += '\nこの操作は取り消せません。';
        
        if (confirm(message)) {
            // Clear form elements
            this.elements.promptInput.value = '';
            this.elements.enableImprovement.checked = true;
            
            // Clear all pattern selections
            document.querySelectorAll('.pattern-item input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = false;
            });

            // Clear active preset
            document.querySelectorAll('.preset-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Apply default selections
            this.applyDefaultSelections();
            
            // Clear results
            this.hideResults();
            
            // Clear from localStorage
            this.storageManager.clearFormData();
            
            // Clear auto-save timer
            if (this.autoSaveTimer) {
                clearTimeout(this.autoSaveTimer);
                this.autoSaveTimer = null;
            }
            
            // Update pattern summary
            this.updatePatternSummary();
            
            // Show success notification
            this.showNotification('フォームと保存データをクリアしました', 'success');
            
            this.logger?.info('Form cleared');
        }
    }

    /**
     * Save current settings to localStorage
     */
    saveCurrentSettings() {
        const formData = this.collectFormData();
        const settings = {
            autoImprove: formData.enableImprovement,
            defaultPatterns: Object.keys(formData.selectedPatterns).filter(key => 
                formData.selectedPatterns[key]
            ),
            lastUpdated: new Date().toISOString()
        };
        
        this.storageManager.saveSettings(settings);
        
        // Show success message
        this.showNotification('設定が保存されました', 'success');
    }

    /**
     * Initialize workflow callbacks
     */
    initializeWorkflowCallbacks() {
        // Progress callback
        this.workflowManager.onProgress((message, status, execution) => {
            this.updateProgress(message, status);
        });

        // Result callback
        this.workflowManager.onResult((execution) => {
            this.displayExecutionResult(execution);
        });
    }

    /**
     * Execute the prompt with selected patterns
     */
    async executePrompt() {
        return safeAsync(async () => {
            // Collect and validate form data
            const formData = this.collectFormData();
            const validation = this.validateExecutionData(formData);
            
            if (!validation.isValid) {
                this.showNotification(validation.message, 'error');
                return;
            }
            
            const selectedPatternIds = Object.keys(formData.selectedPatterns).filter(key => 
                formData.selectedPatterns[key]
            );
            
            // Save current form data before execution
            this.saveFormData();
            
            // Initialize progress tracking
            this.elements.executeBtn.disabled = true;
            
            // Update button state for screen readers
            if (this.accessibilityManager) {
                this.accessibilityManager.updateButtonState(this.elements.executeBtn, 'loading');
            }
            
            let abortController = null;
            
            try {
                // Progress tracking disabled, using only progress controller

                if (this.progressController) {
                    abortController = await this.progressController.show({
                        title: UI_STRINGS.PROGRESS.EXECUTION_TITLE,
                        stages: [
                            UI_STRINGS.PROGRESS.STAGE_ANALYSIS,
                            UI_STRINGS.PROGRESS.STAGE_IMPROVEMENT,
                            UI_STRINGS.PROGRESS.STAGE_GENERATION
                        ]
                    });
                }
                
                // Execute workflow with progress updates
                const executionConfig = {
                    originalPrompt: formData.promptText,
                    selectedPatterns: selectedPatternIds,
                    enableImprovement: formData.enableImprovement,
                    preferredProvider: this.getPreferredProvider(),
                    requireImprovedPromptConfirmation: !!formData.enableImprovement,
                    confirmImprovedPrompt: async (improvedPrompt) => {
                        return await this.showImprovedPromptConfirmation(improvedPrompt);
                    },
                    abortSignal: abortController?.signal
                };
                
                this.logger.info('Starting workflow execution', {
                    promptLength: formData.promptText.length,
                    patternCount: selectedPatternIds.length,
                    improvementEnabled: formData.enableImprovement
                });
                
                // Stage 1: Analysis/Improvement
                if (this.progressController) {
                    this.progressController.advance(1, UI_STRINGS.PROGRESS.STAGE_ANALYSIS);
                }
                
                // Announce progress to screen readers
                if (this.accessibilityManager) {
                    this.accessibilityManager.announceProgress(1, UI_STRINGS.PROGRESS.STAGE_ANALYSIS, 3);
                }
                
                this.currentExecution = await this.workflowManager.executeWorkflow(executionConfig);
                
                // Complete progress
                if (this.progressController) {
                    this.progressController.complete(3, UI_STRINGS.PROGRESS.COMPLETE);
                    
                    // Auto-hide after delay
                    setTimeout(() => {
                        if (this.progressController && !this.progressController.isDestroyed) {
                            this.progressController.hide();
                        }
                    }, APP_CONFIG.PROGRESS_AUTO_HIDE_DELAY);
                }
                
                this.logger.info('Workflow execution completed', {
                    executionTime: this.currentExecution.executionTime,
                    resultCount: this.currentExecution.results?.stage2?.results?.length || 0
                });
                
                this.showNotification(
                    `${UI_STRINGS.SUCCESS.EXECUTION_COMPLETE} (${Math.round(this.currentExecution.executionTime / 1000)}秒)`, 
                    'success'
                );
                
            } catch (error) {
                this.logger.error('Workflow execution failed', error);
                
                // Handle specific error types
                let errorMessage = UI_STRINGS.ERRORS.EXECUTION_FAILED;
                let progressErrorMessage = UI_STRINGS.ERRORS.GENERAL_ERROR;
                
                if (error instanceof ValidationError) {
                    errorMessage = error.message;
                } else if (error instanceof NetworkError) {
                    errorMessage = UI_STRINGS.ERRORS.NETWORK_ERROR;
                    progressErrorMessage = UI_STRINGS.ERRORS.NETWORK_ERROR;
                } else if (error.name === 'AbortError') {
                    errorMessage = UI_STRINGS.ERRORS.EXECUTION_CANCELLED;
                    progressErrorMessage = UI_STRINGS.ERRORS.EXECUTION_CANCELLED;
                }
                
                // Update progress controller with error
                if (this.progressController) {
                    const currentStage = this.progressController.getCurrentStage() || 1;
                    this.progressController.error(currentStage, progressErrorMessage);
                    
                    setTimeout(() => {
                        if (this.progressController && !this.progressController.isDestroyed) {
                            this.progressController.hide();
                        }
                    }, APP_CONFIG.ERROR_DISPLAY_DURATION);
                }
                
                this.showNotification(errorMessage, 'error');
                throw error; // Re-throw for global error handler
                
            } finally {
                this.hideProgress();
                this.elements.executeBtn.disabled = false;
                
                // Update button state for screen readers
                if (this.accessibilityManager) {
                    this.accessibilityManager.updateButtonState(this.elements.executeBtn, 'enabled');
                }
            }
            
        }, this.errorHandler, 'executePrompt');
    }

    /**
     * Show confirmation modal for improved prompt before Stage 2
     * @param {string} improvedPrompt
     * @returns {Promise<boolean>} true to proceed, false to cancel
     */
    showImprovedPromptConfirmation(improvedPrompt) {
        return new Promise((resolve) => {
            try {
                // Create overlay
                const overlay = document.createElement('div');
                overlay.className = 'confirm-overlay';
                overlay.setAttribute('role', 'dialog');
                overlay.setAttribute('aria-modal', 'true');
                overlay.setAttribute('aria-label', '指示文改良の確認');

                // Basic styles if not present
                if (!document.querySelector('#confirm-overlay-styles')) {
                    const style = document.createElement('style');
                    style.id = 'confirm-overlay-styles';
                    style.textContent = `
                        .confirm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; }
                        .confirm-dialog { background: #fff; width: min(800px, 92vw); max-height: 80vh; overflow: auto; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
                        .confirm-header { padding: 16px 20px; border-bottom: 1px solid #eee; font-weight: 600; display:flex; align-items:center; gap:8px; }
                        .confirm-body { padding: 16px 20px; }
                        .confirm-actions { display: flex; gap: 12px; justify-content: flex-end; padding: 14px 20px; border-top: 1px solid #eee; }
                        .btn-primary { background: #4F46E5; color: #fff; border: none; padding: 10px 14px; border-radius: 6px; cursor: pointer; }
                        .btn-secondary { background: #E5E7EB; color: #111827; border: none; padding: 10px 14px; border-radius: 6px; cursor: pointer; }
                        .improved-block { white-space: pre-wrap; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
                    `;
                    document.head.appendChild(style);
                }

                // Dialog
                const dialog = document.createElement('div');
                dialog.className = 'confirm-dialog';
                dialog.innerHTML = `
                    <div class="confirm-header">📝 指示文改良の確認</div>
                    <div class="confirm-body">
                        <p>以下の改良後プロンプトで実行してよろしいですか？</p>
                        <div class="improved-block" id="improvedPromptPreview"></div>
                    </div>
                    <div class="confirm-actions">
                        <button class="btn-secondary" id="btnCancel">キャンセル（編集に戻る）</button>
                        <button class="btn-primary" id="btnProceed">この内容で実行</button>
                    </div>
                `;

                overlay.appendChild(dialog);
                document.body.appendChild(overlay);

                // Insert content safely
                dialog.querySelector('#improvedPromptPreview').textContent = improvedPrompt || '';

                const cleanup = () => {
                    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
                };

                dialog.querySelector('#btnProceed').addEventListener('click', () => {
                    cleanup();
                    resolve(true);
                });
                dialog.querySelector('#btnCancel').addEventListener('click', () => {
                    // Put improved prompt into input for user to tweak
                    if (this.elements?.promptInput) {
                        this.elements.promptInput.value = improvedPrompt || '';
                        this.saveFormData();
                    }
                    cleanup();
                    // Notify user
                    this.showNotification('改良結果を入力欄に反映しました。必要に応じて編集し、再度実行してください。', 'info');
                    resolve(false);
                });

                // Esc to cancel
                overlay.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        dialog.querySelector('#btnCancel').click();
                    }
                });

                // Focus management
                setTimeout(() => {
                    dialog.querySelector('#btnProceed')?.focus();
                }, 0);

            } catch (e) {
                console.error('Failed to show confirmation dialog:', e);
                resolve(true); // Fail-open to avoid blocking execution
            }
        });
    }
    
    /**
     * Validate execution data before starting workflow
     */
    validateExecutionData(formData) {
        if (!validateInput(formData.promptText, 'prompt')) {
            return {
                isValid: false,
                message: UI_STRINGS.ERRORS.INVALID_PROMPT
            };
        }
        
        const selectedPatterns = Object.keys(formData.selectedPatterns).filter(key => 
            formData.selectedPatterns[key]
        );
        
        if (selectedPatterns.length === 0) {
            return {
                isValid: false,
                message: UI_STRINGS.ERRORS.NO_PATTERNS_SELECTED
            };
        }
        
        const availableProviders = this.aiService.getAvailableProviders();
        if (Object.keys(availableProviders).length === 0) {
            return {
                isValid: false,
                message: UI_STRINGS.ERRORS.NO_API_KEYS
            };
        }
        
        return { isValid: true };
    }
    
    /**
     * Show critical error that prevents app functionality
     */
    showCriticalError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'critical-error-overlay';
        errorDiv.innerHTML = `
            <div class="critical-error-content">
                <div class="error-icon">
                    ${createSVGIcon(ICONS.ERROR, 48)}
                </div>
                <h2>アプリケーションエラー</h2>
                <p>${sanitizeHTML(message)}</p>
                <button onclick="window.location.reload()" class="retry-btn">
                    ページを再読み込み
                </button>
            </div>
        `;
        
        document.body.appendChild(errorDiv);
        
        // Add critical error styles if not already present
        if (!document.querySelector('#critical-error-styles')) {
            const style = document.createElement('style');
            style.id = 'critical-error-styles';
            style.textContent = `
                .critical-error-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.9);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                }
                .critical-error-content {
                    background: white;
                    padding: 2rem;
                    border-radius: 8px;
                    text-align: center;
                    max-width: 400px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                }
                .error-icon {
                    color: #e53e3e;
                    margin-bottom: 1rem;
                }
                .retry-btn {
                    background: var(--primary-color, #4299e1);
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-top: 1rem;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    /**
     * Cleanup method for app destruction
     */
    destroy() {
        try {
            // Clear timers
            if (this.autoSaveTimer) {
                clearTimeout(this.autoSaveTimer);
            }
            
            // Destroy progress controller
            if (this.progressController && !this.progressController.isDestroyed) {
                this.progressController.destroy();
            }
            
            // Clear global reference
            if (window.progressController === this.progressController) {
                window.progressController = null;
            }
            
            // Remove global error handlers
            if (this.errorHandler) {
                this.errorHandler.removeGlobalHandlers();
            }
            
            this.logger.info('AIPromptTool destroyed successfully');
            
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }

    /**
     * Get preferred AI provider
     */
    getPreferredProvider() {
        const settings = this.storageManager.loadSettings();
        const availableProviders = Object.keys(this.aiService.getAvailableProviders());
        
        if (settings.preferredProvider && availableProviders.includes(settings.preferredProvider)) {
            return settings.preferredProvider;
        }
        
        // Return first available provider as fallback
        return availableProviders[0] || 'io_intelligence';
    }

    /**
     * Display execution result
     */
    displayExecutionResult(execution) {
        // Clear existing messages
        this.clearChatMessages();

        // Display Stage 1 result if available
        if (execution.results.stage1) {
            const r = execution.results.stage1;
            if (r.improvementExecuted) {
                if (r.improvementApplied) {
                    this.displayStage1Result(r.improved, r.original);
                } else {
                    this.displayStage1NoChange(r.improved, r.fallbackReason);
                }
            } else if (r.fallbackReason) {
                this.displayStage1Fallback(r.fallbackReason);
            }
        }

        // Display Stage 2 results
        if (execution.results.stage2 && execution.results.stage2.results) {
            execution.results.stage2.results.forEach(result => {
                const pattern = this.thinkingPatterns.getPattern(result.patternId);
                this.displayPatternResult(pattern, result.data);
            });

            // Display errors if any
            if (execution.results.stage2.errors.length > 0) {
                execution.results.stage2.errors.forEach(error => {
                    this.displayPatternError(error);
                });
            }
        }

        // Update panel status
        this.updatePanelStatus('completed', '分析完了');
        
        this.showNotification(`実行が完了しました (${Math.round(execution.executionTime / 1000)}秒)`, 'success');
    }

    /**
     * Clear chat messages
     */
    clearChatMessages() {
        this.elements.chatMessages.innerHTML = '';
    }

    /**
     * Update panel status
     */
    updatePanelStatus(status, message) {
        const statusIndicator = this.elements.panelStatus.querySelector('.status-indicator');
        if (statusIndicator) {
            statusIndicator.className = `status-indicator ${status}`;
            statusIndicator.textContent = message;
        }
    }

    /**
     * Display pattern error
     */
    displayPatternError(error) {
        const messageElement = document.createElement('div');
        messageElement.className = 'ai-message error';
        messageElement.innerHTML = `
            <div class="message-header">
                <strong>${error.patternName}</strong> - <span class="error-status">エラー</span>
            </div>
            <div class="message-content">
                実行中にエラーが発生しました: ${error.error}
            </div>
        `;
        
        this.elements.chatMessages.appendChild(messageElement);
    }

    /**
     * Summarize results using AI
     */
    async summarizeResults() {
        if (!this.currentExecution || !this.currentExecution.results.stage2) {
            this.showNotification('統合する結果がありません', 'warning');
            return;
        }

        const results = this.currentExecution.results.stage2.results;
        if (results.length === 0) {
            this.showNotification('統合する結果がありません', 'warning');
            return;
        }

        try {
            this.elements.summarizeBtn.disabled = true;
            this.elements.summarizeBtn.textContent = '統合中...';

            const summary = await this.workflowManager.generateSummary(
                results,
                this.currentExecution.config.originalPrompt
            );

            // Display summary in chat messages instead
            const messageElement = document.createElement('div');
            messageElement.className = 'ai-message summary';
            messageElement.innerHTML = `
                <div class="message-header">
                    <strong>📊 結果統合</strong>
                </div>
                <div class="message-content">
                    ${summary.content}
                </div>
            `;
            this.elements.chatMessages.appendChild(messageElement);
            this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;

            this.showNotification('結果の統合が完了しました', 'success');

        } catch (error) {
            console.error('Summarization failed:', error);
            this.showNotification('結果の統合に失敗しました: ' + error.message, 'error');
        } finally {
            this.elements.summarizeBtn.disabled = false;
            this.elements.summarizeBtn.textContent = '結果をまとめる';
        }
    }

    /**
     * Export execution results
     */
    async exportResults() {
        if (!this.currentExecution) {
            this.showNotification('エクスポートする結果がありません', 'warning');
            return;
        }

        try {
            const markdownContent = this.workflowManager.exportExecution('markdown');
            const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `ai-prompt-result-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showNotification('結果をエクスポートしました', 'success');

        } catch (error) {
            console.error('Export failed:', error);
            this.showNotification('エクスポートに失敗しました: ' + error.message, 'error');
        }
    }

    /**
     * Display Stage 1 result
     */
    displayStage1Result(improvedPrompt, originalPrompt) {
        const messageElement = document.createElement('div');
        messageElement.className = 'ai-message stage1';
        messageElement.innerHTML = `
            <div class="message-header">
                <strong>📝 指示文改良結果</strong>
            </div>
            <div class="message-content">
                <div class="improvement-comparison">
                    <div class="original-prompt">
                        <h5>元の指示文:</h5>
                        <p class="prompt-text">${originalPrompt}</p>
                    </div>
                    <div class="improved-prompt">
                        <h5>改良された指示文:</h5>
                        <p class="prompt-text improved">${improvedPrompt}</p>
                    </div>
                </div>
            </div>
        `;

        this.elements.chatMessages.appendChild(messageElement);
    }

    /**
     * Display Stage 1 no change message
     */
    displayStage1NoChange(prompt, reason) {
        const messageElement = document.createElement('div');
        messageElement.className = 'ai-message stage1 no-change';
        messageElement.innerHTML = `
            <div class="message-header">
                <strong>📝 指示文改良 - 変更なし</strong>
            </div>
            <div class="message-content">
                <p>指示文の改良を実行しましたが、元の指示文が既に適切であったため変更は行いませんでした。</p>
                ${reason ? `<p class="fallback-reason">${reason}</p>` : ''}
                <div class="prompt-display">
                    <p class="prompt-text">${prompt}</p>
                </div>
            </div>
        `;

        this.elements.chatMessages.appendChild(messageElement);
    }

    /**
     * Display Stage 1 fallback message
     */
    displayStage1Fallback(fallbackReason) {
        const messageElement = document.createElement('div');
        messageElement.className = 'ai-message stage1 fallback';
        messageElement.innerHTML = `
            <div class="message-header">
                <strong>📝 指示文改良 - スキップ</strong>
            </div>
            <div class="message-content">
                ${fallbackReason}
            </div>
        `;

        this.elements.chatMessages.appendChild(messageElement);
    }

    /**
     * Display pattern result
     */
    displayPatternResult(pattern, result) {
        const messageElement = document.createElement('div');
        messageElement.className = 'ai-message pattern-result';
        messageElement.innerHTML = `
            <div class="message-header">
                <strong>🧠 ${pattern.name}</strong> - <span class="success-status">完了</span>
            </div>
            <div class="message-content">
                ${result.content}
            </div>
        `;
        
        this.elements.chatMessages.appendChild(messageElement);
        
        // Auto scroll to latest message
        this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
    }

    /**
     * Show/hide results section - using existing AI panel
     */
    showResults() {
        // Results are shown in the AI panel which is always visible
        // Just update the status to show results are ready
        this.updatePanelStatus('completed', '結果表示中');
    }

    hideResults() {
        // Clear the chat messages and reset to waiting state
        this.clearChatMessages();
        this.updatePanelStatus('waiting', '待機中');
        
        // Restore welcome message
        this.elements.chatMessages.innerHTML = `
            <div class="welcome-message">
                <div class="message-avatar">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4Z"/>
                    </svg>
                </div>
                <div class="message-content">
                    <h3>🚀 AI ThinkTank へようこそ！</h3>
                    <p>複数の思考パターンでAI分析を実行し、リアルタイムで結果を表示します。</p>
                    <ul>
                        <li>指示文を入力</li>
                        <li>思考パターンを選択</li>
                        <li>「実行開始」をクリック</li>
                    </ul>
                </div>
            </div>
        `;
    }

    /**
     * Show/hide progress overlay (disabled)
     */
    showProgress() {
        // Progress overlay disabled per user request
        return;
    }

    hideProgress() {
        this.elements.progressOverlay.classList.add('hidden');
        
        // Hide chat progress as well
        if (this.elements.chatProgress) {
            this.elements.chatProgress.style.display = 'none';
        }
    }

    updateProgress(message, status) {
        // Update progress text and panel status
        if (this.elements.progressText) {
            this.elements.progressText.textContent = message;
        }
        
        this.updatePanelStatus(status, message);

        // Show progress if not already visible
        if (this.elements.chatProgress) {
            this.elements.chatProgress.style.display = 'block';
        }

        // Add progress message to chat if it's an important update
        if (status === 'completed' || status === 'error') {
            const messageElement = document.createElement('div');
            messageElement.className = `ai-message progress ${status}`;
            messageElement.innerHTML = `
                <div class="message-header">
                    <strong>⚡ ${status === 'completed' ? '完了' : status === 'error' ? 'エラー' : '進行中'}</strong>
                </div>
                <div class="message-content">
                    ${message}
                </div>
            `;
            
            this.elements.chatMessages.appendChild(messageElement);
            this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
        }
    }

    /**
     * Settings modal functions
     */
    showSettingsModal() {
        this.logger.debug('showSettingsModal() called');
        this.loadSettingsToModal();
        
        if (this.elements.settingsModal) {
            this.elements.settingsModal.style.display = 'flex';
            this.elements.settingsModal.setAttribute('aria-hidden', 'false');
            
            // Focus the first input
            if (this.elements.ioIntelligenceApiKey) {
                setTimeout(() => this.elements.ioIntelligenceApiKey.focus(), 100);
            }
        }
    }

    hideSettingsModal() {
        if (this.elements.settingsModal) {
            this.elements.settingsModal.style.display = 'none';
            this.elements.settingsModal.setAttribute('aria-hidden', 'true');
        }
    }
    
    showHistoryModal() {
        this.logger.debug('showHistoryModal() called');
        this.loadHistoryToModal();
        
        if (this.elements.historyModal) {
            this.elements.historyModal.style.display = 'flex';
            this.elements.historyModal.setAttribute('aria-hidden', 'false');
        }
    }
    
    hideHistoryModal() {
        if (this.elements.historyModal) {
            this.elements.historyModal.style.display = 'none';
            this.elements.historyModal.setAttribute('aria-hidden', 'true');
        }
    }
    
    loadHistoryToModal() {
        // TODO: Implement history loading
        this.logger.debug('loadHistoryToModal() called');
    }
    
    clearHistory() {
        // TODO: Implement history clearing
        this.logger.debug('clearHistory() called');
    }

    loadSettingsToModal() {
        const apiKeys = this.storageManager.loadApiKeys();
        const settings = this.storageManager.loadSettings();

        this.logger.debug('Loading settings to modal:', {
            hasIoApiKeyElement: !!this.elements.ioIntelligenceApiKey,
            hasAutoSaveElement: !!this.elements.autoSaveEnabled,
            apiKeyValue: apiKeys.io_intelligence ? 'set' : 'empty'
        });

        if (this.elements.ioIntelligenceApiKey) {
            this.elements.ioIntelligenceApiKey.value = apiKeys.io_intelligence || '';
        } else {
            this.logger.error('ioApiKey element not found when loading settings!');
        }

        if (this.elements.autoImproveDefault) {
            this.elements.autoImproveDefault.checked = settings.autoImprove !== false;
        } else {
            this.logger.warn('autoImproveDefault element not found');
        }
    }

    saveSettings() {
        const apiKeys = {
            io_intelligence: this.elements.ioIntelligenceApiKey?.value.trim() || ''
        };
        
        const settings = {
            autoSave: this.elements.autoSaveEnabled?.checked !== false,
            darkMode: this.elements.darkModeEnabled?.checked || false,
            lastUpdated: new Date().toISOString()
        };

        this.storageManager.saveApiKeys(apiKeys);
        this.storageManager.saveSettings(settings);

        this.hideSettingsModal();
        this.showNotification('設定が保存されました', 'success');
    }

    /**
     * Show pattern information modal
     */
    showPatternInfo(pattern) {
        // Update modal content
        this.elements.patternInfoTitle.textContent = `${pattern.name} - 詳細情報`;
        this.elements.patternInfoDescription.textContent = pattern.description;
        this.elements.patternInfoPrompt.textContent = pattern.prompt;
        
        // Set category badge
        const categoryText = pattern.category === 'basic' ? '基本思考' : '専門思考';
        this.elements.patternInfoCategory.textContent = categoryText;
        this.elements.patternInfoCategory.className = `pattern-category-badge ${pattern.category}`;
        
        // Show modal with accessibility features
        if (this.accessibilityManager) {
            this.accessibilityManager.showModal(this.elements.patternInfoModal);
        } else {
            // Fallback
            this.elements.patternInfoModal.classList.remove('hidden');
            this.elements.patternInfoModal.setAttribute('aria-hidden', 'false');
        }
        
        this.logger.debug('Pattern info modal opened', { patternId: pattern.id, patternName: pattern.name });
    }

    /**
     * Hide pattern information modal
     */
    hidePatternInfo() {
        if (this.accessibilityManager) {
            this.accessibilityManager.hideModal(this.elements.patternInfoModal);
        } else {
            // Fallback
            this.elements.patternInfoModal.classList.add('hidden');
            this.elements.patternInfoModal.setAttribute('aria-hidden', 'true');
        }
        
        this.logger.debug('Pattern info modal closed');
    }

    /**
     * Save API token separately
     */
    saveApiToken() {
        const apiKey = this.elements.ioApiKey.value.trim();
        if (!apiKey) {
            this.showNotification('APIキーを入力してください', 'error');
            return;
        }

        const apiKeys = this.storageManager.loadApiKeys();
        apiKeys.io_intelligence = apiKey;
        this.storageManager.saveApiKeys(apiKeys);

        this.showNotification('APIキーが保存されました', 'success');
    }

    /**
     * Utility functions
     */
    togglePasswordVisibility(button) {
        const targetId = button.getAttribute('data-target');
        const input = document.getElementById(targetId);
        
        if (input.type === 'password') {
            input.type = 'text';
            button.textContent = '🙈';
        } else {
            input.type = 'password';
            button.textContent = '👁️';
        }
    }

    showNotification(message, type = 'info') {
        // Announce to screen readers first
        if (this.accessibilityManager) {
            if (type === 'error') {
                this.accessibilityManager.announceError(message);
            } else if (type === 'success') {
                this.accessibilityManager.announceSuccess(message);
            } else {
                this.accessibilityManager.announce(message, 'status');
            }
        }
        
        // Create visual notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 3000;
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.3s ease;
        `;
        
        // Set background color based on type
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#2563eb'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 100);
        
        // Remove after delay
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
        
        // Log notification for debugging
        this.logger.info(`Notification shown: ${type} - ${message}`);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get time ago string from date
     * @param {Date} date - Date to calculate from
     * @returns {string} Time ago string
     */
    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) {
            return `${diffDays}日前`;
        } else if (diffHours > 0) {
            return `${diffHours}時間前`;
        } else if (diffMinutes > 0) {
            return `${diffMinutes}分前`;
        } else if (diffSeconds > 10) {
            return `${diffSeconds}秒前`;
        } else {
            return 'たった今';
        }
    }

    hasUnsavedChanges() {
        // Check if there are any unsaved changes
        const currentData = this.collectFormData();
        const savedData = this.storageManager.loadFormData();
        
        return JSON.stringify(currentData) !== JSON.stringify(savedData);
    }

    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + Enter to execute
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (!this.elements.executeBtn.disabled) {
                this.executePrompt();
                if (this.accessibilityManager) {
                    this.accessibilityManager.announce('実行ショートカットが使用されました', 'status');
                }
            }
        }
        
        // Ctrl/Cmd + K to focus search/prompt input
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            this.elements.promptInput.focus();
            if (this.accessibilityManager) {
                this.accessibilityManager.announce('指示文入力にフォーカスしました', 'status');
            }
        }
        
        // Ctrl/Cmd + , to open settings
        if ((e.ctrlKey || e.metaKey) && e.key === ',') {
            e.preventDefault();
            this.showSettings();
        }
        
        // Ctrl/Cmd + R to insert random sample
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            this.insertSamplePrompt();
        }
        
        // Ctrl/Cmd + Shift + C to clear form
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            this.clearForm();
        }
        
        // F1 for help (show keyboard shortcuts)
        if (e.key === 'F1') {
            e.preventDefault();
            this.showKeyboardShortcuts();
        }
        
        // Escape to close modals (handled by accessibility manager now)
        if (e.key === 'Escape') {
            if (!this.elements.settingsModal.classList.contains('hidden')) {
                this.hideSettings();
            } else if (!this.elements.patternInfoModal.classList.contains('hidden')) {
                this.hidePatternInfo();
            }
        }
    }
    
    /**
     * Show keyboard shortcuts help
     */
    showKeyboardShortcuts() {
        const shortcuts = [
            { keys: 'Ctrl/Cmd + Enter', description: 'AI分析を実行' },
            { keys: 'Ctrl/Cmd + K', description: '指示文入力にフォーカス' },
            { keys: 'Ctrl/Cmd + R', description: 'サンプル指示文を挿入' },
            { keys: 'Ctrl/Cmd + ,', description: '設定を開く' },
            { keys: 'Ctrl/Cmd + Shift + C', description: 'フォームをクリア' },
            { keys: 'Escape', description: 'モーダルを閉じる' },
            { keys: 'F1', description: 'このヘルプを表示' },
            { keys: 'Tab', description: '次の要素に移動' },
            { keys: 'Shift + Tab', description: '前の要素に移動' },
            { keys: '矢印キー', description: 'プリセットパターンでの選択切り替え' }
        ];
        
        const shortcutsHtml = shortcuts.map(shortcut => 
            `<tr><td><kbd>${shortcut.keys}</kbd></td><td>${shortcut.description}</td></tr>`
        ).join('');
        
        const helpContent = `
            <div class="keyboard-shortcuts-help">
                <h3>キーボードショートカット</h3>
                <table class="shortcuts-table">
                    <thead>
                        <tr><th>キー</th><th>機能</th></tr>
                    </thead>
                    <tbody>
                        ${shortcutsHtml}
                    </tbody>
                </table>
                <p><small>キーボードショートカットはアクセシビリティと作業効率の向上のために提供されています。</small></p>
            </div>
        `;
        
        this.showNotification('キーボードショートカットヘルプを表示しました。F1キーでいつでも表示できます。', 'info');
        
        // Create temporary help overlay
        const helpOverlay = document.createElement('div');
        helpOverlay.className = 'keyboard-help-overlay';
        helpOverlay.innerHTML = `
            <div class="keyboard-help-content">
                ${helpContent}
                <button class="close-help-btn" onclick="this.parentElement.parentElement.remove()">閉じる</button>
            </div>
        `;
        
        // Add styles if not already present
        if (!document.querySelector('#keyboard-help-styles')) {
            const style = document.createElement('style');
            style.id = 'keyboard-help-styles';
            style.textContent = `
                .keyboard-help-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                }
                .keyboard-help-content {
                    background: white;
                    padding: 2rem;
                    border-radius: 8px;
                    max-width: 600px;
                    max-height: 80vh;
                    overflow-y: auto;
                }
                .shortcuts-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 1rem 0;
                }
                .shortcuts-table th,
                .shortcuts-table td {
                    padding: 0.5rem;
                    text-align: left;
                    border-bottom: 1px solid #e0e0e0;
                }
                .shortcuts-table th {
                    background: #f5f5f5;
                    font-weight: 600;
                }
                .shortcuts-table kbd {
                    background: #f0f0f0;
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                    font-family: monospace;
                    font-size: 0.9em;
                }
                .close-help-btn {
                    background: var(--primary-color, #4299e1);
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-top: 1rem;
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(helpOverlay);
        
        // Focus on close button
        const closeBtn = helpOverlay.querySelector('.close-help-btn');
        if (closeBtn) {
            closeBtn.focus();
        }
        
        // Close with Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                helpOverlay.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
        
        this.logger.info('Keyboard shortcuts help displayed');
    }

    startNewExecution() {
        this.hideResults();
        this.elements.promptInput.focus();
        this.currentExecution = null;
    }

    saveCurrentResult() {
        if (this.currentExecution) {
            // Results are automatically saved to history by WorkflowManager
            this.showNotification('結果が履歴に保存されました', 'success');
        } else {
            this.showNotification('保存する結果がありません', 'warning');
        }
    }
}

/**
 * Progress Controller for 3-Step Animation
 */
class ProgressController {
    constructor() {
        this.progressWrapper = document.getElementById('progressWrapper');
        this.progressTitle = document.getElementById('progressTitle');
        this.progressBar = document.getElementById('progressBar');
        this.progressMessage = document.getElementById('progressMessage');
        
        // Get all progress steps
        const stepElements = document.querySelectorAll('.progress-step');
        this.stages = {
            1: {
                element: stepElements[0],
                description: stepElements[0]?.querySelector('.step-description')
            },
            2: {
                element: stepElements[1],
                description: stepElements[1]?.querySelector('.step-description')
            },
            3: {
                element: stepElements[2],
                description: stepElements[2]?.querySelector('.step-description')
            }
        };
        this.focusedElement = null;
        this.currentStep = 0;
    }

    /**
     * Show the progress overlay
     */
    show() {
        if (!this.progressWrapper) {
            console.error('Progress wrapper not found');
            return;
        }
        
        // Save current focus for restoration later
        this.focusedElement = document.activeElement;
        
        // Reset all stages to pending
        this.resetStages();
        
        // Show the overlay
        this.progressWrapper.style.display = 'flex';
        this.progressWrapper.setAttribute('aria-hidden', 'false');
        
        console.log('Progress overlay shown');
    }

    /**
     * Advance to the specified step
     */
    advance(step, statusText = null) {
        if (step < 1 || step > 3) {
            console.warn('Invalid step number:', step);
            return;
        }
        
        const stage = this.stages[step];
        if (!stage || !stage.element) {
            console.error('Stage element not found for step:', step);
            return;
        }
        
        // Mark previous stages as completed
        for (let i = 1; i < step; i++) {
            this.updateStage(i, 'completed', '完了');
        }
        
        // Mark current stage as active
        this.updateStage(step, 'active', statusText || '処理中...');
        
        // Mark future stages as pending
        for (let i = step + 1; i <= 3; i++) {
            this.updateStage(i, 'pending', '待機中');
        }
        
        console.log(`Advanced to step ${step}`);
    }

    /**
     * Mark a stage as completed
     */
    complete(step, statusText = '完了') {
        if (step < 1 || step > 3) {
            console.warn('Invalid step number:', step);
            return;
        }
        
        this.updateStage(step, 'completed', statusText);
        console.log(`Step ${step} completed`);
    }

    /**
     * Mark a stage as error
     */
    error(step, statusText = 'エラー発生') {
        if (step < 1 || step > 3) {
            console.warn('Invalid step number:', step);
            return;
        }
        
        this.updateStage(step, 'error', statusText);
        console.log(`Step ${step} failed`);
    }

    /**
     * Hide the progress overlay
     */
    hide() {
        if (!this.progressWrapper) {
            console.error('Progress wrapper not found');
            return;
        }
        
        // Hide the overlay
        this.progressWrapper.style.display = 'none';
        this.progressWrapper.setAttribute('aria-hidden', 'true');
        
        // Restore focus to the previously focused element
        if (this.focusedElement && typeof this.focusedElement.focus === 'function') {
            this.focusedElement.focus();
        }
        
        console.log('Progress overlay hidden');
    }

    /**
     * Update a single stage's state
     */
    updateStage(step, status, statusText) {
        const stage = this.stages[step];
        if (!stage || !stage.element) return;
        
        // Update element data-status attribute
        stage.element.setAttribute('data-status', status);
        
        // Update status text in description if provided
        if (statusText && stage.description) {
            stage.description.textContent = statusText;
        }
        
        // Update progress bar
        if (this.progressBar) {
            const progress = (step / 3) * 100;
            this.progressBar.style.width = `${progress}%`;
            this.progressBar.setAttribute('aria-valuenow', progress);
        }
        
        // Update progress message
        if (this.progressMessage && statusText) {
            this.progressMessage.textContent = statusText;
        }
    }

    /**
     * Reset all stages to pending state
     */
    resetStages() {
        this.currentStep = 0;
        
        // Reset progress bar
        if (this.progressBar) {
            this.progressBar.style.width = '0%';
            this.progressBar.setAttribute('aria-valuenow', 0);
        }
        
        // Reset all stage elements
        for (let i = 1; i <= 3; i++) {
            const stage = this.stages[i];
            if (stage && stage.element) {
                stage.element.setAttribute('data-status', 'pending');
            }
        }
        
        // Reset progress message
        if (this.progressMessage) {
            this.progressMessage.textContent = '';
        }
        
        // Reset title
        if (this.progressTitle) {
            this.progressTitle.textContent = 'AI処理を実行中...';
        }
    }

    /**
     * Simulate the full process for testing
     */
    async simulateProcess() {
        this.show();
        
        // Stage 1
        await this.sleep(500);
        this.advance(1, '仕様分析中...');
        
        await this.sleep(2000);
        this.complete(1, '仕様分析完了');
        
        // Stage 2
        await this.sleep(500);
        this.advance(2, 'AIモデル生成中...');
        
        await this.sleep(3000);
        this.complete(2, 'モデル生成完了');
        
        // Stage 3
        await this.sleep(500);
        this.advance(3, '品質検証中...');
        
        await this.sleep(2000);
        this.complete(3, '品質検証完了');
        
        // Hide after a brief delay
        await this.sleep(1500);
        this.hide();
    }

    /**
     * Helper method for delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for ES module usage
// export { AIPromptTool };

// Initialize the application when DOM is loaded (for both module and script usage)
function initializeApp() {
    try {
        console.log('Starting application initialization...');

        // Check if required classes are available
        if (typeof AIPromptTool === 'undefined') {
            throw new Error('AIPromptTool class not found');
        }

        // Initialize main app
        window.aiPromptTool = new AIPromptTool();

        // Keep legacy ProgressController for backward compatibility (if available)
        if (typeof ProgressController !== 'undefined' && !window.progressController) {
            window.progressController = new ProgressController();
        }

        console.log('Application initialized successfully');

    } catch (error) {
        console.error('Failed to initialize application:', error);
        
        // Show basic error message if our advanced error handling isn't available
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #fee; border: 2px solid #f00; padding: 20px; border-radius: 8px;
            z-index: 10000; max-width: 400px; text-align: center;
        `;
        errorDiv.innerHTML = `
            <h3 style="color: #c00; margin-top: 0;">アプリケーション初期化エラー</h3>
            <p>${error.message}</p>
            <button onclick="window.location.reload()" 
                style="background: #007cba; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                ページを再読み込み
            </button>
        `;
        document.body.appendChild(errorDiv);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM is already ready
    initializeApp();
}

})(); // End of IIFE
