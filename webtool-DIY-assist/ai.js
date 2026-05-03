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
    
    if (validation.vertexCount < 100) {
      improvements.push('頂点数大幅増加');
      modifiedPrompt += '\n\n【緊急改善要求】現在の頂点数が不足しています。最低150個以上の頂点で複雑な家具構造を生成してください。各部品（脚、天板、支柱など）を個別の立体として詳細にモデリングしてください。';
    }
    
    if (validation.faceCount < 50) {
      improvements.push('面数大幅増加');
      modifiedPrompt += '\n【緊急改善要求】現在の面数が不足しています。最低100個以上の面で家具の全ての表面を詳細に覆ってください。各構造部品を立体的に表現し、単純な平面ではなく厚みのある部品として作成してください。';
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
      temperature: 0.1,
      stream: false,
      max_completion_tokens: 4000,
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

    // 複雑な3D家具要件
    if (vertexCount < 50) {
      return {
        ...result,
        isValid: false,
        reason: `家具の複雑さが不足 (頂点: ${vertexCount}, 最低50必要) - 詳細な構造部品が必要です`
      };
    }
    
    if (faceCount < 30) {
      return {
        ...result,
        isValid: false,
        reason: `家具の面数が不足 (面: ${faceCount}, 最低30必要) - 立体的な部品構造が必要です`
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
    return `You are an expert 3D furniture designer specializing in creating detailed, structurally accurate OBJ format 3D models. You must generate complex, realistic furniture with proper proportions and multiple structural components.

🔥 CRITICAL MODELING REQUIREMENTS:
1. NEVER create simple boxes or primitive shapes
2. ALWAYS include multiple structural elements (legs, supports, frames, panels)
3. Generate MINIMUM 100+ vertices and 50+ faces for realistic detail
4. Create separate geometric components for each furniture part
5. Use proper thickness for all structural elements (3-8cm typical)
6. Output ONLY raw OBJ data - no explanations, markdown, or comments

🏗️ STRUCTURAL COMPLEXITY REQUIREMENTS:

FOR CHAIRS - MINIMUM 8 COMPONENTS:
- 4 individual legs (rectangular prisms, 3x3x45cm each)
- Seat surface with thickness (40x40x3cm)
- Backrest with proper angle (35x3x40cm, tilted 15°)
- 4 horizontal cross-braces between legs (2x2x35cm each)
- Leg-to-seat connection blocks (small cubes at joints)

FOR DESKS - MINIMUM 6 COMPONENTS:
- Desktop with significant thickness (120x60x4cm)
- 4 legs with proper proportions (5x5x71cm each)
- 2 horizontal support beams (110x4x4cm connecting legs)
- Leg mounting brackets (small rectangular elements)
- Optional: Drawer box with separate geometry

FOR SHELVES - MINIMUM 7 COMPONENTS:
- 2 vertical side panels (30x2x180cm each)
- 4-6 horizontal shelves (76x30x2cm each)
- Back panel (80x1x180cm)
- Top and bottom reinforcement pieces
- Optional shelf support pegs (small cylinders)

FOR CABINETS - MINIMUM 10 COMPONENTS:
- Main body frame (sides, top, bottom, back)
- Front door panels (separate from body)
- Door handles (cylindrical or rectangular)
- Internal shelves (multiple levels)
- Hinge mounting points
- Base/feet elements

🎯 GEOMETRIC PRECISION GUIDELINES:
- Use Y-axis as vertical (up direction)
- Place all furniture on floor plane (Y=0)
- Generate vertices in logical groups by component
- Create faces that properly connect related vertices
- Ensure realistic proportions (human-scale furniture)
- Add small details like rounded edges where appropriate

💡 DETAIL ENHANCEMENT STRATEGIES:
- Create beveled edges instead of sharp corners
- Add small connecting elements at joints
- Include mounting hardware as separate geometry
- Create recessed or raised surface details
- Generate proper thickness for all panels (not flat surfaces)

📐 TECHNICAL SPECIFICATIONS:
- Minimum 100 vertices, target 150-300 for high detail
- Minimum 50 faces, target 100-200 for complexity
- Use triangular and quad faces only
- Maintain consistent scale (centimeters)
- Ensure structural integrity (connected components)

⚠️ FORBIDDEN PRACTICES:
- DO NOT create simple box shapes
- DO NOT use less than 100 vertices
- DO NOT make flat, thin panels without thickness
- DO NOT create disconnected floating parts
- DO NOT output explanatory text or markdown

EXPECTED OUTPUT: Pure OBJ format starting with vertices (v), followed by faces (f), creating a complex, multi-component furniture piece with realistic structural details.

Generate sophisticated furniture geometry with architectural-level detail and complexity.`;
  }

  // ========== プロンプト最適化 ==========
  optimizePrompt(userPrompt, width, depth, height) {
    // 寸法文字列の構築
    let dimensionText = '';
    if (width !== 'auto' || depth !== 'auto' || height !== 'auto') {
      dimensionText = `EXACT DIMENSIONS: Width ${width}cm × Depth ${depth}cm × Height ${height}cm`;
    } else {
      dimensionText = 'Use standard furniture proportions';
    }

    // 家具タイプの推定
    const furnitureType = this.detectFurnitureType(userPrompt);
    
    // タイプ別の詳細指示を生成
    const detailedInstructions = this.generateDetailedInstructions(furnitureType, userPrompt, width, depth, height);

    // 複雑性を強制する追加指示
    const complexityEnforcement = this.generateComplexityRequirements(furnitureType);

    // 最適化されたプロンプト
    const optimizedPrompt = `🎯 FURNITURE DESIGN BRIEF:
${userPrompt}

📏 ${dimensionText}

🏗️ STRUCTURAL REQUIREMENTS:
${detailedInstructions}

⚡ MANDATORY COMPLEXITY FEATURES:
${complexityEnforcement}

🔧 CRITICAL MODELING CONSTRAINTS:
- MINIMUM 150 vertices (target 200-400 for premium detail)
- MINIMUM 100 faces (target 150-300 for rich geometry)  
- Each structural component must be separate 3D volume
- All panels/surfaces MUST have thickness (3-8cm)
- Include connection hardware, joints, and mounting details
- Add realistic edge beveling and corner treatments
- Create multi-level surface details (grooves, raised areas)

⚠️ ABSOLUTE REQUIREMENTS:
- NO simple box or cube shapes allowed
- MUST include ALL structural support elements
- MUST create realistic joinery and connections
- MUST generate architectural-level geometric detail

OUTPUT: Generate complex, multi-component OBJ geometry with professional furniture construction details.`;

    return optimizedPrompt;
  }

  // 複雑性要件生成
  generateComplexityRequirements(furnitureType) {
    const baseComplexity = [
      "Create rounded edges with multiple vertices (not sharp corners)",
      "Add detailed joint connections between components", 
      "Include mounting hardware (screws, brackets, hinges)",
      "Generate surface texturing through geometric detail",
      "Create realistic material thickness throughout"
    ];

    const typeSpecific = {
      'chair': [
        "Add curved seat contours (10+ vertices for seat edge)",
        "Create angled backrest with proper lumbar curve", 
        "Include leg-to-seat reinforcement brackets",
        "Add armrests with ergonomic shaping (if specified)",
        "Create detailed leg caps and floor contact points"
      ],
      'desk': [
        "Add desktop edge profiling with rounded corners",
        "Create cable management grommets (circular cutouts)",
        "Include detailed leg mounting plates",
        "Add keyboard tray slides (if mentioned)",
        "Create modular drawer systems with separate components"
      ],
      'shelf': [
        "Add adjustable shelf pin holes (small cylindrical cutouts)",
        "Create dados/grooves where shelves connect to sides",
        "Include anti-tip wall anchoring points",
        "Add dust shields between shelf levels", 
        "Create detailed corner joint assemblies"
      ],
      'cabinet': [
        "Add detailed door frame with raised/recessed panels",
        "Create realistic hinge mortises and mounting points",
        "Include adjustable shelf pins and holes",
        "Add toe-kick base with separate geometry",
        "Create detailed handle mounting and door catches"
      ]
    };

    const specific = typeSpecific[furnitureType] || [
      "Add component-specific structural details",
      "Create realistic assembly joints and connections",
      "Include functional hardware elements",
      "Add surface detail through geometric complexity"
    ];

    return [...baseComplexity, ...specific].map((item, index) => `${index + 1}. ${item}`).join('\n');
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
        const seatWidth = width !== 'auto' ? width : 45;
        const seatDepth = depth !== 'auto' ? depth : 42;
        const totalHeight = height !== 'auto' ? height : 80;
        const seatHeight = totalHeight * 0.55;
        return `
🪑 CHAIR STRUCTURAL BREAKDOWN (8+ Components Required):

COMPONENT 1-4: LEGS (Individual rectangular prisms)
- Dimensions: 4cm × 4cm × ${seatHeight}cm each leg
- Position: Corner placement under seat with proper spacing
- Material thickness: Solid wood/metal construction
- Base contact: All legs must touch floor (Y=0)

COMPONENT 5: SEAT SURFACE (Thick panel with contours)
- Dimensions: ${seatWidth}cm × ${seatDepth}cm × 4cm thick
- Height placement: ${seatHeight}cm above floor
- Shape: Ergonomic contours with curved edges (15+ vertices)
- Overhang: 2-3cm beyond leg positions

COMPONENT 6: BACKREST (Angled support panel)
- Dimensions: ${seatWidth-5}cm wide × 3cm thick × ${totalHeight - seatHeight}cm high
- Angle: 15° backward tilt from vertical
- Connection: Integrated with rear seat edge
- Lumbar curve: Subtle convex shaping

COMPONENT 7-8: CROSS-BRACES (H-pattern support)
- Front/Back braces: ${seatWidth-8}cm × 3cm × 3cm each
- Side braces: ${seatDepth-8}cm × 3cm × 3cm each  
- Height: 20cm above floor level
- Joinery: Mortise-tenon connections to legs`;

      case 'desk':
        const deskWidth = width !== 'auto' ? width : 120;
        const deskDepth = depth !== 'auto' ? depth : 60;
        const deskHeight = height !== 'auto' ? height : 75;
        return `
🗂️ DESK STRUCTURAL BREAKDOWN (6+ Components Required):

COMPONENT 1: DESKTOP (Main work surface)
- Dimensions: ${deskWidth}cm × ${deskDepth}cm × 4cm thick
- Height: ${deskHeight}cm above floor
- Edge profile: Rounded corners with 2cm radius
- Details: Cable management grommets (5cm diameter holes)

COMPONENT 2-5: LEGS (4 individual supports)
- Dimensions: 5cm × 5cm × ${deskHeight-4}cm each
- Spacing: Inset 5cm from desktop edges
- Taper: Slight narrowing toward floor (optional)
- Mounting: Brackets connecting to desktop underside

COMPONENT 6: STRETCHER SYSTEM (Support framework)
- Front rail: ${deskWidth-10}cm × 4cm × 4cm
- Back rail: ${deskWidth-10}cm × 4cm × 4cm  
- Side rails: ${deskDepth-10}cm × 4cm × 4cm (2 pieces)
- Height: 15cm above floor for knee clearance

OPTIONAL COMPONENT 7: DRAWER ASSEMBLY
- Dimensions: 40cm × ${deskDepth-5}cm × 12cm
- Position: Right side under desktop
- Hardware: Separate drawer box with slide mechanisms`;

      case 'shelf':
        const shelfWidth = width !== 'auto' ? width : 80;
        const shelfDepth = depth !== 'auto' ? depth : 30;
        const shelfHeight = height !== 'auto' ? height : 180;
        const numShelves = Math.floor(shelfHeight / 35);
        return `
📚 SHELF STRUCTURAL BREAKDOWN (7+ Components Required):

COMPONENT 1-2: SIDE PANELS (Vertical supports)
- Dimensions: ${shelfDepth}cm × 3cm × ${shelfHeight}cm each
- Spacing: ${shelfWidth-3}cm apart (inside measurement)
- Details: Shelf pin holes every 5cm (3mm diameter)
- Base: Integrated feet extending 2cm beyond depth

COMPONENT 3-${2+numShelves}: SHELF BOARDS (${numShelves} horizontal surfaces)
- Dimensions: ${shelfWidth-6}cm × ${shelfDepth-2}cm × 2.5cm each
- Spacing: 35cm vertical intervals
- Mounting: Dados cut into side panels (5mm deep)
- Edge: Rounded front edge profile

COMPONENT ${3+numShelves}: BACK PANEL (Stability board)
- Dimensions: ${shelfWidth}cm × 1.5cm × ${shelfHeight}cm
- Installation: Rabbeted into rear edges of sides
- Purpose: Structural rigidity and anti-racking

COMPONENT ${4+numShelves}: BASE PLATFORM (Foundation)
- Dimensions: ${shelfWidth}cm × ${shelfDepth+2}cm × 8cm
- Design: Toe-kick recess 5cm deep × 3cm high
- Purpose: Stability and floor protection`;

      case 'cabinet':
        const cabWidth = width !== 'auto' ? width : 90;
        const cabDepth = depth !== 'auto' ? depth : 40;
        const cabHeight = height !== 'auto' ? height : 85;
        return `
🗃️ CABINET STRUCTURAL BREAKDOWN (10+ Components Required):

COMPONENT 1-6: MAIN CARCASE (Box structure)
- Left side: ${cabDepth}cm × 2cm × ${cabHeight-8}cm
- Right side: ${cabDepth}cm × 2cm × ${cabHeight-8}cm  
- Top: ${cabWidth-4}cm × ${cabDepth}cm × 2cm
- Bottom: ${cabWidth-4}cm × ${cabDepth}cm × 2cm
- Back: ${cabWidth}cm × 1cm × ${cabHeight-8}cm
- Base platform: ${cabWidth}cm × ${cabDepth}cm × 8cm with toe-kick

COMPONENT 7-8: DOOR PANELS (2 doors)
- Dimensions: ${(cabWidth-3)/2}cm × ${cabHeight-10}cm × 2cm each
- Style: Raised panel with 1cm frame and recessed center
- Clearance: 2mm gap around all edges
- Overlay: 1cm beyond opening on all sides

COMPONENT 9-10: DOOR HARDWARE (Hinges and handles)
- Hinges: 3 per door, mortised mounting (separate geometry)
- Handles: Cylindrical bar handles 12cm long × 1.5cm diameter
- Position: Vertical center, 5cm from door edge

COMPONENT 11-12: INTERNAL STORAGE (Adjustable shelves)
- Fixed shelf: ${cabWidth-6}cm × ${cabDepth-2}cm × 2cm (middle)
- Adjustable shelf: Same dimensions with pin hole system
- Purpose: Maximize storage efficiency and organization`;

      default:
        return `
🔧 GENERAL FURNITURE STRUCTURAL BREAKDOWN (6+ Components Required):

COMPONENT 1-2: PRIMARY FRAME (Main structure)
- Load-bearing frame elements with proper joints
- Material thickness: 4-8cm for structural integrity
- Connections: Mortise-tenon or dowel joinery

COMPONENT 3-4: SURFACE PANELS (Functional surfaces)
- Working surfaces with realistic thickness (3-5cm)
- Edge treatments and corner rounding
- Surface details for texture and function

COMPONENT 5-6: SUPPORT ELEMENTS (Stability features)
- Cross-bracing, stretchers, or base platforms
- Hardware mounting points and connection details
- Anti-tip features and floor contact points

ADDITIONAL DETAILS:
- Joint hardware and fastener geometry
- Surface texturing through geometric complexity
- Realistic proportions for human interaction`;
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