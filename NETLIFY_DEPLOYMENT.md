# 🚀 PayCio Wallet - Netlify Serverless Deployment

This guide shows how to deploy your Chrome extension's backend as **Netlify Functions** - perfect for plugins since users don't need to run any servers!

## 🎯 Why Netlify Functions for Chrome Extensions?

### ✅ **Perfect for Plugins:**
- **No hosting required** by users
- **Global CDN** - fast worldwide
- **Auto-scaling** - handles any traffic
- **Free tier generous** - 125k requests/month
- **Zero maintenance** - no servers to manage

### ✅ **Solves Plugin Problems:**
- **No CORS issues** - proper headers configured
- **API keys secure** - hidden in Netlify environment
- **Always available** - 99.9% uptime
- **No local setup** - works immediately after extension install

## 🛠️ Deployment Steps

### 1. **Install Netlify CLI** (if not already installed)
```bash
npm install -g netlify-cli
netlify login
```

### 2. **Initialize Netlify in Your Project**
```bash
# From your main project directory
netlify init

# Choose:
# - Create & configure a new site
# - Choose your team
# - Site name: paycio-wallet-api (or your preference)
```

### 3. **Configure Environment Variables**
```bash
# Add API keys to Netlify (optional but recommended)
netlify env:set ETHERSCAN_API_KEY "your_etherscan_api_key"
netlify env:set COINGECKO_API_KEY "your_coingecko_api_key"
netlify env:set BSCSCAN_API_KEY "your_bscscan_api_key"
netlify env:set POLYGONSCAN_API_KEY "your_polygonscan_api_key"

# Or set them in Netlify dashboard:
# https://app.netlify.com → Your Site → Environment Variables
```

### 4. **Deploy Functions**
```bash
# Deploy functions only
netlify functions:build
netlify deploy --prod

# Or deploy everything
netlify deploy --prod --dir=dist
```

### 5. **Get Your Function URLs**
After deployment, your functions will be available at:
```
https://your-site-name.netlify.app/.netlify/functions/validate-token
https://your-site-name.netlify.app/.netlify/functions/get-balance
https://your-site-name.netlify.app/.netlify/functions/get-price
https://your-site-name.netlify.app/.netlify/functions/test-network
```

### 6. **Update Extension Configuration**
```javascript
// In your extension's environment or config
REACT_APP_BACKEND_URL=https://your-site-name.netlify.app/.netlify/functions
```

### 7. **Build and Test Extension**
```bash
# Build extension with new backend URL
yarn build

# Load in Chrome and test token validation
# Should now work without CORS or API key issues!
```

## 🔧 Local Development

### **Test Functions Locally:**
```bash
# Install dependencies for functions
npm install ethers

# Start local Netlify development server
netlify dev

# Functions available at:
# http://localhost:8888/.netlify/functions/validate-token
# http://localhost:8888/.netlify/functions/get-balance
# etc.
```

### **Test with Extension:**
```bash
# Update for local testing
REACT_APP_BACKEND_URL=http://localhost:8888/.netlify/functions

# Build and test
yarn build
```

## 📊 Function Endpoints

### **Token Validation**
```javascript
POST https://your-site.netlify.app/.netlify/functions/validate-token
Body: { "address": "0x...", "network": "ethereum" }

Response: {
  "isValid": true,
  "tokenInfo": {
    "name": "USD Coin",
    "symbol": "USDC",
    "decimals": 6,
    "address": "0x...",
    "totalSupply": "..."
  },
  "validationMethod": "rpc",
  "network": "ethereum",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### **Balance Fetching**
```javascript
POST https://your-site.netlify.app/.netlify/functions/get-balance
Body: { "network": "ethereum", "address": "0x...", "type": "native" }

Response: {
  "network": "ethereum",
  "address": "0x...",
  "balance": "1.234567890",
  "type": "native",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### **Network Testing**
```javascript
POST https://your-site.netlify.app/.netlify/functions/test-network
Body: { "networkId": "custom", "rpcUrl": "https://...", "chainId": "1" }

Response: {
  "networkId": "custom",
  "rpcUrl": "https://...",
  "isConnected": true,
  "responseTime": 234,
  "blockNumber": 18500000,
  "chainId": "1",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 💰 Cost Analysis

### **Netlify Free Tier:**
- **125,000 function invocations/month** - Very generous!
- **100GB bandwidth/month**
- **Global CDN included**
- **Perfect for Chrome extensions**

### **Typical Chrome Extension Usage:**
- **Token validation**: ~10-50 calls/day per user
- **Balance checks**: ~100-500 calls/day per user  
- **Price updates**: ~50-200 calls/day per user
- **Total**: ~1,000 users could use free tier comfortably

## 🔄 Integration with Extension

### **Automatic Fallback System:**
```typescript
// Extension automatically uses Netlify when available
import { hybridAPI } from '../services/backend-api';

// Initialize (checks if Netlify functions are available)
await hybridAPI.initialize();

// Use (Netlify → Direct calls fallback)
const isValid = await hybridAPI.validateToken(address, network);
```

### **Benefits for Users:**
- ✅ **Extension works immediately** (direct calls)
- ✅ **Better performance** when Netlify is available
- ✅ **No setup required** by users
- ✅ **Automatic upgrades** when you deploy

## 🎉 Why This is Perfect for Your Plugin:

1. **Zero User Setup** - Extension works out of the box
2. **Professional Backend** - Serverless, scalable, reliable
3. **Cost Effective** - Free tier handles thousands of users
4. **Easy Deployment** - One command deployment
5. **Global Performance** - CDN makes it fast worldwide
6. **Secure** - API keys hidden, CORS configured properly

## 🚀 Quick Start Commands:

```bash
# 1. Deploy to Netlify
netlify init
netlify deploy --prod

# 2. Update extension
# Copy your Netlify URL and update REACT_APP_BACKEND_URL

# 3. Build extension
yarn build

# 4. Test - token validation should now work perfectly!
```

**This is the ideal solution for Chrome extension backends!** 🎯 Netlify Functions give you all the benefits of a backend without any of the hosting complexity.
