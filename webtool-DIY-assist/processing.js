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
    };
  }



  updateStage1Output(specification, keyFeatures = [], constraints = []) {
    this.context.stage1Output = {
      specification,
      keyFeatures,
      constraints
    };
  }




}

class ProcessingManager {
  constructor() {
    this.stagePipeline = new StageDataPipeline();
    this.isProcessing = false;
    this.shouldStop = false;
    this.currentObjData = null;
    this.stage2Data = null;
    this.assistant = null;
  }

  setAssistant(assistant) {
    this.assistant = assistant;
  }

  // ========== 停止機能 ==========
  stopProcessing() {
    if (!this.isProcessing) {
      this.assistant.log('info', '停止処理: 実行中の処理がありません');
      return;
    }
    
    this.assistant.log('info', 'AI処理を停止しています...');
    
    // 現在のリクエストをキャンセル
    if (this.currentController) {
      this.currentController.abort();
    }
    
    // タイムアウトをクリア
    if (this.currentTimeoutId) {
      clearTimeout(this.currentTimeoutId);
    }
    
    // 状態をリセット
    this.isProcessing = false;
    this.currentController = null;
    this.currentTimeoutId = null;
    
    // UI状態をリセット
    this.assistant.showLoading(false);
    this.assistant.showStopButton(false);
    this.assistant.showThreeStageProgress(false);
    
    // 停止メッセージを表示
    this.assistant.showWarning('AI処理が停止されました。');
    
    this.assistant.log('info', 'AI処理が正常に停止されました');
  }

  // ========== メインプロセス（3段階） ==========
  async executeFullProcess(prompt) {
    if (!this.assistant) {
      console.error('ProcessingManager: assistantが設定されていません');
      throw new Error('ProcessingManagerが正しく初期化されていません');
    }
    
    try {
      this.isProcessing = true;
      this.shouldStop = false;
      this.assistant.showThreeStageProgress(true);
      this.assistant.hideMessages();
      
      // 第1段階：仕様分析
      this.assistant.updateStageProgress(1, 'active', '仕様分析中...');
      const furnitureSpec = await this.analyzeAndOptimize(prompt);
      
      if (this.shouldStop) {
        this.assistant.updateStageProgress(1, 'pending', '停止しました');
        return null;
      }
      
      // 第1段階の生出力データを保存
      this.assistant.saveStageRawData(1, furnitureSpec.rawLLMOutput || furnitureSpec.specification || '第1段階の生出力データが利用できません');
      // iマークを表示
      setTimeout(() => this.assistant.showStageInfoButton(1), 50);
      
      this.assistant.updateStageProgress(1, 'completed', '仕様分析完了');

      // 第2段階：3Dモデル生成
      this.assistant.updateStageProgress(2, 'active', '3Dモデル生成中... (DeepSeek推論モデル使用・時間がかかります)');
      const objData = await this.generateUnifiedModel(prompt, furnitureSpec);
      
        // 第2段階の生出力データを保存（rawOutputを保存）
        if (this.stage2Data && this.stage2Data.rawOutput) {
          this.assistant.saveStageRawData(2, this.stage2Data.rawOutput);
          // iマークを表示
          setTimeout(() => this.assistant.showStageInfoButton(2), 50);
        }
        
        this.assistant.updateStageProgress(2, 'completed', '3Dモデル生成完了');

      // 最終データ処理
      const finalObjData = objData;
      
      // 最終結果を保存
      this.storeModelGenerationResults(finalObjData, furnitureSpec);
      
      // プロジェクト保存
      this.assistant.saveCurrentProject(prompt, finalObjData, null, furnitureSpec);
      
      return {
        objData: finalObjData,
        furnitureSpec: furnitureSpec
      };
      
    } catch (error) {
      this.assistant.log('error', 'executeFullProcess全体エラー', { error: error.message });
      this.assistant.updateStageProgress(this.shouldStop ? 1 : 2, 'error', 'エラー発生');
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }



  // ========== OBJデータクリーニング ==========
  cleanOBJData(rawData) {
    this.assistant.log('debug', 'OBJデータクリーニング開始 (DeepSeek-R1対応強化版)', { 
      dataLength: rawData?.length || 0,
      dataType: typeof rawData,
      preview: rawData?.substring(0, 200)
    });

    if (!rawData || typeof rawData !== 'string') {
      this.assistant.log('warn', '無効なOBJデータ', { rawData });
      return '';
    }

    // DeepSeek-R1の出力からOBJ部分を抽出（強化版）
    let objContent = '';
    
    // 1. 明確なOBJデータ境界を検出
    const objPatterns = [
      // パターン1: ```obj または ```で囲まれている
      /```(?:obj)?\n?([\s\S]*?)```/gi,
      // パターン2: OBJファイル、OBJ形式などの説明後のデータ
      /(?:OBJファイル|OBJ形式|3Dモデル)[^:\n]*[:：]\s*\n?([\s\S]*?)(?=\n\n|\n[^\sv\sf\s#\so\sg\svn\svt]|$)/gi,
      // パターン3: 最初のv行から最後のf行まで
      /(v\s+[\d\-\.\s]+[\s\S]*?f\s+[\d\s\/]+(?:[\s\S]*?f\s+[\d\s\/]+)*)/gi,
      // パターン4: # から始まるOBJコメントから検出
      /(#[^\n]*\n(?:[\s\S]*?)(?:v\s+[\d\-\.\s]+[\s\S]*?f\s+[\d\s\/]+(?:[\s\S]*?f\s+[\d\s\/]+)*))/gi
    ];
    
    for (const pattern of objPatterns) {
      const matches = rawData.match(pattern);
      if (matches && matches.length > 0) {
        for (const match of matches) {
          const content = match.replace(/```(?:obj)?/gi, '').trim();
          // v行とf行の両方が含まれているかチェック
          if (content.includes('v ') && content.includes('f ')) {
            objContent = content;
            this.assistant.log('info', 'OBJデータパターンマッチ成功', { 
              pattern: pattern.toString(),
              contentLength: content.length 
            });
            break;
          }
        }
        if (objContent) break;
      }
    }
    
    // パターンマッチに失敗した場合、より柔軟な抽出を試行
    if (!objContent) {
      this.assistant.log('debug', 'パターンマッチ失敗、柔軟抽出を実行');
      
      // 推論過程のテキストを除去（DeepSeek-R1特有）
      let cleaned = rawData;
      cleaned = cleaned.replace(/(?:思考|推論|分析|考察)[：:]\s*[\s\S]*?(?=(?:v\s|f\s|#|\n\n))/gi, '');
      cleaned = cleaned.replace(/(?:結論|解答|回答)[：:]\s*[\s\S]*?(?=(?:v\s|f\s|#|\n\n))/gi, '');
      
      // マークダウンブロック除去
      cleaned = cleaned
        .replace(/```obj\s*/gi, '')
        .replace(/```\s*/gi, '')
        .replace(/```/g, '');
      
      // 最初のv行または#行から開始するOBJデータを抽出
      const objStartMatch = cleaned.match(/((?:#[^\n]*\n)*(?:v\s+[\d\-\.\s]+|f\s+[\d\s\/]+)[\s\S]*)/);
      if (objStartMatch) {
        objContent = objStartMatch[1];
      } else {
        objContent = cleaned;
      }
    }
    
    // 2. JSON形式の出力からOBJデータを抽出（DeepSeek-R1が構造化出力する場合）
    if (!objContent && rawData.includes('{') && rawData.includes('}')) {
      const jsonMatch = rawData.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const jsonData = JSON.parse(jsonMatch[0]);
          // JSON内のOBJデータを探す
          for (const [key, value] of Object.entries(jsonData)) {
            if (typeof value === 'string' && value.includes('v ') && value.includes('f ')) {
              this.assistant.log('info', 'JSON内からOBJデータを抽出', { key });
              objContent = value;
              break;
            }
          }
        } catch (e) {
          this.assistant.log('debug', 'JSON解析失敗、通常処理を継続');
        }
      }
    }

    if (!objContent) {
      this.assistant.log('warn', 'OBJデータを抽出できませんでした', { 
        rawDataPreview: rawData.substring(0, 500) 
      });
      objContent = rawData; // フォールバック
    }

    // 3. OBJデータの行レベルクリーニング
    const lines = objContent.split('\n');
    const cleanedLines = [];
    let vertexCount = 0;
    let faceCount = 0;
    
    for (let line of lines) {
      const trimmed = line.trim();
      
      // 空行をスキップ
      if (trimmed === '') continue;
      
      // コメント行の処理
      if (trimmed.startsWith('#')) {
        // 有用なコメントのみ保持（家具名、説明など）
        if (trimmed.includes('vertex') || trimmed.includes('face') || 
            trimmed.includes('object') || trimmed.includes('group') ||
            trimmed.includes('furniture') || trimmed.includes('chair') ||
            trimmed.includes('desk') || trimmed.includes('table') ||
            trimmed.length < 100) { // 短いコメントは保持
          cleanedLines.push(trimmed);
        }
        continue;
      }
      
      // 頂点データの検証・クリーニング
      if (trimmed.startsWith('v ')) {
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 4) {
          const coords = parts.slice(1, 4).map(coord => {
            const num = parseFloat(coord);
            return isNaN(num) ? 0 : num; // NaNの場合は0に修正
          });
          
          if (coords.every(coord => isFinite(coord) && Math.abs(coord) < 10000)) {
            cleanedLines.push(`v ${coords.join(' ')}`);
            vertexCount++;
          } else {
            this.assistant.log('debug', '異常な頂点座標を修正', { 
              original: trimmed, 
              coords 
            });
          }
        }
      } 
      // 面データの検証・クリーニング
      else if (trimmed.startsWith('f ')) {
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 4) {
          const indices = [];
          let validFace = true;
          
          for (let i = 1; i < parts.length; i++) {
            // "1/1/1" 形式や "1//1" 形式にも対応
            const indexStr = parts[i].split('/')[0];
            const index = parseInt(indexStr);
            
            if (isNaN(index) || index <= 0) {
              validFace = false;
              break;
            }
            indices.push(index);
          }
          
          if (validFace && indices.length >= 3) {
            cleanedLines.push(`f ${indices.join(' ')}`);
            faceCount++;
          } else {
            this.assistant.log('debug', '無効な面定義をスキップ', { line: trimmed });
          }
        }
      } 
      // その他のOBJ要素
      else if (trimmed.startsWith('vn ') || trimmed.startsWith('vt ') || 
               trimmed.startsWith('g ') || trimmed.startsWith('o ') ||
               trimmed.startsWith('s ') || trimmed.startsWith('mtllib ') ||
               trimmed.startsWith('usemtl ')) {
        cleanedLines.push(trimmed);
      }
      // DeepSeek-R1特有の余分なテキストを無視
      else if (trimmed.length > 0 && 
               !trimmed.includes('思考') && 
               !trimmed.includes('推論') &&
               !trimmed.includes('分析')) {
        this.assistant.log('debug', '不明なOBJ行をスキップ', { 
          line: trimmed.substring(0, 50) 
        });
      }
    }

    const result = cleanedLines.join('\n');
    
    this.assistant.log('info', 'DeepSeek-R1対応OBJクリーニング完了', {
      originalLength: rawData.length,
      extractedLength: objContent.length,
      cleanedLength: result.length,
      vertexCount,
      faceCount,
      hasValidOBJ: vertexCount > 0 && faceCount > 0
    });

    // 最小要件チェック（DeepSeek用に緩和）
    if (vertexCount < 3 || faceCount < 1) {
      this.assistant.log('warn', 'OBJデータが不完全、フォールバック生成', { 
        vertexCount, 
        faceCount,
        objContentPreview: objContent.substring(0, 300)
      });
      
      // フォールバック: 簡単な家具を生成
      const fallbackOBJ = this.generateFallbackOBJ();
      this.assistant.log('info', 'フォールバック家具を生成', { 
        fallbackLength: fallbackOBJ.length 
      });
      return fallbackOBJ;
    }

    // 不完全なOBJデータの修復機能（新機能）
    const repairedData = this.repairIncompleteOBJ(result, vertexCount, faceCount);
    if (repairedData !== result) {
      this.assistant.log('info', 'OBJデータを修復しました', {
        originalLength: result.length,
        repairedLength: repairedData.length,
        repairType: 'トークン切断対応'
      });
      return repairedData;
    }

    return result;
  }

  // ========== 不完全なOBJデータの修復機能 ==========
  repairIncompleteOBJ(objData, vertexCount, faceCount) {
    this.assistant.log('debug', '不完全OBJデータ修復開始', { 
      vertexCount, 
      faceCount 
    });

    const lines = objData.split('\n');
    const repairedLines = [...lines];
    let repairsMade = 0;

    // 1. 最後の行が不完全かチェック
    const lastLine = lines[lines.length - 1]?.trim();
    if (lastLine && !lastLine.startsWith('#')) {
      // 不完全なv行またはf行を検出
      if (lastLine.startsWith('v ') && lastLine.split(' ').length < 4) {
        this.assistant.log('info', '不完全な頂点行を除去', { line: lastLine });
        repairedLines.pop();
        repairsMade++;
      } else if (lastLine.startsWith('f ') && lastLine.split(' ').length < 4) {
        this.assistant.log('info', '不完全な面行を除去', { line: lastLine });
        repairedLines.pop();
        repairsMade++;
      }
    }

    // 2. 面数が頂点数に比べて異常に少ない場合の修復
    const finalVertexCount = (repairedLines.join('\n').match(/^v\s/gm) || []).length;
    const finalFaceCount = (repairedLines.join('\n').match(/^f\s/gm) || []).length;
    
    if (finalVertexCount >= 8 && finalFaceCount < Math.floor(finalVertexCount / 8)) {
      this.assistant.log('info', '面数不足を検出、最小限の面を自動生成');
      
      // 最低限の面を自動生成（基本的な三角形・四角形）
      const additionalFaces = this.generateMinimalFaces(finalVertexCount, finalFaceCount);
      if (additionalFaces.length > 0) {
        repairedLines.push('# 自動生成された補完面');
        repairedLines.push(...additionalFaces);
        repairsMade += additionalFaces.length;
        
        this.assistant.log('info', '面を自動補完', {
          addedFaces: additionalFaces.length,
          newTotalFaces: finalFaceCount + additionalFaces.length
        });
      }
    }

    // 3. 構造的整合性チェック（家具として最低限の要素があるか）
    const hasMinimalStructure = this.validateMinimalFurnitureStructure(repairedLines.join('\n'));
    if (!hasMinimalStructure.isValid) {
      this.assistant.log('warn', '家具として不完全な構造を検出', {
        issues: hasMinimalStructure.issues
      });
      
      // 基本的な立方体構造を追加
      const basicStructure = this.generateBasicFurnitureStructure();
      repairedLines.push('# 基本構造補完');
      repairedLines.push(...basicStructure);
      repairsMade += basicStructure.length;
    }

    if (repairsMade > 0) {
      this.assistant.log('info', 'OBJデータ修復完了', {
        repairsMade,
        originalLines: lines.length,
        repairedLines: repairedLines.length
      });
    }

    return repairedLines.join('\n');
  }

  // ========== 最小限の面を自動生成 ==========
  generateMinimalFaces(vertexCount, existingFaceCount) {
    const faces = [];
    
    // 頂点数に基づいて基本的な面を生成
    if (vertexCount >= 4 && existingFaceCount === 0) {
      // 最初の4つの頂点で四角形を作成
      faces.push('f 1 2 3 4');
    } else if (vertexCount >= 8 && existingFaceCount < 2) {
      // 立方体の上面と下面
      faces.push('f 1 2 3 4');
      faces.push('f 5 6 7 8');
    }
    
    // 追加の三角形面（頂点が余っている場合）
    const remainingVertices = vertexCount - (existingFaceCount * 3);
    if (remainingVertices >= 3) {
      const triangleCount = Math.min(3, Math.floor(remainingVertices / 3));
      for (let i = 0; i < triangleCount; i++) {
        const v1 = (existingFaceCount * 3) + (i * 3) + 1;
        const v2 = v1 + 1;
        const v3 = v1 + 2;
        if (v3 <= vertexCount) {
          faces.push(`f ${v1} ${v2} ${v3}`);
        }
      }
    }
    
    return faces;
  }

  // ========== 家具の最小構造検証 ==========
  validateMinimalFurnitureStructure(objData) {
    const validation = {
      isValid: true,
      issues: []
    };

    const vertexCount = (objData.match(/^v\s/gm) || []).length;
    const faceCount = (objData.match(/^f\s/gm) || []).length;

    // 最小要件チェック
    if (vertexCount < 4) {
      validation.isValid = false;
      validation.issues.push('頂点数不足（最低4個必要）');
    }

    if (faceCount < 1) {
      validation.isValid = false;
      validation.issues.push('面定義なし');
    }

    // 頂点と面の比率チェック
    if (vertexCount > 0 && faceCount > 0) {
      const ratio = faceCount / vertexCount;
      if (ratio < 0.1) {  // 面数が頂点数の10%未満
        validation.isValid = false;
        validation.issues.push('面数が頂点数に対して少なすぎる');
      }
    }

    return validation;
  }

  // ========== 基本的な家具構造を生成 ==========
  generateBasicFurnitureStructure() {
    // 簡単な立方体（座面など）を追加
    return [
      '# 基本立方体構造',
      'v -0.5 -0.5 0.0',
      'v 0.5 -0.5 0.0', 
      'v 0.5 0.5 0.0',
      'v -0.5 0.5 0.0',
      'v -0.5 -0.5 0.1',
      'v 0.5 -0.5 0.1',
      'v 0.5 0.5 0.1', 
      'v -0.5 0.5 0.1',
      'f 1 2 3 4',  // 下面
      'f 5 6 7 8',  // 上面
      'f 1 2 6 5',  // 前面
      'f 2 3 7 6',  // 右面
      'f 3 4 8 7',  // 後面
      'f 4 1 5 8'   // 左面
    ];
  }

  // DeepSeek出力エラー時のフォールバック用立方体
  generateFallbackOBJ() {
    // 現在のコンテキストから家具タイプを取得
    let furnitureType = this.stagePipeline?.context?.furnitureType || 'general';
    let dimensions = this.stagePipeline?.context?.dimensions || { width: 80, depth: 40, height: 80 };
    
    // コンテキストが不足している場合、グローバル状態から推定
    if (furnitureType === 'general') {
      const currentPrompt = document.getElementById('furnitureSpec')?.value || '';
      furnitureType = this.detectFurnitureTypeFromPrompt(currentPrompt);
      
      // フォームから寸法も取得
      const widthValue = document.getElementById('widthParam')?.value;
      const depthValue = document.getElementById('depthParam')?.value;
      const heightValue = document.getElementById('heightParam')?.value;
      
      if (widthValue && widthValue !== 'auto') dimensions.width = parseInt(widthValue);
      if (depthValue && depthValue !== 'auto') dimensions.depth = parseInt(depthValue);
      if (heightValue && heightValue !== 'auto') dimensions.height = parseInt(heightValue);
    }
    
    this.assistant.log('info', 'フォールバック家具を生成中', { 
      furnitureType, 
      dimensions 
    });
    
    switch (furnitureType) {
      case 'chair':
        return this.generateFallbackChair(dimensions);
      case 'desk':
        return this.generateFallbackDesk(dimensions);
      case 'shelf':
        return this.generateFallbackShelf(dimensions);
      case 'cabinet':
        return this.generateFallbackCabinet(dimensions);
      default:
        return this.generateFallbackGeneral(dimensions);
    }
  }

  // プロンプトから家具タイプを検出する補助メソッド
  detectFurnitureTypeFromPrompt(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('椅子') || lowerPrompt.includes('チェア') || lowerPrompt.includes('chair')) {
      return 'chair';
    } else if (lowerPrompt.includes('机') || lowerPrompt.includes('つくえ') || lowerPrompt.includes('desk')) {
      return 'desk';
    } else if (lowerPrompt.includes('テーブル') || lowerPrompt.includes('table')) {
      return 'テーブル';
    } else if (lowerPrompt.includes('棚') || lowerPrompt.includes('たな') || lowerPrompt.includes('shelf')) {
      return 'shelf';
    } else if (lowerPrompt.includes('収納') || lowerPrompt.includes('cabinet') || lowerPrompt.includes('キャビネット')) {
      return 'cabinet';
    }
    
    return 'general';
  }

  // 椅子の基本形状
  generateFallbackChair(dims) {
    const w = (dims.width || 40) / 2;
    const h = dims.height || 80;
    const d = (dims.depth || 40) / 2;
    const seatHeight = h * 0.55;
    const legThickness = 2;
    
    return `# フォールバック椅子 - 基本構造
# 座面
v ${-w} ${seatHeight} ${-d}
v ${w} ${seatHeight} ${-d}
v ${w} ${seatHeight} ${d}
v ${-w} ${seatHeight} ${d}
v ${-w} ${seatHeight - 3} ${-d}
v ${w} ${seatHeight - 3} ${-d}
v ${w} ${seatHeight - 3} ${d}
v ${-w} ${seatHeight - 3} ${d}

# 前脚 (左)
v ${-w + 3} ${0} ${-d + 3}
v ${-w + 3 + legThickness} ${0} ${-d + 3}
v ${-w + 3 + legThickness} ${0} ${-d + 3 + legThickness}
v ${-w + 3} ${0} ${-d + 3 + legThickness}
v ${-w + 3} ${seatHeight} ${-d + 3}
v ${-w + 3 + legThickness} ${seatHeight} ${-d + 3}
v ${-w + 3 + legThickness} ${seatHeight} ${-d + 3 + legThickness}
v ${-w + 3} ${seatHeight} ${-d + 3 + legThickness}

# 前脚 (右)
v ${w - 3 - legThickness} ${0} ${-d + 3}
v ${w - 3} ${0} ${-d + 3}
v ${w - 3} ${0} ${-d + 3 + legThickness}
v ${w - 3 - legThickness} ${0} ${-d + 3 + legThickness}
v ${w - 3 - legThickness} ${seatHeight} ${-d + 3}
v ${w - 3} ${seatHeight} ${-d + 3}
v ${w - 3} ${seatHeight} ${-d + 3 + legThickness}
v ${w - 3 - legThickness} ${seatHeight} ${-d + 3 + legThickness}

# 後脚 (左)
v ${-w + 3} ${0} ${d - 3 - legThickness}
v ${-w + 3 + legThickness} ${0} ${d - 3 - legThickness}
v ${-w + 3 + legThickness} ${0} ${d - 3}
v ${-w + 3} ${0} ${d - 3}
v ${-w + 3} ${h} ${d - 3 - legThickness}
v ${-w + 3 + legThickness} ${h} ${d - 3 - legThickness}
v ${-w + 3 + legThickness} ${h} ${d - 3}
v ${-w + 3} ${h} ${d - 3}

# 後脚 (右)
v ${w - 3 - legThickness} ${0} ${d - 3 - legThickness}
v ${w - 3} ${0} ${d - 3 - legThickness}
v ${w - 3} ${0} ${d - 3}
v ${w - 3 - legThickness} ${0} ${d - 3}
v ${w - 3 - legThickness} ${h} ${d - 3 - legThickness}
v ${w - 3} ${h} ${d - 3 - legThickness}
v ${w - 3} ${h} ${d - 3}
v ${w - 3 - legThickness} ${h} ${d - 3}

# 背もたれ
v ${-w} ${seatHeight + 5} ${d - 2}
v ${w} ${seatHeight + 5} ${d - 2}
v ${w} ${h - 5} ${d - 2}
v ${-w} ${h - 5} ${d - 2}
v ${-w} ${seatHeight + 5} ${d}
v ${w} ${seatHeight + 5} ${d}
v ${w} ${h - 5} ${d}
v ${-w} ${h - 5} ${d}

# 座面の面
f 1 2 3 4
f 8 7 6 5

# 前脚 (左) の面
f 9 10 11 12
f 16 15 14 13
f 9 13 14 10
f 10 14 15 11
f 11 15 16 12
f 12 16 13 9

# 前脚 (右) の面
f 17 18 19 20
f 24 23 22 21
f 17 21 22 18
f 18 22 23 19
f 19 23 24 20
f 20 24 21 17

# 後脚 (左) の面
f 25 26 27 28
f 32 31 30 29
f 25 29 30 26
f 26 30 31 27
f 27 31 32 28
f 28 32 29 25

# 後脚 (右) の面
f 33 34 35 36
f 40 39 38 37
f 33 37 38 34
f 34 38 39 35
f 35 39 40 36
f 36 40 37 33

# 背もたれの面
f 41 42 43 44
f 48 47 46 45
f 41 45 46 42
f 42 46 47 43
f 43 47 48 44
f 44 48 45 41`;
  }

  // デスクの基本形状
  generateFallbackDesk(dims) {
    const w = (dims.width || 120) / 2;
    const h = dims.height || 75;
    const d = (dims.depth || 60) / 2;
    const thickness = 3;
    const legThickness = 4;
    
    return `# フォールバック机 - 基本構造
# 天板
v ${-w} ${h} ${-d}
v ${w} ${h} ${-d}
v ${w} ${h} ${d}
v ${-w} ${h} ${d}
v ${-w} ${h - thickness} ${-d}
v ${w} ${h - thickness} ${-d}
v ${w} ${h - thickness} ${d}
v ${-w} ${h - thickness} ${d}

# 脚1 (左前)
v ${-w + 5} ${0} ${-d + 5}
v ${-w + 5 + legThickness} ${0} ${-d + 5}
v ${-w + 5 + legThickness} ${0} ${-d + 5 + legThickness}
v ${-w + 5} ${0} ${-d + 5 + legThickness}
v ${-w + 5} ${h - thickness} ${-d + 5}
v ${-w + 5 + legThickness} ${h - thickness} ${-d + 5}
v ${-w + 5 + legThickness} ${h - thickness} ${-d + 5 + legThickness}
v ${-w + 5} ${h - thickness} ${-d + 5 + legThickness}

# 脚2 (右前)
v ${w - 5 - legThickness} ${0} ${-d + 5}
v ${w - 5} ${0} ${-d + 5}
v ${w - 5} ${0} ${-d + 5 + legThickness}
v ${w - 5 - legThickness} ${0} ${-d + 5 + legThickness}
v ${w - 5 - legThickness} ${h - thickness} ${-d + 5}
v ${w - 5} ${h - thickness} ${-d + 5}
v ${w - 5} ${h - thickness} ${-d + 5 + legThickness}
v ${w - 5 - legThickness} ${h - thickness} ${-d + 5 + legThickness}

# 脚3 (左後)
v ${-w + 5} ${0} ${d - 5 - legThickness}
v ${-w + 5 + legThickness} ${0} ${d - 5 - legThickness}
v ${-w + 5 + legThickness} ${0} ${d - 5}
v ${-w + 5} ${0} ${d - 5}
v ${-w + 5} ${h - thickness} ${d - 5 - legThickness}
v ${-w + 5 + legThickness} ${h - thickness} ${d - 5 - legThickness}
v ${-w + 5 + legThickness} ${h - thickness} ${d - 5}
v ${-w + 5} ${h - thickness} ${d - 5}

# 脚4 (右後)
v ${w - 5 - legThickness} ${0} ${d - 5 - legThickness}
v ${w - 5} ${0} ${d - 5 - legThickness}
v ${w - 5} ${0} ${d - 5}
v ${w - 5 - legThickness} ${0} ${d - 5}
v ${w - 5 - legThickness} ${h - thickness} ${d - 5 - legThickness}
v ${w - 5} ${h - thickness} ${d - 5 - legThickness}
v ${w - 5} ${h - thickness} ${d - 5}
v ${w - 5 - legThickness} ${h - thickness} ${d - 5}

# 天板の面
f 1 2 3 4
f 8 7 6 5
f 1 5 6 2
f 2 6 7 3
f 3 7 8 4
f 4 8 5 1

# 脚1の面
f 9 10 11 12
f 16 15 14 13
f 9 13 14 10
f 10 14 15 11
f 11 15 16 12
f 12 16 13 9

# 脚2の面
f 17 18 19 20
f 24 23 22 21
f 17 21 22 18
f 18 22 23 19
f 19 23 24 20
f 20 24 21 17

# 脚3の面
f 25 26 27 28
f 32 31 30 29
f 25 29 30 26
f 26 30 31 27
f 27 31 32 28
f 28 32 29 25

# 脚4の面
f 33 34 35 36
f 40 39 38 37
f 33 37 38 34
f 34 38 39 35
f 35 39 40 36
f 36 40 37 33`;
  }

  // 棚の基本形状
  generateFallbackShelf(dims) {
    const w = (dims.width || 80) / 2;
    const h = dims.height || 180;
    const d = (dims.depth || 30) / 2;
    const thickness = 2;
    const shelfCount = 3;
    const shelfSpacing = h / (shelfCount + 1);
    
    let objData = `# フォールバック棚 - 基本構造\n`;
    let vertexIndex = 1;
    let faces = [];
    
    // 側板 (左)
    objData += `# 左側板\n`;
    objData += `v ${-w} ${0} ${-d}\n`;
    objData += `v ${-w + thickness} ${0} ${-d}\n`;
    objData += `v ${-w + thickness} ${0} ${d}\n`;
    objData += `v ${-w} ${0} ${d}\n`;
    objData += `v ${-w} ${h} ${-d}\n`;
    objData += `v ${-w + thickness} ${h} ${-d}\n`;
    objData += `v ${-w + thickness} ${h} ${d}\n`;
    objData += `v ${-w} ${h} ${d}\n`;
    
    faces.push(`f ${vertexIndex} ${vertexIndex + 3} ${vertexIndex + 2} ${vertexIndex + 1}`);
    faces.push(`f ${vertexIndex + 4} ${vertexIndex + 5} ${vertexIndex + 6} ${vertexIndex + 7}`);
    faces.push(`f ${vertexIndex} ${vertexIndex + 4} ${vertexIndex + 7} ${vertexIndex + 3}`);
    faces.push(`f ${vertexIndex + 1} ${vertexIndex + 2} ${vertexIndex + 6} ${vertexIndex + 5}`);
    faces.push(`f ${vertexIndex + 2} ${vertexIndex + 3} ${vertexIndex + 7} ${vertexIndex + 6}`);
    faces.push(`f ${vertexIndex} ${vertexIndex + 1} ${vertexIndex + 5} ${vertexIndex + 4}`);
    vertexIndex += 8;
    
    // 側板 (右)
    objData += `# 右側板\n`;
    objData += `v ${w - thickness} ${0} ${-d}\n`;
    objData += `v ${w} ${0} ${-d}\n`;
    objData += `v ${w} ${0} ${d}\n`;
    objData += `v ${w - thickness} ${0} ${d}\n`;
    objData += `v ${w - thickness} ${h} ${-d}\n`;
    objData += `v ${w} ${h} ${-d}\n`;
    objData += `v ${w} ${h} ${d}\n`;
    objData += `v ${w - thickness} ${h} ${d}\n`;
    
    faces.push(`f ${vertexIndex} ${vertexIndex + 1} ${vertexIndex + 2} ${vertexIndex + 3}`);
    faces.push(`f ${vertexIndex + 7} ${vertexIndex + 6} ${vertexIndex + 5} ${vertexIndex + 4}`);
    faces.push(`f ${vertexIndex} ${vertexIndex + 3} ${vertexIndex + 7} ${vertexIndex + 4}`);
    faces.push(`f ${vertexIndex + 1} ${vertexIndex + 5} ${vertexIndex + 6} ${vertexIndex + 2}`);
    faces.push(`f ${vertexIndex + 2} ${vertexIndex + 6} ${vertexIndex + 7} ${vertexIndex + 3}`);
    faces.push(`f ${vertexIndex} ${vertexIndex + 4} ${vertexIndex + 5} ${vertexIndex + 1}`);
    vertexIndex += 8;
    
    // 棚板
    for (let i = 0; i <= shelfCount; i++) {
      const shelfY = i * shelfSpacing;
      objData += `# 棚板 ${i + 1}\n`;
      objData += `v ${-w + thickness} ${shelfY} ${-d}\n`;
      objData += `v ${w - thickness} ${shelfY} ${-d}\n`;
      objData += `v ${w - thickness} ${shelfY} ${d}\n`;
      objData += `v ${-w + thickness} ${shelfY} ${d}\n`;
      objData += `v ${-w + thickness} ${shelfY + thickness} ${-d}\n`;
      objData += `v ${w - thickness} ${shelfY + thickness} ${-d}\n`;
      objData += `v ${w - thickness} ${shelfY + thickness} ${d}\n`;
      objData += `v ${-w + thickness} ${shelfY + thickness} ${d}\n`;
      
      faces.push(`f ${vertexIndex} ${vertexIndex + 1} ${vertexIndex + 2} ${vertexIndex + 3}`);
      faces.push(`f ${vertexIndex + 7} ${vertexIndex + 6} ${vertexIndex + 5} ${vertexIndex + 4}`);
      faces.push(`f ${vertexIndex} ${vertexIndex + 3} ${vertexIndex + 7} ${vertexIndex + 4}`);
      faces.push(`f ${vertexIndex + 1} ${vertexIndex + 5} ${vertexIndex + 6} ${vertexIndex + 2}`);
      faces.push(`f ${vertexIndex + 2} ${vertexIndex + 6} ${vertexIndex + 7} ${vertexIndex + 3}`);
      faces.push(`f ${vertexIndex} ${vertexIndex + 4} ${vertexIndex + 5} ${vertexIndex + 1}`);
      vertexIndex += 8;
    }
    
    objData += '\n' + faces.join('\n');
    return objData;
  }

  // キャビネットの基本形状
  generateFallbackCabinet(dims) {
    const w = (dims.width || 60) / 2;
    const h = dims.height || 120;
    const d = (dims.depth || 40) / 2;
    const thickness = 2;
    
    return `# フォールバックキャビネット - 基本構造
# 底板
v ${-w} ${0} ${-d}
v ${w} ${0} ${-d}
v ${w} ${0} ${d}
v ${-w} ${0} ${d}
v ${-w} ${thickness} ${-d}
v ${w} ${thickness} ${-d}
v ${w} ${thickness} ${d}
v ${-w} ${thickness} ${d}

# 天板
v ${-w} ${h - thickness} ${-d}
v ${w} ${h - thickness} ${-d}
v ${w} ${h - thickness} ${d}
v ${-w} ${h - thickness} ${d}
v ${-w} ${h} ${-d}
v ${w} ${h} ${-d}
v ${w} ${h} ${d}
v ${-w} ${h} ${d}

# 左側板
v ${-w} ${thickness} ${-d}
v ${-w + thickness} ${thickness} ${-d}
v ${-w + thickness} ${thickness} ${d}
v ${-w} ${thickness} ${d}
v ${-w} ${h - thickness} ${-d}
v ${-w + thickness} ${h - thickness} ${-d}
v ${-w + thickness} ${h - thickness} ${d}
v ${-w} ${h - thickness} ${d}

# 右側板
v ${w - thickness} ${thickness} ${-d}
v ${w} ${thickness} ${-d}
v ${w} ${thickness} ${d}
v ${w - thickness} ${thickness} ${d}
v ${w - thickness} ${h - thickness} ${-d}
v ${w} ${h - thickness} ${-d}
v ${w} ${h - thickness} ${d}
v ${w - thickness} ${h - thickness} ${d}

# 扉 (左)
v ${-w + thickness} ${thickness + 5} ${-d - 1}
v ${-2} ${thickness + 5} ${-d - 1}
v ${-2} ${h - thickness - 5} ${-d - 1}
v ${-w + thickness} ${h - thickness - 5} ${-d - 1}

# 扉 (右)
v ${2} ${thickness + 5} ${-d - 1}
v ${w - thickness} ${thickness + 5} ${-d - 1}
v ${w - thickness} ${h - thickness - 5} ${-d - 1}
v ${2} ${h - thickness - 5} ${-d - 1}

# 底板の面
f 1 2 3 4
f 8 7 6 5
f 1 5 6 2
f 2 6 7 3
f 3 7 8 4
f 4 8 5 1

# 天板の面
f 9 10 11 12
f 16 15 14 13
f 9 13 14 10
f 10 14 15 11
f 11 15 16 12
f 12 16 13 9

# 左側板の面
f 17 18 19 20
f 24 23 22 21
f 17 21 22 18
f 18 22 23 19
f 19 23 24 20
f 20 24 21 17

# 右側板の面
f 25 26 27 28
f 32 31 30 29
f 25 29 30 26
f 26 30 31 27
f 27 31 32 28
f 28 32 29 25

# 扉の面
f 33 34 35 36
f 37 38 39 40`;
  }

  // 一般的な形状
  generateFallbackGeneral(dims) {
    const w = (dims.width || 50) / 2;
    const h = dims.height || 50;
    const d = (dims.depth || 50) / 2;
    
    return `# フォールバック一般形状 - 基本立方体
v ${-w} ${0} ${-d}
v ${w} ${0} ${-d}
v ${w} ${0} ${d}
v ${-w} ${0} ${d}
v ${-w} ${h} ${-d}
v ${w} ${h} ${-d}
v ${w} ${h} ${d}
v ${-w} ${h} ${d}
f 1 2 3 4
f 8 7 6 5
f 1 5 6 2
f 2 6 7 3
f 3 7 8 4
f 4 8 5 1`;
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
      
      // 🚨 重要：生の出力データを先に保存（変換処理前）
      const originalRawOutput = llmResponse;
      
      const furnitureSpec = this.parseOptimizedSpecification(llmResponse, prompt, width, depth, height);
      
      // 第1段階の生出力データを保存（変換前の生のLLMレスポンス）
      furnitureSpec.rawLLMOutput = originalRawOutput;
      
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
      // 🚨 修正：第1段階専用のAPI呼び出しメソッドを使用
      const response = await this.callStage1LLMDirect(optimizedPrompt, systemPrompt);
      
      if (!response || response.trim().length === 0) {
        throw new Error('第1段階でAPIから空のレスポンスを受信しました');
      }
      
      this.assistant.log('info', '第1段階LLM応答受信', {
        responseLength: response.length,
        hasNaturalLanguageContent: response.includes('【') || response.includes('設計仕様')
      });
      
      return response;
    } catch (error) {
      this.assistant.log('error', '第1段階LLM呼び出し失敗', { error: error.message });
      throw error;
    }
  }

  // ========== 第1段階専用LLM API呼び出し ==========
  async callStage1LLMDirect(prompt, systemPrompt) {
    const apiUrl = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
    
    const requestData = {
      model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
      temperature: 0.3,  // 自然言語生成のため少し高めの温度
      stream: false,
      max_completion_tokens: 3000,  // 自然言語仕様書のため適度な長さ
      messages: [
        {
          role: "system",
          content: systemPrompt  // 第1段階専用のシステムプロンプトを使用
        },
        {
          role: "user", 
          content: prompt
        }
      ]
    };
    
    this.assistant.log('info', '第1段階専用API呼び出し実行', {
      model: requestData.model,
      temperature: requestData.temperature,
      maxTokens: requestData.max_completion_tokens,
      systemPromptPreview: systemPrompt.substring(0, 100) + '...'
    });
    
    const timeoutMs = 60000; // 60秒
    const controller = new AbortController();
    
    const timeoutId = setTimeout(() => {
      this.assistant.log('warn', '第1段階API呼び出しがタイムアウトしました', { timeoutMs });
      controller.abort();
    }, timeoutMs);
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`第1段階API呼び出しに失敗: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // レスポンスから自然言語仕様を抽出
      let responseText = '';
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        responseText = data.choices[0].message.content;
      } else if (data.answer) {
        responseText = data.answer;
      } else {
        throw new Error('第1段階APIレスポンスに期待されるフィールドがありません');
      }
      
      this.assistant.log('info', '第1段階API呼び出し成功', {
        responseLength: responseText.length,
        hasOBJData: this.detectOBJDataInOutput(responseText),
        isNaturalLanguage: responseText.includes('【') || responseText.includes('設計仕様')
      });
      
      return responseText;
      
    } catch (error) {
      clearTimeout(timeoutId);
      this.assistant.log('error', '第1段階API呼び出しエラー', { error: error.message });
      throw error;
    }
  }

  // ========== 仕様最適化用システムプロンプト ==========
  getSpecificationSystemPrompt() {
    return `あなたは家具設計の専門家です。ユーザーの要望を分析し、3Dモデル化に適した詳細仕様を自然言語で作成してください。

🚨【絶対禁止事項】🚨
以下の形式での出力は絶対に禁止されています：
❌ "v -22.5 0 -25" のような頂点座標データ
❌ "f 1 2 6 5" のような面データ
❌ OBJ形式の3Dデータ
❌ STL形式の3Dデータ
❌ 数値座標の羅列
❌ 技術的な3Dファイル形式
❌ プログラムコード
❌ JSON形式のデータ
❌ XMLやHTMLタグ

🎯【あなたの役割】🎯
- 家具設計の専門家として、ユーザーの要望を理解する
- 実用的で美しい家具の設計仕様を日本語で記述する
- 3Dモデル化に必要な構造情報を自然言語で提供する
- 家具として成立する合理的な設計を提案する

✅【必須出力形式】✅
必ず以下の形式で自然言語の文章のみを出力してください：

【家具名】○○○の設計仕様

【全体構造】
メインパーツの配置と寸法を日本語文章で説明
例：「安定性を重視した4本脚構造で、座面は床から約45cmの高さに配置」

【各部品詳細】
1. 部品名：形状、位置、サイズ、接続方法を文章で説明
2. 部品名：形状、位置、サイズ、接続方法を文章で説明
例：「座面：幅40cm×奥行40cm×厚み3cmの平坦な板状構造、4本の脚部の上端に固定」

【特殊形状要素】
曲線、テーパー、装飾等を文章で説明
例：「背もたれは座面から約100度の角度で立ち上がり、上部に向かって緩やかに湾曲」

【材質・表面処理】
想定される材料と仕上げを文章で説明
例：「木材（パイン材）を基本とし、表面はサンディング後にクリア塗装で仕上げ」

【機能要素】
可動部、収納等の機能を文章で説明
例：「引き出しは天板下に配置し、スライドレールで滑らかに開閉」

【重要な指示】
- 必ず自然言語（日本語文章）のみで出力してください
- 数値データは「約○○cm」「幅○○cm」のような文章形式で記述してください
- 部品間の接続関係を言葉で明確に記述してください
- 実際の家具として成立する構造を考慮してください
- 家具の種類に応じた専門的な要件を文章で説明してください

【家具タイプ別要件】
椅子：座面の平面性、背もたれの角度、4本脚の安定配置、適切な座面高
机：天板の平面性、脚部空間の確保、構造的安定性、作業に適した高さ
棚：各段の水平性、側板の支持力、重心バランス、収納効率
収納：扉・引き出しの収まり、内部空間の最適化、開閉機構

【出力例】
【シンプルな木製椅子の設計仕様】

【全体構造】
安定性を重視した4本脚構造の椅子として設計。座面は床面から約45cmの高さに配置し、背もたれは座面後端から約100度の角度で立ち上がる。全体的にシンプルで実用的なデザインを採用。

【各部品詳細】
1. 座面：幅40cm×奥行40cm×厚み3cmの平坦な板状構造、表面は滑らかに仕上げ、4本の脚部上端にしっかりと固定
2. 背もたれ：幅38cm×高さ35cm×厚み2cmの板状構造、座面後端から垂直に立ち上がった後、上部に向かって5度後傾
3. 脚部：3cm×3cm×45cmの角材4本、座面四隅から垂直に床面まで伸び、底面には滑り止めを配置
4. 補強材：前後の脚間に2cm×3cm×36cmの横材を配置し、構造強度を向上

【特殊形状要素】
背もたれ上部は軽やかな印象を与えるため、角を丸く面取り。座面の角も安全性を考慮して軽く面取りを施す。

【材質・表面処理】
パイン材を使用し、全体をサンディング後にクリア塗装で仕上げ。木目を活かした自然な美しさを表現。

【機能要素】
シンプルな固定式椅子として、日常使用に適した安定性と座り心地を重視。メンテナンスが容易な構造。

🔄【重要な確認】🔄
出力前に以下を確認してください：
✓ OBJデータや座標が含まれていないか？
✓ 自然言語の日本語文章のみで記述されているか？
✓ 家具として実用的な設計になっているか？
✓ 指定された形式に従っているか？

繰り返し強調：OBJ形式や座標データは一切出力せず、必ず自然言語の日本語文章のみで仕様を記述してください。あなたは3Dデータを生成するのではなく、家具設計の専門家として設計仕様書を作成する役割です。`;
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
      
      // 🚨 重要：生の出力データを保持（変換前）
      const originalLLMOutput = llmOutput;
      
      // 🚨 重要：OBJデータが含まれていないかチェック
      const hasOBJData = this.detectOBJDataInOutput(llmOutput);
      if (hasOBJData) {
        this.assistant.log('error', '⚠️ 第1段階でOBJデータが検出されました！自然言語仕様に変換します', {
          originalLength: llmOutput.length,
          preview: llmOutput.substring(0, 200)
        });
        
        // OBJデータを除去して自然言語仕様を生成（処理用の変数を使用）
        llmOutput = this.convertOBJToNaturalLanguage(llmOutput, originalPrompt);
      }
      
      // 自然言語仕様から家具タイプと寸法を抽出
      const furnitureType = this.extractFurnitureType(llmOutput, originalPrompt);
      const extractedDimensions = this.extractDimensions(llmOutput, width, depth, height);
      const keyFeatures = this.extractKeyFeatures(llmOutput);
      const constraints = this.extractConstraints(llmOutput);
      
      this.assistant.log('info', '自然言語仕様解析成功', {
        furnitureType: furnitureType,
        dimensions: extractedDimensions,
        featuresCount: keyFeatures.length,
        constraintsCount: constraints.length,
        isNaturalLanguage: !hasOBJData
      });

      // データパイプラインを更新
      this.stagePipeline.context.originalRequest = originalPrompt;
      this.stagePipeline.context.furnitureType = furnitureType;
      this.stagePipeline.context.dimensions = extractedDimensions;
      this.stagePipeline.updateStage1Output(llmOutput, keyFeatures, constraints);
      
      return {
        furniture_type: furnitureType,
        dimensions: extractedDimensions,
        description: originalPrompt,
        optimized_specification: llmOutput, // 自然言語仕様（OBJ除去済み）
        rawLLMOutput: originalLLMOutput, // 第1段階の生出力データ（変換前の生データ）
        structural_analysis: {
          natural_language_spec: true,
          key_features: keyFeatures,
          constraints: constraints,
          specification_length: llmOutput.length,
          obj_data_detected: hasOBJData // OBJデータ検出フラグ
        },
        analysis_complete: true,
        natural_language: true // 自然言語フラグ
      };
      
    } catch (error) {
      this.assistant.log('warn', '自然言語仕様解析失敗、フォールバック実行', { error: error.message });
      return this.getFallbackSpecification(originalPrompt, width, depth, height);
    }
  }

  // ========== OBJデータ検出 ==========
  detectOBJDataInOutput(output) {
    if (!output || typeof output !== 'string') return false;
    
    // OBJデータの特徴的なパターンを検出
    const objPatterns = [
      /v\s+[-+]?\d*\.?\d+\s+[-+]?\d*\.?\d+\s+[-+]?\d*\.?\d+/g, // 頂点データ
      /f\s+\d+(\s+\d+){2,}/g, // 面データ
      /v\s+-?\d+(\.\d+)?\s+-?\d+(\.\d+)?\s+-?\d+(\.\d+)?/g // より厳密な頂点パターン
    ];
    
    for (const pattern of objPatterns) {
      if (pattern.test(output)) {
        return true;
      }
    }
    
    return false;
  }

  // ========== OBJデータを自然言語に変換 ==========
  convertOBJToNaturalLanguage(output, prompt) {
    try {
      const furnitureType = this.extractFurnitureType(output + ' ' + prompt, prompt);
      
      this.assistant.log('warn', '⚠️ 第1段階でOBJデータが検出されました。自然言語仕様に変換中...', {
        furnitureType: furnitureType,
        originalLength: output.length
      });
      
      // OBJデータを検出したが、純粋な自然言語仕様を生成
      let naturalDescription = `【${furnitureType}の設計仕様】\n\n`;
      
      // 元のユーザー要求を含める
      naturalDescription += `元のユーザー要求：${prompt}\n\n`;
      naturalDescription += `※注意：第1段階で技術的なデータが生成されましたが、以下の自然言語仕様に変換しました。\n\n`;
      
      // 家具種別に応じた詳細な自然言語仕様を生成
      if (furnitureType.includes('椅子')) {
        naturalDescription += `【全体構造】\n`;
        naturalDescription += `安定性を重視した4本脚構造の椅子として設計。座面は平坦で適切な厚みを持ち、背もたれは腰部をサポートする角度で配置。全体的にバランスの取れた実用的なデザインを採用。\n\n`;
        
        naturalDescription += `【各部品詳細】\n`;
        naturalDescription += `1. 座面：幅40cm×奥行40cm×厚み3cmの平坦な板状構造、表面は滑らかに仕上げ、4本の脚部上端にしっかりと固定\n`;
        naturalDescription += `2. 背もたれ：幅38cm×高さ35cm×厚み2cmの板状構造、座面後端から垂直に立ち上がった後、上部に向かって5度後傾し腰部をサポート\n`;
        naturalDescription += `3. 脚部：3cm×3cm×45cmの角材4本、座面四隅から垂直に床面まで伸び、底面には滑り止めパッドを配置\n`;
        naturalDescription += `4. 補強材：前後の脚間に2cm×3cm×36cmの横材を座面下15cmの位置に配置し、構造強度と安定性を向上\n\n`;
        
        naturalDescription += `【特殊形状要素】\n`;
        naturalDescription += `背もたれ上部は軽やかな印象を与えるため、角を半径5mmで丸く面取り。座面の角も安全性を考慮して半径3mmの面取りを施す。脚部底面は床との接触面を確保するため平坦に仕上げ。\n\n`;
        
      } else if (furnitureType.includes('机') || furnitureType.includes('テーブル')) {
        naturalDescription += `【全体構造】\n`;
        naturalDescription += `作業や食事に適した平坦な天板を持つ${furnitureType}として設計。安定した4本脚構造で天板を支持し、日常使用に耐える堅牢な構造を採用。\n\n`;
        
        naturalDescription += `【各部品詳細】\n`;
        naturalDescription += `1. 天板：幅120cm×奥行60cm×厚み3cmの完全に平坦な板状構造、作業に適した十分な面積を確保し、表面は滑らかに仕上げ\n`;
        naturalDescription += `2. 脚部：5cm×5cm×75cmの角材4本、天板四隅から垂直に床面まで配置し、安定性を重視した太めの構造\n`;
        naturalDescription += `3. 補強材：脚間に4cm×2cm×110cmの水平な補強材を天板下20cmの位置に配置し、構造強度を大幅に向上\n`;
        naturalDescription += `4. 接合部：天板と脚部の接合には金具を使用し、しっかりとした固定を実現\n\n`;
        
        naturalDescription += `【特殊形状要素】\n`;
        naturalDescription += `天板の角は安全性を考慮して半径8mmの面取りを施す。脚部上端は天板との接合面を平坦に加工し、底面は床との安定した接触を確保。\n\n`;
        
      } else if (furnitureType.includes('棚')) {
        naturalDescription += `【全体構造】\n`;
        naturalDescription += `収納効率を重視した多段式の棚として設計。左右の側板による確実な支持構造で、複数の棚板を安定して支える実用的な設計。\n\n`;
        
        naturalDescription += `【各部品詳細】\n`;
        naturalDescription += `1. 側板：左右2枚、幅30cm×高さ180cm×厚み2cmの垂直板、棚全体の高さを持ち構造の基幹となる\n`;
        naturalDescription += `2. 棚板：幅80cm×奥行30cm×厚み2cmの水平板を6枚、側板間に30cm間隔で配置し、収納物を安定して支持\n`;
        naturalDescription += `3. 底板：最下段の棚板、床面に直接設置し全体の安定性を確保\n`;
        naturalDescription += `4. 背板：幅80cm×高さ180cm×厚み1cmの薄いパネルを背面に配置し、構造の安定性と収納物の落下防止を実現\n\n`;
        
        naturalDescription += `【特殊形状要素】\n`;
        naturalDescription += `各棚板の前端は収納物の出し入れを容易にするため、半径3mmの面取りを施す。側板上端も安全性を考慮して面取り加工。\n\n`;
        
      } else {
        naturalDescription += `【全体構造】\n`;
        naturalDescription += `実用性と美観を両立した${furnitureType}として設計。用途に応じた最適な構造配置で、日常使用に適した機能性を重視。\n\n`;
        
        naturalDescription += `【各部品詳細】\n`;
        naturalDescription += `1. 主要構造部：家具の基本骨格となる部品、安定性と強度を確保し、適切な寸法で設計\n`;
        naturalDescription += `2. 機能部品：使用目的に応じた機能的な部品配置、実用性を重視した形状と配置\n`;
        naturalDescription += `3. 支持構造：全体を支える安定した基盤構造、床面との確実な接触を確保\n`;
        naturalDescription += `4. 接合部：各部品間の確実な接続を実現する接合構造\n\n`;
        
        naturalDescription += `【特殊形状要素】\n`;
        naturalDescription += `安全性と美観を考慮した適切な面取り加工。使用時の快適性を向上させる形状的配慮。\n\n`;
      }
      
      // 共通部分
      naturalDescription += `【材質・表面処理】\n`;
      naturalDescription += `木材（パイン材またはオーク材）を基本材料とし、全体をサンディング後にクリア塗装で仕上げ。木目を活かした自然な美しさを表現し、耐久性も確保。\n\n`;
      
      naturalDescription += `【機能要素】\n`;
      naturalDescription += `日常使用に適した実用的な機能を重視し、メンテナンス性も考慮した設計。長期間の使用に耐える堅牢性と、使いやすさを両立。\n\n`;
      
      naturalDescription += `【設計上の配慮】\n`;
      naturalDescription += `- 安全性：角の面取りや安定した構造により、使用時の安全を確保\n`;
      naturalDescription += `- 実用性：日常的な使用に適した寸法と機能性を重視\n`;
      naturalDescription += `- 美観：シンプルで飽きのこないデザイン\n`;
      naturalDescription += `- 製作性：一般的な工具で製作可能な構造\n`;
      
      this.assistant.log('info', 'OBJデータを詳細な自然言語仕様に変換完了', {
        furnitureType: furnitureType,
        naturalDescriptionLength: naturalDescription.length,
        excludedTechnicalData: true,
        conversionReason: 'Stage1でOBJデータが誤生成されたため'
      });
      
      return naturalDescription;
      
    } catch (error) {
      this.assistant.log('error', 'OBJ→自然言語変換エラー', { error: error.message });
      
      // エラー時のフォールバック
      const fallbackType = this.extractFurnitureType(prompt, prompt);
      return `【${fallbackType}の設計仕様】

【全体構造】
${prompt}の要求に基づいて設計された実用的な${fallbackType}。

【各部品詳細】
基本的な構造要素を適切に配置し、実用性を重視した設計。

【材質・表面処理】
木材を基本とし、適切な表面仕上げで美観と耐久性を確保。

【機能要素】
日常使用に適した実用的な機能を重視。

元のユーザー要求：${prompt}

※注意：第1段階で技術的なデータが生成されましたが、上記の自然言語仕様に変換しました。`;
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



  // ========== フォールバック仕様 ==========
  getFallbackSpecification(prompt, width, depth, height) {
    // ユーザーの要求から家具タイプを推定
    let furnitureType = '椅子';
    let naturalSpec = '';
    
    if (prompt.includes('テーブル') || prompt.includes('table') || prompt.includes('机')) {
      furnitureType = 'テーブル';
      naturalSpec = this.generateFallbackTableSpec(prompt, width, depth, height);
    } else if (prompt.includes('本棚') || prompt.includes('棚') || prompt.includes('shelf')) {
      furnitureType = '棚';
      naturalSpec = this.generateFallbackShelfSpec(prompt, width, depth, height);
    } else if (prompt.includes('キャビネット') || prompt.includes('cabinet') || prompt.includes('収納')) {
      furnitureType = '収納家具';
      naturalSpec = this.generateFallbackCabinetSpec(prompt, width, depth, height);
    } else {
      // デフォルトは椅子
      naturalSpec = this.generateFallbackChairSpec(prompt, width, depth, height);
    }
    
    return {
      furniture_type: furnitureType,
      dimensions: {
        width: width !== 'auto' ? parseInt(width) : 40,
        depth: depth !== 'auto' ? parseInt(depth) : 40,
        height: height !== 'auto' ? parseInt(height) : 80
      },
      description: prompt,
      optimized_specification: naturalSpec,
      rawLLMOutput: naturalSpec, // フォールバック時は同じ内容
      structural_analysis: {
        natural_language_spec: true,
        key_features: ['基本構造', '安定性', '実用性'],
        constraints: ['材料効率', '製作容易性'],
        specification_length: naturalSpec.length,
        obj_data_detected: false
      },
      analysis_complete: true,
      natural_language: true
    };
  }

  // ========== フォールバック用自然言語仕様生成 ==========
  generateFallbackChairSpec(prompt, width, depth, height) {
    const w = width !== 'auto' ? width : '40';
    const d = depth !== 'auto' ? depth : '40';
    const h = height !== 'auto' ? height : '80';
    
    return `【椅子の設計仕様】

【全体構造】
安定性を重視した4本脚構造の椅子として設計。座面は床面から約45cmの高さに配置し、背もたれは座面後端から約100度の角度で立ち上がる。

【各部品詳細】
1. 座面：幅${w}cm×奥行${d}cm×厚み3cmの平坦な板状構造、4本の脚部上端に固定
2. 背もたれ：幅${parseInt(w)-2}cm×高さ${parseInt(h)-45}cm×厚み2cmの板状構造、座面後端から立ち上がり
3. 脚部：3cm×3cm×45cmの角材4本、座面四隅から垂直に床面まで配置
4. 補強材：前後の脚間に横材を配置し構造強度を向上

【特殊形状要素】
背もたれ上部と座面の角は安全性を考慮して軽く面取りを施す。

【材質・表面処理】
木材を基本とし、表面はサンディング後にクリア塗装で仕上げ。

【機能要素】
日常使用に適した安定性と座り心地を重視したシンプルな固定式椅子。

元のユーザー要求：${prompt}`;
  }

  generateFallbackTableSpec(prompt, width, depth, height) {
    const w = width !== 'auto' ? width : '120';
    const d = depth !== 'auto' ? depth : '60';
    const h = height !== 'auto' ? height : '75';
    
    return `【テーブルの設計仕様】

【全体構造】
作業や食事に適した平坦な天板を持つテーブルとして設計。安定した4本脚構造で天板を支持。

【各部品詳細】
1. 天板：幅${w}cm×奥行${d}cm×厚み3cmの完全に平坦な板状構造
2. 脚部：5cm×5cm×${h}cmの角材4本、天板四隅から垂直に床面まで配置
3. 補強材：脚間に水平な補強材を配置し構造強度を向上
4. 接合部：天板と脚部をしっかりと固定する接合構造

【特殊形状要素】
天板の角は安全性を考慮して軽く面取りを施す。

【材質・表面処理】
木材を基本とし、天板は作業に適した滑らかな仕上げ。

【機能要素】
作業や食事に適した実用的なテーブル。膝下クリアランス65cm以上を確保。

元のユーザー要求：${prompt}`;
  }

  generateFallbackShelfSpec(prompt, width, depth, height) {
    const w = width !== 'auto' ? width : '80';
    const d = depth !== 'auto' ? depth : '30';
    const h = height !== 'auto' ? height : '180';
    
    return `【棚の設計仕様】

【全体構造】
収納効率を重視した多段式の棚として設計。側板による確実な支持構造。

【各部品詳細】
1. 側板：左右2枚、幅${d}cm×高さ${h}cm×厚み2cmの垂直板
2. 棚板：幅${w}cm×奥行${d}cm×厚み2cmの水平板を適切な間隔で配置
3. 底板：最下段の棚板、床面に設置
4. 背板：必要に応じて背面に薄いパネルを配置

【特殊形状要素】
各棚板の前端は軽く面取りを施し、収納物の出し入れを容易にする。

【材質・表面処理】
木材を基本とし、収納物に適した滑らかな仕上げ。

【機能要素】
書籍や小物の収納に適した実用的な棚。各段の間隔は約30cmで設定。

元のユーザー要求：${prompt}`;
  }

  generateFallbackCabinetSpec(prompt, width, depth, height) {
    const w = width !== 'auto' ? width : '60';
    const d = depth !== 'auto' ? depth : '40';
    const h = height !== 'auto' ? height : '120';
    
    return `【収納家具の設計仕様】

【全体構造】
実用性を重視した収納家具として設計。扉付きの収納空間を提供。

【各部品詳細】
1. 本体：幅${w}cm×奥行${d}cm×高さ${h}cmの箱型構造
2. 扉：前面に開閉可能な扉を配置
3. 内部棚板：収納効率を考慮した棚板を適切な間隔で配置
4. 取っ手：扉の適切な位置に配置

【特殊形状要素】
扉の角は安全性を考慮して軽く面取りを施す。

【材質・表面処理】
木材を基本とし、扉は滑らかな開閉ができるよう適切に仕上げ。

【機能要素】
日用品の収納に適した実用的な収納家具。扉により内容物を保護。

元のユーザー要求：${prompt}`;
  }

  // ========== 第2段階：統合3Dモデル生成 ==========
  async generateUnifiedModel(prompt, furnitureSpec) {
    try {
      this.assistant.log('debug', 'generateUnifiedModel開始', {
        prompt: prompt.substring(0, 50) + '...',
        specLength: JSON.stringify(furnitureSpec).length
      });

      // Stage2のシステムプロンプトを取得
      const systemPrompt = this.getStage2SystemPrompt();
      
      // Stage1の結果をStage2用に整形
      const stage1Output = this.formatStage1OutputForStage2(furnitureSpec);
      
      // Stage2用の統合プロンプトを作成
      const stage2Input = `${stage1Output}

上記の第1段階分析結果に基づいて、正確なOBJ形式の3Dモデルデータを生成してください。
      
仕様に記載された構造、寸法、機能をすべて反映し、3Dプリンタで印刷可能な実用的なモデルを作成してください。`;

      this.assistant.log('debug', 'Stage2用統合プロンプト作成完了', {
        stage1OutputLength: stage1Output.length,
        stage2InputLength: stage2Input.length
      });

      const rawObjData = await this.callStage2LLM(stage2Input, systemPrompt);
      
      // データクリーニング
      const cleanedObjData = this.cleanOBJData(rawObjData);
      
      this.assistant.log('info', 'generateUnifiedModel完了', {
        rawDataLength: rawObjData.length,
        cleanedDataLength: cleanedObjData.length
      });

      return cleanedObjData;
      
    } catch (error) {
      this.assistant.log('error', 'generateUnifiedModel失敗', { 
        error: error.message,
        stack: error.stack 
      });
      throw new Error(`統合3Dモデル生成でエラーが発生しました: ${error.message}`);
    }
  }

  // ========== 修正指示を考慮したStage2プロンプト作成 ==========


  // ========== Stage2専用システムプロンプト ==========
  getStage2SystemPrompt() {
    // DeepSeek-R1推論モデル専用のシステムプロンプト
    return `You are a professional 3D furniture modeling expert specializing in generating detailed OBJ format 3D models using DeepSeek-R1 reasoning capabilities.

🧠 REASONING APPROACH:
- You may think through the design process step by step
- Consider furniture structure, proportions, and construction details
- Analyze the requirements and plan the 3D geometry

⚠️ CRITICAL OUTPUT REQUIREMENTS:
1. ALWAYS end your response with complete, valid OBJ format data
2. The OBJ data must be complete - all faces and vertices must be included
3. Even if you provide detailed reasoning, the final OBJ output is ESSENTIAL
4. Use clear markers like "OBJ Data:" before the final OBJ section

📐 TECHNICAL SPECIFICATIONS:
- Use world coordinates where Y-axis is vertical (up)
- Place furniture base at Y=0 (floor level) 
- Use centimeter units for consistency
- Generate 20-200+ vertices for detailed geometry
- Create 10-150+ faces for proper surface coverage
- Ensure all faces are triangles or quads only
- No degenerate faces (faces with duplicate vertices)
- Include ALL structural components (legs, surfaces, supports, etc.)

✅ OUTPUT FORMAT EXAMPLE:
[Your reasoning and analysis here...]

Final OBJ Data:
# [Furniture Type] - [Brief Description]
v [x] [y] [z]  # vertex coordinates
v [x] [y] [z]
...
f [v1] [v2] [v3] [v4]  # face definitions
f [v1] [v2] [v3]
...

🎯 SUCCESS CRITERIA:
- Complete furniture geometry that matches specifications
- All parts properly connected and proportioned
- Valid OBJ syntax throughout
- Sufficient detail for 3D visualization

Remember: Your reasoning is valuable, but the complete OBJ data at the end is absolutely crucial for 3D model generation.`;
  }



  // ========== Stage2専用LLM呼び出し ==========
  async callStage2LLM(prompt, systemPrompt) {
    this.assistant.log('info', '第2段階LLM呼び出し開始（DeepSeek-R1推論モデル使用）', {
      promptLength: prompt.length,
      systemPromptLength: systemPrompt.length,
      model: 'deepseek-ai/DeepSeek-R1-0528'
    });

    try {
      // 第2段階専用：DeepSeek-R1-0528モデルを使用
      const response = await this.callDeepSeekAPI(prompt, systemPrompt);
      
      if (!response || response.trim().length === 0) {
        throw new Error('第2段階でAPIから空のレスポンスを受信しました');
      }
      
      this.assistant.log('info', '第2段階LLM応答受信', {
        responseLength: response.length,
        hasOBJContent: response.includes('v ') || response.includes('f '),
        model: 'deepseek-ai/DeepSeek-R1-0528'
      });
      
      return response;
    } catch (error) {
      this.assistant.log('error', '第2段階LLM呼び出し失敗', { error: error.message });
      throw error;
    }
  }

  // ========== DeepSeek-R1専用API呼び出し ==========
  async callDeepSeekAPI(prompt, systemPrompt) {
    const apiUrl = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
    
    const requestData = {
      model: "deepseek-ai/DeepSeek-R1-0528",
      temperature: 0.5,  // より創造的で多様な出力を促進
      stream: false,
      max_completion_tokens: 40000,  // DeepSeek-R1の詳細な推論過程に対応
      messages: [
        {
          role: "system",
          content: systemPrompt || this.getStage2SystemPrompt()
        },
        {
          role: "user", 
          content: prompt
        }
      ]
    };
    
    this.assistant.log('info', 'DeepSeek-R1 API呼び出し実行', {
      model: requestData.model,
      temperature: requestData.temperature,
      maxTokens: requestData.max_completion_tokens
    });
    
    // DeepSeek推論モデルは時間がかかるため、タイムアウトを延長
    const timeoutMs = 600000; // 600秒（10分）- 40000トークン対応
    
    // 既存のコントローラーを使用（停止機能との統合）
    const controller = this.currentController || new AbortController();
    
    // 既存のタイムアウトをクリア（重複防止）
    if (this.currentTimeoutId) {
      clearTimeout(this.currentTimeoutId);
    }
    
    this.currentTimeoutId = setTimeout(() => {
      this.assistant.log('warn', 'DeepSeek API呼び出しがタイムアウトしました', { timeoutMs });
      controller.abort();
    }, timeoutMs);
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData),
        signal: controller.signal
      });
      
      // タイムアウトをクリア
      if (this.currentTimeoutId) {
        clearTimeout(this.currentTimeoutId);
        this.currentTimeoutId = null;
      }
      
      if (!response.ok) {
        throw new Error(`DeepSeek API呼び出しに失敗しました: ${response.status}`);
      }
      
      const data = await response.json();
      
      // レスポンスからOBJデータを抽出
      let responseText = '';
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        responseText = data.choices[0].message.content;
      } else if (data.answer) {
        responseText = data.answer;
      } else {
        throw new Error('DeepSeek APIレスポンスに期待されるフィールドがありません');
      }
      
      // 出力切断の検出
      const truncationInfo = this.detectOutputTruncation(responseText, data);
      
      this.assistant.log('info', 'DeepSeek API呼び出し成功', {
        responseLength: responseText.length,
        model: 'deepseek-ai/DeepSeek-R1-0528',
        wasTruncated: truncationInfo.wasTruncated,
        truncationReason: truncationInfo.reason
      });
      
      // 出力が切断された場合の警告
      if (truncationInfo.wasTruncated) {
        this.assistant.log('warn', 'DeepSeek-R1出力が切断されました', {
          reason: truncationInfo.reason,
          responseLength: responseText.length,
          recommendedTokens: truncationInfo.recommendedTokens
        });
        
        // ユーザーへの通知
        this.assistant.showWarning(
          `⚠️ DeepSeek-R1の出力が${truncationInfo.reason}により切断されました。\n` +
          `3Dモデルが不完全な場合は、再生成をお試しください。`
        );
      }
      
      // デバッグ：レスポンス内容をログ出力
      this.assistant.log('debug', 'DeepSeek-R1レスポンス詳細', {
        responseLength: responseText.length,
        responsePreview: responseText.substring(0, 500),
        responseSuffix: responseText.substring(Math.max(0, responseText.length - 200)),
        hasVertices: responseText.includes('v '),
        hasFaces: responseText.includes('f '),
        hasMarkdown: responseText.includes('```'),
        truncationInfo
      });
      
      // 第2段階の生出力データを保存（iマーク表示用）
      this.stage2Data = {
        rawOutput: responseText,
        timestamp: new Date().toISOString(),
        model: 'deepseek-ai/DeepSeek-R1-0528',
        truncationInfo: truncationInfo
      };
      
      this.assistant.log('debug', '第2段階データを保存', {
        hasStage2Data: !!this.stage2Data,
        rawOutputLength: this.stage2Data.rawOutput.length
      });
      
      return responseText;
      
    } catch (error) {
      if (this.currentTimeoutId) {
        clearTimeout(this.currentTimeoutId);
        this.currentTimeoutId = null;
      }
      if (error.name === 'AbortError') {
        throw new Error('DeepSeek推論モデルの処理がタイムアウトまたは停止されました（5分超過または手動停止）');
      }
      throw error;
    }
  }

  // ========== 出力切断検出機能 ==========
  detectOutputTruncation(responseText, apiResponseData) {
    const truncationInfo = {
      wasTruncated: false,
      reason: null,
      recommendedTokens: null
    };

    // 1. API応答データから切断情報を取得
    if (apiResponseData?.choices?.[0]?.finish_reason) {
      const finishReason = apiResponseData.choices[0].finish_reason;
      
      if (finishReason === 'length') {
        truncationInfo.wasTruncated = true;
        truncationInfo.reason = 'トークン制限';
        truncationInfo.recommendedTokens = 50000; // 切断検出時の推奨値を調整
      } else if (finishReason === 'content_filter') {
        truncationInfo.wasTruncated = true;
        truncationInfo.reason = 'コンテンツフィルター';
      }
    }

    // 2. 出力内容からの切断検出（パターンマッチング）
    if (!truncationInfo.wasTruncated) {
      const textEnd = responseText.trim();
      
      // 不完全な行で終わっている場合
      const lastLine = textEnd.split('\n').pop();
      if (lastLine && !lastLine.startsWith('#') && 
          (lastLine.includes('v ') || lastLine.includes('f ')) &&
          lastLine.split(' ').length < 4) {
        truncationInfo.wasTruncated = true;
        truncationInfo.reason = '不完全な行終了';
      }
      
      // OBJデータが途中で終わっている兆候
      const objDataMatch = responseText.match(/(v\s+[\d\-\.\s]+[\s\S]*?f\s+[\d\s\/]+(?:[\s\S]*?f\s+[\d\s\/]+)*)/);
      if (objDataMatch) {
        const objSection = objDataMatch[1];
        const vertexCount = (objSection.match(/^v\s/gm) || []).length;
        const faceCount = (objSection.match(/^f\s/gm) || []).length;
        
        // 頂点に対して面数が異常に少ない場合（面定義が途中で切れた可能性）
        if (vertexCount > 8 && faceCount < Math.floor(vertexCount / 8)) {
          truncationInfo.wasTruncated = true;
          truncationInfo.reason = '面定義の途中切断の疑い';
        }
      }
      
      // 明らかに途中で切れているパターン
      const truncationPatterns = [
        /脚\([^)]*\):\s*[^f]*$/,  // 脚の定義が途中で終わっている
        /f\s+\d+\s*$/,           // f 行が不完全
        /v\s+[\d\-\.]*\s*$/,     // v 行が不完全
        /[：:]\s*\([^)]*$/       // 説明文が途中で終わっている
      ];
      
      for (const pattern of truncationPatterns) {
        if (pattern.test(textEnd)) {
          truncationInfo.wasTruncated = true;
          truncationInfo.reason = '出力パターンによる切断検出';
          break;
        }
      }
    }

    return truncationInfo;
  }

  // ========== 第1段階結果を第2段階用にフォーマット ==========
  formatStage1OutputForStage2(furnitureSpec) {
    try {
      this.assistant.log('debug', '第1段階結果を第2段階用にフォーマット開始');
      
      if (!furnitureSpec || !furnitureSpec.optimized_specification) {
        this.assistant.log('warning', '第1段階の結果が不完全、フォールバック使用');
        return `DeepSeek-R1による3Dモデル生成のための基本指針：

【基本方針】
- 実用的で安定した家具構造の実現
- 適切な寸法とプロポーションの確保
- OBJ形式での正確な3Dデータ出力

【注意点】
第1段階の分析結果が利用できないため、基本的な家具設計原則に基づいてOBJモデルを生成してください。`;
      }
      
      // 第1段階の自然言語仕様を直接使用
      const stage1Specification = furnitureSpec.optimized_specification;
      const furnitureType = furnitureSpec.furniture_type || '汎用家具';
      const dimensions = furnitureSpec.dimensions || {};
      
      // ユーザー入力プロンプトの取得
      const userPrompt = document.getElementById('furnitureSpec')?.value || 'ユーザープロンプト情報なし';
      
      // 第1段階の完全な仕様を第2段階に渡す
      let stage2Input = `DeepSeek-R1によるOBJ生成指針（${furnitureType}）：

`;
      stage2Input += `【元のユーザー要求】
${userPrompt}

`;
      stage2Input += `【第1段階で分析・最適化された詳細仕様】
${stage1Specification}

`;
      
      // 寸法情報を明確に追加
      if (dimensions.width || dimensions.depth || dimensions.height) {
        stage2Input += `【確定寸法】
`;
        if (dimensions.width) stage2Input += `- 幅：${dimensions.width}cm
`;
        if (dimensions.depth) stage2Input += `- 奥行：${dimensions.depth}cm
`;
        if (dimensions.height) stage2Input += `- 高さ：${dimensions.height}cm
`;
        stage2Input += `
`;
      }
      
      // OBJ生成への技術的指示
      stage2Input += `【OBJ生成における重要な技術指示】
`;
      stage2Input += `- Y軸を上方向として座標系を統一
`;
      stage2Input += `- 単位はcmで統一し、小数点以下は2桁まで
`;
      stage2Input += `- 頂点番号は1から開始（OBJ形式標準）
`;
      stage2Input += `- すべての部品が床面（Y=0）に正しく設置される
`;
      stage2Input += `- 面は三角形または四角形で構成（複雑な多角形は避ける）
`;
      stage2Input += `- グループ分けで部品を明確に区別
`;
      stage2Input += `- コメント行で各部品の説明を追加
`;
      stage2Input += `- 重心バランスを考慮した安定した配置
`;
      stage2Input += `- 部品間の適切な接続・結合関係

`;
      
      stage2Input += `【実装指示】
`;
      stage2Input += `上記の第1段階分析結果に基づいて、正確なOBJ形式の3Dモデルデータを生成してください。
`;
      stage2Input += `仕様に記載された構造、寸法、機能をすべて反映し、3Dプリンタで印刷可能な実用的なモデルを作成してください。`;
      
      this.assistant.log('debug', '第1段階→第2段階フォーマット完了', {
        furnitureType,
        stage2InputLength: stage2Input.length,
        hasStage1Spec: !!stage1Specification,
        stage1SpecLength: stage1Specification ? stage1Specification.length : 0,
        hasDimensions: Object.keys(dimensions).length > 0
      });
      
      return stage2Input;
      
    } catch (error) {
      this.assistant.log('error', '第1段階結果フォーマットエラー', { error: error.message });
      
      // エラー時のフォールバック
      return `DeepSeek-R1による3Dモデル生成のための基本指針：

【基本方針】
- 実用的で安定した家具構造の実現
- 適切な寸法とプロポーションの確保
- OBJ形式での正確な3Dデータ出力

【注意点】
元の分析データの処理中にエラーが発生しました：${error.message}
しかし、基本的な家具設計原則に基づいて適切なOBJモデルを生成してください。`;
    }
  }











  // ========== 第1段階：最適化仕様データ保存 ==========
  storeOptimizedSpec(furnitureSpec, originalPrompt = null) {
    if (!furnitureSpec || !furnitureSpec.optimized_specification) {
      return;
    }

    // 元のプロンプトとシステムプロンプトを含めてデータを保存
    this.stagePipeline.context = {
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
      systemPrompt: this.assistant.aiManager ? this.assistant.aiManager.getSystemPrompt() : '第2段階システムプロンプトが利用できません',
      originalOutput: this.stage2OriginalOutput || 'DeepSeek-R1のオリジナル出力が利用できません' // 処理前の生出力
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