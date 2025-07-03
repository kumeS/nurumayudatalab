// Molecular Structure Viewer Module
// Handles both 2D and 3D visualization

let viewer3D = null;
let currentModel = null;
let current2DStructure = null;
let currentViewMode = '2d'; // Default to 2D view

// Initialize molecular viewers (both 2D and 3D)
function initialize3DViewer() {
    console.log('Initializing molecular viewers...');
    
    // Initialize 2D viewer first (default)
    const viewer2DInit = initialize2DViewer();
    
    // Initialize 3D viewer
    const viewer3DInit = initialize3DMolViewer();
    
    // Set initial UI state (default is 2D mode)
    const resetBtn = document.getElementById('reset-view');
    if (resetBtn) {
        resetBtn.style.display = 'none'; // Hide reset button for initial 2D mode
    }
    
    // Setup event handlers for view controls
    setupViewControlEventHandlers();
    
    console.log('Molecular viewers initialization completed');
    return viewer2DInit || viewer3DInit; // Return true if at least one viewer initialized
}

// Initialize 2D viewer
function initialize2DViewer() {
    const viewer2DContainer = document.getElementById('viewer-2d');
    if (!viewer2DContainer) {
        console.error('2D Viewer container not found');
        return false;
    }
    
    // Clear container and setup for 2D display
    viewer2DContainer.innerHTML = '';
    viewer2DContainer.style.display = 'flex';
    viewer2DContainer.style.alignItems = 'center';
    viewer2DContainer.style.justifyContent = 'center';
    viewer2DContainer.style.backgroundColor = '#fff';
    viewer2DContainer.style.border = '1px solid #ddd';
    viewer2DContainer.style.minHeight = '300px';
    
    console.log('2D viewer initialized successfully');
    return true;
}

// Initialize 3D viewer with enhanced error handling and WebGL support check
function initialize3DMolViewer() {
    const viewerContainer = document.getElementById('viewer-3d');
    if (!viewerContainer) {
        console.error('3D Viewer container not found');
        return false;
    }

    // Enhanced 3Dmol.js library detection with retry mechanism
    if (typeof $3Dmol === 'undefined') {
        console.warn('3Dmol.js library not loaded - attempting to wait for library...');
        
        // Try to wait for library to load
        let attempts = 0;
        const maxAttempts = 10;
        
        const checkLibrary = () => {
            attempts++;
            if (typeof $3Dmol !== 'undefined') {
                console.log('3Dmol.js loaded after', attempts, 'attempts');
                return true;
            } else if (attempts >= maxAttempts) {
                console.error('3Dmol.js failed to load after', maxAttempts, 'attempts');
                showViewer3DError('3D visualization library failed to load. Please refresh the page.');
                return false;
            } else {
                setTimeout(checkLibrary, 500);
                return false;
            }
        };
        
        if (!checkLibrary()) {
            return false;
        }
    }

    // Enhanced WebGL support check
    if (!checkWebGLSupport()) {
        console.warn('WebGL not supported - 3D view will be disabled');
        showViewer3DError('WebGL is required for 3D visualization but is not supported in your browser. Please try a different browser or enable WebGL.');
        return false;
    }

    try {
        // Ensure container has proper dimensions to avoid WebGL framebuffer errors
        const containerRect = viewerContainer.getBoundingClientRect();
        if (containerRect.width === 0 || containerRect.height === 0) {
            // Set minimum dimensions if container has no size
            viewerContainer.style.width = '400px';
            viewerContainer.style.height = '300px';
            console.log('Set default dimensions for 3D viewer container');
        }

        // Clear any existing content
        viewerContainer.innerHTML = '';

        // Create 3D viewer with enhanced configuration
        viewer3D = $3Dmol.createViewer(viewerContainer, {
            defaultcolors: $3Dmol.rasmolElementColors,
            backgroundColor: '#f8f9fa',
            disableFog: false,
            antialias: true,
            preserveDrawingBuffer: true
        });

        // Verify viewer was created successfully
        if (!viewer3D) {
            throw new Error('Failed to create 3Dmol viewer instance');
        }

        // Set initial view with enhanced error handling
        try {
            viewer3D.setBackgroundColor('#f8f9fa');
            viewer3D.zoomTo();
            viewer3D.render();
            
            // Test basic viewer functionality
            const canvas = viewer3D.getCanvas();
            if (!canvas) {
                throw new Error('Viewer canvas not available');
            }
            
            console.log('✅ 3D viewer initialized and tested successfully');
        } catch (renderError) {
            console.warn('⚠️ Initial 3D render failed, viewer created but not rendered:', renderError);
            // Continue anyway - viewer is created and can be used later
        }

        // Set up viewer event handlers
        setupViewer3DEventHandlers();

        return true;
    } catch (error) {
        console.error('❌ Failed to initialize 3D viewer:', error);
        showViewer3DError(`Failed to initialize 3D viewer: ${error.message}`);
        return false;
    }
}

// Enhanced WebGL support check with detailed diagnostics
function checkWebGLSupport() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
            console.warn('⚠️ WebGL not supported in this browser');
            return false;
        }
        
        // Check for basic WebGL functionality
        const renderer = gl.getParameter(gl.RENDERER);
        const vendor = gl.getParameter(gl.VENDOR);
        const version = gl.getParameter(gl.VERSION);
        
        console.log('✅ WebGL Support Details:');
        console.log('  Renderer:', renderer);
        console.log('  Vendor:', vendor);
        console.log('  Version:', version);
        
        // Check for required extensions
        const extensions = gl.getSupportedExtensions();
        console.log('  Supported Extensions:', extensions?.length || 0);
        
        // Test basic rendering capability
        const buffer = gl.createBuffer();
        if (!buffer) {
            console.warn('⚠️ WebGL buffer creation failed');
            return false;
        }
        
        gl.deleteBuffer(buffer);
        return true;
        
    } catch (e) {
        console.error('❌ WebGL support check failed:', e);
        return false;
    }
}

// Setup 3D viewer event handlers
function setupViewer3DEventHandlers() {
    if (!viewer3D) return;

    try {
        // Add error handler for WebGL context loss
        const canvas = viewer3D.getCanvas();
        if (canvas) {
            canvas.addEventListener('webglcontextlost', function(event) {
                event.preventDefault();
                console.warn('⚠️ WebGL context lost, attempting recovery...');
                
                // Attempt to recover after a short delay
                setTimeout(() => {
                    try {
                        initialize3DMolViewer();
                        if (current2DStructure && currentViewMode === '3d') {
                            display3DMolecule(current2DStructure);
                        }
                    } catch (error) {
                        console.error('❌ Failed to recover from WebGL context loss:', error);
                        showViewer3DError('3D viewer context lost. Please refresh the page.');
                    }
                }, 1000);
            });

            canvas.addEventListener('webglcontextrestored', function() {
                console.log('✅ WebGL context restored');
            });
        }
    } catch (error) {
        console.warn('⚠️ Failed to setup 3D viewer event handlers:', error);
    }
}

// Display 3D molecule from SMILE string with enhanced error handling
async function display3DMolecule(smileString) {
    // Show process indicator for 3D visualization
    if (typeof window.showProcessStep === 'function') {
        window.showProcessStep('visualization');
    }
    console.log('🎯 Attempting to display 3D molecule:', smileString);
    
    // Enhanced validation
    if (!viewer3D) {
        console.error('❌ 3D viewer not initialized, attempting to initialize...');
        if (!initialize3DMolViewer()) {
            console.error('❌ Failed to initialize 3D viewer, falling back to 2D');
            display2DMolecule(smileString);
            return;
        }
    }

    if (!smileString || typeof smileString !== 'string' || smileString.trim().length === 0) {
        console.error('❌ Invalid SMILE string provided');
        showViewer3DError('Invalid molecular structure data');
        return;
    }

    try {
        // Verify viewer is still valid
        if (!viewer3D.getCanvas()) {
            console.warn('⚠️ 3D viewer canvas invalid, reinitializing...');
            initialize3DMolViewer();
        }

        // Clear previous models with error handling
        try {
            viewer3D.removeAllModels();
            currentModel = null;
            viewer3D.render(); // Clear the display
        } catch (clearError) {
            console.warn('⚠️ Failed to clear previous models:', clearError);
        }

        // Show loading state
        showViewerLoading(true);
        console.log('🔄 Loading 3D structure...');

        // Convert SMILE to 3D structure with improved timeout
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('3D conversion timeout (30s)')), 30000)
        );
        
        const structure3D = await Promise.race([
            convertSmileTo3D(smileString),
            timeoutPromise
        ]);
        
        if (structure3D) {
            console.log('✅ Got 3D structure data, validating...');
            
            // Validate structure data before rendering
            if (!validate3DStructure(structure3D)) {
                console.warn('❌ Invalid 3D structure data received, trying fallback generation');
                const fallbackStructure = generateFallback3DStructure();
                if (!validate3DStructure(fallbackStructure)) {
                    throw new Error('All 3D structure generation methods failed');
                }
                return display3DMolecule_Internal(fallbackStructure);
            }
            
            return display3DMolecule_Internal(structure3D);
            
        } else {
            throw new Error('No 3D structure data received');
        }

    } catch (error) {
        console.error('❌ Failed to display 3D molecule:', error);
        
        // Show user-friendly error message with options
        showViewer3DError(`3D visualization failed: ${error.message}. Try using 2D view or retry.`);
        
        // Offer user choice instead of auto-switching
        showNotification('3D visualization failed. You can switch to 2D view manually or try again.', 'warning');
        
        // Hide process indicator on error
        if (typeof window.hideProcessStep === 'function') {
            window.hideProcessStep('visualization');
        }
        
    } finally {
        showViewerLoading(false);
        
        // Hide process indicator when visualization completes
        setTimeout(() => {
            if (typeof window.hideProcessStep === 'function') {
                window.hideProcessStep('visualization');
            }
        }, 2000);
    }
}

// Internal function to handle actual 3D molecule display
function display3DMolecule_Internal(structure3D) {
    try {
        console.log('🧬 Rendering 3D molecule...');
        
        // Add model to viewer with comprehensive error handling
        currentModel = viewer3D.addModel(structure3D, 'sdf');
        
        if (!currentModel) {
            throw new Error('Failed to create 3D model from structure data');
        }
        
        // Verify model has atoms
        const atoms = currentModel.selectedAtoms();
        if (!atoms || atoms.length === 0) {
            throw new Error('3D model contains no atoms');
        }
        
        console.log(`✅ Model created with ${atoms.length} atoms`);
        
        // Set initial style
        const currentStyle = getCurrentViewStyle();
        applyViewStyle(currentStyle);
        
        // Center and zoom to fit the molecule properly
        viewer3D.center();
        viewer3D.zoomTo();
        
        // Set camera position for better viewing angle
        viewer3D.rotate(20, {x: 1, y: 0, z: 0});
        viewer3D.rotate(20, {x: 0, y: 1, z: 0});
        
        // Render with error handling
        try {
            viewer3D.render();
            console.log('✅ 3D molecule displayed successfully');
            
            // Show success notification
            showNotification('3D structure loaded successfully!', 'success');
            
        } catch (renderError) {
            throw new Error(`Rendering failed: ${renderError.message}`);
        }
        
    } catch (error) {
        console.error('❌ Internal 3D display failed:', error);
        throw error; // Re-throw to be handled by parent function
    }
}

// Validate 3D structure data
function validate3DStructure(structureData) {
    if (!structureData || typeof structureData !== 'string') {
        return false;
    }
    
    // Check for basic SDF format markers
    if (!structureData.includes('$$$$') && !structureData.includes('M  END')) {
        return false;
    }
    
    // Check for reasonable coordinate data (not all zeros or circular)
    const lines = structureData.split('\n');
    let coordinateLines = 0;
    let validCoordinates = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.length >= 30) { // Typical SDF atom line length
            const parts = line.split(/\s+/);
            if (parts.length >= 3) {
                const x = parseFloat(parts[0]);
                const y = parseFloat(parts[1]);
                const z = parseFloat(parts[2]);
                
                if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
                    coordinateLines++;
                    // Check for non-zero, reasonable coordinates
                    if (Math.abs(x) > 0.001 || Math.abs(y) > 0.001 || Math.abs(z) > 0.001) {
                        validCoordinates++;
                    }
                }
            }
        }
    }
    
    // Need at least 2 atoms with valid coordinates
    return coordinateLines >= 2 && validCoordinates >= 1;
}

// Convert SMILE to 3D structure using multiple external services
async function convertSmileTo3D(smileString) {
    console.log('🔬 Converting SMILES to 3D:', smileString);
    
    // Try multiple API endpoints in order of preference
    const apiEndpoints = [
        {
            name: 'NIH Chemical Resolver',
            url: `https://cactus.nci.nih.gov/chemical/structure/${encodeURIComponent(smileString)}/file?format=sdf&get3d=true`,
            headers: { 'Accept': 'chemical/x-mdl-sdfile' }
        },
        {
            name: 'PubChem REST API (via CID lookup)',
            url: null, // Will be set dynamically after CID lookup
            headers: { 'Accept': 'chemical/x-mdl-sdfile' }
        },
        {
            name: 'Cloudflare Worker Proxy',
            url: `https://nurumayu-worker.skume-bioinfo.workers.dev/api/pubchem/sdf/${encodeURIComponent(smileString)}`,
            headers: { 'Accept': 'text/plain' }
        }
    ];
    
    // Try each endpoint
    for (const endpoint of apiEndpoints) {
        try {
            let finalUrl = endpoint.url;
            
            // Special handling for PubChem API (requires CID lookup first)
            if (endpoint.name.includes('PubChem REST API')) {
                const cid = await lookupPubChemCID(smileString);
                if (cid) {
                    finalUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/SDF?record_type=3d`;
                } else {
                    continue; // Skip this endpoint if CID lookup fails
                }
            }
            
            console.log(`🌐 Trying ${endpoint.name}:`, finalUrl);
            
            // Create timeout promise for better browser compatibility
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timeout')), 20000)
            );
            
            const fetchPromise = fetch(finalUrl, {
                method: 'GET',
                headers: endpoint.headers
            });
            
            const response = await Promise.race([fetchPromise, timeoutPromise]);

            if (response.ok) {
                const sdfData = await response.text();
                
                // Validate the SDF data
                if (validate3DStructure(sdfData)) {
                    console.log(`✅ Successfully got 3D structure from ${endpoint.name}`);
                    return sdfData;
                } else {
                    console.warn(`❌ Invalid SDF data from ${endpoint.name}`);
                }
            } else {
                console.warn(`❌ ${endpoint.name} returned status:`, response.status);
            }

        } catch (error) {
            console.warn(`❌ ${endpoint.name} failed:`, error.message);
        }
    }

    // All external services failed, try enhanced local generation
    console.log('🔧 All external APIs failed, trying enhanced local 3D generation...');
    
    // Try multiple local generation approaches
    const localMethods = [
        () => generateEnhancedLLMBased3D(smileString),
        () => generateAdvanced3DFromSmile(smileString),
        () => generateSmartFallback3DFromSmile(smileString)
    ];
    
    for (const method of localMethods) {
        try {
            const result = await method();
            if (result && validate3DStructure(result)) {
                console.log('✅ Local 3D generation succeeded');
                return result;
            }
        } catch (error) {
            console.warn('Local method failed:', error.message);
        }
    }
    
    console.warn('❌ All local generation methods failed');
    return generateFallback3DStructure();
}

// Lookup PubChem CID from SMILES
async function lookupPubChemCID(smileString) {
    try {
        console.log('🔍 Looking up PubChem CID for SMILES:', smileString);
        
        const response = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smileString)}/cids/JSON`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.IdentifierList && data.IdentifierList.CID && data.IdentifierList.CID.length > 0) {
                const cid = data.IdentifierList.CID[0];
                console.log('✅ Found CID:', cid);
                return cid;
            }
        }
        
        console.warn('❌ No CID found for SMILES');
        return null;
        
    } catch (error) {
        console.warn('❌ PubChem CID lookup failed:', error);
        return null;
    }
}

// Enhanced LLM-based 3D generation using molecular data
async function generateEnhancedLLMBased3D(smileString) {
    console.log('🧠 Generating enhanced LLM-based 3D structure for:', smileString);
    
    try {
        // Use current molecule data from LLM if available
        const moleculeData = window.currentMolecule || window.currentMoleculeData;
        
        if (!moleculeData) {
            console.warn('No LLM molecule data available');
            return null;
        }
        
        // Extract molecular information
        const molInfo = {
            smile: smileString,
            formula: moleculeData.formula || '',
            name: moleculeData.name || 'Generated',
            weight: moleculeData.molecularWeight || 0,
            description: moleculeData.description || ''
        };
        
        console.log('Using LLM molecule data:', molInfo);
        
        // Parse SMILES with enhanced logic
        const atoms = parseEnhancedAtomsFromSmile(smileString);
        const bonds = parseEnhancedBondsFromSmile(smileString, atoms);
        
        if (atoms.length === 0) {
            throw new Error('No atoms parsed from SMILES');
        }
        
        // Generate intelligent 3D coordinates based on molecular properties
        const coordinates = generateIntelligent3DCoordinates(atoms, bonds, molInfo);
        
        // Create high-quality SDF
        const sdf = createHighQualitySDFFromData(atoms, coordinates, bonds, molInfo);
        
        console.log('✅ Enhanced LLM-based 3D structure generated with', atoms.length, 'atoms');
        return sdf;
        
    } catch (error) {
        console.error('❌ Enhanced LLM-based generation failed:', error);
        return null;
    }
}

// Parse atoms with enhanced SMILES understanding
function parseEnhancedAtomsFromSmile(smileString) {
    const atoms = [];
    let i = 0;
    
    // Enhanced parsing with better handling of complex SMILES
    while (i < smileString.length) {
        const char = smileString[i];
        
        if (char === '[') {
            // Handle bracketed atoms [C@@H], [NH3+], etc.
            const closeBracket = smileString.indexOf(']', i);
            if (closeBracket !== -1) {
                const bracketContent = smileString.substring(i + 1, closeBracket);
                const atomMatch = bracketContent.match(/^([A-Z][a-z]?)/);
                
                if (atomMatch) {
                    // Extract charge and hydrogen count if present
                    const element = atomMatch[1];
                    const chargeMatch = bracketContent.match(/([+-]\d*|[+-])/);
                    const hydrogenMatch = bracketContent.match(/H(\d*)/);
                    
                    atoms.push({
                        element: element,
                        charge: chargeMatch ? parseCharge(chargeMatch[1]) : 0,
                        hydrogens: hydrogenMatch ? (hydrogenMatch[1] || 1) : 0,
                        index: atoms.length,
                        type: 'explicit'
                    });
                }
                i = closeBracket + 1;
            } else {
                i++;
            }
        } else if (/[A-Z]/.test(char)) {
            // Handle regular atoms (C, N, O, etc.)
            let element = char;
            if (i + 1 < smileString.length && /[a-z]/.test(smileString[i + 1])) {
                element += smileString[i + 1];
                i += 2;
            } else {
                i++;
            }
            
            // Check for lowercase aromatic atoms
            if (/[a-z]/.test(char)) {
                element = char.toUpperCase();
                if (i < smileString.length && /[a-z]/.test(smileString[i])) {
                    element += smileString[i];
                    i++;
                }
            }
            
            atoms.push({
                element: element,
                charge: 0,
                hydrogens: 0,
                index: atoms.length,
                type: 'implicit',
                aromatic: /[a-z]/.test(char)
            });
        } else {
            i++;
        }
    }
    
    return atoms;
}

// Parse bonds with enhanced understanding
function parseEnhancedBondsFromSmile(smileString, atoms) {
    const bonds = [];
    const ringStack = new Map();
    let atomIndex = 0;
    
    for (let i = 0; i < smileString.length; i++) {
        const char = smileString[i];
        
        if (/[A-Za-z\[]/.test(char)) {
            // Handle ring closure numbers
            let j = i + 1;
            while (j < smileString.length && /\d/.test(smileString[j])) {
                const ringNum = smileString[j];
                
                if (ringStack.has(ringNum)) {
                    // Close ring
                    const startAtom = ringStack.get(ringNum);
                    if (startAtom !== atomIndex && atomIndex < atoms.length) {
                        bonds.push({
                            atom1: startAtom,
                            atom2: atomIndex,
                            type: 1, // Single bond for now
                            stereo: 0,
                            ring: true
                        });
                    }
                    ringStack.delete(ringNum);
                } else {
                    // Open ring
                    ringStack.set(ringNum, atomIndex);
                }
                j++;
            }
            
            // Create bond to previous atom
            if (atomIndex > 0) {
                bonds.push({
                    atom1: atomIndex - 1,
                    atom2: atomIndex,
                    type: getBondType(smileString, i - 1),
                    stereo: 0,
                    ring: false
                });
            }
            
            atomIndex++;
            i = j - 1;
        }
    }
    
    return bonds;
}

// Get bond type from SMILES notation
function getBondType(smileString, position) {
    if (position < 0 || position >= smileString.length) return 1;
    
    const char = smileString[position];
    switch (char) {
        case '=': return 2; // Double bond
        case '#': return 3; // Triple bond
        case ':': return 4; // Aromatic bond
        default: return 1;  // Single bond
    }
}

// Parse charge notation
function parseCharge(chargeStr) {
    if (!chargeStr) return 0;
    
    if (chargeStr === '+') return 1;
    if (chargeStr === '-') return -1;
    
    const match = chargeStr.match(/([+-])(\d*)/);
    if (match) {
        const sign = match[1] === '+' ? 1 : -1;
        const value = match[2] ? parseInt(match[2]) : 1;
        return sign * value;
    }
    
    return 0;
}

// Generate intelligent 3D coordinates using molecular knowledge
function generateIntelligent3DCoordinates(atoms, bonds, molInfo) {
    console.log('🧮 Generating intelligent 3D coordinates for', atoms.length, 'atoms');
    
    const coords = [];
    const bondLength = 1.54; // Standard C-C bond length
    
    // Create adjacency list
    const adjacency = createAdjacencyList(atoms, bonds);
    
    // Identify molecular features
    const features = analyzeMolecularFeatures(atoms, bonds, adjacency, molInfo);
    
    // Generate coordinates based on molecular features
    if (features.hasRings) {
        return generateRingBasedCoordinates(atoms, bonds, adjacency, features);
    } else if (features.isLinear) {
        return generateLinearCoordinates(atoms, bonds, bondLength);
    } else {
        return generateBranchedCoordinates(atoms, bonds, adjacency, bondLength);
    }
}

// Create adjacency list for atoms
function createAdjacencyList(atoms, bonds) {
    const adj = new Map();
    
    atoms.forEach((atom, i) => {
        adj.set(i, []);
    });
    
    bonds.forEach(bond => {
        adj.get(bond.atom1).push({ 
            atom: bond.atom2, 
            type: bond.type, 
            ring: bond.ring 
        });
        adj.get(bond.atom2).push({ 
            atom: bond.atom1, 
            type: bond.type, 
            ring: bond.ring 
        });
    });
    
    return adj;
}

// Analyze molecular features for better coordinate generation
function analyzeMolecularFeatures(atoms, bonds, adjacency, molInfo) {
    const features = {
        hasRings: false,
        isLinear: false,
        isBranched: false,
        ringCount: 0,
        longestChain: 0,
        aromaticAtoms: 0
    };
    
    // Check for rings
    features.hasRings = bonds.some(bond => bond.ring);
    features.ringCount = new Set(bonds.filter(b => b.ring).map(b => `${b.atom1}-${b.atom2}`)).size;
    
    // Count aromatic atoms
    features.aromaticAtoms = atoms.filter(atom => atom.aromatic).length;
    
    // Check if linear (all atoms have ≤ 2 neighbors)
    features.isLinear = Array.from(adjacency.values()).every(neighbors => neighbors.length <= 2);
    
    // Check if branched (any atom has > 2 neighbors)
    features.isBranched = Array.from(adjacency.values()).some(neighbors => neighbors.length > 2);
    
    // Find longest chain
    features.longestChain = findLongestChain(adjacency);
    
    console.log('Molecular features:', features);
    return features;
}

// Generate coordinates for ring-containing molecules
function generateRingBasedCoordinates(atoms, bonds, adjacency, features) {
    const coords = [];
    const bondLength = 1.54;
    const placed = new Set();
    
    // Start with the largest ring
    const ringAtoms = findLargestRing(bonds, atoms.length);
    
    if (ringAtoms.length > 0) {
        // Place ring atoms in a regular polygon
        const angleStep = (2 * Math.PI) / ringAtoms.length;
        const radius = bondLength / (2 * Math.sin(Math.PI / ringAtoms.length));
        
        ringAtoms.forEach((atomIndex, i) => {
            const angle = i * angleStep;
            coords[atomIndex] = [
                radius * Math.cos(angle),
                radius * Math.sin(angle),
                0
            ];
            placed.add(atomIndex);
        });
        
        // Place remaining atoms
        placeRemainingAtoms(atoms, adjacency, coords, placed, bondLength);
    } else {
        // Fallback to chain-based generation
        return generateBranchedCoordinates(atoms, bonds, adjacency, bondLength);
    }
    
    return coords;
}

// Find the largest ring in the molecule
function findLargestRing(bonds, atomCount) {
    const ringBonds = bonds.filter(bond => bond.ring);
    if (ringBonds.length === 0) return [];
    
    // Simple ring detection - find connected ring atoms
    const ringAtoms = new Set();
    ringBonds.forEach(bond => {
        ringAtoms.add(bond.atom1);
        ringAtoms.add(bond.atom2);
    });
    
    return Array.from(ringAtoms);
}

// Generate coordinates for linear molecules
function generateLinearCoordinates(atoms, bonds, bondLength) {
    const coords = [];
    
    for (let i = 0; i < atoms.length; i++) {
        coords.push([i * bondLength, 0, 0]);
    }
    
    return coords;
}

// Generate coordinates for branched molecules
function generateBranchedCoordinates(atoms, bonds, adjacency, bondLength) {
    const coords = new Array(atoms.length);
    const placed = new Set();
    
    // Start from atom with most connections (likely central)
    let startAtom = 0;
    let maxConnections = 0;
    
    adjacency.forEach((neighbors, atomIndex) => {
        if (neighbors.length > maxConnections) {
            maxConnections = neighbors.length;
            startAtom = atomIndex;
        }
    });
    
    // Place starting atom at origin
    coords[startAtom] = [0, 0, 0];
    placed.add(startAtom);
    
    // Place neighbors using proper geometry
    const queue = [startAtom];
    
    while (queue.length > 0 && placed.size < atoms.length) {
        const currentAtom = queue.shift();
        const neighbors = adjacency.get(currentAtom);
        const unplacedNeighbors = neighbors.filter(n => !placed.has(n.atom));
        
        placeNeighborsWithGeometry(currentAtom, unplacedNeighbors, coords, placed, queue, bondLength);
    }
    
    // Fill any remaining atoms
    for (let i = 0; i < atoms.length; i++) {
        if (!coords[i]) {
            coords[i] = [i * bondLength, 0, 0];
        }
    }
    
    return coords;
}

// Place neighboring atoms using proper molecular geometry
function placeNeighborsWithGeometry(centerAtom, neighbors, coords, placed, queue, bondLength) {
    const centerPos = coords[centerAtom];
    const numNeighbors = neighbors.length;
    
    neighbors.forEach((neighbor, i) => {
        if (placed.has(neighbor.atom)) return;
        
        let position;
        
        if (numNeighbors === 1) {
            // Single neighbor - place along x-axis
            position = [centerPos[0] + bondLength, centerPos[1], centerPos[2]];
        } else if (numNeighbors === 2) {
            // Two neighbors - 120° angle (sp2) or 180° (linear)
            const angle = Math.PI - (Math.PI / 3); // 120°
            const x = centerPos[0] + bondLength * Math.cos(i * angle);
            const y = centerPos[1] + bondLength * Math.sin(i * angle);
            position = [x, y, centerPos[2]];
        } else if (numNeighbors === 3) {
            // Three neighbors - trigonal planar (120°)
            const angle = (2 * Math.PI * i) / 3;
            const x = centerPos[0] + bondLength * Math.cos(angle);
            const y = centerPos[1] + bondLength * Math.sin(angle);
            position = [x, y, centerPos[2]];
        } else {
            // Four or more neighbors - tetrahedral-like
            const angle = (2 * Math.PI * i) / numNeighbors;
            const x = centerPos[0] + bondLength * Math.cos(angle);
            const y = centerPos[1] + bondLength * Math.sin(angle);
            const z = centerPos[2] + bondLength * 0.5 * (i % 2 === 0 ? 1 : -1);
            position = [x, y, z];
        }
        
        coords[neighbor.atom] = position;
        placed.add(neighbor.atom);
        queue.push(neighbor.atom);
    });
}

// Place remaining unplaced atoms
function placeRemainingAtoms(atoms, adjacency, coords, placed, bondLength) {
    const queue = [];
    
    // Find placed atoms that have unplaced neighbors
    placed.forEach(atomIndex => {
        const neighbors = adjacency.get(atomIndex);
        const hasUnplacedNeighbors = neighbors.some(n => !placed.has(n.atom));
        if (hasUnplacedNeighbors) {
            queue.push(atomIndex);
        }
    });
    
    while (queue.length > 0) {
        const currentAtom = queue.shift();
        const neighbors = adjacency.get(currentAtom);
        const unplacedNeighbors = neighbors.filter(n => !placed.has(n.atom));
        
        if (unplacedNeighbors.length > 0) {
            placeNeighborsWithGeometry(currentAtom, unplacedNeighbors, coords, placed, queue, bondLength);
        }
    }
}

// Find longest chain in the molecule
function findLongestChain(adjacency) {
    let maxLength = 0;
    
    adjacency.forEach((neighbors, startAtom) => {
        const length = findChainLength(adjacency, startAtom, -1, new Set());
        maxLength = Math.max(maxLength, length);
    });
    
    return maxLength;
}

// Find chain length from a starting atom
function findChainLength(adjacency, current, parent, visited) {
    visited.add(current);
    let maxLength = 1;
    
    const neighbors = adjacency.get(current) || [];
    for (const neighbor of neighbors) {
        if (neighbor.atom !== parent && !visited.has(neighbor.atom)) {
            const length = 1 + findChainLength(adjacency, neighbor.atom, current, new Set(visited));
            maxLength = Math.max(maxLength, length);
        }
    }
    
    return maxLength;
}

// Create high-quality SDF with proper formatting and metadata
function createHighQualitySDFFromData(atoms, coordinates, bonds, molInfo) {
    const numAtoms = atoms.length;
    const numBonds = bonds.length;
    const currentDate = new Date().toISOString().substring(0, 19).replace('T', ' ');
    
    // Enhanced header with molecular information
    let sdf = `${molInfo.name || 'Generated Molecule'}\n`;
    sdf += `  Enhanced LLM-based generation ${currentDate}\n`;
    sdf += `  Formula: ${molInfo.formula} | MW: ${molInfo.weight} | SMILES: ${molInfo.smile}\n`;
    
    // Counts line (V2000 format)
    sdf += `${numAtoms.toString().padStart(3)}${numBonds.toString().padStart(3)}  0  0  0  0  0  0  0  0999 V2000\n`;
    
    // Atom block with enhanced formatting
    for (let i = 0; i < numAtoms; i++) {
        const atom = atoms[i];
        const coord = coordinates[i];
        const x = coord[0].toFixed(4).padStart(10);
        const y = coord[1].toFixed(4).padStart(10);
        const z = coord[2].toFixed(4).padStart(10);
        const element = atom.element.padEnd(3);
        const charge = atom.charge !== 0 ? atom.charge.toString().padStart(3) : '  0';
        
        sdf += `${x}${y}${z} ${element} 0${charge}  0  0  0  0  0  0  0  0  0\n`;
    }
    
    // Bond block
    for (const bond of bonds) {
        const atom1 = (bond.atom1 + 1).toString().padStart(3);
        const atom2 = (bond.atom2 + 1).toString().padStart(3);
        const bondType = bond.type.toString().padStart(3);
        const stereo = bond.stereo.toString().padStart(3);
        sdf += `${atom1}${atom2}${bondType}${stereo}  0  0  0\n`;
    }
    
    // Add charge information if present
    const chargedAtoms = atoms.filter((atom, i) => atom.charge !== 0);
    if (chargedAtoms.length > 0) {
        sdf += `M  CHG${chargedAtoms.length.toString().padStart(3)}`;
        chargedAtoms.forEach((atom, i) => {
            const atomIndex = atoms.indexOf(atom) + 1;
            sdf += `${atomIndex.toString().padStart(4)}${atom.charge.toString().padStart(4)}`;
        });
        sdf += '\n';
    }
    
    sdf += 'M  END\n';
    
    return sdf;
}

// Advanced local 3D generation from SMILES
async function generateAdvanced3DFromSmile(smileString) {
    console.log('🧬 Generating advanced 3D structure for:', smileString);
    
    try {
        // Try RDKit-based 3D generation first if available
        if (typeof window.RDKit !== 'undefined' && window.RDKit) {
            const rdkit3D = await generateRDKit3DStructure(smileString);
            if (rdkit3D) {
                console.log('✅ Generated 3D structure using RDKit');
                return rdkit3D;
            }
        }
        
        // Parse SMILES to extract atoms and basic connectivity
        const atoms = parseAtomsFromSmile(smileString);
        const bonds = parseBondsFromSmile(smileString);
        
        if (atoms.length === 0) {
            console.warn('❌ No atoms found in SMILES');
            return generateFallback3DStructure();
        }
        
        // Generate improved 3D coordinates using better molecular geometry
        const coordinates = generateImproved3DCoordinates(atoms, bonds);
        
        // Create SDF format structure
        const sdfStructure = createSDFFromAtomsAndCoords(atoms, coordinates, bonds);
        
        console.log('✅ Generated advanced 3D structure with', atoms.length, 'atoms');
        return sdfStructure;
        
    } catch (error) {
        console.error('❌ Advanced 3D generation failed:', error);
        return generateFallback3DStructure();
    }
}

// Generate 3D structure using RDKit if available
async function generateRDKit3DStructure(smileString) {
    try {
        if (!window.RDKit) {
            return null;
        }
        
        const mol = window.RDKit.get_mol(smileString);
        if (!mol) {
            return null;
        }
        
        // Add hydrogens and generate 3D coordinates
        const molWithH = mol.add_hs();
        if (molWithH) {
            // Generate 3D coordinates using RDKit
            if (typeof molWithH.generate_3d_coords === 'function') {
                const success = molWithH.generate_3d_coords();
                if (success) {
                    const molblock = molWithH.get_molblock();
                    molWithH.delete();
                    mol.delete();
                    return molblock;
                }
            }
            molWithH.delete();
        }
        mol.delete();
        return null;
        
    } catch (error) {
        console.warn('RDKit 3D generation failed:', error);
        return null;
    }
}

// Generate improved 3D coordinates
function generateImproved3DCoordinates(atoms, bonds) {
    const coords = [];
    const bondLength = 1.54; // Standard C-C bond length in Angstroms
    
    if (atoms.length === 1) {
        coords.push([0, 0, 0]);
        return coords;
    }
    
    // Build connectivity graph
    const connectivity = new Map();
    for (let i = 0; i < atoms.length; i++) {
        connectivity.set(i, []);
    }
    
    bonds.forEach(bond => {
        connectivity.get(bond.atom1).push(bond.atom2);
        connectivity.get(bond.atom2).push(bond.atom1);
    });
    
    // Place atoms using distance geometry
    const placed = new Set();
    const positions = new Array(atoms.length);
    
    // Place first atom at origin
    positions[0] = [0, 0, 0];
    placed.add(0);
    
    // Place connected atoms using proper molecular geometry
    const queue = [0];
    
    while (queue.length > 0 && placed.size < atoms.length) {
        const currentAtom = queue.shift();
        const neighbors = connectivity.get(currentAtom);
        
        let placedNeighbors = neighbors.filter(n => placed.has(n));
        let unplacedNeighbors = neighbors.filter(n => !placed.has(n));
        
        for (let i = 0; i < unplacedNeighbors.length; i++) {
            const newAtom = unplacedNeighbors[i];
            if (placed.has(newAtom)) continue;
            
            let newPos;
            
            if (placedNeighbors.length === 0) {
                // First neighbor - place along x-axis
                newPos = [bondLength, 0, 0];
            } else if (placedNeighbors.length === 1) {
                // Second neighbor - form 120° angle (sp2) or 109.5° (sp3)
                const ref = positions[placedNeighbors[0]];
                const current = positions[currentAtom];
                const angle = Math.PI * 2/3; // 120 degrees
                
                const dx = current[0] - ref[0];
                const dy = current[1] - ref[1];
                const refLen = Math.sqrt(dx*dx + dy*dy) || bondLength;
                
                newPos = [
                    current[0] + bondLength * Math.cos(angle),
                    current[1] + bondLength * Math.sin(angle),
                    0
                ];
            } else {
                // Third+ neighbor - use tetrahedral geometry
                const angle = i * Math.PI * 2 / unplacedNeighbors.length;
                const radius = bondLength;
                
                newPos = [
                    positions[currentAtom][0] + radius * Math.cos(angle),
                    positions[currentAtom][1] + radius * Math.sin(angle),
                    radius * 0.5 * (i % 2 === 0 ? 1 : -1) // Alternate z positions
                ];
            }
            
            positions[newAtom] = newPos;
            placed.add(newAtom);
            queue.push(newAtom);
        }
    }
    
    // Fill any remaining unplaced atoms
    for (let i = 0; i < atoms.length; i++) {
        if (!positions[i]) {
            positions[i] = [
                i * bondLength,
                0,
                0
            ];
        }
    }
    
    return positions;
}

// Generate basic 3D coordinates for atoms
function generate3DCoordinates(atoms, bonds) {
    const coords = [];
    const bondLength = 1.54; // Standard C-C bond length in Angstroms
    
    // Place first atom at origin
    if (atoms.length > 0) {
        coords.push([0, 0, 0]);
    }
    
    // Place subsequent atoms using basic molecular geometry
    for (let i = 1; i < atoms.length; i++) {
        let x, y, z;
        
        if (i === 1) {
            // Second atom along x-axis
            x = bondLength;
            y = 0;
            z = 0;
        } else if (i === 2) {
            // Third atom forms tetrahedral angle
            x = bondLength * Math.cos(Math.PI * 2/3);
            y = bondLength * Math.sin(Math.PI * 2/3);
            z = 0;
        } else {
            // Subsequent atoms in 3D space
            const angle = (i - 1) * Math.PI / 3;
            const radius = bondLength * Math.sqrt(i);
            x = radius * Math.cos(angle);
            y = radius * Math.sin(angle);
            z = (i % 2) * bondLength * 0.5; // Alternate z positions
        }
        
        coords.push([x, y, z]);
    }
    
    return coords;
}

// Create SDF format from atoms and coordinates
function createSDFFromAtomsAndCoords(atoms, coordinates, bonds) {
    const numAtoms = atoms.length;
    const numBonds = bonds.length;
    
    // SDF header
    let sdf = `Generated from SMILES
  Generated by Nurumayu Smile 3D
  
${numAtoms.toString().padStart(3)}${numBonds.toString().padStart(3)}  0  0  0  0  0  0  0  0999 V2000\n`;
    
    // Atom block
    for (let i = 0; i < numAtoms; i++) {
        const coord = coordinates[i];
        const atom = atoms[i];
        const x = coord[0].toFixed(4).padStart(10);
        const y = coord[1].toFixed(4).padStart(10);
        const z = coord[2].toFixed(4).padStart(10);
        sdf += `${x}${y}${z} ${atom.padEnd(3)} 0  0  0  0  0  0  0  0  0  0  0  0\n`;
    }
    
    // Bond block
    for (const bond of bonds) {
        const atom1 = (bond.atom1 + 1).toString().padStart(3);
        const atom2 = (bond.atom2 + 1).toString().padStart(3);
        const bondType = bond.type.toString().padStart(3);
        sdf += `${atom1}${atom2}${bondType}  0  0  0  0\n`;
    }
    
    sdf += 'M  END\n';
    return sdf;
}

// Fallback: Generate basic 3D structure
function generateFallback3DStructure() {
    console.log('🔧 Generating fallback 3D structure');
    
    // Try to use current molecule data for better fallback
    if (window.currentMolecule && window.currentMolecule.smile) {
        const smartFallback = generateSmartFallback3DFromSmile(window.currentMolecule.smile);
        if (smartFallback) {
            return smartFallback;
        }
    }
    
    // Create a simple methane molecule as ultimate fallback
    const fallbackSDF = `Fallback Structure
  Generated by Nurumayu Smile 3D
  
  5  4  0  0  0  0  0  0  0  0999 V2000
    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.0900    0.0000    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
   -0.3633    1.0274    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
   -0.3633   -0.5137    0.8900 H   0  0  0  0  0  0  0  0  0  0  0  0
   -0.3633   -0.5137   -0.8900 H   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0  0  0  0
  1  3  1  0  0  0  0
  1  4  1  0  0  0  0
  1  5  1  0  0  0  0
M  END
`;
    
    return fallbackSDF;
}

// Generate smart fallback from current SMILES
function generateSmartFallback3DFromSmile(smileString) {
    try {
        console.log('🧠 Generating smart fallback for:', smileString);
        
        // Parse the SMILES to understand the molecule better
        const atoms = parseAtomsFromSmile(smileString);
        const bonds = parseBondsFromSmile(smileString);
        
        if (atoms.length === 0) {
            return null;
        }
        
        // Generate reasonable 3D coordinates
        const coordinates = generateReasonable3DCoordinates(atoms, bonds, smileString);
        
        // Create SDF with proper formatting
        const sdf = createEnhancedSDFFromAtomsAndCoords(atoms, coordinates, bonds, smileString);
        
        console.log('✅ Smart fallback generated with', atoms.length, 'atoms');
        return sdf;
        
    } catch (error) {
        console.warn('Smart fallback generation failed:', error);
        return null;
    }
}

// Generate more reasonable 3D coordinates
function generateReasonable3DCoordinates(atoms, bonds, smileString) {
    const coords = [];
    const bondLength = 1.54;
    
    // For very simple molecules, use basic patterns
    if (atoms.length <= 5) {
        return generateSimplePattern3DCoords(atoms);
    }
    
    // For larger molecules, try to detect rings and chains
    const rings = detectRingsInSmile(smileString);
    const chains = detectChainsInBonds(bonds, atoms.length);
    
    if (rings.length > 0) {
        return generateRingBased3DCoords(atoms, bonds, rings);
    } else {
        return generateChainBased3DCoords(atoms, bonds);
    }
}

// Generate simple pattern for small molecules
function generateSimplePattern3DCoords(atoms) {
    const coords = [];
    const bondLength = 1.54;
    
    for (let i = 0; i < atoms.length; i++) {
        if (i === 0) {
            coords.push([0, 0, 0]);
        } else if (i === 1) {
            coords.push([bondLength, 0, 0]);
        } else if (i === 2) {
            coords.push([bondLength/2, bondLength * Math.sin(Math.PI/3), 0]);
        } else if (i === 3) {
            coords.push([bondLength/2, 0, bondLength * 0.8]);
        } else {
            // Tetrahedral-like positioning
            const angle = (i - 1) * Math.PI / 2;
            coords.push([
                bondLength * Math.cos(angle),
                bondLength * Math.sin(angle),
                bondLength * 0.5
            ]);
        }
    }
    
    return coords;
}

// Detect rings in SMILES (simple implementation)
function detectRingsInSmile(smileString) {
    const rings = [];
    const ringNumbers = smileString.match(/\d/g);
    
    if (ringNumbers) {
        const ringMap = new Map();
        ringNumbers.forEach(num => {
            if (ringMap.has(num)) {
                rings.push({ number: num, count: ringMap.get(num) + 1 });
                ringMap.set(num, ringMap.get(num) + 1);
            } else {
                ringMap.set(num, 1);
            }
        });
    }
    
    return rings;
}

// Detect chains in bond structure
function detectChainsInBonds(bonds, atomCount) {
    // Build adjacency list
    const adj = new Array(atomCount).fill(null).map(() => []);
    bonds.forEach(bond => {
        adj[bond.atom1].push(bond.atom2);
        adj[bond.atom2].push(bond.atom1);
    });
    
    // Find longest chain
    const chains = [];
    for (let start = 0; start < atomCount; start++) {
        if (adj[start].length <= 1) { // Start from terminal atoms
            const chain = findLongestChain(adj, start, -1, []);
            if (chain.length > 2) {
                chains.push(chain);
            }
        }
    }
    
    return chains;
}

// Find longest chain from a starting atom
function findLongestChain(adj, current, parent, visited) {
    visited.push(current);
    
    let longestChain = [current];
    
    for (const neighbor of adj[current]) {
        if (neighbor !== parent && !visited.includes(neighbor)) {
            const subChain = findLongestChain(adj, neighbor, current, [...visited]);
            if (subChain.length + 1 > longestChain.length) {
                longestChain = [current, ...subChain];
            }
        }
    }
    
    return longestChain;
}

// Generate ring-based 3D coordinates
function generateRingBased3DCoords(atoms, bonds, rings) {
    const coords = [];
    const bondLength = 1.54;
    
    // Place atoms in a simple ring pattern for now
    const ringSize = Math.min(6, atoms.length); // Assume 6-membered ring
    const angleStep = (2 * Math.PI) / ringSize;
    
    for (let i = 0; i < atoms.length; i++) {
        if (i < ringSize) {
            // Ring atoms
            const angle = i * angleStep;
            coords.push([
                bondLength * Math.cos(angle),
                bondLength * Math.sin(angle),
                0
            ]);
        } else {
            // Substituents
            const ringAtom = i % ringSize;
            const offset = Math.floor(i / ringSize);
            coords.push([
                coords[ringAtom][0] + bondLength * offset,
                coords[ringAtom][1],
                bondLength * 0.5 * offset
            ]);
        }
    }
    
    return coords;
}

// Generate chain-based 3D coordinates
function generateChainBased3DCoords(atoms, bonds) {
    const coords = [];
    const bondLength = 1.54;
    
    // Create a zigzag chain pattern
    for (let i = 0; i < atoms.length; i++) {
        if (i === 0) {
            coords.push([0, 0, 0]);
        } else {
            const angle = (i % 2 === 0) ? 0 : Math.PI / 6; // Alternate angles
            const x = (i - 1) * bondLength * Math.cos(Math.PI / 12);
            const y = bondLength * Math.sin(angle) * (i % 2 === 0 ? 1 : -1);
            const z = bondLength * 0.1 * i; // Slight z variation
            
            coords.push([x, y, z]);
        }
    }
    
    return coords;
}

// Create enhanced SDF with better formatting
function createEnhancedSDFFromAtomsAndCoords(atoms, coordinates, bonds, smileString) {
    const numAtoms = atoms.length;
    const numBonds = bonds.length;
    
    // Enhanced header with molecule info
    let sdf = `Generated from SMILES: ${smileString.substring(0, 50)}${smileString.length > 50 ? '...' : ''}
  Generated by Nurumayu Smile 3D - Enhanced Fallback
  
${numAtoms.toString().padStart(3)}${numBonds.toString().padStart(3)}  0  0  0  0  0  0  0  0999 V2000\n`;
    
    // Atom block with proper formatting
    for (let i = 0; i < numAtoms; i++) {
        const coord = coordinates[i];
        const atom = atoms[i];
        const x = coord[0].toFixed(4).padStart(10);
        const y = coord[1].toFixed(4).padStart(10);
        const z = coord[2].toFixed(4).padStart(10);
        sdf += `${x}${y}${z} ${atom.padEnd(3)} 0  0  0  0  0  0  0  0  0  0  0  0\n`;
    }
    
    // Bond block
    for (const bond of bonds) {
        const atom1 = (bond.atom1 + 1).toString().padStart(3);
        const atom2 = (bond.atom2 + 1).toString().padStart(3);
        const bondType = bond.type.toString().padStart(3);
        sdf += `${atom1}${atom2}${bondType}  0  0  0  0\n`;
    }
    
    sdf += 'M  END\n';
    return sdf;
}

// Fallback: Generate basic 3D structure from SMILE
function generateSimple3DFromSmile(smileString) {
    console.log('🔧 Generating simple 3D structure for:', smileString);
    return generateFallback3DStructure();
}

// Parse atoms from SMILE string (simplified)
function parseAtomsFromSmile(smile) {
    const atoms = [];
    const atomRegex = /[BCNOPSFK]|Cl|Br|I/gi;
    const matches = smile.match(atomRegex);
    
    if (matches) {
        matches.forEach(match => {
            atoms.push(match.charAt(0).toUpperCase() + match.slice(1).toLowerCase());
        });
    }
    
    // Ensure we have at least one atom
    if (atoms.length === 0) {
        atoms.push('C');
    }
    
    return atoms;
}

// Parse bonds from SMILE string (simplified)
function parseBondsFromSmile(smile) {
    const bonds = [];
    const atoms = parseAtomsFromSmile(smile);
    
    // Create simple linear bonds for now
    for (let i = 0; i < atoms.length - 1; i++) {
        bonds.push({
            atom1: i,
            atom2: i + 1,
            type: 1 // Single bond
        });
    }
    
    return bonds;
}



// Show loading state in viewer
function showViewerLoading(show) {
    const viewerContainer = document.getElementById('viewer-3d');
    if (!viewerContainer) {
        return;
    }

    if (show) {
        viewerContainer.style.position = 'relative';
        
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'viewer-loading';
        loadingOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(248, 249, 250, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
        `;
        
        const spinner = document.createElement('div');
        spinner.className = 'spinner';
        
        const text = document.createElement('span');
        text.textContent = 'Loading 3D structure...';
        text.style.marginLeft = '10px';
        
        loadingOverlay.appendChild(spinner);
        loadingOverlay.appendChild(text);
        viewerContainer.appendChild(loadingOverlay);
        
    } else {
        const loadingOverlay = document.getElementById('viewer-loading');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    }
}

// Show error in viewer with enhanced styling
function showViewer3DError(message) {
    const viewerContainer = document.getElementById('viewer-3d');
    if (!viewerContainer) {
        return;
    }

    viewerContainer.innerHTML = `
        <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: #666;
            text-align: center;
            padding: 20px;
            background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
            border: 1px solid #e9ecef;
            border-radius: 8px;
        ">
            <div style="font-size: 48px; margin-bottom: 15px; animation: pulse 2s infinite;">⚠️</div>
            <div style="font-size: 16px; font-weight: 600; margin-bottom: 10px; color: #dc3545;">3D Visualization Error</div>
            <div style="font-size: 13px; color: #6c757d; line-height: 1.4; max-width: 300px;">${message}</div>
            <button onclick="retry3DVisualization()" style="
                margin-top: 15px;
                padding: 8px 16px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
            ">Try Again</button>
        </div>
        <style>
            @keyframes pulse {
                0% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.7; transform: scale(1.1); }
                100% { opacity: 1; transform: scale(1); }
            }
        </style>
    `;
}

// Retry 3D visualization
function retry3DVisualization() {
    console.log('🔄 Retrying 3D visualization...');
    
    // Clear the error display
    const viewerContainer = document.getElementById('viewer-3d');
    if (viewerContainer) {
        viewerContainer.innerHTML = '';
    }
    
    // Reinitialize 3D viewer
    initialize3DMolViewer();
    
    // Try to display current structure if available
    if (current2DStructure) {
        display3DMolecule(current2DStructure);
    }
}

// Enhanced notification system with types
function showNotification(message, type = 'info') {
    // Remove any existing notifications
    const existingNotification = document.getElementById('viewer-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const colors = {
        success: { bg: '#d4edda', border: '#c3e6cb', text: '#155724' },
        warning: { bg: '#fff3cd', border: '#ffeaa7', text: '#856404' },
        error: { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24' },
        info: { bg: '#d1ecf1', border: '#bee5eb', text: '#0c5460' }
    };
    
    const colorScheme = colors[type] || colors.info;
    
    const notification = document.createElement('div');
    notification.id = 'viewer-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colorScheme.bg};
        color: ${colorScheme.text};
        border: 1px solid ${colorScheme.border};
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 1000;
        max-width: 300px;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification && notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 4000);
}

// Add CSS animations for notifications
if (!document.getElementById('viewer-notification-styles')) {
    const style = document.createElement('style');
    style.id = 'viewer-notification-styles';
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// Export 3D view as image
function export3DViewAsImage() {
    if (!viewer3D) {
        console.error('3D viewer not initialized');
        return;
    }

    try {
        const canvas = viewer3D.getCanvas();
        const dataURL = canvas.toDataURL('image/png');
        
        const link = document.createElement('a');
        link.download = 'molecule_3d.png';
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('3D view exported as image');
        
    } catch (error) {
        console.error('Failed to export 3D view:', error);
        showError('Failed to export 3D view');
    }
}

// View mode switching functions
function changeViewMode() {
    const modeSelect = document.getElementById('view-mode');
    const newMode = modeSelect ? modeSelect.value : '2d';
    
    console.log('🔄 Changing view mode from', currentViewMode, 'to', newMode);
    
    if (newMode !== currentViewMode) {
        currentViewMode = newMode;
        
        // Show/hide appropriate viewers
        const viewer2D = document.getElementById('viewer-2d');
        const viewer3D = document.getElementById('viewer-3d');
        const styleSelect = document.getElementById('view-style');
        const resetBtn = document.getElementById('reset-view');
        
        if (currentViewMode === '2d') {
            // Smooth transition to 2D view
            if (viewer2D) {
                viewer2D.classList.remove('hidden');
                viewer2D.classList.add('visible');
            }
            if (viewer3D) {
                viewer3D.classList.remove('visible');
                viewer3D.classList.add('hidden');
            }
            if (styleSelect) styleSelect.disabled = true;
            if (resetBtn) {
                resetBtn.style.opacity = '0.5';
                resetBtn.disabled = true;
                resetBtn.title = 'Reset is available in 3D mode only';
            }
            
            // Display current structure in 2D
            if (current2DStructure) {
                display2DMolecule(current2DStructure);
            }
        } else {
            // Smooth transition to 3D view
            console.log('🎯 Switching to 3D view');
            if (viewer2D) {
                viewer2D.classList.remove('visible');
                viewer2D.classList.add('hidden');
                console.log('📱 2D viewer hidden');
            }
            if (viewer3D) {
                viewer3D.classList.remove('hidden');
                viewer3D.classList.add('visible');
                console.log('🔮 3D viewer made visible');
            }
            if (styleSelect) styleSelect.disabled = false;
            if (resetBtn) {
                resetBtn.style.opacity = '1';
                resetBtn.disabled = false;
                resetBtn.title = 'Reset View';
            }
            
            // Display current structure in 3D and apply current style
            if (current2DStructure) {
                console.log('🧬 Displaying 3D molecule from current2DStructure');
                display3DMolecule(current2DStructure).then(() => {
                    console.log('✅ 3D molecule displayed successfully');
                    // Apply current style after 3D structure is loaded
                    const currentStyle = getCurrentViewStyle();
                    applyViewStyle(currentStyle);
                }).catch((error) => {
                    console.warn('❌ Failed to display 3D molecule during view switch:', error);
                    // Fall back to 2D view if 3D fails
                    document.getElementById('view-mode').value = '2d';
                    currentViewMode = '2d';
                    changeViewMode();
                });
            } else {
                console.warn('⚠️ No current2DStructure available for 3D display');
            }
        }
        
        // Save view mode preference
        try {
            sessionStorage.setItem('smile3d_view_mode', currentViewMode);
        } catch (error) {
            console.warn('Failed to save view mode preference:', error);
        }
    }
}

// Change view style (stick, sphere, cartoon) - 3D only
function changeViewStyle() {
    if (currentViewMode === '3d') {
        const style = getCurrentViewStyle();
        applyViewStyle(style);
    }
}

function getCurrentViewStyle() {
    const styleSelect = document.getElementById('view-style');
    return styleSelect ? styleSelect.value : 'stick';
}

function applyViewStyle(style) {
    if (!currentModel || !viewer3D) {
        console.warn('applyViewStyle called but currentModel or viewer3D not available');
        return;
    }

    try {
        console.log('Applying 3D view style:', style);
        
        // Clear all existing styles
        currentModel.setStyle({}, {});
        viewer3D.removeAllSurfaces();

        // Apply new style with proper 3DMol.js parameters
        switch (style) {
            case 'stick':
                currentModel.setStyle({}, {
                    stick: {
                        radius: 0.2,
                        colorscheme: 'Jmol'
                    }
                });
                break;
                
            case 'sphere': // Ball & Stick
                currentModel.setStyle({}, {
                    sphere: {
                        radius: 0.4,
                        colorscheme: 'Jmol'
                    },
                    stick: {
                        radius: 0.1,
                        colorscheme: 'Jmol'
                    }
                });
                break;
                
            case 'cartoon': // For small molecules, use wireframe
                currentModel.setStyle({}, {
                    line: {
                        linewidth: 2,
                        colorscheme: 'Jmol'
                    }
                });
                break;
                
            default:
                // Default to stick
                currentModel.setStyle({}, {
                    stick: {
                        radius: 0.2,
                        colorscheme: 'Jmol'
                    }
                });
        }

        // Force re-render
        viewer3D.render();
        console.log('3D view style applied successfully:', style);
        
    } catch (error) {
        console.error('Failed to apply view style:', error);
        console.error('Style attempted:', style);
        console.error('Current model:', currentModel);
    }
}

// Reset view to default
function resetView() {
    if (currentViewMode === '3d' && viewer3D && currentModel) {
        try {
            // Center the molecule and reset view
            viewer3D.center();
            viewer3D.zoomTo();
            
            // Reset camera rotation to a nice default angle
            viewer3D.setView([0, 0, 0], [0, 0, 0], [0, 1, 0]);
            viewer3D.rotate(20, {x: 1, y: 0, z: 0});
            viewer3D.rotate(20, {x: 0, y: 1, z: 0});
            
            viewer3D.render();
        } catch (error) {
            console.error('Failed to reset 3D view:', error);
        }
    } else if (currentViewMode === '2d' && current2DStructure) {
        display2DMolecule(current2DStructure);
    }
}

// Clear viewers
function clear3DViewer() {
    // Clear 3D viewer
    if (viewer3D) {
        try {
            viewer3D.removeAllModels();
            viewer3D.render();
        } catch (error) {
            console.error('Failed to clear 3D viewer:', error);
        }
        currentModel = null;
    }
    
    // Clear 2D viewer
    const viewer2D = document.getElementById('viewer-2d');
    if (viewer2D) {
        viewer2D.innerHTML = '';
    }
    
    current2DStructure = null;
    
    // Reset UI controls to consistent state
    const resetBtn = document.getElementById('reset-view');
    if (currentViewMode === '2d') {
        if (resetBtn) {
            resetBtn.style.opacity = '0.5';
            resetBtn.disabled = true;
        }
    } else {
        if (resetBtn) {
            resetBtn.style.opacity = '1';
            resetBtn.disabled = false;
        }
    }
}

// Restore view mode from session
function restoreViewMode() {
    try {
        const savedMode = sessionStorage.getItem('smile3d_view_mode');
        if (savedMode) {
            currentViewMode = savedMode;
            const modeSelect = document.getElementById('view-mode');
            if (modeSelect) {
                modeSelect.value = currentViewMode;
            }
            
            // Apply the view mode
            changeViewMode();
        }
    } catch (error) {
        console.warn('Failed to restore view mode:', error);
    }
}

// Enhanced atom highlighting for fragmentation visualization
function highlightAtoms(atomIndices, color = 'red', highlightType = 'fragmentation') {
    if (currentViewMode === '3d' && viewer3D && currentModel && Array.isArray(atomIndices)) {
        try {
            console.log(`Highlighting atoms ${atomIndices.join(', ')} with color ${color}`);
            
            // Don't reset previous highlights if we want to show multiple sites
            if (highlightType === 'fragmentation') {
                // Keep existing style but add highlights
                const currentStyle = getCurrentViewStyle();
                
                // Highlight specified atoms with enhanced visibility
                atomIndices.forEach(index => {
                    // Use additive highlighting
                    currentModel.setStyle(
                        { serial: index },
                        {
                            sphere: {
                                radius: 0.8,
                                color: color,
                                opacity: 0.9
                            },
                            stick: {
                                radius: 0.3,
                                color: color,
                                opacity: 0.8
                            }
                        }
                    );
                });
                
                // Also highlight bonds between highlighted atoms
                for (let i = 0; i < atomIndices.length - 1; i++) {
                    for (let j = i + 1; j < atomIndices.length; j++) {
                        highlightBond(atomIndices[i], atomIndices[j], color);
                    }
                }
            } else {
                // Reset all styles first for non-fragmentation highlighting
                currentModel.setStyle({}, getCurrentViewStyle());
                
                // Apply standard highlighting
                atomIndices.forEach(index => {
                    currentModel.setStyle(
                        { serial: index },
                        {
                            sphere: {
                                radius: 1.0,
                                color: color,
                                opacity: 0.8
                            }
                        }
                    );
                });
            }
            
            // Center view on highlighted atoms
            if (atomIndices.length > 0) {
                viewer3D.zoomTo({ serial: atomIndices });
            }
            
            viewer3D.render();
            
        } catch (error) {
            console.error('Failed to highlight atoms:', error);
            console.error('Atom indices:', atomIndices);
            console.error('Color:', color);
        }
    } else if (currentViewMode === '2d') {
        // Enhanced 2D highlighting - show notification with atom information
        console.log('2D highlight requested for atoms:', atomIndices);
        show2DHighlightNotification(atomIndices, color);
    } else {
        console.warn('highlightAtoms called but viewer not ready:', {
            currentViewMode,
            viewer3D: !!viewer3D,
            currentModel: !!currentModel,
            atomIndices
        });
    }
}

// Highlight bonds between atoms
function highlightBond(atom1, atom2, color = 'red') {
    if (!viewer3D || !currentModel) return;
    
    try {
        // This is a simplified bond highlighting - 3Dmol.js has limited bond selection
        // In practice, you might need to use different approaches
        console.log(`Highlighting bond between atoms ${atom1} and ${atom2}`);
    } catch (error) {
        console.error('Failed to highlight bond:', error);
    }
}

// Show 2D highlight notification
function show2DHighlightNotification(atomIndices, color) {
    if (typeof showFragmentationHighlight === 'function') {
        showFragmentationHighlight(
            `2D表示: 原子 ${atomIndices.join(', ')} をハイライト対象としました。3D表示に切り替えると詳細が確認できます。`,
            'warning'
        );
    }
}

// Clear all highlights
function clearAtomHighlights() {
    if (currentViewMode === '3d' && viewer3D && currentModel) {
        try {
            // Restore original style
            const currentStyle = getCurrentViewStyle();
            currentModel.setStyle({}, {});
            applyViewStyle(currentStyle);
            viewer3D.render();
            
            console.log('All atom highlights cleared');
            
        } catch (error) {
            console.error('Failed to clear atom highlights:', error);
        }
    } else {
        console.log('No highlights to clear in 2D mode');
    }
}

// Add fragmentation label to 3D space (if supported)
function addFragmentationLabel(atomIndex, labelText) {
    if (!viewer3D || !currentModel) return;
    
    try {
        // Add text label near the specified atom
        // This is a simplified implementation - 3Dmol.js text labels have limitations
        viewer3D.addLabel(labelText, {
            position: { serial: atomIndex },
            backgroundColor: 'rgba(255, 23, 68, 0.8)',
            fontColor: 'white',
            fontSize: 12,
            showBackground: true
        });
        
        viewer3D.render();
        console.log(`Added fragmentation label "${labelText}" at atom ${atomIndex}`);
        
    } catch (error) {
        console.warn('Failed to add fragmentation label:', error);
    }
}

// Add click handler for atom selection
function enableAtomSelection(callback) {
    if (!viewer3D) {
        return;
    }

    try {
        viewer3D.setClickCallback(function(atom, viewer, event, container) {
            if (atom && typeof callback === 'function') {
                callback(atom);
            }
        });
    } catch (error) {
        console.error('Failed to enable atom selection:', error);
    }
}

// Main function to display molecular structure (both 2D and 3D)
async function displayMolecularStructure(smileString) {
    if (!smileString) {
        console.error('No SMILE string provided');
        return;
    }
    
    console.log('displayMolecularStructure called with:', smileString);
    
    // Ensure viewers are initialized
    try {
        // Check if containers exist
        const viewer2DContainer = document.getElementById('viewer-2d');
        const viewer3DContainer = document.getElementById('viewer-3d');
        
        if (!viewer2DContainer) {
            console.error('2D viewer container not found');
            return;
        }
        
        if (!viewer3DContainer) {
            console.error('3D viewer container not found');
            return;
        }
        
        // Initialize viewers if not already done
        if (!viewer2DContainer.hasAttribute('data-initialized')) {
            console.log('Initializing 2D viewer...');
            initialize2DViewer();
            viewer2DContainer.setAttribute('data-initialized', 'true');
        }
        
        if (!viewer3DContainer.hasAttribute('data-initialized')) {
            console.log('Initializing 3D viewer...');
            initialize3DMolViewer();
            viewer3DContainer.setAttribute('data-initialized', 'true');
        }
    } catch (initError) {
        console.error('Failed to initialize viewers:', initError);
        // Continue anyway - try to display what we can
    }
    
    // Store current structure
    current2DStructure = smileString;
    
    // Display based on current view mode
    if (currentViewMode === '2d') {
        console.log('Displaying in 2D mode');
        await display2DMolecule(smileString);
    } else {
        console.log('Displaying in 3D mode');
        await display3DMolecule(smileString);
    }
    
    console.log('displayMolecularStructure completed');
}

// Display 2D molecule structure
async function display2DMolecule(smileString) {
    const viewer2DContainer = document.getElementById('viewer-2d');
    if (!viewer2DContainer) {
        console.error('2D viewer container not found');
        return;
    }
    
    console.log('display2DMolecule called with:', smileString);
    
    // Clear previous content
    viewer2DContainer.innerHTML = '';
    
    try {
        // Create container for the 2D structure
        const structure2D = document.createElement('div');
        structure2D.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 20px;
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 4px;
        `;
        
        // Try to initialize RDKit with improved timeout
        console.log('Attempting to initialize RDKit...');
        const rdkitReady = await waitForRDKit(5000); // 5 second timeout
        
        if (!rdkitReady) {
            console.log('RDKit not ready, using external API fallback');
            const apiSuccess = await renderWith2DApi(smileString, structure2D);
            if (!apiSuccess) {
                console.log('External API failed, using fallback rendering');
                renderFallback2D(smileString, structure2D);
            }
            viewer2DContainer.appendChild(structure2D);
            console.log('2D structure displayed using external API or fallback');
            return;
        }
        
        // Try to render with RDKit
        console.log('Attempting RDKit rendering...');
        const rdkitSuccess = await renderWithRDKit(smileString, structure2D);
        
        if (!rdkitSuccess) {
            console.log('RDKit rendering failed, trying external API...');
            // Fallback to external API rendering
            const apiSuccess = await renderWith2DApi(smileString, structure2D);
            
            if (!apiSuccess) {
                console.log('External API also failed, using final fallback...');
                // Final fallback - show SMILES text with better formatting
                renderFallback2D(smileString, structure2D);
            }
        }
        
        viewer2DContainer.appendChild(structure2D);
        console.log('2D structure displayed successfully');
        
    } catch (error) {
        console.error('Failed to display 2D molecule:', error);
        // Ensure fallback is always displayed
        try {
            renderFallback2D(smileString, viewer2DContainer);
            console.log('Fallback 2D structure displayed after error');
        } catch (fallbackError) {
            console.error('Even fallback rendering failed:', fallbackError);
            // Show a basic error message in the container
            viewer2DContainer.innerHTML = `
                <div style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    padding: 20px;
                    background: #fff;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    color: #666;
                    text-align: center;
                ">
                    <div style="font-size: 24px; margin-bottom: 10px;">⚗️</div>
                    <div style="font-weight: bold; margin-bottom: 10px;">Structure Generated</div>
                    <div style="font-family: monospace; background: #f8f9fa; padding: 10px; border-radius: 4px; word-break: break-all;">${smileString}</div>
                    <div style="font-size: 12px; margin-top: 10px; color: #999;">Visual rendering temporarily unavailable</div>
                </div>
            `;
        }
    }
}

// Enhanced RDKit initialization with retry mechanism
let rdkitInitialized = false;
let rdkitInitPromise = null;

function initializeRDKit() {
    if (rdkitInitPromise) {
        return rdkitInitPromise;
    }
    
    rdkitInitPromise = new Promise(async (resolve) => {
        try {
            // Check if RDKit is already available
            if (typeof window.RDKit !== 'undefined' && window.RDKit && rdkitInitialized) {
                resolve(true);
                return;
            }
            
            // Check if initRDKitModule is available
            if (typeof initRDKitModule !== 'undefined') {
                console.log('Initializing RDKit module...');
                const RDKit = await initRDKitModule();
                window.RDKit = RDKit;
                rdkitInitialized = true;
                console.log('RDKit initialized successfully');
                resolve(true);
            } else {
                // Fallback: wait for script load with retry mechanism
                let attempts = 0;
                const maxAttempts = 10;
                const checkInterval = 500; // 500ms intervals
                
                const checkRDKit = () => {
                    attempts++;
                    if (typeof initRDKitModule !== 'undefined') {
                        initRDKitModule().then((RDKit) => {
                            window.RDKit = RDKit;
                            rdkitInitialized = true;
                            console.log('RDKit initialized successfully after', attempts, 'attempts');
                            resolve(true);
                        }).catch((error) => {
                            console.error('RDKit initialization failed:', error);
                            resolve(false);
                        });
                    } else if (attempts >= maxAttempts) {
                        console.warn('RDKit failed to load after', maxAttempts, 'attempts');
                        resolve(false);
                    } else {
                        setTimeout(checkRDKit, checkInterval);
                    }
                };
                
                checkRDKit();
            }
        } catch (error) {
            console.error('RDKit initialization error:', error);
            resolve(false);
        }
    });
    
    return rdkitInitPromise;
}

// Wait for RDKit library to be loaded with improved error handling
async function waitForRDKit(timeout = 10000) {
    if (rdkitInitialized && window.RDKit) {
        return true;
    }
    
    const timeoutPromise = new Promise(resolve => {
        setTimeout(() => resolve(false), timeout);
    });
    
    return Promise.race([initializeRDKit(), timeoutPromise]);
}

// Enhanced RDKit rendering with improved error handling and features
async function renderWithRDKit(smileString, container) {
    try {
        // Ensure RDKit is initialized
        const rdkitReady = await waitForRDKit();
        if (!rdkitReady || !window.RDKit) {
            console.log('RDKit not available, falling back to external API');
            return false;
        }
        
        // Validate SMILES string
        if (!smileString || typeof smileString !== 'string' || smileString.trim().length === 0) {
            console.error('Invalid SMILES string provided to RDKit');
            return false;
        }
        
        let mol = null;
        try {
            // Create molecule from SMILES
            mol = window.RDKit.get_mol(smileString.trim());
            if (!mol) {
                console.error('Failed to parse SMILES with RDKit:', smileString);
                return false;
            }
            
            // Generate 2D coordinates with error checking and fallbacks
            try {
                let success = false;
                
                // Try different RDKit coordinate generation methods
                if (typeof mol.generate_2d_coords === 'function') {
                    success = mol.generate_2d_coords();
                } else if (typeof mol.generate2DCoords === 'function') {
                    success = mol.generate2DCoords();
                } else if (typeof mol.get_mol === 'function') {
                    // Some RDKit versions don't require explicit coordinate generation
                    success = true;
                    console.log('RDKit coordinates available without explicit generation');
                } else {
                    console.warn('RDKit coordinate generation method not found, proceeding anyway');
                    success = true;
                }
                
                if (!success) {
                    console.error('Failed to generate 2D coordinates for:', smileString);
                    return false;
                }
            } catch (coordError) {
                console.error('Coordinate generation error:', coordError);
                console.log('Attempting to proceed without explicit coordinate generation');
                // Continue anyway - some RDKit versions handle this automatically
            }
            
            // Configure SVG generation options with improved sizing
            const containerWidth = container.offsetWidth || 400;
            const svgWidth = Math.min(containerWidth - 40, 500); // Account for padding
            const svgHeight = Math.max(Math.round(svgWidth * 0.75), 300); // 4:3 aspect ratio, minimum 300px
            
            const svgOptions = {
                width: svgWidth,
                height: svgHeight,
                bondLineWidth: 2.5,
                addStereoAnnotation: true,
                addAtomIndices: false,
                addBondIndices: false,
                atomLabelFontSize: 16,
                atomLabelPadding: 2
            };
            
            // Get SVG representation with enhanced options
            const svg = mol.get_svg_with_highlights(JSON.stringify(svgOptions));
            if (!svg || svg.length === 0) {
                console.error('Failed to generate SVG representation');
                return false;
            }
            
            // Create enhanced SVG container with responsive sizing
            const svgContainer = document.createElement('div');
            svgContainer.className = 'rdkit-svg-container';
            svgContainer.innerHTML = svg;
            svgContainer.style.cssText = `
                margin-bottom: 15px;
                border: 1px solid #e9ecef;
                border-radius: 8px;
                background: white;
                padding: 20px;
                text-align: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: ${svgHeight + 40}px;
                overflow: visible;
                width: 100%;
                box-sizing: border-box;
            `;
            
            // Ensure SVG scales properly and is fully visible
            const svgElement = svgContainer.querySelector('svg');
            if (svgElement) {
                svgElement.style.cssText = `
                    max-width: 100%;
                    height: auto;
                    display: block;
                    margin: 0 auto;
                `;
                svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                svgElement.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
            }
            
            // Add molecular information panel
            const molInfo = generateMolecularInfo(mol, smileString);
            const infoPanel = createMolecularInfoPanel(molInfo);
            
            // Add SMILES display with enhanced styling
            const smileDisplay = document.createElement('div');
            smileDisplay.className = 'rdkit-smiles-display';
            smileDisplay.style.cssText = `
                font-family: 'Courier New', monospace;
                font-size: 14px;
                color: #495057;
                background: #f8f9fa;
                padding: 10px 12px;
                border-radius: 6px;
                border: 1px solid #dee2e6;
                word-break: break-all;
                max-width: 100%;
                margin-top: 10px;
            `;
            smileDisplay.innerHTML = `<strong>SMILES:</strong> ${smileString}`;
            
            // Assemble the final structure
            container.appendChild(svgContainer);
            container.appendChild(infoPanel);
            container.appendChild(smileDisplay);
            
            // Ensure container has adequate height
            const totalHeight = svgHeight + 120; // SVG + padding + info panels
            if (container.offsetHeight < totalHeight) {
                container.style.minHeight = `${totalHeight}px`;
            }
            
            console.log('2D structure rendered successfully with RDKit');
            return true;
            
        } finally {
            // Always clean up molecule object
            if (mol) {
                try {
                    mol.delete();
                } catch (deleteError) {
                    console.warn('Failed to clean up RDKit molecule object:', deleteError);
                }
            }
        }
        
    } catch (error) {
        console.error('RDKit rendering failed:', error);
        return false;
    }
}

// Generate molecular information from RDKit molecule object
function generateMolecularInfo(mol, smileString) {
    try {
        const info = {
            molecularFormula: 'Unknown',
            molecularWeight: 'Unknown',
            numAtoms: 'Unknown',
            numBonds: 'Unknown',
            numRings: 'Unknown'
        };
        
        // First priority: Use data from LLM API if available
        if (window.currentMolecule) {
            if (window.currentMolecule.formula) {
                info.molecularFormula = window.currentMolecule.formula;
                console.log('Using LLM formula:', info.molecularFormula);
            }
            if (window.currentMolecule.molecularWeight) {
                info.molecularWeight = parseFloat(window.currentMolecule.molecularWeight).toFixed(2);
                console.log('Using LLM molecular weight:', info.molecularWeight);
            }
        }
        
        // Try to get molecular formula from RDKit only if we don't have LLM data
        if (info.molecularFormula === 'Unknown') {
            try {
                if (typeof mol.get_mol_formula === 'function') {
                    info.molecularFormula = mol.get_mol_formula();
                } else if (typeof mol.get_formula === 'function') {
                    info.molecularFormula = mol.get_formula();
                } else if (typeof mol.descriptor === 'function') {
                    // Try descriptor method
                    try {
                        info.molecularFormula = mol.descriptor('MolFormula');
                    } catch(d) {
                        console.warn('Descriptor method failed:', d);
                    }
                }
                
                // If still unknown, try molblock extraction
                if (info.molecularFormula === 'Unknown' && mol.get_molblock) {
                    info.molecularFormula = extractFormulaFromMolblock(mol.get_molblock());
                }
                
                // Final fallback: calculate from SMILES
                if (info.molecularFormula === 'Unknown' && smileString) {
                    info.molecularFormula = calculateFormulaFromSMILES(smileString);
                }
            } catch (e) {
                console.warn('Failed to extract molecular formula from RDKit:', e);
                // Fallback to LLM data or SMILES calculation
                if (window.currentMolecule && window.currentMolecule.formula) {
                    info.molecularFormula = window.currentMolecule.formula;
                } else if (smileString) {
                    info.molecularFormula = calculateFormulaFromSMILES(smileString);
                }
            }
        }
        
        // Try to get molecular weight from RDKit only if we don't have LLM data
        if (info.molecularWeight === 'Unknown') {
            try {
                if (typeof mol.get_mol_wt === 'function') {
                    info.molecularWeight = mol.get_mol_wt().toFixed(2);
                } else if (typeof mol.get_mw === 'function') {
                    info.molecularWeight = mol.get_mw().toFixed(2);
                } else if (typeof mol.descriptor === 'function') {
                    try {
                        const mw = mol.descriptor('MolWt');
                        info.molecularWeight = parseFloat(mw).toFixed(2);
                    } catch(d) {
                        console.warn('Molecular weight descriptor failed:', d);
                    }
                }
            } catch (e) {
                console.warn('Failed to extract molecular weight from RDKit:', e);
                // Fallback to LLM data
                if (window.currentMolecule && window.currentMolecule.molecularWeight) {
                    info.molecularWeight = parseFloat(window.currentMolecule.molecularWeight).toFixed(2);
                }
            }
        }
        
        try {
            // Try different atom counting methods
            if (typeof mol.get_num_atoms === 'function') {
                info.numAtoms = mol.get_num_atoms();
            } else if (typeof mol.get_numatoms === 'function') {
                info.numAtoms = mol.get_numatoms();
            } else if (typeof mol.num_atoms === 'function') {
                info.numAtoms = mol.num_atoms();
            } else {
                info.numAtoms = 'Unknown';
            }
        } catch (e) {
            console.warn('Failed to get atom count:', e);
            info.numAtoms = 'Unknown';
        }
        
        try {
            // Try different bond counting methods
            if (typeof mol.get_num_bonds === 'function') {
                info.numBonds = mol.get_num_bonds();
            } else if (typeof mol.get_numbonds === 'function') {
                info.numBonds = mol.get_numbonds();
            } else if (typeof mol.num_bonds === 'function') {
                info.numBonds = mol.num_bonds();
            } else {
                info.numBonds = 'Unknown';
            }
        } catch (e) {
            console.warn('Failed to get bond count:', e);
            info.numBonds = 'Unknown';
        }
        
        // Count rings from SMILES as fallback
        try {
            const ringMatches = smileString.match(/[0-9]/g);
            info.numRings = ringMatches ? Math.floor(ringMatches.length / 2) : 0;
        } catch (e) {
            console.warn('Failed to count rings:', e);
        }
        
        return info;
    } catch (error) {
        console.error('Failed to generate molecular info:', error);
        return {
            molecularFormula: 'Error',
            molecularWeight: 'Error',
            numAtoms: 'Error',
            numBonds: 'Error',
            numRings: 'Error'
        };
    }
}

// Create molecular information panel
function createMolecularInfoPanel(molInfo) {
    const infoPanel = document.createElement('div');
    infoPanel.className = 'rdkit-info-panel';
    infoPanel.style.cssText = `
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 6px;
        padding: 10px;
        margin-top: 10px;
        font-size: 13px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
    `;
    
    infoPanel.innerHTML = `
        <div><strong>Formula:</strong> ${molInfo.molecularFormula}</div>
        <div><strong>Weight:</strong> ${molInfo.molecularWeight}</div>
        <div><strong>Atoms:</strong> ${molInfo.numAtoms}</div>
        <div><strong>Bonds:</strong> ${molInfo.numBonds}</div>
        <div><strong>Rings:</strong> ${molInfo.numRings}</div>
        <div><strong>Source:</strong> RDKit.js</div>
    `;
    
    return infoPanel;
}

// Extract molecular formula from molblock (improved)
function extractFormulaFromMolblock(molblock) {
    try {
        const lines = molblock.split('\n');
        const atoms = {};
        
        // Parse header to get atom count
        let atomCount = 0;
        if (lines.length >= 4) {
            const headerLine = lines[3].trim();
            atomCount = parseInt(headerLine.substring(0, 3).trim()) || 0;
        }
        
        // Parse atom lines
        for (let i = 4; i < 4 + atomCount && i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.length === 0 || line.includes('M  END')) break;
            
            // MOL format: x10.4 y10.4 z10.4 aaaddcccssshhhbbbvvvHHHrrriiimmmnnneee
            // The element symbol starts at position 31 (0-indexed)
            if (line.length >= 34) {
                const element = line.substring(31, 34).trim();
                if (element && /^[A-Z][a-z]?$/.test(element)) {
                    atoms[element] = (atoms[element] || 0) + 1;
                }
            } else {
                // Fallback: split by whitespace
                const parts = line.split(/\s+/);
                if (parts.length >= 4) {
                    const element = parts[3].trim();
                    if (element && /^[A-Z][a-z]?$/.test(element)) {
                        atoms[element] = (atoms[element] || 0) + 1;
                    }
                }
            }
        }
        
        // Format formula (C, H, others alphabetically)
        let formula = '';
        
        // Add carbon first
        if (atoms['C']) {
            formula += 'C' + (atoms['C'] > 1 ? atoms['C'] : '');
            delete atoms['C'];
        }
        
        // Add hydrogen second
        if (atoms['H']) {
            formula += 'H' + (atoms['H'] > 1 ? atoms['H'] : '');
            delete atoms['H'];
        }
        
        // Add other elements alphabetically
        Object.keys(atoms).sort().forEach(element => {
            if (atoms[element] > 0) {
                formula += element + (atoms[element] > 1 ? atoms[element] : '');
            }
        });
        
        return formula || 'Unknown';
    } catch (error) {
        console.warn('Failed to extract formula from molblock:', error);
        return 'Unknown';
    }
}

// Render using external 2D structure API
async function renderWith2DApi(smileString, container) {
    try {
        // Use proxy and fallback APIs for 2D structure image
        const apiUrls = [
            `https://nurumayu-smile-3d-project.skume-bioinfo.workers.dev/api/pubchem/png/${encodeURIComponent(smileString)}`,
            `https://cactus.nci.nih.gov/chemical/structure/${encodeURIComponent(smileString)}/image?format=png&width=400&height=300`
        ];
        
        for (const apiUrl of apiUrls) {
            try {
                const response = await fetch(apiUrl);
                if (response.ok) {
                    const blob = await response.blob();
                    const imageUrl = URL.createObjectURL(blob);
                    
                    // Create image container
                    const imgContainer = document.createElement('div');
                    imgContainer.style.cssText = `
                        margin-bottom: 15px;
                        border: 1px solid #e9ecef;
                        border-radius: 4px;
                        background: white;
                        padding: 10px;
                        text-align: center;
                    `;
                    
                    const img = document.createElement('img');
                    img.src = imageUrl;
                    img.style.cssText = `
                        max-width: 100%;
                        max-height: 300px;
                        object-fit: contain;
                    `;
                    img.alt = '2D Molecular Structure';
                    
                    imgContainer.appendChild(img);
                    
                    // Add SMILES display below the structure
                    const smileDisplay = document.createElement('div');
                    smileDisplay.style.cssText = `
                        font-family: 'Courier New', monospace;
                        font-size: 14px;
                        color: #666;
                        background: #f8f9fa;
                        padding: 8px 12px;
                        border-radius: 4px;
                        border: 1px solid #e9ecef;
                        word-break: break-all;
                        max-width: 100%;
                    `;
                    smileDisplay.textContent = smileString;
                    
                    container.appendChild(imgContainer);
                    container.appendChild(smileDisplay);
                    
                    console.log('2D structure rendered with external API');
                    return true;
                }
            } catch (apiError) {
                console.warn(`API ${apiUrl} failed:`, apiError);
                continue;
            }
        }
        
        return false;
        
    } catch (error) {
        console.error('External API rendering failed:', error);
        return false;
    }
}

// Fallback rendering - enhanced text display
function renderFallback2D(smileString, container) {
    // Clear container if it's the main container
    if (container.id === 'viewer-2d') {
        container.innerHTML = '';
        
        const structure2D = document.createElement('div');
        structure2D.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 20px;
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 4px;
        `;
        container = structure2D;
        document.getElementById('viewer-2d').appendChild(structure2D);
    }
    
    // Add enhanced SMILES display
    const smileDisplay = document.createElement('div');
    smileDisplay.style.cssText = `
        font-family: 'Courier New', monospace;
        font-size: 16px;
        font-weight: bold;
        color: #333;
        background: #f8f9fa;
        padding: 15px 20px;
        border-radius: 8px;
        border: 2px solid #e9ecef;
        margin-bottom: 20px;
        word-break: break-all;
        max-width: 100%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
    smileDisplay.textContent = smileString;
    
    // Add visual indicator
    const molRepresentation = document.createElement('div');
    molRepresentation.style.cssText = `
        font-size: 48px;
        color: #666;
        text-align: center;
        margin-bottom: 15px;
    `;
    molRepresentation.innerHTML = '⚗️';
    
    // Add explanation
    const explanation = document.createElement('div');
    explanation.style.cssText = `
        font-size: 14px;
        color: #666;
        text-align: center;
        max-width: 300px;
        line-height: 1.4;
    `;
    explanation.innerHTML = '2D Structure Visualization<br><small>SMILES notation displayed above<br>Visual rendering in development</small>';
    
    container.appendChild(molRepresentation);
    container.appendChild(smileDisplay);
    container.appendChild(explanation);
    
    console.log('2D structure displayed in fallback mode');
}

// Calculate molecular formula from SMILES (enhanced implementation)
function calculateFormulaFromSMILES(smiles) {
    try {
        // Check if we have global molecule data with correct formula
        if (window.currentMolecule && window.currentMolecule.formula) {
            console.log('Using correct formula from molecule data:', window.currentMolecule.formula);
            return window.currentMolecule.formula;
        }
        
        const atoms = {};
        
        // Remove stereochemistry markers and ring numbers for simpler parsing
        let cleanSmiles = smiles.replace(/[@\[\]]/g, '').replace(/\d+/g, '');
        
        // Enhanced SMILES parsing - count explicit atoms
        const atomPattern = /[A-Z][a-z]?/g;
        let match;
        
        while ((match = atomPattern.exec(cleanSmiles)) !== null) {
            const element = match[0];
            atoms[element] = (atoms[element] || 0) + 1;
        }
        
        // Enhanced hydrogen estimation (still basic, but improved)
        if (atoms['C']) {
            // For complex molecules, use the LLM data if available
            if (window.currentMolecule && window.currentMolecule.formula) {
                return window.currentMolecule.formula;
            }
            
            // Fallback: Basic estimation
            const carbonCount = atoms['C'];
            const otherAtoms = Object.keys(atoms).filter(a => a !== 'C').reduce((sum, a) => sum + atoms[a], 0);
            
            // Better estimation considering typical organic chemistry
            let estimatedHydrogens = 0;
            if (carbonCount > 0) {
                // Very rough: for large organic molecules, assume 1.5-2 H per C on average
                estimatedHydrogens = Math.round(carbonCount * 1.7);
                
                // Adjust for other atoms
                estimatedHydrogens = Math.max(0, estimatedHydrogens - otherAtoms);
            }
            
            if (estimatedHydrogens > 0 && !atoms['H']) {
                atoms['H'] = estimatedHydrogens;
            }
        }
        
        // Format formula (C, H, others alphabetically)
        let formula = '';
        
        if (atoms['C']) {
            formula += 'C' + (atoms['C'] > 1 ? atoms['C'] : '');
            delete atoms['C'];
        }
        
        if (atoms['H']) {
            formula += 'H' + (atoms['H'] > 1 ? atoms['H'] : '');
            delete atoms['H'];
        }
        
        Object.keys(atoms).sort().forEach(element => {
            if (atoms[element] > 0) {
                formula += element + (atoms[element] > 1 ? atoms[element] : '');
            }
        });
        
        return formula || 'Unknown';
    } catch (error) {
        console.warn('Failed to calculate formula from SMILES:', error);
        // Final fallback: use molecule data if available
        if (window.currentMolecule && window.currentMolecule.formula) {
            return window.currentMolecule.formula;
        }
        return 'Unknown';
    }
}

// Legacy function compatibility
function display3DMolecule_legacy(smileString) {
    return displayMolecularStructure(smileString);
}

// Setup event handlers for view control elements
function setupViewControlEventHandlers() {
    // View mode selector
    const viewModeSelect = document.getElementById('view-mode');
    if (viewModeSelect) {
        // Remove existing listeners
        viewModeSelect.removeEventListener('change', changeViewMode);
        // Add new listener
        viewModeSelect.addEventListener('change', changeViewMode);
        console.log('View mode change handler setup');
    }
    
    // View style selector
    const viewStyleSelect = document.getElementById('view-style');
    if (viewStyleSelect) {
        // Remove existing listeners
        viewStyleSelect.removeEventListener('change', changeViewStyle);
        // Add new listener
        viewStyleSelect.addEventListener('change', changeViewStyle);
        console.log('View style change handler setup');
    }
    
    // Reset view button
    const resetViewBtn = document.getElementById('reset-view');
    if (resetViewBtn) {
        // Remove existing listeners
        resetViewBtn.removeEventListener('click', resetView);
        // Add new listener
        resetViewBtn.addEventListener('click', resetView);
        console.log('Reset view button handler setup');
    }
}