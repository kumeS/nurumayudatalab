/**
 * ワークフローからJavaScriptコードを生成するモジュール
 * ワークフローのノードと接続情報を解析し、実行可能なJSコードを出力
 */
class CodeGenerator {
  constructor() {
    this.indentLevel = 0;
    this.indentSize = 2;
  }

  /**
   * ワークフローからJavaScriptコードを生成
   * @param {Array} nodes - ノードの配列
   * @param {Array} connections - 接続情報の配列
   * @returns {string} 生成されたJavaScriptコード
   */
  generateCode(nodes, connections) {
    // ノードマップを作成（高速検索用）
    const nodeMap = new Map();
    nodes.forEach(node => nodeMap.set(node.id, node));

    // 実行順序を計算（トポロジカルソート）
    const executionOrder = this.calculateExecutionOrder(nodes, connections);
    
    // コード生成開始
    let code = this.generateHeader();
    code += this.generateHelperFunctions();
    code += this.generateWorkflowFunction(nodes, connections, executionOrder, nodeMap);
    code += this.generateExampleUsage();

    return code;
  }

  /**
   * ヘッダーコメントを生成
   */
  generateHeader() {
    return `/**
 * 自動生成されたワークフローコード
 * 生成日時: ${new Date().toISOString()}
 * 
 * このコードはLLMワークフローエディターによって自動生成されました。
 * 必要に応じて編集・カスタマイズしてください。
 */

`;
  }

  /**
   * ヘルパー関数を生成
   */
  generateHelperFunctions() {
    return `// ヘルパー関数定義
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// LLM API呼び出し関数（カスタマイズ可能）
async function callLLM(prompt, options = {}) {
  const apiUrl = 'https://api.example.com/llm'; // APIエンドポイントを設定
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${process.env.API_KEY || ''}\`
      },
      body: JSON.stringify({
        prompt: prompt,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000,
        ...options
      })
    });
    
    if (!response.ok) {
      throw new Error(\`API Error: \${response.status}\`);
    }
    
    const data = await response.json();
    return data.content || data.text || data.result;
  } catch (error) {
    console.error('LLM API呼び出しエラー:', error);
    throw error;
  }
}

// 結果マージ関数
function mergeResults(results, mergeType = 'concat', separator = '\\n\\n---\\n\\n') {
  if (!Array.isArray(results) || results.length === 0) return '';
  
  switch (mergeType) {
    case 'concat':
      return results.join(separator);
    case 'array':
      return results;
    case 'object':
      const merged = {};
      results.forEach((result, index) => {
        merged[\`input_\${index}\`] = result;
      });
      return merged;
    default:
      return results.join('\\n');
  }
}

// 条件評価関数
function evaluateCondition(input, condition) {
  try {
    const evalFunc = new Function('input', \`return \${condition}\`);
    return evalFunc(input);
  } catch (error) {
    console.error('条件評価エラー:', error);
    return false;
  }
}

`;
  }

  /**
   * メインのワークフロー関数を生成
   */
  generateWorkflowFunction(nodes, connections, executionOrder, nodeMap) {
    let code = '// メインワークフロー関数\n';
    code += 'async function executeWorkflow(initialInput = {}) {\n';
    this.indentLevel++;
    
    code += this.indent('const results = {};\n');
    code += this.indent('const executionLog = [];\n\n');
    
    code += this.indent('try {\n');
    this.indentLevel++;
    
    // 各ノードの処理を生成
    executionOrder.forEach(nodeId => {
      const node = nodeMap.get(nodeId);
      if (node) {
        code += this.generateNodeExecution(node, connections);
      }
    });
    
    // 最終結果の収集
    code += '\n' + this.indent('// 最終結果を収集\n');
    code += this.indent('const outputNodes = ' + 
      JSON.stringify(nodes.filter(n => n.type === 'output').map(n => n.id)) + ';\n');
    code += this.indent('const finalResults = {};\n');
    code += this.indent('outputNodes.forEach(nodeId => {\n');
    this.indentLevel++;
    code += this.indent('if (results[nodeId] !== undefined) {\n');
    this.indentLevel++;
    code += this.indent('finalResults[nodeId] = results[nodeId];\n');
    this.indentLevel--;
    code += this.indent('}\n');
    this.indentLevel--;
    code += this.indent('});\n\n');
    
    code += this.indent('return {\n');
    this.indentLevel++;
    code += this.indent('success: true,\n');
    code += this.indent('results: finalResults,\n');
    code += this.indent('allResults: results,\n');
    code += this.indent('executionLog: executionLog\n');
    this.indentLevel--;
    code += this.indent('};\n');
    
    this.indentLevel--;
    code += this.indent('} catch (error) {\n');
    this.indentLevel++;
    code += this.indent('console.error("ワークフロー実行エラー:", error);\n');
    code += this.indent('return {\n');
    this.indentLevel++;
    code += this.indent('success: false,\n');
    code += this.indent('error: error.message,\n');
    code += this.indent('results: results,\n');
    code += this.indent('executionLog: executionLog\n');
    this.indentLevel--;
    code += this.indent('};\n');
    this.indentLevel--;
    code += this.indent('}\n');
    
    this.indentLevel--;
    code += '}\n\n';
    
    return code;
  }

  /**
   * 各ノードタイプの実行コードを生成
   */
  generateNodeExecution(node, connections) {
    let code = this.indent(`// ${node.data.name || node.type}ノード (${node.id})\n`);
    code += this.indent(`executionLog.push('実行中: ${node.id}');\n`);
    
    // 入力データの取得
    const inputConnections = connections.filter(c => c.to === node.id);
    if (inputConnections.length > 0) {
      if (inputConnections.length === 1) {
        code += this.indent(`const ${node.id}_input = results['${inputConnections[0].from}'];\n`);
      } else {
        code += this.indent(`const ${node.id}_inputs = [${inputConnections.map(c => `results['${c.from}']`).join(', ')}];\n`);
      }
    }
    
    // ノードタイプ別の処理
    switch (node.type) {
      case 'input':
        code += this.generateInputNode(node);
        break;
      case 'llm':
        code += this.generateLLMNode(node, inputConnections);
        break;
      case 'branch':
        code += this.generateBranchNode(node, inputConnections);
        break;
      case 'merge':
        code += this.generateMergeNode(node, inputConnections);
        break;
      case 'transform':
        code += this.generateTransformNode(node, inputConnections);
        break;
      case 'filter':
        code += this.generateFilterNode(node, inputConnections);
        break;
      case 'sort':
        code += this.generateSortNode(node, inputConnections);
        break;
      case 'aggregate':
        code += this.generateAggregateNode(node, inputConnections);
        break;
      case 'split':
        code += this.generateSplitNode(node, inputConnections);
        break;
      case 'output':
        code += this.generateOutputNode(node, inputConnections);
        break;
      default:
        code += this.indent(`results['${node.id}'] = null; // 未対応のノードタイプ\n`);
    }
    
    code += '\n';
    return code;
  }

  // 各ノードタイプのコード生成メソッド
  generateInputNode(node) {
    const defaultValue = JSON.stringify(node.data.defaultValue || '');
    return this.indent(`results['${node.id}'] = initialInput['${node.data.name || node.id}'] || ${defaultValue};\n`);
  }

  generateLLMNode(node, inputConnections) {
    let code = '';
    const inputVar = inputConnections.length === 1 ? `${node.id}_input` : `${node.id}_inputs.join('\\n')`;
    
    // プロンプトの準備
    const prompt = node.data.prompt || '';
    code += this.indent(`const ${node.id}_prompt = \`${prompt.replace(/`/g, '\\`')}\`.replace(/\\{input\\}/g, ${inputVar});\n`);
    
    // LLM呼び出し
    code += this.indent(`results['${node.id}'] = await callLLM(${node.id}_prompt, {\n`);
    this.indentLevel++;
    code += this.indent(`temperature: ${node.data.temperature || 0.7},\n`);
    code += this.indent(`maxTokens: ${node.data.maxTokens || 2000}\n`);
    this.indentLevel--;
    code += this.indent('});\n');
    
    return code;
  }

  generateBranchNode(node, inputConnections) {
    let code = '';
    const inputVar = inputConnections.length === 1 ? `${node.id}_input` : `${node.id}_inputs[0]`;
    const condition = node.data.condition || 'true';
    
    code += this.indent(`const ${node.id}_condition = evaluateCondition(${inputVar}, '${condition.replace(/'/g, "\\'")}');\n`);
    code += this.indent(`results['${node.id}'] = ${node.id}_condition ? '${node.data.trueOutput || 'true'}' : '${node.data.falseOutput || 'false'}';\n`);
    
    return code;
  }

  generateMergeNode(node, inputConnections) {
    if (inputConnections.length === 0) {
      return this.indent(`results['${node.id}'] = '';\n`);
    }
    
    const inputsVar = `${node.id}_inputs`;
    const mergeType = JSON.stringify(node.data.mergeType || 'concat');
    const separator = JSON.stringify(node.data.separator || '\n\n---\n\n');
    
    return this.indent(`results['${node.id}'] = mergeResults(${inputsVar}, ${mergeType}, ${separator});\n`);
  }

  generateTransformNode(node, inputConnections) {
    let code = '';
    const inputVar = inputConnections.length === 1 ? `${node.id}_input` : `${node.id}_inputs[0]`;
    
    switch (node.data.transformType) {
      case 'text':
        code += this.indent(`results['${node.id}'] = String(${inputVar} || '');\n`);
        break;
      case 'json':
        code += this.indent(`try {\n`);
        this.indentLevel++;
        code += this.indent(`results['${node.id}'] = JSON.stringify(${inputVar}, null, 2);\n`);
        this.indentLevel--;
        code += this.indent(`} catch (e) {\n`);
        this.indentLevel++;
        code += this.indent(`results['${node.id}'] = String(${inputVar} || '');\n`);
        this.indentLevel--;
        code += this.indent(`}\n`);
        break;
      case 'custom':
        const transformFunc = node.data.transformFunction || 'return input;';
        code += this.indent(`results['${node.id}'] = ((input) => {\n`);
        this.indentLevel++;
        code += this.indent(`${transformFunc}\n`);
        this.indentLevel--;
        code += this.indent(`})(${inputVar});\n`);
        break;
      default:
        code += this.indent(`results['${node.id}'] = ${inputVar};\n`);
    }
    
    return code;
  }

  generateFilterNode(node, inputConnections) {
    let code = '';
    const inputVar = inputConnections.length === 1 ? `${node.id}_input` : `${node.id}_inputs[0]`;
    
    code += this.indent(`let ${node.id}_array = Array.isArray(${inputVar}) ? ${inputVar} : String(${inputVar} || '').split('\\n');\n`);
    
    switch (node.data.filterType) {
      case 'condition':
        const condition = node.data.condition || 'return true;';
        code += this.indent(`results['${node.id}'] = ${node.id}_array.filter((input) => {\n`);
        this.indentLevel++;
        code += this.indent(`${condition}\n`);
        this.indentLevel--;
        code += this.indent('});\n');
        break;
      case 'regex':
        const pattern = node.data.pattern || '.*';
        code += this.indent(`const ${node.id}_pattern = new RegExp('${pattern.replace(/'/g, "\\'")}');\n`);
        code += this.indent(`results['${node.id}'] = ${node.id}_array.filter(item => ${node.id}_pattern.test(String(item)));\n`);
        break;
      default:
        code += this.indent(`results['${node.id}'] = ${node.id}_array;\n`);
    }
    
    return code;
  }

  generateSortNode(node, inputConnections) {
    let code = '';
    const inputVar = inputConnections.length === 1 ? `${node.id}_input` : `${node.id}_inputs[0]`;
    
    code += this.indent(`let ${node.id}_array = Array.isArray(${inputVar}) ? [...${inputVar}] : String(${inputVar} || '').split('\\n');\n`);
    
    const sortOrder = node.data.sortOrder === 'desc' ? -1 : 1;
    
    switch (node.data.sortType) {
      case 'alphabetical':
        code += this.indent(`results['${node.id}'] = ${node.id}_array.sort((a, b) => String(a).localeCompare(String(b)) * ${sortOrder});\n`);
        break;
      case 'numerical':
        code += this.indent(`results['${node.id}'] = ${node.id}_array.sort((a, b) => (parseFloat(a) - parseFloat(b)) * ${sortOrder});\n`);
        break;
      case 'length':
        code += this.indent(`results['${node.id}'] = ${node.id}_array.sort((a, b) => (String(a).length - String(b).length) * ${sortOrder});\n`);
        break;
      default:
        code += this.indent(`results['${node.id}'] = ${node.id}_array;\n`);
    }
    
    return code;
  }

  generateAggregateNode(node, inputConnections) {
    let code = '';
    const inputVar = inputConnections.length === 1 ? `${node.id}_input` : `${node.id}_inputs[0]`;
    
    code += this.indent(`let ${node.id}_array = Array.isArray(${inputVar}) ? ${inputVar} : String(${inputVar} || '').split('\\n');\n`);
    
    switch (node.data.aggregateType) {
      case 'count':
        code += this.indent(`results['${node.id}'] = ${node.id}_array.length;\n`);
        break;
      case 'sum':
        code += this.indent(`results['${node.id}'] = ${node.id}_array.reduce((sum, item) => sum + (parseFloat(item) || 0), 0);\n`);
        break;
      case 'average':
        code += this.indent(`const ${node.id}_numbers = ${node.id}_array.map(item => parseFloat(item) || 0);\n`);
        code += this.indent(`results['${node.id}'] = ${node.id}_numbers.reduce((sum, num) => sum + num, 0) / ${node.id}_numbers.length;\n`);
        break;
      default:
        code += this.indent(`results['${node.id}'] = ${node.id}_array;\n`);
    }
    
    return code;
  }

  generateSplitNode(node, inputConnections) {
    let code = '';
    const inputVar = inputConnections.length === 1 ? `${node.id}_input` : `${node.id}_inputs[0]`;
    
    code += this.indent(`const ${node.id}_text = String(${inputVar} || '');\n`);
    
    switch (node.data.splitType) {
      case 'delimiter':
        const delimiter = node.data.delimiter || ',';
        code += this.indent(`results['${node.id}'] = ${node.id}_text.split('${delimiter.replace(/'/g, "\\'")}').map(item => item.trim());\n`);
        break;
      case 'chunk':
        const chunkSize = node.data.chunkSize || 100;
        code += this.indent(`const ${node.id}_chunks = [];\n`);
        code += this.indent(`for (let i = 0; i < ${node.id}_text.length; i += ${chunkSize}) {\n`);
        this.indentLevel++;
        code += this.indent(`${node.id}_chunks.push(${node.id}_text.substring(i, i + ${chunkSize}));\n`);
        this.indentLevel--;
        code += this.indent('}\n');
        code += this.indent(`results['${node.id}'] = ${node.id}_chunks;\n`);
        break;
      case 'lines':
        code += this.indent(`results['${node.id}'] = ${node.id}_text.split('\\n');\n`);
        break;
      default:
        code += this.indent(`results['${node.id}'] = [${node.id}_text];\n`);
    }
    
    return code;
  }

  generateOutputNode(node, inputConnections) {
    let code = '';
    const inputVar = inputConnections.length === 1 ? `${node.id}_input` : `${node.id}_inputs[0]`;
    
    switch (node.data.outputFormat) {
      case 'json':
        code += this.indent(`try {\n`);
        this.indentLevel++;
        code += this.indent(`results['${node.id}'] = JSON.stringify(${inputVar}, null, 2);\n`);
        this.indentLevel--;
        code += this.indent(`} catch (e) {\n`);
        this.indentLevel++;
        code += this.indent(`results['${node.id}'] = String(${inputVar} || '');\n`);
        this.indentLevel--;
        code += this.indent(`}\n`);
        break;
      case 'html':
        code += this.indent(`results['${node.id}'] = '<pre>' + String(${inputVar} || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre>';\n`);
        break;
      case 'markdown':
        code += this.indent(`results['${node.id}'] = '\\`\\`\\`\\n' + String(${inputVar} || '') + '\\n\\`\\`\\`';\n`);
        break;
      default:
        code += this.indent(`results['${node.id}'] = String(${inputVar} || '');\n`);
    }
    
    return code;
  }

  /**
   * APIサーバーコードを生成（Express.js用）
   */
  generateAPIServerCode(nodes, connections) {
    const workflowCode = this.generateCode(nodes, connections);
    
    let serverCode = `/**
 * 自動生成されたAPIサーバーコード (Express.js)
 * 生成日時: ${new Date().toISOString()}
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// ワークフローコードをインポート
${workflowCode}

// Expressアプリケーション設定
const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア設定
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ワークフロー実行エンドポイント
app.post('/api/workflow/execute', async (req, res) => {
  try {
    const input = req.body.input || {};
    console.log('ワークフロー実行開始:', input);
    
    const result = await executeWorkflow(input);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.results,
        metadata: {
          executionTime: new Date().toISOString(),
          nodeCount: Object.keys(result.allResults || {}).length
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        executionLog: result.executionLog
      });
    }
  } catch (error) {
    console.error('APIエラー:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// ワークフロー情報エンドポイント
app.get('/api/workflow/info', (req, res) => {
  const nodes = ${JSON.stringify(nodes, null, 2)};
  const connections = ${JSON.stringify(connections, null, 2)};
  
  res.json({
    name: 'Auto-generated Workflow',
    nodeCount: nodes.length,
    connectionCount: connections.length,
    nodeTypes: [...new Set(nodes.map(n => n.type))],
    inputNodes: nodes.filter(n => n.type === 'input').map(n => ({
      id: n.id,
      name: n.data.name || n.id,
      description: n.data.description
    })),
    outputNodes: nodes.filter(n => n.type === 'output').map(n => ({
      id: n.id,
      name: n.data.name || n.id,
      description: n.data.description
    }))
  });
});

// OpenAPI仕様書エンドポイント
app.get('/api/openapi.json', (req, res) => {
  const openApiSpec = {
    openapi: '3.0.0',
    info: {
      title: 'Workflow API',
      version: '1.0.0',
      description: 'Auto-generated API for LLM Workflow'
    },
    servers: [
      {
        url: \`http://localhost:\${PORT}\`,
        description: 'Development server'
      }
    ],
    paths: {
      '/api/workflow/execute': {
        post: {
          summary: 'Execute workflow',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    input: {
                      type: 'object',
                      description: 'Input data for workflow'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Successful execution',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { type: 'object' },
                      metadata: { type: 'object' }
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Execution error'
            }
          }
        }
      },
      '/api/workflow/info': {
        get: {
          summary: 'Get workflow information',
          responses: {
            '200': {
              description: 'Workflow information',
              content: {
                'application/json': {
                  schema: {
                    type: 'object'
                  }
                }
              }
            }
          }
        }
      }
    }
  };
  
  res.json(openApiSpec);
});

// サーバー起動
app.listen(PORT, () => {
  console.log(\`APIサーバーが起動しました: http://localhost:\${PORT}\`);
  console.log(\`OpenAPI仕様書: http://localhost:\${PORT}/api/openapi.json\`);
});

// package.json も生成
const packageJson = {
  "name": "workflow-api-server",
  "version": "1.0.0",
  "description": "Auto-generated API server for LLM Workflow",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "body-parser": "^1.20.2",
    "dotenv": "^16.0.3"
  },
  "devDependencies": {
    "nodemon": "^2.0.22"
  }
};

// README.md も生成
const readme = \`# Workflow API Server

自動生成されたLLMワークフローAPIサーバー

## セットアップ

1. 依存関係をインストール
\\\`\\\`\\\`bash
npm install
\\\`\\\`\\\`

2. 環境変数を設定（必要に応じて）
\\\`\\\`\\\`bash
echo "API_KEY=your-api-key" > .env
\\\`\\\`\\\`

3. サーバーを起動
\\\`\\\`\\\`bash
npm start
\\\`\\\`\\\`

## APIエンドポイント

- POST /api/workflow/execute - ワークフローを実行
- GET /api/workflow/info - ワークフロー情報を取得
- GET /api/openapi.json - OpenAPI仕様書を取得

## 使用例

\\\`\\\`\\\`bash
curl -X POST http://localhost:3000/api/workflow/execute \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"input": {"key": "value"}}'
\\\`\\\`\\\`
\`;

console.log('\\n=== package.json ===');
console.log(JSON.stringify(packageJson, null, 2));
console.log('\\n=== README.md ===');
console.log(readme);
`;

    return serverCode;
  }

  /**
   * 使用例を生成
   */
  generateExampleUsage() {
    return `// 使用例
async function main() {
  try {
    // 初期入力データ
    const input = {
      // ここに入力データを設定
    };
    
    // ワークフロー実行
    const result = await executeWorkflow(input);
    
    if (result.success) {
      console.log('実行成功:', result.results);
    } else {
      console.error('実行失敗:', result.error);
    }
    
    // 実行ログ表示
    console.log('\\n実行ログ:');
    result.executionLog.forEach(log => console.log(log));
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

// Node.js環境での実行
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { executeWorkflow, main };
  
  // 直接実行された場合
  if (require.main === module) {
    main();
  }
}

// ブラウザ環境での実行
if (typeof window !== 'undefined') {
  window.executeWorkflow = executeWorkflow;
  
  // ページ読み込み後に実行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }
}
`;
  }

  /**
   * 実行順序を計算（トポロジカルソート）
   */
  calculateExecutionOrder(nodes, connections) {
    const visited = new Set();
    const visiting = new Set();
    const order = [];
    
    // 隣接リストを作成
    const adjacencyList = new Map();
    nodes.forEach(node => adjacencyList.set(node.id, []));
    connections.forEach(conn => {
      if (!adjacencyList.has(conn.from)) {
        adjacencyList.set(conn.from, []);
      }
      adjacencyList.get(conn.from).push(conn.to);
    });
    
    // DFSでトポロジカルソート
    const visit = (nodeId) => {
      if (visiting.has(nodeId)) {
        throw new Error(`循環依存が検出されました: ${nodeId}`);
      }
      if (visited.has(nodeId)) return;
      
      visiting.add(nodeId);
      
      // 依存先を先に訪問
      const dependencies = connections
        .filter(conn => conn.to === nodeId)
        .map(conn => conn.from);
      
      for (const depId of dependencies) {
        visit(depId);
      }
      
      visiting.delete(nodeId);
      visited.add(nodeId);
      order.push(nodeId);
    };
    
    // 全ノードを訪問
    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        visit(node.id);
      }
    });
    
    return order;
  }

  /**
   * インデント付き文字列を生成
   */
  indent(str) {
    return ' '.repeat(this.indentLevel * this.indentSize) + str;
  }
}

// グローバルに公開
if (typeof window !== 'undefined') {
  window.CodeGenerator = CodeGenerator;
}