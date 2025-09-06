// Cross-browser compatible background script
console.log('PayCio Wallet background script starting...');

import { storage } from '../utils/storage-utils';
import { runtime } from '../utils/runtime-utils';

// Basic error handling wrapper
const safeExecute = async (fn: () => Promise<any>) => {
  try {
    return await fn();
  } catch (error) {
    console.error('Background script error:', error);
    throw error; // Re-throw instead of returning fallback
  }
};

// Handle messages from content scripts
runtime().onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  // Handle different message types
  switch (message.type) {
    case 'PING':
      sendResponse({ success: true, message: 'Background script is running' });
      break;
      
    case 'GET_ACCOUNTS':
      // Get accounts from wallet storage
      safeExecute(async () => {
        const result = await storage.get(['wallet']);
        const accounts = result.wallet?.accounts || [];
        sendResponse({ 
          success: true, 
          accounts 
        });
      }).catch(() => {
        sendResponse({ success: false, error: 'Failed to get accounts' });
      });
      return true; // Keep message channel open for async response
      
    case 'GET_BALANCE':
      // Get balance from wallet storage
      safeExecute(async () => {
        const result = await storage.get(['wallet']);
        const balance = result.wallet?.balance || '0x0';
        sendResponse({ 
          success: true, 
          balance 
        });
      }).catch(() => {
        sendResponse({ success: false, error: 'Failed to get balance' });
      });
      return true; // Keep message channel open for async response
      
    case 'ETH_REQUEST_ACCOUNTS':
      // Request accounts from wallet
      safeExecute(async () => {
        const result = await storage.get(['wallet']);
        const accounts = result.wallet?.accounts || [];
        sendResponse({ 
          success: true, 
          accounts 
        });
      }).catch(() => {
        sendResponse({ success: false, error: 'Failed to get accounts' });
      });
      return true; // Keep message channel open for async response
      
    case 'ETH_ACCOUNTS':
      // Get current accounts
      safeExecute(async () => {
        const result = await storage.get(['wallet']);
        const accounts = result.wallet?.accounts || [];
        sendResponse({ 
          success: true, 
          accounts 
        });
      }).catch(() => {
        sendResponse({ success: false, error: 'Failed to get accounts' });
      });
      return true; // Keep message channel open for async response
      
    case 'ETH_CHAIN_ID':
      // Get current chain ID
      safeExecute(async () => {
        const result = await storage.get(['network']);
        const chainId = result.network?.chainId || '0x1';
        sendResponse({ 
          success: true, 
          chainId 
        });
      }).catch(() => {
        sendResponse({ success: false, error: 'Failed to get chain ID' });
      });
      return true; // Keep message channel open for async response
    
    case 'WALLET_REQUEST':
      // Generic handler for injected provider calls
      const { method, params = [] } = message;
      
      safeExecute(async () => {
        const result = await storage.get(['network', 'currentWallet']);
        const currentNetwork = result.network?.id || 'ethereum';
        const chainId = result.network?.chainId || '0x1';
        const accounts: string[] = result.currentWallet?.accounts || [];
        const selectedAddress = accounts[0] || null;

        // Handle different wallet methods
        switch (method) {
          case 'eth_chainId':
            sendResponse({ success: true, result: chainId });
            break;
          case 'net_version':
            sendResponse({ success: true, result: parseInt(chainId, 16).toString() });
            break;
          case 'eth_accounts':
            sendResponse({ success: true, result: accounts });
            break;
          case 'eth_requestAccounts':
            sendResponse({ success: true, result: accounts });
            break;
          default:
            sendResponse({ success: false, error: `Method ${method} not implemented` });
        }
      }).catch(() => {
        sendResponse({ success: false, error: 'Wallet request failed' });
      });
      return true; // Keep message channel open for async response
      
    default:
      sendResponse({ success: false, error: 'Unknown message type' });
      break;
  }
});

// Handle extension installation
runtime().onInstalled.addListener((details) => {
  console.log('PayCio Wallet extension installed:', details.reason);
});

// Handle extension startup
runtime().onStartup.addListener(() => {
  console.log('PayCio Wallet extension started');
});

console.log('✅ PayCio Wallet background script loaded successfully'); 