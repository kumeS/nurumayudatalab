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
    const specOptimizationPrompt = this.buildSpecificationPrompt(prompt, width, depth, height);

    const requestData = {
      model: this.modelName,
      temperature: 0.2,
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

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20秒タイムアウト

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

      return content;
    } catch (error) {
      this.assistant.log('error', '仕様最適化LLM呼び出し失敗', { error: error.message });
      throw error;
    }
  }

  // ========== 仕様最適化用システムプロンプト ==========
  getSpecificationSystemPrompt() {
    return `あなたは3D家具設計の専門家です。ユーザーの要求を分析し、OBJ形式での3Dモデル生成に必要な詳細な構造設計情報を提供してください。

【重要指示】
- 材質、製造要件、安全要件などは不要です。OBJ形式での3D形状定義に特化してください。
- 説明文、要約文、感想は一切出力しないでください。
- 技術仕様のみを簡潔に出力してください。

【出力形式】
以下の8項目を必ず含めて、明確に区分して出力してください：

## 家具種別
[椅子/テーブル/収納家具] - 具体的な家具の分類

## 全体の推奨寸法
幅[数値]cm × 奥行[数値]cm × 高さ[数値]cm

## 3D構造詳細
基本的な立体構造の説明と全体の形状概要

## 主要部品の配置
- [部品名]: 位置(X,Y,Z) サイズ(W×D×H)
- [部品名]: 位置(X,Y,Z) サイズ(W×D×H)
※座標は原点(0,0,0)を基準とした3D座標系で記述

## 立体的特徴
- 曲線部分: [具体的な曲線の配置と半径]
- テーパー部分: [先細り部分の開始・終了寸法]
- 面取り部分: [エッジの丸み処理の半径]

## 座標系での配置
- 原点設定: [どこを原点(0,0,0)とするか]
- 軸方向: [X軸、Y軸、Z軸の方向定義]
- 基準面: [底面、座面などの基準となる面の配置]

## 接続部分の構造
- [部品間の接続方法と接続座標]
- [角度や傾斜がある場合の詳細]

## OBJ形式での出力ドラフト
簡易的なOBJコードの例（主要な頂点とフェイスの定義例）

【禁止事項】
❌「この設計では〜」「実際の3Dモデリングでは〜」などの説明文
❌「〜を定義しました」「〜を示しています」などの要約文
❌ 設計についての感想や総括

【出力要求】
上記8項目の技術仕様のみを簡潔に出力してください。各項目は OBJ 3Dモデル生成に直接活用できる具体的な数値と座標情報を含めてください。`;
  }

  // ========== 仕様最適化プロンプト構築 ==========
  buildSpecificationPrompt(prompt, width, depth, height) {
    let dimensionInfo = '';
    if (width !== 'auto' || depth !== 'auto' || height !== 'auto') {
      dimensionInfo = `\n【指定寸法】\n幅: ${width}cm, 奥行: ${depth}cm, 高さ: ${height}cm`;
    }

    return `以下の家具設計要求を分析し、3D形状構造を詳細に設計してください。

【元の要求】
${prompt}${dimensionInfo}

【3D形状分析の観点】
- 家具の基本形状と部品構成
- 各部品の3D座標での配置位置
- 立体的な特徴（曲線、テーパー、面取り）
- 部品同士の接続方法と構造
- OBJ座標系での形状定義

材質や製造要件ではなく、3D空間での形状構造に特化して分析してください。`;
  }

  // ========== LLM出力の解析 ==========
  parseOptimizedSpecification(llmOutput, originalPrompt, width, depth, height) {
    try {
      // 家具種別の抽出
      let furnitureType = '椅子';
      if (llmOutput.includes('テーブル') || llmOutput.includes('table') || llmOutput.includes('机')) {
        furnitureType = 'テーブル';
      } else if (llmOutput.includes('本棚') || llmOutput.includes('棚') || llmOutput.includes('収納')) {
        furnitureType = '収納家具';
      } else if (llmOutput.includes('椅子') || llmOutput.includes('チェア') || llmOutput.includes('chair')) {
        furnitureType = '椅子';
      }

      // 推奨寸法の抽出
      const dimensionMatch = llmOutput.match(/推奨寸法[：:]\s*幅(\d+)cm.*?奥行(\d+)cm.*?高さ(\d+)cm/);
      let dimensions = {
        width: width !== 'auto' ? parseInt(width) : 40,
        depth: depth !== 'auto' ? parseInt(depth) : 40,
        height: height !== 'auto' ? parseInt(height) : 80
      };

      if (dimensionMatch) {
        dimensions = {
          width: width !== 'auto' ? parseInt(width) : parseInt(dimensionMatch[1]),
          depth: depth !== 'auto' ? parseInt(depth) : parseInt(dimensionMatch[2]),
          height: height !== 'auto' ? parseInt(height) : parseInt(dimensionMatch[3])
        };
      }

      // 3D構造情報の抽出
      const structuralInfo = this.extract3DStructureInfo(llmOutput);

      return {
        furniture_type: furnitureType,
        dimensions: dimensions,
        description: originalPrompt,
        optimized_specification: llmOutput,
        structural_analysis: structuralInfo,
        analysis_complete: true
      };
    } catch (error) {
      this.assistant.log('warn', '仕様解析失敗、フォールバック実行', { error: error.message });
      return this.getFallbackSpecification(originalPrompt, width, depth, height);
    }
  }

  // 3D構造情報抽出メソッドを追加
  extract3DStructureInfo(llmOutput) {
    const structuralInfo = {
      main_components: [],
      curved_parts: [],
      tapered_parts: [],
      beveled_edges: [],
      coordinate_layout: ""
    };

    try {
      // 主要部品の抽出
      const componentMatches = llmOutput.match(/- ([^:]+): 位置\(([^)]+)\)、サイズ\(([^)]+)\)/g);
      if (componentMatches) {
        componentMatches.forEach(match => {
          const parts = match.match(/- ([^:]+): 位置\(([^)]+)\)、サイズ\(([^)]+)\)/);
          if (parts) {
            structuralInfo.main_components.push({
              name: parts[1],
              position: parts[2],
              size: parts[3]
            });
          }
        });
      }

      // 曲線部分の抽出
      const curvedMatch = llmOutput.match(/曲線部分: (.+)/);
      if (curvedMatch) {
        structuralInfo.curved_parts.push(curvedMatch[1]);
      }

      // テーパー部分の抽出
      const taperedMatch = llmOutput.match(/テーパー部分: (.+)/);
      if (taperedMatch) {
        structuralInfo.tapered_parts.push(taperedMatch[1]);
      }

      // 面取り部分の抽出
      const beveledMatch = llmOutput.match(/面取り部分: (.+)/);
      if (beveledMatch) {
        structuralInfo.beveled_edges.push(beveledMatch[1]);
      }

      // 座標配置情報の抽出
      const coordinateSection = llmOutput.match(/### 座標系での配置:[\s\S]*?(?=###|$)/);
      if (coordinateSection) {
        structuralInfo.coordinate_layout = coordinateSection[0];
      }

    } catch (error) {
      this.assistant.log('warn', '3D構造情報抽出エラー', { error: error.message });
    }

    return structuralInfo;
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
      optimized_specification: '（3D形状分析をスキップしました）',
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
        return '【OBJ形式3Dモデル生成指示】\n第1段階分析結果に基づいて、完璧なOBJファイルを生成してください。\n\n❌ 第1段階データが利用できません。';
      }
      
      // 第1段階の完全な出力テキストを取得
      const stage1FullOutput = furnitureSpec.optimized_specification || '第1段階分析結果が利用できません';
      
      // 基本情報の構築
      const furnitureType = furnitureSpec.furniture_type || '家具';
      const dimensions = furnitureSpec.dimensions || {};
      const analysisComplete = furnitureSpec.analysis_complete || false;
      
      // 寸法情報の詳細構築
      let dimensionInfo = '';
      if (dimensions.width || dimensions.depth || dimensions.height) {
        dimensionInfo = `\n📏 【確定寸法仕様】\n   - 幅: ${dimensions.width || 'auto'}cm\n   - 奥行: ${dimensions.depth || 'auto'}cm\n   - 高さ: ${dimensions.height || 'auto'}cm\n`;
      }
      
      // 分析状況の表示
      const analysisStatus = analysisComplete ? '✅ LLM分析完了' : '⚠️ フォールバック使用';
      
      // 第2段階専用の詳細プロンプトを構築（第1段階の完全な出力結果をそのまま含む）
      const formattedPrompt = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【OBJ形式3Dモデル生成指示】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 【処理概要】
第1段階で分析・最適化された完全な結果を、そのまま正確にOBJ形式の3Dモデルとして実現してください。

📊 【第1段階分析状況】
🔧 家具種別: ${furnitureType}
📋 分析状況: ${analysisStatus}${dimensionInfo}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【第1段階の完全出力結果】※以下の内容をそのまま100%反映してください
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${stage1FullOutput}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【第2段階実行指示】※上記の第1段階結果の全内容を正確にOBJ化
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 【実装推奨事項】
• 第1段階分析結果の主要な寸法・構造・デザインを3D化の基準として活用
• 寸法は概ね指定通りを目指し、3D化に適した調整を柔軟に適用
• 重要な構造的特徴を立体形状として表現
• 材質情報・デザイン要件を参考に、魅力的な形状を創造

✅ 【OBJ品質目標】
• 安定した基本的な3Dジオメトリ
• 適切な頂点密度（10-1000点）と面構成（10-1000面）
• 基本的なOBJ構文に準拠
• 美しく実用的な家具モデルとしての品質

✅ 【基本方針】
💡 第1段階結果を参考に、3D化に適した創造的解釈を歓迎
💡 OBJデータのみを出力（説明文・コメント等は含めない）
💡 技術的制約を考慮した合理的な最適化を推奨

上記の第1段階分析結果を参考に、美しく実用的なOBJファイルを創造的に生成してください。`;

      this.assistant.log('debug', '第1段階結果フォーマット完了', { 
        promptLength: formattedPrompt.length,
        furnitureType: furnitureType,
        analysisComplete: analysisComplete,
        stage1OutputLength: stage1FullOutput.length
      });
      
      return formattedPrompt;
      
    } catch (error) {
      this.assistant.log('error', '第1段階結果フォーマットエラー', { error: error.message });
      
      // エラー時のフォールバック
      return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【OBJ形式3Dモデル生成指示】（フォールバック）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ 【エラー情報】
第1段階分析結果の取得に失敗しました。

⚡ 【フォールバック指示】
基本的な家具の形状特徴を活かした、製造可能で美しいOBJファイルを生成してください。
システムプロンプトで指定されたOBJ形式フォーマットを厳格に遵守し、エラーのない完璧なOBJデータのみを出力してください。`;
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

${objData}`
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
    return `あなたは3D家具モデルの品質評価専門家です。提供されたOBJファイルを詳細に分析し、品質評価レポートを作成してください。

【評価項目】
1. 構造的品質の評価
   - 頂点数・面数の適切性
   - ジオメトリの整合性（閉じた形状、法線方向）
   - 重複頂点や孤立要素の有無
   - 面の構成と品質

2. 家具としての実用性評価
   - 寸法・比率の妥当性
   - 安定性・強度の評価
   - 人間工学的配慮の評価
   - 機能性の適切性

3. 製造可能性の評価
   - 3D出力対応レベル
   - 材料効率性
   - 組み立て・加工の容易さ
   - コスト効率性

4. 美観・デザイン品質の評価
   - 造形美の評価
   - ディテールの品質
   - 全体的なバランス
   - 家具としての魅力度

【評価出力形式】
## 品質評価結果

### 構造的品質
- 頂点数: [数値] (評価: [優秀/良好/改善要/不良])
- 面数: [数値] (評価: [優秀/良好/改善要/不良])
- ジオメトリ整合性: [評価とコメント]

### 実用性
- 寸法適切性: [評価とコメント]
- 安定性: [評価とコメント]
- 機能性: [評価とコメント]

### 製造可能性
- 3D出力適合性: [評価とコメント]
- 材料効率: [評価とコメント]

### 美観・デザイン
- 造形美: [評価とコメント]
- 全体評価: [評価とコメント]

### 総合評価
- 総合スコア: [点数]/100点
- 推奨事項: [具体的な推奨事項]

【重要】
- OBJファイルの修正・改善は行わないでください
- 評価レポートのみを出力してください
- 客観的で建設的な評価を心がけてください

提供されたOBJファイルを上記の観点から詳細に評価し、品質評価レポートを作成してください。`;
  }

  // ========== 第3段階：品質評価結果データ保存 ==========
  storeQualityCheckResults(qualityCheckResult, originalObjData) {
    if (!qualityCheckResult) {
      return;
    }

    // データを保存（システムプロンプトと入力プロンプトも含める）
    this.stage3Data = {
      qualityReport: qualityCheckResult.qualityReport,
      originalObjData: originalObjData,
      systemPrompt: this.getQualityCheckSystemPrompt(),
      inputPrompt: `以下のOBJファイルの品質評価を行ってください：

${originalObjData}`,
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