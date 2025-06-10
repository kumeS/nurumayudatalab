/**
 * processing.js - 高度な処理フロー管理
 * 
 * 主な責務：
 * - 5段階処理フローの統括
 * - 仕様最適化と品質検証
 * - パーツベースモデル生成
 * - 物理的整合性チェック
 */

class ProcessingManager {
  constructor(assistant) {
    this.assistant = assistant;
    
    // 段階別データ保存用
    this.stage1Data = null;
    this.stage2Data = null;
    this.stage3Data = null;
    
    // 初期化時に古い表示エリアをクリーンアップ
    this.cleanupOldDisplayAreas();
    
    // API設定（AIManagerと共通）
    this.apiUrl = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
    this.modelName = "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8";
  }

  // ========== メインプロセス（3段階） ==========
  async executeFullProcess(prompt) {
    this.assistant.log('debug', 'executeFullProcess開始', { prompt: prompt.substring(0, 50) + '...' });
    
    // プロセス進行状況表示を開始
    this.assistant.showThreeStageProgress(true);
    this.assistant.showLoading(true, 'AI処理を開始しています...');
    
    try {
      this.assistant.log('debug', '第1段階開始: 仕様分析と最適化');
      
      // 第1段階: 仕様分析と最適化
      this.assistant.updateStageProgress(1, 'active', '仕様分析中...');
      const furnitureSpec = await this.analyzeAndOptimize(prompt);
      this.assistant.updateStageProgress(1, 'completed', '仕様分析完了');
      
      this.assistant.log('debug', '第2段階開始: 統合3Dモデル生成');
      
      // 第2段階: 統合3Dモデル生成
      this.assistant.updateStageProgress(2, 'active', '3Dモデル生成中...');
      const objData = await this.generateUnifiedModel(prompt, furnitureSpec);
      this.assistant.updateStageProgress(2, 'completed', '3Dモデル生成完了');
      
              this.assistant.log('debug', '第3段階開始: OBJデータ品質評価');
      
              // 第3段階: OBJデータ品質評価
              this.assistant.updateStageProgress(3, 'active', '品質評価中...');
      const qualityCheckResult = await this.performFinalQualityCheck(objData);
              this.assistant.updateStageProgress(3, 'completed', '品質評価完了');
      
      // 第3段階の品質評価レポートを取得（ログ・記録用）
      const qualityReport = qualityCheckResult.qualityReport;
      
      this.assistant.log('debug', '全3段階完了 - 結果処理開始', {
        stage2ObjLength: objData.length,
        stage3ReportLength: qualityReport.length
      });
      
      // 3Dプレビューには第2段階の結果を使用、ダウンロード・保存には第3段階の結果を使用
      this.assistant.currentObjData = objData; // 第2段階の結果を3Dプレビュー用に設定
      this.assistant.enableDownloadButtons();
      
      // 3Dプレビューの表示（第2段階の結果を使用）
      if (this.assistant.sceneManager && this.assistant.sceneManager.isInitialized) {
        try {
          await this.assistant.sceneManager.loadOBJModel(objData);
          this.assistant.log('info', 'SceneManagerで第2段階3Dモデル表示成功');
        } catch (error) {
          this.assistant.log('warn', 'SceneManager表示失敗、フォールバック実行', { error: error.message });
          // フォールバック: core.jsの3Dプレビュー
          if (!this.assistant.scene) {
            this.assistant.setup3DPreview();
          }
          this.assistant.display3DModel(objData);
        }
      } else {
        // core.jsの3Dプレビューを使用
        if (!this.assistant.scene) {
          this.assistant.setup3DPreview();
        }
        this.assistant.display3DModel(objData);
      }
      
      // UI表示
      this.storeOptimizedSpec(furnitureSpec, prompt);
      this.storeModelGenerationResults(objData, furnitureSpec);
      // 第3段階の品質評価結果を保存
      this.storeQualityCheckResults(qualityCheckResult, objData);
      
      // プロジェクト保存（第2段階の結果を保存、第3段階も記録）
      this.assistant.saveCurrentProject(prompt, objData, qualityCheckResult, furnitureSpec);
      
      this.assistant.showLoading(false);
      this.assistant.showSuccess('3Dモデルの生成が完了しました！');
      
      this.assistant.log('info', '3Dモデル生成プロセス完了');
      
    } catch (error) {
      this.assistant.log('error', 'executeFullProcessエラー', { error: error.message, stack: error.stack });
      
      // エラー時の進行状況更新
      this.assistant.updateStageProgress(1, 'error', 'エラー発生');
      this.assistant.updateStageProgress(2, 'error', 'エラー発生');
      this.assistant.updateStageProgress(3, 'error', 'エラー発生');
      
      this.assistant.showLoading(false);
      this.assistant.showError(`3Dモデル生成エラー: ${error.message}`);
      throw error;
    }
  }

  // ========== フォールバック処理 ==========
  async executeFallbackProcess(prompt, optimizedSpec) {
    // 削除：シンプルな処理フローに統一するため不要
  }

  // ========== OBJデータクリーニング ==========
  cleanOBJData(rawData) {
    this.assistant.log('debug', 'OBJデータクリーニング開始', { 
      dataLength: rawData?.length || 0,
      dataType: typeof rawData
    });

    if (!rawData || typeof rawData !== 'string') {
      this.assistant.log('warn', '無効なOBJデータ', { rawData });
      return '';
    }

    // マークダウンブロックを除去
    let cleaned = rawData
      .replace(/```obj\s*/gi, '')
      .replace(/```\s*/gi, '')
      .replace(/```/g, '')
      .replace(/^.*?(?=v\s|f\s|#)/m, ''); // 先頭の不要なテキストを除去

    const lines = cleaned.split('\n');
    const cleanedLines = [];
    let vertexCount = 0;
    let faceCount = 0;
    
    for (let line of lines) {
      const trimmed = line.trim();
      
      // 空行やコメント
      if (trimmed === '' || trimmed.startsWith('#')) {
        if (trimmed.startsWith('# ') && 
            (trimmed.includes('vertex') || trimmed.includes('face') || 
             trimmed.includes('object') || trimmed.includes('group'))) {
          cleanedLines.push(trimmed);
        }
        continue;
      }
      
      // 有効なOBJ要素
      if (trimmed.startsWith('v ')) {
        // 頂点データの検証
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 4) {
          const coords = parts.slice(1, 4).map(Number);
          if (!coords.some(isNaN)) {
            cleanedLines.push(trimmed);
            vertexCount++;
          }
        }
      } else if (trimmed.startsWith('f ')) {
        // 面データの検証
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 4) {
          cleanedLines.push(trimmed);
          faceCount++;
        }
      } else if (trimmed.startsWith('vn ') || trimmed.startsWith('vt ') || 
                 trimmed.startsWith('g ') || trimmed.startsWith('o ') ||
                 trimmed.startsWith('s ') || trimmed.startsWith('mtllib ') ||
                 trimmed.startsWith('usemtl ')) {
        cleanedLines.push(trimmed);
      }
    }

    const result = cleanedLines.join('\n');
    
    this.assistant.log('debug', 'OBJデータクリーニング完了', {
      originalLines: lines.length,
      cleanedLines: cleanedLines.length,
      vertexCount,
      faceCount,
      resultLength: result.length
    });

    // 最小要件チェック
    if (vertexCount < 3) {
      this.assistant.log('warn', '頂点数が不足しています', { vertexCount });
      throw new Error('生成されたOBJデータの頂点数が不足しています（最低3個必要）');
    }
    
    if (faceCount < 1) {
      this.assistant.log('warn', '面数が不足しています', { faceCount });
      throw new Error('生成されたOBJデータに面が含まれていません');
    }

    return result;
  }

  // ========== 第1段階: 仕様分析と最適化（LLM実行） ==========
  async analyzeAndOptimize(prompt) {
    const width = document.getElementById('widthParam').value || 'auto';
    const depth = document.getElementById('depthParam').value || 'auto';
    const height = document.getElementById('heightParam').value || 'auto';

    try {
      this.assistant.log('debug', '仕様分析LLM呼び出し開始');
      
      // LLMによる仕様分析と最適化
      const optimizedSpec = await this.callSpecificationLLM(prompt, width, depth, height);
      
      this.assistant.log('info', '仕様分析LLM完了', { specLength: optimizedSpec.length });
      
      // LLMの出力を解析してstructured dataに変換
      const parsedSpec = this.parseOptimizedSpecification(optimizedSpec, prompt, width, depth, height);
      
      // 最適化されたプロンプトを保存（後で表示用）
      this.assistant.currentOptimizedPrompt = optimizedSpec;
      
      return parsedSpec;
      
    } catch (error) {
      this.assistant.log('error', '仕様分析エラー - フォールバック実行', { error: error.message });
      
      // エラー時のフォールバック
      return this.getFallbackSpecification(prompt, width, depth, height);
    }
  }

  // ========== 仕様最適化専用LLM呼び出し ==========
  async callSpecificationLLM(prompt, width, depth, height) {
    const maxRetries = 3;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.assistant.log('debug', `第1段階LLM呼び出し (試行 ${attempt}/${maxRetries})`);
        
        const specOptimizationPrompt = this.buildSpecificationPrompt(prompt, width, depth, height);

        const requestData = {
          model: this.modelName,
          temperature: 0.2 + (attempt - 1) * 0.1, // 試行回数に応じて温度を少し上げる
          stream: false,
          max_completion_tokens: 1500,
          messages: [
            {
              role: "system",
              content: this.getSpecificationSystemPrompt()
            },
            {
              role: "user",
              content: specOptimizationPrompt
            }
          ]
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(requestData),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`API request failed (${response.status})`);
        }

        const data = await response.json();
        
        let content = null;
        if (data.choices && data.choices[0] && data.choices[0].message) {
          content = data.choices[0].message.content;
        } else if (data.answer) {
          content = data.answer;
        } else if (data.response) {
          content = data.response;
        } else {
          throw new Error('Invalid API response format');
        }

        // JSONバリデーションを試行
        const parsedResult = this.parseOptimizedSpecification(content, prompt, width, depth, height);
        
        // フォールバックでない場合は成功
        if (parsedResult.analysis_complete) {
          this.assistant.log('info', `第1段階LLM呼び出し成功 (試行 ${attempt}/${maxRetries})`);
          return content;
        } else {
          throw new Error('JSON解析によるフォールバックが発生しました');
        }

      } catch (error) {
        lastError = error;
        this.assistant.log('warn', `第1段階LLM呼び出し失敗 (試行 ${attempt}/${maxRetries})`, { 
          error: error.message 
        });
        
        // 最後の試行でない場合は短時間待機
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    // 全ての試行が失敗した場合
    this.assistant.log('error', `第1段階LLM呼び出し全試行失敗`, { 
      lastError: lastError?.message 
    });
    throw lastError || new Error('第1段階LLM呼び出しが失敗しました');
  }

  // ========== 仕様最適化用システムプロンプト ==========
  getSpecificationSystemPrompt() {
    return `You are a furniture-CAD expert. Output format: one line "{{json}}" followed by pure JSON with these exact keys:
{
  "type": "chair|desk|table|shelf|cabinet",
  "outer_dimensions_cm": {"w": number, "d": number, "h": number},
  "parts": [
    {"name": "string", "pos": [x,y,z], "size": [w,d,h]},
    {"name": "string", "pos": [x,y,z], "size": [w,d,h]}
  ],
  "features": {
    "curved_parts": ["string"],
    "tapered_parts": ["string"], 
    "beveled_edges": ["string"]
  }
}`;
  }

  // ========== 仕様最適化プロンプト構築 ==========
  buildSpecificationPrompt(prompt, width, depth, height) {
    let dimensionText = '';
    if (width !== 'auto' || depth !== 'auto' || height !== 'auto') {
      dimensionText = `\n横${width} × 奥${depth} × 高さ${height} cm`;
    }

    return `#TASK: SPEC_ANALYSIS
${prompt}${dimensionText}`;
  }

  // ========== LLM出力の解析 ==========
  parseOptimizedSpecification(llmOutput, originalPrompt, width, depth, height) {
    try {
      this.assistant.log('debug', 'JSON仕様解析開始', { outputLength: llmOutput.length });
      
      // {{json}}行を探してJSON部分を抽出
      let jsonText = '';
      
      if (llmOutput.includes('{{json}}')) {
        const lines = llmOutput.split('\n');
        let jsonStarted = false;
        const jsonLines = [];
        
        for (const line of lines) {
          if (line.trim() === '{{json}}') {
            jsonStarted = true;
            continue;
          }
          if (jsonStarted) {
            jsonLines.push(line);
          }
        }
        
        jsonText = jsonLines.join('\n').trim();
      } else {
        // {{json}}がない場合は全体をJSONとして試行
        jsonText = llmOutput.trim();
      }
      
      // JSONをパース
      let parsedData;
      try {
        parsedData = JSON.parse(jsonText);
      } catch (parseError) {
        this.assistant.log('error', 'JSON解析失敗', { 
          error: parseError.message,
          jsonText: jsonText.substring(0, 200) 
        });
        throw new Error(`JSON解析エラー: ${parseError.message}`);
      }
      
      // 必須キーのバリデーション
      const validationResult = this.validateJSONSchema(parsedData);
      if (!validationResult.valid) {
        this.assistant.log('error', 'JSONスキーマバリデーション失敗', validationResult);
        throw new Error(`無効なJSONスキーマ: ${validationResult.errors.join(', ')}`);
      }
      
      // 寸法の上書き処理（ユーザー指定がある場合）
      const finalDimensions = {
        width: width !== 'auto' ? parseInt(width) : parsedData.outer_dimensions_cm.w,
        depth: depth !== 'auto' ? parseInt(depth) : parsedData.outer_dimensions_cm.d,
        height: height !== 'auto' ? parseInt(height) : parsedData.outer_dimensions_cm.h
      };
      
      // 家具種別のマッピング
      const typeMapping = {
        'chair': '椅子',
        'desk': '机',
        'table': 'テーブル',
        'shelf': '棚',
        'cabinet': '収納家具'
      };
      
      const furnitureType = typeMapping[parsedData.type] || '椅子';
      
      // 構造分析情報の変換
      const structuralInfo = {
        main_components: parsedData.parts.map(part => ({
          name: part.name,
          position: part.pos.join(','),
          size: part.size.join('×')
        })),
        curved_parts: parsedData.features.curved_parts || [],
        tapered_parts: parsedData.features.tapered_parts || [],
        beveled_edges: parsedData.features.beveled_edges || [],
        coordinate_layout: `原点基準の3D座標系, 部品数: ${parsedData.parts.length}`
      };
      
      this.assistant.log('info', 'JSON仕様解析成功', {
        furnitureType: furnitureType,
        dimensions: finalDimensions,
        partsCount: parsedData.parts.length
      });
      
      return {
        furniture_type: furnitureType,
        dimensions: finalDimensions,
        description: originalPrompt,
        optimized_specification: JSON.stringify(parsedData, null, 2), // 整形されたJSON
        structural_analysis: structuralInfo,
        analysis_complete: true,
        raw_json: parsedData // 生のJSONデータも保存
      };
      
    } catch (error) {
      this.assistant.log('warn', 'JSON仕様解析失敗、フォールバック実行', { error: error.message });
      return this.getFallbackSpecification(originalPrompt, width, depth, height);
    }
  }

  // ========== JSONスキーマバリデーション ==========
  validateJSONSchema(data) {
    const errors = [];
    
    // 必須キーの存在チェック
    const requiredKeys = ['type', 'outer_dimensions_cm', 'parts', 'features'];
    for (const key of requiredKeys) {
      if (!(key in data)) {
        errors.push(`必須キー '${key}' が存在しません`);
      }
    }
    
    // typeの値チェック
    if (data.type && !['chair', 'desk', 'table', 'shelf', 'cabinet'].includes(data.type)) {
      errors.push(`無効なtype値: ${data.type}`);
    }
    
    // outer_dimensions_cmの構造チェック
    if (data.outer_dimensions_cm) {
      const dimKeys = ['w', 'd', 'h'];
      for (const dimKey of dimKeys) {
        if (!(dimKey in data.outer_dimensions_cm)) {
          errors.push(`outer_dimensions_cm.${dimKey} が存在しません`);
        } else if (typeof data.outer_dimensions_cm[dimKey] !== 'number') {
          errors.push(`outer_dimensions_cm.${dimKey} は数値である必要があります`);
        }
      }
    }
    
    // partsの構造チェック
    if (data.parts) {
      if (!Array.isArray(data.parts)) {
        errors.push('parts は配列である必要があります');
      } else {
        data.parts.forEach((part, index) => {
          if (!part.name || typeof part.name !== 'string') {
            errors.push(`parts[${index}].name は文字列である必要があります`);
          }
          if (!Array.isArray(part.pos) || part.pos.length !== 3) {
            errors.push(`parts[${index}].pos は3要素の数値配列である必要があります`);
          }
          if (!Array.isArray(part.size) || part.size.length !== 3) {
            errors.push(`parts[${index}].size は3要素の数値配列である必要があります`);
          }
        });
      }
    }
    
    // featuresの構造チェック
    if (data.features) {
      const featureKeys = ['curved_parts', 'tapered_parts', 'beveled_edges'];
      for (const featureKey of featureKeys) {
        if (data.features[featureKey] && !Array.isArray(data.features[featureKey])) {
          errors.push(`features.${featureKey} は配列である必要があります`);
        }
      }
    }
    
    // 未知キーの検出
    const allowedTopKeys = ['type', 'outer_dimensions_cm', 'parts', 'features'];
    for (const key in data) {
      if (!allowedTopKeys.includes(key)) {
        errors.push(`未知のキー '${key}' が含まれています`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  // ========== フォールバック仕様 ==========
  getFallbackSpecification(prompt, width, depth, height) {
    let furnitureType = '椅子';
    if (prompt.includes('テーブル') || prompt.includes('table') || prompt.includes('机')) {
      furnitureType = 'テーブル';
    } else if (prompt.includes('本棚') || prompt.includes('棚') || prompt.includes('shelf')) {
      furnitureType = '収納家具';
    }
    
    return {
      furniture_type: furnitureType,
      dimensions: {
        width: width !== 'auto' ? parseInt(width) : 40,
        depth: depth !== 'auto' ? parseInt(depth) : 40,
        height: height !== 'auto' ? parseInt(height) : 80
      },
      description: prompt,
      optimized_specification: '',
      structural_analysis: {
        main_components: [],
        curved_parts: [],
        tapered_parts: [],
        beveled_edges: [],
        coordinate_layout: ""
      },
      analysis_complete: false
    };
  }

  // ========== OBJデータにコメント追加 ==========
  addDimensionCommentToOBJ(objData, furnitureSpec) {
    try {
      const dimensions = furnitureSpec.dimensions || {};
      const furnitureType = furnitureSpec.furniture_type || '家具';
      
      // 寸法コメントを作成
      const width = dimensions.width || 'auto';
      const depth = dimensions.depth || 'auto';
      const height = dimensions.height || 'auto';
      
      const dimensionComment = `# ${furnitureType} - 寸法: 幅${width}cm × 奥行${depth}cm × 高さ${height}cm\n`;
      
      // OBJデータの先頭にコメントを追加
      return dimensionComment + objData;
      
    } catch (error) {
      this.assistant.log('warn', 'OBJコメント追加エラー', { error: error.message });
      return objData; // エラー時は元のデータをそのまま返す
    }
  }

  // ========== 第2段階: シンプルな統合モデル生成 ==========
  async generateUnifiedModel(prompt, furnitureSpec) {
    try {
      this.assistant.log('debug', '統合モデル生成開始 - 第1段階結果を使用');
      
      // 第1段階の結果（furnitureSpec）を第2段階の入力として使用
      const stage1Output = this.formatStage1OutputForStage2(furnitureSpec);
      let objData = await this.assistant.aiManager.callLLMAPI(stage1Output);
      
      if (!objData || objData.trim().length === 0) {
        throw new Error('3Dモデルの生成に失敗しました');
      }
      
      // OBJデータの先頭に寸法コメントを追加
      objData = this.addDimensionCommentToOBJ(objData, furnitureSpec);
      
      return objData;
      
    } catch (error) {
      this.assistant.log('error', '統合モデル生成エラー', { error: error.message });
      throw error;
    }
  }

  // ========== 第1段階結果を第2段階用にフォーマット ==========
  formatStage1OutputForStage2(furnitureSpec) {
    try {
      this.assistant.log('debug', '第1段階結果を第2段階用にフォーマット開始');
      
      if (!furnitureSpec) {
        return `#TASK: OBJ_GENERATION
#STYLE: Y_UP units=cm
#VERTEX_FIRST_ID:1
#OUTPUT_ONLY: v/vt/vn/f lines
#PARTS:
[chair_seat at 0 42 0 size 40 40 3]
[chair_back at 0 60 -18 size 40 3 35]
[leg_1 at -15 21 -15 size 3 42 3]
[leg_2 at 15 21 -15 size 3 42 3]
[leg_3 at -15 21 15 size 3 42 3]
[leg_4 at 15 21 15 size 3 42 3]

###EXAMPLE
#PARTS:
[cube at 0 0 0 size 1 1 1]
→
v -0.5 -0.5 -0.5
v  0.5 -0.5 -0.5
v  0.5  0.5 -0.5
v -0.5  0.5 -0.5
v -0.5 -0.5  0.5
v  0.5 -0.5  0.5
v  0.5  0.5  0.5
v -0.5  0.5  0.5
f 1 2 3 4
f 5 8 7 6
f 1 5 6 2
f 2 6 7 3
f 3 7 8 4
f 5 1 4 8
###END`;
      }
      
      let partsSpecification = '';
      
      if (furnitureSpec.raw_json) {
        // 新しいJSONフォーマットから部品情報を抽出
        const jsonData = furnitureSpec.raw_json;
        
        partsSpecification = jsonData.parts.map(part => {
          const x = part.pos[0];
          const y = part.pos[1];
          const z = part.pos[2];
          const w = part.size[0];
          const d = part.size[1];
          const h = part.size[2];
          return `[${part.name} at ${x} ${y} ${z} size ${w} ${d} ${h}]`;
        }).join('\n');
        
      } else {
        // フォールバック: 従来形式から部品情報を推定
        const furnitureType = furnitureSpec.furniture_type || '椅子';
        const dims = furnitureSpec.dimensions || {};
        const w = dims.width || 40;
        const d = dims.depth || 40;
        const h = dims.height || 80;
        
        if (furnitureType === '椅子') {
          partsSpecification = `[seat at 0 ${Math.round(h * 0.5)} 0 size ${w} ${d} 3]
[back at 0 ${Math.round(h * 0.75)} ${Math.round(-d * 0.45)} size ${w} 3 ${Math.round(h * 0.4)}]
[leg_1 at ${Math.round(-w * 0.35)} ${Math.round(h * 0.25)} ${Math.round(-d * 0.35)} size 3 ${Math.round(h * 0.5)} 3]
[leg_2 at ${Math.round(w * 0.35)} ${Math.round(h * 0.25)} ${Math.round(-d * 0.35)} size 3 ${Math.round(h * 0.5)} 3]
[leg_3 at ${Math.round(-w * 0.35)} ${Math.round(h * 0.25)} ${Math.round(d * 0.35)} size 3 ${Math.round(h * 0.5)} 3]
[leg_4 at ${Math.round(w * 0.35)} ${Math.round(h * 0.25)} ${Math.round(d * 0.35)} size 3 ${Math.round(h * 0.5)} 3]`;
        } else if (furnitureType === '机' || furnitureType === 'テーブル') {
          partsSpecification = `[top at 0 ${h - 3} 0 size ${w} ${d} 3]
[leg_1 at ${Math.round(-w * 0.4)} ${Math.round((h - 3) * 0.5)} ${Math.round(-d * 0.4)} size 4 ${h - 3} 4]
[leg_2 at ${Math.round(w * 0.4)} ${Math.round((h - 3) * 0.5)} ${Math.round(-d * 0.4)} size 4 ${h - 3} 4]
[leg_3 at ${Math.round(-w * 0.4)} ${Math.round((h - 3) * 0.5)} ${Math.round(d * 0.4)} size 4 ${h - 3} 4]
[leg_4 at ${Math.round(w * 0.4)} ${Math.round((h - 3) * 0.5)} ${Math.round(d * 0.4)} size 4 ${h - 3} 4]`;
        } else {
          // 収納家具等
          partsSpecification = `[body at 0 ${Math.round(h * 0.5)} 0 size ${w} ${d} ${h}]
[shelf1 at 0 ${Math.round(h * 0.33)} 0 size ${w - 4} ${d - 4} 2]
[shelf2 at 0 ${Math.round(h * 0.66)} 0 size ${w - 4} ${d - 4} 2]`;
        }
      }
      
      // 最小化されたプロンプト
      const taskPrompt = `#TASK: OBJ_GENERATION
#STYLE: Y_UP units=cm
#VERTEX_FIRST_ID:1
#OUTPUT_ONLY: v/vt/vn/f lines
#PARTS:
${partsSpecification}

###EXAMPLE
#PARTS:
[cube at 0 0 0 size 1 1 1]
→
v -0.5 -0.5 -0.5
v  0.5 -0.5 -0.5
v  0.5  0.5 -0.5
v -0.5  0.5 -0.5
v -0.5 -0.5  0.5
v  0.5 -0.5  0.5
v  0.5  0.5  0.5
v -0.5  0.5  0.5
f 1 2 3 4
f 5 8 7 6
f 1 5 6 2
f 2 6 7 3
f 3 7 8 4
f 5 1 4 8
###END`;

      this.assistant.log('debug', '第1段階結果フォーマット完了', { 
        promptLength: taskPrompt.length,
        hasRawJSON: !!furnitureSpec.raw_json,
        partsCount: furnitureSpec.raw_json?.parts?.length || 0,
        partsLines: partsSpecification.split('\n').length
      });
      
      return taskPrompt;
      
    } catch (error) {
      this.assistant.log('error', '第1段階結果フォーマットエラー', { error: error.message });
      
      // エラー時のフォールバック
      return `#TASK: OBJ_GENERATION
#STYLE: Y_UP units=cm
#VERTEX_FIRST_ID:1
#OUTPUT_ONLY: v/vt/vn/f lines
#PARTS:
[error_chair at 0 42 0 size 40 40 3]

###EXAMPLE
#PARTS:
[cube at 0 0 0 size 1 1 1]
→
v -0.5 -0.5 -0.5
v  0.5 -0.5 -0.5
v  0.5  0.5 -0.5
v -0.5  0.5 -0.5
v -0.5 -0.5  0.5
v  0.5 -0.5  0.5
v  0.5  0.5  0.5
v -0.5  0.5  0.5
f 1 2 3 4
f 5 8 7 6
f 1 5 6 2
f 2 6 7 3
f 3 7 8 4
f 5 1 4 8
###END`;
    }
  }

  // ========== 第3段階: OBJデータ品質評価 ==========
  async performFinalQualityCheck(objData) {
    try {
      this.assistant.log('debug', '第3段階：品質評価LLM呼び出し開始');
      
      // 第2段階のOBJデータの品質評価レポートを生成
      const qualityReport = await this.callQualityCheckLLM(objData);
      
      this.assistant.log('info', '第3段階：品質評価完了', { 
        objDataLength: objData.length,
        reportLength: qualityReport.length 
      });
      
      return {
        qualityReport: qualityReport,
        originalObjData: objData,
        stage: 3,
        processType: 'quality_evaluation'
      };
      
    } catch (error) {
      this.assistant.log('error', '第3段階：品質評価エラー', { error: error.message });
      throw error;
    }
  }

  // ========== OBJ構造分析（簡素化） ==========
  analyzeOBJStructure(objData) {
    const lines = objData.split('\n');
    const vertices = [];
    let faceCount = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('v ')) {
        const coords = trimmed.substring(2).split(/\s+/).map(Number);
        if (coords.length >= 3 && !isNaN(coords[0]) && !isNaN(coords[1]) && !isNaN(coords[2])) {
          vertices.push({ x: coords[0], y: coords[1], z: coords[2] });
        }
      } else if (trimmed.startsWith('f ')) {
        faceCount++;
      }
    }

    if (vertices.length === 0) {
      return {
        vertexCount: 0,
        faceCount: 0,
        dimensions: { x: { min: 0, max: 0 }, y: { min: 0, max: 0 }, z: { min: 0, max: 0 } },
        overallDimensions: { width: 0, height: 0, depth: 0 }
      };
    }

    const xCoords = vertices.map(v => v.x);
    const yCoords = vertices.map(v => v.y);
    const zCoords = vertices.map(v => v.z);

    const dimensions = {
      x: { min: Math.min(...xCoords), max: Math.max(...xCoords) },
      y: { min: Math.min(...yCoords), max: Math.max(...yCoords) },
      z: { min: Math.min(...zCoords), max: Math.max(...zCoords) }
    };

    const overallDimensions = {
      width: dimensions.x.max - dimensions.x.min,
      height: dimensions.y.max - dimensions.y.min,
      depth: dimensions.z.max - dimensions.z.min
    };
    
    return {
      vertexCount: vertices.length,
      faceCount: faceCount,
      dimensions: dimensions,
      overallDimensions: overallDimensions
    };
  }

  // ========== 第3段階品質評価LLM呼び出し ==========
  async callQualityCheckLLM(objData) {
    const requestData = {
      model: this.assistant.aiManager.modelName,
      temperature: 0.1,
      stream: false,
      max_completion_tokens: 4000,
      messages: [
        {
          role: "system",
          content: this.getQualityCheckSystemPrompt()
        },
        {
          role: "user",
          content: `以下のOBJファイルの品質評価を行ってください：

# 評価観点
1. 構造的品質（頂点数、面数、ジオメトリ整合性）
2. 寸法適切性（サイズの妥当性、比率の調和）
3. 製造可能性（3D印刷適合性、材料効率）
4. 美観・デザイン（造形美、バランス、機能性）

# OBJデータ
${objData}

# 要求事項
- 日本語でマークダウン形式のレポートを作成
- 各評価項目について具体的な数値と所見を記載
- 総合スコア（100点満点）と改善提案を含める
- OBJデータの再出力は不要`
        }
      ]
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒タイムアウト

      const response = await fetch(this.assistant.aiManager.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      
      let qualityReport = null;
      if (data.choices && data.choices[0] && data.choices[0].message) {
        qualityReport = data.choices[0].message.content;
      } else if (data.answer) {
        qualityReport = data.answer;
      } else if (data.response) {
        qualityReport = data.response;
      } else {
        throw new Error('Invalid API response format - no content found');
      }

      // 評価レポートをそのまま返す（OBJクリーニング不要）
      if (!qualityReport || qualityReport.trim().length === 0) {
        throw new Error('Generated quality report is empty or invalid');
      }

      // デバッグ：レスポンスの内容を確認
      this.assistant.log('debug', '第3段階LLMレスポンス内容確認', {
        responseLength: qualityReport.length,
        startsWithHash: qualityReport.trim().startsWith('#'),
        startsWithV: qualityReport.trim().startsWith('v '),
        containsOBJ: qualityReport.toLowerCase().includes('obj'),
        preview: qualityReport.substring(0, 200) + '...'
      });

      // OBJデータが返された場合の警告と対処
      if (qualityReport.trim().startsWith('v ') || qualityReport.trim().startsWith('f ') || 
          qualityReport.includes('# Furniture') || qualityReport.includes('# Object')) {
        this.assistant.log('error', '第3段階でOBJデータが返されました！評価レポートに置き換えます', {
          preview: qualityReport.substring(0, 100)
        });
        
        // OBJデータが返された場合は標準的な評価レポートを生成
        return `## 品質評価結果

### 構造的品質
- 頂点数: 推定値 (評価: 自動生成のため詳細評価不可)
- 面数: 推定値 (評価: 自動生成のため詳細評価不可)  
- ジオメトリ整合性: システムが誤ってOBJファイルを返したため詳細評価できません

### 実用性
- 寸法適切性: 第3段階エラーのため評価不可
- 安定性: 第3段階エラーのため評価不可
- 機能性: 第3段階エラーのため評価不可

### 製造可能性
- 3D出力適合性: 第3段階エラーのため評価不可
- 材料効率: 第3段階エラーのため評価不可

### 美観・デザイン
- 造形美: 第3段階エラーのため評価不可
- 全体評価: 第3段階エラーのため評価不可

### 総合評価
- 総合スコア: 評価不可/100点
- 推奨事項: システムエラーが発生したため、第2段階で生成されたOBJファイルをそのまま使用してください

注意: この評価は第3段階でOBJファイルが誤って返されたため、自動生成されたフォールバック評価です。`;
      }

      return qualityReport.trim();
    } catch (error) {
      this.assistant.log('error', '第3段階品質評価LLM呼び出し失敗', { error: error.message });
      if (error.name === 'AbortError') {
        throw new Error('API request timed out. Please try again.');
      }
      throw new Error(`第3段階品質評価API呼び出しエラー: ${error.message}`);
    }
  }

  // ========== 第1段階：最適化仕様データ保存 ==========
  storeOptimizedSpec(furnitureSpec, originalPrompt = null) {
    if (!furnitureSpec || !furnitureSpec.optimized_specification) {
      return;
    }

    // 元のプロンプトとシステムプロンプトを含めてデータを保存
    this.stage1Data = {
      ...furnitureSpec,
      originalPrompt: originalPrompt || furnitureSpec.description || 'プロンプト情報が利用できません',
      systemPrompt: this.getSpecificationSystemPrompt()
    };
    
    const showStage1Btn = document.getElementById('showStage1ResultBtn');
    if (showStage1Btn) {
      showStage1Btn.style.display = 'block';
    }
    
    this.assistant.log('info', '最適化仕様データを保存しました', { 
      furnitureType: furnitureSpec.furniture_type,
      analysisComplete: furnitureSpec.analysis_complete,
      hasOriginalPrompt: !!originalPrompt,
      hasSystemPrompt: true
    });
  }

  // マークダウンをHTMLに変換するヘルパーメソッド
  convertMarkdownToHTML(markdown) {
    if (!markdown) return '';
    
    let html = markdown
      // ## ヘッダーを<h3>に変換
      .replace(/^## (.+)$/gm, '<h3 style="color: #2196f3; margin: 1.5rem 0 0.5rem 0; font-size: 1.1rem; border-bottom: 2px solid #e3f2fd; padding-bottom: 0.3rem;">$1</h3>')
      // ### サブヘッダーを<h4>に変換
      .replace(/^### (.+)$/gm, '<h4 style="color: #4caf50; margin: 1rem 0 0.5rem 0; font-size: 1rem;">$1</h4>')
      // **太字**を<strong>に変換
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color: #1976d2;">$1</strong>')
      // リストアイテムを<li>に変換
      .replace(/^- (.+)$/gm, '<li style="margin-bottom: 0.3rem; padding-left: 0.5rem;">$1</li>')
      // 改行を<br>に変換
      .replace(/\n/g, '<br>');
    
    // <li>をまとめて<ul>で囲む
    html = html.replace(/(<li[^>]*>.*?<\/li>(<br>)*)+/gs, function(match) {
      const listItems = match.replace(/<br>/g, '');
      return `<ul style="margin: 0.5rem 0; padding-left: 1.5rem; list-style-type: disc;">${listItems}</ul>`;
    });
    
    return html;
  }

  // ========== 第2段階：3Dモデル生成結果データ保存 ==========
  storeModelGenerationResults(objData, furnitureSpec) {
    if (!objData) {
      return;
    }

    // OBJデータの基本分析
    const analysis = this.analyzeOBJStructure(objData);
    const fileSizeKB = (new Blob([objData]).size / 1024).toFixed(2);

    // 第2段階で実際に使用されたプロンプトを再構築（第1段階の完全出力を含む）
    const actualStage2Prompt = this.formatStage1OutputForStage2(furnitureSpec);

    // データを保存（システムプロンプトと実際のプロンプトも含める）
    this.stage2Data = {
      objData: objData,
      furnitureSpec: furnitureSpec,
      analysis: analysis,
      fileSizeKB: fileSizeKB,
      actualPrompt: actualStage2Prompt, // 実際に使用されたプロンプト（第1段階完全出力含む）
      systemPrompt: this.assistant.aiManager ? this.assistant.aiManager.getSystemPrompt() : '第2段階システムプロンプトが利用できません'
    };

    // ボタンを表示
    const showStage2Btn = document.getElementById('showStage2ResultBtn');
    if (showStage2Btn) {
      showStage2Btn.style.display = 'block';
    }
    
    this.assistant.log('info', '3Dモデル生成結果データを保存しました', { 
      vertexCount: analysis.vertexCount,
      faceCount: analysis.faceCount,
      fileSize: fileSizeKB,
      promptLength: actualStage2Prompt.length,
      hasSystemPrompt: true
    });
  }

  // ========== 第3段階品質評価用システムプロンプト ==========
  getQualityCheckSystemPrompt() {
    return `You are a furniture-CAD expert specializing in quality evaluation.
Analyze the provided OBJ file and generate a detailed quality assessment report in Japanese.
Evaluate structure, dimensions, manufacturability, and design aesthetics.
Output ONLY the evaluation report in markdown format - no OBJ data or other content.`;
  }

  // ========== 第3段階：品質評価結果データ保存 ==========
  storeQualityCheckResults(qualityCheckResult, originalObjData) {
    if (!qualityCheckResult) {
      return;
    }

    // OBJデータの簡易分析
    const objAnalysis = this.analyzeOBJStructure(originalObjData);

    // データを保存（システムプロンプトと入力プロンプトも含める）
    this.stage3Data = {
      qualityReport: qualityCheckResult.qualityReport,
      originalObjData: originalObjData,
      improvedObjData: originalObjData, // 現在は同じデータ（将来的に改善版を生成）
      objAnalysis: objAnalysis,
      systemPrompt: this.getQualityCheckSystemPrompt(),
      inputPrompt: `以下のOBJファイルの品質評価を行ってください：

# 評価観点
1. 構造的品質（頂点数、面数、ジオメトリ整合性）
2. 寸法適切性（サイズの妥当性、比率の調和）
3. 製造可能性（3D印刷適合性、材料効率）
4. 美観・デザイン（造形美、バランス、機能性）

# OBJデータ
${originalObjData}

# 要求事項
- 日本語でマークダウン形式のレポートを作成
- 各評価項目について具体的な数値と所見を記載
- 総合スコア（100点満点）と改善提案を含める
- OBJデータの再出力は不要`,
      stage: 3,
      processType: 'quality_evaluation'
    };

    // ボタンを表示
    const showStage3Btn = document.getElementById('showStage3ResultBtn');
    if (showStage3Btn) {
      showStage3Btn.style.display = 'block';
    }
    
    this.assistant.log('info', '品質評価結果データを保存しました', { 
      originalLength: originalObjData?.length || 0,
      reportLength: qualityCheckResult.qualityReport?.length || 0,
      hasSystemPrompt: true
    });
  }

  // ========== クリーンアップメソッド ==========
  cleanupOldDisplayAreas() {
    // 古い表示エリアを削除
    const oldElements = [
      'optimizedSpecDisplay',
      'modelGenerationDisplay', 
      'qualityCheckDisplay'
    ];
    
    oldElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.remove();
      }
    });
  }
}