# 🔗 PayCio Wallet - DApp Integration Guide

## Quick Start for DApp Developers

### Basic Connection

```javascript
// Check if PayCio Wallet is installed
if (window.ethereum) {
  // Request account connection
  const accounts = await window.ethereum.request({ 
    method: 'eth_requestAccounts' 
  });
  console.log('Connected:', accounts[0]);
}
```

### Complete Integration Example

```javascript
class PayCioWalletIntegration {
  constructor() {
    this.account = null;
    this.chainId = null;
    this.setupListeners();
  }
  
  async connect() {
    try {
      // Request accounts (will show unlock popup if wallet is locked)
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      this.account = accounts[0];
      this.chainId = await window.ethereum.request({ 
        method: 'eth_chainId' 
      });
      
      console.log('Connected to:', this.account);
      return { account: this.account, chainId: this.chainId };
    } catch (error) {
      if (error.code === 4100) {
        // User needs to unlock wallet
        console.log('Please unlock your PayCio Wallet');
      }
      throw error;
    }
  }
  
  async signMessage(message) {
    const hexMessage = '0x' + Buffer.from(message).toString('hex');
    return await window.ethereum.request({
      method: 'personal_sign',
      params: [hexMessage, this.account]
    });
  }
  
  async sendTransaction(to, value) {
    return await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from: this.account,
        to: to,
        value: value, // in hex (wei)
        gas: '0x5208' // 21000
      }]
    });
  }
  
  setupListeners() {
    // Account changes
    window.ethereum.on('accountsChanged', (accounts) => {
      this.account = accounts[0] || null;
      console.log('Account changed:', this.account);
    });
    
    // Network changes
    window.ethereum.on('chainChanged', (chainId) => {
      this.chainId = chainId;
      console.log('Network changed:', chainId);
      window.location.reload(); // Recommended
    });
    
    // Connection status
    window.ethereum.on('connect', (info) => {
      console.log('Connected to network:', info);
    });
    
    window.ethereum.on('disconnect', (error) => {
      console.log('Disconnected:', error);
    });
  }
}

// Usage
const wallet = new PayCioWalletIntegration();
await wallet.connect();
```

---

## Supported Methods

### Account Management

#### `eth_requestAccounts`
Request user's accounts. Shows unlock popup if wallet is locked.
```javascript
const accounts = await window.ethereum.request({ 
  method: 'eth_requestAccounts' 
});
```

#### `eth_accounts`
Get connected accounts without prompting.
```javascript
const accounts = await window.ethereum.request({ 
  method: 'eth_accounts' 
});
```

### Network Information

#### `eth_chainId`
Get current chain ID.
```javascript
const chainId = await window.ethereum.request({ 
  method: 'eth_chainId' 
});
// Returns: '0x1' (Ethereum), '0x38' (BSC), etc.
```

#### `net_version`
Get network version.
```javascript
const version = await window.ethereum.request({ 
  method: 'net_version' 
});
// Returns: '1', '56', '137', etc.
```

### Signing Methods

#### `personal_sign`
Sign a message with user's private key.
```javascript
const signature = await window.ethereum.request({
  method: 'personal_sign',
  params: ['0x48656c6c6f', account] // message, address
});
```

#### `eth_signTypedData_v4`
Sign structured data (EIP-712).
```javascript
const signature = await window.ethereum.request({
  method: 'eth_signTypedData_v4',
  params: [account, JSON.stringify(typedData)]
});
```

### Transactions

#### `eth_sendTransaction`
Send a transaction.
```javascript
const txHash = await window.ethereum.request({
  method: 'eth_sendTransaction',
  params: [{
    from: account,
    to: '0x...',
    value: '0x29a2241af62c0000', // 0.03 ETH
    gas: '0x5208',
    data: '0x' // optional contract data
  }]
});
```

#### `eth_getBalance`
Get account balance.
```javascript
const balance = await window.ethereum.request({
  method: 'eth_getBalance',
  params: [account, 'latest']
});
```

### Network Management

#### `wallet_switchEthereumChain`
Switch to a different network.
```javascript
await window.ethereum.request({
  method: 'wallet_switchEthereumChain',
  params: [{ chainId: '0x89' }] // Polygon
});
```

#### `wallet_addEthereumChain`
Add a custom network.
```javascript
await window.ethereum.request({
  method: 'wallet_addEthereumChain',
  params: [{
    chainId: '0x89',
    chainName: 'Polygon Mainnet',
    rpcUrls: ['https://polygon-rpc.com'],
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    blockExplorerUrls: ['https://polygonscan.com']
  }]
});
```

---

## Events

### `accountsChanged`
Fired when user switches accounts.
```javascript
window.ethereum.on('accountsChanged', (accounts) => {
  if (accounts.length === 0) {
    console.log('User disconnected');
  } else {
    console.log('Switched to:', accounts[0]);
  }
});
```

### `chainChanged`
Fired when user switches networks.
```javascript
window.ethereum.on('chainChanged', (chainId) => {
  console.log('Network changed to:', chainId);
  // Best practice: reload the page
  window.location.reload();
});
```

### `connect`
Fired when provider connects.
```javascript
window.ethereum.on('connect', (connectInfo) => {
  console.log('Connected:', connectInfo.chainId);
});
```

### `disconnect`
Fired when provider disconnects.
```javascript
window.ethereum.on('disconnect', (error) => {
  console.log('Disconnected:', error);
});
```

---

## Error Handling

### Common Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 4001 | User rejected request | Show friendly message |
| 4100 | Unauthorized (wallet locked) | Prompt to unlock |
| 4200 | Unsupported method | Check method name |
| 4900 | Disconnected | Reconnect |
| -32700 | Parse error | Check request format |
| -32603 | Internal error | Report bug |

### Example Error Handling

```javascript
try {
  await window.ethereum.request({ 
    method: 'eth_requestAccounts' 
  });
} catch (error) {
  switch (error.code) {
    case 4001:
      console.log('User rejected connection');
      break;
    case 4100:
      console.log('Please unlock your wallet');
      break;
    default:
      console.error('Error:', error.message);
  }
}
```

---

## Best Practices

### 1. Check for Wallet Installation
```javascript
if (typeof window.ethereum === 'undefined') {
  alert('Please install PayCio Wallet');
  window.open('https://paycio-wallet.com/install', '_blank');
}
```

### 2. Handle Locked Wallet Gracefully
```javascript
async function connect() {
  try {
    return await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
  } catch (error) {
    if (error.code === 4100) {
      // Wallet is locked - popup will show automatically
      showMessage('Please unlock your PayCio Wallet to continue');
    }
    throw error;
  }
}
```

### 3. Always Handle Network Changes
```javascript
window.ethereum.on('chainChanged', () => {
  window.location.reload();
});
```

### 4. Show Transaction Status
```javascript
async function sendWithStatus(tx) {
  try {
    showLoading('Awaiting confirmation...');
    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [tx]
    });
    
    showLoading('Transaction sent!');
    showExplorerLink(txHash);
    
    return txHash;
  } catch (error) {
    if (error.code === 4001) {
      showMessage('Transaction cancelled');
    } else {
      showError(error.message);
    }
  }
}
```

### 5. Verify Signatures
```javascript
import { ethers } from 'ethers';

function verifySignature(message, signature, expectedAddress) {
  const recoveredAddress = ethers.verifyMessage(message, signature);
  return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
}
```

---

## Testing Your Integration

### 1. Use Test File
Download and open [`test-dapp.html`](./test-dapp.html) to test all features.

### 2. Test Scenarios

**Scenario 1: First Connection (Wallet Locked)**
- Call `eth_requestAccounts`
- ✅ Unlock popup should appear
- ✅ After unlock, connection completes
- ✅ Account address returned

**Scenario 2: Already Connected**
- Call `eth_accounts`
- ✅ Returns accounts immediately
- ✅ No popup shown

**Scenario 3: Sign Message**
- Call `personal_sign`
- ✅ Signing popup appears
- ✅ Real signature returned (not mock)
- ✅ Signature verifies correctly

**Scenario 4: Send Transaction**
- Call `eth_sendTransaction`
- ✅ Confirmation popup shows details
- ✅ Real transaction hash returned
- ✅ Transaction appears on blockchain

### 3. Debug Tools

```javascript
// Check if wallet is installed
console.log('PayCio installed:', !!window.ethereum);

// Check current state
console.log('Connected:', window.ethereum.selectedAddress);
console.log('Chain ID:', window.ethereum.chainId);

// Test connection
window.ethereum.request({ method: 'eth_accounts' })
  .then(console.log)
  .catch(console.error);
```

---

## Supported Networks

| Network | Chain ID | RPC |
|---------|----------|-----|
| Ethereum | 0x1 | ✅ |
| BSC | 0x38 | ✅ |
| Polygon | 0x89 | ✅ |
| Arbitrum | 0xa4b1 | ✅ |
| Optimism | 0xa | ✅ |
| Avalanche | 0xa86a | ✅ |
| Base | 0x2105 | ✅ |

---

## TypeScript Support

```typescript
interface PayCioProvider {
  request(args: { method: string; params?: any[] }): Promise<any>;
  on(event: string, callback: (...args: any[]) => void): void;
  removeListener(event: string, callback: (...args: any[]) => void): void;
  selectedAddress: string | null;
  chainId: string | null;
  isConnected(): boolean;
}

declare global {
  interface Window {
    ethereum?: PayCioProvider;
  }
}
```

---

## Migration from MetaMask

PayCio Wallet is fully compatible with MetaMask's API. Simply replace:

```javascript
// Works with both MetaMask and PayCio
const provider = window.ethereum;
```

No code changes needed! Your existing MetaMask integration will work with PayCio Wallet.

---

## Security Considerations

1. **Never request seed phrase or private keys**
2. **Always verify transaction details with user**
3. **Use HTTPS for your dApp**
4. **Validate all user inputs**
5. **Show clear permission requests**
6. **Implement CSP headers**
7. **Rate limit requests**

---

## Support

- **Documentation**: [DAPP_CONNECTION_TESTING_GUIDE.md](./DAPP_CONNECTION_TESTING_GUIDE.md)
- **Test File**: [test-dapp.html](./test-dapp.html)
- **Issues**: GitHub Issues
- **Email**: support@paycio-wallet.com

---

## Example Projects

### Simple Connection
```javascript
async function connectWallet() {
  if (!window.ethereum) {
    alert('Please install PayCio Wallet');
    return;
  }
  
  const accounts = await window.ethereum.request({ 
    method: 'eth_requestAccounts' 
  });
  
  document.getElementById('address').textContent = accounts[0];
}
```

### React Hook
```javascript
import { useState, useEffect } from 'react';

export function usePayCioWallet() {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        setAccount(accounts[0] || null);
      });
      
      window.ethereum.on('chainChanged', (chainId) => {
        setChainId(chainId);
      });
    }
  }, []);
  
  const connect = async () => {
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
    setAccount(accounts[0]);
    
    const chainId = await window.ethereum.request({ 
      method: 'eth_chainId' 
    });
    setChainId(chainId);
  };
  
  return { account, chainId, connect };
}
```

---

**Version**: 2.0.0  
**Last Updated**: 2025-10-06  
**Status**: Production Ready ✅
