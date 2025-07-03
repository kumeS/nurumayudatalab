// ===== FRAGMENTATION DATABASE MODULE =====
// Database search, data processing, and experimental data analysis

// MoNA API configuration with Cloudflare Worker proxy
const MONA_API = {
    baseUrl: 'https://mona.fiehnlab.ucdavis.edu/rest',
    endpoints: {
        search: '/spectra/search',
        compound: '/compounds',
        similarity: '/similarity'
    },
    // Cloudflare Worker proxy for CORS resolution
    proxyOptions: {
        // Primary: Cloudflare Worker proxy (recommended)
        cloudflareWorker: 'https://nurumayu-smile-3d-project.skume-bioinfo.workers.dev/api/search',
        // Fallback options
        corsProxy: 'https://cors-anywhere.herokuapp.com/',
        allOriginsProxy: 'https://api.allorigins.win/raw?url='
    }
};

// ===== DATABASE SEARCH FUNCTIONS =====

// Comprehensive database search with multiple strategies
async function comprehensiveDatabaseSearch(molecule) {
    const searchStrategies = [];
    
    // Strategy 1: SMILES-based search
    if (molecule.smile) {
        searchStrategies.push(searchMoNABySMILES(molecule.smile));
    }
    
    // Strategy 2: Mass-based search
    if (molecule.molecularWeight) {
        searchStrategies.push(searchMoNAByMass(molecule.molecularWeight, 0.5));
    }
    
    // Strategy 3: Formula-based search
    if (molecule.formula) {
        searchStrategies.push(searchMoNAByFormula(molecule.formula));
    }
    
    // Execute all strategies in parallel
    const results = await Promise.allSettled(searchStrategies);
    
    // Combine and process results
    let combinedResults = [];
    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
            combinedResults = combinedResults.concat(result.value);
        }
    });
    
    // Remove duplicates and rank by similarity
    const uniqueResults = removeDuplicateSpectra(combinedResults);
    const rankedResults = rankSpectraBySimilarity(uniqueResults, molecule);
    
    return {
        totalFound: rankedResults.length,
        compounds: rankedResults.slice(0, 20), // Top 20 results
        searchStrategies: {
            smiles: results[0]?.status === 'fulfilled',
            mass: results[1]?.status === 'fulfilled', 
            formula: results[2]?.status === 'fulfilled'
        }
    };
}

// Main MoNA database search function
async function searchMoNADatabase(molecule) {
    try {
        console.log('🔍 MoNA データベース検索開始:', molecule);
        
        const searchPromises = [];
        
        // Search by different criteria
        if (molecule.smile) {
            searchPromises.push(searchMoNABySMILES(molecule.smile));
        }
        
        if (molecule.molecularWeight) {
            searchPromises.push(searchMoNAByMass(molecule.molecularWeight, 0.5));
        }
        
        if (molecule.formula) {
            searchPromises.push(searchMoNAByFormula(molecule.formula));
        }
        
        // Fallback: return empty result if no search criteria
        if (searchPromises.length === 0) {
            console.log('⚠️ No search criteria available');
            return [];
        }
        
        // Execute searches in parallel
        const results = await Promise.allSettled(searchPromises);
        
        // Combine results
        let combinedResults = [];
        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                combinedResults = combinedResults.concat(result.value);
            }
        });
        
        // Remove duplicates and process
        const uniqueResults = removeDuplicateSpectra(combinedResults);
        const rankedResults = rankSpectraBySimilarity(uniqueResults, molecule);
        
        console.log(`✅ MoNA検索完了: ${rankedResults.length}件の結果`);
        return rankedResults;
        
    } catch (error) {
        console.error('MoNA database search failed:', error);
        // Return empty array on error
        return [];
    }
}

// Search MoNA by mass
async function searchMoNAByMass(mass, tolerance = 0.5) {
    try {
        const query = `exact_mass:[${mass - tolerance} TO ${mass + tolerance}]`;
        const url = `${MONA_API.baseUrl}${MONA_API.endpoints.search}?query=${encodeURIComponent(query)}`;
        
        console.log(`🔍 MoNA質量検索: ${mass} ±${tolerance}`);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`MoNA API error: ${response.status}`);
        }
        
        const data = await response.json();
        return Array.isArray(data) ? data : [];
        
    } catch (error) {
        console.error('MoNA mass search failed:', error);
        return [];
    }
}

// Search MoNA by molecular formula
async function searchMoNAByFormula(formula) {
    try {
        const query = `formula:"${formula}"`;
        const url = `${MONA_API.baseUrl}${MONA_API.endpoints.search}?query=${encodeURIComponent(query)}`;
        
        console.log(`🔍 MoNA分子式検索: ${formula}`);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`MoNA API error: ${response.status}`);
        }
        
        const data = await response.json();
        return Array.isArray(data) ? data : [];
        
    } catch (error) {
        console.error('MoNA formula search failed:', error);
        return [];
    }
}

// Search MoNA by SMILES
async function searchMoNABySMILES(smiles) {
    try {
        const query = `smiles:"${smiles}"`;
        const url = `${MONA_API.baseUrl}${MONA_API.endpoints.search}?query=${encodeURIComponent(query)}`;
        
        console.log(`🔍 MoNA SMILES検索: ${smiles}`);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`MoNA API error: ${response.status}`);
        }
        
        const data = await response.json();
        return Array.isArray(data) ? data : [];
        
    } catch (error) {
        console.error('MoNA SMILES search failed:', error);
        return [];
    }
}



// ===== DATA PROCESSING FUNCTIONS =====

// Remove duplicate spectra based on compound identification
function removeDuplicateSpectra(spectra) {
    if (!Array.isArray(spectra)) return [];
    
    const seen = new Set();
    return spectra.filter(spectrum => {
        // Create unique identifier
        const identifier = `${spectrum.smiles || ''}_${spectrum.exact_mass || ''}_${spectrum.formula || ''}`;
        
        if (seen.has(identifier)) {
            return false;
        }
        
        seen.add(identifier);
        return true;
    });
}

// Rank spectra by similarity to target molecule
function rankSpectraBySimilarity(spectra, targetMolecule) {
    if (!Array.isArray(spectra)) return [];
    
    return spectra.map(spectrum => {
        // Calculate similarity score
        let similarity = 0;
        
        // SMILES similarity (placeholder - would use proper chemical similarity)
        if (spectrum.smiles && targetMolecule.smile) {
            similarity += spectrum.smiles === targetMolecule.smile ? 1.0 : 0.3;
        }
        
        // Mass similarity
        if (spectrum.exact_mass && targetMolecule.molecularWeight) {
            const massDiff = Math.abs(spectrum.exact_mass - targetMolecule.molecularWeight);
            const massScore = Math.max(0, 1 - (massDiff / 50)); // Normalize by 50 Da
            similarity += massScore * 0.3;
        }
        
        // Formula similarity
        if (spectrum.formula && targetMolecule.formula) {
            similarity += spectrum.formula === targetMolecule.formula ? 0.4 : 0.1;
        }
        
        return { ...spectrum, similarity };
    }).sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
}

// ===== EXPERIMENTAL DATA ANALYSIS =====

// Analyze experimental data to extract common fragmentation patterns
function analyzeExperimentalPatterns(experimentalData) {
    if (!experimentalData || experimentalData.length === 0) {
        return {
            commonPatterns: [],
            massRangePatterns: [],
            mechanismFrequency: {},
            reliabilityScore: 0
        };
    }
    
    const patterns = {
        commonPatterns: [],
        massRangePatterns: [],
        mechanismFrequency: {},
        neutralLosses: {},
        intensityPatterns: {},
        reliabilityScore: 0
    };
    
    console.log('🔍 実験パターン分析開始:', experimentalData.length, '化合物');
    
    experimentalData.forEach(compound => {
        if (!compound.exact_mass) return;
        
        const molecularWeight = parseFloat(compound.exact_mass);
        const formula = compound.formula || '';
        
        // Predict common neutral losses based on molecular structure
        const predictedLosses = calculateCommonNeutralLosses(molecularWeight, formula);
        
        predictedLosses.forEach(loss => {
            const lossKey = `${loss.type}_${loss.mass.toFixed(1)}`;
            if (!patterns.neutralLosses[lossKey]) {
                patterns.neutralLosses[lossKey] = {
                    type: loss.type,
                    mass: loss.mass,
                    frequency: 0,
                    examples: []
                };
            }
            patterns.neutralLosses[lossKey].frequency++;
            patterns.neutralLosses[lossKey].examples.push(compound.name || compound.common_name);
        });
        
        // Analyze mass range patterns
        const massRange = getMassRange(molecularWeight);
        if (!patterns.massRangePatterns[massRange]) {
            patterns.massRangePatterns[massRange] = {
                range: massRange,
                compounds: 0,
                commonFragments: [],
                averageComplexity: 0
            };
        }
        patterns.massRangePatterns[massRange].compounds++;
    });
    
    // Calculate reliability score
    patterns.reliabilityScore = Math.min(100, experimentalData.length * 5);
    
    // Extract common patterns
    Object.entries(patterns.neutralLosses).forEach(([key, data]) => {
        if (data.frequency >= 2) {
            patterns.commonPatterns.push({
                type: 'neutral_loss',
                description: `${data.type} (${data.mass.toFixed(1)} Da)`,
                frequency: data.frequency,
                examples: data.examples.slice(0, 3)
            });
        }
    });
    
    console.log('✅ パターン分析完了:', patterns);
    return patterns;
}

// Extract experimental fragments from database results
function extractExperimentalFragments(experimentalData) {
    if (!experimentalData || experimentalData.length === 0) return [];
    
    const fragments = [];
    
    experimentalData.forEach(compound => {
        // Extract molecular ion and base peak information
        if (compound.exact_mass) {
            fragments.push({
                mass: parseFloat(compound.exact_mass),
                source: 'molecular_ion',
                compound: compound.name || compound.common_name,
                confidence: 'experimental',
                type: 'molecular_ion',
                formula: compound.formula,
                smiles: compound.smiles
            });
        }
        
        // Extract MS/MS fragments if available
        if (compound.peaks) {
            compound.peaks.forEach(peak => {
                fragments.push({
                    mass: parseFloat(peak.mz),
                    intensity: parseFloat(peak.intensity),
                    source: 'msms_peak',
                    compound: compound.name || compound.common_name,
                    confidence: 'experimental',
                    type: 'fragment_ion'
                });
            });
        }
        
        // Extract common fragment masses based on molecular structure
        if (compound.formula) {
            const commonFragments = predictCommonFragments(compound.formula, compound.exact_mass);
            fragments.push(...commonFragments);
        }
    });
    
    return fragments.filter((fragment, index, self) => 
        index === self.findIndex(f => Math.abs(f.mass - fragment.mass) < 0.01)
    );
}

// Predict common fragments based on formula and mass
function predictCommonFragments(formula, exactMass) {
    const fragments = [];
    const mass = parseFloat(exactMass);
    
    if (isNaN(mass)) return fragments;
    
    // Common neutral losses
    const commonLosses = [
        { name: 'H2O', mass: 18.0106, type: 'water_loss' },
        { name: 'NH3', mass: 17.0265, type: 'ammonia_loss' },
        { name: 'CO2', mass: 43.9898, type: 'co2_loss' },
        { name: 'CH3', mass: 15.0235, type: 'methyl_loss' },
        { name: 'C2H5', mass: 29.0391, type: 'ethyl_loss' }
    ];
    
    commonLosses.forEach(loss => {
        const fragmentMass = mass - loss.mass;
        if (fragmentMass > 50) { // Reasonable minimum fragment mass
            fragments.push({
                mass: fragmentMass,
                type: loss.type,
                description: `Loss of ${loss.name}`,
                probability: calculateLossProbability(formula, loss.type),
                source: 'predicted'
            });
        }
    });
    
    return fragments;
}

// Extract database sources for display
function extractDatabaseSources(experimentalData) {
    if (!experimentalData || experimentalData.length === 0) {
        return null;
    }
    
    const sources = {
        databases: [],
        totalCompounds: experimentalData.length,
        compounds: []
    };
    
    const databaseSet = new Set();
    
    experimentalData.forEach(compound => {
        // Extract database information
        const database = compound.database || compound.source || 'MoNA';
        databaseSet.add(database);
        
        // Store compound info with similarity
        sources.compounds.push({
            name: compound.name || compound.common_name || 'Unknown',
            formula: compound.formula,
            mass: compound.exact_mass,
            similarity: compound.similarity || 0,
            database: database,
            id: compound.id || compound.accession
        });
    });
    
    sources.databases = Array.from(databaseSet).map(db => ({
        name: db,
        count: experimentalData.filter(c => (c.database || c.source || 'MoNA') === db).length
    }));
    
    return sources;
}

// ===== DATA ENHANCEMENT FUNCTIONS =====

// Enhance LLM predictions with experimental validation
function enhanceWithExperimentalData(result, experimentalData) {
    if (!experimentalData || experimentalData.length === 0) {
        return result;
    }
    
    console.log('🔬 実験データによる予測強化開始');
    
    // Extract experimental fragments for validation
    const experimentalFragments = extractExperimentalFragments(experimentalData);
    
    // Validate and enhance fragmentation sites
    if (result.fragmentationSites) {
        result.fragmentationSites.forEach(site => {
            const validation = validateSiteWithExperimentalData(site, experimentalFragments);
            site.experimentalValidation = validation;
            site.confidence = assessAdvancedConfidence(site, experimentalData, validation);
        });
    }
    
    // Validate and enhance major fragments
    if (result.majorFragments) {
        result.majorFragments.forEach(fragment => {
            const experimentalMatch = findExperimentalMatch(fragment, experimentalFragments);
            fragment.experimentalMatch = experimentalMatch;
            fragment.confidence = assessAdvancedFragmentConfidence(fragment, experimentalData, experimentalMatch);
        });
    }
    
    // Identify missing experimental sites
    const predictedSites = result.fragmentationSites || [];
    const additionalSites = identifyMissingExperimentalSites(predictedSites, experimentalFragments);
    
    if (additionalSites.length > 0) {
        result.additionalExperimentalSites = additionalSites;
    }
    
    // Create validation summary
    result.validationSummary = createAdvancedValidationSummary(result, experimentalData, experimentalFragments);
    
    console.log('✅ 実験データ強化完了');
    return result;
}

// Validate fragmentation site with experimental data
function validateSiteWithExperimentalData(site, experimentalFragments) {
    const fragmentMass = parseFloat(site.fragmentMass || site.mass || 0);
    
    if (fragmentMass === 0) {
        return { isSupported: false, confidence: 'low', reason: 'Invalid fragment mass' };
    }
    
    // Find experimental matches
    const matches = experimentalFragments.filter(exp => 
        Math.abs(exp.mass - fragmentMass) <= 0.05
    );
    
    if (matches.length === 0) {
        return { 
            isSupported: false, 
            confidence: 'low', 
            reason: 'No experimental evidence found',
            experimentalMatches: []
        };
    }
    
    return {
        isSupported: true,
        confidence: matches.length > 1 ? 'high' : 'medium',
        reason: `Found ${matches.length} experimental match(es)`,
        experimentalMatches: matches,
        averageIntensity: matches.reduce((sum, m) => sum + (m.intensity || 0), 0) / matches.length
    };
}

// Find experimental match for predicted fragment
function findExperimentalMatch(fragment, experimentalFragments) {
    const fragmentMass = parseFloat(fragment.mz || fragment.mass || 0);
    if (fragmentMass === 0) return null;
    
    const tolerance = 0.05;
    const matches = experimentalFragments.filter(exp => 
        Math.abs(exp.mass - fragmentMass) <= tolerance
    );
    
    if (matches.length === 0) return null;
    
    return {
        experimental: matches[0],
        massAccuracy: Math.abs(matches[0].mass - fragmentMass),
        matchConfidence: matches.length > 1 ? 'multiple_matches' : 'single_match'
    };
}

// Identify missing experimental sites not predicted by LLM
function identifyMissingExperimentalSites(predictedSites, experimentalFragments) {
    const predictedMasses = new Set(
        predictedSites.map(site => parseFloat(site.fragmentMass || site.mass || 0))
            .filter(mass => mass > 0)
    );
    
    const missingSites = [];
    
    experimentalFragments.forEach(expFragment => {
        if (expFragment.type === 'molecular_ion') return; // Skip molecular ions
        
        const expMass = expFragment.mass;
        const isAlreadyPredicted = Array.from(predictedMasses).some(predMass => 
            Math.abs(predMass - expMass) <= 0.1
        );
        
        if (!isAlreadyPredicted && expFragment.intensity > 20) { // Only significant peaks
            missingSites.push({
                experimentalMass: expMass,
                intensity: expFragment.intensity || 0,
                source: expFragment.compound,
                confidence: 'experimental_only',
                reason: 'Observed in experimental data but not predicted'
            });
        }
    });
    
    return missingSites;
}

// ===== MODULE EXPORTS =====
const FragmentationDatabase = {
    // Main search functions
    searchMoNADatabase,
    comprehensiveDatabaseSearch,
    searchMoNAByMass,
    searchMoNAByFormula,
    searchMoNABySMILES,

    
    // Data processing
    removeDuplicateSpectra,
    rankSpectraBySimilarity,
    
    // Pattern analysis
    analyzeExperimentalPatterns,
    extractExperimentalFragments,
    predictCommonFragments,
    extractDatabaseSources,
    
    // Data enhancement
    enhanceWithExperimentalData,
    validateSiteWithExperimentalData,
    findExperimentalMatch,
    identifyMissingExperimentalSites,
    
    // Constants
    MONA_API
};

// Export to global scope for module coordination
window.FragmentationDatabase = FragmentationDatabase; 