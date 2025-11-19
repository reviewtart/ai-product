/**
 * Cloudflare Workers - Shared AI API Proxy
 * Proxies requests to HuggingFace and Google Gemini APIs
 * Used by AI apps in folders 1, 2, 3
 */

// API Keys from environment variables (set via wrangler secret or .dev.vars)
// Format: Comma-separated list of keys
// Example: HF_KEYS="key1,key2,key3"
// For local dev, create .dev.vars file with your keys

function getKeysFromEnv(env, keyName, defaultKeys = []) {
  const envValue = env?.[keyName];
  if (envValue) {
    return envValue.split(',').map(k => k.trim()).filter(k => k);
  }
  return defaultKeys;
}

// Key rotation state
let currentHFKeyIndex = 0;
let currentGeminiKeyIndex = 0;

// Failed keys tracking (with expiry)
const failedKeys = new Map();

/**
 * Get next available HuggingFace key
 */
function getNextHFKey(HF_KEYS) {
  if (!HF_KEYS || HF_KEYS.length === 0) {
    throw new Error('No HuggingFace API keys configured');
  }

  const now = Date.now();
  const maxAttempts = HF_KEYS.length * 2;

  for (let i = 0; i < maxAttempts; i++) {
    const key = HF_KEYS[currentHFKeyIndex];
    currentHFKeyIndex = (currentHFKeyIndex + 1) % HF_KEYS.length;

    // Check if key failed recently (within 30 seconds)
    const failedAt = failedKeys.get(key);
    if (!failedAt || now - failedAt > 30000) {
      return key;
    }
  }

  // All keys failed, clear cache and return first
  failedKeys.clear();
  return HF_KEYS[0];
}

/**
 * Get next available Gemini key
 */
function getNextGeminiKey(GEMINI_KEYS) {
  if (!GEMINI_KEYS || GEMINI_KEYS.length === 0) {
    throw new Error('No Gemini API keys configured');
  }

  const now = Date.now();
  const maxAttempts = GEMINI_KEYS.length * 2;

  for (let i = 0; i < maxAttempts; i++) {
    const key = GEMINI_KEYS[currentGeminiKeyIndex];
    currentGeminiKeyIndex = (currentGeminiKeyIndex + 1) % GEMINI_KEYS.length;

    // Check if key failed recently (within 30 seconds)
    const failedAt = failedKeys.get(key);
    if (!failedAt || now - failedAt > 30000) {
      return key;
    }
  }

  // All keys failed, clear cache and return first
  failedKeys.clear();
  return GEMINI_KEYS[0];
}

/**
 * Mark key as failed
 */
function markKeyFailed(key) {
  failedKeys.set(key, Date.now());
}

/**
 * CORS headers for browser requests
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Handle HuggingFace API requests with retry
 */
async function handleHuggingFaceRequest(request, HF_KEYS) {
  try {
    const body = await request.json();
    const { model, inputs, parameters } = body;

    if (!model) {
      return new Response(JSON.stringify({ error: 'Model is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Retry up to 3 times with different keys
    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const apiKey = getNextHFKey(HF_KEYS);

        const response = await fetch(
          `https://api-inference.huggingface.co/models/${model}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ inputs, parameters })
          }
        );

        // If rate limited or auth failed, try next key
        if (response.status === 429 || response.status === 403) {
          markKeyFailed(apiKey);
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
        }

        // If model loading, wait and retry
        if (response.status === 503) {
          const errorText = await response.text();
          if (errorText.includes('loading') && attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            continue;
          }
        }

        // Get response data
        const contentType = response.headers.get('content-type') || '';
        let data;

        if (contentType.includes('application/json')) {
          data = await response.json();
        } else if (contentType.includes('image') || contentType.includes('audio')) {
          data = await response.blob();
          return new Response(data, {
            status: response.status,
            headers: {
              ...corsHeaders,
              'Content-Type': contentType
            }
          });
        } else {
          data = await response.text();
        }

        return new Response(JSON.stringify(data), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error) {
        lastError = error;
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle Google Gemini API requests with retry
 */
async function handleGeminiRequest(request, GEMINI_KEYS) {
  try {
    const body = await request.json();
    const { contents, generationConfig } = body;

    if (!contents) {
      return new Response(JSON.stringify({ error: 'Contents are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Retry with all available keys
    let lastError = null;
    const maxAttempts = Math.min(GEMINI_KEYS.length, 5); // Try up to 5 keys

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const apiKey = getNextGeminiKey(GEMINI_KEYS);

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ contents, generationConfig })
          }
        );

        // If quota exceeded or auth failed, try next key immediately
        if (response.status === 429 || response.status === 403) {
          markKeyFailed(apiKey);
          if (attempt < maxAttempts - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          }
        }

        // If server overloaded, wait and retry
        if (response.status === 503) {
          markKeyFailed(apiKey);
          if (attempt < maxAttempts - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
        }

        const data = await response.json();

        return new Response(JSON.stringify(data), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    throw lastError || new Error('All Gemini keys exhausted');

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Main request handler
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Load API keys from environment variables
    const HF_KEYS = getKeysFromEnv(env, 'HF_KEYS', []);
    const GEMINI_KEYS = getKeysFromEnv(env, 'GEMINI_KEYS', []);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders
      });
    }

    // Route handlers
    if (url.pathname === '/api/huggingface' && request.method === 'POST') {
      return handleHuggingFaceRequest(request, HF_KEYS);
    }

    if (url.pathname === '/api/gemini' && request.method === 'POST') {
      return handleGeminiRequest(request, GEMINI_KEYS);
    }

    // Health check
    if (url.pathname === '/health' || url.pathname === '/') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'AI API Proxy',
        endpoints: {
          huggingface: '/api/huggingface',
          gemini: '/api/gemini'
        },
        stats: {
          hf_keys: HF_KEYS.length,
          gemini_keys: GEMINI_KEYS.length,
          current_hf_index: currentHFKeyIndex,
          current_gemini_index: currentGeminiKeyIndex,
          failed_keys_count: failedKeys.size
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 404 for unknown routes
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};
