/**
 * モヤモヤ言語化ナビゲーター
 * 自己探究と言語化を支援するAI対話システム
 */

// グローバル変数（強化版）
let conversationHistory = [];
let sessionId = generateSessionId();
let currentTags = new Set();
let emotionHistory = [];
let isTyping = false;
let conversationDepth = 0;
let explorationPhase = 'initial'; // initial, exploring, deepening, actionable
let conversationThemes = new Map(); // テーマとその詳細度を追跡
let discussedTopics = new Set(); // 既に話し合った具体的なトピック
let lastConversationSummary = ''; // 前回の会話要約
let tagRelationships = new Map(); // タグ間の関連性
let unfinishedThemes = new Set(); // 未完了のテーマ

// DOM要素
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const newSessionBtn = document.getElementById('newSessionBtn');
const currentKeywords = document.getElementById('currentKeywords');
const emotionMap = document.getElementById('emotionMap');
const thoughtMap = document.getElementById('thoughtMap');
const emotionCanvas = document.getElementById('emotionCanvas');
const thoughtCanvas = document.getElementById('thoughtCanvas');
const progressFill = document.getElementById('progressFill');
const actionSuggestions = document.getElementById('actionSuggestions');

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  setupEventListeners();
  loadConversationHistory();
});

// アプリケーション初期化
function initializeApp() {
  // 保存されたデータの読み込み
  const savedHistory = localStorage.getItem('moyamoyaHistory');
  if (savedHistory) {
    const allHistory = JSON.parse(savedHistory);
    // 最新のセッションを表示
    if (allHistory.length > 0) {
      updateInsights(allHistory);
    }
  }
  
  // テキストエリアの自動リサイズ
  chatInput.addEventListener('input', autoResizeTextarea);
}

// イベントリスナーの設定
function setupEventListeners() {
  sendButton.addEventListener('click', sendMessage);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  newSessionBtn.addEventListener('click', startNewSession);
}

// セッションID生成
function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// メッセージ送信
async function sendMessage() {
  const message = chatInput.value.trim();
  if (!message || isTyping) return;
  
  // ユーザーメッセージを表示
  addMessage(message, 'user');
  chatInput.value = '';
  autoResizeTextarea();
  
  // 会話履歴に追加
  const userEntry = {
    role: 'user',
    content: message,
    timestamp: new Date().toISOString(),
    tags: extractTags(message),
    emotion: analyzeEmotion(message)
  };
  conversationHistory.push(userEntry);
  
  // タイピング表示
  showTypingIndicator();
  isTyping = true;
  
  try {
    // AIの応答を生成
    const response = await generateAIResponse(message);
    removeTypingIndicator();
    
    // AI応答を表示
    addMessage(response, 'ai');
    
    // 会話履歴に追加
    const aiEntry = {
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString(),
      tags: extractTags(response),
      questionType: categorizeQuestion(response)
    };
    conversationHistory.push(aiEntry);
    
    // インサイトを更新
    updateInsights(conversationHistory);
    
    // 履歴を保存
    saveConversationHistory();
    
    // 深さを更新
    conversationDepth++;
    updateProgress();
    
  } catch (error) {
    console.error('エラー:', error);
    removeTypingIndicator();
    addMessage('申し訳ありません。エラーが発生しました。もう一度お試しください。', 'ai');
  } finally {
    isTyping = false;
  }
}

// AI応答生成
async function generateAIResponse(userMessage) {
  const messages = createPromptMessages(userMessage);
  
  const apiUrl = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
  const requestData = {
    model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
    temperature: 0.7,
    stream: false,
    max_completion_tokens: 1000,
    messages: messages
  };
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestData)
  });
  
  const data = await response.json();
  
  if (data.choices && data.choices.length > 0 && data.choices[0].message) {
    return data.choices[0].message.content;
  } else if (data.answer) {
    return data.answer;
  } else {
    throw new Error('応答の生成に失敗しました');
  }
}

// プロンプトメッセージ作成（強化版）
function createPromptMessages(userMessage) {
  // 会話の文脈を構築
  const recentHistory = conversationHistory.slice(-6); // 最近の3往復
  const contextMessages = recentHistory.map(entry => ({
    role: entry.role,
    content: entry.content
  }));
  
  // 詳細な文脈情報を生成
  const tagSummary = generateTagSummary();
  const currentPhase = determinePhase();
  const avoidanceTopics = generateAvoidanceList();
  const unfinishedTopics = generateUnfinishedTopics();
  const conversationPatterns = analyzeConversationPatterns();
  const suggestedQuestions = generateContextualQuestions(userMessage);
  
  const systemPrompt = `あなたは「モヤモヤ言語化ナビゲーター」のAIアシスタントです。
ユーザーの漠然とした思いや悩みを、対話を通じて言葉にし、自己理解を深めるサポートをします。

現在の対話フェーズ: ${currentPhase}
これまでに出てきたキーワード: ${tagSummary || 'まだありません'}

【重要な文脈情報】
- 既に十分話し合ったトピック: ${avoidanceTopics}
- まだ深掘りできていないテーマ: ${unfinishedTopics}
- ユーザーの会話パターン: ${conversationPatterns}
- 前回の会話要約: ${lastConversationSummary || 'なし'}
- 今回の推奨質問方向: ${suggestedQuestions}

以下の原則に従って対話してください：

1. **共感的で温かい態度**
   - ユーザーの気持ちに寄り添い、否定せずに受け止める
   - 「それは〜ということですね」と言い換えて理解を確認

2. **段階的な深掘り**
   - ${currentPhase === 'initial' ? '広く浅く、安心して話せる雰囲気作り' : ''}
   - ${currentPhase === 'exploring' ? '興味のある領域を特定し、具体例を引き出す' : ''}
   - ${currentPhase === 'deepening' ? '核心に迫る質問で、本質的な価値観を探る' : ''}
   - ${currentPhase === 'actionable' ? '小さな一歩となる具体的な行動を提案' : ''}

3. **重複回避と新たな視点**
   - 既に話し合ったトピックは繰り返さず、新しい角度からアプローチ
   - 未完了テーマがあれば優先的に深掘り
   - ユーザーの会話パターンに合わせて質問スタイルを調整

4. **質問の工夫**
   - 開かれた質問を使い、Yes/Noで答えられない形にする
   - 「もし〜だったら」という仮定の質問も効果的
   - 一度に複数の質問をせず、1-2個に絞る
   - 推奨質問方向を参考に、文脈に最適な質問を選択

5. **言語化の支援**
   - ユーザーが使った言葉を大切にし、新しい表現で言い換える
   - 感情や価値観を表す言葉を積極的に使う
   - 抽象的な話には「例えば？」と具体例を求める

6. **前向きな視点**
   - 問題や悩みの中にも成長の種を見つける
   - 小さな気づきや変化を称える
   - 可能性や選択肢を示す

回答は自然な会話調で、長すぎず（3-4文程度）、次の対話につながるようにしてください。`;
  
  return [
    { role: "system", content: systemPrompt },
    ...contextMessages,
    { role: "user", content: userMessage }
  ];
}

// フェーズ判定
function determinePhase() {
  if (conversationDepth < 3) return 'initial';
  if (conversationDepth < 6) return 'exploring';
  if (conversationDepth < 10) return 'deepening';
  return 'actionable';
}

// メッセージ表示
function addMessage(content, sender) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}`;
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = sender === 'user' ? 'あなた' : 'AI';
  
  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper';
  
  const messageContent = document.createElement('div');
  messageContent.className = 'message-content';
  messageContent.innerHTML = `<p>${escapeHtml(content)}</p>`;
  
  const time = document.createElement('div');
  time.className = 'message-time';
  time.textContent = formatTime(new Date());
  
  wrapper.appendChild(messageContent);
  wrapper.appendChild(time);
  
  messageDiv.appendChild(avatar);
  messageDiv.appendChild(wrapper);
  
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// タイピングインジケーター表示
function showTypingIndicator() {
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message ai typing-indicator';
  typingDiv.id = 'typingIndicator';
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = 'AI';
  
  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper';
  
  const messageContent = document.createElement('div');
  messageContent.className = 'message-content';
  messageContent.innerHTML = `
    <div class="loading-dots">
      <span class="loading-dot"></span>
      <span class="loading-dot"></span>
      <span class="loading-dot"></span>
    </div>
  `;
  
  wrapper.appendChild(messageContent);
  typingDiv.appendChild(avatar);
  typingDiv.appendChild(wrapper);
  
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// タイピングインジケーター削除
function removeTypingIndicator() {
  const indicator = document.getElementById('typingIndicator');
  if (indicator) {
    indicator.remove();
  }
}

// タグ抽出（強化版）
function extractTags(text) {
  const tags = new Set();
  
  // キーワード辞書（拡張版）
  const keywordPatterns = {
    career: {
      keywords: ['仕事', '職業', 'キャリア', '就職', '転職', '働く', '会社', '職場', '収入', '給料'],
      category: 'external'
    },
    study: {
      keywords: ['勉強', '学習', '大学', '進学', '資格', '研究', 'スキル', '知識', '学校'],
      category: 'growth'
    },
    relationship: {
      keywords: ['人間関係', '友達', '家族', '恋愛', 'パートナー', 'コミュニケーション', '先輩', '後輩'],
      category: 'social'
    },
    future: {
      keywords: ['将来', '未来', '夢', '目標', '希望', 'なりたい', '計画', 'ビジョン'],
      category: 'direction'
    },
    anxiety: {
      keywords: ['不安', '心配', '怖い', 'モヤモヤ', '迷い', '悩み', 'ストレス', '焦り'],
      category: 'emotion'
    },
    growth: {
      keywords: ['成長', '変化', '挑戦', 'チャレンジ', '新しい', '経験', '学び', '向上'],
      category: 'development'
    },
    value: {
      keywords: ['価値観', '大切', '重要', '意味', '幸せ', '満足', '信念', '理想'],
      category: 'internal'
    },
    action: {
      keywords: ['やってみる', '始める', '行動', '実践', 'アクション', '一歩', '取り組む', '試す'],
      category: 'implementation'
    }
  };
  
  // パターンマッチング
  for (const [tag, config] of Object.entries(keywordPatterns)) {
    if (config.keywords.some(keyword => text.includes(keyword))) {
      tags.add(tag);
      // タグの関連性を記録
      updateTagRelationships(tag, config.category);
    }
  }
  
  // テーマの深度を分析
  analyzeThemeDepth(text, tags);
  
  // 現在のタグセットに追加
  tags.forEach(tag => currentTags.add(tag));
  
  return Array.from(tags);
}

// タグ間の関連性を更新
function updateTagRelationships(tag, category) {
  if (!tagRelationships.has(tag)) {
    tagRelationships.set(tag, { category, relatedTags: new Set(), frequency: 0 });
  }
  
  const tagData = tagRelationships.get(tag);
  tagData.frequency++;
  
  // 同じカテゴリのタグとの関連性を記録
  for (const [otherTag, otherData] of tagRelationships.entries()) {
    if (otherTag !== tag && otherData.category === category) {
      tagData.relatedTags.add(otherTag);
      otherData.relatedTags.add(tag);
    }
  }
}

// テーマの深度分析
function analyzeThemeDepth(text, tags) {
  const depthIndicators = {
    surface: ['思う', 'かも', 'なんとなく', 'ちょっと'],
    medium: ['感じる', '考える', '気になる', '興味'],
    deep: ['本当に', '心から', '強く', '深く', '本質的']
  };
  
  let maxDepth = 'surface';
  
  for (const [depth, indicators] of Object.entries(depthIndicators)) {
    if (indicators.some(indicator => text.includes(indicator))) {
      maxDepth = depth;
    }
  }
  
  tags.forEach(tag => {
    if (!conversationThemes.has(tag)) {
      conversationThemes.set(tag, { depth: maxDepth, count: 0, lastMentioned: new Date() });
    } else {
      const theme = conversationThemes.get(tag);
      theme.count++;
      theme.lastMentioned = new Date();
      
      // より深いレベルに更新
      const depthLevels = ['surface', 'medium', 'deep'];
      if (depthLevels.indexOf(maxDepth) > depthLevels.indexOf(theme.depth)) {
        theme.depth = maxDepth;
      }
    }
  });
}

// 感情分析（簡易版）
function analyzeEmotion(text) {
  const emotions = {
    positive: 0,
    negative: 0,
    neutral: 0
  };
  
  // ポジティブワード
  const positiveWords = ['嬉しい', '楽しい', '希望', 'ワクワク', '前向き', '良い', '素敵', '幸せ'];
  // ネガティブワード
  const negativeWords = ['不安', '心配', '怖い', '辛い', '難しい', '悩み', '迷い', 'モヤモヤ'];
  
  positiveWords.forEach(word => {
    if (text.includes(word)) emotions.positive++;
  });
  
  negativeWords.forEach(word => {
    if (text.includes(word)) emotions.negative++;
  });
  
  // 最も強い感情を返す
  if (emotions.positive > emotions.negative) return 'positive';
  if (emotions.negative > emotions.positive) return 'negative';
  return 'neutral';
}

// 質問の分類
function categorizeQuestion(text) {
  if (text.includes('どんな') || text.includes('何が')) return 'exploratory';
  if (text.includes('なぜ') || text.includes('どうして')) return 'deepening';
  if (text.includes('もし') || text.includes('たとえば')) return 'hypothetical';
  if (text.includes('してみては') || text.includes('やってみる')) return 'actionable';
  return 'general';
}

// インサイト更新（強化版）
function updateInsights(history) {
  // 会話パターンの分析
  analyzeAndUpdateConversationPatterns();
  
  // 未完了テーマの更新
  updateUnfinishedThemes();
  
  // キーワード更新
  updateKeywordCloud();
  
  // 感情マップ更新
  updateEmotionMap();
  
  // 思考マップ更新
  updateThoughtMap();
  
  // アクション提案更新
  updateActionSuggestions();
  
  // 会話要約の生成
  generateConversationSummary();
}

// 詳細なタグ要約生成
function generateTagSummary() {
  const tagFrequency = new Map();
  const tagDepth = new Map();
  
  for (const [tag, theme] of conversationThemes.entries()) {
    tagFrequency.set(tag, theme.count);
    tagDepth.set(tag, theme.depth);
  }
  
  const sortedTags = Array.from(tagFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => {
      const depth = tagDepth.get(tag) || 'surface';
      const label = getTagLabel(tag);
      return `${label}(${depth}レベル, ${count}回)`;
    });
  
  return sortedTags.join('、');
}

// 重複回避リスト生成
function generateAvoidanceList() {
  const frequentTopics = Array.from(conversationThemes.entries())
    .filter(([tag, theme]) => theme.count >= 3 && theme.depth === 'deep')
    .map(([tag, theme]) => getTagLabel(tag));
  
  return frequentTopics.join('、') || 'なし';
}

// 未完了トピック生成
function generateUnfinishedTopics() {
  const unfinished = Array.from(conversationThemes.entries())
    .filter(([tag, theme]) => theme.count >= 1 && theme.depth === 'surface')
    .map(([tag, theme]) => getTagLabel(tag));
  
  return unfinished.join('、') || 'なし';
}

// 会話パターン分析
function analyzeConversationPatterns() {
  const patterns = [];
  
  if (conversationHistory.length > 0) {
    const avgLength = conversationHistory
      .filter(entry => entry.role === 'user')
      .reduce((sum, entry) => sum + entry.content.length, 0) / 
      conversationHistory.filter(entry => entry.role === 'user').length;
    
    if (avgLength > 100) patterns.push('詳細に語る傾向');
    else if (avgLength < 30) patterns.push('簡潔に答える傾向');
    
    const emotionCounts = conversationHistory
      .filter(entry => entry.emotion)
      .reduce((acc, entry) => {
        acc[entry.emotion] = (acc[entry.emotion] || 0) + 1;
        return acc;
      }, {});
    
    if (emotionCounts.positive > emotionCounts.negative) patterns.push('前向き思考');
    else if (emotionCounts.negative > emotionCounts.positive) patterns.push('慎重思考');
  }
  
  return patterns.join('、') || '標準的な対話スタイル';
}

// 文脈に応じた質問生成
function generateContextualQuestions(userMessage) {
  const suggestions = [];
  const currentTags = extractTags(userMessage);
  const phase = determinePhase();
  
  // フェーズに応じた質問戦略
  if (phase === 'initial') {
    suggestions.push('広く探索的な質問で関心領域を特定');
  } else if (phase === 'exploring') {
    suggestions.push('具体例を求める質問で深掘り');
  } else if (phase === 'deepening') {
    suggestions.push('価値観や感情に焦点を当てた質問');
  } else if (phase === 'actionable') {
    suggestions.push('実行可能な小さなステップを提案');
  }
  
  // 未完了テーマへの誘導
  if (unfinishedThemes.size > 0) {
    const unfinishedArray = Array.from(unfinishedThemes);
    suggestions.push(`未完了テーマ「${getTagLabel(unfinishedArray[0])}」への深掘り`);
  }
  
  // タグの関連性からの提案
  currentTags.forEach(tag => {
    const tagData = tagRelationships.get(tag);
    if (tagData && tagData.relatedTags.size > 0) {
      const relatedTag = Array.from(tagData.relatedTags)[0];
      suggestions.push(`関連テーマ「${getTagLabel(relatedTag)}」への展開`);
    }
  });
  
  return suggestions.slice(0, 2).join('、') || '自然な対話継続';
}

// 会話パターンの分析と更新
function analyzeAndUpdateConversationPatterns() {
  // 実装は上記の analyzeConversationPatterns を使用
}

// 未完了テーマの更新
function updateUnfinishedThemes() {
  unfinishedThemes.clear();
  
  for (const [tag, theme] of conversationThemes.entries()) {
    if (theme.depth === 'surface' && theme.count >= 1) {
      unfinishedThemes.add(tag);
    }
  }
}

// 会話要約の生成
function generateConversationSummary() {
  if (conversationHistory.length >= 4) {
    const recentMessages = conversationHistory.slice(-4);
    const userMessages = recentMessages.filter(msg => msg.role === 'user');
    const mainTopics = Array.from(currentTags).slice(0, 3).map(tag => getTagLabel(tag));
    
    lastConversationSummary = `最近の話題: ${mainTopics.join('、')}について、${userMessages.length}回のやり取りを行いました。`;
  }
}

// キーワードクラウド更新
function updateKeywordCloud() {
  currentKeywords.innerHTML = '';
  
  const tagCounts = {};
  conversationHistory.forEach(entry => {
    if (entry.tags) {
      entry.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    }
  });
  
  // タグを頻度順にソート
  const sortedTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  sortedTags.forEach(([tag, count]) => {
    const tagElement = document.createElement('span');
    tagElement.className = `tag ${getTagType(tag)}`;
    tagElement.textContent = getTagLabel(tag);
    tagElement.style.fontSize = `${0.8 + (count * 0.1)}rem`;
    currentKeywords.appendChild(tagElement);
  });
}

// タグタイプ取得
function getTagType(tag) {
  if (['anxiety', 'growth', 'value'].includes(tag)) return 'emotion';
  if (['action', 'future'].includes(tag)) return 'action';
  return '';
}

// タグラベル取得
function getTagLabel(tag) {
  const labels = {
    career: '仕事・キャリア',
    study: '学習・勉強',
    relationship: '人間関係',
    future: '将来・未来',
    anxiety: '不安・悩み',
    growth: '成長・挑戦',
    value: '価値観',
    action: '行動・実践'
  };
  return labels[tag] || tag;
}

// 感情マップ更新（高度版）
function updateEmotionMap() {
  if (!emotionCanvas) return;
  
  const ctx = emotionCanvas.getContext('2d');
  const width = emotionCanvas.width;
  const height = emotionCanvas.height;
  
  // キャンバスをクリア
  ctx.clearRect(0, 0, width, height);
  
  // 感情データの収集
  const emotionHistory = conversationHistory
    .map((entry, index) => ({
      emotion: entry.emotion,
      timestamp: new Date(entry.timestamp),
      index: index
    }))
    .filter(entry => entry.emotion);
  
  if (emotionHistory.length === 0) {
    // データがない場合のデフォルト表示
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#888';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('対話データを蓄積中...', width/2, height/2);
    return;
  }
  
  // 感情の時系列グラフを描画
  drawEmotionTimeline(ctx, emotionHistory, width, height);
  
  // 感情の分布円グラフを描画
  drawEmotionDistribution(ctx, emotionHistory, width, height);
}

// 感情タイムライン描画
function drawEmotionTimeline(ctx, emotionHistory, width, height) {
  const padding = 20;
  const graphWidth = width - 2 * padding;
  const graphHeight = height * 0.6 - padding;
  
  // 背景グリッド
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding + (graphHeight * i / 4);
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }
  
  // 感情ライン
  if (emotionHistory.length > 1) {
    const stepWidth = graphWidth / (emotionHistory.length - 1);
    
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    emotionHistory.forEach((entry, index) => {
      const x = padding + index * stepWidth;
      const emotionValue = entry.emotion === 'positive' ? 0.8 : 
                          entry.emotion === 'negative' ? 0.2 : 0.5;
      const y = padding + graphHeight * (1 - emotionValue);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      // ポイントを描画
      const color = entry.emotion === 'positive' ? '#4CAF50' :
                   entry.emotion === 'negative' ? '#F44336' : '#FF9800';
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
    
    ctx.strokeStyle = '#666';
    ctx.stroke();
  }
}

// 感情分布円グラフ描画
function drawEmotionDistribution(ctx, emotionHistory, width, height) {
  const centerX = width * 0.8;
  const centerY = height * 0.8;
  const radius = 30;
  
  // 感情の集計
  const emotionCounts = emotionHistory.reduce((acc, entry) => {
    acc[entry.emotion] = (acc[entry.emotion] || 0) + 1;
    return acc;
  }, {});
  
  const total = emotionHistory.length;
  let currentAngle = 0;
  
  // 円グラフ描画
  Object.entries(emotionCounts).forEach(([emotion, count]) => {
    const angle = (count / total) * 2 * Math.PI;
    const color = emotion === 'positive' ? '#4CAF50' :
                 emotion === 'negative' ? '#F44336' : '#FF9800';
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + angle);
    ctx.closePath();
    ctx.fill();
    
    currentAngle += angle;
  });
  
  // 境界線
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.stroke();
}

// 思考マップ更新
function updateThoughtMap() {
  if (!thoughtCanvas) return;
  
  const ctx = thoughtCanvas.getContext('2d');
  const width = thoughtCanvas.width;
  const height = thoughtCanvas.height;
  
  // キャンバスをクリア
  ctx.clearRect(0, 0, width, height);
  
  // タグの関連性を可視化
  const tags = Array.from(tagRelationships.entries())
    .sort((a, b) => b[1].frequency - a[1].frequency)
    .slice(0, 8); // 上位8タグ
  
  if (tags.length === 0) {
    // データがない場合
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#888';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('思考の繋がりを分析中...', width/2, height/2);
    return;
  }
  
  // ノードの配置計算
  const nodes = tags.map(([tag, data], index) => {
    const angle = (index / tags.length) * 2 * Math.PI;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.3;
    
    return {
      tag,
      data,
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
      size: Math.max(15, data.frequency * 3)
    };
  });
  
  // 関連性の線を描画
  ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
  ctx.lineWidth = 1;
  
  nodes.forEach(node1 => {
    nodes.forEach(node2 => {
      if (node1 !== node2 && node1.data.relatedTags.has(node2.tag)) {
        ctx.beginPath();
        ctx.moveTo(node1.x, node1.y);
        ctx.lineTo(node2.x, node2.y);
        ctx.stroke();
      }
    });
  });
  
  // ノードを描画
  nodes.forEach(node => {
    const color = getTagColor(node.tag);
    
    // ノード本体
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.size, 0, 2 * Math.PI);
    ctx.fill();
    
    // ノード境界
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // ラベル
    ctx.fillStyle = '#333';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    const label = getTagLabel(node.tag);
    const shortLabel = label.length > 6 ? label.substring(0, 5) + '...' : label;
    ctx.fillText(shortLabel, node.x, node.y + node.size + 15);
  });
}

// タグの色を取得
function getTagColor(tag) {
  const colors = {
    career: '#FF6B6B',
    study: '#4ECDC4',
    relationship: '#45B7D1',
    future: '#96CEB4',
    anxiety: '#FFEAA7',
    growth: '#DDA0DD',
    value: '#98D8C8',
    action: '#F7DC6F'
  };
  return colors[tag] || '#B0BEC5';
}

// アクション提案更新
function updateActionSuggestions() {
  actionSuggestions.innerHTML = '';
  
  const suggestions = generateActionSuggestions();
  
  suggestions.forEach(suggestion => {
    const card = document.createElement('div');
    card.className = 'action-card';
    card.innerHTML = `
      <div class="action-title">${suggestion.title}</div>
      <div class="action-description">${suggestion.description}</div>
    `;
    actionSuggestions.appendChild(card);
  });
}

// アクション提案生成
function generateActionSuggestions() {
  const suggestions = [];
  const tags = Array.from(currentTags);
  
  // タグに基づいた提案
  if (tags.includes('career')) {
    suggestions.push({
      title: '興味のある仕事を調べる',
      description: '気になる職業について、実際に働いている人のインタビューを読んでみましょう'
    });
  }
  
  if (tags.includes('anxiety')) {
    suggestions.push({
      title: '不安を整理する',
      description: '心配事を紙に書き出して、できることとできないことを分けてみましょう'
    });
  }
  
  if (tags.includes('growth')) {
    suggestions.push({
      title: '小さな挑戦を始める',
      description: '今週中にできる、ちょっとした新しいことを一つ決めて実行しましょう'
    });
  }
  
  // デフォルト提案
  if (suggestions.length === 0) {
    suggestions.push({
      title: '今日の気づきをメモする',
      description: '対話で気づいたことを、短くても良いので書き留めておきましょう'
    });
  }
  
  return suggestions.slice(0, 3);
}

// 進捗更新
function updateProgress() {
  const maxDepth = 15;
  const progress = Math.min((conversationDepth / maxDepth) * 100, 100);
  progressFill.style.width = `${progress}%`;
}

// 会話履歴保存
function saveConversationHistory() {
  const allHistory = JSON.parse(localStorage.getItem('moyamoyaHistory') || '[]');
  
  // 現在のセッションを保存
  const currentSession = {
    sessionId: sessionId,
    startTime: conversationHistory[0]?.timestamp || new Date().toISOString(),
    lastUpdate: new Date().toISOString(),
    history: conversationHistory,
    tags: Array.from(currentTags),
    depth: conversationDepth
  };
  
  // 既存のセッションを更新または新規追加
  const sessionIndex = allHistory.findIndex(s => s.sessionId === sessionId);
  if (sessionIndex >= 0) {
    allHistory[sessionIndex] = currentSession;
  } else {
    allHistory.push(currentSession);
  }
  
  // 最大10セッションまで保持
  if (allHistory.length > 10) {
    allHistory.shift();
  }
  
  localStorage.setItem('moyamoyaHistory', JSON.stringify(allHistory));
}

// 会話履歴読み込み
function loadConversationHistory() {
  const allHistory = JSON.parse(localStorage.getItem('moyamoyaHistory') || '[]');
  
  if (allHistory.length > 0) {
    // 最新のセッションから継続するか確認
    const lastSession = allHistory[allHistory.length - 1];
    const lastUpdate = new Date(lastSession.lastUpdate);
    const hoursSinceLastUpdate = (Date.now() - lastUpdate) / (1000 * 60 * 60);
    
    // 24時間以内なら継続可能
    if (hoursSinceLastUpdate < 24) {
      // UIに継続オプションを表示（実装省略）
    }
  }
}

// 新しいセッション開始
function startNewSession() {
  if (confirm('新しい対話を始めますか？現在の対話は保存されます。')) {
    // 現在のセッションを保存
    if (conversationHistory.length > 0) {
      saveConversationHistory();
    }
    
    // リセット
    conversationHistory = [];
    sessionId = generateSessionId();
    currentTags.clear();
    emotionHistory = [];
    conversationDepth = 0;
    explorationPhase = 'initial';
    
    // UI更新
    chatMessages.innerHTML = '';
    addMessage('新しい対話を始めましょう。今はどんなことを考えていますか？', 'ai');
    updateInsights([]);
    updateProgress();
  }
}

// テキストエリア自動リサイズ
function autoResizeTextarea() {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
}

// HTMLエスケープ
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// 時刻フォーマット
function formatTime(date) {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}