/**
 * あなたのお手軽アシスタントAI ウェブツール JavaScript
 * LLMを活用した業務支援ツール
 */

class AssistantAI {
  constructor() {
    this.currentTask = null;
    this.currentStyle = 'business';
    this.currentLanguage = 'auto';
    this.selectedInfo = [];
    this.informationHistory = [];
    this.isProcessing = false;
    
    this.initializeElements();
    this.initializeEventListeners();
    this.loadStoredData();
    this.setupAutoSave();
  }

  initializeElements() {
    // 入力要素
    this.todoInput = document.getElementById('todoInput');
    this.infoInput = document.getElementById('infoInput');
    this.todoCharCount = document.getElementById('todoCharCount');
    this.infoCharCount = document.getElementById('infoCharCount');
    
    // 出力要素
    this.outputContent = document.getElementById('outputContent');
    this.tagDisplay = document.getElementById('tagDisplay');
    
    // コントロール要素
    this.taskGrid = document.getElementById('taskGrid');
    this.infoHistory = document.getElementById('infoHistory');
    this.generateBtn = document.getElementById('generateBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.saveSessionBtn = document.getElementById('saveSessionBtn');
    this.loadingIndicator = document.getElementById('loadingIndicator');
    
    // ファイル関連
    this.importInfoBtn = document.getElementById('importInfoBtn');
    this.exportInfoBtn = document.getElementById('exportInfoBtn');
    this.saveInfoBtn = document.getElementById('saveInfoBtn');
    this.clearInfoBtn = document.getElementById('clearInfoBtn');
    this.infoFileInput = document.getElementById('infoFileInput');
    
    // 出力関連
    this.copyOutputBtn = document.getElementById('copyOutputBtn');
    this.exportOutputBtn = document.getElementById('exportOutputBtn');
    this.speakOutputBtn = document.getElementById('speakOutputBtn');
    this.toInputBtn = document.getElementById('toInputBtn');
  }

  initializeEventListeners() {
    // 文字数カウント
    this.todoInput.addEventListener('input', () => this.updateCharCount(this.todoInput, this.todoCharCount));
    this.infoInput.addEventListener('input', () => this.updateCharCount(this.infoInput, this.infoCharCount));
    
    // タスク選択
    this.taskGrid.addEventListener('click', (e) => this.handleTaskSelection(e));
    
    // スタイル選択
    document.querySelectorAll('.style-btn').forEach(btn => {
      btn.addEventListener('click', () => this.handleStyleSelection(btn));
    });
    
    // 言語選択
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => this.handleLanguageSelection(btn));
    });
    
    // 情報履歴選択
    this.infoHistory.addEventListener('click', (e) => this.handleInfoSelection(e));
    
    // メインボタン
    this.generateBtn.addEventListener('click', () => this.generateContent());
    this.resetBtn.addEventListener('click', () => this.resetAll());
    this.saveSessionBtn.addEventListener('click', () => this.saveSession());
    
    // ファイル操作
    this.importInfoBtn.addEventListener('click', () => this.importInfo());
    this.exportInfoBtn.addEventListener('click', () => this.exportInfo());
    this.saveInfoBtn.addEventListener('click', () => this.saveCurrentInfo());
    this.clearInfoBtn.addEventListener('click', () => this.clearInfo());
    this.infoFileInput.addEventListener('change', (e) => this.handleFileImport(e));
    
    // 出力操作
    this.copyOutputBtn.addEventListener('click', () => this.copyOutput());
    this.exportOutputBtn.addEventListener('click', () => this.exportOutput());
    this.speakOutputBtn.addEventListener('click', () => this.speakOutput());
    this.toInputBtn.addEventListener('click', () => this.moveOutputToInput());
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
  }

  handleTaskSelection(e) {
    if (e.target.classList.contains('task-btn')) {
      // 前の選択を解除
      document.querySelectorAll('.task-btn').forEach(btn => btn.classList.remove('active'));
      
      // 新しい選択を適用
      e.target.classList.add('active');
      this.currentTask = e.target.getAttribute('data-task');
      
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

  handleInfoSelection(e) {
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

  async generateContent() {
    if (this.isProcessing) return;
    
    const todoText = this.todoInput.value.trim();
    if (!todoText) {
      alert('ToDoウィンドウに内容を入力してください。');
      return;
    }
    
    this.isProcessing = true;
    this.setLoadingState(true);
    
    try {
      const prompt = this.buildPrompt(todoText);
      const response = await this.callLLMAPI(prompt);
      
      this.displayOutput(response);
      this.generateTags(todoText, this.currentTask);
      
    } catch (error) {
      console.error('生成エラー:', error);
      this.showError('AI生成中にエラーが発生しました。もう一度お試しください。');
    } finally {
      this.isProcessing = false;
      this.setLoadingState(false);
    }
  }

  buildPrompt(todoText) {
    let prompt = `以下の業務ToDo内容について、指定された条件で文章を作成してください。\n\n`;
    
    // ToDo内容
    prompt += `【ToDo内容】\n${todoText}\n\n`;
    
    // タスクタイプ
    if (this.currentTask) {
      const taskNames = {
        email: 'メール作成',
        'email-reply': 'メール返信',
        document: 'ドキュメント作成',
        schedule: 'スケジュール作成',
        agenda: 'アジェンダ作成',
        report: 'レポート作成',
        proposal: '提案書作成',
        minutes: '議事録作成',
        manual: 'マニュアル作成',
        presentation: 'プレゼン資料作成',
        analysis: '分析レポート作成',
        faq: 'FAQ作成'
      };
      prompt += `【タスクタイプ】\n${taskNames[this.currentTask]}\n\n`;
    }
    
    // 文章スタイル
    const styleNames = {
      business: 'ビジネス的で丁寧',
      casual: 'カジュアルで親しみやすい',
      formal: 'フォーマルで正式',
      friendly: '親しみやすく温かい',
      professional: 'プロフェッショナルで専門的'
    };
    prompt += `【文章スタイル】\n${styleNames[this.currentStyle]}\n\n`;
    
    // タスク特化の指示を追加
    if (this.currentTask === 'email-reply') {
      prompt += `【メール返信の特別指示】\n- 元メールの内容を理解し、適切な返信を作成\n- 件名、宛名、本文、署名を含む完全なメール形式で出力\n- 相手の質問や要求に対して具体的に回答\n- ビジネスマナーに沿った敬語表現を使用\n\n`;
    } else if (this.currentTask === 'faq') {
      prompt += `【FAQ作成の特別指示】\n- 質問（Q）と回答（A）の形式で出力\n- 検索キーワードも含める\n- 類似質問のバリエーションも提示\n- 分かりやすく簡潔な説明を心がける\n\n`;
    } else if (this.currentTask === 'proposal') {
      prompt += `【企画書作成の特別指示】\n- 背景・現状の課題・提案する解決策・期待される効果の構成で作成\n- 具体的な数値目標や実施スケジュールも含める\n- 読み手を説得できる論理的な構成を心がける\n\n`;
    }
    
    // 選択された情報を追加
    if (this.selectedInfo.length > 0) {
      prompt += `【参考情報】\n`;
      this.selectedInfo.forEach(infoId => {
        const info = this.getInfoById(infoId);
        if (info) {
          prompt += `${info.title}:\n${info.content}\n\n`;
        }
      });
    }
    
    // 現在の情報ウィンドウの内容
    const currentInfo = this.infoInput.value.trim();
    if (currentInfo) {
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
    // サンプルデータ
    const sampleData = {
      sample1: {
        title: 'サンプル情報1',
        content: '株式会社サンプル\n住所: 東京都渋谷区\n電話: 03-0000-0000\n営業時間: 9:00-18:00'
      },
      sample2: {
        title: 'サンプル情報2',
        content: '主要製品:\n- Webアプリケーション開発\n- AI・機械学習ソリューション\n- データ分析サービス'
      }
    };
    
    return sampleData[infoId] || this.informationHistory.find(info => info.id === infoId);
  }

  saveCurrentInfo() {
    const content = this.infoInput.value.trim();
    if (!content) {
      alert('保存する情報を入力してください。');
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
    // サンプルアイテムを保持
    const sampleItems = Array.from(this.infoHistory.children);
    this.infoHistory.innerHTML = '';
    
    // サンプルアイテムを復元
    sampleItems.forEach(item => {
      if (item.getAttribute('data-info').startsWith('sample')) {
        this.infoHistory.appendChild(item);
      }
    });
    
    // 保存された情報を追加
    this.informationHistory.forEach(info => {
      const item = document.createElement('div');
      item.className = 'info-item';
      item.setAttribute('data-info', info.id);
      
      item.innerHTML = `
        <div class="info-item-title">${this.escapeHtml(info.title)}</div>
        <div class="info-item-preview">${this.escapeHtml(info.content.substring(0, 50))}...</div>
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
      
      if (savedTodo) {
        this.todoInput.value = savedTodo;
        this.updateCharCount(this.todoInput, this.todoCharCount);
      }
      
      if (savedInfo) {
        this.infoInput.value = savedInfo;
        this.updateCharCount(this.infoInput, this.infoCharCount);
      }
      
      // 情報履歴の復元
      const savedHistory = localStorage.getItem('assistantAI_infoHistory');
      if (savedHistory) {
        this.informationHistory = JSON.parse(savedHistory);
        this.updateInfoHistory();
      }
      
      // 設定の復元
      const savedSettings = localStorage.getItem('assistantAI_settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        this.currentStyle = settings.style || 'business';
        this.currentLanguage = settings.language || 'auto';
        
        // UIに反映
        document.querySelectorAll('.style-btn').forEach(btn => {
          btn.classList.toggle('active', btn.getAttribute('data-style') === this.currentStyle);
        });
        
        document.querySelectorAll('.lang-btn').forEach(btn => {
          btn.classList.toggle('active', btn.getAttribute('data-lang') === this.currentLanguage);
        });
      }
      
    } catch (error) {
      console.error('データの読み込みエラー:', error);
    }
  }

  saveStoredData() {
    try {
      localStorage.setItem('assistantAI_todo', this.todoInput.value);
      localStorage.setItem('assistantAI_info', this.infoInput.value);
      localStorage.setItem('assistantAI_infoHistory', JSON.stringify(this.informationHistory));
      
      const settings = {
        style: this.currentStyle,
        language: this.currentLanguage
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
    }, 30000); // 30秒ごと
    
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
}

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', () => {
  window.assistantAI = new AssistantAI();
  console.log('あなたのお手軽アシスタントAIが起動しました');
}); 