/**
 * 児童進捗管理ツール JavaScript
 * Kids Progress Manager - MVP版
 */

// グローバル変数
let studentsData = {
  students: [],
  fieldDefinitions: [
    { id: 'learningStatus', name: '学習状況', type: 'select', options: ['1', '2', '3', '4', '5'], required: false },
    { id: 'motivation', name: '学習意欲', type: 'select', options: ['1', '2', '3', '4', '5'], required: false },
    { id: 'homework', name: '宿題提出', type: 'checkbox', options: [], required: false }
  ]
};

let currentTab = 'overview';
let apiKey = '';

// DOMContentLoaded後の初期化
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

/**
 * アプリケーション初期化
 */
function initializeApp() {
  loadData();
  loadApiKey();
  setupEventListeners();
  updateUI();
  updateStatistics();
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
  localStorage.setItem('kidsProgressData', JSON.stringify(studentsData));
}

/**
 * API Key読み込み
 */
function loadApiKey() {
  apiKey = localStorage.getItem('openai_api_key') || '';
  if (apiKey) {
    document.getElementById('apiKeyInput').value = apiKey;
  }
}

/**
 * タブ切り替え
 */
function switchTab(tabName) {
  currentTab = tabName;

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
  tbody.innerHTML = '';

  studentsData.students.forEach(student => {
    const row = createProgressTableRow(student);
    tbody.appendChild(row);
  });
}

/**
 * 進捗表の行作成
 */
function createProgressTableRow(student) {
  const row = document.createElement('tr');
  
  // 最新のレコードを取得
  const latestRecord = student.records.length > 0 ? student.records[student.records.length - 1] : null;
  
  // 基本情報
  row.innerHTML = `
    <td>${student.name}</td>
    <td>${student.studentNumber}</td>
    <td>${student.grade}年生</td>
    <td>${student.class || '-'}</td>
    <td>${getFieldValue(latestRecord, 'learningStatus')}</td>
    <td>${getFieldValue(latestRecord, 'motivation')}</td>
    <td>${getFieldValue(latestRecord, 'homework')}</td>
    <td>${latestRecord ? formatDate(latestRecord.timestamp) : '-'}</td>
    <td>
      <button class="btn btn-secondary" onclick="viewStudentDetail('${student.id}')">
        <i class="fas fa-eye"></i> 詳細
      </button>
    </td>
  `;
  
  return row;
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
  }
  
  return value;
}

/**
 * 児童管理テーブルの更新
 */
function updateStudentsTable() {
  const tbody = document.getElementById('studentsTableBody');
  tbody.innerHTML = '';

  studentsData.students.forEach(student => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${student.name}</td>
      <td>${student.studentNumber}</td>
      <td>${student.grade}年生</td>
      <td>${student.class || '-'}</td>
      <td>${formatDate(student.createdAt)}</td>
      <td>${student.records.length}</td>
      <td>
        <button class="btn btn-secondary" onclick="editStudent('${student.id}')">
          <i class="fas fa-edit"></i> 編集
        </button>
        <button class="btn btn-error" onclick="confirmDeleteStudent('${student.id}')">
          <i class="fas fa-trash"></i> 削除
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

/**
 * 児童選択セレクトボックスの更新
 */
function updateStudentSelect() {
  const select = document.getElementById('studentSelect');
  select.innerHTML = '<option value="">児童を選択してください</option>';
  
  studentsData.students.forEach(student => {
    const option = document.createElement('option');
    option.value = student.id;
    option.textContent = `${student.name} (${student.studentNumber})`;
    select.appendChild(option);
  });
}

/**
 * 入力フィールドの更新
 */
function updateInputFields() {
  const container = document.getElementById('inputFields');
  container.innerHTML = '';
  
  studentsData.fieldDefinitions.forEach(field => {
    const fieldElement = createInputField(field);
    container.appendChild(fieldElement);
  });
}

/**
 * 入力フィールドの作成
 */
function createInputField(field) {
  const div = document.createElement('div');
  div.className = 'form-group';
  
  const label = document.createElement('label');
  label.className = 'form-label';
  label.textContent = field.name + (field.required ? ' *' : '');
  
  let input;
  
  switch (field.type) {
    case 'select':
      input = document.createElement('select');
      input.className = 'form-select';
      input.innerHTML = '<option value="">選択してください</option>';
      field.options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        input.appendChild(optionElement);
      });
      break;
      
    case 'checkbox':
      input = document.createElement('input');
      input.type = 'checkbox';
      input.id = `field-${field.id}`;
      const checkboxLabel = document.createElement('label');
      checkboxLabel.htmlFor = input.id;
      checkboxLabel.textContent = ' はい';
      div.appendChild(label);
      div.appendChild(input);
      div.appendChild(checkboxLabel);
      input.name = field.id;
      return div;
      
    case 'number':
      input = document.createElement('input');
      input.type = 'number';
      input.className = 'form-input';
      break;
      
    default: // text
      input = document.createElement('input');
      input.type = 'text';
      input.className = 'form-input';
  }
  
  input.name = field.id;
  if (field.required) {
    input.required = true;
  }
  
  div.appendChild(label);
  div.appendChild(input);
  
  return div;
}

/**
 * 項目設定の更新
 */
function updateFieldSettings() {
  const container = document.getElementById('fieldSettings');
  container.innerHTML = '';
  
  studentsData.fieldDefinitions.forEach(field => {
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'flex justify-between items-center mb-2';
    fieldDiv.innerHTML = `
      <div>
        <strong>${field.name}</strong>
        <span class="text-secondary">(${getFieldTypeLabel(field.type)})</span>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-secondary" onclick="editField('${field.id}')">
          <i class="fas fa-edit"></i> 編集
        </button>
        <button class="btn btn-error" onclick="deleteField('${field.id}')">
          <i class="fas fa-trash"></i> 削除
        </button>
      </div>
    `;
    container.appendChild(fieldDiv);
  });
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
 * 統計情報の更新
 */
function updateStatistics() {
  document.getElementById('totalStudents').textContent = studentsData.students.length;
  
  // 今日の入力数を計算
  const today = new Date().toISOString().split('T')[0];
  let todayInputs = 0;
  studentsData.students.forEach(student => {
    student.records.forEach(record => {
      if (record.timestamp.startsWith(today)) {
        todayInputs++;
      }
    });
  });
  document.getElementById('todayInputs').textContent = todayInputs;
  
  // 未入力項目数を計算（簡易版）
  document.getElementById('missingInputs').textContent = '0';
}

/**
 * UI更新
 */
function updateUI() {
  updateProgressTable();
  updateStudentsTable();
  updateStudentSelect();
  updateInputFields();
  updateFieldSettings();
  updateClassFilter();
}

/**
 * クラスフィルターの更新
 */
function updateClassFilter() {
  const classFilter = document.getElementById('classFilter');
  const classes = [...new Set(studentsData.students.map(s => s.class).filter(c => c))];
  
  classFilter.innerHTML = '<option value="">すべて</option>';
  classes.forEach(className => {
    const option = document.createElement('option');
    option.value = className;
    option.textContent = className;
    classFilter.appendChild(option);
  });
}

/**
 * 児童追加処理
 */
function handleAddStudent(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const studentData = {
    id: generateId(),
    name: formData.get('name') || document.getElementById('studentName').value,
    studentNumber: formData.get('studentNumber') || document.getElementById('studentNumber').value,
    grade: parseInt(formData.get('grade') || document.getElementById('studentGrade').value),
    class: formData.get('class') || document.getElementById('studentClass').value,
    createdAt: new Date().toISOString(),
    records: []
  };
  
  // バリデーション
  if (!studentData.name || !studentData.studentNumber || !studentData.grade) {
    showAlert('必須項目を入力してください。', 'error');
    return;
  }
  
  // 在籍番号の重複チェック
  if (studentsData.students.some(s => s.studentNumber === studentData.studentNumber)) {
    showAlert('この在籍番号は既に登録されています。', 'error');
    return;
  }
  
  studentsData.students.push(studentData);
  saveData();
  
  showAlert('児童情報を追加しました。', 'success');
  closeModal('addStudentModal');
  e.target.reset();
  updateUI();
  updateStatistics();
}

/**
 * 進捗データ入力処理
 */
function handleProgressInput(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const studentId = formData.get('studentId') || document.getElementById('studentSelect').value;
  const notes = formData.get('notes') || document.getElementById('notesInput').value;
  
  if (!studentId) {
    showAlert('児童を選択してください。', 'error');
    return;
  }
  
  const student = studentsData.students.find(s => s.id === studentId);
  if (!student) {
    showAlert('選択された児童が見つかりません。', 'error');
    return;
  }
  
  // フィールドデータを収集
  const data = {};
  studentsData.fieldDefinitions.forEach(field => {
    const input = document.querySelector(`[name="${field.id}"]`);
    if (input) {
      if (field.type === 'checkbox') {
        data[field.id] = input.checked;
      } else {
        data[field.id] = input.value;
      }
    }
  });
  
  // レコードを追加
  const record = {
    timestamp: new Date().toISOString(),
    data: data,
    notes: notes,
    aiSummary: ''
  };
  
  student.records.push(record);
  saveData();
  
  showAlert('進捗データを保存しました。', 'success');
  e.target.reset();
  updateUI();
  updateStatistics();
}

/**
 * フィールド追加処理
 */
function handleAddField(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const fieldData = {
    id: generateId(),
    name: formData.get('name') || document.getElementById('fieldName').value,
    type: formData.get('type') || document.getElementById('fieldType').value,
    required: formData.has('required') || document.getElementById('fieldRequired').checked,
    options: []
  };
  
  // バリデーション
  if (!fieldData.name || !fieldData.type) {
    showAlert('必須項目を入力してください。', 'error');
    return;
  }
  
  // オプションの設定
  if (fieldData.type === 'select') {
    fieldData.options = ['1', '2', '3', '4', '5'];
  }
  
  studentsData.fieldDefinitions.push(fieldData);
  saveData();
  
  showAlert('入力項目を追加しました。', 'success');
  closeModal('addFieldModal');
  e.target.reset();
  updateUI();
}

/**
 * モーダル関連
 */
function openAddStudentModal() {
  document.getElementById('addStudentModal').classList.add('show');
}

function openAddFieldModal() {
  document.getElementById('addFieldModal').classList.add('show');
}

function openBulkInputModal() {
  showAlert('一括入力機能は今後実装予定です。', 'warning');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('show');
}

/**
 * 学生フィルタリング
 */
function filterStudents() {
  const searchTerm = document.getElementById('studentSearch').value.toLowerCase();
  const gradeFilter = document.getElementById('gradeFilter').value;
  const classFilter = document.getElementById('classFilter').value;
  
  const rows = document.querySelectorAll('#progressTableBody tr, #studentsTableBody tr');
  
  rows.forEach(row => {
    const name = row.cells[0]?.textContent.toLowerCase() || '';
    const grade = row.cells[2]?.textContent || '';
    const className = row.cells[3]?.textContent || '';
    
    const matchesSearch = name.includes(searchTerm);
    const matchesGrade = !gradeFilter || grade.includes(gradeFilter);
    const matchesClass = !classFilter || className === classFilter;
    
    if (matchesSearch && matchesGrade && matchesClass) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

/**
 * データエクスポート
 */
function exportData() {
  const dataStr = JSON.stringify(studentsData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `kids-progress-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  
  showAlert('データをエクスポートしました。', 'success');
}

/**
 * データインポート
 */
function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          if (importedData.students && importedData.fieldDefinitions) {
            studentsData = importedData;
            saveData();
            updateUI();
            updateStatistics();
            showAlert('データをインポートしました。', 'success');
          } else {
            throw new Error('Invalid data format');
          }
        } catch (error) {
          showAlert('データの読み込みに失敗しました。', 'error');
        }
      };
      reader.readAsText(file);
    }
  };
  input.click();
}

/**
 * 全データ削除確認
 */
function confirmClearAllData() {
  if (confirm('本当に全データを削除しますか？この操作は取り消せません。')) {
    if (confirm('確認：全ての児童データと設定が削除されます。よろしいですか？')) {
      localStorage.removeItem('kidsProgressData');
      initializeDefaultData();
      updateUI();
      updateStatistics();
      showAlert('全データを削除しました。', 'warning');
    }
  }
}

/**
 * API Key保存
 */
function saveApiKey() {
  const key = document.getElementById('apiKeyInput').value;
  if (key) {
    localStorage.setItem('openai_api_key', key);
    apiKey = key;
    showAlert('API Keyを保存しました。', 'success');
  } else {
    showAlert('API Keyを入力してください。', 'error');
  }
}

/**
 * AI分析実行
 */
async function runAIAnalysis() {
  if (!apiKey) {
    showAlert('API Keyが設定されていません。設定タブで設定してください。', 'error');
    return;
  }
  
  if (studentsData.students.length === 0) {
    showAlert('分析対象の児童データがありません。', 'warning');
    return;
  }
  
  showLoading(true);
  
  try {
    // 個別分析
    for (const student of studentsData.students) {
      if (student.records.length > 0) {
        const analysis = await analyzeStudentProgress(student);
        // 最新レコードにAI分析結果を追加
        const latestRecord = student.records[student.records.length - 1];
        latestRecord.aiSummary = analysis;
      }
    }
    
    // 全体分析
    const overallAnalysis = await analyzeOverallProgress();
    
    // 分析結果を表示
    displayAnalysisResults(overallAnalysis);
    
    saveData();
    showAlert('AI分析が完了しました。', 'success');
    
  } catch (error) {
    console.error('AI分析エラー:', error);
    showAlert('AI分析中にエラーが発生しました。', 'error');
  } finally {
    showLoading(false);
  }
}

/**
 * 個別進捗分析
 */
async function analyzeStudentProgress(student) {
  const recentRecords = student.records.slice(-3); // 最新3件
  const prompt = `
以下の児童の進捗データを分析して、簡潔な要約とアドバイスを提供してください。

児童情報:
- 氏名: ${student.name}
- 学年: ${student.grade}年生
- クラス: ${student.class || '未設定'}

最近の記録:
${recentRecords.map(record => `
日時: ${formatDate(record.timestamp)}
学習状況: ${record.data.learningStatus || '未入力'}/5
学習意欲: ${record.data.motivation || '未入力'}/5
宿題提出: ${record.data.homework ? 'あり' : 'なし'}
備考: ${record.notes || 'なし'}
`).join('\n')}

以下の形式で簡潔に回答してください:
【傾向】：最近の変化や特徴
【注意点】：気をつけるべき点
【アドバイス】：具体的な指導提案
`;

  return await callOpenAI(prompt);
}

/**
 * 全体分析
 */
async function analyzeOverallProgress() {
  const summary = {
    totalStudents: studentsData.students.length,
    avgLearningStatus: 0,
    avgMotivation: 0,
    homeworkSubmissionRate: 0
  };
  
  let totalRecords = 0;
  let learningStatusSum = 0;
  let motivationSum = 0;
  let homeworkSubmitted = 0;
  
  studentsData.students.forEach(student => {
    student.records.forEach(record => {
      totalRecords++;
      if (record.data.learningStatus) {
        learningStatusSum += parseInt(record.data.learningStatus);
      }
      if (record.data.motivation) {
        motivationSum += parseInt(record.data.motivation);
      }
      if (record.data.homework) {
        homeworkSubmitted++;
      }
    });
  });
  
  if (totalRecords > 0) {
    summary.avgLearningStatus = (learningStatusSum / totalRecords).toFixed(1);
    summary.avgMotivation = (motivationSum / totalRecords).toFixed(1);
    summary.homeworkSubmissionRate = (homeworkSubmitted / totalRecords * 100).toFixed(1);
  }
  
  const prompt = `
以下のクラス全体の進捗データを分析して、指導方針を提案してください。

クラス全体の状況:
- 総児童数: ${summary.totalStudents}名
- 平均学習状況: ${summary.avgLearningStatus}/5
- 平均学習意欲: ${summary.avgMotivation}/5
- 宿題提出率: ${summary.homeworkSubmissionRate}%

以下の形式で回答してください:
【全体傾向】：クラス全体の特徴
【重点課題】：取り組むべき主要課題
【指導方針】：具体的な指導提案
【個別対応】：特に注意が必要な児童への対応
`;

  return await callOpenAI(prompt);
}

/**
 * OpenAI API呼び出し
 */
async function callOpenAI(prompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'あなたは経験豊富な小学校教師です。児童の進捗データを分析し、教育的な観点から具体的で実用的なアドバイスを提供してください。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    })
  });
  
  if (!response.ok) {
    throw new Error(`API呼び出しエラー: ${response.status}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * 分析結果表示
 */
function displayAnalysisResults(overallAnalysis) {
  const container = document.getElementById('analysisResults');
  container.innerHTML = `
    <div class="card">
      <h3 class="card-title">全体分析結果</h3>
      <div style="white-space: pre-line;">${overallAnalysis}</div>
    </div>
    
    <div class="card">
      <h3 class="card-title">個別分析結果</h3>
      <div id="individualAnalysis"></div>
    </div>
  `;
  
  // 個別分析結果を表示
  const individualContainer = document.getElementById('individualAnalysis');
  studentsData.students.forEach(student => {
    if (student.records.length > 0) {
      const latestRecord = student.records[student.records.length - 1];
      if (latestRecord.aiSummary) {
        const studentDiv = document.createElement('div');
        studentDiv.className = 'card';
        studentDiv.innerHTML = `
          <h4>${student.name} (${student.studentNumber})</h4>
          <div style="white-space: pre-line;">${latestRecord.aiSummary}</div>
        `;
        individualContainer.appendChild(studentDiv);
      }
    }
  });
  
  // AI分析タブに切り替え
  switchTab('analysis');
}

/**
 * ユーティリティ関数
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function showAlert(message, type = 'info') {
  const container = document.getElementById('alertContainer');
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
    ${message}
  `;
  
  container.appendChild(alert);
  
  setTimeout(() => {
    alert.remove();
  }, 5000);
}

function showLoading(show) {
  const loading = document.getElementById('loading');
  if (show) {
    loading.classList.add('show');
  } else {
    loading.classList.remove('show');
  }
}

function refreshTable() {
  updateUI();
  updateStatistics();
  showAlert('テーブルを更新しました。', 'success');
}

function clearForm() {
  document.getElementById('progressInputForm').reset();
  showAlert('フォームをクリアしました。', 'success');
}

// 詳細表示（簡易実装）
function viewStudentDetail(studentId) {
  const student = studentsData.students.find(s => s.id === studentId);
  if (student) {
    alert(`${student.name}の詳細表示機能は今後実装予定です。\n\n現在のレコード数: ${student.records.length}`);
  }
}

// 編集機能（簡易実装）
function editStudent(studentId) {
  showAlert('児童編集機能は今後実装予定です。', 'warning');
}

function editField(fieldId) {
  showAlert('項目編集機能は今後実装予定です。', 'warning');
}

function deleteField(fieldId) {
  if (confirm('この項目を削除しますか？')) {
    studentsData.fieldDefinitions = studentsData.fieldDefinitions.filter(f => f.id !== fieldId);
    saveData();
    updateUI();
    showAlert('項目を削除しました。', 'success');
  }
}

function confirmDeleteStudent(studentId) {
  const student = studentsData.students.find(s => s.id === studentId);
  if (student && confirm(`${student.name}を削除しますか？この操作は取り消せません。`)) {
    if (confirm('確認：このしょう児童の全データが削除されます。よろしいですか？')) {
      studentsData.students = studentsData.students.filter(s => s.id !== studentId);
      saveData();
      updateUI();
      updateStatistics();
      showAlert('児童データを削除しました。', 'warning');
    }
  }
} 