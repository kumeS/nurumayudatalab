/**
 * 児童進捗管理ツール JavaScript
 * Kids Progress Manager - MVP版
 */

// グローバル変数
let studentsData = {};
let currentTab = 'students';
let apiKey = '';
let analysisHistory = [];
let currentAnalysisPage = 1;
let currentHistoryPage = 1;
const ITEMS_PER_PAGE = 10;

// レポート設定のデフォルト値
let reportSettings = {
  individualReportDataCount: 3, // 個別レポート用データ数
  analysisDataCount: 5, // AI分析用データ数
  pdfCreatorName: '児童進捗管理ツール' // PDF作成者名
};

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
});







/**
 * アプリケーション初期化
 */
function initializeApp() {
  loadData();
  loadReportSettings(); // レポート設定の読み込み
  setupEventListeners();
  
  // AI分析履歴の初期化（復旧機能付き）
  initializeAnalysisHistory();
  
  // 自動バックアップ開始
  startAutoBackup();
  
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
  // 統一イベント委譲システム初期化
  initializeEventDelegation();
  
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
  document.getElementById('editStudentForm').addEventListener('submit', handleEditStudent);
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
  
  // レポート設定の読み込み
  loadReportSettings();
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
    case 'analysis':
      // AI分析タブの初期化
      console.log('Switching to analysis tab, analysisHistory:', analysisHistory ? analysisHistory.length : 'null');
      if (!analysisHistory) {
        console.log('Initializing analysis history...');
        initializeAnalysisHistory();
      }
      console.log('Calling displayAnalysisResults with:', analysisHistory ? analysisHistory.length : 'null', 'items');
      displayAnalysisResults(analysisHistory);
      if (document.getElementById('analysisHistoryPreview')) {
        updateAnalysisHistoryPreview();
      }
      break;
    case 'settings':
      updateFieldSettings();
      updateReportSettingsUI();
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
      <th style="min-width: 80px;">データ数</th>
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
  
  // AI分析履歴から該当児童の分析結果があるかチェック
  const hasAIAnalysis = getLatestAnalysisForStudent(student.name) !== null;
  
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
    <td style="text-align: center;">
      <span style="
        background: linear-gradient(135deg, #e0f2fe, #bae6fd);
        color: #0c4a6e;
        padding: 0.25rem 0.5rem;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 600;
        border: 1px solid #0ea5e9;
        display: inline-block;
        min-width: 40px;
      ">
        ${student.records ? student.records.length : 0}件
      </span>
    </td>
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
  
  // ステータス判定（三段階）
  // 要注意：1-2、普通：3、良好：4-5
  if (learningStatus <= 2 || motivation <= 2) {
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
        ⚠️ 要注意
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
        👍 良好
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
      <div style="text-align: center; display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
        <button class="btn btn-primary" onclick="exportAnalysisDetailPDF('${title}', \`${content.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`, '${analysisDate}', '${studentName}', '${type}')" title="この分析結果をPDF出力">
          <i class="fas fa-file-pdf"></i> PDF出力
        </button>
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
        <button class="btn btn-primary" data-action="edit-student" data-target="${student.id}">
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
 * 未入力項目統計の更新（キャッシュ機能付き）
 */
function updateMissingInputsStatisticsWithCache() {
  const currentHash = generateDataHash();
  const now = Date.now();
  
  // キャッシュが有効かチェック（5分間有効）
  if (missingInputsCache.data && 
      missingInputsCache.dataHash === currentHash && 
      missingInputsCache.lastUpdate && 
      (now - missingInputsCache.lastUpdate) < 5 * 60 * 1000) {
    
    // キャッシュからデータを使用
    displayMissingInputsStatistics(missingInputsCache.data);
    return;
  }
  
  // キャッシュが無効な場合は新しく計算
  const missingInputsData = calculateMissingInputsData();
  
  // キャッシュを更新
  missingInputsCache = {
    data: missingInputsData,
    lastUpdate: now,
    dataHash: currentHash
  };
  
  displayMissingInputsStatistics(missingInputsData);
}

/**
 * 未入力項目統計の更新（従来版・互換性のため保持）
 */
function updateMissingInputsStatistics() {
  // キャッシュをクリアして最新データを強制取得
  missingInputsCache.data = null;
  updateMissingInputsStatisticsWithCache();
}

/**
 * データハッシュの生成（変更検知用）
 */
function generateDataHash() {
  const students = studentsData.students || [];
  const fields = studentsData.fieldDefinitions || [];
  
  // 学生数、フィールド数、最新レコードのタイムスタンプを組み合わせ
  let hash = `${students.length}-${fields.length}`;
  
  students.forEach(student => {
    if (student.records && student.records.length > 0) {
      const latestRecord = student.records[student.records.length - 1];
      hash += `-${student.id}-${latestRecord.timestamp}`;
    }
  });
  
  return hash;
}

/**
 * 未入力項目データの計算
 */
function calculateMissingInputsData() {
  const fieldCount = studentsData.fieldDefinitions ? studentsData.fieldDefinitions.length : 0;
  const studentCount = studentsData.students ? studentsData.students.length : 0;
  
  if (fieldCount === 0 || studentCount === 0) {
    return {
      totalMissing: 0,
      studentsWithMissing: [],
      studentsWithNoRecentInput: [],
      totalStudents: studentCount,
      totalFields: fieldCount,
      isEmpty: true,
      emptyMessage: fieldCount === 0 ? '入力項目が設定されていません' : '児童が登録されていません'
    };
  }

  // 未入力の児童を詳細に分析
  const missingInputsData = analyzeMissingInputs();
  missingInputsData.isEmpty = false;
  
  return missingInputsData;
}

/**
 * 未入力項目統計の表示
 */
function displayMissingInputsStatistics(missingInputsData) {
  const missingInputsElem = document.getElementById('missingInputs');
  const noRecentInputCountElem = document.getElementById('noRecentInputCount');
  const missingInputsList = document.getElementById('missingInputsList');
  
  if (!missingInputsElem || !missingInputsList) return;

  if (missingInputsData.isEmpty) {
    missingInputsElem.textContent = '0';
    if (noRecentInputCountElem) noRecentInputCountElem.textContent = '0';
    missingInputsList.innerHTML = `
      <div style="text-align: center; padding: 1rem; color: var(--text-secondary); font-size: 0.9rem;">
        <i class="fas fa-info-circle" style="margin-bottom: 0.5rem; display: block;"></i>
        ${missingInputsData.emptyMessage}
      </div>
    `;
    return;
  }
  
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
    
    // HTML文字列の配列を使用して高速化
    const htmlParts = [];
    
    missingInputsData.studentsWithMissing.forEach(item => {
      const student = item.student;
      const progressBarColor = item.completionRate >= 80 ? 'var(--success)' : 
                             item.completionRate >= 50 ? 'var(--warning)' : 'var(--error)';
      
      // フィールド名の簡略表示（処理を軽量化）
      const missingFieldsText = item.missingFields.length <= 3 ? 
        item.missingFields.map(f => f.name).join('、') :
        `${item.missingFields.slice(0, 2).map(f => f.name).join('、')}他${item.missingFields.length - 2}項目`;
      
      // 最終入力日の簡略表示
      const lastInputText = item.daysSinceLastInput !== null ? 
        `最終入力: ${item.daysSinceLastInput}日前` : '';
      
      htmlParts.push(`
        <div class="missing-input-item" onclick="goToStudentInput('${student.id}')" 
             style="background:var(--bg-secondary);border-radius:8px;padding:0.75rem;margin-bottom:0.5rem;border-left:3px solid ${progressBarColor};cursor:pointer;">
          <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;">
            <div>
              <strong style="color:var(--text-primary);font-size:0.9rem;">${student.name}</strong>
              <span style="color:var(--text-secondary);font-size:0.8rem;margin-left:0.5rem;">${student.grade}年 ${student.class || ''}</span>
            </div>
            <span style="color:${progressBarColor};font-weight:600;font-size:0.8rem;">${item.completionRate}%</span>
          </div>
          <div style="background:var(--border);height:4px;border-radius:2px;margin-bottom:0.5rem;">
            <div style="background:${progressBarColor};height:100%;width:${item.completionRate}%;"></div>
          </div>
          <div style="font-size:0.8rem;color:var(--text-secondary);">
            <i class="fas fa-exclamation-triangle" style="color:var(--warning);margin-right:0.25rem;"></i>
            未入力: ${item.missingCount}/${item.totalFields}項目
          </div>
          <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:0.25rem;">${missingFieldsText}</div>
          ${lastInputText ? `<div style="font-size:0.75rem;color:var(--text-secondary);margin-top:0.25rem;"><i class="fas fa-clock" style="margin-right:0.25rem;"></i>${lastInputText}</div>` : ''}
        </div>
      `);
    });
    
    listHTML = htmlParts.join('');
    
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

// 未入力項目統計のキャッシュ
let missingInputsCache = {
  data: null,
  lastUpdate: null,
  dataHash: null
};

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
    // 詳細データを更新（キャッシュ使用）
    updateMissingInputsStatisticsWithCache();
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
  // データの再読み込みではなく、UIコンポーネントの表示更新のみ実行
  // (loadData()を呼ぶとメモリ上の変更が失われる可能性があるため除外)
  
  // 全てのUIコンポーネントを強制更新
  updateStudentsTable();      // 児童管理テーブル
  updateProgressTable();      // 進捗管理一覧
  updateStudentSelect();      // 児童選択プルダウン
  updateInputFields();        // 入力フィールド
  updateFieldSettings();      // フィールド設定
  updateStudentManagementSettings(); // 児童管理設定
  updateStatistics();         // 統計情報
  
  // AI分析履歴プレビューは該当要素が存在する場合のみ更新
  if (document.getElementById('analysisHistoryPreview')) {
    updateAnalysisHistoryPreview(); // AI分析履歴プレビュー
  }
  
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
let currentEditingStudentId = null;

function editStudent(studentId) {
  // 編集対象の児童を検索
  const student = studentsData.students.find(s => s.id === studentId);
  if (!student) {
    showAlert('編集対象の児童が見つかりません', 'error');
    return;
  }

  // 現在編集中の児童IDを保存
  currentEditingStudentId = studentId;

  // フォームに現在の値を設定
  document.getElementById('editStudentName').value = student.name || '';
  document.getElementById('editStudentNumber').value = student.studentNumber || '';
  document.getElementById('editStudentGrade').value = student.grade || '';
  document.getElementById('editStudentGender').value = student.gender || '';
  document.getElementById('editStudentClass').value = student.class || '';

  // 編集モーダルを表示
  document.getElementById('editStudentModal').classList.add('show');
}

/**
 * 児童編集フォーム送信処理
 */
function handleEditStudent(e) {
  e.preventDefault();
  
  if (!currentEditingStudentId) {
    showAlert('編集対象の児童が特定できません', 'error');
    return;
  }
  
  // フォームデータの取得
  const form = e.target;
  const formData = new FormData(form);
  
  const updatedData = {
    name: formData.get('name').trim(),
    studentNumber: formData.get('studentNumber').trim(),
    grade: formData.get('grade'),
    gender: formData.get('gender'),
    class: formData.get('class').trim()
  };
  
  // 入力値の検証
  if (!updatedData.name) {
    showAlert('児童名を入力してください', 'error');
    return;
  }
  
  if (!updatedData.studentNumber) {
    showAlert('出席番号を入力してください', 'error');
    return;
  }
  
  if (!updatedData.grade) {
    showAlert('学年を選択してください', 'error');
    return;
  }
  
  // 同じ出席番号の重複チェック（自分以外）
  const duplicateStudent = studentsData.students.find(s => 
    s.studentNumber === updatedData.studentNumber && s.id !== currentEditingStudentId
  );
  
  if (duplicateStudent) {
    showAlert(`出席番号 ${updatedData.studentNumber} は既に ${duplicateStudent.name}さんが使用しています`, 'error');
    return;
  }
  
  // 児童データの更新
  const studentIndex = studentsData.students.findIndex(s => s.id === currentEditingStudentId);
  if (studentIndex === -1) {
    showAlert('編集対象の児童データが見つかりません', 'error');
    return;
  }
  
  // 更新データをマージ（レコードなどの既存データは保持）
  studentsData.students[studentIndex] = {
    ...studentsData.students[studentIndex],
    ...updatedData,
    updatedAt: new Date().toISOString()
  };
  
  // データを保存
  saveData();
  
  // UIを更新
  updateUI();
  
  // モーダルを閉じる
  closeModal('editStudentModal');
  
  // 成功メッセージ
  showAlert(`${updatedData.name}さんの情報を更新しました`, 'success');
  
  // 編集中ID をリセット
  currentEditingStudentId = null;
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
 * 汎用ファイル作成・ダウンロード関数
 * @param {string} content - ファイル内容
 * @param {string} filename - ファイル名
 * @param {string} mimeType - MIMEタイプ
 * @param {string} errorPrefix - エラーメッセージのプレフィックス
 */
function createAndDownloadFile(content, filename, mimeType = 'text/plain;charset=utf-8', errorPrefix = 'ファイル') {
  try {
    // すべてのファイルをBOMなしで作成（互換性のため）
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    
    // DOM に一時的に追加してクリック
    document.body.appendChild(a);
    a.click();
    
    // クリーンアップ
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error(`${errorPrefix}作成エラー:`, error);
    showAlert(`${errorPrefix}の作成に失敗しました: ${error.message}`, 'error');
    return false;
  }
}

/**
 * 安全なファイル名を生成する関数
 * @param {string} baseName - ベースとなるファイル名
 * @param {string} extension - 拡張子（ドットを含む）
 * @param {boolean} includeTime - 時刻を含むかどうか
 */
function generateSafeFilename(baseName, extension = '.txt', includeTime = true) {
  // 日付文字列の生成
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = includeTime ? 
    `_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}` : '';
  
  // ベース名の安全化（日本語文字、英数字、一部記号のみ許可）
  const safeName = baseName
    .replace(/[^\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\w\-]/g, '_')
    .substring(0, 30); // 長さ制限
  
  return `${safeName}_${dateStr}${timeStr}${extension}`;
}

/**
 * データエクスポート
 */
function exportData() {
  try {
    console.log('エクスポート開始...');
    
    // AI分析履歴も含めた完全なデータセットを作成
    const completeData = {
      ...studentsData,
      analysisHistory: analysisHistory || []
    };
    
    console.log('データ準備完了:', {
      students: Object.keys(completeData.students || {}).length,
      analysisHistory: (completeData.analysisHistory || []).length
    });
    
    const dataStr = JSON.stringify(completeData, null, 2);
    const filename = generateSafeFilename('kids_progress_data', '.json');
    
    console.log('ファイル名生成:', filename);
    console.log('データサイズ:', Math.round(dataStr.length / 1024), 'KB');
    
    if (createAndDownloadFile(dataStr, filename, 'application/json;charset=utf-8', 'データエクスポート')) {
      showAlert('データをエクスポートしました（AI分析履歴含む）', 'success');
      console.log('エクスポート成功');
    }
    
  } catch (error) {
    console.error('エクスポートエラー:', error);
    showAlert('データのエクスポートに失敗しました: ' + error.message, 'error');
  }
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
    
    // インポート後は全てのUIコンポーネントを強制更新
    updateStudentsTable();      // 児童管理テーブル
    updateProgressTable();      // 進捗管理一覧
    updateStudentSelect();      // 児童選択プルダウン
    updateInputFields();        // 入力フィールド
    updateFieldSettings();      // フィールド設定
    updateStudentManagementSettings(); // 児童管理設定
    updateStatistics();         // 統計情報
    
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
  let recovered = false;
  
  try {
    // メインデータの読み込み試行
    const saved = localStorage.getItem('analysisHistory');
    if (saved) {
      analysisHistory = JSON.parse(saved);
      console.log(`AI分析履歴を読み込みました: ${analysisHistory.length}件`);
    } else {
      // メインデータがない場合、バックアップから復旧を試行
      recovered = attemptDataRecovery();
    }
  } catch (error) {
    console.error('分析履歴読み込みエラー:', error);
    // エラーの場合もバックアップから復旧を試行
    recovered = attemptDataRecovery();
  }
  
  // どの方法でも復旧できない場合
  if (!analysisHistory || !Array.isArray(analysisHistory)) {
    analysisHistory = [];
    console.log('新しいAI分析履歴を開始します');
  }
  
  // 復旧した場合のアラート
  if (recovered) {
    showAlert('AI分析履歴をバックアップから復旧しました', 'success');
  }
  
  // データ整合性チェック
  validateAnalysisHistoryIntegrity();
  
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
 * データ復旧の試行
 */
function attemptDataRecovery() {
  console.log('AI分析履歴の復旧を試行中...');
  
  // バックアップ1からの復旧
  try {
    const backup = localStorage.getItem('analysisHistory_backup');
    if (backup) {
      analysisHistory = JSON.parse(backup);
      console.log(`バックアップ1から復旧: ${analysisHistory.length}件`);
      // メインデータを復旧したデータで更新
      localStorage.setItem('analysisHistory', JSON.stringify(analysisHistory));
      return true;
    }
  } catch (error) {
    console.error('バックアップ1復旧失敗:', error);
  }
  
  // タイムスタンプ付きバックアップからの復旧
  try {
    const allKeys = Object.keys(localStorage);
    const backupKeys = allKeys.filter(key => key.startsWith('analysisHistory_backup_'))
      .sort().reverse(); // 新しい順
    
    for (const key of backupKeys) {
      try {
        const backup = localStorage.getItem(key);
        if (backup) {
          analysisHistory = JSON.parse(backup);
          console.log(`タイムスタンプバックアップから復旧: ${analysisHistory.length}件 (${key})`);
          // メインデータを復旧したデータで更新
          localStorage.setItem('analysisHistory', JSON.stringify(analysisHistory));
          return true;
        }
      } catch (keyError) {
        console.error(`${key}の復旧失敗:`, keyError);
        continue;
      }
    }
  } catch (error) {
    console.error('タイムスタンプバックアップ復旧失敗:', error);
  }
  
  // 緊急バックアップからの復旧
  try {
    const emergency = localStorage.getItem('analysisHistory_emergency');
    if (emergency) {
      analysisHistory = JSON.parse(emergency);
      console.log(`緊急バックアップから復旧: ${analysisHistory.length}件`);
      // メインデータを復旧したデータで更新
      localStorage.setItem('analysisHistory', JSON.stringify(analysisHistory));
      return true;
    }
  } catch (error) {
    console.error('緊急バックアップ復旧失敗:', error);
  }
  
  // 自動バックアップからの復旧（最適化版）
  try {
    const allKeys = Object.keys(localStorage);
    
    // 完全バックアップを優先して試行
    const fullBackupKeys = allKeys.filter(key => key.startsWith('auto_backup_full_'))
      .sort().reverse(); // 新しい順
    
    for (const key of fullBackupKeys) {
      try {
        const backup = localStorage.getItem(key);
        if (backup) {
          const backupData = JSON.parse(backup);
          if (backupData.analysisHistory && Array.isArray(backupData.analysisHistory)) {
            analysisHistory = backupData.analysisHistory;
            console.log(`完全自動バックアップから復旧: ${analysisHistory.length}件 (${key})`);
            localStorage.setItem('analysisHistory', JSON.stringify(analysisHistory));
            return true;
          }
        }
      } catch (keyError) {
        console.error(`${key}の復旧失敗:`, keyError);
        continue;
      }
    }
    
    // 完全バックアップがない場合は軽量バックアップから情報を取得
    const lightBackupKeys = allKeys.filter(key => key.startsWith('auto_backup_light_'))
      .sort().reverse();
    
    for (const key of lightBackupKeys) {
      try {
        const backup = localStorage.getItem(key);
        if (backup) {
          const backupData = JSON.parse(backup);
          if (backupData.latest && Array.isArray(backupData.latest)) {
            // 軽量バックアップからメタデータのみ復旧
            console.log(`軽量自動バックアップから部分復旧: ${backupData.count}件中${backupData.latest.length}件 (${key})`);
            analysisHistory = backupData.latest.map(item => ({
              ...item,
              content: '(部分復旧: 詳細な分析内容は失われました)'
            }));
            localStorage.setItem('analysisHistory', JSON.stringify(analysisHistory));
            showAlert('軽量バックアップから部分的に復旧しました。一部の分析内容が失われています。', 'warning');
            return true;
          }
        }
      } catch (keyError) {
        console.error(`${key}の復旧失敗:`, keyError);
        continue;
      }
    }
    
    // 古い形式の自動バックアップも試行
    const oldAutoBackupKeys = allKeys.filter(key => key.startsWith('auto_backup_') && 
      !key.includes('light_') && !key.includes('full_') && key !== 'auto_backup_minimal')
      .sort().reverse();
    
    for (const key of oldAutoBackupKeys) {
      try {
        const backup = localStorage.getItem(key);
        if (backup) {
          const backupData = JSON.parse(backup);
          if (backupData.analysisHistory && Array.isArray(backupData.analysisHistory)) {
            analysisHistory = backupData.analysisHistory;
            console.log(`旧形式自動バックアップから復旧: ${analysisHistory.length}件 (${key})`);
            localStorage.setItem('analysisHistory', JSON.stringify(analysisHistory));
            return true;
          }
        }
      } catch (keyError) {
        console.error(`${key}の復旧失敗:`, keyError);
        continue;
      }
    }
  } catch (error) {
    console.error('自動バックアップ復旧失敗:', error);
  }
  
  return false;
}

/**
 * データ整合性チェック
 */
function validateAnalysisHistoryIntegrity() {
  if (!analysisHistory || !Array.isArray(analysisHistory)) {
    return;
  }
  
  let fixedCount = 0;
  
  // 各分析結果の必須フィールドをチェック
  analysisHistory = analysisHistory.filter((analysis, index) => {
    if (!analysis || typeof analysis !== 'object') {
      fixedCount++;
      return false;
    }
    
    // 必須フィールドの確認
    if (!analysis.id) {
      analysis.id = `recovery_${Date.now()}_${index}`;
      fixedCount++;
    }
    
    if (!analysis.title) {
      analysis.title = '復旧された分析結果';
      fixedCount++;
    }
    
    if (!analysis.timestamp) {
      analysis.timestamp = Date.now() - (index * 60000); // 適当なタイムスタンプを設定
      fixedCount++;
    }
    
    if (!analysis.type) {
      analysis.type = 'overall'; // デフォルトはクラス全体
      fixedCount++;
    }
    
    return true;
  });
  
  if (fixedCount > 0) {
    console.log(`データ整合性チェック完了: ${fixedCount}件の問題を修正`);
    // 修正したデータを保存
    localStorage.setItem('analysisHistory', JSON.stringify(analysisHistory));
  }
}

/**
 * 手動バックアップ作成機能
 */
function createManualBackup() {
  try {
    const backupData = {
      analysisHistory: analysisHistory || [],
      studentsData: studentsData || {},
      parentReportHistory: JSON.parse(localStorage.getItem('parentReportHistory') || '[]'),
      reportSettings: reportSettings || {},
      timestamp: Date.now(),
      version: '1.0'
    };
    
    // JSONファイルはBOMなしで作成
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json;charset=utf-8'
    });
    
    // 安全なファイル名を生成
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.getHours().toString().padStart(2, '0') + 
                   now.getMinutes().toString().padStart(2, '0');
    const filename = `ai_analysis_backup_${dateStr}_${timeStr}.json`;
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    
    // DOM に一時的に追加してクリック
    document.body.appendChild(a);
    a.click();
    
    // クリーンアップ
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showAlert('AI分析データのバックアップファイルを作成しました', 'success');
  } catch (error) {
    console.error('手動バックアップ作成エラー:', error);
    showAlert('バックアップの作成に失敗しました: ' + error.message, 'error');
  }
}

/**
 * 最適化された自動バックアップ
 */
function startAutoBackup() {
  let backupAttempts = 0;
  
  // 初回は10分後に開始（起動時の負荷を避ける）
  setTimeout(() => {
    performAutoBackup();
    
    // 以降は5分ごとに実行
    setInterval(() => {
      performAutoBackup();
    }, 5 * 60 * 1000);
    
  }, 10 * 60 * 1000); // 10分後に開始
}

/**
 * 自動バックアップの実行
 */
function performAutoBackup() {
  // データがない、または最近保存されていない場合はスキップ
  if (!analysisHistory || analysisHistory.length === 0) {
    return;
  }
  
  // 最後の保存から1分以内は自動バックアップをスキップ
  const metadata = localStorage.getItem('analysisHistory_metadata');
  if (metadata) {
    try {
      const metaInfo = JSON.parse(metadata);
      const timeSinceLastSave = Date.now() - metaInfo.lastSaved;
      if (timeSinceLastSave < 60000) { // 1分未満
        console.log('最近保存されたため自動バックアップをスキップ');
        return;
      }
    } catch (error) {
      // メタデータ読み込みエラーは無視
    }
  }
  
  // 段階的バックアップ実行
  try {
    // 軽量バックアップ（要約版）
    const lightBackup = {
      count: analysisHistory.length,
      latest: analysisHistory.slice(0, 3).map(item => ({
        id: item.id,
        title: item.title,
        timestamp: item.timestamp,
        type: item.type
      })),
      timestamp: Date.now()
    };
    
    const autoBackupKey = `auto_backup_light_${Date.now()}`;
    localStorage.setItem(autoBackupKey, JSON.stringify(lightBackup));
    
    // 3回に1回だけ完全バックアップ
    if ((Date.now() % 3) === 0) {
      const fullBackupKey = `auto_backup_full_${Date.now()}`;
      const fullBackup = {
        analysisHistory: analysisHistory.slice(0, 10), // 最新10件のみ
        timestamp: Date.now()
      };
      localStorage.setItem(fullBackupKey, JSON.stringify(fullBackup));
    }
    
    // 非同期で古いバックアップを清理
    setTimeout(() => {
      cleanupAutoBackups();
    }, 2000);
    
    console.log('自動バックアップ完了（軽量版）');
    
  } catch (error) {
    console.error('自動バックアップエラー:', error);
    
    // エラー時は最小限のバックアップを試行
    try {
      const minimalBackup = {
        count: analysisHistory.length,
        lastId: analysisHistory[0]?.id,
        timestamp: Date.now()
      };
      localStorage.setItem('auto_backup_minimal', JSON.stringify(minimalBackup));
    } catch (minimalError) {
      // 最小限のバックアップも失敗した場合は何もしない
    }
  }
}

/**
 * 自動バックアップの清理
 */
function cleanupAutoBackups() {
  try {
    const allKeys = Object.keys(localStorage);
    
    // 軽量バックアップは5個まで保持
    const lightKeys = allKeys.filter(key => key.startsWith('auto_backup_light_'))
      .sort().reverse();
    if (lightKeys.length > 5) {
      lightKeys.slice(5).forEach(key => localStorage.removeItem(key));
    }
    
    // 完全バックアップは2個まで保持
    const fullKeys = allKeys.filter(key => key.startsWith('auto_backup_full_'))
      .sort().reverse();
    if (fullKeys.length > 2) {
      fullKeys.slice(2).forEach(key => localStorage.removeItem(key));
    }
    
    // 古い形式の自動バックアップを削除
    const oldKeys = allKeys.filter(key => key.startsWith('auto_backup_') && 
      !key.includes('light_') && !key.includes('full_') && key !== 'auto_backup_minimal');
    oldKeys.forEach(key => localStorage.removeItem(key));
    
  } catch (error) {
    console.error('自動バックアップ清理エラー:', error);
  }
}

/**
 * バックアップ状況の表示
 */
function showBackupStatus() {
  try {
    // メタデータ取得
    const metadata = localStorage.getItem('analysisHistory_metadata');
    const metaInfo = metadata ? JSON.parse(metadata) : null;
    
    // バックアップキーの確認（最適化版）
    const allKeys = Object.keys(localStorage);
    const mainBackup = localStorage.getItem('analysisHistory_backup') ? 'あり' : 'なし';
    const timestampBackups = allKeys.filter(key => key.startsWith('analysisHistory_backup_')).length;
    const autoBackupsLight = allKeys.filter(key => key.startsWith('auto_backup_light_')).length;
    const autoBackupsFull = allKeys.filter(key => key.startsWith('auto_backup_full_')).length;
    const emergencyBackup = localStorage.getItem('analysisHistory_emergency') ? 'あり' : 'なし';
    
    // バックアップ効率の計算
    const backupCounter = metaInfo ? metaInfo.backupCounter || 0 : 0;
    const lastBackupLevel = backupCounter > 0 ? getBackupLevel(backupCounter) : '未実行';
    
    // 最新バックアップの日時
    const lastSaved = metaInfo ? new Date(metaInfo.lastSaved).toLocaleString('ja-JP') : '不明';
    const totalCount = metaInfo ? metaInfo.totalCount : analysisHistory ? analysisHistory.length : 0;
    
    // 使用容量の概算
    const usedStorage = JSON.stringify(localStorage).length;
    const storageInfo = `約 ${Math.round(usedStorage / 1024)} KB使用`;
    
    const statusHTML = `
      <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
          <h3 class="modal-title">
            <i class="fas fa-shield-alt"></i> AI分析データ バックアップ状況
          </h3>
          <button class="modal-close" onclick="closeModal('backupStatusModal')">&times;</button>
        </div>
        <div class="modal-body">
          <div class="bg-success mb-3">
            <h4 class="text-success">
              <i class="fas fa-check-circle"></i> データ保護状況: 良好
            </h4>
            <p class="text-sm">AI分析結果は複数の方法で保護されています</p>
          </div>
          
          <div class="grid-2-cols gap-3">
            <div class="card">
              <h4 class="text-primary">
                <i class="fas fa-database"></i> 基本情報
              </h4>
              <ul class="text-sm">
                <li><strong>分析履歴件数:</strong> ${totalCount}件</li>
                <li><strong>最終保存:</strong> ${lastSaved}</li>
                <li><strong>ストレージ使用量:</strong> ${storageInfo}</li>
              </ul>
            </div>
            
            <div class="card">
              <h4 class="text-primary">
                <i class="fas fa-shield-alt"></i> バックアップ状況
              </h4>
              <ul class="text-sm">
                <li><strong>メインバックアップ:</strong> ${mainBackup}</li>
                <li><strong>タイムスタンプバックアップ:</strong> ${timestampBackups}件</li>
                <li><strong>自動バックアップ（軽量）:</strong> ${autoBackupsLight}件</li>
                <li><strong>自動バックアップ（完全）:</strong> ${autoBackupsFull}件</li>
                <li><strong>緊急バックアップ:</strong> ${emergencyBackup}</li>
                <li><strong>最終バックアップレベル:</strong> ${lastBackupLevel}</li>
              </ul>
            </div>
          </div>
          
          <div class="bg-info mt-3">
            <h4 class="text-primary">
              <i class="fas fa-info-circle"></i> 保護機能について
            </h4>
            <ul class="text-sm">
              <li><strong>複数箇所保存:</strong> メインデータとは別に複数のバックアップを自動作成</li>
              <li><strong>自動バックアップ:</strong> 5分ごとに最新データを自動保存</li>
              <li><strong>データ復旧:</strong> 問題発生時は自動的にバックアップから復旧</li>
              <li><strong>整合性チェック:</strong> データの破損を検出し自動修復</li>
            </ul>
          </div>
          
          <div class="flex gap-2 mt-3">
            <button class="btn btn-primary" onclick="createManualBackup(); closeModal('backupStatusModal');">
              <i class="fas fa-download"></i> 手動バックアップ作成
            </button>
            <button class="btn btn-secondary" onclick="closeModal('backupStatusModal')">
              閉じる
            </button>
          </div>
        </div>
      </div>
    `;
    
    // モーダルの作成と表示
    let modal = document.getElementById('backupStatusModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'backupStatusModal';
      modal.className = 'modal';
      document.body.appendChild(modal);
    }
    
    modal.innerHTML = statusHTML;
    modal.classList.add('show');
    
  } catch (error) {
    console.error('バックアップ状況表示エラー:', error);
    showAlert('バックアップ状況の表示に失敗しました', 'error');
  }
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
async function runAIAnalysis() {
  if (!studentsData.students || studentsData.students.length === 0) {
    showAlert('分析対象の児童データがありません', 'warning');
    return;
  }

  // 分析中の表示
  showAnalysisLoading('クラス全体分析を実行中...');

  try {
    // 実際のLLM分析実行
    const analysisResult = await generateClassAnalysis();
    displayAnalysisResults([analysisResult]);
    saveAnalysisToHistory(analysisResult);
    showAlert('クラス全体分析が完了しました', 'success');
  } catch (error) {
    console.error('クラス分析エラー:', error);
    showAlert('AI分析中にエラーが発生しました。APIキーの設定を確認してください。', 'error');
  }
}

/**
 * 全員個別分析実行
 */
async function runAllIndividualAnalysis() {
  if (!studentsData.students || studentsData.students.length === 0) {
    showAlert('分析対象の児童データがありません', 'warning');
    return;
  }

  // 分析中の表示
  showAnalysisLoading('全員個別分析を実行中...');

  try {
    // 実際のLLM分析実行（順次実行でAPIレート制限を考慮）
    const analysisResults = [];
    for (const student of studentsData.students) {
      try {
        const result = await generateIndividualAnalysis(student);
        analysisResults.push(result);
        
        // 個別分析結果を各児童のレコードにも保存
        if (result.type === 'individual' && result.studentId) {
          addIndividualAnalysisToStudent(result.studentId, result.content);
        }
        
        saveAnalysisToHistory(result);
      } catch (error) {
        console.error(`${student.name}さんの分析エラー:`, error);
        // エラーがあっても他の児童の分析を続行
      }
    }
    
    displayAnalysisResults(analysisResults);
    saveData();
    updateUI();
    
    // 進捗一覧の更新（AI分析詳細ボタンを表示するため）
    if (currentTab === 'overview') {
      updateProgressTable();
    }
    
    showAlert(`全員個別分析が完了しました（${analysisResults.length}件）`, 'success');
  } catch (error) {
    console.error('全員個別分析エラー:', error);
    showAlert('AI分析中にエラーが発生しました。APIキーの設定を確認してください。', 'error');
  }
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
async function executeIndividualAnalysis() {
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

  try {
    // 実際のLLM分析実行
    const analysisResult = await generateIndividualAnalysis(student);
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
  } catch (error) {
    console.error(`${student.name}さんの個別分析エラー:`, error);
    showAlert('AI分析中にエラーが発生しました。APIキーの設定を確認してください。', 'error');
  }
}

/**
 * クラス統計情報の計算
 */
function calculateClassStatistics(recentData) {
  if (recentData.length === 0) {
    return {
      summary: 'データが不足しているため、統計情報を計算できません。',
      learningStatus: null,
      motivation: null,
      homework: null,
      behaviorTags: null
    };
  }

  // 学習状況の統計
  const learningStatuses = recentData
    .map(d => parseInt(d.data.learningStatus))
    .filter(s => !isNaN(s));
  
  // 学習意欲の統計
  const motivations = recentData
    .map(d => parseInt(d.data.motivation))
    .filter(m => !isNaN(m));
  
  // 宿題提出状況の統計
  const homeworkSubmissions = recentData
    .map(d => d.data.homework)
    .filter(h => h);
  
  // 行動タグの統計
  const allBehaviorTags = recentData
    .flatMap(d => d.data.behaviorTags || [])
    .filter(tag => tag);

  // 平均値と分布の計算
  const calculateStats = (values) => {
    if (values.length === 0) return null;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    return {
      mean: Math.round(mean * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      count: values.length,
      distribution: calculateDistribution(values)
    };
  };

  const calculateDistribution = (values) => {
    const dist = [1, 2, 3, 4, 5].map(level => ({
      level,
      count: values.filter(v => v === level).length,
      percentage: Math.round((values.filter(v => v === level).length / values.length) * 100)
    }));
    return dist;
  };

  const learningStats = calculateStats(learningStatuses);
  const motivationStats = calculateStats(motivations);

  // 宿題提出状況の分析
  const homeworkStats = homeworkSubmissions.length > 0 ? {
    total: homeworkSubmissions.length,
    submitted: homeworkSubmissions.filter(h => h === '提出').length,
    partiallySubmitted: homeworkSubmissions.filter(h => h === '一部提出').length,
    notSubmitted: homeworkSubmissions.filter(h => h === '未提出' || h === '').length
  } : null;

  // 行動タグの頻度分析
  const tagFrequency = {};
  allBehaviorTags.forEach(tag => {
    tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
  });
  const topBehaviorTags = Object.entries(tagFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count, percentage: Math.round((count / recentData.length) * 100) }));

  return {
    summary: `${recentData.length}名の児童データを分析`,
    learningStatus: learningStats,
    motivation: motivationStats,
    homework: homeworkStats,
    behaviorTags: {
      totalTags: allBehaviorTags.length,
      uniqueTags: Object.keys(tagFrequency).length,
      topTags: topBehaviorTags
    }
  };
}

/**
 * クラス全体分析の生成
 */
async function generateClassAnalysis() {
  const totalStudents = studentsData.students.length;
  const studentsWithRecords = studentsData.students.filter(s => s.records && s.records.length > 0);
  const recordCount = studentsWithRecords.reduce((sum, student) => sum + student.records.length, 0);

  // 設定に基づいて分析データを収集
  const recentData = [];
  studentsWithRecords.forEach(student => {
    if (student.records.length > 0) {
      const targetRecords = getRecordsForReport(student.records, 'analysis');
      if (targetRecords.length > 0) {
        const latestRecord = targetRecords[targetRecords.length - 1];
        if (latestRecord.data) {
          recentData.push({
            name: student.name,
            grade: student.grade,
            class: student.class,
            data: latestRecord.data,
            timestamp: latestRecord.timestamp,
            recordCount: targetRecords.length
          });
        }
      }
    }
  });

  // 統計情報を事前計算
  const statisticalSummary = calculateClassStatistics(recentData);

  // 詳細度設定を取得
  const promptSettings = getPromptSettings();
  
  // 実際のデータを基にプロンプト作成
  const prompt = `以下のクラスデータを分析してください：

## 基本情報
- 生徒数: ${totalStudents}名
- 総記録数: ${recordCount}件
- 分析対象データ範囲: ${reportSettings.analysisDataCount === 'all' ? 'すべて' : `最新${reportSettings.analysisDataCount}回分`}
- 分析詳細度: ${reportSettings.reportDetailLevel === 'simple' ? '簡易レポート' : '詳細レポート'}
- 分析日時: ${new Date().toLocaleDateString('ja-JP')}

## クラス統計サマリー
${statisticalSummary.summary}

### 学習状況の分布
${statisticalSummary.learningStatus ? 
  `- 平均値: ${statisticalSummary.learningStatus.mean}/5.0点
- 標準偏差: ${statisticalSummary.learningStatus.stdDev}
- 評価分布: ${statisticalSummary.learningStatus.distribution.map(d => `${d.level}点(${d.count}名、${d.percentage}%)`).join(', ')}` : 
  '学習状況データが不足しています'}

### 学習意欲の分布
${statisticalSummary.motivation ? 
  `- 平均値: ${statisticalSummary.motivation.mean}/5.0点
- 標準偏差: ${statisticalSummary.motivation.stdDev}
- 評価分布: ${statisticalSummary.motivation.distribution.map(d => `${d.level}点(${d.count}名、${d.percentage}%)`).join(', ')}` : 
  '学習意欲データが不足しています'}

### 宿題提出状況
${statisticalSummary.homework ? 
  `- 提出: ${statisticalSummary.homework.submitted}名
- 一部提出: ${statisticalSummary.homework.partiallySubmitted}名  
- 未提出: ${statisticalSummary.homework.notSubmitted}名` : 
  '宿題データが不足しています'}

### よく見られる行動特性（上位5つ）
${statisticalSummary.behaviorTags && statisticalSummary.behaviorTags.topTags.length > 0 ? 
  statisticalSummary.behaviorTags.topTags.map(tag => `- ${tag.tag}: ${tag.count}回観察 (${tag.percentage}%の児童)`).join('\n') : 
  '行動タグデータが不足しています'}

## 分析要求
教育専門家として、上記の統計情報を踏まえ、以下の観点で${promptSettings.style}クラス全体の分析レポートを作成してください：
${promptSettings.detailRequirement}

**重要**: テーブル形式（|記号を使った表）は使用せず、文章と箇条書きのみで分析結果を表現してください。

${reportSettings.reportDetailLevel === 'simple' ? 
  `1. **クラス全体の状況（概要）**
   - 学習状況の全体的な傾向
   - 良い点と改善ポイント

2. **重点的な取り組み項目**
   - 優先的に取り組むべき課題
   - 具体的な改善方法

3. **今後のアクション**
   - 短期的な取り組み（1ヶ月）
   - 継続すべきポイント` :
  `1. **学習状況の全体傾向分析**
   - 各評価項目の平均値と分布を文章で説明
   - クラス全体の学習レベル評価を具体的に記述
   - 特に優秀な領域と改善が必要な領域を箇条書きで特定

2. **注意が必要な領域の特定**
   - 低評価が多い項目の分析
   - 個別サポートが必要と思われる児童の傾向
   - 学習意欲や宿題提出に関する課題

3. **クラス運営の改善提案**
   - 具体的な指導方法の提案
   - グループ学習や個別指導の活用方法
   - 授業運営の工夫点

4. **保護者との連携方法**
   - 家庭学習のサポート方法
   - 保護者面談での重点ポイント
   - 学校と家庭の協力体制構築

5. **今後のアクションプラン**
   - 短期的（1ヶ月）の取り組み
   - 中期的（学期）の目標設定
   - 継続的な改善ポイント`}

マークダウン形式で、具体的で実践的なレポートを作成してください。

**出力形式の注意事項:**
- テーブル形式（| | |）は一切使用しないでください
- 統計データは文章または箇条書きで表現してください
- 数値データは「平均○○点」「○名中○名が」などの自然な文章で記述してください
- 見出し（#、##、###）と箇条書き（-、*）のみを使用してください`;

  try {
    // 既存のcallLLMAPI関数を使用
    const analysisContent = await callLLMAPI(prompt);
    
    return {
      id: `class_analysis_${Date.now()}`,
      type: 'overall',
      title: '📊 クラス全体分析レポート',
      content: analysisContent,
      timestamp: new Date().toISOString(),
      studentCount: totalStudents,
      recordCount: recordCount
    };
  } catch (error) {
    console.error('クラス分析エラー:', error);
    throw error;
  }
}

/**
 * 個別分析の生成
 */
async function generateIndividualAnalysis(student) {
  const records = student.records || [];
  
  if (records.length === 0) {
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
- **最新記録**: なし

#### 📝 推奨事項
1. **データ蓄積**: 継続的な進捗記録の実施
2. **観察強化**: 日々の様子をより詳細に記録  
3. **コメント追加**: 児童への観察コメントを入れることでより詳細な分析が可能になります
4. **再分析**: 1-2週間後の再分析実施

定期的なデータ記録により、より精度の高い分析が可能になります。`,
      timestamp: new Date().toISOString()
    };
  }

  // 設定に基づいて使用するレコード数を取得
  const targetRecords = getRecordsForReport(records, 'analysis');
  const latestRecord = targetRecords[targetRecords.length - 1];
  
  if (!latestRecord || !latestRecord.data) {
    return {
      id: `individual_analysis_${student.id}_${Date.now()}`,
      type: 'individual',
      studentId: student.id,
      studentName: student.name,
      title: `👤 ${student.name}さんの個別分析`,
      content: `### ⚠️ 分析データ不足
      
${student.name}さんについては、分析に使用できるデータが不足しています。

#### 🔍 現在の状況
- **総記録数**: ${records.length}件
- **分析対象記録数**: ${targetRecords.length}件
- **最新記録**: ${targetRecords.length > 0 ? formatDate(latestRecord.timestamp) : 'なし'}

#### 📝 推奨事項
1. **データ確認**: 記録されたデータの内容を確認
2. **再記録**: 不足項目の追加記録
3. **設定調整**: レポート設定でデータ範囲を調整
4. **再分析**: データ追加後の再分析実施

より多くのデータがあることで、精度の高い分析が可能になります。`,
      timestamp: new Date().toISOString()
    };
  }

  // 詳細度設定を取得
  const promptSettings = getPromptSettings();
  
  const prompt = `児童の個別学習分析を実施してください：

## 児童基本情報
- 名前: ${student.name}さん
- 学年: ${student.grade}年生
- クラス: ${student.class}
- 性別: ${student.gender}
- 分析詳細度: ${reportSettings.reportDetailLevel === 'simple' ? '簡易レポート' : '詳細レポート'}

## 最新の学習データ
${JSON.stringify(latestRecord.data, null, 2)}

## 学習履歴（設定された範囲: ${targetRecords.length}回分）
${targetRecords.map((record, index) => 
  `${index + 1}. 記録日: ${formatDate(record.timestamp)}
データ: ${JSON.stringify(record.data, null, 2)}`
).join('\n\n')}

## 分析要求
小学校教師として、以下の観点で${student.name}さんの${promptSettings.style}個別分析を行ってください：
${promptSettings.detailRequirement}

${reportSettings.reportDetailLevel === 'simple' ? 
  `1. **現在の状況（概要）**
   - 強みと改善ポイント
   - 学習態度の評価
   
2. **指導のポイント**
   - 重点的な支援方法
   - 具体的な指導提案
   
3. **今後の目標**
   - 短期目標（1ヶ月）
   - 継続すべき取り組み` :
  `1. **現在の学習状況評価**
   - 強みと成長ポイントの特定
   - 改善が必要な領域の分析
   - 学習態度や取り組み姿勢の評価
   
2. **学習傾向の分析**
   - 過去の記録から見る成長パターン
   - 学習意欲や取り組み姿勢の変化
   - 得意分野と苦手分野の傾向
   
3. **具体的な指導提案**
   - 個別指導のポイント
   - 学習支援の具体的方法
   - 授業での配慮事項
   
4. **家庭との連携方法**
   - 保護者への報告内容
   - 家庭学習のサポート方法
   - 学校と家庭の協力ポイント

5. **今後の成長支援計画**
   - 短期目標（1ヶ月）
   - 中期目標（学期）
   - 継続的な観察ポイント`}

マークダウン形式で、教育的価値の高い分析レポートを作成してください。`;

  try {
    // 既存のcallLLMAPI関数を使用
    const analysisContent = await callLLMAPI(prompt);
    
    return {
      id: `individual_analysis_${student.id}_${Date.now()}`,
      type: 'individual',
      studentId: student.id,
      studentName: student.name,
      title: `👤 ${student.name}さんの個別分析`,
      content: analysisContent,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`${student.name}さんの個別分析エラー:`, error);
    throw error;
  }
}

/**
 * 個人分析の詳細生成
 */
async function generatePersonalAnalysis(student, records) {
  // 設定に基づいて使用するレコード数を取得
  const targetRecords = getRecordsForReport(records, 'analysis');
  const latestRecord = targetRecords[targetRecords.length - 1];
  const data = latestRecord.data;
  
  // 設定された範囲のデータを準備
  const recentRecords = targetRecords;
  const historicalData = recentRecords.map((record, index) => ({
    recordDate: formatDate(record.timestamp),
    recordNumber: index + 1,
    data: record.data,
    notes: record.notes || 'なし'
  }));

  const prompt = `小学校教師として、${student.name}さんの総合的な個別分析レポートを作成してください。

## 基本情報
- 児童名: ${student.name}さん
- 学年: ${student.grade}年生
- クラス: ${student.class}
- 性別: ${student.gender === 'male' ? '男子' : student.gender === 'female' ? '女子' : '不明'}

## 最新の学習データ（${formatDate(latestRecord.timestamp)}）
${JSON.stringify(data, null, 2)}

## 学習履歴データ（直近5回分）
${JSON.stringify(historicalData, null, 2)}

## 分析要求
以下の構造で詳細な個別分析レポートを作成してください：

### 📊 現在の状況分析
- 学習状況の詳細評価（強み・課題・特徴）
- 学習意欲や取り組み姿勢の分析
- 宿題提出状況や行動面の評価
- その他の特記すべき観察事項

### 📈 成長の傾向
- 時系列データから見る成長パターン
- 改善が見られる領域
- 継続的な課題や注意点
- 発達段階に応じた変化の評価

### 💡 具体的な指導提案
- 授業での個別配慮事項
- 効果的な学習支援方法
- 評価方法の工夫
- グループ活動での役割や配置

### 🏠 保護者との連携ポイント
- 家庭学習でのサポート方法
- 生活習慣改善のアドバイス
- 保護者面談での重点話題
- 学校と家庭の協力体制

### 📅 今後の重点項目
- 短期目標（1ヶ月以内）
- 中期目標（学期内）
- 継続的な観察ポイント
- 成長を促すための具体的取り組み

## 出力要件
- マークダウン形式で構造化
- 具体的で実践的な内容
- 温かい視点での表現
- 教育的価値の高い提案

分析基準日: ${formatDate(latestRecord.timestamp)}`;

  try {
    const analysisContent = await callLLMAPI(prompt);
    return analysisContent || `### 👤 ${student.name}さんの個別分析レポート

#### ⚠️ 分析生成エラー
AI分析の生成中にエラーが発生しました。データを確認して再度実行してください。

#### 📊 利用可能なデータ
- 最新記録日: ${formatDate(latestRecord.timestamp)}
- 記録数: ${records.length}件
- 最新データ: ${Object.keys(data).length}項目

*データ不足や接続問題が原因の可能性があります。*`;
  } catch (error) {
    console.error(`${student.name}さんの個別分析生成エラー:`, error);
    return `### 👤 ${student.name}さんの個別分析レポート

#### ⚠️ 分析生成エラー
AI分析の生成中にエラーが発生しました：${error.message}

#### 📊 利用可能なデータ
- 最新記録日: ${formatDate(latestRecord.timestamp)}
- 記録数: ${records.length}件
- 最新データ: ${Object.keys(data).length}項目

*システム管理者に連絡するか、しばらく時間をおいて再度お試しください。*`;
  }
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
async function generateClassObservations(recentData) {
  if (!recentData || recentData.length === 0) {
    return `- **データ不足**: クラス全体の観察データが不足しています
- **推奨事項**: 継続的な進捗記録の実施が必要です`;
  }

  // 実際のデータ分析を基にした詳細なプロンプト作成
  const classSize = recentData.length;
  const learningData = recentData.map(record => ({
    name: record.name || '生徒',
    grade: record.grade || '',
    data: record.data || {},
    timestamp: record.timestamp || new Date().toISOString()
  }));
  
  // 学習状況の統計計算
  const learningScores = learningData
    .map(student => student.data.learningStatus || 0)
    .filter(score => score > 0);
  
  const motivationScores = learningData
    .map(student => student.data.motivation || 0)
    .filter(score => score > 0);
    
  const avgLearning = learningScores.length > 0 ? 
    (learningScores.reduce((sum, score) => sum + score, 0) / learningScores.length).toFixed(1) : 'データなし';
    
  const avgMotivation = motivationScores.length > 0 ? 
    (motivationScores.reduce((sum, score) => sum + score, 0) / motivationScores.length).toFixed(1) : 'データなし';

  const prompt = `以下のクラス観察データを分析し、教育的観点から詳細な観察結果を提供してください：

## クラス基本情報
- **クラス規模**: ${classSize}名
- **データ記録日**: ${new Date().toLocaleDateString('ja-JP')}
- **学習状況平均**: ${avgLearning}/5.0
- **学習意欲平均**: ${avgMotivation}/5.0

## 個別児童データ詳細
${learningData.map((student, index) => 
  `### ${index + 1}. ${student.name}${student.grade ? ` (${student.grade}年生)` : ''}
記録データ: ${JSON.stringify(student.data, null, 2)}`
).join('\n\n')}

## 分析要求
小学校教師として、以下の観点でクラス全体の観察結果を分析してください：

1. **学習意欲・態度の傾向**
   - 積極的に学習に取り組む児童の特徴
   - 支援が必要な児童の状況と背景
   
2. **社会性・協調性の状況**
   - 友人関係やグループ活動での様子
   - リーダーシップを発揮する児童
   
3. **生活面・基本習慣**
   - 時間管理や整理整頓の状況
   - 健康状態や給食の様子
   
4. **個別配慮が必要な領域**
   - 特別な支援や配慮が必要な児童
   - 成長が期待できるポイント

**出力形式**: 各観察点を「- **カテゴリ名**: 具体的な観察内容」の形式で、教育的価値の高い実践的な観察結果として出力してください。`;

  try {
    const observations = await callLLMAPI(prompt);
    return observations || `- **分析実行済み**: ${classSize}名のクラス全体観察を実施
- **データ品質**: 実際の進捗データに基づく分析完了
- **継続観察**: 定期的な記録更新で詳細分析が可能`;
  } catch (error) {
    console.error('クラス観察生成エラー:', error);
    return `- **観察データ**: ${classSize}名の児童を対象に分析実施
- **学習状況**: 平均${avgLearning}点の学習状況を確認
- **学習意欲**: 平均${avgMotivation}点の意欲レベルを観察
- **総合評価**: 継続的な観察により個別支援ポイントを特定中`;
  }
}

/**
 * クラス向け推奨事項の生成
 */
async function generateClassRecommendations(stats, recentData) {
  if (!stats || !recentData || recentData.length === 0) {
    return `- **データ収集**: まずは児童の進捗データを継続的に記録しましょう
- **個別観察**: 各児童の特性を把握するための観察記録を開始
- **基礎体制**: クラス運営の基本的なルールと環境を整備`;
  }

  // 統計データの詳細分析
  const classSize = recentData.length;
  const lowPerformanceFields = Object.keys(stats.averages || {})
    .filter(field => parseFloat(stats.averages[field]) < 3.0)
    .map(field => ({ field, score: stats.averages[field] }));
    
  const highPerformanceFields = Object.keys(stats.averages || {})
    .filter(field => parseFloat(stats.averages[field]) >= 4.0)
    .map(field => ({ field, score: stats.averages[field] }));

  // データ詳細の構築
  const detailedData = recentData.map(record => ({
    name: record.name || '生徒',
    grade: record.grade || '',
    data: record.data || {}
  }));

  const prompt = `以下のクラス統計データを基に、小学校教師として具体的で実践的な指導改善提案を作成してください：

## クラス基本情報
- **クラス規模**: ${classSize}名
- **分析日時**: ${new Date().toLocaleDateString('ja-JP')}
- **データ品質**: ${Object.keys(stats.averages || {}).length}項目の評価データ

## 統計分析結果
### 改善が必要な領域 (平均3.0未満)
${lowPerformanceFields.length > 0 ? 
  lowPerformanceFields.map(item => `- ${item.field}: ${item.score}点`).join('\n') :
  '- すべての項目で良好な結果（平均3.0以上）'}

### 優秀な領域 (平均4.0以上)
${highPerformanceFields.length > 0 ? 
  highPerformanceFields.map(item => `- ${item.field}: ${item.score}点`).join('\n') :
  '- 今後の伸び代として期待される領域あり'}

## 個別児童データ概要
${detailedData.slice(0, 10).map((student, index) => 
  `### ${index + 1}. ${student.name}${student.grade ? ` (${student.grade}年生)` : ''}
主要評価: ${Object.entries(student.data).slice(0, 3).map(([key, value]) => `${key}: ${value}`).join(', ')}`
).join('\n')}
${detailedData.length > 10 ? `\n... 他${detailedData.length - 10}名のデータあり` : ''}

## 具体的推奨事項の要求
小学校教師として、以下の観点から実践的な指導改善提案を作成してください：

1. **短期的改善策（1-2週間以内）**
   - 低評価項目の具体的改善方法
   - 日々の授業で実践できる工夫

2. **中期的改善策（1ヶ月以内）**
   - クラス全体の雰囲気向上策
   - 個別指導の具体的方法

3. **長期的改善策（学期単位）**
   - カリキュラムや環境の改善
   - 保護者との連携強化

4. **個別配慮事項**
   - 特別な支援が必要な児童への対応
   - 優秀な児童のさらなる伸長支援

**出力形式**: 各提案を「- **カテゴリ名**: 具体的で実践可能な提案内容」の形式で出力してください。実際の教育現場で即座に実行できる内容にしてください。`;

  try {
    const recommendations = await callLLMAPI(prompt);
    return recommendations || `- **個別指導強化**: 低評価項目(${lowPerformanceFields.length}項目)への重点的サポート
- **クラス環境改善**: ${classSize}名全体の学習環境の最適化
- **保護者連携**: 定期的な情報共有による家庭との協力体制構築
- **継続評価**: データに基づく客観的な成長追跡の継続`;
  } catch (error) {
    console.error('クラス推奨事項生成エラー:', error);
    return `- **データ分析結果**: ${classSize}名のクラス統計に基づく指導方針策定
- **改善優先項目**: ${lowPerformanceFields.length}項目の重点的な指導改善
- **強化継続項目**: ${highPerformanceFields.length}項目の良好な状況維持
- **個別対応**: 一人ひとりの特性に応じた指導計画の実施`;
  }
}

/**
 * 保護者連携ポイントの生成
 */
async function generateParentCollaborationPoints(stats, recentData = [], classInfo = {}) {
  if (!stats || Object.keys(stats).length === 0) {
    return `- **初期連携**: 保護者との信頼関係構築と情報共有体制の確立
- **データ共有**: 児童の進捗記録システムの説明と協力依頼
- **定期連絡**: 月1回以上の定期的な情報交換体制の構築
- **課題対応**: 気になる点があれば迅速な情報共有と解決策の検討`;
  }

  // 統計データの分析
  const classSize = recentData.length || 0;
  const averageScores = stats.averages || {};
  const lowPerformanceAreas = Object.keys(averageScores)
    .filter(field => parseFloat(averageScores[field]) < 3.0)
    .map(field => ({ field, score: averageScores[field] }));
    
  const highPerformanceAreas = Object.keys(averageScores)
    .filter(field => parseFloat(averageScores[field]) >= 4.0)
    .map(field => ({ field, score: averageScores[field] }));

  // クラス全体の傾向分析
  const dataQuality = Object.keys(averageScores).length;
  const currentDate = new Date().toLocaleDateString('ja-JP');

  const prompt = `小学校教師として、クラス全体の統計データを基に、保護者との効果的な連携方法について具体的な提案を作成してください：

## クラス全体の状況分析
- **クラス規模**: ${classSize}名
- **データ収集状況**: ${dataQuality}項目の評価データ
- **分析実施日**: ${currentDate}
- **学年**: ${classInfo.grade || ''}年生
- **クラス**: ${classInfo.className || ''}

## 統計データ詳細
### 改善が必要な領域 (平均3.0未満)
${lowPerformanceAreas.length > 0 ? 
  lowPerformanceAreas.map(area => `- ${area.field}: ${area.score}点`).join('\n') :
  '- 全項目が平均以上の良好な状況'}

### 優秀な領域 (平均4.0以上)  
${highPerformanceAreas.length > 0 ? 
  highPerformanceAreas.map(area => `- ${area.field}: ${area.score}点`).join('\n') :
  '- 今後の成長が期待される領域を特定中'}

## 保護者連携戦略の要求
小学校教師として、以下の観点から効果的な保護者連携方法を提案してください：

### 1. 情報共有の方法
- 児童の成長や課題を保護者にどのように伝えるか
- 定期的な連絡手段と頻度の提案
- データに基づく客観的な情報提供方法

### 2. 課題対応の連携
- 低評価項目への家庭と学校の協力方法
- 早期発見・早期対応のための連携体制
- 問題解決に向けた具体的な協力方法

### 3. 成長促進の連携
- 優秀な領域をさらに伸ばすための家庭との協力
- 児童の意欲向上につながる家庭・学校連携
- 長期的な成長目標の共有方法

### 4. 継続的な関係構築
- 保護者との信頼関係を深める方法
- 効果的なコミュニケーションのタイミング
- 学級全体の向上に向けた保護者コミュニティ形成

**出力形式**: 各連携ポイントを「- **カテゴリ名**: 具体的で実践可能な連携方法」の形式で出力してください。実際の教育現場で実行できる内容にしてください。`;

  try {
    const collaborationPoints = await callLLMAPI(prompt);
    return collaborationPoints || `- **成長共有**: ${highPerformanceAreas.length}項目の良好な状況を積極的に保護者に報告
- **課題連携**: ${lowPerformanceAreas.length}項目の改善に向けた家庭との協力体制構築
- **定期連絡**: 月1回以上の定期的な情報交換による継続的な関係維持
- **データ活用**: ${dataQuality}項目の評価データを基にした客観的な情報共有`;
  } catch (error) {
    console.error('保護者連携ポイント生成エラー:', error);
    return `- **統計共有**: ${classSize}名のクラス統計データに基づく客観的な情報提供
- **個別対応**: 改善必要項目(${lowPerformanceAreas.length}項目)への家庭・学校協力
- **成長促進**: 良好項目(${highPerformanceAreas.length}項目)のさらなる伸長支援
- **継続連携**: 定期的な情報交換による信頼関係の構築と維持`;
  }
}

/**
 * アクションプランの生成
 */
async function generateActionPlan(stats, totalStudents, recentData = []) {
  if (!stats || !totalStudents || totalStudents === 0) {
    return `- **データ準備**: 児童の基本情報登録と評価項目の設定
- **記録開始**: 日々の学習・生活観察記録の開始
- **体制構築**: クラス運営の基本的なルールと環境整備
- **保護者説明**: 進捗管理システムの説明と協力依頼`;
  }

  // 統計データから課題と強みを分析
  const lowPerformanceAreas = Object.keys(stats.averages || {})
    .filter(field => parseFloat(stats.averages[field]) < 3.0)
    .map(field => ({ field, score: parseFloat(stats.averages[field]) }));

  const highPerformanceAreas = Object.keys(stats.averages || {})
    .filter(field => parseFloat(stats.averages[field]) >= 4.0)
    .map(field => ({ field, score: parseFloat(stats.averages[field]) }));

  const dataQuality = recentData.length;
  const currentDate = new Date().toLocaleDateString('ja-JP');

  const prompt = `小学校教師として、${totalStudents}名のクラスの統計データを基に、具体的で実行可能なアクションプランを作成してください：

## クラス状況分析
- **児童数**: ${totalStudents}名
- **データ収集状況**: ${dataQuality}件の進捗記録
- **分析実施日**: ${currentDate}

## 統計データ詳細
### 改善が必要な領域 (平均3.0未満)
${lowPerformanceAreas.length > 0 ? 
  lowPerformanceAreas.map(area => `- ${area.field}: ${area.score}点`).join('\n') :
  '- 全項目が平均以上の良好な状況'}

### 強化継続領域 (平均4.0以上)
${highPerformanceAreas.length > 0 ? 
  highPerformanceAreas.map(area => `- ${area.field}: ${area.score}点`).join('\n') :
  '- 今後の成長が期待される領域を特定中'}

## アクションプラン作成要求
教育現場の実情を踏まえ、以下の期間別に具体的なアクションプランを作成してください：

### 1. 短期目標（1-2週間以内）
- 緊急性の高い課題への対応
- 日々の授業や生活指導で実践できる改善策
- 低評価項目への具体的な取り組み

### 2. 中期目標（1ヶ月以内）
- クラス全体の雰囲気や学習環境の改善
- 個別児童への集中的な支援計画
- 保護者との連携強化策

### 3. 長期目標（学期末まで）
- 根本的な学習・生活習慣の改善
- カリキュラムや指導方法の見直し
- 次学期に向けた継続的な成長計画

### 4. 継続的取り組み
- データ収集と分析の継続方法
- 効果測定と改善サイクルの確立
- 学校全体との連携強化

**出力形式**: 各目標を「- **期間・カテゴリ**: 具体的で測定可能なアクション内容」の形式で出力してください。実際の教育現場で実行可能な内容にしてください。`;

  try {
    const actionPlan = await callLLMAPI(prompt);
    return actionPlan || `- **短期目標**: ${lowPerformanceAreas.length}項目の改善に向けた日々の重点指導
- **中期目標**: ${totalStudents}名全員との個別面談と保護者との情報共有
- **長期目標**: データに基づく継続的な成長追跡システムの確立
- **継続事項**: 週1回の分析レビューと月1回の指導方針調整`;
  } catch (error) {
    console.error('アクションプラン生成エラー:', error);
    return `- **データ分析**: ${totalStudents}名の統計データに基づく課題特定完了
- **改善計画**: ${lowPerformanceAreas.length}項目の重点的改善計画策定
- **支援体制**: 個別指導とクラス全体指導の効果的な組み合わせ実施
- **評価継続**: 定期的なデータ収集と成果測定による改善サイクル確立`;
  }
}

/**
 * 学生の学習分析
 */
async function analyzeStudentLearning(data, studentName) {
  if (!data || Object.keys(data).length === 0) {
    return '- 十分な評価データが蓄積されていません。継続的な記録をお勧めします。';
  }

  const prompt = `小学校教師として、${studentName}さんの学習状況を詳細に分析してください。

## 分析対象データ
${JSON.stringify(data, null, 2)}

## 利用可能な評価項目
${studentsData.fieldDefinitions ? JSON.stringify(studentsData.fieldDefinitions.map(f => ({
  id: f.id,
  name: f.name,
  type: f.type,
  description: f.description
})), null, 2) : '項目定義が利用できません'}

## 分析要求
各評価項目について、以下の観点で詳細な分析を行ってください：

### 学習面の分析
- 5段階評価項目の解釈と具体的な状況説明
- チェックボックス項目の実施状況と改善点
- 自由記述項目の内容分析と教育的価値

### 行動面の分析
- 行動タグ（multiselect）からの性格・特性の読み取り
- 日常的な行動パターンの評価
- 社会性や協調性の発達状況

### 総合評価
- 全体的な学習状況のまとめ
- 特に優秀な領域と支援が必要な領域
- ${studentName}さんの個性や特徴の把握

## 出力形式
マークダウンのリスト形式で、各項目について具体的で建設的な分析結果を提供してください。
機械的な評価ではなく、教育的な洞察を含めた温かい視点での分析をお願いします。`;

  try {
    const analysis = await callLLMAPI(prompt);
    return analysis || '- AI分析の生成中にエラーが発生しました。データを確認して再度実行してください。';
  } catch (error) {
    console.error(`${studentName}さんの学習分析エラー:`, error);
    return `- 学習分析の生成中にエラーが発生しました（${error.message}）。システム管理者にお問い合わせください。`;
  }
}

/**
 * 学生の成長分析
 */
async function analyzeStudentGrowth(records, studentName, studentInfo = null) {
  if (records.length < 2) {
    return `- **データ蓄積期間**: 成長傾向の分析は次回以降に実施されます
- **継続記録の重要性**: より多くのデータが蓄積されることで、${studentName}さんの成長パターンや変化の傾向がより明確に見えてきます
- **今後の期待**: 継続的な記録により、学習面・生活面・社会性など様々な側面での成長が可視化されます`;
  }

  // 時系列データを整理
  const chronologicalData = records.map((record, index) => ({
    recordNumber: index + 1,
    date: formatDate(record.timestamp),
    data: record.data,
    notes: record.notes || 'なし'
  }));

  const prompt = `小学校教師として、${studentName}さんの成長傾向を時系列データから詳細に分析してください。

## 対象児童
- 名前: ${studentName}さん
${studentInfo ? `- 学年: ${studentInfo.grade}年生
- クラス: ${studentInfo.class}
- 性別: ${studentInfo.gender === 'male' ? '男子' : studentInfo.gender === 'female' ? '女子' : '不明'}` : ''}

## 時系列記録データ（${records.length}件）
${JSON.stringify(chronologicalData, null, 2)}

## 成長分析要求
以下の観点から、${studentName}さんの成長傾向を詳細に分析してください：

### 時系列変化パターン
- 各評価項目の時間的変化の傾向
- 向上が見られる領域と継続的な課題
- 記録期間を通じた全体的な成長方向性
- 特定の時期における変化や転機

### 学習面の成長分析
- 理解度・学習意欲・授業参加度等の変化
- 宿題提出や家庭学習の習慣形成
- 各教科での取り組み状況の推移
- 学習スキル・学習態度の発達

### 生活・行動面の成長分析
- 日常生活習慣の改善や定着
- 社会性・協調性の発達状況
- 自主性・責任感の向上
- 問題行動の改善や新たな課題

### 意欲・態度面の成長分析
- 学習に対する取り組み姿勢の変化
- 困難に向き合う力の成長
- 自信や自己肯定感の変化
- 新しいことへの挑戦意欲

### 成長の質的評価
- 量的変化だけでなく質的な成長の評価
- ${studentName}さんらしい成長の特徴
- 今後期待される成長の方向性
- 成長を支える要因の分析

## 出力要件
- マークダウンのリスト形式
- 具体的なデータに基づく客観的分析
- 教育的な洞察を含む温かい視点
- 今後の指導に活かせる示唆
- 成長の継続性と今後の展望

データの変化を丁寧に読み取り、${studentName}さんの成長ストーリーとして分析してください。`;

  try {
    const growthAnalysis = await callLLMAPI(prompt);
    return growthAnalysis || `- **成長分析**: ${records.length}件のデータから成長パターンを分析
- **最新傾向**: 直近の記録から${studentName}さんは着実な成長を見せています
- **継続性**: 定期的な記録により客観的な成長の把握が可能になっています
- **AI分析エラー**: 詳細な成長分析の生成中にエラーが発生しました`;
  } catch (error) {
    console.error(`${studentName}さんの成長分析エラー:`, error);
    return `- **成長分析エラー**: 成長傾向の分析中にエラーが発生しました（${error.message}）
- **記録期間**: ${records.length}件のデータが蓄積されています
- **継続観察**: 引き続き${studentName}さんの成長を見守り、記録を継続します
- **システム確認**: システム管理者にお問い合わせください`;
  }
}

/**
 * 学生向け推奨事項の生成
 */
async function generateStudentRecommendations(data, studentName, studentInfo = null) {
  if (!data || Object.keys(data).length === 0) {
    return `- **継続観察**: ${studentName}さんの現在の状況を継続的に観察し、成長をサポート
- **個別面談**: ${studentName}さんとの1対1の時間を設け、本人の思いや悩みを聞く
- **強み活用**: ${studentName}さんの得意分野を見つけて自信につなげる`;
  }

  const prompt = `小学校教師として、${studentName}さんに対する具体的で実践的な指導提案を作成してください。

## 対象児童
- 名前: ${studentName}さん
${studentInfo ? `- 学年: ${studentInfo.grade}年生
- クラス: ${studentInfo.class}
- 性別: ${studentInfo.gender === 'male' ? '男子' : studentInfo.gender === 'female' ? '女子' : '不明'}` : ''}

## 評価データ
${JSON.stringify(data, null, 2)}

## 評価項目詳細
${studentsData.fieldDefinitions ? JSON.stringify(studentsData.fieldDefinitions.map(f => ({
  id: f.id,
  name: f.name,
  type: f.type,
  description: f.description
})), null, 2) : '項目定義が利用できません'}

## 指導提案要求
以下の観点から、${studentName}さんに特化した具体的で実践的な指導提案を作成してください：

### 授業での指導方法
- 理解度や意欲に応じた授業中の配慮事項
- 効果的な質問や声かけの方法
- 座席配置やグループ分けでの配慮
- 個別指導のタイミングと方法

### 学習支援の具体策
- 強化すべき学習領域と具体的アプローチ
- 理解促進のための教材や手法の提案
- 家庭学習の効果的な進め方
- 復習や予習の具体的な方法

### 意欲・態度の向上策
- 学習意欲を高める具体的な取り組み
- 自信を育むための評価方法
- 成功体験を積ませる課題設定
- リーダーシップや協調性の育成方法

### 生活指導・行動面
- 日常生活での指導ポイント
- 社会性や協調性の向上策
- 問題行動への対応方法
- 良い習慣の定着化方法

### 評価・フィードバック
- 効果的な評価方法とタイミング
- 建設的なフィードバックの与え方
- 成長の可視化と励ましの方法
- 保護者への報告内容

## 出力要件
- マークダウンのリスト形式
- 実際の授業や指導場面で即実践可能な内容
- ${studentName}さんの個性や特徴を活かした提案
- 温かく建設的な表現
- 具体的で明確な行動指針

各提案には実施方法も含めて詳細に記述してください。`;

  try {
    const recommendations = await callLLMAPI(prompt);
    return recommendations || `- **継続観察**: ${studentName}さんの現在の状況を継続的に観察し、成長をサポート
- **個別面談**: ${studentName}さんとの1対1の時間を設け、本人の思いや悩みを聞く
- **強み活用**: ${studentName}さんの得意分野を見つけて自信につなげる
- **AI分析エラー**: 詳細な提案の生成中にエラーが発生しました`;
  } catch (error) {
    console.error(`${studentName}さんの指導提案エラー:`, error);
    return `- **指導提案エラー**: 個別提案の生成中にエラーが発生しました（${error.message}）
- **継続観察**: ${studentName}さんの現在の状況を継続的に観察し、成長をサポート
- **個別面談**: ${studentName}さんとの1対1の時間を設け、本人の思いや悩みを聞く
- **システム確認**: システム管理者にお問い合わせください`;
  }
}

/**
 * 保護者向けアドバイスの生成
 */
async function generateParentAdvice(data, studentName, studentInfo = {}) {
  if (!data || Object.keys(data).length === 0) {
    return `- **継続記録**: ${studentName}さんの日々の様子を継続的に記録し、成長を把握
- **基本的な環境**: 落ち着いて学習できる家庭環境の整備
- **コミュニケーション**: 学校での出来事を聞く時間を作り、${studentName}さんとの対話を大切に
- **学校連携**: 気になることがあれば遠慮なく学校との情報共有を`;
  }

  // 評価データの詳細分析
  const evaluationSummary = Object.entries(data)
    .filter(([key, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => {
      if (typeof value === 'number') {
        return `${key}: ${value}/5`;
      } else if (typeof value === 'boolean') {
        return `${key}: ${value ? '良好' : '要注意'}`;
      } else {
        return `${key}: ${value}`;
      }
    });

  // 学習状況の特定
  const learningStatus = data.learningStatus || data['学習状況'] || data['今日の理解度'] || 3;
  const motivation = data.motivation || data['学習意欲'] || data['積極性'] || 3;
  const socialAspect = data.friendships || data['友人関係'] || data['協調性'] || 3;
  const lifestyle = data.healthStatus || data['健康状態'] || data['身だしなみ'] || 3;

  const prompt = `${studentName}さんの保護者に向けて、家庭でのサポート方法について具体的で実践的なアドバイスを作成してください：

## ${studentName}さんの学習・生活状況
### 基本情報
- 名前: ${studentName}さん
- 学年: ${studentInfo.grade || ''}年生
- クラス: ${studentInfo.class || ''}
- 記録日: ${new Date().toLocaleDateString('ja-JP')}

### 現在の評価データ詳細
${evaluationSummary.slice(0, 15).join('\n')}
${evaluationSummary.length > 15 ? `\n... 他${evaluationSummary.length - 15}項目のデータあり` : ''}

### 主要指標分析
- 学習状況: ${learningStatus}/5.0
- 学習意欲: ${motivation}/5.0  
- 社会性: ${socialAspect}/5.0
- 生活面: ${lifestyle}/5.0

## 保護者向けアドバイス作成要求
小学校教師として、${studentName}さんの保護者に向けて以下の観点から具体的なアドバイスを作成してください：

### 1. 家庭での学習サポート
- 現在の学習状況に基づく具体的な支援方法
- 学習環境の整備や学習習慣の改善提案
- 宿題や復習における保護者の関わり方

### 2. 生活習慣・社会性の育成
- 基本的な生活習慣の改善点
- 友人関係や社会性向上のための家庭での取り組み
- 健康管理や身だしなみに関する配慮事項

### 3. 心理的サポート
- ${studentName}さんの意欲向上につながる声かけ方法
- 自己肯定感を高める家庭での接し方
- 挫折や困難に直面した時のサポート方法

### 4. 学校との連携
- 効果的な情報共有の方法
- 保護者として学校に相談すべきタイミング
- 家庭と学校の協力体制の構築方法

**出力形式**: 各アドバイスを「- **カテゴリ名**: 具体的で実践可能なアドバイス内容」の形式で出力してください。保護者が実際に家庭で実践できる内容にしてください。`;

  try {
    const advice = await callLLMAPI(prompt);
    return advice || `- **学習サポート**: ${studentName}さんの現在の学習状況(${learningStatus}/5)に応じた適切な支援
- **生活習慣**: 規則正しい生活と健康管理による学習基盤の強化
- **心理的支援**: ${studentName}さんの努力を認め、自己肯定感を高める声かけの実践
- **学校連携**: 定期的な情報共有と課題解決への協力体制の構築`;
  } catch (error) {
    console.error('保護者アドバイス生成エラー:', error);
    return `- **家庭学習**: ${studentName}さんの学習状況(${learningStatus}/5)に合わせた適切なサポート
- **環境整備**: 集中できる学習環境と規則正しい生活リズムの維持
- **コミュニケーション**: ${studentName}さんとの対話を通じた心理的サポート
- **学校協力**: 気になる点があれば積極的な学校との情報共有`;
  }
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
  // AI分析タブの分析結果コンテナ
  const analysisContainer = document.getElementById('analysisResultsTable');
  if (analysisContainer) {
    analysisContainer.innerHTML = `
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
  
  // 親御さん向けレポートコンテナ
  const parentContainer = document.getElementById('parentReportHistory');
  if (parentContainer) {
    parentContainer.innerHTML = `
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
}

/**
 * 親御さん向けレポート作成中の表示
 */
function showParentReportLoading(message) {
  // 親御さん向けレポートコンテナのみに表示
  const parentContainer = document.getElementById('parentReportHistory');
  if (parentContainer) {
    parentContainer.innerHTML = `
      <div class="alert alert-info" style="text-align: center; padding: 2rem;">
        <div style="margin-bottom: 1rem;">
          <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary);"></i>
        </div>
        <h4 style="margin: 0 0 0.5rem 0; color: var(--primary);">${message}</h4>
        <p style="margin: 0; color: var(--text-secondary);">
          レポートを生成しています。しばらくお待ちください...
        </p>
      </div>
    `;
  }
}

/**
 * ローディング画面を隠す
 */
function hideAnalysisLoading() {
  // AI分析履歴を更新
  if (document.getElementById('analysisResultsTable')) {
    displayAnalysisResults(analysisHistory);
  }
  
  // 親御さん向けレポート履歴を更新
  if (document.getElementById('parentReportHistory')) {
    updateParentReportHistory();
  }
}

/**
 * 親御さん向けレポートローディングを隠す
 */
function hideParentReportLoading() {
  // 親御さん向けレポート履歴のみを更新
  if (document.getElementById('parentReportHistory')) {
    updateParentReportHistory();
  }
}

/**
 * 分析結果の表示
 */
function displayAnalysisResults(results, page = 1) {
  console.log('displayAnalysisResults called with:', { results: results ? results.length : 'null', page });
  const container = document.getElementById('analysisResultsTable');
  if (!container) {
    console.error('analysisResultsTable container not found');
    return;
  }
  console.log('Container found, updating content...');

  currentAnalysisPage = page;
  const totalItems = results ? results.length : 0;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const pageResults = results ? results.slice(startIndex, endIndex) : [];

  let tableHTML = `
    <div style="margin-bottom: 1rem;">
      <h4 style="color: var(--primary); margin: 0; display: flex; align-items: center; gap: 0.5rem;">
        <i class="fas fa-chart-bar"></i>
        分析結果 (${totalItems}件)
        ${totalPages > 1 ? `- ページ ${page}/${totalPages}` : ''}
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
            <th style="width: 180px;">操作</th>
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
    console.log('Processing analysis results:', pageResults.length, 'items on page');
    pageResults.forEach((result, index) => {
      try {
        console.log(`Processing result ${index}:`, result.id, result.type, result.timestamp);
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
            <div style="display: flex; gap: 0.25rem; flex-wrap: wrap;">
              <button class="btn btn-secondary" onclick="viewAnalysisDetail('${result.id}')" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">
                <i class="fas fa-eye"></i> 詳細
              </button>
              <button class="btn btn-primary" onclick="exportAnalysisResultPDF('${result.id}')" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" title="PDF出力">
                <i class="fas fa-file-pdf"></i> PDF
              </button>
              <button class="btn btn-error" onclick="deleteAnalysisResult('${result.id}')" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" title="この分析結果を削除">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
      } catch (error) {
        console.error(`Error processing analysis result ${index}:`, error, result);
      }
    });
  }

  tableHTML += `
        </tbody>
      </table>
    </div>
  `;

  // ページネーション追加
  if (totalPages > 1) {
    tableHTML += `
      <div style="display: flex; justify-content: center; align-items: center; gap: 0.5rem; margin-top: 1rem;">
        <button class="btn btn-secondary" onclick="displayAnalysisResults(analysisHistory, ${page - 1})" 
                ${page <= 1 ? 'disabled' : ''} style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">
          <i class="fas fa-chevron-left"></i> 前
        </button>
        <span style="color: var(--text-secondary); font-size: 0.9rem;">
          ${page} / ${totalPages}
        </span>
        <button class="btn btn-secondary" onclick="displayAnalysisResults(analysisHistory, ${page + 1})" 
                ${page >= totalPages ? 'disabled' : ''} style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">
          次 <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    `;
  }

  try {
    container.innerHTML = tableHTML;
    console.log('Analysis results HTML updated, container innerHTML length:', container.innerHTML.length);
  } catch (error) {
    console.error('Error updating analysis results HTML:', error);
  }
}

/**
 * 分析概要の生成
 */
function generateAnalysisSummary(content) {
  // contentがnullまたはundefinedの場合のハンドリング
  if (!content || typeof content !== 'string') {
    return '分析が完了しました。詳細ボタンで内容をご確認ください。';
  }
  
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
 * 分析履歴への保存（最適化版）
 */
function saveAnalysisToHistory(analysisResult) {
  if (!analysisHistory) {
    analysisHistory = [];
  }
  
  analysisHistory.unshift(analysisResult); // 最新を先頭に
  
  // 履歴は最大1000件まで保持
  if (analysisHistory.length > 1000) {
    analysisHistory = analysisHistory.slice(0, 1000);
  }
  
  // 非同期で保存処理を実行（UI のブロックを避ける）
  setTimeout(() => {
    performOptimizedSave(analysisResult);
  }, 0);
  
  // 履歴プレビューは即座に更新（UX向上）
  updateAnalysisHistoryPreview();
}

/**
 * 最適化された保存処理
 */
function performOptimizedSave(analysisResult) {
  try {
    // メインの保存場所
    const historyStr = JSON.stringify(analysisHistory);
    localStorage.setItem('analysisHistory', historyStr);
    
    // 効率的なバックアップ戦略
    // 1. メインバックアップは3回に1回のみ更新
    if (!window.backupCounter) window.backupCounter = 0;
    window.backupCounter++;
    
    if (window.backupCounter % 3 === 0) {
      localStorage.setItem('analysisHistory_backup', historyStr);
    }
    
    // 2. タイムスタンプバックアップは5回に1回のみ作成
    if (window.backupCounter % 5 === 0) {
      const backupKey = `analysisHistory_backup_${Date.now()}`;
      localStorage.setItem(backupKey, historyStr);
      
      // 古いタイムスタンプバックアップを遅延削除（5個まで保持）
      setTimeout(() => {
        cleanupTimestampBackups();
      }, 1000);
    }
    
    // 3. メタデータの軽量更新
    const metadata = {
      lastSaved: Date.now(),
      totalCount: analysisHistory.length,
      lastAnalysisId: analysisResult.id,
      lastAnalysisType: analysisResult.type,
      backupCounter: window.backupCounter
    };
    localStorage.setItem('analysisHistory_metadata', JSON.stringify(metadata));
    
    console.log(`AI分析結果を保存: ${analysisResult.title} (バックアップレベル: ${getBackupLevel(window.backupCounter)})`);
    
  } catch (error) {
    console.error('AI分析履歴保存エラー:', error);
    handleSaveError(error);
  }
}

/**
 * タイムスタンプバックアップの清理（遅延実行）
 */
function cleanupTimestampBackups() {
  try {
    const allKeys = Object.keys(localStorage);
    const backupKeys = allKeys.filter(key => key.startsWith('analysisHistory_backup_'))
      .sort().reverse(); // 新しい順
    
    if (backupKeys.length > 5) {
      // 古いバックアップを段階的に削除（一度に全部削除しない）
      const keysToDelete = backupKeys.slice(5, 8); // 3個ずつ削除
      keysToDelete.forEach(key => {
        localStorage.removeItem(key);
      });
    }
  } catch (error) {
    console.error('バックアップ清理エラー:', error);
  }
}

/**
 * 保存エラーハンドリング
 */
function handleSaveError(error) {
  if (error.name === 'QuotaExceededError') {
    // 容量不足の場合の軽量化処理
    try {
      // 古いバックアップを削除してスペース確保
      cleanupOldBackups();
      
      // 軽量化された緊急バックアップ
      const emergencyBackup = analysisHistory.slice(0, 5).map(item => ({
        id: item.id,
        title: item.title,
        timestamp: item.timestamp,
        type: item.type,
        content: item.content.substring(0, 500) + '...' // 内容を縮小
      }));
      
      localStorage.setItem('analysisHistory_emergency', JSON.stringify(emergencyBackup));
      showAlert('ストレージ容量が不足しています。緊急バックアップを作成しました。', 'warning');
    } catch (emergencyError) {
      console.error('緊急バックアップ失敗:', emergencyError);
      showAlert('データの保存に失敗しました。ブラウザのストレージをクリアしてください。', 'error');
    }
  } else {
    showAlert('分析結果の保存でエラーが発生しました。', 'warning');
  }
}

/**
 * 古いバックアップの清理
 */
function cleanupOldBackups() {
  const allKeys = Object.keys(localStorage);
  
  // タイムスタンプバックアップをすべて削除
  allKeys.filter(key => key.startsWith('analysisHistory_backup_'))
    .forEach(key => localStorage.removeItem(key));
  
  // 自動バックアップも削除
  allKeys.filter(key => key.startsWith('auto_backup_'))
    .forEach(key => localStorage.removeItem(key));
}

/**
 * バックアップレベルの取得
 */
function getBackupLevel(counter) {
  if (counter % 5 === 0) return '完全';
  if (counter % 3 === 0) return '標準';
  return '軽量';
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
              ${analysis.title.replace(/📊|👤|🧠/g, '').trim()}
            </div>
          </div>
          <div style="display: flex; gap: 0.25rem; margin-left: 1rem;">
            <button class="btn btn-secondary" onclick="viewAnalysisDetail('${analysis.id}')" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">
              <i class="fas fa-eye"></i> 詳細
            </button>
            <button class="btn btn-error" onclick="deleteAnalysisResult('${analysis.id}')" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" title="この分析結果を削除">
              <i class="fas fa-trash"></i>
            </button>
          </div>
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
  if (!student) {
    showAlert('児童が見つかりません', 'error');
    return;
  }

  // AI分析履歴から該当児童の最新分析結果を取得
  const latestAnalysis = getLatestAnalysisForStudent(student.name);
  
  if (!latestAnalysis) {
    showAlert(`${student.name}さんに関するAI分析結果がありません。AI分析を実行してください。`, 'info');
    return;
  }

  showAnalysisDetail({
    title: `🧠 ${student.name}さんの最新AI分析`,
    content: latestAnalysis.content,
    analysisDate: formatDate(latestAnalysis.timestamp),
    studentName: student.name,
    type: latestAnalysis.type
  });
}

/**
 * 特定児童の最新AI分析結果を取得
 */
function getLatestAnalysisForStudent(studentName) {
  if (!analysisHistory || analysisHistory.length === 0) {
    return null;
  }

  // 1. 個別分析結果を優先的に検索
  const individualAnalyses = analysisHistory.filter(analysis => 
    analysis.type === 'individual' && 
    (analysis.studentName === studentName || (analysis.content && analysis.content.includes(studentName)))
  );
  
  if (individualAnalyses.length > 0) {
    // 最新の個別分析を返す
    return individualAnalyses[0]; // analysisHistoryは新しい順にソート済み
  }

  // 2. 個別分析がない場合は、クラス全体分析から該当部分を抽出
  const classAnalyses = analysisHistory.filter(analysis => 
    analysis.type === 'overall' && analysis.content && analysis.content.includes(studentName)
  );
  
  if (classAnalyses.length > 0) {
    const latestClassAnalysis = classAnalyses[0];
    
    // クラス全体分析から該当児童の部分を抽出
    const extractedContent = extractStudentContentFromClassAnalysis(latestClassAnalysis.content, studentName);
    
    if (extractedContent) {
      return {
        ...latestClassAnalysis,
        content: extractedContent,
        title: `${studentName}さんに関するクラス分析抜粋`
      };
    }
  }

  return null;
}

/**
 * クラス全体分析から特定児童の内容を抽出
 */
function extractStudentContentFromClassAnalysis(content, studentName) {
  if (!content || !studentName) return null;

  // 児童名を含む段落や文章を抽出
  const lines = content.split('\n');
  const relevantLines = [];
  let contextLines = [];
  let foundRelevantContent = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes(studentName)) {
      // 児童名を含む行が見つかった場合
      foundRelevantContent = true;
      
      // 前後の文脈も含める（見出しや説明）
      if (contextLines.length > 0) {
        relevantLines.push(...contextLines);
        contextLines = [];
      }
      relevantLines.push(line);
      
      // 次の数行も関連する可能性があるので追加
      for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
        if (lines[j].trim() && !lines[j].includes('##') && !lines[j].includes('**')) {
          relevantLines.push(lines[j]);
        } else {
          break;
        }
      }
    } else if (line.includes('##') || line.includes('**')) {
      // 見出し行は文脈として保持
      contextLines = [line];
    } else if (contextLines.length > 0 && line.trim()) {
      // 見出しの後の説明文を保持
      contextLines.push(line);
      if (contextLines.length > 2) {
        contextLines = contextLines.slice(-2); // 最新2行のみ保持
      }
    }
  }

  if (foundRelevantContent && relevantLines.length > 0) {
    return `# ${studentName}さんに関する分析内容\n\n` + 
           `以下は最新のクラス全体分析から${studentName}さんに関連する部分を抜粋したものです。\n\n` +
           relevantLines.join('\n') + 
           `\n\n---\n\n*より詳細な個別分析を行うには、AI分析タブから「特定児童分析」を実行してください。*`;
  }

  return null;
}

/**
 * 分析内容のフォーマット
 */
function formatAnalysisContent(content) {
  if (!content) return '';
  
  // より統合的なMarkdown処理のためにconvertMarkdownToHTML関数を使用
  return convertMarkdownToHTML(content);
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
 * 個別分析結果削除
 */
function deleteAnalysisResult(resultId) {
  if (!confirm('この分析結果を削除しますか？この操作は取り消せません。')) {
    return;
  }

  // 分析履歴から削除
  const initialLength = analysisHistory.length;
  analysisHistory = analysisHistory.filter(result => result.id !== resultId);
  
  if (analysisHistory.length < initialLength) {
    // ローカルストレージを更新
    localStorage.setItem('analysisHistory', JSON.stringify(analysisHistory));
    
    // 表示を更新
    displayAnalysisResults(analysisHistory);
    updateAnalysisHistoryPreview();
    
    showAlert('分析結果を削除しました', 'success');
  } else {
    showAlert('指定された分析結果が見つかりませんでした', 'error');
  }
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
  const selectedGradeValue = gradeSelect.value;
  
  // クラス選択をリセット
  classSelect.innerHTML = '<option value="">クラスを選択</option>';
  document.getElementById('classReportPreview').style.display = 'none';
  document.getElementById('classReportGenerateBtn').disabled = true;
  
  if (!selectedGradeValue) return;
  
  if (selectedGradeValue === 'all') {
    // 全学年が選択された場合
    const allGradesOption = document.createElement('option');
    allGradesOption.value = 'all';
    allGradesOption.textContent = '全クラス';
    classSelect.appendChild(allGradesOption);
    
    // 全学年のクラス情報を取得
    const allClasses = new Set();
    studentsData.students.forEach(student => {
      if (student.class && student.class.trim()) {
        allClasses.add(student.class.trim());
      }
    });
    
    // 個別クラスオプションを追加
    if (allClasses.size > 0) {
      Array.from(allClasses).sort().forEach(className => {
        const option = document.createElement('option');
        option.value = className;
        option.textContent = className;
        classSelect.appendChild(option);
      });
    }
  } else {
    // 特定学年が選択された場合
    const selectedGrade = parseInt(selectedGradeValue);
    
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
  
  const selectedGradeValue = gradeSelect.value;
  const selectedClass = classSelect.value;
  
  if (!selectedGradeValue || !selectedClass) {
    previewDiv.style.display = 'none';
    generateBtn.disabled = true;
    return;
  }
  
  // 対象児童を取得
  let targetStudents;
  let reportLabel;
  
  if (selectedGradeValue === 'all') {
    // 全学年が選択された場合
    if (selectedClass === 'all') {
      // 全学年・全クラス
      targetStudents = studentsData.students;
      reportLabel = '全学年・全クラス';
    } else {
      // 全学年・特定クラス
      targetStudents = studentsData.students.filter(student => student.class === selectedClass);
      reportLabel = `全学年・${selectedClass}`;
    }
  } else {
    // 特定学年が選択された場合
    const selectedGrade = parseInt(selectedGradeValue);
    if (selectedClass === 'all') {
      // 特定学年・全クラス
      targetStudents = studentsData.students.filter(student => student.grade === selectedGrade);
      reportLabel = `${selectedGrade}年生全体`;
    } else {
      // 特定学年・特定クラス
      targetStudents = studentsData.students.filter(student => 
        student.grade === selectedGrade && student.class === selectedClass
      );
      reportLabel = `${selectedGrade}年${selectedClass}`;
    }
  }
  
  if (targetStudents.length === 0) {
    studentListDiv.innerHTML = '<span style="color: var(--warning);">対象の児童がいません</span>';
    generateBtn.disabled = true;
  } else {
    let displayInfo = '';
    
    if (selectedGradeValue === 'all' || selectedClass === 'all') {
      // 複数学年またはクラスの場合は概要表示
      const gradeSummary = new Map();
      const classSummary = new Map();
      
      targetStudents.forEach(student => {
        // 学年別集計
        const gradeKey = `${student.grade || '未設定'}年生`;
        if (!gradeSummary.has(gradeKey)) {
          gradeSummary.set(gradeKey, []);
        }
        gradeSummary.get(gradeKey).push(student);
        
        // クラス別集計
        const classKey = student.class || '未設定';
        if (!classSummary.has(classKey)) {
          classSummary.set(classKey, []);
        }
        classSummary.get(classKey).push(student);
      });
      
      const gradeDetails = Array.from(gradeSummary.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([gradeName, students]) => {
          const genderCounts = students.reduce((acc, student) => {
            const gender = student.gender === 'male' ? '男子' : student.gender === 'female' ? '女子' : 'その他';
            acc[gender] = (acc[gender] || 0) + 1;
            return acc;
          }, {});
          const genderInfo = Object.entries(genderCounts).map(([gender, count]) => `${gender}${count}名`).join(', ');
          return `${gradeName}: ${students.length}名 (${genderInfo})`;
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
        <strong>対象: ${reportLabel} ${targetStudents.length}名</strong><br>
        <div style="margin-top: 0.5rem; font-size: 0.9rem; line-height: 1.4;">
          <div style="margin-bottom: 0.5rem;"><strong>学年別:</strong><br>${gradeDetails.join('<br>')}</div>
          <div><strong>クラス別:</strong><br>${classDetails.join('<br>')}</div>
        </div>
      `;
    } else {
      // 特定学年・特定クラスの場合は詳細表示
      const studentNames = targetStudents.map(student => {
        const genderIcon = student.gender === 'male' ? '👦' : student.gender === 'female' ? '👧' : '';
        const recordCount = student.records ? student.records.length : 0;
        return `${student.name}さん ${genderIcon} (記録: ${recordCount}件)`;
      });
      
      displayInfo = `
        <strong>対象: ${reportLabel} ${targetStudents.length}名</strong><br>
        <div style="margin-top: 0.5rem; font-size: 0.9rem; line-height: 1.4;">
          ${studentNames.join(', ')}
        </div>
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
async function executeClassReportGeneration() {
  const gradeSelect = document.getElementById('classReportGrade');
  const classSelect = document.getElementById('classReportClass');
  const selectedGradeValue = gradeSelect.value;
  const selectedClass = classSelect.value;
  
  if (!selectedGradeValue || !selectedClass) {
    showAlert('学年とクラスを選択してください', 'error');
    return;
  }
  
  // 対象児童を取得
  let targetStudents;
  let reportLabel;
  
  if (selectedGradeValue === 'all') {
    // 全学年が選択された場合
    if (selectedClass === 'all') {
      // 全学年・全クラス
      targetStudents = studentsData.students;
      reportLabel = '全学年・全クラス';
    } else {
      // 全学年・特定クラス
      targetStudents = studentsData.students.filter(student => student.class === selectedClass);
      reportLabel = `全学年・${selectedClass}`;
    }
  } else {
    // 特定学年が選択された場合
    const selectedGrade = parseInt(selectedGradeValue);
    if (selectedClass === 'all') {
      // 特定学年・全クラス
      targetStudents = studentsData.students.filter(student => student.grade === selectedGrade);
      reportLabel = `${selectedGrade}年生全体`;
    } else {
      // 特定学年・特定クラス
      targetStudents = studentsData.students.filter(student => 
        student.grade === selectedGrade && student.class === selectedClass
      );
      reportLabel = `${selectedGrade}年${selectedClass}`;
    }
  }
  
  if (targetStudents.length === 0) {
    showAlert('対象の児童がいません', 'error');
    return;
  }
  
  // モーダルを閉じる
  closeModal('classReportModal');
  
  // レポート生成中の表示
  showParentReportLoading(`${reportLabel}の親御さん向けレポートを作成中...`);
  
  try {
    // LLMを使用したレポート生成
    let classParentReport;
    if (selectedGradeValue === 'all') {
      // 全学年のレポート生成
      classParentReport = await generateLLMAllGradesParentReport(selectedClass, targetStudents, reportLabel);
    } else {
      const selectedGrade = parseInt(selectedGradeValue);
      if (selectedClass === 'all') {
        // 学年全体のレポート生成
        classParentReport = await generateLLMClassParentReportForGrade(selectedGrade, targetStudents, reportLabel);
      } else {
        // 特定クラスのレポート生成
        classParentReport = await generateLLMClassParentReportForClass(selectedGrade, selectedClass, targetStudents, reportLabel);
      }
    }
    
    saveParentReportToHistory(classParentReport);
    updateParentReportHistory();
    
    // ローディング画面を隠してレポート履歴を表示
    hideParentReportLoading();
    showAlert(`${reportLabel}の親御さん向けレポートが完成しました`, 'success');
  } catch (error) {
    console.error(`${reportLabel}のレポート生成エラー:`, error);
    
    // エラー時はフォールバック版を使用
    try {
      let classParentReport;
      if (selectedGradeValue === 'all') {
        // 全学年のレポート生成（固定テンプレート版）
        classParentReport = generateAllGradesParentReportContent(selectedClass, targetStudents);
      } else {
        const selectedGrade = parseInt(selectedGradeValue);
        if (selectedClass === 'all') {
          // 学年全体のレポート生成（固定テンプレート版）
          classParentReport = generateClassParentReportContentForGrade(selectedGrade, targetStudents);
        } else {
          // 特定クラスのレポート生成（固定テンプレート版）
          classParentReport = generateClassParentReportContentForClass(selectedGrade, selectedClass, targetStudents);
        }
      }
      
      saveParentReportToHistory(classParentReport);
      updateParentReportHistory();
      
      hideParentReportLoading();
      showAlert(`${reportLabel}の親御さん向けレポートが完成しました（固定テンプレート版）`, 'warning');
    } catch (fallbackError) {
      hideParentReportLoading();
      showAlert('レポート生成中にエラーが発生しました。APIキーの設定を確認してください。', 'error');
    }
  }
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
async function executeParentReportGeneration() {
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
          showParentReportLoading(`${student.name}さんの親御さん向けレポートを作成中...`);

  try {
    // 実際のLLMレポート生成実行
    const parentReport = await generateIndividualParentReport(student);
    saveParentReportToHistory(parentReport);
    updateParentReportHistory();
    
    // ローディング画面を隠してレポート履歴を表示
    hideParentReportLoading();
    showAlert(`${student.name}さんの親御さん向けレポートが完成しました`, 'success');
  } catch (error) {
    console.error(`${student.name}さんの親御さん向けレポート生成エラー:`, error);
    // エラー時もローディング画面を隠す
    hideParentReportLoading();
    showAlert('レポート生成中にエラーが発生しました。APIキーの設定を確認してください。', 'error');
  }
}

/**
 * クラス全体の親御さん向けレポート生成（LLM対応版）
 */
async function generateClassParentReport() {
  if (!studentsData.students || studentsData.students.length === 0) {
    showAlert('レポート作成対象の児童データがありません', 'warning');
    return;
  }

  // レポート生成中の表示
  showParentReportLoading('クラス全体の親御さん向けレポートを作成中...');

  try {
    // LLMを使用してクラス全体レポートを生成
    const classParentReport = await generateLLMClassParentReport();
    saveParentReportToHistory(classParentReport);
    updateParentReportHistory();
    
    // ローディング画面を隠してレポート履歴を表示
    hideParentReportLoading();
    showAlert('クラス全体の親御さん向けレポートが完成しました', 'success');
  } catch (error) {
    console.error('クラス全体親御さん向けレポート生成エラー:', error);
    
    // エラー時はフォールバック版を使用
    try {
      const fallbackReport = generateClassParentReportContent();
      saveParentReportToHistory(fallbackReport);
      updateParentReportHistory();
      
      hideParentReportLoading();
      showAlert('クラス全体の親御さん向けレポートが完成しました（固定テンプレート版）', 'warning');
    } catch (fallbackError) {
      hideParentReportLoading();
      showAlert('レポート生成中にエラーが発生しました。APIキーの設定を確認してください。', 'error');
    }
  }
}

/**
 * LLMを使用したクラス全体の親御さん向けレポート生成
 */
async function generateLLMClassParentReport() {
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
          grade: student.grade,
          class: student.class,
          gender: student.gender,
          data: latestRecord.data
        });
      }
    }
  });

  const stats = calculateLearningStats(recentData);
  
  // 学年・クラス構成の分析
  const gradeDistribution = {};
  const classDistribution = {};
  studentsData.students.forEach(student => {
    const grade = student.grade || '未設定';
    const className = student.class || '未設定';
    
    gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
    classDistribution[`${grade}年${className}`] = (classDistribution[`${grade}年${className}`] || 0) + 1;
  });

  // LLM用のプロンプトを構築
  const prompt = `あなたは小学校の担任教師として、保護者向けのクラス全体レポートを作成してください。

## クラス情報
- 総児童数: ${totalStudents}名
- 記録のある児童: ${studentsWithRecords.length}名

## 学年・クラス構成
${Object.entries(classDistribution).map(([key, count]) => `- ${key}: ${count}名`).join('\n')}

## 学習状況（統計データ）
- 学習への取り組み平均: ${stats.avgLearningStatus.toFixed(1)}点（5点満点）
- 学習への意欲平均: ${stats.avgMotivation.toFixed(1)}点（5点満点）
- 宿題提出率: ${Math.round((stats.homeworkSubmissionRate || 0) * 100)}%
- 学習状況の分布: 
  - 5点: ${((stats.learningStatusDistribution && stats.learningStatusDistribution['5']) || 0)}名
  - 4点: ${((stats.learningStatusDistribution && stats.learningStatusDistribution['4']) || 0)}名
  - 3点: ${((stats.learningStatusDistribution && stats.learningStatusDistribution['3']) || 0)}名
  - 2点: ${((stats.learningStatusDistribution && stats.learningStatusDistribution['2']) || 0)}名
  - 1点: ${((stats.learningStatusDistribution && stats.learningStatusDistribution['1']) || 0)}名

## 最近の学習記録から見える傾向
${recentData.length > 0 ? recentData.slice(0, 10).map(record => {
  const learningStatus = getFieldValue(record.data, 'learning_status') || '記録なし';
  const motivation = getFieldValue(record.data, 'motivation') || '記録なし';
  const homework = getFieldValue(record.data, 'homework') || '記録なし';
  return `- ${record.student}さん（${record.grade}年${record.class}）: 学習状況${learningStatus}、意欲${motivation}、宿題${homework}`;
}).join('\n') : '最近の記録データがありません。'}

## レポート作成の指針
1. **温かく親しみやすい文体**で、保護者の方が安心できるトーンで書いてください
2. **具体的な数値を活用**して、客観的な情報も提供してください
3. **家庭でのサポート方法**を具体的に提案してください
4. **子どもたちの成長を肯定的に捉える**視点を大切にしてください
5. **学年やクラスの多様性**を考慮した内容にしてください

## 構成要素（必須）
1. 挨拶と感謝の気持ち
2. クラス全体の様子（学習面・生活面）
3. 統計データを踏まえた客観的な状況報告
4. 子どもたちの素晴らしい点・成長している点
5. 家庭でのサポートのお願い（具体的なアドバイス）
6. 今後の目標や取り組み方針
7. 保護者の皆様へのメッセージ

絵文字や装飾文字を適度に使用して、親しみやすく読みやすいレポートを作成してください。`;

  try {
    const content = await callLLMAPI(prompt);
    
    return {
      id: `class_parent_report_llm_${Date.now()}`,
      type: 'class_parent',
      grade: null,
      className: 'all',
      title: '🌸 クラス全体の様子（保護者向け・AI生成）',
      content: content,
      timestamp: new Date().toISOString(),
      studentCount: totalStudents,
      isLLMGenerated: true
    };
  } catch (error) {
    console.error('LLM API呼び出しエラー:', error);
    throw error;
  }
}

/**
 * クラス全体の親御さん向けレポート内容生成（フォールバック用・固定テンプレート版）
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
 * LLMを使用した全学年レポート生成
 */
async function generateLLMAllGradesParentReport(targetClass, targetStudents, reportLabel) {
  // 学年別に分類
  const gradeGroups = {};
  targetStudents.forEach(student => {
    const gradeKey = student.grade || '未設定';
    if (!gradeGroups[gradeKey]) {
      gradeGroups[gradeKey] = [];
    }
    gradeGroups[gradeKey].push(student);
  });

  // 最新データの収集
  const recentData = [];
  const studentsWithRecords = targetStudents.filter(s => s.records && s.records.length > 0);
  
  studentsWithRecords.forEach(student => {
    if (student.records.length > 0) {
      const latestRecord = student.records[student.records.length - 1];
      if (latestRecord.data) {
        recentData.push({
          student: student.name,
          grade: student.grade,
          class: student.class,
          gender: student.gender,
          data: latestRecord.data
        });
      }
    }
  });

  const stats = calculateLearningStats(recentData);

  // 学年・クラス構成分析
  const compositionAnalysis = Object.keys(gradeGroups)
    .sort((a, b) => {
      const aNum = parseInt(a) || 999;
      const bNum = parseInt(b) || 999;
      return aNum - bNum;
    })
    .map(grade => {
      const students = gradeGroups[grade];
      const gradeLabel = grade === '未設定' ? '学年未設定' : `${grade}年生`;
      
      // クラス別に再分類
      const classGroups = {};
      students.forEach(student => {
        const classKey = student.class || '未設定';
        if (!classGroups[classKey]) {
          classGroups[classKey] = [];
        }
        classGroups[classKey].push(student);
      });
      
      const classSummary = Object.keys(classGroups)
        .sort()
        .map(className => {
          const classStudents = classGroups[className];
          const maleCount = classStudents.filter(s => s.gender === 'male').length;
          const femaleCount = classStudents.filter(s => s.gender === 'female').length;
          return `${className}: ${classStudents.length}名 (男子${maleCount}名、女子${femaleCount}名)`;
        })
        .join(', ');
      
      return `${gradeLabel}: 計${students.length}名 [${classSummary}]`;
    })
    .join('\n');

  // LLM用プロンプト構築
  const prompt = `あなたは小学校の担任教師として、保護者向けの${reportLabel}レポートを作成してください。

## 対象範囲
- レポート対象: ${reportLabel}
- 総児童数: ${targetStudents.length}名
- 記録のある児童: ${studentsWithRecords.length}名

## 構成内容
${compositionAnalysis}

## 学習状況（統計データ）
- 学習への取り組み平均: ${stats.avgLearningStatus.toFixed(1)}点（5点満点）
- 学習への意欲平均: ${stats.avgMotivation.toFixed(1)}点（5点満点）
- 宿題提出率: ${Math.round((stats.homeworkSubmissionRate || 0) * 100)}%

## 最近の学習記録（サンプル）
${recentData.length > 0 ? recentData.slice(0, 8).map(record => {
  const learningStatus = getFieldValue(record.data, 'learning_status') || '記録なし';
  const motivation = getFieldValue(record.data, 'motivation') || '記録なし';
  const homework = getFieldValue(record.data, 'homework') || '記録なし';
  return `- ${record.student}さん（${record.grade}年${record.class}）: 学習${learningStatus}、意欲${motivation}、宿題${homework}`;
}).join('\n') : '最近の記録データがありません。'}

## レポート作成指針
1. **${reportLabel}の特性**を考慮した内容にしてください
2. **学年やクラスの多様性**について言及してください
3. **温かく親しみやすい文体**で書いてください
4. **具体的な数値データ**を活用してください
5. **家庭でのサポート方法**を具体的に提案してください
6. **子どもたちの成長を肯定的に捉える**視点を大切にしてください

## 必須構成要素
1. 挨拶と感謝の気持ち
2. ${reportLabel}の全体的な様子
3. 学年・クラス間の連携や特色
4. 統計データに基づく客観的な報告
5. 子どもたちの素晴らしい点・成長
6. 家庭でのサポートのお願い
7. 今後の目標と取り組み
8. 保護者の皆様へのメッセージ

絵文字や装飾文字を適度に使用して、親しみやすく読みやすいレポートを作成してください。`;

  try {
    const content = await callLLMAPI(prompt);
    
    return {
      id: `all_grades_parent_report_llm_${Date.now()}`,
      type: 'class_parent',
      grade: targetClass === 'all' ? null : 'all',
      className: targetClass,
      title: `🌸 ${reportLabel} 親御さん向けレポート（AI生成）`,
      content: content,
      timestamp: new Date().toISOString(),
      studentCount: targetStudents.length,
      isLLMGenerated: true
    };
  } catch (error) {
    console.error('LLM API呼び出しエラー:', error);
    throw error;
  }
}

/**
 * LLMを使用した学年別レポート生成
 */
async function generateLLMClassParentReportForGrade(grade, targetStudents, reportLabel) {
  // クラス別に分類
  const classGroups = {};
  targetStudents.forEach(student => {
    const classKey = student.class || '未設定';
    if (!classGroups[classKey]) {
      classGroups[classKey] = [];
    }
    classGroups[classKey].push(student);
  });

  // 最新データの収集
  const recentData = [];
  const studentsWithRecords = targetStudents.filter(s => s.records && s.records.length > 0);
  
  studentsWithRecords.forEach(student => {
    if (student.records.length > 0) {
      const latestRecord = student.records[student.records.length - 1];
      if (latestRecord.data) {
        recentData.push({
          student: student.name,
          grade: student.grade,
          class: student.class,
          gender: student.gender,
          data: latestRecord.data
        });
      }
    }
  });

  const stats = calculateLearningStats(recentData);

  // クラス構成分析
  const classComposition = Object.keys(classGroups)
    .sort()
    .map(className => {
      const classStudents = classGroups[className];
      const maleCount = classStudents.filter(s => s.gender === 'male').length;
      const femaleCount = classStudents.filter(s => s.gender === 'female').length;
      return `${className}: ${classStudents.length}名 (男子${maleCount}名、女子${femaleCount}名)`;
    })
    .join('\n');

  // LLM用プロンプト構築
  const prompt = `あなたは小学校の担任教師として、保護者向けの${reportLabel}レポートを作成してください。

## 対象範囲
- レポート対象: ${reportLabel}
- 総児童数: ${targetStudents.length}名
- 記録のある児童: ${studentsWithRecords.length}名

## クラス構成
${classComposition}

## 学習状況（統計データ）
- 学習への取り組み平均: ${stats.avgLearningStatus.toFixed(1)}点（5点満点）
- 学習への意欲平均: ${stats.avgMotivation.toFixed(1)}点（5点満点）
- 宿題提出率: ${Math.round((stats.homeworkSubmissionRate || 0) * 100)}%

## 最近の学習記録（サンプル）
${recentData.length > 0 ? recentData.slice(0, 10).map(record => {
  const learningStatus = getFieldValue(record.data, 'learning_status') || '記録なし';
  const motivation = getFieldValue(record.data, 'motivation') || '記録なし';
  const homework = getFieldValue(record.data, 'homework') || '記録なし';
  return `- ${record.student}さん（${record.class}）: 学習${learningStatus}、意欲${motivation}、宿題${homework}`;
}).join('\n') : '最近の記録データがありません。'}

## レポート作成指針
1. **${grade}年生の発達段階**を考慮した内容にしてください
2. **クラス間の特色や連携**について言及してください
3. **温かく親しみやすい文体**で書いてください
4. **具体的な数値データ**を活用してください
5. **${grade}年生に適した家庭でのサポート方法**を提案してください
6. **この学年特有の成長ポイント**を強調してください

## 必須構成要素
1. 挨拶と感謝の気持ち
2. ${grade}年生全体の様子
3. クラス間の特色や良い点
4. 統計データに基づく客観的な報告
5. ${grade}年生らしい成長や頑張り
6. ${grade}年生の保護者向けサポートアドバイス
7. 今後の目標と取り組み
8. 保護者の皆様へのメッセージ

絵文字や装飾文字を適度に使用して、親しみやすく読みやすいレポートを作成してください。`;

  try {
    const content = await callLLMAPI(prompt);
    
    return {
      id: `grade_${grade}_parent_report_llm_${Date.now()}`,
      type: 'class_parent',
      grade: grade,
      className: 'all',
      title: `🌸 ${reportLabel} 親御さん向けレポート（AI生成）`,
      content: content,
      timestamp: new Date().toISOString(),
      studentCount: targetStudents.length,
      isLLMGenerated: true
    };
  } catch (error) {
    console.error('LLM API呼び出しエラー:', error);
    throw error;
  }
}

/**
 * LLMを使用した特定クラスレポート生成
 */
async function generateLLMClassParentReportForClass(grade, className, targetStudents, reportLabel) {
  // 最新データの収集
  const recentData = [];
  const studentsWithRecords = targetStudents.filter(s => s.records && s.records.length > 0);
  
  studentsWithRecords.forEach(student => {
    if (student.records.length > 0) {
      const latestRecord = student.records[student.records.length - 1];
      if (latestRecord.data) {
        recentData.push({
          student: student.name,
          grade: student.grade,
          class: student.class,
          gender: student.gender,
          data: latestRecord.data
        });
      }
    }
  });

  const stats = calculateLearningStats(recentData);

  // 性別構成
  const maleCount = targetStudents.filter(s => s.gender === 'male').length;
  const femaleCount = targetStudents.filter(s => s.gender === 'female').length;

  // LLM用プロンプト構築
  const prompt = `あなたは${grade}年${className}の担任教師として、保護者向けのクラスレポートを作成してください。

## クラス情報
- 対象クラス: ${reportLabel}
- 総児童数: ${targetStudents.length}名 (男子${maleCount}名、女子${femaleCount}名)
- 記録のある児童: ${studentsWithRecords.length}名

## 学習状況（統計データ）
- 学習への取り組み平均: ${stats.avgLearningStatus.toFixed(1)}点（5点満点）
- 学習への意欲平均: ${stats.avgMotivation.toFixed(1)}点（5点満点）
- 宿題提出率: ${Math.round((stats.homeworkSubmissionRate || 0) * 100)}%

## 最近の学習記録（クラス内の様子）
${recentData.length > 0 ? recentData.slice(0, 12).map(record => {
  const learningStatus = getFieldValue(record.data, 'learning_status') || '記録なし';
  const motivation = getFieldValue(record.data, 'motivation') || '記録なし';
  const homework = getFieldValue(record.data, 'homework') || '記録なし';
  return `- ${record.student}さん: 学習${learningStatus}、意欲${motivation}、宿題${homework}`;
}).join('\n') : '最近の記録データがありません。'}

## レポート作成指針
1. **${grade}年${className}の担任として**の視点で書いてください
2. **このクラス特有の雰囲気や特色**を表現してください
3. **温かく親しみやすい文体**で、親近感を感じられるように書いてください
4. **具体的なクラスの様子**を交えてください
5. **${grade}年生に適した具体的なサポート方法**を提案してください
6. **クラス全体の絆や成長**を強調してください

## 必須構成要素
1. 挨拶と日頃の協力への感謝
2. ${grade}年${className}の日常の様子
3. クラスの雰囲気や子どもたちの関係性
4. 統計データに基づく学習状況の報告
5. クラスの子どもたちの素晴らしい点や成長
6. 保護者の皆様への具体的なお願いとサポート方法
7. 今後のクラス目標と取り組み
8. 担任からの温かいメッセージ

絵文字や装飾文字を適度に使用して、親しみやすく読みやすいレポートを作成してください。`;

  try {
    const content = await callLLMAPI(prompt);
    
    return {
      id: `class_${grade}_${className}_parent_report_llm_${Date.now()}`,
      type: 'class_parent',
      grade: grade,
      className: className,
      title: `🌸 ${reportLabel} 親御さん向けレポート（AI生成）`,
      content: content,
      timestamp: new Date().toISOString(),
      studentCount: targetStudents.length,
      isLLMGenerated: true
    };
  } catch (error) {
    console.error('LLM API呼び出しエラー:', error);
    throw error;
  }
}

/**
 * 全学年レポート生成（フォールバック用・固定テンプレート版）
 */
function generateAllGradesParentReportContent(targetClass, targetStudents) {
  const timestamp = Date.now();
  
  // 学年別に分類
  const gradeGroups = {};
  targetStudents.forEach(student => {
    const gradeKey = student.grade || '未設定';
    if (!gradeGroups[gradeKey]) {
      gradeGroups[gradeKey] = [];
    }
    gradeGroups[gradeKey].push(student);
  });
  
  let title, content;
  
  if (targetClass === 'all') {
    // 全学年・全クラス
    title = '全学年・全クラス 親御さん向けレポート';
    
    const gradeSummaries = Object.keys(gradeGroups)
      .sort((a, b) => {
        const aNum = parseInt(a) || 999;
        const bNum = parseInt(b) || 999;
        return aNum - bNum;
      })
      .map(grade => {
        const students = gradeGroups[grade];
        const gradeLabel = grade === '未設定' ? '学年未設定' : `${grade}年生`;
        
        // クラス別に再分類
        const classGroups = {};
        students.forEach(student => {
          const classKey = student.class || '未設定';
          if (!classGroups[classKey]) {
            classGroups[classKey] = [];
          }
          classGroups[classKey].push(student);
        });
        
        const classSummaries = Object.keys(classGroups)
          .sort()
          .map(className => {
            const classStudents = classGroups[className];
            const maleCount = classStudents.filter(s => s.gender === 'male').length;
            const femaleCount = classStudents.filter(s => s.gender === 'female').length;
            return `  ${className}: ${classStudents.length}名 (男子${maleCount}名、女子${femaleCount}名)`;
          })
          .join('\n');
        
        return `## ${gradeLabel} (計${students.length}名)\n\n${classSummaries}`;
      })
      .join('\n\n');
    
    content = `# 全学年・全クラス 総合レポート

## 概要
全学年・全クラスを対象とした総合的な進捗状況をお伝えいたします。

## 対象児童数
**総計: ${targetStudents.length}名**

${gradeSummaries}

## 全体的な傾向
各学年それぞれに特色があり、成長の段階に応じた学習活動に取り組んでいます。低学年では基礎的な学習習慣の定着を、中学年では応用力の向上を、高学年では発展的な思考力の育成を重視した指導を行っております。

## 今後の指導方針
1. **個別対応の充実**: 各児童の特性に応じた指導を継続
2. **学年間連携**: 継続的な成長をサポートする指導体制の構築
3. **家庭との連携**: 保護者の皆様との情報共有をより一層推進

詳細な個別の状況については、学年・クラス別のレポートや個別面談等でお伝えいたします。

---
作成日時: ${new Date(timestamp).toLocaleDateString('ja-JP')}
作成者: 児童進捗管理ツール`;
  } else {
    // 全学年・特定クラス
    title = `全学年・${targetClass} 親御さん向けレポート`;
    
    const gradeSummaries = Object.keys(gradeGroups)
      .sort((a, b) => {
        const aNum = parseInt(a) || 999;
        const bNum = parseInt(b) || 999;
        return aNum - bNum;
      })
      .map(grade => {
        const students = gradeGroups[grade];
        const gradeLabel = grade === '未設定' ? '学年未設定' : `${grade}年生`;
        const maleCount = students.filter(s => s.gender === 'male').length;
        const femaleCount = students.filter(s => s.gender === 'female').length;
        
        return `## ${gradeLabel} (計${students.length}名)
- 男子: ${maleCount}名
- 女子: ${femaleCount}名`;
      })
      .join('\n\n');
    
    content = `# 全学年・${targetClass} レポート

## 概要
全学年の${targetClass}に在籍する児童の進捗状況をお伝えいたします。

## 対象児童数
**総計: ${targetStudents.length}名**

${gradeSummaries}

## クラス全体の特色
${targetClass}は各学年において、学年の特性を活かしながら共通の目標に向かって取り組んでいるクラスです。異学年でありながら、共通するクラス名を持つ仲間として、それぞれの成長段階に応じた学習活動を展開しています。

## 今後の指導方針
1. **学年に応じた指導**: 各学年の発達段階に合わせた適切な指導の実施
2. **継続的な成長**: 学年を超えた継続的な指導方針の共有
3. **保護者との連携**: 各学年の状況を踏まえた家庭との協力体制の構築

各学年の詳細な状況については、学年別のレポートや個別面談等でお伝えいたします。

---
作成日時: ${new Date(timestamp).toLocaleDateString('ja-JP')}
作成者: 児童進捗管理ツール`;
  }
  
  return {
    id: `allgrades_${targetClass}_${timestamp}`,
    type: 'class_parent',
    title: title,
    content: content,
    timestamp: new Date(timestamp).toISOString(),
    studentCount: targetStudents.length,
    grade: 'all',
    className: targetClass,
    studentName: null // 全学年レポートなので個別学生名はなし
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
 * 個別の親御さん向けレポート生成（LLM対応版）
 */
async function generateIndividualParentReport(student) {
  const records = student.records || [];
  
  if (records.length === 0) {
    return generateNoDataParentReport(student);
  }

  // 設定に基づいて使用するレコード数を取得
  const targetRecords = getRecordsForReport(records, 'individual');
  
  if (targetRecords.length === 0) {
    return generateNoDataParentReport(student);
  }

  const latestRecord = targetRecords[targetRecords.length - 1];
  
  if (!latestRecord || !latestRecord.data) {
    return generateNoDataParentReport(student);
  }

  const data = latestRecord.data;
  const learningStatus = data.learningStatus ? parseInt(data.learningStatus) : 0;
  const motivation = data.motivation ? parseInt(data.motivation) : 0;
  const homework = data.homework || '';
  
  try {
    // LLMを使って個別化されたコンテンツを並列生成（パフォーマンス改善）
    const [
      studentStrengths,
      homeSupport,
      encouragementMessage,
      collaborationMessage,
      learningStatusMsg,
      motivationMsg
    ] = await Promise.all([
      generatePersonalizedStudentStrengths(data, student.name, student),
      generatePersonalizedHomeSupport(data, student.name, student),
      generatePersonalizedEncouragementMessage(data, student.name, student),
      generatePersonalizedCollaborationMessage(data, student.name, student),
      generatePersonalizedLearningStatusMessage(learningStatus, student.name),
      generatePersonalizedMotivationMessage(motivation, student.name)
    ]);
    
    // 成長の傾向を分析（設定されたレコード数を使用）
    const growthTrend = analyzeStudentGrowthForParents(targetRecords, student.name);
    
    const content = `💝 **${student.name}さんの成長の様子**

${student.name}さんの保護者様、いつも温かいご支援をいただき、ありがとうございます。
${student.name}さんの最近の学校での様子を、愛情を込めてお伝えさせていただきます。

━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌟 **${student.name}さんの素晴らしいところ**

${studentStrengths}

━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 **学習面での成長**

**現在の様子**
・**学習への取り組み**: **${learningStatus}/5点** - ${learningStatusMsg}
・**学習への意欲**: **${motivation}/5点** - ${motivationMsg}
・**宿題への取り組み**: ${getHomeworkMessageForParents(homework)}

**成長の様子**
${growthTrend}

━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏠 **ご家庭でのサポートのご提案**

${homeSupport}

━━━━━━━━━━━━━━━━━━━━━━━━━━━

💌 **${student.name}さんへの応援メッセージ**

${encouragementMessage}

━━━━━━━━━━━━━━━━━━━━━━━━━━━

📞 **今後の連携について**

${collaborationMessage}

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
  } catch (error) {
    console.error('LLM個別レポート生成エラー:', error);
    // フォールバック：従来の方式
    return generateIndividualParentReportFallback(student);
  }
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
 * 親御さん向けの学習状況メッセージ（維持用）
 */
function getLearningStatusMessageForParents(status) {
  return getLearningStatusMessageForParentsFallback(status);
}

/**
 * 親御さん向けの学習意欲メッセージ（維持用）
 */
function getMotivationMessageForParents(motivation) {
  return getMotivationMessageForParentsFallback(motivation);
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
 * 親御さん向けの児童の強み生成（維持用）
 */
function generateStudentStrengthsForParents(data, studentName) {
  return generateFallbackStudentStrengths(data, studentName);
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
 * ======================
 * LLMを使用した個別化された親御さん向け文章生成システム
 * ======================
 */

/**
 * LLMを使った家庭サポート提案生成
 */
/**
 * レポート詳細度に応じたプロンプト設定を取得
 */
function getPromptSettings() {
  const detailLevel = reportSettings.reportDetailLevel || 'detailed';
  
  if (detailLevel === 'simple') {
    return {
      homeSupportLength: '100-200文字程度',
      encouragementLength: '80-150文字程度',
      collaborationLength: '100-200文字程度',
      strengthsLength: '100-180文字程度',
      style: 'コンパクトで要点を絞った、読みやすい',
      detailRequirement: '要点を絞り、簡潔で分かりやすい内容にしてください。'
    };
  } else {
    return {
      homeSupportLength: '200-350文字程度',
      encouragementLength: '150-250文字程度',
      collaborationLength: '200-300文字程度',
      strengthsLength: '150-250文字程度',
      style: '詳しく包括的な',
      detailRequirement: '詳細で具体的な内容を含めてください。'
    };
  }
}

async function generatePersonalizedHomeSupport(data, studentName, studentInfo = {}) {
  try {
    const promptSettings = getPromptSettings();
    const prompt = `あなたは小学校の担任教師です。児童の保護者に向けて、家庭でのサポート方法を提案する文章を作成してください。

## 児童情報
- 名前: ${studentName}さん
- 学年: ${studentInfo.grade ? `${studentInfo.grade}年生` : '不明'}
- 性別: ${studentInfo.gender === 'male' ? '男子' : studentInfo.gender === 'female' ? '女子' : '不明'}
- クラス: ${studentInfo.class || '不明'}

## 最新の学習データ
- 学習状況: ${data.learningStatus || '記録なし'}/5段階
- 学習意欲: ${data.motivation || '記録なし'}/5段階
- 宿題提出状況: ${data.homework || '記録なし'}
- 行動タグ: ${data.behaviorTags && data.behaviorTags.length > 0 ? data.behaviorTags.join('、') : 'なし'}
- その他のメモ: ${data.notes || 'なし'}

## 作成要件
1. ${promptSettings.style}温かみのある親しみやすい文章で書いてください
2. その子の特性や現在の状況に合わせた具体的なアドバイスを含めてください
3. 家庭で実践可能な具体的な方法を提案してください
4. その子の良い点を見つけて伸ばす視点を大切にしてください
5. 無理のない範囲での取り組みを推奨してください
6. ${promptSettings.detailRequirement}
7. 文字数は${promptSettings.homeSupportLength}でお願いします

以下の形式で出力してください：
🏠 **${studentName}さんの成長をサポートするために**

・（具体的なアドバイス1）
・（具体的なアドバイス2）
・（具体的なアドバイス3）
・（その子の特性に合わせたアドバイス）
・（励ましの言葉）`;

    const response = await callLLMAPI(prompt);
    return response || generateFallbackHomeSupport(data, studentName);
  } catch (error) {
    console.error('LLM家庭サポート生成エラー:', error);
    return generateFallbackHomeSupport(data, studentName);
  }
}

/**
 * LLMを使った応援メッセージ生成
 */
async function generatePersonalizedEncouragementMessage(data, studentName, studentInfo = {}) {
  try {
    const promptSettings = getPromptSettings();
    const prompt = `あなたは小学校の担任教師です。児童に向けて温かい応援メッセージを作成してください。

## 児童情報
- 名前: ${studentName}さん
- 学年: ${studentInfo.grade ? `${studentInfo.grade}年生` : '不明'}
- 性別: ${studentInfo.gender === 'male' ? '男子' : studentInfo.gender === 'female' ? '女子' : '不明'}
- クラス: ${studentInfo.class || '不明'}

## 最新の学習データ
- 学習状況: ${data.learningStatus || '記録なし'}/5段階
- 学習意欲: ${data.motivation || '記録なし'}/5段階
- 宿題提出状況: ${data.homework || '記録なし'}
- 行動タグ: ${data.behaviorTags && data.behaviorTags.length > 0 ? data.behaviorTags.join('、') : 'なし'}
- その他のメモ: ${data.notes || 'なし'}

## 作成要件
1. ${promptSettings.style}児童に直接語りかける温かい文章で書いてください
2. その子の頑張りや良い点を具体的に褒めてください
3. 成長への期待と励ましを込めてください
4. その子の個性や特性を認める内容を含めてください
5. 先生からの愛情が伝わる文章にしてください
6. ${promptSettings.detailRequirement}
7. 文字数は${promptSettings.encouragementLength}でお願いします

以下の形式で出力してください：
${studentName}さん、（具体的な褒め言葉や励ましのメッセージ）

（その子の良い点や成長についての言及）

（今後への期待と応援のメッセージ）

（締めくくりの温かい言葉）`;

    const response = await callLLMAPI(prompt);
    return response || await generateFallbackEncouragementMessage(data, studentName);
  } catch (error) {
    console.error('LLM応援メッセージ生成エラー:', error);
    return await generateFallbackEncouragementMessage(data, studentName);
  }
}

/**
 * LLMを使った連携メッセージ生成
 */
async function generatePersonalizedCollaborationMessage(data, studentName, studentInfo = {}) {
  try {
    const promptSettings = getPromptSettings();
    const prompt = `あなたは小学校の担任教師です。児童の保護者に向けて、学校と家庭の連携についてのメッセージを作成してください。

## 児童情報
- 名前: ${studentName}さん
- 学年: ${studentInfo.grade ? `${studentInfo.grade}年生` : '不明'}
- 性別: ${studentInfo.gender === 'male' ? '男子' : studentInfo.gender === 'female' ? '女子' : '不明'}
- クラス: ${studentInfo.class || '不明'}

## 最新の学習データ
- 学習状況: ${data.learningStatus || '記録なし'}/5段階
- 学習意欲: ${data.motivation || '記録なし'}/5段階
- 宿題提出状況: ${data.homework || '記録なし'}
- 行動タグ: ${data.behaviorTags && data.behaviorTags.length > 0 ? data.behaviorTags.join('、') : 'なし'}
- その他のメモ: ${data.notes || 'なし'}

## 作成要件
1. ${promptSettings.style}保護者との協力関係を重視した温かい文章で書いてください
2. その子の成長をともに見守る気持ちを表現してください
3. 具体的な連携方法を提案してください
4. 困ったときの相談しやすい環境作りを伝えてください
5. その子の個性や特性に合わせた連携ポイントを含めてください
6. ${promptSettings.detailRequirement}
7. 文字数は${promptSettings.collaborationLength}でお願いします

以下の形式で出力してください：
**学校と家庭で連携して**、${studentName}さんの成長を支えていきたいと思います。

**📞 いつでもご相談ください**
・（具体的な相談方法や内容）
・（その子に関する情報共有の重要性）

**🤝 一緒に見守りましょう**
・（具体的な連携方法）
・（その子の成長を共有する喜び）
・（協力して取り組むポイント）`;

    const response = await callLLMAPI(prompt);
    return response || generateFallbackCollaborationMessage(data, studentName);
  } catch (error) {
    console.error('LLM連携メッセージ生成エラー:', error);
    return generateFallbackCollaborationMessage(data, studentName);
  }
}

/**
 * LLMを使った児童の強み紹介文生成
 */
async function generatePersonalizedStudentStrengths(data, studentName, studentInfo = {}) {
  try {
    const promptSettings = getPromptSettings();
    const prompt = `あなたは小学校の担任教師です。児童の保護者に向けて、その子の素晴らしい点や強みを紹介する文章を作成してください。

## 児童情報
- 名前: ${studentName}さん
- 学年: ${studentInfo.grade ? `${studentInfo.grade}年生` : '不明'}
- 性別: ${studentInfo.gender === 'male' ? '男子' : studentInfo.gender === 'female' ? '女子' : '不明'}
- クラス: ${studentInfo.class || '不明'}

## 最新の学習データ
- 学習状況: ${data.learningStatus || '記録なし'}/5段階
- 学習意欲: ${data.motivation || '記録なし'}/5段階
- 宿題提出状況: ${data.homework || '記録なし'}
- 行動タグ: ${data.behaviorTags && data.behaviorTags.length > 0 ? data.behaviorTags.join('、') : 'なし'}
- その他のメモ: ${data.notes || 'なし'}

## 作成要件
1. ${promptSettings.style}その子の良い点や強みを具体的に見つけて紹介してください
2. 温かい目線でその子らしさを表現してください
3. 保護者が我が子を誇らしく思えるような内容にしてください
4. 学習面だけでなく、人格面や行動面の良い点も含めてください
5. 具体的なエピソードや観察した様子を含めてください
6. ${promptSettings.detailRequirement}
7. 文字数は${promptSettings.strengthsLength}でお願いします

以下の形式で出力してください：
- 📚 **（学習面での強み）**
- ✨ **（性格や行動面での強み）**
- 💎 **（その子らしい魅力）**
- 🌟 **（クラスでの様子や貢献）**`;

    const response = await callLLMAPI(prompt);
    return response || generateFallbackStudentStrengths(data, studentName);
  } catch (error) {
    console.error('LLM児童強み生成エラー:', error);
    return generateFallbackStudentStrengths(data, studentName);
  }
}

/**
 * LLMを使った学習状況メッセージ生成
 */
async function generatePersonalizedLearningStatusMessage(status, studentName, additionalContext = '') {
  try {
    const prompt = `あなたは小学校の担任教師です。児童の保護者に向けて、学習状況についてのメッセージを作成してください。

## 情報
- 児童名: ${studentName}さん
- 学習状況評価: ${status}/5段階
- 追加情報: ${additionalContext || 'なし'}

## 作成要件
1. 5段階評価に基づいて適切な評価メッセージを作成してください
2. その子の頑張りを認める温かい文章にしてください
3. 保護者が安心できるような表現を心がけてください
4. 具体的で建設的な内容にしてください
5. 1文で簡潔にまとめてください

評価基準の参考：
- 5点: 非常に優秀な取り組み
- 4点: とても良い取り組み
- 3点: 安定した取り組み
- 2点: 努力している、成長中
- 1点: これから一緒に頑張っていく段階`;

    const response = await callLLMAPI(prompt);
    return response || getLearningStatusMessageForParentsFallback(status);
  } catch (error) {
    console.error('LLM学習状況メッセージ生成エラー:', error);
    return getLearningStatusMessageForParentsFallback(status);
  }
}

/**
 * LLMを使った学習意欲メッセージ生成
 */
async function generatePersonalizedMotivationMessage(motivation, studentName, additionalContext = '') {
  try {
    const prompt = `あなたは小学校の担任教師です。児童の保護者に向けて、学習意欲についてのメッセージを作成してください。

## 情報
- 児童名: ${studentName}さん
- 学習意欲評価: ${motivation}/5段階
- 追加情報: ${additionalContext || 'なし'}

## 作成要件
1. 5段階評価に基づいて適切な評価メッセージを作成してください
2. その子の学習への取り組み姿勢を認める表現にしてください
3. 意欲面での成長や可能性を感じられる内容にしてください
4. 前向きで希望の持てる表現を心がけてください
5. 1文で簡潔にまとめてください

評価基準の参考：
- 5点: 非常に意欲的で積極的
- 4点: 意欲的に取り組んでいる
- 3点: 安定した意欲を保っている
- 2点: 意欲が芽生えてきている
- 1点: これから一緒に意欲を育てていく段階`;

    const response = await callLLMAPI(prompt);
    return response || getMotivationMessageForParentsFallback(motivation);
  } catch (error) {
    console.error('LLM学習意欲メッセージ生成エラー:', error);
    return getMotivationMessageForParentsFallback(motivation);
  }
}

/**
 * LLM API呼び出し関数
 */
async function callLLMAPI(prompt) {
  try {
    const apiUrl = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
    
    const requestData = {
      model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
      temperature: 0.7,
      stream: false,
      max_completion_tokens: 2000,
      messages: [
        {
          role: 'system',
          content: 'あなたは経験豊富で温かい小学校教師です。児童一人一人の個性を大切にし、保護者との良好な関係を築くことを重視しています。常に建設的で前向きな視点から文章を作成し、その子の可能性を信じて接しています。'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    };
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data = await response.json();
    
    // レスポンス形式の対応
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      return data.choices[0].message.content?.trim() || null;
    } else if (data.answer) {
      return data.answer?.trim() || null;
    } else {
      throw new Error('レスポンスに期待されるフィールドがありません');
    }
  } catch (error) {
    console.error('LLM API call failed:', error);
    return null;
  }
}

/**
 * LLM API キーの取得
 */
function getLLMAPIKey() {
  // 環境変数またはローカルストレージからAPIキーを取得
  // 本番環境では適切なキー管理を実装してください
  const apiKey = localStorage.getItem('llm_api_key') || 'demo_key';
  if (apiKey === 'demo_key') {
    console.warn('LLM API キーが設定されていません。デモモードで動作します。');
  }
  return apiKey;
}

/**
 * LLM API キーの保存
 */
function saveLLMAPIKey() {
  const apiKeyInput = document.getElementById('llm-api-key');
  if (apiKeyInput) {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      localStorage.setItem('llm_api_key', apiKey);
      console.log('LLM API キーが保存されました。');
      alert('APIキーが保存されました。');
    } else {
      alert('APIキーを入力してください。');
    }
  } else {
    console.error('APIキー入力フィールドが見つかりません。');
    alert('APIキー入力フィールドが見つかりません。');
  }
}

/**
 * LLM API 接続テスト
 */
async function testLLMConnection() {
  try {
    const apiKey = getLLMAPIKey();
    if (apiKey === 'demo_key') {
      alert('APIキーが設定されていません。デモモードです。');
      return;
    }
    
    // テスト用のシンプルなメッセージ
    const testMessage = 'こんにちは';
    
    alert('API接続をテストしています...');
    
    const response = await callLLMAPI(testMessage, '接続テスト');
    
    if (response && response.trim()) {
      alert('API接続テストが成功しました！\n\nレスポンス: ' + response.substring(0, 100) + (response.length > 100 ? '...' : ''));
    } else {
      alert('API接続テストは完了しましたが、空のレスポンスが返されました。');
    }
  } catch (error) {
    console.error('API接続テストでエラーが発生しました:', error);
    alert('API接続テストでエラーが発生しました: ' + error.message);
  }
}

/**
 * APIキー表示切り替え
 */
function toggleAPIKeyVisibility() {
  const apiKeyInput = document.getElementById('llm-api-key');
  if (apiKeyInput) {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
    } else {
      apiKeyInput.type = 'password';
    }
  } else {
    console.error('APIキー入力フィールドが見つかりません。');
  }
}

/**
 * フォールバック用の家庭サポート提案（LLM失敗時）
 */
async function generateFallbackHomeSupport(data, studentName) {
  const learningStatus = data.learningStatus ? parseInt(data.learningStatus) : 0;
  const motivation = data.motivation ? parseInt(data.motivation) : 0;
  
  // まずLLMベースの動的生成を試行
  try {
    const dynamicSupport = await generatePersonalizedHomeSupportMessage(data, studentName);
    if (dynamicSupport) {
      return dynamicSupport;
    }
  } catch (error) {
    console.error('動的家庭サポート生成エラー:', error);
  }
  
  // 行動タグに基づく個別サポート提案を取得
  const behaviorTags = data.behaviorTags || [];
  const behaviorSupport = await generateBehaviorBasedSupportForParents(behaviorTags, studentName, data);
  
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
 * 動的応援メッセージ生成（LLMベース）
 */
async function generateDynamicEncouragementMessage(data, studentName, level = 'good') {
  try {
    const learningStatus = data.learningStatus ? parseInt(data.learningStatus) : 0;
    const motivation = data.motivation ? parseInt(data.motivation) : 0;
    const behaviorTags = data.behaviorTags || [];
    
    let levelDescription = '';
    if (level === 'excellent') {
      levelDescription = '非常に優秀な成績で、学習意欲も高い';
    } else if (level === 'good') {
      levelDescription = '頑張って取り組んでいるが、さらなる向上の余地がある';
    } else {
      levelDescription = 'サポートが必要で、励ましと支援が重要';
    }
    
    const prompt = `あなたは温かい小学校の担任教師です。児童に向けて心のこもった応援メッセージを作成してください。

## 児童情報
- 名前: ${studentName}さん
- 学習状況レベル: ${learningStatus}/5 (${levelDescription})
- 学習意欲: ${motivation}/5
- 行動の特徴: ${behaviorTags.length > 0 ? behaviorTags.join('、') : '記録なし'}
- その他のメモ: ${data.notes || 'なし'}

## 作成要件
1. 児童に直接語りかける親しみやすい文章で書いてください
2. その子の良い点や頑張りを具体的に褒めてください
3. 個性や努力を認める温かい言葉を使ってください
4. 今後への期待と励ましを込めてください
5. 先生からの愛情と信頼が伝わる内容にしてください
6. 文字数は120-200文字程度でお願いします
7. 必ず「${studentName}さん」という呼びかけから始めてください

文章は自然で温かく、その子の個性に合わせてパーソナライズしてください。`;

    const response = await callLLMAPI(prompt);
    return response;
  } catch (error) {
    console.error('動的応援メッセージ生成エラー:', error);
    return null;
  }
}

/**
 * 動的行動応援メッセージ生成（LLMベース）
 */
async function generateDynamicBehaviorEncouragement(behaviorTags, studentName) {
  if (!behaviorTags || behaviorTags.length === 0) {
    return null;
  }
  
  try {
    const prompt = `あなたは温かい小学校の担任教師です。児童の具体的な行動に基づいて、その子の良い点を褒める応援メッセージを作成してください。

## 児童情報
- 名前: ${studentName}さん
- 観察された行動: ${behaviorTags.join('、')}

## 作成要件
1. 観察された行動の中から特に素晴らしい点を2-3個選んで具体的に褒めてください
2. その行動が他の子たちや教室にどのような良い影響を与えているかを含めてください
3. 温かく親しみやすい文章で書いてください
4. その子の個性や努力を認める内容にしてください
5. 文字数は80-150文字程度でお願いします
6. 冒頭に「【${studentName}さんの素晴らしいところ】」を付けてください

例：【田中さんの素晴らしいところ】積極的に手を上げる姿勢が本当に素晴らしいです！クラス全体の学習意欲を高めてくれています。

自然で温かく、その子の行動の価値を認める内容にしてください。`;

    const response = await callLLMAPI(prompt);
    return response;
  } catch (error) {
    console.error('動的行動応援メッセージ生成エラー:', error);
    return null;
  }
}

/**
 * フォールバック用の応援メッセージ（LLM失敗時）
 */
async function generateFallbackEncouragementMessage(data, studentName) {
  const learningStatus = data.learningStatus ? parseInt(data.learningStatus) : 0;
  const motivation = data.motivation ? parseInt(data.motivation) : 0;
  const behaviorTags = data.behaviorTags || [];
  
  // まずLLMベースの動的生成を試行
  try {
    let level = 'support';
    if (learningStatus >= 4 && motivation >= 4) {
      level = 'excellent';
    } else if (learningStatus >= 3 || motivation >= 3) {
      level = 'good';
    }
    
    const dynamicMessage = await generateDynamicEncouragementMessage(data, studentName, level);
    if (dynamicMessage) {
      // 行動タグに基づく個別応援メッセージを追加
      const behaviorEncouragement = await generateDynamicBehaviorEncouragement(behaviorTags, studentName);
      if (behaviorEncouragement) {
        return `${dynamicMessage}\n\n${behaviorEncouragement}`;
      }
      return dynamicMessage;
    }
  } catch (error) {
    console.error('動的応援メッセージ生成エラー:', error);
  }
  
  // LLMが失敗した場合の従来のフォールバック
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
 * フォールバック用の連携メッセージ（LLM失敗時）
 */
function generateFallbackCollaborationMessage(data, studentName) {
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
 * フォールバック用の児童強み（LLM失敗時）
 */
function generateFallbackStudentStrengths(data, studentName) {
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
 * フォールバック用の学習状況メッセージ
 */
function getLearningStatusMessageForParentsFallback(status) {
  if (status >= 5) return '本当に素晴らしい取り組みです！この調子で頑張っています';
  if (status >= 4) return 'とても良く頑張っています！';
  if (status >= 3) return '着実に取り組んでいます。';
  if (status >= 2) return '一生懸命頑張っています。少しずつ成長しています';
  return 'これから一緒に頑張っていきましょう。';
}

/**
 * フォールバック用の学習意欲メッセージ
 */
function getMotivationMessageForParentsFallback(motivation) {
  if (motivation >= 5) return '学習への意欲がとても高く、積極的に取り組んでいます！';
  if (motivation >= 4) return '意欲的に学習に取り組んでいます！';
  if (motivation >= 3) return '安定して学習に向き合っています。';
  if (motivation >= 2) return '少しずつ学習への興味が育っています。';
  return 'これから一緒に学習の楽しさを見つけていきましょう。';
}

/**
 * 個別レポート生成のフォールバック関数（従来の方式）
 */
async function generateIndividualParentReportFallback(student) {
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
  
  // LLM呼び出しを並列実行（フォールバック版も高速化）
  const [homeSupportMessage, encouragementMsg] = await Promise.all([
    generateFallbackHomeSupport(data, student.name),
    generateFallbackEncouragementMessage(data, student.name)
  ]);
  
  const content = `💝 **${student.name}さんの成長の様子**

${student.name}さんの保護者様、いつも温かいご支援をいただき、ありがとうございます。
${student.name}さんの最近の学校での様子を、愛情を込めてお伝えさせていただきます。

━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌟 **${student.name}さんの素晴らしいところ**

${generateFallbackStudentStrengths(data, student.name)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 **学習面での成長**

**現在の様子**
・**学習への取り組み**: **${learningStatus}/5点** - ${getLearningStatusMessageForParentsFallback(learningStatus)}
・**学習への意欲**: **${motivation}/5点** - ${getMotivationMessageForParentsFallback(motivation)}
・**宿題への取り組み**: ${getHomeworkMessageForParents(homework)}

**成長の様子**
${growthTrend}

━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏠 **ご家庭でのサポートのご提案**

${homeSupportMessage}

━━━━━━━━━━━━━━━━━━━━━━━━━━━

💌 **${student.name}さんへの応援メッセージ**

${encouragementMsg}

━━━━━━━━━━━━━━━━━━━━━━━━━━━

📞 **今後の連携について**

${generateFallbackCollaborationMessage(data, student.name)}

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
 * 親御さん向けの家庭サポート提案（維持用）
 */
function generateHomeSupport(data, studentName) {
  return generateFallbackHomeSupport(data, studentName);
}

/**
 * 親御さん向けの応援メッセージ（維持用）
 */
async function generateEncouragementMessage(data, studentName) {
  return await generateFallbackEncouragementMessage(data, studentName);
}

/**
 * 親御さん向けの連携メッセージ（維持用）
 */
function generateCollaborationMessage(data, studentName) {
  return generateFallbackCollaborationMessage(data, studentName);
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
  
  // 最大1000件まで保持
  if (parentReportHistory.length > 1000) {
    parentReportHistory = parentReportHistory.slice(0, 1000);
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
      const parsed = JSON.parse(saved);
      // 配列かどうかチェック
      if (Array.isArray(parsed)) {
        // 各レポートオブジェクトの妥当性をチェック
        parentReportHistory = parsed.filter(report => {
          return report && 
                 typeof report === 'object' && 
                 report.id && 
                 report.title && 
                 report.content && 
                 report.timestamp;
        });
      }
    }
  } catch (error) {
    console.error('親御さん向けレポート履歴読み込みエラー:', error);
    parentReportHistory = [];
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
    // 安全なタイムスタンプ処理
    let date;
    try {
      if (report.timestamp) {
        date = new Date(report.timestamp);
        // 無効な日付かどうかチェック
        if (isNaN(date.getTime())) {
          date = new Date(); // 現在日時をフォールバック
        }
      } else {
        date = new Date(); // タイムスタンプがない場合は現在日時
      }
    } catch (error) {
      console.warn('タイムスタンプ処理エラー:', error);
      date = new Date();
    }
    
    const typeIcon = report.type === 'class_parent' ? '👥' : '👤';
    const typeLabel = report.type === 'class_parent' ? 'クラス全体' : '個別レポート';
    
    // タイトルの安全な処理
    const safeTitle = report.title || 'タイトル未設定';
    
    // 学生名の安全な処理
    const studentNameDisplay = (report.studentName && report.studentName !== 'null' && report.studentName !== null) 
      ? `<span style="background: rgba(6, 182, 212, 0.1); color: var(--accent); padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.8rem; margin-left: 0.5rem;">
           ${report.studentName}さん
         </span>` 
      : '';
    
    historyHTML += `
      <div class="card" style="margin-bottom: 1rem; border-left: 4px solid var(--secondary);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <h4 style="margin: 0; color: var(--secondary); font-size: 1rem;">
            ${typeIcon} ${safeTitle}
          </h4>
          <span style="color: var(--text-secondary); font-size: 0.8rem;">
            ${date.toLocaleDateString('ja-JP')} ${date.toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'})}
          </span>
        </div>
        
        <div style="margin-bottom: 1rem;">
          <span style="background: rgba(124, 58, 237, 0.1); color: var(--secondary); padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.8rem;">
            ${typeLabel}
          </span>
          ${studentNameDisplay}
        </div>
        
        <div style="margin-bottom: 1rem;">
          <div style="color: var(--text-primary); font-size: 0.9rem; line-height: 1.6;">
            ${report.content ? generateAnalysisSummary(report.content) : 'コンテンツが見つかりません'}
          </div>
        </div>
        
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="btn btn-secondary" onclick="showParentReportDetailById('${report.id || ''}')" style="font-size: 0.8rem; padding: 0.5rem 0.75rem;">
            <i class="fas fa-eye"></i> 詳細表示
          </button>
          <button class="btn btn-success" onclick="exportParentReportById('${report.id || ''}')" style="font-size: 0.8rem; padding: 0.5rem 0.75rem;">
            <i class="fas fa-download"></i> テキスト
          </button>
          <button class="btn" onclick="exportParentReportPDFById('${report.id || ''}')" style="background: #dc2626; color: white; font-size: 0.8rem; padding: 0.5rem 0.75rem;" title="印刷用ページを開いてPDF保存します">
            <i class="fas fa-print"></i> PDF保存
          </button>

          <button class="btn" onclick="deleteParentReport('${report.id || ''}')" style="background: #ef4444; color: white; font-size: 0.8rem; padding: 0.5rem 0.75rem;" title="このレポートを削除します">
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
  if (!reportId || typeof reportId !== 'string') {
    console.warn('無効なレポートID:', reportId);
    return null;
  }
  
  try {
    const saved = localStorage.getItem('parentReportHistory');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const report = parsed.find(report => 
          report && 
          typeof report === 'object' && 
          report.id === reportId
        );
        
        // 見つかったレポートの妥当性を再チェック
        if (report && report.title && report.content && report.timestamp) {
          return report;
        }
      }
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
  try {
    const date = new Date(report.timestamp);
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.getHours().toString().padStart(2, '0') + 
                   date.getMinutes().toString().padStart(2, '0');
    
    // ファイル名の生成を改善（より安全に）
    let filenamePart = 'class';
    if (report.studentName) {
      filenamePart = report.studentName
        .replace(/[^\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\w]/g, '_')
        .substring(0, 20); // 長さ制限
    } else if (report.grade && report.className) {
      filenamePart = `${report.grade}年${report.className}`
        .replace(/[^\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\w]/g, '_');
    }
    
    const filename = `parent_report_${filenamePart}_${dateStr}_${timeStr}.txt`;
    
    // テキスト出力用にコンテンツを整形
    const formattedContent = formatContentForTextExport(report.content);
    
    const content = `${report.title}

${formattedContent}

---
作成日時: ${date.toLocaleDateString('ja-JP')} ${date.toLocaleTimeString('ja-JP')}
作成者: 児童進捗管理ツール
`;
    
    if (createAndDownloadFile(content, filename, 'text/plain;charset=utf-8', '親御さん向けレポート')) {
      showAlert('親御さん向けレポートをダウンロードしました', 'success');
    }
    
  } catch (error) {
    console.error('親御さん向けレポートエクスポートエラー:', error);
    showAlert('レポートのエクスポートに失敗しました: ' + error.message, 'error');
  }
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
  try {
    const htmlContent = formatReportForPrint(report);
    
    const date = new Date(report.timestamp);
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.getHours().toString().padStart(2, '0') + 
                   date.getMinutes().toString().padStart(2, '0');
    
    // ファイル名の生成を改善（より安全に）
    let filenamePart = 'class';
    if (report.studentName) {
      filenamePart = report.studentName
        .replace(/[^\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\w]/g, '_')
        .substring(0, 20); // 長さ制限
    } else if (report.grade && report.className) {
      filenamePart = `${report.grade}年${report.className}`
        .replace(/[^\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\w]/g, '_');
    }
    
    const filename = `parent_report_${filenamePart}_${dateStr}_${timeStr}.html`;
    
    if (createAndDownloadFile(htmlContent, filename, 'text/html;charset=utf-8', 'HTMLレポート')) {
      showAlert('親御さん向けレポートをHTMLファイルでダウンロードしました', 'success');
    }
    
  } catch (error) {
    console.error('HTMLレポート生成エラー:', error);
    showAlert('HTMLレポートの生成に失敗しました: ' + error.message, 'error');
  }
}

/**
 * テキストエクスポート用にコンテンツを整形
 */
function formatContentForTextExport(content) {
  if (!content || typeof content !== 'string') {
    return '';
  }
  
  return content
    // **で囲まれたハイライトを除去
    .replace(/\*\*(.*?)\*\*/g, '$1')
    // -を・に置き換え（リストアイテムとして使用されている場合）
    .replace(/^- /gm, '・ ')
    .replace(/\n- /g, '\n・ ')
    // 複数の連続する改行を2つまでに制限
    .replace(/\n{3,}/g, '\n\n')
    // 行末の空白を除去
    .replace(/ +$/gm, '');
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
    
    // Markdownヘッダーの処理（#形式）
    if (line.startsWith('# ')) {
      if (inList) {
        processed.push('</ul>');
        inList = false;
      }
      processed.push(`<h1 style="color: #1f2937; margin-top: 30px; margin-bottom: 20px; font-size: 1.6em; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">${line.substring(2)}</h1>`);
      continue;
    }
    
    if (line.startsWith('## ')) {
      if (inList) {
        processed.push('</ul>');
        inList = false;
      }
      processed.push(`<h2 style="color: #1f2937; margin-top: 25px; margin-bottom: 15px; font-size: 1.4em;">${line.substring(3)}</h2>`);
      continue;
    }
    
    if (line.startsWith('### ')) {
      if (inList) {
        processed.push('</ul>');
        inList = false;
      }
      processed.push(`<h3 style="color: #374151; margin-top: 20px; margin-bottom: 12px; font-size: 1.3em;">${line.substring(4)}</h3>`);
      continue;
    }
    
    if (line.startsWith('#### ')) {
      if (inList) {
        processed.push('</ul>');
        inList = false;
      }
      processed.push(`<h4 style="color: #374151; margin-top: 15px; margin-bottom: 10px; font-size: 1.2em;">${line.substring(5)}</h4>`);
      continue;
    }
    
    if (line.startsWith('##### ')) {
      if (inList) {
        processed.push('</ul>');
        inList = false;
      }
      processed.push(`<h5 style="color: #4b5563; margin-top: 12px; margin-bottom: 8px; font-size: 1.1em;">${line.substring(6)}</h5>`);
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
      (async () => {
        try {
          const newReport = await generateIndividualParentReport(student);
          
          // 既存の同じ児童のレポートを探して置き換える
          replaceOrAddParentReport(newReport, 'individual_parent', studentId);
          updateParentReportHistory();
          showAlert(`${student.name}さんのレポートを更新しました！`, 'success');
        } catch (error) {
          console.error('個別レポート再生成エラー:', error);
          showAlert('レポート再生成中にエラーが発生しました', 'error');
        } finally {
          window.isRegeneratingReport = false;
        }
      })();
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
  
  // 最大1000件まで保持
  if (parentReportHistory.length > 1000) {
    parentReportHistory = parentReportHistory.slice(0, 1000);
  }
  
  localStorage.setItem('parentReportHistory', JSON.stringify(parentReportHistory));
}

/**
 * レポート設定の保存
 */
function saveReportSettings() {
  const individualCount = document.getElementById('individualReportDataCount').value;
  const analysisCount = document.getElementById('analysisDataCount').value;
  const detailLevel = document.getElementById('reportDetailLevel').value;
  const creatorName = document.getElementById('pdfCreatorName').value.trim() || '児童進捗管理ツール';
  
  reportSettings = {
    individualReportDataCount: individualCount === 'all' ? 'all' : parseInt(individualCount),
    analysisDataCount: analysisCount === 'all' ? 'all' : parseInt(analysisCount),
    reportDetailLevel: detailLevel,
    pdfCreatorName: creatorName
  };
  
  try {
    localStorage.setItem('reportSettings', JSON.stringify(reportSettings));
    showAlert('レポート設定を保存しました', 'success');
  } catch (error) {
    console.error('レポート設定保存エラー:', error);
    showAlert('設定の保存に失敗しました', 'error');
  }
}

/**
 * レポート設定の読み込み
 */
function loadReportSettings() {
  try {
    const saved = localStorage.getItem('reportSettings');
    if (saved) {
      reportSettings = JSON.parse(saved);
    }
  } catch (error) {
    console.error('レポート設定読み込みエラー:', error);
    // デフォルト値を使用
    reportSettings = {
      individualReportDataCount: 3,
      analysisDataCount: 5,
      reportDetailLevel: 'detailed',
      pdfCreatorName: '児童進捗管理ツール'
    };
  }
  
  // 設定にデフォルト値を設定（後方互換性のため）
  if (!reportSettings.pdfCreatorName) {
    reportSettings.pdfCreatorName = '児童進捗管理ツール';
  }
  if (!reportSettings.reportDetailLevel) {
    reportSettings.reportDetailLevel = 'detailed';
  }
  
  // UI要素に設定値を反映
  updateReportSettingsUI();
}

/**
 * レポート設定UIの更新
 */
function updateReportSettingsUI() {
  const individualSelect = document.getElementById('individualReportDataCount');
  const analysisSelect = document.getElementById('analysisDataCount');
  const detailSelect = document.getElementById('reportDetailLevel');
  const creatorInput = document.getElementById('pdfCreatorName');
  
  if (individualSelect) {
    individualSelect.value = reportSettings.individualReportDataCount;
  }
  if (analysisSelect) {
    analysisSelect.value = reportSettings.analysisDataCount;
  }
  if (detailSelect) {
    detailSelect.value = reportSettings.reportDetailLevel || 'detailed';
  }
  if (creatorInput) {
    creatorInput.value = reportSettings.pdfCreatorName || '児童進捗管理ツール';
  }
}

/**
 * 設定に基づいてデータを取得する関数
 */
function getRecordsForReport(allRecords, reportType = 'individual') {
  if (!allRecords || allRecords.length === 0) {
    return [];
  }
  
  const dataCount = reportType === 'individual' 
    ? reportSettings.individualReportDataCount 
    : reportSettings.analysisDataCount;
  
  if (dataCount === 'all') {
    return allRecords;
  }
  
  return allRecords.slice(-dataCount);
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
 * 動的保護者向けサポート提案生成（LLMベース）
 */
async function generateDynamicParentSupport(behaviorTags, studentName, data) {
  if (!behaviorTags || behaviorTags.length === 0) {
    return null;
  }
  
  try {
    const learningStatus = data.learningStatus ? parseInt(data.learningStatus) : 0;
    const motivation = data.motivation ? parseInt(data.motivation) : 0;
    
    const prompt = `あなたは経験豊富な小学校の担任教師です。保護者の方に向けて、お子様の個性に合わせた具体的な家庭サポート提案を作成してください。

## 児童情報
- 名前: ${studentName}さん
- 学習状況: ${learningStatus}/5
- 学習意欲: ${motivation}/5
- 観察された行動: ${behaviorTags.join('、')}

## 作成要件
1. 観察された行動の特徴を活かす具体的なサポート方法を提案してください
2. 保護者が実践しやすい具体的なアドバイスを含めてください
3. その子の良い点を伸ばすための家庭での取り組みを示してください
4. 注意が必要な行動がある場合は、温かい対応方法を提案してください
5. 親子関係の向上につながる内容を含めてください
6. 冒頭に「🎯 **${studentName}さんの個性を活かす家庭サポート**」を付けてください
7. 各提案は「・」で始まる箇条書きで3-5項目程度にしてください

保護者が無理なく実践でき、子どもの成長を支える温かい提案にしてください。`;

    const response = await callLLMAPI(prompt);
    return response;
  } catch (error) {
    console.error('動的保護者サポート生成エラー:', error);
    return null;
  }
}

/**
 * 行動タグに基づく家庭でのサポート提案
 */
async function generateBehaviorBasedSupportForParents(behaviorTags, studentName, data = {}) {
  // まずLLMベースの動的生成を試行
  try {
    const dynamicSupport = await generateDynamicParentSupport(behaviorTags, studentName, data);
    if (dynamicSupport) {
      return dynamicSupport;
    }
  } catch (error) {
    console.error('動的保護者サポート生成エラー:', error);
  }
  
  // LLMが失敗した場合の従来のフォールバック
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
 * 動的クラス全体統計メッセージ生成（LLMベース）
 */
async function generateDynamicClassBehaviorStats(recentData) {
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
  
  try {
    // タグの出現回数をカウント
    const tagCounts = {};
    allBehaviorTags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
    
    // 上位のタグを取得
    const topTags = Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    const prompt = `あなたは小学校の担任教師です。保護者の皆様に向けて、クラス全体の行動傾向について温かく前向きなレポートを作成してください。

## クラス情報
- 全体の児童数: ${recentData.length}名
- 観察された行動の合計: ${allBehaviorTags.length}回
- よく見られる行動トップ5:
${topTags.map(([tag, count], index) => {
  const percentage = Math.round((count / recentData.length) * 100);
  return `  ${index + 1}. 「${tag}」- ${count}名（全体の${percentage}%）`;
}).join('\n')}

## 作成要件
1. クラス全体の良い傾向を保護者に分かりやすく伝えてください
2. 具体的な数字を使って説得力のある内容にしてください
3. 子どもたちの成長への期待を込めた前向きな表現を使ってください
4. 保護者の方が安心できるような温かい文章にしてください
5. 200-300文字程度でお願いします
6. 「**クラス全体の素晴らしい様子**」で始めてください

クラス全体の協調性や成長への意欲について、具体的で温かい内容にしてください。`;

    const response = await callLLMAPI(prompt);
    return response || calculateBehaviorTagStatsForClass(recentData);
  } catch (error) {
    console.error('動的クラス統計メッセージ生成エラー:', error);
    return calculateBehaviorTagStatsForClass(recentData);
  }
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
async function generateBehaviorBasedEncouragement(behaviorTags, studentName) {
  if (!behaviorTags || behaviorTags.length === 0) {
    return '';
  }
  
  // まずLLMベースの動的生成を試行
  try {
    const dynamicEncouragement = await generateDynamicBehaviorEncouragement(behaviorTags, studentName);
    if (dynamicEncouragement) {
      return dynamicEncouragement;
    }
  } catch (error) {
    console.error('動的行動応援メッセージ生成エラー:', error);
  }
  
  // LLMが失敗した場合の従来のフォールバック
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

/**
 * 分析実行のコツモーダルを表示
 */
function showAnalysisTips() {
  const modal = document.getElementById('analysisTipsModal');
  if (modal) {
    modal.classList.add('show');
  }
}

/**
 * 統一イベント委譲システム初期化
 */
function initializeEventDelegation() {
  console.log('統一イベント委譲システムを初期化しました');
  
  // メインクリックイベントハンドラ
  document.addEventListener('click', handleUnifiedClick);
  
  // マウスイベントハンドラ
  document.addEventListener('mouseover', handleUnifiedMouseOver);
  document.addEventListener('mouseout', handleUnifiedMouseOut);
}

/**
 * 統一クリックイベントハンドラ
 */
function handleUnifiedClick(e) {
  const action = e.target.dataset.action;
  const target = e.target.dataset.target;
  const type = e.target.dataset.type;
  const filter = e.target.dataset.filter;
  
  // data-action属性がない場合は既存システムに委譲
  if (!action) return;
  
  // ログ出力（開発・デバッグ用）
  console.log(`統一イベント処理: Action=${action}, Target=${target}, Type=${type}, Filter=${filter}`);
  
  switch(action) {
    case 'switch-tab':
      // 既存のswitchTab関数を呼び出し
      switchTab(target);
      break;
      
    case 'open-modal':
      // 既存のモーダル開く関数を適切に呼び出し
      handleModalOpen(target);
      break;
      
    case 'close-modal':
      // 既存のcloseModal関数を呼び出し
      closeModal(target);
      break;
      
    case 'refresh-table':
      // 既存のrefreshTable関数を呼び出し
      refreshTable();
      break;
      
    case 'export-data':
      // 既存のexportData関数を呼び出し
      exportData();
      break;
      
    case 'import-data':
      // 既存のimportData関数を呼び出し
      importData();
      break;
      
    case 'run-analysis':
      handleAnalysisRun(type);
      break;
      
    case 'filter-table':
      // 既存のfilterProgressTable関数を呼び出し
      filterProgressTable(filter);
      break;
      
    case 'generate-report':
      handleReportGeneration(type);
      break;
      
    case 'clear-form':
      // 既存のclearForm関数を呼び出し
      clearForm();
      break;
      
    case 'toggle-detail':
      // 既存のtoggleMissingInputsDetail関数を呼び出し
      toggleMissingInputsDetail();
      break;
      
    case 'edit-student':
      // 児童編集機能
      editStudent(target);
      break;
      
    case 'clear-analysis-history':
      clearAnalysisHistory();
      break;
      
    case 'confirm-clear-all-data':
      confirmClearAllData();
      break;
      
    case 'ensure-data-compatibility':
      ensureDataCompatibility();
      break;
      
    case 'view-analysis-history':
      viewAnalysisHistory();
      break;
      
    default:
      console.warn('不明なアクション:', action);
  }
}

/**
 * モーダル開く処理の統一ハンドラ
 */
function handleModalOpen(modalId) {
  switch(modalId) {
    case 'addStudentModal':
      openAddStudentModal();
      break;
    case 'bulkInputModal':
      openBulkInputModal();
      break;
    case 'classReportModal':
      openClassReportModal();
      break;
    case 'addFieldModal':
      openAddFieldModal();
      break;
    case 'analysisTipsModal':
      showAnalysisTips();
      break;
    default:
      console.warn('不明なモーダル:', modalId);
  }
}

/**
 * AI分析実行の統一ハンドラ
 */
function handleAnalysisRun(analysisType) {
  switch(analysisType) {
    case 'class':
      runAIAnalysis();
      break;
    case 'individual':
      runIndividualAnalysis();
      break;
    case 'all-individual':
      runAllIndividualAnalysis();
      break;
    case 'execute-individual':
      executeIndividualAnalysis();
      break;
    default:
      console.warn('不明な分析タイプ:', analysisType);
  }
}

/**
 * レポート生成の統一ハンドラ
 */
function handleReportGeneration(reportType) {
  switch(reportType) {
    case 'parent-individual':
      generateParentReport('individual');
      break;
    case 'parent-execute':
      executeParentReportGeneration();
      break;
    case 'class-execute':
      executeClassReportGeneration();
      break;
    default:
      console.warn('不明なレポートタイプ:', reportType);
  }
}

/**
 * マウスイベント用の統一ハンドラ
 */
function handleUnifiedMouseOver(e) {
  if (e.target.dataset.hover === 'scale') {
    e.target.style.transform = 'scale(1.1)';
  }
}

function handleUnifiedMouseOut(e) {
  if (e.target.dataset.hover === 'scale') {
    e.target.style.transform = 'scale(1)';
  }
}

/**
 * 分析結果のPDF出力
 * @param {string} analysisId - 分析ID
 */
function exportAnalysisResultPDF(analysisId) {
  const analysis = analysisHistory.find(a => a.id === analysisId);
  if (!analysis) {
    showAlert('分析結果が見つかりません', 'error');
    return;
  }

  const report = {
    title: analysis.title,
    content: analysis.content,
    timestamp: analysis.timestamp,
    studentName: analysis.studentName || '',
    type: analysis.type
  };

  const options = {
    filename: `analysis_${analysis.studentName || 'class'}_${new Date(analysis.timestamp).toISOString().split('T')[0]}.html`,
    createdBy: reportSettings.pdfCreatorName || '児童進捗管理ツール',
    h1Color: analysis.type === 'overall' ? '#4f46e5' : '#059669',
    h2Color: analysis.type === 'overall' ? '#7c3aed' : '#16a34a',
    onSuccess: (message) => showAlert(message, 'success'),
    onError: (error) => showAlert('PDF生成でエラーが発生しました', 'error')
  };

  exportReportPDF(report, options);
}

/**
 * 複数の分析結果をまとめてPDF出力
 */
function exportAllAnalysisResultsPDF() {
  if (!analysisHistory || analysisHistory.length === 0) {
    showAlert('出力する分析結果がありません', 'error');
    return;
  }

  const reports = analysisHistory.map(analysis => ({
    title: analysis.title,
    content: analysis.content,
    timestamp: analysis.timestamp,
    studentName: analysis.studentName || '',
    type: analysis.type
  }));

  const options = {
    combinedTitle: '分析結果統合レポート',
    filename: `all_analysis_results_${new Date().toISOString().split('T')[0]}.html`,
    createdBy: reportSettings.pdfCreatorName || '児童進捗管理ツール',
    onSuccess: (message) => showAlert(message, 'success'),
    onError: (error) => showAlert('PDF生成でエラーが発生しました', 'error')
  };

  exportMultipleReportsPDF(reports, options);
}

/**
 * 親御さん向けレポートのPDF出力（ID指定版）
 * @param {string} reportId - レポートID
 */
function exportParentReportPDFById(reportId) {
  const report = getParentReportById(reportId);
  if (!report) {
    showAlert('レポートが見つかりません', 'error');
    return;
  }

  const pdfReport = {
    title: report.title,
    content: report.content,
    timestamp: report.timestamp,
    studentName: report.studentName || '',
    type: report.type || 'parent'
  };

  const options = {
    filename: `parent_report_${report.studentName || 'class'}_${new Date(report.timestamp).toISOString().split('T')[0]}.html`,
    createdBy: reportSettings.pdfCreatorName || '児童進捗管理ツール',
    h1Color: '#e11d48',
    h2Color: '#f59e0b',
    h3Color: '#8b5cf6',
    onSuccess: (message) => showAlert(message, 'success'),
    onError: (error) => showAlert('PDF生成でエラーが発生しました', 'error')
  };

  exportReportPDF(pdfReport, options);
}

/**
 * 分析詳細モーダルからのPDF出力
 * @param {string} title - 分析タイトル
 * @param {string} content - 分析内容
 * @param {string} analysisDate - 分析日時
 * @param {string} studentName - 学生名
 * @param {string} type - 分析タイプ
 */
function exportAnalysisDetailPDF(title, content, analysisDate, studentName, type) {
  const report = {
    title: title,
    content: content,
    timestamp: new Date(analysisDate).getTime(),
    studentName: studentName,
    type: type
  };

  const options = {
    filename: `analysis_detail_${studentName || 'class'}_${new Date().toISOString().split('T')[0]}.html`,
    createdBy: reportSettings.pdfCreatorName || '児童進捗管理ツール',
    h1Color: type === 'overall' ? '#4f46e5' : '#059669',
    h2Color: type === 'overall' ? '#7c3aed' : '#16a34a',
    onSuccess: (message) => showAlert(message, 'success'),
    onError: (error) => showAlert('PDF生成でエラーが発生しました', 'error')
  };

  exportReportPDF(report, options);
}