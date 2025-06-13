/**
 * processing.js - 高度な処理フロー管理
 * 
 * 主な責務：
 * - 5段階処理フローの統括
 * - 仕様最適化と品質検証
 * - パーツベースモデル生成
 * - 物理的整合性チェック
 */

/**
 * 段階間データパイプライン - 情報伝達を強化
 */
class StageDataPipeline {
  constructor() {
    this.context = {
      originalRequest: '',
      furnitureType: '',
      dimensions: {},
      stage1Output: {
        specification: '',
        keyFeatures: [],
        constraints: []
      },
      stage2Output: {
        objData: '',
        generationNotes: [],
        potentialIssues: []
      },
      stage3Output: {
        qualityScore: 0,
        improvements: [],
        finalObjData: ''
      }
    };
  }

  // 各段階の出力を次段階の入力に組み込む
  prepareStage2Input() {
    return {
      specification: this.context.stage1Output.specification,
      constraints: this.context.stage1Output.constraints,
      focusAreas: this.context.stage1Output.keyFeatures
    };
  }

  prepareStage3Input() {
    return {
      objData: this.context.stage2Output.objData,
      knownIssues: this.context.stage2Output.potentialIssues,
      originalSpec: this.context.stage1Output.specification
    };
  }

  updateStage1Output(specification, keyFeatures = [], constraints = []) {
    this.context.stage1Output = {
      specification,
      keyFeatures,
      constraints
    };
  }

  updateStage2Output(objData, generationNotes = [], potentialIssues = []) {
    this.context.stage2Output = {
      objData,
      generationNotes,
      potentialIssues
    };
  }

  updateStage3Output(qualityScore, improvements = [], finalObjData = '') {
    this.context.stage3Output = {
      qualityScore,
      improvements,
      finalObjData
    };
  }
}

class ProcessingManager {
  constructor(assistant) {
    this.assistant = assistant;
    
    // 段階別データ保存用
    this.stage1Data = null;
    this.stage2Data = null;
    this.stage3Data = null;
    
    // データパイプラインの初期化
    this.dataPipeline = new StageDataPipeline();
    
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
    return `あなたは家具設計の専門家です。ユーザーの要望を分析し、3Dモデル化に適した詳細仕様を作成してください。

【出力形式】
自然言語で以下の要素を含む詳細仕様を記述：
1. 家具の全体構造（メインパーツの配置と寸法）
2. 各部品の詳細（形状、位置、サイズ、接続方法）
3. 特殊な形状要素（曲線、テーパー、装飾等）
4. 材質と表面処理の想定
5. 機能的要素（可動部、収納等）

【重要】
- 3D空間での具体的な座標と寸法を明記
- 部品間の接続関係を明確に記述
- 実際の家具として成立する構造を考慮
- 家具の種類に応じた専門的な要件を含める

【家具タイプ別要件】
椅子：座面の平面性、背もたれの角度、4本脚の安定配置
机：天板の平面性、脚部空間の確保、構造的安定性
棚：各段の水平性、側板の支持力、重心バランス
収納：扉・引き出しの収まり、内部空間の最適化`;
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

  // ========== LLM出力の解析（自然言語対応） ==========
  parseOptimizedSpecification(llmOutput, originalPrompt, width, depth, height) {
    try {
      this.assistant.log('debug', '自然言語仕様解析開始', { outputLength: llmOutput.length });
      
      // 自然言語仕様から家具タイプと寸法を抽出
      const furnitureType = this.extractFurnitureType(llmOutput, originalPrompt);
      const extractedDimensions = this.extractDimensions(llmOutput, width, depth, height);
      const keyFeatures = this.extractKeyFeatures(llmOutput);
      const constraints = this.extractConstraints(llmOutput);
      
      this.assistant.log('info', '自然言語仕様解析成功', {
        furnitureType: furnitureType,
        dimensions: extractedDimensions,
        featuresCount: keyFeatures.length,
        constraintsCount: constraints.length
      });

      // データパイプラインを更新
      this.dataPipeline.context.originalRequest = originalPrompt;
      this.dataPipeline.context.furnitureType = furnitureType;
      this.dataPipeline.context.dimensions = extractedDimensions;
      this.dataPipeline.updateStage1Output(llmOutput, keyFeatures, constraints);
      
      return {
        furniture_type: furnitureType,
        dimensions: extractedDimensions,
        description: originalPrompt,
        optimized_specification: llmOutput, // 自然言語仕様をそのまま保存
        structural_analysis: {
          natural_language_spec: true,
          key_features: keyFeatures,
          constraints: constraints,
          specification_length: llmOutput.length
        },
        analysis_complete: true,
        natural_language: true // 自然言語フラグ
      };
      
    } catch (error) {
      this.assistant.log('warn', '自然言語仕様解析失敗、フォールバック実行', { error: error.message });
      return this.getFallbackSpecification(originalPrompt, width, depth, height);
    }
  }

  // ========== 家具タイプ抽出 ==========
  extractFurnitureType(specification, originalPrompt) {
    const text = (specification + ' ' + originalPrompt).toLowerCase();
    
    if (text.includes('椅子') || text.includes('いす') || text.includes('chair')) {
      return '椅子';
    } else if (text.includes('机') || text.includes('つくえ') || text.includes('desk')) {
      return '机';
    } else if (text.includes('テーブル') || text.includes('table')) {
      return 'テーブル';
    } else if (text.includes('棚') || text.includes('たな') || text.includes('shelf')) {
      return '棚';
    } else if (text.includes('収納') || text.includes('cabinet') || text.includes('キャビネット')) {
      return '収納家具';
    }
    
    return '椅子'; // デフォルト
  }

  // ========== 寸法抽出 ==========
  extractDimensions(specification, width, depth, height) {
    const extractedDims = { width: 50, depth: 50, height: 80 }; // デフォルト値
    
    // 数値パターンを検索
    const dimensionPatterns = [
      /幅[：:]?\s*(\d+)(?:cm)?/gi,
      /奥行[き]?[：:]?\s*(\d+)(?:cm)?/gi,
      /高さ[：:]?\s*(\d+)(?:cm)?/gi,
      /(\d+)\s*×\s*(\d+)\s*×\s*(\d+)/gi
    ];
    
    // ユーザー指定寸法を優先
    if (width !== 'auto') extractedDims.width = parseInt(width);
    if (depth !== 'auto') extractedDims.depth = parseInt(depth);
    if (height !== 'auto') extractedDims.height = parseInt(height);
    
    // 仕様書から寸法を抽出
    const matches = specification.match(/(\d+)\s*×\s*(\d+)\s*×\s*(\d+)/);
    if (matches && width === 'auto' && depth === 'auto' && height === 'auto') {
      extractedDims.width = parseInt(matches[1]);
      extractedDims.depth = parseInt(matches[2]);
      extractedDims.height = parseInt(matches[3]);
    }
    
    return extractedDims;
  }

  // ========== 主要特徴抽出 ==========
  extractKeyFeatures(specification) {
    const features = [];
    const featurePatterns = [
      '曲線', '曲面', 'カーブ',
      'テーパー', '先細り',
      '装飾', 'デザイン',
      '可動', '調整',
      '収納', 'ストレージ',
      '引き出し', 'ドロワー',
      '扉', 'ドア',
      '背もたれ', 'バック',
      '肘掛け', 'アーム'
    ];
    
    featurePatterns.forEach(pattern => {
      if (specification.includes(pattern)) {
        features.push(pattern);
      }
    });
    
    return features;
  }

  // ========== 制約条件抽出 ==========
  extractConstraints(specification) {
    const constraints = [];
    
    if (specification.includes('安定') || specification.includes('転倒防止')) {
      constraints.push('安定性重視');
    }
    if (specification.includes('軽量') || specification.includes('軽い')) {
      constraints.push('軽量化');
    }
    if (specification.includes('強度') || specification.includes('丈夫')) {
      constraints.push('高強度');
    }
    if (specification.includes('省スペース') || specification.includes('コンパクト')) {
      constraints.push('省スペース');
    }
    if (specification.includes('3D印刷') || specification.includes('プリント')) {
      constraints.push('3D印刷対応');
    }
    
    return constraints;
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
    return `あなたはOBJ形式の3Dモデル生成専門家です。詳細仕様に基づいて、実用的で美しい3Dモデルを生成してください。

【OBJ生成ルール】
- Y軸上向き、単位はcm
- 頂点（v）は小数点以下2桁まで
- 面（f）は三角形または四角形
- 部品ごとにグループ（g）を定義
- 最低限必要な頂点数で効率的に構成

【出力】
## OBJ_DATA で始まり ## OBJ_DATA_END で終わる純粋なOBJデータ`;
  }

  // ========== 家具タイプ別専門プロンプト生成 ==========
  getStage2PromptByFurnitureType(furnitureType, specification) {
    const basePrompt = `あなたはOBJ形式の3Dモデル生成専門家です。
以下の仕様に基づいて、実用的で美しい${furnitureType}の3Dモデルを生成してください。

【仕様】
${specification}

【OBJ生成ルール】
- Y軸上向き、単位はcm
- 頂点（v）は小数点以下2桁まで
- 面（f）は三角形または四角形
- 部品ごとにグループ（g）を定義
- 最低限必要な頂点数で効率的に構成`;

    // 家具タイプ別の追加指示
    const typeSpecificInstructions = {
      '椅子': `
【椅子特有の要件】
- 座面は人が座れる平面または緩やかな曲面
- 背もたれは適切な角度（90-110度）
- 4本脚は安定した配置（座面の四隅から垂直）
- 脚の太さは構造的に十分な強度を確保
- 座面高さは40-45cm程度が標準`,
      
      '机': `
【机特有の要件】
- 天板は完全な平面で、エッジは適切に処理
- 脚は天板を安定して支える配置
- 天板下に十分な脚部空間を確保
- 引き出しがある場合は天板下に適切に配置
- 標準高さは70-75cm`,
      
      'テーブル': `
【テーブル特有の要件】
- 天板は完全な平面で、エッジは適切に処理
- 脚は天板を安定して支える配置
- 天板下に十分な脚部空間を確保
- 標準高さは70-75cm`,
      
      '棚': `
【棚特有の要件】
- 各段は水平で、適切な間隔
- 側板は棚板をしっかり支持
- 背板がある場合は全体を覆う
- 転倒防止を考慮した重心配置
- 棚板の厚みは2-3cm程度`,
      
      '収納家具': `
【収納家具特有の要件】
- 扉は本体に適切に取り付け
- 引き出しは収納部に収まるサイズ
- 内部の棚は可動を想定した配置
- 取っ手は使いやすい位置に配置
- 全体のバランスと安定性を重視`
    };

    const furnitureKey = this.getFurnitureTypeKey(furnitureType);
    return basePrompt + (typeSpecificInstructions[furnitureKey] || '');
  }

  // ========== 家具タイプキーの取得 ==========
  getFurnitureTypeKey(furnitureType) {
    const keyMap = {
      '椅子': '椅子',
      'イス': '椅子',
      'chair': '椅子',
      '机': '机',
      'つくえ': '机',
      'desk': '机',
      'テーブル': 'テーブル',
      'table': 'テーブル',
      '棚': '棚',
      'たな': '棚',
      'shelf': '棚',
      '収納': '収納家具',
      '収納家具': '収納家具',
      'cabinet': '収納家具'
    };
    
    return keyMap[furnitureType] || '椅子';
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
      
      // OBJデータの構造分析（エラーハンドリング強化）
      let objAnalysis;
      try {
        objAnalysis = this.analyzeOBJStructure(objData);
      } catch (error) {
        this.assistant.log('warning', 'OBJ構造分析失敗、フォールバック実行', { error: error.message });
        objAnalysis = {
          vertexCount: (objData.match(/^v /gm) || []).length,
          faceCount: (objData.match(/^f /gm) || []).length,
          groupCount: 1,
          hasTextures: false,
          hasNormals: false,
          isValid: true,
          fileSizeKB: (new Blob([objData]).size / 1024).toFixed(2)
        };
      }
      
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

  // ========== 第3段階：品質チェックと改善（新機能） ==========
  async performFinalQualityCheckAndImprove(objData) {
    try {
      // 構造的検証
      const structuralValidation = this.performStructuralValidation(objData);
      
      // LLMによる品質評価と改善提案
      const qualityAssessment = await this.callQualityImprovementLLM(
        objData, 
        structuralValidation
      );
      
      // 改善が必要な場合は修正版を生成
      if (qualityAssessment.needsImprovement) {
        const improvedObjData = await this.generateImprovedVersion(
          objData,
          qualityAssessment.improvements
        );
        
        // 改善版の再検証
        const finalValidation = this.performStructuralValidation(improvedObjData);
        
        this.assistant.log('info', '第3段階：品質改善完了', {
          originalScore: structuralValidation.score,
          improvedScore: finalValidation.score,
          improvements: qualityAssessment.improvements.length
        });
        
        return {
          originalObjData: objData,
          improvedObjData: improvedObjData,
          qualityReport: qualityAssessment.report,
          improvements: qualityAssessment.improvements,
          finalScore: finalValidation.score
        };
      }
      
      this.assistant.log('info', '第3段階：品質検証完了（改善不要）', {
        score: structuralValidation.score
      });
      
      return {
        originalObjData: objData,
        improvedObjData: objData,
        qualityReport: qualityAssessment.report,
        finalScore: structuralValidation.score
      };
      
    } catch (error) {
      this.assistant.log('error', '品質改善プロセスエラー', { error: error.message });
      throw error;
    }
  }

  // ========== 構造的検証の実装 ==========
  performStructuralValidation(objData) {
    const validation = {
      score: 100,
      issues: [],
      metrics: {}
    };
    
    // 1. 基本的なジオメトリチェック
    const geometry = this.analyzeGeometry(objData);
    validation.metrics = geometry;
    
    // 2. 物理的整合性チェック
    if (geometry.hasFloatingVertices) {
      validation.score -= 20;
      validation.issues.push('浮遊頂点が存在');
    }
    
    if (geometry.hasNonManifoldEdges) {
      validation.score -= 15;
      validation.issues.push('非多様体エッジが存在');
    }
    
    // 3. 家具としての妥当性チェック
    const furnitureCheck = this.checkFurnitureValidity(geometry);
    if (!furnitureCheck.hasStableBase) {
      validation.score -= 25;
      validation.issues.push('安定した基底面が不足');
    }
    
    if (!furnitureCheck.hasReasonableDimensions) {
      validation.score -= 20;
      validation.issues.push('寸法が非現実的');
    }
    
    // 4. 面の向きの一貫性チェック
    if (geometry.hasInconsistentNormals) {
      validation.score -= 10;
      validation.issues.push('面の向きが不統一');
    }
    
    return validation;
  }

  // ========== 高度なジオメトリ分析 ==========
  analyzeGeometry(objData) {
    const lines = objData.split('\n');
    const vertices = [];
    const faces = [];
    const edges = new Map();
    
    // 頂点と面の収集
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('v ')) {
        const coords = trimmed.substring(2).split(/\s+/).map(Number);
        vertices.push({ x: coords[0], y: coords[1], z: coords[2], used: false });
      } else if (trimmed.startsWith('f ')) {
        const indices = trimmed.substring(2).split(/\s+/)
          .map(f => parseInt(f.split('/')[0]) - 1);
        faces.push(indices);
        
        // エッジの記録
        for (let i = 0; i < indices.length; i++) {
          const v1 = indices[i];
          const v2 = indices[(i + 1) % indices.length];
          const edge = [Math.min(v1, v2), Math.max(v1, v2)].join('-');
          edges.set(edge, (edges.get(edge) || 0) + 1);
        }
      }
    });
    
    // 使用されている頂点をマーク
    faces.forEach(face => {
      face.forEach(idx => {
        if (vertices[idx]) vertices[idx].used = true;
      });
    });
    
    // 分析結果
    return {
      vertexCount: vertices.length,
      faceCount: faces.length,
      hasFloatingVertices: vertices.some(v => !v.used),
      hasNonManifoldEdges: Array.from(edges.values()).some(count => count > 2),
      boundingBox: this.calculateBoundingBox(vertices),
      centerOfMass: this.calculateCenterOfMass(vertices),
      hasInconsistentNormals: this.checkNormalConsistency(vertices, faces),
      volumeEstimate: this.estimateVolume(vertices, faces)
    };
  }

  // ========== 家具としての妥当性チェック ==========
  checkFurnitureValidity(geometry) {
    const { boundingBox, centerOfMass } = geometry;
    const width = boundingBox.max.x - boundingBox.min.x;
    const depth = boundingBox.max.z - boundingBox.min.z;
    const height = boundingBox.max.y - boundingBox.min.y;
    
    return {
      hasStableBase: (width > height * 0.3) && (depth > height * 0.3),
      hasReasonableDimensions: (width > 10 && width < 500) && 
                              (depth > 10 && depth < 500) && 
                              (height > 10 && height < 300),
      centerOfMassInBase: (centerOfMass.x > boundingBox.min.x && 
                          centerOfMass.x < boundingBox.max.x) &&
                         (centerOfMass.z > boundingBox.min.z && 
                          centerOfMass.z < boundingBox.max.z),
      aspectRatioValid: (Math.max(width, depth, height) / 
                        Math.min(width, depth, height)) < 10
    };
  }

  // ========== 幾何学計算ヘルパーメソッド ==========
  calculateBoundingBox(vertices) {
    if (vertices.length === 0) {
      return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
    }
    
    const xs = vertices.map(v => v.x);
    const ys = vertices.map(v => v.y);
    const zs = vertices.map(v => v.z);
    
    return {
      min: { x: Math.min(...xs), y: Math.min(...ys), z: Math.min(...zs) },
      max: { x: Math.max(...xs), y: Math.max(...ys), z: Math.max(...zs) }
    };
  }

  calculateCenterOfMass(vertices) {
    if (vertices.length === 0) {
      return { x: 0, y: 0, z: 0 };
    }
    
    const sum = vertices.reduce((acc, v) => ({
      x: acc.x + v.x,
      y: acc.y + v.y,
      z: acc.z + v.z
    }), { x: 0, y: 0, z: 0 });
    
    return {
      x: sum.x / vertices.length,
      y: sum.y / vertices.length,
      z: sum.z / vertices.length
    };
  }

  checkNormalConsistency(vertices, faces) {
    // 簡単な法線チェック実装
    return faces.some(face => face.length < 3);
  }

  estimateVolume(vertices, faces) {
    // 簡単な体積推定
    return vertices.length * 0.1; // プレースホルダー
  }

  // ========== 品質評価LLM呼び出し（第3段階専用） ==========
  async callQualityCheckLLM(objData) {
    try {
      // OBJデータの基本統計を取得
      let objAnalysis;
      try {
        objAnalysis = this.analyzeOBJStructure(objData);
      } catch (error) {
        this.assistant.log('warning', 'OBJ構造分析失敗、フォールバック実行', { error: error.message });
        objAnalysis = {
          vertexCount: (objData.match(/^v /gm) || []).length,
          faceCount: (objData.match(/^f /gm) || []).length,
          groupCount: 1,
          hasTextures: false,
          hasNormals: false,
          isValid: true,
          fileSizeKB: (new Blob([objData]).size / 1024).toFixed(2)
        };
      }
      
      const prompt = `以下のOBJファイルの品質評価を行ってください：

# 評価観点
1. 構造的品質（頂点数、面数、ジオメトリ整合性）
2. 寸法適切性（サイズの妥当性、比率の調和）
3. 製造可能性（3D印刷適合性、材料効率）
4. 美観・デザイン（造形美、バランス、機能性）

# 3Dモデル統計
- 頂点数: ${objAnalysis.vertexCount}
- 面数: ${objAnalysis.faceCount}
- ファイルサイズ: ${objAnalysis.fileSizeKB}KB
- グループ数: ${objAnalysis.groupCount}

# OBJデータ（抜粋）
${objData.substring(0, 2000)}${objData.length > 2000 ? '...\n（データが長いため抜粋表示）' : ''}

# 要求事項
- 日本語でマークダウン形式のレポートを作成
- 各評価項目について具体的な数値と所見を記載
- 総合スコア（100点満点）と改善提案を含める
- OBJデータの再出力は不要`;

      this.assistant.log('debug', '品質評価LLM呼び出し開始', {
        vertexCount: objAnalysis.vertexCount,
        faceCount: objAnalysis.faceCount,
        promptLength: prompt.length
      });

      const response = await this.assistant.aiManager.callLLMAPI(prompt);
      
      this.assistant.log('info', '品質評価LLM呼び出し完了', {
        responseLength: response?.length || 0,
        hasResponse: !!response
      });

      return {
        qualityReport: response || '品質評価レポートの生成に失敗しました',
        objAnalysis: objAnalysis,
        evaluationComplete: true
      };
      
    } catch (error) {
      this.assistant.log('error', '品質評価LLM呼び出し失敗', { 
        error: error.message,
        stack: error.stack 
      });
      
      // フォールバック：基本的な品質レポートを生成
      let objAnalysis;
      try {
        objAnalysis = this.analyzeOBJStructure(objData);
      } catch (analysisError) {
        objAnalysis = {
          vertexCount: (objData.match(/^v /gm) || []).length,
          faceCount: (objData.match(/^f /gm) || []).length,
          groupCount: 1,
          hasTextures: false,
          hasNormals: false,
          isValid: true,
          fileSizeKB: (new Blob([objData]).size / 1024).toFixed(2)
        };
      }
      
      const fallbackReport = this.generateFallbackQualityReport(objAnalysis);
      
      return {
        qualityReport: fallbackReport,
        objAnalysis: objAnalysis,
        evaluationComplete: false,
        error: error.message
      };
    }
  }

  // ========== フォールバック品質レポート生成 ==========
  generateFallbackQualityReport(objAnalysis) {
    const { vertexCount, faceCount, fileSizeKB, isValid } = objAnalysis;
    
    // 基本的な品質スコア計算
    let score = 100;
    let issues = [];
    
    if (vertexCount < 8) {
      score -= 30;
      issues.push('頂点数が少なすぎます（最低8個推奨）');
    } else if (vertexCount > 10000) {
      score -= 20;
      issues.push('頂点数が多すぎます（パフォーマンス影響）');
    }
    
    if (faceCount < 6) {
      score -= 25;
      issues.push('面数が少なすぎます（最低6面推奨）');
    }
    
    if (!isValid) {
      score -= 50;
      issues.push('無効なOBJデータです');
    }
    
    if (fileSizeKB > 1000) {
      score -= 15;
      issues.push('ファイルサイズが大きすぎます');
    }
    
    score = Math.max(0, score);
    
    return `# 3D家具モデル品質評価レポート

## 📊 基本統計
- **頂点数**: ${vertexCount}
- **面数**: ${faceCount}
- **ファイルサイズ**: ${fileSizeKB}KB
- **データ有効性**: ${isValid ? '✅ 有効' : '❌ 無効'}

## 🏆 総合評価
**スコア**: ${score}/100点

## 📋 評価詳細

### 構造的品質
${vertexCount >= 8 && vertexCount <= 10000 ? '✅ 適切な頂点数' : '⚠️ 頂点数要改善'}
${faceCount >= 6 ? '✅ 適切な面数' : '⚠️ 面数要改善'}

### 製造可能性
${fileSizeKB <= 1000 ? '✅ 適切なファイルサイズ' : '⚠️ ファイルサイズ要最適化'}

### 発見された問題
${issues.length > 0 ? issues.map(issue => `- ${issue}`).join('\n') : '- 特に問題はありません'}

## 💡 改善提案
${score < 80 ? `
- より詳細な形状設計を検討してください
- 適切な面分割を行ってください
- ファイルサイズの最適化を検討してください
` : '現在の品質は良好です。'}

*注意: このレポートは自動生成されました。より詳細な評価については手動確認を推奨します。*`;
  }

  // ========== 品質改善LLM呼び出し ==========
  async callQualityImprovementLLM(objData, structuralValidation) {
    const prompt = `以下のOBJデータを評価し、必要に応じて改善提案を行ってください。

【構造的検証結果】
スコア: ${structuralValidation.score}/100
問題点: ${structuralValidation.issues.join(', ') || 'なし'}
頂点数: ${structuralValidation.metrics.vertexCount}
面数: ${structuralValidation.metrics.faceCount}

【OBJデータ】
${objData.substring(0, 1000)}...

【評価基準】
1. 構造的整合性
2. 家具としての実用性
3. 3D印刷適合性
4. 美観・デザイン

改善が必要な場合は、具体的な改善提案を含めてください。`;

    try {
      const response = await this.assistant.aiManager.callLLMAPI(prompt);
      
      // 改善の必要性を判定
      const needsImprovement = structuralValidation.score < 80 || 
                              response.includes('改善') || 
                              response.includes('修正');
      
      return {
        needsImprovement: needsImprovement,
        report: response,
        improvements: structuralValidation.issues
      };
    } catch (error) {
      this.assistant.log('error', '品質改善LLM呼び出し失敗', { error: error.message });
      throw error;
    }
  }

  // ========== 改善版生成 ==========
  async generateImprovedVersion(objData, improvements) {
    const improvementPrompt = `以下のOBJデータを以下の改善点に従って修正してください：

【改善点】
${improvements.join('\n')}

【元のOBJデータ】
${objData}

【要求事項】
- 元の基本構造を保持
- 改善点を適切に反映
- 3D印刷可能な形状
- 実用的で美しいデザイン`;

    try {
      const improvedData = await this.assistant.aiManager.callLLMAPI(improvementPrompt);
      return this.cleanOBJData(improvedData);
    } catch (error) {
      this.assistant.log('error', '改善版生成失敗', { error: error.message });
      return objData; // 失敗時は元のデータを返す
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

    // OBJデータの基本分析（エラーハンドリング強化）
    let analysis;
    try {
      analysis = this.analyzeOBJStructure(objData);
    } catch (error) {
      this.assistant.log('warning', 'OBJ構造分析失敗、フォールバック実行', { error: error.message });
      analysis = {
        vertexCount: (objData.match(/^v /gm) || []).length,
        faceCount: (objData.match(/^f /gm) || []).length,
        groupCount: 1,
        hasTextures: false,
        hasNormals: false,
        isValid: true,
        fileSizeKB: (new Blob([objData]).size / 1024).toFixed(2)
      };
    }
    const fileSizeKB = analysis.fileSizeKB;

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

    // OBJデータの簡易分析（エラーハンドリング強化）
    let objAnalysis;
    try {
      objAnalysis = this.analyzeOBJStructure(originalObjData);
    } catch (error) {
      this.assistant.log('warning', 'OBJ構造分析失敗、フォールバック実行', { error: error.message });
      objAnalysis = {
        vertexCount: (originalObjData.match(/^v /gm) || []).length,
        faceCount: (originalObjData.match(/^f /gm) || []).length,
        groupCount: 1,
        hasTextures: false,
        hasNormals: false,
        isValid: true,
        fileSizeKB: (new Blob([originalObjData]).size / 1024).toFixed(2)
      };
    }

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

  // ========== OBJ構造分析（シンプル版） ==========
  analyzeOBJStructure(objData) {
    try {
      if (!objData || typeof objData !== 'string') {
        return {
          vertexCount: 0,
          faceCount: 0,
          groupCount: 0,
          hasTextures: false,
          hasNormals: false,
          isValid: false,
          fileSizeKB: 0
        };
      }

      const lines = objData.split('\n');
      let vertexCount = 0;
      let faceCount = 0;
      let groupCount = 0;
      let hasTextures = false;
      let hasNormals = false;
      
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('v ')) {
          vertexCount++;
        } else if (trimmed.startsWith('f ')) {
          faceCount++;
        } else if (trimmed.startsWith('g ')) {
          groupCount++;
        } else if (trimmed.startsWith('vt ')) {
          hasTextures = true;
        } else if (trimmed.startsWith('vn ')) {
          hasNormals = true;
        }
      });

      const fileSizeKB = (new Blob([objData]).size / 1024).toFixed(2);
      
      return {
        vertexCount: vertexCount,
        faceCount: faceCount,
        groupCount: Math.max(groupCount, 1), // 最低1グループとして扱う
        hasTextures: hasTextures,
        hasNormals: hasNormals,
        isValid: vertexCount > 0 && faceCount > 0,
        fileSizeKB: parseFloat(fileSizeKB)
      };
      
    } catch (error) {
      this.assistant.log('error', 'OBJ構造分析エラー', { 
        error: error.message,
        dataLength: objData?.length || 0
      });
      
      return {
        vertexCount: 0,
        faceCount: 0,
        groupCount: 0,
        hasTextures: false,
        hasNormals: false,
        isValid: false,
        fileSizeKB: 0,
        error: error.message
      };
    }
  }
}