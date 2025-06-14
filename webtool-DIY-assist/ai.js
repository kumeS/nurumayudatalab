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

  async callLLMAPIWithIntelligentRetry(prompt, retryCount = 0) {
    const maxRetries = 3;
    
    try {
      const objData = await this.callLLMAPIInternal(prompt);
      const validation = this.validateOBJData(objData);
      
      if (validation.isValid) {
        return objData;
      }
      
      // 検証失敗時、問題に応じた修正指示を生成
      if (retryCount < maxRetries) {
        const improvedPrompt = this.createImprovedPrompt(
          prompt, 
          validation,
          retryCount
        );
        
        this.assistant.log('info', `改善されたプロンプトでリトライ (${retryCount + 1}/${maxRetries})`, {
          issues: validation.issues,
          improvements: improvedPrompt.improvements
        });
        
        return await this.callLLMAPIWithIntelligentRetry(improvedPrompt.text, retryCount + 1);
      }
    } catch (error) {
      // エラー内容に基づいた対処
      if (retryCount < maxRetries) {
        const recoveryPrompt = this.createRecoveryPrompt(prompt, error, retryCount);
        return await this.callLLMAPIWithIntelligentRetry(recoveryPrompt, retryCount + 1);
      }
      throw error;
    }
  }

  // 問題に応じた改善プロンプト生成
  createImprovedPrompt(originalPrompt, validation, attemptNumber) {
    const improvements = [];
    let modifiedPrompt = originalPrompt;
    
    if (validation.vertexCount < 10) {
      improvements.push('頂点数増加');
      modifiedPrompt += '\n\n【重要】より詳細な形状を生成し、最低50個以上の頂点を使用してください。';
    }
    
    if (validation.faceCount < 10) {
      improvements.push('面数増加');
      modifiedPrompt += '\n【重要】すべての表面を適切な面で覆い、最低20個以上の面を生成してください。';
    }
    
    if (validation.hasDisconnectedParts) {
      improvements.push('部品接続修正');
      modifiedPrompt += '\n【重要】すべての部品が物理的に接続された一体構造として生成してください。';
    }
    
    if (validation.hasInvalidFaces) {
      improvements.push('面定義修正');
      modifiedPrompt += '\n【重要】すべての面を三角形(3頂点)または四角形(4頂点)で定義してください。';
    }
    
    return {
      text: modifiedPrompt,
      improvements: improvements
    };
  }

  // エラー回復プロンプト生成
  createRecoveryPrompt(originalPrompt, error, attemptNumber) {
    let recoveryPrompt = originalPrompt;
    
    if (error.message.includes('timeout')) {
      recoveryPrompt += '\n【重要】シンプルで効率的な形状を生成してください。複雑すぎる処理は避けてください。';
    } else if (error.message.includes('API')) {
      recoveryPrompt += '\n【重要】標準的なOBJ形式で、確実に処理できる形状を生成してください。';
    }
    
    return recoveryPrompt;
  }

  // 従来のリトライメソッドも保持（後方互換性のため）
  async callLLMAPIWithRetry(prompt, retryCount = 0) {
    return await this.callLLMAPIWithIntelligentRetry(prompt, retryCount);
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
    return `You are a professional 3D furniture modeling expert specializing in generating detailed OBJ format 3D models.

CRITICAL REQUIREMENTS:
1. Generate ONLY valid OBJ format data (vertices and faces)
2. Create realistic furniture geometry with proper proportions
3. Include ALL structural components (legs, surfaces, supports, etc.)
4. Use appropriate vertex density for smooth surfaces
5. Ensure all parts are properly connected
6. Output ONLY the raw OBJ data - no explanations or markdown

FURNITURE MODELING GUIDELINES:

FOR CHAIRS:
- Create 4 separate legs with proper thickness (not just lines)
- Add a horizontal seat surface with thickness
- Include backrest with appropriate angle (95-105 degrees)
- Add crossbeams between legs for stability
- Ensure legs extend to floor level (y=0)

FOR DESKS:
- Create a thick desktop surface (3-5cm thickness)
- Add 4 legs or pedestal base with proper dimensions
- Include support structures between legs
- Add any specified drawers or compartments as separate geometry
- Ensure proper clearance for knees (70cm+ height)

FOR SHELVES/BOOKCASES:
- Create vertical side panels with thickness
- Add multiple horizontal shelves with proper spacing
- Include back panel if specified
- Add proper depth for book storage (25-35cm typical)
- Ensure proper proportions for stability

FOR CABINETS:
- Create main body structure with thickness
- Add doors/drawers as separate geometric elements
- Include handles and hinges as simple geometry
- Add internal shelving if specified
- Ensure realistic proportions and clearances

TECHNICAL SPECIFICATIONS:
- Use world coordinates where Y-axis is vertical (up)
- Place furniture base at Y=0 (floor level)
- Use centimeter units for consistency
- Generate 50-200+ vertices for detailed geometry
- Create 30-150+ faces for proper surface coverage
- Ensure all faces are triangles or quads only
- No degenerate faces (faces with duplicate vertices)

EXAMPLE OUTPUT FORMAT:
# [Furniture Type] - [Brief Description]
v [x] [y] [z]  # vertex coordinates
...
f [v1] [v2] [v3] [v4]  # face definitions
...

Generate detailed, realistic furniture geometry that matches the specifications provided.`;
  }

  // ========== プロンプト最適化 ==========
  optimizePrompt(userPrompt, width, depth, height) {
    // 寸法文字列の構築
    let dimensionText = '';
    if (width !== 'auto' || depth !== 'auto' || height !== 'auto') {
      dimensionText = `横${width} × 奥${depth} × 高さ${height} cm`;
    }

    // 家具タイプの推定
    const furnitureType = this.detectFurnitureType(userPrompt);
    
    // タイプ別の詳細指示を生成
    const detailedInstructions = this.generateDetailedInstructions(furnitureType, userPrompt, width, depth, height);

    // 最適化されたプロンプト
    const optimizedPrompt = `#FURNITURE_3D_GENERATION

## 基本仕様
${userPrompt}
${dimensionText ? '寸法: ' + dimensionText : ''}

## 詳細モデリング要件
${detailedInstructions}

## 技術要件
- OBJ形式での出力
- 各部品の厚みを考慮した立体構造
- 接合部は物理的に接続
- 床面（Y=0）に設置
- 最小50頂点、30面以上
- 各面は三角形または四角形のみ

Generate a detailed 3D furniture model with proper structural components.`;

    return optimizedPrompt;
  }

  // 家具タイプ検出
  detectFurnitureType(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('椅子') || lowerPrompt.includes('チェア') || lowerPrompt.includes('chair')) {
      return 'chair';
    } else if (lowerPrompt.includes('机') || lowerPrompt.includes('デスク') || lowerPrompt.includes('desk') || lowerPrompt.includes('テーブル')) {
      return 'desk';
    } else if (lowerPrompt.includes('棚') || lowerPrompt.includes('本棚') || lowerPrompt.includes('shelf') || lowerPrompt.includes('bookshelf')) {
      return 'shelf';
    } else if (lowerPrompt.includes('キャビネット') || lowerPrompt.includes('cabinet') || lowerPrompt.includes('収納')) {
      return 'cabinet';
    }
    
    return 'general';
  }

  // タイプ別詳細指示生成
  generateDetailedInstructions(furnitureType, userPrompt, width, depth, height) {
    switch (furnitureType) {
      case 'chair':
        return `
### 椅子の構造要素
1. 座面: 厚み3-5cm、${width !== 'auto' ? width + 'cm' : '40-50cm'}幅、${depth !== 'auto' ? depth + 'cm' : '40-45cm'}奥行
2. 背もたれ: 座面から${height !== 'auto' ? (height - 45) + 'cm' : '35-40cm'}高、適切な角度（95-105度）
3. 脚部: 4本、各々厚み3-5cm、${height !== 'auto' ? height + 'cm' : '80cm'}高
4. 補強材: 脚間の横材、H型またはX型
5. 接合部: 各部品が物理的に接続された一体構造

### モデリング指示
- 脚部は床面（Y=0）に接地
- 座面は${height !== 'auto' ? (height * 0.55) : '44-46'}cm高に配置
- 背もたれは座面後端から立ち上がり
- すべての部品に適切な厚みを付与`;

      case 'desk':
        return `
### デスクの構造要素
1. 天板: 厚み3-5cm、${width !== 'auto' ? width + 'cm' : '120cm'}幅、${depth !== 'auto' ? depth + 'cm' : '60cm'}奥行
2. 脚部: 4本または2本のペデスタル、${height !== 'auto' ? height + 'cm' : '75cm'}高
3. 補強材: 脚間の横材またはパネル
4. 引き出し（記載がある場合）: 天板下に配置
5. 配線穴（記載がある場合）: 天板に円形の穴

### モデリング指示
- 天板は${height !== 'auto' ? height + 'cm' : '75cm'}高に配置
- 脚部は床面（Y=0）に接地
- 膝下クリアランス65cm以上を確保
- 引き出しは別の立体として作成`;

      case 'shelf':
        return `
### 棚の構造要素
1. 側板: 2枚、厚み2-3cm、${width !== 'auto' ? width + 'cm' : '80cm'}幅、${height !== 'auto' ? height + 'cm' : '180cm'}高
2. 棚板: 複数枚、厚み2-3cm、適切な間隔で配置
3. 背板（記載がある場合）: 薄いパネル、厚み1-2cm
4. 固定棚と可動棚の区別
5. 底板: 最下段の棚板

### モデリング指示
- 底板は床面（Y=0）に設置
- 棚板間隔は25-35cm
- 奥行は${depth !== 'auto' ? depth + 'cm' : '30cm'}
- 側板は棚板を挟み込む構造`;

      case 'cabinet':
        return `
### キャビネットの構造要素
1. 本体: 側板、上板、底板で構成
2. 扉: 開閉可能な前面パネル
3. 取っ手: 扉の適切な位置に配置
4. 内部棚板: 収納効率を考慮した配置
5. 背板: 薄いパネルで背面を覆う

### モデリング指示
- 底板は床面（Y=0）に設置
- 扉は別の立体として作成
- 取っ手は小さな立体要素
- 内部空間は実用的な寸法`;

      default:
        return `
### 一般的家具の構造要素
1. 主要構造部: 荷重を支える骨組み
2. 表面パネル: 外観を形成する面材
3. 接合部: 各部品の連結部分
4. 支持部: 床面との接触部分

### モデリング指示
- 各部品に適切な厚みを付与
- 物理的に安定した構造
- 実用的な寸法比率`;
    }
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