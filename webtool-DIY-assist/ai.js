/**
 * ai.js - AI統合とモデル生成
 * 
 * 主な責務：
 * - LLM APIとの通信
 * - プロンプト最適化
 * - OBJ/STLデータ処理
 * - 品質要件管理
 */

class AIManager {
  constructor(assistant) {
    this.assistant = assistant;
    
    // API設定
    this.apiUrl = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
    this.modelName = "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8";
    
    // 状態
    this.currentSTLData = null;
  }

  // ========== LLM API呼び出し（リトライ機能付き） ==========
  async callLLMAPI(prompt) {
    return await this.callLLMAPIWithRetry(prompt, 0);
  }

  async callLLMAPIWithRetry(prompt, retryCount = 0) {
    const maxRetries = 2;
    const retryTimeoutMs = 15000; // 15秒タイムアウト
    
    try {
      const objData = await this.callLLMAPIInternal(prompt, retryCount > 0 ? retryTimeoutMs : 30000);
      
      // Step 4: ポストチェック検証
      const validationResult = this.validateOBJData(objData);
      
      if (validationResult.isValid) {
        this.assistant.log('info', 'OBJ検証成功', {
          retryCount,
          vertices: validationResult.vertexCount,
          faces: validationResult.faceCount
        });
        return objData;
      }
      
      // 検証失敗 - リトライ実行
      if (retryCount < maxRetries) {
        this.assistant.log('warn', 'OBJ検証失敗、リトライ実行', {
          retryCount: retryCount + 1,
          reason: validationResult.reason,
          vertices: validationResult.vertexCount,
          faces: validationResult.faceCount
        });
        
        // リトライ用の簡潔なプロンプト
        const retryPrompt = `#TASK: OBJ_GENERATION_RETRY
直前の JSON を忠実に OBJ 行に変換せよ。`;
        
        return await this.callLLMAPIWithRetry(retryPrompt, retryCount + 1);
      } else {
        // 最大リトライ回数に到達
        this.assistant.log('error', 'OBJ検証失敗、最大リトライ回数到達', {
          finalReason: validationResult.reason,
          vertices: validationResult.vertexCount,
          faces: validationResult.faceCount
        });
        throw new Error(`OBJ生成に失敗しました（${validationResult.reason}）。最大リトライ回数（${maxRetries}回）に到達しました。`);
      }
      
    } catch (error) {
      if (retryCount < maxRetries && !error.message.includes('最大リトライ回数')) {
        this.assistant.log('warn', 'API呼び出しエラー、リトライ実行', {
          retryCount: retryCount + 1,
          error: error.message
        });
        
        const retryPrompt = `#TASK: OBJ_GENERATION_RETRY
直前の JSON を忠実に OBJ 行に変換せよ。`;
        
        return await this.callLLMAPIWithRetry(retryPrompt, retryCount + 1);
      }
      throw error;
    }
  }

  // ========== LLM API呼び出しメソッド（内部実装） ==========
  async callLLMAPIInternal(prompt, timeoutMs = 30000) {
    this.assistant.log('info', 'LLM API呼び出し開始', { 
      promptLength: prompt.length,
      timeout: timeoutMs,
      attempt: 'direct'
    });

    // タイムアウト処理
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('API timeout')), timeoutMs);
    });

    try {
      const response = await Promise.race([
        this.makeLLMRequest(prompt),
        timeoutPromise
      ]);

      this.assistant.log('info', 'LLM API呼び出し成功', {
        responseLength: response?.length || 0,
        hasValidResponse: !!response
      });

      return response;
    } catch (error) {
      this.assistant.log('error', 'LLM API呼び出し失敗', { 
        error: error.message,
        timeout: timeoutMs
      });
      
      throw error;
    }
  }

  // ========== 実際のLLMリクエスト送信 ==========
  async makeLLMRequest(prompt) {
    const apiUrl = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
    
    const requestData = {
      model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
      temperature: 0.2,
      stream: false,
      max_completion_tokens: 2000,
      messages: [
        {
          role: "system",
          content: this.getSystemPrompt()
        },
        {
          role: "user", 
          content: prompt
        }
      ]
    };
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      throw new Error(`API呼び出しに失敗しました: ${response.status}`);
    }
    
    const data = await response.json();
    
    // レスポンスからOBJデータを抽出
    let responseText = '';
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      responseText = data.choices[0].message.content;
    } else if (data.answer) {
      responseText = data.answer;
    } else {
      throw new Error('レスポンスに期待されるフィールドがありません');
    }
    
    this.assistant.log('info', 'API呼び出し成功', {
      responseLength: responseText.length,
      apiUrl: apiUrl
    });
    
    return this.parseOBJResponse(responseText);
  }

  // OBJレスポンス解析（参考コードのparseRecipeResponseを3D用に調整）
  parseOBJResponse(text) {
    try {
      this.assistant.log('debug', 'OBJレスポンス解析開始', { 
        textLength: text.length,
        preview: text.substring(0, 200)
      });
      
      // 複数のOBJ抽出パターンを試行
      let objText = null;
      
      // パターン1: ```obj と ``` で囲まれたOBJ
      let objMatch = text.match(/```obj\s*([\s\S]*?)\s*```/);
      if (objMatch) {
        objText = objMatch[1];
        this.assistant.log('debug', 'OBJ found with obj marker');
      } else {
        // パターン2: ``` と ``` で囲まれたコンテンツ
        objMatch = text.match(/```\s*([\s\S]*?)\s*```/);
        if (objMatch) {
          objText = objMatch[1];
          this.assistant.log('debug', 'OBJ found with generic marker');
        } else {
          // パターン3: v行から始まるOBJデータを探す
          const vIndex = text.indexOf('v ');
          if (vIndex !== -1) {
            objText = text.substring(vIndex);
            this.assistant.log('debug', 'OBJ found by vertex detection');
          } else {
            // パターン4: 直接OBJデータとして解析
            objText = text.trim();
            this.assistant.log('debug', 'Using text directly as OBJ');
          }
        }
      }
      
      if (!objText) {
        throw new Error('OBJコンテンツが見つかりません');
      }
      
      // OBJデータをクリーンアップ
      objText = objText.trim();
      
      // 不要な文字を除去
      objText = objText.replace(/```$/, ''); // 末尾の ``` を除去
      
      this.assistant.log('info', 'OBJレスポンス解析完了', {
        objLength: objText.length,
        hasVertices: objText.includes('v '),
        hasFaces: objText.includes('f ')
      });
      
      return objText;
      
    } catch (error) {
      this.assistant.log('error', 'OBJレスポンス解析エラー', { 
        error: error.message,
        textPreview: text.substring(0, 500)
      });
      
      throw new Error(`OBJデータの解析に失敗しました: ${error.message}\n\n受信したテキスト:\n${text.substring(0, 500)}...`);
    }
  }

  // ========== Step 4: OBJデータ検証 ==========
  validateOBJData(objData) {
    if (!objData || typeof objData !== 'string') {
      return {
        isValid: false,
        reason: 'OBJデータが空または無効',
        vertexCount: 0,
        faceCount: 0
      };
    }

    // より柔軟なOBJデータ抽出を試行
    let processedData = objData;
    
    // JSONレスポンスの検出と対処
    if (processedData.includes('{') && processedData.includes('}')) {
      this.assistant.log('warn', 'JSONレスポンスを検出、OBJ抽出を試行', {
        preview: processedData.substring(0, 100)
      });
      
      // JSONの中からOBJっぽい部分を探す（暫定対処）
      const jsonMatch = processedData.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const jsonData = JSON.parse(jsonMatch[0]);
          this.assistant.log('debug', 'JSON解析成功', { keys: Object.keys(jsonData) });
          
          // JSON内にOBJデータがあるか探す
          for (const [key, value] of Object.entries(jsonData)) {
            if (typeof value === 'string' && (value.includes('v ') || value.includes('f '))) {
              this.assistant.log('info', 'JSON内からOBJデータを発見', { key });
              processedData = value;
              break;
            }
          }
        } catch (e) {
          this.assistant.log('debug', 'JSON解析失敗、元データを継続使用');
        }
      }
    }
    
    // マークダウンコードブロックの除去（cleanOBJDataでできなかった場合のバックアップ）
    if (processedData.includes('```')) {
      processedData = processedData
        .replace(/```obj\s*/gi, '')
        .replace(/```\s*/g, '')
        .replace(/```/g, '');
      
      this.assistant.log('debug', 'validateOBJDataでコードブロック除去', {
        beforeLength: objData.length,
        afterLength: processedData.length
      });
    }

    const lines = processedData.split('\n');
    let vertexCount = 0;
    let faceCount = 0;
    let hasInvalidLines = false;
    const invalidLines = [];
    let potentialOBJLines = 0; // OBJらしい行の数

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      
      // 空行はスキップ
      if (trimmed === '') continue;
      
      // 頂点数をカウント
      if (trimmed.startsWith('v ')) {
        vertexCount++;
        potentialOBJLines++;
        continue;
      }
      
      // 面数をカウント
      if (trimmed.startsWith('f ')) {
        faceCount++;
        potentialOBJLines++;
        continue;
      }
      
      // 有効なOBJ行頭かチェック
      const validPrefixes = [
        '#',        // コメント
        'vt ',      // テクスチャ座標
        'vn ',      // 法線
        'g ',       // グループ
        'o ',       // オブジェクト
        's ',       // スムースシェーディング
        'mtllib ',  // マテリアルライブラリ
        'usemtl '   // マテリアル使用
      ];
      
      const isValidLine = validPrefixes.some(prefix => trimmed.startsWith(prefix));
      
      if (isValidLine) {
        potentialOBJLines++;
      } else if (trimmed.length > 0) { // 空行以外の無効行
        hasInvalidLines = true;
        invalidLines.push(`行${i + 1}: "${trimmed.substring(0, 50)}..."`);
        
        // 無効行が多すぎる場合は早期終了
        if (invalidLines.length >= 10) break; // 閾値を上げる
      }
    }

    // 検証結果の評価
    const result = {
      vertexCount,
      faceCount,
      hasInvalidLines,
      invalidLines,
      potentialOBJLines,
      totalLines: lines.length
    };

    this.assistant.log('debug', 'OBJ検証詳細', {
      vertices: vertexCount,
      faces: faceCount,
      potentialOBJLines,
      invalidLines: invalidLines.length,
      totalLines: lines.length,
      dataPreview: processedData.substring(0, 100)
    });

    // 緩和された基本要件チェック
    // 完全に空の場合のみエラー、少しでも頂点があれば許可
    if (vertexCount === 0 && potentialOBJLines === 0) {
      return {
        ...result,
        isValid: false,
        reason: `OBJデータが全く含まれていません (頂点: ${vertexCount}, OBJ行: ${potentialOBJLines})`
      };
    }

    // 非常に緩い条件：頂点が1つでもあれば暫定的に合格
    if (vertexCount > 0 && faceCount === 0) {
      this.assistant.log('warn', '頂点のみでface不足、暫定合格', {
        vertices: vertexCount,
        faces: faceCount
      });
      // 面がなくても頂点があれば一旦合格とする
    }

    // 最低限の3D形状要件（さらに緩和）
    if (vertexCount < 3 && faceCount === 0) {
      return {
        ...result,
        isValid: false,
        reason: `最小3D形状要件不足 (頂点: ${vertexCount}, 面: ${faceCount})`
      };
    }

    // 無効行チェック（より寛容に）
    // OBJっぽい行が半数以上あれば許可
    const validRatio = potentialOBJLines / Math.max(lines.filter(l => l.trim().length > 0).length, 1);
    if (hasInvalidLines && validRatio < 0.5) {
      return {
        ...result,
        isValid: false,
        reason: `OBJフォーマット違反行が多すぎます (有効行比率: ${Math.round(validRatio * 100)}%)`
      };
    }

    // 全ての検証をパス
    return {
      ...result,
      isValid: true,
      reason: '検証成功'
    };
  }

  // ========== 第2段階：OBJ形式ファイル出力特化システムプロンプト ==========
  getSystemPrompt() {
    return `You are a furniture-CAD expert specializing in 3D model generation. 
Generate valid OBJ format data only. Output ONLY the OBJ file content with vertices (v) and faces (f).
Do not include any explanations, markdown, or other text - just pure OBJ data.`;
  }

  // ========== プロンプト最適化 ==========
  optimizePrompt(userPrompt, width, depth, height) {
    // 寸法文字列の構築
    let dimensionText = '';
    if (width !== 'auto' || depth !== 'auto' || height !== 'auto') {
      dimensionText = `横${width} × 奥${depth} × 高さ${height} cm`;
    }

    // 簡潔なタスク指定プロンプト
    const taskPrompt = `#TASK: OBJ_GENERATION
${userPrompt}${dimensionText ? '\n' + dimensionText : ''}`;

    return taskPrompt;
  }

  // ========== OBJデータクリーニング ==========
  cleanOBJData(rawData) {
    if (!rawData || typeof rawData !== 'string') {
      throw new Error('Invalid OBJ data received');
    }

    // マークダウンコードブロックを除去
    let cleaned = rawData
      .replace(/```obj\s*/gi, '')
      .replace(/```\s*/g, '')
      .replace(/```/g, '');
    
    // 行ごとに処理
    const lines = cleaned.split('\n');
    const objLines = [];
    let foundValidOBJContent = false;

    for (let line of lines) {
      const trimmed = line.trim();
      
      // 空行は保持
      if (trimmed === '') {
        objLines.push('');
        continue;
      }
      
      // 有効なOBJ行のみを保持
      if (trimmed.startsWith('#') ||           // コメント
          trimmed.startsWith('v ') ||          // 頂点
          trimmed.startsWith('vt ') ||         // テクスチャ座標
          trimmed.startsWith('vn ') ||         // 法線
          trimmed.startsWith('f ') ||          // 面
          trimmed.startsWith('g ') ||          // グループ
          trimmed.startsWith('o ') ||          // オブジェクト
          trimmed.startsWith('s ') ||          // スムースシェーディング
          trimmed.startsWith('mtllib ') ||     // マテリアルライブラリ
          trimmed.startsWith('usemtl ')) {     // マテリアル使用
        objLines.push(line);
        if (trimmed.startsWith('v ') || trimmed.startsWith('f ')) {
          foundValidOBJContent = true;
        }
      }
    }

    const result = objLines.join('\n').trim();
    
    this.assistant.log('debug', 'OBJデータクリーニング完了', { 
      originalLines: lines.length,
      cleanedLines: objLines.length,
      hasValidContent: foundValidOBJContent,
      resultLength: result.length,
      originalPreview: rawData.substring(0, 200)
    });
    
    // クリーニング後に空になった場合は元データを返す（Step 4で詳細検証）
    if (result.length === 0) {
      this.assistant.log('warn', 'クリーニング後に空データ、元データを返します', {
        originalDataPreview: rawData.substring(0, 200)
      });
      return rawData; // 元のrawDataをそのまま返す
    }
    
    return result;
  }

  // ========== STL変換 ==========
  async convertToSTL(objData) {
    if (!objData) return;

    try {
      this.assistant.showLoading(true, 'STLファイルを生成中...');
      
      // STL変換（簡易実装）
      const stlData = this.objToSTL(objData);
      
      // STLファイルとして保存可能にする
      this.currentSTLData = stlData;
      
      this.assistant.showSuccess('STLファイルの生成が完了しました！');
    } catch (error) {
      this.assistant.log('error', 'STL変換エラー', { error: error.message });
      this.assistant.showError('STL変換でエラーが発生しました。');
    } finally {
      this.assistant.showLoading(false);
    }
  }

  objToSTL(objData) {
    // 簡易OBJ to STL変換
    const lines = objData.split('\n');
    const vertices = [];
    const faces = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('v ')) {
        const coords = trimmed.substring(2).split(/\s+/).map(Number);
        vertices.push(coords);
      } else if (trimmed.startsWith('f ')) {
        const faceIndices = trimmed.substring(2).split(/\s+/).map(f => {
          return parseInt(f.split('/')[0]) - 1; // OBJは1から開始、配列は0から
        });
        faces.push(faceIndices);
      }
    }

    // STL ASCII形式で出力
    let stl = 'solid furniture\n';
    
    for (const face of faces) {
      if (face.length >= 3) {
        const v1 = vertices[face[0]];
        const v2 = vertices[face[1]];
        const v3 = vertices[face[2]];
        
        if (v1 && v2 && v3) {
          // 法線ベクトル計算
          const normal = this.assistant.sceneManager.calculateNormal(v1, v2, v3);
          
          stl += `  facet normal ${normal[0]} ${normal[1]} ${normal[2]}\n`;
          stl += `    outer loop\n`;
          stl += `      vertex ${v1[0]} ${v1[1]} ${v1[2]}\n`;
          stl += `      vertex ${v2[0]} ${v2[1]} ${v2[2]}\n`;
          stl += `      vertex ${v3[0]} ${v3[1]} ${v3[2]}\n`;
          stl += `    endloop\n`;
          stl += `  endfacet\n`;
        }
      }
    }
    
    stl += 'endsolid furniture\n';
    return stl;
  }


}