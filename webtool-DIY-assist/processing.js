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
      
      // 段階別結果ボタンを表示
      this.assistant.showStageResultButtons();
      
      // 再生成セクションを表示（3Dモデル表示成功時のみ）
      this.assistant.showRegenerationSection();
      
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

  // ========== 第1段階：分析・最適化 ==========
  async analyzeAndOptimize(prompt) {
    try {
      this.assistant.showLoading(true, '要件を分析・最適化中...');
      
      const width = document.getElementById('widthParam').value;
      const depth = document.getElementById('depthParam').value; 
      const height = document.getElementById('heightParam').value;

      // 第1段階：仕様分析・最適化LLM呼び出し
      const llmResponse = await this.callSpecificationLLM(prompt, width, depth, height);
      const furnitureSpec = this.parseOptimizedSpecification(llmResponse, prompt, width, depth, height);
      
      this.storeOptimizedSpec(furnitureSpec, prompt);
      
      this.assistant.log('info', '第1段階完了', { 
        furnitureType: furnitureSpec.furniture_type,
        analysisComplete: furnitureSpec.analysis_complete
      });
      
      return furnitureSpec;
    } catch (error) {
      this.assistant.log('error', '第1段階処理エラー', { error: error.message });
      throw new Error(`要件分析でエラーが発生しました: ${error.message}`);
    } finally {
      this.assistant.showLoading(false);
    }
  }

  // ========== 第1段階：仕様分析LLM呼び出し ==========
  async callSpecificationLLM(prompt, width, depth, height) {
    const systemPrompt = this.getSpecificationSystemPrompt();
    const optimizedPrompt = this.buildSpecificationPrompt(prompt, width, depth, height);
    
    this.assistant.log('info', '第1段階LLM呼び出し', {
      systemPromptLength: systemPrompt.length,
      promptLength: optimizedPrompt.length,
      dimensions: { width, depth, height }
    });

    try {
      const response = await this.assistant.aiManager.callLLMAPI(optimizedPrompt);
      
      if (!response || response.trim().length === 0) {
        throw new Error('第1段階でAPIから空のレスポンスを受信しました');
      }
      
      this.assistant.log('info', '第1段階LLM応答受信', {
        responseLength: response.length,
        hasValidContent: response.includes('{') && response.includes('}')
      });
      
      return response;
    } catch (error) {
      this.assistant.log('error', '第1段階LLM呼び出し失敗', { error: error.message });
      throw error;
    }
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

  // ========== 第2段階：統合モデル生成 ==========
  async generateUnifiedModel(prompt, furnitureSpec) {
    try {
      this.assistant.showLoading(true, '3Dモデル生成中...');
      
      // 第1段階の結果を第2段階に渡すプロンプトを構築
      const stage2Prompt = this.formatStage1OutputForStage2(furnitureSpec);
      
      this.assistant.log('info', '第2段階開始', {
        stage2PromptLength: stage2Prompt.length,
        basedOnSpec: furnitureSpec.furniture_type
      });

      // 第2段階LLM呼び出し
      const stage2Response = await this.callStage2LLM(stage2Prompt, this.getStage2SystemPrompt());
      
      if (!stage2Response) {
        throw new Error('第2段階でLLMから応答を受信できませんでした');
      }

      // OBJデータをクリーニング
      const cleanedOBJ = this.cleanOBJData(stage2Response);
      
      if (!cleanedOBJ || cleanedOBJ.trim().length === 0) {
        throw new Error('第2段階でOBJデータの生成に失敗しました');
      }

      this.assistant.log('info', '第2段階完了', { 
        objDataLength: cleanedOBJ.length,
        hasValidOBJ: cleanedOBJ.includes('v ') && cleanedOBJ.includes('f ')
      });

      // 結果を保存
      this.storeModelGenerationResults(cleanedOBJ, furnitureSpec);
      
      return cleanedOBJ;
    } catch (error) {
      this.assistant.log('error', '第2段階処理エラー', { error: error.message });
      throw new Error(`3Dモデル生成でエラーが発生しました: ${error.message}`);
    } finally {
      this.assistant.showLoading(false);
    }
  }

  // ========== 修正指示を反映した新仕様生成 ==========
  async generateModifiedSpecification(combinedPrompt, originalSpec) {
    try {
      this.assistant.log('debug', '修正指示反映のための仕様再分析開始');
      
      // 修正指示を考慮した仕様分析LLMを呼び出し
      const modifiedSpecText = await this.callModificationLLM(combinedPrompt, originalSpec);
      
      // 新しい仕様をパース
      const modifiedSpec = this.parseOptimizedSpecification(modifiedSpecText, combinedPrompt);
      
      this.assistant.log('info', '修正指示を反映した新仕様生成完了');
      return modifiedSpec;
      
    } catch (error) {
      this.assistant.log('warn', '修正仕様生成失敗、元仕様にフォールバック', { error: error.message });
      // エラー時は元の仕様を返す（最低限の動作保証）
      return originalSpec;
    }
  }

  // ========== 修正指示を考慮したStage2プロンプト作成 ==========
  createModificationAwareStage2Prompt(combinedPrompt, originalSpec) {
    this.assistant.log('debug', '修正指示考慮のStage2プロンプト作成開始');
    
    // 元の仕様情報を抽出
    const originalType = originalSpec.furniture_type || '家具';
    const originalDimensions = originalSpec.dimensions || {};
    const dimensionInfo = `${originalDimensions.width || 'auto'}×${originalDimensions.depth || 'auto'}×${originalDimensions.height || 'auto'}cm`;
    
    // 元の部品情報を取得（参考として）
    let originalPartsInfo = '';
    if (originalSpec.raw_json && originalSpec.raw_json.parts) {
      originalPartsInfo = originalSpec.raw_json.parts.map(part => 
        `  [${part.name}] pos[${part.pos.join(',')}] size[${part.size.join(',')}]`
      ).join('\n');
    }
    
    // 修正指示を抽出
    const modificationMatch = combinedPrompt.match(/【追加修正指示】\s*([\s\S]*?)(?:\n\n|$)/);
    const modificationInstructions = modificationMatch ? modificationMatch[1].trim() : '修正指示不明';
    
    // 修正指示を考慮したOBJ生成プロンプトを作成
    const stage2Prompt = `#TASK: MODIFIED_OBJ_GENERATION
元の家具: ${originalType} (${dimensionInfo})

元の構造（参考）:
${originalPartsInfo}

🎯 修正指示:
${modificationInstructions}

📋 要求事項:
• 元の家具をベースとして、上記修正指示を反映したOBJ形式3Dモデルを生成
• 基本構造や寸法は保持しつつ、修正指示に従って部品を追加・変更・調整
• 例：「引き出しを3つに増やす」→引き出し部品を3個生成
• 例：「キャスターを追加」→脚部にキャスター部品を追加
• 例：「収納を増やす」→棚板や引き出しなどの収納部品を追加

⚡ 生成指示:
Y軸上向き、cm単位でOBJファイルを生成してください。
修正指示を創造的に解釈し、実用的で美しい3D家具モデルを作成してください。
OBJデータのみを出力（説明文不要）。

元のプロンプト:
${combinedPrompt.split('【追加修正指示】')[0].trim()}`;

    this.assistant.log('debug', '修正指示考慮Stage2プロンプト作成完了', {
      modificationInstructions: modificationInstructions,
      promptLength: stage2Prompt.length
    });
    
    return stage2Prompt;
  }

  // ========== Stage2専用システムプロンプト ==========
  getStage2SystemPrompt() {
    return `あなたはOBJ形式3Dモデル生成の専門家です。

【出力形式】
- OBJファイル形式のみ出力
- 説明文やコメントは含めない
- v（頂点）、f（面）を中心とした標準的なOBJ構文

【品質基準】
- Y軸上向き、cm単位
- 適切な頂点密度（50-500点）
- 実用的で美しい形状
- 構造的に安定した3Dジオメトリ

【修正指示の解釈】
- 創造的かつ実用的に修正要求を解釈
- 元の基本構造を保持しつつ効果的に変更を適用
- 家具として機能的で美しいモデルを生成`;
  }

  // ========== Stage2専用LLM呼び出し ==========
  async callStage2LLM(prompt, systemPrompt) {
    this.assistant.log('info', '第2段階LLM呼び出し開始', {
      promptLength: prompt.length,
      systemPromptLength: systemPrompt.length
    });

    try {
      const response = await this.assistant.aiManager.callLLMAPI(prompt);
      
      if (!response || response.trim().length === 0) {
        throw new Error('第2段階でAPIから空のレスポンスを受信しました');
      }
      
      this.assistant.log('info', '第2段階LLM応答受信', {
        responseLength: response.length,
        hasOBJContent: response.includes('v ') || response.includes('f ')
      });
      
      return response;
    } catch (error) {
      this.assistant.log('error', '第2段階LLM呼び出し失敗', { error: error.message });
      throw error;
    }
  }

  // ========== 修正指示専用LLM呼び出し（削除予定） ==========
  async callModificationLLM(combinedPrompt, originalSpec) {
    const maxRetries = 2;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.assistant.log('debug', `修正指示LLM呼び出し (試行 ${attempt}/${maxRetries})`);
        
        const modificationPrompt = this.buildModificationPrompt(combinedPrompt, originalSpec);

        const requestData = {
          model: this.modelName,
          temperature: 0.3,
          stream: false,
          max_completion_tokens: 1500,
          messages: [
            {
              role: "system",
              content: this.getSpecificationSystemPrompt()
            },
            {
              role: "user",
              content: modificationPrompt
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

        this.assistant.log('info', `修正指示LLM呼び出し成功 (試行 ${attempt}/${maxRetries})`);
        return content;

      } catch (error) {
        lastError = error;
        this.assistant.log('warn', `修正指示LLM呼び出し失敗 (試行 ${attempt}/${maxRetries})`, { 
          error: error.message 
        });
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    throw lastError || new Error('修正指示LLM呼び出しが失敗しました');
  }

  // ========== 修正指示用プロンプト構築 ==========
  buildModificationPrompt(combinedPrompt, originalSpec) {
    let originalPartsInfo = '';
    
    if (originalSpec.raw_json && originalSpec.raw_json.parts) {
      originalPartsInfo = originalSpec.raw_json.parts.map(part => 
        `${part.name}: pos[${part.pos.join(',')}] size[${part.size.join(',')}]`
      ).join('\n');
    }

    return `#TASK: SPEC_MODIFICATION
元の家具仕様:
タイプ: ${originalSpec.raw_json?.type || originalSpec.furniture_type || '不明'}
寸法: ${originalSpec.raw_json?.outer_dimensions_cm ? 
  `${originalSpec.raw_json.outer_dimensions_cm.w}×${originalSpec.raw_json.outer_dimensions_cm.d}×${originalSpec.raw_json.outer_dimensions_cm.h}cm` : 
  '不明'}

元の部品構成:
${originalPartsInfo}

新しい要件（修正指示含む）:
${combinedPrompt}

上記の修正指示を元の仕様に適用して、新しい部品構成を生成してください。基本構造は保持しつつ、修正指示を反映してください。`;
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

  // ========== 第3段階：最終品質チェック ==========
  async performFinalQualityCheck(objData) {
    try {
      this.assistant.showLoading(true, '品質評価中...');
      
      // OBJデータの構造分析
      const objAnalysis = this.analyzeOBJStructure(objData);
      
      this.assistant.log('info', '第3段階開始', {
        vertexCount: objAnalysis.vertexCount,
        faceCount: objAnalysis.faceCount,
        objDataLength: objData.length
      });

      // 第3段階：品質評価LLM呼び出し
      const qualityResult = await this.callQualityCheckLLM(objData);
      
      this.assistant.log('info', '第3段階完了', {
        hasQualityReport: !!qualityResult.qualityReport,
        reportLength: qualityResult.qualityReport?.length || 0
      });

      // 結果を保存
      this.storeQualityCheckResults(qualityResult, objData);
      
      return qualityResult;
    } catch (error) {
      this.assistant.log('error', '第3段階処理エラー', { error: error.message });
      throw new Error(`品質評価でエラーが発生しました: ${error.message}`);
    } finally {
      this.assistant.showLoading(false);
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
    const systemPrompt = this.getQualityCheckSystemPrompt();
    const qualityPrompt = `以下のOBJファイルの品質評価を行ってください：

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
- OBJデータの再出力は不要`;

    this.assistant.log('info', '第3段階LLM呼び出し開始', {
      systemPromptLength: systemPrompt.length,
      qualityPromptLength: qualityPrompt.length,
      objDataLength: objData.length
    });

    try {
      const response = await this.assistant.aiManager.callLLMAPI(qualityPrompt);
      
      if (!response || response.trim().length === 0) {
        throw new Error('第3段階でAPIから空のレスポンスを受信しました');
      }
      
      this.assistant.log('info', '第3段階LLM応答受信', {
        responseLength: response.length,
        hasMarkdownContent: response.includes('#') || response.includes('*')
      });
      
      return {
        qualityReport: response,
        analysis: this.analyzeOBJStructure(objData)
      };
    } catch (error) {
      this.assistant.log('error', '第3段階LLM呼び出し失敗', { error: error.message });
      throw error;
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