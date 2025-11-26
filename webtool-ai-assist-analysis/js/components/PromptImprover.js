/**
 * Prompt Improver Component
 * Handles Stage 1: Prompt optimization and enhancement
 */

class PromptImprover {
    constructor(aiService) {
        this.aiService = aiService;
        this.improvementStrategies = this.initializeStrategies();
    }

    /**
     * Initialize improvement strategies
     * @returns {Object} Improvement strategies
     */
    initializeStrategies() {
        return {
            clarity: {
                name: '明確性の向上',
                description: '曖昧な表現を具体的にする',
                weight: 0.3
            },
            specificity: {
                name: '具体性の追加',
                description: '詳細な条件や制約を明記する',
                weight: 0.25
            },
            structure: {
                name: '構造化',
                description: '出力形式や期待する結果を明確にする',
                weight: 0.2
            },
            context: {
                name: 'コンテキスト強化',
                description: '背景情報や目的を追加する',
                weight: 0.15
            },
            actionability: {
                name: '実行可能性',
                description: '具体的なアクションを促す要素を追加',
                weight: 0.1
            }
        };
    }

    /**
     * Analyze prompt and identify improvement opportunities
     * @param {string} prompt - Original prompt to analyze
     * @returns {Object} Analysis result with improvement suggestions
     */
    analyzePrompt(prompt) {
        const analysis = {
            originalPrompt: prompt,
            length: prompt.length,
            wordCount: prompt.split(/\s+/).length,
            issues: [],
            suggestions: [],
            score: 0
        };

        // Check for common issues
        this.checkClarity(prompt, analysis);
        this.checkSpecificity(prompt, analysis);
        this.checkStructure(prompt, analysis);
        this.checkActionability(prompt, analysis);
        
        // Calculate overall score (0-100)
        analysis.score = this.calculateScore(analysis);

        return analysis;
    }

    /**
     * Check clarity issues
     * @param {string} prompt - Prompt to check
     * @param {Object} analysis - Analysis object to update
     */
    checkClarity(prompt, analysis) {
        const vagueWords = ['何か', 'いい感じ', 'よろしく', '適当に', 'うまく'];
        const foundVagueWords = vagueWords.filter(word => prompt.includes(word));

        if (foundVagueWords.length > 0) {
            analysis.issues.push({
                type: 'clarity',
                severity: 'medium',
                message: `曖昧な表現が含まれています: ${foundVagueWords.join(', ')}`,
                suggestion: '具体的な条件や期待する結果を明記してください'
            });
        }

        // Check for missing question marks or unclear intent
        const hasQuestionMark = prompt.includes('？') || prompt.includes('?');
        const hasImperative = /して|やって|作って|考えて|分析して/.test(prompt);
        
        if (!hasQuestionMark && !hasImperative) {
            analysis.issues.push({
                type: 'clarity',
                severity: 'low',
                message: '指示の意図が不明確です',
                suggestion: '質問形式または命令形式で明確に指示してください'
            });
        }
    }

    /**
     * Check specificity issues
     * @param {string} prompt - Prompt to check
     * @param {Object} analysis - Analysis object to update
     */
    checkSpecificity(prompt, analysis) {
        // Check for missing constraints
        const constraints = ['期限', '予算', '人数', '条件', '制約', '要件'];
        const mentionedConstraints = constraints.filter(constraint => prompt.includes(constraint));

        if (mentionedConstraints.length === 0 && prompt.length > 50) {
            analysis.suggestions.push({
                type: 'specificity',
                priority: 'medium',
                message: '制約条件の追加を検討してください',
                suggestion: '期限、予算、リソースなどの制約条件を明記すると、より実用的な回答が得られます'
            });
        }

        // Check for missing scope definition
        if (prompt.length < 20) {
            analysis.issues.push({
                type: 'specificity',
                severity: 'high',
                message: '指示が短すぎます',
                suggestion: 'より詳細な背景情報や期待する内容を追加してください'
            });
        }
    }

    /**
     * Check structure issues
     * @param {string} prompt - Prompt to check
     * @param {Object} analysis - Analysis object to update
     */
    checkStructure(prompt, analysis) {
        const structureKeywords = ['形式', 'フォーマット', 'テンプレート', '順番', 'ステップ'];
        const hasStructureRequest = structureKeywords.some(keyword => prompt.includes(keyword));

        if (!hasStructureRequest && prompt.length > 100) {
            analysis.suggestions.push({
                type: 'structure',
                priority: 'low',
                message: '出力形式の指定を追加することをお勧めします',
                suggestion: '箇条書き、番号付きリスト、表形式など、希望する出力形式を指定してください'
            });
        }

        // Check for multiple questions without structure
        const questionCount = (prompt.match(/[？?]/g) || []).length;
        if (questionCount > 2) {
            analysis.issues.push({
                type: 'structure',
                severity: 'medium',
                message: '複数の質問が混在しています',
                suggestion: '質問を整理し、優先順位を明確にしてください'
            });
        }
    }

    /**
     * Check actionability issues
     * @param {string} prompt - Prompt to check
     * @param {Object} analysis - Analysis object to update
     */
    checkActionability(prompt, analysis) {
        const actionWords = ['作成', '分析', '提案', '評価', '比較', '検討', '調査'];
        const hasActionWords = actionWords.some(word => prompt.includes(word));

        if (!hasActionWords) {
            analysis.suggestions.push({
                type: 'actionability',
                priority: 'low',
                message: '具体的なアクションの指定を検討してください',
                suggestion: '「作成して」「分析して」「提案して」など、具体的なアクションを指定してください'
            });
        }
    }

    /**
     * Calculate overall prompt score
     * @param {Object} analysis - Analysis object
     * @returns {number} Score from 0-100
     */
    calculateScore(analysis) {
        let score = 80; // Base score

        // Deduct points for issues
        analysis.issues.forEach(issue => {
            switch (issue.severity) {
                case 'high': score -= 15; break;
                case 'medium': score -= 10; break;
                case 'low': score -= 5; break;
            }
        });

        // Deduct minor points for suggestions
        analysis.suggestions.forEach(suggestion => {
            switch (suggestion.priority) {
                case 'high': score -= 10; break;
                case 'medium': score -= 5; break;
                case 'low': score -= 2; break;
            }
        });

        // Bonus for good length
        if (analysis.wordCount >= 10 && analysis.wordCount <= 100) {
            score += 5;
        }

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Improve prompt using AI
     * @param {string} originalPrompt - Original prompt
     * @param {string} provider - AI provider to use
     * @returns {Promise<Object>} Improvement result
     */
    async improvePrompt(originalPrompt, provider = null) {
        try {
            // First, analyze the prompt
            const analysis = this.analyzePrompt(originalPrompt);
            
            // Check if AI service is available
            if (!this.aiService.isProviderAvailable(provider)) {
                console.info('AI provider not available, using rule-based improvement');
                return await this.fallbackImprovement(originalPrompt);
            }
            
            // Always attempt AI-based improvement when Stage 1 is enabled,
            // even if the heuristic score is high. This ensures
            // downstream stages receive a consistently refined prompt.
            const improvedPrompt = await this.aiService.improvePrompt(originalPrompt, provider);
            
            // Analyze the improved prompt
            const improvedAnalysis = this.analyzePrompt(improvedPrompt);
            
            return {
                original: originalPrompt,
                improved: improvedPrompt,
                originalAnalysis: analysis,
                improvedAnalysis: improvedAnalysis,
                improvementApplied: (improvedPrompt || '').trim() !== (originalPrompt || '').trim(),
                improvementExecuted: true,
                improvement: {
                    scoreChange: improvedAnalysis.score - analysis.score,
                    strategiesApplied: this.identifyAppliedStrategies(analysis, improvedAnalysis)
                }
            };

        } catch (error) {
            console.error('Prompt improvement failed, falling back to rule-based improvement:', error);
            
            // Fallback to rule-based improvement
            return await this.fallbackImprovement(originalPrompt);
        }
    }

    /**
     * Fallback improvement using rule-based approach
     * @param {string} originalPrompt - Original prompt
     * @returns {Promise<Object>} Improvement result
     */
    async fallbackImprovement(originalPrompt) {
        const analysis = this.analyzePrompt(originalPrompt);
        let improved = originalPrompt;
        const appliedStrategies = [];

        // Apply rule-based improvements
        if (analysis.issues.some(issue => issue.type === 'clarity')) {
            improved = this.addClarityImprovements(improved);
            appliedStrategies.push('明確性向上');
        }

        if (analysis.issues.some(issue => issue.type === 'specificity')) {
            improved = this.addSpecificityImprovements(improved);
            appliedStrategies.push('具体性追加');
        }

        if (analysis.suggestions.some(suggestion => suggestion.type === 'structure')) {
            improved = this.addStructureImprovements(improved);
            appliedStrategies.push('構造化');
        }

        const improvedAnalysis = this.analyzePrompt(improved);

        return {
            original: originalPrompt,
            improved: improved,
            originalAnalysis: analysis,
            improvedAnalysis: improvedAnalysis,
            improvementApplied: improved !== originalPrompt,
            improvementExecuted: true,
            improvement: {
                scoreChange: improvedAnalysis.score - analysis.score,
                strategiesApplied: appliedStrategies,
                fallbackUsed: true
            }
        };
    }

    /**
     * Add clarity improvements using rules
     * @param {string} prompt - Prompt to improve
     * @returns {string} Improved prompt
     */
    addClarityImprovements(prompt) {
        let improved = prompt;

        // Add specific instructions if too vague
        if (improved.includes('いい感じ')) {
            improved = improved.replace('いい感じ', '効果的で実用的');
        }
        
        if (improved.includes('適当に')) {
            improved = improved.replace('適当に', '適切な方法で');
        }

        if (improved.includes('よろしく')) {
            improved = improved.replace('よろしく', '具体的で実行可能な提案をお願いします');
        }

        // Add output format specification if missing
        if (!improved.includes('形式') && !improved.includes('フォーマット')) {
            improved += '\n\n出力は読みやすい形式で整理して提示してください。';
        }

        return improved;
    }

    /**
     * Add specificity improvements using rules
     * @param {string} prompt - Prompt to improve
     * @returns {string} Improved prompt
     */
    addSpecificityImprovements(prompt) {
        let improved = prompt;

        // Add context request if very short
        if (prompt.length < 30) {
            improved += '\n\n背景情報や具体的な要件があれば考慮に入れて回答してください。';
        }

        // Add constraint consideration
        if (!improved.includes('制約') && !improved.includes('条件')) {
            improved += '\n\n実現可能性や制約条件も考慮してください。';
        }

        return improved;
    }

    /**
     * Add structure improvements using rules
     * @param {string} prompt - Prompt to improve
     * @returns {string} Improved prompt
     */
    addStructureImprovements(prompt) {
        let improved = prompt;

        // Add structure request if missing
        if (!improved.includes('ステップ') && !improved.includes('順番')) {
            improved += '\n\nステップバイステップで整理して回答してください。';
        }

        return improved;
    }

    /**
     * Identify which improvement strategies were applied
     * @param {Object} original - Original analysis
     * @param {Object} improved - Improved analysis
     * @returns {Array} Applied strategies
     */
    identifyAppliedStrategies(original, improved) {
        const strategies = [];

        // Compare issue counts by type
        const originalIssues = this.groupIssuesByType(original.issues);
        const improvedIssues = this.groupIssuesByType(improved.issues);

        Object.keys(this.improvementStrategies).forEach(strategyKey => {
            const strategy = this.improvementStrategies[strategyKey];
            const originalCount = originalIssues[strategyKey] || 0;
            const improvedCount = improvedIssues[strategyKey] || 0;

            if (improvedCount < originalCount) {
                strategies.push(strategy.name);
            }
        });

        return strategies;
    }

    /**
     * Group issues by type
     * @param {Array} issues - Array of issues
     * @returns {Object} Grouped issues
     */
    groupIssuesByType(issues) {
        const grouped = {};
        issues.forEach(issue => {
            grouped[issue.type] = (grouped[issue.type] || 0) + 1;
        });
        return grouped;
    }

    /**
     * Generate improvement explanation for display
     * @param {Object} improvementResult - Result from improvePrompt
     * @returns {string} Human-readable explanation
     */
    generateExplanation(improvementResult) {
        if (!improvementResult.improvementApplied) {
            return improvementResult.reason;
        }

        const parts = ['プロンプトを以下の観点で改良しました：'];
        
        if (improvementResult.improvement.strategiesApplied.length > 0) {
            parts.push('\n改良点:');
            improvementResult.improvement.strategiesApplied.forEach(strategy => {
                parts.push(`• ${strategy}`);
            });
        }

        if (improvementResult.improvement.scoreChange > 0) {
            parts.push(`\n品質スコア: ${improvementResult.originalAnalysis.score} → ${improvementResult.improvedAnalysis.score} (+${improvementResult.improvement.scoreChange})`);
        }

        if (improvementResult.improvement.fallbackUsed) {
            parts.push('\n※ AI改良に失敗したため、ルールベース改良を適用しました');
        }

        return parts.join('\n');
    }

    /**
     * Validate prompt before improvement
     * @param {string} prompt - Prompt to validate
     * @returns {Object} Validation result
     */
    validatePrompt(prompt) {
        const errors = [];
        const warnings = [];

        // Check minimum length
        if (prompt.trim().length < 5) {
            errors.push('プロンプトが短すぎます（最低5文字以上必要）');
        }

        // Check maximum length
        if (prompt.length > 2000) {
            warnings.push('プロンプトが長すぎます（2000文字以下推奨）');
        }

        // Check for potential security issues
        if (/system|prompt|ignore|bypass/i.test(prompt)) {
            warnings.push('システム命令や回避指示と思われる文言が含まれています');
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            warnings: warnings
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PromptImprover;
} else {
    window.PromptImprover = PromptImprover;
}
