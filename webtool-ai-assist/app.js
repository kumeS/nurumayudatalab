/**
 * 次世代AIアシスタント - 業務効率90%向上システム
 * LLM + RAG + 多言語対応 + 革新的出力制御 + 作業時間削減計算
 */

class NextGenAssistantAI {
  constructor() {
    this.currentTask = null;
    this.currentStyle = 'business';
    this.currentLanguage = 'auto';
    this.ragEnabled = true;
    this.selectedInfo = [];
    this.informationHistory = [];
    this.isProcessing = false;
    this.currentPage = 'todo';
    this.outputHistory = [];
    
    // 新機能のための追加プロパティ
    this.aiAnalysisData = {
      emotionAccuracy: 97,
      urgencyAccuracy: 95,
      departmentAccuracy: 93,
      documentAccuracy: 96
    };
    this.currentSession = null;
    this.speechSynthesis = window.speechSynthesis;
    
    // 作業時間削減計算システム
    this.timeReductionCalculator = {
      // 個人設定（カスタマイズ可能）
      personalSettings: {
        typingSpeed: 40, // 文字/分（日本語の平均的な入力速度）
        thinkingTime: 0.5, // 文字あたりの考える時間（秒）
        proofreadingSpeed: 200, // 文字/分（校正・確認速度）
        experienceMultiplier: 1.0 // 経験値による効率化係数（0.5-2.0）
      },
      
      // タスクタイプ別時間係数
      taskComplexity: {
        'email': { complexity: 1.0, baseTime: 5 }, // 基本5分 + 文章量
        'email-reply': { complexity: 0.8, baseTime: 3 }, // 返信は短縮
        'document': { complexity: 1.5, baseTime: 10 },
        'report': { complexity: 2.0, baseTime: 20 },
        'proposal': { complexity: 2.5, baseTime: 30 },
        'presentation': { complexity: 1.8, baseTime: 25 },
        'schedule': { complexity: 0.6, baseTime: 3 },
        'agenda': { complexity: 0.7, baseTime: 5 },
        'minutes': { complexity: 1.3, baseTime: 15 },
        'faq': { complexity: 1.2, baseTime: 8 },
        'manual': { complexity: 2.2, baseTime: 25 },
        'analysis': { complexity: 3.0, baseTime: 40 }
      },
      
      // AI処理時間設定
      aiProcessing: {
        generationTime: 2, // AI生成時間（分）
        reviewTime: 0.3, // 文字あたりの確認時間（秒）
        editTime: 0.2 // 文字あたりの編集時間（秒）
      },
      
      // 累積削減データ
      totalSavings: {
        totalMinutesSaved: 0,
        documentsGenerated: 0,
        averageSavingPercentage: 0,
        lastUpdated: null
      }
    };
    
    this.initializeElements();
    this.initializeEventListeners();
    this.loadStoredData();
    this.setupAutoSave();
    this.initializeAdvancedFeatures();

    // 初期の時間削減計算表示
    this.updateTimeReduction();
    
    // 初期RAG状態の反映
    this.updateInputFieldStates();
  }

  initializeElements() {
    // ページ要素
    this.todoPage = document.getElementById('todoPage');
    this.historyPage = document.getElementById('historyPage');
    this.settingsPage = document.getElementById('settingsPage');
    this.historyList = document.getElementById('historyList');
    this.historySearch = document.getElementById('historySearch');
    
    // 入力要素
    this.todoInput = document.getElementById('todoInput');
    this.infoInput = document.getElementById('infoInput');
    this.todoCharCount = document.getElementById('todoCharCount');
    this.infoCharCount = document.getElementById('infoCharCount');
    
    // 出力要素
    this.outputContent = document.getElementById('outputContent');
    this.tagDisplay = document.getElementById('tagDisplay');
    
    // コントロール要素
    this.infoHistory = document.getElementById('infoHistory');
    this.generateBtn = document.getElementById('generateBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.saveSessionBtn = document.getElementById('saveSessionBtn');
    this.loadingIndicator = document.getElementById('loadingIndicator');
    
    // ファイル関連
    this.importInfoBtn = document.getElementById('importInfoBtn');
    this.exportInfoBtn = document.getElementById('exportInfoBtn');
    this.clearInfoBtn = document.getElementById('clearInfoBtn');
    this.infoFileInput = document.getElementById('infoFileInput');
    
    // RAG制御関連
    this.ragToggleBtn = document.getElementById('ragToggleBtn');
    this.ragStatusText = document.getElementById('ragStatusText');
    
    // 革新的出力制御要素
    this.copyOutputBtn = document.getElementById('copyOutputBtn');
    this.emailOutputBtn = document.getElementById('emailOutputBtn');
    this.wordOutputBtn = document.getElementById('wordOutputBtn');
    this.pdfOutputBtn = document.getElementById('pdfOutputBtn');
    this.speakOutputBtn = document.getElementById('speakOutputBtn');
    this.toInputBtn = document.getElementById('toInputBtn');
    this.exportOutputBtn = document.getElementById('exportOutputBtn');
    this.shareSlackBtn = document.getElementById('shareSlackBtn');
    this.shareTeamsBtn = document.getElementById('shareTeamsBtn');
    this.improveOutputBtn = document.getElementById('improveOutputBtn');
    
    // 時間削減計算表示要素
    this.manualTimeElement = document.getElementById('manualTime');
    this.aiTimeElement = document.getElementById('aiTime');
    this.savedTimeElement = document.getElementById('savedTime');
    this.typingSpeedInput = document.getElementById('typingSpeed');
    this.experienceLevelSelect = document.getElementById('experienceLevel');
    
    // 設定要素
    this.qualityLevelSelect = document.getElementById('qualityLevel');
    this.autoSaveIntervalSelect = document.getElementById('autoSaveInterval');

    this.fontSizeSelect = document.getElementById('fontSize');
    this.exportAllDataBtn = document.getElementById('exportAllDataBtn');
    this.importAllDataBtn = document.getElementById('importAllDataBtn');
    this.clearAllDataBtn = document.getElementById('clearAllDataBtn');
    this.allDataFileInput = document.getElementById('allDataFileInput');
    this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
  }

  initializeEventListeners() {
    // ページタブ切り替え
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchPage(btn.dataset.page));
    });
    
    // 履歴検索
    if (this.historySearch) {
      this.historySearch.addEventListener('input', () => this.filterHistory());
    }
    
    // 文字数カウント
    this.todoInput.addEventListener('input', () => this.updateCharCount(this.todoInput, this.todoCharCount));
    this.infoInput.addEventListener('input', () => this.updateCharCount(this.infoInput, this.infoCharCount));
    
    // 高度なタスク選択システム
    document.addEventListener('click', (e) => this.handleTaskSelection(e));
    
    // AI駆動文章スタイル選択
    document.querySelectorAll('.style-btn').forEach(btn => {
      btn.addEventListener('click', () => this.handleStyleSelection(btn));
    });
    
    // 多言語対応選択
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => this.handleLanguageSelection(btn));
    });

    // RAG型情報統合
    this.infoHistory.addEventListener('click', (e) => this.handleInfoSelection(e));
    
    // メインボタン
    this.generateBtn.addEventListener('click', () => this.generateContent());
    this.resetBtn.addEventListener('click', () => this.resetAll());
    this.saveSessionBtn.addEventListener('click', () => this.saveSession());
    
    // ファイル操作
    this.importInfoBtn.addEventListener('click', () => this.importInfo());
    this.exportInfoBtn.addEventListener('click', () => this.exportInfo());
    this.clearInfoBtn.addEventListener('click', () => this.clearInfo());
    this.infoFileInput.addEventListener('change', (e) => this.handleFileImport(e));
    
    // RAG制御
    this.ragToggleBtn.addEventListener('click', () => this.toggleRAG());
    
    // 革新的出力制御システム
    this.copyOutputBtn.addEventListener('click', () => this.copyOutput());
    this.emailOutputBtn.addEventListener('click', () => this.openEmailWithContent());
    this.wordOutputBtn.addEventListener('click', () => this.exportToWord());
    this.pdfOutputBtn.addEventListener('click', () => this.exportToPDF());
    this.speakOutputBtn.addEventListener('click', () => this.speakOutput());
    this.toInputBtn.addEventListener('click', () => this.moveOutputToInput());
    this.exportOutputBtn.addEventListener('click', () => this.exportOutput());
    this.shareSlackBtn.addEventListener('click', () => this.shareToSlack());
    this.shareTeamsBtn.addEventListener('click', () => this.shareToTeams());
    this.improveOutputBtn.addEventListener('click', () => this.improveOutput());
    
    // 時間削減計算設定の変更監視
    if (this.typingSpeedInput) {
      this.typingSpeedInput.addEventListener('input', () => {
        this.timeReductionCalculator.personalSettings.typingSpeed = parseInt(this.typingSpeedInput.value);
        this.saveStoredData();
        this.updateTimeReduction();
      });
    }
    
    if (this.experienceLevelSelect) {
      this.experienceLevelSelect.addEventListener('change', () => {
        this.timeReductionCalculator.personalSettings.experienceMultiplier = parseFloat(this.experienceLevelSelect.value);
        this.saveStoredData();
        this.updateTimeReduction();
      });
    }
    
    // 設定関連のイベントリスナー
    if (this.qualityLevelSelect) {
      this.qualityLevelSelect.addEventListener('change', () => this.saveStoredData());
    }
    
    if (this.autoSaveIntervalSelect) {
      this.autoSaveIntervalSelect.addEventListener('change', () => {
        this.updateAutoSaveInterval();
        this.saveStoredData();
      });
    }
    

    
    if (this.fontSizeSelect) {
      this.fontSizeSelect.addEventListener('change', () => {
        this.applyFontSize();
        this.saveStoredData();
      });
    }
    
    if (this.exportAllDataBtn) {
      this.exportAllDataBtn.addEventListener('click', () => this.exportAllData());
    }
    
    if (this.importAllDataBtn) {
      this.importAllDataBtn.addEventListener('click', () => this.importAllData());
    }
    
    if (this.clearAllDataBtn) {
      this.clearAllDataBtn.addEventListener('click', () => this.clearAllData());
    }
    
    if (this.allDataFileInput) {
      this.allDataFileInput.addEventListener('change', (e) => this.handleAllDataImport(e));
    }
    
    if (this.saveSettingsBtn) {
      this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
    }
  }

  switchPage(page) {
    // タブの状態更新
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === page);
    });
    
    // ページの表示/非表示
    this.todoPage.classList.toggle('active', page === 'todo');
    this.historyPage.classList.toggle('active', page === 'history');
    this.settingsPage.classList.toggle('active', page === 'settings');
    
    this.currentPage = page;
    
    // 履歴ページを開いた時に履歴を更新
    if (page === 'history') {
      this.updateHistoryDisplay();
    }
    
    // 設定ページを開いた時に設定を読み込み
    if (page === 'settings') {
      this.loadSettings();
    }
  }

  updateHistoryDisplay() {
    if (!this.historyList) return;
    
    const historyItems = this.outputHistory.filter(item => {
      const searchTerm = this.historySearch ? this.historySearch.value.toLowerCase() : '';
      return searchTerm === '' || 
             item.input.toLowerCase().includes(searchTerm) ||
             item.output.toLowerCase().includes(searchTerm) ||
             (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchTerm)));
    });
    
    this.historyList.innerHTML = historyItems.map(item => `
      <div class="history-item">
        <div class="history-item-header">
          <div style="flex: 1;">
            <h4 style="margin: 0 0 0.5rem 0; color: var(--primary);">${item.taskType || '不明なタスク'}</h4>
            <div class="history-item-date">${new Date(item.timestamp).toLocaleString('ja-JP')}</div>
          </div>
          <button class="delete-btn" onclick="assistant.deleteHistoryItem('${item.id}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
        <div style="color: var(--text-secondary); margin-bottom: 1rem;">
          <strong>入力:</strong> ${this.escapeHtml(item.input.substring(0, 100))}${item.input.length > 100 ? '...' : ''}
        </div>
        <div style="background: white; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
          <strong>出力:</strong><br>
          ${this.escapeHtml(item.output.substring(0, 300))}${item.output.length > 300 ? '...' : ''}
        </div>
        ${item.tags ? `
          <div class="history-item-tags">
            ${item.tags.map(tag => `<span class="history-tag">${this.escapeHtml(tag)}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `).join('');
    
    if (historyItems.length === 0) {
      this.historyList.innerHTML = `
        <div style="text-align: center; color: var(--text-secondary); padding: 2rem;">
          <i class="fas fa-search"></i><br>
          検索条件に一致する履歴が見つかりませんでした
        </div>
      `;
    }
  }

  filterHistory() {
    this.updateHistoryDisplay();
  }

  deleteHistoryItem(id) {
    this.outputHistory = this.outputHistory.filter(item => item.id !== id);
    this.saveStoredData();
    this.updateHistoryDisplay();
  }

  updateCharCount(textarea, countElement) {
    const count = textarea.value.length;
    countElement.textContent = `${count}文字`;
    
    // 文字数に応じて色を変更
    if (count > 1000) {
      countElement.style.color = 'var(--danger)';
    } else if (count > 500) {
      countElement.style.color = 'var(--warning)';
    } else {
      countElement.style.color = 'var(--text-secondary)';
    }
    
    // リアルタイム時間削減計算更新
    this.updateTimeReduction();
  }

  handleTaskSelection(e) {
    if (e.target.classList.contains('task-btn') || e.target.closest('.task-btn')) {
      const taskBtn = e.target.classList.contains('task-btn') ? e.target : e.target.closest('.task-btn');
      
      // 前の選択を解除
      document.querySelectorAll('.task-btn').forEach(btn => btn.classList.remove('active'));
      
      // 新しい選択を適用
      taskBtn.classList.add('active');
      this.currentTask = taskBtn.getAttribute('data-task');

      // タスク変更時の時間計算更新
      this.updateTimeReduction();
      
      // タスク選択アニメーション
      taskBtn.classList.add('slide-up');
      setTimeout(() => taskBtn.classList.remove('slide-up'), 300);
      
      console.log('選択されたタスク:', this.currentTask);
    }
  }

  handleStyleSelection(selectedBtn) {
    document.querySelectorAll('.style-btn').forEach(btn => btn.classList.remove('active'));
    selectedBtn.classList.add('active');
    this.currentStyle = selectedBtn.getAttribute('data-style');
    
    console.log('選択されたスタイル:', this.currentStyle);
  }

  handleLanguageSelection(selectedBtn) {
    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
    selectedBtn.classList.add('active');
    this.currentLanguage = selectedBtn.getAttribute('data-lang');
    
    console.log('選択された言語:', this.currentLanguage);
  }

  toggleRAG() {
    this.ragEnabled = !this.ragEnabled;
    this.updateRAGUI();
    
    // 入力フィールドの有効/無効状態を更新
    this.updateInputFieldStates();
    
    // RAGが無効になった場合、現在の入力をクリア
    if (!this.ragEnabled) {
      this.infoInput.value = '';
      this.updateCharCount(this.infoInput, this.infoCharCount);
    }
    
    console.log('RAG機能:', this.ragEnabled ? '有効' : '無効');
  }
  
  updateRAGUI() {
    const btn = this.ragToggleBtn;
    const statusText = this.ragStatusText;
    
    if (this.ragEnabled) {
      btn.classList.add('active');
      btn.setAttribute('data-rag-enabled', 'true');
      statusText.textContent = 'RAG機能有効 - 履歴に保存されます';
      statusText.className = 'status-active';
    } else {
      btn.classList.remove('active');
      btn.setAttribute('data-rag-enabled', 'false');
      statusText.textContent = 'RAG機能無効 - 履歴に保存されません';
      statusText.className = 'status-inactive';
    }
  }

  updateInputFieldStates() {
    // RAGが無効の時は入力フィールドを無効化
    if (this.infoInput) {
      this.infoInput.disabled = !this.ragEnabled;
      
      if (!this.ragEnabled) {
        this.infoInput.placeholder = 'RAG機能が無効のため入力できません';
      } else {
        this.infoInput.placeholder = '関連情報を入力してください...';
      }
    }
  }

  handleInfoSelection(e) {
    if (e.target.closest('.delete-btn')) {
      const item = e.target.closest('.info-item');
      const infoId = item.getAttribute('data-info');
      this.informationHistory = this.informationHistory.filter(info => info.id !== infoId);
      this.selectedInfo = this.selectedInfo.filter(id => id !== infoId);
      this.updateInfoHistory();
      this.saveStoredData();
      return;
    }

    if (e.target.closest('.info-item')) {
      const item = e.target.closest('.info-item');
      const isSelected = item.classList.contains('selected');

      if (isSelected) {
        item.classList.remove('selected');
        const infoId = item.getAttribute('data-info');
        this.selectedInfo = this.selectedInfo.filter(id => id !== infoId);
      } else {
        item.classList.add('selected');
        const infoId = item.getAttribute('data-info');
        if (!this.selectedInfo.includes(infoId)) {
          this.selectedInfo.push(infoId);
        }
      }
      
      console.log('選択された情報:', this.selectedInfo);
    }
  }

  // 作業時間削減計算を更新
  updateTimeReduction() {
    if (!this.manualTimeElement || !this.aiTimeElement || !this.savedTimeElement) return;

    const textLength = this.todoInput.value.length;
    const settings = this.timeReductionCalculator.personalSettings;

    const task = this.timeReductionCalculator.taskComplexity[this.currentTask] || { complexity: 1.0, baseTime: 5 };
    const typingMinutes = textLength / settings.typingSpeed;
    const thinkingMinutes = (textLength * settings.thinkingTime) / 60;
    const proofMinutes = textLength / settings.proofreadingSpeed;

    let manual = task.baseTime + (typingMinutes + thinkingMinutes + proofMinutes) * task.complexity;
    manual /= settings.experienceMultiplier;

    const aiProc = this.timeReductionCalculator.aiProcessing;
    const ai = aiProc.generationTime + (textLength * (aiProc.reviewTime + aiProc.editTime)) / 60;

    const saved = Math.max(manual - ai, 0);

    this.manualTimeElement.textContent = `${manual.toFixed(1)}分`;
    this.aiTimeElement.textContent = `${ai.toFixed(1)}分`;
    this.savedTimeElement.textContent = `${saved.toFixed(1)}分`;
  }

  async generateContent() {
    if (this.isProcessing) return;
    
    const todoText = this.todoInput.value.trim();
    if (!todoText) {
      alert('業務ToDoに内容を入力してください。');
      return;
    }
    
    this.isProcessing = true;
    this.setLoadingState(true);
    
    try {
      // AI分析の開始
      this.startAIAnalysis();
      
      const prompt = this.buildEnhancedPrompt(todoText);
      const response = await this.callLLMAPI(prompt);
      
      // 出力結果の表示
      this.displayOutput(response);
      
      // 出力方式タグ生成
      this.generateAdvancedTags(todoText, this.currentTask, response);
      
      
      // セッション保存
      this.saveToOutputHistory(response);
      
    } catch (error) {
      console.error('生成エラー:', error);
      this.showError('AI生成中にエラーが発生しました。高度なフォールバック機能で処理を続行します。');
      this.handleFallback(todoText);
    } finally {
      this.isProcessing = false;
      this.setLoadingState(false);
    }
  }

  startAIAnalysis() {
    const analysisElements = document.querySelectorAll('.analysis-percentage');
    analysisElements.forEach((element, index) => {
      // リアルタイム分析アニメーション
      let currentValue = 0;
      const targetValue = Object.values(this.aiAnalysisData)[index];
      
      const animate = () => {
        if (currentValue < targetValue) {
          currentValue += Math.ceil((targetValue - currentValue) / 10);
          element.textContent = `${currentValue}%`;
          requestAnimationFrame(animate);
        }
      };
      animate();
    });
  }

  buildEnhancedPrompt(todoText) {
    let prompt = `# 次世代AIアシスタント - 高精度業務支援プロンプト\n\n`;
    prompt += `あなたは業務効率90%向上を実現する次世代AIアシスタントです。以下の条件で最適化された文章を作成してください。\n\n`;
    
    // ToDo内容
    prompt += `## 📋 業務ToDo内容\n${todoText}\n\n`;
    
    // タスクタイプの詳細指定
    if (this.currentTask) {
      const taskSpecs = {
        email: {
          name: 'メール作成',
          efficiency: '80%短縮',
          focus: '簡潔で効果的なビジネスメール、適切な敬語、アクションアイテム明記'
        },
        'email-reply': {
          name: 'メール返信',
          efficiency: '85%短縮',
          focus: '迅速な回答、問題解決志向、継続性のある関係構築'
        },
        document: {
          name: '文書作成',
          efficiency: '75%短縮',
          focus: '論理的構成、読みやすさ、目的明確化'
        },
        report: {
          name: 'レポート作成',
          efficiency: '75%短縮',
          focus: 'データ分析、結論先行、実行可能な提案'
        },
        proposal: {
          name: '企画書作成',
          efficiency: '70%短縮',
          focus: '説得力のある論理構成、ROI明示、リスク評価'
        },
        presentation: {
          name: 'プレゼン資料',
          efficiency: '80%短縮',
          focus: 'ビジュアル重視、ストーリー性、聴衆エンゲージメント'
        },
        schedule: {
          name: 'スケジュール作成',
          efficiency: '85%短縮',
          focus: '実現可能性、優先順位、時間配分最適化'
        },
        agenda: {
          name: 'アジェンダ作成',
          efficiency: '90%短縮',
          focus: '効率的な会議運営、成果明確化、時間管理'
        },
        minutes: {
          name: '議事録作成',
          efficiency: '80%短縮',
          focus: '要点整理、アクションアイテム、責任者明記'
        },
        faq: {
          name: 'FAQ作成',
          efficiency: '85%短縮',
          focus: 'ユーザー視点、検索最適化、段階的解説'
        },
        manual: {
          name: 'マニュアル作成',
          efficiency: '75%短縮',
          focus: 'ステップバイステップ、図表活用、トラブルシューティング'
        },
        analysis: {
          name: '分析レポート',
          efficiency: '70%短縮',
          focus: 'データ裏付け、トレンド分析、将来予測'
        }
             };
       
       const taskSpec = taskSpecs[this.currentTask];
       if (taskSpec) {
         prompt += `## 🎯 タスクタイプ\n**${taskSpec.name}** (効率化: ${taskSpec.efficiency})\n`;
         prompt += `重点項目: ${taskSpec.focus}\n\n`;
       }
     }
    
    // 文章スタイルの詳細指定
    const styleSpecs = {
      business: {
        name: 'ビジネス',
        focus: '効率的で結論明確、適切な敬語レベル自動調整'
      },
      casual: {
        name: 'カジュアル',
        focus: '親しみやすく自然、関係性に応じた距離感調整'
      },
      formal: {
        name: 'フォーマル',
        focus: '正式で格式、法務・規約用語自動挿入'
      },
      friendly: {
        name: '親しみやすい',
        focus: '温かみのある丁寧、相手の立場に配慮した表現'
      },
      professional: {
        name: 'プロフェッショナル',
        focus: '専門性の高い信頼、業界用語・技術用語最適化'
      }
    };
    
    const styleSpec = styleSpecs[this.currentStyle];
    if (styleSpec) {
      prompt += `## 🎨 AI駆動文章スタイル\n**${styleSpec.name}**: ${styleSpec.focus}\n\n`;
    }
    
    // 多言語対応の詳細指定
    const languageSpecs = {
      auto: { name: '自動判定', accuracy: '98%精度', features: '混在言語も高精度検出、文脈理解翻訳' },
      ja: { name: '日本語', accuracy: '方言対応', features: 'ビジネス標準敬語、関西弁・方言対応、世代別表現調整' },
      en: { name: 'English', accuracy: 'US/UK対応', features: 'American/British English、International、Technical English' },
      zh: { name: '中文', accuracy: '簡繁対応', features: '简体中文、繁體中文、商务用语、文化配慮表現' }
    };
    
    const languageSpec = languageSpecs[this.currentLanguage];
    if (languageSpec) {
      prompt += `## 🌐 多言語対応 (${languageSpec.accuracy})\n**${languageSpec.name}**: ${languageSpec.features}\n\n`;
    }
    
    // タスク特化の指示を追加
    if (this.currentTask === 'email-reply') {
      prompt += `【メール返信の特別指示】\n- 元メールの内容を理解し、適切な返信を作成\n- 件名、宛名、本文、署名を含む完全なメール形式で出力\n- 相手の質問や要求に対して具体的に回答\n- ビジネスマナーに沿った敬語表現を使用\n\n`;
    } else if (this.currentTask === 'faq') {
      prompt += `【FAQ作成の特別指示】\n- 質問（Q）と回答（A）の形式で出力\n- 検索キーワードも含める\n- 類似質問のバリエーションも提示\n- 分かりやすく簡潔な説明を心がける\n\n`;
    } else if (this.currentTask === 'proposal') {
      prompt += `【企画書作成の特別指示】\n- 背景・現状の課題・提案する解決策・期待される効果の構成で作成\n- 具体的な数値目標や実施スケジュールも含める\n- 読み手を説得できる論理的な構成を心がける\n\n`;
    }
    
    // 選択された情報を追加（RAG有効時のみ）
    if (this.selectedInfo.length > 0 && this.ragEnabled) {
      prompt += `【参考情報】\n`;
      this.selectedInfo.forEach(infoId => {
        const info = this.getInfoById(infoId);
        if (info) {
          prompt += `${info.title}:\n${info.content}\n\n`;
        }
      });
    }
    
    // 現在の情報ウィンドウの内容（RAG有効時のみ）
    const currentInfo = this.infoInput.value.trim();
    if (currentInfo && this.ragEnabled) {
      prompt += `【追加情報】\n${currentInfo}\n\n`;
    }
    
    // 出力言語の指定
    if (this.currentLanguage !== 'auto') {
      const languageNames = {
        ja: '日本語',
        en: '英語',
        zh: '中国語'
      };
      prompt += `【出力言語】\n${languageNames[this.currentLanguage]}で出力してください。\n\n`;
    }
    
    prompt += `上記の条件に基づいて、適切な文章を作成してください。JSON形式で以下の構造で返してください：
{
  "content": "生成された文章",
  "tags": ["自動生成されたタグ1", "タグ2", "タグ3"],
  "language": "使用された言語コード",
  "style": "適用されたスタイル"
}`;
    
    return prompt;
  }

  async callLLMAPI(prompt) {
    const apiUrl = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
    
    const systemContent = `あなたは優秀なビジネスアシスタントです。ユーザーの業務ToDo内容を理解し、適切な文章を作成してください。必ず指定されたJSON形式で回答してください。

【特別な機能対応】
- メール返信: 受信したメール内容を解析し、適切な返信文を作成。敬語表現と文体を自動調整
- FAQ作成: 問い合わせ内容から質問と回答のペアを生成。検索しやすいキーワードも含める
- 企画書作成: 構成案（背景・課題・解決策・効果）を含む包括的な企画書を作成

タグ生成の際は、以下のようなカテゴリから適切なものを選択してください：
- メール作成, メール返信, クレーム対応, バグ修正依頼, 仕事依頼, 求人依頼
- 顧客対応, 社内連絡, 提案書, 報告書, 企画書, FAQ, ナレッジベース
- 緊急, 重要, 定期, 確認, 承認
- 営業, マーケティング, 開発, 人事, 経理`;

    const messages = [
      {
        role: "system",
        content: systemContent
      },
      {
        role: "user",
        content: prompt
      }
    ];
    
    const requestData = {
      model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
      temperature: 0.3,
      stream: false,
      max_completion_tokens: 2000,
      messages: messages
    };

    try {
      console.log('LLM API呼び出し開始');
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("LLMレスポンス:", data);
      
      let content = '';
      
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        content = data.choices[0].message.content;
      } else if (data.answer) {
        content = data.answer;
      } else {
        throw new Error('レスポンスに期待されるフィールドがありません');
      }

      if (!content || !content.trim()) {
        throw new Error('レスポンス内容が空です');
      }

      // JSONパースを試行
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsedJson = JSON.parse(jsonMatch[0]);
          
          if (parsedJson.content) {
            console.log('LLM API呼び出し成功（JSON解析完了）');
            return parsedJson;
          }
        }
        
        throw new Error('JSONフォーマットが見つかりません');
        
      } catch (parseError) {
        console.warn('JSON解析エラー:', parseError.message);
        
        // JSON解析に失敗した場合、テキストから簡易生成
        return {
          content: content.trim(),
          tags: this.generateFallbackTags(content, this.currentTask),
          language: this.currentLanguage === 'auto' ? 'ja' : this.currentLanguage,
          style: this.currentStyle
        };
      }

    } catch (error) {
      console.error('LLM API呼び出しエラー:', error);
      throw error;
    }
  }

  displayOutput(response) {
    const content = response.content || 'エラー: 内容を生成できませんでした。';
    
    this.outputContent.innerHTML = `
      <div style="white-space: pre-wrap; line-height: 1.8;">${this.escapeHtml(content)}</div>
    `;
    
    // タグの表示
    this.displayTags(response.tags || []);
  }

  displayTags(tags) {
    const tagContainer = this.tagDisplay.querySelector('.section-title').nextElementSibling || 
                        (() => {
                          const container = document.createElement('div');
                          this.tagDisplay.appendChild(container);
                          return container;
                        })();
    
    tagContainer.innerHTML = '';
    
    tags.forEach(tag => {
      const tagElement = document.createElement('span');
      tagElement.className = 'tag';
      tagElement.textContent = tag;
      tagContainer.appendChild(tagElement);
    });
  }

  generateTags(todoText, taskType) {
    const tags = [];
    
    // タスクタイプベースのタグ
    if (taskType) {
      const taskTags = {
        email: ['メール作成', '連絡'],
        'email-reply': ['メール返信', '顧客対応', '返信'],
        document: ['ドキュメント', '文書作成'],
        schedule: ['スケジュール', '予定'],
        agenda: ['アジェンダ', '会議'],
        report: ['レポート', '報告'],
        proposal: ['提案書', '企画'],
        minutes: ['議事録', '会議'],
        manual: ['マニュアル', '手順'],
        presentation: ['プレゼン', '発表'],
        analysis: ['分析', '調査'],
        faq: ['FAQ', 'ナレッジベース', 'Q&A']
      };
      
      if (taskTags[taskType]) {
        tags.push(...taskTags[taskType]);
      }
    }
    
    // 内容ベースの自動タグ生成
    const keywords = {
      '緊急': ['急', '緊急', 'urgent', '至急'],
      '重要': ['重要', 'important', '大切'],
      '顧客対応': ['顧客', 'お客様', 'customer', 'client'],
      'クレーム対応': ['クレーム', '苦情', 'complaint', '問題'],
      '承認': ['承認', 'approval', '許可', '確認'],
      '確認': ['確認', 'check', '確認事項'],
      '営業': ['営業', 'sales', '売上', '販売'],
      '開発': ['開発', 'development', 'システム', 'アプリ'],
      '人事': ['人事', 'HR', '採用', '求人'],
      '経理': ['経理', 'accounting', '予算', '費用']
    };
    
    const lowerText = todoText.toLowerCase();
    
    Object.entries(keywords).forEach(([tag, words]) => {
      if (words.some(word => lowerText.includes(word.toLowerCase()))) {
        if (!tags.includes(tag)) {
          tags.push(tag);
        }
      }
    });
    
    return tags.slice(0, 5); // 最大5個のタグ
  }

  generateFallbackTags(content, taskType) {
    const tags = [];
    
    if (taskType) {
      tags.push(taskType);
    }
    
    tags.push('AI生成');
    
    if (content.length > 500) {
      tags.push('長文');
    }
    
    return tags;
  }

  getInfoById(infoId) {
    return this.informationHistory.find(info => info.id === infoId);
  }

  saveCurrentInfo() {
    const content = this.infoInput.value.trim();
    if (!content) {
      alert('保存する情報を入力してください。');
        return;
      }
    
    if (!this.ragEnabled) {
      alert('RAG機能が無効のため、情報は保存されません。');
      return;
    }
    
    const title = prompt('情報のタイトルを入力してください:');
    if (!title) return;
    
    const info = {
      id: Date.now().toString(),
      title: title,
      content: content,
      createdAt: new Date().toISOString()
    };
    
    this.informationHistory.push(info);
    this.updateInfoHistory();
    this.saveStoredData();
    
    alert('情報を保存しました。');
  }

  updateInfoHistory() {
    this.infoHistory.innerHTML = '';

    // 保存された情報を追加
    this.informationHistory.forEach(info => {
      const item = document.createElement('div');
      item.className = 'info-item';
      item.setAttribute('data-info', info.id);

      item.innerHTML = `
        <div class="info-item-title">${this.escapeHtml(info.title)}</div>
        <div class="info-item-preview">${this.escapeHtml(info.content.substring(0, 50))}...</div>
        <button class="delete-btn" title="削除"><i class="fas fa-trash"></i></button>
      `;

      this.infoHistory.appendChild(item);
    });
  }

  importInfo() {
    this.infoFileInput.click();
  }

  handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (Array.isArray(data)) {
          this.informationHistory = data;
          this.updateInfoHistory();
          this.saveStoredData();
          alert('情報をインポートしました。');
        } else {
          alert('無効なファイル形式です。');
        }
      } catch (error) {
        alert('ファイルの読み込みに失敗しました。');
        console.error(error);
      }
    };
    reader.readAsText(file);
  }

  exportInfo() {
    if (this.informationHistory.length === 0) {
      alert('エクスポートする情報がありません。');
      return;
    }
    
    const dataStr = JSON.stringify(this.informationHistory, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `assistant_info_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  clearInfo() {
    if (confirm('すべての保存された情報を削除しますか？')) {
      this.informationHistory = [];
      this.updateInfoHistory();
      this.saveStoredData();
      alert('情報をクリアしました。');
    }
  }

  copyOutput() {
    const text = this.outputContent.textContent || this.outputContent.innerText;
    if (!text.trim()) {
      alert('コピーする内容がありません。');
      return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
      this.showTemporaryMessage(this.copyOutputBtn, 'コピーしました！', 'btn-success');
    }).catch(err => {
      console.error('コピーに失敗しました', err);
      alert('コピーできませんでした。');
    });
  }

  exportOutput() {
    const text = this.outputContent.textContent || this.outputContent.innerText;
    if (!text.trim()) {
      alert('エクスポートする内容がありません。');
      return;
    }
    
    const blob = new Blob([text], { type: 'text/plain; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `assistant_output_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  speakOutput() {
    const text = this.outputContent.textContent || this.outputContent.innerText;
    if (!text.trim()) {
      alert('読み上げる内容がありません。');
      return;
    }
    
    if (!('speechSynthesis' in window)) {
      alert('お使いのブラウザは音声読み上げ機能に対応していません。');
      return;
    }
    
    // 現在の読み上げを停止
      speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.currentLanguage === 'auto' ? 'ja-JP' : 
                     this.currentLanguage === 'ja' ? 'ja-JP' :
                     this.currentLanguage === 'en' ? 'en-US' : 'zh-CN';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    speechSynthesis.speak(utterance);
  }

  moveOutputToInput() {
    const text = this.outputContent.textContent || this.outputContent.innerText;
    if (!text.trim()) {
      alert('移動する内容がありません。');
      return;
    }
    
    this.todoInput.value = text;
    this.updateCharCount(this.todoInput, this.todoCharCount);
    
    this.showTemporaryMessage(this.toInputBtn, '移動しました！', 'btn-success');
  }

  resetAll() {
    if (confirm('すべての入力内容をリセットしますか？')) {
      this.todoInput.value = '';
      this.infoInput.value = '';
      this.outputContent.innerHTML = `
        <div style="text-align: center; color: var(--text-secondary); padding: 2rem;">
          <i class="fas fa-magic" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
          生成された文章がここに表示されます
        </div>
      `;
      
      this.updateCharCount(this.todoInput, this.todoCharCount);
      this.updateCharCount(this.infoInput, this.infoCharCount);
      
      // 選択状態をリセット
      document.querySelectorAll('.task-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.info-item').forEach(item => item.classList.remove('selected'));
      
      this.currentTask = null;
      this.selectedInfo = [];
      
      // タグをクリア
      const tagContainer = this.tagDisplay.querySelector('.section-title').nextElementSibling;
      if (tagContainer) {
        tagContainer.innerHTML = '';
      }
    }
  }

  saveSession() {
    const sessionData = {
      todoContent: this.todoInput.value,
      infoContent: this.infoInput.value,
      currentTask: this.currentTask,
      currentStyle: this.currentStyle,
      currentLanguage: this.currentLanguage,
      selectedInfo: this.selectedInfo,
      timestamp: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(sessionData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `assistant_session_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  setLoadingState(loading) {
    if (loading) {
      this.loadingIndicator.classList.add('active');
      this.generateBtn.disabled = true;
        } else {
      this.loadingIndicator.classList.remove('active');
      this.generateBtn.disabled = false;
    }
  }

  showError(message) {
    this.outputContent.innerHTML = `
      <div style="color: var(--danger); text-align: center; padding: 2rem;">
        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
        ${this.escapeHtml(message)}
      </div>
    `;
  }

  showTemporaryMessage(button, message, className) {
    const originalText = button.innerHTML;
    const originalClass = button.className;
    
    button.innerHTML = `<i class="fas fa-check"></i> ${message}`;
    button.className = `file-btn ${className}`;
    
    setTimeout(() => {
      button.innerHTML = originalText;
      button.className = originalClass;
    }, 2000);
  }

  loadStoredData() {
    try {
      // 入力内容の復元
      const savedTodo = localStorage.getItem('assistantAI_todo');
      const savedInfo = localStorage.getItem('assistantAI_info');
      
      if (savedTodo && this.todoInput) {
        this.todoInput.value = savedTodo;
        this.updateCharCount(this.todoInput, this.todoCharCount);
      }
      
      if (savedInfo && this.infoInput) {
        this.infoInput.value = savedInfo;
        this.updateCharCount(this.infoInput, this.infoCharCount);
      }
      
      // 情報履歴の復元
      const savedHistory = localStorage.getItem('assistantAI_infoHistory');
      if (savedHistory) {
        this.informationHistory = JSON.parse(savedHistory);
        this.updateInfoHistory();
      }
      
      // 出力履歴の復元
      const savedOutputHistory = localStorage.getItem('outputHistory');
      if (savedOutputHistory) {
        this.outputHistory = JSON.parse(savedOutputHistory);
      }
      
      // 設定の復元
      const savedSettings = localStorage.getItem('assistantAI_settings');
      let settings = {};
      if (savedSettings) {
        settings = JSON.parse(savedSettings);
        this.currentStyle = settings.style || 'business';
        this.currentLanguage = settings.language || 'auto';
        
        // 時間削減計算設定の復元
        if (settings.timeReductionCalculator) {
          this.timeReductionCalculator = { ...this.timeReductionCalculator, ...settings.timeReductionCalculator };
        }
        
        // RAG設定の復元
        if (settings.ragEnabled !== undefined) {
          this.ragEnabled = settings.ragEnabled;
        }
        
        // UI要素に設定を反映
        if (this.typingSpeedInput && this.timeReductionCalculator.personalSettings.typingSpeed) {
          this.typingSpeedInput.value = this.timeReductionCalculator.personalSettings.typingSpeed;
        }
        
        if (this.experienceLevelSelect && this.timeReductionCalculator.personalSettings.experienceMultiplier) {
          this.experienceLevelSelect.value = this.timeReductionCalculator.personalSettings.experienceMultiplier;
        }
        
        // UIに反映
        document.querySelectorAll('.style-btn').forEach(btn => {
          btn.classList.toggle('active', btn.getAttribute('data-style') === this.currentStyle);
        });
        
        document.querySelectorAll('.lang-btn').forEach(btn => {
          btn.classList.toggle('active', btn.getAttribute('data-lang') === this.currentLanguage);
        });
      }
      
      return settings;
      
    } catch (error) {
      console.error('データの読み込みエラー:', error);
      return {};
    }
  }

  saveStoredData() {
    try {
      localStorage.setItem('assistantAI_todo', this.todoInput.value);
      localStorage.setItem('assistantAI_info', this.infoInput.value);
      localStorage.setItem('assistantAI_infoHistory', JSON.stringify(this.informationHistory));
      localStorage.setItem('outputHistory', JSON.stringify(this.outputHistory));
      
      const settings = {
        style: this.currentStyle,
        language: this.currentLanguage,
        timeReductionCalculator: this.timeReductionCalculator,
        ragEnabled: this.ragEnabled,
        qualityLevel: this.qualityLevelSelect?.value || 'balanced',
        autoSaveInterval: this.autoSaveIntervalSelect?.value || '5',
        themeMode: this.themeModeSelect?.value || 'light',
        fontSize: this.fontSizeSelect?.value || 'medium'
      };
      localStorage.setItem('assistantAI_settings', JSON.stringify(settings));
      
    } catch (error) {
      console.error('データの保存エラー:', error);
    }
  }

  setupAutoSave() {
    // 定期的な自動保存
    setInterval(() => {
      this.saveStoredData();
    }, 5000); // 5秒ごと
    
    // ページ離脱時の保存
    window.addEventListener('beforeunload', () => {
      this.saveStoredData();
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 新機能の初期化
  initializeAdvancedFeatures() {
    // 初回利用時のテンプレート情報を表示
    if (this.informationHistory.length === 0) {
      this.updateInfoHistory();
    }
  }

  // 出力方式タグ生成
  generateAdvancedTags(todoText, taskType, response) {
    // 出力方式タグ生成（25種類AI自動タグから変更）
    const outputMethods = [
      // 基本出力方式
      'ビジネスメール形式', '報告書形式', '企画書形式', 'プレゼン形式',
      '議事録形式', 'FAQ形式', 'マニュアル形式', 'チェックリスト形式',
      
      // 文体・トーン
      '丁寧語スタイル', 'カジュアルスタイル', '簡潔スタイル', '詳細説明スタイル',
      '説得的文体', '中立的文体', '分析的文体', '創造的文体',
      
      // 構造・レイアウト
      '箇条書き重視', '段落構成', '見出し付き', '要約付き',
      'アクション重視', '結論先行', '時系列構成', '優先度順',
      
      // 特殊形式
      'テンプレート形式'
    ];

    // タスクタイプに応じて適切な出力方式を選択
    let selectedMethods = [];
    
    if (taskType) {
      const taskSpecificMethods = {
        'email': ['ビジネスメール形式', '丁寧語スタイル', '簡潔スタイル', '要約付き'],
        'email-reply': ['ビジネスメール形式', '丁寧語スタイル', '簡潔スタイル'],
        'document': ['報告書形式', '段落構成', '見出し付き', '詳細説明スタイル'],
        'report': ['報告書形式', '分析的文体', '結論先行', '箇条書き重視'],
        'proposal': ['企画書形式', '説得的文体', '段落構成', '要約付き'],
        'presentation': ['プレゼン形式', '箇条書き重視', '見出し付き', '簡潔スタイル'],
        'schedule': ['チェックリスト形式', '時系列構成', '優先度順', '簡潔スタイル'],
        'agenda': ['箇条書き重視', '時系列構成', '簡潔スタイル', '要約付き'],
        'minutes': ['議事録形式', '箇条書き重視', 'アクション重視', '要約付き'],
        'faq': ['FAQ形式', '箇条書き重視', '簡潔スタイル'],
        'manual': ['マニュアル形式', '段落構成', '見出し付き', 'チェックリスト形式'],
        'analysis': ['報告書形式', '分析的文体', '詳細説明スタイル', '結論先行']
      };
      
      selectedMethods = taskSpecificMethods[taskType] || outputMethods.slice(0, 4);
    } else {
      // デフォルトで最初の数個を選択
      selectedMethods = outputMethods.slice(0, 4);
    }
    
    // 重複を削除して表示
    const uniqueMethods = [...new Set(selectedMethods)];
    this.displayAdvancedTags(uniqueMethods);
  }

  displayAdvancedTags(tags) {
    const tagContainer = this.tagDisplay.querySelector('#tagDisplay') ? 
                        this.tagDisplay : 
                        document.getElementById('tagDisplay');
    
    // タグコンテナをクリア
    const existingTags = tagContainer.querySelector('.tags-container');
    if (existingTags) {
      existingTags.remove();
    }
    
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'tags-container';
    
    tags.forEach(tag => {
      const tagElement = document.createElement('span');
      tagElement.className = 'tag';
      
      // タグの種類に応じて色分け
      if (['緊急', '重要'].includes(tag)) {
        tagElement.classList.add('tag-priority');
      } else if (['営業', '開発', '人事', '経理', '法務', '総務'].includes(tag)) {
        tagElement.classList.add('tag-department');
      }
      
      tagElement.textContent = tag;
      tagsContainer.appendChild(tagElement);
    });
    
    tagContainer.appendChild(tagsContainer);
  }

  // 革新的出力制御機能
  openEmailWithContent() {
    const content = this.outputContent.textContent || '';
    const subject = 'AI生成文書';
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(content)}`;
    window.open(mailtoLink);
    this.showTemporaryMessage(this.emailOutputBtn, 'メーラーを起動しました', 'success');
  }

  exportToWord() {
    const content = this.outputContent.textContent || '';
    const blob = new Blob([content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI生成文書_${new Date().toISOString().split('T')[0]}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    this.showTemporaryMessage(this.wordOutputBtn, 'Word文書をダウンロードしました', 'success');
  }

  exportToPDF() {
    // PDF生成（簡易版）
    const content = this.outputContent.textContent || '';
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>AI生成文書</title>
          <style>
            body { font-family: 'Yu Gothic', sans-serif; padding: 20px; }
            h1 { color: #4a90e2; }
          </style>
        </head>
        <body>
          <h1>AI生成文書</h1>
          <pre style="white-space: pre-wrap;">${content}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    this.showTemporaryMessage(this.pdfOutputBtn, 'PDF印刷画面を開きました', 'success');
  }

  shareToSlack() {
    const content = this.outputContent.textContent || '';
    const slackText = encodeURIComponent(`AI生成文書:\n${content}`);
    const slackUrl = `https://slack.com/app_redirect?channel=general&text=${slackText}`;
    window.open(slackUrl, '_blank');
    this.showTemporaryMessage(this.shareSlackBtn, 'Slackに共有しました', 'success');
  }

  shareToTeams() {
    const content = this.outputContent.textContent || '';
    const teamsText = encodeURIComponent(`AI生成文書:\n${content}`);
    const teamsUrl = `https://teams.microsoft.com/l/chat/0/0?users=&topicName=AI生成文書&message=${teamsText}`;
    window.open(teamsUrl, '_blank');
    this.showTemporaryMessage(this.shareTeamsBtn, 'Teamsに共有しました', 'success');
  }

  async improveOutput() {
    const currentContent = this.outputContent.textContent || '';
    if (!currentContent) {
      alert('改善する内容がありません。');
      return;
    }

    this.setLoadingState(true);
    
    try {
      const improvePrompt = `以下の文章をより良く改善してください。より分かりやすく、説得力があり、読みやすい文章にしてください：\n\n${currentContent}`;
      const response = await this.callLLMAPI(improvePrompt);
      this.displayOutput(response);
      this.showTemporaryMessage(this.improveOutputBtn, 'AI改善が完了しました', 'success');
    } catch (error) {
      console.error('改善エラー:', error);
      this.showError('AI改善中にエラーが発生しました。');
    } finally {
      this.setLoadingState(false);
    }
  }

  saveToOutputHistory(response) {
    const historyItem = {
      id: Date.now().toString(),
      content: response.content,
      task: this.currentTask,
      style: this.currentStyle,
      language: this.currentLanguage,
      timestamp: new Date().toISOString(),
      tags: response.tags || []
    };
    
    this.outputHistory.unshift(historyItem);
    if (this.outputHistory.length > 50) {
      this.outputHistory = this.outputHistory.slice(0, 50);
    }
    
    localStorage.setItem('outputHistory', JSON.stringify(this.outputHistory));
  }

  handleFallback(todoText) {
    // エラー時のフォールバック機能
    const fallbackContent = `【フォールバック機能による簡易出力】\n\n${todoText}に関する内容を整理しました。\n\n詳細な内容は手動で追加してください。`;
    
    const fallbackResponse = {
      content: fallbackContent,
      tags: ['フォールバック', this.currentTask || '汎用'],
      language: this.currentLanguage,
      style: this.currentStyle
    };
    
    this.displayOutput(fallbackResponse);
    this.generateAdvancedTags(todoText, this.currentTask, fallbackResponse);
  }

  // 設定関連メソッド
  loadSettings() {
    const settings = this.loadStoredData();
    
    if (this.qualityLevelSelect && settings.qualityLevel) {
      this.qualityLevelSelect.value = settings.qualityLevel;
    }
    
    if (this.autoSaveIntervalSelect && settings.autoSaveInterval !== undefined) {
      this.autoSaveIntervalSelect.value = settings.autoSaveInterval;
    }
    

    
    if (this.fontSizeSelect && settings.fontSize) {
      this.fontSizeSelect.value = settings.fontSize;
    }
  }

  saveSettings() {
    this.saveStoredData();
    this.showTemporaryMessage(this.saveSettingsBtn, '設定を保存しました', 'success');
  }

  updateAutoSaveInterval() {
    const interval = parseInt(this.autoSaveIntervalSelect.value) * 1000;
    
    // 既存の自動保存を停止
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    
    // 新しい間隔で自動保存を開始
    if (interval > 0) {
      this.autoSaveTimer = setInterval(() => {
        this.saveStoredData();
      }, interval);
    }
  }



  applyFontSize() {
    const fontSize = this.fontSizeSelect.value;
    document.body.className = document.body.className.replace(/font-size-\w+/g, '');
    document.body.classList.add(`font-size-${fontSize}`);
  }

  exportAllData() {
    const allData = {
      informationHistory: this.informationHistory,
      outputHistory: this.outputHistory,
      settings: {
        typingSpeed: this.timeReductionCalculator.personalSettings.typingSpeed,
        experienceLevel: this.timeReductionCalculator.personalSettings.experienceMultiplier,
        qualityLevel: this.qualityLevelSelect?.value || 'balanced',
        autoSaveInterval: this.autoSaveIntervalSelect?.value || '5',
        themeMode: this.themeModeSelect?.value || 'light',
        fontSize: this.fontSizeSelect?.value || 'medium'
      },
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AIアシスタント_全データ_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.showTemporaryMessage(this.exportAllDataBtn, 'データをエクスポートしました', 'success');
  }

  importAllData() {
    this.allDataFileInput.click();
  }

  handleAllDataImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        if (data.informationHistory) {
          this.informationHistory = data.informationHistory;
        }
        
        if (data.outputHistory) {
          this.outputHistory = data.outputHistory;
        }
        
        if (data.settings) {
          const settings = data.settings;
          
          if (settings.typingSpeed && this.typingSpeedInput) {
            this.typingSpeedInput.value = settings.typingSpeed;
            this.timeReductionCalculator.personalSettings.typingSpeed = settings.typingSpeed;
          }
          
          if (settings.experienceLevel && this.experienceLevelSelect) {
            this.experienceLevelSelect.value = settings.experienceLevel;
            this.timeReductionCalculator.personalSettings.experienceMultiplier = settings.experienceLevel;
          }
          
          if (settings.qualityLevel && this.qualityLevelSelect) {
            this.qualityLevelSelect.value = settings.qualityLevel;
          }
          
          if (settings.autoSaveInterval && this.autoSaveIntervalSelect) {
            this.autoSaveIntervalSelect.value = settings.autoSaveInterval;
            this.updateAutoSaveInterval();
          }
          
          if (settings.themeMode && this.themeModeSelect) {
            this.themeModeSelect.value = settings.themeMode;
            this.applyTheme();
          }
          
          if (settings.fontSize && this.fontSizeSelect) {
            this.fontSizeSelect.value = settings.fontSize;
            this.applyFontSize();
          }
        }
        
        this.saveStoredData();
        this.updateInfoHistory();
        this.updateTimeReduction();
        
        this.showTemporaryMessage(this.importAllDataBtn, 'データをインポートしました', 'success');
        
      } catch (error) {
        console.error('インポートエラー:', error);
        alert('ファイルの読み込みに失敗しました。');
      }
    };
    reader.readAsText(file);
  }

  clearAllData() {
    if (confirm('すべてのデータを削除しますか？この操作は取り消せません。')) {
      this.informationHistory = [];
      this.outputHistory = [];
      this.selectedInfo = [];
      
      // 入力フィールドをクリア
      if (this.todoInput) this.todoInput.value = '';
      if (this.infoInput) this.infoInput.value = '';
      if (this.outputContent) this.outputContent.textContent = 'ここに生成された文章が表示されます...';
      
      // ローカルストレージをクリア
      localStorage.removeItem('assistantAI_settings');
      localStorage.removeItem('outputHistory');
      
      this.updateInfoHistory();
      this.updateCharCount(this.todoInput, this.todoCharCount);
      this.updateCharCount(this.infoInput, this.infoCharCount);
      
      this.showTemporaryMessage(this.clearAllDataBtn, 'すべてのデータを削除しました', 'success');
    }
  }

}

// グローバルインスタンスの作成
let assistantAI;

// DOM読み込み完了時に初期化
document.addEventListener('DOMContentLoaded', () => {
  window.assistantAI = new NextGenAssistantAI();
  console.log('あなたのお手軽アシスタントAIが起動しました');
});

// ページ更新時の状態保持
window.addEventListener('beforeunload', () => {
  if (window.assistantAI) {
    window.assistantAI.saveStoredData();
  }
}); 