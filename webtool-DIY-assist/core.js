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
    this.processingManager = new ProcessingManager(this);
    
    // 状態管理
    this.currentObjData = null;
    this.currentOptimizedPrompt = null;
    this.currentStage = null;
    this.eventListenersSetup = false; // イベントリスナー重複防止フラグ
    this.lastDownloadTime = null; // ダウンロード重複防止用
    this.downloadInProgress = false; // ダウンロード実行中フラグ
    
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
      desk: {
        title: "学習デスク",
        prompt: `幅120cm × 奥行60cm × 高さ75cmの学習デスク

【基本仕様】
• サイズ：幅120cm × 奥行60cm × 高さ75cm
• 材質：メラミン化粧板（ホワイト）、スチール脚（ブラック）
• 機能：引き出し2つ（右側）、配線穴1つ（奥側中央）
• デザイン：シンプルモダン、北欧風
• 用途：子供部屋、書斎用
• 特記事項：耐荷重30kg、組み立て式、角は安全な丸み加工`,
        width: 120,
        depth: 60,
        height: 75
      },
      shelf: {
        title: "本棚",
        prompt: `幅80cm × 奥行30cm × 高さ180cmの本棚

【基本仕様】
• サイズ：幅80cm × 奥行30cm × 高さ180cm
• 材質：パイン材（ナチュラル）
• 機能：可動棚板5枚、固定棚板2枚
• デザイン：ナチュラルウッド、カントリー風
• 用途：リビング、書斎用
• 特記事項：各段耐荷重15kg、転倒防止金具付き、背板あり`,
        width: 80,
        depth: 30,
        height: 180
      },
      chair: {
        title: "ダイニングチェア",
        prompt: `ダイニングチェア（幅45cm × 奥行50cm × 高さ80cm）

【基本仕様】
• サイズ：幅45cm × 奥行50cm × 高さ80cm（座面高45cm）
• 材質：ウォールナット材、ファブリック座面（グレー）
• 機能：背もたれクッション、座面クッション
• デザイン：モダン、ミッドセンチュリー風
• 用途：ダイニング、カフェテーブル用
• 特記事項：耐荷重100kg、スタッキング不可、脚部滑り止め付き`,
        width: 45,
        depth: 50,
        height: 80
      },
      cabinet: {
        title: "キャビネット",
        prompt: `幅90cm × 奥行40cm × 高さ85cmのキャビネット

【基本仕様】
• サイズ：幅90cm × 奥行40cm × 高さ85cm
• 材質：オーク材（ダークブラウン）
• 機能：観音扉2枚、内部棚板2枚（可動式）、引き出し2段
• デザイン：クラシック、アンティーク風
• 用途：リビング、ダイニング用収納
• 特記事項：各棚耐荷重20kg、ソフトクローズ機能付き、鍵なし`,
        width: 90,
        depth: 40,
        height: 85
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

    // メイン機能ボタン
    safeAddEventListener('generateBtn', 'click', () => this.generateModel());
    safeAddEventListener('clearBtn', 'click', () => this.clearForm());
    safeAddEventListener('downloadObjBtn', 'click', () => this.downloadOBJ());

    // サンプルボタンのイベントリスナー（少し遅延して実行）
    setTimeout(() => {
      this.log('debug', 'サンプルボタンセットアップ開始（遅延実行）');
      this.setupSampleButtons();
    }, 50);

    

    // 段階別結果表示ボタン
    safeAddEventListener('showStage1ResultBtn', 'click', () => this.showStageResult(1));
    safeAddEventListener('showStage2ResultBtn', 'click', () => this.showStageResult(2));
    safeAddEventListener('showStage3ResultBtn', 'click', () => this.showStageResult(3));

    // 全履歴削除ボタン
    safeAddEventListener('clearAllProjectsBtn', 'click', () => this.clearAllProjects());

    // モーダル関連
    safeAddEventListener('closePromptModal', 'click', () => this.closePromptModal());
    safeAddEventListener('closePromptModalBtn', 'click', () => this.closePromptModal());
    safeAddEventListener('copyPromptBtn', 'click', () => this.copyPromptToClipboard());

    // モーダル背景クリックで閉じる
    const promptModal = document.getElementById('promptModal');
    if (promptModal) {
      promptModal.addEventListener('click', (e) => {
        if (e.target.id === 'promptModal') {
          this.closePromptModal();
        }
      });
    }

    // 段階別結果モーダル関連
    safeAddEventListener('closeStageResultModal', 'click', () => this.closeStageResultModal());
    safeAddEventListener('closeStageResultModalBtn', 'click', () => this.closeStageResultModal());
    
    const stageResultModal = document.getElementById('stageResultModal');
    if (stageResultModal) {
      stageResultModal.addEventListener('click', (e) => {
        if (e.target.id === 'stageResultModal') {
          this.closeStageResultModal();
        }
      });
    }

    // 入力フィールドの保存（即座に保存して復元対応）
    safeAddEventListener('designPrompt', 'input', () => {
      localStorage.setItem('diy_prompt', document.getElementById('designPrompt').value);
      this.saveInputSession(); // 入力セッション保存
    });

    // パラメータ入力の同期
    ['widthParam', 'depthParam', 'heightParam'].forEach(id => {
      safeAddEventListener(id, 'input', () => {
        this.saveParameters();
        this.saveInputSession(); // 入力セッション保存
      });
    });

    // ウィンドウリサイズ対応
    window.addEventListener('resize', () => this.sceneManager.onWindowResize());

    // デバッグ用キーボードショートカット
    document.addEventListener('keydown', (e) => {
      // Ctrl+Shift+D でデバッグモード切り替え
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        this.toggleDebugMode();
      }
      // Ctrl+Shift+L でログエクスポート
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        this.exportLogs();
      }
      // Ctrl+Shift+C でLocalStorageクリア
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        this.clearAllData();
      }
    });

    // イベントリスナーセットアップ完了フラグを設定
    this.eventListenersSetup = true;
    this.log('debug', 'イベントリスナーセットアップ完了');
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

    this.log('debug', 'ProcessingManagerのexecuteFullProcessを呼び出します');
    
    // 処理は ProcessingManager に委譲
    try {
      await this.processingManager.executeFullProcess(prompt);
      this.log('debug', 'executeFullProcess完了');
    } catch (error) {
      this.log('error', 'executeFullProcessでエラー', { error: error.message });
      throw error;
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
    
    // ローカルストレージをクリア（セッション状態も含む）
    localStorage.removeItem('diy_prompt');
    localStorage.removeItem('diy_parameters');
    localStorage.removeItem('diy_current_session'); // セッション状態もクリア
    localStorage.removeItem('diy_input_session'); // 入力セッションもクリア
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
  }

  // ========== ダウンロード機能 ==========
  downloadOBJ() {
    // 重複実行を防ぐガード（実行中フラグ + 時間制限）
    if (this.downloadInProgress) {
      this.log('debug', 'ダウンロード実行中のため重複を防止しました');
      return;
    }
    
    if (!this.currentObjData) {
      this.log('warn', 'ダウンロードするOBJデータがありません');
      return;
    }
    
    // 時間ベースの重複防止（500ms以内の重複クリックを防ぐ）
    const now = Date.now();
    if (this.lastDownloadTime && (now - this.lastDownloadTime) < 500) {
      this.log('debug', 'ダウンロード重複実行を防止しました（時間制限）', { 
        timeSinceLastDownload: now - this.lastDownloadTime 
      });
      return;
    }
    
    // ダウンロード実行開始
    this.downloadInProgress = true;
    this.lastDownloadTime = now;
    
    this.log('debug', 'OBJファイルダウンロード開始', {
      dataLength: this.currentObjData.length,
      startsWithV: this.currentObjData.trim().startsWith('v '),
      startsWithHash: this.currentObjData.trim().startsWith('#'),
      preview: this.currentObjData.substring(0, 100) + '...'
    });
    
    try {
      // 確実にOBJデータであることを確認
      if (!this.currentObjData.trim().startsWith('v ') && !this.currentObjData.trim().startsWith('#')) {
        this.log('error', '無効なOBJデータです', { preview: this.currentObjData.substring(0, 100) });
        this.showError('ダウンロード可能なOBJデータがありません');
        return;
      }
      
      const blob = new Blob([this.currentObjData], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `furniture_${now}.obj`; // タイムスタンプを固定してファイル名重複を防ぐ
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.log('info', 'OBJファイルダウンロード完了', { filename: `furniture_${now}.obj` });
      
    } catch (error) {
      this.log('error', 'ダウンロード処理でエラー', { error: error.message });
      this.showError('ダウンロード処理でエラーが発生しました');
    } finally {
      // ダウンロード処理完了（500ms後にフラグを解除）
      setTimeout(() => {
        this.downloadInProgress = false;
        this.log('debug', 'ダウンロード実行フラグをリセットしました');
      }, 500);
    }
  }

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
    const project = {
      id: Date.now(),
      prompt: prompt,
      objData: objData,
      qualityCheck: qualityCheck,
      optimizedSpec: optimizedSpec,
      optimizedPrompt: this.currentOptimizedPrompt, // 最適化されたプロンプトも保存
      stage1Data: this.processingManager.stage1Data, // 第1段階データ保存
      stage2Data: this.processingManager.stage2Data, // 第2段階データ保存
      stage3Data: this.processingManager.stage3Data, // 第3段階データ保存
      timestamp: new Date().toISOString(),
      parameters: {
        width: document.getElementById('widthParam').value,
        depth: document.getElementById('depthParam').value,
        height: document.getElementById('heightParam').value
      }
    };
    
    this.projects.unshift(project);
    
    // 最大10プロジェクトまで保持
    if (this.projects.length > 10) {
      this.projects = this.projects.slice(0, 10);
    }
    
    localStorage.setItem('diy_projects', JSON.stringify(this.projects));
    
    // 現在のセッション状態も保存（ページ更新対応）
    this.saveCurrentSession(project);
    
    // 3Dモデルが保存されたら入力セッションは不要
    localStorage.removeItem('diy_input_session');
    
    this.renderProjectList();
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
          this.log('debug', 'セッション復元: 3Dモデル復元開始', { 
            objDataSize: session.currentProject.objData.length 
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
            
            // 品質チェック結果を復元
            if (session.currentProject.qualityCheck) {
              this.processingManager.storeQualityCheckResults(session.currentProject.qualityCheck);
            }
            
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
            if (session.currentProject.stage3Data) {
              this.processingManager.stage3Data = session.currentProject.stage3Data;
            }
            
            // 段階別結果ボタンを表示
            this.showStageResultButtons();
            
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
      
      // OBJデータの検証
      if (!project.objData || project.objData.trim().length === 0) {
        throw new Error('プロジェクトに3Dモデルデータが含まれていません。');
      }
      
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
      
      // 品質チェック結果を保存（保存されている場合）
      if (project.qualityCheck) {
        this.processingManager.storeQualityCheckResults(project.qualityCheck);
      }
      
      // 最適化されたプロンプトを復元（保存されている場合）
      if (project.optimizedPrompt) {
        this.currentOptimizedPrompt = project.optimizedPrompt;
      }
      
      // 段階別データを復元（保存されている場合）
      if (project.stage1Data) {
        this.processingManager.stage1Data = project.stage1Data;
      }
      if (project.stage2Data) {
        this.processingManager.stage2Data = project.stage2Data;
      }
      if (project.stage3Data) {
        this.processingManager.stage3Data = project.stage3Data;
      }
      
      // 段階別結果ボタンを表示
      this.showStageResultButtons();
      
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


  // ========== 段階別結果モーダル管理 ==========
  showStageResult(stage) {
    const modal = document.getElementById('stageResultModal');
    const title = document.getElementById('stageResultModalTitle');
    const content = document.getElementById('stageResultContent');
    
    let titleText = '';
    let htmlContent = '';
    
    switch (stage) {
      case 1:
        titleText = '<i class="fas fa-cogs"></i> 第1段階：仕様分析結果';
        htmlContent = this.generateStage1Content();
        break;
      case 2:
        titleText = '<i class="fas fa-cube"></i> 第2段階：3Dモデル生成結果';
        htmlContent = this.generateStage2Content();
        break;
      case 3:
        titleText = '<i class="fas fa-check-circle"></i> 第3段階：品質検証結果';
        htmlContent = this.generateStage3Content();
        break;
      default:
        this.showError('無効な段階が指定されました。');
        return;
    }
    
    if (!htmlContent) {
      this.showError(`第${stage}段階のデータが見つかりません。処理を完了してからお試しください。`);
      return;
    }
    
    title.innerHTML = titleText;
    content.innerHTML = htmlContent;
    modal.style.display = 'flex';
  }

  generateStage1Content() {
    const data = this.processingManager.stage1Data;
    if (!data) return null;

    const analysisStatus = data.analysis_complete ? '✅ LLM分析完了' : '⚠️ フォールバック使用';
    const formattedSpec = this.processingManager.convertMarkdownToHTML(data.optimized_specification);
    const originalPrompt = data.originalPrompt || 'プロンプト情報が利用できません';
    const systemPrompt = data.systemPrompt || 'システムプロンプト情報が利用できません';

    return `
      <div class="optimized-spec-results">
        <h4 style="color: #2196f3; margin: 0 0 1rem 0;">
          <i class="fas fa-cogs"></i> 第1段階：仕様分析と最適化結果
        </h4>
        
        <div class="spec-section" style="margin-bottom: 1.5rem;">
          <h5 style="color: #9c27b0; margin: 0 0 0.5rem 0;">
            <i class="fas fa-robot"></i> システムプロンプト
          </h5>
          <textarea readonly style="width: 100%; height: 200px; padding: 1rem; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; font-size: 0.8rem; background: #f3e5f5; resize: vertical;">${systemPrompt}</textarea>
        </div>
        
        <div class="spec-section" style="margin-bottom: 1.5rem;">
          <h5 style="color: #ff9800; margin: 0 0 0.5rem 0;">
            <i class="fas fa-terminal"></i> 使用されたプロンプト（ユーザー入力）
          </h5>
          <textarea readonly style="width: 100%; height: 150px; padding: 1rem; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; font-size: 0.85rem; background: #fff8f0; resize: vertical;">${originalPrompt}</textarea>
        </div>
        
        <div class="spec-section">
          <h5 style="color: #2196f3; margin: 0 0 0.5rem 0;">
            <i class="fas fa-clipboard-list"></i> 分析結果（OBJ形式3D設計仕様）
          </h5>
          <div style="margin-bottom: 1rem;">
            <strong>分析状況：</strong> ${analysisStatus} |
            <strong>家具種別：</strong> ${data.furniture_type} |
            <strong>寸法：</strong> ${data.dimensions.width}×${data.dimensions.depth}×${data.dimensions.height}cm
          </div>
          <div style="background: #f0f8ff; padding: 1rem; border: 1px solid #ddd; border-radius: 4px; max-height: 400px; overflow-y: auto;">
            ${formattedSpec}
          </div>
        </div>
      </div>
    `;
  }

  generateStage2Content() {
    const data = this.processingManager.stage2Data;
    if (!data) return null;

    const { objData, furnitureSpec, systemPrompt, actualPrompt } = data;
    
    // 実際に使用されたプロンプト（第1段階の完全出力を含む）を取得
    const stage2Prompt = actualPrompt || this.getStage2Prompt(furnitureSpec);
    const stage2SystemPrompt = systemPrompt || 'システムプロンプト情報が利用できません';

    return `
      <div class="model-generation-results">
        <h4 style="color: #4caf50; margin: 0 0 1rem 0;">
          <i class="fas fa-cube"></i> 第2段階：3Dモデル生成結果
        </h4>
        
        <div class="model-section" style="margin-bottom: 1.5rem;">
          <h5 style="color: #9c27b0; margin: 0 0 0.5rem 0;">
            <i class="fas fa-robot"></i> システムプロンプト
          </h5>
          <textarea readonly style="width: 100%; height: 250px; padding: 1rem; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; font-size: 0.8rem; background: #f3e5f5; resize: vertical;">${stage2SystemPrompt}</textarea>
        </div>
        
        <div class="model-section" style="margin-bottom: 1.5rem;">
          <h5 style="color: #2196f3; margin: 0 0 0.5rem 0;">
            <i class="fas fa-terminal"></i> 使用されたプロンプト
          </h5>
          <textarea readonly style="width: 100%; height: 200px; padding: 1rem; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; font-size: 0.85rem; background: #f0f8ff; resize: vertical;">${stage2Prompt}</textarea>
        </div>
        
        <div class="model-section">
          <h5 style="color: #4caf50; margin: 0 0 0.5rem 0;">
            <i class="fas fa-file-code"></i> 生成されたOBJファイル
          </h5>
          <textarea readonly style="width: 100%; height: 300px; padding: 1rem; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; font-size: 0.85rem; background: #f8f8f8; resize: vertical;">${objData}</textarea>
        </div>
      </div>
    `;
  }
  
  // 第2段階で使用されたプロンプトを取得
  getStage2Prompt(furnitureSpec) {
    if (!furnitureSpec) {
      return '第1段階の結果データが利用できません。';
    }
    
    // ProcessingManagerのformatStage1OutputForStage2と同じロジックを使用（第1段階の完全出力を含む）
    const stage1FullOutput = furnitureSpec.optimized_specification || '第1段階分析結果が利用できません';
    const furnitureType = furnitureSpec.furniture_type || '家具';
    const dimensions = furnitureSpec.dimensions || {};
    const analysisComplete = furnitureSpec.analysis_complete || false;
    
    // 寸法情報の詳細構築
    let dimensionInfo = '';
    if (dimensions.width || dimensions.depth || dimensions.height) {
      dimensionInfo = `\n📏 【確定寸法仕様】\n   - 幅: ${dimensions.width || 'auto'}cm\n   - 奥行: ${dimensions.depth || 'auto'}cm\n   - 高さ: ${dimensions.height || 'auto'}cm\n`;
    }
    
    // 分析状況の表示
    const analysisStatus = analysisComplete ? '✅ LLM分析完了' : '⚠️ フォールバック使用';
    
    // 第2段階で実際に使用されたプロンプト（第1段階の完全な出力結果をそのまま含む）
    const formattedPrompt = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【OBJ形式3Dモデル生成指示】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 【処理概要】
第1段階で分析・最適化された完全な結果を、そのまま正確にOBJ形式の3Dモデルとして実現してください。

📊 【第1段階分析状況】
🔧 家具種別: ${furnitureType}
📋 分析状況: ${analysisStatus}${dimensionInfo}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【第1段階の完全出力結果】※以下の内容をそのまま100%反映してください
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${stage1FullOutput}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【第2段階実行指示】※上記の第1段階結果の全内容を正確にOBJ化
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 【実装推奨事項】
• 第1段階分析結果の主要な寸法・構造・デザインを3D化の基準として活用
• 寸法は概ね指定通りを目指し、3D化に適した調整を柔軟に適用
• 重要な構造的特徴を立体形状として表現
• 材質情報・デザイン要件を参考に、魅力的な形状を創造

✅ 【OBJ品質目標】
• 安定した基本的な3Dジオメトリ
• 適切な頂点密度（10-1000点）と面構成（10-1000面）
• 基本的なOBJ構文に準拠
• 美しく実用的な家具モデルとしての品質

✅ 【基本方針】
💡 第1段階結果を参考に、3D化に適した創造的解釈を歓迎
💡 OBJデータのみを出力（説明文・コメント等は含めない）
💡 技術的制約を考慮した合理的な最適化を推奨

上記の第1段階分析結果を参考に、美しく実用的なOBJファイルを創造的に生成してください。`;

    return formattedPrompt;
  }

  generateStage3Content() {
    const data = this.processingManager.stage3Data;
    if (!data) return null;

    const inputPrompt = data.inputPrompt || '品質検証の入力プロンプトが利用できません';
    const systemPrompt = data.systemPrompt || 'システムプロンプト情報が利用できません';
    const qualityReport = data.qualityReport || 'LLMによる品質評価レポートが利用できません';
    const improvedObjData = data.improvedObjData || data.originalObjData || '評価されたOBJデータが利用できません';
    const objAnalysis = data.objAnalysis || {};

    // OBJ分析情報の表示
    const analysisInfo = objAnalysis ? `
頂点数: ${objAnalysis.vertexCount || 'N/A'}
面数: ${objAnalysis.faceCount || 'N/A'}
寸法: ${objAnalysis.overallDimensions ? 
  `${objAnalysis.overallDimensions.width?.toFixed(1) || 'N/A'} × ${objAnalysis.overallDimensions.depth?.toFixed(1) || 'N/A'} × ${objAnalysis.overallDimensions.height?.toFixed(1) || 'N/A'} cm` : 'N/A'}
    `.trim() : '分析情報なし';

    return `
      <div class="quality-check-results">
        <h4 style="color: #ff9800; margin: 0 0 1rem 0;">
          <i class="fas fa-check-circle"></i> 第3段階：品質検証と評価結果
        </h4>
        
        <div class="quality-section" style="margin-bottom: 1.5rem;">
          <h5 style="color: #e91e63; margin: 0 0 0.5rem 0;">
            <i class="fas fa-chart-bar"></i> OBJ構造分析
          </h5>
          <div style="background: #fce4ec; padding: 1rem; border-radius: 4px; font-family: monospace; font-size: 0.9rem; white-space: pre-line;">
${analysisInfo}
          </div>
        </div>
        
        <div class="quality-section" style="margin-bottom: 1.5rem;">
          <h5 style="color: #4caf50; margin: 0 0 0.5rem 0;">
            <i class="fas fa-clipboard-check"></i> LLM品質評価レポート
          </h5>
          <div style="background: #f8fff8; padding: 1rem; border: 1px solid #ddd; border-radius: 4px; max-height: 400px; overflow-y: auto; white-space: pre-wrap; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 0.9rem; line-height: 1.5;">${qualityReport}</div>
        </div>
        
        <div class="quality-section" style="margin-bottom: 1.5rem;">
          <h5 style="color: #9c27b0; margin: 0 0 0.5rem 0;">
            <i class="fas fa-robot"></i> システムプロンプト
          </h5>
          <textarea readonly style="width: 100%; height: 120px; padding: 1rem; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; font-size: 0.8rem; background: #f3e5f5; resize: vertical;">${systemPrompt}</textarea>
        </div>
        
        <div class="quality-section" style="margin-bottom: 1.5rem;">
          <h5 style="color: #2196f3; margin: 0 0 0.5rem 0;">
            <i class="fas fa-terminal"></i> 使用されたプロンプト
          </h5>
          <textarea readonly style="width: 100%; height: 150px; padding: 1rem; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; font-size: 0.8rem; background: #f0f8ff; resize: vertical;">${inputPrompt}</textarea>
        </div>
        
        <div class="quality-section">
          <h5 style="color: #ff9800; margin: 0 0 0.5rem 0;">
            <i class="fas fa-file-code"></i> 評価されたOBJファイル
          </h5>
          <textarea readonly style="width: 100%; height: 250px; padding: 1rem; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; font-size: 0.8rem; background: #fff8f0; resize: vertical;">${improvedObjData}</textarea>
        </div>
      </div>
    `;
  }

  closeStageResultModal() {
    document.getElementById('stageResultModal').style.display = 'none';
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

  enableDownloadButtons() {
    // ボタングループを表示
    document.getElementById('downloadButtonGroup').style.display = 'block';
    
    // ボタンを有効化
    document.getElementById('downloadObjBtn').disabled = false;
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
      // 全ステージをリセット（3段階のみ）
      for (let i = 1; i <= 3; i++) {
        this.updateStageProgress(i, 'pending', '待機中');
      }
    } else {
      progressContainer.style.display = 'none';
    }
  }

  updateStageProgress(stage, status, message) {
    // ステージ1-3のみ有効（HTMLに存在する）
    if (stage < 1 || stage > 3) {
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
  showStageResultButtons() {
    // 第1段階結果ボタン
    if (this.processingManager.stage1Data) {
      const showStage1Btn = document.getElementById('showStage1ResultBtn');
      if (showStage1Btn) {
        showStage1Btn.style.display = 'block';
      }
    }
    
    // 第2段階結果ボタン
    if (this.processingManager.stage2Data) {
      const showStage2Btn = document.getElementById('showStage2ResultBtn');
      if (showStage2Btn) {
        showStage2Btn.style.display = 'block';
      }
    }
    
    // 第3段階結果ボタン
    if (this.processingManager.stage3Data) {
      const showStage3Btn = document.getElementById('showStage3ResultBtn');
      if (showStage3Btn) {
        showStage3Btn.style.display = 'block';
      }
    }
    

    
    this.log('debug', '段階別結果ボタンの表示状態を更新しました', {
      stage1: !!this.processingManager.stage1Data,
      stage2: !!this.processingManager.stage2Data,
      stage3: !!this.processingManager.stage3Data,
      stage2InputPrompt: !!this.processingManager.stage2Data
    });
  }

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