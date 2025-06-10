/**
 * ワークフローテンプレート定義
 * よく使われるワークフローパターンをプリセットとして定義
 */
class WorkflowTemplates {
  constructor() {
    this.templates = this.defineTemplates();
  }

  /**
   * テンプレートを定義
   */
  defineTemplates() {
    return {
      // シンプルなプロンプト処理
      simplePrompt: {
        name: 'シンプルプロンプト',
        description: '入力を受け取り、LLMで処理して出力する基本的なワークフロー',
        icon: 'fas fa-comment',
        category: '基本',
        nodes: [
          {
            id: 'input_1',
            type: 'input',
            x: 100,
            y: 200,
            data: {
              name: 'テキスト入力',
              description: '処理したいテキストを入力',
              inputType: 'text',
              defaultValue: ''
            }
          },
          {
            id: 'llm_1',
            type: 'llm',
            x: 350,
            y: 200,
            data: {
              name: 'LLM処理',
              description: 'テキストをLLMで処理',
              prompt: 'あなたは優秀なアシスタントです。以下のテキストを要約してください。\n\n{input}',
              temperature: 0.7,
              maxTokens: 2000
            }
          },
          {
            id: 'output_1',
            type: 'output',
            x: 600,
            y: 200,
            data: {
              name: '処理結果',
              description: 'LLMの処理結果',
              outputFormat: 'text'
            }
          }
        ],
        connections: [
          { id: 'conn_1', from: 'input_1', to: 'llm_1', type: 'data' },
          { id: 'conn_2', from: 'llm_1', to: 'output_1', type: 'data' }
        ]
      },

      // 多段階処理
      multiStage: {
        name: '多段階処理',
        description: '複数のLLMを連鎖させて段階的に処理を行うワークフロー',
        icon: 'fas fa-layer-group',
        category: '応用',
        nodes: [
          {
            id: 'input_1',
            type: 'input',
            x: 50,
            y: 200,
            data: {
              name: '原文',
              description: '処理する元のテキスト',
              inputType: 'text',
              defaultValue: ''
            }
          },
          {
            id: 'llm_1',
            type: 'llm',
            x: 250,
            y: 200,
            data: {
              name: '要約',
              description: 'テキストを要約',
              prompt: 'テキストを3行で要約してください。\n\nテキスト: {input}',
              temperature: 0.5,
              maxTokens: 500
            }
          },
          {
            id: 'llm_2',
            type: 'llm',
            x: 450,
            y: 200,
            data: {
              name: 'キーワード抽出',
              description: '要約からキーワードを抽出',
              prompt: '以下の要約から重要なキーワードを5つ抽出してください。\n\n要約: {input}',
              temperature: 0.3,
              maxTokens: 200
            }
          },
          {
            id: 'llm_3',
            type: 'llm',
            x: 650,
            y: 200,
            data: {
              name: 'タグ生成',
              description: 'キーワードからタグを生成',
              prompt: 'キーワードをもとに、検索用のタグを生成してください（カンマ区切り）。\n\nキーワード: {input}',
              temperature: 0.5,
              maxTokens: 200
            }
          },
          {
            id: 'output_1',
            type: 'output',
            x: 850,
            y: 200,
            data: {
              name: 'タグ',
              description: '生成されたタグ',
              outputFormat: 'text'
            }
          }
        ],
        connections: [
          { id: 'conn_1', from: 'input_1', to: 'llm_1', type: 'data' },
          { id: 'conn_2', from: 'llm_1', to: 'llm_2', type: 'data' },
          { id: 'conn_3', from: 'llm_2', to: 'llm_3', type: 'data' },
          { id: 'conn_4', from: 'llm_3', to: 'output_1', type: 'data' }
        ]
      },

      // 分岐処理
      conditionalBranch: {
        name: '条件分岐',
        description: '条件によって異なる処理を行うワークフロー',
        icon: 'fas fa-code-branch',
        category: '制御フロー',
        nodes: [
          {
            id: 'input_1',
            type: 'input',
            x: 50,
            y: 250,
            data: {
              name: 'テキスト',
              description: '分析するテキスト',
              inputType: 'text',
              defaultValue: ''
            }
          },
          {
            id: 'llm_1',
            type: 'llm',
            x: 200,
            y: 250,
            data: {
              name: '感情分析',
              description: 'テキストの感情を分析',
              prompt: 'テキストの感情を分析し、ポジティブかネガティブかを判定してください。\n結果は「ポジティブ」または「ネガティブ」の1単語で答えてください。\n\nテキスト: {input}',
              temperature: 0.1,
              maxTokens: 10
            }
          },
          {
            id: 'branch_1',
            type: 'branch',
            x: 350,
            y: 250,
            data: {
              name: '感情判定',
              description: 'ポジティブかネガティブかで分岐',
              condition: 'input.includes("ポジティブ")',
              trueOutput: 'positive',
              falseOutput: 'negative'
            }
          },
          {
            id: 'llm_2',
            type: 'llm',
            x: 550,
            y: 150,
            data: {
              name: 'ポジティブ処理',
              description: 'ポジティブな応答を生成',
              prompt: '素晴らしいですね！前向きなメッセージに対する励ましの返信を書いてください。',
              temperature: 0.8,
              maxTokens: 500
            }
          },
          {
            id: 'llm_3',
            type: 'llm',
            x: 550,
            y: 350,
            data: {
              name: 'ネガティブ処理',
              description: '励ましの応答を生成',
              prompt: '大変そうですね。優しく励ます返信を書いてください。',
              temperature: 0.8,
              maxTokens: 500
            }
          },
          {
            id: 'merge_1',
            type: 'merge',
            x: 750,
            y: 250,
            data: {
              name: '応答統合',
              description: '応答を統合',
              mergeType: 'concat',
              separator: ''
            }
          },
          {
            id: 'output_1',
            type: 'output',
            x: 900,
            y: 250,
            data: {
              name: '応答',
              description: '感情に応じた応答',
              outputFormat: 'text'
            }
          }
        ],
        connections: [
          { id: 'conn_1', from: 'input_1', to: 'llm_1', type: 'data' },
          { id: 'conn_2', from: 'llm_1', to: 'branch_1', type: 'data' },
          { id: 'conn_3', from: 'branch_1', to: 'llm_2', type: 'data' },
          { id: 'conn_4', from: 'branch_1', to: 'llm_3', type: 'data' },
          { id: 'conn_5', from: 'llm_2', to: 'merge_1', type: 'data' },
          { id: 'conn_6', from: 'llm_3', to: 'merge_1', type: 'data' },
          { id: 'conn_7', from: 'merge_1', to: 'output_1', type: 'data' }
        ]
      },

      // データ処理パイプライン
      dataProcessing: {
        name: 'データ処理パイプライン',
        description: 'データの分割、フィルタリング、集約を行うワークフロー',
        icon: 'fas fa-database',
        category: 'データ処理',
        nodes: [
          {
            id: 'input_1',
            type: 'input',
            x: 50,
            y: 250,
            data: {
              name: 'CSVデータ',
              description: 'カンマ区切りのデータ',
              inputType: 'text',
              defaultValue: ''
            }
          },
          {
            id: 'split_1',
            type: 'split',
            x: 200,
            y: 250,
            data: {
              name: 'CSV分割',
              description: 'カンマで分割',
              splitType: 'delimiter',
              delimiter: ',',
              chunkSize: 100
            }
          },
          {
            id: 'filter_1',
            type: 'filter',
            x: 350,
            y: 250,
            data: {
              name: '長さフィルタ',
              description: '5文字以上の項目のみ',
              filterType: 'condition',
              condition: 'return input.length >= 5;',
              pattern: ''
            }
          },
          {
            id: 'sort_1',
            type: 'sort',
            x: 500,
            y: 250,
            data: {
              name: 'アルファベット順',
              description: 'アルファベット順にソート',
              sortType: 'alphabetical',
              sortOrder: 'asc',
              sortKey: ''
            }
          },
          {
            id: 'aggregate_1',
            type: 'aggregate',
            x: 650,
            y: 250,
            data: {
              name: 'カウント',
              description: '項目数をカウント',
              aggregateType: 'count',
              groupBy: '',
              operation: 'count'
            }
          },
          {
            id: 'output_1',
            type: 'output',
            x: 800,
            y: 250,
            data: {
              name: '処理結果',
              description: 'フィルタ後の項目数',
              outputFormat: 'json'
            }
          }
        ],
        connections: [
          { id: 'conn_1', from: 'input_1', to: 'split_1', type: 'data' },
          { id: 'conn_2', from: 'split_1', to: 'filter_1', type: 'data' },
          { id: 'conn_3', from: 'filter_1', to: 'sort_1', type: 'data' },
          { id: 'conn_4', from: 'sort_1', to: 'aggregate_1', type: 'data' },
          { id: 'conn_5', from: 'aggregate_1', to: 'output_1', type: 'data' }
        ]
      },

      // 複数入力の統合
      multiInput: {
        name: '複数入力統合',
        description: '複数のソースからのデータを統合して処理',
        icon: 'fas fa-compress-arrows-alt',
        category: '応用',
        nodes: [
          {
            id: 'input_1',
            type: 'input',
            x: 50,
            y: 150,
            data: {
              name: 'タイトル',
              description: '記事のタイトル',
              inputType: 'text',
              defaultValue: ''
            }
          },
          {
            id: 'input_2',
            type: 'input',
            x: 50,
            y: 250,
            data: {
              name: '本文',
              description: '記事の本文',
              inputType: 'text',
              defaultValue: ''
            }
          },
          {
            id: 'input_3',
            type: 'input',
            x: 50,
            y: 350,
            data: {
              name: 'キーワード',
              description: 'SEOキーワード',
              inputType: 'text',
              defaultValue: ''
            }
          },
          {
            id: 'merge_1',
            type: 'merge',
            x: 250,
            y: 250,
            data: {
              name: '入力統合',
              description: '全入力を統合',
              mergeType: 'concat',
              separator: '\n\n'
            }
          },
          {
            id: 'llm_1',
            type: 'llm',
            x: 450,
            y: 250,
            data: {
              name: 'メタ説明生成',
              description: 'SEO用のメタ説明を生成',
              prompt: '以下の情報から、SEOに最適化された160文字以内のメタ説明を生成してください。\n\n{input}',
              temperature: 0.6,
              maxTokens: 200
            }
          },
          {
            id: 'output_1',
            type: 'output',
            x: 650,
            y: 250,
            data: {
              name: 'メタ説明',
              description: 'SEO用メタ説明',
              outputFormat: 'text'
            }
          }
        ],
        connections: [
          { id: 'conn_1', from: 'input_1', to: 'merge_1', type: 'data' },
          { id: 'conn_2', from: 'input_2', to: 'merge_1', type: 'data' },
          { id: 'conn_3', from: 'input_3', to: 'merge_1', type: 'data' },
          { id: 'conn_4', from: 'merge_1', to: 'llm_1', type: 'data' },
          { id: 'conn_5', from: 'llm_1', to: 'output_1', type: 'data' }
        ]
      },

      // テキスト変換チェーン
      textTransform: {
        name: 'テキスト変換チェーン',
        description: '複数の変換処理を連鎖させるワークフロー',
        icon: 'fas fa-exchange-alt',
        category: '基本',
        nodes: [
          {
            id: 'input_1',
            type: 'input',
            x: 50,
            y: 250,
            data: {
              name: '入力テキスト',
              description: '変換するテキスト',
              inputType: 'text',
              defaultValue: ''
            }
          },
          {
            id: 'transform_1',
            type: 'transform',
            x: 250,
            y: 250,
            data: {
              name: '小文字変換',
              description: 'すべて小文字に変換',
              transformType: 'custom',
              transformFunction: 'return input.toLowerCase();'
            }
          },
          {
            id: 'transform_2',
            type: 'transform',
            x: 450,
            y: 250,
            data: {
              name: 'スペース削除',
              description: 'スペースをアンダースコアに',
              transformType: 'custom',
              transformFunction: 'return input.replace(/ /g, "_");'
            }
          },
          {
            id: 'transform_3',
            type: 'transform',
            x: 650,
            y: 250,
            data: {
              name: '特殊文字削除',
              description: '英数字とアンダースコアのみ',
              transformType: 'custom',
              transformFunction: 'return input.replace(/[^a-z0-9_]/g, "");'
            }
          },
          {
            id: 'output_1',
            type: 'output',
            x: 850,
            y: 250,
            data: {
              name: 'スラッグ',
              description: 'URL用スラッグ',
              outputFormat: 'text'
            }
          }
        ],
        connections: [
          { id: 'conn_1', from: 'input_1', to: 'transform_1', type: 'data' },
          { id: 'conn_2', from: 'transform_1', to: 'transform_2', type: 'data' },
          { id: 'conn_3', from: 'transform_2', to: 'transform_3', type: 'data' },
          { id: 'conn_4', from: 'transform_3', to: 'output_1', type: 'data' }
        ]
      }
    };
  }

  /**
   * すべてのテンプレートを取得
   */
  getAllTemplates() {
    return Object.entries(this.templates).map(([key, template]) => ({
      key,
      ...template
    }));
  }

  /**
   * カテゴリ別にテンプレートを取得
   */
  getTemplatesByCategory() {
    const categories = {};
    
    Object.entries(this.templates).forEach(([key, template]) => {
      const category = template.category || 'その他';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push({
        key,
        ...template
      });
    });
    
    return categories;
  }

  /**
   * 特定のテンプレートを取得
   */
  getTemplate(key) {
    return this.templates[key] || null;
  }

  /**
   * テンプレートをワークフローに適用
   * @param {string} templateKey - テンプレートのキー
   * @param {Object} nodeManager - ノードマネージャー
   * @param {Object} connectionManager - 接続マネージャー
   */
  applyTemplate(templateKey, nodeManager, connectionManager) {
    const template = this.getTemplate(templateKey);
    if (!template) {
      throw new Error(`テンプレート '${templateKey}' が見つかりません`);
    }

    // 既存のワークフローをクリア
    nodeManager.clearAllNodes();
    connectionManager.clearAllConnections();

    // 新しいノードIDマッピング（テンプレートのIDを実際のIDにマップ）
    const nodeIdMap = {};

    // ノードを作成
    template.nodes.forEach(nodeData => {
      const node = nodeManager.createNode(nodeData.type, nodeData.x, nodeData.y);
      nodeIdMap[nodeData.id] = node.id;
      
      // ノードデータを更新
      nodeManager.updateNodeData(node.id, nodeData.data);
    });

    // 接続を作成（少し遅延させてDOMが準備できるのを待つ）
    setTimeout(() => {
      template.connections.forEach(connData => {
        const fromId = nodeIdMap[connData.from];
        const toId = nodeIdMap[connData.to];
        
        if (fromId && toId) {
          connectionManager.createConnection(fromId, toId);
        }
      });
    }, 100);

    return {
      nodeCount: template.nodes.length,
      connectionCount: template.connections.length
    };
  }
}

// グローバルに公開
if (typeof window !== 'undefined') {
  window.WorkflowTemplates = WorkflowTemplates;
}