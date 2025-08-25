import { WalletManager } from '../core/wallet-manager';
import { SecurityManager } from '../core/security-manager';

// Initialize managers
const walletManager = new WalletManager();
const securityManager = new SecurityManager();

export {};

// Background script initialization
console.log('PayCio Wallet background script initialized');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails) => {
  if (details.reason === 'install') {
    // First time installation
    console.log('First time installation - setting up default settings');
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
  console.log('Background received message:', message);

  // Handle different message types
  switch (message.type) {
    case 'WALLET_CONNECT':
      handleWalletConnect(message, sendResponse);
      break;
    case 'WALLET_GET_ACCOUNTS':
      handleGetAccounts(message, sendResponse);
      break;
    case 'WALLET_GET_BALANCE':
      handleGetBalance(message, sendResponse);
      break;
    case 'WALLET_SIGN_TRANSACTION':
      handleSignTransaction(message, sendResponse);
      break;
    case 'WALLET_SWITCH_NETWORK':
      handleSwitchNetwork(message, sendResponse);
      break;
    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
  return true; // Indicates that sendResponse will be called asynchronously
});

// Handle wallet connect
async function handleWalletConnect(message: any, sendResponse: (response: any) => void) {
  try {
    const currentWallet = walletManager.getCurrentWalletForBackground();
    if (currentWallet) {
      sendResponse({
        success: true,
        address: currentWallet.address,
        network: currentWallet.currentNetwork
      });
    } else {
      sendResponse({
        success: false,
        error: 'No wallet available'
      });
    }
  } catch (error) {
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Handle get accounts
async function handleGetAccounts(message: any, sendResponse: (response: any) => void) {
  try {
    const currentWallet = walletManager.getCurrentWalletForBackground();
    if (currentWallet) {
      sendResponse({
        success: true,
        accounts: [currentWallet.address]
      });
    } else {
      sendResponse({
        success: true,
        accounts: []
      });
    }
  } catch (error) {
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Handle get balance
async function handleGetBalance(message: any, sendResponse: (response: any) => void) {
  try {
    const { address, network } = message.params;
    const balance = await walletManager.getBalance(address, network);
    sendResponse({
      success: true,
      balance
    });
  } catch (error) {
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Handle sign transaction
async function handleSignTransaction(message: any, sendResponse: (response: any) => void) {
  try {
    const currentWallet = walletManager.getCurrentWallet();
    if (!currentWallet) {
      sendResponse({
        success: false,
        error: 'No wallet available'
      });
      return;
    }

    const currentAccount = walletManager.getCurrentAccount();
    if (!currentAccount) {
      sendResponse({
        success: false,
        error: 'No account available'
      });
      return;
    }

    // Import real signing utilities
    const { ethers } = await import('ethers');
    const { decryptData } = await import('../utils/crypto-utils');
    
    // Get transaction data from message
    const { transaction, password } = message.params;
    
    if (!password) {
      sendResponse({
        success: false,
        error: 'Password required for signing'
      });
      return;
    }

    // Decrypt private key
    const privateKey = await decryptData(currentAccount.privateKey, password);
    if (!privateKey) {
      sendResponse({
        success: false,
        error: 'Invalid password'
      });
      return;
    }

    // Create wallet instance and sign transaction
    const wallet = new ethers.Wallet(privateKey);
    const signedTx = await wallet.signTransaction(transaction);
    
    sendResponse({
      success: true,
      signature: signedTx
    });
  } catch (error) {
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Handle switch network
async function handleSwitchNetwork(message: any, sendResponse: (response: any) => void) {
  try {
    const { networkId } = message.params;
    await walletManager.switchNetwork(networkId);
    sendResponse({
      success: true
    });
  } catch (error) {
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Handle alarms (e.g., for session expiry)
chrome.alarms.onAlarm.addListener(async (alarm: chrome.alarms.Alarm) => {
  if (alarm.name === 'session_timeout') {
    console.log('Session timeout alarm triggered. Locking wallet...');
    await securityManager.lockWallet();
    // Optionally notify user
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icon48.png',
      title: 'PayCio Wallet',
      message: 'Your wallet has been locked due to inactivity.'
    });
  }
});

// Listen for storage changes to update wallet state
chrome.storage.local.onChanged.addListener((changes: { [key: string]: chrome.storage.StorageChange }) => {
  if (changes.walletState) {
    console.log('Wallet state changed:', changes.walletState.newValue);
    // Propagate state change to injected script if necessary
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'WALLET_STATE_CHANGED',
          data: changes.walletState.newValue
        });
      }
    });
  }
});

console.log('PayCio Wallet background service worker initialized'); 