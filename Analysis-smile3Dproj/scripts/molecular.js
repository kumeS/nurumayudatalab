// Molecular Structure Generation Module
// Handles SMILE/MOL generation using LLM API

let currentMolecule = null;

// Diverse collection of compounds for MS/MS fragmentation analysis (MW > 85 Da)
const EXAMPLE_COMPOUNDS = [
    // Common pharmaceuticals
    'aspirin',              // MW: 180.16
    'caffeine',             // MW: 194.19
    'ibuprofen',            // MW: 206.28
    'acetaminophen',        // MW: 151.16
    'penicillin',           // MW: 334.39
    'morphine',             // MW: 285.34
    'codeine',              // MW: 299.36
    'warfarin',             // MW: 308.33
    'atorvastatin',         // MW: 558.64
    'metformin',            // MW: 129.16
    
    // Natural products and vitamins
    'vitamin C',            // MW: 176.12
    'vitamin E',            // MW: 430.71
    'resveratrol',          // MW: 228.24
    'curcumin',             // MW: 368.38
    'quercetin',            // MW: 302.24
    'menthol',              // MW: 156.27
    'capsaicin',            // MW: 305.41
    'nicotine',             // MW: 162.23
    'epinephrine',          // MW: 183.20
    'dopamine',             // MW: 153.18
    
    // Basic metabolites and biochemicals
    'glucose',              // MW: 180.16
    'fructose',             // MW: 180.16
    'sucrose',              // MW: 342.30
    'cholesterol',          // MW: 386.65
    'testosterone',         // MW: 288.42
    'estrogen',             // MW: 272.38
    'creatinine',           // MW: 113.12
    'uric acid',            // MW: 168.11
    'lactic acid',          // MW: 90.08
    
    // Amino acids and nucleotides (MW > 85)
    'alanine',              // MW: 89.09
    'phenylalanine',        // MW: 165.19
    'tryptophan',           // MW: 204.23
    'adenine',              // MW: 135.13
    'guanine',              // MW: 151.13
    'cytosine',             // MW: 111.10
    'thymine',              // MW: 126.11
    
    // Other interesting compounds (MW > 85)
    'benzoic acid',         // MW: 122.12
    'salicylic acid',       // MW: 138.12
    'citric acid',          // MW: 192.12
    'vanillin',             // MW: 152.15
    'toluene'               // MW: 92.14
];

// Function to get example compound
function getExampleCompound() {
    const randomIndex = Math.floor(Math.random() * EXAMPLE_COMPOUNDS.length);
    return EXAMPLE_COMPOUNDS[randomIndex];
}

// Function to insert example compound into input field
function insertSampleCompound() {
    console.log('🎲 Sample button clicked');
    const sampleCompound = getExampleCompound();
    console.log('🎯 Selected sample compound:', sampleCompound);
    const inputElement = document.getElementById('compound-input');
    
    if (inputElement) {
        // Add visual feedback
        const sampleBtn = document.getElementById('sample-btn');
        if (sampleBtn) {
            sampleBtn.style.transform = 'scale(0.95)';
            sampleBtn.style.opacity = '0.7';
            
            setTimeout(() => {
                sampleBtn.style.transform = 'scale(1)';
                sampleBtn.style.opacity = '1';
            }, 150);
        }
        
        // Clear current input and insert sample
        inputElement.value = sampleCompound;
        
        // Focus on input field
        inputElement.focus();
        
        // Save to session storage
        try {
            sessionStorage.setItem('smile3d_input_text', sampleCompound);
        } catch (error) {
            console.warn('Failed to save sample to session storage:', error);
        }
        
        // Dispatch input event to trigger any listeners
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

// Session storage keys
const MOLECULAR_STORAGE_KEYS = {
    input: 'smile3d_input_text',
    molecule: 'smile3d_current_molecule',
    results_visible: 'smile3d_results_visible'
};

// Main function to generate molecular structure
async function generateMolecularStructure() {
    const input = document.getElementById('compound-input').value.trim();
    if (!input) {
        showError('Please enter a compound description');
        return;
    }

    // Show process indicator for molecular generation
    if (typeof window.showProcessStep === 'function') {
        window.showProcessStep('molecular');
    }

    showLoading(true);
    hideError();
    hideResults();

    try {
        // Create specialized prompt for molecular structure generation
        const messages = [{
            role: "system",
            content: `You are a molecular chemistry expert. Generate SMILE notation and molecular information for chemical compounds based on user descriptions. 

Return your response in the following JSON format:
{
    "smile": "SMILE notation string",
    "mol": "MOL file content (optional)",
    "name": "IUPAC or common name",
    "formula": "molecular formula",
    "molecularWeight": "molecular weight in g/mol",
    "description": "brief description of the compound",
    "properties": {
        "boilingPoint": "boiling point if known",
        "meltingPoint": "melting point if known",
        "solubility": "water solubility if known"
    }
}

Important guidelines:
- Provide accurate SMILE notation
- Include molecular formula and weight
- Ensure chemical accuracy
- If unsure about a compound, provide the most likely interpretation`
        }, {
            role: "user",
            content: `Generate molecular structure information for: ${input}`
        }];

        const result = await callMolecularLLMAPI(messages);
        
        if (result && result.smile) {
            currentMolecule = result;
            
            // Also set as window property for fragmentation.js compatibility
            window.currentMolecule = result;
            window.currentMoleculeData = result;
            
            displayMolecularResults(result);
            showResults();
            
            // Save to session storage
            saveMolecularDataToSession();
            
            // Fire event for other modules (e.g., fragmentation)
            window.dispatchEvent(new CustomEvent('moleculeGenerated', { detail: result }));
            
            // Ensure viewer is initialized before displaying molecular structure
            try {
                // Initialize viewer if not already done
                if (typeof initialize3DViewer === 'function') {
                    initialize3DViewer();
                }
                
                // Display molecular structure with retry mechanism
                if (typeof displayMolecularStructure === 'function') {
                    console.log('Displaying molecular structure with SMILE:', result.smile);
                    await displayMolecularStructure(result.smile);
                    console.log('Molecular structure display completed');
                } else if (typeof display3DMolecule === 'function') {
                    console.log('Fallback: Displaying 3D molecule with SMILE:', result.smile);
                    await display3DMolecule(result.smile);
                } else {
                    console.warn('No molecular structure display function available');
                    // Show a notification that structure visualization is not available
                    if (typeof showNotification === 'function') {
                        showNotification('Molecular structure generated successfully. Visualization is being prepared...');
                    }
                }
            } catch (displayError) {
                console.error('Failed to display molecular structure:', displayError);
                // Don't throw error - the SMILE data is still valid
                if (typeof showNotification === 'function') {
                    showNotification('SMILE structure generated successfully. Visual display will be available shortly.');
                }
            }
        } else {
            throw new Error('Invalid molecular data received');
        }

    } catch (error) {
        console.error('Molecular generation error:', error);
        showError(`Failed to generate molecular structure: ${error.message}`);
        
        // Hide process indicator on error
        if (typeof window.hideProcessStep === 'function') {
            window.hideProcessStep('molecular');
        }
    } finally {
        showLoading(false);
        
        // Hide process indicator when molecular generation completes
        setTimeout(() => {
            if (typeof window.hideProcessStep === 'function') {
                window.hideProcessStep('molecular');
            }
        }, 2000); // Keep visible for 2 seconds to show completion
    }
}

// Specialized LLM API call for molecular data
async function callMolecularLLMAPI(messages) {
    const apiUrl = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
    
    const requestData = {
        model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
        temperature: 0.3, // Lower temperature for more consistent chemical data
        stream: false,
        max_completion_tokens: 1500,
        messages: messages
    };
    
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        return parseMolecularResponse(data.choices[0].message.content);
    } else if (data.answer) {
        return parseMolecularResponse(data.answer);
    } else {
        throw new Error('No valid response received from API');
    }
}

// Parse LLM response for molecular data
function parseMolecularResponse(text) {
    try {
        console.log('Raw molecular API response:', text);
        
        // Extract JSON from response text - handle multiple JSON objects
        let candidateData = [];
        
        // Try different JSON extraction patterns
        let jsonMatches = text.match(/```json\s*([\s\S]*?)\s*```/g);
        if (jsonMatches) {
            jsonMatches.forEach(match => {
                const jsonText = match.replace(/```json\s*/, '').replace(/\s*```/, '').trim();
                try {
                    const data = JSON.parse(jsonText);
                    if (data.smile) candidateData.push(data);
                } catch (e) {
                    // Skip invalid JSON
                }
            });
        }
        
        // If no JSON blocks found, try code blocks
        if (candidateData.length === 0) {
            jsonMatches = text.match(/```\s*([\s\S]*?)\s*```/g);
            if (jsonMatches) {
                jsonMatches.forEach(match => {
                    const jsonText = match.replace(/```\s*/, '').replace(/\s*```/, '').trim();
                    try {
                        const data = JSON.parse(jsonText);
                        if (data.smile) candidateData.push(data);
                    } catch (e) {
                        // Skip invalid JSON
                    }
                });
            }
        }
        
        // If still no candidates, look for JSON object boundaries
        if (candidateData.length === 0) {
            const jsonObjects = text.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
            if (jsonObjects) {
                jsonObjects.forEach(jsonText => {
                    try {
                        const data = JSON.parse(jsonText);
                        if (data.smile) candidateData.push(data);
                    } catch (e) {
                        // Skip invalid JSON
                    }
                });
            }
        }
        
        if (candidateData.length === 0) {
            throw new Error('No valid JSON content found in response');
        }
        
        // Select the best candidate - prefer valid SMILES notation
        let data = candidateData[0];
        for (const candidate of candidateData) {
            if (validateSmile(candidate.smile)) {
                data = candidate;
                break;
            }
        }
        
        // Validate required fields
        if (!data.smile) {
            throw new Error('No SMILE notation found in response');
        }
        
        // Ensure we have basic molecular information
        return {
            smile: data.smile,
            mol: data.mol || '',
            name: data.name || 'Unknown',
            formula: data.formula || '',
            molecularWeight: data.molecularWeight || '',
            description: data.description || '',
            properties: data.properties || {}
        };
        
    } catch (error) {
        console.error('Molecular data parsing error:', error);
        throw new Error(`Failed to parse molecular data: ${error.message}`);
    }
}

// Display molecular results in the UI
function displayMolecularResults(molecule) {
    // Display SMILE notation
    const smileOutput = document.getElementById('smile-output');
    smileOutput.value = molecule.smile;
    
    // Display molecular information
    const formulaElement = document.getElementById('molecular-formula');
    const weightElement = document.getElementById('molecular-weight');
    
    formulaElement.textContent = molecule.formula ? `Formula: ${molecule.formula}` : '';
    weightElement.textContent = molecule.molecularWeight ? `MW: ${molecule.molecularWeight}` : '';
    
    // Store molecule data for other functions
    window.currentMoleculeData = molecule;
}

// Validate SMILE notation format
function validateSmile(smile) {
    if (!smile || typeof smile !== 'string') {
        return false;
    }
    
    // Basic SMILE validation - check for valid characters
    const validChars = /^[BCNOPSFClBrI\[\]()=@+\-#0-9cbnosfpbri]+$/i;
    return validChars.test(smile.replace(/\s/g, ''));
}

// Calculate molecular properties from SMILE
function calculateMolecularProperties(smile) {
    // This is a simplified implementation
    // In a real application, you would use a chemistry library like RDKit
    const properties = {
        atomCount: 0,
        bondCount: 0,
        rings: 0
    };
    
    // Count atoms (simplified)
    const atoms = smile.match(/[BCNOPSFK]|Cl|Br|I/gi);
    properties.atomCount = atoms ? atoms.length : 0;
    
    // Count rings (simplified)
    const ringNumbers = smile.match(/[0-9]/g);
    properties.rings = ringNumbers ? Math.floor(ringNumbers.length / 2) : 0;
    
    return properties;
}

// Copy SMILE to clipboard
async function copySmileToClipboard() {
    const smileOutput = document.getElementById('smile-output');
    if (!smileOutput.value) {
        showError('No SMILE data to copy');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(smileOutput.value);
        showNotification('SMILE copied to clipboard');
    } catch (error) {
        console.error('Clipboard copy failed:', error);
        // Fallback for older browsers
        smileOutput.select();
        document.execCommand('copy');
        showNotification('SMILE copied to clipboard');
    }
}

// Download MOL file
function downloadMolFile() {
    if (!currentMolecule) {
        showError('No molecular data available');
        return;
    }
    
    let molContent = currentMolecule.mol;
    
    // If no MOL content, generate a proper MOL file from SMILE
    if (!molContent || molContent.trim().length === 0) {
        molContent = generateMolFromSmile(currentMolecule.smile, currentMolecule.name);
    }
    
    try {
        const blob = new Blob([molContent], { type: 'chemical/x-mdl-molfile' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(currentMolecule.name || 'molecule').replace(/[^a-zA-Z0-9]/g, '_')}.mol`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('MOL file downloaded successfully');
        console.log('MOL file downloaded:', a.download);
    } catch (error) {
        console.error('Failed to download MOL file:', error);
        showError('Failed to download MOL file: ' + error.message);
    }
}

// Generate MOL file content from SMILE string
function generateMolFromSmile(smileString, moleculeName = 'Generated') {
    if (!smileString) {
        return generateBasicMolFile(moleculeName);
    }
    
    try {
        // Parse SMILES to extract basic molecular information
        const atoms = parseAtomsFromSmileForMol(smileString);
        const bonds = parseBondsFromSmileForMol(smileString, atoms);
        
        if (atoms.length === 0) {
            return generateBasicMolFile(moleculeName);
        }
        
        // Generate 2D coordinates for atoms
        const coordinates = generate2DCoordinatesForMol(atoms);
        
        // Create MOL file content
        return createMolFileContent(moleculeName, atoms, coordinates, bonds);
        
    } catch (error) {
        console.error('Failed to generate MOL from SMILE:', error);
        return generateBasicMolFile(moleculeName);
    }
}

// Generate basic MOL file as fallback
function generateBasicMolFile(moleculeName = 'Generated') {
    const currentDate = new Date().toISOString().substring(0, 10).replace(/-/g, '');
    return `${moleculeName}
  Generated by Nurumayu Smile 3D ${currentDate}
  
  1  0  0  0  0  0  0  0  0  0999 V2000
    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
M  END
$$$$
`;
}

// Parse atoms from SMILE string for MOL generation
function parseAtomsFromSmileForMol(smile) {
    const atoms = [];
    
    // Enhanced SMILES parsing
    let i = 0;
    while (i < smile.length) {
        const char = smile[i];
        
        if (char === '[') {
            // Bracketed atom
            const endBracket = smile.indexOf(']', i);
            if (endBracket !== -1) {
                const atomInfo = smile.substring(i + 1, endBracket);
                const element = atomInfo.match(/^[A-Z][a-z]?/);
                if (element) {
                    atoms.push({
                        element: element[0],
                        charge: 0,
                        index: atoms.length
                    });
                }
                i = endBracket + 1;
            } else {
                i++;
            }
        } else if (/[A-Z]/.test(char)) {
            // Regular atom
            let element = char;
            if (i + 1 < smile.length && /[a-z]/.test(smile[i + 1])) {
                element += smile[i + 1];
                i += 2;
            } else {
                i++;
            }
            
            atoms.push({
                element: element,
                charge: 0,
                index: atoms.length
            });
        } else {
            i++;
        }
    }
    
    // Ensure we have at least one carbon atom
    if (atoms.length === 0) {
        atoms.push({ element: 'C', charge: 0, index: 0 });
    }
    
    return atoms;
}

// Parse bonds from SMILE string for MOL generation
function parseBondsFromSmileForMol(smile, atoms) {
    const bonds = [];
    
    // Simple bond parsing - create linear chain for basic structure
    for (let i = 0; i < atoms.length - 1; i++) {
        bonds.push({
            atom1: i,
            atom2: i + 1,
            type: 1, // Single bond
            stereo: 0
        });
    }
    
    // Parse ring closures (basic implementation)
    const ringNumbers = smile.match(/\d/g);
    if (ringNumbers) {
        const ringMap = new Map();
        let atomIndex = 0;
        
        for (let i = 0; i < smile.length; i++) {
            const char = smile[i];
            if (/[A-Z\[]/.test(char)) {
                // Atom encountered
                if (/\d/.test(smile[i + 1])) {
                    const ringNum = smile[i + 1];
                    if (ringMap.has(ringNum)) {
                        // Close ring
                        const startAtom = ringMap.get(ringNum);
                        if (startAtom !== atomIndex && atomIndex < atoms.length) {
                            bonds.push({
                                atom1: startAtom,
                                atom2: atomIndex,
                                type: 1,
                                stereo: 0
                            });
                        }
                        ringMap.delete(ringNum);
                    } else {
                        // Open ring
                        ringMap.set(ringNum, atomIndex);
                    }
                }
                atomIndex++;
            }
        }
    }
    
    return bonds;
}

// Generate 2D coordinates for MOL file
function generate2DCoordinatesForMol(atoms) {
    const coordinates = [];
    const bondLength = 1.5; // Standard bond length
    
    if (atoms.length === 1) {
        coordinates.push({ x: 0, y: 0, z: 0 });
        return coordinates;
    }
    
    // Generate coordinates in a simple pattern
    for (let i = 0; i < atoms.length; i++) {
        let x, y;
        
        if (i === 0) {
            x = 0;
            y = 0;
        } else if (i === 1) {
            x = bondLength;
            y = 0;
        } else {
            // Arrange in a zigzag pattern
            const angle = (i % 2 === 0) ? Math.PI / 6 : -Math.PI / 6;
            const baseX = Math.floor(i / 2) * bondLength;
            x = baseX + bondLength * Math.cos(angle);
            y = bondLength * Math.sin(angle);
        }
        
        coordinates.push({ x: x, y: y, z: 0 });
    }
    
    return coordinates;
}

// Create MOL file content
function createMolFileContent(moleculeName, atoms, coordinates, bonds) {
    const currentDate = new Date().toISOString().substring(0, 10).replace(/-/g, '');
    
    // Header
    let molContent = `${moleculeName}\n`;
    molContent += `  Generated by Nurumayu Smile 3D ${currentDate}\n`;
    molContent += `  \n`;
    
    // Counts line
    const atomCount = atoms.length;
    const bondCount = bonds.length;
    molContent += `${atomCount.toString().padStart(3)}${bondCount.toString().padStart(3)}  0  0  0  0  0  0  0  0999 V2000\n`;
    
    // Atom block
    for (let i = 0; i < atoms.length; i++) {
        const atom = atoms[i];
        const coord = coordinates[i];
        const x = coord.x.toFixed(4).padStart(10);
        const y = coord.y.toFixed(4).padStart(10);
        const z = coord.z.toFixed(4).padStart(10);
        molContent += `${x}${y}${z} ${atom.element.padEnd(3)} 0  0  0  0  0  0  0  0  0  0  0  0\n`;
    }
    
    // Bond block
    for (const bond of bonds) {
        const atom1 = (bond.atom1 + 1).toString().padStart(3);
        const atom2 = (bond.atom2 + 1).toString().padStart(3);
        const bondType = bond.type.toString().padStart(3);
        const stereo = bond.stereo.toString().padStart(3);
        molContent += `${atom1}${atom2}${bondType}${stereo}  0  0  0\n`;
    }
    
    molContent += 'M  END\n';
    molContent += '$$$$\n';
    
    return molContent;
}

// Session storage functions for molecular data
function saveMolecularDataToSession() {
    try {
        const inputText = document.getElementById('compound-input').value;
        sessionStorage.setItem(MOLECULAR_STORAGE_KEYS.input, inputText);
        
        if (currentMolecule) {
            sessionStorage.setItem(MOLECULAR_STORAGE_KEYS.molecule, JSON.stringify(currentMolecule));
        }
        
        const resultsVisible = document.getElementById('results').style.display !== 'none';
        sessionStorage.setItem(MOLECULAR_STORAGE_KEYS.results_visible, resultsVisible.toString());
    } catch (error) {
        console.warn('Failed to save molecular data to session storage:', error);
    }
}

function loadMolecularDataFromSession() {
    try {
        console.log('Checking session storage for molecular data...');
        
        // Restore input text with multiple fallbacks
        let savedInput = sessionStorage.getItem(MOLECULAR_STORAGE_KEYS.input) || 
                        sessionStorage.getItem('smile3d_input_backup') || 
                        localStorage.getItem('smile3d_input_permanent');
        
        const inputElement = document.getElementById('compound-input');
        if (savedInput && inputElement) {
            console.log('Restoring input text:', savedInput);
            inputElement.value = savedInput;
            // Force trigger input event to ensure consistency
            inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        // Restore molecule data
        const savedMolecule = sessionStorage.getItem(MOLECULAR_STORAGE_KEYS.molecule);
        if (savedMolecule) {
            console.log('Restoring molecule data...');
            currentMolecule = JSON.parse(savedMolecule);
            
            // Also set window properties for compatibility
            window.currentMolecule = currentMolecule;
            window.currentMoleculeData = currentMolecule;
            
            displayMolecularResults(currentMolecule);
            
            // Restore viewer with current mode
            if (currentMolecule.smile) {
                console.log('Restoring molecular viewer with SMILE:', currentMolecule.smile);
                setTimeout(() => {
                    // Use the unified display function from viewer3d.js
                    if (typeof displayMolecularStructure === 'function') {
                        displayMolecularStructure(currentMolecule.smile);
                    } else if (typeof display3DMolecule === 'function') {
                        display3DMolecule(currentMolecule.smile);
                    } else {
                        console.warn('No molecular display function available during restore');
                    }
                }, 500);
            }
        }
        
        // Restore results visibility
        const resultsVisible = sessionStorage.getItem(MOLECULAR_STORAGE_KEYS.results_visible);
        if (resultsVisible === 'true' && currentMolecule) {
            console.log('Restoring results visibility');
            showResults();
        }
        
    } catch (error) {
        console.warn('Failed to load molecular data from session storage:', error);
        // Don't clear session on minor errors
    }
}

function clearMolecularSession() {
    try {
        // Clear session storage
        sessionStorage.removeItem(MOLECULAR_STORAGE_KEYS.input);
        sessionStorage.removeItem(MOLECULAR_STORAGE_KEYS.molecule);
        sessionStorage.removeItem(MOLECULAR_STORAGE_KEYS.results_visible);
        
        // Clear backup storage keys
        sessionStorage.removeItem('smile3d_input_backup');
        localStorage.removeItem('smile3d_input_permanent');
        
        // Clear fragmentation storage as well
        sessionStorage.removeItem('smile3d_fragmentation_data');
        sessionStorage.removeItem('smile3d_experimental_data');
        sessionStorage.removeItem('smile3d_analysis_details');
        
        console.log('All molecular session data cleared');
    } catch (error) {
        console.warn('Failed to clear molecular session storage:', error);
    }
}

// Clear input and reset form
function clearInput() {
    document.getElementById('compound-input').value = '';
    hideResults();
    hideError();
    currentMolecule = null;
    
    // Clear window properties
    window.currentMolecule = null;
    window.currentMoleculeData = null;
    
    // Clear session storage
    clearMolecularSession();
    
    // Fire event for other modules to clear their data
    window.dispatchEvent(new CustomEvent('moleculeCleared'));
    
    // Clear 3D viewer
    if (typeof clear3DViewer === 'function') {
        clear3DViewer();
    }
}

// Retry generation
function retryGeneration() {
    generateMolecularStructure();
}

// UI Helper Functions
function showLoading(show) {
    const loadingElement = document.getElementById('loading');
    const generateBtn = document.getElementById('generate-btn');
    
    if (show) {
        loadingElement.style.display = 'flex';
        generateBtn.disabled = true;
    } else {
        loadingElement.style.display = 'none';
        generateBtn.disabled = false;
    }
}

function showError(message) {
    const errorElement = document.getElementById('error');
    const errorMessage = errorElement.querySelector('.error-message');
    errorMessage.textContent = message;
    errorElement.style.display = 'block';
}

function hideError() {
    const errorElement = document.getElementById('error');
    errorElement.style.display = 'none';
}

function showResults() {
    const resultsElement = document.getElementById('results');
    resultsElement.style.display = 'block';
    resultsElement.classList.add('fade-in');
    
    // Show fragmentation section
    const fragmentationElement = document.getElementById('fragmentation');
    fragmentationElement.style.display = 'block';
}

function hideResults() {
    const resultsElement = document.getElementById('results');
    resultsElement.style.display = 'none';
    resultsElement.classList.remove('fade-in');
}

function showNotification(message) {
    // Simple notification system
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Add CSS for notification animation
const style = document.createElement('style');
style.textContent = `
@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}
`;
document.head.appendChild(style);

// Initialize molecular data restoration with improved reliability
function initializeMolecularApp() {
    // Prevent duplicate initialization
    if (window.molecularAppInitialized) {
        console.log('Molecular app already initialized');
        return;
    }
    
    console.log('Initializing molecular app...');
    
    try {
        // First restore session data
        loadMolecularDataFromSession();
        
        // Setup auto-save for input changes
        const inputElement = document.getElementById('compound-input');
        if (inputElement) {
            // Remove any existing listeners to prevent duplicates
            inputElement.removeEventListener('input', handleInputChange);
            inputElement.removeEventListener('blur', handleInputBlur);
            
            // Add new listeners
            inputElement.addEventListener('input', handleInputChange);
            inputElement.addEventListener('blur', handleInputBlur);
            
            console.log('Input auto-save listeners attached');
        }
        
        // Setup sample button event listener with enhanced error checking
        const sampleBtn = document.getElementById('sample-btn');
        if (sampleBtn) {
            console.log('🎯 Sample button element found:', sampleBtn);
            
            // Remove any existing listeners to prevent duplicates
            sampleBtn.removeEventListener('click', insertSampleCompound);
            
            // Add new listener with error handling
            sampleBtn.addEventListener('click', function(event) {
                console.log('🎲 Sample button clicked (event handler)');
                event.preventDefault();
                try {
                    insertSampleCompound();
                } catch (error) {
                    console.error('❌ Error in insertSampleCompound:', error);
                }
            });
            
            console.log('✅ Sample button listener attached successfully');
            
            // Test button visibility and properties
            console.log('Sample button properties:', {
                id: sampleBtn.id,
                className: sampleBtn.className,
                disabled: sampleBtn.disabled,
                style: sampleBtn.style.display
            });
        } else {
            console.error('❌ Sample button element not found!');
            
            // Try again after a delay
            setTimeout(() => {
                const retryBtn = document.getElementById('sample-btn');
                if (retryBtn) {
                    console.log('🔄 Retry: Sample button found, attaching listener');
                    retryBtn.addEventListener('click', insertSampleCompound);
                } else {
                    console.error('❌ Sample button still not found after retry');
                }
            }, 1000);
        }
        
        // Setup generate button event listener
        const generateBtn = document.getElementById('generate-btn');
        if (generateBtn) {
            // Remove any existing listeners to prevent duplicates
            generateBtn.removeEventListener('click', generateMolecularStructure);
            
            // Add new listener
            generateBtn.addEventListener('click', generateMolecularStructure);
            
            console.log('Generate button listener attached');
        }
        
        // Setup clear button event listener
        const clearBtn = document.getElementById('clear-btn');
        if (clearBtn) {
            // Remove any existing listeners to prevent duplicates
            clearBtn.removeEventListener('click', clearInput);
            
            // Add new listener
            clearBtn.addEventListener('click', clearInput);
            
            console.log('Clear button listener attached');
        }
        
        // Setup copy SMILE button event listener
        const copySmileBtn = document.getElementById('copy-smile');
        if (copySmileBtn) {
            // Remove any existing listeners to prevent duplicates
            copySmileBtn.removeEventListener('click', copySmileToClipboard);
            
            // Add new listener
            copySmileBtn.addEventListener('click', copySmileToClipboard);
            
            console.log('Copy SMILE button listener attached');
        }
        
        // Setup download MOL button event listener
        const downloadMolBtn = document.getElementById('download-mol');
        if (downloadMolBtn) {
            // Remove any existing listeners to prevent duplicates
            downloadMolBtn.removeEventListener('click', downloadMolFile);
            
            // Add new listener
            downloadMolBtn.addEventListener('click', downloadMolFile);
            
            console.log('Download MOL button listener attached');
        }
        
        window.molecularAppInitialized = true;
        console.log('Molecular app initialization completed');
        
    } catch (error) {
        console.error('Failed to initialize molecular app:', error);
    }
}

// Input change handler
function handleInputChange(event) {
    try {
        const value = event.target.value;
        sessionStorage.setItem(MOLECULAR_STORAGE_KEYS.input, value);
        sessionStorage.setItem('smile3d_input_backup', value);
        localStorage.setItem('smile3d_input_permanent', value);
    } catch (error) {
        console.warn('Failed to auto-save input:', error);
    }
}

// Input blur handler
function handleInputBlur(event) {
    try {
        const value = event.target.value;
        sessionStorage.setItem(MOLECULAR_STORAGE_KEYS.input, value);
        sessionStorage.setItem('smile3d_input_backup', value);
        localStorage.setItem('smile3d_input_permanent', value);
    } catch (error) {
        console.warn('Failed to save input on blur:', error);
    }
}

// Enhanced Error Message System
function showEnhancedErrorMessage(errorType, error, options = {}) {
    const {
        primaryAction = 'Try Again',
        secondaryActions = [],
        context = 'operation'
    } = options;

    console.error(`Enhanced Error [${errorType}]:`, error);

    // Create error message container
    const errorContainer = document.createElement('div');
    errorContainer.className = 'enhanced-error-message';
    errorContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
        border: 2px solid #f44336;
        border-radius: 12px;
        padding: 20px;
        max-width: 400px;
        box-shadow: 0 8px 32px rgba(244, 67, 54, 0.3);
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
        font-family: inherit;
    `;

    // Generate user-friendly error message
    const { title, message, steps } = generateErrorDetails(errorType, error);

    errorContainer.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 12px;">
            <div style="font-size: 24px; margin-right: 10px;">⚠️</div>
            <div>
                <h4 style="margin: 0; color: #c62828; font-size: 16px;">${title}</h4>
                <p style="margin: 4px 0 0 0; color: #666; font-size: 13px;">${context} failed</p>
            </div>
        </div>
        
        <div style="margin-bottom: 15px;">
            <p style="margin: 0; color: #424242; font-size: 14px; line-height: 1.4;">${message}</p>
        </div>
        
        <div class="error-recovery-steps" style="margin-bottom: 15px;">
            <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #666;">Recommended steps:</p>
            <ol style="margin: 0; padding-left: 20px; color: #555; font-size: 12px;">
                ${steps.map(step => `<li style="margin-bottom: 4px;">${step}</li>`).join('')}
            </ol>
        </div>
        
        <div class="error-actions" style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="error-primary-btn" style="
                background: #f44336;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 13px;
                cursor: pointer;
                transition: background 0.2s;
                font-weight: 500;
            ">${primaryAction}</button>
            ${secondaryActions.map(action => `
                <button class="error-secondary-btn" style="
                    background: white;
                    color: #f44336;
                    border: 1px solid #f44336;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                " data-action="${action.toLowerCase().replace(/\s+/g, '_')}">${action}</button>
            `).join('')}
            <button class="error-dismiss-btn" style="
                background: transparent;
                color: #666;
                border: 1px solid #ccc;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                cursor: pointer;
                margin-left: auto;
            ">Dismiss</button>
        </div>
    `;

    // Add event listeners
    const primaryBtn = errorContainer.querySelector('.error-primary-btn');
    const secondaryBtns = errorContainer.querySelectorAll('.error-secondary-btn');
    const dismissBtn = errorContainer.querySelector('.error-dismiss-btn');

    primaryBtn.addEventListener('click', () => {
        handleErrorAction(errorType, 'primary', primaryAction);
        dismissErrorMessage(errorContainer);
    });

    secondaryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.getAttribute('data-action');
            handleErrorAction(errorType, 'secondary', action);
            dismissErrorMessage(errorContainer);
        });
    });

    dismissBtn.addEventListener('click', () => {
        dismissErrorMessage(errorContainer);
    });

    // Auto-dismiss after 15 seconds
    setTimeout(() => {
        if (document.body.contains(errorContainer)) {
            dismissErrorMessage(errorContainer);
        }
    }, 15000);

    document.body.appendChild(errorContainer);
}

// Generate user-friendly error details
function generateErrorDetails(errorType, error) {
    const errorMap = {
        molecular_generation: {
            title: 'Molecular Generation Failed',
            message: 'Unable to generate molecular structure from your input.',
            steps: [
                'Check your compound description for typos',
                'Try using a simpler description', 
                'Ensure the compound name is chemically valid',
                'Use example compounds if unsure'
            ]
        },
        llm_api_error: {
            title: 'AI Service Unavailable',
            message: 'The AI service is temporarily unavailable or experiencing high load.',
            steps: [
                'Wait a few moments and try again',
                'Check your internet connection',
                'Try a shorter, simpler input',
                'Contact support if the problem persists'
            ]
        },
        fragmentation_prediction: {
            title: 'Fragmentation Analysis Failed',
            message: 'Could not predict MS fragmentation patterns for this compound.',
            steps: [
                'Ensure a valid molecular structure was generated first',
                'Try generating the structure again',
                'Check if the compound is within supported molecular weight range',
                'Use a different compound for testing'
            ]
        },
        database_search: {
            title: 'Database Search Error',
            message: 'Unable to search chemical databases for related compounds.',
            steps: [
                'Check your internet connection',
                'Try the search again in a few moments',
                'Use a different search parameter (formula vs SMILES)',
                'Continue without database enhancement'
            ]
        },
        structure_visualization: {
            title: 'Structure Display Error',
            message: 'Failed to display the molecular structure in 2D or 3D.',
            steps: [
                'Try refreshing the page',
                'Check if WebGL is supported in your browser',
                'Try a different browser if the problem persists',
                'Use the text output as fallback'
            ]
        },
        file_operation: {
            title: 'File Operation Failed',
            message: 'Could not save or load the requested file.',
            steps: [
                'Check your browser\'s download permissions',
                'Try saving to a different location',
                'Ensure you have sufficient storage space',
                'Try copying the data manually'
            ]
        }
    };

    return errorMap[errorType] || {
        title: 'Unexpected Error',
        message: 'An unexpected error occurred during the operation.',
        steps: [
            'Try the operation again',
            'Refresh the page if the problem persists', 
            'Check your internet connection',
            'Contact support with error details'
        ]
    };
}

// Handle error recovery actions
function handleErrorAction(errorType, actionType, action) {
    console.log(`Handling error action: ${actionType} - ${action} for ${errorType}`);
    
    switch (action.toLowerCase().replace(/\s+/g, '_')) {
        case 'retry_generation':
        case 'try_again':
            if (typeof generateMolecularStructure === 'function') {
                generateMolecularStructure();
            }
            break;
            
        case 'check_input':
            const input = document.getElementById('compound-input');
            if (input) {
                input.focus();
                input.select();
            }
            break;
            
        case 'use_example':
            const examples = [
                'caffeine',
                'aspirin',
                'glucose',
                'benzene',
                'ethanol'
            ];
            const randomExample = examples[Math.floor(Math.random() * examples.length)];
            const inputField = document.getElementById('compound-input');
            if (inputField) {
                inputField.value = randomExample;
                inputField.focus();
            }
            break;
            
        case 'refresh_page':
            window.location.reload();
            break;
            
        case 'contact_support':
            window.open('mailto:support@nurumayu.dev?subject=Smile3D Error Report&body=' + 
                encodeURIComponent(`Error Type: ${errorType}\nDetails: ${JSON.stringify(action)}`));
            break;
            
        default:
            console.log(`No handler for action: ${action}`);
    }
}

// Dismiss error message with animation
function dismissErrorMessage(errorContainer) {
    errorContainer.style.animation = 'slideOutRight 0.3s ease-in';
    setTimeout(() => {
        if (document.body.contains(errorContainer)) {
            document.body.removeChild(errorContainer);
        }
    }, 300);
}

// Add CSS animations for error messages
function addErrorMessageStyles() {
    if (document.getElementById('error-message-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'error-message-styles';
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .error-primary-btn:hover {
            background: #d32f2f !important;
        }
        
        .error-secondary-btn:hover {
            background: #f44336 !important;
            color: white !important;
        }
        
        .error-dismiss-btn:hover {
            background: #f5f5f5 !important;
            border-color: #999 !important;
        }
    `;
    document.head.appendChild(style);
}

// Initialize error message system
document.addEventListener('DOMContentLoaded', function() {
    addErrorMessageStyles();
});

// Ensure initialization happens when DOM is ready
function ensureMolecularAppInitialization() {
    console.log('🔧 Ensuring molecular app initialization...');
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            console.log('📋 DOM loaded, initializing molecular app');
            setTimeout(initializeMolecularApp, 100);
        });
    } else {
        console.log('📋 DOM already loaded, initializing molecular app immediately');
        initializeMolecularApp();
    }
    
    // Emergency fallback initialization
    setTimeout(() => {
        if (!window.molecularAppInitialized) {
            console.warn('⚠️ Emergency fallback initialization triggered');
            initializeMolecularApp();
        }
    }, 2000);
}

// Start initialization process
ensureMolecularAppInitialization();