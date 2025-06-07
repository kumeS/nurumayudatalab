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
  const generateImageBtn = document.getElementById('generateImageBtn');
  
  const travelStory = document.getElementById('travelStory');
  const travelTips = document.getElementById('travelTips');
  const travelImages = document.getElementById('travelImages');
  
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
    
    // 選択アニメーション
    element.classList.add('selecting');
    
    // 同じカテゴリの他の選択肢の選択を解除
    element.parentElement.querySelectorAll('.option-card').forEach(card => {
      card.classList.remove('selected');
    });
    
    // 選択された要素にselectedクラスを追加
    setTimeout(() => {
      element.classList.remove('selecting');
      element.classList.add('selected');
    }, 300);
    
    // ローカルストレージに保存
    saveSelections();
    
    console.log('選択更新:', selections);
  }
  
  // 選択状態を保存
  function saveSelections() {
    try {
      localStorage.setItem('travelPlannerSelections', JSON.stringify({
        selections: selections,
        currentStep: currentStep,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('選択状態の保存に失敗:', error);
    }
  }
  
  // 選択状態を復元
  function loadSelections() {
    try {
      const saved = localStorage.getItem('travelPlannerSelections');
      if (!saved) return false;
      
      const data = JSON.parse(saved);
      const daysPassed = (Date.now() - data.timestamp) / (1000 * 60 * 60 * 24);
      
      // 7日以上経過していれば削除
      if (daysPassed > 7) {
        localStorage.removeItem('travelPlannerSelections');
        return false;
      }
      
      selections = data.selections || selections;
      currentStep = data.currentStep || currentStep;
      
      // UIに選択状態を反映
      restoreSelectionUI();
      
      return true;
    } catch (error) {
      console.warn('選択状態の復元に失敗:', error);
      return false;
    }
  }
  
  // 選択状態をUIに反映
  function restoreSelectionUI() {
    Object.entries(selections).forEach(([category, value]) => {
      if (value) {
        const card = document.querySelector(`[data-${category}="${value}"]`);
        if (card) {
          card.classList.add('selected');
        }
      }
    });
    
    updateProgress();
    showCurrentStep();
  }
  
  // 次のステップに進む
  function nextStep() {
    currentStep++;
    updateProgress();
    saveSelections(); // ステップ進行時も保存
    
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
    // 現在表示されているステップをフェードアウト
    [step1, step2, step3, step4, generateSection].forEach(element => {
      if (element && element.style.display !== 'none') {
        element.classList.add('hide');
        setTimeout(() => {
          element.style.display = 'none';
          element.classList.remove('hide');
        }, 300);
      }
    });
    
    // 少し遅延してから新しいステップを表示
    setTimeout(() => {
      let targetElement;
      
      // 現在のステップを特定
      switch(currentStep) {
        case 1:
          targetElement = step1;
          break;
        case 2:
          targetElement = step2;
          break;
        case 3:
          targetElement = step3;
          break;
        case 4:
          targetElement = step4;
          break;
        case 5:
          targetElement = generateSection;
          break;
      }
      
      if (targetElement) {
        targetElement.style.display = 'block';
        setTimeout(() => {
          targetElement.classList.add('show');
        }, 50);
      }
    }, 300);
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
      temperature: 0.8,
      stream: false,
      max_completion_tokens: 2000,
      messages: [
        { role: "system", content: "あなたは創造的で知識豊富な旅行企画の専門家です。ユーザーの条件に基づいて、魅力的で実用的な旅行プランを作成してください。" },
        { role: "user", content: prompt }
      ]
    };
    
    console.log('API リクエスト送信:', requestData);
    
    // タイムアウト設定
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('リクエストがタイムアウトしました')), 30000)
    );
    
    Promise.race([
      fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      }),
      timeoutPromise
    ])
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTPエラー: ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      loadingIndicator.classList.remove('active');
      generateBtn.disabled = false;
      
      console.log("API レスポンス:", data);
      
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        const content = data.choices[0].message.content;
        processTravelResponse(content);
      } else if (data.answer) {
        processTravelResponse(data.answer);
      } else if (data.error) {
        throw new Error(`APIエラー: ${data.error}`);
      } else {
        throw new Error('予期しないレスポンス形式です');
      }
    })
    .catch(error => {
      console.error('API呼び出しエラー:', error);
      loadingIndicator.classList.remove('active');
      generateBtn.disabled = false;
      
      // ネットワークエラーの場合はフォールバック表示
      if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
        showFallbackContent();
      } else {
        showErrorMessage(error.message);
      }
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
    // 結果エリアを表示
    outputContainer.style.display = 'block';
    
    // タイピングアニメーションでストーリーを表示
    typewriterEffect(travelStory, story, () => {
      // ストーリー表示完了後にTipsを表示
      setTimeout(() => {
        const formattedTips = formatTipsText(tips);
        travelTips.innerHTML = formattedTips;
        
        // Tipsにフェードインアニメーション
        travelTips.style.opacity = '0';
        travelTips.style.transform = 'translateY(20px)';
        setTimeout(() => {
          travelTips.style.transition = 'all 0.5s ease';
          travelTips.style.opacity = '1';
          travelTips.style.transform = 'translateY(0)';
        }, 100);
      }, 500);
    });
    
    // 自動的に画像生成を開始
    setTimeout(() => {
      generateTravelImages();
    }, 2000);
    
    // スムーズにスクロール
    outputContainer.scrollIntoView({ behavior: 'smooth' });
  }
  
  // タイピングエフェクト
  function typewriterEffect(element, text, callback) {
    element.innerHTML = '';
    
    // HTMLタグを除去してプレーンテキスト化
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    let currentIndex = 0;
    let typingInterval;
    
    function typeNextChar() {
      if (currentIndex >= plainText.length) {
        // タイピング完了後、最終的なフォーマットを適用
        const formattedText = text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
        element.innerHTML = `<p>${formattedText}</p>`;
        clearInterval(typingInterval);
        if (callback) callback();
        return;
      }
      
      const currentText = plainText.substring(0, currentIndex + 1);
      // XSS対策: textContentを使用
      const displayElement = document.createElement('p');
      displayElement.textContent = currentText;
      displayElement.innerHTML += '<span class="typing-cursor">|</span>';
      element.innerHTML = displayElement.outerHTML;
      
      currentIndex++;
    }
    
    // setIntervalを使用してメモリリークを防止
    typingInterval = setInterval(typeNextChar, 30);
    
    // 長すぎる場合はスキップ機能を追加
    if (plainText.length > 1000) {
      element.addEventListener('click', function skipTyping() {
        clearInterval(typingInterval);
        const formattedText = text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
        element.innerHTML = `<p>${formattedText}</p>`;
        element.removeEventListener('click', skipTyping);
        if (callback) callback();
      }, { once: true });
      
      // スキップヒントを表示
      const skipHint = document.createElement('div');
      skipHint.className = 'skip-hint';
      skipHint.textContent = 'クリックでスキップ';
      skipHint.style.cssText = 'position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; cursor: pointer;';
      element.style.position = 'relative';
      element.appendChild(skipHint);
    }
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
        <button class="button" onclick="generateTravelPlan()" style="margin-top: 1rem;">
          <i class="fas fa-redo"></i> 再試行
        </button>
      </div>
    `;
    
    travelStory.innerHTML = errorHtml;
    travelTips.innerHTML = '';
    outputContainer.style.display = 'block';
  }
  
  // フォールバックコンテンツ表示
  function showFallbackContent() {
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
    
    const fallbackStory = generateFallbackStory(selections);
    const fallbackTips = generateFallbackTips(selections);
    
    displayTravelPlan(fallbackStory, fallbackTips);
    
    // フォールバック表示の警告
    const warningHtml = `
      <div class="warning" style="margin-bottom: 1rem;">
        <i class="fas fa-exclamation-triangle"></i>
        ネットワークエラーのため、基本的な旅行プランを表示しています。詳細なプランをご希望の場合は、ネットワーク接続を確認して再度お試しください。
      </div>
    `;
    
    travelStory.insertAdjacentHTML('afterbegin', warningHtml);
  }
  
  // フォールバック旅行ストーリー生成
  function generateFallbackStory(selections) {
    const templates = {
      healing: {
        domestic: '静寂に包まれた温泉地で、日常の喧騒を忘れる贅沢な時間を過ごします。露天風呂から眺める四季折々の風景は、心を穏やかにしてくれるでしょう。',
        asia: 'アジアの癒しスポットで、伝統的なスパやマッサージを体験。異国の地で心身ともにリフレッシュする特別な旅になります。',
        europe: 'ヨーロッパの美しい田園地帯で、ゆったりとした時間を過ごします。歴史ある温泉地や自然豊かなリゾートで、日頃の疲れを癒やしましょう。',
        other: '世界の癒しスポットで、その土地ならではのリラクゼーションを体験。美しい自然と共に過ごす、忘れられない癒しの旅です。'
      },
      adventure: {
        domestic: '日本の大自然を舞台に、スリリングなアクティビティを楽しみます。山登りや川遊び、地域ならではのアドベンチャーが待っています。',
        asia: 'アジアの大自然で冒険の旅！トレッキングやラフティング、現地ガイドと共に新たな発見に満ちた体験をお楽しみください。',
        europe: 'ヨーロッパの壮大な自然でアクティブな体験を。アルプスの山々やフィヨルドなど、息をのむような景色の中での冒険が待っています。',
        other: '世界各地のユニークなアドベンチャーを体験。その土地ならではの自然環境で、スリリングで忘れられない冒険の旅を楽しみましょう。'
      },
      gourmet: {
        domestic: '日本各地の名物料理を堪能する美食の旅。地元の食材を活かした伝統料理から、革新的な創作料理まで、味覚の冒険をお楽しみください。',
        asia: 'アジアの多彩な食文化を体験する美食巡り。屋台料理から高級レストランまで、本場の味を存分に楽しむ旅です。',
        europe: 'ヨーロッパの伝統的な美食文化を堪能。ワインやチーズ、地方料理など、長い歴史に培われた味の世界を探求します。',
        other: '世界各地の独特な食文化を体験。その土地ならではの調理法や食材で作られる、驚きと感動の美食体験が待っています。'
      },
      culture: {
        domestic: '日本の歴史と文化を深く学ぶ知的な旅。古い寺社仏閣や伝統工芸、地域の文化に触れ、日本の奥深さを再発見します。',
        asia: 'アジアの古い文明と現代文化の融合を体験。遺跡探訪から現代アートまで、多層的な文化体験の旅です。',
        europe: 'ヨーロッパの豊かな歴史と芸術を巡る文化的な旅。美術館や歴史的建造物で、西洋文明の足跡を辿ります。',
        other: '世界各地の独特な文化遺産を探訪。その土地ならではの歴史や伝統、芸術に触れる、知的好奇心を満たす旅です。'
      }
    };
    
    return templates[selections.purpose]?.[selections.destination] || 
           '選択いただいた条件に基づいて、素晴らしい旅行体験をお楽しみいただけます。';
  }
  
  // フォールバックTips生成
  function generateFallbackTips(selections) {
    return `
      <li><strong>事前準備:</strong> 旅行前に現地の気候や文化について調べておきましょう</li>
      <li><strong>予算管理:</strong> 想定予算の10-20%を予備費として準備しておくと安心です</li>
      <li><strong>安全対策:</strong> 旅行保険への加入と緊急連絡先の確認をお忘れなく</li>
      <li><strong>地元体験:</strong> 観光地だけでなく、地元の人との交流も旅の醍醐味です</li>
      <li><strong>記録保存:</strong> 写真や日記で旅の思い出を残しましょう</li>
    `;
  }
  
  // 画像生成機能
  function generateTravelImages() {
    if (!validateSelections()) {
      alert('旅行プランを先に生成してください。');
      return;
    }
    
    generateImageBtn.disabled = true;
    generateImageBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';
    
    // ローディング表示
    travelImages.innerHTML = `
      <div class="image-loading">
        <div class="loading-spinner"></div>
        <span>AI画像生成中...</span>
      </div>
    `;
    
    // 画像プロンプトを生成
    const imagePrompts = createImagePrompts(selections);
    
    // 複数の画像を順次生成
    generateImagesSequentially(imagePrompts);
  }
  
  // 画像プロンプト作成
  function createImagePrompts(selections) {
    const baseStyle = "beautiful landscape, photorealistic, high quality, scenic view";
    
    const destinationPrompts = {
      domestic: [
        `Japanese traditional hot spring resort with mountain view, ${baseStyle}`,
        `Beautiful Japanese garden with cherry blossoms, ${baseStyle}`,
        `Traditional Japanese village in countryside, ${baseStyle}`
      ],
      asia: [
        `Stunning Asian temple complex with sunset, ${baseStyle}`,
        `Tropical beach in Southeast Asia with crystal clear water, ${baseStyle}`,
        `Asian city skyline at night with modern buildings, ${baseStyle}`
      ],
      europe: [
        `European medieval castle on hilltop with surrounding landscape, ${baseStyle}`,
        `Charming European village with cobblestone streets, ${baseStyle}`,
        `European cathedral with gothic architecture, ${baseStyle}`
      ],
      other: [
        `Exotic tropical paradise with pristine beaches, ${baseStyle}`,
        `Majestic mountain range with snow-capped peaks, ${baseStyle}`,
        `Desert landscape with sand dunes at golden hour, ${baseStyle}`
      ]
    };
    
    const purposeModifiers = {
      healing: ", peaceful, serene, relaxing atmosphere",
      adventure: ", dramatic, exciting, outdoor adventure",
      gourmet: ", food markets, restaurants, culinary scene",
      culture: ", historical, cultural heritage, traditional architecture"
    };
    
    const selectedPrompts = destinationPrompts[selections.destination] || destinationPrompts.other;
    const modifier = purposeModifiers[selections.purpose] || "";
    
    return selectedPrompts.map(prompt => prompt + modifier);
  }
  
  // 画像を順次生成
  async function generateImagesSequentially(prompts) {
    try {
      const imageElements = [];
      
      for (let i = 0; i < Math.min(prompts.length, 3); i++) {
        try {
          const imageData = await generateSingleImage(prompts[i]);
          if (imageData) {
            imageElements.push(createImageElement(imageData, `風景${i + 1}`));
          }
        } catch (error) {
          console.error(`画像${i + 1}の生成エラー:`, error);
          // エラーが発生した場合はプレースホルダーを表示
          imageElements.push(createImagePlaceholder(`風景${i + 1}（生成失敗）`));
        }
      }
      
      // 生成結果を表示
      if (imageElements.length > 0) {
        travelImages.innerHTML = imageElements.join('');
      } else {
        showImageGenerationError();
      }
      
    } catch (error) {
      console.error('画像生成エラー:', error);
      showImageGenerationError();
    } finally {
      generateImageBtn.disabled = false;
      generateImageBtn.innerHTML = '<i class="fas fa-magic"></i> 風景画像を生成';
    }
  }
  
  // 単一画像生成
  async function generateSingleImage(prompt) {
    try {
      const searchTerms = extractSearchTerms(prompt);
      const unsplashUrl = `https://source.unsplash.com/800x600/?${searchTerms}`;
      
      // タイムアウト付きでfetch実行
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト
      
      const response = await fetch(unsplashUrl, {
        signal: controller.signal,
        mode: 'no-cors' // CORS問題回避
      });
      
      clearTimeout(timeoutId);
      
      // no-corsモードでは詳細なレスポンス情報が取得できないため、
      // URLが有効かどうかをImageオブジェクトで確認
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          resolve({
            url: unsplashUrl,
            caption: prompt,
            width: img.width,
            height: img.height
          });
        };
        img.onerror = () => {
          console.warn('画像読み込み失敗:', searchTerms);
          resolve(null); // nullを返してフォールバック処理に委ねる
        };
        img.src = unsplashUrl;
        
        // 追加のタイムアウト
        setTimeout(() => {
          img.onload = null;
          img.onerror = null;
          resolve(null);
        }, 5000);
      });
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('画像取得タイムアウト:', prompt);
      } else {
        console.error('画像生成エラー:', error);
      }
      return null;
    }
  }
  
  // プロンプトから検索キーワードを抽出
  function extractSearchTerms(prompt) {
    const keywords = [];
    
    if (prompt.includes('Japanese')) keywords.push('japan');
    if (prompt.includes('temple')) keywords.push('temple');
    if (prompt.includes('beach')) keywords.push('beach');
    if (prompt.includes('mountain')) keywords.push('mountain');
    if (prompt.includes('castle')) keywords.push('castle');
    if (prompt.includes('village')) keywords.push('village');
    if (prompt.includes('garden')) keywords.push('garden');
    if (prompt.includes('hot spring')) keywords.push('onsen');
    if (prompt.includes('desert')) keywords.push('desert');
    if (prompt.includes('tropical')) keywords.push('tropical');
    
    return keywords.length > 0 ? keywords.join(',') : 'landscape';
  }
  
  // 画像要素作成
  function createImageElement(imageData, caption) {
    return `
      <div class="generated-image">
        <img src="${imageData.url}" alt="${caption}" loading="lazy">
        <div class="image-caption">${caption}</div>
      </div>
    `;
  }
  
  // 画像プレースホルダー作成
  function createImagePlaceholder(caption) {
    return `
      <div class="image-placeholder">
        <i class="fas fa-image"></i>
        <p>${caption}</p>
        <small>画像を読み込めませんでした</small>
      </div>
    `;
  }
  
  // フォールバック画像生成
  function createFallbackImage(caption, type = 'landscape') {
    const gradients = {
      landscape: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      culture: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      gourmet: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      adventure: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
    };
    
    const gradient = gradients[type] || gradients.landscape;
    
    return `
      <div class="generated-image fallback-image">
        <div style="
          width: 100%;
          height: 200px;
          background: ${gradient};
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 3rem;
        ">
          <i class="fas fa-mountain"></i>
        </div>
        <div class="image-caption">${caption} (サンプル画像)</div>
      </div>
    `;
  }
  
  // 画像生成エラー表示
  function showImageGenerationError() {
    travelImages.innerHTML = `
      <div class="image-placeholder">
        <i class="fas fa-exclamation-triangle"></i>
        <p>画像の生成に失敗しました</p>
        <button class="button" onclick="generateTravelImages()" style="margin-top: 1rem;">
          <i class="fas fa-redo"></i> 再試行
        </button>
      </div>
    `;
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
  
  // PDF出力機能
  async function exportToPDF() {
    if (!travelStory.textContent.trim()) {
      alert('旅行プランを先に生成してください。');
      return;
    }
    
    exportBtn.disabled = true;
    exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PDF作成中...';
    
    try {
      // jsPDFインスタンスを作成
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // フォント設定（日本語対応）
      pdf.setFont('helvetica');
      
      // タイトル
      pdf.setFontSize(20);
      pdf.text('AI旅行プランナー - あなたの旅行記', 20, 30);
      
      // 選択条件
      pdf.setFontSize(12);
      let y = 50;
      
      const conditions = [
        `旅の目的: ${getPurposeText(selections.purpose)}`,
        `同行者: ${getCompanionText(selections.companion)}`,
        `行き先: ${getDestinationText(selections.destination)}`,
        `予算: ${getBudgetText(selections.budget)}`
      ];
      
      conditions.forEach(condition => {
        pdf.text(condition, 20, y);
        y += 8;
      });
      
      y += 10;
      
      // 旅行ストーリー
      pdf.setFontSize(16);
      pdf.text('旅行ストーリー', 20, y);
      y += 10;
      
      pdf.setFontSize(10);
      const storyText = travelStory.textContent || travelStory.innerText;
      const storyLines = pdf.splitTextToSize(storyText, 170);
      
      storyLines.forEach(line => {
        if (y > 270) {
          pdf.addPage();
          y = 20;
        }
        pdf.text(line, 20, y);
        y += 5;
      });
      
      y += 10;
      
      // Tips
      if (y > 250) {
        pdf.addPage();
        y = 20;
      }
      
      pdf.setFontSize(16);
      pdf.text('旅のTips・豆知識', 20, y);
      y += 10;
      
      pdf.setFontSize(10);
      const tipsText = travelTips.textContent || travelTips.innerText;
      const tipsLines = pdf.splitTextToSize(tipsText, 170);
      
      tipsLines.forEach(line => {
        if (y > 270) {
          pdf.addPage();
          y = 20;
        }
        pdf.text(line, 20, y);
        y += 5;
      });
      
      // フッター
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.text(`Generated by AI Travel Planner - Page ${i}/${pageCount}`, 20, 290);
      }
      
      // PDFをダウンロード
      const today = new Date().toISOString().split('T')[0];
      pdf.save(`travel-plan-${today}.pdf`);
      
      // 成功メッセージ
      exportBtn.classList.add('copy-success');
      exportBtn.innerHTML = '<i class="fas fa-check"></i> PDF作成完了！';
      
      setTimeout(() => {
        exportBtn.classList.remove('copy-success');
        exportBtn.innerHTML = '<i class="fas fa-file-pdf"></i> PDF出力';
        exportBtn.disabled = false;
      }, 3000);
      
    } catch (error) {
      console.error('PDF出力エラー:', error);
      alert('PDF出力中にエラーが発生しました。しばらく待ってから再度お試しください。');
      
      exportBtn.innerHTML = '<i class="fas fa-file-pdf"></i> PDF出力';
      exportBtn.disabled = false;
    }
  }
  
  // 選択項目のテキスト変換関数
  function getPurposeText(purpose) {
    const map = {
      healing: '癒し・リラックス系',
      adventure: '冒険・アクティブ系',
      gourmet: 'グルメ・食文化中心',
      culture: '歴史・文化探訪'
    };
    return map[purpose] || purpose;
  }
  
  function getCompanionText(companion) {
    const map = {
      solo: 'ひとり旅',
      couple: '恋人・パートナーとの旅',
      family: '家族旅行',
      friends: '友人・グループ旅行'
    };
    return map[companion] || companion;
  }
  
  function getDestinationText(destination) {
    const map = {
      domestic: '日本国内',
      asia: 'アジア',
      europe: 'ヨーロッパ',
      other: 'その他の地域'
    };
    return map[destination] || destination;
  }
  
  function getBudgetText(budget) {
    const map = {
      budget: 'エコノミー（節約型）',
      standard: 'スタンダード（一般的）',
      luxury: 'ラグジュアリー（贅沢型）',
      unlimited: 'プレミアム（最高級）'
    };
    return map[budget] || budget;
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
    
    // ローカルストレージからも削除
    try {
      localStorage.removeItem('travelPlannerSelections');
    } catch (error) {
      console.warn('保存データの削除に失敗:', error);
    }
    
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
  generateImageBtn.addEventListener('click', generateTravelImages);
  
  // 初期化
  // 保存された選択状態を復元
  const restored = loadSelections();
  
  if (!restored) {
    // 保存データがない場合は初期表示
    updateProgress();
    step1.style.display = 'block';
    step1.classList.add('show');
  }
  
  console.log('旅行・冒険プランナー初期化完了');
});