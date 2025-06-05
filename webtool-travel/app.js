/**
 * ぬるっと旅行・冒険プランナー JavaScript
 * AI活用旅行企画ツール
 */
document.addEventListener('DOMContentLoaded', () => {
  // 要素の参照を取得
  const progressFill = document.getElementById('progressFill');
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const step3 = document.getElementById('step3');
  const step4 = document.getElementById('step4');
  const generateSection = document.getElementById('generateSection');
  const outputContainer = document.getElementById('outputContainer');
  const loadingIndicator = document.getElementById('loadingIndicator');
  
  const generateBtn = document.getElementById('generateBtn');
  const resetBtn = document.getElementById('resetBtn');
  const copyBtn = document.getElementById('copyBtn');
  const exportBtn = document.getElementById('exportBtn');
  const shareBtn = document.getElementById('shareBtn');
  
  const travelStory = document.getElementById('travelStory');
  const travelTips = document.getElementById('travelTips');
  
  // 選択状態を管理
  let selections = {
    purpose: '',
    companion: '',
    destination: '',
    budget: ''
  };
  
  let currentStep = 1;
  
  // 使い方表示トグル
  const toggleGuide = document.querySelector('.toggle-guide');
  const guideContent = document.querySelector('.guide-content');
  
  if (toggleGuide && guideContent) {
    toggleGuide.addEventListener('click', function() {
      guideContent.style.display = guideContent.style.display === 'none' ? 'block' : 'none';
      this.classList.toggle('active');
      
      const heading = this.querySelector('h3');
      if (heading) {
        if (guideContent.style.display === 'block') {
          heading.textContent = '使い方を隠す';
        } else {
          heading.textContent = '使い方を表示';
        }
      }
    });
  }
  
  // 選択肢のクリックイベントを設定
  function setupOptionCards() {
    // ステップ1: 旅の目的
    document.querySelectorAll('[data-purpose]').forEach(card => {
      card.addEventListener('click', () => {
        selectOption('purpose', card.dataset.purpose, card);
        nextStep();
      });
    });
    
    // ステップ2: 同行者
    document.querySelectorAll('[data-companion]').forEach(card => {
      card.addEventListener('click', () => {
        selectOption('companion', card.dataset.companion, card);
        nextStep();
      });
    });
    
    // ステップ3: 行き先
    document.querySelectorAll('[data-destination]').forEach(card => {
      card.addEventListener('click', () => {
        selectOption('destination', card.dataset.destination, card);
        nextStep();
      });
    });
    
    // ステップ4: 予算
    document.querySelectorAll('[data-budget]').forEach(card => {
      card.addEventListener('click', () => {
        selectOption('budget', card.dataset.budget, card);
        nextStep();
      });
    });
  }
  
  // 選択肢を選択
  function selectOption(category, value, element) {
    selections[category] = value;
    
    // 同じカテゴリの他の選択肢の選択を解除
    element.parentElement.querySelectorAll('.option-card').forEach(card => {
      card.classList.remove('selected');
    });
    
    // 選択された要素にselectedクラスを追加
    element.classList.add('selected');
    
    console.log('選択更新:', selections);
  }
  
  // 次のステップに進む
  function nextStep() {
    currentStep++;
    updateProgress();
    
    // 0.5秒後に次のステップを表示（アニメーション効果）
    setTimeout(() => {
      showCurrentStep();
    }, 500);
  }
  
  // プログレスバーを更新
  function updateProgress() {
    const progress = (currentStep - 1) * 25; // 4ステップなので25%ずつ
    progressFill.style.width = `${Math.min(progress, 100)}%`;
  }
  
  // 現在のステップを表示
  function showCurrentStep() {
    // すべてのステップを非表示
    [step1, step2, step3, step4, generateSection].forEach(element => {
      if (element) element.style.display = 'none';
    });
    
    // 現在のステップを表示
    switch(currentStep) {
      case 1:
        step1.style.display = 'block';
        break;
      case 2:
        step2.style.display = 'block';
        break;
      case 3:
        step3.style.display = 'block';
        break;
      case 4:
        step4.style.display = 'block';
        break;
      case 5:
        generateSection.style.display = 'block';
        break;
    }
  }
  
  // 旅行プラン生成
  function generateTravelPlan() {
    if (!validateSelections()) {
      alert('すべての選択肢を選んでください。');
      return;
    }
    
    // UI更新
    loadingIndicator.classList.add('active');
    generateBtn.disabled = true;
    outputContainer.style.display = 'none';
    travelStory.innerHTML = '';
    travelTips.innerHTML = '';
    
    // プロンプト作成
    const prompt = createTravelPrompt(selections);
    
    // API呼び出し
    callTravelAPI(prompt);
  }
  
  // 選択内容の検証
  function validateSelections() {
    return selections.purpose && selections.companion && 
           selections.destination && selections.budget;
  }
  
  // 旅行プランプロンプト作成
  function createTravelPrompt(selections) {
    const purposeMap = {
      healing: '癒し・リラックス系',
      adventure: '冒険・アクティブ系',
      gourmet: 'グルメ・食文化中心',
      culture: '歴史・文化探訪'
    };
    
    const companionMap = {
      solo: 'ひとり旅',
      couple: '恋人・パートナーとの旅',
      family: '家族旅行',
      friends: '友人・グループ旅行'
    };
    
    const destinationMap = {
      domestic: '日本国内',
      asia: 'アジア',
      europe: 'ヨーロッパ',
      other: 'その他の地域'
    };
    
    const budgetMap = {
      budget: 'エコノミー（節約型）',
      standard: 'スタンダード（一般的）',
      luxury: 'ラグジュアリー（贅沢型）',
      unlimited: 'プレミアム（最高級）'
    };
    
    return `あなたは旅行企画の専門家です。以下の条件に基づいて、魅力的な旅行プランを「ストーリー仕立て」で作成してください。

【旅行条件】
・旅の目的: ${purposeMap[selections.purpose]}
・同行者: ${companionMap[selections.companion]}
・行き先: ${destinationMap[selections.destination]}
・予算: ${budgetMap[selections.budget]}

【出力形式】
以下の2つのセクションに分けて出力してください：

**旅行ストーリー:**
物語仕立てで、出発から帰国まで2日間の旅程を詳しく描写してください。
- 具体的な場所名、アクティビティ、食事などを含む
- 旅行者の感情や体験を生き生きと表現
- 各条件に合った内容で構成
- 1000-1500文字程度

**旅のTips・豆知識:**
現地で役立つ情報を3-5個のポイントで提示してください。
- 観光客が見逃しがちな注意点
- おすすめの時期や時間帯
- 現地の習慣やマナー
- お得な情報や裏技
- 安全に関するアドバイス

各セクションの始まりには必ず「**旅行ストーリー:**」「**旅のTips・豆知識:**」という見出しを付けてください。`;
  }
  
  // Travel API呼び出し
  function callTravelAPI(prompt) {
    const apiUrl = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
    const requestData = {
      model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
      temperature: 0.8, // 創造性を高めるため少し高め
      stream: false,
      max_completion_tokens: 2000,
      messages: [
        { role: "system", content: "あなたは創造的で知識豊富な旅行企画の専門家です。ユーザーの条件に基づいて、魅力的で実用的な旅行プランを作成してください。" },
        { role: "user", content: prompt }
      ]
    };
    
    console.log('API リクエスト送信:', requestData);
    
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
      generateBtn.disabled = false;
      
      console.log("API レスポンス:", data);
      
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        const content = data.choices[0].message.content;
        processTravelResponse(content);
      } else if (data.answer) {
        processTravelResponse(data.answer);
      } else {
        throw new Error('予期しないレスポンス形式です');
      }
    })
    .catch(error => {
      console.error('API呼び出しエラー:', error);
      loadingIndicator.classList.remove('active');
      generateBtn.disabled = false;
      
      // エラー時のフォールバック表示
      showErrorMessage(error.message);
    });
  }
  
  // レスポンス処理
  function processTravelResponse(content) {
    console.log('受信したコンテンツ:', content);
    
    // ストーリーとTipsを分離
    const storyMatch = content.match(/\*\*旅行ストーリー:\*\*([\s\S]*?)(?=\*\*旅のTips|$)/i);
    const tipsMatch = content.match(/\*\*旅のTips[・・]豆知識:\*\*([\s\S]*?)$/i);
    
    let storyText = '';
    let tipsText = '';
    
    if (storyMatch && storyMatch[1]) {
      storyText = storyMatch[1].trim();
    }
    
    if (tipsMatch && tipsMatch[1]) {
      tipsText = tipsMatch[1].trim();
    }
    
    // フォールバック: 分離できない場合は全体をストーリーとして表示
    if (!storyText && !tipsText) {
      storyText = content;
      tipsText = '詳細な旅のTipsについては、具体的な行き先が決まったら改めて検索することをおすすめします。';
    }
    
    // 結果を表示
    displayTravelPlan(storyText, tipsText);
  }
  
  // 旅行プラン表示
  function displayTravelPlan(story, tips) {
    // ストーリーの表示（改行を段落に変換）
    const formattedStory = story.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
    travelStory.innerHTML = `<p>${formattedStory}</p>`;
    
    // Tipsの表示（リスト形式に整形）
    const formattedTips = formatTipsText(tips);
    travelTips.innerHTML = formattedTips;
    
    // 結果エリアを表示
    outputContainer.style.display = 'block';
    
    // スムーズにスクロール
    outputContainer.scrollIntoView({ behavior: 'smooth' });
  }
  
  // Tips テキストのフォーマット
  function formatTipsText(tips) {
    // 番号リストやポイントを検出してリスト形式に変換
    let formatted = tips;
    
    // 数字による箇条書きを<li>に変換
    formatted = formatted.replace(/(\d+)\.\s*([^\n]+)/g, '<li><strong>$2</strong></li>');
    
    // ・や-による箇条書きを<li>に変換
    formatted = formatted.replace(/[・\-]\s*([^\n]+)/g, '<li>$1</li>');
    
    // <li>タグがある場合は<ul>で囲む
    if (formatted.includes('<li>')) {
      formatted = '<ul>' + formatted + '</ul>';
    } else {
      // リスト形式でない場合は段落として表示
      formatted = '<p>' + formatted.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>') + '</p>';
    }
    
    return formatted;
  }
  
  // エラーメッセージ表示
  function showErrorMessage(error) {
    const errorHtml = `
      <div class="error">
        <h4>エラーが発生しました</h4>
        <p>旅行プランの生成中にエラーが発生しました: ${error}</p>
        <p>しばらく待ってから再度お試しください。</p>
      </div>
    `;
    
    travelStory.innerHTML = errorHtml;
    travelTips.innerHTML = '';
    outputContainer.style.display = 'block';
  }
  
  // コピー機能
  function copyTravelPlan() {
    const storyText = travelStory.textContent || travelStory.innerText;
    const tipsText = travelTips.textContent || travelTips.innerText;
    
    const fullText = `=== あなたの旅行ストーリー ===\n\n${storyText}\n\n=== 旅のTips・豆知識 ===\n\n${tipsText}`;
    
    navigator.clipboard.writeText(fullText).then(() => {
      // コピー成功表示
      copyBtn.classList.add('copy-success');
      copyBtn.innerHTML = '<i class="fas fa-check"></i> コピー完了！';
      
      setTimeout(() => {
        copyBtn.classList.remove('copy-success');
        copyBtn.innerHTML = '<i class="fas fa-copy"></i> ストーリーをコピー';
      }, 2000);
    }).catch(err => {
      console.error('コピーエラー:', err);
      alert('コピーに失敗しました。');
    });
  }
  
  // PDF出力機能（将来の実装用）
  function exportToPDF() {
    alert('PDF出力機能は今後のアップデートで実装予定です。現在はコピー機能をご利用ください。');
  }
  
  // シェア機能
  function shareTravel() {
    if (navigator.share) {
      const storyText = travelStory.textContent || travelStory.innerText;
      navigator.share({
        title: 'AI旅行プランナーで作成した旅行プラン',
        text: storyText.substring(0, 100) + '...',
        url: window.location.href
      });
    } else {
      // Web Share API非対応の場合
      alert('シェア機能はお使いのブラウザでは対応していません。コピー機能をご利用ください。');
    }
  }
  
  // リセット機能
  function resetPlanner() {
    // 選択状態をリセット
    selections = {
      purpose: '',
      companion: '',
      destination: '',
      budget: ''
    };
    
    currentStep = 1;
    
    // 選択状態のクリア
    document.querySelectorAll('.option-card').forEach(card => {
      card.classList.remove('selected');
    });
    
    // UIリセット
    progressFill.style.width = '0%';
    outputContainer.style.display = 'none';
    loadingIndicator.classList.remove('active');
    generateBtn.disabled = false;
    
    // ステップ1に戻る
    showCurrentStep();
    
    // ページトップにスクロール
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  
  // イベントリスナーの設定
  setupOptionCards();
  
  generateBtn.addEventListener('click', generateTravelPlan);
  resetBtn.addEventListener('click', resetPlanner);
  copyBtn.addEventListener('click', copyTravelPlan);
  exportBtn.addEventListener('click', exportToPDF);
  shareBtn.addEventListener('click', shareTravel);
  
  // 初期化
  updateProgress();
  showCurrentStep();
  
  console.log('旅行・冒険プランナー初期化完了');
});