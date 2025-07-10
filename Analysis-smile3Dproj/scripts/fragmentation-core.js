// ===== FRAGMENTATION ANALYSIS CORE MODULE =====
// Multi-stage analysis control and state management

console.log('🔍 FragmentationCore script is starting to load...');

// Main fragmentation prediction function
async function predictFragmentation(smiles) {
    console.log('🔧 predictFragmentation called with:', smiles);
    
    // Get current molecule if SMILES not provided
    if (!smiles) {
        const currentMol = window.currentMolecule || window.currentMoleculeData;
        if (currentMol && currentMol.smile) {
            smiles = currentMol.smile;
            console.log('🔧 Using current molecule SMILES:', smiles);
        } else {
            // Try to get from DOM
            const smileOutput = document.getElementById('smile-output');
            if (smileOutput && smileOutput.value) {
                smiles = smileOutput.value;
                console.log('🔧 Using SMILES from DOM:', smiles);
            }
        }
    }
    
    // Validate SMILES input
    if (!smiles || smiles.trim() === '') {
        const errorMsg = 'SMILES notation is required for fragmentation analysis';
        console.error('❌', errorMsg);
        
        if (typeof window.showFragmentationError === 'function') {
            window.showFragmentationError(errorMsg);
        } else {
            alert(errorMsg);
        }
        return { success: false, error: errorMsg };
    }
    
    // Show loading state
    if (typeof window.showFragmentationLoading === 'function') {
        window.showFragmentationLoading(true);
    }
    
    
    try {
        console.log('🤖 Starting LLM-based fragmentation analysis...');
        
        // Call LLM API for fragmentation prediction
        const results = await callFragmentationLLMAPI(smiles);
        
        // Store data for analysis details modal
        currentFragmentationData = results;
        FragmentationCore.currentFragmentationData = results;
        
        // Display results in UI
        console.log('🎯 Displaying fragmentation results...');
        if (typeof window.displayFragmentationResults === 'function') {
            window.displayFragmentationResults(results);
        } else {
            console.log('LLM analysis results:', results);
            alert('Fragmentation analysis completed!\nSee console for details.');
        }
        
        return results;
        
    } catch (error) {
        console.error('❌ Fragmentation analysis failed:', error);
        
        const errorMsg = `Fragmentation analysis failed: ${error.message}`;
        if (typeof window.showFragmentationError === 'function') {
            window.showFragmentationError(errorMsg);
        } else {
            alert(errorMsg);
        }
        
        return { success: false, error: errorMsg };
    } finally {
        // Hide loading state
        if (typeof window.showFragmentationLoading === 'function') {
            window.showFragmentationLoading(false);
        }
        
    }
}

// LLM API call for fragmentation analysis with database integration
async function callFragmentationLLMAPI(smiles) {
    console.log('🔍 Starting integrated fragmentation analysis...');
    
    // Step 1: Database search for experimental data
    let experimentalData = null;
    try {
        if (typeof window.searchMoNADatabase === 'function') {
            console.log('📊 Searching database for experimental data...');
            
            
            const molecule = {
                smile: smiles,
                molecularWeight: null, // Will be calculated if needed
                formula: null
            };
            experimentalData = await window.searchMoNADatabase(molecule);
            console.log('✅ Database search completed:', experimentalData?.length || 0, 'results');
        } else {
            console.log('⚠️ Database search function not available');
        }
    } catch (dbError) {
        console.warn('⚠️ Database search failed:', dbError);
        // Continue without experimental data
    }
    
    // Step 2: Create enhanced prompt with experimental data
    const systemPrompt = `You are a mass spectrometry expert specializing in fragmentation pattern prediction. Analyze the given SMILES structure and predict its MS/MS fragmentation patterns.

${experimentalData && experimentalData.length > 0 ? 
`IMPORTANT: I have found ${experimentalData.length} experimental spectra from databases. Consider these experimental patterns when making predictions:

Experimental Data Summary:
${experimentalData.slice(0, 3).map((exp, i) => `
${i + 1}. Compound: ${exp.compound || 'Unknown'}
   Mass: ${exp.precursorMass || 'N/A'} Da
   Key fragments: ${exp.peaks ? exp.peaks.slice(0, 5).map(p => `${p.mass}(${p.intensity}%)`).join(', ') : 'N/A'}
`).join('')}

Use this experimental data to validate and improve your predictions.` : 
'No experimental data available. Base predictions on theoretical fragmentation patterns.'}

Return your response in the following JSON format:
{
    "success": true,
    "message": "Fragmentation analysis completed",
    "molecule": {
        "smiles": "SMILES string",
        "name": "compound name if known",
        "formula": "molecular formula",
        "molecularWeight": "molecular weight in Da"
    },
    "fragments": [
        {
            "mass": "fragment mass in Da",
            "intensity": "relative intensity (0-100)",
            "formula": "fragment formula",
            "mechanism": "fragmentation mechanism description",
            "confidence": "confidence score (0-100)",
            "ionType": "ion type (e.g., [M+H]+, [M-H]-)",
            "mechanismType": "type of fragmentation",
            "priority": "high/medium/low",
            "validationStatus": "confirmed/predicted"
        }
    ],
    "confidence": "overall confidence score (0-100)",
    "analysisSteps": ["step 1", "step 2", "..."],
    "experimentalDataUsed": ${!!experimentalData && experimentalData.length > 0}
}

Provide accurate fragmentation predictions based on known fragmentation patterns and mechanisms.`;

    const messages = [
        {
            role: "system",
            content: systemPrompt
        },
        {
            role: "user",
            content: `Predict the MS/MS fragmentation pattern for this molecule: ${smiles}`
        }
    ];
    
    // Step 3: Call LLM API with detailed logging
    console.log('🤖 Calling LLM API...');
    
    const requestBody = {
        model: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8',
        messages: messages,
        temperature: 0.4,
        max_completion_tokens: 2000,
        stream: false
    };
    
    // Log request details for debugging
    console.log('📤 LLM API Request Details:');
    console.log('URL:', 'https://nurumayu-worker.skume-bioinfo.workers.dev/');
    console.log('Method: POST');
    console.log('Headers:', { 'Content-Type': 'application/json' });
    console.log('Body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch('https://nurumayu-worker.skume-bioinfo.workers.dev/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
    });

    // Log response details
    console.log('📥 LLM API Response Details:');
    console.log('Status:', response.status, response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
        let errorDetails = `${response.status} ${response.statusText}`;
        let errorData = null;
        
        try {
            const responseText = await response.text();
            console.log('❌ Error Response Body:', responseText);
            
            try {
                errorData = JSON.parse(responseText);
                if (errorData.error) {
                    errorDetails += ` - ${JSON.stringify(errorData.error)}`;
                }
            } catch (parseError) {
                console.log('Error response is not JSON:', parseError);
                errorDetails += ` - Raw response: ${responseText.substring(0, 200)}`;
            }
        } catch (e) {
            console.error('Failed to read error response:', e);
        }
        
        console.error('🚨 LLM API Error Details:', {
            status: response.status,
            statusText: response.statusText,
            errorData: errorData,
            requestBody: requestBody
        });
        
        throw new Error(`LLM API error: ${errorDetails}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
        throw new Error('LLM API returned empty response');
    }

    // Step 4: Parse and enhance response
    try {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                         content.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
            throw new Error('No JSON found in LLM response');
        }
        
        const jsonString = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonString);
        
        // Enhance response with experimental data reference
        if (experimentalData && experimentalData.length > 0) {
            parsed.experimentalDataSummary = {
                totalFound: experimentalData.length,
                topResults: experimentalData.slice(0, 5)
            };
        }
        
        // Store for analysis details modal
        parsed.rawLLMResponse = content;
        parsed.experimentalData = experimentalData;
        
        
        console.log('✅ LLM analysis completed successfully');
        return parsed;
        
    } catch (parseError) {
        console.error('Failed to parse LLM response:', parseError);
        throw new Error(`Failed to parse LLM response: ${parseError.message}`);
    }
}

// Data storage for analysis details modal
let currentFragmentationData = null;

// Create minimal FragmentationCore object
const FragmentationCore = {
    predictFragmentation: predictFragmentation,
    currentFragmentationData: currentFragmentationData,
    version: "3.0-minimal"
};

// Export to global scope for module coordination
console.log('🔧 Exporting FragmentationCore to window...');
window.FragmentationCore = FragmentationCore;

// Also expose predictFragmentation globally as fallback
window.predictFragmentation = predictFragmentation;

// Ensure data is accessible globally
window.currentFragmentationData = currentFragmentationData;

console.log('✅ FragmentationCore module loaded successfully'); 