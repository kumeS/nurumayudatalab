// ===== SMILE 3D PROJECT - FRAGMENTATION ANALYSIS HUB =====
// Integrated fragmentation analysis system with modular architecture
// 
// This file serves as the main integration hub for fragmentation analysis,
// coordinating between multiple specialized modules:
// - fragmentation-core.js: Multi-stage analysis control and state management
// - fragmentation-llm.js: LLM API calls and prompt generation
// - fragmentation-database.js: Database search and experimental data
// - fragmentation-ui.js: UI display and user interactions
// - fragmentation-utils.js: Chemical calculations and utilities
//
// Version: 3.0 - Modular Architecture
// Author: Nurumayu DataLab

console.log('🧪 Fragmentation Analysis Hub v3.0 - Modular Architecture Loading...');

// ===== MODULE COORDINATION =====

// Ensure all modules are loaded before initializing
let modulesLoaded = {
    core: false,
    llm: false,
    database: false,
    ui: false,
    utils: false
};

// Check module loading status
function checkModuleStatus() {
    const modules = ['FragmentationCore', 'FragmentationLLM', 'FragmentationDatabase', 'FragmentationUI', 'FragmentationUtils'];
    
    console.log('📊 Fragmentation Module Status:');
    modules.forEach(moduleName => {
        const module = window[moduleName];
        const status = module ? '✅ Loaded' : '❌ Not Loaded';
        console.log(`  ${moduleName}: ${status}`);
        
        if (module) {
            const functions = Object.keys(module).filter(key => typeof module[key] === 'function');
            console.log(`    Functions: ${functions.join(', ')}`);
        }
    });
    
    // Check global functions
    console.log('🌐 Global Function Availability:');
    const globalFunctions = ['predictFragmentation', 'showFragmentationLoading', 'displayFragmentationResults', 'showFragmentationError'];
    globalFunctions.forEach(funcName => {
        const status = typeof window[funcName] === 'function' ? '✅ Available' : '❌ Not Available';
        console.log(`  ${funcName}: ${status}`);
    });
    
    // Check current molecule
    console.log('🧪 Current Molecule Status:');
    console.log('  window.currentMolecule:', window.currentMolecule ? '✅ Set' : '❌ Not Set');
    console.log('  window.currentMoleculeData:', window.currentMoleculeData ? '✅ Set' : '❌ Not Set');
    if (window.currentMolecule) {
        console.log('  Molecule data:', window.currentMolecule);
    }
    
    modulesLoaded.core = !!window.FragmentationCore;
    modulesLoaded.llm = !!window.FragmentationLLM;
    modulesLoaded.database = !!window.FragmentationDatabase;
    modulesLoaded.ui = !!window.FragmentationUI;
    modulesLoaded.utils = !!window.FragmentationUtils;
    
    const allLoaded = Object.values(modulesLoaded).every(loaded => loaded);
    
    if (allLoaded) {
        console.log('✅ All fragmentation modules loaded successfully');
        initializeFragmentationSystem();
    } else {
        console.log('⏳ Waiting for modules to load...', modulesLoaded);
        // Retry after a short delay
        setTimeout(checkModuleStatus, 100);
    }
}

// Initialize the integrated fragmentation system
function initializeFragmentationSystem() {
    console.log('🚀 Initializing integrated fragmentation system...');
    
    // Setup cross-module references for backwards compatibility
    setupCompatibilityLayer();
    
    // Initialize session storage
    if (window.FragmentationUtils?.loadFromSessionStorage) {
        window.FragmentationUtils.loadFromSessionStorage();
    }
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('✅ Fragmentation system initialized successfully');
}

// Setup compatibility layer for existing code
function setupCompatibilityLayer() {
    // Export main functions to global scope for backwards compatibility
    if (window.FragmentationCore) {
        window.predictFragmentation = window.FragmentationCore.predictFragmentation;
        window.executeStep3Integration = window.FragmentationCore.executeStep3Integration;
        window.restartAnalysis = window.FragmentationCore.restartAnalysis;
        window.exportIntegratedResults = window.FragmentationCore.exportIntegratedResults;
    }
    
    if (window.FragmentationUI) {
        window.displayFragmentationResults = window.FragmentationUI.displayFragmentationResults;
        window.showFragmentationLoading = window.FragmentationUI.showFragmentationLoading;
        window.showFragmentationError = window.FragmentationUI.showFragmentationError;
        window.hideFragmentationError = window.FragmentationUI.hideFragmentationError;
        window.retryFragmentation = window.FragmentationUI.retryFragmentation;
        window.showAnalysisDetails = window.FragmentationUI.showAnalysisDetails;
        window.closeAnalysisModal = window.FragmentationUI.closeAnalysisModal;
        window.highlightFragmentationSite = window.FragmentationUI.highlightFragmentationSite;
        window.showMultiStageLoading = window.FragmentationUI.showMultiStageLoading;
        window.updateStageProgress = window.FragmentationUI.updateStageProgress;
        window.updateStageIcon = window.FragmentationUI.updateStageIcon;
        window.displayIntermediateResults = window.FragmentationUI.displayIntermediateResults;
        window.showIntegrationButton = window.FragmentationUI.showIntegrationButton;
        window.toggleFragmentDetails = window.FragmentationUI.toggleFragmentDetails;
    }
    
    if (window.FragmentationDatabase) {
        window.searchMoNADatabase = window.FragmentationDatabase.searchMoNADatabase;
        window.comprehensiveDatabaseSearch = window.FragmentationDatabase.comprehensiveDatabaseSearch;
        window.extractExperimentalFragments = window.FragmentationDatabase.extractExperimentalFragments;
        window.analyzeExperimentalPatterns = window.FragmentationDatabase.analyzeExperimentalPatterns;
        window.enhanceWithExperimentalData = window.FragmentationDatabase.enhanceWithExperimentalData;
    }
    
    if (window.FragmentationLLM) {
        window.callFragmentationLLMAPI = window.FragmentationLLM.callFragmentationLLMAPI;
        window.parseFragmentationResponse = window.FragmentationLLM.parseFragmentationResponse;
        window.performComprehensiveIntegration = window.FragmentationLLM.performComprehensiveIntegration;
        window.createExperimentallyInformedPrompt = window.FragmentationLLM.createExperimentallyInformedPrompt;
    }
    
    if (window.FragmentationUtils) {
        window.calculatePriorityScore = window.FragmentationUtils.calculatePriorityScore;
        window.getPriorityLabel = window.FragmentationUtils.getPriorityLabel;
        window.getPriorityColor = window.FragmentationUtils.getPriorityColor;
        window.assessAdvancedConfidence = window.FragmentationUtils.assessAdvancedConfidence;
        window.createAdvancedValidationSummary = window.FragmentationUtils.createAdvancedValidationSummary;
        window.saveToSessionStorage = window.FragmentationUtils.saveToSessionStorage;
        window.loadFromSessionStorage = window.FragmentationUtils.loadFromSessionStorage;
        window.clearSessionStorage = window.FragmentationUtils.clearSessionStorage;
        window.analyzeExperimentalGaps = window.FragmentationUtils.analyzeExperimentalGaps;
        window.mergeImprovementResults = window.FragmentationUtils.mergeImprovementResults;
        window.getDetailedMechanismInfo = window.FragmentationUtils.getDetailedMechanismInfo;
        window.generateDatabaseLinks = window.FragmentationUtils.generateDatabaseLinks;
    }
}

// Setup event listeners for module coordination
function setupEventListeners() {
    // Auto-save when analysis is updated
    window.addEventListener('fragmentationAnalysisUpdated', function(event) {
        if (window.FragmentationUtils?.saveToSessionStorage) {
            window.FragmentationUtils.saveToSessionStorage();
        }
    });
    
    // Handle page visibility change to save state
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden') {
            if (window.FragmentationUtils?.saveToSessionStorage) {
                window.FragmentationUtils.saveToSessionStorage();
            }
        }
    });
}

// ===== LEGACY FUNCTION SUPPORT =====
// These functions provide backwards compatibility for existing code

// Legacy function for highlighting fragmentation sites
function highlightFragmentationSites(sites) {
    if (!sites || !Array.isArray(sites) || typeof highlightAtoms !== 'function') {
        return;
    }

    // Collect all fragmentation atom indices
    const allAtomIndices = [];
    sites.forEach(site => {
        if (site.atomIndices && Array.isArray(site.atomIndices)) {
            allAtomIndices.push(...site.atomIndices);
        }
    });

    // Highlight all fragmentation sites
    if (allAtomIndices.length > 0) {
        highlightAtoms(allAtomIndices, '#ff1744');
    }
}

// Legacy function for exporting fragmentation data
function exportFragmentation() {
    if (window.FragmentationCore?.exportIntegratedResults) {
        window.FragmentationCore.exportIntegratedResults();
    } else {
        // Fallback export function
        const data = {
            timestamp: new Date().toISOString(),
            currentMolecule: window.currentMolecule,
            fragmentationData: window.FragmentationCore?.currentFragmentationData,
            experimentalData: window.FragmentationCore?.experimentalFragmentationData
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fragmentation_analysis_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Legacy function for generating fragmentation spectrum
function generateFragmentationSpectrum(fragments) {
    // This is a placeholder for a more sophisticated spectrum visualization
    // In a real application, you would use a charting library like Chart.js or D3.js
    
    console.log('Fragmentation spectrum data:', fragments);
    
    // For now, just log the data - future enhancement would create visual spectrum
    if (fragments && fragments.length > 0) {
        console.log('Major peaks:');
        fragments.forEach(fragment => {
            console.log(`m/z ${fragment.mz}: ${fragment.intensity} (${fragment.type})`);
        });
    }
}

// ===== SYSTEM STATUS AND DEBUGGING =====

// Get system status for debugging
function getFragmentationSystemStatus() {
    return {
        modulesLoaded: modulesLoaded,
        coreModule: !!window.FragmentationCore,
        llmModule: !!window.FragmentationLLM,
        databaseModule: !!window.FragmentationDatabase,
        uiModule: !!window.FragmentationUI,
        utilsModule: !!window.FragmentationUtils,
        currentMolecule: !!window.currentMolecule,
        analysisState: window.FragmentationCore?.multiStageAnalysis?.currentStage || 0,
        lastError: window.lastFragmentationError || null
    };
}

// ===== MODULE LOADING AND INITIALIZATION =====

// Start module loading check
console.log('🔄 Starting module loading check...');
checkModuleStatus();

// Export compatibility functions
window.highlightFragmentationSites = highlightFragmentationSites;
window.exportFragmentation = exportFragmentation;
window.generateFragmentationSpectrum = generateFragmentationSpectrum;

// ===== INITIALIZATION COMPLETE =====

console.log('🎯 Fragmentation Analysis Hub initialization complete');
console.log('📁 Modular architecture with 5 specialized modules:');
console.log('   - Core: Multi-stage analysis control');
console.log('   - LLM: AI-powered compound analysis');
console.log('   - Database: Experimental data integration');
console.log('   - UI: User interface and interactions');
console.log('   - Utils: Chemical calculations and utilities');
console.log('');
console.log('🚀 Ready for fragmentation analysis!');

// ===== BACKWARDS COMPATIBILITY NOTICE =====
/*
BACKWARDS COMPATIBILITY NOTICE:
This version maintains full backwards compatibility with existing code.
All previous function names and interfaces continue to work as expected.

New modular architecture provides:
- Better code organization and maintainability
- Easier testing and debugging
- Cleaner separation of concerns
- Enhanced functionality with multi-stage analysis

For new development, prefer using the module-specific functions:
- window.FragmentationCore.* for main analysis control
- window.FragmentationUI.* for display functions
- window.FragmentationDatabase.* for data operations
- window.FragmentationLLM.* for AI functionality
- window.FragmentationUtils.* for calculations

Legacy global functions will continue to work but may be deprecated in future versions.
*/