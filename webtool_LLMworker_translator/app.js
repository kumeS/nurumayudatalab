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
  const toInputBtn = document.getElementById('toInputBtn');
  const loadingIndicator = document.getElementById('loadingIndicator');
  
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
  
  // LLM実行
  function runLLM() {
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
  
  // エラー発生時のフォールバックモード
  function fallbackNonStreamingAPI(messages) {
    // 非ストリーミングモードでのAPIリクエスト
    console.log("非ストリーミングモードでAPIリクエスト送信", messages);
    
    const apiUrl = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
    const requestData = {
      model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
      temperature: 0.7,
      stream: false,
      max_completion_tokens: 1500,  // トークン上限を増やして長文対応
      messages: messages
    };
    
    fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    })
    .then(response => response.json())
    .then(data => {
      loadingIndicator.classList.remove('active');
      
      console.log("非ストリーミングAPIレスポンス:", data);
      
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        const text = data.choices[0].message.content;
        console.log("LLMレスポンス:", text);
        
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
      } else if (data.answer) {
        const text = data.answer;
        console.log("LLMレスポンス(answer):", text);
        
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
      } else {
        throw new Error('レスポンスに期待されるフィールドがありません');
      }
    })
    .catch(error => {
      console.error('非ストリーミングAPI呼び出しエラー:', error);
      loadingIndicator.classList.remove('active');
      reviewOutput.innerHTML = `<div class="error">エラーが発生しました: ${error.message}</div>`;
    });
  }
  
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
              // 削除された行
              diffHtml += `<div class="diff-removed">${line.substring(1).trim()}</div>`;
            } else if (line.startsWith('+')) {
              // 追加された行
              diffHtml += `<div class="diff-added">${line.substring(1).trim()}</div>`;
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
}); 