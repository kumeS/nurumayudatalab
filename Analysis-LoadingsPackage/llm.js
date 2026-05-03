// =============================================================================
// LLM Statistical Analysis Integration Module
// PCA解析結果のLLMによる多角的解釈システム
// =============================================================================

/**
 * PCA解析結果の統計解釈をLLMで生成
 * @param {Object} analysisResults - PCA解析結果オブジェクト
 * @param {Object} metadata - 実験メタデータ（オプション）
 * @returns {Promise<Object>} 構造化された解釈結果
 */
async function generateStatisticalInterpretation(analysisResults, metadata = null) {
    try {
        console.log('🤖 LLM統計解釈開始:', analysisResults);
        
        const prompt = createStatisticalPrompt(analysisResults, metadata);
        const interpretation = await callStatisticalLLM(prompt);
        
        return parseStatisticalInterpretation(interpretation);
    } catch (error) {
        console.error('❌ LLM統計解釈エラー:', error);
        throw new Error(`統計解釈の生成に失敗しました: ${error.message}`);
    }
}

/**
 * PCA解析用プロンプト作成
 * @param {Object} results - PCA解析結果
 * @param {Object} metadata - メタデータ
 * @returns {string} 構造化されたプロンプト
 */
function createStatisticalPrompt(results, metadata) {
    const prompt = `
あなたは統計解析とPCA（主成分分析）の専門家です。以下のPCA解析結果を多角的に解釈してください。

## PCA解析結果データ
${formatAnalysisData(results)}

${metadata ? `## 実験メタデータ\n${formatMetadata(metadata)}\n` : ''}

## 解釈要求
以下の観点から詳細な解釈を提供してください：

### 1. 統計学的解釈
- 主成分の数値的意味と統計的有意性
- 寄与率の解釈と妥当性評価
- データの次元削減効果
- 統計的前提条件の満足度

### 2. 生物学的解釈（該当する場合）
- 主成分の生物学的含意
- 変数間関係の生物学的意味
- 代謝パスウェイや生物学的プロセスとの関連性

### 3. 実験科学的評価
- 実験デザインと結果の整合性
- データ品質と信頼性評価
- バイアスや交絡要因の可能性

### 4. 実用的提案
- 結果の活用方法
- 追加解析の推奨
- 次の実験ステップの提案
- 結果の限界と注意点

## 出力形式
JSON形式で以下の構造で回答してください：
{
    "statistical_interpretation": {
        "summary": "統計的解釈の要約",
        "principal_components": "主成分の詳細解釈",
        "variance_explained": "寄与率の解釈",
        "statistical_significance": "統計的有意性の評価"
    },
    "biological_interpretation": {
        "biological_meaning": "生物学的意味",
        "pathway_implications": "パスウェイとの関連",
        "functional_insights": "機能的洞察"
    },
    "experimental_evaluation": {
        "design_assessment": "実験デザイン評価",
        "data_quality": "データ品質評価",
        "limitations": "制限事項"
    },
    "practical_recommendations": {
        "next_steps": "次のステップ",
        "additional_analyses": "追加解析の推奨",
        "interpretive_cautions": "解釈上の注意点"
    },
    "confidence_score": 0.85,
    "interpretation_type": "comprehensive_pca_analysis"
}`;

    return prompt;
}

/**
 * 解析データの整形
 * @param {Object} results - PCA解析結果
 * @returns {string} 整形されたデータ文字列
 */
function formatAnalysisData(results) {
    if (!results || !results.pca) {
        return "解析データが不完全です";
    }

    const pca = results.pca;
    let formatted = `
**基本情報:**
- 主成分数: ${pca.results?.summary?.num_components || 'N/A'}
- データ行数: ${pca.results?.summary?.observations || 'N/A'}  
- データ列数: ${pca.results?.summary?.variables || 'N/A'}

**寄与率情報:**`;

    if (pca.statistical_info?.explained_variance_ratio) {
        pca.statistical_info.explained_variance_ratio.forEach((ratio, index) => {
            formatted += `\n- PC${index + 1}: ${(ratio * 100).toFixed(2)}%`;
        });
    }

    if (pca.statistical_info?.cumulative_variance) {
        formatted += `\n\n**累積寄与率:**`;
        pca.statistical_info.cumulative_variance.forEach((cum, index) => {
            formatted += `\n- PC1-${index + 1}: ${(cum * 100).toFixed(2)}%`;
        });
    }

    if (pca.statistical_info?.kaiser_components) {
        formatted += `\n\n**推奨成分数:**
- Kaiser基準: ${pca.statistical_info.kaiser_components}成分
- 80%基準: ${pca.statistical_info.components_80_percent}成分`;
    }

    return formatted;
}

/**
 * メタデータの整形
 * @param {Object} metadata - 実験メタデータ
 * @returns {string} 整形されたメタデータ文字列
 */
function formatMetadata(metadata) {
    if (!metadata) return "メタデータなし";
    
    return `
**実験情報:**
- 研究ID: ${metadata.study_id || 'N/A'}
- 実験タイプ: ${metadata.experiment_type || 'N/A'}
- サンプル種類: ${metadata.sample_type || 'N/A'}
- 測定手法: ${metadata.analytical_method || 'N/A'}
- 実験条件: ${metadata.experimental_conditions || 'N/A'}`;
}

/**
 * 統計特化LLM API呼び出し
 * @param {string} prompt - 解釈プロンプト
 * @returns {Promise<Object>} LLM応答
 */
async function callStatisticalLLM(prompt) {
    const apiUrl = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
    
    const requestData = {
        model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
        temperature: 0.2, // 統計解析では低温度で一貫性重視
        stream: false,
        max_completion_tokens: 3000,
        messages: [
            {
                role: "system",
                content: "あなたは統計学、生物統計学、多変量解析の専門家です。PCA解析結果を科学的に正確かつ実用的に解釈し、JSON形式で構造化された回答を提供してください。"
            },
            {
                role: "user",
                content: prompt
            }
        ]
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error(`LLM API呼び出し失敗: HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (data.choices?.[0]?.message?.content) {
            return data.choices[0].message.content;
        } else if (data.answer) {
            return data.answer;
        } else {
            throw new Error('LLM応答の形式が不正です');
        }
    } catch (error) {
        console.error('🔥 LLM API呼び出しエラー:', error);
        throw new Error(`LLM API通信エラー: ${error.message}`);
    }
}

/**
 * LLM応答の解析と構造化
 * @param {string} response - LLM応答テキスト
 * @returns {Object} 構造化された解釈結果
 */
function parseStatisticalInterpretation(response) {
    try {
        console.log('📊 LLM応答解析開始:', response.substring(0, 200) + '...');
        
        // JSON抽出パターン
        const jsonPatterns = [
            /```json\s*([\s\S]*?)\s*```/,
            /```\s*([\s\S]*?)\s*```/,
            /\{[\s\S]*\}/
        ];
        
        let jsonText = null;
        
        for (const pattern of jsonPatterns) {
            const match = response.match(pattern);
            if (match) {
                jsonText = match[1] || match[0];
                break;
            }
        }
        
        if (!jsonText) {
            // JSON形式でない場合のフォールバック
            return createFallbackInterpretation(response);
        }
        
        // JSONクリーンアップ
        jsonText = cleanJsonText(jsonText);
        
        const parsed = JSON.parse(jsonText);
        
        // 構造検証
        if (!isValidInterpretationStructure(parsed)) {
            console.warn('⚠️ 解釈構造が不完全、フォールバック実行');
            return createFallbackInterpretation(response);
        }
        
        console.log('✅ LLM解釈解析完了');
        return parsed;
        
    } catch (error) {
        console.error('❌ LLM応答解析エラー:', error);
        return createFallbackInterpretation(response);
    }
}

/**
 * JSONテキストのクリーンアップ
 * @param {string} jsonText - 生JSONテキスト
 * @returns {string} クリーンアップされたJSON
 */
function cleanJsonText(jsonText) {
    return jsonText
        .trim()
        .replace(/^[^{]*/, '') // {より前を削除
        .replace(/[^}]*$/, '') // }より後を削除
        .replace(/```.*$/gm, '') // コードブロック削除
        .replace(/\n\s*\/\/.*$/gm, '') // コメント削除
        .trim();
}

/**
 * 解釈構造の妥当性検証
 * @param {Object} interpretation - 解釈オブジェクト
 * @returns {boolean} 構造が妥当かどうか
 */
function isValidInterpretationStructure(interpretation) {
    const requiredFields = [
        'statistical_interpretation',
        'biological_interpretation', 
        'experimental_evaluation',
        'practical_recommendations'
    ];
    
    return requiredFields.every(field => 
        interpretation.hasOwnProperty(field) && 
        typeof interpretation[field] === 'object'
    );
}

/**
 * フォールバック解釈作成
 * @param {string} rawResponse - 生LLM応答
 * @returns {Object} 基本的な解釈構造
 */
function createFallbackInterpretation(rawResponse) {
    return {
        statistical_interpretation: {
            summary: extractSummary(rawResponse),
            principal_components: "主成分の詳細解釈は生応答を参照してください",
            variance_explained: "寄与率に関する情報は生応答を参照してください",
            statistical_significance: "統計的有意性は生応答を参照してください"
        },
        biological_interpretation: {
            biological_meaning: "生物学的解釈は生応答を参照してください",
            pathway_implications: "パスウェイ関連は生応答を参照してください",
            functional_insights: "機能的洞察は生応答を参照してください"
        },
        experimental_evaluation: {
            design_assessment: "実験デザイン評価は生応答を参照してください",
            data_quality: "データ品質評価は生応答を参照してください", 
            limitations: "制限事項は生応答を参照してください"
        },
        practical_recommendations: {
            next_steps: "次のステップは生応答を参照してください",
            additional_analyses: "追加解析は生応答を参照してください",
            interpretive_cautions: "注意点は生応答を参照してください"
        },
        raw_response: rawResponse,
        confidence_score: 0.5,
        interpretation_type: "fallback_text_analysis",
        parsing_status: "fallback_used"
    };
}

/**
 * テキストからサマリー抽出
 * @param {string} text - 元テキスト
 * @returns {string} 抽出されたサマリー
 */
function extractSummary(text) {
    const sentences = text.split(/[.。!！?？]/);
    const summary = sentences.slice(0, 3).join('。');
    return summary.length > 200 ? summary.substring(0, 200) + '...' : summary;
}

/**
 * 生物学的解釈の生成（MetaboLights連携用）
 * @param {Object} analysisResults - PCA解析結果
 * @param {string} studyId - MetaboLights研究ID
 * @returns {Promise<Object>} 生物学的解釈
 */
async function generateBiologicalInterpretation(analysisResults, studyId) {
    try {
        // MetaboLightsメタデータ取得（今後実装）
        const metadata = await fetchMetabolightsMetadata(studyId);
        return await generateStatisticalInterpretation(analysisResults, metadata);
    } catch (error) {
        console.error('生物学的解釈エラー:', error);
        return await generateStatisticalInterpretation(analysisResults);
    }
}

/**
 * MetaboLightsメタデータ取得（プレースホルダー）
 * @param {string} studyId - 研究ID
 * @returns {Promise<Object>} メタデータ
 */
async function fetchMetabolightsMetadata(studyId) {
    // TODO: MetaboLights API実装
    console.log('MetaboLights API連携は未実装:', studyId);
    return null;
}

// モジュールエクスポート（Node.js環境用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateStatisticalInterpretation,
        generateBiologicalInterpretation,
        callStatisticalLLM,
        parseStatisticalInterpretation
    };
}

 