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

  // ========== LLM API呼び出し ==========
  async callLLMAPI(prompt) {
    // 第1段階の結果をそのまま使用（最適化処理は削除）
    const inputPrompt = prompt;

    const requestData = {
      model: this.modelName,
      temperature: 0.1,
      stream: false,
      max_completion_tokens: 3000,
      messages: [
        {
          role: "system",
          content: this.getSystemPrompt()
        },
        {
          role: "user",
          content: inputPrompt
        }
      ]
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒タイムアウト

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
        const errorText = await response.text();
        throw new Error(`API request failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      this.assistant.log('debug', 'LLM API Response受信', { 
        hasChoices: !!data.choices,
        hasAnswer: !!data.answer,
        hasResponse: !!data.response
      });
      
      let objContent = null;
      if (data.choices && data.choices[0] && data.choices[0].message) {
        objContent = data.choices[0].message.content;
      } else if (data.answer) {
        objContent = data.answer;
      } else if (data.response) {
        objContent = data.response;
      } else {
        throw new Error('Invalid API response format - no content found');
      }

      const cleanedOBJ = this.cleanOBJData(objContent);
      if (!cleanedOBJ || cleanedOBJ.trim().length === 0) {
        throw new Error('Generated OBJ data is empty or invalid');
      }

      return cleanedOBJ;
    } catch (error) {
      this.assistant.log('error', 'LLM API呼び出し失敗', { error: error.message });
      if (error.name === 'AbortError') {
        throw new Error('API request timed out. Please try again.');
      }
      throw new Error(`API呼び出しエラー: ${error.message}`);
    }
  }

  // ========== 第2段階：OBJ形式ファイル出力特化システムプロンプト ==========
  getSystemPrompt() {
    return `あなたはOBJ形式3Dファイル生成の最高専門家です。OBJ形式ファイル作成における完璧な指南書として、以下の要件に基づいて最高品質のOBJファイルを生成してください。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【OBJ形式ファイル構造の完全マスタリング】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 OBJ形式の基本原則
• 各行は必ず改行で終了
• コメント行は '#' で開始
• 座標系は Y-UP（Y軸が上方向）
• 単位はセンチメートル（cm）
• 頂点インデックスは1から開始（0ベースではない）

📐 頂点定義（v行）の精密な記述
• 形式: v [X座標] [Y座標] [Z座標]
• 座標値は小数点以下2桁の精度（例: v 12.50 25.00 -5.75）
• 頂点は論理的な順序で配置（部品別・層別）
• 重複頂点は完全に排除
• 各頂点は実際の物理的意味を持つ位置に配置

🔺 面定義（f行）の完璧な記述
• 形式: f [v1] [v2] [v3] または f [v1] [v2] [v3] [v4]
• 三角面（3頂点）または四角面（4頂点）で統一
• 頂点の順序は右手の法則に従う（反時計回り）
• 各面は必ず閉じた形状を構成
• 面の向きは外向きに統一

🏗️ 家具構造のOBJ表現方法
• 各部品を個別の頂点グループとして定義
• 接続部分は共通頂点で自然に結合
• 厚みのある部品は適切な内側・外側面を定義
• 曲面は十分な分割数で滑らかに表現
• エッジは適切な面取りで安全性を確保

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【品質基準（柔軟な適用）】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 ジオメトリ品質
• 頂点数: 10-1000点（家具の複雑さに応じて柔軟に調整）
• 面数: 10-1000面（品質と効率の最適なバランスを追求）
• 可能な限り閉じた形状を目指す
• 基本的な構造的整合性を保持

🎯 構造的品質
• 主要な面は適切に接続
• 重要なエッジの連続性を維持
• 明らかなエラーや破綻を回避
• 全体的に安定した構造

🎯 実用品質
• 基本的な3D表示に対応
• 一般的な3Dソフトウェアで読み込み可能
• 実際の家具としての認識可能性
• 美観と機能のバランス重視

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【OBJ出力フォーマット（厳格遵守）】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# [家具種別] - 寸法: [幅]×[奥行]×[高さ]cm
# 第1段階分析結果に基づく高精度3Dモデル
# 生成日時: [自動]

# 頂点データ（座標精度：小数点以下2桁）
v 10.00 0.00 5.00
v 15.25 12.50 -2.75
...

# 面データ（反時計回りの頂点順序）
f 1 2 3
f 1 3 4
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【基本方針】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ OBJデータのみを出力（説明文・コメント等は含めない）
✅ 第1段階の分析結果を基に、創造的解釈を加えて3D化
✅ 基本的なOBJ構文に準拠したフォーマット
✅ 実用的で魅力的な家具モデルとしての品質

【創造的解釈の推奨】
• 第1段階の内容を基にしつつ、3D化に適した形状調整を歓迎
• 技術的制約を考慮した合理的な簡略化や最適化
• 美観向上のための創造的なディテール追加
• 実用性を重視した構造的改善

提供された第1段階分析結果を参考に、美しく実用的なOBJファイルを創造的に生成してください。`;
  }

  // ========== プロンプト最適化 ==========
  optimizePrompt(userPrompt, width, depth, height) {
    // 家具種別の判定
    let furnitureType = '椅子'; // デフォルト
    let specialRequirements = '';
    
    if (userPrompt.includes('椅子') || userPrompt.includes('chair') || userPrompt.includes('チェア')) {
      furnitureType = '椅子';
      specialRequirements = `
【椅子の詳細設計要件】
🪑 座面：42cm高、軽い凹み形状、快適性のための曲面
🪑 背もたれ：人体に沿った3D湾曲、腰部サポート、後傾5-15度
🪑 脚部：テーパー形状（上部太→下部細）、美しい曲線、安定した接地面
🪑 支持構造：座面と脚部の有機的接続、補強リブの立体的配置
🪑 表面処理：座面の軽い凹凸、背もたれの曲面、エッジの面取り
🪑 全体造形：有機的で美しいプロポーション、視覚的軽快感`;
    } else if (userPrompt.includes('テーブル') || userPrompt.includes('table') || userPrompt.includes('机')) {
      furnitureType = 'テーブル';
      specialRequirements = `
【テーブルの詳細設計要件】
🪞 天板：72cm高、3cm厚、エッジの美しい面取り、軽い反り表現
🪞 脚部：上部から下部へのテーパー形状、装飾的な断面変化
🪞 幕板：構造美を活かした立体的な補強、軽快感のある切り欠き
🪞 接合部：天板と脚部の自然な接続、有機的な移行形状
🪞 表面処理：天板表面の微細な凹凸、使用感のある自然な表情
🪞 全体造形：安定感と軽快感を両立した美しいプロポーション`;
    } else if (userPrompt.includes('本棚') || userPrompt.includes('棚') || userPrompt.includes('shelf')) {
      furnitureType = '収納家具';
      specialRequirements = `
【収納家具の詳細設計要件】
📚 筐体：側板・背板の立体的な厚み表現、装飾的なパネル構造
📚 棚板：2.5cm厚、軽い反り、棚受けの立体的な造形
📚 扉・引き出し：パネルの凹凸、取っ手の立体形状、開閉機構の表現
📚 台座・脚部：安定性と美観を両立、床との美しい接地面
📚 内部構造：機能的な仕切り、棚受けの詳細な立体形状
📚 装飾要素：モールディング、面取り、上品な装飾的ライン`;
    }

    // 寸法指定の処理
    let dimensionText = '';
    if (width !== 'auto' || depth !== 'auto' || height !== 'auto') {
      dimensionText = `
【指定寸法】
- 幅：${width}cm
- 奥行：${depth}cm  
- 高さ：${height}cm`;
    }

    const optimizedPrompt = `【${furnitureType}の詳細3Dモデル生成】

【ユーザー要求】
${userPrompt}
${dimensionText}
${specialRequirements}

【立体的デザイン要件】
✅ 単純なボックスではなく、立体的で美しい形状
✅ 曲線・傾斜・面取りを含む洗練されたデザイン
✅ 人間工学的に優れた機能性
✅ 視覚的に魅力的な造形美

【詳細造形指示】
🎨 表面：平坦ではなく、適度な凹凸・段差・曲面を持つ
🎨 エッジ：鋭角ではなく、適度に面取りされた滑らかな縁
🎨 脚部：直線的ではなく、テーパーや曲線を含む美しい形状
🎨 接合部：機械的ではなく、自然で有機的な接続構造
🎨 装飾：シンプルながら上品な装飾的要素を含む

【構造的詳細要件】
- 座面・天板：使用感を考慮した軽い湾曲・凹み
- 背もたれ：人体に沿った3D曲面
- 脚部：安定性と美観を両立したテーパー形状
- 支持構造：力学的に美しい補強・幕板構造
- 厚み表現：材料の実際の厚みを立体的に表現

【品質要件】
- 頂点数：200-500点（詳細度優先）
- 面数：150-400面（立体性重視）
- 曲線分割：滑らかな曲面のための適切な分割数
- 造形密度：美しさと機能性を両立

【禁止事項】
❌ 単純な直方体の組み合わせ
❌ 平坦で単調な表面
❌ 直線的で無機質な形状
❌ 装飾性のない機械的なデザイン

【立体性実現のための具体的手法】
🎯 頂点配置：直線的な配置を避け、曲線・テーパー・凹凸を表現
🎯 面構成：複数の高さレベルで立体感を演出
🎯 エッジ処理：鋭角を避け、面取り・丸みを追加
🎯 機能的形状：人間工学・使用感を考慮した3D曲面

【出力指示】
上記要件に基づき、美しく立体的で詳細な${furnitureType}のOBJモデルを生成してください。
システムプロンプトの立体的椅子サンプルのような、曲線・テーパー・面取り・装飾を含む洗練された3D形状として設計してください。

OBJデータのみを出力し、説明文やマークダウンは含めないでください。`;

    return optimizedPrompt;
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

    if (!foundValidOBJContent) {
      throw new Error('Generated content does not contain valid OBJ data (no vertices or faces found)');
    }

    const result = objLines.join('\n').trim();
    this.assistant.log('debug', 'OBJデータクリーニング完了', { 
      originalLines: lines.length,
      cleanedLines: objLines.length,
      hasValidContent: foundValidOBJContent
    });
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

  // ========== 品質要件管理 ==========
  getFurnitureQualityRequirements(furnitureType, width, depth, height) {
    // 家具種別に応じた3Dモデル品質要件の設定
    const baseRequirements = {
      '椅子': {
        model_precision: {
          purpose: "製造用高精度モデル",
          minimum_vertices: 120,
          target_vertices: 200,
          maximum_vertices: 500,
          minimum_faces: 80,
          target_faces: 150,
          detail_level: "高精度"
        },
        geometric_accuracy: {
          vertex_density: "曲面部: 2cm間隔、平面部: 5cm間隔",
          edge_smoothness: "曲率半径R1.0mm以上で10分割以上",
          surface_tolerance: "±0.2mm以内",
          connection_precision: "接合部±0.1mm精度"
        },
        functional_details: {
          critical_surfaces: ["座面", "背もたれ接触面", "脚部接合面"],
          high_precision_areas: ["ダボ穴", "ボルト穴", "接合面", "座面エッジ"],
          standard_precision_areas: ["外観面", "非接触面", "脚部側面"]
        },
        quality_rationale: "人体接触部分の快適性と安全性確保のため高精度が必須"
      },
      
      'テーブル': {
        model_precision: {
          purpose: "製造用中高精度モデル", 
          minimum_vertices: 80,
          target_vertices: 150,
          maximum_vertices: 400,
          minimum_faces: 60,
          target_faces: 120,
          detail_level: "中高精度"
        },
        geometric_accuracy: {
          vertex_density: "天板: 3cm間隔、脚部: 4cm間隔",
          edge_smoothness: "エッジR2.0mm以上で8分割以上",
          surface_tolerance: "±0.3mm以内",
          connection_precision: "接合部±0.2mm精度"
        },
        functional_details: {
          critical_surfaces: ["天板上面", "脚部接合面"],
          high_precision_areas: ["天板エッジ", "脚部接合部", "ボルト穴"],
          standard_precision_areas: ["脚部側面", "天板下面"]
        },
        quality_rationale: "平面性と安定性が重要、作業面の精度が使用感に直結"
      },
      
      '収納家具': {
        model_precision: {
          purpose: "組み立て精度重視モデル",
          minimum_vertices: 100,
          target_vertices: 180,
          maximum_vertices: 450,
          minimum_faces: 70,
          target_faces: 140,
          detail_level: "中高精度"
        },
        geometric_accuracy: {
          vertex_density: "棚板: 3cm間隔、側板: 4cm間隔",
          edge_smoothness: "内部エッジR1.5mm以上で6分割以上",
          surface_tolerance: "±0.25mm以内",
          connection_precision: "組み立て部±0.15mm精度"
        },
        functional_details: {
          critical_surfaces: ["棚板上面", "側板内面", "背板接合面"],
          high_precision_areas: ["棚受け部", "ダボ穴", "扉蝶番部"],
          standard_precision_areas: ["外観面", "背板"]
        },
        quality_rationale: "多数のパーツ組み合わせのため寸法精度が組み立て性に影響"
      }
    };
    
    let requirements = baseRequirements[furnitureType] || baseRequirements['椅子'];
    
    // サイズに応じた調整
    const totalVolume = parseFloat(width || 40) * parseFloat(depth || 40) * parseFloat(height || 80);
    const sizeFactor = Math.sqrt(totalVolume / 128000); // 基準サイズ40x40x80での正規化
    
    // サイズに応じて頂点数・面数を調整
    requirements.model_precision.target_vertices = Math.round(requirements.model_precision.target_vertices * sizeFactor);
    requirements.model_precision.target_faces = Math.round(requirements.model_precision.target_faces * sizeFactor);
    requirements.model_precision.maximum_vertices = Math.round(requirements.model_precision.maximum_vertices * sizeFactor);
    
    // 最小値は維持（品質担保）
    requirements.model_precision.target_vertices = Math.max(
      requirements.model_precision.minimum_vertices,
      requirements.model_precision.target_vertices
    );
    requirements.model_precision.target_faces = Math.max(
      requirements.model_precision.minimum_faces,
      requirements.model_precision.target_faces
    );
    
    // 複雑度レベルの設定
    if (furnitureType === '椅子') {
      requirements.complexity_factors = {
        "背もたれ曲面": "頂点密度1.5倍",
        "座面くぼみ": "頂点密度1.3倍", 
        "脚部接合": "頂点密度2.0倍",
        "アームレスト": "頂点密度1.4倍"
      };
    } else if (furnitureType === 'テーブル') {
      requirements.complexity_factors = {
        "天板エッジ処理": "頂点密度1.2倍",
        "脚部テーパー": "頂点密度1.3倍",
        "補強材": "頂点密度1.1倍"
      };
    } else if (furnitureType === '収納家具') {
      requirements.complexity_factors = {
        "棚板サポート": "頂点密度1.2倍",
        "扉部分": "頂点密度1.4倍",
        "引き出し": "頂点密度1.3倍"
      };
    }
    
    return requirements;
  }

  // ========== モデル品質検証 ==========
  getModelQualityValidationCriteria(qualityRequirements) {
    // 3Dモデル品質検証基準の生成
    return {
      vertex_count_check: {
        minimum: qualityRequirements.model_precision.minimum_vertices,
        target: qualityRequirements.model_precision.target_vertices,
        maximum: qualityRequirements.model_precision.maximum_vertices,
        tolerance: 0.1 // ±10%の許容範囲
      },
      face_count_check: {
        minimum: qualityRequirements.model_precision.minimum_faces,
        target: qualityRequirements.model_precision.target_faces,
        tolerance: 0.15 // ±15%の許容範囲
      },
      geometry_validation: {
        vertex_face_ratio: { min: 0.6, max: 2.0 }, // 健全な比率
        degenerate_face_max: 5, // 退化面の最大許容数
        isolated_vertex_max: 2, // 孤立頂点の最大許容数
        manifold_requirement: true // 多様体構造必須
      },
      precision_validation: {
        coordinate_precision: 1, // 小数点1桁
        minimum_edge_length: 0.1, // 最小エッジ長さ(cm)
        maximum_edge_length: 50.0, // 最大エッジ長さ(cm)
        surface_normal_consistency: true // 面法線の一貫性
      }
    };
  }
}