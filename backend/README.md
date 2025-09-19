# PayCio Wallet Backend

A Node.js backend service for the PayCio Wallet Chrome extension that handles all external API calls, providing better security, caching, and reliability.

## 🚀 Features

- **Token Validation**: Validate ERC-20 tokens via blockchain explorers and direct RPC calls
- **Balance Fetching**: Get native and token balances for multiple networks
- **Price Data**: Fetch token prices from multiple sources (CoinGecko, DEX APIs)
- **Network Testing**: Test custom network connections
- **Caching**: Built-in caching to reduce API calls and improve performance
- **Rate Limiting**: Protect against abuse and stay within API limits
- **CORS Support**: Configured for Chrome extension integration
- **Fallback System**: Multiple data sources with automatic fallbacks

## 📋 Prerequisites

- Node.js 16+ 
- npm or yarn
- API keys (optional but recommended)

## 🛠️ Installation

1. **Clone and install dependencies:**
```bash
cd backend
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. **Start the server:**
```bash
# Development
npm run dev

# Production
npm start
```

## 🔧 Configuration

### Required Environment Variables

```env
PORT=3001
NODE_ENV=development
CORS_ORIGIN=chrome-extension://*
```

### API Keys (Optional but Recommended)

```env
# Blockchain Explorer APIs
ETHERSCAN_API_KEY=your_etherscan_api_key
BSCSCAN_API_KEY=your_bscscan_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key

# Price Data APIs
COINGECKO_API_KEY=your_coingecko_api_key
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key
```

### Free API Keys

1. **Etherscan**: https://etherscan.io/apis (5 calls/second free)
2. **BSCScan**: https://bscscan.com/apis (5 calls/second free)
3. **PolygonScan**: https://polygonscan.com/apis (5 calls/second free)
4. **CoinGecko**: https://www.coingecko.com/en/api (50 calls/minute free)

## 🌐 API Endpoints

### Token Validation
```
POST /api/tokens/validate
Body: { "address": "0x...", "network": "ethereum" }
```

### Balance Fetching
```
GET /api/balances/native/{network}/{address}
GET /api/balances/token/{network}/{tokenAddress}/{walletAddress}
POST /api/balances/batch
```

### Price Data
```
GET /api/prices/{network}/{address}
POST /api/prices/batch
GET /api/prices/native/{symbols}
```

### Network Testing
```
GET /api/networks
GET /api/networks/{networkId}
POST /api/networks/test
POST /api/networks/validate
```

### Health Check
```
GET /health
```

## 🔄 Integration with Chrome Extension

### 1. Update Extension Configuration

Add to your extension's environment:
```javascript
REACT_APP_BACKEND_URL=http://localhost:3001
```

### 2. Use Hybrid API Service

```typescript
import { hybridAPI } from '../services/backend-api';

// Initialize (checks if backend is available)
await hybridAPI.initialize();

// Use hybrid service (backend + fallback)
const isValid = await hybridAPI.validateToken(address, network);
const balance = await hybridAPI.getBalance(address, network);
```

### 3. Update Token Validation

Replace existing token validation:
```typescript
// Old way (direct API calls)
const isValid = await validateTokenContract(address, network);

// New way (backend + fallback)
const isValid = await hybridAPI.validateToken(address, network);
```

## 🏗️ Architecture Benefits

### Before (Direct API Calls)
```
Extension → Blockchain APIs (CORS issues, exposed keys)
```

### After (Backend Proxy)
```
Extension → Backend → Blockchain APIs (secure, cached, reliable)
```

### Key Improvements

1. **Security**: API keys hidden on server
2. **Performance**: Caching reduces redundant calls
3. **Reliability**: Multiple fallback methods
4. **CORS**: No more cross-origin issues
5. **Rate Limits**: Shared pool across users
6. **Monitoring**: Centralized logging and metrics

## 🔧 Development

### Running Tests
```bash
npm test
```

### Adding New Networks

1. Add network config to `src/routes/networks.js`
2. Add RPC endpoint to environment variables
3. Update balance fetching logic if needed

### Adding New Price Sources

1. Add price source to `src/routes/prices.js`
2. Implement fallback logic
3. Add API key to environment variables

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Docker (Optional)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
EXPOSE 3001
CMD ["npm", "start"]
```

## 📊 Monitoring

The backend includes:
- Health check endpoint (`/health`)
- Request logging
- Error tracking
- Performance metrics
- Cache hit rates

## 🛡️ Security

- Rate limiting per IP
- CORS protection
- Input validation
- API key protection
- Request timeout limits

## 🔄 Fallback Strategy

The system uses a multi-tier fallback approach:

1. **Backend API** (preferred)
2. **Direct RPC calls** (if backend unavailable)
3. **Basic validation** (last resort)

This ensures the extension works even if:
- Backend is down
- API keys are missing
- External APIs are rate limited

## 📝 License

MIT License - see LICENSE file for details
