// background.js - Service Worker for PayCio Wallet
console.log('PayCio Background Script Starting...');

// Handle extension installation and updates
chrome.runtime.onInstalled.addListener((details) => {
  console.log('PayCio Extension installed/updated:', details.reason);
  
  if (details.reason === 'install') {
    // First installation - could open welcome page
    console.log('First time installation');
  } else if (details.reason === 'update') {
    console.log('Extension updated from', details.previousVersion);
  }
});

// Message handler for content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request.type, request);
  
  // Handle wallet requests from content scripts
  if (request.type === 'WALLET_REQUEST') {
    handleWalletRequest(request, sender, sendResponse);
    return true; // Keep message channel open for async response
  }
  
  // Handle other request types
  switch (request.type) {
    case 'GET_WALLET_STATUS':
      handleGetWalletStatus(sendResponse);
      return true;
      
    case 'UNLOCK_WALLET':
      handleUnlockWallet(request, sendResponse);
      return true;
      
    case 'LOCK_WALLET':
      handleLockWallet(sendResponse);
      return true;
      
    case 'CREATE_WALLET':
      handleCreateWallet(request, sendResponse);
      return true;
      
    case 'IMPORT_WALLET':
      handleImportWallet(request, sendResponse);
      return true;
      
    default:
      console.log('Unknown message type:', request.type);
      sendResponse({
        success: false,
        error: 'Unknown request type'
      });
  }
});

// Handle wallet requests from DApps
async function handleWalletRequest(request, sender, sendResponse) {
  const { method, params = [], origin } = request;
  
  console.log(`Handling wallet request: ${method} from ${origin || 'unknown'}`);
  
  try {
    // Check if wallet exists and is unlocked
    const walletStatus = await getWalletStatus();
    
    if (!walletStatus.exists) {
      sendResponse({
        success: false,
        error: 'No wallet found. Please create a wallet first.'
      });
      return;
    }
    
    // Handle methods that don't require unlock
    const publicMethods = ['eth_chainId', 'net_version', 'web3_clientVersion'];
    if (!publicMethods.includes(method) && !walletStatus.unlocked) {
      sendResponse({
        success: false,
        error: 'Wallet is locked. Please unlock your wallet.'
      });
      return;
    }
    
    let result;
    
    switch (method) {
      case 'eth_requestAccounts':
      case 'eth_accounts':
        result = await handleGetAccounts(origin);
        break;
        
      case 'eth_chainId':
        result = await handleGetChainId();
        break;
        
      case 'net_version':
        result = await handleGetNetworkVersion();
        break;
        
      case 'web3_clientVersion':
        result = 'PayCio/1.0.0';
        break;
        
      case 'eth_getBalance':
        result = await handleGetBalance(params[0], params[1]);
        break;
        
      case 'eth_sendTransaction':
        result = await handleSendTransaction(params[0], origin);
        break;
        
      case 'eth_signTransaction':
        result = await handleSignTransaction(params[0]);
        break;
        
      case 'personal_sign':
        result = await handlePersonalSign(params[0], params[1]);
        break;
        
      case 'eth_sign':
        result = await handleEthSign(params[0], params[1]);
        break;
        
      case 'eth_signTypedData':
      case 'eth_signTypedData_v1':
      case 'eth_signTypedData_v3':
      case 'eth_signTypedData_v4':
        result = await handleSignTypedData(method, params[0], params[1]);
        break;
        
      case 'wallet_switchEthereumChain':
        result = await handleSwitchChain(params[0]);
        break;
        
      case 'wallet_addEthereumChain':
        result = await handleAddChain(params[0]);
        break;
        
      case 'wallet_watchAsset':
        result = await handleWatchAsset(params[0]);
        break;
        
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
    
    sendResponse({
      success: true,
      result: result
    });
    
  } catch (error) {
    console.error('Wallet request error:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Wallet status management
async function getWalletStatus() {
  try {
    const data = await chrome.storage.local.get(['wallet', 'isUnlocked']);
    return {
      exists: !!data.wallet,
      unlocked: !!data.isUnlocked
    };
  } catch (error) {
    console.error('Error getting wallet status:', error);
    return { exists: false, unlocked: false };
  }
}

async function handleGetWalletStatus(sendResponse) {
  const status = await getWalletStatus();
  sendResponse({
    success: true,
    result: status
  });
}

// Account management
async function handleGetAccounts(origin) {
  try {
    // Check if this origin has been approved
    const { connections = {} } = await chrome.storage.local.get('connections');
    
    if (!connections[origin]) {
      // Request user approval
      const approved = await requestUserApproval(origin);
      if (!approved) {
        throw new Error('User rejected the request');
      }
      
      // Save connection
      connections[origin] = {
        approved: true,
        timestamp: Date.now()
      };
      await chrome.storage.local.set({ connections });
    }
    
    // Get wallet accounts
    const { wallet } = await chrome.storage.local.get('wallet');
    if (!wallet || !wallet.accounts) {
      return [];
    }
    
    // Return primary account address
    const primaryAccount = wallet.accounts[0];
    return [primaryAccount.address];
    
  } catch (error) {
    console.error('Error getting accounts:', error);
    throw error;
  }
}

async function requestUserApproval(origin) {
  // Create a popup window for user approval
  try {
    const popup = await chrome.windows.create({
      url: `popup.html?action=connect&origin=${encodeURIComponent(origin)}`,
      type: 'popup',
      width: 400,
      height: 600,
      focused: true
    });
    
    // Wait for user decision
    return new Promise((resolve) => {
      const listener = (windowId) => {
        if (windowId === popup.id) {
          chrome.windows.onRemoved.removeListener(listener);
          // Check if connection was approved
          chrome.storage.local.get('lastConnectionResult').then(({ lastConnectionResult }) => {
            resolve(lastConnectionResult === 'approved');
          });
        }
      };
      chrome.windows.onRemoved.addListener(listener);
    });
  } catch (error) {
    console.error('Error requesting approval:', error);
    return false;
  }
}

// Chain management
async function handleGetChainId() {
  const { currentChainId = '0x1' } = await chrome.storage.local.get('currentChainId');
  return currentChainId;
}

async function handleGetNetworkVersion() {
  const { currentChainId = '0x1' } = await chrome.storage.local.get('currentChainId');
  return parseInt(currentChainId, 16).toString();
}

async function handleSwitchChain({ chainId }) {
  // Validate chainId
  if (!chainId || typeof chainId !== 'string') {
    throw new Error('Invalid chainId');
  }
  
  // For now, support only mainnet
  const supportedChains = ['0x1']; // Ethereum mainnet
  
  if (!supportedChains.includes(chainId)) {
    throw new Error(`Chain ${chainId} not supported`);
  }
  
  // Store the new chain
  await chrome.storage.local.set({ currentChainId: chainId });
  
  // Notify all content scripts
  notifyChainChanged(chainId);
  
  return null;
}

async function handleAddChain(chainConfig) {
  // For now, just return success for standard chains
  console.log('Add chain requested:', chainConfig);
  return null;
}

// Transaction handling
async function handleGetBalance(address, blockTag = 'latest') {
  // This would typically call an RPC endpoint
  // For now, return a mock balance
  console.log('Get balance for:', address, blockTag);
  return '0x0'; // 0 ETH
}

async function handleSendTransaction(txParams, origin) {
  // Create transaction approval popup
  try {
    const popup = await chrome.windows.create({
      url: `popup.html?action=transaction&origin=${encodeURIComponent(origin)}&tx=${encodeURIComponent(JSON.stringify(txParams))}`,
      type: 'popup',
      width: 400,
      height: 600,
      focused: true
    });
    
    // Wait for user decision
    return new Promise((resolve, reject) => {
      const listener = (windowId) => {
        if (windowId === popup.id) {
          chrome.windows.onRemoved.removeListener(listener);
          chrome.storage.local.get('lastTransactionResult').then(({ lastTransactionResult }) => {
            if (lastTransactionResult && lastTransactionResult.success) {
              resolve(lastTransactionResult.txHash);
            } else {
              reject(new Error(lastTransactionResult?.error || 'Transaction cancelled'));
            }
          });
        }
      };
      chrome.windows.onRemoved.addListener(listener);
    });
  } catch (error) {
    console.error('Error handling transaction:', error);
    throw error;
  }
}

async function handleSignTransaction(txParams) {
  console.log('Sign transaction:', txParams);
  // Similar to sendTransaction but only returns signed tx
  throw new Error('Sign transaction not implemented yet');
}

// Message signing
async function handlePersonalSign(message, address) {
  try {
    const popup = await chrome.windows.create({
      url: `popup.html?action=sign&message=${encodeURIComponent(message)}&address=${encodeURIComponent(address)}`,
      type: 'popup',
      width: 400,
      height: 600,
      focused: true
    });
    
    return new Promise((resolve, reject) => {
      const listener = (windowId) => {
        if (windowId === popup.id) {
          chrome.windows.onRemoved.removeListener(listener);
          chrome.storage.local.get('lastSignResult').then(({ lastSignResult }) => {
            if (lastSignResult && lastSignResult.success) {
              resolve(lastSignResult.signature);
            } else {
              reject(new Error(lastSignResult?.error || 'Signing cancelled'));
            }
          });
        }
      };
      chrome.windows.onRemoved.addListener(listener);
    });
  } catch (error) {
    console.error('Error handling personal sign:', error);
    throw error;
  }
}

async function handleEthSign(address, message) {
  // eth_sign is deprecated and dangerous
  console.warn('eth_sign is deprecated and dangerous');
  throw new Error('eth_sign is not supported for security reasons');
}

async function handleSignTypedData(method, address, typedData) {
  try {
    const popup = await chrome.windows.create({
      url: `popup.html?action=signTypedData&method=${method}&address=${encodeURIComponent(address)}&data=${encodeURIComponent(JSON.stringify(typedData))}`,
      type: 'popup',
      width: 400,
      height: 600,
      focused: true
    });
    
    return new Promise((resolve, reject) => {
      const listener = (windowId) => {
        if (windowId === popup.id) {
          chrome.windows.onRemoved.removeListener(listener);
          chrome.storage.local.get('lastSignResult').then(({ lastSignResult }) => {
            if (lastSignResult && lastSignResult.success) {
              resolve(lastSignResult.signature);
            } else {
              reject(new Error(lastSignResult?.error || 'Signing cancelled'));
            }
          });
        }
      };
      chrome.windows.onRemoved.addListener(listener);
    });
  } catch (error) {
    console.error('Error handling typed data sign:', error);
    throw error;
  }
}

// Asset management
async function handleWatchAsset(asset) {
  console.log('Watch asset requested:', asset);
  // For now, always return true
  return true;
}

// Wallet management
async function handleUnlockWallet(request, sendResponse) {
  const { password } = request;
  
  try {
    const { wallet } = await chrome.storage.local.get('wallet');
    
    if (!wallet) {
      throw new Error('No wallet found');
    }
    
    // Verify password (implement your password verification logic)
    const isValidPassword = await verifyPassword(password, wallet.passwordHash);
    
    if (!isValidPassword) {
      throw new Error('Invalid password');
    }
    
    // Set wallet as unlocked
    await chrome.storage.local.set({ isUnlocked: true });
    
    // Auto-lock after 30 minutes
    chrome.alarms.create('autoLock', { delayInMinutes: 30 });
    
    sendResponse({
      success: true,
      result: { unlocked: true }
    });
    
  } catch (error) {
    console.error('Unlock error:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

async function handleLockWallet(sendResponse) {
  await chrome.storage.local.set({ isUnlocked: false });
  chrome.alarms.clear('autoLock');
  
  sendResponse({
    success: true,
    result: { locked: true }
  });
}

async function handleCreateWallet(request, sendResponse) {
  // Implement wallet creation logic
  console.log('Create wallet requested');
  sendResponse({
    success: false,
    error: 'Wallet creation not implemented'
  });
}

async function handleImportWallet(request, sendResponse) {
  // Implement wallet import logic
  console.log('Import wallet requested');
  sendResponse({
    success: false,
    error: 'Wallet import not implemented'
  });
}

// Utility functions
async function verifyPassword(password, hash) {
  // Implement your password verification logic
  // This is a placeholder
  return password === 'test123'; // Replace with actual hash verification
}

function notifyChainChanged(chainId) {
  // Notify all tabs about chain change
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs.sendMessage(tab.id, {
        type: 'PAYCIO_CHAIN_CHANGED',
        chainId: chainId,
        networkVersion: parseInt(chainId, 16).toString()
      }).catch(() => {
        // Ignore errors for tabs that don't have content script
      });
    });
  });
}

function notifyAccountsChanged(accounts) {
  // Notify all tabs about account change
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs.sendMessage(tab.id, {
        type: 'PAYCIO_ACCOUNTS_CHANGED',
        accounts: accounts
      }).catch(() => {
        // Ignore errors for tabs that don't have content script
      });
    });
  });
}

// Auto-lock alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'autoLock') {
    chrome.storage.local.set({ isUnlocked: false });
    console.log('Wallet auto-locked');
  }
});

console.log('PayCio Background Script Ready');
