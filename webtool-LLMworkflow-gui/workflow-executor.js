class WorkflowExecutor {
  constructor() {
    this.isExecuting = false;
    this.executionResults = new Map();
    this.executionLog = [];
  }

  validateLLMAPIAvailability() {
    if (!window.llmAPI || typeof window.llmAPI.generateText !== 'function') {
      throw new Error('LLM API が利用できません。API設定を確認してください。');
    }
  }

  async executeWorkflow(nodeManager, connectionManager, inputData = {}) {
    if (this.isExecuting) {
      throw new Error('ワークフローは既に実行中です');
    }

    // LLM API可用性チェック
    this.validateLLMAPIAvailability();

    this.isExecuting = true;
    this.executionResults.clear();
    this.executionLog = [];

    try {
      this.log('ワークフロー実行開始');
      
      // 入力データを設定
      const inputNodes = nodeManager.getAllNodes().filter(node => node.type === 'input');
      for (const inputNode of inputNodes) {
        const inputKey = inputNode.data.name || inputNode.id;
        // 空文字列や undefined/null の場合はdefaultValueを使用
        const providedValue = inputData[inputKey];
        const value = (providedValue !== undefined && providedValue !== null && providedValue !== '') 
          ? providedValue 
          : (inputNode.data.defaultValue || '');
        this.executionResults.set(inputNode.id, value);
        this.log(`入力ノード ${inputNode.id}: ${JSON.stringify(value)}`);
      }
      
      // 並列実行可能なノードグループを計算
      const executionGroups = this.calculateParallelExecutionGroups(nodeManager, connectionManager);
      this.log(`並列実行グループ: ${executionGroups.map(group => group.join(', ')).join(' | ')}`);
      
      // グループごとに実行（グループ内は並列、グループ間は逐次）
      for (const [groupIndex, nodeGroup] of executionGroups.entries()) {
        this.log(`グループ ${groupIndex + 1} 実行開始: [${nodeGroup.join(', ')}]`);
        
        if (nodeGroup.length === 1) {
          // 単一ノードは通常実行
          const nodeId = nodeGroup[0];
          const node = nodeManager.getNode(nodeId);
          if (node) {
            this.log(`${node.type}ノード ${nodeId} を実行中...`);
            try {
              const result = await this.executeNode(node, nodeManager, connectionManager);
              this.executionResults.set(nodeId, result);
              this.log(`${nodeId} 完了: ${JSON.stringify(result).substring(0, 100)}...`);
            } catch (error) {
              this.log(`${nodeId} でエラー: ${error.message}`);
              throw error;
            }
          }
        } else {
          // 複数ノードは並列実行
          this.log(`並列実行開始: ${nodeGroup.length}ノード同時処理`);
          const startTime = Date.now();
          
          const parallelPromises = nodeGroup.map(async (nodeId) => {
            const node = nodeManager.getNode(nodeId);
            if (!node) return { nodeId, error: 'ノードが見つかりません' };
            
            this.log(`${node.type}ノード ${nodeId} を並列実行中...`);
            
            try {
              const result = await this.executeNode(node, nodeManager, connectionManager);
              const duration = ((Date.now() - startTime) / 1000).toFixed(1);
              this.log(`${nodeId} 並列完了 (${duration}秒): ${JSON.stringify(result).substring(0, 100)}...`);
              return { nodeId, result };
            } catch (error) {
              this.log(`${nodeId} 並列エラー: ${error.message}`);
              return { nodeId, error: error.message };
            }
          });
          
          const parallelResults = await Promise.all(parallelPromises);
          const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
          this.log(`並列実行完了: ${nodeGroup.length}ノード (総時間: ${totalDuration}秒)`);
          
          // 結果を格納
          for (const { nodeId, result, error } of parallelResults) {
            if (error) {
              throw new Error(`ノード ${nodeId}: ${error}`);
            }
            this.executionResults.set(nodeId, result);
          }
        }
      }
      
      // 最終結果を取得
      const outputNodes = nodeManager.getAllNodes().filter(node => node.type === 'output');
      const finalResults = {};
      
      for (const outputNode of outputNodes) {
        const result = this.executionResults.get(outputNode.id);
        finalResults[outputNode.data.name || outputNode.id] = result;
      }
      
      this.log('ワークフロー実行完了');
      return {
        success: true,
        results: finalResults,
        log: this.executionLog
      };
      
    } catch (error) {
      this.log(`実行エラー: ${error.message}`);
      return {
        success: false,
        error: error.message,
        log: this.executionLog
      };
    } finally {
      this.isExecuting = false;
    }
  }

  async executeNode(node, nodeManager, connectionManager) {
    switch (node.type) {
      case 'input':
        return this.executionResults.get(node.id) || node.data.defaultValue || '';
        
      case 'llm':
        return await this.executeLLMNode(node, connectionManager);
        
      case 'branch':
        return this.executeBranchNode(node, connectionManager);
        
      case 'merge':
        return this.executeMergeNode(node, connectionManager);
        
      case 'transform':
        return this.executeTransformNode(node, connectionManager);
        
      case 'filter':
        return this.executeFilterNode(node, connectionManager);
        
      case 'sort':
        return this.executeSortNode(node, connectionManager);
        
      case 'aggregate':
        return this.executeAggregateNode(node, connectionManager);
        
      case 'split':
        return this.executeSplitNode(node, connectionManager);
        
      case 'output':
        return this.executeOutputNode(node, connectionManager);
        
      default:
        throw new Error(`未対応のノードタイプ: ${node.type}`);
    }
  }

  async executeLLMNode(node, connectionManager) {
    const inputs = this.getNodeInputs(node.id, connectionManager);
    const inputText = Array.isArray(inputs) ? inputs.join('\n') : (inputs || '');
    
    // 入力が空の場合の処理
    if (!inputText || inputText.trim() === '') {
      throw new Error(`LLMノード ${node.id} への入力が空です。入力ノードまたは前段のノードの出力を確認してください。`);
    }
    
    // プロンプトの変数置換
    let prompt = node.data.prompt || '';
    prompt = prompt.replace(/\{input\}/g, inputText);
    
    this.log(`LLMノード ${node.id} プロンプト: ${prompt.substring(0, 100)}...`);
    
    try {
      // window.llmAPI の存在確認
      if (!window.llmAPI) {
        throw new Error('LLM API が初期化されていません');
      }
      
      // LLM API呼び出し
      const response = await window.llmAPI.generateText(prompt, {
        temperature: node.data.temperature || 0.7,
        max_tokens: node.data.maxTokens || 2000
      });
      
      // レスポンスの検証
      if (!response || (typeof response === 'string' && response.trim() === '')) {
        throw new Error('LLM APIから空のレスポンスが返されました');
      }
      
      return response;
    } catch (error) {
      console.error('LLM処理エラー:', error);
      this.log(`LLMノード ${node.id} エラー: ${error.message}`);
      throw new Error(`LLM処理エラー: ${error.message}`);
    }
  }

  executeBranchNode(node, connectionManager) {
    const inputs = this.getNodeInputs(node.id, connectionManager);
    const input = Array.isArray(inputs) ? inputs[0] : inputs;
    
    try {
      // 条件式を評価
      const condition = node.data.condition || 'true';
      const evalFunction = new Function('input', `return ${condition}`);
      const result = evalFunction(input);
      
      return result ? (node.data.trueOutput || 'true') : (node.data.falseOutput || 'false');
    } catch (error) {
      throw new Error(`分岐条件評価エラー: ${error.message}`);
    }
  }

  executeMergeNode(node, connectionManager) {
    const inputs = this.getNodeInputs(node.id, connectionManager);
    
    if (!Array.isArray(inputs) || inputs.length === 0) {
      return '';
    }
    
    switch (node.data.mergeType) {
      case 'concat':
        const separator = node.data.separator || '\n\n---\n\n';
        return inputs.join(separator);
        
      case 'array':
        return inputs;
        
      case 'object':
        const result = {};
        inputs.forEach((input, index) => {
          result[`input_${index}`] = input;
        });
        return result;
        
      default:
        return inputs.join('\n');
    }
  }

  executeTransformNode(node, connectionManager) {
    const inputs = this.getNodeInputs(node.id, connectionManager);
    const input = Array.isArray(inputs) ? inputs[0] : inputs;
    
    try {
      switch (node.data.transformType) {
        case 'text':
          // 基本的なテキスト変換
          return input?.toString() || '';
          
        case 'json':
          try {
            return JSON.stringify(input, null, 2);
          } catch {
            return input?.toString() || '';
          }
          
        case 'custom':
          const transformFunction = node.data.transformFunction || 'return input;';
          const evalFunction = new Function('input', transformFunction);
          return evalFunction(input);
          
        default:
          return input;
      }
    } catch (error) {
      throw new Error(`変換処理エラー: ${error.message}`);
    }
  }

  executeFilterNode(node, connectionManager) {
    const inputs = this.getNodeInputs(node.id, connectionManager);
    let input = Array.isArray(inputs) ? inputs[0] : inputs;
    
    // 配列でない場合は文字列として扱い、行で分割
    if (!Array.isArray(input)) {
      input = input?.toString().split('\n') || [];
    }
    
    try {
      switch (node.data.filterType) {
        case 'condition':
          const condition = node.data.condition || 'return true;';
          const evalFunction = new Function('input', condition);
          return input.filter(item => evalFunction(item));
          
        case 'regex':
          const pattern = new RegExp(node.data.pattern || '.*');
          return input.filter(item => pattern.test(item?.toString() || ''));
          
        case 'length':
          const minLength = parseInt(node.data.minLength) || 0;
          const maxLength = parseInt(node.data.maxLength) || Infinity;
          return input.filter(item => {
            const len = item?.toString().length || 0;
            return len >= minLength && len <= maxLength;
          });
          
        default:
          return input;
      }
    } catch (error) {
      throw new Error(`フィルタ処理エラー: ${error.message}`);
    }
  }

  executeSortNode(node, connectionManager) {
    const inputs = this.getNodeInputs(node.id, connectionManager);
    let input = Array.isArray(inputs) ? inputs[0] : inputs;
    
    // 配列でない場合は文字列として扱い、行で分割
    if (!Array.isArray(input)) {
      input = input?.toString().split('\n') || [];
    }
    
    try {
      const sortOrder = node.data.sortOrder === 'desc' ? -1 : 1;
      
      switch (node.data.sortType) {
        case 'alphabetical':
          return input.sort((a, b) => (a?.toString() || '').localeCompare(b?.toString() || '') * sortOrder);
          
        case 'numerical':
          return input.sort((a, b) => (parseFloat(a) - parseFloat(b)) * sortOrder);
          
        case 'length':
          return input.sort((a, b) => ((a?.toString().length || 0) - (b?.toString().length || 0)) * sortOrder);
          
        case 'custom':
          const sortKey = node.data.sortKey || '';
          if (sortKey) {
            return input.sort((a, b) => {
              const aVal = a?.[sortKey] || a;
              const bVal = b?.[sortKey] || b;
              return (aVal?.toString() || '').localeCompare(bVal?.toString() || '') * sortOrder;
            });
          }
          return input;
          
        default:
          return input;
      }
    } catch (error) {
      throw new Error(`ソート処理エラー: ${error.message}`);
    }
  }

  executeAggregateNode(node, connectionManager) {
    const inputs = this.getNodeInputs(node.id, connectionManager);
    let input = Array.isArray(inputs) ? inputs[0] : inputs;
    
    if (!Array.isArray(input)) {
      input = input?.toString().split('\n') || [];
    }
    
    try {
      switch (node.data.aggregateType) {
        case 'count':
          return input.length;
          
        case 'sum':
          return input.reduce((sum, item) => sum + (parseFloat(item) || 0), 0);
          
        case 'average':
          const numbers = input.map(item => parseFloat(item) || 0);
          return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
          
        case 'group':
          const groupBy = node.data.groupBy || '';
          if (!groupBy) return input;
          
          const groups = {};
          input.forEach(item => {
            const key = item?.[groupBy] || 'undefined';
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
          });
          return groups;
          
        default:
          return input;
      }
    } catch (error) {
      throw new Error(`集約処理エラー: ${error.message}`);
    }
  }

  executeSplitNode(node, connectionManager) {
    const inputs = this.getNodeInputs(node.id, connectionManager);
    const input = Array.isArray(inputs) ? inputs[0] : inputs;
    const inputText = input?.toString() || '';
    
    try {
      switch (node.data.splitType) {
        case 'delimiter':
          const delimiter = node.data.delimiter || ',';
          return inputText.split(delimiter).map(item => item.trim());
          
        case 'chunk':
          const chunkSize = parseInt(node.data.chunkSize) || 100;
          const chunks = [];
          for (let i = 0; i < inputText.length; i += chunkSize) {
            chunks.push(inputText.substring(i, i + chunkSize));
          }
          return chunks;
          
        case 'lines':
          return inputText.split('\n');
          
        default:
          return [inputText];
      }
    } catch (error) {
      throw new Error(`分割処理エラー: ${error.message}`);
    }
  }

  executeOutputNode(node, connectionManager) {
    const inputs = this.getNodeInputs(node.id, connectionManager);
    const input = Array.isArray(inputs) ? inputs[0] : inputs;
    
    switch (node.data.outputFormat) {
      case 'json':
        try {
          return JSON.stringify(input, null, 2);
        } catch {
          return input?.toString() || '';
        }
        
      case 'html':
        return `<pre>${this.escapeHtml(input?.toString() || '')}</pre>`;
        
      case 'markdown':
        return `\`\`\`\n${input?.toString() || ''}\n\`\`\``;
        
      case 'text':
      default:
        return input?.toString() || '';
    }
  }

  getNodeInputs(nodeId, connectionManager) {
    const inputConnections = connectionManager.getConnectionsToNode(nodeId);
    
    if (inputConnections.length === 0) {
      return '';
    }
    
    if (inputConnections.length === 1) {
      return this.executionResults.get(inputConnections[0].from);
    }
    
    // 複数の入力がある場合は配列として返す
    return inputConnections.map(conn => this.executionResults.get(conn.from));
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    this.executionLog.push(logEntry);
    console.log(logEntry);
  }

  getExecutionResults() {
    return new Map(this.executionResults);
  }

  getExecutionLog() {
    return [...this.executionLog];
  }

  isCurrentlyExecuting() {
    return this.isExecuting;
  }

  /**
   * 並列実行可能なノードグループを計算
   * 同じ依存レベルのノードを同じグループにまとめる
   */
  calculateParallelExecutionGroups(nodeManager, connectionManager) {
    const allNodes = nodeManager.getAllNodes();
    const allConnections = connectionManager.getAllConnections();
    
    // ノードの依存関係を計算
    const dependencyLevels = new Map();
    const processed = new Set();
    
    // 入力ノードは依存レベル0
    allNodes.filter(node => node.type === 'input').forEach(node => {
      dependencyLevels.set(node.id, 0);
      processed.add(node.id);
    });
    
    // 依存レベルを段階的に計算
    let currentLevel = 0;
    let foundNodesInLevel = true;
    
    while (foundNodesInLevel && currentLevel < 20) { // 無限ループ防止
      foundNodesInLevel = false;
      
      for (const node of allNodes) {
        if (processed.has(node.id)) continue;
        
        // このノードへの入力接続を確認
        const inputConnections = allConnections.filter(conn => conn.to === node.id);
        
        if (inputConnections.length === 0) {
          // 入力接続がないノード（孤立ノード）
          dependencyLevels.set(node.id, currentLevel + 1);
          processed.add(node.id);
          foundNodesInLevel = true;
        } else {
          // 全ての依存ノードが処理済みかチェック
          const allDependenciesProcessed = inputConnections.every(conn => 
            processed.has(conn.from)
          );
          
          if (allDependenciesProcessed) {
            // 依存ノードの最大レベル + 1
            const maxDependencyLevel = Math.max(
              ...inputConnections.map(conn => dependencyLevels.get(conn.from) || 0)
            );
            dependencyLevels.set(node.id, maxDependencyLevel + 1);
            processed.add(node.id);
            foundNodesInLevel = true;
          }
        }
      }
      
      currentLevel++;
    }
    
    // レベル別にグループ化
    const levelGroups = new Map();
    for (const [nodeId, level] of dependencyLevels) {
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level).push(nodeId);
    }
    
    // レベル順にソートして配列として返す
    const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b);
    return sortedLevels.map(level => levelGroups.get(level));
  }
} 