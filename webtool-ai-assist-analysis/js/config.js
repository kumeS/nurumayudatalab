/**
 * Application Configuration
 * Consolidated from constants.js, env-config.js, and bridge.js
 * Central location for all configuration values, constants, and environment settings
 */

/**
 * Application Configuration Constants
 */
window.APP_CONFIG = {
    // Timing constants
    AUTO_SAVE_DELAY: 1000,
    DEBOUNCE_DELAY: 300,
    ANIMATION_DURATION: 300,
    FEEDBACK_DISPLAY_TIME: 1500,
    LOADING_DISPLAY_TIME: 800,
    FEEDBACK_DURATION: 1500,
    LOADING_DURATION: 800,
    PROGRESS_AUTO_HIDE_DELAY: 2000,
    ERROR_DISPLAY_DURATION: 3000,
    
    // UI constants
    MAX_INSTRUCTION_LENGTH: 5000,
    MIN_INSTRUCTION_LENGTH: 10,
    DEFAULT_TEXTAREA_ROWS: 6,
    PROGRESS_STEPS: 3,
    
    // Logging
    LOG_LEVEL: 'info', // 'debug', 'info', 'warn', 'error'
    
    // Local storage keys
    STORAGE_KEYS: {
        FORM_DATA: 'ai_prompt_tool_form_data',
        SETTINGS: 'ai_prompt_tool_settings',
        API_KEYS: 'ai_prompt_tool_api_keys',
        CHAT_DRAFT: 'ai_chat_input_draft',
        TEMPLATES: 'prompt_templates'
    },
    
    // CSS classes
    CSS_CLASSES: {
        VISIBLE: 'visible',
        EXPANDED: 'expanded',
        LOADING: 'loading',
        HIDDEN: 'hidden',
        ERROR: 'error',
        SUCCESS: 'success',
        WARNING: 'warning'
    },
    
    // ARIA attributes
    ARIA: {
        EXPANDED: 'aria-expanded',
        HIDDEN: 'aria-hidden',
        LIVE: 'aria-live',
        LABEL: 'aria-label',
        LABELLEDBY: 'aria-labelledby',
        DESCRIBEDBY: 'aria-describedby'
    },
    
    // Progress stage states
    STAGE_STATES: {
        PENDING: 'pending',
        ACTIVE: 'active',
        COMPLETED: 'completed',
        ERROR: 'error'
    },
    
    // Notification types
    NOTIFICATION_TYPES: {
        SUCCESS: 'success',
        ERROR: 'error',
        WARNING: 'warning',
        INFO: 'info'
    },
    
    // Default error messages
    ERROR_MESSAGES: {
        ELEMENT_NOT_FOUND: 'Required DOM element not found',
        API_KEY_MISSING: 'APIキーが設定されていません',
        VALIDATION_FAILED: 'Input validation failed',
        NETWORK_ERROR: 'Network request failed',
        PARSING_ERROR: 'Response parsing failed',
        GENERIC: 'An unexpected error occurred'
    },
    
    // Success messages
    SUCCESS_MESSAGES: {
        SAVED: 'データが保存されました',
        LOADED: 'データが読み込まれました',
        CLEARED: 'データがクリアされました',
        SAMPLE_INSERTED: 'サンプルが挿入されました'
    }
};

/**
 * UI Strings and Messages
 */
window.UI_STRINGS = {
    ERRORS: {
        PROMPT_INPUT_NOT_FOUND: 'プロンプト入力要素が見つかりません',
        INVALID_PROMPT: '有効なプロンプトを入力してください',
        NO_PATTERNS_SELECTED: '少なくとも1つの思考パターンを選択してください',
        NO_API_KEYS: 'AI APIキーが設定されていません。設定からAPIキーを登録してください。',
        EXECUTION_FAILED: '実行中にエラーが発生しました',
        NETWORK_ERROR: 'ネットワークエラーが発生しました',
        EXECUTION_CANCELLED: '実行がキャンセルされました',
        GENERAL_ERROR: 'エラーが発生しました'
    },
    SUCCESS: {
        EXECUTION_COMPLETE: '実行が完了しました',
        SAVED: 'データが保存されました',
        LOADED: 'データが読み込まれました',
        CLEARED: 'データがクリアされました'
    },
    FEEDBACK: {
        INSERTING: 'サンプルを挿入中...',
        INSERT_COMPLETE: 'サンプルを挿入しました',
        SAVING: '保存中...',
        SAVE_COMPLETE: '保存しました',
        LOADING: '読み込み中...',
        LOAD_COMPLETE: '読み込みました'
    },
    PROGRESS: {
        EXECUTION_TITLE: 'AI処理を実行中...',
        STAGE_1: 'プロンプト改善中...',
        STAGE_2: '思考パターン実行中...',
        STAGE_3: '結果を生成中...',
        STAGE_ANALYSIS: 'プロンプトを分析中...',
        STAGE_IMPROVEMENT: 'プロンプトを改善中...',
        STAGE_GENERATION: '結果を生成中...',
        COMPLETE: '処理が完了しました'
    }
};

/**
 * Sample prompts for the application
 */
window.SAMPLE_PROMPTS = [
    "新しいWebサービスのアイデアを10個考えて、それぞれの特徴と想定ユーザーを教えてください",
    "リモートワークの普及が働き方に与えた影響を、メリット・デメリットの両面から分析してください",
    "AIの進歩が10年後の教育現場にもたらす変化を予測し、教師の役割がどう変わるかを考察してください",
    "スタートアップが成功するために最も重要な要素を5つ挙げ、それぞれの重要度の理由を説明してください",
    "日本の少子高齢化問題を解決するための革新的なアプローチを3つ提案してください",
    "サステナブルな社会を実現するために、個人レベルでできる取り組みを具体的に10個提案してください",
    "新しいSNSプラットフォームを開発するとしたら、どのような機能と差別化ポイントを設計しますか？",
    "副業を始めたい会社員に向けて、リスクを最小化しながら収入を得る方法を段階的にアドバイスしてください",
    "ChatGPTのようなAIツールを活用して業務効率を最大化する具体的な方法を職種別に教えてください",
    "地方創生の成功事例から学ぶ、地域活性化のために効果的な施策を5つ分析してください",
    "メタバースが普及した社会での新しいビジネスモデルを3つ考案し、収益化の仕組みを説明してください",
    "Z世代の価値観と行動特性を分析し、この世代向けのマーケティング戦略を提案してください",
    "カーボンニュートラル実現に向けて、企業が取り組むべき具体的なアクションプランを作成してください",
    "デジタル化が進む中で失われつつある人間関係の質を向上させる方法を社会学的視点で考察してください",
    '新しいビジネスアイデアを考案してください',
    '気候変動に対する革新的な解決策を提案してください',
    '都市の交通渋滞を解消する方法を考えてください',
    'リモートワークの生産性を向上させる戦略を立ててください'
];

/**
 * SVG Icons used throughout the application
 */
window.ICONS = {
    // Document and content icons
    DOCUMENT: '<path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>',
    
    // Status icons
    LOADING: '<svg class="icon-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>',
    SPINNER: '<path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>',
    CHECK: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
    CIRCLE: '<path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>',
    CHECK_CIRCLE: '<path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"/>',
    
    // Alert icons
    ERROR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    EXCLAMATION_CIRCLE: '<path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>',
    WARNING: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    
    // Navigation icons
    CHEVRON_DOWN: '<path d="M7,10L12,15L17,10H7Z"/>'
};

/**
 * Environment Configuration
 * Determines API endpoints and features based on environment
 */
window.ENV_CONFIG = {
    // API Endpoints - automatically detect environment
    API_ENDPOINTS: {
        IO_INTELLIGENCE: (typeof window !== 'undefined' && (function () {
            try {
                const { protocol, hostname } = window.location;
                const isFile = protocol === 'file:';
                const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local');
                const isPrivateIPv4 = /^10\./.test(hostname) || /^192\.168\./.test(hostname) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);
                return isFile || isLocalHost || isPrivateIPv4;
            } catch (e) {
                return false;
            }
        })())
            ? 'http://localhost:3001/api/v1/chat/stream'
            : 'https://api.intelligence.io.solutions/api/v1/chat/stream'
    },

    // Feature flags
    FEATURES: {
        ENABLE_HISTORY: true,
        ENABLE_EXPORT: true,
        ENABLE_DARK_MODE: false,
        MAX_HISTORY_ITEMS: 50
    },

    // Debug settings - automatically detect debug mode
    DEBUG: (typeof window !== 'undefined' && (function () {
        try {
            const { protocol, hostname } = window.location;
            return protocol === 'file:' || hostname === 'localhost' || hostname === '127.0.0.1';
        } catch (e) {
            return false;
        }
    })())
};

/**
 * Create SVG icon element
 * @param {string} iconName - Name of the icon from ICONS constant
 * @returns {string} SVG icon HTML string
 */
function createSVGIcon(iconName) {
    return ICONS[iconName] || '';
}

/**
 * Simple Logger class for backwards compatibility
 */
class Logger {
    constructor(logLevel = 'info') {
        this.logLevel = logLevel;
    }
    
    debug(...args) {
        if (this.logLevel === 'debug' || window.APP_CONFIG.LOG_LEVEL === 'debug') {
            console.log('[DEBUG]', ...args);
        }
    }
    
    info(...args) {
        console.info('[INFO]', ...args);
    }
    
    warn(...args) {
        console.warn('[WARN]', ...args);
    }
    
    error(...args) {
        console.error('[ERROR]', ...args);
    }
}

/**
 * Simple Error Handler class
 */
class ErrorHandler {
    constructor(logger) {
        this.logger = logger || new Logger();
    }
    
    setupGlobalHandlers() {
        window.addEventListener('error', (event) => {
            this.logger.error('Global error:', event.error);
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            this.logger.error('Unhandled promise rejection:', event.reason);
        });
    }
    
    handle(error, context = '') {
        this.logger.error(context, error);
        return {
            message: error.message || 'An error occurred',
            type: error.name || 'Error'
        };
    }
}

/**
 * Custom Error Classes
 */
class CustomError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CustomError';
    }
}

class ValidationError extends Error {
    constructor(message, field) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
    }
}

class NetworkError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'NetworkError';
        this.status = status;
    }
}

// Make classes and functions available globally for backwards compatibility
if (typeof window !== 'undefined') {
    window.createSVGIcon = createSVGIcon;
    
    // Make classes available globally
    window.Logger = Logger;
    window.ErrorHandler = ErrorHandler;
    window.CustomError = CustomError;
    window.ValidationError = ValidationError;
    window.NetworkError = NetworkError;
    
    // Debug: Verify exports
    console.log('[config.js] Global exports verification:', {
        APP_CONFIG: !!window.APP_CONFIG,
        UI_STRINGS: !!window.UI_STRINGS,
        'UI_STRINGS.ERRORS': !!window.UI_STRINGS?.ERRORS,
        'UI_STRINGS.ERROR': window.UI_STRINGS?.ERROR,
        SAMPLE_PROMPTS: !!window.SAMPLE_PROMPTS,
        ICONS: !!window.ICONS,
        Logger: !!window.Logger,
        ValidationError: !!window.ValidationError
    });
    
    // Simple accessibility manager stub if not already defined
    if (!window.accessibilityManager) {
        window.accessibilityManager = {
            updateAria: (element, attributes) => {
                if (!element) return;
                Object.entries(attributes).forEach(([key, value]) => {
                    if (value === null || value === undefined) {
                        element.removeAttribute(key);
                    } else {
                        element.setAttribute(key, value);
                    }
                });
            },
            announce: (message, type = 'status') => {
                // Simple announcement using ARIA live regions
                const liveRegionId = type === 'error' ? 'error-announcements' : 'status-announcements';
                const liveRegion = document.getElementById(liveRegionId);
                if (liveRegion) {
                    liveRegion.textContent = message;
                    setTimeout(() => { liveRegion.textContent = ''; }, 1000);
                }
            },
            announceProgress: (stage, message, total) => {
                const progressRegion = document.getElementById('progress-announcements');
                if (progressRegion) {
                    progressRegion.textContent = `ステップ ${stage} / ${total}: ${message}`;
                }
            },
            updateButtonState: (button, state) => {
                if (!button) return;
                const states = {
                    loading: { 'aria-disabled': 'true', 'aria-busy': 'true' },
                    disabled: { 'aria-disabled': 'true', 'aria-busy': 'false' },
                    enabled: { 'aria-disabled': 'false', 'aria-busy': 'false' }
                };
                const attributes = states[state];
                if (attributes) {
                    window.accessibilityManager.updateAria(button, attributes);
                }
            }
        };
    }
}

// Export for CommonJS (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { APP_CONFIG, UI_STRINGS, SAMPLE_PROMPTS, ICONS, ENV_CONFIG, createSVGIcon };
}

console.log('Configuration loaded');
