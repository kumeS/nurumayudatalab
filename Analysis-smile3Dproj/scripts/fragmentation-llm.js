// ===== FRAGMENTATION LLM MODULE =====
// LLM API calls, prompt generation, and response processing

// ===== LLM API FUNCTIONS =====

// Main LLM API call function
async function callFragmentationLLMAPI(messages, experimentalData = null) {
    try {
        console.log('🤖 LLM API呼び出し開始');
        
        // Enhance messages with experimental data if available
        const enhancedMessages = experimentalData ? 
            enhanceMessagesWithExperimentalData(messages, experimentalData) : messages;
        
        // Store query for analysis details
        if (window.FragmentationCore?.analysisDetails) {
            window.FragmentationCore.analysisDetails.queries.push({
                timestamp: new Date().toISOString(),
                messages: enhancedMessages,
                experimentalDataUsed: !!experimentalData
            });
        }
        
        const response = await fetch(window.FragmentationCore?.analysisDetails?.modelConfig?.endpoint || 'https://nurumayu-worker.skume-bioinfo.workers.dev/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: window.FragmentationCore?.analysisDetails?.modelConfig?.model || 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8',
                messages: enhancedMessages,
                temperature: window.FragmentationCore?.analysisDetails?.modelConfig?.temperature || 0.4,
                max_tokens: window.FragmentationCore?.analysisDetails?.modelConfig?.maxTokens || 2000,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        
        if (!content) {
            throw new Error('LLM API returned empty response');
        }

        // Store raw response for analysis details
        if (window.FragmentationCore?.analysisDetails) {
            window.FragmentationCore.analysisDetails.rawResponse = content;
        }
        
        console.log('✅ LLM API呼び出し完了');
        
        // Parse and return result
        return parseFragmentationResponse(content);
        
    } catch (error) {
        console.error('LLM API call failed:', error);
        throw error;
    }
}

// Parse fragmentation response from LLM
function parseFragmentationResponse(content) {
    try {
        // Try to extract JSON from response
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                         content.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
            throw new Error('No JSON found in LLM response');
        }
        
        const jsonString = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonString);
        
        console.log('📊 LLMレスポンス解析完了:', parsed);
        return parsed;
        
    } catch (error) {
        console.error('Failed to parse LLM response:', error);
        console.error('Raw content:', content);
        
        // Return fallback structure
        return {
            error: true,
            message: 'LLMレスポンスの解析に失敗しました',
            rawContent: content.substring(0, 500)
        };
    }
}

// ===== PROMPT GENERATION =====

// Create experimentally-informed prompt
function createExperimentallyInformedPrompt(originalMessages, experimentalData, patterns) {
    if (!experimentalData || experimentalData.length === 0 || !patterns) {
        return originalMessages;
    }
    
    console.log('🧠 実験データを活用したプロンプト強化');
    
    // Extract learning insights
    const learningContext = createLearningContext(patterns, experimentalData);
    
    // Enhance system prompt with experimental insights
    const enhancedSystemPrompt = originalMessages[0].content + `

=== 実験データ学習コンテキスト ===
${learningContext}

上記の実験パターンを参考に、より精度の高い予測を行ってください。
実験データで観察された共通パターンを優先的に考慮し、
類似化合物での実際の開裂パターンを活用してください。`;

    return [
        { ...originalMessages[0], content: enhancedSystemPrompt },
        ...originalMessages.slice(1)
    ];
}

// Create learning context from experimental patterns
function createLearningContext(patterns, experimentalData) {
    let context = `実験データから学習した知見（信頼度スコア: ${patterns.reliabilityScore}）:\n\n`;
    
    // Common patterns
    if (patterns.commonPatterns && patterns.commonPatterns.length > 0) {
        context += `共通開裂パターン（${patterns.commonPatterns.length}パターン）:\n`;
        patterns.commonPatterns.slice(0, 5).forEach((pattern, index) => {
            context += `${index + 1}. ${pattern.description} (頻度: ${pattern.frequency})\n`;
        });
        context += '\n';
    }
    
    // Neutral losses
    if (patterns.neutralLosses && Object.keys(patterns.neutralLosses).length > 0) {
        context += '頻出中性脱離:\n';
        Object.values(patterns.neutralLosses).slice(0, 3).forEach(loss => {
            context += `- ${loss.type}: ${loss.mass}Da (頻度: ${loss.frequency})\n`;
        });
        context += '\n';
    }
    
    // Mass range insights
    if (patterns.massRangePatterns && Object.keys(patterns.massRangePatterns).length > 0) {
        context += '質量範囲別パターン:\n';
        Object.entries(patterns.massRangePatterns).forEach(([range, data]) => {
            context += `- ${range}: ${data.compounds}化合物, 平均複雑度: ${data.averageComplexity}\n`;
        });
        context += '\n';
    }
    
    // Specific compound examples
    if (experimentalData.length > 0) {
        context += `類似化合物例（上位3件）:\n`;
        experimentalData.slice(0, 3).forEach((compound, index) => {
            context += `${index + 1}. ${compound.name || 'Unknown'} (${compound.formula || 'Unknown'})\n`;
            if (compound.exact_mass) {
                context += `   分子量: ${compound.exact_mass}\n`;
            }
        });
    }
    
    return context;
}

// Enhance messages with experimental data
function enhanceMessagesWithExperimentalData(messages, experimentalData) {
    if (!experimentalData || experimentalData.length === 0) {
        return messages;
    }
    
    const experimentalContext = formatExperimentalDataForPrompt(experimentalData);
    
    // Add experimental context to user message
    const enhancedUserMessage = messages[messages.length - 1].content + `

=== 参考実験データ ===
${experimentalContext}

上記の実験データを参考にして、より実験に基づいた予測を行ってください。`;

    return [
        ...messages.slice(0, -1),
        { ...messages[messages.length - 1], content: enhancedUserMessage }
    ];
}

// Format experimental data for prompt
function formatExperimentalDataForPrompt(experimentalData) {
    if (!experimentalData || experimentalData.length === 0) {
        return '実験データは利用できません。';
    }
    
    let formatted = `類似化合物の実験データ（${experimentalData.length}件）:\n\n`;
    
    experimentalData.slice(0, 5).forEach((compound, index) => {
        formatted += `${index + 1}. ${compound.name || compound.common_name || 'Unknown compound'}\n`;
        formatted += `   分子式: ${compound.formula || 'Unknown'}\n`;
        formatted += `   分子量: ${compound.exact_mass || 'Unknown'}\n`;
        
        if (compound.smiles) {
            formatted += `   SMILES: ${compound.smiles}\n`;
        }
        
        if (compound.similarity) {
            formatted += `   類似度: ${(compound.similarity * 100).toFixed(1)}%\n`;
        }
        
        formatted += '\n';
    });
    
    return formatted;
}

// ===== INTEGRATION ANALYSIS =====

// Perform comprehensive integration of LLM and database results
async function performComprehensiveIntegration(step1Result, step2Result) {
    const messages = [{
        role: "system",
        content: `あなたは統合解析の専門家です。LLM解析結果とデータベース検索結果を統合して、包括的で高精度な推論を実行してください。

以下のJSON形式で回答してください：
{
    "integratedAnalysis": {
        "confidenceLevel": "high/medium/low",
        "dataConsistency": "consistent/partially_consistent/inconsistent",
        "keyFindings": ["重要な発見1", "重要な発見2"],
        "contradictions": ["矛盾点1", "矛盾点2"]
    },
    "enhancedPredictions": {
        "structuralInsights": "構造的洞察",
        "fragmentationRefinement": "開裂予測の改良",
        "bioactivityConfidence": "生物活性の信頼度",
        "analyticalRecommendations": "分析手法推奨"
    },
    "comprehensiveAssessment": {
        "novelty": "新規性評価",
        "druglikeness": "Drug-likeness評価", 
        "toxicityRisk": "毒性リスク評価",
        "synthesisAccessibility": "合成アクセシビリティ"
    },
    "futureDirections": {
        "recommendedExperiments": ["推奨実験1", "推奨実験2"],
        "researchPriorities": ["研究優先度1", "研究優先度2"],
        "collaborationOpportunities": ["共同研究機会1", "共同研究機会2"]
    },
    "metaAnalysis": {
        "dataQuality": "データ品質評価",
        "limitationsAndCaveats": ["制限事項1", "制限事項2"],
        "confidenceIntervals": "信頼区間",
        "validationNeeds": "検証が必要な項目"
    }
}`
    }, {
        role: "user",
        content: `以下のLLM解析結果とデータベース検索結果を統合解析してください：

=== LLM解析結果 ===
${JSON.stringify(step1Result, null, 2)}

=== データベース検索結果 ===
${JSON.stringify(step2Result, null, 2)}

これらの結果を統合して、より包括的で信頼性の高い推論を提供してください。データの一貫性、矛盾点、新たな洞察を含めて解析してください。`
    }];
    
    return await callFragmentationLLMAPI(messages);
}

// ===== EXPERIMENTAL DATA ENHANCEMENT =====

// Check if iterative improvement should be performed
function shouldPerformIterativeImprovement(fragmentationData, experimentalData) {
    if (!fragmentationData.validationSummary || !experimentalData || experimentalData.length === 0) {
        return false;
    }
    
    const matchRate = fragmentationData.validationSummary.experimentalMatchRate || 0;
    const hasAdditionalSites = fragmentationData.additionalExperimentalSites && 
                               fragmentationData.additionalExperimentalSites.length > 0;
    
    // Perform improvement if match rate is low or there are missing experimental sites
    return matchRate < 60 || hasAdditionalSites;
}

// Perform iterative improvement of LLM predictions
async function performIterativeImprovement(initialData, experimentalData, originalMessages) {
    try {
        console.log('🔄 反復改善実行開始');
        
        // Analyze gaps between LLM predictions and experimental data
        const gaps = analyzeExperimentalGaps(initialData, experimentalData);
        
        if (gaps.identifiedGaps.length === 0) {
            console.log('❌ 改善が必要なギャップが見つかりませんでした');
            return null;
        }
        
        // Create improvement-focused prompt
        const improvementMessages = createImprovementPrompt(originalMessages, gaps, experimentalData);
        
        // Execute improved prediction
        const improvedResult = await callFragmentationLLMAPI(improvementMessages, experimentalData);
        
        // Merge improvements with original data
        const mergedResult = mergeImprovementResults(initialData, improvedResult, gaps);
        
        // Add improvement summary
        mergedResult.iterativelyImproved = true;
        mergedResult.improvementSummary = {
            gapsAddressed: gaps.identifiedGaps.length,
            improvementFocus: gaps.improvementFocus,
            originalMatchRate: initialData.validationSummary?.experimentalMatchRate || 0,
            improvedMatchRate: mergedResult.validationSummary?.experimentalMatchRate || 0,
            improvement: (mergedResult.validationSummary?.experimentalMatchRate || 0) - 
                        (initialData.validationSummary?.experimentalMatchRate || 0)
        };
        
        console.log('✅ 反復改善完了:', mergedResult.improvementSummary);
        return mergedResult;
        
    } catch (error) {
        console.error('反復改善でエラーが発生:', error);
        return null;
    }
}

// Create improvement prompt based on identified gaps
function createImprovementPrompt(originalMessages, gaps, experimentalData) {
    const improvementContext = `
=== 改善が必要な項目 ===
${gaps.improvementFocus}

特定されたギャップ:
${gaps.identifiedGaps.map((gap, index) => `${index + 1}. ${gap.description}`).join('\n')}

=== 実験データとの差異 ===
${gaps.experimentalDiscrepancies.map((disc, index) => `${index + 1}. ${disc}`).join('\n')}

上記の問題を解決するため、より実験データに基づいた予測を行ってください。
特に実験で観測されているが予測に含まれていない開裂サイトに注目してください。`;

    return [
        {
            role: "system",
            content: originalMessages[0].content + `\n\n=== 反復改善指示 ===\n${improvementContext}`
        },
        ...originalMessages.slice(1),
        {
            role: "user",
            content: "上記の改善指示に基づいて、より精度の高い開裂予測を行ってください。実験データとの整合性を最優先に考慮してください。"
        }
    ];
}

// ===== PATTERN ANALYSIS =====

// Get pattern explanation for educational purposes
function getPatternExplanation(patternType) {
    const explanations = {
        'neutral_loss': '中性分子の脱離による質量減少パターン',
        'common_fragment': '頻繁に観測される特徴的フラグメント',
        'mass_range': '分子量範囲に特有の開裂傾向',
        'mechanism_frequency': '開裂機構の出現頻度パターン'
    };
    
    return explanations[patternType] || '未知のパターンタイプ';
}

// Get specific pattern advice based on mass range
function getSpecificPatternAdvice(massRange) {
    const advice = {
        'small': '小分子では単純結合切断とα開裂が主要。安定化できるフラグメントが限定的。',
        'medium': '中分子では転位反応も可能。官能基特有の開裂パターンが顕著に。',
        'large': '大分子では複数の競合する開裂サイト。優先度の高いサイトに注目。',
        'very_large': '巨大分子では部分構造の特徴が支配的。局所的な環境を重視。'
    };
    
    return advice[massRange] || '質量範囲に応じた一般的なアドバイスを参照してください。';
}

// ===== MODULE EXPORTS =====
const FragmentationLLM = {
    // Main functions
    callFragmentationLLMAPI,
    parseFragmentationResponse,
    performComprehensiveIntegration,
    
    // Prompt generation
    createExperimentallyInformedPrompt,
    enhanceMessagesWithExperimentalData,
    formatExperimentalDataForPrompt,
    
    // Improvement functions
    shouldPerformIterativeImprovement,
    performIterativeImprovement,
    createImprovementPrompt,
    
    // Pattern analysis
    getPatternExplanation,
    getSpecificPatternAdvice
};

// Export to global scope for module coordination
window.FragmentationLLM = FragmentationLLM; 