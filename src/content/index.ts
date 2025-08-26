import { WalletManager } from '../core/wallet-manager';
import { NetworkManager } from '../core/network-manager';
import { TransactionManager } from '../core/transaction-manager';
import { DeFiManager } from '../core/defi-manager';
import { SecurityManager } from '../core/security-manager';

// Initialize managers
const walletManager = new WalletManager();
const networkManager = new NetworkManager();
const transactionManager = new TransactionManager();
const defiManager = new DeFiManager();

// Add debug logging at the very beginning
console.log('PayCio Wallet content script starting...');

// Add a global indicator that content script is running
(window as any).paycioWalletContentScript = {
  isRunning: true,
  timestamp: Date.now(),
  test: () => true
};

console.log('PayCio Wallet content script initialized successfully');

// Create a visible indicator in the page
const debugDiv = document.createElement('div');
debugDiv.id = 'paycio-wallet-debug';
debugDiv.style.cssText = `
  position: fixed;
  top: 10px;
  right: 10px;
  background: #333;
  color: #fff;
  padding: 10px;
  border-radius: 5px;
  font-family: monospace;
  font-size: 12px;
  z-index: 999999;
  display: none;
`;
debugDiv.innerHTML = 'PayCio Wallet: Content Script Loaded';
document.body.appendChild(debugDiv);

// Show debug info for 3 seconds
setTimeout(() => {
  debugDiv.style.display = 'block';
  setTimeout(() => {
    debugDiv.style.display = 'none';
  }, 3000);
}, 1000);

// Add global test function to main page
(window as any).testPayCioWalletInjection = () => {
  console.log('=== PayCio Wallet Injection Test ===');
  console.log('Content script running:', (window as any).paycioWalletContentScript?.isRunning);
  console.log('Ethereum provider:', window.ethereum);
  console.log('Is PayCio Wallet:', (window.ethereum as any)?.isPayCioWallet);
  console.log('PayCio Wallet provider:', (window as any).paycioWallet);
  console.log('=== End Test ===');
  
  if ((window.ethereum as any)?.isPayCioWallet) {
    console.log('✅ PayCio Wallet detected!');
    return true;
  } else {
    console.log('❌ PayCio Wallet not detected');
    return false;
  }
};

// Check if wallet is available
async function checkWalletAvailability() {
  try {
    const currentWallet = walletManager.getCurrentWallet();
    console.log('Current wallet state:', {
      hasWallet: !!currentWallet,
      address: currentWallet?.address,
      isUnlocked: currentWallet ? true : false
    });
    return currentWallet;
  } catch (error) {
    console.error('Error checking wallet availability:', error);
    return null;
  }
}

// Get wallet from Chrome storage directly
async function getWalletFromStorage() {
  return new Promise<any>((resolve) => {
    chrome.storage.local.get(['wallet'], (result) => {
      console.log('Wallet from storage:', result.wallet);
      resolve(result.wallet || null);
    });
  });
}

// Initialize wallet check
checkWalletAvailability();

// Create and inject the PayCio Wallet provider
function createPayCioProvider() {
  console.log('Creating PayCio Wallet provider...');
  
  const provider = {
    isPayCioWallet: true,
    isMetaMask: false,
    isConnected: () => true,
    selectedAddress: null,
    chainId: '0x1', // Ethereum mainnet
    networkVersion: '1',
    autoRefreshOnNetworkChange: false,
    
    // EIP-1193 methods
    request: async (args: { method: string; params?: any[] }) => {
      console.log('PayCio Wallet request:', args);
      
      try {
        const response = await sendMessageToExtension({
          type: 'WALLET_REQUEST',
          method: args.method,
          params: args.params || []
        });
        
        if (response.error) {
          throw new Error(response.error);
        }
        
        return response.result;
      } catch (error) {
        console.error('PayCio Wallet request failed:', error);
        throw error;
      }
    },
    
    // Legacy methods
    send: (payload: any, callback?: (error: any, response: any) => void) => {
      provider.request(payload)
        .then((result) => {
          if (callback) {
            callback(null, { id: payload.id, jsonrpc: '2.0', result });
          }
        })
        .catch((error) => {
          if (callback) {
            callback(error, { id: payload.id, jsonrpc: '2.0', error: { message: error.message } });
          }
        });
    },
    
    sendAsync: (payload: any, callback: (error: any, response: any) => void) => {
      provider.send(payload, callback);
    },
    
    enable: async () => {
      return provider.request({ method: 'eth_requestAccounts' });
    },
    
    // Event listeners
    on: (eventName: string, handler: (data: any) => void) => {
      console.log('PayCio Wallet event listener added:', eventName);
      // Store event listeners for later use
      if (!(provider as any)._listeners) {
        (provider as any)._listeners = new Map();
      }
      if (!(provider as any)._listeners.has(eventName)) {
        (provider as any)._listeners.set(eventName, new Set());
      }
      (provider as any)._listeners.get(eventName).add(handler);
    },
    
    removeListener: (eventName: string, handler: (data: any) => void) => {
      console.log('PayCio Wallet event listener removed:', eventName);
      const listeners = (provider as any)._listeners?.get(eventName);
      if (listeners) {
        listeners.delete(handler);
      }
    },
    
    // EIP-1193 standard methods
    requestPermissions: async (permissions: any) => {
      return provider.request({ method: 'wallet_requestPermissions', params: [permissions] });
    },
    
    getPermissions: async () => {
      return provider.request({ method: 'wallet_getPermissions', params: [] });
    },
    
    watchAsset: async (asset: any) => {
      return provider.request({ method: 'wallet_watchAsset', params: [asset] });
    },
    
    addEthereumChain: async (chain: any) => {
      return provider.request({ method: 'wallet_addEthereumChain', params: [chain] });
    },
    
    switchEthereumChain: async (chain: any) => {
      return provider.request({ method: 'wallet_switchEthereumChain', params: [chain] });
    }
  };
  
  return provider;
}

// Send message to extension
function sendMessageToExtension(message: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const messageId = Date.now() + Math.random();
    
    console.log('PayCio Wallet: Sending message to extension:', {
      id: messageId,
      message: message
    });
    
    // Store the callback
    if (!(window as any)._pendingRequests) {
      (window as any)._pendingRequests = new Map();
    }
    (window as any)._pendingRequests.set(messageId, { resolve, reject });
    
    // Send message to extension
    chrome.runtime.sendMessage({
      id: messageId,
      ...message
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Chrome runtime error:', chrome.runtime.lastError);
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      
      if (response && response.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if ((window as any)._pendingRequests.has(messageId)) {
        console.log('PayCio Wallet: Request timeout for message:', messageId);
        (window as any)._pendingRequests.delete(messageId);
        reject(new Error('Request timeout'));
      }
    }, 30000);
  });
}

// Inject the provider with improved timing and error handling
function injectProvider() {
  console.log('Injecting PayCio Wallet provider...');
  
  const provider = createPayCioProvider();
  
  // Function to actually inject the provider
  const doInjection = () => {
    try {
      // Inject into window.ethereum
      if (!window.ethereum) {
        Object.defineProperty(window, 'ethereum', {
          value: provider,
          writable: false,
          configurable: false
        });
        console.log('✅ PayCio Wallet injected as window.ethereum');
      } else {
        // If ethereum already exists, add our provider to the list
        if ((window.ethereum as any).providers) {
          (window.ethereum as any).providers.push(provider);
          console.log('✅ PayCio Wallet added to existing providers');
        } else {
          // Create providers array
          (window.ethereum as any).providers = [provider];
          console.log('✅ PayCio Wallet created providers array');
        }
      }

      // Also inject as window.paycioWallet for direct access
      Object.defineProperty(window, 'paycioWallet', {
        value: provider,
        writable: false,
        configurable: false
      });
      console.log('✅ PayCio Wallet injected as window.paycioWallet');

      // Announce provider for EIP-6963 compatibility
      announceProvider(provider);

      // Dispatch ethereum events for compatibility
      window.dispatchEvent(new CustomEvent('ethereum#initialized', {
        detail: { provider: provider }
      }));
      
      console.log('✅ PayCio Wallet provider injection complete');
      
      return provider;
    } catch (error) {
      console.error('❌ Error injecting PayCio Wallet provider:', error);
      return null;
    }
  };

  // Try to inject immediately
  let injectedProvider = doInjection();
  
  // If injection failed, try again after DOM is ready
  if (!injectedProvider && document.readyState !== 'complete') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('DOM loaded, retrying provider injection...');
      injectedProvider = doInjection();
    });
  }
  
  // Also try on window load as a fallback
  window.addEventListener('load', () => {
    if (!window.ethereum || !(window.ethereum as any).isPayCioWallet) {
      console.log('Window loaded, retrying provider injection...');
      injectedProvider = doInjection();
    }
  });
  
  return injectedProvider;
}

// Announce provider for EIP-6963
function announceProvider(provider: any) {
  console.log('Announcing PayCio Wallet provider for EIP-6963...');
  
  const providerInfo = {
    uuid: 'paycio-wallet-' + Date.now(),
    name: 'PayCio Wallet',
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzYzNjZGN0EiLz4KPHBhdGggZD0iTTE2IDhMMjQgMTZMMTYgMjRMOCAxNkwxNiA4WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
    rdns: 'com.paycio.wallet'
  };

  // Announce provider
  window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
    detail: {
      info: providerInfo,
      provider: provider
    }
  }));
  
  console.log('✅ EIP-6963 provider announced');

  // Listen for provider requests
  window.addEventListener('eip6963:requestProvider', () => {
    console.log('EIP-6963 provider request received, re-announcing...');
    window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
      detail: {
        info: providerInfo,
        provider: provider
      }
    }));
  });
}

// Inject the provider immediately
const paycioProvider = injectProvider();

// Test wallet injection with retries
let injectionTestAttempts = 0;
const maxInjectionTestAttempts = 10;

function testWalletInjection() {
  console.log('=== PayCio Wallet Injection Test (Attempt ' + (injectionTestAttempts + 1) + ') ===');
  console.log('window.ethereum:', window.ethereum);
  console.log('window.paycioWallet:', (window as any).paycioWallet);
  console.log('window.web3:', (window as any).web3);
  
  // Test if ethereum provider is available
  if (window.ethereum) {
    console.log('✅ Ethereum provider detected');
    if ((window.ethereum as any).isPayCioWallet) {
      console.log('✅ PayCio Wallet provider detected');
      return true;
    } else {
      console.log('❌ PayCio Wallet provider not detected');
    }
  } else {
    console.log('❌ No ethereum provider found');
  }
  
  console.log('=== End Test ===');
  return false;
}

// Test injection immediately
testWalletInjection();

// Retry injection test if needed
const injectionTestInterval = setInterval(() => {
  injectionTestAttempts++;
  
  if (testWalletInjection() || injectionTestAttempts >= maxInjectionTestAttempts) {
    clearInterval(injectionTestInterval);
    if (injectionTestAttempts >= maxInjectionTestAttempts) {
      console.warn('⚠️ PayCio Wallet injection test failed after maximum attempts');
    }
  }
}, 1000);

// Listen for messages from injected script
window.addEventListener('message', async (event) => {
  // Only accept messages from the same window
  if (event.source !== window) return;

  // Only accept messages from our injected script
  if (event.data.source !== 'paycio-wallet-injected') return;

  console.log('Content script received message:', event.data);

  try {
    let response;

    // Handle the new WALLET_REQUEST format
    if (event.data.type === 'WALLET_REQUEST') {
      response = await handleWalletRequest(event.data.method, event.data.params);
    } else {
      // Handle legacy message types
      switch (event.data.type) {
        case 'WALLET_CONNECT':
          response = await handleWalletConnect();
          break;
        case 'WALLET_GET_ACCOUNTS':
          response = await handleGetAccounts();
          break;
        case 'WALLET_GET_BALANCE':
          response = await handleGetBalance(event.data.params);
          break;
        case 'WALLET_SIGN_TRANSACTION':
          response = await handleSignTransaction();
          break;
        case 'WALLET_SEND_TRANSACTION':
          response = await handleSendTransaction(event.data.params);
          break;
        case 'WALLET_SWITCH_NETWORK':
          response = await handleSwitchNetwork(event.data.params);
          break;
        case 'WALLET_GET_NETWORKS':
          response = await handleGetNetworks();
          break;
        case 'WALLET_GET_NFTS':
          response = await handleGetNFTs(event.data.params);
          break;
        case 'WALLET_GET_PORTFOLIO':
          response = await handleGetPortfolio();
          break;
        case 'WALLET_GET_DEFI_POSITIONS':
          response = await handleGetDeFiPositions();
          break;
        default:
          response = { success: false, error: 'Unknown message type' };
      }
    }

    // Send response back to injected script
    window.postMessage({
      source: 'paycio-wallet-content',
      id: event.data.id,
      result: response.success ? response.data || response : undefined,
      error: response.success ? undefined : response.error
    }, '*');

  } catch (error) {
    console.error('Error handling wallet message:', error);
    
    // Send error response
    window.postMessage({
      source: 'paycio-wallet-content',
      id: event.data.id,
      result: undefined,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, '*');
  }
});

// Handle wallet connect
async function handleWalletConnect() {
  try {
    console.log('Attempting to connect wallet...');
    
    // Try to get wallet from manager first
    let currentWallet = walletManager.getCurrentWallet();
    
    // If not available, try to get from storage
    if (!currentWallet) {
      console.log('Wallet not found in manager, trying storage...');
      currentWallet = await getWalletFromStorage();
    }
    
    if (!currentWallet) {
      console.log('No wallet available for connection');
      return { success: false, error: 'No wallet available. Please create or import a wallet first.' };
    }

    console.log('Wallet connected:', currentWallet.address);
    return {
      success: true,
      address: currentWallet.address,
      network: currentWallet.currentNetwork || 'ethereum'
    };
  } catch (error) {
    console.error('Wallet connect error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to connect wallet' };
  }
}

// Handle get accounts
async function handleGetAccounts() {
  try {
    console.log('Getting accounts...');
    
    // Try to get wallet from manager first
    let currentWallet = walletManager.getCurrentWallet();
    
    // If not available, try to get from storage
    if (!currentWallet) {
      console.log('Wallet not found in manager, trying storage...');
      currentWallet = await getWalletFromStorage();
    }
    
    if (!currentWallet) {
      console.log('No wallet available for getting accounts');
      return { success: true, accounts: [] };
    }

    // Return all accounts from the current wallet
    const accounts = currentWallet.accounts ? currentWallet.accounts.map(account => account.address) : [currentWallet.address];
    console.log('Returning accounts:', accounts);
    return {
      success: true,
      accounts: accounts
    };
  } catch (error) {
    console.error('Get accounts error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get accounts' };
  }
}

// Handle get balance
async function handleGetBalance(params: any) {
  const { address, network } = params;
  if (!address || !network) {
    return { success: false, error: 'Missing address or network' };
  }

  try {
    const balance = await walletManager.getBalance(address, network);
    return { success: true, balance };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get balance' };
  }
}

// Handle send transaction
async function handleSendTransaction(params: any) {
  const { to, value, network } = params;
  if (!to || !value || !network) {
    return { success: false, error: 'Missing transaction parameters' };
  }

  try {
    const txHash = await transactionManager.sendTransaction(to, value, network);
    return { success: true, txHash };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send transaction' };
  }
}

// Handle switch network
async function handleSwitchNetwork(params: any) {
  const { networkId } = params;
  if (!networkId) {
    return { success: false, error: 'Missing network ID' };
  }

  try {
    await walletManager.switchNetwork(networkId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to switch network' };
  }
}

// Handle get networks
async function handleGetNetworks() {
  try {
    const networks = networkManager.getAllNetworks();
    return { success: true, networks };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get networks' };
  }
}

// Handle get NFTs
async function handleGetNFTs(params: any) {
  const { address, network } = params;
  if (!address || !network) {
    return { success: false, error: 'Missing address or network' };
  }

  try {
    // Import real NFT manager
    const { NFTManager } = await import('../core/nft-manager');
    const nftManager = new NFTManager();
    
    // Get real NFTs from blockchain
    const nfts = await nftManager.importNFTs(address, network);
    return { success: true, nfts };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get NFTs' };
  }
}

// Handle get portfolio
async function handleGetPortfolio() {
  try {
    // Import real portfolio manager
    const { PortfolioManager } = await import('../core/portfolio-manager');
    const portfolioManager = new PortfolioManager();
    
    // Get real portfolio data
    const portfolio = await portfolioManager.getPortfolio();
    return { success: true, portfolio };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get portfolio' };
  }
}

// Handle get DeFi positions
async function handleGetDeFiPositions() {
  try {
    const positions = defiManager.getAllPositions();
    return { success: true, positions };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get DeFi positions' };
  }
}

// Handle wallet request (new unified method)
async function handleWalletRequest(method: string, params: any[]): Promise<any> {
  console.log('Handling wallet request:', method, params);
  
  try {
    switch (method) {
      case 'eth_requestAccounts':
      case 'eth_accounts':
        const accountsResult = await handleGetAccounts();
        if (accountsResult.success) {
          return accountsResult.accounts;
        } else {
          throw new Error(accountsResult.error);
        }
        
      case 'eth_chainId':
        const currentWallet = walletManager.getCurrentWallet();
        if (!currentWallet) {
          return '0x1'; // Default to Ethereum mainnet
        }
        return '0x1'; // Ethereum mainnet chain ID
        
      case 'eth_getBalance':
        const [address, block] = params;
        const balanceResult = await handleGetBalance({ address, network: 'ethereum' });
        if (balanceResult.success) {
          return balanceResult.balance;
        } else {
          throw new Error(balanceResult.error);
        }
        
      case 'eth_sendTransaction':
        const [transaction] = params;
        const txResult = await handleSendTransaction({
          to: transaction.to,
          value: transaction.value,
          network: 'ethereum'
        });
        if (txResult.success) {
          return txResult.txHash;
        } else {
          throw new Error(txResult.error);
        }
        
      case 'wallet_switchEthereumChain':
        const [{ chainId }] = params;
        const switchResult = await handleSwitchNetwork({ networkId: chainId });
        if (switchResult.success) {
          return null;
        } else {
          throw new Error(switchResult.error);
        }
        
      default:
        console.log('Unhandled method:', method);
        throw new Error(`Method ${method} not supported`);
    }
  } catch (error) {
    console.error('Wallet request error:', error);
    throw error;
  }
}

// Handle get transaction count (real nonce)
async function handleGetTransactionCount(address: string) {
  try {
    const { getTransactionCount } = await import('../utils/web3-utils');
    const nonce = await getTransactionCount(address, 'ethereum');
    return { success: true, data: nonce };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get nonce' };
  }
}

// Handle estimate gas (real gas estimation)
async function handleEstimateGas(transaction: any) {
  try {
    const { estimateGas } = await import('../utils/web3-utils');
    const gasLimit = await estimateGas(
      transaction.from,
      transaction.to,
      transaction.value || '0x0',
      transaction.data || '0x',
      'ethereum'
    );
    return { success: true, data: gasLimit };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to estimate gas' };
  }
}

// Handle get gas price (real gas price)
async function handleGetGasPrice() {
  try {
    const { getGasPrice } = await import('../utils/web3-utils');
    const gasPrice = await getGasPrice('ethereum');
    return { success: true, data: gasPrice };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get gas price' };
  }
}

// Handle sign transaction (real signing)
async function handleSignTransaction(): Promise<any> {
  const currentAccount = walletManager.getCurrentAccount();
  if (!currentAccount) {
    return { success: false, error: 'No wallet available' };
  }

  try {
    // Import real signing utilities
    const { ethers } = await import('ethers');
    const { decryptData } = await import('../utils/crypto-utils');
    
    // Get the password from user
    const password = await promptForPassword();
    if (!password) {
      return { success: false, error: 'Password required for signing' };
    }

    // Decrypt private key
    const privateKey = await decryptData(currentAccount.privateKey, password);
    if (!privateKey) {
      return { success: false, error: 'Invalid password' };
    }

    // Create wallet instance
    const wallet = new ethers.Wallet(privateKey);
    
    // Get transaction data from the request (this would come from the dApp)
    // For now, we'll create a sample transaction
    const transaction = {
      to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      value: ethers.parseEther('0.001'),
      data: '0x',
      gasLimit: '0x5208',
      gasPrice: ethers.parseUnits('20', 'gwei'),
      nonce: 0
    };
    
    // Sign the transaction
    const signedTx = await wallet.signTransaction(transaction);
    
    return { 
      success: true, 
      signature: signedTx
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Signing failed' };
  }
}

// Helper function to prompt for password (real implementation)
async function promptForPassword(): Promise<string | null> {
  try {
    // In a real extension, this would show a popup for password input
    // For now, we'll use a simple prompt (in production, this should be a secure UI)
    const password = prompt('Enter your wallet password to sign this transaction:');
    return password;
  } catch (error) {
    console.error('Error prompting for password:', error);
    return null;
  }
} 