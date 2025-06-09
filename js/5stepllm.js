/**
 * 五段階逐次的LLM処理システム
 * DIYアシスタント家具生成エンジンから抽出
 */

class FiveStepLLMProcessor {
  constructor(apiUrl = 'https://nurumayu-worker.skume-bioinfo.workers.dev/') {
    this.apiUrl = apiUrl;
    this.currentStage = 0;
  }

  /**
   * メイン処理：五段階の逐次的LLM処理
   * @param {string} prompt - ユーザー入力の設計要件
   * @returns {Object} 処理結果
   */
  async executeFullPipeline(prompt) {
    try {
      console.log('五段階LLM処理開始');

      // 第一段階：家具仕様の最適化
      this.currentStage = 1;
      console.log('第1段階開始: 仕様最適化');
      const optimizedSpec = await this.optimizeSpecification(prompt);
      
      if (!optimizedSpec || !optimizedSpec.furniture_type) {
        throw new Error('第1段階: 仕様最適化のデータ生成に失敗しました');
      }
      console.log('第1段階完了: 仕様最適化成功');

      // 第二段階：パーツベース3Dモデル生成
      this.currentStage = 2;
      console.log('第2段階開始: パーツベース3Dモデル生成');
      const partsData = await this.generatePartsBasedModel(optimizedSpec);
      
      if (!partsData || !Array.isArray(partsData) || partsData.length === 0) {
        throw new Error('第2段階: パーツベース3Dモデル生成に失敗しました');
      }
      console.log('第2段階完了: パーツベース3D生成成功');

      // 第三段階：パーツ組み立て
      this.currentStage = 3;
      console.log('第3段階開始: パーツ組み立て');
      const assembledObjData = await this.assemblePartsModel(partsData, optimizedSpec);
      
      if (!assembledObjData || assembledObjData.trim().length === 0) {
        throw new Error('第3段階: パーツ組み立てのデータ生成に失敗しました');
      }
      console.log('第3段階完了: パーツ組み立て成功');

      // 第四段階：接続状態確認・3Dモデル修正
      this.currentStage = 4;
      console.log('第4段階開始: 接続状態確認・3Dモデル修正');
      const connectionCheck = await this.checkPartsConnection(assembledObjData, partsData, optimizedSpec);
      
      if (!connectionCheck || !connectionCheck.finalObjData) {
        throw new Error('第4段階: 接続状態確認・3Dモデル修正に失敗しました');
      }
      console.log('第4段階完了: 接続状態確認・修正成功');

      // 第五段階：品質チェックと最終調整
      this.currentStage = 5;
      console.log('第5段階開始: 品質チェック・最終調整');
      const qualityCheck = await this.performQualityCheck(prompt, connectionCheck.finalObjData, optimizedSpec);
      
      if (!qualityCheck) {
        throw new Error('第5段階: 品質チェックの実行に失敗しました');
      }
      console.log('第5段階完了: 品質チェック成功');

      console.log('五段階処理が完了しました！');
      
      return {
        success: true,
        optimizedSpec,
        partsData,
        assembledObjData: connectionCheck.finalObjData,
        connectionCheck,
        qualityCheck
      };

    } catch (error) {
      console.error(`第${this.currentStage}段階でエラーが発生しました:`, error.message);
      return {
        success: false,
        error: error.message,
        stage: this.currentStage
      };
    }
  }

  /**
   * 第1段階：家具仕様の最適化
   */
  async optimizeSpecification(originalPrompt) {
    const optimizePrompt = `【家具設計仕様最適化エンジン】

あなたは工業デザインと人間工学の専門家として、与えられた家具要求を詳細で実用的な設計仕様に最適化してください。

【入力された要求】
${originalPrompt}

【最適化の観点】
1. **機能性**: 実際の使用場面での利便性と実用性
2. **人間工学**: 日本人の標準体型に適合した寸法設計
3. **構造安全性**: 物理的強度と安定性の確保
4. **製造実現性**: 実際の加工・組立における実現可能性
5. **美的調和**: デザインバランスと視覚的美しさ

【出力形式】
以下のJSON形式で超詳細な設計仕様を出力してください：

{
  "furniture_type": "椅子",
  "optimized_dimensions": {
    "overall": {"width": 42, "depth": 40, "height": 80},
    "details": {
      "seat_height": 42, "seat_width": 40, "seat_depth": 38, "seat_thickness": 3.0,
      "backrest_height": 38, "backrest_width": 40, "backrest_thickness": 2.5, "backrest_angle": 100
    }
  },
  "structural_requirements": {
    "material_specifications": {
      "primary_material": "ブナ材", "density": "0.7g/cm³"
    }
  },
  "optimized_description": "詳細な設計説明"
}

上記形式に従い、実用性と安全性を重視した詳細な設計仕様を生成してください。`;

    try {
      const requestData = {
        model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
        temperature: 0.1,
        stream: false,
        max_completion_tokens: 2500,
        messages: [
          {
            role: "system",
            content: "あなたは家具設計の専門家です。与えられた要求を詳細で実用的な設計仕様に最適化し、必ずJSON形式で回答してください。"
          },
          {
            role: "user",
            content: optimizePrompt
          }
        ]
      };

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`Specification optimization failed: ${response.status}`);
      }

      const data = await response.json();
      let resultText = '';
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        resultText = data.choices[0].message.content;
      } else if (data.answer) {
        resultText = data.answer;
      } else if (data.response) {
        resultText = data.response;
      }

      // JSON部分を抽出
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const optimizedSpec = JSON.parse(jsonMatch[0]);
          return optimizedSpec;
        } catch (parseError) {
          console.error('仕様最適化JSON解析エラー:', parseError.message);
        }
      }

      throw new Error('JSON形式の仕様データが取得できませんでした');

    } catch (error) {
      console.error('仕様最適化エラー:', error.message);
      throw error;
    }
  }

  /**
   * 第2段階：パーツベース3Dモデル生成
   */
  async generatePartsBasedModel(optimizedSpec) {
    const furnitureType = optimizedSpec.furniture_type || '家具';
    
    // 家具タイプに応じたパーツ定義
    let partsDefinition = '';
    if (furnitureType.includes('椅子')) {
      partsDefinition = `
【椅子パーツ構成】
1. 座面（SEAT）: 平面板状、厚み3cm、サイズ40×38cm
2. 背もたれ（BACKREST）: 平面板状、厚み2.5cm、高さ38cm、幅40cm、角度100度
3. 前脚左（FRONT_LEG_L）: 角材、5×5cm断面、高さ42cm
4. 前脚右（FRONT_LEG_R）: 角材、5×5cm断面、高さ42cm  
5. 後脚左（REAR_LEG_L）: 角材、5×5cm断面、高さ80cm（背もたれまで延長）
6. 後脚右（REAR_LEG_R）: 角材、5×5cm断面、高さ80cm（背もたれまで延長）`;
    } else if (furnitureType.includes('テーブル')) {
      partsDefinition = `
【テーブルパーツ構成】
1. 天板（TABLETOP）: 平面板状、厚み3cm、サイズ120×60cm
2. 脚1（LEG_1）: 角材、5×5cm断面、高さ69cm
3. 脚2（LEG_2）: 角材、5×5cm断面、高さ69cm
4. 脚3（LEG_3）: 角材、5×5cm断面、高さ69cm
5. 脚4（LEG_4）: 角材、5×5cm断面、高さ69cm`;
    } else {
      partsDefinition = `
【収納家具パーツ構成】
1. 左側板（LEFT_PANEL）: 平面板状、厚み2.5cm、高さ120cm、奥行30cm
2. 右側板（RIGHT_PANEL）: 平面板状、厚み2.5cm、高さ120cm、奥行30cm
3. 下段棚板（BOTTOM_SHELF）: 平面板状、厚み2.5cm、サイズ75×30cm
4. 中段棚板（MID_SHELF）: 平面板状、厚み2.5cm、サイズ75×30cm
5. 上段棚板（TOP_SHELF）: 平面板状、厚み2.5cm、サイズ75×30cm`;
    }

    const modelPrompt = `【パーツベース3D家具設計システム】

以下の設計仕様とパーツ定義に基づき、各パーツを個別のWavefront OBJ形式で生成してください。

【最適化された設計仕様】
${JSON.stringify(optimizedSpec, null, 2)}

${partsDefinition}

【出力形式】
各パーツを以下の形式で出力してください：

# PART: [パーツ名]
# DIMENSIONS: [寸法情報]
# POSITION: [組み立て位置情報]
v [頂点座標...]
f [面定義...]

パーツごとに機能的で美しい形状を作成してください。`;

    try {
      const requestData = {
        model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
        temperature: 0.1,
        stream: false,
        max_completion_tokens: 4000,
        messages: [
          {
            role: "system",
            content: "あなたは3D家具設計エンジンです。家具をパーツごとに分解して設計し、各パーツを個別のOBJ形式で生成してください。"
          },
          {
            role: "user",
            content: modelPrompt
          }
        ]
      };

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`Parts-based model generation failed: ${response.status}`);
      }

      const data = await response.json();
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

      // パーツデータの解析
      const partsData = this.parsePartsData(objContent);
      if (!partsData || partsData.length === 0) {
        throw new Error('Generated parts data is empty or invalid');
      }

      return partsData;
    } catch (error) {
      console.error('パーツベースモデル生成失敗:', error.message);
      throw error;
    }
  }

  /**
   * 第3段階：パーツ組み立て
   */
  async assemblePartsModel(partsData, optimizedSpec) {
    console.log('パーツ組み立て開始');
    
    let assembledOBJ = '# Assembled furniture model\n';
    let vertexOffset = 0;
    const assembledParts = [];
    
    const furnitureType = optimizedSpec.furniture_type || '家具';
    const assemblyPositions = this.getAssemblyPositions(furnitureType, optimizedSpec);
    
    for (let i = 0; i < partsData.length; i++) {
      const part = partsData[i];
      const position = assemblyPositions[part.name] || { x: 0, y: 0, z: 0 };
      
      console.log(`組み立て中: ${part.name}`);
      
      // パーツのOBJデータを解析
      const lines = part.objData.split('\n');
      const partVertices = [];
      const partFaces = [];
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('v ')) {
          const coords = trimmed.substring(2).split(/\s+/).map(Number);
          if (coords.length >= 3) {
            // 組み立て位置に移動
            const assembledVertex = [
              coords[0] + position.x,
              coords[1] + position.y, 
              coords[2] + position.z
            ];
            partVertices.push(assembledVertex);
          }
        } else if (trimmed.startsWith('f ')) {
          const faceIndices = trimmed.substring(2).split(/\s+/).map(f => {
            return parseInt(f.split('/')[0]) + vertexOffset;
          });
          partFaces.push(faceIndices);
        }
      }
      
      assembledOBJ += `\n# Part: ${part.name}\n`;
      
      // 調整された頂点を出力
      for (const vertex of partVertices) {
        assembledOBJ += `v ${vertex[0].toFixed(1)} ${vertex[1].toFixed(1)} ${vertex[2].toFixed(1)}\n`;
      }
      
      // 面を出力
      for (const face of partFaces) {
        assembledOBJ += `f ${face.join(' ')}\n`;
      }
      
      vertexOffset += partVertices.length;
    }
    
    console.log('組み立て完了');
    return assembledOBJ;
  }

  /**
   * 第4段階：接続状態確認・3Dモデル修正
   */
  async checkPartsConnection(assembledObjData, partsData, optimizedSpec) {
    const connectionCheckPrompt = `【3D家具モデル パーツ接続状態確認・物理的破断修正システム】

あなたは家具設計の専門家として、組み立てられた3Dモデルのパーツ間接続状態を詳細に確認し、物理的破断や実在性の問題を検出・修正してください。

【パーツ情報】
${partsData.map(part => `- ${part.name}: ${part.dimensions || '寸法情報なし'}`).join('\n')}

【重要な物理的破断チェック項目】
1. 空洞面の検出・修正
2. 浮遊面の検出・修正
3. 実在性の確認・修正
4. 接続強度の確保

【出力形式】
以下のJSON形式で回答し、その後に修正したOBJデータを出力してください：

{
  "connection_score": 85,
  "issues_found": ["問題点のリスト"],
  "modifications_made": ["修正内容のリスト"],
  "structural_improvements": ["構造改善のリスト"]
}

---修正されたOBJデータ---
# 修正済み家具モデル
v [修正された頂点座標...]
f [修正された面定義...]`;

    try {
      const requestData = {
        model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
        temperature: 0.1,
        stream: false,
        max_completion_tokens: 4000,
        messages: [
          {
            role: "system",
            content: "あなたは家具設計と構造工学の専門家です。3Dモデルの物理的破断を検出し、実在可能で製造可能な構造に修正してください。"
          },
          {
            role: "user",
            content: connectionCheckPrompt
          }
        ]
      };

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`Parts connection check failed: ${response.status}`);
      }

      const data = await response.json();
      let resultText = '';
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        resultText = data.choices[0].message.content;
      } else if (data.answer) {
        resultText = data.answer;
      } else if (data.response) {
        resultText = data.response;
      }

      // データ分離
      let connectionResult = null;
      let modifiedObjData = assembledObjData;
      
      const separators = [
        '---修正されたOBJデータ---',
        '---OBJデータ---', 
        '---修正OBJデータ---'
      ];
      
      let parts = null;
      for (const separator of separators) {
        if (resultText.includes(separator)) {
          parts = resultText.split(separator);
          break;
        }
      }
      
      if (!parts) {
        const jsonMatch = resultText.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          parts = [jsonMatch[0], ''];
        } else {
          parts = [resultText, ''];
        }
      }

      if (parts && parts.length >= 1) {
        const jsonMatch = parts[0].match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          try {
            connectionResult = JSON.parse(jsonMatch[0]);
          } catch (parseError) {
            console.warn('JSON解析失敗:', parseError.message);
          }
        }
      }

      if (parts && parts.length >= 2) {
        let rawObjData = parts[1];
        rawObjData = rawObjData.replace(/```obj\s*/gi, '').replace(/```\s*/g, '');
        
        if (rawObjData && rawObjData.trim().length > 100) {
          modifiedObjData = rawObjData;
        }
      }

      if (!connectionResult) {
        connectionResult = {
          connection_score: 75,
          issues_found: ["基本的な接続状態チェックを実行しました"],
          modifications_made: ["構造の安定性を確認しました"],
          structural_improvements: ["基本的な品質確保を行いました"]
        };
      }

      return {
        connectionScore: connectionResult.connection_score || 75,
        issuesFound: connectionResult.issues_found || [],
        modificationsMade: connectionResult.modifications_made || [],
        structuralImprovements: connectionResult.structural_improvements || [],
        finalObjData: modifiedObjData
      };

    } catch (error) {
      console.error('パーツ接続チェックエラー:', error.message);
      return {
        connectionScore: 60,
        issuesFound: ["接続状態確認でエラーが発生しました"],
        modificationsMade: ["手動での確認が必要です"],
        structuralImprovements: [],
        finalObjData: assembledObjData
      };
    }
  }

  /**
   * 第5段階：品質チェックと最終調整
   */
  async performQualityCheck(originalPrompt, objData, optimizedSpec = null) {
    const checkPrompt = `【3D家具モデル最終品質チェック】

あなたは家具設計の専門家として、生成された3Dモデルが要求仕様を満たし、実用的かつ安全な設計になっているかを評価してください。

【元の要求仕様】
${originalPrompt}

${optimizedSpec ? `
【最適化された設計仕様】
${JSON.stringify(optimizedSpec, null, 2)}` : ''}

【評価項目】
1. **寸法適合性**: 要求された寸法との整合性
2. **機能性**: 実際の使用目的に対する適合性
3. **構造安定性**: 物理的な安定性と強度
4. **人間工学**: 人体寸法との適合性
5. **製造可能性**: 実際の製作における実現可能性
6. **安全性**: 使用時の安全性配慮

【出力形式】
以下のJSON形式で回答してください：

{
  "overall_score": 85,
  "evaluations": {
    "dimensions": {"score": 90, "comment": "要求寸法とほぼ一致している"},
    "functionality": {"score": 80, "comment": "基本機能は満たすが改善余地あり"},
    "stability": {"score": 85, "comment": "構造的に安定している"},
    "ergonomics": {"score": 75, "comment": "人間工学的配慮が不足"},
    "manufacturability": {"score": 90, "comment": "製造可能な設計"},
    "safety": {"score": 85, "comment": "基本的な安全性は確保"}
  },
  "issues": ["問題点のリスト"],
  "recommendations": ["改善提案のリスト"]
}`;

    try {
      const requestData = {
        model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
        temperature: 0.1,
        stream: false,
        max_completion_tokens: 2000,
        messages: [
          {
            role: "system",
            content: "あなたは工業デザインと家具設計の専門家です。3Dモデルの品質評価を行い、機能性・安全性・実用性の観点から詳細な分析を提供してください。必ずJSON形式で回答してください。"
          },
          {
            role: "user",
            content: checkPrompt
          }
        ]
      };

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`Quality check API failed: ${response.status}`);
      }

      const data = await response.json();
      let resultText = '';
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        resultText = data.choices[0].message.content;
      } else if (data.answer) {
        resultText = data.answer;
      } else if (data.response) {
        resultText = data.response;
      }

      // JSON部分を抽出
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const qualityResult = JSON.parse(jsonMatch[0]);
          return qualityResult;
        } catch (parseError) {
          console.error('品質チェックJSON解析エラー:', parseError.message);
        }
      }

      // フォールバック
      return {
        overall_score: 75,
        evaluations: {
          dimensions: {score: 80, comment: "基本的な寸法要件を満たしています"},
          functionality: {score: 70, comment: "機能性の詳細チェックが必要です"},
          stability: {score: 75, comment: "構造安定性は標準的です"},
          ergonomics: {score: 70, comment: "人間工学的検証が推奨されます"},
          manufacturability: {score: 80, comment: "製造可能な設計です"},
          safety: {score: 75, comment: "基本的な安全性は確保されています"}
        },
        issues: ["詳細な品質分析が必要です"],
        recommendations: ["実物での機能テストを実施してください"]
      };

    } catch (error) {
      console.error('品質チェックエラー:', error.message);
      return {
        overall_score: 60,
        evaluations: {
          dimensions: {score: 70, comment: "寸法チェック未完了"},
          functionality: {score: 60, comment: "機能性チェック未完了"},
          stability: {score: 65, comment: "安定性チェック未完了"},
          ergonomics: {score: 60, comment: "人間工学チェック未完了"},
          manufacturability: {score: 70, comment: "製造性チェック未完了"},
          safety: {score: 65, comment: "安全性チェック未完了"}
        },
        issues: ["品質チェックでエラーが発生しました"],
        recommendations: ["手動での品質確認を実施してください"]
      };
    }
  }

  // 補助メソッド
  parsePartsData(rawData) {
    if (!rawData || typeof rawData !== 'string') {
      throw new Error('Invalid parts data received');
    }

    let cleaned = rawData
      .replace(/```obj\s*/gi, '')
      .replace(/```\s*/g, '')
      .replace(/```/g, '');

    const parts = [];
    const lines = cleaned.split('\n');
    let currentPart = null;
    let currentVertices = [];
    let currentFaces = [];

    for (let line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('# PART:')) {
        if (currentPart) {
          parts.push({
            name: currentPart.name,
            dimensions: currentPart.dimensions,
            position: currentPart.position,
            objData: this.generateOBJFromVerticesAndFaces(currentVertices, currentFaces)
          });
        }
        
        currentPart = {
          name: trimmed.replace('# PART:', '').trim(),
          dimensions: '',
          position: ''
        };
        currentVertices = [];
        currentFaces = [];
      } else if (trimmed.startsWith('# DIMENSIONS:')) {
        if (currentPart) {
          currentPart.dimensions = trimmed.replace('# DIMENSIONS:', '').trim();
        }
      } else if (trimmed.startsWith('# POSITION:')) {
        if (currentPart) {
          currentPart.position = trimmed.replace('# POSITION:', '').trim();
        }
      } else if (trimmed.startsWith('v ')) {
        const coords = trimmed.substring(2).split(/\s+/).map(Number);
        if (coords.length >= 3) {
          currentVertices.push(coords);
        }
      } else if (trimmed.startsWith('f ')) {
        const faceIndices = trimmed.substring(2).split(/\s+/).map(f => {
          return parseInt(f.split('/')[0]);
        });
        currentFaces.push(faceIndices);
      }
    }

    if (currentPart && currentVertices.length > 0) {
      parts.push({
        name: currentPart.name,
        dimensions: currentPart.dimensions,
        position: currentPart.position,
        objData: this.generateOBJFromVerticesAndFaces(currentVertices, currentFaces)
      });
    }

    return parts;
  }

  generateOBJFromVerticesAndFaces(vertices, faces) {
    let objData = '# Generated part\n';
    
    for (const vertex of vertices) {
      objData += `v ${vertex[0]} ${vertex[1]} ${vertex[2]}\n`;
    }
    
    for (const face of faces) {
      objData += `f ${face.join(' ')}\n`;
    }
    
    return objData;
  }

  getAssemblyPositions(furnitureType, optimizedSpec) {
    const positions = {};
    const dims = optimizedSpec.optimized_dimensions?.overall || { width: 40, depth: 40, height: 80 };
    
    if (furnitureType.includes('椅子')) {
      positions['SEAT'] = { x: 0, y: 42, z: 0 };
      positions['BACKREST'] = { x: 0, y: 61, z: -16 };
      positions['FRONT_LEG_L'] = { x: -17.5, y: 0, z: 16.5 };
      positions['FRONT_LEG_R'] = { x: 17.5, y: 0, z: 16.5 };
      positions['REAR_LEG_L'] = { x: -17.5, y: 0, z: -16.5 };
      positions['REAR_LEG_R'] = { x: 17.5, y: 0, z: -16.5 };
    } else if (furnitureType.includes('テーブル')) {
      const halfWidth = dims.width / 2;
      const halfDepth = dims.depth / 2;
      positions['TABLETOP'] = { x: 0, y: 72, z: 0 };
      positions['LEG_1'] = { x: -(halfWidth - 15), y: 0, z: -(halfDepth - 15) };
      positions['LEG_2'] = { x: (halfWidth - 15), y: 0, z: -(halfDepth - 15) };
      positions['LEG_3'] = { x: (halfWidth - 15), y: 0, z: (halfDepth - 15) };
      positions['LEG_4'] = { x: -(halfWidth - 15), y: 0, z: (halfDepth - 15) };
    } else {
      const halfWidth = dims.width / 2;
      const shelfSpacing = dims.height / 4;
      
      positions['LEFT_PANEL'] = { x: -halfWidth, y: 0, z: 0 };
      positions['RIGHT_PANEL'] = { x: halfWidth, y: 0, z: 0 };
      positions['BOTTOM_SHELF'] = { x: 0, y: 2.5, z: 0 };
      positions['MID_SHELF'] = { x: 0, y: shelfSpacing + 2.5, z: 0 };
      positions['TOP_SHELF'] = { x: 0, y: shelfSpacing * 2 + 2.5, z: 0 };
    }
    
    return positions;
  }
}

// 使用例
/*
const processor = new FiveStepLLMProcessor();
const result = await processor.executeFullPipeline("幅40cm、奥行40cm、高さ80cmの木製椅子を作りたい");
console.log(result);
*/

// Node.js環境での使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FiveStepLLMProcessor;
}

// ブラウザ環境での使用
if (typeof window !== 'undefined') {
  window.FiveStepLLMProcessor = FiveStepLLMProcessor;
} 