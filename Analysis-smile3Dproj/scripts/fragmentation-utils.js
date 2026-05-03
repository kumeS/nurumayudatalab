// ===== FRAGMENTATION UTILITIES MODULE =====
// Chemical calculations, data transformations, and helper functions

// ===== CHEMICAL CALCULATION FUNCTIONS =====

// Calculate common neutral losses based on molecular weight and formula
function calculateCommonNeutralLosses(molecularWeight, formula) {
    const losses = [];
    const elements = parseElementCounts(formula);
    
    // Common neutral losses with probabilities
    const commonLosses = [
        { name: 'H2O', mass: 18.0106, type: 'water_loss', elements: { H: 2, O: 1 } },
        { name: 'NH3', mass: 17.0265, type: 'ammonia_loss', elements: { N: 1, H: 3 } },
        { name: 'CO2', mass: 43.9898, type: 'co2_loss', elements: { C: 1, O: 2 } },
        { name: 'CO', mass: 27.9949, type: 'co_loss', elements: { C: 1, O: 1 } },
        { name: 'CH3', mass: 15.0235, type: 'methyl_loss', elements: { C: 1, H: 3 } },
        { name: 'C2H5', mass: 29.0391, type: 'ethyl_loss', elements: { C: 2, H: 5 } },
        { name: 'CHO', mass: 29.0027, type: 'formyl_loss', elements: { C: 1, H: 1, O: 1 } },
        { name: 'COOH', mass: 45.0178, type: 'carboxyl_loss', elements: { C: 1, O: 2, H: 1 } },
        { name: 'C2H4', mass: 28.0313, type: 'ethylene_loss', elements: { C: 2, H: 4 } },
        { name: 'SO2', mass: 63.9619, type: 'so2_loss', elements: { S: 1, O: 2 } }
    ];
    
    commonLosses.forEach(loss => {
        // Check if molecule contains required elements
        const canLose = Object.entries(loss.elements).every(([element, count]) => 
            (elements[element] || 0) >= count
        );
        
        if (canLose) {
            const fragmentMass = molecularWeight - loss.mass;
            if (fragmentMass > 50) { // Reasonable minimum fragment mass
                losses.push({
                    type: loss.type,
                    name: loss.name,
                    mass: loss.mass,
                    fragmentMass: fragmentMass,
                    probability: calculateLossProbability(formula, loss.type)
                });
            }
        }
    });
    
    return losses.sort((a, b) => b.probability - a.probability);
}

// Calculate probability of specific neutral loss
function calculateLossProbability(formula, lossType) {
    const elements = parseElementCounts(formula);
    
    const probabilities = {
        'water_loss': elements.O ? Math.min(0.8, elements.O * 0.3) : 0,
        'ammonia_loss': elements.N ? Math.min(0.7, elements.N * 0.4) : 0,
        'co2_loss': elements.O >= 2 ? Math.min(0.6, elements.O * 0.2) : 0,
        'co_loss': elements.O ? Math.min(0.5, elements.O * 0.15) : 0,
        'methyl_loss': elements.C ? Math.min(0.7, elements.C * 0.1) : 0,
        'ethyl_loss': elements.C >= 2 ? Math.min(0.6, elements.C * 0.08) : 0,
        'formyl_loss': (elements.C && elements.O) ? Math.min(0.5, elements.C * 0.1) : 0,
        'carboxyl_loss': elements.O >= 2 ? Math.min(0.8, elements.O * 0.2) : 0,
        'ethylene_loss': elements.C >= 2 ? Math.min(0.4, elements.C * 0.05) : 0,
        'so2_loss': elements.S ? Math.min(0.9, elements.S * 0.6) : 0
    };
    
    return probabilities[lossType] || 0.1;
}

// Parse element counts from molecular formula
function parseElementCounts(formula) {
    const elements = {};
    const regex = /([A-Z][a-z]?)(\d*)/g;
    let match;
    
    while ((match = regex.exec(formula)) !== null) {
        const element = match[1];
        const count = parseInt(match[2]) || 1;
        elements[element] = count;
    }
    
    return elements;
}

// Get mass range category
function getMassRange(mass) {
    if (mass < 150) return 'small';
    if (mass < 300) return 'medium';
    if (mass < 500) return 'large';
    return 'very_large';
}

// Get intensity range category
function getIntensityRange(intensity) {
    if (intensity >= 80) return 'very_high';
    if (intensity >= 60) return 'high';
    if (intensity >= 40) return 'medium';
    return 'low';
}

// ===== CONFIDENCE ASSESSMENT FUNCTIONS =====

// Calculate confidence boost based on experimental patterns
function calculateConfidenceBoost(experimentalPatterns, fragmentationData) {
    if (!experimentalPatterns || !fragmentationData) {
        return 0;
    }
    
    let boost = 0;
    const baseBoost = experimentalPatterns.reliabilityScore / 100;
    
    // Boost based on experimental pattern matches
    if (fragmentationData.fragmentationSites) {
        fragmentationData.fragmentationSites.forEach(site => {
            if (site.experimentalValidation?.isSupported) {
                boost += baseBoost * 0.2;
            }
        });
    }
    
    // Pattern consistency boost
    if (experimentalPatterns.commonPatterns?.length > 0) {
        boost += baseBoost * 0.1;
    }
    
    return Math.min(boost, 0.5); // Cap at 50% boost
}

// Assess advanced confidence for fragmentation sites
function assessAdvancedConfidence(site, experimentalData, validation) {
    let confidence = {
        level: 'medium',
        score: 50,
        reasoning: 'Standard prediction',
        factors: []
    };
    
    let score = 50;
    let factors = [];
    
    // Mechanism-based confidence
    const mechanismConfidence = {
        'alpha_cleavage': 80,
        'benzylic_cleavage': 85,
        'mclafferty': 75,
        'simple_break': 60,
        'radical_cleavage': 70
    };
    
    if (site.mechanism && mechanismConfidence[site.mechanism]) {
        score = mechanismConfidence[site.mechanism];
        factors.push(`${site.mechanism} mechanism (${mechanismConfidence[site.mechanism]}%)`);
    }
    
    // Probability adjustment
    if (site.probability === 'high') {
        score += 15;
        factors.push('High probability prediction (+15%)');
    } else if (site.probability === 'low') {
        score -= 10;
        factors.push('Low probability prediction (-10%)');
    }
    
    // Experimental validation adjustment
    if (validation?.isSupported) {
        score += 20;
        factors.push('Experimental validation (+20%)');
        if (validation.confidence === 'high') {
            score += 10;
            factors.push('High experimental confidence (+10%)');
        }
    } else if (validation && !validation.isSupported) {
        score -= 15;
        factors.push('No experimental support (-15%)');
    }
    
    // Experimental data availability
    if (experimentalData && experimentalData.length > 0) {
        score += 5;
        factors.push(`${experimentalData.length} experimental compounds (+5%)`);
    }
    
    // Normalize score
    score = Math.max(0, Math.min(100, score));
    
    // Determine confidence level
    if (score >= 80) {
        confidence.level = 'high';
    } else if (score >= 60) {
        confidence.level = 'medium';
    } else {
        confidence.level = 'low';
    }
    
    confidence.score = Math.round(score);
    confidence.factors = factors;
    confidence.reasoning = factors.join('; ');
    
    return confidence;
}

// Assess confidence for fragments
function assessFragmentConfidence(fragment, experimentalData) {
    let confidence = {
        level: 'medium',
        score: 50,
        reasoning: 'Standard fragment prediction'
    };
    
    let score = 50;
    
    // Intensity-based confidence
    if (fragment.intensity) {
        const intensity = parseFloat(fragment.intensity);
        if (intensity >= 80) {
            score += 20;
        } else if (intensity >= 50) {
            score += 10;
        } else if (intensity < 20) {
            score -= 15;
        }
    }
    
    // Ion type confidence
    const ionTypeConfidence = {
        'molecular_ion': 90,
        'base_peak': 85,
        'fragment_ion': 70,
        'adduct_ion': 60
    };
    
    if (fragment.type && ionTypeConfidence[fragment.type]) {
        score = Math.max(score, ionTypeConfidence[fragment.type]);
    }
    
    // Experimental data boost
    if (experimentalData && experimentalData.length > 0) {
        score += 5;
    }
    
    score = Math.max(0, Math.min(100, score));
    
    if (score >= 80) {
        confidence.level = 'high';
    } else if (score >= 60) {
        confidence.level = 'medium';
    } else {
        confidence.level = 'low';
    }
    
    confidence.score = Math.round(score);
    return confidence;
}

// Assess advanced fragment confidence with experimental match
function assessAdvancedFragmentConfidence(fragment, experimentalData, experimentalMatch) {
    let confidence = assessFragmentConfidence(fragment, experimentalData);
    
    // Experimental match adjustment
    if (experimentalMatch) {
        confidence.score += 25;
        confidence.reasoning += '; Experimental match found';
        
        if (experimentalMatch.massAccuracy < 0.01) {
            confidence.score += 10;
            confidence.reasoning += '; High mass accuracy';
        }
    } else {
        confidence.score -= 10;
        confidence.reasoning += '; No experimental match';
    }
    
    // Normalize and update level
    confidence.score = Math.max(0, Math.min(100, confidence.score));
    
    if (confidence.score >= 80) {
        confidence.level = 'high';
    } else if (confidence.score >= 60) {
        confidence.level = 'medium';
    } else {
        confidence.level = 'low';
    }
    
    return confidence;
}

// ===== PRIORITY AND SCORING FUNCTIONS =====

// Calculate priority score for sites
function calculatePriorityScore(site) {
    let score = 0;
    
    // Base score from probability
    if (site.probability === 'high') score += 30;
    else if (site.probability === 'medium') score += 20;
    else score += 10;
    
    // Mechanism-based scoring
    const mechanismScores = {
        'alpha_cleavage': 25,
        'benzylic_cleavage': 30,
        'mclafferty': 25,
        'simple_break': 15,
        'radical_cleavage': 20
    };
    score += mechanismScores[site.mechanism] || 10;
    
    // Confidence boost
    if (site.confidence?.score) {
        score += site.confidence.score * 0.3;
    }
    
    // Experimental validation boost
    if (site.experimentalValidation?.isSupported) {
        score += 20;
    }
    
    // Add random variation to avoid ties
    score += Math.random() * 5;
    
    return score;
}

// Calculate priority score for fragments
function calculateFragmentPriorityScore(fragment) {
    let score = 0;
    
    // Intensity-based scoring
    const intensity = parseFloat(fragment.intensity || 50);
    score += intensity * 0.5;
    
    // Ion type scoring
    const ionTypeScores = {
        'molecular_ion': 30,
        'base_peak': 35,
        'fragment_ion': 25,
        'adduct_ion': 15
    };
    score += ionTypeScores[fragment.type] || 20;
    
    // Confidence scoring
    if (fragment.confidence?.score) {
        score += fragment.confidence.score * 0.2;
    }
    
    // Experimental match boost
    if (fragment.experimentalMatch) {
        score += 15;
    }
    
    return score;
}

// Get priority label based on score
function getPriorityLabel(score) {
    if (score >= 80) return 'Very High';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Medium';
    if (score >= 20) return 'Low';
    return 'Very Low';
}

// Get priority color based on score
function getPriorityColor(score) {
    if (score >= 80) return '#d32f2f';  // Red
    if (score >= 60) return '#f57c00';  // Orange
    if (score >= 40) return '#fbc02d';  // Yellow
    if (score >= 20) return '#689f38';  // Light Green
    return '#388e3c';                   // Green
}

// ===== VALIDATION AND SUMMARY FUNCTIONS =====

// Create advanced validation summary with detailed statistics
function createAdvancedValidationSummary(result, experimentalData, experimentalFragments) {
    const summary = {
        experimentallyValidated: 0,
        highConfidence: 0,
        experimentalConfirmed: 0,
        overallConfidence: 0,
        experimentalDataSources: experimentalData ? experimentalData.length : 0,
        experimentalFragmentsUsed: experimentalFragments ? experimentalFragments.length : 0,
        llmPredictionsTotal: 0,
        experimentalMatchRate: 0,
        integrationQuality: 'unknown'
    };
    
    let totalConfidenceScore = 0;
    let sitesProcessed = 0;
    
    if (result.fragmentationSites) {
        result.fragmentationSites.forEach(site => {
            sitesProcessed++;
            
            // Count confidence levels
            if (site.confidence?.level === 'experimental') {
                summary.experimentalConfirmed++;
            } else if (site.confidence?.level === 'high') {
                summary.highConfidence++;
            }
            
            // Count experimental validation
            if (site.experimentalValidation?.isSupported) {
                summary.experimentallyValidated++;
            }
            
            // Accumulate confidence scores
            totalConfidenceScore += site.confidence?.score || 0;
        });
        
        summary.llmPredictionsTotal = sitesProcessed;
    }
    
    // Calculate overall confidence
    if (sitesProcessed > 0) {
        summary.overallConfidence = Math.round(totalConfidenceScore / sitesProcessed);
    }
    
    // Calculate experimental match rate
    if (summary.llmPredictionsTotal > 0) {
        summary.experimentalMatchRate = Math.round(
            (summary.experimentallyValidated / summary.llmPredictionsTotal) * 100
        );
    }
    
    // Determine integration quality
    if (summary.experimentalMatchRate >= 70 && summary.experimentalDataSources >= 3) {
        summary.integrationQuality = 'excellent';
    } else if (summary.experimentalMatchRate >= 50 && summary.experimentalDataSources >= 2) {
        summary.integrationQuality = 'good';
    } else if (summary.experimentalMatchRate >= 30 || summary.experimentalDataSources >= 1) {
        summary.integrationQuality = 'fair';
    } else {
        summary.integrationQuality = 'limited';
    }
    
    return summary;
}

// ===== DATA ANALYSIS FUNCTIONS =====

// Analyze experimental gaps between LLM predictions and experimental data
function analyzeExperimentalGaps(fragmentationData, experimentalData) {
    const gaps = {
        identifiedGaps: [],
        experimentalDiscrepancies: [],
        improvementFocus: '',
        recommendations: []
    };
    
    if (!experimentalData || experimentalData.length === 0) {
        gaps.improvementFocus = 'No experimental data available for validation';
        return gaps;
    }
    
    // Extract experimental fragments
    const experimentalFragments = window.FragmentationDatabase?.extractExperimentalFragments(experimentalData) || [];
    
    // Find predicted sites with low experimental support
    if (fragmentationData.fragmentationSites) {
        fragmentationData.fragmentationSites.forEach((site, index) => {
            if (!site.experimentalValidation?.isSupported) {
                gaps.identifiedGaps.push({
                    type: 'unsupported_prediction',
                    description: `Predicted site ${index + 1} (m/z ${site.fragmentMass}) lacks experimental support`,
                    site: site
                });
            }
        });
    }
    
    // Find experimental fragments not predicted
    const predictedMasses = new Set(
        (fragmentationData.fragmentationSites || []).map(site => 
            parseFloat(site.fragmentMass || site.mass || 0)
        ).filter(mass => mass > 0)
    );
    
    experimentalFragments.forEach(expFragment => {
        if (expFragment.type === 'molecular_ion') return;
        
        const isAlreadyPredicted = Array.from(predictedMasses).some(predMass => 
            Math.abs(predMass - expFragment.mass) <= 0.1
        );
        
        if (!isAlreadyPredicted && expFragment.intensity > 20) {
            gaps.identifiedGaps.push({
                type: 'missing_prediction',
                description: `Experimental fragment at m/z ${expFragment.mass} not predicted`,
                experimentalFragment: expFragment
            });
        }
    });
    
    // Identify experimental discrepancies
    experimentalData.forEach(compound => {
        if (compound.formula && fragmentationData.molecularFormula) {
            if (compound.formula !== fragmentationData.molecularFormula) {
                gaps.experimentalDiscrepancies.push(
                    `Formula mismatch: predicted ${fragmentationData.molecularFormula}, experimental ${compound.formula}`
                );
            }
        }
    });
    
    // Create improvement focus
    if (gaps.identifiedGaps.length === 0) {
        gaps.improvementFocus = 'Predictions are well-supported by experimental data';
    } else {
        const unsupportedCount = gaps.identifiedGaps.filter(gap => gap.type === 'unsupported_prediction').length;
        const missingCount = gaps.identifiedGaps.filter(gap => gap.type === 'missing_prediction').length;
        
        gaps.improvementFocus = `Found ${unsupportedCount} unsupported predictions and ${missingCount} missing experimental fragments`;
        
        // Add recommendations
        if (unsupportedCount > 0) {
            gaps.recommendations.push('Re-evaluate fragmentation sites with low experimental support');
        }
        if (missingCount > 0) {
            gaps.recommendations.push('Consider additional fragmentation pathways observed experimentally');
        }
    }
    
    return gaps;
}

// Merge improvement results with original data
function mergeImprovementResults(originalData, improvedData, gaps) {
    const mergedData = { ...originalData };
    
    if (!improvedData || improvedData.error) {
        return mergedData;
    }
    
    // Merge fragmentation sites
    if (improvedData.fragmentationSites) {
        const improvedSites = improvedData.fragmentationSites;
        const originalSites = mergedData.fragmentationSites || [];
        
        // Replace low-confidence original sites with improved ones
        const mergedSites = [...originalSites];
        
        improvedSites.forEach(improvedSite => {
            const existingIndex = originalSites.findIndex(originalSite => 
                Math.abs(
                    parseFloat(originalSite.fragmentMass || originalSite.mass || 0) - 
                    parseFloat(improvedSite.fragmentMass || improvedSite.mass || 0)
                ) <= 0.1
            );
            
            if (existingIndex !== -1) {
                // Replace existing site
                mergedSites[existingIndex] = {
                    ...mergedSites[existingIndex],
                    ...improvedSite,
                    improved: true,
                    originalPrediction: originalSites[existingIndex]
                };
            } else {
                // Add new site
                mergedSites.push({
                    ...improvedSite,
                    improved: true,
                    newlyDiscovered: true
                });
            }
        });
        
        mergedData.fragmentationSites = mergedSites;
    }
    
    // Update validation summary if available
    if (improvedData.validationSummary) {
        mergedData.validationSummary = {
            ...mergedData.validationSummary,
            ...improvedData.validationSummary
        };
    }
    
    return mergedData;
}

// ===== SESSION STORAGE FUNCTIONS =====

// Save data to session storage
function saveToSessionStorage() {
    try {
        const coreModule = window.FragmentationCore;
        if (!coreModule) return;
        
        if (coreModule.currentMolecule) {
            sessionStorage.setItem(coreModule.STORAGE_KEYS.molecule, JSON.stringify(coreModule.currentMolecule));
        }
        if (coreModule.currentFragmentationData) {
            sessionStorage.setItem(coreModule.STORAGE_KEYS.fragmentation, JSON.stringify(coreModule.currentFragmentationData));
        }
        if (coreModule.experimentalFragmentationData) {
            sessionStorage.setItem(coreModule.STORAGE_KEYS.experimental, JSON.stringify(coreModule.experimentalFragmentationData));
        }
        // Save analysis details for transparency
        if (coreModule.analysisDetails && (coreModule.analysisDetails.rawResponse || coreModule.analysisDetails.queries.length > 0)) {
            sessionStorage.setItem('smile3d_analysis_details', JSON.stringify(coreModule.analysisDetails));
        }
    } catch (error) {
        console.warn('Failed to save to session storage:', error);
    }
}

// Load data from session storage
function loadFromSessionStorage() {
    try {
        const coreModule = window.FragmentationCore;
        if (!coreModule) return;
        
        // Load molecule data (coordination with molecular.js)
        const savedMolecule = sessionStorage.getItem(coreModule.STORAGE_KEYS.molecule);
        if (savedMolecule && !window.currentMolecule) {
            window.currentMolecule = JSON.parse(savedMolecule);
        }
        
        // Load fragmentation data
        const savedFragmentation = sessionStorage.getItem(coreModule.STORAGE_KEYS.fragmentation);
        if (savedFragmentation) {
            coreModule.currentFragmentationData = JSON.parse(savedFragmentation);
        }
        
        // Load experimental data
        const savedExperimental = sessionStorage.getItem(coreModule.STORAGE_KEYS.experimental);
        if (savedExperimental) {
            coreModule.experimentalFragmentationData = JSON.parse(savedExperimental);
        }
        
        // Load analysis details if available
        const savedAnalysisDetails = sessionStorage.getItem('smile3d_analysis_details');
        if (savedAnalysisDetails) {
            try {
                const parsedDetails = JSON.parse(savedAnalysisDetails);
                coreModule.analysisDetails = { ...coreModule.analysisDetails, ...parsedDetails };
            } catch (error) {
                console.warn('Failed to parse saved analysis details:', error);
            }
        }
    } catch (error) {
        console.warn('Failed to load from session storage:', error);
    }
}

// Clear session storage
function clearSessionStorage() {
    try {
        const coreModule = window.FragmentationCore;
        if (!coreModule) return;
        
        sessionStorage.removeItem(coreModule.STORAGE_KEYS.molecule);
        sessionStorage.removeItem(coreModule.STORAGE_KEYS.fragmentation);
        sessionStorage.removeItem(coreModule.STORAGE_KEYS.experimental);
        sessionStorage.removeItem('smile3d_analysis_details');
    } catch (error) {
        console.warn('Failed to clear session storage:', error);
    }
}

// ===== CHEMICAL KNOWLEDGE FUNCTIONS =====

// Get detailed mechanism information
function getDetailedMechanismInfo(mechanismKey) {
    const FRAGMENTATION_CLASSIFIER = {
        mechanism: {
            'alpha_cleavage': {
                name: 'α開裂',
                description: 'ヘテロ原子に隣接する炭素結合の切断',
                energetics: 'カルボカチオンまたはラジカル形成により比較的低エネルギー',
                examples: ['アルコール', 'アミン', 'エーテル']
            },
            'benzylic_cleavage': {
                name: 'ベンジル開裂',
                description: 'ベンジル位での結合切断',
                energetics: 'ベンジルカチオンの共鳴安定化により有利',
                examples: ['ベンジルアルコール', 'フェニルアルキル化合物']
            },
            'mclafferty': {
                name: 'マクラファティ転位',
                description: '6員環遷移状態を経由する水素転位反応',
                energetics: '協奏的反応で中程度のエネルギー',
                examples: ['カルボニル化合物', 'エステル']
            }
        }
    };
    
    const mechanism = FRAGMENTATION_CLASSIFIER.mechanism[mechanismKey];
    if (mechanism && typeof mechanism === 'object') {
        return mechanism;
    }
    
    // Fallback: Provide basic chemical knowledge for any mechanism
    return getBasicMechanismInfo(mechanismKey, mechanism);
}

// Get basic mechanism information as fallback
function getBasicMechanismInfo(mechanismKey, mechanismName) {
    // Map of basic mechanism information
    const basicInfo = {
        'simple_break': {
            name: '単純切断',
            description: '結合の直接的な切断',
            energetics: '結合エネルギーに依存',
            examples: ['C-C結合切断', 'C-N結合切断']
        },
        'radical_cleavage': {
            name: 'ラジカル開裂',
            description: 'ラジカル種を経由する結合切断',
            energetics: 'ラジカル安定性に依存',
            examples: ['三級炭素位', 'ベンジル位']
        },
        'rearrangement': {
            name: '転位反応',
            description: '分子内転位を伴う開裂',
            energetics: '遷移状態の安定性が重要',
            examples: ['ワーグナー・メーヴァイン転位', '1,2-転位']
        }
    };
    
    if (basicInfo[mechanismKey]) {
        return basicInfo[mechanismKey];
    }
    
    // Generic fallback
    return analyzeGenericMechanism(mechanismKey, mechanismName);
}

// Analyze generic mechanism when specific info is not available
function analyzeGenericMechanism(mechanismKey, mechanismName) {
    // Extract information from mechanism key
    const name = mechanismName || mechanismKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    let description = '化学結合の切断機構';
    let chemicalBasis = '一般的な開裂パターン';
    let energetics = '反応エネルギーは分子構造に依存';
    let mechanismSteps = ['結合の活性化', '遷移状態形成', '生成物の安定化'];
    let examples = ['有機化合物の一般的な開裂'];
    
    // Pattern-based analysis
    if (mechanismKey.includes('cleavage')) {
        description = '特定の結合位置での開裂反応';
        chemicalBasis = '結合の極性と電子密度が開裂位置を決定';
    } else if (mechanismKey.includes('loss')) {
        description = '中性分子の脱離反応';
        chemicalBasis = '小分子の脱離による分子イオンの安定化';
        mechanismSteps = ['活性化', '中性分子の脱離', 'フラグメントイオンの安定化'];
    } else if (mechanismKey.includes('rearrangement')) {
        description = '分子内転位を伴う構造変化';
        chemicalBasis = '電子の再配置による新しい結合形成';
        mechanismSteps = ['電子移動', '転位反応', '安定構造の形成'];
    } else if (mechanismKey.includes('radical')) {
        description = 'ラジカル中間体を経由する反応';
        chemicalBasis = 'ラジカルの安定性が反応性を決定';
        energetics = 'ラジカル形成エネルギーと安定化エネルギーのバランス';
    }
    
    // Thermodynamic considerations
    if (mechanismKey.includes('alpha') || mechanismKey.includes('benzylic')) {
        energetics = '隣接原子の電子供与により比較的低エネルギー';
    } else if (mechanismKey.includes('beta')) {
        energetics = 'β位での開裂は電子効果により促進される';
    }
    
    // Common examples based on pattern
    if (mechanismKey.includes('alcohol')) {
        examples = ['アルコールの脱水反応', 'ヒドロキシル基の脱離'];
    } else if (mechanismKey.includes('carbonyl')) {
        examples = ['カルボニル化合物の開裂', 'アシル基の脱離'];
    } else if (mechanismKey.includes('aromatic')) {
        examples = ['芳香環の開裂', 'ベンジル位での反応'];
    }
    
    return {
        name: name,
        description: description,
        chemicalBasis: chemicalBasis,
        energetics: energetics,
        mechanismSteps: mechanismSteps,
        examples: examples
    };
}

// ===== EXPORT FUNCTIONS =====

// Generate database links for compounds
function generateDatabaseLinks(compounds) {
    if (!compounds || compounds.length === 0) {
        return '<p>No compound data available for database links.</p>';
    }
    
    let linksHTML = '<div class="database-links">';
    linksHTML += '<h4>🔗 データベースリンク</h4>';
    
    compounds.slice(0, 5).forEach((compound, index) => {
        linksHTML += `
            <div class="compound-link">
                <h5>${compound.name || `Compound ${index + 1}`}</h5>
                <div class="link-buttons">
        `;
        
        // MoNA link
        if (compound.id) {
            linksHTML += `<a href="https://mona.fiehnlab.ucdavis.edu/spectra/display/${compound.id}" target="_blank" class="db-link mona-link">MoNA</a>`;
        }
        
        // PubChem link (if molecular formula available)
        if (compound.formula) {
            const pubchemURL = `https://pubchem.ncbi.nlm.nih.gov/compound?q=${encodeURIComponent(compound.formula)}`;
            linksHTML += `<a href="${pubchemURL}" target="_blank" class="db-link pubchem-link">PubChem</a>`;
        }
        
        // ChemSpider link (if name available)
        if (compound.name) {
            const chemspiderURL = `http://www.chemspider.com/Search.aspx?q=${encodeURIComponent(compound.name)}`;
            linksHTML += `<a href="${chemspiderURL}" target="_blank" class="db-link chemspider-link">ChemSpider</a>`;
        }
        
        linksHTML += '</div></div>';
    });
    
    linksHTML += '</div>';
    return linksHTML;
}

// ===== MODULE EXPORTS =====
const FragmentationUtils = {
    // Chemical calculations
    calculateCommonNeutralLosses,
    calculateLossProbability,
    parseElementCounts,
    getMassRange,
    getIntensityRange,
    
    // Confidence assessment
    calculateConfidenceBoost,
    assessAdvancedConfidence,
    assessFragmentConfidence,
    assessAdvancedFragmentConfidence,
    
    // Priority and scoring
    calculatePriorityScore,
    calculateFragmentPriorityScore,
    getPriorityLabel,
    getPriorityColor,
    
    // Validation and summary
    createAdvancedValidationSummary,
    
    // Data analysis
    analyzeExperimentalGaps,
    mergeImprovementResults,
    
    // Session storage
    saveToSessionStorage,
    loadFromSessionStorage,
    clearSessionStorage,
    
    // Chemical knowledge
    getDetailedMechanismInfo,
    getBasicMechanismInfo,
    analyzeGenericMechanism,
    
    // Export functions
    generateDatabaseLinks
};

// Export to global scope for module coordination
window.FragmentationUtils = FragmentationUtils; 