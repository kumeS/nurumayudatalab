/**
 * なぜを4回問い続ける - 深層心理探求システム
 * LLMを活用した動的質問生成による自己探求ツール
 */

document.addEventListener('DOMContentLoaded', () => {
    // デバッグ設定
    const DEBUG_MODE = true; // プロダクション環境では false に設定
    const LOG_LEVELS = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3
    };
    let currentLogLevel = DEBUG_MODE ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN;

    // 詳細ログ機能
    function debugLog(level, component, message, data = null) {
        if (level < currentLogLevel) return;
        
        const timestamp = new Date().toISOString();
        const levelName = Object.keys(LOG_LEVELS)[level];
        const logMessage = `[${timestamp}] [${levelName}] [${component}] ${message}`;
        
        switch (level) {
            case LOG_LEVELS.DEBUG:
                console.debug(logMessage, data);
                break;
            case LOG_LEVELS.INFO:
                console.info(logMessage, data);
                break;
            case LOG_LEVELS.WARN:
                console.warn(logMessage, data);
                break;
            case LOG_LEVELS.ERROR:
                console.error(logMessage, data);
                break;
        }
        
        // デバッグモードでは詳細情報をローカルストレージに保存
        if (DEBUG_MODE) {
            try {
                const logs = JSON.parse(localStorage.getItem('deepWhy_debug_logs') || '[]');
                logs.push({
                    timestamp,
                    level: levelName,
                    component,
                    message,
                    data: data ? JSON.stringify(data) : null
                });
                
                // 最新の100件のみ保持
                if (logs.length > 100) {
                    logs.splice(0, logs.length - 100);
                }
                
                localStorage.setItem('deepWhy_debug_logs', JSON.stringify(logs));
            } catch (error) {
                console.warn('デバッグログの保存に失敗:', error);
            }
        }
    }

    // エラー情報の詳細化
    function logError(component, error, context = {}) {
        const errorInfo = {
            message: error.message,
            stack: error.stack,
            name: error.name,
            context
        };
        debugLog(LOG_LEVELS.ERROR, component, `エラーが発生: ${error.message}`, errorInfo);
    }

    // パフォーマンス計測
    const performanceTimers = {};
    
    function startTimer(timerName) {
        performanceTimers[timerName] = performance.now();
        debugLog(LOG_LEVELS.DEBUG, 'PERFORMANCE', `タイマー開始: ${timerName}`);
    }
    
    function endTimer(timerName) {
        if (performanceTimers[timerName]) {
            const duration = performance.now() - performanceTimers[timerName];
            debugLog(LOG_LEVELS.INFO, 'PERFORMANCE', `タイマー終了: ${timerName}`, { duration: `${duration.toFixed(2)}ms` });
            delete performanceTimers[timerName];
            return duration;
        }
        return null;
    }

    debugLog(LOG_LEVELS.INFO, 'SYSTEM', 'アプリケーション初期化開始');

    // グローバル変数
    let currentTheme = '';
    let questionLevel = 0;
    let conversationHistory = [];
    let customTheme = '';
    let isLLMMode = true; // LLM活用モード
    let sessionSaveEnabled = true; // セッション保存機能
    let currentScreen = 'introduction'; // 現在の画面状態

    debugLog(LOG_LEVELS.DEBUG, 'SYSTEM', 'グローバル変数初期化完了', {
        currentTheme,
        questionLevel,
        conversationHistoryLength: conversationHistory.length,
        isLLMMode,
        sessionSaveEnabled,
        currentScreen
    });

    // 画面状態管理用の関数
    function saveScreenState(screen) {
        currentScreen = screen;
        const screenState = {
            currentScreen: screen,
            timestamp: Date.now()
        };
        
        try {
            localStorage.setItem('nurumayuScreenState', JSON.stringify(screenState));
            debugLog(LOG_LEVELS.DEBUG, 'STATE', '画面状態を保存', { screen });
        } catch (error) {
            logError('STATE', error, { action: '画面状態保存', screen });
        }
    }

    function loadScreenState() {
        try {
            const saved = localStorage.getItem('nurumayuScreenState');
            if (saved) {
                const screenState = JSON.parse(saved);
                const timeDiff = Date.now() - screenState.timestamp;
                
                // 24時間以内の状態のみ復元
                if (timeDiff < 24 * 60 * 60 * 1000) {
                    debugLog(LOG_LEVELS.INFO, 'STATE', '画面状態を復元', screenState);
                    return screenState.currentScreen;
                } else {
                    debugLog(LOG_LEVELS.INFO, 'STATE', '保存された状態が古いため削除');
                    localStorage.removeItem('nurumayuScreenState');
                }
            }
        } catch (error) {
            logError('STATE', error, { action: '画面状態読み込み' });
        }
        return 'introduction';
    }

    function restoreScreenState() {
        const savedScreen = loadScreenState();
        debugLog(LOG_LEVELS.INFO, 'STATE', '画面状態復元開始', { savedScreen });
        
        // すべてのセクションを非表示
        if (introductionSection) introductionSection.style.display = 'none';
        if (fourQuestionsSection) fourQuestionsSection.style.display = 'none';
        if (themeSelection) themeSelection.style.display = 'none';
        if (questionSection) questionSection.style.display = 'none';
        if (completionSection) completionSection.style.display = 'none';
        
        // 保存された画面を表示
        switch(savedScreen) {
            case 'fourQuestions':
                if (fourQuestionsSection) {
                    fourQuestionsSection.style.display = 'block';
                    currentScreen = 'fourQuestions';
                }
                break;
            case 'themeSelection':
                if (themeSelection) {
                    themeSelection.style.display = 'block';
                    currentScreen = 'themeSelection';
                }
                break;
            case 'questioning':
                // 質問セッション中の場合は、セッション復元機能に委ねる
                if (questionSection) {
                    questionSection.style.display = 'none';
                    currentScreen = 'introduction';
                    if (introductionSection) introductionSection.style.display = 'block';
                }
                break;
            case 'completion':
                // 完了画面は復元せず、最初から開始
                currentScreen = 'introduction';
                if (introductionSection) introductionSection.style.display = 'block';
                break;
            default: // 'introduction'
                currentScreen = 'introduction';
                if (introductionSection) introductionSection.style.display = 'block';
                break;
        }
        
        debugLog(LOG_LEVELS.INFO, 'STATE', '画面状態復元完了', { currentScreen });
    }

    // 質問セクションの戻るボタン表示制御
    function showQuestionBackButton() {
        if (questionBackButtonContainer) {
            questionBackButtonContainer.style.display = 'block';
            debugLog(LOG_LEVELS.DEBUG, 'UI', '質問セクション戻るボタンを表示');
        }
    }

    function hideQuestionBackButton() {
        if (questionBackButtonContainer) {
            questionBackButtonContainer.style.display = 'none';
            debugLog(LOG_LEVELS.DEBUG, 'UI', '質問セクション戻るボタンを非表示');
        }
    }

    // テーマ選択に戻る関数
    function backToThemeSelection() {
        debugLog(LOG_LEVELS.INFO, 'UI', 'テーマ選択画面に戻る');
        
        try {
            if (questionSection) {
                questionSection.style.display = 'none';
                questionSection.classList.remove('active');
            }
            if (themeSelection) {
                themeSelection.style.display = 'block';
                themeSelection.scrollIntoView({ behavior: 'smooth' });
            }
            
            // 戻るボタンを非表示
            hideQuestionBackButton();
            
            // 画面状態を保存
            saveScreenState('themeSelection');
            
            // セッション状態をリセット
            currentTheme = '';
            questionLevel = 0;
            conversationHistory = [];
            customTheme = '';
            
            // UI要素をリセット
            if (conversationHistory_el) {
                conversationHistory_el.innerHTML = '';
            }
            if (answerInput) {
                answerInput.value = '';
            }
            if (progressFill) {
                progressFill.style.width = '0%';
            }
            if (progressText) {
                progressText.textContent = '質問 1/4';
            }
            
            debugLog(LOG_LEVELS.DEBUG, 'UI', 'テーマ選択画面への戻り完了');
        } catch (error) {
            logError('UI', error, { function: 'backToThemeSelection' });
        }
    }

    // DOM要素の取得
    const introductionSection = document.getElementById('introductionSection');
    const fourQuestionsSection = document.getElementById('fourQuestionsSection');
    const themeSelection = document.getElementById('themeSelection');
    const questionSection = document.getElementById('questionSection');
    const completionSection = document.getElementById('completionSection');
    const conversationHistory_el = document.getElementById('conversationHistory');
    const currentQuestion_el = document.getElementById('currentQuestion');
    const questionLevel_el = document.getElementById('questionLevel');
    const answerInput = document.getElementById('answerInput');
    const submitButton = document.getElementById('submitButton');
    const insightContent = document.getElementById('insightContent');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const mysteryButton = document.getElementById('mysteryButton');
    const proceedButton = document.getElementById('proceedButton');
    const questionBackButton = document.getElementById('questionBackButton');
    const questionBackButtonContainer = document.getElementById('questionBackButtonContainer');

    // DOM要素の存在チェック
    const domElements = {
        introductionSection, fourQuestionsSection, themeSelection, questionSection, 
        completionSection, conversationHistory_el, currentQuestion_el, questionLevel_el, 
        answerInput, submitButton, insightContent, loadingIndicator, progressFill, 
        progressText, mysteryButton, proceedButton, questionBackButton, questionBackButtonContainer
    };
    
    const missingElements = Object.entries(domElements)
        .filter(([name, element]) => !element)
        .map(([name]) => name);
    
    if (missingElements.length > 0) {
        debugLog(LOG_LEVELS.WARN, 'DOM', '一部のDOM要素が見つかりません', { missingElements });
    } else {
        debugLog(LOG_LEVELS.DEBUG, 'DOM', 'すべてのDOM要素が正常に取得されました');
    }

    // API設定
    const API_URL = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
    const MODEL_NAME = "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8";

    debugLog(LOG_LEVELS.INFO, 'CONFIG', 'API設定完了', {
        API_URL,
        MODEL_NAME
    });

    // 深層心理探求テーマ（21テーマ・4カテゴリ）
    const advancedThemes = {
        // 🌌 根源的・哲学的探求
        'existential': {
            title: '存在の意味',
            description: 'なぜあなたは存在しているのか - 生きる理由や存在する意味の根源的探求',
            initialPrompt: 'あなたが生きている理由や存在する意味について、まず思い浮かぶことを教えてください。'
        },
        'identity': {
            title: '自己同一性',
            description: 'あなたを「あなた」たらしめるもの - アイデンティティの核心を探る',
            initialPrompt: 'あなたを「あなた」たらしめているものは何だと思いますか？'
        },
        'values': {
            title: '価値観の起源',
            description: '価値観がどのように形成されたか - 信念や価値観の根源的起源',
            initialPrompt: 'あなたが最も大切にしている価値観は何ですか？'
        },
        'fears': {
            title: '恐れと不安',
            description: '恐れや不安の根本的原因 - 心の奥底にある恐怖心の正体',
            initialPrompt: 'あなたが最も恐れていることは何ですか？'
        },
        'suffering': {
            title: '苦悩の意味',
            description: 'なぜ苦しみが存在するのか - 困難や試練の存在論的意味',
            initialPrompt: 'あなたにとって苦しみとは何ですか？なぜ苦しみがあると思いますか？'
        },

        // 🏠 日常的・実践的探求
        'relationships': {
            title: '人間関係の根源',
            description: 'なぜ他者との関係を求めるのか - つながりの本質と孤独への恐れ',
            initialPrompt: 'なぜあなたは他の人とのつながりを求めるのでしょうか？'
        },
        'desires': {
            title: '欲望と願望',
            description: '欲望や願望の本質的動機 - 本当に望んでいることの発見',
            initialPrompt: 'あなたが心から望んでいることは何ですか？'
        },
        'happiness': {
            title: '幸せの定義',
            description: 'なぜそれを幸せだと感じるのか - 幸福感の個人的基準と起源',
            initialPrompt: 'あなたにとって幸せとは何ですか？なぜそれが幸せだと感じるのでしょうか？'
        },
        'habits': {
            title: '習慣と行動',
            description: 'なぜその行動を続けているのか - 無意識の行動パターンの探求',
            initialPrompt: 'あなたが日常的に続けている行動や習慣について、なぜそれを続けているのか教えてください。'
        },
        'stress': {
            title: 'ストレスの源泉',
            description: 'なぜそれがストレスになるのか - 心理的負荷の根本原因',
            initialPrompt: 'あなたが最もストレスを感じることは何ですか？なぜそれがストレスになるのでしょうか？'
        },
        'hobbies': {
            title: '趣味と興味',
            description: 'なぜそれに惹かれるのか - 関心や情熱の深層心理',
            initialPrompt: 'あなたが夢中になれることや興味を持っていることについて、なぜそれに魅力を感じるのか教えてください。'
        },

        // 💼 進路・キャリア探求
        'career': {
            title: '職業選択',
            description: 'なぜその仕事を選ぶのか - キャリア選択の真の動機と価値観',
            initialPrompt: 'あなたが選んだ（または選びたい）職業について、なぜその道を選ぶのか教えてください。'
        },
        'success': {
            title: '成功の定義',
            description: 'なぜそれを成功だと考えるのか - 個人的な成功指標の形成過程',
            initialPrompt: 'あなたにとって成功とは何ですか？なぜそれを成功だと考えるのでしょうか？'
        },
        'learning': {
            title: '学習動機',
            description: 'なぜ学び続けるのか - 知識欲や成長欲求の根源',
            initialPrompt: 'あなたが学び続ける理由は何ですか？なぜ新しいことを知りたいと思うのでしょうか？'
        },
        'work_meaning': {
            title: '働く意味',
            description: 'なぜ働くのか - 労働に対する根本的な価値観',
            initialPrompt: 'あなたにとって働くことの意味は何ですか？なぜ働く必要があると思うのでしょうか？'
        },
        'future_anxiety': {
            title: '将来への不安',
            description: 'なぜ将来を心配するのか - 未来に対する恐れと期待の探求',
            initialPrompt: 'あなたが将来について感じる不安や心配は何ですか？なぜそのようなことを心配するのでしょうか？'
        },
        'competition': {
            title: '競争心理',
            description: 'なぜ他者と比較するのか - 競争意識や承認欲求の深層分析',
            initialPrompt: 'あなたは他の人と自分を比較することがありますか？なぜ比較してしまうのでしょうか？'
        },

        // 🎭 人生の目的・使命探求
        'purpose': {
            title: '人生の目的',
            description: '人生における真の目的や使命 - ライフワークと存在意義の発見',
            initialPrompt: 'あなたの人生の目的は何だと思いますか？'
        },
        'contribution': {
            title: '社会貢献',
            description: 'なぜ社会に貢献したいのか - 利他的動機と自己実現の関係',
            initialPrompt: 'あなたは社会に貢献したいと思いますか？なぜそう思うのでしょうか？'
        },
        'creativity': {
            title: '創造性',
            description: 'なぜ何かを創り出したいのか - 創造欲求と表現衝動の源泉',
            initialPrompt: 'あなたは何かを創り出したい、表現したいという気持ちがありますか？なぜそう思うのでしょうか？'
        },
        'legacy': {
            title: '遺したいもの',
            description: 'なぜ後世に何かを遺したいのか - 永続性への願望と死への恐れ',
            initialPrompt: 'あなたが後世に遺したいものはありますか？なぜそれを遺したいと思うのでしょうか？'
        },

        'free_inquiry': {
            title: '自由探求',
            description: 'あなたが深く探求したい任意のテーマを設定できます',
            initialPrompt: null // カスタム入力
        }
    };

    // レベルごとの説明
    const levelDescriptions = [
        "第1の問い - 表面的な理由",
        "第2の問い - 個人的な動機", 
        "第3の問い - 深層の信念",
        "第4の問い - 存在の根源"
    ];

    // 初期化
    init();

    function init() {
        debugLog(LOG_LEVELS.INFO, 'INIT', '初期化プロセス開始');
        startTimer('initialization');
        
        try {
            setupThemeButtons();
            debugLog(LOG_LEVELS.DEBUG, 'INIT', 'テーマボタン設定完了');
            
            setupEventListeners();
            debugLog(LOG_LEVELS.DEBUG, 'INIT', 'イベントリスナー設定完了');
            
            createNotificationContainer();
            debugLog(LOG_LEVELS.DEBUG, 'INIT', '通知コンテナ作成完了');
            
            setupMobileOptimizations();
            debugLog(LOG_LEVELS.DEBUG, 'INIT', 'モバイル最適化設定完了');
            
            setupAccessibility();
            debugLog(LOG_LEVELS.DEBUG, 'INIT', 'アクセシビリティ設定完了');
            
            setupSessionManagement();
            debugLog(LOG_LEVELS.DEBUG, 'INIT', 'セッション管理設定完了');
            
            // セッション復元チェック（優先）
            checkForSavedSession();
            debugLog(LOG_LEVELS.DEBUG, 'INIT', '保存セッションチェック完了');
            
            // セッション復元されなかった場合のみ、画面状態復元
            setTimeout(() => {
                if (questionSection.style.display !== 'block') {
                    restoreScreenState();
                    debugLog(LOG_LEVELS.DEBUG, 'INIT', '画面状態復元完了');
                }
            }, 100);
            
            endTimer('initialization');
            debugLog(LOG_LEVELS.INFO, 'INIT', '初期化プロセス完了');
        } catch (error) {
            logError('INIT', error, { step: '初期化中' });
            endTimer('initialization');
        }
    }

    // モバイル最適化の設定
    function setupMobileOptimizations() {
        // iOS Safariでのviewport固定を防ぐ
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            document.addEventListener('touchstart', function() {}, { passive: true });
        }

        // Android Chromeでのズーム禁止
        document.addEventListener('gesturestart', function(e) {
            e.preventDefault();
        });

        // タッチフィードバックの改善
        document.addEventListener('touchstart', function(e) {
            if (e.target.classList.contains('theme-button') || 
                e.target.classList.contains('submit-button') || 
                e.target.classList.contains('restart-button')) {
                e.target.style.transform = 'scale(0.98)';
            }
        }, { passive: true });

        document.addEventListener('touchend', function(e) {
            if (e.target.classList.contains('theme-button') || 
                e.target.classList.contains('submit-button') || 
                e.target.classList.contains('restart-button')) {
                setTimeout(() => {
                    e.target.style.transform = '';
                }, 150);
            }
        }, { passive: true });

        // キーボード表示時のレイアウト調整
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleViewportResize);
        }
    }

    // ビューポート変更時の処理
    function handleViewportResize() {
        const viewport = window.visualViewport;
        if (viewport.height < window.innerHeight * 0.7) {
            // キーボードが表示されている
            document.body.style.height = `${viewport.height}px`;
            document.body.style.overflow = 'hidden';
        } else {
            // キーボードが非表示
            document.body.style.height = '';
            document.body.style.overflow = '';
        }
    }

    // アクセシビリティの設定
    function setupAccessibility() {
        // キーボードナビゲーション
        document.addEventListener('keydown', handleKeyboardNavigation);
        
        // ARIA live regionの更新を管理
        setupLiveRegions();
        
        // フォーカス管理
        setupFocusManagement();
    }

    // キーボードナビゲーション
    function handleKeyboardNavigation(e) {
        // Escキーでダイアログやモーダルを閉じる
        if (e.key === 'Escape') {
            handleEscapeKey();
        }
        
        // Tab キーでのフォーカス管理
        if (e.key === 'Tab') {
            handleTabNavigation(e);
        }
        
        // Enterキーでボタンアクティベーション
        if (e.key === 'Enter' && e.target.classList.contains('theme-button')) {
            e.preventDefault();
            e.target.click();
        }
    }

    // Escapeキーの処理
    function handleEscapeKey() {
        // 現在処理中の場合は処理を中断
        if (loadingIndicator && loadingIndicator.classList.contains('active')) {
            // 処理中断の処理
            showNotification('処理を中断しました', 'info');
        }
    }

    // Tabナビゲーションの処理
    function handleTabNavigation(e) {
        const focusableElements = document.querySelectorAll(
            'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        
        const focusArray = Array.from(focusableElements);
        const currentIndex = focusArray.indexOf(document.activeElement);
        
        // 最後の要素で前方タブの場合、最初の要素にフォーカス
        if (!e.shiftKey && currentIndex === focusArray.length - 1) {
            e.preventDefault();
            focusArray[0].focus();
        }
        // 最初の要素で後方タブの場合、最後の要素にフォーカス
        else if (e.shiftKey && currentIndex === 0) {
            e.preventDefault();
            focusArray[focusArray.length - 1].focus();
        }
    }

    // ライブリージョンの設定
    function setupLiveRegions() {
        // 進行状況アナウンス用のライブリージョン
        const progressAnnouncer = document.createElement('div');
        progressAnnouncer.id = 'progress-announcer';
        progressAnnouncer.className = 'sr-only';
        progressAnnouncer.setAttribute('aria-live', 'polite');
        progressAnnouncer.setAttribute('aria-atomic', 'true');
        document.body.appendChild(progressAnnouncer);
        
        // エラーアナウンス用のライブリージョン
        const errorAnnouncer = document.createElement('div');
        errorAnnouncer.id = 'error-announcer';
        errorAnnouncer.className = 'sr-only';
        errorAnnouncer.setAttribute('aria-live', 'assertive');
        errorAnnouncer.setAttribute('aria-atomic', 'true');
        document.body.appendChild(errorAnnouncer);
    }

    // フォーカス管理の設定
    function setupFocusManagement() {
        // セクション切り替え時のフォーカス管理
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const target = mutation.target;
                    if (target.style.display !== 'none' && target.classList.contains('active')) {
                        // 新しく表示されたセクションの最初のフォーカス可能要素にフォーカス
                        const firstFocusable = target.querySelector('button, input, textarea, [tabindex]:not([tabindex="-1"])');
                        if (firstFocusable) {
                            setTimeout(() => firstFocusable.focus(), 100);
                        }
                    }
                }
            });
        });
        
        // 質問セクションと完了セクションを監視
        if (questionSection) {
            observer.observe(questionSection, { attributes: true, attributeFilter: ['style'] });
        }
        if (completionSection) {
            observer.observe(completionSection, { attributes: true, attributeFilter: ['style'] });
        }
    }

    // プログレス更新時にスクリーンリーダーにアナウンス
    function announceProgress(level) {
        const announcer = document.getElementById('progress-announcer');
        if (announcer) {
            announcer.textContent = `${levelDescriptions[level]}に進みました。現在${level + 1}問目です。`;
        }
    }

    // エラーをスクリーンリーダーにアナウンス
    function announceError(message) {
        const announcer = document.getElementById('error-announcer');
        if (announcer) {
            announcer.textContent = `エラー: ${message}`;
        }
    }

    // スクリーンリーダー向けアナウンス
    function announceToScreenReader(message) {
        const liveRegion = document.getElementById('navigation-announcements');
        if (liveRegion) {
            liveRegion.textContent = message;
            // 少し遅れてクリアする
            setTimeout(() => {
                liveRegion.textContent = '';
            }, 3000);
        }
    }

    // 通知コンテナを作成
    function createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notificationContainer';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    // 通知表示機能
    function showNotification(message, type = 'info', duration = 4000) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            background: ${getNotificationColor(type)};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            pointer-events: auto;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            font-size: 14px;
            max-width: 300px;
            word-wrap: break-word;
        `;
        notification.textContent = message;

        const container = document.getElementById('notificationContainer');
        container.appendChild(notification);

        // アニメーション表示
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 10);

        // 自動削除
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }

    // 通知の色を取得
    function getNotificationColor(type) {
        const colors = {
            'info': '#70a0ff',
            'success': '#27ae60',
            'warning': '#f39c12',
            'error': '#e74c3c'
        };
        return colors[type] || colors.info;
    }

    // テーマボタンの設定
    function setupThemeButtons() {
        const themeButtonsContainer = document.querySelector('.theme-buttons');
        if (!themeButtonsContainer) return;

        themeButtonsContainer.innerHTML = '';
        
        // テーマをカテゴリー別に分類（README.mdの4カテゴリに準拠）
        const themeCategories = {
            'philosophical': {
                title: '🌌 根源的・哲学的探求',
                themes: ['existential', 'identity', 'values', 'fears', 'suffering']
            },
            'daily': {
                title: '🏠 日常的・実践的探求',
                themes: ['relationships', 'desires', 'happiness', 'habits', 'stress', 'hobbies']
            },
            'career': {
                title: '💼 進路・キャリア探求',
                themes: ['career', 'success', 'learning', 'work_meaning', 'future_anxiety', 'competition']
            },
            'purpose': {
                title: '🎭 人生の目的・使命探求',
                themes: ['purpose', 'contribution', 'creativity', 'legacy']
            },
            'custom': {
                title: '✨ 自由探求',
                themes: ['free_inquiry']
            }
        };

        // カテゴリーごとにセクションを作成
        Object.entries(themeCategories).forEach(([categoryKey, category]) => {
            // カテゴリータイトル
            const categoryTitle = document.createElement('h3');
            categoryTitle.className = 'theme-category-title';
            categoryTitle.textContent = category.title;
            categoryTitle.style.cssText = `
                color: #70a0ff;
                font-size: 1.1rem;
                font-weight: 500;
                margin: 2rem 0 1rem 0;
                text-align: center;
                letter-spacing: 0.1em;
                border-bottom: 1px solid rgba(112,160,255,0.3);
                padding-bottom: 0.5rem;
            `;
            themeButtonsContainer.appendChild(categoryTitle);

            // カテゴリー内のテーマボタン
            category.themes.forEach(themeKey => {
                const theme = advancedThemes[themeKey];
                if (theme) {
                    const button = document.createElement('button');
                    button.className = 'theme-button';
                    button.onclick = () => startQuestioning(themeKey);
                    button.setAttribute('aria-describedby', `theme-desc-${themeKey}`);
                    button.setAttribute('type', 'button');
                    
                    button.innerHTML = `
                        <h3>${theme.title}</h3>
                        <p id="theme-desc-${themeKey}">${theme.description}</p>
                    `;
                    
                    themeButtonsContainer.appendChild(button);
                }
            });
        });
    }

    // イベントリスナーの設定
    function setupEventListeners() {
        debugLog(LOG_LEVELS.DEBUG, 'EVENT', 'イベントリスナー設定開始');
        
        try {
            // Enterキーで送信
            if (answerInput) {
                answerInput.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        submitAnswer();
                    }
                });
            }

            // 送信ボタン
            if (submitButton) {
                submitButton.onclick = submitAnswer;
            }

            // リスタートボタン
            const restartButton = document.getElementById('restartButton');
            if (restartButton) {
                restartButton.onclick = restart;
            }

            // 新しいUIフロー用のイベントリスナー
            if (mysteryButton) {
                mysteryButton.addEventListener('click', showFourQuestions);
            }
            
            if (proceedButton) {
                proceedButton.addEventListener('click', showThemeSelection);
            }

            // 戻るボタンのイベントリスナー
            const backToQuestionsButton = document.getElementById('backToQuestionsButton');
            if (backToQuestionsButton) {
                backToQuestionsButton.addEventListener('click', backToFourQuestions);
            }

            // 質問セクションの戻るボタン
            if (questionBackButton) {
                questionBackButton.addEventListener('click', backToThemeSelection);
            }
            
            // 4つの問いカードのクリックイベント
            const questionCards = document.querySelectorAll('.question-card');
            questionCards.forEach(card => {
                card.addEventListener('click', () => {
                    const level = card.dataset.level;
                    debugLog(LOG_LEVELS.INFO, 'UI', `問い${level}カードがクリックされました`);
                    showQuestionDetail(level);
                });
            });

            debugLog(LOG_LEVELS.INFO, 'EVENT', 'イベントリスナー設定完了');
        } catch (error) {
            logError('EVENT', error, { function: 'setupEventListeners' });
        }
    }

    // 導入画面から4つの問い画面へ
    function showFourQuestions() {
        debugLog(LOG_LEVELS.INFO, 'UI', '4つの問い画面を表示');
        
        try {
            if (introductionSection) {
                introductionSection.style.display = 'none';
            }
            if (fourQuestionsSection) {
                fourQuestionsSection.style.display = 'block';
                fourQuestionsSection.scrollIntoView({ behavior: 'smooth' });
            }
            
            // 画面状態を保存
            saveScreenState('fourQuestions');
            
            debugLog(LOG_LEVELS.DEBUG, 'UI', '4つの問い画面表示完了');
            
            // アクセシビリティのアナウンス
            setTimeout(() => {
                const announcement = '4つの探求の階層が表示されました。各カードをクリックして詳細を確認できます。';
                announceToScreenReader(announcement);
            }, 500);
        } catch (error) {
            logError('UI', error, { function: 'showFourQuestions' });
        }
    }

    // 4つの問い画面からテーマ選択画面へ
    function showThemeSelection() {
        debugLog(LOG_LEVELS.INFO, 'UI', 'テーマ選択画面を表示');
        
        try {
            if (fourQuestionsSection) {
                fourQuestionsSection.style.display = 'none';
            }
            if (themeSelection) {
                themeSelection.style.display = 'block';
                themeSelection.scrollIntoView({ behavior: 'smooth' });
            }
            
            // 画面状態を保存
            saveScreenState('themeSelection');
            
            debugLog(LOG_LEVELS.DEBUG, 'UI', 'テーマ選択画面表示完了');
            
            // アクセシビリティのアナウンス
            setTimeout(() => {
                const announcement = 'テーマ選択画面に移動しました。探求したいテーマを選択してください。';
                announceToScreenReader(announcement);
            }, 500);
        } catch (error) {
            logError('UI', error, { function: 'showThemeSelection' });
        }
    }

    // テーマ選択画面から4つの問い画面に戻る
    function backToFourQuestions() {
        debugLog(LOG_LEVELS.INFO, 'UI', '4つの問い画面に戻る');
        
        try {
            if (themeSelection) {
                themeSelection.style.display = 'none';
            }
            if (fourQuestionsSection) {
                fourQuestionsSection.style.display = 'block';
                fourQuestionsSection.scrollIntoView({ behavior: 'smooth' });
            }
            
            // 画面状態を保存
            saveScreenState('fourQuestions');
            
            debugLog(LOG_LEVELS.DEBUG, 'UI', '4つの問い画面への戻り完了');
            
            // アクセシビリティのアナウンス
            setTimeout(() => {
                const announcement = '4つの探求の階層画面に戻りました。各カードをクリックして詳細を確認できます。';
                announceToScreenReader(announcement);
            }, 500);
        } catch (error) {
            logError('UI', error, { function: 'backToFourQuestions' });
        }
    }

    // 問いカードクリック時の詳細表示
    function showQuestionDetail(level) {
        debugLog(LOG_LEVELS.INFO, 'UI', `問い${level}の詳細を表示`);
        
        const questionDetails = {
            '1': {
                title: '第1の問い - 表面的な理由',
                description: '意識的に認識している、社会的に受け入れられやすい理由を探ります。',
                example: '例: 「なぜその仕事を選びたいのですか？」\n→「給料が良いから」「安定しているから」',
                features: '• すぐに答えられる\n• 社会的に適切とされる理由\n• 合理的で論理的\n• 他者への説明で使う理由'
            },
            '2': {
                title: '第2の問い - 個人的な動機', 
                description: 'あなた個人の体験や価値観に根ざした、より深い動機を探ります。',
                example: '例: 「なぜあなたにとって安定が重要なのですか？」\n→「子供の頃、家庭が不安定で不安だった」',
                features: '• 個人的な体験に基づく\n• 感情的な要素が含まれる\n• 他者とは異なる固有の理由\n• 少し話しにくい部分もある'
            },
            '3': {
                title: '第3の問い - 深層の信念',
                description: '無意識レベルで形成された根深い信念や価値観を探ります。',
                example: '例: 「なぜ不安定さを恐れるのですか？」\n→「予測できない事態は危険だと思い込んでいる」',
                features: '• 無意識の信念システム\n• 疑問視したことがない前提\n• 幼少期の形成体験\n• 文化的・社会的な刷り込み'
            },
            '4': {
                title: '第4の問い - 存在の根源',
                description: '存在そのものに関わる根源的で哲学的な探求を行います。多くの人が言葉に詰まり、思考の限界に直面します。',
                example: '例: 「なぜあなたという存在がそのように感じるのですか？」\n→「わからない...」「人間だから？」',
                features: '• 言語化が困難\n• 論理的説明の限界\n• 存在論的・哲学的な次元\n• 「わからない」も貴重な回答'
            }
        };

        const detail = questionDetails[level];
        if (detail) {
            // より詳細なモーダル風の表示
            const message = `${detail.title}\n\n${detail.description}\n\n特徴:\n${detail.features}\n\n${detail.example}`;
            
            // カスタムモーダルを作成して表示
            showCustomModal(detail.title, detail.description, detail.features, detail.example);
            
            debugLog(LOG_LEVELS.DEBUG, 'UI', `問い${level}詳細表示完了`);
        }
    }

    // カスタムモーダル表示関数
    function showCustomModal(title, description, features, example) {
        // モーダルHTML作成
        const modalHtml = `
            <div class="modal-overlay" style="
                position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                background: rgba(0,0,0,0.8); 
                display: flex; align-items: center; justify-content: center; 
                z-index: 1000; backdrop-filter: blur(10px);
            " onclick="this.remove()">
                <div class="modal-content" style="
                    background: linear-gradient(135deg, rgba(30,30,40,0.95) 0%, rgba(20,20,30,0.95) 100%);
                    border: 1px solid rgba(112,160,255,0.3);
                    border-radius: 20px;
                    padding: 2rem;
                    max-width: 600px;
                    max-height: 80vh;
                    overflow-y: auto;
                    margin: 1rem;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                " onclick="event.stopPropagation()">
                    <h3 style="
                        color: #70a0ff; 
                        margin-bottom: 1rem; 
                        font-size: 1.4rem;
                        font-weight: 400;
                    ">${title}</h3>
                    <p style="
                        color: #e0e0e0; 
                        margin-bottom: 1.5rem; 
                        line-height: 1.6;
                        font-size: 1rem;
                    ">${description}</p>
                    <div style="
                        background: rgba(112,160,255,0.1);
                        border-left: 3px solid #70a0ff;
                        padding: 1rem;
                        margin-bottom: 1.5rem;
                        border-radius: 0 10px 10px 0;
                    ">
                        <h4 style="color: #70a0ff; margin-bottom: 0.5rem; font-size: 1rem;">特徴:</h4>
                        <div style="color: #c0c0c0; white-space: pre-line; font-size: 0.9rem;">${features}</div>
                    </div>
                    <div style="
                        background: rgba(255,255,255,0.05);
                        padding: 1rem;
                        border-radius: 10px;
                        margin-bottom: 1.5rem;
                    ">
                        <div style="color: #c0c0c0; white-space: pre-line; font-size: 0.9rem; line-height: 1.5;">${example}</div>
                    </div>
                    <button style="
                        background: linear-gradient(135deg, #70a0ff 0%, #4080ff 100%);
                        border: none;
                        color: white;
                        padding: 0.8rem 2rem;
                        border-radius: 25px;
                        cursor: pointer;
                        font-size: 1rem;
                        width: 100%;
                        transition: all 0.3s ease;
                    " onclick="this.closest('.modal-overlay').remove()">閉じる</button>
                </div>
            </div>
        `;
        
        // モーダルをページに追加
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // 質問セッション開始
    async function startQuestioning(theme) {
        debugLog(LOG_LEVELS.INFO, 'SESSION', '質問セッション開始', { theme });
        startTimer('sessionStart');
        
        try {
            currentTheme = theme;
            questionLevel = 0;
            conversationHistory = [];
            
            debugLog(LOG_LEVELS.DEBUG, 'SESSION', 'セッション変数初期化完了', {
                currentTheme,
                questionLevel,
                conversationHistoryLength: conversationHistory.length
            });
            
            if (theme === 'free_inquiry') {
                debugLog(LOG_LEVELS.DEBUG, 'SESSION', '自由探求モード: カスタムテーマ入力を要求');
                customTheme = prompt('探求したいテーマや質問を入力してください：\n例：「なぜ私は愛されたいと思うのか」「なぜ私は成功を恐れるのか」');
                
                if (!customTheme || customTheme.trim() === '') {
                    debugLog(LOG_LEVELS.WARN, 'SESSION', 'カスタムテーマが入力されませんでした');
                    showNotification('テーマが入力されませんでした。', 'warning');
                    return;
                }
                if (customTheme.length < 5) {
                    debugLog(LOG_LEVELS.WARN, 'SESSION', 'カスタムテーマが短すぎます', { length: customTheme.length });
                    showNotification('テーマをもう少し詳しく入力してください。', 'warning');
                    return;
                }
                
                debugLog(LOG_LEVELS.INFO, 'SESSION', 'カスタムテーマ設定完了', { 
                    customTheme: customTheme.substring(0, 50) + (customTheme.length > 50 ? '...' : '') 
                });
            }
            
            // UI切り替え
            debugLog(LOG_LEVELS.DEBUG, 'UI', 'UI切り替え開始: テーマ選択 → 質問セクション');
            if (introductionSection) introductionSection.style.display = 'none';
            if (fourQuestionsSection) fourQuestionsSection.style.display = 'none';
            if (themeSelection) themeSelection.style.display = 'none';
            if (questionSection) {
                questionSection.style.display = 'block';
                questionSection.classList.add('active');
            }
            
            // 画面状態を保存
            saveScreenState('questioning');
            
            debugLog(LOG_LEVELS.DEBUG, 'UI', 'UI切り替え完了');
            
            // 最初の質問を生成
            await generateFirstQuestion();
            
            // 戻るボタンを表示（質問1/4の時のみ）
            showQuestionBackButton();
            
            endTimer('sessionStart');
            debugLog(LOG_LEVELS.INFO, 'SESSION', '質問セッション開始完了');
        } catch (error) {
            logError('SESSION', error, { theme, step: 'セッション開始中' });
            endTimer('sessionStart');
        }
    }

    // 最初の質問を生成
    async function generateFirstQuestion() {
        const theme = advancedThemes[currentTheme];
        let questionText;

        if (currentTheme === 'free_inquiry') {
            questionText = customTheme;
        } else {
            questionText = theme.initialPrompt;
        }

        displayQuestion(questionText);
    }

    // プログレスインジケータ更新
    function updateProgress() {
        const currentStep = questionLevel + 1;
        const totalSteps = 4;
        const percentage = (currentStep / totalSteps) * 100;
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        if (progressText) {
            progressText.textContent = `質問 ${currentStep}/4`;
        }
        
        // プログレス更新をアナウンス
        announceProgress(questionLevel);
        
        // プログレスバーの aria-valuenow を更新
        const progressContainer = document.querySelector('.progress-container');
        if (progressContainer) {
            progressContainer.setAttribute('aria-valuenow', currentStep);
        }
    }

    // 質問を表示
    function displayQuestion(questionText) {
        if (currentQuestion_el) {
            currentQuestion_el.textContent = questionText;
        }
        if (questionLevel_el) {
            questionLevel_el.textContent = levelDescriptions[questionLevel];
        }
        if (answerInput) {
            answerInput.value = '';
            answerInput.focus();
        }
        
        // プログレス更新
        updateProgress();
    }

    // 回答送信
    async function submitAnswer() {
        debugLog(LOG_LEVELS.INFO, 'ANSWER', '回答送信開始');
        startTimer('answerSubmission');
        
        if (!answerInput) {
            debugLog(LOG_LEVELS.ERROR, 'ANSWER', 'answerInput要素が見つかりません');
            return;
        }
        
        const answer = answerInput.value.trim();
        
        debugLog(LOG_LEVELS.DEBUG, 'ANSWER', '回答内容を取得', {
            answerLength: answer.length,
            questionLevel,
            currentTheme
        });
        
        if (!answer) {
            debugLog(LOG_LEVELS.WARN, 'ANSWER', '空の回答が送信されました');
            showNotification('回答を入力してください。', 'warning');
            answerInput.focus();
            return;
        }

        // 送信ボタンを無効化とローディング表示
        debugLog(LOG_LEVELS.DEBUG, 'UI', 'UI状態を処理中に変更');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = '処理中...';
        }
        if (loadingIndicator && questionLevel < 3) {
            loadingIndicator.classList.add('active');
        }

        try {
            // 回答を履歴に追加
            const questionText = currentQuestion_el ? currentQuestion_el.textContent : '';
            const historyItem = {
                question: questionText,
                answer: answer,
                level: questionLevel
            };
            
            conversationHistory.push(historyItem);
            
            debugLog(LOG_LEVELS.INFO, 'ANSWER', '回答を履歴に追加', {
                questionText: questionText.substring(0, 100) + (questionText.length > 100 ? '...' : ''),
                answerText: answer.substring(0, 100) + (answer.length > 100 ? '...' : ''),
                level: questionLevel,
                totalHistoryItems: conversationHistory.length
            });

            // 履歴を表示
            updateConversationHistory();
            debugLog(LOG_LEVELS.DEBUG, 'UI', '会話履歴UI更新完了');

            // セッションを保存
            saveCurrentSession();
            debugLog(LOG_LEVELS.DEBUG, 'SESSION', 'セッション保存完了');

            // 次のレベルへ
            questionLevel++;
            debugLog(LOG_LEVELS.INFO, 'ANSWER', `質問レベル更新: ${questionLevel - 1} → ${questionLevel}`);
            
            // 質問レベルが1以上になったら戻るボタンを非表示
            if (questionLevel >= 1) {
                hideQuestionBackButton();
            }

            if (questionLevel >= 4) {
                // 4回の質問が完了 - 深層分析を実行
                debugLog(LOG_LEVELS.INFO, 'ANALYSIS', '4回の質問完了 - 深層分析を開始');
                showNotification('探求完了！深層心理分析を生成中...', 'success');
                startTimer('psychologicalAnalysis');
                await performPsychologicalAnalysis();
                endTimer('psychologicalAnalysis');
            } else {
                // 回答の質を評価
                debugLog(LOG_LEVELS.DEBUG, 'QUALITY', '回答品質評価を開始');
                const qualityCheck = await evaluateAnswerQuality(answer);
                
                debugLog(LOG_LEVELS.DEBUG, 'QUALITY', '回答品質評価完了', qualityCheck);
                
                if (qualityCheck.needsDeepening) {
                    // より深い探求を促す
                    debugLog(LOG_LEVELS.INFO, 'QUESTION', '表面的回答と判定 - 深掘り質問を生成');
                    await generateDeepeningQuestion(answer, qualityCheck.suggestion);
                } else {
                    // 次の質問をLLMで生成
                    debugLog(LOG_LEVELS.INFO, 'QUESTION', 'LLMで次の質問を生成');
                    startTimer('questionGeneration');
                    await generateNextQuestion(answer);
                    endTimer('questionGeneration');
                }
            }
            
            endTimer('answerSubmission');
            debugLog(LOG_LEVELS.INFO, 'ANSWER', '回答送信プロセス完了');
        } catch (error) {
            logError('ANSWER', error, {
                answerLength: answer.length,
                questionLevel,
                currentTheme,
                step: '回答処理中'
            });
            
            // エラータイプに応じたメッセージ
            let errorMessage = 'エラーが発生しました。';
            if (error.message.includes('fetch')) {
                errorMessage = '接続に問題があります。インターネット接続を確認してください。';
            } else if (error.message.includes('timeout')) {
                errorMessage = '処理に時間がかかっています。しばらく待ってから再度お試しください。';
            } else if (error.message.includes('API')) {
                errorMessage = 'AIサービスに一時的な問題があります。しばらく待ってから再度お試しください。';
            }
            
            debugLog(LOG_LEVELS.ERROR, 'ANSWER', `エラーメッセージ決定: ${errorMessage}`);
            showNotification(errorMessage, 'error', 6000);
            announceError(errorMessage);
            endTimer('answerSubmission');
        } finally {
            // 送信ボタンを有効化とローディング非表示
            debugLog(LOG_LEVELS.DEBUG, 'UI', 'UI状態を通常に戻す');
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = '答える';
            }
            if (loadingIndicator) {
                loadingIndicator.classList.remove('active');
            }
        }
    }

    // 回答の質を評価
    async function evaluateAnswerQuality(answer) {
        // 簡易的な質の評価（表面的な回答かどうか）
        const shallowIndicators = [
            /^(はい|いいえ|そうです|そうではない)/,
            /^.{1,20}$/,  // 20文字以下
            /^(普通|特に|別に|なんとなく|よくわからない)/,
            /^(お金|給料|収入)/,  // 表面的な動機
        ];

        const isShallow = shallowIndicators.some(pattern => pattern.test(answer));
        
        return {
            needsDeepening: isShallow,
            suggestion: isShallow ? "より具体的で深い内容" : null
        };
    }

    // より深い探求を促す質問を生成
    async function generateDeepeningQuestion(answer, suggestion) {
        const deepeningPrompts = [
            `「${answer}」について、もう少し詳しく聞かせてください。なぜそう感じるのでしょうか？`,
            `「${answer}」という答えの背景には、どのような体験や思いがありますか？`,
            `「${answer}」と感じるようになったきっかけや原因は何だと思いますか？`,
            `「${answer}」ということについて、さらに深く考えてみてください。本当の理由は何でしょうか？`
        ];

        const question = deepeningPrompts[Math.floor(Math.random() * deepeningPrompts.length)];
        
        // レベルを戻して再度質問
        questionLevel--;
        displayQuestion(question);
    }

    // 次の質問をLLMで生成
    async function generateNextQuestion(previousAnswer) {
        const prompt = createQuestionGenerationPrompt(previousAnswer);
        
        try {
            const response = await callLLM(prompt);
            const nextQuestion = parseQuestionFromResponse(response);
            displayQuestion(nextQuestion);
        } catch (error) {
            console.error('質問生成エラー:', error);
            // フォールバック: 固定質問を使用
            displayFallbackQuestion(previousAnswer);
        }
    }

    // 質問生成用プロンプト作成
    function createQuestionGenerationPrompt(previousAnswer) {
        const context = conversationHistory.map(item => 
            `Q${item.level + 1}: ${item.question}\nA${item.level + 1}: ${item.answer}`
        ).join('\n\n');

        const levelNames = [
            "表面的な理由を深掘りし、より根本的な動機",
            "個人的な体験や価値観の形成過程", 
            "信念や価値観の根源的な起源",
            "存在論的・哲学的な本質"
        ];

        const currentLevelDescription = levelNames[questionLevel - 1] || "深層心理";

        return `あなたは深層心理学の専門家です。以下の会話履歴を分析し、回答者の${currentLevelDescription}に迫る鋭い質問を1つだけ生成してください。

会話履歴:
${context}

最新の回答: "${previousAnswer}"

質問生成の指針:
- 第${questionLevel + 1}レベルの質問として、より深層に迫る内容にする
- 回答者が無意識に持っている前提や価値観を問う
- 「なぜ」を基調とした問いかけにする
- 哲学的・実存的な視点を含める
- 回答者が困惑し、深く考え込むような質問にする
- 質問のみを出力し、説明や前置きは不要

質問:`;
    }

    // LLM応答から質問を抽出
    function parseQuestionFromResponse(response) {
        // "質問:" の後の部分を抽出するか、全体を質問として扱う
        const lines = response.split('\n').filter(line => line.trim());
        const questionLine = lines.find(line => line.includes('質問:')) || lines[lines.length - 1];
        
        return questionLine.replace(/^質問:\s*/, '').trim();
    }

    // フォールバック質問
    function displayFallbackQuestion(previousAnswer) {
        const fallbackQuestions = [
            `なぜ「${previousAnswer.substring(0, 30)}...」が、あなたにとって重要なのですか？`,
            `なぜあなたはそのような考えを持つようになったのですか？`,
            `なぜあなたは、そもそもそのような価値観を持っているのですか？`,
            `なぜあなたという存在がそのように感じるのですか？`
        ];

        const question = fallbackQuestions[questionLevel - 1] || fallbackQuestions[3];
        displayQuestion(question);
    }

    // 会話履歴を更新
    function updateConversationHistory() {
        if (!conversationHistory_el) return;
        
        conversationHistory_el.innerHTML = '';
        
        conversationHistory.forEach((item, index) => {
            const qaPair = document.createElement('div');
            qaPair.className = 'qa-pair';
            qaPair.style.animationDelay = `${index * 0.1}s`;
            
            qaPair.innerHTML = `
                <div class="question">${item.question}</div>
                <div class="answer">${item.answer}</div>
            `;
            
            conversationHistory_el.appendChild(qaPair);
        });
    }

    // 深層心理分析を実行
    async function performPsychologicalAnalysis() {
        const analysisPrompt = createAnalysisPrompt();
        
        try {
            const analysis = await callLLM(analysisPrompt);
            showCompletion(analysis);
        } catch (error) {
            console.error('分析エラー:', error);
            showCompletion(generateFallbackAnalysis());
        }
    }

    // 分析用プロンプト作成
    function createAnalysisPrompt() {
        const context = conversationHistory.map(item => 
            `Q${item.level + 1}: ${item.question}\nA${item.level + 1}: ${item.answer}`
        ).join('\n\n');

        return `あなたは深層心理学の専門家です。以下の4段階の質問と回答を分析し、この人の深層心理を洞察してください。

探求テーマ: ${advancedThemes[currentTheme]?.title || 'カスタムテーマ'}

会話履歴:
${context}

以下の構造で分析結果を出力してください:

## 心理的パターンの分析
この人の回答に見られる心理的傾向や無意識のパターンを指摘してください。

## 根源的動機の解明  
4つの質問を通じて明らかになった、この人の根源的な動機や価値観の起源を分析してください。

## 自己理解への洞察
この探求によって、この人が自分自身について新たに気づけることを指摘してください。

## 成長への示唆
この気づきを踏まえて、さらなる自己成長や人生の充実に向けた示唆を提供してください。

分析は共感的で建設的な視点から行い、批判的ではなく理解促進を重視してください。`;
    }

    // フォールバック分析
    function generateFallbackAnalysis() {
        return `## 心理的パターンの分析
あなたの回答からは、自己への深い洞察を求める姿勢が感じられます。

## 根源的動機の解明
4つの質問を通じて、あなたの価値観や行動の根底にある動機が明らかになりました。

## 自己理解への洞察
この探求により、普段意識していない自分自身の側面に気づくことができました。

## 成長への示唆
この気づきを大切にし、さらなる自己理解を深めることで、より充実した人生を歩むことができるでしょう。`;
    }

    // 完了画面を表示
    function showCompletion(analysis) {
        if (questionSection) {
            questionSection.style.display = 'none';
            questionSection.classList.remove('active');
        }
        if (completionSection) {
            completionSection.style.display = 'block';
            completionSection.classList.add('active');
        }
        
        // 画面状態を保存
        saveScreenState('completion');
        
        generateInsight(analysis);
    }

    // 洞察を生成・表示
    function generateInsight(analysis) {
        if (!insightContent) return;
        
        let insight = '<h3>あなたの探求の軌跡</h3>';
        insight += '<div class="response-journey">';
        
        conversationHistory.forEach((item, index) => {
            const levelName = levelDescriptions[index].split(' - ')[1];
            insight += `
                <div class="journey-item">
                    <h4>${levelName}</h4>
                    <p class="journey-question">${item.question}</p>
                    <p class="journey-answer">"${item.answer}"</p>
                </div>
            `;
        });
        
        insight += '</div>';
        
        // LLM分析結果を追加
        insight += '<div class="psychological-analysis">';
        insight += '<h3>深層心理分析</h3>';
        insight += analysis.replace(/\n/g, '<br>').replace(/##\s*/g, '<h4>').replace(/<h4>/g, '</p><h4>').replace(/^<\/p>/, '');
        insight += '</div>';
        
        insightContent.innerHTML = insight;
    }

    // LLM API呼び出し
    async function callLLM(prompt) {
        debugLog(LOG_LEVELS.INFO, 'LLM', 'API呼び出し開始');
        startTimer('llmApiCall');
        
        const requestData = {
            model: MODEL_NAME,
            temperature: 0.8,
            stream: false,
            max_completion_tokens: 1000,
            messages: [
                { role: "system", content: "あなたは深層心理学の専門家として、人々の自己理解を深める手助けをします。共感的で洞察に富んだ質問や分析を提供してください。" },
                { role: "user", content: prompt }
            ]
        };

        debugLog(LOG_LEVELS.DEBUG, 'LLM', 'リクエストデータ準備完了', {
            model: requestData.model,
            temperature: requestData.temperature,
            max_completion_tokens: requestData.max_completion_tokens,
            promptLength: prompt.length,
            messagesCount: requestData.messages.length
        });

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            debugLog(LOG_LEVELS.DEBUG, 'LLM', 'API応答受信', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            });

            if (!response.ok) {
                const errorText = await response.text();
                debugLog(LOG_LEVELS.ERROR, 'LLM', `API呼び出し失敗: ${response.status}`, {
                    status: response.status,
                    statusText: response.statusText,
                    errorText
                });
                throw new Error(`API request failed: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            
            debugLog(LOG_LEVELS.DEBUG, 'LLM', 'レスポンスデータ解析完了', {
                hasChoices: !!(data.choices && data.choices.length > 0),
                hasAnswer: !!data.answer,
                dataKeys: Object.keys(data)
            });
            
            let responseContent = null;
            if (data.choices && data.choices.length > 0 && data.choices[0].message) {
                responseContent = data.choices[0].message.content;
                debugLog(LOG_LEVELS.INFO, 'LLM', 'choices形式で応答取得成功', {
                    contentLength: responseContent.length
                });
            } else if (data.answer) {
                responseContent = data.answer;
                debugLog(LOG_LEVELS.INFO, 'LLM', 'answer形式で応答取得成功', {
                    contentLength: responseContent.length
                });
            } else {
                debugLog(LOG_LEVELS.ERROR, 'LLM', '予期しないレスポンス形式', data);
                throw new Error('Unexpected API response format');
            }
            
            endTimer('llmApiCall');
            debugLog(LOG_LEVELS.INFO, 'LLM', 'API呼び出し完了');
            return responseContent;
            
        } catch (error) {
            endTimer('llmApiCall');
            logError('LLM', error, {
                apiUrl: API_URL,
                modelName: MODEL_NAME,
                promptLength: prompt.length
            });
            throw error;
        }
    }

    // リスタート
    function restart() {
        debugLog(LOG_LEVELS.INFO, 'SESSION', 'アプリケーションリスタート開始');
        
        try {
            // 全てのセクションを非表示
            if (completionSection) {
                completionSection.style.display = 'none';
                completionSection.classList.remove('active');
            }
            if (questionSection) {
                questionSection.style.display = 'none';
                questionSection.classList.remove('active');
            }
            if (themeSelection) {
                themeSelection.style.display = 'none';
            }
            if (fourQuestionsSection) {
                fourQuestionsSection.style.display = 'none';
            }
            
            // 導入画面を表示
            if (introductionSection) {
                introductionSection.style.display = 'block';
            }
            
            // 戻るボタンを非表示
            hideQuestionBackButton();
            
            // 画面状態をリセット
            saveScreenState('introduction');
            
            debugLog(LOG_LEVELS.DEBUG, 'UI', '導入画面に戻りました');
        } catch (error) {
            logError('SESSION', error, { function: 'restart', step: 'UI切り替え' });
        }
        
        // 保存されたセッションをクリア
        clearSavedSession();
        
        // 変数をリセット
        currentTheme = '';
        questionLevel = 0;
        conversationHistory = [];
        customTheme = '';
        
        debugLog(LOG_LEVELS.DEBUG, 'SESSION', '変数リセット完了');
        
        // 履歴をクリア
        if (conversationHistory_el) {
            conversationHistory_el.innerHTML = '';
        }
        if (insightContent) {
            insightContent.innerHTML = '';
        }
        
        // プログレスをリセット
        if (progressFill) {
            progressFill.style.width = '0%';
        }
        if (progressText) {
            progressText.textContent = '質問 1/4';
        }
    }

    // セッション管理の設定
    function setupSessionManagement() {
        // ページを離れる前の確認
        window.addEventListener('beforeunload', (e) => {
            if (conversationHistory.length > 0 && questionLevel < 4) {
                if (sessionSaveEnabled) {
                    saveCurrentSession();
                }
                e.preventDefault();
                e.returnValue = '探求を途中で終了しますか？進行状況は保存されます。';
                return e.returnValue;
            }
        });

        // 定期的な自動保存（30秒間隔）
        setInterval(() => {
            if (sessionSaveEnabled && conversationHistory.length > 0) {
                saveCurrentSession();
            }
        }, 30000);
    }

    // セッション保存
    function saveCurrentSession() {
        if (!sessionSaveEnabled) {
            debugLog(LOG_LEVELS.DEBUG, 'SESSION', 'セッション保存が無効化されているためスキップ');
            return;
        }
        
        debugLog(LOG_LEVELS.DEBUG, 'SESSION', 'セッション保存開始');
        
        try {
            const sessionData = {
                currentTheme,
                questionLevel,
                conversationHistory: conversationHistory.slice(), // コピーを作成
                customTheme,
                timestamp: Date.now(),
                version: '1.0.0'
            };
            
            debugLog(LOG_LEVELS.DEBUG, 'SESSION', 'セッションデータ準備完了', {
                currentTheme,
                questionLevel,
                conversationHistoryLength: conversationHistory.length,
                hasCustomTheme: !!customTheme,
                timestamp: sessionData.timestamp
            });
            
            const serializedData = JSON.stringify(sessionData);
            localStorage.setItem('deepWhy_session', serializedData);
            
            debugLog(LOG_LEVELS.INFO, 'SESSION', 'セッションが正常に保存されました', {
                dataSize: serializedData.length
            });
        } catch (error) {
            logError('SESSION', error, { context: 'セッション保存中' });
            sessionSaveEnabled = false; // ストレージが使用できない場合は無効化
            debugLog(LOG_LEVELS.WARN, 'SESSION', 'セッション保存を無効化しました');
        }
    }

    // 保存されたセッションをチェック
    function checkForSavedSession() {
        if (!sessionSaveEnabled) return;
        
        try {
            const savedData = localStorage.getItem('deepWhy_session');
            if (savedData) {
                const sessionData = JSON.parse(savedData);
                
                // 24時間以内のセッションのみ復元対象
                const hoursSinceLastSave = (Date.now() - sessionData.timestamp) / (1000 * 60 * 60);
                
                if (hoursSinceLastSave < 24 && sessionData.conversationHistory.length > 0) {
                    showSessionRestoreOption(sessionData);
                } else {
                    // 古いセッションは削除
                    clearSavedSession();
                }
            }
        } catch (error) {
            console.warn('保存されたセッションの読み込みに失敗しました:', error);
            clearSavedSession();
        }
    }

    // セッション復元オプションを表示
    function showSessionRestoreOption(sessionData) {
        const restoreMessage = `前回の探求セッションが見つかりました。\n\nテーマ: ${advancedThemes[sessionData.currentTheme]?.title || 'カスタム'}\n進行度: ${sessionData.questionLevel}/4\n\n続きから始めますか？`;
        
        if (confirm(restoreMessage)) {
            restoreSession(sessionData);
        } else {
            clearSavedSession();
        }
    }

    // セッション復元
    function restoreSession(sessionData) {
        try {
            // 状態を復元
            currentTheme = sessionData.currentTheme;
            questionLevel = sessionData.questionLevel;
            conversationHistory = sessionData.conversationHistory || [];
            customTheme = sessionData.customTheme || '';
            
            // UI状態を復元
            if (themeSelection) themeSelection.style.display = 'none';
            if (questionSection) {
                questionSection.style.display = 'block';
                questionSection.classList.add('active');
            }
            
            // 画面状態を保存
            saveScreenState('questioning');
            
            // 会話履歴を表示
            updateConversationHistory();
            
            // プログレスを更新
            updateProgress();
            
            // 戻るボタンの表示制御
            if (questionLevel === 0) {
                showQuestionBackButton();
            } else {
                hideQuestionBackButton();
            }
            
            // 次の質問を表示（現在のレベルに応じて）
            if (questionLevel < 4) {
                displayNextQuestionForLevel();
            } else {
                // 完了状態に移行
                setTimeout(() => performPsychologicalAnalysis(), 1000);
            }
            
            showNotification('前回のセッションを復元しました', 'success');
        } catch (error) {
            console.error('セッション復元エラー:', error);
            showNotification('セッション復元に失敗しました。新しい探求を開始してください。', 'error');
            clearSavedSession();
        }
    }

    // レベルに応じた次の質問を表示
    function displayNextQuestionForLevel() {
        const theme = advancedThemes[currentTheme];
        let questionText;

        if (questionLevel === 0) {
            // 最初の質問
            if (currentTheme === 'free_inquiry') {
                questionText = customTheme;
            } else {
                questionText = theme.initialPrompt;
            }
        } else {
            // 継続質問のプレースホルダー
            questionText = "前回の回答を踏まえて、さらに深く探求してみましょう。準備ができたら「答える」ボタンを押してください。";
        }

        displayQuestion(questionText);
    }

    // 保存されたセッションをクリア
    function clearSavedSession() {
        try {
            localStorage.removeItem('deepWhy_session');
        } catch (error) {
            console.warn('セッションクリアに失敗しました:', error);
        }
    }

    // セッション保存の有効/無効を切り替え
    function toggleSessionSave(enabled) {
        sessionSaveEnabled = enabled;
        if (!enabled) {
            clearSavedSession();
        }
    }

    // 元のrestart関数にセッションクリア機能を統合済み

    // デバッグ用関数をグローバルに露出
    window.debugTools = {
        // ログレベル制御
        setLogLevel: (level) => {
            const levelNames = Object.keys(LOG_LEVELS);
            if (levelNames.includes(level)) {
                currentLogLevel = LOG_LEVELS[level];
                debugLog(LOG_LEVELS.INFO, 'DEBUG', `ログレベルを${level}に変更しました`);
            } else {
                console.warn('有効なログレベル:', levelNames);
            }
        },
        
        // 保存されたデバッグログの表示
        showDebugLogs: () => {
            try {
                const logs = JSON.parse(localStorage.getItem('deepWhy_debug_logs') || '[]');
                console.table(logs.slice(-20)); // 最新20件をテーブル形式で表示
                return logs;
            } catch (error) {
                console.error('デバッグログの取得に失敗:', error);
                return [];
            }
        },
        
        // デバッグログのクリア
        clearDebugLogs: () => {
            localStorage.removeItem('deepWhy_debug_logs');
            debugLog(LOG_LEVELS.INFO, 'DEBUG', 'デバッグログをクリアしました');
        },
        
        // パフォーマンス情報の表示
        showPerformanceInfo: () => {
            const navigation = performance.getEntriesByType('navigation')[0];
            const paintEntries = performance.getEntriesByType('paint');
            
            console.group('パフォーマンス情報');
            console.log('ページ読み込み時間:', navigation.loadEventEnd - navigation.fetchStart, 'ms');
            console.log('DOM構築時間:', navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart, 'ms');
            paintEntries.forEach(entry => {
                console.log(`${entry.name}:`, entry.startTime, 'ms');
            });
            console.groupEnd();
        },
        
        // 現在のシステム状態の表示
        showSystemState: () => {
            const state = {
                currentTheme,
                questionLevel,
                conversationHistoryLength: conversationHistory.length,
                customTheme,
                isLLMMode,
                sessionSaveEnabled,
                debugMode: DEBUG_MODE,
                logLevel: Object.keys(LOG_LEVELS)[currentLogLevel]
            };
            
            console.group('システム状態');
            console.table(state);
            console.groupEnd();
            
            return state;
        }
    };

    // グローバル関数として露出（HTMLから呼び出し用）
    window.startQuestioning = startQuestioning;
    window.submitAnswer = submitAnswer;
    window.restart = restart;
    window.toggleSessionSave = toggleSessionSave;
    
    debugLog(LOG_LEVELS.INFO, 'SYSTEM', 'デバッグツールが利用可能になりました。console で window.debugTools を確認してください。');
});