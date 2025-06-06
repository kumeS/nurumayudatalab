/**
 * コミュニケーション管理ツール - 管理者画面 JavaScript
 */

// データストレージ
let systemData = {
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
      content: "10月15日（土）に運動会を開催いたします。雨天の場合は10月16日（日）に延期となります。",
      tags: [1],
      date: "2024-10-01",
      createdAt: new Date().toISOString()
    }
  ],
  conversations: [],
  escalations: []
};

// ローカルストレージからデータを読み込み
function loadData() {
  const saved = localStorage.getItem('commToolData');
  if (saved) {
    try {
      systemData = { ...systemData, ...JSON.parse(saved) };
    } catch (e) {
      console.error('データの読み込みに失敗しました:', e);
    }
  }
}

// データをローカルストレージに保存
function saveData() {
  localStorage.setItem('commToolData', JSON.stringify(systemData));
}

// タブ機能
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  initializeTabs();
  updateStats();
  renderTags();
  renderInformation();
  renderEscalations();
  renderAnalytics();
  
  // フォームのイベントリスナーを設定
  document.getElementById('infoForm').addEventListener('submit', handleInfoSubmit);
  document.getElementById('tagForm').addEventListener('submit', handleTagSubmit);
});

function initializeTabs() {
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.getAttribute('data-tab');
      
      // すべてのタブとコンテンツの active クラスを削除
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));
      
      // 選択されたタブとコンテンツに active クラスを追加
      tab.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    });
  });
}

// 統計情報の更新
function updateStats() {
  document.getElementById('totalInfo').textContent = systemData.information.length;
  document.getElementById('totalTags').textContent = systemData.categories.length;
  document.getElementById('totalQuestions').textContent = systemData.conversations.length;
  document.getElementById('pendingEscalations').textContent = 
    systemData.escalations.filter(e => e.status === 'pending').length;
}

// タグ選択機能
function updateTagSelect() {
  const select = document.getElementById('tagSelect');
  select.innerHTML = '<option value="">タグを選択</option>';
  
  systemData.categories.forEach(tag => {
    const option = document.createElement('option');
    option.value = tag.id;
    option.textContent = tag.name;
    select.appendChild(option);
  });
}

let selectedTagIds = [];

function addTag() {
  const select = document.getElementById('tagSelect');
  const tagId = parseInt(select.value);
  
  if (tagId && !selectedTagIds.includes(tagId)) {
    selectedTagIds.push(tagId);
    renderSelectedTags();
    select.value = '';
  }
}

function removeTag(tagId) {
  selectedTagIds = selectedTagIds.filter(id => id !== tagId);
  renderSelectedTags();
}

function renderSelectedTags() {
  const container = document.getElementById('selectedTags');
  container.innerHTML = '';
  
  selectedTagIds.forEach(tagId => {
    const tag = systemData.categories.find(t => t.id === tagId);
    if (tag) {
      const chip = document.createElement('div');
      chip.className = 'tag-chip';
      chip.style.backgroundColor = tag.color;
      chip.innerHTML = `
        ${tag.name}
        <span class="remove-tag" onclick="removeTag(${tagId})">×</span>
      `;
      container.appendChild(chip);
    }
  });
}

// 情報管理
function handleInfoSubmit(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const info = {
    id: Date.now(),
    title: formData.get('title'),
    content: formData.get('content'),
    tags: [...selectedTagIds],
    date: formData.get('date'),
    createdAt: new Date().toISOString()
  };
  
  systemData.information.push(info);
  saveData();
  
  // フォームをリセット
  e.target.reset();
  selectedTagIds = [];
  renderSelectedTags();
  
  // 表示を更新
  renderInformation();
  updateStats();
  
  // 成功メッセージ
  showAlert('success', '情報が正常に保存されました。');
}

function renderInformation() {
  const tbody = document.getElementById('infoTableBody');
  tbody.innerHTML = '';
  
  systemData.information.forEach(info => {
    const row = document.createElement('tr');
    
    const tagsHtml = info.tags.map(tagId => {
      const tag = systemData.categories.find(t => t.id === tagId);
      return tag ? `<span class="tag-badge" style="background-color: ${tag.color}">${tag.name}</span>` : '';
    }).join('');
    
    row.innerHTML = `
      <td>${info.title}</td>
      <td>${tagsHtml}</td>
      <td>${info.date}</td>
      <td class="actions">
        <button class="button danger" onclick="deleteInfo(${info.id})">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    
    tbody.appendChild(row);
  });
  
  updateTagSelect();
}

function deleteInfo(id) {
  if (confirm('この情報を削除しますか？')) {
    systemData.information = systemData.information.filter(info => info.id !== id);
    saveData();
    renderInformation();
    updateStats();
    showAlert('success', '情報が削除されました。');
  }
}

// タグ管理
function handleTagSubmit(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const tag = {
    id: Date.now(),
    name: formData.get('name'),
    color: formData.get('color'),
    icon: 'fas fa-tag'
  };
  
  systemData.categories.push(tag);
  saveData();
  
  e.target.reset();
  renderTags();
  updateStats();
  updateTagSelect();
  
  showAlert('success', 'タグが正常に保存されました。');
}

function renderTags() {
  const tbody = document.getElementById('tagTableBody');
  tbody.innerHTML = '';
  
  systemData.categories.forEach(tag => {
    const row = document.createElement('tr');
    
    const usageCount = systemData.information.reduce((count, info) => {
      return count + (info.tags.includes(tag.id) ? 1 : 0);
    }, 0);
    
    row.innerHTML = `
      <td>
        <span class="tag-badge" style="background-color: ${tag.color}">
          ${tag.name}
        </span>
      </td>
      <td>
        <div style="width: 30px; height: 20px; background-color: ${tag.color}; border-radius: 4px;"></div>
      </td>
      <td>${usageCount}</td>
      <td class="actions">
        <button class="button danger" onclick="deleteTag(${tag.id})">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    
    tbody.appendChild(row);
  });
}

function deleteTag(id) {
  // タグが使用されているかチェック
  const isUsed = systemData.information.some(info => info.tags.includes(id));
  
  if (isUsed) {
    if (!confirm('このタグは情報で使用されています。削除しますか？')) {
      return;
    }
    
    // 使用されている情報からタグを削除
    systemData.information.forEach(info => {
      info.tags = info.tags.filter(tagId => tagId !== id);
    });
  }
  
  systemData.categories = systemData.categories.filter(tag => tag.id !== id);
  saveData();
  renderTags();
  renderInformation();
  updateStats();
  updateTagSelect();
  
  showAlert('success', 'タグが削除されました。');
}

// エスカレーション管理
function renderEscalations() {
  const container = document.getElementById('escalationList');
  const pendingEscalations = systemData.escalations.filter(e => e.status === 'pending');
  
  if (pendingEscalations.length === 0) {
    container.innerHTML = `
      <div class="alert info">
        <i class="fas fa-info-circle"></i>
        現在、対応待ちのエスカレーションはありません。
      </div>
    `;
    return;
  }
  
  container.innerHTML = '';
  
  pendingEscalations.forEach(escalation => {
    const item = document.createElement('div');
    item.className = 'escalation-item';
    
    const tags = escalation.tags.map(tagId => {
      const tag = systemData.categories.find(t => t.id === tagId);
      return tag ? `<span class="tag-badge" style="background-color: ${tag.color}">${tag.name}</span>` : '';
    }).join('');
    
    item.innerHTML = `
      <div class="escalation-header">
        <h4>エスカレーション #${escalation.id}</h4>
        <span class="escalation-date">${new Date(escalation.createdAt).toLocaleString()}</span>
      </div>
      <div style="margin-bottom: 0.5rem;">
        <strong>カテゴリー:</strong> ${tags}
      </div>
      <div class="escalation-question">
        <strong>質問:</strong><br>
        ${escalation.question}
      </div>
      <div style="margin-bottom: 1rem;">
        <strong>回答:</strong><br>
        <textarea id="response-${escalation.id}" style="width: 100%; min-height: 100px; padding: 0.5rem; border: 1px solid #e0e0e0; border-radius: 4px;" placeholder="回答を入力してください..."></textarea>
      </div>
      <div style="display: flex; gap: 0.5rem;">
        <button class="button success" onclick="resolveEscalation(${escalation.id})">
          <i class="fas fa-check"></i> 回答して解決
        </button>
        <button class="button" onclick="addToKnowledge(${escalation.id})">
          <i class="fas fa-plus"></i> 情報として追加
        </button>
      </div>
    `;
    
    container.appendChild(item);
  });
}

function resolveEscalation(id) {
  const response = document.getElementById(`response-${id}`).value.trim();
  if (!response) {
    alert('回答を入力してください。');
    return;
  }
  
  const escalation = systemData.escalations.find(e => e.id === id);
  if (escalation) {
    escalation.status = 'resolved';
    escalation.response = response;
    escalation.resolvedAt = new Date().toISOString();
    
    saveData();
    renderEscalations();
    updateStats();
    
    showAlert('success', 'エスカレーションが解決されました。');
  }
}

function addToKnowledge(id) {
  const escalation = systemData.escalations.find(e => e.id === id);
  const response = document.getElementById(`response-${id}`).value.trim();
  
  if (!escalation || !response) {
    alert('回答を入力してください。');
    return;
  }
  
  // 新しい情報として追加
  const info = {
    id: Date.now(),
    title: `FAQ: ${escalation.question.substring(0, 30)}...`,
    content: response,
    tags: escalation.tags,
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  };
  
  systemData.information.push(info);
  
  // エスカレーションを解決済みにマーク
  escalation.status = 'resolved';
  escalation.response = response;
  escalation.resolvedAt = new Date().toISOString();
  escalation.addedToKnowledge = true;
  
  saveData();
  renderEscalations();
  renderInformation();
  updateStats();
  
  showAlert('success', 'エスカレーションが解決され、情報として追加されました。');
}

// 分析機能
function renderAnalytics() {
  // 今週の質問数
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weeklyQuestions = systemData.conversations.filter(conv => 
    new Date(conv.createdAt) >= weekStart
  ).length;
  
  document.getElementById('weeklyQuestions').textContent = weeklyQuestions;
  
  // 回答率
  const totalQuestions = systemData.conversations.length;
  const answeredQuestions = systemData.conversations.filter(conv => 
    conv.messages.some(msg => msg.role === 'assistant')
  ).length;
  const responseRate = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
  
  document.getElementById('responseRate').textContent = responseRate + '%';
  
  // 平均応答時間（仮の計算）
  document.getElementById('avgResponseTime').textContent = '2';
  
  // 人気タグ
  const tagUsage = {};
  systemData.conversations.forEach(conv => {
    conv.tags.forEach(tagId => {
      tagUsage[tagId] = (tagUsage[tagId] || 0) + 1;
    });
  });
  
  const mostUsedTagId = Object.keys(tagUsage).reduce((a, b) => 
    tagUsage[a] > tagUsage[b] ? a : b, Object.keys(tagUsage)[0]
  );
  
  const mostUsedTag = systemData.categories.find(t => t.id == mostUsedTagId);
  document.getElementById('popularTag').textContent = mostUsedTag ? mostUsedTag.name : '-';
  
  // よくある質問
  renderFrequentQuestions();
}

function renderFrequentQuestions() {
  const container = document.getElementById('frequentQuestions');
  
  // 質問の頻度を計算（簡単な実装）
  const questionCounts = {};
  systemData.conversations.forEach(conv => {
    conv.messages.forEach(msg => {
      if (msg.role === 'user') {
        const question = msg.content.toLowerCase();
        questionCounts[question] = (questionCounts[question] || 0) + 1;
      }
    });
  });
  
  const sortedQuestions = Object.entries(questionCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
  
  if (sortedQuestions.length === 0) {
    container.innerHTML = '<p>まだ質問がありません。</p>';
    return;
  }
  
  container.innerHTML = sortedQuestions.map(([question, count]) => `
    <div style="background: #f8f9fa; padding: 1rem; margin-bottom: 0.5rem; border-radius: 8px;">
      <strong>質問:</strong> ${question.substring(0, 100)}${question.length > 100 ? '...' : ''}<br>
      <small style="color: #666;">質問回数: ${count}回</small>
    </div>
  `).join('');
}

// アラート表示
function showAlert(type, message) {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert ${type}`;
  alertDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
  
  document.querySelector('.container').insertBefore(alertDiv, document.querySelector('.stats-grid'));
  
  setTimeout(() => {
    alertDiv.remove();
  }, 3000);
}

// ページ読み込み時に実行
document.addEventListener('DOMContentLoaded', () => {
  // 初期化処理はすでに実行されている
});