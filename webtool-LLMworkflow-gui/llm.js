// LLM API Configuration and Client Module

// API Configuration
const API_CONFIG = {
  cloudflareWorker: {
    url: 'https://llm-api.yasaichi.workers.dev/api/llm',
    timeout: 30000,
    retries: 2
  },
  ionetDirect: {
    url: 'https://api.ionet.ai/v1/chat/completions',
    timeout: 30000,
    retries: 2
  },
  retry: {
    maxAttempts: 3,
    baseDelay: 1000
  }
};

// Exponential backoff with jitter
function calculateDelay(attempt, baseDelay = 1000) {
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 0.3 * exponentialDelay; // ±30% jitter
  return Math.min(exponentialDelay + jitter, 10000); // Max 10 seconds
}

// Timeout wrapper for fetch
async function fetchWithTimeout(url, options, timeout = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    
    throw error;
  }
}

// Main API call function with fallback
async function callLLMAPI(messages, options = {}, useCache = false) {
  const config = {
    model: options.model || "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
    temperature: options.temperature || 0.7,
    stream: false,
    max_completion_tokens: options.maxTokens || 2000,
    messages: messages,
    ...options
  };

  // Cloudflare Workers API（主要）
  try {
    const result = await callAPIWithRetry(API_CONFIG.cloudflareWorker.url, config, 'cloudflare');
    return result;
  } catch (error) {
    
    // フォールバック: io.net直接API
    try {
      const result = await callAPIWithRetry(API_CONFIG.ionetDirect.url, config, 'ionet');
      return result;
    } catch (fallbackError) {
      throw new Error('All API endpoints failed');
    }
  }
}

// Retry wrapper with exponential backoff
async function callAPIWithRetry(endpoint, config, source) {
  let lastError;
  
  for (let attempt = 1; attempt <= API_CONFIG.retry.maxAttempts; attempt++) {
    try {
      const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LLM-Workflow-GUI/1.0',
          'Accept': 'application/json',
          ...(source === 'ionet' && {
            'Authorization': `Bearer ${API_CONFIG.ionetDirect.apiKey}`
          })
        },
        body: JSON.stringify(config)
      }, API_CONFIG[source === 'cloudflare' ? 'cloudflareWorker' : 'ionetDirect'].timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      
      if (attempt > 1) {
        // Successful after retry
      }
      
      return result;
      
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain errors
      if (error.message.includes('400') || error.message.includes('401') || error.message.includes('403')) {
        throw error;
      }
      
      // Last attempt - don't wait
      if (attempt === API_CONFIG.retry.maxAttempts) {
        break;
      }
      
      // Wait before retry
      const delay = calculateDelay(attempt, API_CONFIG.retry.baseDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Enhanced response parser for better data extraction
function parseAPIResponse(text, endpoint) {
  try {
    // まずJSONとして直接パース
    const data = JSON.parse(text);
    
    // Cloudflare Workers形式の場合
    if (data.result || (data.choices && Array.isArray(data.choices))) {
      const content = data.result || 
                    (data.choices[0] && data.choices[0].message && data.choices[0].message.content) ||
                    (data.choices[0] && data.choices[0].text) ||
                    '';
      return { content, raw: data };
    }
    
    // io.net形式の場合
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return { 
        content: data.choices[0].message.content,
        raw: data
      };
    }
    
    // その他の形式
    return { content: JSON.stringify(data), raw: data };
    
  } catch (error) {
    // JSONパースに失敗した場合、テキストから推測して抽出
    let jsonText = text;
    
    // JSON部分を探す
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      jsonText = text.substring(jsonStart, jsonEnd + 1);
    }
    
    try {
      const data = JSON.parse(jsonText);
      return { content: JSON.stringify(data), raw: data };
    } catch (secondError) {
      // 最終的にテキストとして返す
      return { content: text, raw: { error: 'Parse failed', originalText: text } };
    }
  }
}

// Export the main function
window.callLLMAPI = callLLMAPI;

 