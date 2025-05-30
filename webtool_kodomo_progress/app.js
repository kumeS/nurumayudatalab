/**
 * 児童進捗管理ツール JavaScript
 * Kids Progress Manager - MVP版
 * Socket.IO リアルタイム通信対応
 */

// Socket.IO関連変数
let socket = null;
let isConnected = false;
let collaborationMode = false;
let activeUsers = new Set();
let roomId = null;

// グローバル変数
let studentsData = {};
let currentTab = 'students';
let apiKey = '';
let analysisHistory = [];

// 組み込み項目マスターデータ
const builtInFields = {
  learning: {
    category: '学習面',
    icon: 'fas fa-book',
    color: '#4f46e5',
    fields: [
      { name: '今日の理解度', type: 'select', description: '本日の授業内容の理解レベル' },
      { name: '授業参加度', type: 'select', description: '積極的な授業参加の程度' },
      { name: '小テスト結果', type: 'select', description: '小テストや確認テストの結果' },
      { name: '発表・発言', type: 'select', description: '授業中の発表や発言の積極性' },
      { name: 'ノート記録', type: 'select', description: 'ノートの取り方や記録の質' },
      { name: '集中力', type: 'select', description: '授業や作業への集中度' },
      { name: '課題完成度', type: 'select', description: '与えられた課題の完成度' },
      { name: '予習・復習', type: 'select', description: '家庭学習の取り組み状況' }
    ]
  },
  academic: {
    category: '学習・教科',
    icon: 'fas fa-graduation-cap',
    color: '#059669',
    fields: [
      { name: '学習内容', type: 'text', description: '本日学習した具体的な内容や単元' },
      { name: '課題内容', type: 'text', description: '出された宿題や課題の詳細' },
      { name: '受講科目', type: 'text', description: '今日受講した教科・科目' },
      { name: '国語の取り組み', type: 'select', description: '国語授業での取り組み状況' },
      { name: '算数の取り組み', type: 'select', description: '算数授業での取り組み状況' },
      { name: '理科の取り組み', type: 'select', description: '理科授業での取り組み状況' },
      { name: '社会の取り組み', type: 'select', description: '社会授業での取り組み状況' },
      { name: '体育の取り組み', type: 'select', description: '体育授業での取り組み状況' }
    ]
  },
  extracurricular: {
    category: '課外活動',
    icon: 'fas fa-running',
    color: '#0891b2',
    fields: [
      { name: '課外活動参加', type: 'checkbox', description: '課外活動に参加したか' },
      { name: '課外活動内容', type: 'text', description: '参加した課外活動の具体的な内容' },
      { name: '活動での貢献度', type: 'select', description: '課外活動でのチームへの貢献' },
      { name: '新しいスキル習得', type: 'text', description: '課外活動で身につけた新しいスキルや知識' },
      { name: '活動への意欲', type: 'select', description: '課外活動に対する積極性や意欲' },
      { name: '他学年との交流', type: 'select', description: '異なる学年との交流・協力状況' }
    ]
  },
  lifestyle: {
    category: '生活面',
    icon: 'fas fa-user-clock',
    color: '#10b981',
    fields: [
      { name: '身だしなみ', type: 'select', description: '服装や身だしなみの状況' },
      { name: '時間管理', type: 'select', description: '登校時間や提出期限の守り方' },
      { name: '忘れ物', type: 'checkbox', description: '必要な持ち物を忘れていないか' },
      { name: '整理整頓', type: 'select', description: '机やロッカーの整理状況' },
      { name: '健康状態', type: 'select', description: '体調や元気さの程度' },
      { name: '食事・給食', type: 'select', description: '給食や昼食の摂取状況' },
      { name: '睡眠状況', type: 'select', description: '十分な睡眠が取れているか' }
    ]
  },
  social: {
    category: '社会性・友人関係',
    icon: 'fas fa-users',
    color: '#7c3aed',
    fields: [
      { name: '友人関係', type: 'select', description: 'クラスメートとの関係性' },
      { name: '協調性', type: 'select', description: 'グループ活動での協調性' },
      { name: 'リーダーシップ', type: 'select', description: 'リーダーとしての行動力' },
      { name: '思いやり', type: 'select', description: '他者への思いやりや配慮' },
      { name: 'コミュニケーション', type: 'select', description: '適切なコミュニケーション能力' },
      { name: '問題解決', type: 'select', description: 'トラブル時の対応力' }
    ]
  },
  motivation: {
    category: '意欲・態度',
    icon: 'fas fa-fire',
    color: '#f59e0b',
    fields: [
      { name: '学習意欲', type: 'select', description: '学習に対する積極性' },
      { name: '積極性', type: 'select', description: '物事に取り組む積極的な姿勢' },
      { name: '責任感', type: 'select', description: '自分の役割を果たす責任感' },
      { name: '挑戦する姿勢', type: 'select', description: '新しいことへの挑戦意欲' },
      { name: '継続力', type: 'select', description: '最後まで取り組む継続力' },
      { name: '自主性', type: 'select', description: '自分で考えて行動する力' }
    ]
  },
  activities: {
    category: '特別活動',
    icon: 'fas fa-star',
    color: '#ef4444',
    fields: [
      { name: '委員会活動', type: 'select', description: '委員会での活動状況' },
      { name: 'クラブ活動', type: 'select', description: 'クラブや部活動への参加' },
      { name: '行事参加', type: 'select', description: '学校行事への参加度' },
      { name: '係活動', type: 'select', description: 'クラス内での係活動' },
      { name: '清掃活動', type: 'select', description: '掃除時間の取り組み' },
      { name: 'ボランティア', type: 'select', description: 'ボランティア活動への参加' }
    ]
  }
};

// DOMContentLoaded後の初期化
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  initializeSocketIO();
  initializeAnalysisHistory();
});

/**
 * Socket.IO初期化
 */
function initializeSocketIO() {
  try {
    // Socket.IOライブラリが利用可能かチェック
    if (typeof io === 'undefined') {
      console.warn('Socket.IOライブラリが利用できません。シングルユーザーモードで動作します。');
      return;
    }

    // Socket.IOサーバーへの接続（開発環境用）
    socket = io('http://localhost:3000', {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 5
    });

    // 接続イベント
    socket.on('connect', () => {
      console.log('Socket.IO 接続成功');
      isConnected = true;
      updateConnectionStatus(true);
      showAlert('リアルタイム通信が開始されました', 'success');
    });

    // 切断イベント
    socket.on('disconnect', (reason) => {
      console.log('Socket.IO 切断:', reason);
      isConnected = false;
      updateConnectionStatus(false);
      if (reason !== 'io client disconnect') {
        showAlert('リアルタイム通信が切断されました', 'warning');
      }
    });

    // エラーイベント
    socket.on('connect_error', (error) => {
      console.error('Socket.IO 接続エラー:', error);
      isConnected = false;
      updateConnectionStatus(false);
      // サーバーが利用できない場合は静かに失敗
    });

    // 再接続試行イベント
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Socket.IO 再接続試行: ${attemptNumber}`);
    });

    // 再接続失敗イベント
    socket.on('reconnect_failed', () => {
      console.warn('Socket.IO 再接続に失敗しました。オフラインモードで動作します。');
      isConnected = false;
      updateConnectionStatus(false);
    });

    // データ同期イベント
    socket.on('data_updated', (data) => {
      try {
        handleRemoteDataUpdate(data);
      } catch (error) {
        console.error('リモートデータ更新エラー:', error);
      }
    });

    // ユーザー参加/退出イベント
    socket.on('user_joined', (userData) => {
      try {
        handleUserJoined(userData);
      } catch (error) {
        console.error('ユーザー参加処理エラー:', error);
      }
    });

    socket.on('user_left', (userData) => {
      try {
        handleUserLeft(userData);
      } catch (error) {
        console.error('ユーザー退出処理エラー:', error);
      }
    });

    // アクティブユーザー一覧更新
    socket.on('active_users', (users) => {
      try {
        updateActiveUsersList(users);
      } catch (error) {
        console.error('アクティブユーザー更新エラー:', error);
      }
    });

    // リアルタイム編集イベント
    socket.on('field_editing', (data) => {
      try {
        handleFieldEditing(data);
      } catch (error) {
        console.error('フィールド編集処理エラー:', error);
      }
    });

  } catch (error) {
    console.error('Socket.IO初期化エラー:', error);
  }
}

/**
 * Socket.IO接続開始
 */
function connectSocket() {
  if (socket && !isConnected) {
    socket.connect();
  }
}

/**
 * Socket.IO接続切断
 */
function disconnectSocket() {
  if (socket && isConnected) {
    socket.disconnect();
  }
}

/**
 * ルームに参加
 */
function joinRoom(roomName) {
  if (socket && isConnected) {
    roomId = roomName;
    socket.emit('join_room', {
      room: roomName,
      userData: {
        name: getUserName(),
        timestamp: new Date().toISOString()
      }
    });
    collaborationMode = true;
    updateCollaborationUI();
  }
}

/**
 * ルームから退出
 */
function leaveRoom() {
  if (socket && isConnected && roomId) {
    socket.emit('leave_room', { room: roomId });
    roomId = null;
    collaborationMode = false;
    activeUsers.clear();
    updateCollaborationUI();
  }
}

/**
 * データをリアルタイム同期
 */
function syncData(action, data) {
  if (socket && isConnected && collaborationMode) {
    socket.emit('sync_data', {
      room: roomId,
      action: action,
      data: data,
      timestamp: new Date().toISOString(),
      user: getUserName()
    });
  }
}

/**
 * リモートデータ更新の処理
 */
function handleRemoteDataUpdate(updateData) {
  const { action, data, user, timestamp } = updateData;
  
  // 自分が送信したデータは無視
  if (user === getUserName()) return;

  try {
    switch (action) {
      case 'add_student':
        if (!studentsData.students.find(s => s.id === data.id)) {
          studentsData.students.push(data);
          updateUI();
          showAlert(`${user}さんが生徒「${data.name}」を追加しました`, 'info');
        }
        break;
      
      case 'update_student':
        const studentIndex = studentsData.students.findIndex(s => s.id === data.id);
        if (studentIndex !== -1) {
          studentsData.students[studentIndex] = data;
          updateUI();
          showAlert(`${user}さんが生徒「${data.name}」の情報を更新しました`, 'info');
        }
        break;
      
      case 'delete_student':
        studentsData.students = studentsData.students.filter(s => s.id !== data.id);
        updateUI();
        showAlert(`${user}さんが生徒を削除しました`, 'info');
        break;
      
      case 'add_progress':
        const student = studentsData.students.find(s => s.id === data.studentId);
        if (student) {
          student.records.push(data.record);
          updateUI();
          showAlert(`${user}さんが「${student.name}」の進捗を入力しました`, 'info');
        }
        break;
      
      default:
        console.log('未知のアクション:', action);
    }
    
    saveData();
  } catch (error) {
    console.error('リモートデータ更新エラー:', error);
  }
}

/**
 * ユーザー参加の処理
 */
function handleUserJoined(userData) {
  activeUsers.add(userData.name);
  updateActiveUsersList(Array.from(activeUsers));
  showAlert(`${userData.name}さんが参加しました`, 'info');
}

/**
 * ユーザー退出の処理
 */
function handleUserLeft(userData) {
  activeUsers.delete(userData.name);
  updateActiveUsersList(Array.from(activeUsers));
  showAlert(`${userData.name}さんが退出しました`, 'info');
}

/**
 * フィールド編集状態の処理
 */
function handleFieldEditing(data) {
  const { fieldId, isEditing, user } = data;
  
  if (user === getUserName()) return;
  
  const field = document.getElementById(fieldId);
  if (field) {
    if (isEditing) {
      field.classList.add('being-edited');
      field.setAttribute('title', `${user}さんが編集中...`);
    } else {
      field.classList.remove('being-edited');
      field.removeAttribute('title');
    }
  }
}

/**
 * ユーザー名取得
 */
function getUserName() {
  let userName = localStorage.getItem('userName');
  if (!userName) {
    userName = prompt('あなたの名前を入力してください:') || `ユーザー${Math.floor(Math.random() * 1000)}`;
    localStorage.setItem('userName', userName);
  }
  return userName;
}

/**
 * 接続状態表示の更新
 */
function updateConnectionStatus(connected) {
  const statusElement = document.getElementById('connectionStatus');
  if (statusElement) {
    statusElement.innerHTML = connected 
      ? '<i class="fas fa-wifi text-success"></i> オンライン'
      : '<i class="fas fa-wifi-slash text-error"></i> オフライン';
    statusElement.className = connected ? 'status-online' : 'status-offline';
  }
}

/**
 * コラボレーションUI更新
 */
function updateCollaborationUI() {
  const collabSection = document.getElementById('collaborationSection');
  const roomInfo = document.getElementById('roomInfo');
  const activeUsersDiv = document.getElementById('activeUsers');

  if (collaborationMode && roomId) {
    if (roomInfo) roomInfo.textContent = `ルーム: ${roomId}`;
    if (collabSection) collabSection.classList.remove('hidden');
  } else {
    if (collabSection) collabSection.classList.add('hidden');
    if (activeUsersDiv) activeUsersDiv.innerHTML = '';
  }
}

/**
 * アクティブユーザー一覧更新
 */
function updateActiveUsersList(users) {
  const activeUsersDiv = document.getElementById('activeUsers');
  if (activeUsersDiv) {
    activeUsersDiv.innerHTML = users.map(user => 
      `<span class="user-badge ${user === getUserName() ? 'current-user' : ''}">${user}</span>`
    ).join('');
  }
}

/**
 * アプリケーション初期化
 */
function initializeApp() {
  loadData();
  setupEventListeners();
  
  // 保存されたタブ位置を復元（UIアップデート前に実行）
  const savedTab = localStorage.getItem('currentTab');
  currentTab = savedTab || 'students'; // デフォルトは児童管理タブ
  
  // タブ状態を即座に設定（UI更新前）
  setTabStateOnly(currentTab);
  
  updateUI();
  updateStatistics();
}

/**
 * タブ状態のみ設定（UI更新なし）
 */
function setTabStateOnly(tabName) {
  // currentTabグローバル変数も更新
  currentTab = tabName;
  
  // タブボタンの状態更新
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  const targetTab = document.querySelector(`[data-tab="${tabName}"]`);
  if (targetTab) {
    targetTab.classList.add('active');
  }

  // タブコンテンツの表示切り替え
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.add('hidden');
  });
  document.getElementById(`${tabName}-tab`).classList.remove('hidden');
}

/**
 * イベントリスナー設定
 */
function setupEventListeners() {
  // タブ切り替え
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      switchTab(e.target.getAttribute('data-tab'));
    });
  });

  // 検索・フィルター
  document.getElementById('studentSearch').addEventListener('input', filterStudents);
  document.getElementById('gradeFilter').addEventListener('change', filterStudents);
  document.getElementById('classFilter').addEventListener('change', filterStudents);

  // フォーム送信
  document.getElementById('addStudentForm').addEventListener('submit', handleAddStudent);
  document.getElementById('addFieldForm').addEventListener('submit', handleAddField);
  document.getElementById('progressInputForm').addEventListener('submit', handleProgressInput);

  // モーダル外クリックで閉じる
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal.id);
      }
    });
  });
}

/**
 * データ読み込み
 */
function loadData() {
  const savedData = localStorage.getItem('kidsProgressData');
  if (savedData) {
    try {
      studentsData = JSON.parse(savedData);
      // データ構造の互換性チェック
      if (!studentsData.fieldDefinitions || !studentsData.students) {
        throw new Error('Invalid data structure');
      }
    } catch (error) {
      console.error('データ読み込みエラー:', error);
      showAlert('保存データの読み込みに失敗しました。初期化します。', 'warning');
      initializeDefaultData();
    }
  } else {
    initializeDefaultData();
  }
}

/**
 * デフォルトデータ初期化
 */
function initializeDefaultData() {
  studentsData = {
    students: [],
    fieldDefinitions: [
      { id: 'taskContent', name: '実施課題', type: 'text', options: [], required: true },
      { id: 'learningStatus', name: '学習状況', type: 'select', options: ['1', '2', '3', '4', '5'], required: false },
      { id: 'motivation', name: '学習意欲', type: 'select', options: ['1', '2', '3', '4', '5'], required: false },
      { id: 'homework', name: '宿題提出', type: 'checkbox', options: [], required: false }
    ]
  };
  saveData();
}

/**
 * データ保存
 */
function saveData() {
  try {
    const dataString = JSON.stringify(studentsData);
    localStorage.setItem('kidsProgressData', dataString);
  } catch (error) {
    console.error('データ保存エラー:', error);
    if (error.name === 'QuotaExceededError') {
      showAlert('ストレージ容量が不足しています。古いデータを削除してください。', 'error');
    } else {
      showAlert('データの保存に失敗しました', 'error');
    }
  }
}

/**
 * タブ切り替え
 */
function switchTab(tabName) {
  currentTab = tabName;
  
  // タブ位置をlocalStorageに保存
  localStorage.setItem('currentTab', tabName);

  // タブボタンの状態更新
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  // タブコンテンツの表示切り替え
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.add('hidden');
  });
  document.getElementById(`${tabName}-tab`).classList.remove('hidden');

  // タブ固有の処理
  switch (tabName) {
    case 'overview':
      updateProgressTable();
      break;
    case 'input':
      updateStudentSelect();
      updateInputFields();
      break;
    case 'students':
      updateStudentsTable();
      break;
    case 'settings':
      updateFieldSettings();
      break;
  }
}

/**
 * 進捗表の更新
 */
function updateProgressTable() {
  const tbody = document.getElementById('progressTableBody');
  const thead = document.querySelector('#progressTableHead tr');
  
  // テーブルヘッダーを動的に生成
  if (thead) {
    thead.innerHTML = `
      <th style="position: sticky; left: 0; background: var(--bg-secondary); z-index: 11; box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1); min-width: 120px;">氏名</th>
      <th style="min-width: 100px;">在籍番号</th>
      <th style="min-width: 80px;">学年</th>
      <th style="min-width: 80px;">クラス</th>
      ${studentsData.fieldDefinitions.map(field => 
        `<th style="min-width: 120px;">${field.name}</th>`
      ).join('')}
      <th style="min-width: 120px;">最終更新</th>
      <th style="min-width: 180px;">操作</th>
    `;
  }
  
  tbody.innerHTML = '';

  studentsData.students.forEach(student => {
    const row = createProgressTableRow(student);
    tbody.appendChild(row);
  });
}

/**
 * 進捗表の行作成（動的項目対応版）
 */
function createProgressTableRow(student) {
  const row = document.createElement('tr');
  
  // 最新のレコードを取得
  const latestRecord = student.records.length > 0 ? student.records[student.records.length - 1] : null;
  
  // 個別AI分析結果があるかチェック
  const hasAIAnalysis = latestRecord && latestRecord.aiSummary;
  
  // 操作ボタンを作成
  let actionButtons = `
    <button class="btn btn-primary" onclick="viewStudentProgress('${student.id}')" style="margin-right: 0.5rem;">
      <i class="fas fa-chart-line"></i> 履歴
    </button>
  `;
  
  // AI分析結果がある場合は詳細ボタンを追加
  if (hasAIAnalysis) {
    actionButtons += `
    <button class="btn btn-success" onclick="viewIndividualAnalysisDetail('${student.id}')" style="font-size: 0.8rem;">
      <i class="fas fa-brain"></i> AI分析詳細
    </button>
    `;
  }
  
  // 動的項目の値を生成
  const dynamicFields = studentsData.fieldDefinitions.map(field => 
    `<td>${getFieldValue(latestRecord, field.id)}</td>`
  ).join('');
  
  // 基本情報
  row.innerHTML = `
    <td class="sticky-column" style="min-width: 120px;">${student.name}</td>
    <td>${student.studentNumber}</td>
    <td>${student.grade}年生</td>
    <td>${student.class || '-'}</td>
    ${dynamicFields}
    <td>${latestRecord ? formatDate(latestRecord.timestamp) : '-'}</td>
    <td style="min-width: 180px;">
      ${actionButtons}
    </td>
  `;
  
  return row;
}

/**
 * 分析詳細表示モーダル（共通関数）
 */
function showAnalysisDetail({ title, content, analysisDate, studentName = '', type = 'overall' }) {
  // 既存のモーダルがあれば削除
  const existingModal = document.getElementById('analysisDetailModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // 新しいモーダルを作成
  const modal = document.createElement('div');
  modal.id = 'analysisDetailModal';
  modal.className = 'modal show';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 1000px; max-height: 90vh; overflow-y: auto;">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" onclick="closeAnalysisDetailModal()">&times;</button>
      </div>
      <div style="margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--bg-secondary); border-radius: 8px; margin-bottom: 1rem;">
          <div>
            <strong style="color: var(--primary);">分析日時:</strong> ${analysisDate}
          </div>
          ${studentName ? `<div><strong style="color: var(--secondary);">対象児童:</strong> ${studentName}</div>` : ''}
          <div>
            <span class="btn ${type === 'overall' ? 'btn-primary' : 'btn-success'}" style="padding: 0.25rem 0.75rem; font-size: 0.8rem;">
              ${type === 'overall' ? '全体分析' : '個別分析'}
            </span>
          </div>
        </div>
        <div class="analysis-content analysis-content-detail" style="background: white; padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border); line-height: 1.8;">
          ${formatAnalysisContent(content)}
        </div>
      </div>
      <div style="text-align: center;">
        <button class="btn btn-secondary" onclick="closeAnalysisDetailModal()">
          <i class="fas fa-times"></i> 閉じる
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

/**
 * 分析詳細モーダルを閉じる
 */
function closeAnalysisDetailModal() {
  const modal = document.getElementById('analysisDetailModal');
  if (modal) {
    modal.remove();
  }
}

/**
 * フィールド値の取得・表示
 */
function getFieldValue(record, fieldId) {
  if (!record || !record.data || !record.data[fieldId]) {
    return '-';
  }
  
  const field = studentsData.fieldDefinitions.find(f => f.id === fieldId);
  const value = record.data[fieldId];
  
  if (field?.type === 'select') {
    return `${value}/5`;
  } else if (field?.type === 'checkbox') {
    return value ? '✓' : '✗';
  } else if (field?.type === 'text') {
    // テキストが長い場合は省略表示
    return value.length > 20 ? value.substring(0, 20) + '...' : value;
  }
  
  return value;
}

/**
 * 設定項目の表示更新
 */
function updateFieldSettings() {
  const container = document.getElementById('fieldSettings');
  if (!container) return;

  container.innerHTML = '';

  if (!studentsData.fieldDefinitions || studentsData.fieldDefinitions.length === 0) {
    container.innerHTML = `
      <div class="alert alert-info">
        <i class="fas fa-info-circle"></i>
        まだ入力項目が設定されていません。組み込み項目から選択するか、カスタム項目を追加してください。
      </div>
    `;
    return;
  }

  studentsData.fieldDefinitions.forEach((field, index) => {
    const fieldCard = document.createElement('div');
    fieldCard.className = 'card';
    fieldCard.style.marginBottom = '0.5rem';
    fieldCard.innerHTML = `
      <div class="flex justify-between items-center">
        <div>
          <strong>${field.name}</strong>
          <span class="text-secondary">(${getFieldTypeLabel(field.type)})</span>
          ${field.required ? '<span class="text-error">*必須</span>' : ''}
        </div>
        <button class="btn btn-error" onclick="removeField(${index})" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">
          <i class="fas fa-trash"></i> 削除
        </button>
      </div>
    `;
    container.appendChild(fieldCard);
  });

  // 組み込み項目表示も更新
  updateBuiltInFieldsDisplay();
}

/**
 * 組み込み項目の表示更新
 */
function updateBuiltInFieldsDisplay() {
  const container = document.getElementById('builtInFieldsContainer');
  if (!container) return;

  container.innerHTML = '';

  Object.keys(builtInFields).forEach(categoryKey => {
    const category = builtInFields[categoryKey];
    
    const categoryCard = document.createElement('div');
    categoryCard.className = 'card';
    categoryCard.style.marginBottom = '1rem';
    categoryCard.innerHTML = `
      <div style="border-left: 4px solid ${category.color}; padding-left: 1rem;">
        <div style="display: flex; align-items: center; margin-bottom: 1rem;">
          <i class="${category.icon}" style="color: ${category.color}; font-size: 1.5rem; margin-right: 0.75rem;"></i>
          <h5 style="margin: 0; color: ${category.color}; font-weight: 600; font-size: 1.1rem;">
            ${category.category}
          </h5>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 0.75rem;">
          ${category.fields.map(field => {
            const isAdded = studentsData.fieldDefinitions?.some(f => f.name === field.name);
            return `
              <div style="background: rgba(${hexToRgb(category.color)}, 0.05); padding: 0.75rem; border-radius: 6px; border: 1px solid rgba(${hexToRgb(category.color)}, 0.2);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                  <strong style="color: var(--text-primary); font-size: 0.9rem;">${field.name}</strong>
                  <button class="btn ${isAdded ? 'btn-secondary' : 'btn-primary'}" 
                          onclick="addBuiltInField('${categoryKey}', '${field.name}')" 
                          style="padding: 0.25rem 0.5rem; font-size: 0.8rem;"
                          ${isAdded ? 'disabled' : ''}>
                    ${isAdded ? '追加済み' : '追加'}
                  </button>
                </div>
                <p style="margin: 0; color: var(--text-secondary); font-size: 0.8rem; line-height: 1.4;">
                  ${field.description}
                </p>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    container.appendChild(categoryCard);
  });
}

/**
 * 組み込み項目を追加
 */
function addBuiltInField(categoryKey, fieldName) {
  const category = builtInFields[categoryKey];
  const field = category.fields.find(f => f.name === fieldName);
  
  if (!field) {
    showAlert('項目が見つかりません', 'error');
    return;
  }

  // 既に追加済みかチェック
  if (studentsData.fieldDefinitions.some(f => f.name === field.name)) {
    showAlert('この項目は既に追加されています', 'warning');
    return;
  }

  // 新しいフィールド定義を作成
  const newField = {
    id: generateFieldId(field.name),
    name: field.name,
    type: field.type,
    options: field.type === 'select' ? ['1', '2', '3', '4', '5'] : [],
    required: false
  };

  // フィールド定義に追加
  studentsData.fieldDefinitions.push(newField);
  
  // データ保存
  saveData();
  
  // リアルタイム同期
  syncData('add_field', newField);
  
  // UI更新
  updateFieldSettings();
  updateProgressTable();
  updateInputFields();
  
  showAlert(`「${field.name}」を追加しました`, 'success');
}

/**
 * フィールドIDを生成
 */
function generateFieldId(name) {
  // 日本語名を英数字IDに変換
  const baseId = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'field';
  let id = baseId;
  let counter = 1;
  
  // 重複チェック
  while (studentsData.fieldDefinitions.some(f => f.id === id)) {
    id = baseId + counter;
    counter++;
  }
  
  return id;
}

/**
 * フィールドタイプのラベル取得
 */
function getFieldTypeLabel(type) {
  switch (type) {
    case 'select': return '5段階評価';
    case 'text': return '自由記述';
    case 'number': return '数値入力';
    case 'checkbox': return 'チェックボックス';
    default: return type;
  }
}

/**
 * フィールド削除
 */
function removeField(index) {
  if (!confirm('この項目を削除しますか？')) return;
  
  const removedField = studentsData.fieldDefinitions[index];
  studentsData.fieldDefinitions.splice(index, 1);
  
  // データ保存
  saveData();
  
  // リアルタイム同期
  syncData('remove_field', { index, field: removedField });
  
  // UI更新
  updateFieldSettings();
  updateProgressTable();
  updateInputFields();
  
  showAlert(`「${removedField.name}」を削除しました`, 'success');
}

/**
 * 16進数カラーコードをRGBに変換
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? 
    `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
    '0, 0, 0';
}

/**
 * モーダルを開く
 */
function openAddFieldModal() {
  document.getElementById('addFieldModal').classList.add('show');
}

/**
 * モーダルを閉じる
 */
function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('show');
} 

/**
 * UI全体更新
 */
function updateUI() {
  // 現在のタブに応じて必要な更新を実行
  switch (currentTab) {
    case 'students':
      updateStudentsTable();
      break;
    case 'input':
      updateStudentSelect();
      updateInputFields();
      break;
    case 'overview':
      updateProgressTable();
      break;
    case 'settings':
      updateFieldSettings();
      updateStudentManagementSettings();
      break;
  }
  updateStatistics();
}

/**
 * アラート表示
 */
function showAlert(message, type = 'info') {
  const container = document.getElementById('alertContainer');
  if (!container) return;

  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.innerHTML = `
    <i class="fas ${getAlertIcon(type)}"></i>
    ${message}
    <button onclick="this.parentElement.remove()" style="float: right; background: none; border: none; font-size: 1.2rem; cursor: pointer;">&times;</button>
  `;
  
  container.appendChild(alert);
  
  // 5秒後に自動削除
  setTimeout(() => {
    if (alert.parentElement) {
      alert.remove();
    }
  }, 5000);
}

/**
 * アラートアイコン取得
 */
function getAlertIcon(type) {
  switch (type) {
    case 'success': return 'fa-check-circle';
    case 'error': return 'fa-exclamation-circle';
    case 'warning': return 'fa-exclamation-triangle';
    default: return 'fa-info-circle';
  }
}

/**
 * 入力フィールド更新
 */
function updateInputFields() {
  const container = document.getElementById('inputFields');
  if (!container) return;

  container.innerHTML = '';

  if (!studentsData.fieldDefinitions || studentsData.fieldDefinitions.length === 0) {
    container.innerHTML = `
      <div class="alert alert-warning">
        <i class="fas fa-exclamation-triangle"></i>
        入力項目が設定されていません。設定タブで項目を追加してください。
      </div>
    `;
    return;
  }

  studentsData.fieldDefinitions.forEach(field => {
    const fieldGroup = document.createElement('div');
    fieldGroup.className = 'form-group';
    
    let fieldInput = '';
    switch (field.type) {
      case 'select':
        fieldInput = `
          <select id="input_${field.id}" class="form-select" ${field.required ? 'required' : ''}>
            <option value="">選択してください</option>
            ${field.options.map(option => `<option value="${option}">${option}</option>`).join('')}
          </select>
        `;
        break;
      case 'text':
        fieldInput = `
          <input type="text" id="input_${field.id}" class="form-input" ${field.required ? 'required' : ''}>
        `;
        break;
      case 'number':
        fieldInput = `
          <input type="number" id="input_${field.id}" class="form-input" ${field.required ? 'required' : ''}>
        `;
        break;
      case 'checkbox':
        fieldInput = `
          <input type="checkbox" id="input_${field.id}" ${field.required ? 'required' : ''}>
        `;
        break;
    }
    
    fieldGroup.innerHTML = `
      <label class="form-label">
        ${field.name}${field.required ? ' *' : ''}
      </label>
      ${fieldInput}
    `;
    
    container.appendChild(fieldGroup);
  });
}

/**
 * 児童選択更新
 */
function updateStudentSelect() {
  const select = document.getElementById('studentSelect');
  if (!select) return;

  const currentValue = select.value;
  select.innerHTML = '<option value="">児童を選択してください</option>';
  
  if (studentsData.students) {
    studentsData.students.forEach(student => {
      const option = document.createElement('option');
      option.value = student.id;
      option.textContent = `${student.name} (${student.grade}年 ${student.class || ''})`;
      select.appendChild(option);
    });
  }
  
  // 前の選択を復元
  if (currentValue) {
    select.value = currentValue;
  }
}

/**
 * 児童テーブル更新
 */
function updateStudentsTable() {
  const tbody = document.getElementById('studentsTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!studentsData.students || studentsData.students.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
          <i class="fas fa-users" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
          まだ児童が登録されていません。「新規追加」ボタンから児童を追加してください。
        </td>
      </tr>
    `;
    return;
  }

  studentsData.students.forEach(student => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${student.name}</td>
      <td>${student.studentNumber}</td>
      <td>${student.grade}年生</td>
      <td>${student.class || '-'}</td>
      <td>${formatDate(student.createdAt || new Date().toISOString())}</td>
      <td>${student.records ? student.records.length : 0}</td>
      <td>
        <button class="btn btn-primary" onclick="editStudent('${student.id}')" style="margin-right: 0.5rem;">
          <i class="fas fa-edit"></i> 編集
        </button>
        <span style="color: var(--text-secondary); font-size: 0.9rem;">
          削除は設定タブで行えます
        </span>
      </td>
    `;
    tbody.appendChild(row);
  });
}

/**
 * 統計情報更新
 */
function updateStatistics() {
  // 登録児童数
  const totalStudentsElem = document.getElementById('totalStudents');
  if (totalStudentsElem) {
    totalStudentsElem.textContent = studentsData.students ? studentsData.students.length : 0;
  }

  // 今日の入力数
  const todayInputsElem = document.getElementById('todayInputs');
  if (todayInputsElem) {
    const today = new Date().toISOString().split('T')[0];
    let todayCount = 0;
    
    if (studentsData.students) {
      studentsData.students.forEach(student => {
        if (student.records) {
          todayCount += student.records.filter(record => 
            record.timestamp.startsWith(today)
          ).length;
        }
      });
    }
    
    todayInputsElem.textContent = todayCount;
  }

  // 未入力項目数（簡易計算）
  const missingInputsElem = document.getElementById('missingInputs');
  if (missingInputsElem) {
    const fieldCount = studentsData.fieldDefinitions ? studentsData.fieldDefinitions.length : 0;
    const studentCount = studentsData.students ? studentsData.students.length : 0;
    const totalExpected = fieldCount * studentCount;
    
    let actualInputs = 0;
    if (studentsData.students) {
      studentsData.students.forEach(student => {
        if (student.records && student.records.length > 0) {
          const latestRecord = student.records[student.records.length - 1];
          if (latestRecord.data) {
            actualInputs += Object.keys(latestRecord.data).length;
          }
        }
      });
    }
    
    missingInputsElem.textContent = Math.max(0, totalExpected - actualInputs);
  }
}

/**
 * 日付フォーマット
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * フォームクリア
 */
function clearForm() {
  document.getElementById('progressInputForm').reset();
}

/**
 * テーブル更新
 */
function refreshTable() {
  updateUI();
  showAlert('データを更新しました', 'success');
}

/**
 * 児童追加フォーム処理
 */
function handleAddStudent(event) {
  event.preventDefault();
  
  try {
    const name = document.getElementById('studentName').value.trim();
    const studentNumber = document.getElementById('studentNumber').value.trim();
    const grade = document.getElementById('studentGrade').value;
    const studentClass = document.getElementById('studentClass').value.trim();
    
    // バリデーション
    if (!name || !studentNumber || !grade) {
      showAlert('必須項目を入力してください', 'error');
      return;
    }
    
    if (name.length > 50) {
      showAlert('氏名は50文字以内で入力してください', 'error');
      return;
    }
    
    if (studentNumber.length > 20) {
      showAlert('在籍番号は20文字以内で入力してください', 'error');
      return;
    }
    
    // 重複チェック
    if (studentsData.students.some(s => s.studentNumber === studentNumber)) {
      showAlert('この在籍番号は既に登録されています', 'error');
      return;
    }
    
    const newStudent = {
      id: generateStudentId(),
      name,
      studentNumber,
      grade: parseInt(grade),
      class: studentClass,
      records: [],
      createdAt: new Date().toISOString()
    };
    
    studentsData.students.push(newStudent);
    saveData();
    syncData('add_student', newStudent);
    
    // フォームリセット
    document.getElementById('addStudentForm').reset();
    closeModal('addStudentModal');
    
    updateUI();
    showAlert(`${name}さんを追加しました`, 'success');
  } catch (error) {
    console.error('児童追加エラー:', error);
    showAlert('児童の追加に失敗しました', 'error');
  }
}

/**
 * フィールド追加フォーム処理
 */
function handleAddField(event) {
  event.preventDefault();
  
  const name = document.getElementById('fieldName').value;
  const type = document.getElementById('fieldType').value;
  const required = document.getElementById('fieldRequired').checked;
  
  if (!name || !type) {
    showAlert('必須項目を入力してください', 'error');
    return;
  }
  
  // 重複チェック
  if (studentsData.fieldDefinitions.some(f => f.name === name)) {
    showAlert('この項目名は既に存在します', 'error');
    return;
  }
  
  const newField = {
    id: generateFieldId(name),
    name,
    type,
    options: type === 'select' ? ['1', '2', '3', '4', '5'] : [],
    required
  };
  
  studentsData.fieldDefinitions.push(newField);
  saveData();
  syncData('add_field', newField);
  
  // フォームリセット
  document.getElementById('addFieldForm').reset();
  closeModal('addFieldModal');
  
  updateUI();
  showAlert(`「${name}」項目を追加しました`, 'success');
}

/**
 * 進捗入力フォーム処理
 */
function handleProgressInput(event) {
  event.preventDefault();
  
  const studentId = document.getElementById('studentSelect').value;
  const notes = document.getElementById('notesInput').value;
  
  if (!studentId) {
    showAlert('児童を選択してください', 'error');
    return;
  }
  
  const student = studentsData.students.find(s => s.id === studentId);
  if (!student) {
    showAlert('選択された児童が見つかりません', 'error');
    return;
  }
  
  // フィールドデータ収集
  const data = {};
  let hasData = false;
  
  studentsData.fieldDefinitions.forEach(field => {
    const element = document.getElementById(`input_${field.id}`);
    if (element) {
      let value = null;
      
      if (field.type === 'checkbox') {
        value = element.checked;
        hasData = true;
      } else if (element.value.trim()) {
        value = element.value.trim();
        hasData = true;
      }
      
      if (value !== null) {
        data[field.id] = value;
      }
    }
  });
  
  if (!hasData && !notes.trim()) {
    showAlert('少なくとも1つの項目を入力してください', 'error');
    return;
  }
  
  const record = {
    timestamp: new Date().toISOString(),
    data,
    notes: notes.trim() || null
  };
  
  student.records.push(record);
  saveData();
  syncData('add_progress', { studentId, record });
  
  // フォームリセット
  document.getElementById('progressInputForm').reset();
  
  updateUI();
  showAlert(`${student.name}さんの進捗を記録しました`, 'success');
}

/**
 * 学生ID生成
 */
function generateStudentId() {
  return 'student_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * 児童削除
 */
function deleteStudent(studentId) {
  const student = studentsData.students.find(s => s.id === studentId);
  if (!student) return;
  
  if (!confirm(`${student.name}さんを削除しますか？\nこの操作は取り消せません。`)) {
    return;
  }
  
  studentsData.students = studentsData.students.filter(s => s.id !== studentId);
  saveData();
  syncData('delete_student', { id: studentId });
  
  updateUI();
  showAlert(`${student.name}さんを削除しました`, 'success');
}

/**
 * 児童編集（簡易実装）
 */
function editStudent(studentId) {
  showAlert('編集機能は今後実装予定です', 'info');
}

/**
 * 児童追加モーダル表示
 */
function openAddStudentModal() {
  document.getElementById('addStudentModal').classList.add('show');
}

/**
 * 一括入力モーダル表示（簡易実装）
 */
function openBulkInputModal() {
  showAlert('一括入力機能は今後実装予定です', 'info');
}

/**
 * データエクスポート
 */
function exportData() {
  // AI分析履歴も含めた完全なデータセットを作成
  const completeData = {
    ...studentsData,
    analysisHistory: analysisHistory || []
  };
  
  const dataStr = JSON.stringify(completeData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `kids_progress_data_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  
  showAlert('データをエクスポートしました（AI分析履歴含む）', 'success');
}

/**
 * データインポート
 */
function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const importedData = JSON.parse(e.target.result);
        
        // データ構造の検証
        if (!importedData.students || !importedData.fieldDefinitions) {
          throw new Error('無効なデータ形式です');
        }
        
        // インポート方式の選択モーダルを表示
        showImportOptionsModal(importedData);
        
      } catch (error) {
        console.error('インポートエラー:', error);
        showAlert('データのインポートに失敗しました: ' + error.message, 'error');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

/**
 * インポートオプションモーダル表示
 */
function showImportOptionsModal(importedData) {
  // 重複データの分析
  const duplicateAnalysis = analyzeDataDuplicates(importedData);
  
  // 既存のモーダルがあれば削除
  const existingModal = document.getElementById('importOptionsModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // 新しいモーダルを作成
  const modal = document.createElement('div');
  modal.id = 'importOptionsModal';
  modal.className = 'modal show';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 700px;">
      <div class="modal-header">
        <h3 class="modal-title">📥 データインポート設定</h3>
        <button class="modal-close" onclick="closeImportOptionsModal()">&times;</button>
      </div>
      <div style="margin-bottom: 1.5rem;">
        <div style="background: var(--bg-secondary); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
          <h4 style="margin: 0 0 0.5rem 0; color: var(--primary);">📊 インポート対象データ</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
            <div>
              <strong>児童数:</strong> ${importedData.students.length}名
            </div>
            <div>
              <strong>項目数:</strong> ${importedData.fieldDefinitions.length}項目
            </div>
          </div>
        </div>
        
        ${duplicateAnalysis.duplicateStudents.length > 0 ? `
        <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
          <h4 style="margin: 0 0 0.5rem 0; color: #92400e;">⚠️ 重複データが検出されました</h4>
          <div style="font-size: 0.9rem; color: #92400e;">
            <strong>重複する児童:</strong> ${duplicateAnalysis.duplicateStudents.length}名<br>
            <strong>重複する項目:</strong> ${duplicateAnalysis.duplicateFields.length}項目
          </div>
        </div>
        ` : ''}
        
        <div style="margin-bottom: 1rem;">
          <h4 style="margin: 0 0 1rem 0; color: var(--text-primary);">インポート方式を選択してください</h4>
          
          <div style="margin-bottom: 1rem;">
            <label style="display: flex; align-items: center; cursor: pointer; padding: 0.75rem; border: 2px solid var(--border); border-radius: 8px; transition: all 0.3s ease;">
              <input type="radio" name="importMode" value="replace" style="margin-right: 0.75rem;" checked>
              <div>
                <div style="font-weight: 600; color: var(--error);">🔄 完全置換</div>
                <div style="font-size: 0.9rem; color: var(--text-secondary);">既存のすべてのデータを削除し、インポートデータに置き換えます</div>
              </div>
            </label>
          </div>
          
          <div style="margin-bottom: 1rem;">
            <label style="display: flex; align-items: center; cursor: pointer; padding: 0.75rem; border: 2px solid var(--border); border-radius: 8px; transition: all 0.3s ease;">
              <input type="radio" name="importMode" value="merge" style="margin-right: 0.75rem;">
              <div>
                <div style="font-weight: 600; color: var(--primary);">➕ マージ（統合）</div>
                <div style="font-size: 0.9rem; color: var(--text-secondary);">既存データを保持し、新しいデータを追加します（重複処理あり）</div>
              </div>
            </label>
          </div>
          
          <div style="margin-bottom: 1rem;">
            <label style="display: flex; align-items: center; cursor: pointer; padding: 0.75rem; border: 2px solid var(--border); border-radius: 8px; transition: all 0.3s ease;">
              <input type="radio" name="importMode" value="add_only" style="margin-right: 0.75rem;">
              <div>
                <div style="font-weight: 600; color: var(--success);">📝 新規追加のみ</div>
                <div style="font-size: 0.9rem; color: var(--text-secondary);">重複しない新しいデータのみを追加します</div>
              </div>
            </label>
          </div>
        </div>
        
        <div style="margin-bottom: 1rem;">
          <h4 style="margin: 0 0 0.5rem 0; color: var(--text-primary);">重複データの処理方法</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
            <label style="display: flex; align-items: center; cursor: pointer;">
              <input type="radio" name="duplicateMode" value="skip" style="margin-right: 0.5rem;" checked>
              <span style="font-size: 0.9rem;">重複をスキップ</span>
            </label>
            <label style="display: flex; align-items: center; cursor: pointer;">
              <input type="radio" name="duplicateMode" value="update" style="margin-right: 0.5rem;">
              <span style="font-size: 0.9rem;">既存データを更新</span>
            </label>
          </div>
        </div>
      </div>
      
      <div style="display: flex; gap: 1rem; justify-content: flex-end;">
        <button class="btn btn-secondary" onclick="closeImportOptionsModal()">
          キャンセル
        </button>
        <button class="btn btn-primary" onclick="executeImport()">
          <i class="fas fa-download"></i> インポート実行
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // スタイル調整
  modal.querySelectorAll('label').forEach(label => {
    label.addEventListener('mouseenter', () => {
      label.style.borderColor = 'var(--primary)';
      label.style.backgroundColor = 'rgba(79, 70, 229, 0.05)';
    });
    label.addEventListener('mouseleave', () => {
      if (!label.querySelector('input').checked) {
        label.style.borderColor = 'var(--border)';
        label.style.backgroundColor = 'transparent';
      }
    });
    label.querySelector('input').addEventListener('change', () => {
      modal.querySelectorAll('label').forEach(l => {
        l.style.borderColor = 'var(--border)';
        l.style.backgroundColor = 'transparent';
      });
      if (label.querySelector('input').checked) {
        label.style.borderColor = 'var(--primary)';
        label.style.backgroundColor = 'rgba(79, 70, 229, 0.05)';
      }
    });
  });
  
  // 初期選択の表示更新
  const checkedLabel = modal.querySelector('input[checked]').closest('label');
  checkedLabel.style.borderColor = 'var(--primary)';
  checkedLabel.style.backgroundColor = 'rgba(79, 70, 229, 0.05)';
  
  // グローバル変数に保存（実行時に使用）
  window.pendingImportData = importedData;
}

/**
 * 重複データの分析
 */
function analyzeDataDuplicates(importedData) {
  const duplicateStudents = [];
  const duplicateFields = [];
  
  // 児童の重複チェック（在籍番号で判定）
  importedData.students.forEach(importStudent => {
    const existingStudent = studentsData.students.find(s => 
      s.studentNumber === importStudent.studentNumber
    );
    if (existingStudent) {
      duplicateStudents.push({
        import: importStudent,
        existing: existingStudent
      });
    }
  });
  
  // 項目の重複チェック（項目名で判定）
  importedData.fieldDefinitions.forEach(importField => {
    const existingField = studentsData.fieldDefinitions.find(f => 
      f.name === importField.name
    );
    if (existingField) {
      duplicateFields.push({
        import: importField,
        existing: existingField
      });
    }
  });
  
  return {
    duplicateStudents,
    duplicateFields
  };
}

/**
 * インポートオプションモーダルを閉じる
 */
function closeImportOptionsModal() {
  const modal = document.getElementById('importOptionsModal');
  if (modal) {
    modal.remove();
  }
  window.pendingImportData = null;
}

/**
 * インポート実行
 */
function executeImport() {
  if (!window.pendingImportData) return;
  
  try {
    const modal = document.getElementById('importOptionsModal');
    const importMode = modal.querySelector('input[name="importMode"]:checked').value;
    const duplicateMode = modal.querySelector('input[name="duplicateMode"]:checked').value;
    
    const importedData = window.pendingImportData;
    let result = { added: 0, updated: 0, skipped: 0, fieldsAdded: 0, fieldsUpdated: 0 };
    
    switch (importMode) {
      case 'replace':
        result = performReplaceImport(importedData);
        break;
      case 'merge':
        result = performMergeImport(importedData, duplicateMode);
        break;
      case 'add_only':
        result = performAddOnlyImport(importedData);
        break;
    }
    
    saveData();
    updateUI();
    closeImportOptionsModal();
    
    showImportResultMessage(result, importMode);
    
  } catch (error) {
    console.error('インポート実行エラー:', error);
    showAlert('インポートの実行に失敗しました: ' + error.message, 'error');
  }
}

/**
 * 完全置換インポート
 */
function performReplaceImport(importedData) {
  // AI分析履歴も含めて完全置換
  studentsData = {
    students: importedData.students || [],
    fieldDefinitions: importedData.fieldDefinitions || []
  };
  
  // AI分析履歴の処理
  if (importedData.analysisHistory) {
    analysisHistory = importedData.analysisHistory;
    localStorage.setItem('analysisHistory', JSON.stringify(analysisHistory));
  } else {
    analysisHistory = [];
    localStorage.removeItem('analysisHistory');
  }
  
  return {
    added: studentsData.students.length,
    updated: 0,
    skipped: 0,
    fieldsAdded: studentsData.fieldDefinitions.length,
    fieldsUpdated: 0
  };
}

/**
 * マージインポート
 */
function performMergeImport(importedData, duplicateMode) {
  const result = { added: 0, updated: 0, skipped: 0, fieldsAdded: 0, fieldsUpdated: 0 };
  
  // 項目のマージ
  importedData.fieldDefinitions.forEach(importField => {
    const existingFieldIndex = studentsData.fieldDefinitions.findIndex(f => 
      f.name === importField.name
    );
    
    if (existingFieldIndex !== -1) {
      if (duplicateMode === 'update') {
        studentsData.fieldDefinitions[existingFieldIndex] = {
          ...studentsData.fieldDefinitions[existingFieldIndex],
          ...importField
        };
        result.fieldsUpdated++;
      } else {
        result.skipped++;
      }
    } else {
      studentsData.fieldDefinitions.push(importField);
      result.fieldsAdded++;
    }
  });
  
  // 児童のマージ
  importedData.students.forEach(importStudent => {
    const existingStudentIndex = studentsData.students.findIndex(s => 
      s.studentNumber === importStudent.studentNumber
    );
    
    if (existingStudentIndex !== -1) {
      if (duplicateMode === 'update') {
        // 既存データを保持しつつ、新しいデータで更新
        const existingStudent = studentsData.students[existingStudentIndex];
        studentsData.students[existingStudentIndex] = {
          ...existingStudent,
          ...importStudent,
          records: [...(existingStudent.records || []), ...(importStudent.records || [])]
        };
        result.updated++;
      } else {
        result.skipped++;
      }
    } else {
      studentsData.students.push(importStudent);
      result.added++;
    }
  });
  
  // AI分析履歴のマージ
  if (importedData.analysisHistory && Array.isArray(importedData.analysisHistory)) {
    const currentHistory = analysisHistory || [];
    
    importedData.analysisHistory.forEach(importAnalysis => {
      // 重複チェック（日時とタイプで判定）
      const exists = currentHistory.some(existing => 
        existing.timestamp === importAnalysis.timestamp && 
        existing.type === importAnalysis.type &&
        existing.target === importAnalysis.target
      );
      
      if (!exists) {
        currentHistory.push(importAnalysis);
      }
    });
    
    analysisHistory = currentHistory;
    localStorage.setItem('analysisHistory', JSON.stringify(analysisHistory));
  }
  
  return result;
}

/**
 * 新規追加のみインポート
 */
function performAddOnlyImport(importedData) {
  const result = { added: 0, updated: 0, skipped: 0, fieldsAdded: 0, fieldsUpdated: 0 };
  
  // 項目の新規追加
  importedData.fieldDefinitions.forEach(importField => {
    const exists = studentsData.fieldDefinitions.some(f => f.name === importField.name);
    if (!exists) {
      studentsData.fieldDefinitions.push(importField);
      result.fieldsAdded++;
    } else {
      result.skipped++;
    }
  });
  
  // 児童の新規追加
  importedData.students.forEach(importStudent => {
    const exists = studentsData.students.some(s => s.studentNumber === importStudent.studentNumber);
    if (!exists) {
      studentsData.students.push(importStudent);
      result.added++;
    } else {
      result.skipped++;
    }
  });
  
  // AI分析履歴の新規追加（重複しないもののみ）
  if (importedData.analysisHistory && Array.isArray(importedData.analysisHistory)) {
    const currentHistory = analysisHistory || [];
    
    importedData.analysisHistory.forEach(importAnalysis => {
      // 重複チェック（日時とタイプで判定）
      const exists = currentHistory.some(existing => 
        existing.timestamp === importAnalysis.timestamp && 
        existing.type === importAnalysis.type &&
        existing.target === importAnalysis.target
      );
      
      if (!exists) {
        currentHistory.push(importAnalysis);
      }
    });
    
    analysisHistory = currentHistory;
    localStorage.setItem('analysisHistory', JSON.stringify(analysisHistory));
  }
  
  return result;
}

/**
 * インポート結果メッセージ表示
 */
function showImportResultMessage(result, importMode) {
  let message = '';
  
  switch (importMode) {
    case 'replace':
      message = `データを完全に置き換えました。\n児童: ${result.added}名、項目: ${result.fieldsAdded}個`;
      break;
    case 'merge':
      message = `データをマージしました。\n児童: 追加${result.added}名、更新${result.updated}名、スキップ${result.skipped}名\n項目: 追加${result.fieldsAdded}個、更新${result.fieldsUpdated}個`;
      break;
    case 'add_only':
      message = `新規データのみを追加しました。\n児童: 追加${result.added}名、スキップ${result.skipped}名\n項目: 追加${result.fieldsAdded}個`;
      break;
  }
  
  showAlert(message, 'success');
}

/**
 * 全データ削除確認
 */
function confirmClearAllData() {
  if (confirm('本当にすべてのデータを削除しますか？\nこの操作は取り消せません。')) {
    if (confirm('最終確認：すべての児童データと進捗記録が削除されます。実行しますか？')) {
      localStorage.removeItem('kidsProgressData');
      initializeDefaultData();
      updateUI();
      showAlert('すべてのデータを削除しました', 'success');
    }
  }
}

/**
 * AI分析履歴初期化
 */
function initializeAnalysisHistory() {
  const saved = localStorage.getItem('analysisHistory');
  if (saved) {
    try {
      analysisHistory = JSON.parse(saved);
    } catch (error) {
      console.error('分析履歴読み込みエラー:', error);
      analysisHistory = [];
    }
  } else {
    analysisHistory = [];
  }
  
  // 分析履歴の有無に関わらず、AI分析結果テーブルを表示
  setTimeout(() => {
    displayAnalysisResults(analysisHistory); // 空配列でも適切なメッセージを表示
    updateAnalysisHistoryPreview();
  }, 100);
}

/**
 * サンプル分析データの生成
 */
function generateSampleAnalysisData() {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  
  return [
    {
      id: `sample_class_analysis_${Date.now()}`,
      type: 'overall',
      title: '📊 クラス全体分析レポート',
      content: `### 📊 クラス全体分析レポート（サンプル）

#### 🏫 基本情報
- **分析対象**: 12名の児童
- **データ記録**: 48件の進捗記録
- **分析日時**: ${new Date().toLocaleDateString('ja-JP')} ${new Date().toLocaleTimeString('ja-JP')}

#### 📈 全体的な傾向
- **学習状況**: クラス平均3.8点と良好な状況です
- **学習意欲**: クラス平均4.1点と非常に良好な状況です
- **宿題提出**: 85%の児童が継続的に提出しています

#### 🎯 指導方針の提案
- **個別面談**: 月1回の個別面談で児童の声を聞く
- **クラス内協力**: ペア学習やグループ活動の活用
- **家庭連携**: 定期的な保護者との情報共有`,
      timestamp: now.toISOString(),
      studentCount: 12,
      recordCount: 48
    },
    {
      id: `sample_individual_analysis_${Date.now()}_1`,
      type: 'individual',
      studentId: 'sample_student_1',
      studentName: '田中太郎',
      title: '👤 田中太郎さんの個別分析',
      content: `### 👤 田中太郎さんの個別分析レポート（サンプル）

#### 📊 現在の状況分析
- **学習状況**: 4点で優秀です。この調子で継続しましょう
- **学習意欲**: 4点で優秀です。この調子で継続しましょう
- **宿題提出**: 良好に実施されています

#### 💡 具体的な指導提案
- **発展学習**: 田中太郎さんは理解度が高いため、発展的な課題に挑戦する時期です
- **リーダーシップ**: 田中太郎さんの高い意欲を活かし、クラスでのリーダー役を任せてみる`,
      timestamp: yesterday.toISOString()
    },
    {
      id: `sample_individual_analysis_${Date.now()}_2`,
      type: 'individual',
      studentId: 'sample_student_2',
      studentName: '佐藤花子',
      title: '👤 佐藤花子さんの個別分析',
      content: `### 👤 佐藤花子さんの個別分析レポート（サンプル）

#### 📊 現在の状況分析
- **学習状況**: 3点で安定しています。さらなる向上を目指せます
- **学習意欲**: 3点で安定しています。さらなる向上を目指せます

#### 💡 具体的な指導提案
- **個別支援**: 佐藤花子さんには復習時間を増やし、分からない部分の個別指導を実施
- **家庭学習**: 佐藤花子さんの宿題習慣確立のため、保護者との連携を強化`,
      timestamp: twoDaysAgo.toISOString()
    }
  ];
}

/**
 * フィルター関連
 */
function filterStudents() {
  // 簡易実装（今後拡張）
  updateStudentsTable();
}

/**
 * ======================
 * AI分析機能の実装
 * ======================
 */

/**
 * クラス全体分析実行
 */
function runAIAnalysis() {
  if (!studentsData.students || studentsData.students.length === 0) {
    showAlert('分析対象の児童データがありません', 'warning');
    return;
  }

  // 分析中の表示
  showAnalysisLoading('クラス全体分析を実行中...');

  // AI分析のシミュレーション（実際のAI APIに置き換え可能）
  setTimeout(() => {
    const analysisResult = generateClassAnalysis();
    displayAnalysisResults([analysisResult]);
    saveAnalysisToHistory(analysisResult);
    showAlert('クラス全体分析が完了しました', 'success');
  }, 2000);
}

/**
 * 全員個別分析実行
 */
function runAllIndividualAnalysis() {
  if (!studentsData.students || studentsData.students.length === 0) {
    showAlert('分析対象の児童データがありません', 'warning');
    return;
  }

  // 分析中の表示
  showAnalysisLoading('全員個別分析を実行中...');

  // AI分析のシミュレーション
  setTimeout(() => {
    const analysisResults = studentsData.students.map(student => 
      generateIndividualAnalysis(student)
    );
    displayAnalysisResults(analysisResults);
    
    // 個別分析結果を各児童のレコードにも保存
    analysisResults.forEach(result => {
      if (result.type === 'individual' && result.studentId) {
        addIndividualAnalysisToStudent(result.studentId, result.content);
      }
    });
    
    analysisResults.forEach(result => saveAnalysisToHistory(result));
    saveData();
    updateUI();
    
    // 進捗一覧の更新（AI分析詳細ボタンを表示するため）
    if (currentTab === 'overview') {
      updateProgressTable();
    }
    
    showAlert('全員個別分析が完了しました', 'success');
  }, 3000);
}

/**
 * 特定児童分析実行
 */
function runIndividualAnalysis() {
  // 個別分析モーダルを表示
  updateIndividualAnalysisModal();
  document.getElementById('individualAnalysisModal').classList.add('show');
}

/**
 * 個別分析モーダルの児童選択更新
 */
function updateIndividualAnalysisModal() {
  const select = document.getElementById('individualAnalysisStudentSelect');
  if (!select) return;

  select.innerHTML = '<option value="">児童を選択してください</option>';
  
  if (studentsData.students) {
    studentsData.students.forEach(student => {
      const option = document.createElement('option');
      option.value = student.id;
      option.textContent = `${student.name} (${student.grade}年 ${student.class || ''})`;
      select.appendChild(option);
    });
  }
}

/**
 * 個別分析実行
 */
function executeIndividualAnalysis() {
  const studentId = document.getElementById('individualAnalysisStudentSelect').value;
  
  if (!studentId) {
    showAlert('児童を選択してください', 'error');
    return;
  }

  const student = studentsData.students.find(s => s.id === studentId);
  if (!student) {
    showAlert('選択された児童が見つかりません', 'error');
    return;
  }

  // モーダルを閉じる
  closeModal('individualAnalysisModal');

  // 分析中の表示
  showAnalysisLoading(`${student.name}さんの個別分析を実行中...`);

  // AI分析のシミュレーション
  setTimeout(() => {
    const analysisResult = generateIndividualAnalysis(student);
    displayAnalysisResults([analysisResult]);
    saveAnalysisToHistory(analysisResult);
    
    // 個別分析結果を児童のレコードにも保存
    addIndividualAnalysisToStudent(student.id, analysisResult.content);
    saveData();
    updateUI();
    
    // 進捗一覧の更新（AI分析詳細ボタンを表示するため）
    if (currentTab === 'overview') {
      updateProgressTable();
    }
    
    showAlert(`${student.name}さんの個別分析が完了しました`, 'success');
  }, 2000);
}

/**
 * クラス全体分析の生成
 */
function generateClassAnalysis() {
  const totalStudents = studentsData.students.length;
  const studentsWithRecords = studentsData.students.filter(s => s.records && s.records.length > 0);
  const recordCount = studentsWithRecords.reduce((sum, student) => sum + student.records.length, 0);

  // 最新データから傾向を分析
  const recentData = [];
  studentsWithRecords.forEach(student => {
    if (student.records.length > 0) {
      const latestRecord = student.records[student.records.length - 1];
      if (latestRecord.data) {
        recentData.push({
          student: student.name,
          data: latestRecord.data
        });
      }
    }
  });

  // 学習状況の統計（5段階評価項目）
  const learningStats = calculateLearningStats(recentData);
  
  const content = `### 📊 クラス全体分析レポート

#### 🏫 基本情報
- **分析対象**: ${totalStudents}名の児童
- **データ記録**: ${recordCount}件の進捗記録
- **分析日時**: ${new Date().toLocaleDateString('ja-JP')} ${new Date().toLocaleTimeString('ja-JP')}

#### 📈 全体的な傾向

##### 🎓 学習面の分析
${generateLearningTrends(learningStats)}

##### 📋 具体的な観察ポイント
${generateClassObservations(recentData)}

#### 🎯 指導方針の提案

##### 💡 優先的に取り組むべき点
${generateClassRecommendations(learningStats, recentData)}

##### 👨‍👩‍👧 保護者との連携ポイント
${generateParentCollaborationPoints(learningStats)}

#### 📅 今後のアクションプラン
${generateActionPlan(learningStats, totalStudents)}

---
*このレポートは児童の進捗データを基にAIが分析・生成したものです。個別の児童については別途詳細分析をご実施ください。*`;

  return {
    id: `class_analysis_${Date.now()}`,
    type: 'overall',
    title: '📊 クラス全体分析レポート',
    content: content,
    timestamp: new Date().toISOString(),
    studentCount: totalStudents,
    recordCount: recordCount
  };
}

/**
 * 個別分析の生成
 */
function generateIndividualAnalysis(student) {
  const records = student.records || [];
  const latestRecord = records.length > 0 ? records[records.length - 1] : null;
  
  if (!latestRecord || !latestRecord.data) {
    return {
      id: `individual_analysis_${student.id}_${Date.now()}`,
      type: 'individual',
      studentId: student.id,
      studentName: student.name,
      title: `👤 ${student.name}さんの個別分析`,
      content: `### ⚠️ 分析データ不足
      
${student.name}さんについては、分析に十分なデータが蓄積されていません。

#### 🔍 現在の状況
- **進捗記録数**: ${records.length}件
- **最新記録**: ${latestRecord ? formatDate(latestRecord.timestamp) : 'なし'}

#### 📝 推奨事項
1. **データ蓄積**: 継続的な進捗記録の実施
2. **観察強化**: 日々の様子をより詳細に記録
3. **再分析**: 1-2週間後の再分析実施

定期的なデータ記録により、より精度の高い分析が可能になります。`,
      timestamp: new Date().toISOString()
    };
  }

  // 個別分析の実行
  const personalAnalysis = generatePersonalAnalysis(student, records);
  
  return {
    id: `individual_analysis_${student.id}_${Date.now()}`,
    type: 'individual',
    studentId: student.id,
    studentName: student.name,
    title: `👤 ${student.name}さんの個別分析`,
    content: personalAnalysis,
    timestamp: new Date().toISOString()
  };
}

/**
 * 個人分析の詳細生成
 */
function generatePersonalAnalysis(student, records) {
  const latestRecord = records[records.length - 1];
  const data = latestRecord.data;
  
  // 学習状況の分析
  const learningAnalysis = analyzeStudentLearning(data, student.name);
  
  // 成長ポイントの分析
  const growthAnalysis = analyzeStudentGrowth(records, student.name);
  
  // 課題と提案の生成
  const recommendations = generateStudentRecommendations(data, student.name);

  return `### 👤 ${student.name}さんの個別分析レポート

#### 📊 現在の状況分析
${learningAnalysis}

#### 📈 成長の傾向
${growthAnalysis}

#### 💡 具体的な指導提案
${recommendations}

#### 🏠 保護者との連携ポイント
${generateParentAdvice(data, student.name)}

#### 📅 今後の重点項目
${generateFocusAreas(data, student.name)}

---
*分析基準日: ${formatDate(latestRecord.timestamp)}*
*この分析は最新の進捗データを基に生成されています。*`;
}

/**
 * 学習統計の計算
 */
function calculateLearningStats(recentData) {
  const stats = {
    total: recentData.length,
    averages: {},
    distribution: {}
  };

  // 5段階評価項目の統計を計算
  studentsData.fieldDefinitions.forEach(field => {
    if (field.type === 'select') {
      const values = recentData
        .map(item => item.data[field.id])
        .filter(val => val && !isNaN(val))
        .map(val => parseInt(val));
      
      if (values.length > 0) {
        stats.averages[field.name] = (values.reduce((sum, val) => sum + val, 0) / values.length).toFixed(1);
        
        // 分布計算
        const distribution = [1,2,3,4,5].map(level => ({
          level,
          count: values.filter(val => val === level).length,
          percentage: Math.round((values.filter(val => val === level).length / values.length) * 100)
        }));
        stats.distribution[field.name] = distribution;
      }
    }
  });

  return stats;
}

/**
 * 学習傾向の生成
 */
function generateLearningTrends(stats) {
  let trends = '';
  
  Object.keys(stats.averages).forEach(fieldName => {
    const avg = parseFloat(stats.averages[fieldName]);
    const distribution = stats.distribution[fieldName];
    
    let trend = '';
    if (avg >= 4.0) {
      trend = `**${fieldName}**: クラス平均${avg}点と非常に良好な状況です。`;
    } else if (avg >= 3.0) {
      trend = `**${fieldName}**: クラス平均${avg}点と概ね良好な状況です。`;
    } else {
      trend = `**${fieldName}**: クラス平均${avg}点で、支援が必要な状況です。`;
    }
    
    // 低評価の児童への言及
    const lowCount = distribution.filter(d => d.level <= 2).reduce((sum, d) => sum + d.count, 0);
    if (lowCount > 0) {
      trend += ` ${lowCount}名の児童に個別支援が推奨されます。`;
    }
    
    trends += `- ${trend}\n`;
  });

  return trends || '- 評価項目のデータが不足しています。継続的な記録をお勧めします。';
}

/**
 * クラス観察ポイントの生成
 */
function generateClassObservations(recentData) {
  const observations = [
    `- **積極的な児童**: ${Math.ceil(recentData.length * 0.3)}名程度が高い学習意欲を示しています`,
    `- **支援が必要**: ${Math.ceil(recentData.length * 0.2)}名程度に個別の注意深い観察が必要です`,
    `- **安定成長**: ${Math.floor(recentData.length * 0.5)}名程度が安定した成長を見せています`,
    `- **全体傾向**: 学級全体として${recentData.length > 20 ? '活発' : 'バランスの取れた'}な雰囲気があります`
  ];

  return observations.join('\n');
}

/**
 * クラス向け推奨事項の生成
 */
function generateClassRecommendations(stats, recentData) {
  const recommendations = [];
  
  // 平均点の低い項目への対応
  Object.keys(stats.averages).forEach(fieldName => {
    const avg = parseFloat(stats.averages[fieldName]);
    if (avg < 3.0) {
      recommendations.push(`- **${fieldName}の改善**: 個別指導の強化と学習環境の見直しを検討`);
    }
  });

  // 一般的な推奨事項
  recommendations.push(
    '- **個別面談**: 月1回の個別面談で児童の声を聞く',
    '- **クラス内協力**: ペア学習やグループ活動の活用',
    '- **家庭連携**: 定期的な保護者との情報共有',
    '- **記録継続**: 日々の小さな変化も記録して成長を追跡'
  );

  return recommendations.join('\n');
}

/**
 * 保護者連携ポイントの生成
 */
function generateParentCollaborationPoints(stats) {
  return `- **成長の共有**: 児童の良い変化を積極的に保護者に伝える
- **課題の共有**: 気になる点は早めに保護者と相談
- **家庭学習**: 宿題提出状況を踏まえた家庭学習の調整
- **生活習慣**: 睡眠や食事など基本的な生活習慣のサポート
- **コミュニケーション**: 月1回以上の定期的な情報交換`;
}

/**
 * アクションプランの生成
 */
function generateActionPlan(stats, totalStudents) {
  return `- **短期目標（1週間）**: 日々の観察記録の継続と気になる児童への個別対応
- **中期目標（1ヶ月）**: 全児童との個別面談実施と保護者との情報共有
- **長期目標（学期末）**: 児童全員の成長記録まとめと次学期への計画策定
- **継続事項**: データに基づく客観的な児童理解と支援方法の改善`;
}

/**
 * 学生の学習分析
 */
function analyzeStudentLearning(data, studentName) {
  const analyses = [];
  
  // 各項目の分析
  studentsData.fieldDefinitions.forEach(field => {
    const value = data[field.id];
    if (value !== undefined) {
      if (field.type === 'select') {
        const score = parseInt(value);
        if (score >= 4) {
          analyses.push(`- **${field.name}**: ${score}点で優秀です。この調子で継続しましょう`);
        } else if (score >= 3) {
          analyses.push(`- **${field.name}**: ${score}点で安定しています。さらなる向上を目指せます`);
        } else {
          analyses.push(`- **${field.name}**: ${score}点で支援が必要です。個別の指導を強化しましょう`);
        }
      } else if (field.type === 'checkbox') {
        if (value) {
          analyses.push(`- **${field.name}**: 良好に実施されています`);
        } else {
          analyses.push(`- **${field.name}**: 改善の余地があります。継続的な支援が必要です`);
        }
      } else if (field.type === 'text' && value.trim()) {
        analyses.push(`- **${field.name}**: "${value}" - 具体的な内容が記録されています`);
      }
    }
  });

  return analyses.length > 0 ? analyses.join('\n') : '- 十分な評価データが蓄積されていません。継続的な記録をお勧めします。';
}

/**
 * 学生の成長分析
 */
function analyzeStudentGrowth(records, studentName) {
  if (records.length < 2) {
    return `- データ蓄積期間中のため、成長傾向の分析は次回以降に実施されます
- 継続的な記録により、より詳細な成長パターンが見えてきます`;
  }

  const recentRecords = records.slice(-5); // 最新5件で傾向分析
  const growthPoints = [
    `- **記録期間**: ${records.length}件のデータから成長パターンを分析`,
    `- **最新傾向**: 直近の記録から${studentName}さんは安定した成長を見せています`,
    `- **継続性**: 定期的な記録により客観的な成長の把握が可能になっています`
  ];

  return growthPoints.join('\n');
}

/**
 * 学生向け推奨事項の生成
 */
function generateStudentRecommendations(data, studentName) {
  const recommendations = [];
  
  // データに基づく具体的な提案
  studentsData.fieldDefinitions.forEach(field => {
    const value = data[field.id];
    if (value !== undefined && field.type === 'select') {
      const score = parseInt(value);
      if (score <= 2) {
        switch (field.name) {
          case '今日の理解度':
          case '学習状況':
            recommendations.push(`- **理解度向上**: ${studentName}さんには復習時間を増やし、分からない部分の個別指導を実施`);
            break;
          case '学習意欲':
          case '意欲・態度':
            recommendations.push(`- **意欲向上**: ${studentName}さんの興味関心に合わせた課題設定で学習意欲を引き出す`);
            break;
          case '宿題提出':
            recommendations.push(`- **家庭学習**: ${studentName}さんの宿題習慣確立のため、保護者との連携を強化`);
            break;
          default:
            recommendations.push(`- **${field.name}**: ${studentName}さんの${field.name}向上のため、個別支援を検討`);
        }
      } else if (score >= 4) {
        switch (field.name) {
          case '今日の理解度':
          case '学習状況':
            recommendations.push(`- **発展学習**: ${studentName}さんは理解度が高いため、発展的な課題に挑戦する時期です`);
            break;
          case '学習意欲':
            recommendations.push(`- **リーダーシップ**: ${studentName}さんの高い意欲を活かし、クラスでのリーダー役を任せてみる`);
            break;
        }
      }
    }
  });

  if (recommendations.length === 0) {
    recommendations.push(
      `- **継続観察**: ${studentName}さんの現在の状況を継続的に観察し、成長をサポート`,
      `- **個別面談**: ${studentName}さんとの1対1の時間を設け、本人の思いや悩みを聞く`,
      `- **強み活用**: ${studentName}さんの得意分野を見つけて自信につなげる`
    );
  }

  return recommendations.join('\n');
}

/**
 * 保護者向けアドバイスの生成
 */
function generateParentAdvice(data, studentName) {
  return `- **家庭での声かけ**: ${studentName}さんの頑張りを具体的に褒める声かけを意識
- **学習環境**: 落ち着いて学習できる環境づくりと規則正しい生活習慣の維持
- **コミュニケーション**: 学校での出来事を聞く時間を作り、${studentName}さんの思いを受け止める
- **学校との連携**: 気になることがあれば遠慮なく学校に相談・情報共有`;
}

/**
 * 重点項目の生成
 */
function generateFocusAreas(data, studentName) {
  const focusAreas = [
    `- **継続観察**: ${studentName}さんの日々の変化を注意深く観察`,
    `- **個別支援**: ${studentName}さんに適した学習方法やペースの模索`,
    `- **強み伸長**: ${studentName}さんの得意分野をさらに伸ばす機会の提供`,
    `- **課題克服**: 苦手分野への段階的なアプローチと成功体験の積み重ね`
  ];

  return focusAreas.join('\n');
}

/**
 * 分析中ローディング表示
 */
function showAnalysisLoading(message) {
  const container = document.getElementById('analysisResultsTable');
  if (!container) return;

  container.innerHTML = `
    <div class="alert alert-info" style="text-align: center; padding: 2rem;">
      <div style="margin-bottom: 1rem;">
        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary);"></i>
      </div>
      <h4 style="margin: 0 0 0.5rem 0; color: var(--primary);">${message}</h4>
      <p style="margin: 0; color: var(--text-secondary);">
        AIが進捗データを分析しています。しばらくお待ちください...
      </p>
    </div>
  `;
}

/**
 * 分析結果の表示
 */
function displayAnalysisResults(results) {
  const container = document.getElementById('analysisResultsTable');
  if (!container) return;

  let tableHTML = `
    <div style="margin-bottom: 1rem;">
      <h4 style="color: var(--primary); margin: 0; display: flex; align-items: center; gap: 0.5rem;">
        <i class="fas fa-chart-bar"></i>
        分析結果 (${results ? results.length : 0}件)
      </h4>
    </div>
    <div class="data-table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 120px;">分析タイプ</th>
            <th style="width: 150px;">対象</th>
            <th style="width: 140px;">実行日時</th>
            <th style="width: 300px;">短評</th>
            <th style="width: 120px;">操作</th>
          </tr>
        </thead>
        <tbody>
  `;

  if (!results || results.length === 0) {
    tableHTML += `
          <tr>
            <td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
              <i class="fas fa-brain" style="font-size: 2rem; margin-bottom: 1rem; display: block; color: var(--primary);"></i>
              まだ分析結果がありません。<br>
              上記のボタンからAI分析を実行してください。
            </td>
          </tr>
    `;
  } else {
    results.forEach(result => {
      const typeLabel = result.type === 'overall' ? 'クラス全体' : '個別分析';
      const typeClass = result.type === 'overall' ? 'btn-primary' : 'btn-success';
      const target = result.type === 'overall' ? 
        `全${result.studentCount || '?'}名` : 
        result.studentName || '個別児童';
      
      // 分析内容の要約を生成
      const summary = generateAnalysisSummary(result.content);
      
      tableHTML += `
        <tr>
          <td>
            <span class="btn ${typeClass}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">
              ${typeLabel}
            </span>
          </td>
          <td>${target}</td>
          <td>${formatDate(result.timestamp)}</td>
          <td style="width: 300px; max-width: 300px;">
            <div class="analysis-summary" style="font-size: 0.9rem; line-height: 1.4; word-wrap: break-word; white-space: normal; overflow-wrap: break-word;">
              ${summary}
            </div>
          </td>
          <td>
            <button class="btn btn-secondary" onclick="viewAnalysisDetail('${result.id}')" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">
              <i class="fas fa-eye"></i> 詳細
            </button>
          </td>
        </tr>
      `;
    });
  }

  tableHTML += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = tableHTML;
}

/**
 * 分析概要の生成
 */
function generateAnalysisSummary(content) {
  // マークダウンから重要なポイントを抽出
  const lines = content.split('\n').filter(line => line.trim());
  const keyPoints = lines
    .filter(line => line.includes('：') || line.includes('です') || line.includes('ましょう'))
    .slice(0, 3)
    .map(line => line.replace(/[#*-]/g, '').trim())
    .filter(line => line.length > 10 && line.length < 100);

  if (keyPoints.length === 0) {
    return '分析が完了しました。詳細ボタンで内容をご確認ください。';
  }

  return keyPoints.slice(0, 2).map(point => `• ${point}`).join('<br>');
}

/**
 * 分析詳細表示
 */
function viewAnalysisDetail(analysisId) {
  const analysis = analysisHistory.find(a => a.id === analysisId);
  if (!analysis) {
    showAlert('分析結果が見つかりません', 'error');
    return;
  }

  showAnalysisDetail({
    title: analysis.title,
    content: analysis.content,
    analysisDate: formatDate(analysis.timestamp),
    studentName: analysis.studentName || '',
    type: analysis.type
  });
}

/**
 * 分析履歴への保存
 */
function saveAnalysisToHistory(analysisResult) {
  if (!analysisHistory) {
    analysisHistory = [];
  }
  
  analysisHistory.unshift(analysisResult); // 最新を先頭に
  
  // 履歴は最大50件まで保持
  if (analysisHistory.length > 50) {
    analysisHistory = analysisHistory.slice(0, 50);
  }
  
  localStorage.setItem('analysisHistory', JSON.stringify(analysisHistory));
  
  // 履歴プレビューも更新
  updateAnalysisHistoryPreview();
}

/**
 * 分析履歴プレビューの更新
 */
function updateAnalysisHistoryPreview() {
  const container = document.getElementById('analysisHistoryPreview');
  if (!container) return;

  if (!analysisHistory || analysisHistory.length === 0) {
    container.innerHTML = `
      <div class="alert alert-info">
        <i class="fas fa-info-circle"></i>
        まだ分析結果がありません。上記のボタンからAI分析を実行すると、結果がここに履歴として蓄積されます。
      </div>
    `;
    return;
  }

  const recentAnalyses = analysisHistory.slice(0, 5); // 最新5件を表示
  
  let historyHTML = `
    <div style="margin-bottom: 1rem;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h4 style="margin: 0; color: var(--primary);">最近の分析結果</h4>
        <button class="btn btn-secondary" onclick="viewAnalysisHistory()" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">
          <i class="fas fa-history"></i> 全履歴表示
        </button>
      </div>
    </div>
  `;

  recentAnalyses.forEach(analysis => {
    const typeLabel = analysis.type === 'overall' ? 'クラス全体' : '個別分析';
    const typeClass = analysis.type === 'overall' ? 'btn-primary' : 'btn-success';
    
    historyHTML += `
      <div class="card" style="margin-bottom: 0.5rem; padding: 1rem;">
        <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 0.5rem;">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
              <span class="btn ${typeClass}" style="padding: 0.2rem 0.4rem; font-size: 0.7rem;">
                ${typeLabel}
              </span>
              <span style="color: var(--text-secondary); font-size: 0.8rem;">
                ${formatDate(analysis.timestamp)}
              </span>
            </div>
            <div style="font-size: 0.9rem; color: var(--text-primary);">
              ${analysis.studentName ? `${analysis.studentName}さんの` : ''}${analysis.title.replace(/📊|👤|🧠/g, '').trim()}
            </div>
          </div>
          <button class="btn btn-secondary" onclick="viewAnalysisDetail('${analysis.id}')" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin-left: 1rem;">
            <i class="fas fa-eye"></i> 詳細
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = historyHTML;
}

/**
 * 個別分析結果を学生レコードに追加
 */
function addIndividualAnalysisToStudent(studentId, analysisContent) {
  const student = studentsData.students.find(s => s.id === studentId);
  if (!student || !student.records || student.records.length === 0) return;

  // 最新のレコードにAI分析結果を追加
  const latestRecord = student.records[student.records.length - 1];
  latestRecord.aiSummary = analysisContent;
}

/**
 * 個別分析詳細表示
 */
function viewIndividualAnalysisDetail(studentId) {
  const student = studentsData.students.find(s => s.id === studentId);
  if (!student || !student.records || student.records.length === 0) {
    showAlert('該当する分析結果が見つかりません', 'error');
    return;
  }

  const latestRecord = student.records[student.records.length - 1];
  if (!latestRecord.aiSummary) {
    showAlert('AI分析結果がありません', 'error');
    return;
  }

  showAnalysisDetail({
    title: `👤 ${student.name}さんの個別分析`,
    content: latestRecord.aiSummary,
    analysisDate: formatDate(latestRecord.timestamp),
    studentName: student.name,
    type: 'individual'
  });
}

/**
 * 分析内容のフォーマット
 */
function formatAnalysisContent(content) {
  if (!content) return '';
  
  // マークダウン風の書式を適用
  return content
    .replace(/### (.*)/g, '<h3>$1</h3>')
    .replace(/#### (.*)/g, '<h4>$1</h4>')
    .replace(/##### (.*)/g, '<h5>$1</h5>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/- (.*)/g, '<li>$1</li>')
    .replace(/^\n/gm, '')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^([^<])/, '<p>$1')
    .replace(/([^>])$/, '$1</p>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/<\/ul>\s*<ul>/g, '')
    .replace(/---\n\*(.*)/g, '<hr><p style="font-style: italic; color: var(--text-secondary); font-size: 0.9rem;">$1</p>');
}

/**
 * 分析履歴表示
 */
function viewAnalysisHistory() {
  if (!analysisHistory || analysisHistory.length === 0) {
    showAlert('まだ分析結果がありません。AI分析を実行してください。', 'info');
    return;
  }

  const modal = document.getElementById('analysisHistoryModal');
  const content = document.getElementById('analysisHistoryContent');
  
  if (!content) return;

  let historyHTML = `
    <div style="margin-bottom: 1rem;">
      <h4 style="color: var(--primary); margin: 0;">分析履歴一覧 (${analysisHistory.length}件)</h4>
    </div>
    <div class="data-table-container" style="max-height: 500px; overflow-y: auto;">
      <table class="data-table">
        <thead>
          <tr>
            <th>タイプ</th>
            <th>対象</th>
            <th>実行日時</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
  `;

  analysisHistory.forEach(analysis => {
    const typeLabel = analysis.type === 'overall' ? 'クラス全体' : '個別分析';
    const typeClass = analysis.type === 'overall' ? 'btn-primary' : 'btn-success';
    const target = analysis.type === 'overall' ? 
      `全${analysis.studentCount || '?'}名` : 
      analysis.studentName || '個別児童';

    historyHTML += `
      <tr>
        <td>
          <span class="btn ${typeClass}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">
            ${typeLabel}
          </span>
        </td>
        <td>${target}</td>
        <td>${formatDate(analysis.timestamp)}</td>
        <td>
          <button class="btn btn-secondary" onclick="viewAnalysisDetail('${analysis.id}')" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">
            <i class="fas fa-eye"></i> 詳細
          </button>
        </td>
      </tr>
    `;
  });

  historyHTML += `
        </tbody>
      </table>
    </div>
  `;

  content.innerHTML = historyHTML;
  modal.classList.add('show');
}

/**
 * 分析履歴クリア
 */
function clearAnalysisHistory() {
  if (!confirm('全ての分析履歴を削除しますか？この操作は取り消せません。')) {
    return;
  }

  analysisHistory = [];
  localStorage.removeItem('analysisHistory');
  updateAnalysisHistoryPreview();
  
  // 分析結果テーブルもクリア
  const container = document.getElementById('analysisResultsTable');
  if (container) {
    container.innerHTML = `
      <div class="alert alert-info">
        <i class="fas fa-info-circle"></i>
        上記のボタンからAI分析を実行してください。分析結果は以下のテーブルに表示されます。
        <br><br>
        <strong>期待される分析内容：</strong>
        <ul style="margin-top: 0.5rem;">
          <li>「○○さんは最近理解度が落ちているので復習を増やしましょう」</li>
          <li>「学習意欲が向上しており、発展的な内容に挑戦する時期です」</li>
          <li>「宿題提出率が下がっているため、家庭との連携が必要です」</li>
        </ul>
      </div>
    `;
  }

  showAlert('分析履歴を削除しました', 'success');
}

/**
 * 児童進捗履歴表示
 */
function viewStudentProgress(studentId) {
  const student = studentsData.students.find(s => s.id === studentId);
  if (!student) {
    showAlert('児童が見つかりません', 'error');
    return;
  }

  const modal = document.getElementById('studentProgressModal');
  const title = document.getElementById('progressModalTitle');
  const content = document.getElementById('progressModalContent');
  
  if (!content) return;

  title.textContent = `${student.name}さんの進捗履歴`;

  if (!student.records || student.records.length === 0) {
    content.innerHTML = `
      <div class="alert alert-info">
        <i class="fas fa-info-circle"></i>
        ${student.name}さんの進捗記録はまだありません。
      </div>
    `;
  } else {
    let historyHTML = `
      <div style="margin-bottom: 1rem;">
        <h4 style="color: var(--primary); margin: 0;">記録数: ${student.records.length}件</h4>
      </div>
    `;

    // 記録を新しい順に表示
    student.records.slice().reverse().forEach((record, index) => {
      historyHTML += `
        <div class="card" style="margin-bottom: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <h5 style="margin: 0; color: var(--primary);">記録 #${student.records.length - index}</h5>
            <span style="color: var(--text-secondary); font-size: 0.9rem;">${formatDate(record.timestamp)}</span>
          </div>
          
          <div style="margin-bottom: 1rem;">
            <h6 style="margin: 0 0 0.5rem 0; color: var(--secondary);">評価データ</h6>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.5rem;">
      `;

      if (record.data) {
        Object.keys(record.data).forEach(fieldId => {
          const field = studentsData.fieldDefinitions.find(f => f.id === fieldId);
          const fieldName = field ? field.name : fieldId;
          const value = getFieldValue(record, fieldId);
          
          historyHTML += `
            <div style="background: var(--bg-secondary); padding: 0.5rem; border-radius: 4px;">
              <strong style="font-size: 0.8rem; color: var(--text-secondary);">${fieldName}</strong><br>
              <span style="color: var(--text-primary);">${value}</span>
            </div>
          `;
        });
      }

      historyHTML += `
            </div>
          </div>
      `;

      if (record.notes && record.notes.trim()) {
        historyHTML += `
          <div style="margin-bottom: 1rem;">
            <h6 style="margin: 0 0 0.5rem 0; color: var(--secondary);">備考・メモ</h6>
            <p style="background: var(--bg-secondary); padding: 0.75rem; border-radius: 4px; margin: 0; font-style: italic;">
              ${record.notes}
            </p>
          </div>
        `;
      }

      if (record.aiSummary) {
        historyHTML += `
          <div>
            <h6 style="margin: 0 0 0.5rem 0; color: var(--accent);">
              <i class="fas fa-brain"></i> AI分析結果
            </h6>
            <div class="analysis-content" style="background: rgba(6, 182, 212, 0.05); padding: 1rem; border-radius: 4px; border-left: 3px solid var(--accent);">
              ${formatAnalysisContent(record.aiSummary)}
            </div>
          </div>
        `;
      }

      historyHTML += `</div>`;
    });

    content.innerHTML = historyHTML;
  }

  modal.classList.add('show');
}

/**
 * 設定タブの児童管理セクション更新
 */
function updateStudentManagementSettings() {
  const container = document.getElementById('studentManagementSettings');
  if (!container) return;

  if (!studentsData.students || studentsData.students.length === 0) {
    container.innerHTML = `
      <div class="alert alert-info">
        <i class="fas fa-info-circle"></i>
        まだ児童が登録されていません。児童管理タブから児童を追加してください。
      </div>
    `;
    return;
  }

  let settingsHTML = `
    <div style="margin-bottom: 1rem;">
      <h4 style="margin: 0 0 1rem 0; color: var(--text-primary); font-size: 1.1rem; font-weight: 600;">
        <i class="fas fa-users"></i> 登録済み児童の削除
      </h4>
      <p style="margin: 0 0 1rem 0; color: var(--text-secondary); font-size: 0.9rem;">
        削除する児童を選択してください。削除すると、その児童のすべての進捗記録も削除されます。
      </p>
    </div>
    <div class="data-table-container" style="max-height: 300px; overflow-y: auto;">
      <table class="data-table">
        <thead>
          <tr>
            <th>氏名</th>
            <th>在籍番号</th>
            <th>学年</th>
            <th>記録数</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
  `;

  studentsData.students.forEach(student => {
    settingsHTML += `
      <tr>
        <td>${student.name}</td>
        <td>${student.studentNumber}</td>
        <td>${student.grade}年生</td>
        <td>${student.records ? student.records.length : 0}件</td>
        <td>
          <button class="btn btn-error" onclick="deleteStudentFromSettings('${student.id}')" style="font-size: 0.8rem; padding: 0.25rem 0.5rem;">
            <i class="fas fa-trash"></i> 削除
          </button>
        </td>
      </tr>
    `;
  });

  settingsHTML += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = settingsHTML;
}

/**
 * 設定タブからの児童削除
 */
function deleteStudentFromSettings(studentId) {
  const student = studentsData.students.find(s => s.id === studentId);
  if (!student) return;
  
  const recordCount = student.records ? student.records.length : 0;
  
  if (!confirm(`${student.name}さんを削除しますか？\n\n【注意】\n・この操作は取り消せません\n・${recordCount}件の進捗記録も削除されます`)) {
    return;
  }
  
  if (!confirm('最終確認：本当に削除しますか？\nすべてのデータが失われます。')) {
    return;
  }
  
  studentsData.students = studentsData.students.filter(s => s.id !== studentId);
  saveData();
  syncData('delete_student', { id: studentId });
  
  updateUI();
  updateStudentManagementSettings(); // 設定画面も更新
  showAlert(`${student.name}さんを削除しました`, 'success');
}