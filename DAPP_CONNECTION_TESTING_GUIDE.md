# DApp Connection Testing Guide

## Overview
This guide covers testing the wallet connection flow to dApps, including unlock popups, connection approval, and transaction handling.

---

## Connection Flow Architecture

### 1. **Content Script Injection** (`main-content-script/index.ts`)
- Injects `window.ethereum` and `window.paycio` providers into web pages
- Handles communication between dApp and extension
- Provides toast notifications and modal systems

### 2. **Background Service Worker** (`background/index.ts`)
- Processes wallet requests from dApps
- Manages wallet state (locked/unlocked)
- Opens popups for user approval
- Rate limits requests for security

### 3. **Popup UI** (`popup/App.tsx`, `DAppUnlockPopup.tsx`)
- Handles wallet unlock requests
- Shows connection approval UI
- Displays transaction confirmation

---

## Current Implementation Status

### ✅ **Working Features**

1. **Unlock Popup Trigger**
   - ✅ Detects when wallet is locked
   - ✅ Opens popup window when connection requested
   - ✅ Multiple trigger points in background script:
     - Lines 1668-1677: PaycioDAppHandler.requestAccounts()
     - Lines 2945-2954: WALLET_REQUEST handler
     - Lines 3031-3050: DAPP_REQUEST handler

2. **Unlock Detection**
   - ✅ Checks `walletState.isWalletUnlocked` status
   - ✅ Provides clear error messages
   - ✅ Returns specific error codes (4100) for locked state

3. **DApp Unlock Component**
   - ✅ Located at `src/components/DAppUnlockPopup.tsx`
   - ✅ Shows origin of requesting dApp
   - ✅ Displays request type (connect/signing/transaction)
   - ✅ Auto-closes when wallet unlocked
   - ✅ Security warnings

4. **Connection Approval**
   - ✅ `approval-popup.tsx` handles connection requests
   - ✅ Shows permissions being requested
   - ✅ Displays origin verification
   - ✅ Security warnings for users

5. **Rate Limiting**
   - ✅ Progressive delays on failed attempts
   - ✅ Lockout after 5 failed attempts (15 minutes)
   - ✅ Suspicious activity detection
   - ✅ Lines 3288-3387: Enhanced rate limiting

6. **Connected Sites Storage**
   - ✅ Stores connected sites in chrome.storage
   - ✅ Function at lines 3244-3261
   - ✅ Tracks permissions and connection time

---

## ⚠️ **Potential Issues to Verify**

### 1. **Popup URL Parameter Handling**
- **Issue**: Multiple URLs for unlock popup
  - `popup.html?unlock=true`
  - `popup.html?unlock=true&origin={origin}`
  - `popup.html?approval=true&request={json}`

- **Current Implementation**: 
  - popup/App.tsx checks for `pendingDAppRequest` in storage (lines 90-119)
  - Does NOT parse URL parameters directly
  
- **Recommendation**: Add URL parameter parsing in popup/App.tsx

### 2. **Pending Request Management**
- **Issue**: When wallet locked, pending requests stored but may not auto-execute after unlock
- **Location**: Lines 3042-3048 (DAPP_REQUEST handler)
- **Recommendation**: Verify pending requests are executed after unlock

### 3. **Connection Approval Flow**
- **Issue**: `requestUserApproval` function (line 1878) creates popup but callback mechanism unclear
- **Needs**: Verify APPROVAL_RESPONSE message listener exists and works

### 4. **Transaction Confirmation**
- **Issue**: `handleTransactionRequest` (line 3264) returns mock transaction hash
- **Status**: Placeholder implementation - needs real transaction flow

---

## Testing Steps

### **Test 1: Wallet Locked - Connection Request**

1. **Setup**:
   - Create/import a wallet
   - Lock the wallet (or wait for auto-lock)
   
2. **Test**:
   ```javascript
   // In browser console on any website
   await window.ethereum.request({ method: 'eth_requestAccounts' })
   ```

3. **Expected Behavior**:
   - ✅ Popup window opens automatically
   - ✅ Shows unlock screen
   - ✅ Displays requesting origin
   - ✅ Shows security warning
   - ✅ After unlock, connection approved/rejected
   - ✅ Returns accounts array or error

4. **Verify**:
   - Check browser console for: `Wallet is locked, triggering unlock popup`
   - Popup dimensions: 400x600
   - URL: `chrome-extension://{id}/popup.html?unlock=true&origin={origin}`

---

### **Test 2: Wallet Unlocked - First Connection**

1. **Setup**:
   - Wallet is already unlocked
   - Visit a test dApp

2. **Test**:
   ```javascript
   await window.ethereum.request({ method: 'eth_requestAccounts' })
   ```

3. **Expected Behavior**:
   - ✅ Shows connection approval popup
   - ✅ Lists permissions being requested
   - ✅ Shows dApp origin
   - ✅ User can approve/reject
   - ✅ On approve: returns accounts
   - ✅ On reject: throws error

4. **Verify**:
   - Connection stored in `chrome.storage.local.connectedSites`
   - Subsequent requests don't show popup

---

### **Test 3: Already Connected DApp**

1. **Setup**:
   - DApp already connected from Test 2

2. **Test**:
   ```javascript
   await window.ethereum.request({ method: 'eth_requestAccounts' })
   ```

3. **Expected Behavior**:
   - ✅ Returns accounts immediately
   - ❌ No popup shown
   - ✅ Fast response

---

### **Test 4: Send Transaction**

1. **Setup**:
   - Connected to dApp
   - Wallet unlocked

2. **Test**:
   ```javascript
   await window.ethereum.request({
     method: 'eth_sendTransaction',
     params: [{
       from: accounts[0],
       to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
       value: '0x29a2241af62c0000', // 0.03 ETH
       gas: '0x5208' // 21000
     }]
   })
   ```

3. **Expected Behavior**:
   - ✅ Shows transaction confirmation popup
   - ✅ Displays transaction details
   - ✅ Shows estimated gas
   - ✅ Shows total cost
   - ✅ User can approve/reject
   - ⚠️ **Currently returns mock hash** (line 3269)

---

### **Test 5: Sign Message**

1. **Test**:
   ```javascript
   await window.ethereum.request({
     method: 'personal_sign',
     params: ['0x48656c6c6f20576f726c64', accounts[0]]
   })
   ```

2. **Expected Behavior**:
   - ✅ Shows message signing popup
   - ✅ Displays message content
   - ✅ Shows origin
   - ✅ User can approve/reject
   - ⚠️ **Currently returns mock signature** (line 3279)

---

### **Test 6: Rate Limiting**

1. **Test**:
   - Try to unlock with wrong password 5+ times

2. **Expected Behavior**:
   - ✅ Progressive delays: 2s, 4s, 8s, 16s, 32s
   - ✅ After 5 attempts: 15-minute lockout
   - ✅ Console warning: "🚨 SUSPICIOUS ACTIVITY DETECTED"
   - ✅ Extended lockout for suspicious activity

---

## Testing Websites

### **1. Simple Test Page (Recommended)**
Create `test-dapp.html`:
```html
<!DOCTYPE html>
<html>
<head>
  <title>PayCio Test DApp</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 600px;
      margin: 50px auto;
      padding: 20px;
    }
    button {
      background: #4F46E5;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
      margin: 5px;
    }
    button:hover { background: #4338CA; }
    #status {
      padding: 15px;
      margin: 20px 0;
      border-radius: 8px;
      background: #f0f0f0;
    }
    .success { background: #d4edda; color: #155724; }
    .error { background: #f8d7da; color: #721c24; }
  </style>
</head>
<body>
  <h1>🧪 PayCio Wallet Test DApp</h1>
  <div id="status">Not connected</div>
  
  <button onclick="testConnect()">1. Connect Wallet</button>
  <button onclick="testGetAccounts()">2. Get Accounts</button>
  <button onclick="testChainId()">3. Get Chain ID</button>
  <button onclick="testSendTx()">4. Send Transaction</button>
  <button onclick="testSignMessage()">5. Sign Message</button>
  <button onclick="testSignTypedData()">6. Sign Typed Data</button>
  
  <div id="results" style="margin-top: 20px;"></div>

  <script>
    const status = document.getElementById('status');
    const results = document.getElementById('results');
    
    function log(msg, type = 'info') {
      console.log(msg);
      const div = document.createElement('div');
      div.textContent = typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg;
      div.style.padding = '10px';
      div.style.margin = '5px 0';
      div.style.borderRadius = '4px';
      div.style.background = type === 'error' ? '#fee' : type === 'success' ? '#efe' : '#eef';
      results.insertBefore(div, results.firstChild);
    }
    
    async function testConnect() {
      try {
        status.textContent = 'Connecting...';
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        status.className = 'success';
        status.textContent = `Connected: ${accounts[0]}`;
        log(`✅ Connected! Accounts: ${accounts}`, 'success');
      } catch (error) {
        status.className = 'error';
        status.textContent = `Error: ${error.message}`;
        log(`❌ Error: ${error.message}`, 'error');
      }
    }
    
    async function testGetAccounts() {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        log(`Accounts: ${accounts}`, 'success');
      } catch (error) {
        log(`Error: ${error.message}`, 'error');
      }
    }
    
    async function testChainId() {
      try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        log(`Chain ID: ${chainId} (${parseInt(chainId, 16)})`, 'success');
      } catch (error) {
        log(`Error: ${error.message}`, 'error');
      }
    }
    
    async function testSendTx() {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (!accounts.length) {
          log('Please connect first', 'error');
          return;
        }
        
        const txHash = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [{
            from: accounts[0],
            to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
            value: '0x29a2241af62c0000', // 0.03 ETH
            gas: '0x5208'
          }]
        });
        
        log(`✅ Transaction sent! Hash: ${txHash}`, 'success');
      } catch (error) {
        log(`❌ Transaction failed: ${error.message}`, 'error');
      }
    }
    
    async function testSignMessage() {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (!accounts.length) {
          log('Please connect first', 'error');
          return;
        }
        
        const message = 'Hello from PayCio Test DApp!';
        const hexMessage = '0x' + Array.from(message).map(c => 
          c.charCodeAt(0).toString(16).padStart(2, '0')
        ).join('');
        
        const signature = await window.ethereum.request({
          method: 'personal_sign',
          params: [hexMessage, accounts[0]]
        });
        
        log(`✅ Message signed! Signature: ${signature}`, 'success');
      } catch (error) {
        log(`❌ Signing failed: ${error.message}`, 'error');
      }
    }
    
    async function testSignTypedData() {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (!accounts.length) {
          log('Please connect first', 'error');
          return;
        }
        
        const typedData = {
          domain: {
            name: 'PayCio Test',
            version: '1',
            chainId: 1,
          },
          types: {
            Person: [
              { name: 'name', type: 'string' },
              { name: 'wallet', type: 'address' }
            ]
          },
          message: {
            name: 'Test User',
            wallet: accounts[0]
          }
        };
        
        const signature = await window.ethereum.request({
          method: 'eth_signTypedData_v4',
          params: [accounts[0], JSON.stringify(typedData)]
        });
        
        log(`✅ Typed data signed! Signature: ${signature}`, 'success');
      } catch (error) {
        log(`❌ Signing failed: ${error.message}`, 'error');
      }
    }
    
    // Listen for events
    window.ethereum.on('accountsChanged', (accounts) => {
      log(`🔄 Accounts changed: ${accounts}`);
    });
    
    window.ethereum.on('chainChanged', (chainId) => {
      log(`🔄 Chain changed: ${chainId}`);
    });
    
    window.ethereum.on('connect', (info) => {
      log(`🔗 Connected: ${JSON.stringify(info)}`);
    });
    
    window.ethereum.on('disconnect', (error) => {
      log(`❌ Disconnected: ${error}`, 'error');
    });
  </script>
</body>
</html>
```

### **2. Public Test DApps**

#### **Ethereum Testnets**
- **Sepolia Testnet Faucet**: https://sepoliafaucet.com/
- **Remix IDE**: https://remix.ethereum.org/ (connect wallet feature)
- **Uniswap Testnet**: https://app.uniswap.org/

#### **DApp Testing Platforms**
- **WalletConnect Test DApp**: https://react-app.walletconnect.com/
- **MetaMask Test DApp**: https://metamask.github.io/test-dapp/
- **Web3Modal Demo**: https://web3modal-laboratory.vercel.app/

#### **NFT Platforms** (Test connection)
- **OpenSea Testnet**: https://testnets.opensea.io/
- **Rarible Testnet**: https://rinkeby.rarible.com/

#### **DeFi Protocols** (Testnet)
- **Aave**: https://app.aave.com/
- **Compound**: https://app.compound.finance/

---

## Debugging

### **Enable Console Logging**

In background script:
```javascript
console.log('🔍 Background script received message:', message.type);
console.log('Wallet status:', walletStatus);
console.log('✅ Unlock popup opened');
```

In content script:
```javascript
console.log('Paycio provider request:', method, params);
console.log('Paycio main content script loaded');
```

### **Check Storage**

```javascript
// In browser console (extension context)
chrome.storage.local.get(null, (data) => console.log(data));

// Check connected sites
chrome.storage.local.get(['connectedSites'], (data) => console.log(data));

// Check wallet state
chrome.storage.local.get(['walletState'], (data) => console.log(data));

// Check pending requests
chrome.storage.local.get(['pendingDAppRequest'], (data) => console.log(data));
```

### **Network Tab**
- Monitor RPC calls in Network tab
- Check for CORS errors
- Verify WebSocket connections

---

## Known Issues & Recommendations

### **Critical**
1. ⚠️ **Transaction signing returns mock data** (line 3269, 3279)
   - Implement real transaction signing with user's private key
   - Add proper transaction estimation
   - Implement nonce management

2. ⚠️ **URL parameter handling in popup**
   - Add URLSearchParams parsing in popup/App.tsx
   - Handle `?unlock=true`, `?approval=true`, `?origin=...`

### **Medium Priority**
3. 📝 **Pending request execution after unlock**
   - Store pending request in chrome.storage
   - Auto-execute after successful unlock
   - Clear expired pending requests

4. 📝 **Connection approval callback**
   - Verify APPROVAL_RESPONSE listener works
   - Test popup-to-background communication
   - Handle popup close without response

### **Low Priority**
5. 💡 **Enhanced logging**
   - Add request ID tracking
   - Implement debug mode toggle
   - Add performance metrics

6. 💡 **User experience**
   - Show "Connecting..." state in dApp
   - Add connection status indicator
   - Implement auto-reconnect on page reload

---

## Security Checklist

- ✅ **Rate limiting** on unlock attempts
- ✅ **Origin verification** for all requests
- ✅ **User confirmation** required for transactions
- ✅ **Session management** with auto-lock
- ✅ **CORS protection** via manifest
- ⚠️ **Private key never exposed** to dApps (verify)
- ⚠️ **Signature validation** before sending
- ⚠️ **Transaction parameter validation**

---

## Next Steps

1. **Fix Critical Issues**
   - Implement real transaction signing
   - Add URL parameter parsing

2. **Test All Flows**
   - Run through all test cases above
   - Test on multiple browsers
   - Test with real dApps

3. **Add Missing Features**
   - Network switching
   - Token approval
   - Chain management
   - Permission management

4. **Security Audit**
   - Review private key handling
   - Test rate limiting effectiveness
   - Verify signature validation
   - Check for XSS vulnerabilities

---

## Support

For issues or questions:
- Check browser console for error messages
- Review background script logs
- Check chrome.storage data
- Test with simple HTML test page first

Last Updated: 2025-10-06
Version: 2.0.0
