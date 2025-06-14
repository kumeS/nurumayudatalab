/**
 * core.js - DIYアシスタントのコア機能とUI管理
 * 
 * 主な責務：
 * - アプリケーション初期化
 * - UI管理とイベントハンドリング
 * - プロジェクト管理（保存・読み込み）
 * - ローカルストレージ管理
 * - デバッグとログ機能
 */



class DIYAssistant {
  constructor() {
    // デバッグモード設定
    this.debugMode = localStorage.getItem('diy_debug_mode') === 'true' || 
                     new URLSearchParams(window.location.search).get('debug') === 'true';
    
    // ログシステム初期化
    this.initializeLogging();
    
    // マネージャーの初期化
    this.sceneManager = new SceneManager(this);
    this.aiManager = new AIManager(this);
    this.processingManager = new ProcessingManager();
    this.processingManager.setAssistant(this);
    
    // 状態管理
    this.currentObjData = null;
    this.currentOptimizedPrompt = null;
    this.currentStage = null;
    this.eventListenersSetup = false; // イベントリスナー重複防止フラグ
    
    // 各段階の生の出力データを保存
    this.stageRawData = {
      stage1: null,
      stage2: null
    };

    
    this.log('info', 'DIYAssistant初期化開始', { debugMode: this.debugMode });
    
    this.projects = this.loadProjects(); // プロジェクトリスト初期化
    
    // DOMContentLoaded後にDIYAssistantが初期化されるので、即座にセットアップ
    this.log('debug', 'イベントリスナー設定開始');
    this.setupEventListeners();
    
    // Three.jsシーンの初期化（ライブラリ読み込み状況確認後）
    this.initializeSceneWithDelay();
    
    // Three.jsシーンの初期化完了後にセッション復元
    setTimeout(async () => {
      try {
        this.log('info', 'セッション復元プロセス開始');
        
        // 基本的なUI状態を復元（プロジェクトが無い場合の基本フィールド復元）
        this.loadUIState();
        
        // プロジェクト履歴を表示
        this.renderProjectList();
        
        // セッション復元を実行（アクティブなプロジェクトがある場合）
        await this.loadLastSession();
        
        this.log('info', 'セッション復元プロセス完了');
      } catch (error) {
        this.log('error', 'セッション復元プロセスでエラー', { error: error.message });
      }
    }, 100);
    
    this.log('info', 'DIYAssistant初期化完了');
    
    // デバッグモード表示の初期化
    this.updateDebugModeDisplay();
  }

  // ========== ログシステム ==========
  initializeLogging() {
    this.logHistory = [];
    this.maxLogHistory = 1000;
    
    // デバッグモードでのみコンソールに出力
    this.log = (level, message, data = null) => {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level,
        message,
        data,
        stage: this.currentStage || 'general'
      };
      
      // ログ履歴に追加
      this.logHistory.push(logEntry);
      if (this.logHistory.length > this.maxLogHistory) {
        this.logHistory.shift();
      }
      
      // コンソール出力（デバッグモードまたはエラーレベル）
      if (this.debugMode || level === 'error') {
        const prefix = `[${timestamp}] [${level.toUpperCase()}] [${logEntry.stage}]`;
        
        switch (level) {
          case 'error':
            console.error(prefix, message, data || '');
            break;
          case 'warn':
            console.warn(prefix, message, data || '');
            break;
          case 'info':
            console.log(prefix, message, data || '');
            break;
          case 'debug':
            if (this.debugMode) {
              console.debug(prefix, message, data || '');
            }
            break;
        }
      }
      
      // エラーの場合はLocalStorageにも保存（トラブルシューティング用）
      if (level === 'error') {
        this.saveErrorLog(logEntry);
      }
    };
  }

  saveErrorLog(logEntry) {
    try {
      const errorLogs = JSON.parse(localStorage.getItem('diy_error_logs') || '[]');
      errorLogs.push(logEntry);
      // 最新50件のエラーのみ保持
      if (errorLogs.length > 50) {
        errorLogs.splice(0, errorLogs.length - 50);
      }
      localStorage.setItem('diy_error_logs', JSON.stringify(errorLogs));
    } catch (e) {
      console.error('エラーログ保存失敗:', e);
    }
  }

  exportLogs() {
    const logs = {
      generated: new Date().toISOString(),
      debugMode: this.debugMode,
      sessionInfo: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      },
      logs: this.logHistory,
      errorLogs: JSON.parse(localStorage.getItem('diy_error_logs') || '[]')
    };
    
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diy-assistant-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.log('info', 'ログファイルをエクスポートしました');
  }

  // ========== サンプルデータ定義 ==========
  getSampleData() {
    return {
      'simple-chair': {
        title: "シンプルな木製椅子",
        prompt: "シンプルな木製の椅子を作ってください",
        width: 40,
        depth: 40,
        height: 80
      },
      'simple-desk': {
        title: "シンプルな木製机",
        prompt: "シンプルな木製の机を作ってください",
        width: 120,
        depth: 60,
        height: 75
      },
      'simple-shelf': {
        title: "シンプルな本棚",
        prompt: "シンプルな木製の本棚を作ってください",
        width: 80,
        depth: 30,
        height: 150
      },
      'simple-stool': {
        title: "シンプルなスツール",
        prompt: "シンプルな木製のスツールを作ってください",
        width: 35,
        depth: 35,
        height: 45
      },
      'simple-cabinet': {
        title: "シンプルな収納箱",
        prompt: "シンプルな木製の収納箱を作ってください",
        width: 60,
        depth: 40,
        height: 80
      },
      'coffee-table': {
        title: "コーヒーテーブル",
        prompt: "低めのコーヒーテーブルを作ってください",
        width: 100,
        depth: 50,
        height: 40
      },
      'night-stand': {
        title: "ナイトスタンド",
        prompt: "ベッドサイドのナイトスタンドを作ってください",
        width: 40,
        depth: 30,
        height: 60
      },
      'plant-stand': {
        title: "植物台",
        prompt: "観葉植物を置く台を作ってください",
        width: 30,
        depth: 30,
        height: 70
      },
      'shoe-rack': {
        title: "靴置き台",
        prompt: "玄関用の靴置き台を作ってください",
        width: 80,
        depth: 30,
        height: 40
      },
      'magazine-rack': {
        title: "雑誌立て",
        prompt: "雑誌や本を立てて収納する棚を作ってください",
        width: 40,
        depth: 20,
        height: 60
      }
    };
  }

  // ========== イベントリスナー設定 ==========
  setupEventListeners() {
    // DOM要素の存在確認用ヘルパー
    // イベントリスナーの重複登録を防ぐ
    if (this.eventListenersSetup) {
      this.log('debug', 'イベントリスナーは既に設定済みです');
      return;
    }

    const safeAddEventListener = (id, event, handler) => {
      const element = document.getElementById(id);
      if (element) {
        // 既存のイベントリスナーを削除（重複防止）
        const existingHandler = element.getAttribute(`data-${event}-handler`);
        if (existingHandler) {
          this.log('debug', `既存のイベントリスナーを削除: ${id}`);
          element.removeEventListener(event, element[`_${event}Handler`]);
        }
        
        // 新しいイベントリスナーを追加
        element.addEventListener(event, handler);
        element[`_${event}Handler`] = handler; // 参照を保存（削除用）
        element.setAttribute(`data-${event}-handler`, 'true'); // フラグを設定
        
        this.log('debug', `イベントリスナー設定完了: ${id}`, { 
          eventType: event,
          hadExisting: !!existingHandler
        });
      } else {
        this.log('warn', `要素が見つかりません: ${id}`);
      }
    };

    // イベントリスナーの登録（ヘルパー関数で安全に）
    safeAddEventListener('generateBtn', 'click', () => this.generateModel());
    safeAddEventListener('clearBtn', 'click', () => this.clearForm());
    
    // ホーム画面での初期状態処理
    if (window.location.hash === '#home' || window.location.hash === '') {
      this.setupSampleButtons();
    }
    
    // プロジェクト管理
    safeAddEventListener('clearAllProjectsBtn', 'click', () => this.clearAllProjects());
    
    // ステージ結果表示

    
    // 段階別生の出力表示ボタン（iマーク）
    safeAddEventListener('stage1InfoBtn', 'click', () => this.showRawOutput(1));
    safeAddEventListener('stage2InfoBtn', 'click', () => this.showRawOutput(2));
    
    // 生の出力モーダルの閉じるボタン
    safeAddEventListener('closeRawOutputModal', 'click', () => this.closeRawOutputModal());
    safeAddEventListener('closeRawOutputModalBtn', 'click', () => this.closeRawOutputModal());

    
    // 3D操作関連
    safeAddEventListener('resetCenterBtn', 'click', () => {
      if (this.sceneManager && this.sceneManager.resetViewCenter) {
        this.sceneManager.resetViewCenter();
      }
    });
    
    safeAddEventListener('toggleIndicatorBtn', 'click', () => {
      if (this.sceneManager && this.sceneManager.toggleCenterIndicator) {
        this.sceneManager.toggleCenterIndicator();
      }
    });
    
    // プレビュー色設定
    safeAddEventListener('colorSchemeSelect', 'change', (e) => {
      if (this.sceneManager && this.sceneManager.setColorScheme) {
        this.sceneManager.setColorScheme(e.target.value);
      }
    });
    
    // 中心点操作パネル
    safeAddEventListener('openCenterControlBtn', 'click', () => {
      const panel = document.getElementById('centerControlPanel');
      if (panel) panel.style.display = 'block';
    });
    
    safeAddEventListener('closeCenterPanel', 'click', () => {
      const panel = document.getElementById('centerControlPanel');
      if (panel) panel.style.display = 'none';
    });
    
    // 停止ボタン
    safeAddEventListener('stopProcessingBtn', 'click', () => {
      if (this.processingManager) {
        this.processingManager.stopProcessing();
      }
    });
    
    // キーボードショートカット
    document.addEventListener('keydown', (e) => {
      // デバッグモード切り替え
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        this.toggleDebugMode();
      }
      
      // 中心リセット
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        if (this.sceneManager && this.sceneManager.resetViewCenter) {
          this.sceneManager.resetViewCenter();
        }
      }
      
      // 中心表示切り替え
      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        if (this.sceneManager && this.sceneManager.toggleCenterIndicator) {
          this.sceneManager.toggleCenterIndicator();
        }
      }
      
      // 3D操作（矢印キー、shift+上下）
      if (this.sceneManager && this.sceneManager.handleKeyboardInput) {
        this.sceneManager.handleKeyboardInput(e);
      }
    });
    
    this.log('info', 'イベントリスナー設定完了');
    return true;
  }

  // ========== サンプルボタンセットアップ ==========
  setupSampleButtons(retryCount = 0) {
    try {
      const sampleButtons = document.querySelectorAll('.sample-btn');
      const sampleData = this.getSampleData();
      
      this.log('debug', 'サンプルボタン検索結果', { 
        buttonsFound: sampleButtons.length,
        expectedButtons: ['desk', 'shelf', 'chair', 'cabinet']
      });
      
      if (sampleButtons.length === 0) {
        if (retryCount < 3) {
          this.log('warn', `サンプルボタンが見つかりません - DOM読み込み待機 (${retryCount + 1}/3)`);
          // DOM読み込み完了を待ってリトライ
          setTimeout(() => {
            this.log('debug', `サンプルボタン設定をリトライ (${retryCount + 1})`);
            this.setupSampleButtons(retryCount + 1);
          }, 500);
        } else {
          this.log('error', 'サンプルボタンが見つかりません - リトライ上限に達しました');
        }
        return;
      }
      
      sampleButtons.forEach((button, index) => {
        try {
          const sampleType = button.getAttribute('data-sample');
          this.log('debug', `サンプルボタン設定中: ${sampleType}`, { index, sampleType });
          
          button.addEventListener('click', (e) => {
            try {
              e.preventDefault();
              const sample = sampleData[sampleType];
              
              this.log('debug', `サンプルボタンクリック: ${sampleType}`, { 
                sampleType, 
                hasSample: !!sample,
                sampleTitle: sample?.title 
              });
              
              if (sample) {
                // プロンプトを設定
                const designPrompt = document.getElementById('designPrompt');
                if (designPrompt) {
                  designPrompt.value = sample.prompt;
                } else {
                  this.log('warn', 'designPrompt要素が見つかりません');
                }
                
                // パラメータを設定
                const widthParam = document.getElementById('widthParam');
                const depthParam = document.getElementById('depthParam');
                const heightParam = document.getElementById('heightParam');
                
                if (widthParam) widthParam.value = sample.width;
                if (depthParam) depthParam.value = sample.depth;
                if (heightParam) heightParam.value = sample.height;
                
                // ローカルストレージに保存
                localStorage.setItem('diy_prompt', sample.prompt);
                this.saveParameters();
                this.saveInputSession();
                
                // ログ出力
                this.log('info', `サンプル「${sample.title}」を読み込みました`);
                
                // 成功メッセージ表示
                this.showSuccess(`サンプル「${sample.title}」を読み込みました`);
                
                // ボタンアニメーション
                button.style.transform = 'scale(0.95)';
                setTimeout(() => {
                  button.style.transform = '';
                }, 150);
              } else {
                this.log('error', `サンプルデータが見つかりません: ${sampleType}`);
                this.showError(`サンプルデータの読み込みに失敗しました: ${sampleType}`);
              }
            } catch (error) {
              this.log('error', 'サンプルボタンクリック処理エラー', { 
                error: error.message, 
                sampleType,
                stack: error.stack 
              });
              this.showError('サンプルの読み込み中にエラーが発生しました');
            }
          });
          
          this.log('debug', `サンプルボタンイベント設定完了: ${sampleType}`);
        } catch (error) {
          this.log('error', `サンプルボタン設定エラー: ${button}`, { 
            error: error.message,
            index 
          });
        }
      });
      
      this.log('info', `サンプルボタンのイベントリスナーを設定しました (${sampleButtons.length}個)`);
    } catch (error) {
      this.log('error', 'サンプルボタンセットアップエラー', { 
        error: error.message, 
        stack: error.stack 
      });
      
      // フォールバック: 少し待ってからリトライ
      if (retryCount < 3) {
        setTimeout(() => {
          this.log('debug', `サンプルボタンセットアップをリトライ (${retryCount + 1})`);
          this.setupSampleButtons(retryCount + 1);
        }, 1000);
      } else {
        this.log('error', 'サンプルボタンセットアップ - リトライ上限に達しました');
      }
    }
  }

  // ========== 3Dシーン初期化（遅延実行） ==========
  initializeSceneWithDelay() {
    this.log('debug', '3Dシーン初期化準備開始');
    
    const attemptInitialization = (attempt = 1) => {
      this.log('debug', `3Dシーン初期化試行 ${attempt}/3`);
      
      // Three.jsライブラリ状況確認
      const threeAvailable = typeof THREE !== 'undefined';
      const objLoaderAvailable = typeof THREE?.OBJLoader !== 'undefined';
      
      this.log('debug', 'ライブラリ状況', {
        threeAvailable,
        objLoaderAvailable,
        threeRevision: threeAvailable ? THREE.REVISION : 'N/A',
        windowOBJLoaderReady: window.OBJLoaderReady,
        windowOBJLoaderFailed: window.OBJLoaderFailed
      });
      
      if (threeAvailable && (objLoaderAvailable || window.OBJLoaderReady)) {
        this.log('info', '3Dシーン初期化実行', { attempt });
        try {
          this.sceneManager.setup3DScene();
        } catch (error) {
          this.log('error', '3Dシーン初期化でエラー', { error: error.message, attempt });
          if (attempt < 3) {
            this.log('info', '3Dシーン初期化リトライ', { attempt: attempt + 1 });
            setTimeout(() => attemptInitialization(attempt + 1), 1000);
          }
        }
      } else if (attempt < 3) {
        this.log('info', `3Dシーン初期化延期（ライブラリ待機）`, { attempt });
        setTimeout(() => attemptInitialization(attempt + 1), 1000);
      } else {
        this.log('warn', '3Dシーン初期化タイムアウト - フォールバック実行');
        try {
          this.sceneManager.setup3DScene(); // エラーハンドリングはSceneManagerで行う
        } catch (error) {
          this.log('error', '3Dシーン初期化完全失敗', { error: error.message });
        }
      }
    };
    
    // 即座に1回目を試行
    attemptInitialization(1);
  }

  // ========== デバッグ機能 ==========
  toggleDebugMode() {
    this.debugMode = !this.debugMode;
    localStorage.setItem('diy_debug_mode', this.debugMode.toString());
    
    this.log('info', 'デバッグモード切り替え', { debugMode: this.debugMode });
    
    // デバッグモード表示の更新
    this.updateDebugModeDisplay();
    
    this.showSuccess(`デバッグモード: ${this.debugMode ? 'ON' : 'OFF'}`);
  }

  updateDebugModeDisplay() {
    // デバッグ情報パネルの表示/非表示
    let debugPanel = document.getElementById('debugPanel');
    if (!debugPanel && this.debugMode) {
      debugPanel = this.createDebugPanel();
      document.body.appendChild(debugPanel);
    } else if (debugPanel && !this.debugMode) {
      debugPanel.remove();
    }
  }

  createDebugPanel() {
    const panel = document.createElement('div');
    panel.id = 'debugPanel';
    panel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      max-width: 300px;
      max-height: 200px;
      overflow-y: auto;
    `;
    
    panel.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px;">🐛 Debug Mode</div>
      <div>Stage: <span id="debugCurrentStage">${this.currentStage || 'none'}</span></div>
      <div>Logs: <span id="debugLogCount">${this.logHistory.length}</span></div>
      <div style="margin-top: 5px;">
        <button onclick="window.diyAssistant.exportLogs()" style="font-size: 10px; margin-right: 5px;">Export Logs</button>
        <button onclick="window.diyAssistant.clearAllData()" style="font-size: 10px;">Clear Data</button>
      </div>
    `;
    
    return panel;
  }

  updateDebugPanel() {
    if (this.debugMode) {
      const debugCurrentStage = document.getElementById('debugCurrentStage');
      const debugLogCount = document.getElementById('debugLogCount');
      
      if (debugCurrentStage) {
        debugCurrentStage.textContent = this.currentStage || 'none';
      }
      if (debugLogCount) {
        debugLogCount.textContent = this.logHistory.length;
      }
    }
  }

  clearAllData() {
    if (confirm('全てのデータ（プロジェクト、セッション、ログ）をクリアしますか？')) {
      localStorage.clear();
      this.logHistory = [];
      this.log('info', '全データクリア実行');
      this.showSuccess('全データがクリアされました。ページを再読み込みしてください。');
      setTimeout(() => window.location.reload(), 1000);
    }
  }

  // ========== モデル生成（メインエントリーポイント） ==========
  async generateModel() {
    this.log('debug', '3Dモデル生成ボタンがクリックされました');
    
    const prompt = document.getElementById('designPrompt').value.trim();
    
    this.log('debug', 'プロンプト確認', { prompt: prompt, length: prompt.length });
    
    if (!prompt) {
      this.log('warn', 'プロンプトが空です');
      this.showError('設計要件を入力してください。');
      return;
    }

    // ProcessingManagerの状態を確認
    this.log('debug', 'ProcessingManager状態確認', { 
      hasProcessingManager: !!this.processingManager,
      hasAssistant: !!(this.processingManager?.assistant),
      isProcessing: this.processingManager?.isProcessing
    });

    if (!this.processingManager) {
      this.log('error', 'ProcessingManagerが初期化されていません');
      this.showError('システムエラー: ProcessingManagerが見つかりません');
      return;
    }

    this.log('debug', 'ProcessingManagerのexecuteFullProcessを呼び出します');
    
    // UIを準備
    this.showLoading(true, 'AI処理を開始しています...');
    this.hideMessages();
    
    // 処理は ProcessingManager に委譲
    try {
      const result = await this.processingManager.executeFullProcess(prompt);
      this.log('debug', 'executeFullProcess完了', { hasResult: !!result, resultKeys: result ? Object.keys(result) : [] });
      
      if (result && result.objData) {
        this.log('debug', '結果データ詳細', { 
          objDataLength: result.objData.length,
          hasFurnitureSpec: !!result.furnitureSpec
        });
        
        // 3Dモデルを表示
        this.currentObjData = result.objData;
        
        // SceneManagerでの表示を試行
        if (this.sceneManager && this.sceneManager.isInitialized) {
          try {
            this.log('debug', 'SceneManagerで3Dモデル表示を試行');
            await this.sceneManager.loadOBJModel(result.objData);
            this.log('info', 'SceneManagerで3Dモデル表示成功');
          } catch (error) {
            this.log('warn', 'SceneManager表示失敗、フォールバック実行', { error: error.message });
            this.display3DModel(result.objData);
          }
        } else {
          this.log('debug', 'SceneManager未初期化、フォールバック実行');
          this.display3DModel(result.objData);
        }
        
        // UI更新
        this.showLoading(false);
        this.showSuccess('3Dモデルの生成が完了しました！');
        
        this.log('info', '3Dモデル生成処理完了');
      } else {
        this.log('error', '結果データが不正', { result });
        this.showLoading(false);
        this.showError('3Dモデルの生成に失敗しました。結果データが不正です。');
      }
    } catch (error) {
      this.log('error', 'executeFullProcessでエラー', { 
        error: error.message, 
        stack: error.stack,
        processingManagerExists: !!this.processingManager,
        assistantExists: !!(this.processingManager?.assistant)
      });
      this.showLoading(false);
      this.showError(`3Dモデル生成エラー: ${error.message}`);
      
      // デバッグ情報を表示
      if (this.debugMode) {
        console.error('generateModel デバッグ情報:', {
          prompt,
          processingManager: this.processingManager,
          error: error
        });
      }
    }
  }

  // ========== フォーム管理 ==========
  clearForm() {
    document.getElementById('designPrompt').value = '';
    document.getElementById('widthParam').value = '';
    document.getElementById('depthParam').value = '';
    document.getElementById('heightParam').value = '';
    

    
    this.hideMessages(); // クリア時は全メッセージを消去
    this.sceneManager.resetCanvas();
    
    // 3Dプレビューをクリア
    this.clear3DPreview();
    
    // プロンプト情報もクリア
    this.currentOptimizedPrompt = null;
    this.currentObjData = null;
    
    // 処理段階データもクリア（手動クリア時のみ）
    if (this.processingManager) {
      this.processingManager.stagePipeline.context = {};
      this.processingManager.stage2Data = null;
    }
    
    // ローカルストレージをクリア（セッション状態も含む）
    localStorage.removeItem('diy_prompt');
    localStorage.removeItem('diy_parameters');
    localStorage.removeItem('diy_current_session'); // セッション状態もクリア
    localStorage.removeItem('diy_input_session'); // 入力セッションもクリア
    
    // 生の出力データとiマークをクリア
    this.clearStageRawData();
  }

  clear3DPreview() {
    // SceneManagerのリセットを優先
    if (this.sceneManager && this.sceneManager.isInitialized) {
      this.sceneManager.resetCanvas();
    }
    
    // core.jsの3Dシーンもクリア
    if (this.scene) {
      // モデルオブジェクトを削除
      const modelsToRemove = this.scene.children.filter(child => child.userData.isModel);
      modelsToRemove.forEach(model => this.scene.remove(model));
      
      // レンダーループ停止
      if (this.renderLoop) {
        cancelAnimationFrame(this.renderLoop);
        this.renderLoop = null;
      }
    }
    
    // プレースホルダーテキストを復元
    const overlay = document.getElementById('canvasOverlay');
    if (overlay) {
      overlay.style.display = 'flex';
    }
    
    // 現在のOBJデータをクリア
    this.currentObjData = null;
    
    this.log('info', '3Dプレビューをクリアしました');
  }

  // ========== ブラウザ環境チェック ==========












  // ========== プロジェクト管理 ==========
  saveParameters() {
    const params = {
      width: document.getElementById('widthParam').value,
      depth: document.getElementById('depthParam').value,
      height: document.getElementById('heightParam').value
    };
    localStorage.setItem('diy_parameters', JSON.stringify(params));
  }

  loadUIState() {
    // プロンプトの復元
    const savedPrompt = localStorage.getItem('diy_prompt');
    if (savedPrompt) {
      document.getElementById('designPrompt').value = savedPrompt;
    }
    
    // パラメータの復元
    const savedParams = localStorage.getItem('diy_parameters');
    if (savedParams) {
      const params = JSON.parse(savedParams);
      document.getElementById('widthParam').value = params.width || '';
      document.getElementById('depthParam').value = params.depth || '';
      document.getElementById('heightParam').value = params.height || '';
    }
  }

  saveCurrentProject(prompt, objData, qualityCheck = null, optimizedSpec = null) {
    try {
      const projectId = Date.now().toString();
      const furnitureType = optimizedSpec?.furniture_type || 'unknown';
      
      const projectData = {
        id: projectId,
        prompt: prompt,
        objData: objData,
        furnitureType: furnitureType,
        timestamp: new Date().toISOString(),
        optimizedSpec: optimizedSpec,
        stage1Data: this.processingManager.stagePipeline?.context?.stage1Output || null,
        stage2Data: this.processingManager.stage2Data || null
      };
      
      const projects = this.loadProjects();
      projects.unshift(projectData); // 新しいプロジェクトを先頭に追加
      
      // 最大50件で制限
      if (projects.length > 50) {
        projects.splice(50);
      }
      
      localStorage.setItem('diy_projects', JSON.stringify(projects));
      this.renderProjectList();
      
      this.log('info', 'プロジェクト保存完了', { 
        projectId, 
        furnitureType,
        hasObjData: !!objData,
        hasOptimizedSpec: !!optimizedSpec
      });
      
    } catch (error) {
      this.log('error', 'プロジェクト保存エラー', { error: error.message });
    }
  }

  saveCurrentSession(project) {
    // 現在のセッション状態を保存
    const sessionData = {
      currentProject: project,
      hasActiveModel: true,
      timestamp: Date.now()
    };
    
    localStorage.setItem('diy_current_session', JSON.stringify(sessionData));
  }

  saveInputSession() {
    // 入力フィールドのみのセッション保存（3Dモデルなし）
    const inputData = {
      prompt: document.getElementById('designPrompt').value,
      parameters: {
        width: document.getElementById('widthParam').value,
        depth: document.getElementById('depthParam').value,
        height: document.getElementById('heightParam').value
      },
      hasActiveModel: false,
      timestamp: Date.now()
    };
    
    // アクティブな3Dモデルが無い場合のみ入力セッションを保存
    if (!this.currentObjData) {
      localStorage.setItem('diy_input_session', JSON.stringify(inputData));
    }
  }

  async loadLastSession() {
    try {
      const sessionData = localStorage.getItem('diy_current_session');
      if (!sessionData) {
        this.log('info', 'セッション復元: セッションデータなし');
        return;
      }
      
      const session = JSON.parse(sessionData);
      
      // セッションが24時間以内のもののみ復元
      const hoursOld = (Date.now() - session.timestamp) / (1000 * 60 * 60);
      if (hoursOld > 24) {
        this.log('info', 'セッション復元: セッション期限切れ', { hoursOld });
        localStorage.removeItem('diy_current_session');
        return;
      }
      
      if (session.hasActiveModel && session.currentProject) {
        this.log('info', '前回のセッション状態を復元中');
        
        // プロンプトを復元
        if (session.currentProject.prompt) {
          document.getElementById('designPrompt').value = session.currentProject.prompt;
        }
        
        // パラメータを復元
        if (session.currentProject.parameters) {
          const params = session.currentProject.parameters;
          document.getElementById('widthParam').value = params.width || '';
          document.getElementById('depthParam').value = params.depth || '';
          document.getElementById('heightParam').value = params.height || '';
        }
        
        // 3Dモデルを復元
        if (session.currentProject.objData) {
          // セッションOBJデータの詳細検証
          if (typeof session.currentProject.objData !== 'string') {
            this.log('error', 'セッション復元: OBJデータの型が無効', { 
              type: typeof session.currentProject.objData,
              value: session.currentProject.objData
            });
            throw new Error('セッションのOBJデータの形式が無効です。');
          }

          if (session.currentProject.objData.trim().length === 0) {
            this.log('error', 'セッション復元: OBJデータが空です');
            throw new Error('セッションのOBJデータが空です。');
          }

          this.log('debug', 'セッション復元: 3Dモデル復元開始', { 
            objDataSize: session.currentProject.objData.length,
            startsWithV: session.currentProject.objData.trim().startsWith('v '),
            startsWithHash: session.currentProject.objData.trim().startsWith('#')
          });
          
          this.currentObjData = session.currentProject.objData;
          
          try {
            // シーンマネージャーの初期化確認
            if (!this.sceneManager.isInitialized) {
              this.log('warn', 'セッション復元: シーンマネージャー未初期化、待機中...');
              await this.waitForSceneInitialization();
            }
            
            // 3Dモデルを読み込み
            await this.sceneManager.loadOBJModel(session.currentProject.objData);
            this.enableDownloadButtons();
            
            // キャンバスオーバーレイを確実に非表示
            this.sceneManager.hideCanvasOverlay();
            
            // 品質チェック結果を復元（第3段階削除により不要）
            // if (session.currentProject.qualityCheck) {
            //   this.processingManager.storeQualityCheckResults(session.currentProject.qualityCheck);
            // }
            
            // 最適化仕様を復元
            if (session.currentProject.optimizedSpec) {
              this.processingManager.storeOptimizedSpec(session.currentProject.optimizedSpec, session.currentProject.prompt);
            }
              
            // 最適化されたプロンプトを復元
            if (session.currentProject.optimizedPrompt) {
              this.currentOptimizedPrompt = session.currentProject.optimizedPrompt;
            }
            
            // 段階別データを復元
            if (session.currentProject.stage1Data) {
              this.processingManager.stage1Data = session.currentProject.stage1Data;
            }
            if (session.currentProject.stage2Data) {
              this.processingManager.stage2Data = session.currentProject.stage2Data;
            }

            
            this.log('info', 'セッション復元完了: 3Dモデル表示成功');
            this.showSuccess('前回のセッション状態を復元しました。');
            
          } catch (error) {
            this.log('error', 'セッション復元失敗: 3Dモデル読み込みエラー', { 
              error: error.message,
              stack: error.stack 
            });
            
            // エラー詳細に応じた対応
            if (error.message.includes('初期化されていません')) {
              this.log('warn', 'セッション復元: 3Dシーン再初期化試行');
              try {
                this.sceneManager.setup3DScene();
                await new Promise(resolve => setTimeout(resolve, 1000));
                await this.sceneManager.loadOBJModel(session.currentProject.objData);
                this.log('info', 'セッション復元: 再初期化後に復元成功');
                this.showSuccess('前回のセッション状態を復元しました。');
              } catch (retryError) {
                this.log('error', 'セッション復元: 再試行も失敗', { error: retryError.message });
                this.showError('前回のセッション復元でエラーが発生しました。新しいプロジェクトを開始してください。');
                this.sceneManager.resetCanvas();
              }
            } else {
              this.showError('前回のセッション復元でエラーが発生しました。');
              this.sceneManager.resetCanvas();
            }
          }
        } else {
          // 完全なセッションが無い場合、入力セッションを復元
          this.loadInputSession();
        }
      } else {
        // アクティブなプロジェクトが無い場合、入力セッションを復元
        this.loadInputSession();
      }
    } catch (error) {
      this.log('error', 'セッション復元エラー', { error: error.message, stack: error.stack });
      localStorage.removeItem('diy_current_session');
      // エラー時も入力セッションを試行
      this.loadInputSession();
    }
  }

  // ========== シーンマネージャー初期化待機 ==========
  async waitForSceneInitialization(maxWaitTime = 5000) {
    const startTime = Date.now();
    
    while (!this.sceneManager.isInitialized && (Date.now() - startTime) < maxWaitTime) {
      this.log('debug', 'シーンマネージャー初期化待機中...');
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    if (!this.sceneManager.isInitialized) {
      this.log('warn', 'シーンマネージャー初期化タイムアウト');
      throw new Error('3Dシーンの初期化がタイムアウトしました');
    }
    
    this.log('info', 'シーンマネージャー初期化完了');
  }

  loadInputSession() {
    try {
      const inputSessionData = localStorage.getItem('diy_input_session');
      if (!inputSessionData) {
        this.log('info', '入力セッション復元: データなし');
        return;
      }

      const inputSession = JSON.parse(inputSessionData);
      
      // 入力セッションが24時間以内のもののみ復元
      const hoursOld = (Date.now() - inputSession.timestamp) / (1000 * 60 * 60);
      if (hoursOld > 24) {
        this.log('info', '入力セッション復元: セッション期限切れ', { hoursOld });
        localStorage.removeItem('diy_input_session');
        return;
      }

      this.log('info', '入力セッション復元中', { 
        promptLength: inputSession.prompt?.length || 0,
        hasParams: !!inputSession.parameters 
      });

      // プロンプトを復元
      if (inputSession.prompt) {
        document.getElementById('designPrompt').value = inputSession.prompt;
        localStorage.setItem('diy_prompt', inputSession.prompt);
      }

      // パラメータを復元
      if (inputSession.parameters) {
        document.getElementById('widthParam').value = inputSession.parameters.width || '';
        document.getElementById('depthParam').value = inputSession.parameters.depth || '';
        document.getElementById('heightParam').value = inputSession.parameters.height || '';
        this.saveParameters();
      }

      this.log('info', '入力セッション復元完了');
      
    } catch (error) {
      this.log('error', '入力セッション復元エラー', { error: error.message });
      localStorage.removeItem('diy_input_session');
    }
  }

  loadProjects() {
    const saved = localStorage.getItem('diy_projects');
    return saved ? JSON.parse(saved) : [];
  }

  renderProjectList() {
    const container = document.getElementById('projectListContainer');
    const clearAllBtn = document.getElementById('clearAllProjectsBtn');
    
    if (this.projects.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; color: var(--text-secondary); padding: 2rem;">
          まだプロジェクトが作成されていません
        </div>
      `;
      // プロジェクトがない場合は全削除ボタンを非表示
      clearAllBtn.style.display = 'none';
      return;
    }
    
    // プロジェクトがある場合は全削除ボタンを表示
    clearAllBtn.style.display = 'inline-flex';
    
    container.innerHTML = this.projects.map(project => `
      <div class="project-item" id="project-${project.id}">
        <div class="project-info">
          <h4>${this.truncateText(project.prompt, 50)}</h4>
          <div class="project-meta">
            作成日時: ${new Date(project.timestamp).toLocaleString('ja-JP')}
            ${project.parameters?.width ? ` | ${project.parameters.width}×${project.parameters.depth}×${project.parameters.height}cm` : ''}
          </div>
        </div>
        <div class="project-actions">
          <button class="button" onclick="diyAssistant.loadProject(${project.id})" title="このプロジェクトを読み込んで3Dプレビューで表示">
            <i class="fas fa-folder-open"></i> 読み込み
          </button>
          <button class="button danger" onclick="diyAssistant.deleteProject(${project.id})" title="このプロジェクトを削除">
            <i class="fas fa-trash"></i> 削除
          </button>
        </div>
      </div>
    `).join('');
  }

  async loadProject(projectId) {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) {
      this.showError('プロジェクトが見つかりません。');
      return;
    }
    
    this.log('info', 'プロジェクト読み込み開始', { 
      projectId: projectId,
      prompt: project.prompt?.substring(0, 50) + '...'
    });
    
    // ローディング表示
    this.showLoading(true, 'プロジェクトを読み込み中...');
    this.hideErrorMessages(); // 新しい処理開始時のみエラーメッセージをクリア
    
    try {
      // UI に値を設定
      document.getElementById('designPrompt').value = project.prompt || '';
      document.getElementById('widthParam').value = project.parameters?.width || '';
      document.getElementById('depthParam').value = project.parameters?.depth || '';
      document.getElementById('heightParam').value = project.parameters?.height || '';
      
      // OBJデータの詳細検証
      if (!project.objData) {
        throw new Error('プロジェクトにOBJデータが含まれていません。');
      }
      
      if (typeof project.objData !== 'string') {
        this.log('error', 'OBJデータの型が無効', { 
          type: typeof project.objData,
          value: project.objData
        });
        throw new Error('プロジェクトのOBJデータの形式が無効です。');
      }
      
      if (project.objData.trim().length === 0) {
        throw new Error('プロジェクトに3Dモデルデータが含まれていません。');
      }

      this.log('debug', 'プロジェクトOBJデータ検証完了', {
        dataLength: project.objData.length,
        startsWithV: project.objData.trim().startsWith('v '),
        startsWithHash: project.objData.trim().startsWith('#')
      });
      
      // 3Dモデルを読み込み
      this.currentObjData = project.objData;
      await this.sceneManager.loadOBJModel(project.objData);
      this.enableDownloadButtons();
      
      // キャンバスオーバーレイを確実に非表示
      this.sceneManager.hideCanvasOverlay();
      
      // 最適化仕様を保存（保存されている場合）
      if (project.optimizedSpec) {
        this.processingManager.storeOptimizedSpec(project.optimizedSpec, project.prompt);
      }
      
      // 品質チェック結果を保存（第3段階削除により不要）
      // if (project.qualityCheck) {
      //   this.processingManager.storeQualityCheckResults(project.qualityCheck);
      // }
      
      // 最適化されたプロンプトを復元（保存されている場合）
      if (project.optimizedPrompt) {
        this.currentOptimizedPrompt = project.optimizedPrompt;
      }
      
      // 段階別データを復元（保存されている場合）
      if (project.stage1Data) {
        this.processingManager.stagePipeline.context.stage1Output = project.stage1Data;
      }
      if (project.stage2Data) {
        this.processingManager.stage2Data = project.stage2Data;
      }
      

      
      // 生の出力データとiマーク状態を復元
      this.restoreStageRawDataFromProject(project);
      
      // パラメータ保存
      this.saveParameters();
      localStorage.setItem('diy_prompt', project.prompt || '');
      
      this.showSuccess(`プロジェクト「${this.truncateText(project.prompt, 30)}」を読み込みました。`);
      
      // プロジェクトアイテムを一時的にハイライト
      this.highlightProjectItem(projectId);
      
    } catch (error) {
      this.log('error', 'プロジェクト読み込みエラー', { 
        projectId: projectId,
        error: error.message 
      });
      this.showError(`プロジェクトの読み込みに失敗しました: ${error.message}`);
      
      // エラー時はリセット
      this.sceneManager.resetCanvas();
    } finally {
      this.showLoading(false);
    }
  }

  highlightProjectItem(projectId) {
    // 既存のハイライトを削除
    document.querySelectorAll('.project-item').forEach(item => {
      item.classList.remove('project-highlighted');
    });
    
    // 選択されたプロジェクトをハイライト
    const projectElement = document.getElementById(`project-${projectId}`);
    if (projectElement) {
      projectElement.classList.add('project-highlighted');
      
      // 3秒後にハイライトを削除
      setTimeout(() => {
        projectElement.classList.remove('project-highlighted');
      }, 3000);
    }
  }

  deleteProject(projectId) {
    if (confirm('このプロジェクトを削除しますか？')) {
      this.projects = this.projects.filter(p => p.id !== projectId);
      localStorage.setItem('diy_projects', JSON.stringify(this.projects));
      this.renderProjectList();
      this.showSuccess('プロジェクトが削除されました。');
    }
  }

  clearAllProjects() {
    if (confirm('全てのプロジェクト履歴を削除しますか？')) {
      this.projects = [];
      localStorage.removeItem('diy_projects');
      localStorage.removeItem('diy_current_session'); // セッション情報もクリア
      this.renderProjectList();
      this.showSuccess('全てのプロジェクト履歴が削除されました。');
    }
  }

  // ========== サンプルデータ読み込み（削除済み） ==========
  // サンプルデータ機能は削除されました

  // ========== 第2段階入力プロンプトモーダル管理 ==========












  // ========== 生の出力結果管理 ==========
  
  /**
   * 段階の生の出力データを保存
   */
  saveStageRawData(stage, rawData) {
    if (stage >= 1 && stage <= 2) {
      this.stageRawData[`stage${stage}`] = {
        timestamp: new Date().toISOString(),
        data: rawData
      };
      this.log('info', `第${stage}段階の生出力データを保存`, {
        dataLength: rawData?.length || 0,
        stage: stage
      });
    }
  }

  /**
   * 段階完了時にiマークを表示
   */
  showStageInfoButton(stage) {
    const infoBtn = document.getElementById(`stage${stage}InfoBtn`);
    if (infoBtn) {
      // 生の出力データが存在する場合のみ表示
      if (this.stageRawData[`stage${stage}`]) {
        infoBtn.style.display = 'flex';
        this.log('debug', `第${stage}段階のiマークを表示`);
      } else {
        // データが存在しない場合は少し待ってから再試行
        setTimeout(() => {
          if (this.stageRawData[`stage${stage}`]) {
            infoBtn.style.display = 'flex';
            this.log('debug', `第${stage}段階のiマークを表示（遅延）`);
          } else {
            this.log('warn', `第${stage}段階の生出力データが見つかりません`);
          }
        }, 100);
      }
    } else {
      this.log('error', `第${stage}段階のiマークボタンが見つかりません`);
    }
  }

  /**
   * 生の出力結果を表示
   */
  showRawOutput(stage) {
    const rawData = this.stageRawData[`stage${stage}`];
    if (!rawData) {
      this.showError(`第${stage}段階の生出力データが見つかりません。`);
      return;
    }

    const modal = document.getElementById('rawOutputModal');
    const title = document.getElementById('rawOutputModalTitle');
    const content = document.getElementById('rawOutputContent');

    let stageTitle = '';
    let stageDescription = '';
    
    switch (stage) {
      case 1:
        stageTitle = '第1段階：仕様分析と最適化';
        stageDescription = 'LLMによる自然言語仕様書の生成過程';
        break;
      case 2:
        stageTitle = '第2段階：3Dモデル生成';
        stageDescription = 'DeepSeek-R1による推論過程を含む生出力';
        break;
      default:
        this.showError('無効な段階が指定されました。');
        return;
    }

    title.innerHTML = `<i class="fas fa-file-code"></i> ${stageTitle} - 生の出力結果`;
    
    const htmlContent = `
      <div class="raw-output-container">
        <div class="raw-output-header" style="background: linear-gradient(135deg, #e3f2fd 0%, #f0f8ff 100%); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #2196f3;">
          <h4 style="margin: 0 0 0.5rem 0; color: #1976d2; display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-info-circle"></i> ${stageDescription}
          </h4>
          <div style="font-size: 0.9rem; color: #1565c0;">
            <div style="margin-bottom: 0.25rem;">
              <strong>処理日時:</strong> ${new Date(rawData.timestamp).toLocaleString('ja-JP')}
            </div>
            <div style="margin-bottom: 0.25rem;">
              <strong>データサイズ:</strong> ${rawData.data?.length || 0} 文字
            </div>
            <div>
              <strong>段階:</strong> ${stageTitle}
            </div>
          </div>
        </div>
        
        <div class="raw-output-content">
          <h5 style="color: #ff9800; margin: 0 0 0.5rem 0; display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-code"></i> 生の出力データ
            <span style="background: #ff9800; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem;">RAW</span>
          </h5>
          <textarea readonly style="width: 100%; height: 400px; padding: 1rem; border: 2px solid #ff9800; border-radius: 4px; font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; font-size: 0.8rem; background: #fff8f0; resize: vertical; line-height: 1.4; white-space: pre-wrap;">${rawData.data || '生の出力データが利用できません'}</textarea>
          
          <div style="margin-top: 1rem; padding: 1rem; background: #e8f5e8; border-radius: 4px; border-left: 4px solid #4caf50;">
            <h6 style="margin: 0 0 0.5rem 0; color: #2e7d32; display: flex; align-items: center; gap: 0.5rem;">
              <i class="fas fa-lightbulb"></i> ヒント
            </h6>
            <ul style="margin: 0; padding-left: 1.5rem; color: #1b5e20; line-height: 1.5;">
              <li>この生データはAIモデルが生成した未加工の出力です</li>
              <li>実際の3D表示では、この生データから有効な部分のみが抽出されます</li>
              <li>デバッグや処理内容の確認にご活用ください</li>
            </ul>
          </div>
        </div>
      </div>
    `;

    content.innerHTML = htmlContent;
    modal.style.display = 'flex';
    
    this.log('info', `第${stage}段階の生出力を表示`, {
      dataLength: rawData.data?.length || 0
    });
  }

  /**
   * 生の出力結果モーダルを閉じる
   */
  closeRawOutputModal() {
    document.getElementById('rawOutputModal').style.display = 'none';
  }

  /**
   * 生の出力データとiマークをクリア
   */
  clearStageRawData() {
    // データをクリア
    this.stageRawData = {
      stage1: null,
      stage2: null
    };
    
    // iマークを非表示
    const stage1InfoBtn = document.getElementById('stage1InfoBtn');
    const stage2InfoBtn = document.getElementById('stage2InfoBtn');
    
    if (stage1InfoBtn) stage1InfoBtn.style.display = 'none';
    if (stage2InfoBtn) stage2InfoBtn.style.display = 'none';
    
    this.log('debug', '生の出力データとiマークをクリア');
  }

  /**
   * セッション復元時に生の出力データとiマーク状態を復元
   */
  restoreStageRawDataFromProject(projectData) {
    try {
      // stage1データの復元
      if (projectData.stage1Data && projectData.stage1Data.optimized_specification) {
        this.saveStageRawData(1, projectData.stage1Data.optimized_specification);
        // iマークを表示
        setTimeout(() => this.showStageInfoButton(1), 50);
      }
      
      // stage2データの復元
      if (projectData.stage2Data && projectData.stage2Data.rawOutput) {
        this.saveStageRawData(2, projectData.stage2Data.rawOutput);
        // iマークを表示
        setTimeout(() => this.showStageInfoButton(2), 50);
      }
      
      this.log('info', 'セッション復元: 生の出力データを復元', {
        stage1Restored: !!projectData.stage1Data,
        stage2Restored: !!projectData.stage2Data
      });
      
    } catch (error) {
      this.log('warn', 'セッション復元: 生の出力データ復元でエラー', { error: error.message });
    }
  }

  // ========== UI ヘルパーメソッド ==========
  showLoading(show, text = 'AI が3Dモデルを生成中...') {
    const loading = document.getElementById('loadingIndicator');
    const loadingText = loading.querySelector('.loading-text');
    
    if (show) {
      loadingText.textContent = text;
      loading.classList.add('active');
    } else {
      loading.classList.remove('active');
    }
  }

  showStopButton(show) {
    const stopBtn = document.getElementById('stopProcessingBtn');
    if (stopBtn) {
      stopBtn.style.display = show ? 'inline-block' : 'none';
    }
  }

  showWarning(message) {
    const successEl = document.getElementById('successMessage');
    successEl.innerHTML = `⚠️ ${message}`;
    successEl.style.display = 'block';
    successEl.style.backgroundColor = '#fff3cd';
    successEl.style.borderColor = '#ffeaa7';
    successEl.style.color = '#856404';
    setTimeout(() => {
      successEl.style.display = 'none';
      // スタイルをリセット
      successEl.style.backgroundColor = '';
      successEl.style.borderColor = '';
      successEl.style.color = '';
    }, 5000);
  }

  showError(message, isPersistent = true) {
    const errorEl = document.getElementById('errorMessage');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    
    // isPersistentがfalseの場合のみ自動で消す（従来の動作）
    if (!isPersistent) {
      setTimeout(() => errorEl.style.display = 'none', 5000);
    }
    // isPersistentがtrue（デフォルト）の場合はエラーメッセージを表示し続ける
  }

  showSuccess(message) {
    const successEl = document.getElementById('successMessage');
    successEl.textContent = message;
    successEl.style.display = 'block';
    setTimeout(() => successEl.style.display = 'none', 2000);
  }

  showInfo(message) {
    // 情報メッセージ表示（エラーでもサクセスでもない中立的なメッセージ）
    const successEl = document.getElementById('successMessage');
    successEl.textContent = message;
    successEl.style.display = 'block';
    successEl.style.backgroundColor = '#e7f3ff';
    successEl.style.borderColor = '#b3d9ff';
    setTimeout(() => {
      successEl.style.display = 'none';
      // スタイルをリセット
      successEl.style.backgroundColor = '';
      successEl.style.borderColor = '';
    }, 4000);
  }

  hideMessages() {
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';
  }

  hideErrorMessages() {
    document.getElementById('errorMessage').style.display = 'none';
  }

  hideSuccessMessages() {
    document.getElementById('successMessage').style.display = 'none';
  }

  // ========== 色設定表示名取得 ==========
  getColorSchemeDisplayName(colorScheme) {
    const displayNames = {
      'gradient': 'グラデーション',
      'bright': '明るい単色',
      'transparent': '半透明'
    };
    return displayNames[colorScheme] || colorScheme;
  }

  enableDownloadButtons() {
    // ダウンロード機能は削除されました - 再生成セクションのみ表示
    const regenerationSection = document.getElementById('regenerationSection');
    if (regenerationSection) {
      regenerationSection.style.display = 'block';
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  truncateText(text, length) {
    return text.length > length ? text.substring(0, length) + '...' : text;
  }

  showThreeStageProgress(show) {
    const progressContainer = document.getElementById('threeStageProgress');
    if (show) {
      progressContainer.style.display = 'block';
      // 全ステージをリセット（2段階対応）
      for (let i = 1; i <= 2; i++) {
        this.updateStageProgress(i, 'pending', '待機中');
      }
    } else {
      progressContainer.style.display = 'none';
    }
  }

  updateStageProgress(stage, status, message) {
    // ステージ1-2まで有効（HTMLに存在する）
    if (stage < 1 || stage > 2) {
      this.log('warn', '無効なステージ番号', { stage: stage });
      return;
    }
    
    const stageElement = document.getElementById(`stage${stage}`);
    const stageIcon = document.getElementById(`stage${stage}Icon`);
    const stageText = document.getElementById(`stage${stage}Text`);
    
    if (!stageElement || !stageIcon || !stageText) {
      this.log('error', 'ステージ要素が見つかりません', { 
        stage: stage,
        elementExists: !!stageElement,
        iconExists: !!stageIcon,
        textExists: !!stageText
      });
      return;
    }
    
    // 既存のクラスを削除
    stageElement.className = `stage-item stage-${status}`;
    
    // アイコンを更新
    let iconClass = '';
    switch (status) {
      case 'pending':
        iconClass = 'fas fa-circle';
        break;
      case 'active':
        iconClass = 'fas fa-spinner fa-spin';
        break;
      case 'completed':
        iconClass = 'fas fa-check-circle';
        break;
      case 'error':
        iconClass = 'fas fa-exclamation-circle';
        break;
    }
    stageIcon.className = iconClass;
    
    // テキストを更新
    stageText.textContent = message;
    
    // 完了時にiマークを表示
    if (status === 'completed') {
      this.showStageInfoButton(stage);
    }
    
    // デバッグパネルの更新
    this.updateDebugPanel();
  }

  // ========== 3Dプレビュー関連 ==========
  setup3DPreview() {
    const container = document.getElementById('threeContainer');
    if (!container) {
      this.log('warn', '3Dプレビューコンテナが見つかりません');
      return;
    }

    // Three.jsが利用可能かチェック
    if (typeof THREE === 'undefined') {
      this.log('warn', 'Three.jsライブラリが読み込まれていません');
      return;
    }

    // シーンの初期化
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, container.offsetWidth / container.offsetHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    this.renderer.setSize(container.offsetWidth, container.offsetHeight);
    this.renderer.setClearColor(0xf0f0f0, 1);
    container.appendChild(this.renderer.domElement);

    // ライト設定
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);

    // カメラ位置設定
    this.camera.position.set(100, 100, 100);
    this.camera.lookAt(0, 0, 0);

    // リサイズ対応
    window.addEventListener('resize', () => {
      if (this.camera && this.renderer) {
        this.camera.aspect = container.offsetWidth / container.offsetHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.offsetWidth, container.offsetHeight);
      }
    });

    this.log('info', '3Dプレビュー環境を初期化しました');
  }

  display3DModel(objData) {
    // SceneManagerが利用可能な場合はそちらを優先
    if (this.sceneManager && this.sceneManager.isInitialized) {
      this.log('info', 'SceneManagerを使用して3Dモデルを表示');
      try {
        this.sceneManager.loadOBJModel(objData);
        return;
      } catch (error) {
        this.log('warn', 'SceneManager表示失敗、フォールバック実行', { error: error.message });
      }
    }

    // フォールバック: core.jsの3Dプレビュー
    if (!this.scene || !this.renderer || !this.camera) {
      this.log('warn', '3Dプレビューが初期化されていません');
      this.show3DFallback();
      return;
    }

    try {
      // 既存のモデルを削除
      const existingModels = this.scene.children.filter(child => child.userData.isModel);
      existingModels.forEach(model => this.scene.remove(model));

      // OBJローダーでモデルを読み込み
      const loader = new THREE.OBJLoader();
      const model = loader.parse(objData);
      
      // マテリアル設定
      const material = new THREE.MeshLambertMaterial({ 
        color: 0x8B4513,  // 木材の色
        transparent: false 
      });
      
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = material;
        }
      });

      model.userData.isModel = true;
      this.scene.add(model);

      // プレースホルダーオーバーレイを非表示
      const overlay = document.getElementById('canvasOverlay');
      if (overlay) {
        overlay.style.display = 'none';
      }

      // モデルの境界ボックスを計算してカメラ位置を調整
      const bbox = new THREE.Box3().setFromObject(model);
      const center = bbox.getCenter(new THREE.Vector3());
      const size = bbox.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      
      this.camera.position.set(
        center.x + maxDim * 1.5,
        center.y + maxDim * 1.2, 
        center.z + maxDim * 1.5
      );
      this.camera.lookAt(center);

      // レンダリング開始
      this.startRenderLoop();

      this.log('info', '3Dモデルを表示しました（フォールバック）', { 
        vertices: objData.split('v ').length - 1,
        faces: objData.split('f ').length - 1 
      });

    } catch (error) {
      this.log('error', '3Dモデル表示エラー', { error: error.message });
      this.show3DFallback();
    }
  }

  startRenderLoop() {
    if (!this.renderLoop) {
      const animate = () => {
        if (this.scene && this.renderer && this.camera) {
          this.renderer.render(this.scene, this.camera);
        }
        this.renderLoop = requestAnimationFrame(animate);
      };
      animate();
    }
  }

  show3DFallback() {
    const previewContainer = document.querySelector('#threeContainer');
    if (previewContainer) {
      previewContainer.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666; flex-direction: column;">
          <i class="fas fa-cube" style="font-size: 48px; margin-bottom: 10px;"></i>
          <p>3Dプレビューは利用できませんが、<br>モデルファイルのダウンロードは可能です</p>
        </div>
      `;
    }
  }

  // ========== 段階別結果ボタン表示管理 ==========




  // ========== エラーレポート生成 ==========
  generateSessionRestoreErrorReport(error, sessionData) {
    const report = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      sessionData: {
        hasSession: !!sessionData,
        sessionAge: sessionData ? (Date.now() - sessionData.timestamp) / (1000 * 60 * 60) + ' hours' : 'N/A',
        hasProject: !!sessionData?.currentProject,
        hasObjData: !!sessionData?.currentProject?.objData,
        objDataSize: sessionData?.currentProject?.objData?.length || 0
      },
      systemState: {
        hasThreeJS: typeof THREE !== 'undefined',
        threeRevision: typeof THREE !== 'undefined' ? THREE.REVISION : 'N/A',
        hasOBJLoader: typeof THREE?.OBJLoader !== 'undefined',
        hasOrbitControls: typeof THREE?.OrbitControls !== 'undefined',
        hasSceneManager: !!this.sceneManager,
        sceneInitialized: !!this.sceneManager?.isInitialized,
        containerExists: !!document.getElementById('threeContainer')
      },
      browserInfo: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        localStorage: {
          diyProjects: !!localStorage.getItem('diy_projects'),
          diyCurrentSession: !!localStorage.getItem('diy_current_session'),
          diyInputSession: !!localStorage.getItem('diy_input_session')
        }
      }
    };
    
    // エラーレポートをローカルストレージに保存
    try {
      const errorReports = JSON.parse(localStorage.getItem('diy_session_error_reports') || '[]');
      errorReports.push(report);
      // 最新10件のみ保持
      if (errorReports.length > 10) {
        errorReports.splice(0, errorReports.length - 10);
      }
      localStorage.setItem('diy_session_error_reports', JSON.stringify(errorReports));
    } catch (storageError) {
      this.log('error', 'エラーレポート保存失敗', { error: storageError.message });
    }
    
    this.log('error', 'セッション復元エラーレポート生成', report);
    return report;
  }

  // ========== エラーレポートエクスポート ==========
  exportSessionErrorReports() {
    try {
      const errorReports = JSON.parse(localStorage.getItem('diy_session_error_reports') || '[]');
      const exportData = {
        generated: new Date().toISOString(),
        errorReports: errorReports,
        currentSession: localStorage.getItem('diy_current_session'),
        projects: localStorage.getItem('diy_projects'),
        logs: this.logHistory.slice(-50) // 最新50件のログ
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diy-session-error-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.log('info', 'セッションエラーレポートをエクスポートしました');
      this.showSuccess('エラーレポートがダウンロードされました。');
    } catch (error) {
      this.log('error', 'エラーレポートエクスポート失敗', { error: error.message });
      this.showError('エラーレポートのエクスポートに失敗しました。');
    }
  }




}