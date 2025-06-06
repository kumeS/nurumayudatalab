/**
 * モヤモヤ言語化ナビゲーター
 * 自己探究と言語化を支援するAI対話システム
 */

// グローバル変数
let conversationHistory = [];
let sessionId = generateSessionId();
let currentTags = new Set();
let emotionHistory = [];
let isTyping = false;
let conversationDepth = 0;
let explorationPhase = 'initial'; // initial, exploring, deepening, actionable

// DOM要素
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const newSessionBtn = document.getElementById('newSessionBtn');
const currentKeywords = document.getElementById('currentKeywords');
const emotionMap = document.getElementById('emotionMap');
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

// プロンプトメッセージ作成
function createPromptMessages(userMessage) {
  // 会話の文脈を構築
  const recentHistory = conversationHistory.slice(-6); // 最近の3往復
  const contextMessages = recentHistory.map(entry => ({
    role: entry.role,
    content: entry.content
  }));
  
  // 現在のタグと感情の要約
  const tagSummary = Array.from(currentTags).join('、');
  const currentPhase = determinePhase();
  
  const systemPrompt = `あなたは「モヤモヤ言語化ナビゲーター」のAIアシスタントです。
ユーザーの漠然とした思いや悩みを、対話を通じて言葉にし、自己理解を深めるサポートをします。

現在の対話フェーズ: ${currentPhase}
これまでに出てきたキーワード: ${tagSummary || 'まだありません'}

以下の原則に従って対話してください：

1. **共感的で温かい態度**
   - ユーザーの気持ちに寄り添い、否定せずに受け止める
   - 「それは〜ということですね」と言い換えて理解を確認

2. **段階的な深掘り**
   - ${currentPhase === 'initial' ? '広く浅く、安心して話せる雰囲気作り' : ''}
   - ${currentPhase === 'exploring' ? '興味のある領域を特定し、具体例を引き出す' : ''}
   - ${currentPhase === 'deepening' ? '核心に迫る質問で、本質的な価値観を探る' : ''}
   - ${currentPhase === 'actionable' ? '小さな一歩となる具体的な行動を提案' : ''}

3. **質問の工夫**
   - 開かれた質問を使い、Yes/Noで答えられない形にする
   - 「もし〜だったら」という仮定の質問も効果的
   - 一度に複数の質問をせず、1-2個に絞る

4. **言語化の支援**
   - ユーザーが使った言葉を大切にし、新しい表現で言い換える
   - 感情や価値観を表す言葉を積極的に使う
   - 抽象的な話には「例えば？」と具体例を求める

5. **前向きな視点**
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

// タグ抽出
function extractTags(text) {
  const tags = new Set();
  
  // キーワード辞書（拡張可能）
  const keywordPatterns = {
    career: ['仕事', '職業', 'キャリア', '就職', '転職', '働く'],
    study: ['勉強', '学習', '大学', '進学', '資格', '研究'],
    relationship: ['人間関係', '友達', '家族', '恋愛', 'パートナー', 'コミュニケーション'],
    future: ['将来', '未来', '夢', '目標', '希望', 'なりたい'],
    anxiety: ['不安', '心配', '怖い', 'モヤモヤ', '迷い', '悩み'],
    growth: ['成長', '変化', '挑戦', 'チャレンジ', '新しい', '経験'],
    value: ['価値観', '大切', '重要', '意味', '幸せ', '満足'],
    action: ['やってみる', '始める', '行動', '実践', 'アクション', '一歩']
  };
  
  // パターンマッチング
  for (const [tag, keywords] of Object.entries(keywordPatterns)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      tags.add(tag);
    }
  }
  
  // 現在のタグセットに追加
  tags.forEach(tag => currentTags.add(tag));
  
  return Array.from(tags);
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

// インサイト更新
function updateInsights(history) {
  // キーワード更新
  updateKeywordCloud();
  
  // 感情マップ更新
  updateEmotionMap();
  
  // アクション提案更新
  updateActionSuggestions();
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

// 感情マップ更新（簡易版）
function updateEmotionMap() {
  // 実際の実装ではD3.jsなどを使用して可視化
  const emotions = conversationHistory
    .map(entry => entry.emotion)
    .filter(emotion => emotion);
  
  const positiveCount = emotions.filter(e => e === 'positive').length;
  const totalCount = emotions.length;
  
  // 簡易的な表示
  if (totalCount > 0) {
    const positiveRatio = positiveCount / totalCount;
    emotionMap.style.background = `linear-gradient(to right, 
      ${positiveRatio > 0.5 ? '#4CAF50' : '#FF9800'} 0%, 
      ${positiveRatio > 0.5 ? '#81C784' : '#FFB74D'} 100%)`;
  }
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