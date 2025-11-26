/**
 * Workflow Manager Component
 * Orchestrates the entire execution workflow from prompt improvement to result generation
 */

class WorkflowManager {
    constructor(thinkingPatterns, promptImprover, aiService, storageManager) {
        this.thinkingPatterns = thinkingPatterns;
        this.promptImprover = promptImprover;
        this.aiService = aiService;
        this.storageManager = storageManager;
        
        this.currentExecution = null;
        this.progressCallbacks = [];
        this.resultCallbacks = [];
    }

    /**
     * Register progress callback
     * @param {Function} callback - Progress callback function
     */
    onProgress(callback) {
        this.progressCallbacks.push(callback);
    }

    /**
     * Register result callback
     * @param {Function} callback - Result callback function
     */
    onResult(callback) {
        this.resultCallbacks.push(callback);
    }

    /**
     * Execute complete workflow
     * @param {Object} executionConfig - Execution configuration
     * @returns {Promise<Object>} Execution result
     */
    async executeWorkflow(executionConfig) {
        const {
            originalPrompt,
            selectedPatterns,
            enableImprovement,
            preferredProvider,
            requireImprovedPromptConfirmation,
            confirmImprovedPrompt
        } = executionConfig;

        // Validate configuration
        const validation = this.validateExecutionConfig(executionConfig);
        if (!validation.isValid) {
            throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
        }

        // Initialize execution context
        this.currentExecution = {
            id: this.generateExecutionId(),
            config: executionConfig,
            startTime: Date.now(),
            stage: 'initializing',
            results: {},
            errors: []
        };

        try {
            this.notifyProgress('実行を開始しています...', 'initializing');

            // Stage 1: Prompt Improvement (if enabled)
            let workingPrompt = originalPrompt;
            if (enableImprovement) {
                this.currentExecution.stage = 'improving';
                this.notifyProgress('指示文を改良中...', 'improving');
                
                const improvementResult = await this.executeStage1(originalPrompt, preferredProvider);
                this.currentExecution.results.stage1 = improvementResult;
                
                // Always carry the improved prompt forward, even if unchanged
                workingPrompt = improvementResult.improved;
                if (improvementResult.improvementApplied) {
                    this.notifyProgress('指示文改良完了', 'completed');
                } else if (improvementResult.improvementExecuted) {
                    this.notifyProgress('指示文改良を実行（変更なし）', 'completed');
                } else {
                    this.notifyProgress('改良をスキップしました', 'skipped');
                }

                // Require user confirmation of improved prompt before proceeding
                if (requireImprovedPromptConfirmation && typeof confirmImprovedPrompt === 'function') {
                    try {
                        const confirmed = await confirmImprovedPrompt(improvementResult.improved, this.currentExecution);
                        if (!confirmed) {
                            // User chose not to proceed
                            this.currentExecution.stage = 'cancelled';
                            this.currentExecution.endTime = Date.now();
                            this.notifyProgress('ユーザー確認によりキャンセルされました', 'cancelled');
                            return this.currentExecution;
                        }
                    } catch (e) {
                        // Treat errors in confirmation as cancellation
                        this.currentExecution.stage = 'cancelled';
                        this.currentExecution.endTime = Date.now();
                        this.notifyProgress('確認ダイアログで問題が発生し、処理を中断しました', 'cancelled');
                        return this.currentExecution;
                    }
                }
            }

            // Stage 2: Multi-pattern Execution
            this.currentExecution.stage = 'executing';
            this.notifyProgress('思考パターンで分析中...', 'executing');
            
            const stage2Result = await this.executeStage2(workingPrompt, selectedPatterns);
            this.currentExecution.results.stage2 = stage2Result;

            // Complete execution
            this.currentExecution.stage = 'completed';
            this.currentExecution.endTime = Date.now();
            this.currentExecution.executionTime = this.currentExecution.endTime - this.currentExecution.startTime;

            this.notifyProgress('実行完了', 'completed');

            // Save to history
            await this.saveExecutionToHistory();

            // Notify result callbacks
            this.notifyResult(this.currentExecution);

            return this.currentExecution;

        } catch (error) {
            this.currentExecution.stage = 'error';
            this.currentExecution.error = error.message;
            this.currentExecution.endTime = Date.now();

            this.notifyProgress(`実行エラー: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Execute Stage 1: Prompt Improvement
     * @param {string} originalPrompt - Original prompt
     * @param {string} preferredProvider - Preferred AI provider
     * @returns {Promise<Object>} Stage 1 result
     */
    async executeStage1(originalPrompt, preferredProvider) {
        try {
            const result = await this.promptImprover.improvePrompt(originalPrompt, preferredProvider);
            
            // Ensure the result has required properties
            if (!result) {
                throw new Error('PromptImprover returned null result');
            }

            return {
                original: originalPrompt,
                improved: result.improved || originalPrompt,
                improvementApplied: result.improvementApplied || false,
                improvementExecuted: result.improvementExecuted || false,
                originalAnalysis: result.originalAnalysis,
                improvedAnalysis: result.improvedAnalysis,
                improvement: result.improvement,
                fallbackReason: result.improvement?.fallbackUsed ? 
                    'AI改良に失敗したため、ルールベース改良を適用しました' : null
            };
        } catch (error) {
            console.warn('Stage 1 improvement completely failed, using original prompt:', error);
            
            // Last resort fallback - return original prompt with minimal analysis
            return {
                original: originalPrompt,
                improved: originalPrompt,
                improvementApplied: false,
                improvementExecuted: false,
                error: error.message,
                fallbackReason: 'プロンプト改良処理に失敗したため、元のプロンプトをそのまま使用します'
            };
        }
    }

    /**
     * Execute Stage 2: Multi-pattern Analysis
     * @param {string} prompt - Working prompt (original or improved)
     * @param {Array} selectedPatternIds - Selected pattern IDs
     * @returns {Promise<Object>} Stage 2 result
     */
    async executeStage2(prompt, selectedPatternIds) {
        // Get pattern objects
        const patterns = selectedPatternIds.map(id => {
            const pattern = this.thinkingPatterns.getPattern(id);
            if (!pattern) {
                throw new Error(`Pattern not found: ${id}`);
            }
            return pattern;
        });

        // Execute patterns with progress tracking
        const progressCallback = (patternName, status) => {
            this.notifyProgress(`${patternName}: ${this.getStatusMessage(status)}`, status);
        };

        const executionResult = await this.aiService.executeMultiplePatterns(
            prompt,
            patterns,
            progressCallback
        );

        return {
            prompt: prompt,
            patterns: patterns.map(p => ({ id: p.id, name: p.name })),
            results: executionResult.results,
            errors: executionResult.errors,
            summary: this.generateExecutionSummary(executionResult)
        };
    }

    /**
     * Generate summary for multiple results
     * @param {Array} results - Array of pattern results
     * @param {string} originalPrompt - Original prompt
     * @returns {Promise<Object>} Summary result
     */
    async generateSummary(results, originalPrompt) {
        if (!results || results.length === 0) {
            throw new Error('No results available for summarization');
        }

        this.notifyProgress('結果を統合中...', 'summarizing');

        try {
            const summaryContent = await this.aiService.summarizeResults(results, originalPrompt);
            
            const summaryResult = {
                content: summaryContent,
                sourceResults: results.length,
                timestamp: new Date().toISOString(),
                generatedBy: 'ai'
            };

            this.notifyProgress('統合完了', 'completed');
            return summaryResult;

        } catch (error) {
            console.warn('AI summarization failed, using fallback:', error);
            
            // Fallback to simple concatenation with headers
            const fallbackSummary = this.generateFallbackSummary(results, originalPrompt);
            
            this.notifyProgress('基本統合完了', 'completed');
            return {
                content: fallbackSummary,
                sourceResults: results.length,
                timestamp: new Date().toISOString(),
                generatedBy: 'fallback',
                error: error.message
            };
        }
    }

    /**
     * Generate fallback summary when AI summarization fails
     * @param {Array} results - Array of results
     * @param {string} originalPrompt - Original prompt
     * @returns {string} Fallback summary
     */
    generateFallbackSummary(results, originalPrompt) {
        const lines = [
            `# 「${originalPrompt}」の分析結果`,
            '',
            `${results.length}つの思考パターンによる分析を実行しました。`,
            ''
        ];

        results.forEach((result, index) => {
            lines.push(`## ${index + 1}. ${result.data.patternName}`);
            lines.push('');
            lines.push(result.data.content);
            lines.push('');
            lines.push('---');
            lines.push('');
        });

        lines.push('## 次のステップ');
        lines.push('上記の分析結果を参考に、具体的なアクションプランを検討してください。');

        return lines.join('\n');
    }

    /**
     * Validate execution configuration
     * @param {Object} config - Execution configuration
     * @returns {Object} Validation result
     */
    validateExecutionConfig(config) {
        const errors = [];
        const warnings = [];

        // Check required fields
        if (!config.originalPrompt || config.originalPrompt.trim().length === 0) {
            errors.push('Original prompt is required');
        }

        if (!config.selectedPatterns || config.selectedPatterns.length === 0) {
            errors.push('At least one thinking pattern must be selected');
        }

        // Check prompt length
        if (config.originalPrompt && config.originalPrompt.length > 5000) {
            warnings.push('Prompt is very long and may exceed API limits');
        }

        // Check pattern validity
        if (config.selectedPatterns) {
            const invalidPatterns = config.selectedPatterns.filter(id => 
                !this.thinkingPatterns.getPattern(id)
            );
            
            if (invalidPatterns.length > 0) {
                errors.push(`Invalid patterns: ${invalidPatterns.join(', ')}`);
            }
        }

        // Check provider availability
        if (config.preferredProvider) {
            if (!this.aiService.isProviderAvailable(config.preferredProvider)) {
                warnings.push(`Preferred provider ${config.preferredProvider} is not configured`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            warnings: warnings
        };
    }

    /**
     * Save execution to history
     * @returns {Promise<void>}
     */
    async saveExecutionToHistory() {
        try {
            const historyEntry = {
                originalPrompt: this.currentExecution.config.originalPrompt,
                improvedPrompt: this.currentExecution.results.stage1?.improved || null,
                selectedPatterns: this.currentExecution.config.selectedPatterns,
                results: this.currentExecution.results,
                executionTime: this.currentExecution.executionTime,
                timestamp: new Date().toISOString()
            };

            this.storageManager.saveToHistory(historyEntry);
        } catch (error) {
            console.error('Failed to save execution to history:', error);
            // Don't throw error as this is not critical
        }
    }

    /**
     * Cancel current execution
     * @returns {boolean} Cancellation success
     */
    cancelExecution() {
        if (!this.currentExecution || this.currentExecution.stage === 'completed') {
            return false;
        }

        this.currentExecution.stage = 'cancelled';
        this.currentExecution.endTime = Date.now();
        
        this.notifyProgress('実行がキャンセルされました', 'cancelled');
        return true;
    }

    /**
     * Get current execution status
     * @returns {Object|null} Current execution status
     */
    getCurrentStatus() {
        return this.currentExecution ? {
            id: this.currentExecution.id,
            stage: this.currentExecution.stage,
            startTime: this.currentExecution.startTime,
            executionTime: this.currentExecution.endTime ? 
                this.currentExecution.endTime - this.currentExecution.startTime : 
                Date.now() - this.currentExecution.startTime
        } : null;
    }

    /**
     * Get execution history
     * @param {number} limit - Number of entries to return
     * @returns {Array} Execution history
     */
    getExecutionHistory(limit = 10) {
        const history = this.storageManager.loadHistory();
        return history.slice(0, limit);
    }

    /**
     * Clear execution history
     * @returns {void}
     */
    clearExecutionHistory() {
        this.storageManager.clearHistory();
        this.notifyProgress('実行履歴をクリアしました', 'info');
    }

    /**
     * Export execution result
     * @param {string} format - Export format ('json', 'text', 'markdown')
     * @returns {string} Exported data
     */
    exportExecution(format = 'markdown') {
        if (!this.currentExecution) {
            throw new Error('No execution to export');
        }

        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(this.currentExecution, null, 2);
            
            case 'text':
                return this.generateTextExport();
            
            case 'markdown':
                return this.generateMarkdownExport();
            
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Generate text export
     * @returns {string} Text export
     */
    generateTextExport() {
        const lines = [];
        const exec = this.currentExecution;

        lines.push('AI プロンプト分岐実行結果');
        lines.push('='.repeat(30));
        lines.push(`実行日時: ${new Date(exec.startTime).toLocaleString('ja-JP')}`);
        lines.push(`実行時間: ${Math.round(exec.executionTime / 1000)}秒`);
        lines.push('');

        lines.push('元の指示文:');
        lines.push(exec.config.originalPrompt);
        lines.push('');

        if (exec.results.stage1 && exec.results.stage1.improvementApplied) {
            lines.push('改良された指示文:');
            lines.push(exec.results.stage1.improved);
            lines.push('');
        }

        if (exec.results.stage2 && exec.results.stage2.results) {
            lines.push('分析結果:');
            exec.results.stage2.results.forEach((result, index) => {
                lines.push(`${index + 1}. ${result.data.patternName}`);
                lines.push('-'.repeat(20));
                lines.push(result.data.content);
                lines.push('');
            });
        }

        return lines.join('\n');
    }

    /**
     * Generate markdown export
     * @returns {string} Markdown export
     */
    generateMarkdownExport() {
        const lines = [];
        const exec = this.currentExecution;

        lines.push('# AI プロンプト分岐実行結果');
        lines.push('');
        lines.push(`**実行日時:** ${new Date(exec.startTime).toLocaleString('ja-JP')}`);
        lines.push(`**実行時間:** ${Math.round(exec.executionTime / 1000)}秒`);
        lines.push('');

        lines.push('## 元の指示文');
        lines.push('```');
        lines.push(exec.config.originalPrompt);
        lines.push('```');
        lines.push('');

        if (exec.results.stage1 && exec.results.stage1.improvementApplied) {
            lines.push('## 改良された指示文');
            lines.push('```');
            lines.push(exec.results.stage1.improved);
            lines.push('```');
            lines.push('');
        }

        if (exec.results.stage2 && exec.results.stage2.results) {
            lines.push('## 分析結果');
            exec.results.stage2.results.forEach((result, index) => {
                lines.push(`### ${index + 1}. ${result.data.patternName}`);
                lines.push('');
                lines.push(result.data.content);
                lines.push('');
            });
        }

        return lines.join('\n');
    }

    // Private helper methods

    /**
     * Generate unique execution ID
     * @returns {string} Unique ID
     */
    generateExecutionId() {
        return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Notify progress callbacks
     * @param {string} message - Progress message
     * @param {string} status - Progress status
     */
    notifyProgress(message, status) {
        this.progressCallbacks.forEach(callback => {
            try {
                callback(message, status, this.currentExecution);
            } catch (error) {
                console.error('Progress callback error:', error);
            }
        });
    }

    /**
     * Notify result callbacks
     * @param {Object} result - Execution result
     */
    notifyResult(result) {
        this.resultCallbacks.forEach(callback => {
            try {
                callback(result);
            } catch (error) {
                console.error('Result callback error:', error);
            }
        });
    }

    /**
     * Generate execution summary
     * @param {Object} executionResult - Execution result
     * @returns {Object} Summary
     */
    generateExecutionSummary(executionResult) {
        return {
            totalPatterns: executionResult.results.length + executionResult.errors.length,
            successfulPatterns: executionResult.results.length,
            failedPatterns: executionResult.errors.length,
            successRate: executionResult.results.length / (executionResult.results.length + executionResult.errors.length),
            failedPatternNames: executionResult.errors.map(error => error.patternName)
        };
    }

    /**
     * Get status message for progress updates
     * @param {string} status - Status code
     * @returns {string} Human readable status
     */
    getStatusMessage(status) {
        const statusMessages = {
            'pending': '待機中',
            'running': '実行中',
            'completed': '完了',
            'error': 'エラー',
            'cancelled': 'キャンセル',
            'skipped': 'スキップ',
            'initializing': '初期化中',
            'improving': '改良中',
            'executing': '実行中',
            'summarizing': '統合中'
        };

        return statusMessages[status] || status;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkflowManager;
} else {
    window.WorkflowManager = WorkflowManager;
}
