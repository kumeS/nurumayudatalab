/**
 * コミュニケーション管理ツール - ユーザー画面 JavaScript
 */

// グローバル変数
let selectedTags = [];
let currentConversation = null;
let systemData = null;

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', () => {
  loadSystemData();
  initializeUI();
  renderTags();
  setupEventListeners();
  
  // 現在時刻をウェルカムメッセージに設定
  document.getElementById('welcomeTime').textContent = new Date().toLocaleTimeString();
});

// システムデータの読み込み
function loadSystemData() {
  const saved = localStorage.getItem('commToolData');
  if (saved) {
    try {
      systemData = JSON.parse(saved);
    } catch (e) {
      console.error('データの読み込みに失敗しました:', e);
      systemData = getDefaultData();
    }
  } else {
    systemData = getDefaultData();
  }
}

// デフォルトデータ
function getDefaultData() {
  return {
    categories: [
      { id: 1, name: "イベント", color: "#ff7e5f", icon: "fas fa-calendar-alt" },
      { id: 2, name: "休校日", color: "#feb47b", icon: "fas fa-times-circle" },
      { id: 3, name: "お知らせ", color: "#7ee8fa", icon: "fas fa-info-circle" },
      { id: 4, name: "持ち物", color: "#6c757d", icon: "fas fa-backpack" }
    ],
    information: [
      {
        id: 1,
        title: "運動会開催のお知らせ",
        content: "10月15日（土）に運動会を開催いたします。雨天の場合は10月16日（日）に延期となります。詳細は後日配布する案内をご確認ください。",
        tags: [1],
        date: "2024-10-01",
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        title: "10月の休校日について",
        content: "10月9日（月）は体育の日のため休校です。10月14日（土）は運動会準備のため半日授業となります。",
        tags: [2],
        date: "2024-09-25",
        createdAt: new Date().toISOString()
      }
    ],
    conversations: [],
    escalations: []
  };
}

// UI初期化
function initializeUI() {
  // ステップインジケーターの初期状態
  updateStepIndicator(1);
}

// イベントリスナーの設定
function setupEventListeners() {
  const messageInput = document.getElementById('messageInput');
  const sendButton = document.getElementById('sendButton');
  
  // Enterキーでの送信
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  // 入力内容に応じて送信ボタンの状態を変更
  messageInput.addEventListener('input', () => {
    sendButton.disabled = !messageInput.value.trim();
  });
}

// タグ表示
function renderTags() {
  const tagGrid = document.getElementById('tagGrid');
  tagGrid.innerHTML = '';
  
  systemData.categories.forEach(tag => {
    const tagButton = document.createElement('div');
    tagButton.className = 'tag-button';
    tagButton.setAttribute('data-tag-id', tag.id);
    tagButton.style.borderColor = tag.color;
    
    tagButton.innerHTML = `
      <i class="${tag.icon} tag-icon"></i>
      <div>${tag.name}</div>
    `;
    
    tagButton.addEventListener('click', () => toggleTag(tag.id, tagButton));
    tagGrid.appendChild(tagButton);
  });
}

// タグ選択/解除
function toggleTag(tagId, button) {
  if (selectedTags.includes(tagId)) {
    // タグを削除
    selectedTags = selectedTags.filter(id => id !== tagId);
    button.classList.remove('selected');
    
    const tag = systemData.categories.find(t => t.id === tagId);
    if (tag) {
      button.style.borderColor = tag.color;
      button.style.backgroundColor = '#f8f9fa';
      button.style.color = 'var(--text-primary)';
    }
  } else {
    // タグを追加
    selectedTags.push(tagId);
    button.classList.add('selected');
    
    const tag = systemData.categories.find(t => t.id === tagId);
    if (tag) {
      button.style.borderColor = tag.color;
      button.style.backgroundColor = tag.color;
      button.style.color = 'white';
    }
  }
  
  // 次へボタンの状態を更新
  const proceedButton = document.getElementById('proceedButton');
  proceedButton.disabled = selectedTags.length === 0;
}

// ステップインジケーターの更新
function updateStepIndicator(activeStep) {
  for (let i = 1; i <= 3; i++) {
    const step = document.getElementById(`step${i}`);
    step.classList.remove('active', 'completed');
    
    if (i < activeStep) {
      step.classList.add('completed');
    } else if (i === activeStep) {
      step.classList.add('active');
    }
  }
}

// チャット画面への移行
function proceedToChat() {
  if (selectedTags.length === 0) return;
  
  // ステップを更新
  updateStepIndicator(2);
  
  // 画面を切り替え
  document.getElementById('tagSelection').classList.remove('active');
  document.getElementById('chatSection').classList.add('active');
  
  // 選択されたタグを表示
  displaySelectedTags();
  
  // 新しい会話を開始
  startNewConversation();
  
  // メッセージ入力欄にフォーカス
  document.getElementById('messageInput').focus();
}

// 選択されたタグの表示
function displaySelectedTags() {
  const container = document.getElementById('selectedTagsDisplay');
  container.innerHTML = '';
  
  selectedTags.forEach(tagId => {
    const tag = systemData.categories.find(t => t.id === tagId);
    if (tag) {
      const tagSpan = document.createElement('span');
      tagSpan.className = 'selected-tag';
      tagSpan.style.backgroundColor = tag.color;
      tagSpan.textContent = tag.name;
      container.appendChild(tagSpan);
    }
  });
}

// 新しい会話の開始
function startNewConversation() {
  currentConversation = {
    id: Date.now(),
    tags: [...selectedTags],
    messages: [],
    createdAt: new Date().toISOString(),
    status: 'active'
  };
}

// メッセージ送信
async function sendMessage() {
  const messageInput = document.getElementById('messageInput');
  const message = messageInput.value.trim();
  
  if (!message) return;
  
  // ユーザーメッセージを追加
  addMessageToChat('user', message);
  
  // 会話に追加
  currentConversation.messages.push({
    role: 'user',
    content: message,
    timestamp: new Date().toISOString()
  });
  
  // 入力欄をクリア
  messageInput.value = '';
  document.getElementById('sendButton').disabled = true;
  
  // ローディングを表示
  showLoading(true);
  
  // LLMで回答を生成
  try {
    const response = await generateResponse(message, selectedTags);
    
    // ローディングを非表示
    showLoading(false);
    
    if (response.needsEscalation) {
      // エスカレーションが必要な場合
      handleEscalation(message);
    } else {
      // 通常の回答
      addMessageToChat('assistant', response.content);
      currentConversation.messages.push({
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toISOString()
      });
    }
    
    // ステップを完了に更新
    updateStepIndicator(3);
    
  } catch (error) {
    showLoading(false);
    addMessageToChat('assistant', 'すみません、一時的にサービスに接続できません。しばらく時間をおいてから再度お試しください。');
    console.error('LLM API エラー:', error);
  }
  
  // 会話をローカルストレージに保存
  saveConversation();
}

// チャットにメッセージを追加
function addMessageToChat(role, content) {
  const chatContainer = document.getElementById('chatContainer');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  
  const avatarIcon = role === 'user' ? 'fas fa-user' : 'fas fa-robot';
  const currentTime = new Date().toLocaleTimeString();
  
  messageDiv.innerHTML = `
    <div class="message-avatar">
      <i class="${avatarIcon}"></i>
    </div>
    <div class="message-content">
      <div>${content}</div>
      <div class="message-time">${currentTime}</div>
    </div>
  `;
  
  chatContainer.appendChild(messageDiv);
  
  // スクロールを最下部に移動
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// ローディング表示/非表示
function showLoading(show) {
  const loadingIndicator = document.getElementById('loadingIndicator');
  if (show) {
    loadingIndicator.classList.add('active');
  } else {
    loadingIndicator.classList.remove('active');
  }
}

// LLM回答生成
async function generateResponse(question, tags) {
  // 関連する情報を取得
  const relevantInfo = getRelevantInformation(tags);
  
  // LLMプロンプトを構築
  const prompt = buildPrompt(question, relevantInfo, tags);
  
  // LLM APIを呼び出し
  const apiUrl = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
  const requestData = {
    model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
    temperature: 0.7,
    stream: false,
    max_completion_tokens: 800,
    messages: [
      {
        role: "system",
        content: prompt.system
      },
      {
        role: "user",
        content: prompt.user
      }
    ]
  };
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    const data = await response.json();
    
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      const content = data.choices[0].message.content;
      
      // エスカレーションが必要かチェック
      if (content.includes('[ESCALATION_NEEDED]') || content.includes('管理者に確認')) {
        return { needsEscalation: true, content: null };
      }
      
      return { needsEscalation: false, content: content };
    } else if (data.answer) {
      const content = data.answer;
      
      // エスカレーションが必要かチェック
      if (content.includes('[ESCALATION_NEEDED]') || content.includes('管理者に確認')) {
        return { needsEscalation: true, content: null };
      }
      
      return { needsEscalation: false, content: content };
    } else {
      throw new Error('APIレスポンスが期待される形式ではありません');
    }
  } catch (error) {
    console.error('LLM API呼び出しエラー:', error);
    throw error;
  }
}

// 関連情報の取得
function getRelevantInformation(tags) {
  return systemData.information.filter(info => 
    info.tags.some(tag => tags.includes(tag))
  );
}

// プロンプト構築
function buildPrompt(question, relevantInfo, tags) {
  const tagNames = tags.map(tagId => {
    const tag = systemData.categories.find(t => t.id === tagId);
    return tag ? tag.name : '';
  }).filter(name => name).join('、');
  
  const infoContext = relevantInfo.map(info => 
    `【${info.title}】\n${info.content}\n日付: ${info.date}`
  ).join('\n\n');
  
  const systemPrompt = `あなたは学習塾・学童のコミュニケーション管理システムのアシスタントです。

以下のルールに従って回答してください：

1. 提供された情報の範囲内でのみ回答する
2. 明確で分かりやすい日本語で回答する
3. 丁寧で親しみやすい口調を使う
4. 情報が不足している場合は「[ESCALATION_NEEDED]」を含める
5. 推測や憶測での回答は避ける

選択されたカテゴリー: ${tagNames}

利用可能な情報:
${infoContext || '該当する情報が見つかりませんでした。'}`;

  const userPrompt = `以下の質問に回答してください：

${question}`;

  return {
    system: systemPrompt,
    user: userPrompt
  };
}

// エスカレーション処理
function handleEscalation(question) {
  // エスカレーションメッセージを表示
  addMessageToChat('assistant', 
    'ご質問ありがとうございます。お答えするために管理者に確認いたします。回答まで少しお時間をいただく場合がございますが、後日回答させていただきます。'
  );
  
  // エスカレーションをデータに追加
  const escalation = {
    id: Date.now(),
    question: question,
    tags: [...selectedTags],
    conversationId: currentConversation.id,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  systemData.escalations.push(escalation);
  
  // 会話にもエスカレーション情報を追加
  currentConversation.messages.push({
    role: 'assistant',
    content: 'ご質問ありがとうございます。お答えするために管理者に確認いたします。回答まで少しお時間をいただく場合がございますが、後日回答させていただきます。',
    timestamp: new Date().toISOString(),
    escalated: true
  });
  
  // データを保存
  localStorage.setItem('commToolData', JSON.stringify(systemData));
  saveConversation();
}

// 会話の保存
function saveConversation() {
  if (currentConversation) {
    // 既存の会話を更新または新しい会話を追加
    const existingIndex = systemData.conversations.findIndex(c => c.id === currentConversation.id);
    if (existingIndex >= 0) {
      systemData.conversations[existingIndex] = currentConversation;
    } else {
      systemData.conversations.push(currentConversation);
    }
    
    // データを保存
    localStorage.setItem('commToolData', JSON.stringify(systemData));
  }
}

// タグ選択に戻る
function resetToTagSelection() {
  // 画面を切り替え
  document.getElementById('chatSection').classList.remove('active');
  document.getElementById('tagSelection').classList.add('active');
  
  // ステップインジケーターをリセット
  updateStepIndicator(1);
  
  // チャット履歴をクリア（ウェルカムメッセージ以外）
  const chatContainer = document.getElementById('chatContainer');
  const messages = chatContainer.querySelectorAll('.message');
  messages.forEach((message, index) => {
    if (index > 0) { // 最初のウェルカムメッセージは残す
      message.remove();
    }
  });
  
  // 選択されたタグをクリア
  selectedTags = [];
  currentConversation = null;
  
  // タグボタンの状態をリセット
  const tagButtons = document.querySelectorAll('.tag-button');
  tagButtons.forEach(button => {
    button.classList.remove('selected');
    const tagId = parseInt(button.getAttribute('data-tag-id'));
    const tag = systemData.categories.find(t => t.id === tagId);
    if (tag) {
      button.style.borderColor = tag.color;
      button.style.backgroundColor = '#f8f9fa';
      button.style.color = 'var(--text-primary)';
    }
  });
  
  // 次へボタンを無効化
  document.getElementById('proceedButton').disabled = true;
  
  // メッセージ入力欄をクリア
  document.getElementById('messageInput').value = '';
  document.getElementById('sendButton').disabled = true;
}

// ページ離脱時の処理
window.addEventListener('beforeunload', () => {
  if (currentConversation && currentConversation.messages.length > 0) {
    saveConversation();
  }
});