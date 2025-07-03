// ===== FRAGMENTATION UI MODULE =====
// UI display, interactions, loading states, and modals

// ===== MAIN DISPLAY FUNCTIONS =====

// Enhanced display function with classification and validation info
function displayFragmentationResults(fragmentationData) {
    console.log('displayFragmentationResults called with:', fragmentationData);
    
    // Try multiple possible selectors for the fragmentation results container
    let resultsContainer = document.querySelector('#fragmentation-results .fragmentation-list');
    if (!resultsContainer) {
        resultsContainer = document.querySelector('.fragmentation-results');
    }
    if (!resultsContainer) {
        resultsContainer = document.querySelector('#fragmentation-content .fragmentation-list');
    }
    if (!resultsContainer) {
        resultsContainer = document.querySelector('.fragmentation-content');
    }
    if (!resultsContainer) {
        // Find the parent container that contains fragmentation results
        const fragmentationSection = document.querySelector('[id*="fragmentation"], [class*="fragmentation"]');
        if (fragmentationSection) {
            // Look for a list-like container within it
            resultsContainer = fragmentationSection.querySelector('.fragmentation-list, .results-container, .content');
        }
    }
    
    if (!resultsContainer) {
        console.warn('Fragmentation results container not found, creating one');
        const fragmentationSection = document.querySelector('#fragmentation, .fragmentation-section');
        if (fragmentationSection) {
            // Create results container
            const newContainer = document.createElement('div');
            newContainer.id = 'fragmentation-results';
            newContainer.className = 'fragmentation-results';
            newContainer.style.display = 'block';
            
            // Create inner list container
            const listContainer = document.createElement('div');
            listContainer.className = 'fragmentation-list';
            newContainer.appendChild(listContainer);
            
            fragmentationSection.appendChild(newContainer);
            resultsContainer = listContainer;
            
            console.log('Created new results container:', resultsContainer);
        } else {
            console.error('Fragmentation section not found, cannot display results');
            return;
        }
    }
    
    console.log('Found results container:', resultsContainer);
    resultsContainer.innerHTML = '';
    
    // Show classification and summary
    if (fragmentationData.classification || fragmentationData.validationSummary) {
        const summaryElement = document.createElement('div');
        summaryElement.className = 'fragmentation-summary';
        summaryElement.innerHTML = createSummaryDisplay(fragmentationData);
        resultsContainer.appendChild(summaryElement);
    }
    
    // Get sites data from various possible locations
    let fragmentationSites = fragmentationData.fragmentationSites || 
                             fragmentationData.sites || 
                             fragmentationData.fragments || 
                             fragmentationData.majorFragments ||
                             [];
                             
    if (!Array.isArray(fragmentationSites)) {
        console.error('Invalid fragmentation sites data:', fragmentationSites);
        fragmentationSites = [];
    }
    
    console.log('Processing fragmentation sites:', fragmentationSites.length);
    
    if (fragmentationSites.length === 0) {
        resultsContainer.innerHTML = `<div class="no-results">
            <p>開裂サイトが予測されませんでした。</p>
            <button onclick="retryFragmentation()" class="retry-btn">再試行</button>
        </div>`;
        return;
    }
    
    // Sort fragments by priority/confidence
    const sortedFragments = fragmentationSites.sort((a, b) => {
        const priorityA = calculatePriorityScore(a);
        const priorityB = calculatePriorityScore(b);
        return priorityB - priorityA;
    });
    
    // Display each fragment with enhanced information
    sortedFragments.forEach((fragment, index) => {
        const fragmentItem = document.createElement('div');
        fragmentItem.className = 'fragmentation-item';
        
        // Create priority and confidence badges
        const priorityScore = calculatePriorityScore(fragment);
        const priorityLabel = getPriorityLabel(priorityScore);
        const priorityColor = getPriorityColor(priorityScore);
        
        const priorityBadge = `<span class="priority-badge" style="background-color: ${priorityColor}">${priorityLabel}</span>`;
        
        // Confidence badge
        const confidence = fragment.confidence || { level: 'medium', score: 50 };
        const confidenceBadge = `<span class="confidence-badge confidence-${confidence.level}">${confidence.level} (${confidence.score || 50}%)</span>`;
        
        // Experimental validation badge
        let experimentalMatchBadge = '';
        if (fragment.experimentalValidation) {
            const validation = fragment.experimentalValidation;
            const badgeClass = validation.isSupported ? 'experimental-supported' : 'experimental-not-supported';
            experimentalMatchBadge = `<span class="experimental-badge ${badgeClass}">
                ${validation.isSupported ? '✓ 実験的裏付け' : '○ 予測のみ'}
            </span>`;
        }
        
        fragmentItem.innerHTML = `
            <div class="fragment-header">
                <h4>フラグメント ${index + 1}: m/z ${fragment.mz || fragment.mass || 'Unknown'}</h4>
                <div class="badges">${priorityBadge}${confidenceBadge}${experimentalMatchBadge}</div>
            </div>
            <div class="fragment-details-concise">
                <div class="fragment-summary">
                    <span class="fragment-formula">${fragment.formula || 'Unknown'}</span>
                    <span class="fragment-mechanism">${fragment.mechanism || 'Unknown'}</span>
                    <span class="fragment-intensity">${fragment.intensity || 'Unknown'}</span>
                </div>
                <div class="fragment-actions">
                    <button onclick="highlightFragmentationSite(${JSON.stringify(fragment).replace(/"/g, '&quot;')}, ${index + 1})" 
                            class="highlight-btn">構造上で表示</button>
                    <button onclick="toggleFragmentDetails(this)" class="details-btn">詳細</button>
                </div>
                <div class="fragment-details-expanded" style="display: none;">
                    <p><strong>イオンタイプ:</strong> ${fragment.type || 'Unknown'}</p>
                    ${fragment.structure ? `<p><strong>構造:</strong> ${fragment.structure}</p>` : ''}
                    ${fragment.stabilizationFactors ? `<p><strong>安定化要因:</strong> ${fragment.stabilizationFactors}</p>` : ''}
                    ${fragment.confidence ? `
                    <div class="confidence-details">
                        <p><strong>信頼度:</strong> ${fragment.confidence.level || 'Unknown'} (${fragment.confidence.score || 'Unknown'}%)</p>
                        ${fragment.confidence.reasoning ? `<p><strong>根拠:</strong> ${fragment.confidence.reasoning}</p>` : ''}
                    </div>` : ''}
                    ${fragment.experimentalValidation ? `
                    <div class="experimental-validation">
                        <p><strong>実験的裏付け:</strong> ${fragment.experimentalValidation.isSupported ? 'あり' : 'なし'}</p>
                        <p><strong>理由:</strong> ${fragment.experimentalValidation.reason}</p>
                    </div>` : ''}
                </div>
            </div>
        `;
        
        resultsContainer.appendChild(fragmentItem);
        
        // Highlight fragmentation sites on 3D structure
        if (fragment.atomIndices && typeof highlightAtoms === 'function') {
            try {
                highlightAtoms(fragment.atomIndices, '#ff1744');
            } catch (error) {
                console.warn('Failed to highlight atoms on 3D structure:', error);
            }
        }
    });

    // Show results container
    const fragmentationResults = document.getElementById('fragmentation-results');
    if (fragmentationResults) {
        fragmentationResults.style.display = 'block';
    }
}

// Create summary display for fragmentation analysis
function createSummaryDisplay(fragmentationData) {
    let summaryHTML = '<div class="analysis-summary">';
    
    // Classification info
    if (fragmentationData.classification) {
        summaryHTML += `
            <div class="classification-info">
                <h4>🏷️ 化合物分類</h4>
                <p><strong>主要クラス:</strong> ${fragmentationData.classification.primaryClass || 'Unknown'}</p>
                <p><strong>サブクラス:</strong> ${fragmentationData.classification.subClass || 'Unknown'}</p>
                ${fragmentationData.classification.confidence ? 
                    `<p><strong>分類信頼度:</strong> ${fragmentationData.classification.confidence}%</p>` : ''}
            </div>
        `;
    }
    
    // Validation summary
    if (fragmentationData.validationSummary) {
        const summary = fragmentationData.validationSummary;
        summaryHTML += `
            <div class="validation-summary">
                <h4>📊 検証サマリー</h4>
                <div class="validation-stats">
                    <div class="stat-item">
                        <span class="stat-value">${summary.experimentallyValidated || 0}</span>
                        <span class="stat-label">実験的裏付け</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${summary.highConfidence || 0}</span>
                        <span class="stat-label">高信頼度予測</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${Math.round(summary.experimentalMatchRate || 0)}%</span>
                        <span class="stat-label">実験マッチ率</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    summaryHTML += '</div>';
    return summaryHTML;
}

// ===== MULTI-STAGE UI FUNCTIONS =====

// Show multi-stage loading interface
function showMultiStageLoading(show) {
    const loadingContainer = document.getElementById('multi-stage-loading');
    const fragmentationResults = document.getElementById('fragmentation-results');
    
    if (show) {
        if (loadingContainer) {
            loadingContainer.style.display = 'block';
        } else {
            createMultiStageLoadingInterface();
        }
        
        // Hide results while loading
        if (fragmentationResults) {
            fragmentationResults.style.display = 'none';
        }
        
        // Reset stage progress
        updateStageProgress('initialization', '多段階解析を初期化中...');
        
    } else {
        if (loadingContainer) {
            loadingContainer.style.display = 'none';
        }
    }
}

// Create multi-stage loading interface
function createMultiStageLoadingInterface() {
    const fragmentationSection = document.querySelector('#fragmentation, .fragmentation-section');
    if (!fragmentationSection) return;
    
    const loadingHTML = `
        <div id="multi-stage-loading" class="multi-stage-loading">
            <div class="loading-header">
                <h3>🔬 多段階化合物解析</h3>
                <p>包括的な化合物情報と開裂予測を実行しています...</p>
            </div>
            
            <div class="stage-progress">
                <div class="stage-item" id="stage-step1">
                    <div class="stage-icon">🤖</div>
                    <div class="stage-content">
                        <h4>Step 1: LLM化合物解析</h4>
                        <p>化学構造からの包括的推論実行中...</p>
                        <div class="progress-bar">
                            <div class="progress-fill"></div>
                        </div>
                    </div>
                </div>
                
                <div class="stage-item" id="stage-step2">
                    <div class="stage-icon">🗄️</div>
                    <div class="stage-content">
                        <h4>Step 2: データベース検索</h4>
                        <p>実験データベースから類似化合物を検索中...</p>
                        <div class="progress-bar">
                            <div class="progress-fill"></div>
                        </div>
                    </div>
                </div>
                
                <div class="stage-item" id="stage-step3">
                    <div class="stage-icon">⚙️</div>
                    <div class="stage-content">
                        <h4>Step 3: 統合解析</h4>
                        <p>結果統合による高精度推論（手動実行）</p>
                        <div class="progress-bar">
                            <div class="progress-fill"></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="loading-footer">
                <div class="loading-spinner"></div>
                <p id="current-stage-message">解析を準備しています...</p>
            </div>
        </div>
    `;
    
    fragmentationSection.insertAdjacentHTML('beforeend', loadingHTML);
}

// Update stage progress
function updateStageProgress(stage, message) {
    const messageElement = document.getElementById('current-stage-message');
    if (messageElement) {
        messageElement.textContent = message;
    }
    
    // Update specific stage status
    const stageMap = {
        'step1_llm': 'stage-step1',
        'step2_database': 'stage-step2', 
        'step3_integration': 'stage-step3',
        'parallel_execution': ['stage-step1', 'stage-step2']
    };
    
    const stageIds = Array.isArray(stageMap[stage]) ? stageMap[stage] : [stageMap[stage]];
    
    stageIds.forEach(stageId => {
        if (stageId) {
            const stageElement = document.getElementById(stageId);
            if (stageElement) {
                stageElement.classList.add('active');
                const progressBar = stageElement.querySelector('.progress-fill');
                if (progressBar) {
                    progressBar.style.width = '100%';
                }
            }
        }
    });
}

// Update stage icon and status
function updateStageIcon(stageId, icon, status) {
    const stageElement = document.getElementById(stageId);
    if (stageElement) {
        const iconElement = stageElement.querySelector('.stage-icon');
        if (iconElement) {
            iconElement.textContent = icon;
        }
        
        // Update status class
        stageElement.className = `stage-item ${status}`;
    }
}

// Display intermediate results (Step 1 & 2)
function displayIntermediateResults(step1Result, step2Result) {
    const fragmentationSection = document.querySelector('#fragmentation, .fragmentation-section');
    if (!fragmentationSection) return;
    
    // Remove loading interface
    const loadingElement = document.getElementById('multi-stage-loading');
    if (loadingElement) {
        loadingElement.remove();
    }
    
    const intermediateHTML = `
        <div id="intermediate-results" class="intermediate-results">
            <div class="intermediate-header">
                <h3>📊 中間結果表示</h3>
                <p>Step 1とStep 2の解析が完了しました。統合解析を実行できます。</p>
            </div>
            
            <div class="results-grid">
                <div class="result-panel step1-panel">
                    <h4>🤖 Step 1: LLM解析結果</h4>
                    <div class="result-content">${formatStep1Results(step1Result)}</div>
                </div>
                
                <div class="result-panel step2-panel">
                    <h4>🗄️ Step 2: データベース検索結果</h4>
                    <div class="result-content">${formatStep2Results(step2Result)}</div>
                </div>
            </div>
            
            <div class="integration-prompt">
                <div class="prompt-content">
                    <h4>🔬 次のステップ</h4>
                    <p>Step 1とStep 2の結果を統合して、より包括的で精度の高い解析を実行できます。</p>
                    <button id="execute-integration-btn" class="integration-btn" onclick="executeStep3Integration()">
                        統合解析を実行 (Step 3)
                    </button>
                </div>
            </div>
        </div>
    `;
    
    fragmentationSection.insertAdjacentHTML('beforeend', intermediateHTML);
}

// Format Step 1 results for display
function formatStep1Results(result) {
    if (!result || result.error) {
        return `<div class="error-message">LLM解析でエラーが発生しました</div>`;
    }
    
    let html = '<div class="step1-summary">';
    
    // Compound info
    if (result.compoundInfo) {
        html += `
            <div class="info-section">
                <h5>化合物情報</h5>
                <ul>
                    <li><strong>系統名:</strong> ${result.compoundInfo.systematicName || 'Unknown'}</li>
                    <li><strong>化合物クラス:</strong> ${result.compoundInfo.chemicalClass || 'Unknown'}</li>
                    <li><strong>生物活性:</strong> ${result.compoundInfo.biologicalActivity || 'Unknown'}</li>
                </ul>
            </div>
        `;
    }
    
    // Structural analysis
    if (result.structuralAnalysis) {
        html += `
            <div class="info-section">
                <h5>構造解析</h5>
                <ul>
                    <li><strong>官能基:</strong> ${Array.isArray(result.structuralAnalysis.functionalGroups) ? 
                        result.structuralAnalysis.functionalGroups.join(', ') : 'Unknown'}</li>
                    <li><strong>芳香環:</strong> ${result.structuralAnalysis.aromaticRings || 'Unknown'}</li>
                </ul>
            </div>
        `;
    }
    
    // Fragmentation prediction
    if (result.fragmentationPrediction?.likelyFragmentationSites) {
        html += `
            <div class="info-section">
                <h5>開裂予測 (${result.fragmentationPrediction.likelyFragmentationSites.length}サイト)</h5>
                <div class="fragmentation-preview">
                    ${result.fragmentationPrediction.likelyFragmentationSites.slice(0, 3).map(site => 
                        `<div class="site-preview">m/z ${site.fragmentMass} (${site.mechanism})</div>`
                    ).join('')}
                    ${result.fragmentationPrediction.likelyFragmentationSites.length > 3 ? 
                        `<div class="more-sites">...他 ${result.fragmentationPrediction.likelyFragmentationSites.length - 3}サイト</div>` : ''}
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    return html;
}

// Format Step 2 results for display
function formatStep2Results(result) {
    if (!result || !result.compounds) {
        return `<div class="error-message">データベース検索でエラーが発生しました</div>`;
    }
    
    let html = `
        <div class="step2-summary">
            <div class="search-stats">
                <h5>検索結果: ${result.totalFound || 0}件</h5>
                <div class="search-strategy-status">
                    ${result.searchStrategies?.smiles ? '✓ SMILES検索成功' : '✗ SMILES検索失敗'}<br>
                    ${result.searchStrategies?.mass ? '✓ 質量検索成功' : '✗ 質量検索失敗'}<br>
                    ${result.searchStrategies?.formula ? '✓ 分子式検索成功' : '✗ 分子式検索失敗'}
                </div>
            </div>
    `;
    
    if (result.compounds && result.compounds.length > 0) {
        html += `
            <div class="compounds-preview">
                <h5>上位化合物</h5>
                ${result.compounds.slice(0, 3).map(compound => `
                    <div class="compound-preview">
                        <div class="compound-name">${compound.name || 'Unknown'}</div>
                        <div class="compound-details">
                            ${compound.formula ? `${compound.formula} | ` : ''}
                            ${compound.exact_mass ? `${compound.exact_mass} Da | ` : ''}
                            ${compound.similarity ? `類似度: ${(compound.similarity * 100).toFixed(1)}%` : ''}
                        </div>
                    </div>
                `).join('')}
                ${result.compounds.length > 3 ? 
                    `<div class="more-compounds">...他 ${result.compounds.length - 3}化合物</div>` : ''}
            </div>
        `;
    }
    
    html += '</div>';
    return html;
}

// Show integration button
function showIntegrationButton() {
    const integrationBtn = document.getElementById('execute-integration-btn');
    if (integrationBtn) {
        integrationBtn.style.display = 'block';
        integrationBtn.disabled = false;
    }
}

// Display final integrated results
function displayFinalIntegratedResults(integrationResult) {
    const intermediateResults = document.getElementById('intermediate-results');
    if (intermediateResults) {
        intermediateResults.remove();
    }
    
    const fragmentationSection = document.querySelector('#fragmentation, .fragmentation-section');
    if (!fragmentationSection) return;
    
    const finalHTML = `
        <div id="final-integrated-results" class="final-integrated-results">
            <div class="final-header">
                <h3>🎯 統合解析結果</h3>
                <p>包括的な多段階解析が完了しました</p>
                <div class="confidence-badge confidence-${integrationResult.integratedAnalysis?.confidenceLevel || 'medium'}">
                    信頼度: ${integrationResult.integratedAnalysis?.confidenceLevel || 'medium'}
                </div>
            </div>
            
            <div class="final-content">
                ${formatIntegratedResults(integrationResult)}
            </div>
            
            <div class="final-actions">
                <button onclick="showAnalysisDetails()" class="action-btn detailed-btn">詳細解析表示</button>
                <button onclick="exportIntegratedResults()" class="action-btn export-btn">結果エクスポート</button>
                <button onclick="restartAnalysis()" class="action-btn restart-btn">解析再実行</button>
            </div>
        </div>
    `;
    
    fragmentationSection.insertAdjacentHTML('beforeend', finalHTML);
}

// Format integrated results
function formatIntegratedResults(result) {
    let html = '<div class="integrated-content">';
    
    // Key findings
    if (result.integratedAnalysis?.keyFindings) {
        html += `
            <div class="findings-section">
                <h4>🔍 主要発見</h4>
                <ul>
                    ${result.integratedAnalysis.keyFindings.map(finding => 
                        `<li>${finding}</li>`
                    ).join('')}
                </ul>
            </div>
        `;
    }
    
    // Enhanced predictions
    if (result.enhancedPredictions) {
        html += `
            <div class="predictions-section">
                <h4>🎯 強化予測</h4>
                <div class="prediction-grid">
                    ${result.enhancedPredictions.structuralInsights ? 
                        `<div class="prediction-item">
                            <h5>構造的洞察</h5>
                            <p>${result.enhancedPredictions.structuralInsights}</p>
                        </div>` : ''}
                    ${result.enhancedPredictions.fragmentationRefinement ? 
                        `<div class="prediction-item">
                            <h5>開裂予測改良</h5>
                            <p>${result.enhancedPredictions.fragmentationRefinement}</p>
                        </div>` : ''}
                </div>
            </div>
        `;
    }
    
    // Comprehensive assessment
    if (result.comprehensiveAssessment) {
        html += `
            <div class="assessment-section">
                <h4>📊 包括的評価</h4>
                <div class="assessment-grid">
                    ${Object.entries(result.comprehensiveAssessment).map(([key, value]) => 
                        `<div class="assessment-item">
                            <h5>${translateAssessmentKey(key)}</h5>
                            <p>${value}</p>
                        </div>`
                    ).join('')}
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    return html;
}

// Translate assessment keys to Japanese
function translateAssessmentKey(key) {
    const translations = {
        'novelty': '新規性',
        'druglikeness': 'Drug-likeness',
        'toxicityRisk': '毒性リスク',
        'synthesisAccessibility': '合成アクセシビリティ'
    };
    return translations[key] || key;
}

// ===== LOADING AND ERROR FUNCTIONS =====

// Show fragmentation loading state
function showFragmentationLoading(show) {
    console.log('showFragmentationLoading called with:', show);
    
    // Try multiple selectors for loading element
    let loadingElement = document.getElementById('fragmentation-loading');
    if (!loadingElement) {
        loadingElement = document.querySelector('.fragmentation-loading');
    }
    
    // Try multiple selectors for predict button
    let predictBtn = document.getElementById('predict-fragmentation');
    if (!predictBtn) {
        predictBtn = document.querySelector('button[onclick*="fragmentation"], button[id*="fragmentation"]');
    }
    
    console.log('Loading element found:', loadingElement);
    console.log('Predict button found:', predictBtn);
    
    if (show) {
        if (loadingElement) {
            loadingElement.style.display = 'flex';
        } else {
            // Create dynamic loading message
            const fragmentationSection = document.querySelector('#fragmentation, .fragmentation-section');
            if (fragmentationSection) {
                let dynamicLoading = document.getElementById('dynamic-fragmentation-loading');
                if (!dynamicLoading) {
                    dynamicLoading = document.createElement('div');
                    dynamicLoading.id = 'dynamic-fragmentation-loading';
                    dynamicLoading.textContent = 'Analyzing fragmentation patterns...';
                    dynamicLoading.style.cssText = 'padding: 20px; text-align: center; color: #666; font-style: italic; background: #f9f9f9; border-radius: 8px; margin: 10px 0;';
                    fragmentationSection.appendChild(dynamicLoading);
                }
                dynamicLoading.style.display = 'block';
            }
        }
        
        if (predictBtn) {
            predictBtn.disabled = true;
        }
    } else {
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        // Remove dynamic loading message
        const dynamicLoading = document.getElementById('dynamic-fragmentation-loading');
        if (dynamicLoading) {
            dynamicLoading.style.display = 'none';
        }
        
        if (predictBtn) {
            predictBtn.disabled = false;
        }
    }
}

// Show fragmentation error message
function showFragmentationError(message) {
    console.log('showFragmentationError called with:', message);
    
    // Hide any loading states first
    showFragmentationLoading(false);
    if (typeof showMultiStageLoading === 'function') {
        showMultiStageLoading(false);
    }
    
    let errorContainer = document.getElementById('fragmentation-error');
    if (!errorContainer) {
        // Create error container dynamically
        const fragmentationSection = document.querySelector('#fragmentation, .fragmentation-section');
        if (fragmentationSection) {
            errorContainer = document.createElement('div');
            errorContainer.id = 'fragmentation-error';
            errorContainer.className = 'error-message';
            errorContainer.style.cssText = `
                background: #ffebee;
                border: 1px solid #f44336;
                border-radius: 8px;
                padding: 15px;
                margin: 10px 0;
                color: #c62828;
            `;
            fragmentationSection.appendChild(errorContainer);
        }
    }
    
    if (errorContainer) {
        errorContainer.innerHTML = `
            <div class="error-content">
                <h4 style="margin: 0 0 10px 0; color: #c62828;">⚠️ エラーが発生しました</h4>
                <p style="margin: 0 0 15px 0;">${message}</p>
                <div class="error-actions">
                    <button onclick="retryFragmentation()" class="retry-btn" style="
                        background: #4caf50; 
                        color: white; 
                        border: none; 
                        padding: 8px 16px; 
                        border-radius: 4px; 
                        margin-right: 10px; 
                        cursor: pointer;
                    ">再試行</button>
                    <button onclick="hideFragmentationError()" class="dismiss-btn" style="
                        background: #999; 
                        color: white; 
                        border: none; 
                        padding: 8px 16px; 
                        border-radius: 4px; 
                        cursor: pointer;
                    ">閉じる</button>
                </div>
            </div>
        `;
        errorContainer.style.display = 'block';
    }
    
    // Also show as a simple alert if container creation failed
    if (!errorContainer) {
        alert(`フラグメンテーション解析エラー: ${message}`);
    }
}

// Hide fragmentation error message
function hideFragmentationError() {
    const errorContainer = document.getElementById('fragmentation-error');
    if (errorContainer) {
        errorContainer.style.display = 'none';
    }
}

// Retry fragmentation analysis
function retryFragmentation() {
    if (window.FragmentationCore?.predictFragmentation) {
        window.FragmentationCore.predictFragmentation();
    } else {
        // Fallback
        predictFragmentation();
    }
}

// ===== MODAL AND INTERACTION FUNCTIONS =====

// Show analysis details modal
function showAnalysisDetails() {
    if (!window.FragmentationCore?.currentFragmentationData) {
        showFragmentationError('No analysis data available');
        return;
    }
    
    // Populate modal content
    populateAnalysisModal();
    
    // Show modal
    const modal = document.getElementById('analysis-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
    
    // Setup tab switching
    setupTabSwitching();
}

// Close analysis modal
function closeAnalysisModal() {
    const modal = document.getElementById('analysis-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Populate analysis modal with data
function populateAnalysisModal() {
    const modalContent = document.getElementById('modal-content');
    if (!modalContent) return;
    
    const analysisData = window.FragmentationCore?.multiStageAnalysis?.results || {};
    
    modalContent.innerHTML = `
        <div class="modal-header">
            <h3>📊 詳細解析データ</h3>
            <button onclick="closeAnalysisModal()" class="close-btn">×</button>
        </div>
        
        <div class="modal-tabs">
            <button class="tab-btn active" data-tab="step1">Step 1: LLM解析</button>
            <button class="tab-btn" data-tab="step2">Step 2: データベース</button>
            <button class="tab-btn" data-tab="step3">Step 3: 統合</button>
            <button class="tab-btn" data-tab="timings">実行時間</button>
        </div>
        
        <div class="modal-body">
            <div class="tab-content active" id="tab-step1">
                <pre>${JSON.stringify(analysisData.step1_llm, null, 2)}</pre>
            </div>
            <div class="tab-content" id="tab-step2">
                <pre>${JSON.stringify(analysisData.step2_database, null, 2)}</pre>
            </div>
            <div class="tab-content" id="tab-step3">
                <pre>${JSON.stringify(analysisData.step3_integration, null, 2)}</pre>
            </div>
            <div class="tab-content" id="tab-timings">
                <pre>${JSON.stringify(window.FragmentationCore?.multiStageAnalysis?.stageTimings, null, 2)}</pre>
            </div>
        </div>
    `;
}

// Setup tab switching functionality
function setupTabSwitching() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            btn.classList.add('active');
            const targetContent = document.getElementById(`tab-${targetTab}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

// ===== HIGHLIGHTING AND INTERACTION =====

// Highlight fragmentation site on 3D structure
function highlightFragmentationSite(site, siteNumber) {
    console.log('Highlighting fragmentation site:', site, siteNumber);
    
    if (window.currentViewMode === '3d' && typeof highlightAtoms === 'function') {
        const atomIndices = generateAtomIndicesFromSite(site);
        highlightAtoms(atomIndices, '#ff1744');
    }
    
    if (typeof changeViewMode === 'function') {
        changeViewMode('3d');
    }
    
    // Visual feedback removed per user request - no notification messages needed
    
    // Add label if function is available
    if (typeof addFragmentationLabel === 'function') {
        addFragmentationLabel(site, siteNumber);
    }
    
    // Also highlight in 2D if available
    if (window.currentViewMode === '2d') {
        show2DFragmentationHighlight(site, siteNumber);
    }
}

// Generate atom indices from site data
function generateAtomIndicesFromSite(site) {
    // Try to extract actual atom indices from site data
    if (site.atomIndices && Array.isArray(site.atomIndices)) {
        return site.atomIndices;
    }
    
    // If no real indices available, return empty array
    return [];
}

// Show 2D fragmentation highlight
function show2DFragmentationHighlight(site, siteNumber) {
    console.log('2D highlight not implemented yet');
    // Placeholder for 2D highlighting
}

// Show fragmentation highlight message
function showFragmentationHighlight(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `fragmentation-alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 1000;
        padding: 12px 20px; border-radius: 6px; color: white;
        background-color: ${type === 'success' ? '#4CAF50' : '#f44336'};
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// Toggle fragment details visibility
function toggleFragmentDetails(button) {
    const fragmentItem = button.closest('.fragmentation-item');
    const expandedDetails = fragmentItem.querySelector('.fragment-details-expanded');
    
    if (expandedDetails) {
        if (expandedDetails.style.display === 'none') {
            expandedDetails.style.display = 'block';
            button.textContent = '折りたたむ';
        } else {
            expandedDetails.style.display = 'none';
            button.textContent = '詳細';
        }
    }
}

// ===== MODULE EXPORTS =====
const FragmentationUI = {
    // Main display functions
    displayFragmentationResults,
    createSummaryDisplay,
    
    // Multi-stage UI
    showMultiStageLoading,
    updateStageProgress,
    updateStageIcon,
    displayIntermediateResults,
    displayFinalIntegratedResults,
    formatStep1Results,
    formatStep2Results,
    showIntegrationButton,
    
    // Loading and error handling
    showFragmentationLoading,
    showFragmentationError,
    hideFragmentationError,
    retryFragmentation,
    
    // Modal and interaction
    showAnalysisDetails,
    closeAnalysisModal,
    populateAnalysisModal,
    setupTabSwitching,
    
    // Highlighting and interaction
    highlightFragmentationSite,
    showFragmentationHighlight,
    toggleFragmentDetails
};

// Export to global scope for module coordination
window.FragmentationUI = FragmentationUI; 