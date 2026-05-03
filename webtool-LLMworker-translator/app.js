/**
 * ぬるっと翻訳・校閲ツール JavaScript
 * LLMを活用したテキスト処理ツール
 */
document.addEventListener('DOMContentLoaded', () => {
  // 要素の参照を取得
  const tabs = document.querySelectorAll('.tabs .tab');
  const inputArea = document.getElementById('inputArea');
  const finalOutput = document.getElementById('final');
  const reviewOutput = document.getElementById('review');
  const runBtn = document.getElementById('runBtn');
  const resetBtn = document.getElementById('resetBtn');
  const copyBtn = document.getElementById('copyBtn');
  const speakBtn = document.getElementById('speakBtn');
  const toInputBtn = document.getElementById('toInputBtn');
  const loadingIndicator = document.getElementById('loadingIndicator');

  // ---- BEGIN MODIFICATION: History panel element references ----
  const historyBtn = document.getElementById('historyBtn');
  const historyCloseBtn = document.getElementById('historyCloseBtn');
  const historyPanel = document.getElementById('historyPanel');
  const historyOverlay = document.getElementById('historyOverlay');
  const historyList = document.getElementById('historyList');
  // ---- END MODIFICATION ----
  // ---- BEGIN MODIFICATION: AbortController and rate limiting module-scope variables ----
  let currentAbortController = null;
  let lastRunTime = 0;
  const RUN_COOLDOWN_MS = 3000;
  // ---- END MODIFICATION ----
  
  // ---- BEGIN MODIFICATION: Load saved input text ----
  // Load saved input text from localStorage, clearing a specific erroneous string if present
  let savedInputText = localStorage.getItem('inputText');
  if (savedInputText === "This will ensure that your input text is preserved even if you refresh the page.") {
    localStorage.removeItem('inputText');
    savedInputText = null; // Prevent loading this specific string
  }
  if (savedInputText) {
    inputArea.value = savedInputText;
  } else {
    inputArea.value = ''; // Ensure it's empty if nothing valid is loaded or after clearing the specific string
  }
  // ---- END MODIFICATION ----

  // ---- BEGIN MODIFICATION: Save input text on change ----
  // Save input text to localStorage whenever it changes
  inputArea.addEventListener('input', () => {
    localStorage.setItem('inputText', inputArea.value);
  });
  // ---- END MODIFICATION ----
  
  // 現在のモード（デフォルト：日本語→英語）
  let currentMode = 'jaen';
  
  // 起動時にタブの状態を明示的に確認
  console.log('初期タブ状態:');
  tabs.forEach(tab => {
    console.log(`${tab.id}: ${tab.classList.contains('active') ? 'active' : 'inactive'}`);
    // スタイル確認のためのデバッグコード追加
    const computedStyle = window.getComputedStyle(tab);
    console.log(`${tab.id} スタイル: 背景色=${computedStyle.backgroundColor}, 色=${computedStyle.color}, ボーダー=${computedStyle.borderBottom}`);
  });
  
  // すべてのタブの表示を更新する関数
  function updateTabDisplay() {
    tabs.forEach(tab => {
      if (tab.classList.contains('active')) {
        // アクティブなタブのスタイル
        tab.style.cssText = `
          background-color: #fff;
          color: var(--primary);
          font-weight: bold;
          border-bottom: 3px solid var(--primary);
          box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.1);
        `;
      } else {
        // 非アクティブなタブのスタイル
        tab.style.cssText = `
          background-color: #f8f9fa;
          color: var(--text-secondary);
          font-weight: normal;
          border-bottom: none;
          box-shadow: none;
        `;
      }
    });
  }
  
  // タブ切り替え関数
  function switchTab(selectedTab) {
    // 前のタブから active クラスを削除
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // 選択されたタブに active クラスを追加
    selectedTab.classList.add('active');
    
    // タブの表示を更新
    updateTabDisplay();
    
    // IDからモードを取得
    currentMode = selectedTab.id.replace('tab-', '');
    console.log('モード切替:', currentMode);
    
    // タブ切り替え時は結果だけをクリア（入力は保持）
    clearResults();
  }
  
  // タブ切り替え
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab);
      
      // タブの状態を確認
      console.log('タブ切り替え後の状態:');
      tabs.forEach(t => {
        console.log(`${t.id}: ${t.classList.contains('active') ? 'active' : 'inactive'}`);
        const computedStyle = window.getComputedStyle(t);
        console.log(`${t.id} スタイル: 背景色=${computedStyle.backgroundColor}, 色=${computedStyle.color}, ボーダー=${computedStyle.borderBottom}`);
      });
    });
  });
  
  // 初期表示時にタブの表示を更新
  updateTabDisplay();
  
  // ページ離脱時に読み上げを停止
  window.addEventListener('beforeunload', () => {
    if (currentSpeech) {
      speechSynthesis.cancel();
    }
  });
  
  // コピー禁止制御（校閲結果）
  reviewOutput.addEventListener('copy', e => {
    e.preventDefault();
  });
  
  // 最終結果コピー機能
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(finalOutput.value).then(() => {
      // コピー成功時の処理
      copyBtn.classList.add('copy-success');
      
      // 2秒後に元に戻す
      setTimeout(() => {
        copyBtn.classList.remove('copy-success');
      }, 2000);
    }).catch(err => {
      console.error('コピーに失敗しました', err);
      alert('コピーできませんでした。');
    });
  });
  
  // 読み上げ機能
  let currentSpeech = null;
  
  speakBtn.addEventListener('click', () => {
    const text = finalOutput.value.trim();
    
    if (!text) {
      alert('読み上げるテキストがありません。');
      return;
    }
    
    // Web Speech API対応チェック
    if (!('speechSynthesis' in window)) {
      alert('お使いのブラウザは音声読み上げ機能に対応していません。');
      return;
    }
    
    // 現在の読み上げを停止
    if (currentSpeech) {
      speechSynthesis.cancel();
      currentSpeech = null;
      speakBtn.classList.remove('speak-active');
      speakBtn.innerHTML = '<i class="fas fa-volume-up"></i> 読み上げ';
      return;
    }
    
    // 新しい読み上げを開始
    currentSpeech = new SpeechSynthesisUtterance(text);
    
    // 言語を自動判定
    const language = detectLanguageForSpeech(text);
    currentSpeech.lang = language;
    
    // 読み上げ設定
    currentSpeech.rate = 0.9; // 読み上げ速度
    currentSpeech.pitch = 1.0; // 音の高さ
    currentSpeech.volume = 1.0; // 音量
    
    // イベントリスナー
    currentSpeech.onstart = () => {
      speakBtn.classList.add('speak-active');
      speakBtn.innerHTML = '<i class="fas fa-stop"></i> 停止';
    };
    
    currentSpeech.onend = () => {
      currentSpeech = null;
      speakBtn.classList.remove('speak-active');
      speakBtn.innerHTML = '<i class="fas fa-volume-up"></i> 読み上げ';
    };
    
    currentSpeech.onerror = (event) => {
      console.error('読み上げエラー:', event.error);
      currentSpeech = null;
      speakBtn.classList.remove('speak-active');
      speakBtn.innerHTML = '<i class="fas fa-volume-up"></i> 読み上げ';
      alert('読み上げ中にエラーが発生しました。');
    };
    
    // 読み上げ開始
    speechSynthesis.speak(currentSpeech);
  });
  
  // 言語自動判定関数（読み上げ用）
  function detectLanguageForSpeech(text) {
    // 日本語文字が含まれている場合は日本語
    if (containsJapaneseChars(text)) {
      return 'ja-JP';
    }
    // 英語文字のみの場合は英語
    else if (containsLatinChars(text)) {
      return 'en-US';
    }
    // デフォルトは日本語
    return 'ja-JP';
  }
  
  // リセットボタン
  resetBtn.addEventListener('click', resetUI);
  
  // 実行ボタン
  runBtn.addEventListener('click', runLLM);
  
  // 入力欄に戻すボタン
  toInputBtn.addEventListener('click', () => {
    // 最終結果を入力欄に設定
    inputArea.value = finalOutput.value;
    
    // スクロールを入力欄の先頭に移動
    inputArea.scrollTop = 0;
    
    // 入力欄にフォーカスを当てる
    inputArea.focus();
    
    // アニメーション効果（オプション）
    inputArea.classList.add('highlight-input');
    setTimeout(() => {
      inputArea.classList.remove('highlight-input');
    }, 1000);
  });
  

  
  // 結果のみクリア（タブ切り替え時に使用）
  function clearResults() {
    finalOutput.value = '';
    reviewOutput.innerHTML = '';
  }
  
  // UI初期化（全てクリア）
  function resetUI() {
    inputArea.value = '';
    localStorage.removeItem('inputText');
    // ---- BEGIN MODIFICATION: Abort pending requests on reset ----
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }
    loadingIndicator.classList.remove('active');
    // ---- END MODIFICATION ----
    clearResults();
  }
  
  // ---- BEGIN MODIFICATION: Helper functions for language detection ----
  // Helper function to detect Japanese characters
  function containsJapaneseChars(text) {
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
    return japaneseRegex.test(text);
  }

  // Helper function to detect Latin characters
  function containsLatinChars(text) {
    const latinRegex = /[a-zA-Z]/;
    return latinRegex.test(text);
  }
  // ---- END MODIFICATION ----
  
  // 使い方表示トグル
  const toggleGuide = document.querySelector('.toggle-guide');
  const guideContent = document.querySelector('.guide-content');
  
  if (toggleGuide && guideContent) {
    toggleGuide.addEventListener('click', function() {
      guideContent.style.display = guideContent.style.display === 'none' ? 'block' : 'none';
      this.classList.toggle('active');
      
      // テキストを切り替え
      const heading = this.querySelector('h3');
      if (heading) {
        if (guideContent.style.display === 'block') {
          heading.textContent = '使い方を隠す';
        } else {
          heading.textContent = '使い方を表示';
        }
      }
    });
  } else {
    console.error('使い方表示/非表示の要素が見つかりません');
  }
  
  // ---- BEGIN MODIFICATION: XSS sanitization utility ----
  function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
  // ---- END MODIFICATION ----

  // LLM実行
  function runLLM() {
    // ---- BEGIN MODIFICATION: Rate limiting ----
    const now = Date.now();
    if (now - lastRunTime < RUN_COOLDOWN_MS) {
      alert(`連続実行を防ぐため、${Math.ceil((RUN_COOLDOWN_MS - (now - lastRunTime)) / 1000)}秒お待ちください。`);
      return;
    }
    lastRunTime = now;
    // ---- END MODIFICATION ----
    const input = inputArea.value.trim();
    if (!input) {
      alert('テキストを入力してください');
      return;
    }
    
    // ---- BEGIN MODIFICATION: Language check for proofreading modes ----
    if (currentMode === 'jajarev') {
      if (!containsJapaneseChars(input)) {
        loadingIndicator.classList.remove('active'); // Ensure loading is off
        finalOutput.value = ''; 
        if (containsLatinChars(input)) {
          reviewOutput.innerHTML = `<div class='error'>入力されたテキストには日本語の文字が含まれていないようです。英語のようなラテン文字ベースのテキストが検出されました。<br>日本語校閲モードでは日本語のテキストを入力してください。英語の校閲が必要な場合は、英語校閲モードに切り替えてください。</div>`;
        } else {
          reviewOutput.innerHTML = `<div class='error'>入力されたテキストに日本語の文字が見当たりません。日本語校閲モードでは、日本語のテキストを入力してください。</div>`;
        }
        return;
      }
    } else if (currentMode === 'enrev') {
      if (containsJapaneseChars(input)) {
        loadingIndicator.classList.remove('active'); // Ensure loading is off
        finalOutput.value = '';
        reviewOutput.innerHTML = `<div class='error'>入力されたテキストに日本語の文字が含まれています。<br>英語校閲モードでは、主に英語のテキストを対象としています。日本語の校閲が必要な場合は、日本語校閲モードをご利用ください。</div>`;
        return;
      }
    }
    // ---- END MODIFICATION ----
    
    // UI更新
    loadingIndicator.classList.add('active');
    finalOutput.value = '';
    reviewOutput.innerHTML = '';
    
    // モードに応じたプロンプト作成
    const messages = createMessages(currentMode, input);
    
    // APIリクエスト（非ストリーミングモードを使用）
    // ストリーミングモードで問題が続いているため、一旦非ストリーミングモードに切り替え
    fallbackNonStreamingAPI(messages);
  }
  
  // モードごとのメッセージ作成
  function createMessages(mode, input) {
    const messagesMap = {
      'jaen': [
        { role: "system", content: "あなたは翻訳エンジンです。日本語テキストを英語に翻訳するだけです。挨拶や説明、コメントは一切含めないでください。入力テキストの英訳だけを返してください。必ず文章全体を完全に翻訳し、途中で切れないようにしてください。思考過程や翻訳に関する考察は絶対に出力しないでください。" },
        { role: "user", content: `以下の日本語文を英語に翻訳してください。必ず全体を完全に翻訳し、途中で切れないように注意してください：\n\n『${input}』` }
      ],
      'enja': [
        { role: "system", content: "あなたは翻訳エンジンです。英語テキストを日本語に翻訳するだけです。挨拶や説明、コメントは一切含めないでください。入力テキストの日本語訳だけを返してください。必ず完全な文章全体を翻訳してください。部分訳や省略は行わないでください。思考過程や翻訳に関する考察は絶対に出力しないでください。" },
        { role: "user", content: `以下の英文を日本語に翻訳してください。必ず全体を完全に翻訳し、部分的な訳は避けてください：\n\n『${input}』` }
      ],
      'jajarev': [
        { role: "system", content: "あなたは日本語校閲エンジンです。入力された日本語文を詳細に校閲し、3つの部分に分けて出力してください。\n\n1. まず「校閲結果:」で始まる校閲コメントを書いてください。以下の点を詳しく解説してください：\n- 文法・表現の誤りや改善点\n- 語彙の選択や言い回しの提案\n- 文章構造や論理展開の改善点\n- 読みやすさや自然さの向上のためのアドバイス\n\n2. 次に「変更箇所:」で始まるセクションに、元の文章から変更した箇所を以下の形式で示してください：\n```diff\n- 削除された文や単語\n+ 追加または変更された文や単語\n```\n特に重要な変更箇所を3〜5か所程度ピックアップしてください。\n\n3. 最後に「最終案:」で始まる改善された文章全体を提示してください。\n\n文章の種類や内容に応じて適切な校閲を行い、具体的な改善理由も示してください。自己紹介や余計な説明は含めないでください。" },
        { role: "user", content: input }
      ],
      'enrev': [
        { role: "system", content: "あなたは英語校閲エンジンです。入力された英語文を詳細に校閲し、3つの部分に分けて出力してください。\n\n1. まず「校閲結果:」で始まる日本語での校閲コメントを書いてください。以下の点を詳しく解説してください：\n- 文法・表現の誤りや改善点\n- 語彙の選択や言い回しの提案\n- 文章構造や論理展開の改善点\n- 英語表現としての自然さや適切さの向上のためのアドバイス\n\n2. 次に「変更箇所:」で始まるセクションに、元の文章から変更した箇所を以下の形式で示してください：\n```diff\n- 削除された文や単語（原文）\n+ 追加または変更された文や単語（修正後）\n```\n特に重要な変更箇所を3〜5か所程度ピックアップしてください。\n\n3. 最後に「最終案:」で始まる改善された英語文全体を提示してください。\n\n文章の種類や内容に応じて適切な校閲を行い、なぜその修正が必要なのかも日本語で分かりやすく説明してください。自己紹介や余計な説明は含めないでください。" },
        { role: "user", content: input }
      ]
    };
    
    return messagesMap[mode] || messagesMap['jaen'];
  }
  
  // 余計な説明テキストを除去する関数
  function cleanResponse(text, mode) {
    console.log("入力テキスト(元):", text);
    console.log("モード:", mode);

    if (mode === 'jaen' || mode === 'enja') {
      let cleaned = text;
      console.log("引用符チェック前:", cleaned);

      // Remove surrounding quotes
      if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        console.log("ダブルクォート検出");
        cleaned = cleaned.substring(1, cleaned.length - 1);
      } else if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
        console.log("シングルクォート検出");
        cleaned = cleaned.substring(1, cleaned.length - 1);
      } else if (cleaned.startsWith('「') && cleaned.endsWith('」')) {
        console.log("鉤括弧検出");
        cleaned = cleaned.substring(1, cleaned.length - 1);
      } else if (cleaned.startsWith('『') && cleaned.endsWith('』')) {
        console.log("二重鉤括弧検出");
        cleaned = cleaned.substring(1, cleaned.length - 1);
      }
      console.log("引用符除去後:", cleaned);

      // Remove common prefixes
      const exactPrefixes = [
        "Translation: ",
        "Translated text: ",
        "翻訳結果: ",
        "翻訳: ",
        "訳文: ",
        "英訳: ",
        "和訳: "
      ];

      for (const prefix of exactPrefixes) {
        if (cleaned.startsWith(prefix)) {
          cleaned = cleaned.substring(prefix.length);
          console.log(`プレフィックス "${prefix}" を除去`);
          break; // Stop after removing the first found prefix
        }
      }
      
      console.log("最終クリーニング結果:", cleaned);
      return cleaned.trim();
    }

    return text; // For non-translation modes, return as is
  }
  
  // ---- BEGIN MODIFICATION: Error handling with AbortController, retry, exponential backoff ----
  // エラー発生時のフォールバックモード（リトライ・タイムアウト対応）
  async function fallbackNonStreamingAPI(messages, retryCount = 0, maxRetries = 2) {
    // 非ストリーミングモードでのAPIリクエスト
    console.log("非ストリーミングモードでAPIリクエスト送信", messages, `リトライ: ${retryCount}/${maxRetries}`);
    
    const apiUrl = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
    const requestData = {
      model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
      temperature: 0.7,
      stream: false,
      max_completion_tokens: 1500,  // トークン上限を増やして長文対応
      messages: messages
    };
    
    // AbortControllerの設定（30秒タイムアウト）
    const abortController = new AbortController();
    currentAbortController = abortController;
    const timeoutId = setTimeout(() => abortController.abort(), 30000);
    
    // ローディングテキストを更新
    const loadingTextEl = loadingIndicator.querySelector('.loading-text');
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData),
        signal: abortController.signal
      });
      
      const data = await response.json();
      loadingIndicator.classList.remove('active');
      
      console.log("非ストリーミングAPIレスポンス:", data);
      
      let text = null;
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        text = data.choices[0].message.content;
        console.log("LLMレスポンス:", text);
      } else if (data.answer) {
        text = data.answer;
        console.log("LLMレスポンス(answer):", text);
      } else {
        throw new Error('レスポンスに期待されるフィールドがありません');
      }
      
      // 余計な説明文が含まれていないか確認して処理
      const cleanedResponse = cleanResponse(text, currentMode);
      console.log("クリーニング後:", cleanedResponse);
      
      if (currentMode === 'jajarev' || currentMode === 'enrev') {
        processReviewOutput(cleanedResponse);
      } else {
        // 翻訳結果の欠落チェック
        if (currentMode === 'enja' && isPossiblyTruncatedResponse(cleanedResponse)) {
          finalOutput.value = cleanedResponse;
          reviewOutput.innerHTML = `<div class="warning">⚠️ 翻訳の先頭部分が欠落している可能性があります。翻訳全体を確認してください。</div>`;
        } else if (currentMode === 'jaen' && isPossiblyTruncatedEnglishResponse(cleanedResponse)) {
          finalOutput.value = cleanedResponse;
          reviewOutput.innerHTML = `<div class="warning">⚠️ 英語翻訳が不完全である可能性があります。翻訳全体を確認してください。</div>`;
        } else {
          finalOutput.value = cleanedResponse;
        }
      }
      
      // 履歴に保存（成功時）
      saveToHistory(currentMode, inputArea.value.trim(), finalOutput.value, reviewOutput.innerHTML);
      
    } catch (error) {
      console.error('非ストリーミングAPI呼び出しエラー:', error);
      
      if (error.name === 'AbortError') {
        // タイムアウトまたはユーザーによるキャンセル
        const isUserCancelled = !timeoutId; // タイムアウトが既にクリアされていれば手動キャンセル
        if (retryCount < maxRetries) {
          // リトライ
          if (loadingTextEl) loadingTextEl.textContent = `再試行中 (${retryCount + 1}/${maxRetries})`;
          const backoffMs = 1000 * Math.pow(2, retryCount);
          console.log(`タイムアウト、${backoffMs}ms後に再試行...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          if (loadingTextEl) loadingTextEl.textContent = '処理中';
          return fallbackNonStreamingAPI(messages, retryCount + 1, maxRetries);
        } else {
          loadingIndicator.classList.remove('active');
          reviewOutput.innerHTML = `<div class="error">リクエストがタイムアウトしました。${maxRetries}回再試行しましたが失敗しました。ネットワーク接続を確認し、再度お試しください。</div>`;
        }
      } else if (retryCount < maxRetries) {
        // その他のエラーでもリトライ
        if (loadingTextEl) loadingTextEl.textContent = `再試行中 (${retryCount + 1}/${maxRetries})`;
        const backoffMs = 1000 * Math.pow(2, retryCount);
        console.log(`エラー発生、${backoffMs}ms後に再試行...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        if (loadingTextEl) loadingTextEl.textContent = '処理中';
        return fallbackNonStreamingAPI(messages, retryCount + 1, maxRetries);
      } else {
        loadingIndicator.classList.remove('active');
        reviewOutput.innerHTML = `<div class="error">エラーが発生しました: ${sanitizeHTML(error.message)}<br>${maxRetries}回再試行しましたが失敗しました。</div>`;
      }
    } finally {
      clearTimeout(timeoutId);
      if (loadingTextEl) loadingTextEl.textContent = '処理中';
      currentAbortController = null;
    }
  }
  // ---- END MODIFICATION ----
  
  // 翻訳が先頭欠落している可能性を判定する関数
  function isPossiblyTruncatedResponse(text) {
    // 日本語の文が「が」「は」「を」「に」「で」「と」から始まっていたら、
    // 先頭が欠落している可能性が高いと判定
    const truncationIndicators = /^[がはをにでと]/;
    
    if (truncationIndicators.test(text)) {
      console.log('翻訳の先頭欠落を検出:', text);
      return true;
    }
    
    // 先頭が小文字から始まる場合も怪しい
    if (/^[a-z]/.test(text)) {
      console.log('翻訳の先頭欠落の可能性あり (小文字から始まる):', text);
      return true;
    }
    
    return false;
  }
  
  // 英語翻訳結果が不完全である可能性を判定する関数
  function isPossiblyTruncatedEnglishResponse(text) {
    // 文章が途中で終わっている可能性のあるパターン
    if (text.endsWith(',') || text.endsWith(';') || 
        /[a-z]$/.test(text) || // 小文字で終わる
        /[^\.\?\!]$/.test(text)) { // 句読点なしで終わる
      console.log('英語翻訳の末尾欠落を検出:', text);
      return true;
    }
    
    // 単語数と文字数の比率が異常に小さい場合（短い単語が多すぎる）
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const chars = text.replace(/\s+/g, '').length;
    if (words.length > 5 && chars / words.length < 3) {
      console.log('英語翻訳の異常を検出 (単語/文字比率):', text);
      return true;
    }
    
    return false;
  }
  
  // 校閲結果の処理
  function processReviewOutput(text) {
    // ---- BEGIN MODIFICATION: XSS sanitization of raw LLM text ----
    // sanitize the full text before processing to prevent XSS
    text = sanitizeHTML(text);
    // ---- END MODIFICATION ----
    // 新しいパターン：校閲結果、変更箇所、最終案の3つのセクションを抽出
    const reviewPattern = /校閲結果[:：]([\s\S]+?)(変更箇所[:：]([\s\S]+?))?最終案[:：]([\s\S]+)/i;
    const match = text.match(reviewPattern);
    
    if (match) {
      // 校閲結果の抽出と構造化
      let reviewText = match[1].trim();
      
      // 数字リストのフォーマット強化（1. 2. 3.など）
      reviewText = reviewText.replace(/(\d+)\.\s+/g, '<strong>$1.</strong> ');
      
      // カテゴリ見出しのフォーマット強化（「文法：」「語彙：」など）
      reviewText = reviewText.replace(/(文法|語彙|表現|構文|読みやすさ|論理展開|構造|自然さ|その他)(の問題|について|に関して)?[:：]/g, '<h4>$1</h4>');
      
      // 改行を段落に変換
      reviewText = '<p>' + reviewText.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>') + '</p>';
      
      // 重要な単語を強調
      reviewText = reviewText.replace(/(問題点|誤り|改善点|推奨|提案|修正|不自然|適切でない)/g, '<strong>$1</strong>');
      
      // 変更箇所の処理（あれば）
      let diffHtml = '';
      if (match[3]) {
        diffHtml = '<h4>変更箇所ハイライト</h4>';
        
        // diff形式の処理
        const diffLines = match[3].trim().split('\n');
        let inDiffBlock = false;
        
        diffLines.forEach(line => {
          // diffブロックの開始と終了を検出
          if (line.trim() === '```diff') {
            inDiffBlock = true;
            return;
          } else if (line.trim() === '```' && inDiffBlock) {
            inDiffBlock = false;
            return;
          }
          
          // diffブロック内の行を処理
          if (inDiffBlock) {
            if (line.startsWith('-')) {
              // 削除された行（テキストは既にsanitizeHTML済みだが念のため）
              const lineContent = line.substring(1).trim();
              diffHtml += `<div class="diff-removed">${lineContent}</div>`;
            } else if (line.startsWith('+')) {
              // 追加された行
              const lineContent = line.substring(1).trim();
              diffHtml += `<div class="diff-added">${lineContent}</div>`;
            } else if (line.trim()) {
              // コンテキスト行（内容があれば表示）
              diffHtml += `<div>${line.trim()}</div>`;
            }
          } else if (line.trim()) {
            // diffブロック外の説明文
            diffHtml += `<p>${line.trim()}</p>`;
          }
        });
      }
      
      // 最終案
      let determinedFinalText = match[4] ? match[4].trim() : '';
      if (currentMode === 'enrev' && determinedFinalText) {
        const lines = determinedFinalText.split('\n');
        const englishPortion = [];
        for (const line of lines) {
          if (containsJapaneseChars(line) && !containsLatinChars(line)) {
            break; // Likely a purely Japanese explanatory line
          }
          englishPortion.push(line);
        }
        determinedFinalText = englishPortion.join('\n').trim();
      }
      
      // 最終的な表示内容を構築
      reviewOutput.innerHTML = reviewText + (diffHtml ? '<hr>' + diffHtml : '');
      finalOutput.value = determinedFinalText;
    } else {
      // 旧パターンとのフォールバック互換性（2セクション版）
      const oldPattern = /校閲結果[:：]([\s\S]+?)最終案[:：]([\s\S]+)/i;
      const oldMatch = text.match(oldPattern);
      
      if (oldMatch) {
        // 旧パターンで処理
        let reviewText = oldMatch[1].trim();
        reviewText = reviewText.replace(/(\d+)\.\s+/g, '<strong>$1.</strong> ');
        reviewText = reviewText.replace(/(文法|語彙|表現|構文|読みやすさ|論理展開|構造|自然さ|その他)(の問題|について|に関して)?[:：]/g, '<h4>$1</h4>');
        reviewText = '<p>' + reviewText.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>') + '</p>';
        reviewText = reviewText.replace(/(問題点|誤り|改善点|推奨|提案|修正|不自然|適切でない)/g, '<strong>$1</strong>');
        
        reviewOutput.innerHTML = reviewText;
        
        let determinedOldFinalText = oldMatch[2] ? oldMatch[2].trim() : '';
        if (currentMode === 'enrev' && determinedOldFinalText) {
          const lines = determinedOldFinalText.split('\n');
          const englishPortion = [];
          for (const line of lines) {
            if (containsJapaneseChars(line) && !containsLatinChars(line)) {
              break; 
            }
            englishPortion.push(line);
          }
          determinedOldFinalText = englishPortion.join('\n').trim();
        }
        finalOutput.value = determinedOldFinalText;
      } else {
        // どちらのパターンにも一致しない場合
        reviewOutput.innerHTML = '校閲結果が期待される形式で見つかりませんでした。最終案も表示できません。';
        finalOutput.value = ''; // Ensure finalOutput is empty if structure is not found
      }
    }
  }

  // ---- BEGIN MODIFICATION: Translation History with IndexedDB ----
  // モードラベルのマッピング
  const MODE_LABELS = {
    'jaen': '日本語→英語',
    'enja': '英語→日本語',
    'jajarev': '日本語校閲',
    'enrev': '英語校閲'
  };

  // IndexedDBを開く
  function openHistoryDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('translationHistory', 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('entries')) {
          const store = db.createObjectStore('entries', { keyPath: 'id', autoIncrement: true });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('mode', 'mode', { unique: false });
        }
      };
      
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      
      request.onerror = (event) => {
        console.error('IndexedDB オープンエラー:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  // 履歴に保存（最大50件）
  async function saveToHistory(mode, input, output, review) {
    if (!input || !output) return; // 空の場合は保存しない
    
    try {
      const db = await openHistoryDB();
      const tx = db.transaction('entries', 'readwrite');
      const store = tx.objectStore('entries');
      
      // 新しいエントリを追加
      const entry = {
        mode: mode,
        input: input,
        output: output,
        review: review || '',
        timestamp: Date.now()
      };
      
      await new Promise((resolve, reject) => {
        const req = store.add(entry);
        req.onsuccess = resolve;
        req.onerror = reject;
      });
      
      // 50件を超えたら古いものを削除
      const countReq = store.count();
      await new Promise((resolve, reject) => {
        countReq.onsuccess = async () => {
          const count = countReq.result;
          if (count > 50) {
            // タイムスタンプ昇順で全件取得し、古いものから削除
            const index = store.index('timestamp');
            const cursorReq = index.openCursor(null, 'next');
            let deleted = 0;
            const toDelete = count - 50;
            
            cursorReq.onsuccess = (event) => {
              const cursor = event.target.result;
              if (cursor && deleted < toDelete) {
                cursor.delete();
                deleted++;
                cursor.continue();
              } else {
                resolve();
              }
            };
            cursorReq.onerror = reject;
          } else {
            resolve();
          }
        };
        countReq.onerror = reject;
      });
      
      console.log('履歴に保存しました:', mode);
    } catch (err) {
      console.error('履歴保存エラー:', err);
    }
  }

  // 履歴を読み込んで表示
  async function loadHistory() {
    try {
      const db = await openHistoryDB();
      const tx = db.transaction('entries', 'readonly');
      const store = tx.objectStore('entries');
      const index = store.index('timestamp');
      
      const entries = await new Promise((resolve, reject) => {
        const req = index.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = reject;
      });
      
      // タイムスタンプ降順にソート（新しい順）
      entries.sort((a, b) => b.timestamp - a.timestamp);
      
      if (entries.length === 0) {
        historyList.innerHTML = '<div class="history-empty">履歴はありません</div>';
        return;
      }
      
      // 履歴リストを構築
      historyList.innerHTML = '';
      entries.forEach(entry => {
        const date = new Date(entry.timestamp);
        const timeStr = date.toLocaleString('ja-JP', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit'
        });
        const modeLabel = MODE_LABELS[entry.mode] || entry.mode;
        const inputPreview = entry.input ? entry.input.substring(0, 60) + (entry.input.length > 60 ? '...' : '') : '';
        const outputPreview = entry.output ? entry.output.substring(0, 60) + (entry.output.length > 60 ? '...' : '') : '';
        
        const item = document.createElement('div');
        item.className = 'history-item';
        item.dataset.id = entry.id;
        item.innerHTML = `
          <div class="history-item-mode">${sanitizeHTML(modeLabel)}</div>
          <div class="history-item-time">${sanitizeHTML(timeStr)}</div>
          <div class="history-item-preview">${sanitizeHTML(inputPreview)}</div>
          <div class="history-item-output">${sanitizeHTML(outputPreview)}</div>
          <div class="history-item-actions">
            <button class="history-use-btn" data-id="${entry.id}" data-mode="${sanitizeHTML(entry.mode)}" data-input="${encodeURIComponent(entry.input)}" data-output="${encodeURIComponent(entry.output)}" data-review="${encodeURIComponent(entry.review || '')}">使用する</button>
            <button class="history-delete-btn" data-id="${entry.id}">削除</button>
          </div>
        `;
        historyList.appendChild(item);
      });
    } catch (err) {
      console.error('履歴読み込みエラー:', err);
      historyList.innerHTML = '<div class="history-empty">履歴の読み込みに失敗しました</div>';
    }
  }

  // 履歴エントリを削除
  async function deleteHistoryItem(id) {
    try {
      const db = await openHistoryDB();
      const tx = db.transaction('entries', 'readwrite');
      const store = tx.objectStore('entries');
      
      await new Promise((resolve, reject) => {
        const req = store.delete(id);
        req.onsuccess = resolve;
        req.onerror = reject;
      });
      
      console.log('履歴エントリを削除しました:', id);
    } catch (err) {
      console.error('履歴削除エラー:', err);
    }
  }

  // 履歴パネルの表示/非表示
  function showHistoryPanel() {
    historyPanel.style.display = 'flex';
    historyOverlay.style.display = 'block';
  }

  function hideHistoryPanel() {
    historyPanel.style.display = 'none';
    historyOverlay.style.display = 'none';
  }

  // 履歴ボタンのイベントリスナー
  historyBtn.addEventListener('click', () => {
    showHistoryPanel();
    loadHistory();
  });

  // 閉じるボタン
  historyCloseBtn.addEventListener('click', hideHistoryPanel);

  // オーバーレイクリックで閉じる
  historyOverlay.addEventListener('click', hideHistoryPanel);

  // 履歴リストのイベント委譲
  historyList.addEventListener('click', async (event) => {
    const target = event.target;
    
    if (target.classList.contains('history-use-btn')) {
      // 「使用する」ボタン
      const mode = target.dataset.mode;
      const input = decodeURIComponent(target.dataset.input || '');
      const output = decodeURIComponent(target.dataset.output || '');
      const review = decodeURIComponent(target.dataset.review || '');
      
      // 入力を復元
      inputArea.value = input;
      localStorage.setItem('inputText', input);
      finalOutput.value = output;
      reviewOutput.innerHTML = review;
      
      // モードを切り替え
      const targetTab = document.getElementById(`tab-${mode}`);
      if (targetTab) {
        switchTab(targetTab);
      }
      
      hideHistoryPanel();
      inputArea.focus();
      inputArea.scrollTop = 0;
    } else if (target.classList.contains('history-delete-btn')) {
      // 「削除」ボタン
      const id = parseInt(target.dataset.id, 10);
      await deleteHistoryItem(id);
      // 再読み込み
      await loadHistory();
    }
  });
  // ---- END MODIFICATION ----
}); 