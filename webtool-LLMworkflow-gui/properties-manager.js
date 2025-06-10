class PropertiesManager {
  constructor() {
    this.selectedNodeId = null;
    this.isCollapsed = false;
    this.nodeManager = null;
    this.saveTimeout = null;
    this.saveDelay = 300; // 300ms デバウンス
    
    this.initEventListeners();
    this.loadCollapsedState();
  }

  initEventListeners() {
    // 折りたたみボタンのイベント
    const toggleButton = document.getElementById('propertiesToggle');
    if (toggleButton) {
      toggleButton.addEventListener('click', () => {
        this.togglePanel();
      });
    }

    // プロパティ保存ボタン
    const saveButton = document.getElementById('saveNodeProperties');
    if (saveButton) {
      saveButton.addEventListener('click', () => {
        this.saveProperties();
      });
    }

    // フォーム変更時の自動保存（デバウンス付き）
    const propertiesForm = document.getElementById('nodePropertiesForm');
    if (propertiesForm) {
      propertiesForm.addEventListener('input', (e) => {
        if (e.target.dataset.autoSave !== 'false') {
          this.debouncedSaveProperties();
        }
      });
    }
  }

  togglePanel() {
    const panel = document.getElementById('propertiesPanel');
    const toggleButton = document.getElementById('propertiesToggle');
    
    this.isCollapsed = !this.isCollapsed;
    
    if (this.isCollapsed) {
      panel.classList.add('collapsed');
      toggleButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
    } else {
      panel.classList.remove('collapsed');
      toggleButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
    }
    
    this.saveCollapsedState();
  }

  showNodeProperties(nodeId) {
    if (!this.nodeManager) {
      console.error('NodeManager が設定されていません');
      return;
    }

    this.selectedNodeId = nodeId;
    const node = this.nodeManager.getNode(nodeId);
    
    if (!node) {
      this.hideProperties();
      return;
    }

    const propertiesContent = document.getElementById('propertiesContent');
    propertiesContent.innerHTML = this.generatePropertiesForm(node);
  }

  hideProperties() {
    this.selectedNodeId = null;
    const propertiesContent = document.getElementById('propertiesContent');
    propertiesContent.innerHTML = '<p>ノードを選択してプロパティを表示</p>';
  }

  generatePropertiesForm(node) {
    const baseFields = `
      <div class="property-group">
        <h4>基本設定</h4>
        <div class="property-field">
          <label>ノード名:</label>
          <input type="text" id="nodeName" value="${node.data.name || ''}" />
        </div>
        <div class="property-field">
          <label>説明:</label>
          <textarea id="nodeDescription" rows="2">${node.data.description || ''}</textarea>
        </div>
      </div>
    `;

    const typeSpecificFields = this.generateTypeSpecificFields(node);
    
    return `
      <form id="nodePropertiesForm">
        ${baseFields}
        ${typeSpecificFields}
        <button type="button" id="saveNodeProperties">保存</button>
      </form>
    `;
  }

  generateTypeSpecificFields(node) {
    switch (node.type) {
      case 'input':
        return `
          <div class="property-group">
            <h4>入力設定</h4>
            <div class="property-field">
              <label>入力タイプ:</label>
              <select id="inputType">
                <option value="text" ${node.data.inputType === 'text' ? 'selected' : ''}>テキスト</option>
                <option value="number" ${node.data.inputType === 'number' ? 'selected' : ''}>数値</option>
                <option value="file" ${node.data.inputType === 'file' ? 'selected' : ''}>ファイル</option>
              </select>
            </div>
            <div class="property-field">
              <label>デフォルト値:</label>
              <textarea id="defaultValue" rows="3">${node.data.defaultValue || ''}</textarea>
            </div>
          </div>
        `;

      case 'llm':
        return `
          <div class="property-group">
            <h4>LLM設定</h4>
            <div class="property-field">
              <label>プロンプト:</label>
              <textarea id="prompt" rows="8">${node.data.prompt || ''}</textarea>
            </div>
            <div class="property-field">
              <label>Temperature:</label>
              <input type="number" id="temperature" min="0" max="2" step="0.1" value="${node.data.temperature || 0.7}" />
            </div>
            <div class="property-field">
              <label>最大トークン数:</label>
              <input type="number" id="maxTokens" min="1" max="8000" value="${node.data.maxTokens || 2000}" />
            </div>
          </div>
        `;

      case 'branch':
        return `
          <div class="property-group">
            <h4>分岐設定</h4>
            <div class="property-field">
              <label>条件式:</label>
              <textarea id="condition" rows="3">${node.data.condition || ''}</textarea>
              <small>JavaScript式を入力（例: input.length > 10）</small>
            </div>
            <div class="property-field">
              <label>True出力:</label>
              <input type="text" id="trueOutput" value="${node.data.trueOutput || 'true'}" />
            </div>
            <div class="property-field">
              <label>False出力:</label>
              <input type="text" id="falseOutput" value="${node.data.falseOutput || 'false'}" />
            </div>
          </div>
        `;

      case 'merge':
        return `
          <div class="property-group">
            <h4>統合設定</h4>
            <div class="property-field">
              <label>統合タイプ:</label>
              <select id="mergeType">
                <option value="concat" ${node.data.mergeType === 'concat' ? 'selected' : ''}>連結</option>
                <option value="array" ${node.data.mergeType === 'array' ? 'selected' : ''}>配列</option>
                <option value="object" ${node.data.mergeType === 'object' ? 'selected' : ''}>オブジェクト</option>
              </select>
            </div>
            <div class="property-field">
              <label>区切り文字:</label>
              <input type="text" id="separator" value="${node.data.separator || '\\n\\n---\\n\\n'}" />
            </div>
          </div>
        `;

      case 'transform':
        return `
          <div class="property-group">
            <h4>変換設定</h4>
            <div class="property-field">
              <label>変換タイプ:</label>
              <select id="transformType">
                <option value="text" ${node.data.transformType === 'text' ? 'selected' : ''}>テキスト変換</option>
                <option value="json" ${node.data.transformType === 'json' ? 'selected' : ''}>JSON変換</option>
                <option value="custom" ${node.data.transformType === 'custom' ? 'selected' : ''}>カスタム関数</option>
              </select>
            </div>
            <div class="property-field">
              <label>変換関数:</label>
              <textarea id="transformFunction" rows="5">${node.data.transformFunction || ''}</textarea>
              <small>JavaScript関数を入力（例: return input.toUpperCase();）</small>
            </div>
          </div>
        `;

      case 'filter':
        return `
          <div class="property-group">
            <h4>フィルタ設定</h4>
            <div class="property-field">
              <label>フィルタタイプ:</label>
              <select id="filterType">
                <option value="condition" ${node.data.filterType === 'condition' ? 'selected' : ''}>条件</option>
                <option value="regex" ${node.data.filterType === 'regex' ? 'selected' : ''}>正規表現</option>
                <option value="length" ${node.data.filterType === 'length' ? 'selected' : ''}>文字数</option>
              </select>
            </div>
            <div class="property-field">
              <label>条件式:</label>
              <textarea id="condition" rows="3">${node.data.condition || ''}</textarea>
            </div>
            <div class="property-field">
              <label>パターン:</label>
              <input type="text" id="pattern" value="${node.data.pattern || ''}" />
            </div>
          </div>
        `;

      case 'sort':
        return `
          <div class="property-group">
            <h4>ソート設定</h4>
            <div class="property-field">
              <label>ソートタイプ:</label>
              <select id="sortType">
                <option value="alphabetical" ${node.data.sortType === 'alphabetical' ? 'selected' : ''}>アルファベット順</option>
                <option value="numerical" ${node.data.sortType === 'numerical' ? 'selected' : ''}>数値順</option>
                <option value="length" ${node.data.sortType === 'length' ? 'selected' : ''}>文字数順</option>
                <option value="custom" ${node.data.sortType === 'custom' ? 'selected' : ''}>カスタム</option>
              </select>
            </div>
            <div class="property-field">
              <label>ソート順:</label>
              <select id="sortOrder">
                <option value="asc" ${node.data.sortOrder === 'asc' ? 'selected' : ''}>昇順</option>
                <option value="desc" ${node.data.sortOrder === 'desc' ? 'selected' : ''}>降順</option>
              </select>
            </div>
            <div class="property-field">
              <label>ソートキー:</label>
              <input type="text" id="sortKey" value="${node.data.sortKey || ''}" />
              <small>オブジェクトのプロパティ名</small>
            </div>
          </div>
        `;

      case 'aggregate':
        return `
          <div class="property-group">
            <h4>集約設定</h4>
            <div class="property-field">
              <label>集約タイプ:</label>
              <select id="aggregateType">
                <option value="count" ${node.data.aggregateType === 'count' ? 'selected' : ''}>カウント</option>
                <option value="sum" ${node.data.aggregateType === 'sum' ? 'selected' : ''}>合計</option>
                <option value="average" ${node.data.aggregateType === 'average' ? 'selected' : ''}>平均</option>
                <option value="group" ${node.data.aggregateType === 'group' ? 'selected' : ''}>グループ化</option>
              </select>
            </div>
            <div class="property-field">
              <label>グループ化キー:</label>
              <input type="text" id="groupBy" value="${node.data.groupBy || ''}" />
            </div>
            <div class="property-field">
              <label>操作:</label>
              <select id="operation">
                <option value="sum" ${node.data.operation === 'sum' ? 'selected' : ''}>合計</option>
                <option value="count" ${node.data.operation === 'count' ? 'selected' : ''}>カウント</option>
                <option value="max" ${node.data.operation === 'max' ? 'selected' : ''}>最大値</option>
                <option value="min" ${node.data.operation === 'min' ? 'selected' : ''}>最小値</option>
              </select>
            </div>
          </div>
        `;

      case 'split':
        return `
          <div class="property-group">
            <h4>分割設定</h4>
            <div class="property-field">
              <label>分割タイプ:</label>
              <select id="splitType">
                <option value="delimiter" ${node.data.splitType === 'delimiter' ? 'selected' : ''}>区切り文字</option>
                <option value="chunk" ${node.data.splitType === 'chunk' ? 'selected' : ''}>チャンク</option>
                <option value="lines" ${node.data.splitType === 'lines' ? 'selected' : ''}>行単位</option>
              </select>
            </div>
            <div class="property-field">
              <label>区切り文字:</label>
              <input type="text" id="delimiter" value="${node.data.delimiter || ','}" />
            </div>
            <div class="property-field">
              <label>チャンクサイズ:</label>
              <input type="number" id="chunkSize" min="1" value="${node.data.chunkSize || 100}" />
            </div>
          </div>
        `;

      case 'output':
        return `
          <div class="property-group">
            <h4>出力設定</h4>
            <div class="property-field">
              <label>出力フォーマット:</label>
              <select id="outputFormat">
                <option value="text" ${node.data.outputFormat === 'text' ? 'selected' : ''}>テキスト</option>
                <option value="json" ${node.data.outputFormat === 'json' ? 'selected' : ''}>JSON</option>
                <option value="html" ${node.data.outputFormat === 'html' ? 'selected' : ''}>HTML</option>
                <option value="markdown" ${node.data.outputFormat === 'markdown' ? 'selected' : ''}>Markdown</option>
              </select>
            </div>
          </div>
        `;

      default:
        return '<div class="property-group"><p>このノードタイプに固有の設定はありません</p></div>';
    }
  }

  debouncedSaveProperties() {
    // 既存のタイマーをクリア
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    // 新しいタイマーを設定
    this.saveTimeout = setTimeout(() => {
      this.saveProperties();
      this.saveTimeout = null;
    }, this.saveDelay);
  }

  saveProperties() {
    if (!this.selectedNodeId || !this.nodeManager) return;

    const form = document.getElementById('nodePropertiesForm');
    if (!form) return;

    const formData = new FormData(form);
    const data = {};

    // 基本フィールド
    const nodeName = document.getElementById('nodeName');
    const nodeDescription = document.getElementById('nodeDescription');
    
    if (nodeName) data.name = nodeName.value;
    if (nodeDescription) data.description = nodeDescription.value;

    // 型固有フィールド
    const node = this.nodeManager.getNode(this.selectedNodeId);
    const typeFields = this.getTypeSpecificFieldIds(node.type);
    
    typeFields.forEach(fieldId => {
      const element = document.getElementById(fieldId);
      if (element) {
        if (element.type === 'checkbox') {
          data[fieldId] = element.checked;
        } else if (element.type === 'number') {
          data[fieldId] = parseFloat(element.value) || 0;
        } else {
          data[fieldId] = element.value;
        }
      }
    });

    this.nodeManager.updateNodeData(this.selectedNodeId, data);
    
    if (this.onPropertiesChanged) {
      this.onPropertiesChanged(this.selectedNodeId, data);
    }
  }

  getTypeSpecificFieldIds(nodeType) {
    const fieldMap = {
      input: ['inputType', 'defaultValue'],
      llm: ['prompt', 'temperature', 'maxTokens'],
      branch: ['condition', 'trueOutput', 'falseOutput'],
      merge: ['mergeType', 'separator'],
      transform: ['transformType', 'transformFunction'],
      filter: ['filterType', 'condition', 'pattern'],
      sort: ['sortType', 'sortOrder', 'sortKey'],
      aggregate: ['aggregateType', 'groupBy', 'operation'],
      split: ['splitType', 'delimiter', 'chunkSize'],
      output: ['outputFormat']
    };
    
    return fieldMap[nodeType] || [];
  }

  saveCollapsedState() {
    localStorage.setItem('propertiesPanelCollapsed', this.isCollapsed.toString());
  }

  loadCollapsedState() {
    const savedState = localStorage.getItem('propertiesPanelCollapsed');
    if (savedState === 'true') {
      this.togglePanel();
    }
  }

  setNodeManager(nodeManager) {
    this.nodeManager = nodeManager;
  }

  // 設定管理
  setNodeManager(nodeManager) {
    this.nodeManager = nodeManager;
  }

  setCallbacks(callbacks) {
    this.onPropertiesChanged = callbacks.onPropertiesChanged;
  }
} 