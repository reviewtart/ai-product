# Cloudflare Workers - Shared AI API Proxy

Shared server for all AI applications in folders `1`, `2`, and `3`. This Cloudflare Worker proxies requests to HuggingFace and Google Gemini APIs with automatic key rotation and retry logic.

## 🎯 Features

- ✅ **HuggingFace API Proxy** - Support for all HF models (chat, vision, image-gen, audio)
- ✅ **Google Gemini API Proxy** - Gemini 2.5 Pro vision and chat
- ✅ **Auto Key Rotation** - Multiple keys with smart rotation (configurable via env vars)
- ✅ **Retry Logic** - Automatic retry on rate limits or server errors
- ✅ **CORS Support** - Works with any frontend application
- ✅ **Secure Key Storage** - API keys stored as environment variables/secrets
- ✅ **No Key Exposure** - Keys never exposed in source code or browser

## 📁 Structure

```
cloudflare/
├── server.js              # Main Cloudflare Worker code
├── wrangler.toml          # Cloudflare configuration
├── package.json           # NPM dependencies and scripts
├── .dev.vars.example      # Example environment variables
├── .gitignore             # Git ignore rules
├── example-usage.html     # Frontend integration example
└── README.md              # This file
```

## 🚀 Setup & Deployment

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Update Configuration

Edit `wrangler.toml` and add your Cloudflare account ID:

```toml
account_id = "your-account-id-here"
```

### 4. Set Up API Keys

#### For Local Development

Create a `.dev.vars` file from the example:

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` and add your API keys:

```bash
# HuggingFace API Keys (comma-separated)
HF_KEYS=hf_yourkey1,hf_yourkey2,hf_yourkey3

# Google Gemini API Keys (comma-separated)
GEMINI_KEYS=AIzaYourKey1,AIzaYourKey2,AIzaYourKey3
```

**Get Your Keys:**
- HuggingFace: https://huggingface.co/settings/tokens
- Google Gemini: https://makersuite.google.com/app/apikey

#### For Production Deployment

Set secrets using Wrangler CLI:

```bash
# Set HuggingFace keys (comma-separated)
wrangler secret put HF_KEYS
# When prompted, paste: hf_key1,hf_key2,hf_key3

# Set Gemini keys (comma-separated)
wrangler secret put GEMINI_KEYS
# When prompted, paste: AIzaKey1,AIzaKey2,AIzaKey3
```

### 5. Deploy to Cloudflare

```bash
cd cloudflare
wrangler deploy
```

After deployment, you'll get a URL like:
```
https://ai-api-proxy.your-subdomain.workers.dev
```

## 📡 API Endpoints

### Health Check

```bash
GET https://your-worker.workers.dev/health
```

Response:
```json
{
  "status": "ok",
  "service": "AI API Proxy",
  "endpoints": {
    "huggingface": "/api/huggingface",
    "gemini": "/api/gemini"
  },
  "stats": {
    "hf_keys": 3,
    "gemini_keys": 9,
    "current_hf_index": 0,
    "current_gemini_index": 0,
    "failed_keys_count": 0
  }
}
```

### HuggingFace API

```bash
POST https://your-worker.workers.dev/api/huggingface
```

Request body:
```json
{
  "model": "meta-llama/Llama-3.3-70B-Instruct",
  "inputs": "Hello, how are you?",
  "parameters": {
    "max_new_tokens": 512,
    "temperature": 0.7
  }
}
```

### Google Gemini API

```bash
POST https://your-worker.workers.dev/api/gemini
```

Request body:
```json
{
  "contents": [{
    "parts": [
      {
        "inline_data": {
          "mime_type": "image/jpeg",
          "data": "base64_image_data"
        }
      },
      { "text": "Describe this image" }
    ]
  }]
}
```

## 🔧 Usage in Frontend Apps

### For Apps in Folders 1, 2, 3

Replace the direct API calls with calls to your Cloudflare Worker:

#### Example: HuggingFace Chat

**Before (direct API call):**
```javascript
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
```

**After (via Cloudflare Worker):**
```javascript
const response = await fetch(
  'https://your-worker.workers.dev/api/huggingface',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'meta-llama/Llama-3.3-70B-Instruct',
      inputs: 'Hello!',
      parameters: { max_new_tokens: 512 }
    })
  }
);
```

#### Example: Gemini Vision

**Before (direct API call):**
```javascript
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents })
  }
);
```

**After (via Cloudflare Worker):**
```javascript
const response = await fetch(
  'https://your-worker.workers.dev/api/gemini',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents })
  }
);
```

## 🔐 Security Benefits

1. **No Key Exposure** - API keys are stored on Cloudflare, not in browser
2. **Rate Limiting** - Automatic rotation prevents hitting rate limits
3. **Retry Logic** - Failed requests are automatically retried with different keys
4. **CORS Protection** - Only allowed origins can access the API

## 🛠️ Development & Testing

### Local Development

```bash
cd cloudflare
wrangler dev
```

This starts a local server at `http://localhost:8787`

### Test with cURL

```bash
# Test health endpoint
curl https://your-worker.workers.dev/health

# Test HuggingFace API
curl -X POST https://your-worker.workers.dev/api/huggingface \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/Llama-3.3-70B-Instruct",
    "inputs": "Hello!",
    "parameters": {"max_new_tokens": 100}
  }'

# Test Gemini API
curl -X POST https://your-worker.workers.dev/api/gemini \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{"text": "Hello Gemini!"}]
    }]
  }'
```

## 📊 Key Rotation Logic

- **HuggingFace**: 3 keys rotate automatically
- **Gemini**: 9 keys rotate automatically
- **Failed Keys**: Marked for 30 seconds before retry
- **Smart Retry**:
  - Rate limit (429): Try next key immediately
  - Server error (503): Wait 2-3 seconds before retry
  - Auth error (403): Try next key immediately

## 🔄 Migration Guide for Existing Apps

### Step 1: Update API Endpoint

Replace:
```javascript
const HF_API = 'https://api-inference.huggingface.co';
const GEMINI_API = 'https://generativelanguage.googleapis.com';
```

With:
```javascript
const API_BASE = 'https://your-worker.workers.dev';
```

### Step 2: Remove API Key Logic

Delete:
```javascript
const hiddenHFKeys = [...];
const hiddenGeminiKeys = [...];
function getNextHFKey() { ... }
function getNextGeminiKey() { ... }
```

### Step 3: Update Fetch Calls

Replace all `fetch()` calls to use the new endpoints:
- `/api/huggingface` for HuggingFace
- `/api/gemini` for Gemini

## 📝 Notes

- **Free Tier**: Cloudflare Workers free tier includes 100,000 requests/day
- **Latency**: Adds ~50-100ms overhead for proxying
- **Logs**: View logs with `wrangler tail`
- **Updates**: Deploy updates with `wrangler deploy`

## 🐛 Troubleshooting

### CORS Errors

Make sure your Worker is deployed and the URL is correct. CORS is enabled for all origins (`*`).

### Rate Limits

The Worker automatically rotates keys. If all keys are rate-limited, wait 30 seconds.

### Deployment Errors

```bash
# Check account ID
wrangler whoami

# Verify configuration
wrangler deploy --dry-run
```

## 📚 Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [HuggingFace Inference API](https://huggingface.co/docs/api-inference/)
- [Google Gemini API](https://ai.google.dev/gemini-api/docs)

## 🎉 Benefits for Folders 1, 2, 3

1. **Single Source of Truth** - One place to manage API keys
2. **Easy Updates** - Update keys in one file, affects all apps
3. **Better Security** - Keys never exposed in browser
4. **Improved Reliability** - Automatic retry and rotation
5. **Simplified Code** - Remove key management from frontend

---

**Made with ❤️ for AI Product**
