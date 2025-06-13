/**
 * マルチLLMシステム JavaScript
 * io.net APIを活用した複数LLMモデル同時実行ツール
 */

// 利用可能なLLMモデル一覧と特徴
const AVAILABLE_MODELS = {
  'deepseek-ai/DeepSeek-R1-0528': {
    name: 'DeepSeek-R1-0528',
    description: 'DeepSeek R1をバージョン0528にアップグレードし、計算能力とポストトレーニングアルゴリズムの改善により、数学、プログラミング、論理のベンチマークで優れた推論性能を発揮します。',
    maxTokens: 12000
  },
  'private-meta-llama/Llama-3.3-70B-Instruct': {
    name: 'Llama-3.3-70B-Instruct (Private)',
    description: 'Meta社のLlama-3.3-70Bモデルのプライベート版。最適化されたトランスフォーマーアーキテクチャで、高い推論性能を実現します。',
    maxTokens: 12000
  },
  'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8': {
    name: 'Llama-4-Maverick-17B',
    description: '17Bパラメータ、128エキスパートMoE構成、FP8量子化。高い推論性能と大規模コンテキスト対応（最大430Kトークン）を実現。',
    maxTokens: 12000
  },
  'Qwen/Qwen3-235B-A22B-FP8': {
    name: 'Qwen3-235B-A22B',
    description: '最新世代のQwenシリーズ（DenseおよびMoE）モデルで、推論、命令フォロー、エージェント機能、多言語対応に優れた性能を提供します。235BパラメータのMoEモデル（A22Bエキスパート構成）、FP8量子化と32Kコンテキスト対応。',
    maxTokens: 12000
  },
  'meta-llama/Llama-3.2-90B-Vision-Instruct': {
    name: 'Llama-3.2-90B-Vision',
    description: '90Bパラメータでビジョン入力も扱えるマルチモーダルインストラクションモデル。画像とテキストの両方を処理できます。',
    maxTokens: 12000
  },
  'Qwen/Qwen2.5-VL-32B-Instruct': {
    name: 'Qwen2.5-VL-32B',
    description: 'Qwen2.5シリーズのビジョン-言語モデル。画像理解とテキスト生成を組み合わせたマルチモーダル処理に対応。',
    maxTokens: 12000
  },
  'google/gemma-3-27b-it': {
    name: 'Gemma-3-27B-IT',
    description: 'Gemini技術を基にしたマルチモーダル対応モデルで、テキストと画像の入力を処理しテキスト出力を生成します。',
    maxTokens: 12000
  },
  'meta-llama/Llama-3.3-70B-Instruct': {
    name: 'Llama-3.3-70B-Instruct',
    description: '最適化されたトランスフォーマーアーキテクチャを採用し、SFT（教師ありファインチューニング）とRLHF（人間フィードバックによる強化学習）で人間の好みに合わせ指示チューニングを行ったオートレグレッシブ言語モデルです。',
    maxTokens: 12000
  },
  'mistralai/Devstral-Small-2505': {
    name: 'Devstral-Small-2505',
    description: 'Mistral AIの開発者向けモデル。コード生成とプログラミング支援に特化した小型モデル。',
    maxTokens: 10000
  },
  'mistralai/Magistral-Small-2506': {
    name: 'Magistral-Small-2506',
    description: 'Mistral AIの新世代小型モデル。高性能な推論能力を維持しながら軽量化を実現。',
    maxTokens: 10000
  },
  'Qwen/Qwen2-VL-7B-Instruct': {
    name: 'Qwen2-VL-7B',
    description: 'Qwen2シリーズの7Bビジョン-言語モデル。画像理解とテキスト生成を組み合わせた処理に対応。',
    maxTokens: 10000
  },
  'deepseek-ai/DeepSeek-R1': {
    name: 'DeepSeek-R1',
    description: '大規模強化学習で訓練された初代推論モデルで、数学、コード、論理タスクにおいてOpenAI-o1と同等の性能を発揮します。',
    maxTokens: 12000
  },
  'databricks/dbrx-instruct': {
    name: 'DBRX-Instruct',
    description: 'Databricksがスクラッチから開発したMoEモデルで、少数回の対話（few-shot）インタラクションに最適化されています。',
    maxTokens: 12000
  },
  'deepseek-ai/DeepSeek-R1-Distill-Llama-70B': {
    name: 'DeepSeek-R1-Distill-Llama-70B',
    description: 'オープンソースのLlama 3.3 70BをベースにDeepSeek-R1の生成サンプルでファインチューニングし、設定とトークナイザを微調整したモデルです。',
    maxTokens: 12000
  },
  'Qwen/QwQ-32B': {
    name: 'QwQ-32B',
    description: '中規模推論モデルで、従来の命令チューニングモデルに比べ難易度の高いタスクでも顕著に性能を向上させます。',
    maxTokens: 12000
  },
  'netease-youdao/Confucius-o1-14B': {
    name: 'Confucius-o1-14B',
    description: 'Qwen2.5-14B-Instructをベースに二段階学習戦略を採用し、14Bモデルでo1と同等の思考能力を実現したモデルです。',
    maxTokens: 10000
  },
  'nvidia/AceMath-7B-Instruct': {
    name: 'AceMath-7B-Instruct',
    description: 'Chain-of-Thought推論を活用し、英語の数学問題を高精度で解く能力を備えています。',
    maxTokens: 10000
  },
  'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B': {
    name: 'DeepSeek-R1-Distill-Qwen-32B',
    description: 'Qwen-32をベースにDeepSeek-R1の生成サンプルでファインチューニングし、設定とトークナイザを微調整したモデルです。',
    maxTokens: 12000
  },
  'neuralmagic/Llama-3.1-Nemotron-70B-Instruct-HF-FP8-dynamic': {
    name: 'Llama-3.1-Nemotron-70B',
    description: 'NVIDIAがカスタマイズし、ユーザークエリへの応答の有用性を強化した大規模言語モデルです。',
    maxTokens: 12000
  },
  'mistralai/Mistral-Large-Instruct-2411': {
    name: 'Mistral-Large-Instruct',
    description: '123Bパラメータの高性能モデルで、長文コンテキスト、ファンクションコール、システムプロンプト機能を強化しています。',
    maxTokens: 12000
  },
  'microsoft/phi-4': {
    name: 'Phi-4',
    description: '14Bパラメータの小型モデルながら、複雑な数学的推論を含む高度な推論タスクで優れた性能を発揮します。',
    maxTokens: 10000
  },
  'SentientAGI/Dobby-Mini-Unhinged-Llama-3.1-8B': {
    name: 'Dobby-Mini-Unhinged',
    description: 'Llama-3.1-8B-Instructをベースに、自由主義的な"パーソナリティ"を持つユニークなファインチューニングモデルです。',
    maxTokens: 10000
  },
  'watt-ai/watt-tool-70B': {
    name: 'Watt-Tool-70B',
    description: 'LLaMa-3.3-70B-Instructをベースに、ツール使用とマルチターンダイアログに特化し、Berkeley Function-Calling Leaderboardで最先端性能を示します。',
    maxTokens: 12000
  },
  'bespokelabs/Bespoke-Stratos-32B': {
    name: 'Bespoke-Stratos-32B',
    description: 'Qwen2.5-32B-InstructをBespoke-Stratos-17kデータセットで蒸留し、Berkeley NovaSkyのパイプラインで再調整したモデルです。',
    maxTokens: 12000
  },
  'NovaSky-AI/Sky-T1-32B-Preview': {
    name: 'Sky-T1-32B-Preview',
    description: 'Qwen2.5-32B-Instructを17Kデータで訓練した32B推論モデルで、数学とコーディングタスクでo1-previewと同等性能を実現します。',
    maxTokens: 12000
  },
  'tiiuae/Falcon3-10B-Instruct': {
    name: 'Falcon3-10B-Instruct',
    description: '推論、言語理解、コード生成、数学タスクにおいて当時の最先端結果を達成し、最大32Kトークンのコンテキスト長をサポートします。',
    maxTokens: 12000
  },
  'THUDM/glm-4-9b-chat': {
    name: 'GLM-4-9B-Chat',
    description: 'Zhipu AIのGLM-4シリーズ最新モデルのオープンソース版で、チャット対話に最適化されています。',
    maxTokens: 10000
  },
  'Qwen/Qwen2.5-Coder-32B-Instruct': {
    name: 'Qwen2.5-Coder-32B',
    description: 'Qwen2.5をベースに、ソースコード生成やテキスト／コード連携タスク向けに強化したモデルです。',
    maxTokens: 12000
  },
  'CohereForAI/aya-expanse-32b': {
    name: 'Aya-Expanse-32B',
    description: '高度な多言語機能を持つオープンウェイト研究リリースモデルです。',
    maxTokens: 12000
  },
  'jinaai/ReaderLM-v2': {
    name: 'ReaderLM-v2',
    description: '生のHTMLを高精度でMarkdownやJSONに変換する、29言語対応の専門モデルです。',
    maxTokens: 10000
  },
  'openbmb/MiniCPM3-4B': {
    name: 'MiniCPM3-4B',
    description: '32Kのコンテキストウィンドウを持ち、LLMxMapReduce技術により理論上無限の文脈処理を可能にするモデルです。',
    maxTokens: 10000
  },
  'mistralai/Ministral-8B-Instruct-2410': {
    name: 'Ministral-8B-Instruct',
    description: 'Mistral Research Licenseの下でリリースされた、同規模モデルを大きく上回る性能を誇るファインチューニング済み言語モデルです。',
    maxTokens: 10000
  },
  'Qwen/Qwen2.5-1.5B-Instruct': {
    name: 'Qwen2.5-1.5B-Instruct',
    description: 'Qwenシリーズの最新1.5Bパラメータ指示チューニングモデルです。',
    maxTokens: 8000
  },
  'ozone-ai/0x-lite': {
    name: '0x-Lite',
    description: 'Ozone AIが開発した軽量ながら高品質なテキスト生成能力を持つモデルです。',
    maxTokens: 8000
  },
  'microsoft/Phi-3.5-mini-instruct': {
    name: 'Phi-3.5-Mini-Instruct',
    description: 'Phi-3データセットをベースにした軽量モデルで、128Kトークンの長文コンテキストをサポートします。',
    maxTokens: 10000
  },
  'ibm-granite/granite-3.1-8b-instruct': {
    name: 'Granite-3.1-8B-Instruct',
    description: 'IBMのGranite-3.1-8B-Baseを長文問題向けにファインチューニングしたデータセットで訓練された8Bモデルです。',
    maxTokens: 10000
  }
};

// グローバル変数
let currentExecutions = new Map(); // 実行中のタスクを管理
let nextPanelId = 4; // 次のパネルIDカウンター
const MAX_PANELS = 6; // 最大パネル数

// ローカルストレージのキー
const STORAGE_KEYS = {
  PROMPT: 'multiLlmPrompt',
  RESULTS: 'multiLlmResults',
  PANEL_COUNT: 'multiLlmPanelCount',
  NEXT_PANEL_ID: 'multiLlmNextPanelId'
};

// サンプルプロンプト一覧
const SAMPLE_PROMPTS = [
  "人工知能の未来について、メリットとデメリットを比較して分析してください。",
  "Pythonで素数を判定する関数を作成し、コメント付きで説明してください。",
  "恋人との関係で悩んでいます。お互いの時間を大切にしながら良い関係を築くアドバイスをください。",
  "日本の四季をテーマにした短い詩を作ってください。",
  "スタートアップ企業の新サービス企画書の概要を作成してください。テーマは「環境に優しい配達サービス」です。",
  "宇宙探査の歴史と今後の展望について、わかりやすく説明してください。",
  "健康的な一週間の食事メニューを提案してください。栄養バランスも考慮してください。",
  "時間管理が苦手な人向けの効果的なタイムマネジメント方法を教えてください。",
  "気候変動問題の解決策を3つ提案し、それぞれの実現可能性を評価してください。",
  "初心者向けに投資の基本知識と始め方をわかりやすく説明してください。"
];

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function initializeApp() {
  // DOM要素の取得
  const elements = {
    tabs: document.querySelectorAll('.tab'),
    promptInput: document.getElementById('promptInput'),
    runAllBtn: document.getElementById('runAllBtn'),
    stopAllBtn: document.getElementById('stopAllBtn'),
    clearAllBtn: document.getElementById('clearAllBtn'),
    randomSelectBtn: document.getElementById('randomSelectBtn'),
    randomPromptBtn: document.getElementById('randomPromptBtn'),
    addPanelBtn: document.getElementById('addPanelBtn'),
    homeBtn: document.getElementById('homeBtn'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    executionPage: document.getElementById('execution-page'),
    modelsPage: document.getElementById('models-page'),
    toggleGuide: document.querySelector('.toggle-guide'),
    guideContent: document.querySelector('.guide-content')
  };

  // イベントリスナーの設定
  setupEventListeners(elements);
  
  // モデル選択肢を初期化
  initializeModelSelectors();
  
  // 保存されたプロンプトを復元
  restoreSavedPrompt();
  
  // 保存された結果を復元（パネル復元も含む）
  const hasRestoredData = restoreResults();
  
  // 保存データがない場合のみ初期モデルを自動選択
  if (!hasRestoredData) {
    setInitialModelSelection();
  }
  
  // モデル説明ページを初期化
  initializeModelDescriptions();
  
  // パネルの削除ボタンを適切に表示/非表示
  updateRemoveButtons();
  
  console.log('マルチLLMシステムが初期化されました');
}

function setupEventListeners(elements) {
  // タブ切り替え
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab, elements));
  });
  
  // プロンプト入力の保存
  elements.promptInput.addEventListener('input', () => {
    localStorage.setItem(STORAGE_KEYS.PROMPT, elements.promptInput.value);
  });
  
  // 実行ボタン
  elements.runAllBtn.addEventListener('click', () => executeAllModels(elements));
  
  // 停止ボタン
  elements.stopAllBtn.addEventListener('click', () => stopAllExecutions(elements));
  
  // クリアボタン
  elements.clearAllBtn.addEventListener('click', () => clearAllOutputs());
  
  // ランダム選択ボタン
  elements.randomSelectBtn.addEventListener('click', () => randomSelectModels());
  
  // ランダムプロンプトボタン
  elements.randomPromptBtn.addEventListener('click', () => randomSelectPrompt(elements));
  
  // パネル追加ボタン
  elements.addPanelBtn.addEventListener('click', () => addNewPanel());
  
  // ホームボタン
  elements.homeBtn.addEventListener('click', () => {
    window.location.href = '../index.html';
  });
  
  // ガイド表示切り替え
  elements.toggleGuide.addEventListener('click', () => {
    elements.guideContent.style.display = 
      elements.guideContent.style.display === 'none' ? 'block' : 'none';
  });
  
  // モバイルデバイスでのツールチップ対応
  setupMobileTooltips();
}

function switchTab(selectedTab, elements) {
  // タブの状態を更新
  elements.tabs.forEach(tab => tab.classList.remove('active'));
  selectedTab.classList.add('active');
  
  // ページの表示切り替え
  const isExecutionPage = selectedTab.id === 'tab-execution';
  elements.executionPage.style.display = isExecutionPage ? 'block' : 'none';
  elements.modelsPage.style.display = isExecutionPage ? 'none' : 'block';
}

function initializeModelSelectors() {
  const selectors = document.querySelectorAll('.model-select');
  
  selectors.forEach(selector => {
    // オプションをクリア
    selector.innerHTML = '<option value="">モデルを選択</option>';
    
    // モデルを追加
    Object.entries(AVAILABLE_MODELS).forEach(([id, model]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = model.name;
      selector.appendChild(option);
    });
    
    // 変更イベントを設定
    selector.addEventListener('change', (e) => {
      updateModelSelection(e.target);
      updateModelTooltip(e.target);
      
      // モデル選択変更時に状態を保存
      saveResults();
    });
  });
}

function updateModelSelection(changedSelector) {
  updateAllModelSelections();
}

function updateModelTooltip(selector) {
  const panelId = selector.dataset.panel;
  const modelId = selector.value;
  const tooltipElement = document.querySelector(`[data-panel-id="${panelId}"] .model-tooltip`);
  const outputElement = document.querySelector(`[data-panel-id="${panelId}"] .panel-output`);
  
  if (modelId && AVAILABLE_MODELS[modelId]) {
    tooltipElement.textContent = AVAILABLE_MODELS[modelId].description;
    // モデルが選択されている場合はプロンプト実行の案内に変更
    if (outputElement && outputElement.textContent === 'モデルを選択してプロンプトを実行してください。') {
      outputElement.textContent = 'プロンプトを実行してください。';
    }
  } else {
    tooltipElement.textContent = 'モデルを選択してください';
    // モデルが未選択の場合は元のメッセージに戻す
    if (outputElement) {
      outputElement.textContent = 'モデルを選択してプロンプトを実行してください。';
    }
  }
}

function initializeModelDescriptions() {
  const container = document.getElementById('modelDescriptions');
  
  // モデルをシリーズ別に分類
  const modelGroups = {
    'DeepSeek系モデル': [
      'deepseek-ai/DeepSeek-R1-0528',
      'deepseek-ai/DeepSeek-R1',
      'deepseek-ai/DeepSeek-R1-Distill-Llama-70B',
      'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B'
    ],
    'Llama系モデル': [
      'private-meta-llama/Llama-3.3-70B-Instruct',
      'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8',
      'meta-llama/Llama-3.2-90B-Vision-Instruct',
      'meta-llama/Llama-3.3-70B-Instruct',
      'neuralmagic/Llama-3.1-Nemotron-70B-Instruct-HF-FP8-dynamic',
      'SentientAGI/Dobby-Mini-Unhinged-Llama-3.1-8B'
    ],
    'Qwen系モデル': [
      'Qwen/Qwen3-235B-A22B-FP8',
      'Qwen/Qwen2.5-VL-32B-Instruct',
      'Qwen/Qwen2-VL-7B-Instruct',
      'Qwen/QwQ-32B',
      'Qwen/Qwen2.5-Coder-32B-Instruct',
      'Qwen/Qwen2.5-1.5B-Instruct'
    ],
    'Microsoft Phi系モデル': [
      'microsoft/phi-4',
      'microsoft/Phi-3.5-mini-instruct'
    ],
    'Mistral系モデル': [
      'mistralai/Devstral-Small-2505',
      'mistralai/Magistral-Small-2506',
      'mistralai/Mistral-Large-Instruct-2411',
      'mistralai/Ministral-8B-Instruct-2410'
    ],
    'Google & NVIDIA系モデル': [
      'google/gemma-3-27b-it',
      'nvidia/AceMath-7B-Instruct'
    ],
    '専門特化モデル': [
      'watt-ai/watt-tool-70B',
      'jinaai/ReaderLM-v2'
    ],
    '推論特化・実験的モデル': [
      'netease-youdao/Confucius-o1-14B',
      'bespokelabs/Bespoke-Stratos-32B',
      'NovaSky-AI/Sky-T1-32B-Preview',
      'tiiuae/Falcon3-10B-Instruct'
    ],
    'エンタープライズ・産業系モデル': [
      'databricks/dbrx-instruct',
      'THUDM/glm-4-9b-chat',
      'CohereForAI/aya-expanse-32b',
      'ibm-granite/granite-3.1-8b-instruct'
    ],
    '軽量・エッジ向けモデル': [
      'openbmb/MiniCPM3-4B',
      'ozone-ai/0x-lite'
    ]
  };
  
  // 各グループを順番に表示
  Object.entries(modelGroups).forEach(([groupName, modelIds]) => {
    // グループコンテナを作成
    const groupContainer = document.createElement('div');
    groupContainer.className = 'model-group';
    groupContainer.style.marginBottom = '1.5rem';
    
    // グループタイトルを作成（クリック可能）
    const groupHeader = document.createElement('div');
    groupHeader.className = 'usage-guide group-header';
    groupHeader.style.marginBottom = '0';
    groupHeader.style.background = 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)';
    groupHeader.style.color = 'white';
    groupHeader.style.cursor = 'pointer';
    groupHeader.style.transition = 'all 0.3s ease';
    
    groupHeader.innerHTML = `
      <h3 style="margin: 0; padding: 1rem; color: white; display: flex; align-items: center; justify-content: space-between;">
        ${groupName}
        <i class="fas fa-chevron-down" style="transition: transform 0.3s ease;"></i>
      </h3>
    `;
    
    // グループコンテンツを作成（初期は非表示）
    const groupContent = document.createElement('div');
    groupContent.className = 'group-content';
    groupContent.style.display = 'none';
    groupContent.style.overflow = 'hidden';
    groupContent.style.transition = 'all 0.3s ease';
    
    // グループ内のモデルを表示
    modelIds.forEach(modelId => {
      if (AVAILABLE_MODELS[modelId]) {
        const model = AVAILABLE_MODELS[modelId];
        const modelCard = document.createElement('div');
        modelCard.className = 'usage-guide model-card';
        modelCard.style.marginBottom = '1rem';
        modelCard.style.marginLeft = '1rem';
        modelCard.style.borderLeft = '4px solid var(--primary)';
        modelCard.style.animation = 'slideIn 0.3s ease';
        
        modelCard.innerHTML = `
          <h4 style="color: var(--primary); margin-top: 0;">${model.name}</h4>
          <p style="margin: 0.5rem 0;"><code style="background: #f8f9fa; padding: 0.2rem 0.4rem; border-radius: 3px; font-size: 0.8rem;">${modelId}</code></p>
          <p style="margin: 0; color: #555;">${model.description}</p>
        `;
        
        groupContent.appendChild(modelCard);
      }
    });
    
    // クリックイベントを追加
    groupHeader.addEventListener('click', () => {
      const isVisible = groupContent.style.display !== 'none';
      const chevron = groupHeader.querySelector('i');
      
      if (isVisible) {
        // 非表示にする
        groupContent.style.display = 'none';
        chevron.style.transform = 'rotate(0deg)';
        groupHeader.style.borderRadius = '8px';
      } else {
        // 表示する
        groupContent.style.display = 'block';
        chevron.style.transform = 'rotate(180deg)';
        groupHeader.style.borderRadius = '8px 8px 0 0';
      }
    });
    
    // ホバー効果を追加
    groupHeader.addEventListener('mouseenter', () => {
      groupHeader.style.transform = 'translateY(-2px)';
      groupHeader.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15)';
    });
    
    groupHeader.addEventListener('mouseleave', () => {
      groupHeader.style.transform = 'translateY(0)';
      groupHeader.style.boxShadow = 'var(--card-shadow)';
    });
    
    // グループをコンテナに追加
    groupContainer.appendChild(groupHeader);
    groupContainer.appendChild(groupContent);
    container.appendChild(groupContainer);
  });
  
  // API情報を追加
  const apiInfo = document.createElement('div');
  apiInfo.className = 'usage-guide';
  apiInfo.style.marginTop = '2rem';
  apiInfo.style.borderTop = '3px solid var(--primary)';
  apiInfo.style.background = 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)';
  
  apiInfo.innerHTML = `
    <h3 style="color: var(--primary); margin-top: 1rem;">🚀 使用API情報</h3>
    <div style="background: #fff; padding: 1rem; border-radius: 8px; border-left: 4px solid var(--secondary);">
      <p style="margin: 0 0 0.5rem 0; font-weight: bold; color: var(--text-primary);">
        <i class="fas fa-cloud" style="color: var(--primary); margin-right: 0.5rem;"></i>
        io.net API
      </p>
      <p style="margin: 0; color: var(--text-secondary); line-height: 1.6;">
        本システムは<strong>io.net API</strong>を活用して、30種類の最新LLMモデルを提供しています。
        io.netは分散型AIネットワークで、高性能なGPUクラスターを通じて
        世界最先端のAIモデルへのアクセスを実現しています。
      </p>
      <div style="margin-top: 1rem; padding: 0.8rem; background: #f1f3f5; border-radius: 5px;">
        <p style="margin: 0; font-size: 0.9rem; color: var(--text-secondary);">
          <i class="fas fa-info-circle" style="color: var(--primary); margin-right: 0.5rem;"></i>
          すべてのモデルは非同期で並列実行され、リアルタイムで結果を表示します。
        </p>
      </div>
    </div>
  `;
  
  container.appendChild(apiInfo);
}

function updateRemoveButtons() {
  const panels = document.querySelectorAll('.llm-panel');
  const hasMoreThanThree = panels.length > 3;
  
  panels.forEach((panel, index) => {
    const removeBtn = panel.querySelector('.remove-panel');
    if (removeBtn) {
      removeBtn.style.display = hasMoreThanThree ? 'block' : 'none';
    }
  });
  
  // パネル追加ボタンの状態更新
  const addBtn = document.getElementById('addPanelBtn');
  if (addBtn) {
    addBtn.style.display = panels.length >= MAX_PANELS ? 'none' : 'block';
  }
}

function addNewPanel() {
  const panelsContainer = document.getElementById('llmPanels');
  const currentPanels = document.querySelectorAll('.llm-panel');
  
  if (currentPanels.length >= MAX_PANELS) {
    alert('最大6つまでのパネルを追加できます。');
    return;
  }
  
  const newPanel = createPanelElement(nextPanelId);
  panelsContainer.appendChild(newPanel);
  
  // 新しいパネルのセレクターのみ初期化
  initializeNewPanelSelector(newPanel);
  
  // 未選択のモデルを自動的に選択
  autoSelectUnusedModel(newPanel);
  
  // 削除ボタンイベント設定
  setupRemoveButtonEvent(newPanel);
  
  nextPanelId++;
  updateRemoveButtons();
  
  // パネル追加時に状態を保存
  saveResults();
}

function createPanelElement(panelId) {
  const panel = document.createElement('div');
  panel.className = 'llm-panel';
  panel.dataset.panelId = panelId;
  
  panel.innerHTML = `
    <div class="panel-header">
      <div class="model-selector">
        <select class="model-select" data-panel="${panelId}">
          <option value="">モデルを選択</option>
        </select>
        <div class="model-info">
          <i class="fas fa-info-circle"></i>
          <div class="model-tooltip">モデルを選択してください</div>
        </div>
      </div>
      <div class="panel-controls">
        <button class="remove-panel" data-panel="${panelId}">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
    <div class="panel-content">
      <div class="panel-status status-waiting">待機中</div>
      <div class="panel-output">プロンプトを実行してください。</div>
    </div>
  `;
  
  return panel;
}

function setupRemoveButtonEvent(panel) {
  const removeBtn = panel.querySelector('.remove-panel');
  removeBtn.addEventListener('click', () => {
    panel.remove();
    updateAllModelSelections(); // 既存の選択を保持して更新
    updateRemoveButtons();
    
    // パネル削除時に状態を保存
    saveResults();
  });
}

function initializeNewPanelSelector(panel) {
  const selector = panel.querySelector('.model-select');
  
  // オプションをクリア
  selector.innerHTML = '<option value="">モデルを選択</option>';
  
  // モデルを追加
  Object.entries(AVAILABLE_MODELS).forEach(([id, model]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = model.name;
    selector.appendChild(option);
  });
  
      // 変更イベントを設定
    selector.addEventListener('change', (e) => {
      updateModelSelection(e.target);
      updateModelTooltip(e.target);
      
      // モデル選択変更時に状態を保存
      saveResults();
    });
  
  // 現在の選択状態を反映
  updateAllModelSelections();
}

function autoSelectUnusedModel(panel) {
  const selector = panel.querySelector('.model-select');
  const allSelectors = document.querySelectorAll('.model-select');
  const selectedModels = new Set();
  
  // 現在選択されているモデルを収集（新しいパネル以外）
  allSelectors.forEach(otherSelector => {
    if (otherSelector !== selector && otherSelector.value) {
      selectedModels.add(otherSelector.value);
    }
  });
  
  // 未選択のモデルから1つをランダム選択
  const availableModels = Object.keys(AVAILABLE_MODELS).filter(
    modelId => !selectedModels.has(modelId)
  );
  
  if (availableModels.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableModels.length);
    const selectedModel = availableModels[randomIndex];
    
    selector.value = selectedModel;
    updateModelTooltip(selector);
    
    // 選択状態を更新
    updateAllModelSelections();
  }
}

function updateAllModelSelections() {
  const selectedModels = new Set();
  const allSelectors = document.querySelectorAll('.model-select');
  
  // 現在選択されているモデルを収集
  allSelectors.forEach(selector => {
    if (selector.value) {
      selectedModels.add(selector.value);
    }
  });
  
  // 各セレクターのオプションを更新
  allSelectors.forEach(selector => {
    const currentValue = selector.value;
    const options = selector.querySelectorAll('option:not([value=""])');
    
    options.forEach(option => {
      const isSelected = selectedModels.has(option.value);
      const isCurrentValue = option.value === currentValue;
      
      // 他のセレクターで選択済みのモデルを無効化（ただし、現在のセレクターで選択中のものは除く）
      option.disabled = isSelected && !isCurrentValue;
    });
  });
}

function randomSelectModels() {
  const selectors = document.querySelectorAll('.model-select');
  const modelIds = Object.keys(AVAILABLE_MODELS);
  const shuffled = [...modelIds].sort(() => Math.random() - 0.5);
  
  selectors.forEach((selector, index) => {
    if (index < shuffled.length) {
      selector.value = shuffled[index];
      updateModelTooltip(selector);
    }
  });
  
  // 選択状態を更新
  updateModelSelection(selectors[0]);
}

function randomSelectPrompt(elements) {
  // ランダムにプロンプトを選択
  const randomIndex = Math.floor(Math.random() * SAMPLE_PROMPTS.length);
  const selectedPrompt = SAMPLE_PROMPTS[randomIndex];
  
  // プロンプト入力フィールドに設定
  elements.promptInput.value = selectedPrompt;
  
  // ローカルストレージにも保存
  localStorage.setItem(STORAGE_KEYS.PROMPT, selectedPrompt);
  
  // 視覚的フィードバック
  elements.randomPromptBtn.style.transform = 'scale(0.95)';
  setTimeout(() => {
    elements.randomPromptBtn.style.transform = 'scale(1)';
  }, 150);
}

async function executeAllModels(elements) {
  const prompt = elements.promptInput.value.trim();
  
  if (!prompt) {
    alert('プロンプトを入力してください。');
    return;
  }
  
  const panels = document.querySelectorAll('.llm-panel');
  const selectedPanels = Array.from(panels).filter(panel => {
    const selector = panel.querySelector('.model-select');
    return selector.value;
  });
  
  if (selectedPanels.length === 0) {
    alert('少なくとも1つのモデルを選択してください。');
    return;
  }
  
  // UI状態を更新
  elements.runAllBtn.disabled = true;
  elements.stopAllBtn.disabled = false;
  elements.loadingIndicator.classList.add('active');
  
  // 各パネルで実行開始（完全非同期）
  console.log(`🚀 非同期実行開始: ${selectedPanels.length}個のモデルを並列実行`);
  const startTime = Date.now();
  
  const promises = selectedPanels.map((panel, index) => {
    const modelName = panel.querySelector('.model-select option:checked')?.textContent || 'Unknown';
    console.log(`📡 パネル${index + 1} (${modelName}): API呼び出し開始`);
    return executeModelInPanel(panel, prompt, index + 1);
  });
  
  try {
    const results = await Promise.allSettled(promises);
    const endTime = Date.now();
    console.log(`✅ 全実行完了: ${(endTime - startTime) / 1000}秒`);
    
    // 結果の集計
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    console.log(`📊 結果: 成功 ${successful}個, 失敗 ${failed}個`);
    
  } finally {
    // UI状態を元に戻す
    elements.runAllBtn.disabled = false;
    elements.stopAllBtn.disabled = true;
    elements.loadingIndicator.classList.remove('active');
  }
}

async function executeModelInPanel(panel, prompt, panelIndex = 0) {
  const panelId = panel.dataset.panelId;
  const selector = panel.querySelector('.model-select');
  const statusElement = panel.querySelector('.panel-status');
  const outputElement = panel.querySelector('.panel-output');
  const modelId = selector.value;
  const modelName = selector.options[selector.selectedIndex]?.text || 'Unknown';
  
  if (!modelId) return;
  
  const startTime = Date.now();
  console.log(`⏰ パネル${panelIndex} (${modelName}): 実行開始`);
  
  // パネル状態を実行中に更新
  statusElement.className = 'panel-status status-running';
  statusElement.textContent = '実行中...';
  outputElement.textContent = '';
  
  try {
    // AbortControllerを作成して実行管理に追加
    const abortController = new AbortController();
    currentExecutions.set(panelId, abortController);
    
    // API呼び出し
    await callCloudflareAPI(modelId, prompt, outputElement, abortController.signal);
    
    const endTime = Date.now();
    console.log(`✅ パネル${panelIndex} (${modelName}): 完了 (${(endTime - startTime) / 1000}秒)`);
    
    // 成功時の状態更新
    statusElement.className = 'panel-status status-completed';
    statusElement.textContent = '完了';
    
    // 結果を保存
    saveResults();
    
  } catch (error) {
    // エラー時の状態更新
    statusElement.className = 'panel-status status-error';
    statusElement.textContent = 'エラー';
    
    if (error.name === 'AbortError') {
      outputElement.textContent = '実行が停止されました。';
    } else {
      outputElement.textContent = `エラー: ${error.message}`;
      console.error('API呼び出しエラー:', error);
    }
  } finally {
    // 実行管理から削除
    currentExecutions.delete(panelId);
  }
}

async function callCloudflareAPI(modelId, prompt, outputElement, signal) {
  // Cloudflare Worker APIのエンドポイント
  const API_ENDPOINT = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
  
  // 大型モデルには特別な設定を適用
  const isLargeModel = modelId.includes('90B') || modelId.includes('70B') || modelId.includes('Large');
  const maxTokens = isLargeModel ? 12000 : 8000; // 大型モデルには更に大きな制限
  
  const requestBody = {
    model: modelId,
    temperature: 0.7,
    stream: false,
    max_completion_tokens: maxTokens,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ]
  };
  
  console.log(`🚀 API呼び出し開始: ${modelId}`);
  
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody),
    signal: signal
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ API呼び出しエラー (${modelId}):`, response.status, response.statusText, errorText);
    throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
  }
  
  // stream: false なので直接JSONレスポンスを処理
  const data = await response.json();
  console.log(`📥 API応答受信: ${modelId}, データサイズ:`, JSON.stringify(data).length);
  
  // レスポンスからコンテンツを取得
  const content = data.choices?.[0]?.message?.content;
  
  if (content) {
    console.log(`📝 受信コンテンツ長: ${content.length}文字 (${modelId})`);
    
    // ステータスを生成中に変更
    const panel = outputElement.closest('.llm-panel');
    const statusElement = panel.querySelector('.panel-status');
    statusElement.className = 'panel-status status-generating';
    statusElement.textContent = '生成中...';
    
    // コンテンツをクリーンアップ（最小限の処理のみ）- モデルIDを渡す
    const cleanedContent = cleanContent(content, modelId);
    
    // デバッグ用：クリーンアップ前後の先頭100文字を比較
    console.log(`📋 クリーンアップ前の先頭100文字 (${modelId}):`, content.substring(0, 100));
    console.log(`📋 クリーンアップ後の先頭100文字 (${modelId}):`, cleanedContent.substring(0, 100));
    
    // タイピング効果で文字を順次表示
    outputElement.innerHTML = '';
    console.log(`🎬 表示開始: ${cleanedContent.length}文字 (${modelId})`);
    await typeTextWithMarkdown(outputElement, cleanedContent);
    console.log(`✨ 表示完了: ${modelId}`);
  } else {
    console.error(`❌ レスポンスにコンテンツが含まれていません:`, data);
    throw new Error('レスポンスにコンテンツが含まれていません');
  }
}

// コンテンツをクリーンアップする関数（最小限の処理のみ）
function cleanContent(content, modelId = '') {
  console.log('🔧 元のコンテンツ長:', content.length, 'モデル:', modelId);
  
  // 元のコンテンツを保持
  let cleaned = content;
  
  // <think>...</think>タグを削除（DeepSeek-R1の思考タグのみ）
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');
  
  // </think>タグのみが残っている場合も削除
  cleaned = cleaned.replace(/<\/think>/gi, '');
  
  // 連続する空行を3つ以上ある場合のみ2つに統合（最小限の整形）
  cleaned = cleaned.replace(/\n\s*\n\s*\n\s*\n/g, '\n\n');
  
  // 前後の余分な空白を削除
  cleaned = cleaned.trim();
  
  console.log('✂️ クリーンアップ後の長さ:', cleaned.length);
  
  // 安全策：元のコンテンツの90%以上が残っていない場合は元のコンテンツを返す
  if (cleaned.length < content.length * 0.9) {
    console.log('⚠️ 予期せぬ削除が発生したため元のコンテンツを使用');
    return content.trim();
  }
  
  return cleaned;
}

// Markdownをサポートしたタイピング効果関数
async function typeTextWithMarkdown(element, text, delay = 15) {
  element.innerHTML = '';
  let currentHtml = '';
  const textLength = text.length;
  
  // 長いテキストの場合は遅延を動的に調整
  let adjustedDelay = delay;
  if (textLength > 5000) {
    adjustedDelay = 5; // 非常に長い場合でもゆっくり表示
  } else if (textLength > 2000) {
    adjustedDelay = 8; // 長い場合は中程度の速度
  } else if (textLength > 1000) {
    adjustedDelay = 12; // 中程度の場合はゆっくり
  }
  
  console.log(`⌨️ タイピング効果開始: ${textLength}文字, 遅延${adjustedDelay}ms`);
  
  // 非常に長いテキストの場合は段階的に表示
  const chunkSize = textLength > 3000 ? 20 : 5;
  
  for (let i = 0; i < textLength; i++) {
    currentHtml += text[i];
    
    // リアルタイムでMarkdownをHTMLに変換して表示
    element.innerHTML = convertMarkdownToHtml(currentHtml);
    element.scrollTop = element.scrollHeight; // 自動スクロール
    
    // チャンクサイズごとに遅延（パフォーマンス向上）
    if (i % chunkSize === 0) {
      await new Promise(resolve => setTimeout(resolve, adjustedDelay));
    }
  }
  
  console.log('✅ タイピング効果完了');
}

// 簡易Markdown to HTML変換関数
function convertMarkdownToHtml(markdown) {
  let html = markdown;
  
  // ヘッダー（###### ##### #### ### ## #）- 長いものから順番に処理
  html = html.replace(/^###### (.*$)/gm, '<h6>$1</h6>');
  html = html.replace(/^##### (.*$)/gm, '<h5>$1</h5>');
  html = html.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
  
  // ボールド（**text** または __text__）
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
  
  // イタリック（*text* または _text_）
  html = html.replace(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g, '<em>$1</em>');
  html = html.replace(/(?<!_)_(?!_)([^_]+)_(?!_)/g, '<em>$1</em>');
  
  // インラインコード（`code`）
  html = html.replace(/`([^`]+)`/g, '<code style="background: #f1f1f1; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>');
  
  // コードブロック（```code```）
  html = html.replace(/```([\s\S]*?)```/g, '<pre style="background: #f8f8f8; padding: 12px; border-radius: 5px; overflow-x: auto; font-family: monospace; border: 1px solid #e1e1e1;"><code>$1</code></pre>');
  
  // 改行をHTMLの改行に変換
  html = html.replace(/\n/g, '<br>');
  
  // 連続する<br>を段落に変換
  html = html.replace(/(<br>\s*){2,}/g, '</p><p>');
  
  // 最初と最後に<p>タグを追加（必要に応じて）
  if (html && !html.startsWith('<h') && !html.startsWith('<pre')) {
    html = '<p>' + html + '</p>';
  }
  
  return html;
}

// 従来のtypeText関数（後方互換性のため保持）
async function typeText(element, text, delay = 30) {
  element.textContent = '';
  
  for (let i = 0; i < text.length; i++) {
    element.textContent += text[i];
    element.scrollTop = element.scrollHeight; // 自動スクロール
    
    // キャンセル可能な遅延
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

function stopAllExecutions(elements) {
  // すべての実行を停止
  currentExecutions.forEach((controller, panelId) => {
    controller.abort();
    
    // パネル状態を更新
    const panel = document.querySelector(`[data-panel-id="${panelId}"]`);
    if (panel) {
      const statusElement = panel.querySelector('.panel-status');
      statusElement.className = 'panel-status status-waiting';
      statusElement.textContent = '停止済み';
    }
  });
  
  currentExecutions.clear();
  
  // UI状態を元に戻す
  elements.runAllBtn.disabled = false;
  elements.stopAllBtn.disabled = true;
  elements.loadingIndicator.classList.remove('active');
}

function clearAllOutputs() {
  const panels = document.querySelectorAll('.llm-panel');
  const promptInput = document.getElementById('promptInput');
  
  // プロンプト入力をクリア
  if (promptInput) {
    promptInput.value = '';
    // ローカルストレージからも削除
    localStorage.removeItem(STORAGE_KEYS.PROMPT);
    localStorage.removeItem(STORAGE_KEYS.RESULTS);
    localStorage.removeItem(STORAGE_KEYS.PANEL_COUNT);
    localStorage.removeItem(STORAGE_KEYS.NEXT_PANEL_ID);
  }
  
  // パネルの出力をクリア
  panels.forEach(panel => {
    const statusElement = panel.querySelector('.panel-status');
    const outputElement = panel.querySelector('.panel-output');
    
    statusElement.className = 'panel-status status-waiting';
    statusElement.textContent = '待機中';
    
    // 出力内容を完全にクリア（HTMLも含む）
    outputElement.innerHTML = '';
      outputElement.textContent = 'プロンプトを実行してください。';
  });
  
  // デフォルトモデルに戻す
  resetToDefaultModels();
}

function restoreSavedPrompt() {
  const savedPrompt = localStorage.getItem(STORAGE_KEYS.PROMPT);
  const promptInput = document.getElementById('promptInput');
  
  if (savedPrompt && promptInput) {
    promptInput.value = savedPrompt;
  }
}

// 実行結果を保存する関数
function saveResults() {
  const results = {};
  const panels = document.querySelectorAll('.llm-panel');
  
  panels.forEach(panel => {
    const panelId = panel.dataset.panelId;
    const selector = panel.querySelector('.model-select');
    const statusElement = panel.querySelector('.panel-status');
    const outputElement = panel.querySelector('.panel-output');
    
    results[panelId] = {
      selectedModel: selector.value,
      status: {
        className: statusElement.className,
        text: statusElement.textContent
      },
      output: outputElement.innerHTML
    };
  });
  
  // パネル情報も保存
  localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(results));
  localStorage.setItem(STORAGE_KEYS.PANEL_COUNT, panels.length.toString());
  localStorage.setItem(STORAGE_KEYS.NEXT_PANEL_ID, nextPanelId.toString());
}

// 実行結果を復元する関数
function restoreResults() {
  try {
    const savedResults = localStorage.getItem(STORAGE_KEYS.RESULTS);
    const savedPanelCount = localStorage.getItem(STORAGE_KEYS.PANEL_COUNT);
    const savedNextPanelId = localStorage.getItem(STORAGE_KEYS.NEXT_PANEL_ID);
    
    if (!savedResults) return false;
    
    const results = JSON.parse(savedResults);
    const panelCount = parseInt(savedPanelCount) || 3;
    nextPanelId = parseInt(savedNextPanelId) || 4;
    
    // 保存されたパネルIDリストを取得
    const savedPanelIds = Object.keys(results);
    const currentPanels = document.querySelectorAll('.llm-panel');
    const currentPanelIds = Array.from(currentPanels).map(panel => panel.dataset.panelId);
    
    // 不足しているパネルを特定して作成
    savedPanelIds.forEach(panelId => {
      if (!currentPanelIds.includes(panelId)) {
        addNewPanelForRestoreWithId(panelId);
      }
    });
    
    // 結果を復元
    Object.entries(results).forEach(([panelId, result]) => {
      const panel = document.querySelector(`[data-panel-id="${panelId}"]`);
      if (panel && result) {
        const selector = panel.querySelector('.model-select');
        const statusElement = panel.querySelector('.panel-status');
        const outputElement = panel.querySelector('.panel-output');
        
        // モデル選択を復元
        if (result.selectedModel && selector) {
          selector.value = result.selectedModel;
          updateModelTooltip(selector);
        }
        
        // ステータスを復元
        if (result.status && statusElement) {
          statusElement.className = result.status.className;
          statusElement.textContent = result.status.text;
        }
        
        // 出力を復元
        if (result.output && outputElement) {
          outputElement.innerHTML = result.output;
        }
      }
    });
    
    // モデル選択状態を更新
    updateAllModelSelections();
    updateRemoveButtons();
    
    return true; // 復元成功
    
  } catch (error) {
    console.warn('結果の復元に失敗しました:', error);
    return false; // 復元失敗
  }
}

// 復元用のパネル追加（イベントリスナーなし）
function addNewPanelForRestore() {
  const panelsContainer = document.getElementById('llmPanels');
  const currentPanels = document.querySelectorAll('.llm-panel');
  
  if (currentPanels.length >= MAX_PANELS) return;
  
  const newPanel = createPanelElement(nextPanelId);
  panelsContainer.appendChild(newPanel);
  
  // 新しいパネルのセレクターのみ初期化
  initializeNewPanelSelector(newPanel);
  
  // 削除ボタンイベント設定
  setupRemoveButtonEvent(newPanel);
  
  nextPanelId++;
}

// 指定IDでパネルを復元作成する関数
function addNewPanelForRestoreWithId(panelId) {
  const panelsContainer = document.getElementById('llmPanels');
  const currentPanels = document.querySelectorAll('.llm-panel');
  
  if (currentPanels.length >= MAX_PANELS) return;
  
  const newPanel = createPanelElement(panelId);
  panelsContainer.appendChild(newPanel);
  
  // 新しいパネルのセレクターのみ初期化
  initializeNewPanelSelector(newPanel);
  
  // 削除ボタンイベント設定
  setupRemoveButtonEvent(newPanel);
  
  // nextPanelIdを更新（最大値+1にする）
  const allPanelIds = Array.from(document.querySelectorAll('.llm-panel'))
    .map(panel => parseInt(panel.dataset.panelId))
    .filter(id => !isNaN(id));
  nextPanelId = Math.max(...allPanelIds, nextPanelId) + 1;
}

function setInitialModelSelection() {
  // 初期選択するモデル（最新の高性能モデルを優先）
  const initialModels = [
    'deepseek-ai/DeepSeek-R1-0528', // 最新のDeepSeek R1モデル
    'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8', // 高性能Llamaモデル
    'microsoft/phi-4' // 軽量で高性能なモデル
  ];
  
  const selectors = document.querySelectorAll('.model-select');
  
  selectors.forEach((selector, index) => {
    if (index < initialModels.length) {
      selector.value = initialModels[index];
      updateModelTooltip(selector);
      
      // 初期選択されたパネルの出力メッセージを更新
      const panelId = selector.dataset.panel;
      const outputElement = document.querySelector(`[data-panel-id="${panelId}"] .panel-output`);
      if (outputElement) {
        outputElement.textContent = 'プロンプトを実行してください。';
      }
    }
  });
  
  // 選択状態を更新（重複チェック）
  if (selectors.length > 0) {
    updateModelSelection(selectors[0]);
  }
}

// デフォルトモデルに戻す関数
function resetToDefaultModels() {
  // すべてのパネルのモデル選択をクリア
  const selectors = document.querySelectorAll('.model-select');
  selectors.forEach(selector => {
    selector.value = '';
  });
  
  // デフォルトモデルを設定
  setInitialModelSelection();
  
  // 状態を保存
  saveResults();
}

// 初期パネルの削除ボタンイベント設定
document.addEventListener('DOMContentLoaded', () => {
  const initialPanels = document.querySelectorAll('.llm-panel');
  initialPanels.forEach(setupRemoveButtonEvent);
}); 

// モバイルデバイス向けのツールチップ機能
function setupMobileTooltips() {
  // タッチデバイスかどうかを判定
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  if (!isTouchDevice) return; // タッチデバイス以外では何もしない
  
  console.log('📱 タッチデバイス検出: モバイル向けツールチップを有効化');
  
  // 情報アイコンのタップ対応を設定
  document.addEventListener('click', handleTooltipClick);
}

function handleTooltipClick(event) {
  const infoIcon = event.target.closest('.model-info');
  const tooltip = event.target.closest('.model-tooltip');
  
  if (infoIcon && !tooltip) {
    // 情報アイコンがタップされた場合
    event.preventDefault();
    event.stopPropagation();
    
    const tooltipElement = infoIcon.querySelector('.model-tooltip');
    if (tooltipElement) {
      // 他のツールチップを閉じる
      closeAllTooltips();
      
      // このツールチップを表示
      tooltipElement.classList.add('show');
      
      // 背景オーバーレイを作成
      createTooltipOverlay();
    }
  } else if (!tooltip && !infoIcon) {
    // 他の場所がタップされた場合はツールチップを閉じる
    closeAllTooltips();
  }
}

function closeAllTooltips() {
  const tooltips = document.querySelectorAll('.model-tooltip.show');
  tooltips.forEach(tooltip => {
    tooltip.classList.remove('show');
  });
  
  // オーバーレイを削除
  removeTooltipOverlay();
}

function createTooltipOverlay() {
  removeTooltipOverlay(); // 既存のオーバーレイを削除
  
  const overlay = document.createElement('div');
  overlay.className = 'tooltip-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10000;
    backdrop-filter: blur(2px);
  `;
  
  overlay.addEventListener('click', closeAllTooltips);
  document.body.appendChild(overlay);
}

function removeTooltipOverlay() {
  const overlay = document.querySelector('.tooltip-overlay');
  if (overlay) {
    overlay.remove();
  }
}

// パネル追加時にモバイル対応を適用
function setupRemoveButtonEventMobile(panel) {
  setupRemoveButtonEvent(panel); // 既存の機能
  
  // モバイル向けの追加設定があればここに追加
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isTouchDevice) {
    // タッチデバイス向けの追加調整があれば実装
  }
}

// スクロール位置の自動調整（モバイル向け）
function scrollToPanel(panel) {
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isTouchDevice) {
    // スマートフォンでパネルが追加された際に適切な位置にスクロール
    setTimeout(() => {
      panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  }
}

// パネル追加時にスクロール調整を含める
const originalAddNewPanel = addNewPanel;
function addNewPanel() {
  const panelsContainer = document.getElementById('llmPanels');
  const currentPanels = document.querySelectorAll('.llm-panel');
  
  if (currentPanels.length >= MAX_PANELS) {
    alert('最大6つまでのパネルを追加できます。');
    return;
  }
  
  const newPanel = createPanelElement(nextPanelId);
  panelsContainer.appendChild(newPanel);
  
  // 新しいパネルのセレクターのみ初期化
  initializeNewPanelSelector(newPanel);
  
  // 未選択のモデルを自動的に選択
  autoSelectUnusedModel(newPanel);
  
  // 削除ボタンイベント設定（モバイル対応含む）
  setupRemoveButtonEventMobile(newPanel);
  
  // モバイルでスクロール調整
  scrollToPanel(newPanel);
  
  nextPanelId++;
  updateRemoveButtons();
  
  // パネル追加時に状態を保存
  saveResults();
} 