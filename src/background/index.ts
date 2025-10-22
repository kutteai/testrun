// src/background/index.ts - Enhanced DApp Background Handler with Complete Wallet Features
import { ethers } from 'ethers';
import { WalletAccount } from '../types/index';
import { NetworkConfig } from '../types/network-types'; // Import NetworkConfig
import SecureSessionManager from '../utils/secure-session-manager';
import { SecurityManager } from '../core/security-manager';
import { WalletManager as CoreWalletManager } from '../core/wallet-manager';
import { BlockchainService } from './utils/blockchain-service';
import { getBrowser } from '../utils/browser';
import { storage } from '../utils/storage-utils';
import { decryptData } from '../utils/crypto-utils';
import { DERIVATION_PATHS, generateNetworkAddress } from '../utils/network-address-utils';
import { PaycioDAppHandler } from './utils/dapp-handler';
import ApprovalPopupManager from '../utils/approval-popup-manager';
import {
  TransactionApprovalRequest,
  SignatureApprovalRequest,
  ApprovalResponse,
} from '../components/modals/ApprovalModal/ApprovalModal.types';
import { getNetworks } from '../utils/web3/network-utils'; // New import

const coreWalletManagerInstance = new CoreWalletManager();

// Service worker keepalive mechanism
let keepAliveInterval: NodeJS.Timeout | null = null;
let keepAlivePort: any = null;
let serviceWorkerPingInterval: NodeJS.Timeout | null = null;

const HEARTBEAT_INTERVAL = 20000;

const startKeepAlive = () => {
  if (keepAliveInterval) return;

  // Method 1: Regular ping
  keepAliveInterval = setInterval(() => {
    // Send a ping to keep the service worker alive
    if (typeof self !== 'undefined' && (self as any).registration) {
      (self as any).registration.active?.postMessage({ type: 'KEEPALIVE' });
    }
  }, 5000); // Ping every 5 seconds (very frequent)
  
  // Method 2: Create a persistent port connection
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    try {
      keepAlivePort = chrome.runtime.connect({ name: 'keepalive' });
      keepAlivePort.onDisconnect.addListener(() => {
        // Reconnect on disconnect
        setTimeout(() => startKeepAlive(), 1000);
      });
      keepAlivePort.postMessage({ type: 'KEEPALIVE_PING' });
    } catch (error: any) {
      // Failed to start keep alive
    }
  }
  
  // Method 3: Service worker ping via navigator
  serviceWorkerPingInterval = setInterval(() => {
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'PING',
          timestamp: Date.now()
        });
      }
    } catch (error: any) {
      // Service worker ping failed
    }
  }, 3000); // Ping every 3 seconds
};

const stopKeepAlive = () => {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
  if (keepAlivePort) {
    keepAlivePort.disconnect();
    keepAlivePort = null;
  }
  if (serviceWorkerPingInterval) {
    clearInterval(serviceWorkerPingInterval);
    serviceWorkerPingInterval = null;
  }
};

// Placeholder types for now
type SendTransactionParams = {
  from: string;
  to: string;
  value: string;
  gasPrice?: string;
  gasLimit?: string;
  nonce?: number;
  data?: string;
  chainId?: string;
  origin: string;
  gasEstimate: string;
  network: string;
};

type SignatureRequest = {
  message: string;
  from: string;
  method: string; // e.g., 'personal_sign', 'eth_sign'
  origin: string;
  network: string;
};

type SignTypedDataRequest = {
  domain: object;
  types: object;
  message: object;
  from: string;
  method: string; // e.g., 'eth_signTypedData_v4'
  origin: string;
  network: string;
};

type Token = {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  priceUsd?: number;
  logo?: string;
};

// ============================================================================
// CROSS-BROWSER COMPATIBILITY
// ============================================================================

const browserAPI = getBrowser();


async function showTransactionApproval(params: SendTransactionParams): Promise<boolean> {
  // This function initiates the transaction approval process by opening a UI popup
  // for the user to review and approve the transaction. The ApprovalPopupManager
  // handles the actual display and user interaction.
  console.log('Transaction approval requested:', params);

  const request: TransactionApprovalRequest = {
    origin: params.origin,
    to: params.to,
    value: params.value,
    gasEstimate: params.gasEstimate,
    data: params.data,
    network: params.network || 'ethereum', // Assuming network is available in params or default
  };

  try {
    const response = await ApprovalPopupManager.openApprovalPopup(request);
    return response.approved;
  } catch (error) {
    console.error('Transaction approval popup error:', error);
    return false;
  }
}

async function showSignatureApproval(params: SignatureRequest): Promise<boolean> {
  // This function initiates the message signature approval process by opening a UI popup
  // for the user to review and approve the message. The ApprovalPopupManager
  // handles the actual display and user interaction.
  console.log('Signature approval requested:', params);

  const request: SignatureApprovalRequest = {
    origin: params.origin,
    method: params.method,
    message: params.message,
    from: params.from,
    network: params.network || 'ethereum', // Assuming network is available in params or default
  };

  try {
    const response = await ApprovalPopupManager.openApprovalPopup(request);
    return response.approved;
  } catch (error) {
    console.error('Signature approval popup error:', error);
    return false;
  }
}

// Unified storage API (now imported from storage-utils)
// NOTE: The previous local `storage` declaration has been removed as it is now imported from `../utils/storage-utils`.

// Handle transaction requests
async function handleTransactionRequest(txParams: SendTransactionParams, origin: string, account: WalletAccount): Promise<any> {
  try {
    // Get current network and validate transaction
    const currentWallet = coreWalletManagerInstance.getCurrentWallet();
    if (!currentWallet) {
      throw new Error('No wallet found');
    }
    const networkId = currentWallet.currentNetwork?.id || 'ethereum'; // Use network.id
    
    // Validate transaction parameters
    if (!txParams.to || !ethers.isAddress(txParams.to)) {
      throw new Error('Invalid recipient address');
    }
    
    // Get gas estimate
    const gasEstimate = await BlockchainService.makeRpcRequestWithFallbacks(networkId, 'eth_estimateGas', [txParams]);
    
    // Show approval dialog with actual transaction details
    const approved = await showTransactionApproval({
      origin,
      to: txParams.to,
      value: txParams.value,
      gasEstimate,
      data: txParams.data,
      from: txParams.from,
      network: networkId,
    });
    
    if (!approved) {
      throw new Error('Transaction rejected by user');
    }
    
    // Send actual transaction
    const txHash = await BlockchainService.sendTransaction(txParams, networkId);
    
    return {
      success: true,
      data: txHash
    };
  } catch (error: any) {
    console.error('Error handling transaction request:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Handle signing requests
async function handleSigningRequest(method: string, params: any[], origin: string, account: WalletAccount): Promise<any> {
  try {
    const message = params[0];
    const fromAddress = params[1] || account.addresses[account.networks[0]]; // Use the first address of the account
    
    const currentWallet = coreWalletManagerInstance.getCurrentWallet();
    if (!currentWallet) {
      throw new Error('No wallet found for signing request');
    }
    const networkId = currentWallet.currentNetwork?.id || 'ethereum'; // Use network.id
    
    // Show approval dialog with actual message details
    const approved = await showSignatureApproval({
      origin,
      method,
      message,
      from: fromAddress,
      network: networkId,
    });
    
    if (!approved) {
      throw new Error('Message signing rejected by user');
    }
    
    // Sign the message
    const signature = await BlockchainService.signMessage(message, fromAddress, method); // Pass method as third argument
    
    return {
      success: true,
      data: signature,
    };
  } catch (error: any) {
    console.error('Error handling signing request:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================================================
// ENHANCED MESSAGE LISTENER
// ============================================================================

browserAPI.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
  // Aggressively wake up service worker on every message
  if (typeof self !== 'undefined') {
    // Service worker context
  } else {
    // Regular context
  }
  
  // Return true immediately to keep the message channel open for async responses
  const handleMessage = async () => {
    try {
      if (!message.type) {
        throw new Error('Message type is required');
      }

      // Handle DApp requests specially
      if (message.type === 'PAYCIO_DAPP_REQUEST') {
        const dappHandler = new PaycioDAppHandler();
        const response = await dappHandler['processRequest']({
          ...message,
          origin: sender.url ? new URL(sender.url).origin : 'unknown'
        });
        sendResponse(response);
        return;
      }

      // Handle special wake-up message
      if (message.type === 'WAKE_UP') {

        // Ensure service worker is active
        if (typeof self !== 'undefined') {

          // Start keepalive if not already started
          startKeepAlive();
          
          sendResponse({
            success: true,
            message: 'Extension is awake and ready'
          });
        } else {

          sendResponse({
            success: false,
            error: 'Service worker context not available'
          });
        }
        return;
      }

      // Map PAYCIO_ messages to their corresponding handlers
      let handlerType = message.type;
      if (message.type === 'PAYCIO_UNLOCK_WALLET') {
        handlerType = 'UNLOCK_WALLET';
      } else if (message.type === 'PAYCIO_GET_WALLET_ADDRESS') {
        handlerType = 'GET_WALLET_ADDRESS';
      } else if (message.type === 'PAYCIO_GET_WALLET_STATUS') {
        handlerType = 'GET_WALLET_STATUS';
      } else if (message.type === 'PAYCIO_SHOW_UNLOCK_POPUP') {
        handlerType = 'SHOW_UNLOCK_POPUP';
      }

      const handler = messageHandlers[handlerType];
      if (!handler) {
        throw new Error(`Unknown message type: ${message.type}`);
      }

      const response = await handler(message);
      sendResponse(response);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Background message handler error:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Execute async handler
  return handleMessage();
});

// ============================================================================
// Handle messages from injected scripts (content script communication)
window.addEventListener('message', async (event) => {
  // Only accept messages from the same origin
  if (event.source !== window) return;
  
  const { type, id } = event.data;
  
  if (!type || !id) return;
  
  try {

    let response;
    
    switch (type) {
      case 'PAYCIO_SWITCH_TO_TON':
        response = await messageHandlers['PAYCIO_SWITCH_TO_TON'](event.data);
        break;
      case 'PAYCIO_SWITCH_TO_ETHEREUM':
        response = await messageHandlers['PAYCIO_SWITCH_TO_ETHEREUM'](event.data);
        break;
      case 'PAYCIO_SWITCH_NETWORK':
        response = await messageHandlers['PAYCIO_SWITCH_NETWORK'](event.data);
        break;
      case 'PAYCIO_ADD_NETWORK':
        response = await messageHandlers['PAYCIO_ADD_NETWORK'](event.data);
        break;
      case 'PAYCIO_CHECK_WALLET_STATUS':
        response = await messageHandlers['GET_WALLET_STATUS'](event.data);
        break;
      case 'PAYCIO_GET_WALLET_ADDRESS':
        response = await messageHandlers['GET_WALLET_ADDRESS'](event.data);
        break;
      case 'PAYCIO_SHOW_UNLOCK_POPUP':
        response = await messageHandlers['SHOW_UNLOCK_POPUP'](event.data);
        break;
      case 'PAYCIO_UNLOCK_WALLET':
        response = await messageHandlers['UNLOCK_WALLET'](event.data);
        break;
      default:

        return;
    }
    
    // Send response back to injected script
    window.postMessage({
      type: `${type}_RESPONSE`,
      id: id,
      ...response
    }, '*');
    
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('Error handling injected script message:', error);
    window.postMessage({
      type: `${type}_RESPONSE`,
      id: id,
      success: false,
      error: error.message
    }, '*');
  }
});

// ============================================================================
// EXTENSION LIFECYCLE & AUTO-LOCK
// ============================================================================

// Auto-lock wallet after inactivity
setInterval(async () => {
  try {
    const result = await storage.get(['walletState', 'settings']);
    const walletState = result.walletState;
    const settings = result.settings;
    
    if (walletState?.isWalletUnlocked && walletState.lastUnlockTime) {
      const autoLockTimeout = (settings?.autoLockTimeout || 30) * 60 * 1000;
      const inactiveTime = Date.now() - walletState.lastUnlockTime;
      
      if (inactiveTime > autoLockTimeout) {
        await SecureSessionManager.clearSession(); // Changed to SecureSessionManager.clearSession()
      }
    }
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('Paycio: Auto-lock check failed:', error);
  }
}, 60000);

browserAPI.runtime.onInstalled.addListener((details) => {

});

browserAPI.runtime.onStartup.addListener(() => {

});

// ============================================================================
// SERVICE WORKER PERSISTENCE
// ============================================================================

// Initialize immediately if already active
if (typeof self !== 'undefined' && (self as any).registration && (self as any).registration.active) {
  // initializeServiceWorker(); // Replaced with startKeepAlive
  startKeepAlive();
}

// Initialize the DApp handler
const dappHandler = new PaycioDAppHandler();

// Handle service worker lifecycle
if (typeof self !== 'undefined') {
  self.addEventListener('activate', () => {

    startKeepAlive();
  });
  
  self.addEventListener('beforeunload', () => {
    stopKeepAlive();
  });
  
  // Enhanced port connection handler
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onConnect.addListener((port) => {

      switch (port.name) {
        case 'keepalive':
          handleKeepAlivePort(port);
          break;
          
        case 'wallet-communication':
          handleWalletCommunicationPort(port);
          break;
          
        case 'unlock-request':
          handleUnlockRequestPort(port);
          break;
          
        case 'wake-up':
          handleWakeUpPort(port);
          break;
          
        default:

          port.disconnect();
      }
    });
  }
}

// Port handler functions
function handleKeepAlivePort(port: any) {
  port.onMessage.addListener((msg: any) => {
    if (msg.type === 'KEEPALIVE_PING') {
      port.postMessage({ 
        type: 'KEEPALIVE_PONG', 
        timestamp: Date.now(),
        status: 'healthy'
      });
    }
  });
  
  port.onDisconnect.addListener(() => {

  });
}

function handleWalletCommunicationPort(port: any) {
  port.onMessage.addListener(async (message: any) => {

    try {
      const handler = messageHandlers[message.type];
      if (handler) {
        const response = await handler(message);
        port.postMessage({ 
          ...response, 
          requestId: message.requestId,
          timestamp: Date.now()
        });
      } else {
        port.postMessage({ 
          success: false, 
          error: `Unknown message type: ${message.type}`,
          requestId: message.requestId,
          timestamp: Date.now()
        });
      }
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('🔍 Background: Port message handler error:', error);
      port.postMessage({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: message.requestId,
        timestamp: Date.now()
      });
    }
  });
  
  port.onDisconnect.addListener(() => {

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {

    }
  });
}

function handleUnlockRequestPort(port: any) {
  port.onMessage.addListener(async (message: any) => {

    if (message.type === 'UNLOCK_WALLET') {
      try {
        const response = await messageHandlers['UNLOCK_WALLET']({
          password: message.password
        });
        
        port.postMessage(response);
      } catch (error: any) {
        // eslint-disable-next-line no-console
        console.error('🔍 Background: Unlock via port failed:', error);
        port.postMessage({
          success: false,
          error: error instanceof Error ? error.message : 'Unlock failed'
        });
      }
    } else {
      port.postMessage({
        success: false,
        error: `Unsupported unlock message type: ${message.type}`
      });
    }
  });
  
  port.onDisconnect.addListener(() => {

  });
}

function handleWakeUpPort(port: any) {

  port.onMessage.addListener((message: any) => {

    if (message.type === 'WAKE_UP') {

      // Ensure service worker is active
      if (typeof self !== 'undefined') {

        // Start keepalive if not already started
        startKeepAlive();
        
        // Send wake-up confirmation
        port.postMessage({
          success: true,
          message: 'Extension is awake and ready'
        });
      } else {

        port.postMessage({
          success: false,
          error: 'Service worker context not available'
        });
      }
    }
  });
  
  port.onDisconnect.addListener(() => {

  });
}

// Export for external access
// NOTE: PaycioDAppHandler, WalletManager, SecurityManager, BlockchainService are now imported.
// export { dappHandler, WalletManager, SecurityManager, BlockchainService }; // Removed as they are imported

// Helper to show transaction approval popup
interface TransactionApprovalParams {
  origin: string;
  to: string;
  value: string;
  gasEstimate: string;
  data: string;
}

// ============================================================================
// ENHANCED MESSAGE HANDLERS
// ============================================================================

const messageHandlers: Record<string, (message: any) => Promise<any>> = {
  'HEALTH_CHECK': async () => {
    return { success: true, data: { status: 'healthy', timestamp: Date.now() } };
  },

  'GET_WALLET_STATUS': async () => {
    try {
      const isUnlocked = await SecureSessionManager.hasActiveSession();
      const wallets = await coreWalletManagerInstance.getAllWallets();
      const hasWallet = wallets.length > 0;

      let status = 'locked';
      if (hasWallet && isUnlocked) {
        status = 'unlocked';
      } else if (hasWallet && !isUnlocked) {
        status = 'locked';
      } else if (!hasWallet) {
        status = 'no_wallet';
      }
      
      return { success: true, data: { status, hasWallet, isUnlocked } };
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('GET_WALLET_STATUS error:', error);
      return { success: false, error: error.message };
    }
  },

  'GET_WALLET_ADDRESS': async () => {
    try {
      const currentWallet = coreWalletManagerInstance.getCurrentWallet();
      if (currentWallet) {
        return { success: true, address: currentWallet.address };
      } else {
        return { success: false, error: 'No wallet address found' };
      }
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('GET_WALLET_ADDRESS error:', error);
      return { success: false, error: error.message };
    }
  },

  'SHOW_UNLOCK_POPUP': async () => {
    try {
      // This would typically show the unlock popup
      // For now, return success to indicate the popup was shown

      return { success: true, result: { popupShown: true } };

    }catch (error: any) {
      // Error is already logged and returned.
      // eslint-disable-next-line no-console
      console.error('SHOW_UNLOCK_POPUP error:', error);
      return { success: false, error: error.message };
    }
  },

  'CREATE_WALLET': async (message) => {
    try {
      const { password, name, network } = message; // Removed seedPhrase
      
      if (!password || !network) {
        throw new Error('Password and network are required');
      }
      
      const result = await coreWalletManagerInstance.createWallet({ password, name, network });
      return { success: true, data: result };
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('CREATE_WALLET error:', error);
      return { success: false, error: error.message };
    }
  },

  'UNLOCK_WALLET': async (message) => {
    try {

              // Aggressively wake up service worker
              if (typeof self !== 'undefined') {
                // Service worker context
              } else {
                // Regular context
              }
              
      const { password } = message;

      if (!password) {
        throw new Error('Password is required');
      }
      
      // Attempt to unlock using SecureSessionManager
      const unlockSuccess = await SecureSessionManager.createSession(password);
      if (!unlockSuccess) {
        throw new Error('Invalid password or session creation failed');
      }
      
      return { success: true };
      
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('UNLOCK_WALLET error:', error);
      return { success: false, error: error.message };
    }
  },

  'LOCK_WALLET': async () => {
    try {
      await SecureSessionManager.clearSession();
      return { success: true };
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('LOCK_WALLET error:', error);
      return { success: false, error: error.message };
    }
  },

  'GET_ACCOUNTS': async () => {
    try {
      const currentWallet = coreWalletManagerInstance.getCurrentWallet();
      if (!currentWallet) {
        throw new Error('No wallet found');
      }
      const accounts = await coreWalletManagerInstance.getWalletAccounts(currentWallet.id);
      return { success: true, data: accounts };
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('GET_ACCOUNTS error:', error);
      return { success: false, error: error.message };
    }
  },

  'DIAGNOSE_PASSWORD': async (message) => {
    const { password } = message;
    
    try {

      const currentWallet = coreWalletManagerInstance.getCurrentWallet();
      const diagnosis: any = {
        walletExists: !!currentWallet,
        passwordProvided: !!password,
        // Other diagnostic details would go here
      };
      
      if (currentWallet && password) {
        const isValid = await coreWalletManagerInstance.validatePassword(currentWallet.id, password);
        diagnosis.passwordValid = isValid;
      }

      return { success: true, data: diagnosis };
      
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Password diagnosis failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  'SWITCH_NETWORK': async (message) => {
    try {
      const { networkId } = message;

      if (!networkId) {
        throw new Error('Network ID is required');
      }

      await coreWalletManagerInstance.switchNetwork(networkId);
      return { success: true, result: { networkId } };

    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error(`SWITCH_NETWORK error for ${message.networkId}:`, error);
      return { success: false, error: error.message };
    }
  },

  'PAYCIO_SWITCH_TO_TON': async (message) => {
    try {

      await coreWalletManagerInstance.switchNetwork('ton');

      return { success: true, result: { networkId: 'ton' } };

    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('PAYCIO_SWITCH_TO_TON error:', error);
      return { success: false, error: error.message };
    }
  },

  'PAYCIO_SWITCH_TO_ETHEREUM': async (message) => {
    try {

      await coreWalletManagerInstance.switchNetwork('ethereum');

      return { success: true, result: { networkId: 'ethereum' } };

    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('PAYCIO_SWITCH_TO_ETHEREUM error:', error);
      return { success: false, error: error.message };
    }
  },

  'PAYCIO_SWITCH_NETWORK': async (message) => {
    try {
      const { chainId } = message;

      if (!chainId) {
        throw new Error('Chain ID is required');
      }

      const networks = getNetworks();
      const networkEntry = Object.entries(networks).find(([, config]) => config.chainId === chainId);
      if (!networkEntry) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }
      const networkId = networkEntry[0];

      await coreWalletManagerInstance.switchNetwork(networkId);
      return { success: true, result: { networkId } };

    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('PAYCIO_SWITCH_NETWORK error:', error);
      return { success: false, error: error.message };
    }
  },

  'PAYCIO_ADD_NETWORK': async (message) => {
    try {
      const { networkInfo } = message;

      if (!networkInfo || !networkInfo.chainId || !networkInfo.rpcUrls || !networkInfo.chainName || !networkInfo.name || !networkInfo.symbol || !networkInfo.explorerUrl || !networkInfo.apiKey) {
        throw new Error('Full network info (chainId, rpcUrls, chainName, name, symbol, explorerUrl, apiKey) is required');
      }

      const newNetworkId = networkInfo.chainName.toLowerCase().replace(/\s/g, '');
      const networks = getNetworks();
      if (networks[newNetworkId]) {
        throw new Error(`Network ${networkInfo.chainName} already exists`);
      }

      networks[newNetworkId] = {
        id: newNetworkId, // Add id
        chainId: networkInfo.chainId,
        rpcUrl: networkInfo.rpcUrls[0],
        nativeCurrency: networkInfo.nativeCurrency || { name: 'Unknown', symbol: 'UNK', decimals: 18 },
        name: networkInfo.name,
        symbol: networkInfo.symbol,
        explorerUrl: networkInfo.explorerUrl,
        apiKey: networkInfo.apiKey,
        isCustom: true, // New networks are custom
        isEnabled: true, // New networks are enabled by default
      };

      return { success: true, result: { added: true, networkId: newNetworkId } };

    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('PAYCIO_ADD_NETWORK error:', error);
      return { success: false, error: error.message };
    }
  },

  'GET_BALANCE': async (message) => {
    try {
      const { address, network } = message;
      
      if (!address || !network) {
        throw new Error('Address and network are required');
      }

      const balance = await BlockchainService.getNetworkBalance(address, network);
      return { success: true, data: { balance } };

    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('GET_BALANCE error:', error);
      return { success: false, error: error.message };
    }
  },

  'SEND_TRANSACTION': async (message) => {
    try {
      const { txParams, network } = message;
      
      if (!txParams) {
        throw new Error('Transaction parameters are required');
      }

      const currentWallet = coreWalletManagerInstance.getCurrentWallet();
      if (!currentWallet) {
        throw new Error('No wallet found');
      }
      const account = await coreWalletManagerInstance.getActiveAccount(currentWallet.id);
      if (!account) {
        throw new Error('No active account found');
      }

      const txHash = await handleTransactionRequest(txParams, message.origin, account);
      return { success: true, data: { txHash: txHash.data } };

    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('SEND_TRANSACTION error:', error);
      return { success: false, error: error.message };
    }
  },

  // Enhanced DApp request handler for locked wallet scenarios
  'DAPP_REQUEST': async (message) => {
    try {
      const { method, params = [], origin } = message;

      if (!method) {
        throw new Error('Method is required');
      }

      // Get wallet status
      const hasWallet = await coreWalletManagerInstance.getAllWallets().then(wallets => wallets.length > 0);
      const isUnlocked = await SecureSessionManager.hasActiveSession();

      // Methods that don't require unlocked wallet handled by dapp-handler
      const publicMethods = ['eth_chainId', 'net_version', 'eth_blockNumber'];
      if (publicMethods.includes(method)) {
        return await handlePublicMethod(method, params);
      }

      // Handle no wallet scenario
      if (!hasWallet) {
        return {
          success: false,
          error: 'NO_WALLET',
          data: {
            code: 4100,
            message: 'No wallet found. Please create a wallet first.',
            requiresSetup: true
          }
        };
      }

      // Handle wallet locked scenarios
      if (!isUnlocked) {

        // Account connection requests when locked
        if (method === 'eth_requestAccounts' || method === 'eth_accounts') {
          return {
            success: false,
            error: 'WALLET_UNLOCK_REQUIRED',
            data: {
              code: 4100,
              message: 'Please unlock your wallet to connect to this DApp.',
              requiresUnlock: true,
              hasWallet: true,
              origin: origin,
              requestId: Date.now().toString(),
              // Store pending request for after unlock
              pendingRequest: {
                method,
                params,
                origin,
                timestamp: Date.now()
              }
            }
          };
        }

        // Transaction/signing requests when locked  
        const signingMethods = [
          'eth_sendTransaction', 'eth_signTransaction', 'eth_sign', 
          'personal_sign', 'eth_signTypedData', 'eth_signTypedData_v3', 
          'eth_signTypedData_v4'
        ];

        if (signingMethods.includes(method)) {
          return {
            success: false,
            error: 'WALLET_UNLOCK_REQUIRED',
            data: {
              code: 4100,
              message: 'Please unlock your wallet to sign this transaction.',
              requiresUnlock: true,
              hasWallet: true,
              origin: origin,
              requestType: 'signing',
              pendingRequest: {
                method,
                params,
                origin,
                timestamp: Date.now()
              }
            }
          };
        }

        // Other methods when locked
        return {
          success: false,
          error: 'WALLET_LOCKED',
          data: {
            code: 4100,
            message: 'Wallet is locked. Please unlock to continue.',
            requiresUnlock: true,
            hasWallet: true
          }
        };
      }

      // Wallet is unlocked - proceed with request
      return await handleUnlockedWalletRequest(method, params, origin);

    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('DAPP_REQUEST error:', error);
      return {
        success: false,
        error: 'REQUEST_FAILED',
        data: {
          code: -32603,
          message: error.message || 'Internal error'
        }
      };
    }
  },

  'DERIVE_NETWORK_ADDRESS': async (message) => {
    const { networkId } = message;
    if (!networkId) {
      throw new Error('Network ID is required');
    }

    try {

      const currentWallet = coreWalletManagerInstance.getCurrentWallet();
      if (!currentWallet) {
        throw new Error('No wallet found');
      }

      const isUnlocked = await SecureSessionManager.hasActiveSession();
      if (!isUnlocked) {
        throw new Error('Wallet is locked');
      }

      const account = await coreWalletManagerInstance.getActiveAccount(currentWallet.id);
      if (!account) {
        throw new Error('No active account found');
      }

      if (account.addresses && account.addresses[networkId]) {

        return { success: true, data: { address: account.addresses[networkId] } };
      }

      const password = await SecureSessionManager.getSessionPassword();
      if (!password) {
        throw new Error('Wallet authentication required');
      }
      
      const seedPhrase = await decryptData(account.encryptedSeedPhrase, password);
      if (!seedPhrase) {
        throw new Error('Failed to decrypt seed phrase');
      }

      const derivationPath = DERIVATION_PATHS[networkId] || DERIVATION_PATHS.ethereum;
      const address = await generateNetworkAddress(seedPhrase, derivationPath, networkId);

      // Update wallet with the new address
      await coreWalletManagerInstance.addNetworkToAccount(account.id, networkId, address);

      return { success: true, data: { address } };
      
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error(`Enhanced derive network address failed:`, error);
      throw new Error(`Failed to generate valid address for ${networkId}. ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
};

// Helper function for public methods that don't require wallet unlock
async function handlePublicMethod(method: string, params: any[]): Promise<any> {
  switch (method) {
    case 'eth_chainId': {
      const currentWallet = coreWalletManagerInstance.getCurrentWallet();
      const networkId = currentWallet?.currentNetwork?.id || 'ethereum'; // Use network.id
      const networkConfig = getNetworks()[networkId];
      return { success: true, data: networkConfig.chainId };
    }

    case 'net_version': {
      const currentWallet = coreWalletManagerInstance.getCurrentWallet();
      const networkId = currentWallet?.currentNetwork?.id || 'ethereum'; // Use network.id
      const networkConfig = getNetworks()[networkId];
      return { success: true, data: parseInt(networkConfig.chainId, 16).toString() };
    }

    case 'eth_blockNumber':
      try {
        const currentWallet = coreWalletManagerInstance.getCurrentWallet();
        const networkId = currentWallet?.currentNetwork?.id || 'ethereum'; // Use network.id
        const blockNumber = await BlockchainService.makeRpcRequestWithFallbacks(networkId, 'eth_blockNumber', []);
        return { success: true, data: blockNumber };
      } catch (error: any) {
        console.error('Error fetching block number:', error);
        return { success: true, data: '0x0' }; // Fallback
      }
      
    default:
      throw new Error(`Unsupported public method: ${method}`);
  }
}

// Handle requests when wallet is unlocked
async function handleUnlockedWalletRequest(method: string, params: any[], origin: string): Promise<any> {
  const currentWallet = coreWalletManagerInstance.getCurrentWallet();
  if (!currentWallet) {
    throw new Error('No wallet found');
  }
  const accounts = await coreWalletManagerInstance.getWalletAccounts(currentWallet.id);
  const account = accounts.length > 0 ? accounts[0] : null;

  if (!account) {
    throw new Error('No account available');
  }
  
  switch (method) {
    case 'eth_requestAccounts':
    case 'eth_accounts':
      // Connect to DApp
      await addConnectedSite(origin, accounts.map(acc => acc.addresses[acc.networks[0]]));
      return {
        success: true,
        data: accounts.map(acc => acc.addresses[acc.networks[0]])
      };

    case 'eth_getBalance': {
      const address = params[0] || account.addresses[account.networks[0]];
      if (!address) throw new Error('No address available');
      const networkId = currentWallet.currentNetwork?.id || 'ethereum'; // Use network.id
      const balance = await BlockchainService.getBalance(address, networkId);
      return { success: true, data: balance };
    }

    case 'eth_sendTransaction':
      return await handleTransactionRequest(params[0], origin, account);

    case 'personal_sign':
      return await handleSigningRequest('personal_sign', params, origin, account);

    default:
      // Default to making an RPC request for unhandled methods
      try {
        const networkId = currentWallet.currentNetwork?.id || 'ethereum'; // Use network.id
        const rpcResult = await BlockchainService.makeRpcRequestWithFallbacks(networkId, method, params);
        return { success: true, data: rpcResult };
      } catch (rpcError: any) {
        throw new Error(`Unsupported method or RPC error: ${method}. Details: ${rpcError.message}`);
      }
  }
}

// Store connected sites
async function addConnectedSite(origin: string, addresses: string[]): Promise<void> {
  try {
    const result = await storage.get(['connectedSites']);
    const connectedSites = result.connectedSites || {};
    
    connectedSites[origin] = {
      origin,
      addresses,
      connectedAt: Date.now(),
      permissions: ['eth_accounts']
    };
    
    await storage.set({ connectedSites });

  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('Failed to store connected site:', error);
  }
}