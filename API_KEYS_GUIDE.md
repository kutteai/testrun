# API Keys Setup Guide

This guide will help you obtain all the necessary API keys for the PayCio Wallet extension.

## Required API Keys

### 1. **Infura Project ID** (REQUIRED)
**What it's for:** Ethereum RPC endpoints, ENS resolution, and blockchain interactions
**How to get it:**
1. Go to [https://infura.io](https://infura.io)
2. Sign up for a free account
3. Create a new project
4. Copy your Project ID
5. Set in `.env`: `INFURA_PROJECT_ID=your_project_id_here`

**Free tier:** 100,000 requests/day

---

## Recommended API Keys

### 2. **Etherscan API Key** (RECOMMENDED)
**What it's for:** Transaction history, contract verification, and blockchain explorer data
**How to get it:**
1. Go to [https://etherscan.io](https://etherscan.io)
2. Sign up for a free account
3. Go to your profile → API Keys
4. Create a new API key
5. Set in `.env`: `ETHERSCAN_API_KEY=your_api_key_here`

**Free tier:** 5 requests/second, 100,000 requests/day

### 3. **CoinGecko API Key** (RECOMMENDED)
**What it's for:** Token prices, market data, and portfolio tracking
**How to get it:**
1. Go to [https://www.coingecko.com/en/api](https://www.coingecko.com/en/api)
2. Sign up for a free account
3. Subscribe to the free plan
4. Get your API key
5. Set in `.env`: `COINGECKO_API_KEY=your_api_key_here`

**Free tier:** 10,000 calls/month

### 4. **OpenSea API Key** (RECOMMENDED)
**What it's for:** NFT data, collections, and metadata
**How to get it:**
1. Go to [https://docs.opensea.io/reference/api-overview](https://docs.opensea.io/reference/api-overview)
2. Sign up for a free account
3. Request API access
4. Get your API key
5. Set in `.env`: `OPENSEA_API_KEY=your_api_key_here`

**Free tier:** 4 requests/second

---

## Optional API Keys

### 5. **Alchemy API Key** (OPTIONAL)
**What it's for:** Enhanced Ethereum RPC, NFT APIs, and Web3 development tools
**How to get it:**
1. Go to [https://www.alchemy.com](https://www.alchemy.com)
2. Sign up for a free account
3. Create a new app
4. Copy your API key
5. Set in `.env`: `ALCHEMY_API_KEY=your_api_key_here`

**Free tier:** 300 million compute units/month

### 6. **BSCScan API Key** (OPTIONAL)
**What it's for:** BNB Smart Chain transaction history and explorer data
**How to get it:**
1. Go to [https://bscscan.com](https://bscscan.com)
2. Sign up for a free account
3. Go to your profile → API Keys
4. Create a new API key
5. Set in `.env`: `BSCSCAN_API_KEY=your_api_key_here`

**Free tier:** 5 requests/second

### 7. **PolygonScan API Key** (OPTIONAL)
**What it's for:** Polygon transaction history and explorer data
**How to get it:**
1. Go to [https://polygonscan.com](https://polygonscan.com)
2. Sign up for a free account
3. Go to your profile → API Keys
4. Create a new API key
5. Set in `.env`: `POLYGONSCAN_API_KEY=your_api_key_here`

**Free tier:** 5 requests/second

### 8. **AvalancheScan API Key** (OPTIONAL)
**What it's for:** Avalanche transaction history and explorer data
**How to get it:**
1. Go to [https://snowtrace.io](https://snowtrace.io)
2. Sign up for a free account
3. Go to your profile → API Keys
4. Create a new API key
5. Set in `.env`: `AVALANCHESCAN_API_KEY=your_api_key_here`

**Free tier:** 5 requests/second

### 9. **ArbitrumScan API Key** (OPTIONAL)
**What it's for:** Arbitrum transaction history and explorer data
**How to get it:**
1. Go to [https://arbiscan.io](https://arbiscan.io)
2. Sign up for a free account
3. Go to your profile → API Keys
4. Create a new API key
5. Set in `.env`: `ARBITRUMSCAN_API_KEY=your_api_key_here`

**Free tier:** 5 requests/second

### 10. **OptimismScan API Key** (OPTIONAL)
**What it's for:** Optimism transaction history and explorer data
**How to get it:**
1. Go to [https://optimistic.etherscan.io](https://optimistic.etherscan.io)
2. Sign up for a free account
3. Go to your profile → API Keys
4. Create a new API key
5. Set in `.env`: `OPTIMISMSCAN_API_KEY=your_api_key_here`

**Free tier:** 5 requests/second

### 11. **CoinMarketCap API Key** (OPTIONAL)
**What it's for:** Alternative price data and market information
**How to get it:**
1. Go to [https://coinmarketcap.com/api](https://coinmarketcap.com/api)
2. Sign up for a free account
3. Subscribe to the free plan
4. Get your API key
5. Set in `.env`: `COINMARKETCAP_API_KEY=your_api_key_here`

**Free tier:** 10,000 calls/month

### 12. **Alchemy NFT API Key** (OPTIONAL)
**What it's for:** Enhanced NFT data and metadata
**How to get it:**
1. Same as Alchemy API Key above
2. Use the same API key for NFT endpoints
3. Set in `.env`: `ALCHEMY_NFT_API_KEY=your_alchemy_api_key_here`

### 13. **DeFi Pulse API Key** (OPTIONAL)
**What it's for:** DeFi protocol data and analytics
**How to get it:**
1. Go to [https://defipulse.com](https://defipulse.com)
2. Contact their team for API access
3. Set in `.env`: `DEFI_PULSE_API_KEY=your_api_key_here`

---

## Environment File Setup

Create a `.env` file in your project root with the following structure:

```env
# Required
INFURA_PROJECT_ID=your_infura_project_id_here

# Recommended
ETHERSCAN_API_KEY=your_etherscan_api_key_here
COINGECKO_API_KEY=your_coingecko_api_key_here
OPENSEA_API_KEY=your_opensea_api_key_here

# Optional
ALCHEMY_API_KEY=your_alchemy_api_key_here
BSCSCAN_API_KEY=your_bscscan_api_key_here
POLYGONSCAN_API_KEY=your_polygonscan_api_key_here
AVALANCHESCAN_API_KEY=your_avalanchescan_api_key_here
ARBITRUMSCAN_API_KEY=your_arbitrumscan_api_key_here
OPTIMISMSCAN_API_KEY=your_optimismscan_api_key_here
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key_here
ALCHEMY_NFT_API_KEY=your_alchemy_nft_api_key_here
DEFI_PULSE_API_KEY=your_defi_pulse_api_key_here

# Optional - Custom ENS RPC (if not using Infura)
ENS_RPC_URL=https://mainnet.infura.io/v3/your_infura_project_id_here
```

## Security Notes

1. **Never commit your `.env` file** to version control
2. **Keep your API keys secure** and don't share them publicly
3. **Monitor your API usage** to avoid hitting rate limits
4. **Use environment variables** instead of hardcoding keys in your code
5. **Consider using paid tiers** for production applications

## Testing Your Setup

After setting up your API keys, run the following command to validate your configuration:

```bash
yarn build
```

The build process will validate your configuration and warn you about any missing required keys.

## Troubleshooting

- **"Missing required configuration" error**: Make sure you have set `INFURA_PROJECT_ID` in your `.env` file
- **API rate limit errors**: Consider upgrading to paid tiers or implementing rate limiting
- **Network errors**: Check that your API keys are correct and have the necessary permissions
