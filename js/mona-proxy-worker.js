/**
 * Chemical Database API Proxy Worker for Nurumayu Smile 3D Project
 * Solves CORS issues when accessing chemical databases from browser
 * Primary: Metabolomics Workbench (no auth required)
 * Secondary: ChemSpider (if API key available)
 * 
 * Deploy to: https://nurumayu-smile-3d-project.skume-bioinfo.workers.dev/
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

/**
 * Handle incoming requests and proxy to MoNA API
 */
async function handleRequest(request) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return handleCORS()
  }

  try {
    const url = new URL(request.url)
    const path = url.pathname

    // Parse the API endpoint from the path
    if (path.startsWith('/api/search')) {
      return await proxySearchRequest(request, url)
    } else if (path.startsWith('/api/pubchem')) {
      return await proxyPubChemRequest(request, url)
    }

    // Default response for non-API requests
    return new Response(JSON.stringify({
      service: 'Chemical Database API Proxy',
      status: 'active',
      version: '2.0',
      endpoints: [
        '/api/search/mass/{mass}/{tolerance} - Search by mass',
        '/api/search/formula/{formula} - Search by molecular formula',
        '/api/search/smiles/{smiles} - Search by SMILES notation',
        '/api/pubchem/sdf/{smiles} - Get SDF from PubChem via SMILES',
        '/api/pubchem/png/{smiles} - Get PNG image from PubChem via SMILES'
      ],
      databases: [
        'Metabolomics Workbench (Primary)',
        'RefMet Database',
        'ChemSpider (Secondary)'
      ]
    }), {
      headers: getCORSHeaders()
    })

  } catch (error) {
    console.error('Worker error:', error)
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: getCORSHeaders()
    })
  }
}

/**
 * Proxy requests to Chemical Database APIs
 */
async function proxySearchRequest(request, url) {
  try {
    const pathSegments = url.pathname.split('/').filter(segment => segment)
    console.log('Path segments:', pathSegments)
    
    // Expected format: /api/search/{type}/{value}/{tolerance?}
    if (pathSegments.length < 3) {
      throw new Error('Invalid API path. Expected: /api/search/{type}/{value}')
    }
    
    const searchType = pathSegments[2] // mass, formula, smiles
    const searchValue = pathSegments[3]
    const tolerance = pathSegments[4] || '0.5'
    
    let apiUrl
    let searchResults = []
    
    switch (searchType) {
      case 'mass':
        // Metabolomics Workbench doesn't support mass search directly
        // Return helpful error message with alternative approaches
        return new Response(JSON.stringify({
          success: false,
          error: 'Mass search not supported by Metabolomics Workbench',
          message: 'Try searching by molecular formula instead',
          searchType: searchType,
          searchValue: searchValue,
          supportedSearchTypes: ['formula', 'smiles']
        }), {
          status: 400,
          headers: {
            ...getCORSHeaders(),
            'Content-Type': 'application/json'
          }
        })
        
      case 'formula':
        // Search by molecular formula
        apiUrl = `https://www.metabolomicsworkbench.org/rest/compound/formula/${encodeURIComponent(searchValue)}/all`
        console.log('Searching MW by formula:', apiUrl)
        break
        
      case 'smiles':
        // Search by SMILES - use name search as fallback
        apiUrl = `https://www.metabolomicsworkbench.org/rest/compound/smiles/${encodeURIComponent(searchValue)}/all`
        console.log('Searching MW by SMILES:', apiUrl)
        break
        
      default:
        throw new Error(`Unsupported search type: ${searchType}`)
    }

    // Make request to Metabolomics Workbench
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Nurumayu-Smile3D-Proxy/2.0'
      }
    })
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const responseData = await response.text()
    
    // Transform response to standardized format
    let jsonData
    try {
      jsonData = JSON.parse(responseData)
    } catch (e) {
      jsonData = { results: [], message: responseData }
    }
    
    // Convert Metabolomics Workbench format {Row1: {...}, Row2: {...}} to array
    let resultsArray = []
    if (jsonData && typeof jsonData === 'object' && !Array.isArray(jsonData)) {
      // Check if response has Row1, Row2, etc. format
      const rowKeys = Object.keys(jsonData).filter(key => key.match(/^Row\d+$/))
      if (rowKeys.length > 0) {
        resultsArray = rowKeys.map(key => jsonData[key])
      } else if (jsonData.results && Array.isArray(jsonData.results)) {
        resultsArray = jsonData.results
      }
    } else if (Array.isArray(jsonData)) {
      resultsArray = jsonData
    }
    
    const standardizedResponse = {
      success: true,
      searchType: searchType,
      searchValue: searchValue,
      tolerance: tolerance,
      database: 'Metabolomics Workbench',
      resultsCount: resultsArray.length,
      results: resultsArray
    }
    
    return new Response(JSON.stringify(standardizedResponse), {
      status: 200,
      headers: {
        ...getCORSHeaders(),
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('Search proxy error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: 'Chemical database search error',
      message: error.message,
      endpoint: url.pathname
    }), {
      status: 502,
      headers: getCORSHeaders()
    })
  }
}

/**
 * Proxy requests to PubChem API to resolve CORS issues
 */
async function proxyPubChemRequest(request, url) {
  try {
    const pathSegments = url.pathname.split('/').filter(segment => segment)
    console.log('PubChem proxy path segments:', pathSegments)
    
    // Expected format: /api/pubchem/{format}/{smiles}
    if (pathSegments.length < 4) {
      throw new Error('Invalid PubChem API path. Expected: /api/pubchem/{format}/{smiles}')
    }
    
    const format = pathSegments[2] // sdf, png, mol
    const smiles = decodeURIComponent(pathSegments[3])
    
    let pubchemUrl
    let responseType = 'json'
    
    switch (format.toLowerCase()) {
      case 'sdf':
        pubchemUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smiles)}/SDF`
        responseType = 'text'
        break
        
      case 'png':
        pubchemUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smiles)}/PNG?image_size=400x300`
        responseType = 'blob'
        break
        
      case 'mol':
        pubchemUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smiles)}/SDF`
        responseType = 'text'
        break
        
      case 'json':
        pubchemUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smiles)}/property/MolecularFormula,MolecularWeight,InChI,InChIKey/JSON`
        responseType = 'json'
        break
        
      default:
        throw new Error(`Unsupported PubChem format: ${format}`)
    }

    console.log('Proxying to PubChem:', pubchemUrl)

    // Make request to PubChem
    const response = await fetch(pubchemUrl, {
      method: 'GET',
      headers: {
        'Accept': responseType === 'json' ? 'application/json' : '*/*',
        'User-Agent': 'Nurumayu-Smile3D-Proxy/2.0'
      }
    })
    
    if (!response.ok) {
      throw new Error(`PubChem API error: ${response.status} ${response.statusText}`)
    }

    // Handle different response types
    let responseData
    let contentType
    
    switch (responseType) {
      case 'blob':
        responseData = await response.arrayBuffer()
        contentType = response.headers.get('content-type') || 'image/png'
        break
        
      case 'text':
        responseData = await response.text()
        contentType = 'text/plain'
        break
        
      case 'json':
      default:
        responseData = await response.text()
        contentType = 'application/json'
        break
    }
    
    // Return proxied response with CORS headers
    return new Response(responseData, {
      status: 200,
      headers: {
        ...getCORSHeaders(),
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    })

  } catch (error) {
    console.error('PubChem proxy error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: 'PubChem API proxy error',
      message: error.message,
      endpoint: url.pathname
    }), {
      status: 502,
      headers: {
        ...getCORSHeaders(),
        'Content-Type': 'application/json'
      }
    })
  }
}

/**
 * Handle CORS preflight requests
 */
function handleCORS() {
  return new Response(null, {
    status: 204,
    headers: getCORSHeaders()
  })
}

/**
 * Get CORS headers for responses
 */
function getCORSHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json'
  }
}

/**
 * Helper functions for direct chemical database search
 */
async function searchByMass(mass, tolerance = 0.5) {
  try {
    const massNum = parseFloat(mass)
    const tolNum = parseFloat(tolerance)
    
    const apiUrl = `https://www.metabolomicsworkbench.org/rest/compound/exactmass/${massNum-tolNum}/${massNum+tolNum}/all`
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Nurumayu-Smile3D-Proxy/2.0'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return { 
      success: true,
      results: Array.isArray(data) ? data : [],
      database: 'Metabolomics Workbench',
      searchType: 'mass',
      searchValue: mass,
      tolerance: tolerance
    }
    
  } catch (error) {
    console.error('Mass search error:', error)
    return { 
      success: false,
      error: error.message, 
      results: [],
      searchType: 'mass'
    }
  }
}

async function searchByFormula(formula) {
  try {
    const apiUrl = `https://www.metabolomicsworkbench.org/rest/compound/formula/${encodeURIComponent(formula)}/all`
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Nurumayu-Smile3D-Proxy/2.0'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    
    // Convert Metabolomics Workbench format to array
    let resultsArray = []
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const rowKeys = Object.keys(data).filter(key => key.match(/^Row\d+$/))
      if (rowKeys.length > 0) {
        resultsArray = rowKeys.map(key => data[key])
      }
    } else if (Array.isArray(data)) {
      resultsArray = data
    }
    
    return { 
      success: true,
      results: resultsArray,
      database: 'Metabolomics Workbench',
      searchType: 'formula',
      searchValue: formula
    }
    
  } catch (error) {
    console.error('Formula search error:', error)
    return { 
      success: false,
      error: error.message, 
      results: [],
      searchType: 'formula'
    }
  }
}

async function searchBySMILES(smiles) {
  try {
    const apiUrl = `https://www.metabolomicsworkbench.org/rest/compound/smiles/${encodeURIComponent(smiles)}/all`
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Nurumayu-Smile3D-Proxy/2.0'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    
    // Convert Metabolomics Workbench format to array
    let resultsArray = []
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const rowKeys = Object.keys(data).filter(key => key.match(/^Row\d+$/))
      if (rowKeys.length > 0) {
        resultsArray = rowKeys.map(key => data[key])
      }
    } else if (Array.isArray(data)) {
      resultsArray = data
    }
    
    return { 
      success: true,
      results: resultsArray,
      database: 'Metabolomics Workbench',
      searchType: 'smiles',
      searchValue: smiles
    }
    
  } catch (error) {
    console.error('SMILES search error:', error)
    return { 
      success: false,
      error: error.message, 
      results: [],
      searchType: 'smiles'
    }
  }
}

/**
 * Enhanced error logging and monitoring
 */
function logRequest(request, response, duration) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    status: response.status,
    duration: duration,
    userAgent: request.headers.get('User-Agent')
  }))
} 