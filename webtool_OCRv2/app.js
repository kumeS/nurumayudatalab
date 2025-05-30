// NuruMayu StudyLab - AI OCR学習支援ツール
// MVP仕様書に基づく実装

class NuruMayuStudyLab {
  constructor() {
    this.currentTab = 'ocr';
    this.ocrWorker = null;
    this.isRecording = false;
    this.recognition = null;
    this.learningHistory = JSON.parse(localStorage.getItem('nurumayuLearningHistory')) || [];
    this.currentQuiz = null;
    this.quizResults = JSON.parse(localStorage.getItem('nurumayuQuizResults')) || [];
    this.celebrationOverlay = null;
    
    this.init();
  }

  init() {
    console.log('NuruMayu StudyLab 初期化開始...');
    
    // DOM要素の存在確認
    setTimeout(() => {
      this.setupEventListeners();
      this.setupTabs();
      this.setupVoiceRecognition();
      this.setupContentToggleButtons();
      this.loadSampleTexts();
      this.displayLearningStats();
      console.log('✅ NuruMayu StudyLab 初期化完了');
    }, 100);
  }

  // イベントリスナーの設定
  setupEventListeners() {
    console.log('イベントリスナー設定開始...');
    
    // タブ切り替え
    const tabs = document.querySelectorAll('.tab');
    console.log('タブ要素数:', tabs.length);
    
    tabs.forEach(tab => {
      console.log('タブID:', tab.id);
      tab.addEventListener('click', (e) => {
        const tabName = e.target.id.replace('tab-', '');
        console.log('タブクリック:', tabName);
        this.switchTab(tabName);
      });
    });

    // OCR関連
    document.getElementById('imageUpload')?.addEventListener('change', (e) => this.handleImageUpload(e));
    document.getElementById('startOcrBtn')?.addEventListener('click', () => this.startOCR());
    document.getElementById('stopOcrBtn')?.addEventListener('click', () => this.stopOCR());
    document.getElementById('correctOcrBtn')?.addEventListener('click', () => this.correctOCRWithAI());
    document.getElementById('removeImageBtn')?.addEventListener('click', () => this.removeImage());

    // 画像アップロードゾーンのイベント（追加）
    this.setupImageUploadZone();

    // テキスト入力関連
    document.getElementById('sampleBtn')?.addEventListener('click', () => this.insertSampleText());
    document.getElementById('recordBtn')?.addEventListener('click', () => this.toggleVoiceRecording());
    document.getElementById('clearBtn')?.addEventListener('click', () => this.clearTextInput());

    // 学習コンテンツ生成
    document.getElementById('generateContentOcrBtn')?.addEventListener('click', () => this.generateLearningContent('ocr'));
    document.getElementById('generateContentTextBtn')?.addEventListener('click', () => this.generateLearningContent('text'));
    document.getElementById('resetContentOcrBtn')?.addEventListener('click', () => this.resetContent('ocr'));
    document.getElementById('resetContentTextBtn')?.addEventListener('click', () => this.resetContent('text'));

    // クイズ関連
    document.getElementById('submitAllAnswersBtn')?.addEventListener('click', () => this.submitAllAnswers());
    document.getElementById('retryQuizBtn')?.addEventListener('click', () => this.retryQuiz());
    document.getElementById('newQuizBtn')?.addEventListener('click', () => this.generateNewQuiz());
    document.getElementById('celebrationCloseBtn')?.addEventListener('click', () => this.closeCelebration());

    // その他
    document.getElementById('copyBtn')?.addEventListener('click', () => this.copyToClipboard());
    
    // ガイドトグル
    document.querySelector('.toggle-guide')?.addEventListener('click', () => this.toggleGuide());
    document.querySelector('.toggle-quiz-data')?.addEventListener('click', () => this.toggleQuizData());
  }

  // 画像アップロードゾーンの設定（新規追加）
  setupImageUploadZone() {
    const uploadZone = document.getElementById('imageUploadZone');
    const fileInput = document.getElementById('imageUpload');

    if (!uploadZone || !fileInput) {
      console.error('画像アップロード要素が見つかりません:', {
        uploadZone: !!uploadZone,
        fileInput: !!fileInput
      });
      return;
    }

    console.log('画像アップロードゾーンを設定中...');

    // クリックイベント
    uploadZone.addEventListener('click', (e) => {
      console.log('アップロードゾーンクリック');
      e.preventDefault();
      fileInput.click();
    });

    // ドラッグオーバー
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadZone.classList.add('dragover');
    });

    // ドラッグリーブ
    uploadZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadZone.classList.remove('dragover');
    });

    // ドロップ
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadZone.classList.remove('dragover');

      const files = e.dataTransfer.files;
      if (files.length === 0) {
        this.showWarning('ファイルが選択されていません。');
        return;
      }

      if (files.length > 1) {
        this.showWarning('一度に処理できるファイルは1つだけです。最初のファイルを使用します。');
      }

      const file = files[0];
      
      // ファイル検証
      if (!this.validateImageFile(file)) {
        return;
      }

      // FileListをFile配列に変換してinput要素に設定
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;
      
      // ファイル変更イベントを手動で発火
      const event = new Event('change', { bubbles: true });
      fileInput.dispatchEvent(event);
    });

    console.log('✅ 画像アップロードゾーンのイベントリスナーを設定しました');
  }

  // タブ設定
  setupTabs() {
    this.switchTab('ocr');
  }

  // タブ切り替え
  switchTab(tabName) {
    this.currentTab = tabName;
    
    console.log(`タブ切り替え開始: ${tabName}`);
    
    // タブの表示切り替え
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
    });
    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) {
      targetTab.classList.add('active');
      console.log(`タブアクティブ化: tab-${tabName}`);
    } else {
      console.error(`タブが見つかりません: tab-${tabName}`);
    }

    // コンテンツの表示切り替え（CSSクラスベース）
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    const targetContent = document.getElementById(`content-${tabName}`);
    if (targetContent) {
      targetContent.classList.add('active');
      console.log(`コンテンツアクティブ化: content-${tabName}`);
    } else {
      console.error(`コンテンツが見つかりません: content-${tabName}`);
    }

    console.log(`タブ切り替え完了: ${tabName}`);
  }

  // 画像アップロード処理
  handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // ファイル検証
    if (!this.validateImageFile(file)) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const previewContainer = document.getElementById('imagePreview');
      const previewImage = document.getElementById('previewImage');
      const fileName = document.getElementById('imageFileName');
      const startOcrBtn = document.getElementById('startOcrBtn');

      previewImage.src = e.target.result;
      fileName.textContent = file.name;
      previewContainer.style.display = 'block';
      startOcrBtn.disabled = false;

      console.log(`画像アップロード成功: ${file.name}`);
      this.showSuccess(`画像「${file.name}」をアップロードしました！`);
    };
    
    reader.onerror = () => {
      this.showError('画像ファイルの読み込みに失敗しました。');
    };
    
    reader.readAsDataURL(file);
  }

  // ファイル検証機能（新規追加）
  validateImageFile(file) {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      this.showError('対応していないファイル形式です。JPEG、PNG、WebPのみ対応しています。');
      return false;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      this.showError('ファイルサイズが大きすぎます。10MB以下のファイルを選択してください。');
      return false;
    }

    return true;
  }

  // 画像削除
  removeImage() {
    const imageUpload = document.getElementById('imageUpload');
    const imagePreview = document.getElementById('imagePreview');
    const startOcrBtn = document.getElementById('startOcrBtn');
    const ocrResult = document.getElementById('ocrResult');
    const correctOcrBtn = document.getElementById('correctOcrBtn');

    // フォームとプレビューをリセット
    imageUpload.value = '';
    imagePreview.style.display = 'none';
    startOcrBtn.disabled = true;
    ocrResult.style.display = 'none';
    correctOcrBtn.style.display = 'none';

    // OCR関連の状態もリセット
    this.hideProgress();
    
    console.log('画像を削除しました');
    this.showSuccess('画像を削除しました。');
  }

  // OCR開始
  async startOCR() {
    try {
      const imageElement = document.getElementById('previewImage');
      const languageSelect = document.querySelector('input[name="ocrLanguage"]:checked');
      const language = languageSelect ? languageSelect.value : 'jpn';

      this.showProgress('OCR処理を開始しています...', 0);
      document.getElementById('startOcrBtn').style.display = 'none';
      document.getElementById('stopOcrBtn').style.display = 'inline-flex';

      // Tesseract.jsワーカーの作成
      console.log('Tesseract.js ワーカーを作成中...');
      this.ocrWorker = await Tesseract.createWorker({
        logger: m => {
          const progress = Math.round(m.progress * 100);
          this.updateProgress(`${m.status}: ${progress}%`, progress);
        }
      });

      // 言語データの読み込み
      await this.ocrWorker.loadLanguage(language);
      await this.ocrWorker.initialize(language);

      // OCR実行
      console.log('OCR処理を開始...');
      const { data: { text } } = await this.ocrWorker.recognize(imageElement);

      // 結果表示
      this.displayOCRResult(text);
      this.showSuccess('OCR処理が完了しました！');

    } catch (error) {
      console.error('OCR処理でエラーが発生:', error);
      this.showError('OCR処理でエラーが発生しました。再度お試しください。');
    } finally {
      this.hideProgress();
      document.getElementById('startOcrBtn').style.display = 'inline-flex';
      document.getElementById('stopOcrBtn').style.display = 'none';
      if (this.ocrWorker) {
        await this.ocrWorker.terminate();
        this.ocrWorker = null;
      }
    }
  }

  // OCR停止
  async stopOCR() {
    if (this.ocrWorker) {
      try {
        await this.ocrWorker.terminate();
        this.ocrWorker = null;
        this.hideProgress();
        document.getElementById('startOcrBtn').style.display = 'inline-flex';
        document.getElementById('stopOcrBtn').style.display = 'none';
        this.showWarning('OCR処理を停止しました。');
        console.log('OCR処理を停止しました');
      } catch (error) {
        console.error('OCR停止でエラー:', error);
      }
    }
  }

  // OCR結果表示
  displayOCRResult(text) {
    const ocrResult = document.getElementById('ocrResult');
    const ocrText = document.getElementById('ocrText');
    const correctBtn = document.getElementById('correctOcrBtn');

    ocrText.value = text;
    ocrResult.style.display = 'block';
    correctBtn.style.display = 'inline-flex';

    console.log('OCR結果を表示:', text.substring(0, 50) + '...');
  }

  // AI補正機能（シミュレーション）
  async correctOCRWithAI() {
    const ocrText = document.getElementById('ocrText');
    const originalText = ocrText.value;

    if (!originalText.trim()) {
      this.showWarning('補正するテキストがありません。');
      return;
    }

    try {
      this.showLoading('AI補正処理中...');
      
      // AI補正のシミュレーション（実際の実装ではLLM APIを使用）
      const correctedText = await this.simulateAICorrection(originalText);
      
      ocrText.value = correctedText;
      this.showSuccess('AI補正が完了しました！');
      
    } catch (error) {
      console.error('AI補正でエラー:', error);
      this.showError('AI補正でエラーが発生しました。');
    } finally {
      this.hideLoading();
    }
  }

  // AI補正シミュレーション
  async simulateAICorrection(text) {
    // 実際の実装ではClaude APIを呼び出し
    await this.delay(1500);
    
    try {
      // より高度な補正ロジック
      let correctedText = text
        .replace(/\s+/g, ' ')  // 複数の空白を単一に
        .replace(/([。！？])\s*([あ-ん])/g, '$1\n$2')  // 句読点後の改行
        .replace(/(\d+)\s*([年月日])/g, '$1$2')  // 数字と単位の結合
        .replace(/([ぁ-ん]+)(\s+)([ぁ-ん]+)/g, '$1$3')  // ひらがな間の不要な空白を削除
        .replace(/([ァ-ン]+)(\s+)([ァ-ン]+)/g, '$1$3')  // カタカナ間の不要な空白を削除
        .replace(/([漢字])(\s+)([漢字])/g, '$1$3')  // 漢字間の不要な空白を削除
        .trim();

      // 改行の正規化
      correctedText = correctedText
        .replace(/。\s*\n/g, '。\n')
        .replace(/\n\s*\n+/g, '\n\n');

      return correctedText;
    } catch (error) {
      console.error('AI補正エラー:', error);
      return text; // エラー時は元のテキストを返す
    }
  }

  // 音声認識設定
  setupVoiceRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      this.recognition.lang = 'ja-JP';
      this.recognition.continuous = true;
      this.recognition.interimResults = true;

      this.recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          const inputArea = document.getElementById('inputArea');
          inputArea.value += finalTranscript;
        }
      };

      this.recognition.onerror = (event) => {
        console.error('音声認識エラー:', event.error);
        this.stopVoiceRecording();
        this.showError('音声認識でエラーが発生しました。');
      };

      this.recognition.onend = () => {
        this.stopVoiceRecording();
      };
    }
  }

  // 音声録音開始/停止
  toggleVoiceRecording() {
    if (!this.recognition) {
      this.showError('このブラウザは音声認識に対応していません。');
      return;
    }

    if (this.isRecording) {
      this.stopVoiceRecording();
    } else {
      this.startVoiceRecording();
    }
  }

  // 音声録音開始
  startVoiceRecording() {
    try {
      this.recognition.start();
      this.isRecording = true;
      
      const recordBtn = document.getElementById('recordBtn');
      recordBtn.innerHTML = '<i class="fas fa-stop"></i> 録音停止';
      recordBtn.classList.add('recording');
      
      this.showSuccess('音声録音を開始しました。話してください。');
    } catch (error) {
      console.error('音声録音開始エラー:', error);
      this.showError('音声録音を開始できませんでした。');
    }
  }

  // 音声録音停止
  stopVoiceRecording() {
    if (this.recognition && this.isRecording) {
      this.recognition.stop();
    }
    
    this.isRecording = false;
    const recordBtn = document.getElementById('recordBtn');
    recordBtn.innerHTML = '<i class="fas fa-microphone"></i> 音声録音';
    recordBtn.classList.remove('recording');
  }

  // サンプルテキスト読み込み
  loadSampleTexts() {
    this.sampleTexts = [
      {
        level: 'elementary-low',
        title: '動物について',
        content: `犬は人間の友達です。犬は尻尾を振って喜びを表します。猫は静かで、よく寝ます。鳥は空を飛ぶことができます。魚は水の中で泳ぎます。動物たちは、それぞれ違った特徴を持っています。`
      },
      {
        level: 'elementary-mid',
        title: '植物の育て方',
        content: `植物を育てるには、水と太陽の光が必要です。種を土にまいて、毎日水をあげます。芽が出たら、太陽の当たる場所に置きます。植物は水を根から吸って、葉っぱで光合成をします。これによって、酸素を作り出しています。`
      },
      {
        level: 'elementary-high',
        title: '天気の仕組み',
        content: `天気は大気の状態によって決まります。太陽の熱で海や川の水が蒸発し、水蒸気となって空に上がります。高い空で冷やされた水蒸気は雲になります。雲が重くなると雨が降ります。風は気圧の違いによって生まれます。`
      },
      {
        level: 'junior',
        title: '光合成の仕組み',
        content: `光合成は植物が行う重要な生命活動です。植物は葉緑体という器官で、太陽光のエネルギーを使って二酸化炭素と水から糖を作り出します。この過程で酸素も発生します。化学反応式は 6CO₂ + 6H₂O + 光エネルギー → C₆H₁₂O₆ + 6O₂ で表されます。`
      },
      {
        level: 'senior',
        title: '確率と統計',
        content: `確率は不確実な事象の起こりやすさを数値で表したものです。確率の基本的な性質として、0 ≤ P(A) ≤ 1 があります。独立事象の場合、P(A∩B) = P(A) × P(B) が成り立ちます。統計では、母集団から標本を抽出し、その特性を分析して母集団の性質を推定します。`
      },
      {
        level: 'university',
        title: '機械学習の基礎',
        content: `機械学習は、コンピュータが明示的にプログラムされることなく学習する能力を提供するAIの一分野です。教師あり学習では、入力と正解のペアからパターンを学習します。教師なし学習では、正解のないデータから隠れた構造を発見します。深層学習は、ニューラルネットワークの多層化により、複雑な特徴表現を自動的に獲得する手法です。`
      }
    ];
  }

  // サンプルテキスト挿入
  insertSampleText() {
    const levelRadio = document.querySelector('input[name="level-text"]:checked');
    const level = levelRadio ? levelRadio.value : 'elementary-low';
    
    const sampleText = this.sampleTexts.find(text => text.level === level);
    if (sampleText) {
      document.getElementById('inputArea').value = sampleText.content;
      this.showSuccess(`サンプルテキスト「${sampleText.title}」を挿入しました。`);
    }
  }

  // テキスト入力クリア
  clearTextInput() {
    document.getElementById('inputArea').value = '';
    this.showSuccess('テキストをクリアしました。');
  }

  // コンテンツトグルボタン設定
  setupContentToggleButtons() {
    document.querySelectorAll('.content-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.currentTarget;
        const tabSuffix = button.id.includes('ocr') ? 'ocr' : 'text';
        
        button.classList.toggle('active');
        this.updateQuizSettingsVisibility(tabSuffix);
      });
    });
  }

  // クイズ設定の表示/非表示
  updateQuizSettingsVisibility(tabSuffix) {
    const quizToggle = document.getElementById(`content-quiz-${tabSuffix}`);
    const quizSettings = document.getElementById(`quiz-settings-${tabSuffix}`);
    
    if (quizToggle && quizSettings) {
      if (quizToggle.classList.contains('active')) {
        quizSettings.classList.remove('disabled');
      } else {
        quizSettings.classList.add('disabled');
      }
    }
  }

  // 学習コンテンツ生成
  async generateLearningContent(source) {
    const inputText = this.getInputText(source);
    if (!inputText.trim()) {
      this.showError('学習コンテンツを生成するためのテキストを入力してください。');
      return;
    }

    const settings = this.getContentSettings(source);
    console.log('学習コンテンツ生成設定:', settings);

    try {
      this.showLoading('AI学習コンテンツを生成中...');
      
      const results = {};
      
      // 選択されたコンテンツを生成
      if (settings.contents.summary) {
        results.summary = await this.generateSummary(inputText, settings.level);
      }
      
      if (settings.contents.explanation) {
        results.explanation = await this.generateExplanation(inputText, settings.level);
      }
      
      if (settings.contents.quiz) {
        results.quiz = await this.generateQuiz(inputText, settings);
      }

      // 結果を表示
      this.displayLearningContent(results);
      
      // 学習履歴に保存
      this.saveLearningHistory(inputText, results, settings);
      
      this.showSuccess('学習コンテンツの生成が完了しました！');
      
    } catch (error) {
      console.error('学習コンテンツ生成エラー:', error);
      this.showError('学習コンテンツの生成でエラーが発生しました。');
    } finally {
      this.hideLoading();
    }
  }

  // 入力テキスト取得
  getInputText(source) {
    if (source === 'ocr') {
      return document.getElementById('ocrText')?.value || '';
    } else {
      return document.getElementById('inputArea')?.value || '';
    }
  }

  // コンテンツ設定取得
  getContentSettings(source) {
    const suffix = source;
    
    return {
      level: document.querySelector(`input[name="level-${suffix}"]:checked`)?.value || 'elementary-low',
      questionCount: parseInt(document.querySelector(`input[name="questionCount-${suffix}"]:checked`)?.value) || 3,
      quizType: parseInt(document.querySelector(`input[name="quizType-${suffix}"]:checked`)?.value) || 4,
      contents: {
        summary: document.getElementById(`content-summary-${suffix}`)?.classList.contains('active') || false,
        explanation: document.getElementById(`content-explanation-${suffix}`)?.classList.contains('active') || false,
        quiz: document.getElementById(`content-quiz-${suffix}`)?.classList.contains('active') || false
      }
    };
  }

  // 要約生成（LLM統合準備済み）
  async generateSummary(text, level) {
    await this.delay(1000);
    
    const levelPrompts = {
      'elementary-low': '小学校低学年（6-8歳）にもわかるように、とても簡単な言葉で',
      'elementary-mid': '小学校中学年（8-10歳）にもわかるように、簡単な言葉で',
      'elementary-high': '小学校高学年（10-12歳）にもわかるように、わかりやすい言葉で',
      'junior': '中学生にもわかるように、基本的な知識を含めて',
      'senior': '高校生レベルで、専門用語も交えて',
      'university': '大学生レベルで、学術的・専門的な視点で'
    };

    // 実際の実装ではここでClaude APIを呼び出し
    const summary = await this.callLLMAPI('要約', text, level, levelPrompts[level]);

    return {
      title: '📝 要約',
      content: summary
    };
  }

  // 詳しい説明生成（LLM統合準備済み）
  async generateExplanation(text, level) {
    await this.delay(1500);
    
    const levelPrompts = {
      'elementary-low': '小学校低学年の子でもわかるように、絵や身近な例を使って',
      'elementary-mid': '小学校中学年の子でもわかるように、身近な例を交えて',
      'elementary-high': '小学校高学年の子でもわかるように、具体例を使って',
      'junior': '中学生でもわかるように、背景知識も含めて',
      'senior': '高校生レベルで、理論的な観点も含めて',
      'university': '大学生レベルで、学術的・専門的な視点で'
    };

    // 実際の実装ではここでClaude APIを呼び出し
    const explanation = await this.callLLMAPI('説明', text, level, levelPrompts[level]);

    return {
      title: '📚 詳しい説明',
      content: explanation
    };
  }

  // クイズ生成（LLM統合準備済み）
  async generateQuiz(text, settings) {
    await this.delay(2000);
    
    const questions = [];
    
    for (let i = 0; i < settings.questionCount; i++) {
      const question = await this.generateQuizQuestion(text, settings, i + 1);
      questions.push(question);
    }

    return {
      title: '🧠 理解度クイズ',
      questions: questions,
      settings: settings
    };
  }

  // クイズ問題生成
  async generateQuizQuestion(text, settings, questionNumber) {
    const choices = [];
    const alphabet = ['A', 'B', 'C', 'D', 'E'];
    
    // レベル別の問題タイプ
    const questionTypes = {
      'elementary-low': ['基本内容', '単語の意味', '簡単な理解'],
      'elementary-mid': ['要点確認', '内容理解', '基本的な応用'],
      'elementary-high': ['詳細理解', '因果関係', '比較・対比'],
      'junior': ['論理的思考', '分析・判断', '応用問題'],
      'senior': ['批判的思考', '総合判断', '発展的理解'],
      'university': ['学術的分析', '専門的判断', '研究的思考']
    };

    const levelQuestions = {
      'elementary-low': [
        `この文章で一番大切なことは何ですか？`,
        `○○について、正しく説明しているのはどれですか？`,
        `文章の中で出てくる「○○」とは何のことですか？`
      ],
      'elementary-mid': [
        `この文章の主な内容について、正しいものはどれですか？`,
        `○○と○○の関係について、適切なものはどれですか？`,
        `文章から読み取れることで、正しいのはどれですか？`
      ],
      'elementary-high': [
        `この文章で説明されている○○の特徴として、最も適切なものはどれですか？`,
        `文章の内容から判断して、○○の理由として正しいのはどれですか？`,
        `この文章の内容を踏まえると、○○について言えることはどれですか？`
      ],
      'junior': [
        `文章の論旨を踏まえ、○○について最も適切な説明はどれですか？`,
        `この文章で述べられている○○の根拠として、最も適切なものはどれですか？`,
        `文章の内容を分析すると、○○に関して言えることはどれですか？`
      ],
      'senior': [
        `この文章の論点を批判的に検討した場合、○○について最も妥当な見解はどれですか？`,
        `文章で提示された○○の概念を発展的に考察すると、どのような帰結が導かれますか？`,
        `この文章の理論的枠組みを応用した場合、○○に関して予想される結果はどれですか？`
      ],
      'university': [
        `この文章の学術的意義を踏まえ、○○に関する研究の方向性として最も適切なものはどれですか？`,
        `文章で展開された理論を学際的観点から分析した場合、○○について言えることはどれですか？`,
        `この文章の概念的フレームワークを他の分野に応用する際の課題として、最も重要なものはどれですか？`
      ]
    };

    // レベルに応じた問題文を選択
    const levelQuestionList = levelQuestions[settings.level] || levelQuestions['elementary-mid'];
    const baseQuestion = levelQuestionList[Math.floor(Math.random() * levelQuestionList.length)];
    
    // テキストから重要な概念を抽出（簡単な例）
    const keywords = text.match(/[あ-ん一-龯ァ-ヶー]+/g)?.slice(0, 3) || ['概念', '内容', '要素'];
    const keyword = keywords[Math.floor(Math.random() * keywords.length)];
    
    const question = baseQuestion.replace(/○○/g, keyword);

    // レベル別の選択肢生成
    const choiceTemplates = {
      'elementary-low': [
        `${keyword}は重要な要素です`,
        `${keyword}は関係ありません`,
        `${keyword}は別のものです`,
        `${keyword}は分かりません`
      ],
      'elementary-mid': [
        `${keyword}は主要な概念として説明されています`,
        `${keyword}は補助的な役割を果たします`,
        `${keyword}は対立する概念です`,
        `${keyword}は無関係な要素です`
      ],
      'elementary-high': [
        `${keyword}は文章の中心的テーマとして重要な役割を担っています`,
        `${keyword}は部分的に言及されているが主要ではありません`,
        `${keyword}は反対の立場から論じられています`,
        `${keyword}は文章の内容とは直接的な関係がありません`
      ],
      'junior': [
        `${keyword}は論理的構造の核心を成す重要な概念です`,
        `${keyword}は補完的な要素として機能しています`,
        `${keyword}は批判的検討の対象となっています`,
        `${keyword}は論証の前提条件として扱われています`
      ],
      'senior': [
        `${keyword}は理論的基盤として体系的に論述されています`,
        `${keyword}は実証的データに基づいて分析されています`,
        `${keyword}は批判的視点から再検討されています`,
        `${keyword}は新たな視点から革新的に捉え直されています`
      ],
      'university': [
        `${keyword}は学術的議論の核心的論点として位置づけられています`,
        `${keyword}は学際的アプローチによって多角的に分析されています`,
        `${keyword}は既存の理論的枠組みを超越した新しい概念として提示されています`,
        `${keyword}は研究方法論の観点から批判的に検証されています`
      ]
    };

    const templates = choiceTemplates[settings.level] || choiceTemplates['elementary-mid'];
    
    // 選択肢を生成
    for (let i = 0; i < settings.quizType; i++) {
      choices.push({
        id: alphabet[i],
        text: templates[i] || `選択肢${alphabet[i]}（${settings.level}レベル）`,
        isCorrect: i === 0 // 最初の選択肢を正解とする
      });
    }

    // レベル別のヒント生成
    const hints = {
      'elementary-low': `文章をもう一度よく読んで、「${keyword}」について書かれている部分を探してみましょう。`,
      'elementary-mid': `「${keyword}」が文章のどの部分で、どのように説明されているかを確認してみましょう。`,
      'elementary-high': `文章全体の流れを考えながら、「${keyword}」の位置づけや役割を考えてみましょう。`,
      'junior': `「${keyword}」に関する記述を論理的に分析し、文章の主張との関係を考察してみましょう。`,
      'senior': `「${keyword}」の概念を理論的観点から捉え、文章の論証構造における意義を検討してみましょう。`,
      'university': `「${keyword}」を学術的文脈に位置づけ、研究の意義や理論的貢献の観点から分析してみましょう。`
    };

    // レベル別の解説生成
    const explanations = {
      'elementary-low': `この問題のポイントは「${keyword}」について理解することです。文章を読み返して確認しましょう。`,
      'elementary-mid': `「${keyword}」は文章の重要な要素です。内容をよく理解して覚えておきましょう。`,
      'elementary-high': `「${keyword}」の役割や意味を正しく理解することで、文章全体の理解が深まります。`,
      'junior': `「${keyword}」に関する理解を深めることで、文章の論理構造や主張をより良く把握できます。`,
      'senior': `「${keyword}」の概念的意義を理論的に把握することが、文章の本質的理解につながります。`,
      'university': `「${keyword}」を学術的視点から分析することで、研究の深層的理解と批判的思考力が養われます。`
    };

    return {
      id: questionNumber,
      question: question,
      choices: choices,
      hint: hints[settings.level] || hints['elementary-mid'],
      explanation: explanations[settings.level] || explanations['elementary-mid']
    };
  }

  // 学習コンテンツ表示
  displayLearningContent(results) {
    let output = '';

    if (results.summary) {
      output += `${results.summary.title}\n${'-'.repeat(50)}\n${results.summary.content}\n\n`;
    }

    if (results.explanation) {
      output += `${results.explanation.title}\n${'-'.repeat(50)}\n${results.explanation.content}\n\n`;
    }

    if (results.quiz) {
      this.currentQuiz = results.quiz;
      this.displayQuiz(results.quiz);
      output += `${results.quiz.title}\n${'-'.repeat(50)}\nクイズが生成されました。下のクイズエリアで挑戦してください。\n\n`;
      
      // クイズの詳細情報も出力に追加
      output += `【クイズ詳細】\n`;
      output += `問題数: ${results.quiz.questions.length}問\n`;
      output += `形式: ${results.quiz.settings.quizType}択\n`;
      output += `対象レベル: ${this.getLevelName(results.quiz.settings.level)}\n\n`;
      
      results.quiz.questions.forEach((question, index) => {
        output += `問題${index + 1}: ${question.question}\n`;
        question.choices.forEach(choice => {
          output += `  ${choice.id}. ${choice.text} ${choice.isCorrect ? '(正解)' : ''}\n`;
        });
        output += `  ヒント: ${question.hint}\n`;
        output += `  解説: ${question.explanation}\n\n`;
      });
    }

    // 出力エリアに表示
    const outputContainer = document.querySelector('.output-container');
    const quizData = document.getElementById('quizData');
    
    if (outputContainer && quizData) {
      quizData.value = output;
      outputContainer.style.display = 'block';
    }
  }

  // レベル名取得
  getLevelName(level) {
    const levelNames = {
      'elementary-low': '小学生（低学年）',
      'elementary-mid': '小学生（中学年）',
      'elementary-high': '小学生（高学年）',
      'junior': '中学生',
      'senior': '高校生',
      'university': '大学生'
    };
    return levelNames[level] || level;
  }

  // クイズ表示
  displayQuiz(quiz) {
    const quizContainer = document.getElementById('quizContainer');
    const allQuestions = document.getElementById('allQuestions');
    const submitBtn = document.getElementById('submitAllAnswersBtn');

    if (!quizContainer || !allQuestions) return;

    // クイズコンテナを表示
    quizContainer.style.display = 'block';
    
    // 進捗表示を更新
    this.updateQuizProgress(quiz.questions.length, 0);

    // 全問題を表示
    allQuestions.innerHTML = '';
    quiz.questions.forEach((question, index) => {
      const questionElement = this.createQuestionElement(question, index);
      allQuestions.appendChild(questionElement);
    });

    // 送信ボタンを表示
    submitBtn.style.display = 'inline-flex';
    submitBtn.disabled = true;

    // 回答変更監視
    this.setupAnswerChangeListeners();

    // スクロールしてクイズエリアを表示
    quizContainer.scrollIntoView({ behavior: 'smooth' });
  }

  // 問題要素作成
  createQuestionElement(question, index) {
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-card';
    questionDiv.innerHTML = `
      <div class="question-header">
        <div class="question-number">問題 ${question.id}</div>
        <button class="hint-button" onclick="app.showHint(${question.id})">
          <i class="fas fa-lightbulb"></i> ヒント
        </button>
      </div>
      <div class="question-text">${question.question}</div>
      <div class="question-options">
        ${question.choices.map(choice => `
          <div class="option-item" onclick="app.selectOption(${question.id}, '${choice.id}')">
            <input type="radio" name="question${question.id}" value="${choice.id}" data-correct="${choice.isCorrect}" style="display: none;">
            ${choice.id}. ${choice.text}
          </div>
        `).join('')}
      </div>
      <div class="hint-display" id="hint${question.id}" style="display: none;">
        <i class="fas fa-lightbulb hint-icon"></i> ${question.hint}
      </div>
      <div class="question-result" id="result${question.id}" style="display: none;"></div>
    `;
    return questionDiv;
  }

  // 選択肢クリック処理
  selectOption(questionId, choiceId) {
    // 該当する質問の選択肢をすべて取得
    const questionOptions = document.querySelectorAll(`input[name="question${questionId}"]`);
    const optionItems = document.querySelectorAll(`input[name="question${questionId}"]`).forEach(input => {
      input.closest('.option-item').classList.remove('selected');
    });
    
    // 選択された選択肢をマーク
    const selectedInput = document.querySelector(`input[name="question${questionId}"][value="${choiceId}"]`);
    if (selectedInput) {
      selectedInput.checked = true;
      selectedInput.closest('.option-item').classList.add('selected');
    }
    
    this.checkAllQuestionsAnswered();
  }

  // 回答変更監視
  setupAnswerChangeListeners() {
    document.querySelectorAll('.question-options input[type="radio"]').forEach(radio => {
      radio.addEventListener('change', () => {
        this.checkAllQuestionsAnswered();
      });
    });
  }

  // 全問題回答チェック
  checkAllQuestionsAnswered() {
    const totalQuestions = this.currentQuiz.questions.length;
    let answeredQuestions = 0;

    for (let i = 1; i <= totalQuestions; i++) {
      const answered = document.querySelector(`input[name="question${i}"]:checked`);
      if (answered) {
        answeredQuestions++;
      }
    }

    const submitBtn = document.getElementById('submitAllAnswersBtn');
    const progress = document.getElementById('quizProgress');
    
    if (submitBtn) {
      submitBtn.disabled = answeredQuestions !== totalQuestions;
      submitBtn.innerHTML = answeredQuestions === totalQuestions 
        ? '<i class="fas fa-check-circle"></i> 回答する'
        : `<i class="fas fa-check-circle"></i> 回答する（${answeredQuestions}/${totalQuestions}問選択済み）`;
    }

    // 進捗更新
    this.updateQuizProgress(totalQuestions, answeredQuestions);
  }

  // クイズ進捗更新
  updateQuizProgress(total, answered) {
    const progressElement = document.getElementById('quizProgress');
    const scoreElement = document.getElementById('quizScore');
    
    if (progressElement) {
      progressElement.textContent = `問題 ${answered}/${total} 回答済み`;
    }
    
    if (scoreElement) {
      scoreElement.textContent = answered === total ? '回答完了' : '未完了';
    }
  }

  // ヒント表示
  showHint(questionId) {
    const hintElement = document.getElementById(`hint${questionId}`);
    if (hintElement) {
      hintElement.style.display = hintElement.style.display === 'none' ? 'block' : 'none';
    }
  }

  // 全問題回答送信
  submitAllAnswers() {
    if (!this.currentQuiz) return;

    const results = [];
    let correctCount = 0;

    this.currentQuiz.questions.forEach(question => {
      const selectedAnswer = document.querySelector(`input[name="question${question.id}"]:checked`);
      const isCorrect = selectedAnswer ? selectedAnswer.dataset.correct === 'true' : false;
      
      if (isCorrect) correctCount++;
      
      results.push({
        questionId: question.id,
        selectedAnswer: selectedAnswer ? selectedAnswer.value : null,
        isCorrect: isCorrect,
        question: question
      });

      // 結果表示
      this.displayQuestionResult(question.id, isCorrect, question.explanation);
    });

    // 全体結果表示
    this.displayQuizResults(correctCount, this.currentQuiz.questions.length);
    
    // 学習履歴に保存
    this.saveQuizResult(correctCount, this.currentQuiz.questions.length, results);

    // ボタン状態変更
    document.getElementById('submitAllAnswersBtn').style.display = 'none';
    document.getElementById('retryQuizBtn').style.display = 'inline-flex';
    document.getElementById('newQuizBtn').style.display = 'inline-flex';
  }

  // 問題結果表示
  displayQuestionResult(questionId, isCorrect, explanation) {
    const resultElement = document.getElementById(`result${questionId}`);
    const questionCard = resultElement?.closest('.question-card');
    
    if (resultElement) {
      resultElement.innerHTML = `
        <div class="explanation-display">
          <i class="fas fa-book-open explanation-icon"></i>
          <strong>解説:</strong> ${explanation}
        </div>
      `;
      resultElement.style.display = 'block';
    }
    
    // 問題カードにスタイルを適用
    if (questionCard) {
      questionCard.classList.add(isCorrect ? 'correct' : 'incorrect');
    }
    
    // 選択肢にも結果を反映
    const options = document.querySelectorAll(`input[name="question${questionId}"]`);
    options.forEach(option => {
      const optionItem = option.closest('.option-item');
      if (option.dataset.correct === 'true') {
        optionItem.classList.add('correct');
      } else if (option.checked && option.dataset.correct === 'false') {
        optionItem.classList.add('incorrect');
      }
    });
  }

  // クイズ結果表示
  displayQuizResults(correctCount, totalCount) {
    const percentage = Math.round((correctCount / totalCount) * 100);
    
    // フィードバック表示
    const feedback = document.getElementById('quizFeedback');
    if (feedback) {
      feedback.innerHTML = `
        <div class="quiz-results">
          <h3>🎯 クイズ結果</h3>
          <div class="score-summary">
            <div class="score-main">${correctCount} / ${totalCount} 問正解</div>
            <div class="score-percentage">正解率: ${percentage}%</div>
          </div>
          ${this.getScoreMessage(percentage)}
        </div>
      `;
      feedback.style.display = 'block';
    }

    // 祝福演出
    if (percentage === 100) {
      this.showCelebration(correctCount, totalCount, percentage);
    }
  }

  // スコアメッセージ取得
  getScoreMessage(percentage) {
    if (percentage === 100) {
      return '<div class="score-message excellent">🏆 完璧です！素晴らしい理解力ですね！</div>';
    } else if (percentage >= 80) {
      return '<div class="score-message good">🥈 とても良くできました！</div>';
    } else if (percentage >= 60) {
      return '<div class="score-message average">🥉 良い成績です。復習してさらに理解を深めましょう。</div>';
    } else if (percentage >= 40) {
      return '<div class="score-message encouraging">📚 もう少しです。復習して再挑戦してみましょう。</div>';
    } else {
      return '<div class="score-message motivating">💪 今回は難しかったですね。基礎から復習してみましょう。</div>';
    }
  }

  // 祝福演出表示
  showCelebration(correctCount, totalCount, percentage) {
    const overlay = document.getElementById('celebrationOverlay');
    const scoreElement = document.getElementById('celebrationScore');
    
    if (overlay && scoreElement) {
      scoreElement.textContent = `正解: ${correctCount} / ${totalCount}`;
      overlay.classList.add('show');
    }
  }

  // 祝福演出クローズ
  closeCelebration() {
    const overlay = document.getElementById('celebrationOverlay');
    if (overlay) {
      overlay.classList.remove('show');
    }
  }

  // クイズ再テスト
  retryQuiz() {
    if (!this.currentQuiz) return;

    // 回答をリセット
    document.querySelectorAll('.question-options input[type="radio"]').forEach(radio => {
      radio.checked = false;
    });

    // 選択スタイルをリセット
    document.querySelectorAll('.option-item').forEach(option => {
      option.classList.remove('selected', 'correct', 'incorrect');
    });

    // 結果表示をリセット
    document.querySelectorAll('.question-result').forEach(result => {
      result.style.display = 'none';
    });

    // フィードバックを非表示
    const feedback = document.getElementById('quizFeedback');
    if (feedback) {
      feedback.style.display = 'none';
    }

    // ボタン状態をリセット
    document.getElementById('submitAllAnswersBtn').style.display = 'inline-flex';
    document.getElementById('submitAllAnswersBtn').disabled = true;
    document.getElementById('retryQuizBtn').style.display = 'none';
    document.getElementById('newQuizBtn').style.display = 'none';

    // 進捗をリセット
    this.updateQuizProgress(this.currentQuiz.questions.length, 0);

    this.showSuccess('クイズをリセットしました。再挑戦してください！');
  }

  // 新しいクイズ生成
  generateNewQuiz() {
    // クイズ設定から新しいクイズを生成
    const source = this.currentTab;
    this.generateLearningContent(source);
  }

  // 学習履歴保存
  saveLearningHistory(inputText, results, settings) {
    const historyItem = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      inputText: inputText.substring(0, 200) + '...',
      contentTypes: Object.keys(results),
      level: settings.level,
      source: this.currentTab
    };

    this.learningHistory.unshift(historyItem);
    
    // 最大100件まで保持
    if (this.learningHistory.length > 100) {
      this.learningHistory = this.learningHistory.slice(0, 100);
    }

    localStorage.setItem('nurumayuLearningHistory', JSON.stringify(this.learningHistory));
    this.displayLearningStats();
  }

  // クイズ結果保存
  saveQuizResult(correctCount, totalCount, results) {
    const quizResult = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      correctCount: correctCount,
      totalCount: totalCount,
      percentage: Math.round((correctCount / totalCount) * 100),
      details: results
    };

    this.quizResults.unshift(quizResult);
    
    // 最大50件まで保持
    if (this.quizResults.length > 50) {
      this.quizResults = this.quizResults.slice(0, 50);
    }

    localStorage.setItem('nurumayuQuizResults', JSON.stringify(this.quizResults));
  }

  // 学習統計表示
  displayLearningStats() {
    console.log(`学習履歴: ${this.learningHistory.length}件`);
    console.log(`クイズ結果: ${this.quizResults.length}件`);
  }

  // コンテンツリセット
  resetContent(source) {
    // クイズ非表示
    document.getElementById('quizContainer').style.display = 'none';
    
    // 出力エリア非表示
    const outputContainer = document.querySelector('.output-container');
    if (outputContainer) {
      outputContainer.style.display = 'none';
    }

    // OCRの場合は結果も非表示
    if (source === 'ocr') {
      document.getElementById('ocrResult').style.display = 'none';
    }

    this.currentQuiz = null;
    this.showSuccess('コンテンツをリセットしました。');
  }

  // クリップボードにコピー
  async copyToClipboard() {
    const quizData = document.getElementById('quizData');
    if (quizData && quizData.value) {
      try {
        await navigator.clipboard.writeText(quizData.value);
        this.showSuccess('クリップボードにコピーしました！');
      } catch (error) {
        console.error('コピーエラー:', error);
        this.showError('コピーに失敗しました。');
      }
    }
  }

  // ユーティリティメソッド
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  showProgress(message, percent) {
    const progress = document.getElementById('ocrProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.querySelector('.progress-text');
    const progressPercent = document.getElementById('progressPercent');

    if (progress) {
      progress.style.display = 'block';
      progressText.textContent = message;
      progressPercent.textContent = `${percent}%`;
      progressFill.style.width = `${percent}%`;
    }
  }

  updateProgress(message, percent) {
    const progressText = document.querySelector('.progress-text');
    const progressPercent = document.getElementById('progressPercent');
    const progressFill = document.getElementById('progressFill');

    if (progressText) progressText.textContent = message;
    if (progressPercent) progressPercent.textContent = `${percent}%`;
    if (progressFill) progressFill.style.width = `${percent}%`;
  }

  hideProgress() {
    const progress = document.getElementById('ocrProgress');
    if (progress) {
      progress.style.display = 'none';
    }
  }

  showLoading(message) {
    const loading = document.getElementById('loadingIndicator');
    const loadingText = document.querySelector('.loading-text');
    
    if (loading) {
      loading.style.display = 'flex';
      if (loadingText) loadingText.textContent = message || '処理中';
    }
  }

  hideLoading() {
    const loading = document.getElementById('loadingIndicator');
    if (loading) {
      loading.style.display = 'none';
    }
  }

  showSuccess(message) {
    this.showMessage(message, 'success');
  }

  showError(message) {
    this.showMessage(message, 'error');
  }

  showWarning(message) {
    this.showMessage(message, 'warning');
  }

  showMessage(message, type) {
    // 簡単な通知システム
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      color: white;
      font-weight: bold;
      z-index: 1000;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;

    const colors = {
      success: '#4CAF50',
      error: '#f44336',
      warning: '#ff9800'
    };

    notification.style.backgroundColor = colors[type] || colors.success;
    
    document.body.appendChild(notification);
    
    // アニメーション
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);

    // 自動削除
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);

    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  // ガイドトグル
  toggleGuide() {
    const toggle = document.querySelector('.toggle-guide');
    const content = document.querySelector('.guide-content');
    
    if (toggle && content) {
      const isVisible = content.style.display !== 'none';
      content.style.display = isVisible ? 'none' : 'block';
      toggle.classList.toggle('active', !isVisible);
    }
  }

  // クイズデータトグル
  toggleQuizData() {
    const toggle = document.querySelector('.toggle-quiz-data');
    const content = document.querySelector('.quiz-data-content');
    
    if (toggle && content) {
      const isVisible = content.style.display !== 'none';
      content.style.display = isVisible ? 'none' : 'block';
      toggle.classList.toggle('active', !isVisible);
    }
  }

  // LLM API統合機能（現在はシミュレーション）
  async callLLMAPI(type, text, level, prompt) {
    // 実際の実装ではClaude APIまたは他のLLM APIを呼び出し
    await this.delay(500);
    
    const templates = {
      '要約': {
        'elementary-low': `【やさしい要約】\n「${text.substring(0, 100)}...」について、とてもやさしく説明すると：\n\n・重要なポイント1\n・重要なポイント2\n・重要なポイント3\n\n${prompt}まとめました。`,
        'elementary-mid': `【要約】\n${text.substring(0, 150)}についての大切なポイント：\n\n1. 主要な内容\n2. 重要な特徴\n3. 覚えておきたいこと\n\n${prompt}説明しました。`,
        'elementary-high': `【要約】\n${text.substring(0, 200)}の重要なポイント：\n\n◆ 核心的な内容\n◆ 重要な概念\n◆ 関連する知識\n\n${prompt}整理しました。`,
        'junior': `【要約】\n${text.substring(0, 250)}の要点整理：\n\n① 基本的な概念\n② 重要な原理\n③ 応用例\n\n${prompt}まとめました。`,
        'senior': `【要約】\n${text.substring(0, 300)}の核心内容：\n\n■ 基本原理\n■ 理論的背景\n■ 実践的応用\n\n${prompt}分析しました。`,
        'university': `【要約】\n${text.substring(0, 350)}の本質的要素：\n\n▲ 理論的基盤\n▲ 学術的意義\n▲ 研究的価値\n\n${prompt}考察しました。`
      },
      '説明': {
        'elementary-low': `【やさしい説明】\n\n「${text.substring(0, 50)}...」について、わかりやすく説明します：\n\n🌟 どんなことかな？\n${text.substring(0, 100)}のことは、まるで○○のようなものです。\n\n🌟 なぜ大切？\nこれを知っていると、○○ができるようになります。\n\n🌟 覚えておこう！\n・ポイント1\n・ポイント2\n・ポイント3`,
        'elementary-mid': `【わかりやすい説明】\n\n${text.substring(0, 100)}について詳しく説明します：\n\n📖 基本的な内容\n具体的な例を使って説明すると...\n\n📖 身近な例\n日常生活で言うと...\n\n📖 覚えるポイント\n・重要な点1\n・重要な点2\n・重要な点3`,
        'elementary-high': `【詳しい説明】\n\n${text.substring(0, 150)}についての解説：\n\n📚 基本概念\n具体例：...\n\n📚 関連知識\n背景：...\n\n📚 応用例\n実際の使い方：...\n\n📚 まとめ\n重要なポイント：...`,
        'junior': `【詳細解説】\n\n${text.substring(0, 200)}に関する詳しい説明：\n\n🔍 背景知識\n基礎となる概念：...\n\n🔍 詳細内容\n具体的な仕組み：...\n\n🔍 関連事項\n関係する分野：...\n\n🔍 実践例\n実際の応用：...`,
        'senior': `【理論的解説】\n\n${text.substring(0, 250)}の理論的説明：\n\n🎓 理論的基盤\n学術的背景：...\n\n🎓 詳細分析\n専門的内容：...\n\n🎓 応用分野\n実践的活用：...\n\n🎓 発展的内容\n高度な理解：...`,
        'university': `【学術的解説】\n\n${text.substring(0, 300)}の専門的分析：\n\n🏛️ 学術的意義\n研究的価値：...\n\n🏛️ 理論的枠組み\n概念的基盤：...\n\n🏛️ 研究動向\n最新の知見：...\n\n🏛️ 今後の展望\n発展可能性：...`
      }
    };

    return templates[type]?.[level] || `${type}結果（${level}レベル）：\n\n${text.substring(0, 200)}...\n\n${prompt}処理を行いました。`;
  }
}

// アプリケーション初期化
let app;
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM読み込み完了');
  app = new NuruMayuStudyLab();
  
  // 緊急修正: 直接イベントリスナーを設定
  setTimeout(() => {
    console.log('緊急修正イベントリスナー設定中...');
    
    // タブクリック修正
    const tabs = document.querySelectorAll('.tab');
    console.log('緊急修正 - タブ要素数:', tabs.length);
    tabs.forEach(tab => {
      console.log('緊急修正 - タブID:', tab.id);
      tab.style.cursor = 'pointer';
      tab.onclick = function(e) {
        e.preventDefault();
        const tabName = this.id.replace('tab-', '');
        console.log('緊急修正 - 直接タブクリック:', tabName);
        if (app && app.switchTab) {
          app.switchTab(tabName);
        } else {
          console.error('appまたはswitchTabが見つかりません');
        }
      };
    });
    
    // アップロードゾーンクリック修正
    const uploadZone = document.getElementById('imageUploadZone');
    const fileInput = document.getElementById('imageUpload');
    console.log('緊急修正 - アップロード要素:', {uploadZone: !!uploadZone, fileInput: !!fileInput});
    
    if (uploadZone && fileInput) {
      uploadZone.style.cursor = 'pointer';
      uploadZone.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('緊急修正 - 直接アップロードクリック');
        try {
          fileInput.click();
        } catch (error) {
          console.error('ファイル選択エラー:', error);
        }
      };
      
      // ファイル選択イベントも確認
      fileInput.onchange = function(e) {
        console.log('緊急修正 - ファイル選択:', e.target.files[0]?.name);
        if (app && app.handleImageUpload) {
          app.handleImageUpload(e);
        }
      };
    } else {
      console.error('緊急修正 - アップロード要素が見つかりません');
    }
  }, 200);
}); 