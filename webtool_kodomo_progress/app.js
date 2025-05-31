/**
 * 児童進捗管理ツール JavaScript
 * Kids Progress Manager - MVP版
 */

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
  // 保存されたタブ位置を即座に復元
  const savedTab = localStorage.getItem('currentTab') || 'students';
  
  // CSS操作で即座にタブを表示（フラッシュを防ぐ）
  document.querySelectorAll('.tab-content').forEach(content => {
    content.style.display = 'none';
  });
  const targetContent = document.getElementById(`${savedTab}-tab`);
  if (targetContent) {
    targetContent.style.display = 'block';
  }
  
  // タブボタンの状態も即座に設定
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  const targetTab = document.querySelector(`[data-tab="${savedTab}"]`);
  if (targetTab) {
    targetTab.classList.add('active');
  }
  
  // アプリケーション初期化
  initializeApp();
  initializeAnalysisHistory();
});







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
    content.style.display = 'none';
  });
  const targetContent = document.getElementById(`${tabName}-tab`);
  if (targetContent) {
    targetContent.classList.remove('hidden');
    targetContent.style.display = 'block';
  }
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
      // 行動タグフィールドの互換性チェック
      ensureDataCompatibility();
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
      { id: 'homework', name: '宿題提出', type: 'checkbox', options: [], required: false },
      { id: 'behaviorTags', name: '児童の行動タグ', type: 'multiselect', options: [
        '積極的に手を上げる',
        '黙っていた',
        'クラスでのリーダー役',
        '規則正しい生活習慣',
        '一生懸命頑張っています',
        '宿題をしっかり提出',
        '学習への意欲が高い',
        '友達に教える姿勢',
        'いつも明るい',
        '集中力が続く',
        '細かいところに気づく',
        '協力的な姿勢',
        '独創的なアイデアを出す',
        '整理整頓が上手',
        '時間を守って行動',
        '困っている友達を手助け',
        '最後まであきらめない',
        '新しいことに挑戦する',
        '丁寧な字で書く',
        '正直に報告する',
        '質問を積極的にする',
        '間違いを恐れず発言'
      ], required: false }
    ]
  };
  saveData();
  // 初期化後も互換性チェックを実行（重複回避のため遅延実行）
  setTimeout(() => {
    ensureDataCompatibility();
  }, 100);
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
 * データの互換性チェックと更新
 */
function ensureDataCompatibility() {
  // 行動タグフィールドが存在しない場合は追加
  const behaviorTagField = studentsData.fieldDefinitions.find(field => field.id === 'behaviorTags');
  
  if (!behaviorTagField) {
    const newBehaviorTagField = {
      id: 'behaviorTags',
      name: '児童の行動タグ',
      type: 'multiselect',
      options: [
        '積極的に手を上げる',
        '黙っていた',
        'クラスでのリーダー役',
        '規則正しい生活習慣',
        '一生懸命頑張っています',
        '宿題をしっかり提出',
        '学習への意欲が高い',
        '友達に教える姿勢',
        'いつも明るい',
        '集中力が続く',
        '細かいところに気づく',
        '協力的な姿勢',
        '独创的なアイデアを出す',
        '整理整頓が上手',
        '時間を守って行動',
        '困っている友達を手助け',
        '最後まであきらめない',
        '新しいことに挑戦する',
        '丁寧な字で書く',
        '正直に報告する',
        '質問を積極的にする',
        '間違いを恐れず発言'
      ],
      required: false
    };
    
    studentsData.fieldDefinitions.push(newBehaviorTagField);
    saveData();
    console.log('行動タグフィールドを追加しました');
    showAlert('行動タグ機能が追加されました！', 'success');
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
    content.style.display = 'none';
  });
  const targetContent = document.getElementById(`${tabName}-tab`);
  if (targetContent) {
    targetContent.classList.remove('hidden');
    targetContent.style.display = 'block';
  }

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
      <th style="min-width: 60px;">性別</th>
      <th style="min-width: 80px;">クラス</th>
      ${studentsData.fieldDefinitions.map(field => 
        `<th style="min-width: 120px;">${field.name}</th>`
      ).join('')}
      <th style="min-width: 100px;">ステータス</th>
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
 * 進捗テーブルのフィルタリング
 */
function filterProgressTable(filterType) {
  const tbody = document.getElementById('progressTableBody');
  const rows = tbody.querySelectorAll('tr');
  
  // フィルターボタンの状態更新
  document.querySelectorAll('[onclick*="filterProgressTable"]').forEach(btn => {
    btn.classList.remove('active');
    btn.style.backgroundColor = '';
    btn.style.color = '';
  });
  
  // アクティブなボタンをハイライト
  const activeButton = document.querySelector(`[onclick="filterProgressTable('${filterType}')"]`);
  if (activeButton) {
    activeButton.style.backgroundColor = 'var(--primary)';
    activeButton.style.color = 'white';
  }
  
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length === 0) return; // ヘッダー行をスキップ
    
    let shouldShow = true;
    
    if (filterType === 'attention') {
      // 要注意: ステータス列で「要注意」ラベルがあるかチェック
      const statusCell = cells[cells.length - 3]; // ステータス列（操作列の3つ前）
      const statusText = statusCell?.textContent || '';
      shouldShow = statusText.includes('要注意');
      
    } else if (filterType === 'good') {
      // 良好: ステータス列で「良好」ラベルがあるかチェック
      const statusCell = cells[cells.length - 3]; // ステータス列（操作列の3つ前）
      const statusText = statusCell?.textContent || '';
      shouldShow = statusText.includes('良好');
      
    } else if (filterType === 'all') {
      // 全て表示
      shouldShow = true;
    }
    
    row.style.display = shouldShow ? '' : 'none';
  });
  
  // フィルター結果の統計を表示
  const visibleRows = Array.from(rows).filter(row => row.style.display !== 'none').length;
  const totalRows = rows.length;
  
  showAlert(`フィルター適用: ${visibleRows}/${totalRows}件を表示中`, 'info');
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
  
  // ステータスラベルを生成
  const statusLabel = generateStatusLabel(latestRecord);
  
  // 基本情報
  row.innerHTML = `
    <td class="sticky-column" style="min-width: 120px;">${formatStudentName(student.name)}</td>
    <td>${student.studentNumber}</td>
    <td>${student.grade}年生</td>
    <td>${getGenderDisplay(student.gender)}</td>
    <td>${student.class || '-'}</td>
    ${dynamicFields}
    <td style="min-width: 100px;">${statusLabel}</td>
    <td>${latestRecord ? formatDate(latestRecord.timestamp) : '-'}</td>
    <td style="min-width: 180px;">
      ${actionButtons}
    </td>
  `;
  
  return row;
}

/**
 * ステータスラベルを生成
 */
function generateStatusLabel(record) {
  if (!record || !record.data) {
    return '<span style="color: var(--text-secondary); font-size: 0.9rem;">未入力</span>';
  }
  
  // 学習状況と学習意欲の値を取得
  const learningStatusField = studentsData.fieldDefinitions.find(f => f.id === 'learningStatus');
  const motivationField = studentsData.fieldDefinitions.find(f => f.id === 'motivation');
  
  const learningStatus = record.data.learningStatus ? parseInt(record.data.learningStatus) : 0;
  const motivation = record.data.motivation ? parseInt(record.data.motivation) : 0;
  
  // ステータス判定
  if (learningStatus <= 3 || motivation <= 3) {
    return `
      <span style="
        background: linear-gradient(135deg, #fef3c7, #fed7aa);
        color: #92400e;
        padding: 0.25rem 0.5rem;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 600;
        border: 1px solid #f59e0b;
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
      ">
        <i class="fas fa-exclamation-triangle" style="font-size: 0.7rem;"></i>
        要注意
      </span>
    `;
  } else if (learningStatus >= 4 && motivation >= 4) {
    return `
      <span style="
        background: linear-gradient(135deg, #d1fae5, #a7f3d0);
        color: #065f46;
        padding: 0.25rem 0.5rem;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 600;
        border: 1px solid #10b981;
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
      ">
        <i class="fas fa-thumbs-up" style="font-size: 0.7rem;"></i>
        良好
      </span>
    `;
  } else {
    return `
      <span style="
        background: linear-gradient(135deg, #e0f2fe, #bae6fd);
        color: #0c4a6e;
        padding: 0.25rem 0.5rem;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 600;
        border: 1px solid #0ea5e9;
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
      ">
        <i class="fas fa-minus" style="font-size: 0.7rem;"></i>
        普通
      </span>
    `;
  }
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
    <div class="modal-content parent-report-modal" style="max-width: min(1000px, 95vw); max-height: 90vh; overflow-y: auto;">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" onclick="closeAnalysisDetailModal()">&times;</button>
      </div>
      <div style="margin-bottom: 1.5rem;">
        <div class="parent-report-header" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--bg-secondary, #f8fafc); border-radius: 8px; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
          <div class="parent-report-meta-item">
            <strong style="color: var(--primary, #4f46e5);">分析日時:</strong> ${analysisDate}
          </div>
          ${studentName ? `<div class="parent-report-meta-item"><strong style="color: var(--secondary, #7c3aed);">対象児童:</strong> ${studentName}</div>` : ''}
          <div class="parent-report-meta-item">
            <span class="btn ${type === 'overall' ? 'btn-primary' : 'btn-success'}" style="padding: 0.25rem 0.75rem; font-size: 0.8rem;">
              ${type === 'overall' ? '全体分析' : '個別分析'}
            </span>
          </div>
        </div>
        <div class="analysis-content analysis-content-detail parent-report-content" style="background: white; padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border, #e2e8f0); line-height: 1.8; word-wrap: break-word; overflow-wrap: break-word;">
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
 * 名前に「さん」をハイライト表示
 */
function formatStudentName(name) {
  return `${name}<span style="color: var(--primary); font-weight: 600; margin-left: 0.2rem;">さん</span>`;
}

/**
 * 性別の表示形式を取得
 */
function getGenderDisplay(gender) {
  switch (gender) {
    case 'male':
      return '<span style="color: #3b82f6; font-weight: 500;">👦 男子</span>';
    case 'female':
      return '<span style="color: #ec4899; font-weight: 500;">👧 女子</span>';
    default:
      return '<span style="color: var(--text-secondary);">-</span>';
  }
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
      case 'multiselect':
        fieldInput = `
          <div class="behavior-tags-container" id="input_${field.id}">
            ${field.options.map((option, index) => `
              <button type="button" class="behavior-tag-button" data-value="${option}" onclick="toggleBehaviorTag(this, '${field.id}')">
                ${option}
              </button>
            `).join('')}
            <input type="hidden" name="${field.id}" id="hidden_${field.id}" value="">
          </div>
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
      const genderIcon = student.gender === 'male' ? '👦' : student.gender === 'female' ? '👧' : '';
      option.textContent = `${student.name}さん ${genderIcon} (${student.grade}年 ${student.class || ''})`;
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
        <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
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
      <td>${formatStudentName(student.name)}</td>
      <td>${student.studentNumber}</td>
      <td>${student.grade}年生</td>
      <td>${getGenderDisplay(student.gender)}</td>
      <td>${student.class || '-'}</td>
      <td>${formatDate(student.createdAt || new Date().toISOString())}</td>
      <td>${student.records ? student.records.length : 0}</td>
      <td>
        <button class="btn btn-primary" onclick="editStudent('${student.id}')">
          <i class="fas fa-edit"></i> 編集
        </button>
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

  // 未入力項目数と詳細の更新
  updateMissingInputsStatistics();
}

/**
 * 未入力項目統計の更新
 */
function updateMissingInputsStatistics() {
  const missingInputsElem = document.getElementById('missingInputs');
  const noRecentInputCountElem = document.getElementById('noRecentInputCount');
  const missingInputsList = document.getElementById('missingInputsList');
  
  if (!missingInputsElem || !missingInputsList) return;

    const fieldCount = studentsData.fieldDefinitions ? studentsData.fieldDefinitions.length : 0;
    const studentCount = studentsData.students ? studentsData.students.length : 0;
  
  if (fieldCount === 0 || studentCount === 0) {
    missingInputsElem.textContent = '0';
    if (noRecentInputCountElem) noRecentInputCountElem.textContent = '0';
    missingInputsList.innerHTML = `
      <div style="text-align: center; padding: 1rem; color: var(--text-secondary); font-size: 0.9rem;">
        <i class="fas fa-info-circle" style="margin-bottom: 0.5rem; display: block;"></i>
        ${fieldCount === 0 ? '入力項目が設定されていません' : '児童が登録されていません'}
      </div>
    `;
    return;
  }

  // 未入力の児童を詳細に分析
  const missingInputsData = analyzeMissingInputs();
  
  // 未入力項目数を表示
  missingInputsElem.textContent = missingInputsData.totalMissing;
  
  // 入力が滞っている児童数を表示
  if (noRecentInputCountElem) {
    noRecentInputCountElem.textContent = missingInputsData.studentsWithNoRecentInput.length;
  }
  
  // 未入力児童リストを生成
  generateMissingInputsList(missingInputsData);
}

/**
 * 未入力項目の分析
 */
function analyzeMissingInputs() {
  const fieldDefinitions = studentsData.fieldDefinitions || [];
  const students = studentsData.students || [];
  
  let totalMissing = 0;
  const studentsWithMissingInputs = [];
  const studentsWithNoRecentInput = [];
  
  const today = new Date();
  const threeDaysAgo = new Date(today.getTime() - (3 * 24 * 60 * 60 * 1000)); // 3日前
  
  students.forEach(student => {
    const latestRecord = student.records && student.records.length > 0 ? 
      student.records[student.records.length - 1] : null;
    
    // 最終入力日の確認
    const lastInputDate = latestRecord ? new Date(latestRecord.timestamp) : null;
    const daysSinceLastInput = lastInputDate ? 
      Math.floor((today - lastInputDate) / (24 * 60 * 60 * 1000)) : null;
    
    // 3日以上入力がない場合
    if (!lastInputDate || lastInputDate < threeDaysAgo) {
      studentsWithNoRecentInput.push({
        student: student,
        lastInputDate: lastInputDate,
        daysSinceLastInput: daysSinceLastInput,
        hasNeverInput: !lastInputDate
      });
    }
    
    const missingFields = [];
    
    fieldDefinitions.forEach(field => {
      const hasInput = latestRecord && latestRecord.data && latestRecord.data[field.id] !== undefined;
      if (!hasInput) {
        missingFields.push(field);
        totalMissing++;
      }
    });
    
    if (missingFields.length > 0) {
      studentsWithMissingInputs.push({
        student: student,
        missingFields: missingFields,
        missingCount: missingFields.length,
        totalFields: fieldDefinitions.length,
        completionRate: Math.round(((fieldDefinitions.length - missingFields.length) / fieldDefinitions.length) * 100),
        lastInputDate: lastInputDate,
        daysSinceLastInput: daysSinceLastInput
      });
    }
  });
  
  // 未入力数の多い順にソート
  studentsWithMissingInputs.sort((a, b) => b.missingCount - a.missingCount);
  
  // 入力がない日数の多い順にソート
  studentsWithNoRecentInput.sort((a, b) => {
    if (a.hasNeverInput && !b.hasNeverInput) return -1;
    if (!a.hasNeverInput && b.hasNeverInput) return 1;
    return (b.daysSinceLastInput || 0) - (a.daysSinceLastInput || 0);
  });
  
  return {
    totalMissing: totalMissing,
    studentsWithMissing: studentsWithMissingInputs,
    studentsWithNoRecentInput: studentsWithNoRecentInput,
    totalStudents: students.length,
    totalFields: fieldDefinitions.length
  };
}

/**
 * 未入力児童リストの生成
 */
function generateMissingInputsList(missingInputsData) {
  const container = document.getElementById('missingInputsList');
  const noRecentInputContainer = document.getElementById('noRecentInputsList');
  
  if (!container) return;
  
  // 未入力項目のリスト生成
  if (missingInputsData.studentsWithMissing.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 1rem; color: var(--success); font-size: 0.9rem;">
        <i class="fas fa-check-circle" style="margin-bottom: 0.5rem; display: block; font-size: 1.5rem;"></i>
        <strong>すべての児童のデータが入力済みです！</strong>
      </div>
    `;
  } else {
    let listHTML = '';
    
    missingInputsData.studentsWithMissing.forEach(item => {
      const student = item.student;
      const progressBarColor = item.completionRate >= 80 ? 'var(--success)' : 
                             item.completionRate >= 50 ? 'var(--warning)' : 'var(--error)';
      
      // 最終入力日の表示
      let lastInputInfo = '';
      if (item.daysSinceLastInput !== null) {
        lastInputInfo = `<div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">
          <i class="fas fa-clock" style="margin-right: 0.25rem;"></i>
          最終入力: ${item.daysSinceLastInput}日前
        </div>`;
      }
      
      listHTML += `
        <div style="
          background: var(--bg-secondary); 
          border-radius: 8px; 
          padding: 0.75rem; 
          margin-bottom: 0.5rem;
          border-left: 3px solid ${progressBarColor};
          cursor: pointer;
          transition: all 0.3s ease;
        " onclick="goToStudentInput('${student.id}')" onmouseover="this.style.backgroundColor='var(--bg-primary)'" onmouseout="this.style.backgroundColor='var(--bg-secondary)'">
          
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <div>
              <strong style="color: var(--text-primary); font-size: 0.9rem;">${formatStudentName(student.name)}</strong>
              <span style="color: var(--text-secondary); font-size: 0.8rem; margin-left: 0.5rem;">
                ${student.grade}年 ${student.class || ''}
              </span>
            </div>
            <div style="text-align: right;">
              <span style="color: ${progressBarColor}; font-weight: 600; font-size: 0.8rem;">
                ${item.completionRate}%
              </span>
            </div>
          </div>
          
          <div style="margin-bottom: 0.5rem;">
            <div style="background: var(--border); height: 4px; border-radius: 2px; overflow: hidden;">
              <div style="
                background: ${progressBarColor}; 
                height: 100%; 
                width: ${item.completionRate}%; 
                transition: width 0.3s ease;
              "></div>
            </div>
          </div>
          
          <div style="font-size: 0.8rem; color: var(--text-secondary);">
            <i class="fas fa-exclamation-triangle" style="color: var(--warning); margin-right: 0.25rem;"></i>
            未入力: ${item.missingCount}/${item.totalFields}項目
          </div>
          
          <div style="margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-secondary);">
            ${item.missingFields.slice(0, 3).map(field => field.name).join('、')}${item.missingFields.length > 3 ? '...' : ''}
          </div>
          
          ${lastInputInfo}
        </div>
      `;
    });
    
    container.innerHTML = listHTML;
  }
  
  // 入力が滞っている児童のリスト生成
  if (noRecentInputContainer) {
    generateNoRecentInputsList(missingInputsData.studentsWithNoRecentInput, noRecentInputContainer);
  }
}

/**
 * 入力が滞っている児童リストの生成
 */
function generateNoRecentInputsList(studentsWithNoRecentInput, container) {
  if (studentsWithNoRecentInput.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 1rem; color: var(--success); font-size: 0.9rem;">
        <i class="fas fa-check-circle" style="margin-bottom: 0.5rem; display: block; font-size: 1.5rem;"></i>
        <strong>すべての児童が定期的に入力されています！</strong>
      </div>
    `;
    return;
  }
  
  let listHTML = '';
  
  studentsWithNoRecentInput.forEach(item => {
    const student = item.student;
    const isNeverInput = item.hasNeverInput;
    const daysSince = item.daysSinceLastInput;
    
    // 緊急度に応じた色分け
    let urgencyColor = 'var(--warning)';
    let urgencyIcon = 'fas fa-clock';
    let urgencyText = `${daysSince}日前`;
    
    if (isNeverInput) {
      urgencyColor = 'var(--error)';
      urgencyIcon = 'fas fa-exclamation-triangle';
      urgencyText = '未入力';
    } else if (daysSince >= 7) {
      urgencyColor = 'var(--error)';
      urgencyIcon = 'fas fa-exclamation-triangle';
    } else if (daysSince >= 5) {
      urgencyColor = '#ff6b35';
      urgencyIcon = 'fas fa-exclamation-circle';
    }
    
    listHTML += `
      <div style="
        background: var(--bg-secondary); 
        border-radius: 8px; 
        padding: 0.75rem; 
        margin-bottom: 0.5rem;
        border-left: 3px solid ${urgencyColor};
        cursor: pointer;
        transition: all 0.3s ease;
      " onclick="goToStudentInput('${student.id}')" onmouseover="this.style.backgroundColor='var(--bg-primary)'" onmouseout="this.style.backgroundColor='var(--bg-secondary)'">
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <div>
            <strong style="color: var(--text-primary); font-size: 0.9rem;">${formatStudentName(student.name)}</strong>
            <span style="color: var(--text-secondary); font-size: 0.8rem; margin-left: 0.5rem;">
              ${student.grade}年 ${getGenderDisplay(student.gender).replace(/<[^>]*>/g, '').trim()} ${student.class || ''}
            </span>
          </div>
          <div style="text-align: right;">
            <span style="color: ${urgencyColor}; font-weight: 600; font-size: 0.8rem;">
              <i class="${urgencyIcon}" style="margin-right: 0.25rem;"></i>
              ${urgencyText}
            </span>
          </div>
        </div>
        
        <div style="font-size: 0.8rem; color: var(--text-secondary);">
          ${isNeverInput ? 
            '<i class="fas fa-user-plus" style="color: var(--error); margin-right: 0.25rem;"></i>まだ一度も入力されていません' :
            `<i class="fas fa-calendar-times" style="color: ${urgencyColor}; margin-right: 0.25rem;"></i>最終入力: ${formatDate(item.lastInputDate)}`
          }
        </div>
        
        ${daysSince >= 7 ? `
          <div style="margin-top: 0.5rem; padding: 0.5rem; background: rgba(239, 68, 68, 0.1); border-radius: 4px; border-left: 2px solid var(--error);">
            <span style="color: var(--error); font-size: 0.75rem; font-weight: 600;">
              <i class="fas fa-exclamation-triangle" style="margin-right: 0.25rem;"></i>
              要注意: 1週間以上入力がありません
            </span>
          </div>
        ` : ''}
      </div>
    `;
  });
  
  container.innerHTML = listHTML;
}

/**
 * 未入力項目詳細のトグル
 */
function toggleMissingInputsDetail() {
  const detailDiv = document.getElementById('missingInputsDetail');
  const toggleIcon = document.getElementById('missingInputsToggle');
  
  if (!detailDiv || !toggleIcon) return;
  
  if (detailDiv.classList.contains('hidden')) {
    detailDiv.classList.remove('hidden');
    toggleIcon.style.transform = 'rotate(180deg)';
    // 詳細データを更新
    updateMissingInputsStatistics();
  } else {
    detailDiv.classList.add('hidden');
    toggleIcon.style.transform = 'rotate(0deg)';
  }
}

/**
 * 児童の入力画面に移動
 */
function goToStudentInput(studentId) {
  // 進捗データ入力タブに切り替え
  switchTab('input');
  
  // 児童を選択
  setTimeout(() => {
    const studentSelect = document.getElementById('studentSelect');
    if (studentSelect) {
      studentSelect.value = studentId;
      
      // 選択をハイライト
      studentSelect.style.borderColor = 'var(--primary)';
      studentSelect.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
      
      setTimeout(() => {
        studentSelect.style.borderColor = '';
        studentSelect.style.boxShadow = '';
      }, 2000);
    }
  }, 100);
  
  showAlert('該当児童の入力画面に移動しました', 'info');
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
  
  // 行動タグボタンの選択状態をリセット
  const behaviorTagButtons = document.querySelectorAll('.behavior-tag-button.selected');
  behaviorTagButtons.forEach(button => {
    button.classList.remove('selected');
  });
  
  // hidden inputの値もクリア
  const hiddenInputs = document.querySelectorAll('input[id^="hidden_"]');
  hiddenInputs.forEach(input => {
    input.value = '';
  });
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
    const gender = document.getElementById('studentGender').value;
    const studentClass = document.getElementById('studentClass').value.trim();
    
    // バリデーション
    if (!name || !studentNumber || !grade || !gender) {
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
      gender,
      class: studentClass,
      records: [],
      createdAt: new Date().toISOString()
    };
    
    studentsData.students.push(newStudent);
    saveData();
    
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
      } else if (field.type === 'multiselect') {
        // multiselectの場合、hidden inputから値を取得
        const hiddenInput = document.getElementById(`hidden_${field.id}`);
        if (hiddenInput && hiddenInput.value) {
          try {
            value = JSON.parse(hiddenInput.value);
            if (Array.isArray(value) && value.length > 0) {
              hasData = true;
            }
          } catch (error) {
            console.error('行動タグデータの解析エラー:', error);
          }
        }
      } else if (element.value && element.value.trim()) {
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
  
  // フォームリセット
  document.getElementById('progressInputForm').reset();
  
  // 行動タグボタンの選択状態をリセット
  const behaviorTagButtons = document.querySelectorAll('.behavior-tag-button.selected');
  behaviorTagButtons.forEach(button => {
    button.classList.remove('selected');
  });
  
  // hidden inputの値もクリア
  const hiddenInputs = document.querySelectorAll('input[id^="hidden_"]');
  hiddenInputs.forEach(input => {
    input.value = '';
  });
  
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
  
  // 親御さん向けレポート履歴の初期化
  if (!localStorage.getItem('parentReportHistory')) {
    localStorage.setItem('parentReportHistory', JSON.stringify([]));
  }
  
  // 分析履歴の有無に関わらず、AI分析結果テーブルを表示
  setTimeout(() => {
    displayAnalysisResults(analysisHistory); // 空配列でも適切なメッセージを表示
    updateAnalysisHistoryPreview();
    updateParentReportHistory();
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
      const genderIcon = student.gender === 'male' ? '👦' : student.gender === 'female' ? '👧' : '';
      option.textContent = `${student.name}さん ${genderIcon} (${student.grade}年 ${student.class || ''})`;
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
    distribution: {},
    avgLearningStatus: 0,
    avgMotivation: 0,
    homeworkSubmissionRate: 0
  };

  // 5段階評価項目の統計を計算
  studentsData.fieldDefinitions.forEach(field => {
    if (field.type === 'select') {
      const values = recentData
        .map(item => item.data[field.id])
        .filter(val => val && !isNaN(val))
        .map(val => parseInt(val));
      
      if (values.length > 0) {
        const average = values.reduce((sum, val) => sum + val, 0) / values.length;
        stats.averages[field.name] = average.toFixed(1);
        
        // 特定項目の平均を個別に保存
        if (field.id === 'learningStatus') {
          stats.avgLearningStatus = average;
        }
        if (field.id === 'motivation') {
          stats.avgMotivation = average;
        }
        
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

  // 宿題提出率の計算
  const homeworkData = recentData
    .map(item => item.data.homework)
    .filter(val => val !== undefined);
  
  if (homeworkData.length > 0) {
    const submittedCount = homeworkData.filter(val => val === true || val === '提出').length;
    stats.homeworkSubmissionRate = submittedCount / homeworkData.length;
  }

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
      } else if (field.type === 'multiselect' && Array.isArray(value) && value.length > 0) {
        const behaviorAnalysis = analyzeBehaviorTags(value, studentName);
        analyses.push(`- **${field.name}**: ${behaviorAnalysis}`);
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
  
  // Unicode区切り線をCSSボーダーに変換
  content = content.replace(/━+/g, '<div class="parent-report-divider"></div>');
  
  // マークダウン風の書式を適用（改良版）
  return content
    .replace(/### (.*?)(?=\n|$)/g, '<h3 class="parent-report-h3">$1</h3>')
    .replace(/#### (.*?)(?=\n|$)/g, '<h4 class="parent-report-h4">$1</h4>')
    .replace(/##### (.*?)(?=\n|$)/g, '<h5 class="parent-report-h5">$1</h5>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="parent-report-strong">$1</strong>')
    .replace(/^・\s*(.*?)(?=\n|$)/gm, '<li class="parent-report-list-item">$1</li>')
    .replace(/^-\s*(.*?)(?=\n|$)/gm, '<li class="parent-report-list-item">$1</li>')
    .replace(/^\n+/gm, '')
    .replace(/\n\n+/g, '</p><p class="parent-report-paragraph">')
    .replace(/^([^<])/, '<p class="parent-report-paragraph">$1')
    .replace(/([^>])$/, '$1</p>')
    .replace(/(<li class="parent-report-list-item">.*?<\/li>)/gs, '<ul class="parent-report-list">$1</ul>')
    .replace(/<\/ul>\s*<ul class="parent-report-list">/g, '')
    .replace(/---\n\*(.*)/g, '<hr class="parent-report-hr"><p class="parent-report-note">$1</p>');
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

  title.innerHTML = `${formatStudentName(student.name)}の進捗履歴`;

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
        <td>${formatStudentName(student.name)}</td>
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
  
  updateUI();
  updateStudentManagementSettings(); // 設定画面も更新
  showAlert(`${student.name}さんを削除しました`, 'success');
}

/**
 * ======================
 * 親御さん向けレポート機能
 * ======================
 */

/**
 * 親御さん向けレポート生成
 */
function generateParentReport(type) {
  if (type === 'class') {
    openClassReportModal();
  } else if (type === 'individual') {
    // 個別レポート用のモーダルを表示
    updateParentReportStudentModal();
    document.getElementById('parentReportStudentModal').classList.add('show');
  }
}

/**
 * クラス全体レポートモーダルを開く
 */
function openClassReportModal() {
  if (!studentsData.students || studentsData.students.length === 0) {
    showAlert('レポート作成対象の児童データがありません', 'warning');
    return;
  }
  
  // モーダルをリセット
  document.getElementById('classReportGrade').value = '';
  document.getElementById('classReportClass').innerHTML = '<option value="">クラスを選択</option>';
  document.getElementById('classReportPreview').style.display = 'none';
  document.getElementById('classReportGenerateBtn').disabled = true;
  
  document.getElementById('classReportModal').classList.add('show');
}

/**
 * 学年選択に基づいてクラス選択肢を更新
 */
function updateClassReportClassOptions() {
  const gradeSelect = document.getElementById('classReportGrade');
  const classSelect = document.getElementById('classReportClass');
  const selectedGrade = parseInt(gradeSelect.value);
  
  // クラス選択をリセット
  classSelect.innerHTML = '<option value="">クラスを選択</option>';
  document.getElementById('classReportPreview').style.display = 'none';
  document.getElementById('classReportGenerateBtn').disabled = true;
  
  if (!selectedGrade) return;
  
  // 選択された学年の児童からクラス一覧を作成
  const classesInGrade = new Set();
  studentsData.students
    .filter(student => student.grade === selectedGrade)
    .forEach(student => {
      if (student.class && student.class.trim()) {
        classesInGrade.add(student.class.trim());
      }
    });
  
  // クラス選択肢を追加
  if (classesInGrade.size > 0) {
    // 「すべてのクラス」オプションを最初に追加
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'すべてのクラス';
    classSelect.appendChild(allOption);
    
    // 個別クラスオプションを追加
    Array.from(classesInGrade).sort().forEach(className => {
      const option = document.createElement('option');
      option.value = className;
      option.textContent = className;
      classSelect.appendChild(option);
    });
  } else {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'この学年にはクラス情報がありません';
    option.disabled = true;
    classSelect.appendChild(option);
  }
}

/**
 * クラス選択に基づいて対象児童をプレビュー表示
 */
function updateClassReportPreview() {
  const gradeSelect = document.getElementById('classReportGrade');
  const classSelect = document.getElementById('classReportClass');
  const previewDiv = document.getElementById('classReportPreview');
  const studentListDiv = document.getElementById('classReportStudentList');
  const generateBtn = document.getElementById('classReportGenerateBtn');
  
  const selectedGrade = parseInt(gradeSelect.value);
  const selectedClass = classSelect.value;
  
  if (!selectedGrade || !selectedClass) {
    previewDiv.style.display = 'none';
    generateBtn.disabled = true;
    return;
  }
  
  // 対象児童を取得
  let targetStudents;
  if (selectedClass === 'all') {
    // すべてのクラスを対象
    targetStudents = studentsData.students.filter(student => student.grade === selectedGrade);
  } else {
    // 特定のクラスを対象
    targetStudents = studentsData.students.filter(student => 
      student.grade === selectedGrade && student.class === selectedClass
    );
  }
  
  if (targetStudents.length === 0) {
    studentListDiv.innerHTML = '<span style="color: var(--warning);">この学年には児童がいません</span>';
    generateBtn.disabled = true;
  } else {
    let displayInfo = '';
    
    if (selectedClass === 'all') {
      // クラス別に分けて表示
      const classSummary = new Map();
      targetStudents.forEach(student => {
        const className = student.class || '未設定';
        if (!classSummary.has(className)) {
          classSummary.set(className, []);
        }
        classSummary.get(className).push(student);
      });
      
      const classDetails = Array.from(classSummary.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([className, students]) => {
          const genderCounts = students.reduce((acc, student) => {
            const gender = student.gender === 'male' ? '男子' : student.gender === 'female' ? '女子' : 'その他';
            acc[gender] = (acc[gender] || 0) + 1;
            return acc;
          }, {});
          const genderInfo = Object.entries(genderCounts).map(([gender, count]) => `${gender}${count}名`).join(', ');
          return `${className}: ${students.length}名 (${genderInfo})`;
        });
      
      displayInfo = `
        <strong>対象: ${selectedGrade}年生全体 ${targetStudents.length}名</strong><br>
        <div style="margin-top: 0.5rem; font-size: 0.9rem; line-height: 1.4;">
          ${classDetails.join('<br>')}
        </div>
      `;
    } else {
      // 個別クラスの場合
      const studentNames = targetStudents.map(student => {
        const genderIcon = student.gender === 'male' ? '👦' : student.gender === 'female' ? '👧' : '';
        const recordCount = student.records ? student.records.length : 0;
        return `${student.name}さん ${genderIcon} (記録: ${recordCount}件)`;
      });
      
      displayInfo = `
        <strong>対象: ${targetStudents.length}名</strong><br>
        ${studentNames.join(', ')}
      `;
    }
    
    studentListDiv.innerHTML = displayInfo;
    generateBtn.disabled = false;
  }
  
  previewDiv.style.display = 'block';
}

/**
 * クラス全体レポート生成実行
 */
function executeClassReportGeneration() {
  const gradeSelect = document.getElementById('classReportGrade');
  const classSelect = document.getElementById('classReportClass');
  const selectedGrade = parseInt(gradeSelect.value);
  const selectedClass = classSelect.value;
  
  if (!selectedGrade || !selectedClass) {
    showAlert('学年とクラスを選択してください', 'error');
    return;
  }
  
  // 対象児童を取得
  let targetStudents;
  let reportLabel;
  
  if (selectedClass === 'all') {
    // すべてのクラスを対象
    targetStudents = studentsData.students.filter(student => student.grade === selectedGrade);
    reportLabel = `${selectedGrade}年生全体`;
  } else {
    // 特定のクラスを対象
    targetStudents = studentsData.students.filter(student => 
      student.grade === selectedGrade && student.class === selectedClass
    );
    reportLabel = `${selectedGrade}年${selectedClass}`;
  }
  
  if (targetStudents.length === 0) {
    showAlert('対象の児童がいません', 'error');
    return;
  }
  
  // モーダルを閉じる
  closeModal('classReportModal');
  
  // レポート生成中の表示
  showAnalysisLoading(`${reportLabel}の親御さん向けレポートを作成中...`);
  
  setTimeout(() => {
    let classParentReport;
    if (selectedClass === 'all') {
      // 学年全体のレポート生成
      classParentReport = generateClassParentReportContentForGrade(selectedGrade, targetStudents);
    } else {
      // 特定クラスのレポート生成
      classParentReport = generateClassParentReportContentForClass(selectedGrade, selectedClass, targetStudents);
    }
    
    saveParentReportToHistory(classParentReport);
    updateParentReportHistory();
    showParentReportDetail(classParentReport);
    showAlert(`${reportLabel}の親御さん向けレポートが完成しました`, 'success');
  }, 2500);
}

/**
 * 親御さん向け個別レポート選択モーダルの更新
 */
function updateParentReportStudentModal() {
  const select = document.getElementById('parentReportStudentSelect');
  if (!select) return;

  select.innerHTML = '<option value="">児童を選択してください</option>';
  
  if (studentsData.students) {
    studentsData.students.forEach(student => {
      const option = document.createElement('option');
      option.value = student.id;
      const genderIcon = student.gender === 'male' ? '👦' : student.gender === 'female' ? '👧' : '';
      option.textContent = `${student.name}さん ${genderIcon} (${student.grade}年 ${student.class || ''})`;
      select.appendChild(option);
    });
  }
}

/**
 * 親御さん向け個別レポート実行
 */
function executeParentReportGeneration() {
  const studentId = document.getElementById('parentReportStudentSelect').value;
  
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
  closeModal('parentReportStudentModal');

  // レポート生成中の表示
  showAnalysisLoading(`${student.name}さんの親御さん向けレポートを作成中...`);

  // レポート生成のシミュレーション
  setTimeout(() => {
    const parentReport = generateIndividualParentReport(student);
    saveParentReportToHistory(parentReport);
    updateParentReportHistory();
    showParentReportDetail(parentReport);
    showAlert(`${student.name}さんの親御さん向けレポートが完成しました`, 'success');
  }, 2500);
}

/**
 * クラス全体の親御さん向けレポート生成
 */
function generateClassParentReport() {
  if (!studentsData.students || studentsData.students.length === 0) {
    showAlert('レポート作成対象の児童データがありません', 'warning');
    return;
  }

  // レポート生成中の表示
  showAnalysisLoading('クラス全体の親御さん向けレポートを作成中...');

  setTimeout(() => {
    const classParentReport = generateClassParentReportContent();
    saveParentReportToHistory(classParentReport);
    updateParentReportHistory();
    showParentReportDetail(classParentReport);
    showAlert('クラス全体の親御さん向けレポートが完成しました', 'success');
  }, 2500);
}

/**
 * クラス全体の親御さん向けレポート内容生成（全体用・旧関数）
 */
function generateClassParentReportContent() {
  const totalStudents = studentsData.students.length;
  const studentsWithRecords = studentsData.students.filter(s => s.records && s.records.length > 0);
  
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

  const stats = calculateLearningStats(recentData);
  
  const content = `🌸 **クラスの様子をお伝えします**

保護者の皆様、いつもお子様の教育にご協力いただき、ありがとうございます。
今回は、クラス全体の様子について、温かい気持ちでお伝えさせていただきます。

━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 **クラス全体の学習の様子**

お子様たちは、毎日一生懸命学習に取り組んでいます。

✨ **素晴らしいところ**

・クラス全体で、お互いを思いやりながら学習に取り組んでいます

・分からないことがあると、友達同士で教え合う姿がよく見られます

・新しいことに挑戦する意欲が、日に日に高まっています

・みんなで協力して、温かいクラスの雰囲気を作り上げています

📈 **学習の成長（数値で見る頑張り）**
・**学習への取り組み**: クラス平均 **${stats.avgLearningStatus.toFixed(1)}点**（5点満点）
・**学習への意欲**: クラス平均 **${stats.avgMotivation.toFixed(1)}点**（5点満点）
・**宿題への取り組み**: **${Math.round((stats.homeworkSubmissionRate || 0) * 100)}%**のお子様が継続的に頑張っています。

━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏠 **ご家庭でのサポートのお願い**

📖 **学習面でのサポート**

・お子様が学校での出来事を話してくれたときは、**ぜひ最後まで聞いてあげてください**

・宿題に取り組む時間を、**できるだけ決まった時間**にしていただけると助かります

・分からないことがあっても、**まずはお子様自身で考える時間**を作ってあげてください

・学習内容について、お子様と一緒に**興味を持って話題にしてください**

💝 **心の面でのサポート**

・**小さな頑張りでも、たくさん褒めてあげてください**

・**失敗しても大丈夫だということ**を、お子様に伝えてあげてください

・学校での楽しかったことを、**一緒に喜んでいただけると嬉しいです**

・お子様の気持ちに寄り添い、**安心できる家庭環境**を作ってあげてください

━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌟 **これからの目標**

クラス全体で、以下のことを大切にしていきたいと思います：

1. **お互いを大切にする心** - 友達の良いところを見つけて、認め合える関係づくり

2. **挑戦する勇気** - 新しいことにも、みんなで協力して取り組む姿勢

3. **継続する力** - 毎日の小さな積み重ねを大切にする習慣

4. **思いやりの気持ち** - 困っている友達がいたら、優しく支え合う心

━━━━━━━━━━━━━━━━━━━━━━━━━━━

💌 **保護者の皆様へ**

お子様たちは、毎日本当によく頑張っています。
ご家庭でも、お子様の小さな成長を見つけて、**たくさん褒めてあげてください**。

何かご心配なことやご質問がございましたら、**いつでもお気軽にお声かけください**。
お子様の成長を、一緒に見守らせていただけることを、心より嬉しく思っています。

---
**作成日**: ${new Date().toLocaleDateString('ja-JP')}  
**備考**: このレポートは、日々の観察記録をもとに作成しています`;

  return {
    id: `class_parent_report_all_${Date.now()}`,
    type: 'class_parent',
    grade: null,
    className: 'all',
    title: '🌸 クラス全体の様子（保護者向け）',
    content: content,
    timestamp: new Date().toISOString(),
    studentCount: totalStudents
  };
}

/**
 * 学年全体用の親御さん向けレポート生成
 */
function generateClassParentReportContentForGrade(grade, targetStudents) {
  const totalStudents = targetStudents.length;
  const studentsWithRecords = targetStudents.filter(s => s.records && s.records.length > 0);
  
  // クラス別の情報を集計
  const classSummary = new Map();
  targetStudents.forEach(student => {
    const className = student.class || '未設定';
    if (!classSummary.has(className)) {
      classSummary.set(className, {
        students: [],
        withRecords: 0
      });
    }
    classSummary.get(className).students.push(student);
    if (student.records && student.records.length > 0) {
      classSummary.get(className).withRecords++;
    }
  });
  
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

  const stats = calculateLearningStats(recentData);
  
  // 行動タグの統計を取得
  const behaviorStats = calculateBehaviorTagStatsForClass(recentData);
  
  // クラス別の詳細情報
  const classDetails = Array.from(classSummary.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([className, info]) => {
      const genderCounts = info.students.reduce((acc, student) => {
        const gender = student.gender === 'male' ? '男子' : student.gender === 'female' ? '女子' : 'その他';
        acc[gender] = (acc[gender] || 0) + 1;
        return acc;
      }, {});
      const genderInfo = Object.entries(genderCounts).map(([gender, count]) => `${gender}${count}名`).join(', ');
      return `- **${className}**: ${info.students.length}名 (${genderInfo}) - 記録のあるお子様: ${info.withRecords}名`;
    }).join('\n');
  
  const content = `🌸 **${grade}年生全体の様子をお伝えします**

${grade}年生の保護者の皆様、いつもお子様の教育にご協力いただき、ありがとうございます。
今回は、${grade}年生全体の様子について、温かい気持ちでお伝えさせていただきます。

━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 **${grade}年生全体の学習の様子**

**対象**: ${totalStudents}名のお子様（記録のあるお子様: ${studentsWithRecords.length}名）

📋 **クラス別の構成**
${classDetails}

お子様たちは、各クラスでそれぞれの個性を活かしながら、毎日一生懸命学習に取り組んでいます。

✨ **${grade}年生全体の素晴らしいところ**

・**学年の結束**: ${grade}年生全体で、お互いを思いやりながら学習に取り組んでいます

・**協力する姿勢**: クラスを超えて、分からないことがあると友達同士で教え合う姿がよく見られます

・**学年らしい成長**: ${grade}年生らしく、新しいことに挑戦する意欲が日に日に高まっています

・**多様性の尊重**: 各クラスの特色を活かしながら、学年全体で温かい雰囲気を作り上げています

・**思いやりの心**: 学年を超えて、下級生や上級生との関わりも大切にしています

📈 **学習の成長（数値で見る頑張り）**
${recentData.length > 0 ? `
・**学習への取り組み**: 学年平均 **${stats.avgLearningStatus.toFixed(1)}点**（5点満点）
・**学習への意欲**: 学年平均 **${stats.avgMotivation.toFixed(1)}点**（5点満点）
・**宿題への取り組み**: **${Math.round((stats.homeworkSubmissionRate || 0) * 100)}%**のお子様が継続的に頑張っています。` : `
・現在、学習記録を蓄積中です。お子様たちの頑張りをしっかりと記録していきます。`}

🌟 **${grade}年生の行動の特徴**
${behaviorStats}

━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏠 **ご家庭でのサポートのお願い**

📖 **学習面でのサポート（${grade}年生向け）**

・${grade}年生のお子様が学校での出来事を話してくれたときは、**ぜひ最後まで聞いてあげてください**

・宿題に取り組む時間を、**できるだけ決まった時間**にしていただけると助かります

・分からないことがあっても、**まずはお子様自身で考える時間**を作ってあげてください

・${grade}年生の発達段階に合わせて、**適度な挑戦**と**十分な支援**のバランスを心がけてください

・学年の特性を理解して、**お子様の成長段階に応じた関わり**をお願いします

💝 **心の面でのサポート**

・**小さな頑張りでも、たくさん褒めてあげてください**

・**失敗しても大丈夫だということ**を、お子様に伝えてあげてください

・学校での楽しかったことを、**一緒に喜んでいただけると嬉しいです**

・${grade}年生のお友達との関係についても、**温かく見守ってください**

・お子様の気持ちの変化に敏感に気づき、**適切にサポートしてください**

━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌟 **${grade}年生全体のこれからの目標**

学年全体で、以下のことを大切にしていきたいと思います：

1. **お互いを大切にする心** - ${grade}年生の仲間として、友達の良いところを見つけて認め合う

2. **${grade}年生らしい挑戦** - 新しいことにも、みんなで協力して取り組む姿勢

3. **継続する力** - 毎日の小さな積み重ねを大切にする習慣

4. **学年の絆** - クラスは違っても${grade}年生としての一体感を大切にする

5. **成長への意識** - ${grade}年生としての責任と誇りを持ち続ける

━━━━━━━━━━━━━━━━━━━━━━━━━━━

💌 **${grade}年生の保護者の皆様へ**

${grade}年生のお子様たちは、毎日本当によく頑張っています。
ご家庭でも、お子様の小さな成長を見つけて、**たくさん褒めてあげてください**。

${grade}年生全体に関すること、クラスのこと、個別のお子様のことなど、
何かご心配なことやご質問がございましたら、**いつでもお気軽にお声かけください**。

${grade}年生のお子様たちの成長を、一緒に見守らせていただけることを、心より嬉しく思っています。

---
**作成日**: ${new Date().toLocaleDateString('ja-JP')}  
**対象**: ${grade}年生全体（${totalStudents}名）  
**備考**: このレポートは、${grade}年生全体の日々の観察記録をもとに作成しています`;

  return {
    id: `class_parent_report_${grade}_all_${Date.now()}`,
    type: 'class_parent',
    grade: grade,
    className: 'all',
    title: `🌸 ${grade}年生全体の様子（保護者向け）`,
    content: content,
    timestamp: new Date().toISOString(),
    studentCount: totalStudents,
    targetStudents: targetStudents.map(s => s.name)
  };
}

/**
 * 特定クラス用の親御さん向けレポート生成
 */
function generateClassParentReportContentForClass(grade, className, targetStudents) {
  const totalStudents = targetStudents.length;
  const studentsWithRecords = targetStudents.filter(s => s.records && s.records.length > 0);
  
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

  const stats = calculateLearningStats(recentData);
  
  const content = `🌸 **${grade}年${className}の様子をお伝えします**

${grade}年${className}の保護者の皆様、いつもお子様の教育にご協力いただき、ありがとうございます。
今回は、${grade}年${className}の様子について、温かい気持ちでお伝えさせていただきます。

━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 **${grade}年${className}の学習の様子**

**対象**: ${totalStudents}名のお子様（記録のあるお子様: ${studentsWithRecords.length}名）

お子様たちは、毎日一生懸命学習に取り組んでいます。

✨ **${grade}年${className}の素晴らしいところ**
・クラス全体で、お互いを思いやりながら学習に取り組んでいます
・分からないことがあると、友達同士で教え合う姿がよく見られます
・${grade}年生らしく、新しいことに挑戦する意欲が日に日に高まっています
・${className}独特の温かい雰囲気の中で、みんなが安心して学習できています

📈 **学習の成長（数値で見る頑張り）**
${recentData.length > 0 ? `
・**学習への取り組み**: クラス平均 **${stats.avgLearningStatus.toFixed(1)}点**（5点満点）
・**学習への意欲**: クラス平均 **${stats.avgMotivation.toFixed(1)}点**（5点満点）
・**宿題への取り組み**: **${Math.round((stats.homeworkSubmissionRate || 0) * 100)}%**のお子様が継続的に頑張っています。` : `
・現在、学習記録を蓄積中です。お子様たちの頑張りをしっかりと記録していきます。`}

━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏠 **ご家庭でのサポートのお願い**

📖 **学習面でのサポート（${grade}年生向け）**
・${grade}年生のお子様が学校での出来事を話してくれたときは、**ぜひ最後まで聞いてあげてください**
・宿題に取り組む時間を、**できるだけ決まった時間**にしていただけると助かります
・分からないことがあっても、**まずはお子様自身で考える時間**を作ってあげてください
・${grade}年生の発達段階に合わせて、**適度な挑戦**と**十分な支援**のバランスを心がけてください

💝 **心の面でのサポート**
・**小さな頑張りでも、たくさん褒めてあげてください**
・**失敗しても大丈夫だということ**を、お子様に伝えてあげてください
・学校での楽しかったことを、**一緒に喜んでいただけると嬉しいです**
・${className}のお友達との関係についても、**温かく見守ってください**

━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌟 **${grade}年${className}のこれからの目標**

クラス全体で、以下のことを大切にしていきたいと思います：

1. **お互いを大切にする心** - ${className}の仲間として、友達の良いところを見つけて認め合う
2. **${grade}年生らしい挑戦** - 新しいことにも、みんなで協力して取り組む姿勢
3. **継続する力** - 毎日の小さな積み重ねを大切にする習慣
4. **クラスの絆** - ${className}ならではの温かい雰囲気を大切にする

━━━━━━━━━━━━━━━━━━━━━━━━━━━

💌 **${grade}年${className}の保護者の皆様へ**

${grade}年${className}のお子様たちは、毎日本当によく頑張っています。
ご家庭でも、お子様の小さな成長を見つけて、**たくさん褒めてあげてください**。

${grade}年${className}特有のご相談や、クラス全体に関すること、個別のお子様のことなど、
何かご心配なことやご質問がございましたら、**いつでもお気軽にお声かけください**。

${grade}年${className}のお子様たちの成長を、一緒に見守らせていただけることを、心より嬉しく思っています。

---
**作成日**: ${new Date().toLocaleDateString('ja-JP')}  
**対象クラス**: ${grade}年${className}（${totalStudents}名）  
**備考**: このレポートは、${grade}年${className}の日々の観察記録をもとに作成しています`;

  return {
    id: `class_parent_report_${grade}_${className}_${Date.now()}`,
    type: 'class_parent',
    grade: grade,
    className: className,
    title: `🌸 ${grade}年${className}の様子（保護者向け）`,
    content: content,
    timestamp: new Date().toISOString(),
    studentCount: totalStudents,
    targetStudents: targetStudents.map(s => s.name)
  };
}

/**
 * 個別の親御さん向けレポート生成
 */
function generateIndividualParentReport(student) {
  const records = student.records || [];
  const latestRecord = records.length > 0 ? records[records.length - 1] : null;
  
  if (!latestRecord || !latestRecord.data) {
    return generateNoDataParentReport(student);
  }

  const data = latestRecord.data;
  const learningStatus = data.learningStatus ? parseInt(data.learningStatus) : 0;
  const motivation = data.motivation ? parseInt(data.motivation) : 0;
  const homework = data.homework || '';
  
  // 成長の傾向を分析
  const growthTrend = analyzeStudentGrowthForParents(records, student.name);
  
  const content = `💝 **${student.name}さんの成長の様子**

${student.name}さんの保護者様、いつも温かいご支援をいただき、ありがとうございます。
${student.name}さんの最近の学校での様子を、愛情を込めてお伝えさせていただきます。

━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌟 **${student.name}さんの素晴らしいところ**

${generateStudentStrengthsForParents(data, student.name)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 **学習面での成長**

**現在の様子**
・**学習への取り組み**: **${learningStatus}/5点** - ${getLearningStatusMessageForParents(learningStatus)}
・**学習への意欲**: **${motivation}/5点** - ${getMotivationMessageForParents(motivation)}
・**宿題への取り組み**: ${getHomeworkMessageForParents(homework)}

**成長の様子**
${growthTrend}

━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏠 **ご家庭でのサポートのご提案**

${generateHomeSupport(data, student.name)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━

💌 **${student.name}さんへの応援メッセージ**

${generateEncouragementMessage(data, student.name)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━

📞 **今後の連携について**

${generateCollaborationMessage(data, student.name)}

---
${student.name}さんの成長を、一緒に見守らせていただけることを心より嬉しく思っています。

**作成日**: ${new Date().toLocaleDateString('ja-JP')}`;

  return {
    id: `individual_parent_report_${student.id}_${Date.now()}`,
    type: 'individual_parent',
    studentId: student.id,
    studentName: student.name,
    title: `💝 ${student.name}さんの成長レポート（保護者向け）`,
    content: content,
    timestamp: new Date().toISOString()
  };
}

/**
 * データ不足時の親御さん向けレポート
 */
function generateNoDataParentReport(student) {
  const content = `💝 **${student.name}さんについて**

${student.name}さんの保護者様、いつもありがとうございます。

━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 **現在の状況**

${student.name}さんについては、まだ詳しい学習記録が蓄積されていない状況です。
これから${student.name}さんの成長の様子を、しっかりと記録していきたいと思います。

━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌱 **これからの取り組み**

・**観察の強化**: ${student.name}さんの日々の様子をより詳しく記録します
・**個別の関わり**: ${student.name}さんの個性を大切にした指導を心がけます
・**定期的な報告**: 成長の様子を定期的にお伝えします

━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤝 **保護者様へのお願い**

・ご家庭での${student.name}さんの様子で、気になることがあれば**お聞かせください**
・学校での様子について、何かご質問があれば**いつでもお声かけください**

---
${student.name}さんの素晴らしい成長を、一緒に支えていきましょう。

**作成日**: ${new Date().toLocaleDateString('ja-JP')}`;

  return {
    id: `individual_parent_report_${student.id}_${Date.now()}`,
    type: 'individual_parent',
    studentId: student.id,
    studentName: student.name,
    title: `💝 ${student.name}さんについて（保護者向け）`,
    content: content,
    timestamp: new Date().toISOString()
  };
}

/**
 * 親御さん向けの学習状況メッセージ
 */
function getLearningStatusMessageForParents(status) {
  if (status >= 5) return '本当に素晴らしい取り組みです！この調子で頑張っています';
  if (status >= 4) return 'とても良く頑張っています！';
  if (status >= 3) return '着実に取り組んでいます。';
  if (status >= 2) return '一生懸命頑張っています。少しずつ成長しています';
  return 'これから一緒に頑張っていきましょう。';
}

/**
 * 親御さん向けの学習意欲メッセージ
 */
function getMotivationMessageForParents(motivation) {
  if (motivation >= 5) return '学習への意欲がとても高く、積極的に取り組んでいます！';
  if (motivation >= 4) return '意欲的に学習に取り組んでいます！';
  if (motivation >= 3) return '安定して学習に向き合っています。';
  if (motivation >= 2) return '少しずつ学習への興味が育っています。';
  return 'これから一緒に学習の楽しさを見つけていきましょう。';
}

/**
 * 親御さん向けの宿題メッセージ
 */
function getHomeworkMessageForParents(homework) {
  if (homework === '提出') return '宿題をしっかりと提出しています。素晴らしいです！';
  if (homework === '一部提出') return '宿題に取り組んでいます。継続していきましょう。';
  return '宿題への取り組みを一緒にサポートしていきましょう。';
}

/**
 * 親御さん向けの児童の強み生成
 */
function generateStudentStrengthsForParents(data, studentName) {
  const strengths = [];
  
  const learningStatus = data.learningStatus ? parseInt(data.learningStatus) : 0;
  const motivation = data.motivation ? parseInt(data.motivation) : 0;
  
  // 行動タグから強みを抽出
  const behaviorTags = data.behaviorTags || [];
  const behaviorStrengths = extractBehaviorStrengthsForParents(behaviorTags, studentName);
  
  if (learningStatus >= 4) {
    strengths.push(`📚 **学習への取り組みがとても素晴らしく**、集中して課題に向き合っています`);
  }
  
  if (motivation >= 4) {
    strengths.push(`✨ **新しいことを学ぶことに意欲的で**、積極的に手を挙げて発言しています`);
  }
  
  if (data.homework === '提出') {
    strengths.push(`📝 **宿題をきちんと提出し**、責任感を持って取り組んでいます`);
  }
  
  // 行動タグからの強みを追加
  strengths.push(...behaviorStrengths);
  
  if (strengths.length === 0) {
    strengths.push(`🌱 **${studentName}さんなりのペース**で、一生懸命頑張っています`);
    strengths.push(`💪 **毎日学校に来て**、クラスの一員として大切な存在です`);
  }
  
  return strengths.map(strength => `- ${strength}`).join('\n');
}

/**
 * 親御さん向けの成長分析
 */
function analyzeStudentGrowthForParents(records, studentName) {
  if (records.length < 2) {
    return `\n📈 成長の記録\n${studentName}さんの成長の様子を、これからしっかりと記録していきます。`;
  }
  
  const recent = records.slice(-2);
  const prev = recent[0].data;
  const current = recent[1].data;
  
  const prevLearning = prev.learningStatus ? parseInt(prev.learningStatus) : 0;
  const currentLearning = current.learningStatus ? parseInt(current.learningStatus) : 0;
  const prevMotivation = prev.motivation ? parseInt(prev.motivation) : 0;
  const currentMotivation = current.motivation ? parseInt(current.motivation) : 0;
  
  let growthMessage = `**📈 最近の成長**\n`;
  
  if (currentLearning > prevLearning) {
    growthMessage += `- **学習面で素晴らしい成長が見られます！** 前回より${currentLearning - prevLearning}ポイント向上しています\n`;
  } else if (currentLearning === prevLearning && currentLearning >= 3) {
    growthMessage += `- 学習面で**安定した取り組み**を続けています\n`;
  }
  
  if (currentMotivation > prevMotivation) {
    growthMessage += `- 学習への意欲が**さらに高まっています！**\n`;
  } else if (currentMotivation === prevMotivation && currentMotivation >= 3) {
    growthMessage += `- 学習への意欲を**継続して保っています**\n`;
  }
  
  // 行動タグの変化を分析
  const behaviorGrowth = analyzeBehaviorTagsGrowthForParents(prev, current, studentName);
  if (behaviorGrowth) {
    growthMessage += behaviorGrowth;
  }
  
  if (growthMessage === `**📈 最近の成長**\n`) {
    growthMessage += `- **${studentName}さんなりのペース**で、着実に成長しています\n`;
  }
  
  return growthMessage;
}

/**
 * 親御さん向けの家庭サポート提案
 */
function generateHomeSupport(data, studentName) {
  const learningStatus = data.learningStatus ? parseInt(data.learningStatus) : 0;
  const motivation = data.motivation ? parseInt(data.motivation) : 0;
  
  // 行動タグに基づく個別サポート提案を取得
  const behaviorTags = data.behaviorTags || [];
  const behaviorSupport = generateBehaviorBasedSupportForParents(behaviorTags, studentName);
  
  let support = '';
  
  if (learningStatus >= 4 && motivation >= 4) {
    support = `🌟 **${studentName}さんは素晴らしく頑張っています！**

・今の調子を維持できるよう、**たくさん褒めてあげてください**

・新しいことにチャレンジしたいと言ったときは、**ぜひ応援してあげてください**

・学校での出来事を楽しそうに話してくれたときは、**一緒に喜んでください**

・${studentName}さんの頑張りを**具体的に褒めて**、自信につなげてあげてください`;
  } else if (learningStatus >= 3 || motivation >= 3) {
    support = `📚 **${studentName}さんの成長をサポートするために**

・宿題に取り組むときは、**近くで見守ってあげてください**

・分からないことがあっても、まずは**${studentName}さん自身で考える時間**を作ってあげてください

・小さな頑張りでも、気づいたときには**たくさん褒めてあげてください**

・学習の時間と休憩の時間を、**メリハリをつけて過ごせるよう**サポートしてください

・${studentName}さんのペースを大切にして、**無理のない範囲で**学習を進めてください`;
  } else {
    support = `🤝 **${studentName}さんと一緒に頑張るために**

・学習時間は${studentName}さんのそばにいて、**安心できる環境を作ってあげてください**

・勉強が嫌になったときは、無理をせず、**${studentName}さんの気持ちを聞いてあげてください**

・学校での楽しかったことを聞いて、**一緒に喜んでください**

・小さなことでも、${studentName}さんが頑張ったときは**必ず褒めてあげてください**

・${studentName}さんが**学校に行けたこと自体**を、まず認めて褒めてあげてください`;
  }
  
  // 行動タグに基づく個別サポートを追加
  if (behaviorSupport) {
    support += `\n\n🎯 **${studentName}さんの特性に合わせたサポート**\n\n${behaviorSupport}`;
  }
  
  return support;
}

/**
 * 親御さん向けの応援メッセージ
 */
function generateEncouragementMessage(data, studentName) {
  const learningStatus = data.learningStatus ? parseInt(data.learningStatus) : 0;
  const motivation = data.motivation ? parseInt(data.motivation) : 0;
  const behaviorTags = data.behaviorTags || [];
  
  // 行動タグに基づく個別の応援メッセージを取得
  const behaviorEncouragement = generateBehaviorBasedEncouragement(behaviorTags, studentName);
  
  let baseMessage = '';
  
  if (learningStatus >= 4 && motivation >= 4) {
    baseMessage = `${studentName}さん、いつも本当によく頑張っていますね！

あなたの一生懸命な姿を見ていると、先生もとても嬉しくなります。

これからも、あなたらしく、楽しく学習を続けてくださいね。

みんなも${studentName}さんの頑張りを見て、刺激を受けています。`;
  } else if (learningStatus >= 3 || motivation >= 3) {
    baseMessage = `${studentName}さん、毎日お疲れさまです！

あなたの頑張りを、先生はいつも見ています。

分からないことがあったら、いつでも先生に聞いてくださいね。

一緒に頑張りましょう！

${studentName}さんの成長を、先生も保護者の方も応援しています。`;
  } else {
    baseMessage = `${studentName}さん、学校に来てくれてありがとう！

あなたがクラスにいてくれることで、みんなが嬉しい気持ちになります。

勉強は少しずつで大丈夫です。

先生も、お家の方も、いつも${studentName}さんを応援していますよ。

${studentName}さんのペースで、一歩ずつ進んでいきましょう。`;
  }
  
  // 行動タグに基づく応援メッセージを追加
  if (behaviorEncouragement) {
    baseMessage += `\n\n${behaviorEncouragement}`;
  }
  
  return baseMessage;
}

/**
 * 親御さん向けの連携メッセージ
 */
function generateCollaborationMessage(data, studentName) {
  return `**学校と家庭で連携して**、${studentName}さんの成長を支えていきたいと思います。

**📞 いつでもご相談ください**

・${studentName}さんのことで気になることがあれば、**いつでもお声かけください**

・家庭での様子で変化があったときも、**ぜひ教えてください**

・学校での取り組みについて、ご質問やご要望があれば**お聞かせください**

・面談の時間以外でも、**お電話やメッセージでお気軽にご連絡ください**

**🤝 一緒に見守りましょう**

・${studentName}さんの小さな成長も、**一緒に喜び合いましょう**

・困ったときは、**学校と家庭で協力して解決**していきましょう

・${studentName}さんが**安心して成長できる環境**を、一緒に作っていきましょう

・${studentName}さんの**個性と可能性**を大切に育んでいきましょう`;
}

/**
 * 親御さん向けレポートを履歴に保存
 */
function saveParentReportToHistory(report) {
  let parentReportHistory = [];
  try {
    const saved = localStorage.getItem('parentReportHistory');
    if (saved) {
      parentReportHistory = JSON.parse(saved);
    }
  } catch (error) {
    console.error('親御さん向けレポート履歴読み込みエラー:', error);
  }
  
  parentReportHistory.unshift(report);
  
  // 最大50件まで保持
  if (parentReportHistory.length > 50) {
    parentReportHistory = parentReportHistory.slice(0, 50);
  }
  
  localStorage.setItem('parentReportHistory', JSON.stringify(parentReportHistory));
}

/**
 * 親御さん向けレポート履歴の更新
 */
function updateParentReportHistory() {
  const container = document.getElementById('parentReportHistory');
  if (!container) return;
  
  let parentReportHistory = [];
  try {
    const saved = localStorage.getItem('parentReportHistory');
    if (saved) {
      parentReportHistory = JSON.parse(saved);
    }
  } catch (error) {
    console.error('親御さん向けレポート履歴読み込みエラー:', error);
  }
  
  if (parentReportHistory.length === 0) {
    container.innerHTML = `
      <div class="alert alert-info">
        <i class="fas fa-info-circle"></i>
        まだ親御さん向けレポートが作成されていません。上記のボタンからレポートを作成すると、ここに履歴が表示されます。
        <br><br>
        <strong>活用例：</strong>
        <ul style="margin-top: 0.5rem;">
          <li>保護者面談での資料として活用</li>
          <li>家庭訪問時の話題提供</li>
          <li>学級通信への内容反映</li>
          <li>個別の成長記録として保管</li>
        </ul>
      </div>
    `;
    return;
  }
  
  let historyHTML = '';
  
  parentReportHistory.slice(0, 10).forEach((report, index) => {
    const date = new Date(report.timestamp);
    const typeIcon = report.type === 'class_parent' ? '👥' : '👤';
    const typeLabel = report.type === 'class_parent' ? 'クラス全体' : '個別レポート';
    
    historyHTML += `
      <div class="card" style="margin-bottom: 1rem; border-left: 4px solid var(--secondary);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <h4 style="margin: 0; color: var(--secondary); font-size: 1rem;">
            ${typeIcon} ${report.title}
          </h4>
          <span style="color: var(--text-secondary); font-size: 0.8rem;">
            ${date.toLocaleDateString('ja-JP')} ${date.toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'})}
          </span>
        </div>
        
        <div style="margin-bottom: 1rem;">
          <span style="background: rgba(124, 58, 237, 0.1); color: var(--secondary); padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.8rem;">
            ${typeLabel}
          </span>
          ${report.studentName ? `
            <span style="background: rgba(6, 182, 212, 0.1); color: var(--accent); padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.8rem; margin-left: 0.5rem;">
              ${report.studentName}さん
            </span>
          ` : ''}
        </div>
        
        <div style="margin-bottom: 1rem;">
          <div style="color: var(--text-primary); font-size: 0.9rem; line-height: 1.6;">
            ${generateAnalysisSummary(report.content)}
          </div>
        </div>
        
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="btn btn-secondary" onclick="showParentReportDetailById('${report.id}')" style="font-size: 0.8rem; padding: 0.5rem 0.75rem;">
            <i class="fas fa-eye"></i> 詳細表示
          </button>
          <button class="btn btn-success" onclick="exportParentReportById('${report.id}')" style="font-size: 0.8rem; padding: 0.5rem 0.75rem;">
            <i class="fas fa-download"></i> テキスト
          </button>
          <button class="btn" onclick="exportParentReportPDFById('${report.id}')" style="background: #dc2626; color: white; font-size: 0.8rem; padding: 0.5rem 0.75rem;" title="印刷用ページを開いてPDF保存します">
            <i class="fas fa-print"></i> PDF保存
          </button>
          <button class="btn btn-warning" onclick="regenerateParentReport('${report.type}', '${report.studentId || ''}', '${report.id}')" style="font-size: 0.8rem; padding: 0.5rem 0.75rem;" title="このレポートを最新の情報で再生成します">
            <i class="fas fa-sync-alt"></i> 更新
          </button>
          <button class="btn" onclick="deleteParentReport('${report.id}')" style="background: #ef4444; color: white; font-size: 0.8rem; padding: 0.5rem 0.75rem;" title="このレポートを削除します">
            <i class="fas fa-trash"></i> 削除
          </button>
        </div>
      </div>
    `;
  });
  
  if (parentReportHistory.length > 10) {
    historyHTML += `
      <div style="text-align: center; margin-top: 1rem;">
        <button class="btn btn-secondary" onclick="viewAllParentReports()">
          <i class="fas fa-list"></i> すべてのレポートを表示 (${parentReportHistory.length}件)
        </button>
      </div>
    `;
  }
  
  container.innerHTML = historyHTML;
}

/**
 * IDでレポートを取得して詳細表示
 */
function showParentReportDetailById(reportId) {
  const report = getParentReportById(reportId);
  if (report) {
    showParentReportDetail(report);
  } else {
    showAlert('レポートが見つかりません', 'error');
  }
}

/**
 * IDでレポートを取得してエクスポート
 */
function exportParentReportById(reportId) {
  const report = getParentReportById(reportId);
  if (report) {
    exportParentReport(report);
  } else {
    showAlert('レポートが見つかりません', 'error');
  }
}

/**
 * IDでレポートを取得してPDFエクスポート
 */
function exportParentReportPDFById(reportId) {
  const report = getParentReportById(reportId);
  if (report) {
    exportParentReportPDF(report);
  } else {
    showAlert('レポートが見つかりません', 'error');
  }
}

/**
 * IDからレポートを取得するヘルパー関数
 */
function getParentReportById(reportId) {
  try {
    const saved = localStorage.getItem('parentReportHistory');
    if (saved) {
      const parentReportHistory = JSON.parse(saved);
      return parentReportHistory.find(report => report.id === reportId);
    }
  } catch (error) {
    console.error('レポート取得エラー:', error);
  }
  return null;
}

/**
 * 親御さん向けレポート詳細表示
 */
function showParentReportDetail(report) {
  showAnalysisDetail({
    title: report.title,
    content: report.content,
    analysisDate: report.timestamp,
    studentName: report.studentName || '',
    type: 'parent_report'
  });
}

/**
 * 親御さん向けレポートのエクスポート
 */
function exportParentReport(report) {
  const date = new Date(report.timestamp);
  const dateStr = date.toISOString().split('T')[0];
  
  // ファイル名の生成を改善
  let filenamePart = 'class';
  if (report.studentName) {
    filenamePart = report.studentName.replace(/[^a-zA-Z0-9一-龯ひらがなカタカナ]/g, '_');
  } else if (report.grade && report.className) {
    filenamePart = `${report.grade}年${report.className}`;
  }
  
  const filename = `parent_report_${filenamePart}_${dateStr}.txt`;
  
  const content = `${report.title}

${report.content}

---
作成日時: ${date.toLocaleDateString('ja-JP')} ${date.toLocaleTimeString('ja-JP')}
作成者: 児童進捗管理ツール
`;
  
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showAlert('親御さん向けレポートをダウンロードしました', 'success');
}

/**
 * 親御さん向けレポートのPDFエクスポート
 */
function exportParentReportPDF(report) {
  try {
    // ブラウザの印刷機能を利用したPDF生成を優先
    if (window.chrome || navigator.userAgent.includes('Chrome')) {
      generatePrintablePDF(report);
      return;
    }
    
    // フォールバック: HTMLファイルとしてダウンロード
    generateHTMLReport(report);
    
  } catch (error) {
    console.error('PDF生成エラー:', error);
    showAlert('PDF生成に失敗したため、HTMLファイルとしてダウンロードします', 'warning');
    generateHTMLReport(report);
  }
}

/**
 * ブラウザの印刷機能を利用したPDF生成
 */
function generatePrintablePDF(report) {
  try {
    // 新しいウィンドウを作成
    const printWindow = window.open('', '_blank');
    
    // ポップアップがブロックされた場合のエラーハンドリング
    if (!printWindow) {
      showAlert('ポップアップがブロックされました。ブラウザの設定でポップアップを許可してください', 'warning');
      generateHTMLReport(report);
      return;
    }
    
    // HTMLコンテンツを作成
    const htmlContent = formatReportForPrint(report);
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // スタイルが適用されるまで少し待つ
    setTimeout(() => {
      try {
        printWindow.print();
        showAlert('印刷ダイアログを開きました。「PDFとして保存」を選択してください', 'info');
        
        // 印刷後にウィンドウを閉じる
        setTimeout(() => {
          if (printWindow && !printWindow.closed) {
            printWindow.close();
          }
        }, 1000);
      } catch (error) {
        console.error('印刷エラー:', error);
        showAlert('印刷に失敗しました。HTMLファイルとしてダウンロードします', 'warning');
        printWindow.close();
        generateHTMLReport(report);
      }
    }, 500);
  } catch (error) {
    console.error('PDF生成エラー:', error);
    showAlert('PDF生成に失敗しました。HTMLファイルとしてダウンロードします', 'warning');
    generateHTMLReport(report);
  }
}

/**
 * HTMLファイルとしてダウンロード
 */
function generateHTMLReport(report) {
  const htmlContent = formatReportForPrint(report);
  
  const date = new Date(report.timestamp);
  const dateStr = date.toISOString().split('T')[0];
  
  // ファイル名の生成を改善
  let filenamePart = 'class';
  if (report.studentName) {
    filenamePart = report.studentName.replace(/[^a-zA-Z0-9一-龯ひらがなカタカナ]/g, '_');
  } else if (report.grade && report.className) {
    filenamePart = `${report.grade}年${report.className}`;
  }
  
  const filename = `parent_report_${filenamePart}_${dateStr}.html`;
  
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showAlert('親御さん向けレポートをHTMLファイルでダウンロードしました', 'success');
}

/**
 * レポートを印刷用HTMLに整形
 */
function formatReportForPrint(report) {
  const date = new Date(report.timestamp);
  const dateStr = date.toLocaleDateString('ja-JP');
  
  // マークダウンをHTMLに変換
  const htmlContent = convertMarkdownToHTML(report.content);
  
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.title}</title>
  <style>
    @media print {
      @page {
        margin: 20mm;
        size: A4;
      }
    }
    
    body {
      font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', 'Meiryo', sans-serif;
      line-height: 1.8;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background: white;
    }
    
    h1 {
      color: #4f46e5;
      border-bottom: 3px solid #4f46e5;
      padding-bottom: 10px;
      font-size: 24px;
      margin-bottom: 30px;
    }
    
    h2 {
      color: #7c3aed;
      border-left: 4px solid #7c3aed;
      padding-left: 15px;
      font-size: 20px;
      margin: 25px 0 15px 0;
      background: rgba(124, 58, 237, 0.05);
      padding: 10px 15px;
      border-radius: 8px;
    }
    
    h3 {
      color: #059669;
      font-size: 16px;
      margin: 20px 0 10px 0;
      padding: 8px 12px;
      background: rgba(5, 150, 105, 0.1);
      border-radius: 5px;
      border-left: 3px solid #059669;
    }
    
    p {
      margin-bottom: 15px;
      line-height: 1.8;
    }
    
    ul, ol {
      margin: 15px 0;
      padding-left: 25px;
    }
    
    li {
      margin-bottom: 8px;
      line-height: 1.6;
    }
    
    strong {
      color: #e11d48;
      font-weight: 600;
    }
    
    .report-header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 20px;
    }
    
    .report-meta {
      text-align: right;
      color: #6b7280;
      font-size: 14px;
      margin-top: 30px;
      border-top: 1px solid #e5e7eb;
      padding-top: 15px;
    }
    
    .section {
      margin-bottom: 30px;
    }
    
    @media print {
      body {
        margin: 0;
        padding: 0;
        box-shadow: none;
      }
      
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="report-header">
    <h1>${report.title}</h1>
  </div>
  
  <div class="report-content">
    ${htmlContent}
  </div>
  
  <div class="report-meta">
    <p><strong>作成日:</strong> ${dateStr}</p>
    <p><strong>作成者:</strong> 児童進捗管理ツール</p>
  </div>
  
  <div class="no-print" style="margin-top: 30px; text-align: center; color: #6b7280;">
    <p>このページを印刷する際は、ブラウザの印刷設定で「PDFとして保存」を選択してください。</p>
  </div>
</body>
</html>`;
}

/**
 * マークダウンをHTMLに変換（改良版）
 */
function convertMarkdownToHTML(markdown) {
  if (!markdown) return '';
  
  // 行ごとに処理
  const lines = markdown.split('\n');
  const processed = [];
  let inList = false;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // 空行の処理
    if (line.trim() === '') {
      if (inList) {
        processed.push('</ul>');
        inList = false;
      }
      processed.push('');
      continue;
    }
    
    // 区切り線（━も含む）
    if (line.trim() === '---' || line.trim().match(/^━+$/)) {
      if (inList) {
        processed.push('</ul>');
        inList = false;
      }
      processed.push('<hr style="border: none; height: 2px; background: linear-gradient(to right, #e5e7eb, #6b7280, #e5e7eb); margin: 20px 0;">');
      continue;
    }
    
    // ヘッダーの処理（**で囲まれた絵文字付きタイトル）
    const boldTitleMatch = line.match(/^(🌸|📚|🏠|🌟|💌|💝|📝|🌱|🤝|📞|✨|📈|📖|💝|📋) \*\*(.*?)\*\*$/);
    if (boldTitleMatch) {
      if (inList) {
        processed.push('</ul>');
        inList = false;
      }
      processed.push(`<h2 style="color: #1f2937; margin-top: 25px; margin-bottom: 15px; font-size: 1.4em;">${boldTitleMatch[1]} ${boldTitleMatch[2]}</h2>`);
      continue;
    }
    
    // サブヘッダー（**で囲まれた絵文字なしタイトル）
    const boldSubTitleMatch = line.match(/^\*\*(.*?)\*\*$/);
    if (boldSubTitleMatch && !line.includes('：') && !line.includes(':')) {
      if (inList) {
        processed.push('</ul>');
        inList = false;
      }
      processed.push(`<h3 style="color: #374151; margin-top: 15px; margin-bottom: 10px; font-size: 1.2em;">${boldSubTitleMatch[1]}</h3>`);
      continue;
    }
    
    // 旧形式のヘッダーも念のため対応
    if (line.startsWith('### ')) {
      if (inList) {
        processed.push('</ul>');
        inList = false;
      }
      processed.push(`<h2 style="color: #1f2937; margin-top: 25px; margin-bottom: 15px; font-size: 1.4em;">${line.substring(4)}</h2>`);
      continue;
    }
    
    if (line.startsWith('#### ')) {
      if (inList) {
        processed.push('</ul>');
        inList = false;
      }
      processed.push(`<h3 style="color: #374151; margin-top: 15px; margin-bottom: 10px; font-size: 1.2em;">${line.substring(5)}</h3>`);
      continue;
    }
    
    // リストの処理（・も含む）
    if (line.startsWith('- ') || line.startsWith('・')) {
      if (!inList) {
        processed.push('<ul style="margin: 10px 0; padding-left: 20px;">');
        inList = true;
      }
      // 太字の変換も含める
      const listContent = line.startsWith('- ') ? 
        line.substring(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') :
        line.substring(1).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      processed.push(`<li style="margin: 5px 0;">${listContent}</li>`);
      continue;
    }
    
    // リストが終了
    if (inList && !line.startsWith('- ')) {
      processed.push('</ul>');
      inList = false;
    }
    
    // 通常のテキスト行（太字変換も含める）
    if (line.trim() !== '') {
      const processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      processed.push(`<p>${processedLine}</p>`);
    }
  }
  
  // 最後にリストが開いている場合は閉じる
  if (inList) {
    processed.push('</ul>');
  }
  
  return processed.join('\n');
}



/**
 * 親御さん向けレポートの再生成
 */
function regenerateParentReport(reportType, studentId = '', reportId = '') {
  // 重複クリック防止
  if (window.isRegeneratingReport) {
    showAlert('レポート再生成中です。しばらくお待ちください。', 'warning');
    return;
  }
  
  // パラメータ検証
  if (!reportType) {
    showAlert('レポートの種類が指定されていません', 'error');
    return;
  }
  
  // 処理中フラグ設定
  window.isRegeneratingReport = true;
  
  try {
  if (reportType === 'class_parent') {
    // 既存レポートから学年・クラス情報を取得
    let parentReportHistory = [];
    try {
      const saved = localStorage.getItem('parentReportHistory');
      if (saved) {
        parentReportHistory = JSON.parse(saved);
      }
    } catch (error) {
      console.error('親御さん向けレポート履歴読み込みエラー:', error);
    }
    
    // クラス全体レポートの再生成
    let newReport;
    if (reportId) {
      // 既存レポートのIDから詳細情報を取得
      const existingReport = parentReportHistory.find(r => r.id === reportId);
      if (existingReport && existingReport.grade && existingReport.className) {
        if (existingReport.className === 'all') {
          // 学年全体のレポート更新
          const targetStudents = studentsData.students.filter(student => 
            student.grade === existingReport.grade
          );
          showAnalysisLoading(`${existingReport.grade}年生全体のレポートを再生成中...`);
          setTimeout(() => {
            try {
              newReport = generateClassParentReportContentForGrade(existingReport.grade, targetStudents);
              replaceOrAddParentReport(newReport, 'class_parent', '', reportId);
              updateParentReportHistory();
              showParentReportDetail(newReport);
              showAlert(`${existingReport.grade}年生全体のレポートを更新しました！`, 'success');
            } catch (error) {
              console.error('学年全体レポート再生成エラー:', error);
              showAlert('レポート再生成中にエラーが発生しました', 'error');
            } finally {
              window.isRegeneratingReport = false;
            }
          }, 1000);
          return;
        } else {
          // 特定クラスのレポート更新
          const targetStudents = studentsData.students.filter(student => 
            student.grade === existingReport.grade && student.class === existingReport.className
          );
          showAnalysisLoading(`${existingReport.grade}年${existingReport.className}のレポートを再生成中...`);
          setTimeout(() => {
            try {
              newReport = generateClassParentReportContentForClass(existingReport.grade, existingReport.className, targetStudents);
              replaceOrAddParentReport(newReport, 'class_parent', '', reportId);
              updateParentReportHistory();
              showParentReportDetail(newReport);
              showAlert(`${existingReport.grade}年${existingReport.className}のレポートを更新しました！`, 'success');
            } catch (error) {
              console.error('クラスレポート再生成エラー:', error);
              showAlert('レポート再生成中にエラーが発生しました', 'error');
            } finally {
              window.isRegeneratingReport = false;
            }
          }, 1000);
          return;
        }
      }
    }
    
    // 一般的なクラス全体レポート
    showAnalysisLoading('クラス全体レポートを再生成中...');
    setTimeout(() => {
      try {
        newReport = generateClassParentReportContent();
        replaceOrAddParentReport(newReport, 'class_parent');
        updateParentReportHistory();
        showParentReportDetail(newReport);
        showAlert('クラス全体レポートを更新しました！', 'success');
      } catch (error) {
        console.error('クラス全体レポート再生成エラー:', error);
        showAlert('レポート再生成中にエラーが発生しました', 'error');
      } finally {
        window.isRegeneratingReport = false;
      }
    }, 1000);
  } else if (reportType === 'individual_parent') {
    // 個別レポートの場合はstudentIdが必要
    if (!studentId) {
      showAlert('対象児童のIDが指定されていません', 'error');
      return;
    }
    // 個別レポートの再生成
    const student = studentsData.students.find(s => s.id === studentId);
    if (student) {
      showAnalysisLoading(`${student.name}さんのレポートを再生成中...`);
      setTimeout(() => {
        try {
          const newReport = generateIndividualParentReport(student);
          
          // 既存の同じ児童のレポートを探して置き換える
          replaceOrAddParentReport(newReport, 'individual_parent', studentId);
          updateParentReportHistory();
          showParentReportDetail(newReport);
          showAlert(`${student.name}さんのレポートを更新しました！`, 'success');
        } catch (error) {
          console.error('個別レポート再生成エラー:', error);
          showAlert('レポート再生成中にエラーが発生しました', 'error');
        } finally {
          window.isRegeneratingReport = false;
        }
      }, 1000);
    } else {
      showAlert('対象の児童が見つかりませんでした', 'error');
      window.isRegeneratingReport = false;
    }
  } else {
    showAlert('レポートの種類が不明です', 'error');
  }
  } catch (error) {
    console.error('レポート再生成エラー:', error);
    showAlert('レポート再生成中にエラーが発生しました', 'error');
  } finally {
    // 処理中フラグをリセット
    window.isRegeneratingReport = false;
  }
}

/**
 * 既存レポートを置き換えるか新規追加
 */
function replaceOrAddParentReport(newReport, reportType, studentId = '', reportId = '') {
  let parentReportHistory = [];
  try {
    const saved = localStorage.getItem('parentReportHistory');
    if (saved) {
      parentReportHistory = JSON.parse(saved);
    }
  } catch (error) {
    console.error('親御さん向けレポート履歴読み込みエラー:', error);
  }
  
  // 既存の同じレポートを探す
  let foundIndex = -1;
  
  if (reportId) {
    // 特定のレポートIDで検索（最優先）
    foundIndex = parentReportHistory.findIndex(report => report.id === reportId);
  } else if (reportType === 'class_parent') {
    // クラス全体レポートの場合（学年・クラス情報も考慮）
    if (newReport.grade && newReport.className) {
      // 特定の学年・クラスレポートを検索
      foundIndex = parentReportHistory.findIndex(report => 
        report.type === 'class_parent' && 
        report.grade === newReport.grade && 
        report.className === newReport.className
      );
    } else {
      // 一般的なクラス全体レポートを検索
      foundIndex = parentReportHistory.findIndex(report => 
        report.type === 'class_parent' && !report.grade && !report.className
      );
    }
  } else if (reportType === 'individual_parent' && studentId) {
    // 個別レポートの場合
    foundIndex = parentReportHistory.findIndex(report => 
      report.type === 'individual_parent' && report.studentId === studentId
    );
  }
  
  if (foundIndex !== -1) {
    // 既存レポートを置き換え
    parentReportHistory[foundIndex] = newReport;
    console.log(`既存レポートを更新しました (インデックス: ${foundIndex})`);
  } else {
    // 新規追加
    parentReportHistory.unshift(newReport);
    console.log('新規レポートを追加しました');
  }
  
  // 最大50件まで保持
  if (parentReportHistory.length > 50) {
    parentReportHistory = parentReportHistory.slice(0, 50);
  }
  
  localStorage.setItem('parentReportHistory', JSON.stringify(parentReportHistory));
}

/**
 * 親御さん向けレポートの削除
 */
function deleteParentReport(reportId) {
  // レポート情報を取得して確認メッセージに含める
  let parentReportHistory = [];
  try {
    const saved = localStorage.getItem('parentReportHistory');
    if (saved) {
      parentReportHistory = JSON.parse(saved);
    }
  } catch (error) {
    console.error('親御さん向けレポート履歴読み込みエラー:', error);
    showAlert('レポート履歴の読み込みに失敗しました', 'error');
    return;
  }
  
  const reportToDelete = parentReportHistory.find(report => report.id === reportId);
  if (!reportToDelete) {
    showAlert('削除対象のレポートが見つかりません', 'error');
    return;
  }
  
  // 確認ダイアログ
  const typeLabel = reportToDelete.type === 'class_parent' ? 'クラス全体' : '個別レポート';
  const studentName = reportToDelete.studentName ? `（${reportToDelete.studentName}さん）` : '';
  const confirmMessage = `以下のレポートを削除してもよろしいですか？\n\n【${typeLabel}】${reportToDelete.title}${studentName}\n作成日: ${new Date(reportToDelete.timestamp).toLocaleDateString('ja-JP')}\n\n※この操作は取り消せません。`;
  
  if (!confirm(confirmMessage)) {
    return;
  }
  
  // レポートを削除
  const updatedHistory = parentReportHistory.filter(report => report.id !== reportId);
  
  try {
    localStorage.setItem('parentReportHistory', JSON.stringify(updatedHistory));
    updateParentReportHistory();
    showAlert('レポートを削除しました', 'success');
    console.log(`レポートを削除しました: ${reportToDelete.title}`);
  } catch (error) {
    console.error('レポート削除エラー:', error);
    showAlert('レポートの削除に失敗しました', 'error');
  }
}



/**
 * 全ての親御さん向けレポート表示
 */
function viewAllParentReports() {
  // 実装は必要に応じて追加
  showAlert('全レポート表示機能は今後実装予定です', 'info');
}/**
 * 行動タグ分析
 */
function analyzeBehaviorTags(tags, studentName) {
  // ポジティブ行動タグの定義
  const positiveTags = [
    '積極的に手を上げる', 'クラスでのリーダー役', '規則正しい生活習慣',
    '一生懸命頑張っています', '宿題をしっかり提出', '学習への意欲が高い',
    '友達に教える姿勢', 'いつも明るい', '集中力が続く', '細かいところに気づく',
    '協力的な姿勢', '独創的なアイデアを出す', '整理整頓が上手', '時間を守って行動',
    '困っている友達を手助け', '最後まであきらめない', '新しいことに挑戦する',
    '丁寧な字で書く', '正直に報告する', '質問を積極的にする', '間違いを恐れず発言'
  ];
  
  // 注意が必要な行動タグ
  const attentionTags = ['黙っていた'];
  
  const positiveCount = tags.filter(tag => positiveTags.includes(tag)).length;
  const attentionCount = tags.filter(tag => attentionTags.includes(tag)).length;
  
  let analysis = [];
  
  // タグ数による分析
  if (tags.length >= 5) {
    analysis.push('多様な行動特性が観察されています');
  } else if (tags.length >= 3) {
    analysis.push('いくつかの特徴的な行動が見られます');
  } else {
    analysis.push('注目すべき行動が記録されています');
  }
  
  // ポジティブ行動の分析
  if (positiveCount >= 3) {
    analysis.push('多くの素晴らしい行動が確認できます');
  } else if (positiveCount >= 1) {
    analysis.push('良い行動特性が見られます');
  }
  
  // 注意が必要な行動の分析
  if (attentionCount > 0) {
    analysis.push('さらなる支援や働きかけが有効かもしれません');
  }
  
  // 具体的なタグの言及
  const mentionTags = tags.slice(0, 3); // 最初の3つを言及
  if (mentionTags.length > 0) {
    analysis.push(`特に「${mentionTags.join('」「')}」などの行動が見られます`);
  }
  
  return analysis.join('。') + '。';
}

/**
 * 親御さん向けの行動タグから強みを抽出
 */
function extractBehaviorStrengthsForParents(behaviorTags, studentName) {
  const strengths = [];
  
  // 行動タグを分類して親御さん向けの言葉で説明
  const behaviorCategories = {
    leadership: ['積極的に手を上げる', 'クラスでのリーダー役', '困っている友達を手助け'],
    academic: ['学習への意欲が高い', '質問を積極的にする', '集中力が続く', '細かいところに気づく'],
    character: ['いつも明るい', '正直に報告する', '最後まであきらめない', '新しいことに挑戦する'],
    social: ['友達に教える姿勢', '協力的な姿勢', '間違いを恐れず発言'],
    life: ['規則正しい生活習慣', '整理整頓が上手', '時間を守って行動', '丁寧な字で書く'],
    responsibility: ['一生懸命頑張っています', '宿題をしっかり提出'],
    creativity: ['独創的なアイデアを出す']
  };
  
  // カテゴリーごとに強みを抽出
  for (const [category, tags] of Object.entries(behaviorCategories)) {
    const matchingTags = behaviorTags.filter(tag => tags.includes(tag));
    if (matchingTags.length > 0) {
      switch (category) {
        case 'leadership':
          strengths.push(`🌟 **リーダーシップ**: ${studentName}さんは${matchingTags.join('、')}など、クラスを引っ張る素晴らしい力を持っています`);
          break;
        case 'academic':
          strengths.push(`📚 **学習面での輝き**: ${matchingTags.join('、')}など、学びに向かう姿勢が本当に素晴らしいです`);
          break;
        case 'character':
          strengths.push(`💎 **人格的な魅力**: ${matchingTags.join('、')}など、${studentName}さんの心の美しさが表れています`);
          break;
        case 'social':
          strengths.push(`🤝 **思いやりの心**: ${matchingTags.join('、')}など、周りを思いやる気持ちが育っています`);
          break;
        case 'life':
          strengths.push(`✨ **生活習慣の素晴らしさ**: ${matchingTags.join('、')}など、日常生活での良い習慣が身についています`);
          break;
        case 'responsibility':
          strengths.push(`💪 **責任感**: ${matchingTags.join('、')}など、自分のやるべきことをしっかり理解して行動しています`);
          break;
        case 'creativity':
          strengths.push(`🎨 **創造性**: ${matchingTags.join('、')}など、豊かな発想力を持っています`);
          break;
      }
    }
  }
  
  return strengths;
}

/**
 * 行動タグに基づく家庭でのサポート提案
 */
function generateBehaviorBasedSupportForParents(behaviorTags, studentName) {
  const suggestions = [];
  
  // ポジティブな行動タグに対するサポート
  if (behaviorTags.includes('積極的に手を上げる') || behaviorTags.includes('質問を積極的にする')) {
    suggestions.push(`・${studentName}さんの「質問する力」を伸ばすために、家庭でも疑問に思ったことを自由に話せる雰囲気を大切にしてください`);
  }
  
  if (behaviorTags.includes('クラスでのリーダー役') || behaviorTags.includes('困っている友達を手助け')) {
    suggestions.push(`・${studentName}さんのリーダーシップを育むために、家庭でも年下のきょうだいや近所の子との関わりを大切にしてあげてください`);
  }
  
  if (behaviorTags.includes('学習への意欲が高い') || behaviorTags.includes('集中力が続く')) {
    suggestions.push(`・${studentName}さんの学習意欲を維持するために、興味を持ったことには十分に時間をかけられる環境を整えてあげてください`);
  }
  
  if (behaviorTags.includes('いつも明るい') || behaviorTags.includes('友達に教える姿勢')) {
    suggestions.push(`・${studentName}さんの明るい性格を活かして、家族での楽しい会話の時間を増やしてみてください`);
  }
  
  if (behaviorTags.includes('規則正しい生活習慣') || behaviorTags.includes('時間を守って行動')) {
    suggestions.push(`・${studentName}さんの良い生活習慣を褒めて、さらに伸ばしていけるよう応援してあげてください`);
  }
  
  if (behaviorTags.includes('独創的なアイデアを出す')) {
    suggestions.push(`・${studentName}さんの創造性を大切にして、自由な発想を表現できる機会（絵を描く、工作するなど）を提供してあげてください`);
  }
  
  if (behaviorTags.includes('最後まであきらめない')) {
    suggestions.push(`・${studentName}さんの粘り強さを認めて、困難な場面でも「必ずできるようになる」という信念を伝えてあげてください`);
  }
  
  // 注意が必要な行動への対応
  if (behaviorTags.includes('黙っていた')) {
    suggestions.push(`・${studentName}さんが自分の気持ちを表現しやすいよう、家庭では安心して話せる時間を作ってあげてください`);
    suggestions.push(`・無理に話させようとせず、${studentName}さんのペースを大切にしながら、少しずつコミュニケーションを増やしていきましょう`);
  }
  
  return suggestions.join('\n');
}

/**
 * 行動タグの成長分析（親御さん向け）
 */
function analyzeBehaviorTagsGrowthForParents(prevData, currentData, studentName) {
  const prevTags = prevData.behaviorTags || [];
  const currentTags = currentData.behaviorTags || [];
  
  if (prevTags.length === 0 && currentTags.length === 0) {
    return '';
  }
  
  let growthMessage = '';
  
  // 新しく現れたポジティブな行動
  const newPositiveTags = currentTags.filter(tag => 
    !prevTags.includes(tag) && 
    !['黙っていた'].includes(tag)
  );
  
  if (newPositiveTags.length > 0) {
    growthMessage += `- **新しい素晴らしい行動**: 「${newPositiveTags.join('」「')}」という新しい良い面が見られるようになりました\n`;
  }
  
  // 継続している良い行動
  const continuedPositiveTags = currentTags.filter(tag => 
    prevTags.includes(tag) && 
    !['黙っていた'].includes(tag)
  );
  
  if (continuedPositiveTags.length >= 2) {
    growthMessage += `- **継続する良さ**: ${studentName}さんの良い行動が安定して続いています\n`;
  }
  
  // 改善された行動（注意が必要だった行動の減少）
  const improvedBehavior = prevTags.includes('黙っていた') && !currentTags.includes('黙っていた');
  if (improvedBehavior) {
    growthMessage += `- **コミュニケーション面での成長**: 以前より積極的に関わろうとする姿勢が見られます\n`;
  }
  
  return growthMessage;
}

/**
 * クラス全体の行動タグ統計計算（親御さん向け）
 */
function calculateBehaviorTagStatsForClass(recentData) {
  if (recentData.length === 0) {
    return '現在、お子様たちの行動データを蓄積中です。これから素晴らしい成長の様子をお伝えしていきます。';
  }
  
  // 全ての行動タグを収集
  const allBehaviorTags = [];
  recentData.forEach(entry => {
    if (entry.data.behaviorTags && Array.isArray(entry.data.behaviorTags)) {
      allBehaviorTags.push(...entry.data.behaviorTags);
    }
  });
  
  if (allBehaviorTags.length === 0) {
    return '今期の行動記録をこれから詳しく記録していきます。お子様たちの素晴らしい姿をお伝えできるよう努めます。';
  }
  
  // タグの出現回数をカウント
  const tagCounts = {};
  allBehaviorTags.forEach(tag => {
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  });
  
  // 上位のポジティブタグを取得
  const positiveTags = [
    '積極的に手を上げる', 'クラスでのリーダー役', '規則正しい生活習慣',
    '一生懸命頑張っています', '宿題をしっかり提出', '学習への意欲が高い',
    '友達に教える姿勢', 'いつも明るい', '集中力が続く', '細かいところに気づく',
    '協力的な姿勢', '独創的なアイデアを出す', '整理整頓が上手', '時間を守って行動',
    '困っている友達を手助け', '最後まであきらめない', '新しいことに挑戦する',
    '丁寧な字で書く', '正直に報告する', '質問を積極的にする', '間違いを恐れず発言'
  ];
  
  const positiveTagCounts = Object.entries(tagCounts)
    .filter(([tag]) => positiveTags.includes(tag))
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
  
  let result = '';
  
  if (positiveTagCounts.length > 0) {
    result += `
**よく見られる素晴らしい行動**：
`;
    positiveTagCounts.forEach(([tag, count], index) => {
      const percentage = Math.round((count / recentData.length) * 100);
      result += `${index + 1}. **${tag}** - ${count}名（${percentage}%のお子様）\n`;
    });
    
    result += `
**学年全体の傾向**：
・${recentData.length}名のお子様の中で、多くの子が前向きで協力的な行動を見せています
・特に「${positiveTagCounts[0][0]}」の行動が多く見られ、学年全体の良い雰囲気につながっています
・一人ひとりが個性を活かしながら、クラス全体の成長に貢献しています`;
  } else {
    result = 'お子様たちの行動の記録を詳しく蓄積中です。これから素晴らしい成長の様子をお伝えしていきます。';
  }
  
  return result;
}

/**
 * 行動タグに基づく応援メッセージ生成
 */
function generateBehaviorBasedEncouragement(behaviorTags, studentName) {
  if (!behaviorTags || behaviorTags.length === 0) {
    return '';
  }
  
  const encouragements = [];
  
  // ポジティブな行動タグに対する応援メッセージ
  if (behaviorTags.includes('積極的に手を上げる')) {
    encouragements.push(`${studentName}さんの積極的に手を上げる姿勢、本当に素晴らしいです！`);
  }
  
  if (behaviorTags.includes('クラスでのリーダー役')) {
    encouragements.push(`${studentName}さんのリーダーシップで、クラス全体が明るくなっています。`);
  }
  
  if (behaviorTags.includes('困っている友達を手助け')) {
    encouragements.push(`${studentName}さんの優しい心遣いが、多くの友達を救っています。`);
  }
  
  if (behaviorTags.includes('学習への意欲が高い')) {
    encouragements.push(`${studentName}さんの学習への情熱、とても輝いて見えます！`);
  }
  
  if (behaviorTags.includes('いつも明るい')) {
    encouragements.push(`${studentName}さんの明るい笑顔が、教室を温かい雰囲気にしてくれています。`);
  }
  
  if (behaviorTags.includes('最後まであきらめない')) {
    encouragements.push(`${studentName}さんの粘り強さ、本当に立派です。きっと大きな力になります。`);
  }
  
  if (behaviorTags.includes('新しいことに挑戦する')) {
    encouragements.push(`${studentName}さんのチャレンジ精神、とても素敵です！`);
  }
  
  if (behaviorTags.includes('友達に教える姿勢')) {
    encouragements.push(`${studentName}さんが友達に教えてくれる姿、とても心温まります。`);
  }
  
  if (behaviorTags.includes('協力的な姿勢')) {
    encouragements.push(`${studentName}さんの協力的な態度が、クラスの団結につながっています。`);
  }
  
  if (behaviorTags.includes('独創的なアイデアを出す')) {
    encouragements.push(`${studentName}さんのユニークなアイデア、いつも感心しています！`);
  }
  
  // 注意が必要な行動への温かい励まし
  if (behaviorTags.includes('黙っていた')) {
    encouragements.push(`${studentName}さんのペースを大切にしています。少しずつ、自分らしく表現していきましょう。`);
  }
  
  // 応援メッセージを組み合わせて返す
  if (encouragements.length > 0) {
    const selectedEncouragements = encouragements.slice(0, 2); // 最大2つ選択
    return `**${studentName}さんへの特別メッセージ**: ${selectedEncouragements.join(' ')}`;
  }
  
  return '';
}
/**
 * 行動タグボタンの選択切り替え
 */
function toggleBehaviorTag(button, fieldId) {
  // ボタンの選択状態を切り替え
  button.classList.toggle('selected');
  
  // 選択されているタグの値を取得
  const container = document.getElementById(`input_${fieldId}`);
  const selectedButtons = container.querySelectorAll('.behavior-tag-button.selected');
  const selectedValues = Array.from(selectedButtons).map(btn => btn.dataset.value);
  
  // hidden inputに選択された値を設定
  const hiddenInput = document.getElementById(`hidden_${fieldId}`);
  if (hiddenInput) {
    hiddenInput.value = JSON.stringify(selectedValues);
  }
  
  console.log(`選択されたタグ:`, selectedValues);
}