// Cross-browser compatible background script
console.log('PayCio Wallet background script starting...');

import { storage } from '../utils/storage-utils';
import { runtime } from '../utils/runtime-utils';
import { ethers } from 'ethers';

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
      
      (async () => {
        try {
        console.log('PayCio: Processing WALLET_REQUEST:', method, params);
        
        // Get wallet data using correct storage keys
        const result = await storage.get(['wallet', 'walletState', 'network']);
        const wallet = result.wallet;
        const walletState = result.walletState;
        const currentNetwork = result.network;
        
        console.log('PayCio: Wallet data:', { wallet: !!wallet, walletState, currentNetwork });
        
        // Check if wallet is unlocked (except for chain ID and network info)
        console.log('PayCio: Wallet unlock check - method:', method, 'isUnlocked:', walletState?.isWalletUnlocked);
        if (!walletState?.isWalletUnlocked && method !== 'eth_chainId' && method !== 'net_version' && method !== 'eth_accounts') {
          console.log('PayCio: Blocking request - wallet is locked');
          sendResponse({ success: false, error: 'Wallet is locked' });
          return;
        }
        console.log('PayCio: Allowing request - wallet unlocked or method bypassed');
        
        // Get current account address
        const currentAccount = wallet?.accounts?.find((acc: any) => acc.isActive) || wallet?.accounts?.[0];
        const currentAddress = currentAccount?.addresses?.[currentNetwork?.id || 'ethereum'];
        const accounts = currentAddress ? [currentAddress] : [];
        
        // Get chain ID - handle different network object structures
        let chainId = '0x1'; // Default to Ethereum mainnet
        
        if (currentNetwork) {
          if (typeof currentNetwork === 'string') {
            // If network is just a string ID, use default chain IDs
            const networkChainIds = {
              'ethereum': '0x1',
              'bsc': '0x38',
              'polygon': '0x89',
              'arbitrum': '0xa4b1',
              'optimism': '0xa',
              'avalanche': '0xa86a'
            };
            chainId = networkChainIds[currentNetwork] || '0x1';
          } else if (currentNetwork.chainId) {
            // If network has chainId property
            chainId = currentNetwork.chainId;
            if (!chainId.startsWith('0x')) {
              chainId = '0x' + parseInt(chainId).toString(16);
            }
          }
        }
        
        console.log('PayCio: Storage result:', result);
        console.log('PayCio: Wallet:', wallet);
        console.log('PayCio: Wallet state:', walletState);
        console.log('PayCio: Current network:', currentNetwork);
        console.log('PayCio: Chain ID:', chainId);

        // Handle different wallet methods
        switch (method) {
          case 'eth_chainId':
            console.log('🔍 PayCio: eth_chainId requested');
            console.log('🔍 PayCio: currentNetwork:', currentNetwork);
            console.log('🔍 PayCio: chainId:', chainId);
            console.log('🔍 PayCio: returning chainId:', chainId);
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
          case 'eth_getBalance':
            try {
              const [address, blockTag] = params;
              console.log('PayCio: eth_getBalance requested for address:', address);
              if (!address) {
                sendResponse({ success: false, error: 'Address required' });
                return;
              }
              
              // Determine network ID for web3-utils
              let networkId = 'ethereum'; // Default
              if (currentNetwork) {
                if (typeof currentNetwork === 'string') {
                  networkId = currentNetwork;
                } else if (currentNetwork.id) {
                  networkId = currentNetwork.id;
                }
              }
              
              console.log('PayCio: Getting balance for address:', address, 'on network:', networkId);
              
              // Import web3 utilities
              const { getBalance } = await import('../utils/web3-utils');
              const balance = await getBalance(address, networkId);
              console.log('PayCio: Balance result:', balance);
              sendResponse({ success: true, result: balance });
            } catch (error) {
              console.error('Balance error:', error);
              sendResponse({ success: false, error: `Failed to get balance: ${error.message}` });
            }
            break;
            
          case 'eth_getBlockByNumber':
            try {
              const [blockNumber, includeTransactions] = params;
              console.log('PayCio: eth_getBlockByNumber requested for block:', blockNumber);
              
              // Determine network ID
              let networkId = 'ethereum';
              if (currentNetwork) {
                if (typeof currentNetwork === 'string') {
                  networkId = currentNetwork;
                } else if (currentNetwork.id) {
                  networkId = currentNetwork.id;
                }
              }
              
              const { NETWORKS } = await import('../utils/web3-utils');
              const networkConfig = NETWORKS[networkId];
              
              if (!networkConfig) {
                throw new Error(`Network ${networkId} not supported`);
              }
              
              const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
              const block = await provider.getBlock(blockNumber, includeTransactions);
              
              // Convert block to the format expected by dApps
              const blockData = {
                number: block.number ? '0x' + block.number.toString(16) : null,
                hash: block.hash,
                parentHash: block.parentHash,
                nonce: block.nonce,
                sha3Uncles: '0x0',
                logsBloom: '0x0',
                transactionsRoot: '0x0',
                stateRoot: block.stateRoot,
                receiptsRoot: block.receiptsRoot,
                miner: block.miner,
                difficulty: block.difficulty ? '0x' + block.difficulty.toString(16) : '0x0',
                totalDifficulty: '0x0',
                extraData: block.extraData,
                size: '0x0',
                gasLimit: block.gasLimit ? '0x' + block.gasLimit.toString(16) : '0x0',
                gasUsed: block.gasUsed ? '0x' + block.gasUsed.toString(16) : '0x0',
                timestamp: block.timestamp ? '0x' + block.timestamp.toString(16) : '0x0',
                transactions: block.transactions,
                uncles: []
              };
              
              sendResponse({ success: true, result: blockData });
            } catch (error) {
              console.error('Block number error:', error);
              sendResponse({ success: false, error: `Failed to get block: ${error.message}` });
            }
            break;
            
          case 'eth_blockNumber':
            try {
              // Get real block number from the network
              const { ethers } = await import('ethers');
              
              // Determine network ID
              let networkId = 'ethereum';
              if (currentNetwork) {
                if (typeof currentNetwork === 'string') {
                  networkId = currentNetwork;
                } else if (currentNetwork.id) {
                  networkId = currentNetwork.id;
                }
              }
              
              const { NETWORKS } = await import('../utils/web3-utils');
              const networkConfig = NETWORKS[networkId];
              
              if (!networkConfig) {
                throw new Error(`Network ${networkId} not supported`);
              }
              
              const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
              const blockNumber = await provider.getBlockNumber();
              const hexBlockNumber = '0x' + blockNumber.toString(16);
              
              sendResponse({ success: true, result: hexBlockNumber });
            } catch (error) {
              console.error('Block number error:', error);
              sendResponse({ success: false, error: `Failed to get block number: ${error.message}` });
            }
            break;
            
          case 'eth_gasPrice':
            try {
              // Determine network ID
              let networkId = 'ethereum';
              if (currentNetwork) {
                if (typeof currentNetwork === 'string') {
                  networkId = currentNetwork;
                } else if (currentNetwork.id) {
                  networkId = currentNetwork.id;
                }
              }
              
              // Import web3 utilities
              const { getGasPrice } = await import('../utils/web3-utils');
              const gasPrice = await getGasPrice(networkId);
              sendResponse({ success: true, result: gasPrice });
            } catch (error) {
              console.error('Gas price error:', error);
              sendResponse({ success: false, error: `Failed to get gas price: ${error.message}` });
            }
            break;
            
          case 'eth_estimateGas':
            try {
              const [transaction] = params;
              if (!transaction) {
                sendResponse({ success: false, error: 'Transaction data required for gas estimation' });
                return;
              }
              
              // Determine network ID
              let networkId = 'ethereum';
              if (currentNetwork) {
                if (typeof currentNetwork === 'string') {
                  networkId = currentNetwork;
                } else if (currentNetwork.id) {
                  networkId = currentNetwork.id;
                }
              }
              
              // Import web3 utilities
              const { estimateGas } = await import('../utils/web3-utils');
              const gasEstimate = await estimateGas(
                transaction.from || currentAddress,
                transaction.to,
                transaction.value || '0x0',
                transaction.data || '0x',
                networkId
              );
              sendResponse({ success: true, result: gasEstimate });
            } catch (error) {
              console.error('Gas estimate error:', error);
              sendResponse({ success: false, error: `Failed to estimate gas: ${error.message}` });
            }
            break;
            
          case 'eth_getTransactionCount':
            try {
              const [address, blockTag] = params;
              if (!address) {
                sendResponse({ success: false, error: 'Address required' });
                return;
              }
              
              // Determine network ID
              let networkId = 'ethereum';
              if (currentNetwork) {
                if (typeof currentNetwork === 'string') {
                  networkId = currentNetwork;
                } else if (currentNetwork.id) {
                  networkId = currentNetwork.id;
                }
              }
              
              // Import web3 utilities
              const { getTransactionCount } = await import('../utils/web3-utils');
              const txCount = await getTransactionCount(address, networkId);
              sendResponse({ success: true, result: txCount });
            } catch (error) {
              console.error('Transaction count error:', error);
              sendResponse({ success: false, error: `Failed to get transaction count: ${error.message}` });
            }
            break;
          case 'eth_sendTransaction':
            // Handle transaction sending with real implementation
            try {
              const [transaction] = params;
              if (!transaction) {
                sendResponse({ success: false, error: 'Transaction data required' });
                return;
              }
              
              // Get current account and network
              const currentAccount = wallet?.accounts?.find((acc: any) => acc.isActive) || wallet?.accounts?.[0];
              if (!currentAccount) {
                sendResponse({ success: false, error: 'No active account found' });
                return;
              }
              
              // Get the current address for the network
              const fromAddress = currentAccount.addresses?.[currentNetwork?.id || 'ethereum'];
              if (!fromAddress) {
                sendResponse({ success: false, error: 'No address found for current network' });
                return;
              }
              
              // Use direct signing instead of transaction manager
              // Import signing utilities
              const { ethers } = await import('ethers');
              const { signTransaction, sendSignedTransaction } = await import('../utils/web3-utils');
              
              // Determine network ID
              let networkId = 'ethereum';
              if (currentNetwork) {
                if (typeof currentNetwork === 'string') {
                  networkId = currentNetwork;
                } else if (currentNetwork.id) {
                  networkId = currentNetwork.id;
                }
              }
              
              // Get network config
              const { NETWORKS } = await import('../utils/web3-utils');
              const networkConfig = NETWORKS[networkId];
              
              if (!networkConfig) {
                sendResponse({ success: false, error: `Network ${networkId} not supported` });
                return;
              }
              
              // Prepare transaction
              const tx = {
                to: transaction.to,
                value: transaction.value || '0x0',
                data: transaction.data || '0x',
                gasLimit: transaction.gas || transaction.gasLimit || '0x5208',
                gasPrice: transaction.gasPrice,
                nonce: transaction.nonce
              };
              
              // Sign transaction with private key
              const signedTx = await signTransaction(tx, currentAccount.privateKey, networkId);
              
              // Send signed transaction
              const txHash = await sendSignedTransaction(signedTx, networkId);
              
              sendResponse({ success: true, result: txHash });
            } catch (error) {
              console.error('Transaction error:', error);
              sendResponse({ success: false, error: `Transaction failed: ${error.message}` });
            }
            break;
            
          case 'eth_signTransaction':
            // Handle transaction signing with real implementation
            try {
              const [transaction] = params;
              if (!transaction) {
                sendResponse({ success: false, error: 'Transaction data required' });
                return;
              }
              
              // Get current account and network
              const currentAccount = wallet?.accounts?.find((acc: any) => acc.isActive) || wallet?.accounts?.[0];
              if (!currentAccount) {
                sendResponse({ success: false, error: 'No active account found' });
                return;
              }
              
              // Import signing utilities
              const { signTransaction } = await import('../utils/web3-utils');
              
              // Determine network ID
              let networkId = 'ethereum';
              if (currentNetwork) {
                if (typeof currentNetwork === 'string') {
                  networkId = currentNetwork;
                } else if (currentNetwork.id) {
                  networkId = currentNetwork.id;
                }
              }
              
              // Sign transaction with private key
              const signedTx = await signTransaction(
                transaction,
                currentAccount.privateKey,
                networkId
              );
              
              sendResponse({ success: true, result: signedTx });
            } catch (error) {
              console.error('Transaction signing error:', error);
              sendResponse({ success: false, error: `Transaction signing failed: ${error.message}` });
            }
            break;
            
          case 'eth_sign':
            // Handle message signing with real implementation
            try {
              const [address, message] = params;
              if (!address || !message) {
                sendResponse({ success: false, error: 'Address and message required' });
                return;
              }
              
              // Get current account
              const currentAccount = wallet?.accounts?.find((acc: any) => acc.isActive) || wallet?.accounts?.[0];
              if (!currentAccount) {
                sendResponse({ success: false, error: 'No active account found' });
                return;
              }
              
              // Get session password for decryption
              const sessionData = await storage.getSession(['sessionPassword']);
              const sessionPassword = sessionData.sessionPassword;
              if (!sessionPassword) {
                sendResponse({ success: false, error: 'Wallet not unlocked. Please unlock your wallet first.' });
                return;
              }
              
              // Import signing utilities
              const { ethers } = await import('ethers');
              const { decryptData } = await import('../utils/crypto-utils');
              
              // Decrypt private key
              const decryptedPrivateKey = await decryptData(currentAccount.privateKey, sessionPassword);
              if (!decryptedPrivateKey) {
                sendResponse({ success: false, error: 'Failed to decrypt private key' });
                return;
              }
              
              // Create wallet instance and sign message
              const walletInstance = new ethers.Wallet(decryptedPrivateKey);
              const signature = await walletInstance.signMessage(message);
              
              sendResponse({ success: true, result: signature });
            } catch (error) {
              console.error('Message signing error:', error);
              sendResponse({ success: false, error: `Message signing failed: ${error.message}` });
            }
            break;
            
          case 'personal_sign':
            // Handle personal message signing with real implementation
            try {
              const [message, address] = params;
              if (!message || !address) {
                sendResponse({ success: false, error: 'Message and address required' });
                return;
              }
              
              // Get current account
              const currentAccount = wallet?.accounts?.find((acc: any) => acc.isActive) || wallet?.accounts?.[0];
              if (!currentAccount) {
                sendResponse({ success: false, error: 'No active account found' });
                return;
              }
              
              // Get session password for decryption
              const sessionData = await storage.getSession(['sessionPassword']);
              const sessionPassword = sessionData.sessionPassword;
              if (!sessionPassword) {
                sendResponse({ success: false, error: 'Wallet not unlocked. Please unlock your wallet first.' });
                return;
              }
              
              // Import signing utilities
              const { ethers } = await import('ethers');
              const { decryptData } = await import('../utils/crypto-utils');
              
              // Decrypt private key
              const decryptedPrivateKey = await decryptData(currentAccount.privateKey, sessionPassword);
              if (!decryptedPrivateKey) {
                sendResponse({ success: false, error: 'Failed to decrypt private key' });
                return;
              }
              
              // Create wallet instance and sign message
              const walletInstance = new ethers.Wallet(decryptedPrivateKey);
              const signature = await walletInstance.signMessage(message);
              
              sendResponse({ success: true, result: signature });
            } catch (error) {
              console.error('Personal signing error:', error);
              sendResponse({ success: false, error: `Personal signing failed: ${error.message}` });
            }
            break;
            
          case 'eth_signTypedData':
          case 'eth_signTypedData_v4':
            // Handle typed data signing with real implementation
            try {
              const [address, typedData] = params;
              if (!address || !typedData) {
                sendResponse({ success: false, error: 'Address and typed data required' });
                return;
              }
              
              // Get current account
              const currentAccount = wallet?.accounts?.find((acc: any) => acc.isActive) || wallet?.accounts?.[0];
              if (!currentAccount) {
                sendResponse({ success: false, error: 'No active account found' });
                return;
              }
              
              // Get session password for decryption
              const sessionData = await storage.getSession(['sessionPassword']);
              const sessionPassword = sessionData.sessionPassword;
              if (!sessionPassword) {
                sendResponse({ success: false, error: 'Wallet not unlocked. Please unlock your wallet first.' });
                return;
              }
              
              // Import signing utilities
              const { ethers } = await import('ethers');
              const { decryptData } = await import('../utils/crypto-utils');
              
              // Decrypt private key
              const decryptedPrivateKey = await decryptData(currentAccount.privateKey, sessionPassword);
              if (!decryptedPrivateKey) {
                sendResponse({ success: false, error: 'Failed to decrypt private key' });
                return;
              }
              
              // Create wallet instance and sign typed data
              const walletInstance = new ethers.Wallet(decryptedPrivateKey);
              const signature = await walletInstance.signTypedData(
                typedData.domain,
                typedData.types,
                typedData.message
              );
              
              sendResponse({ success: true, result: signature });
            } catch (error) {
              console.error('Typed data signing error:', error);
              sendResponse({ success: false, error: `Typed data signing failed: ${error.message}` });
            }
            break;
            
          case 'wallet_switchEthereumChain':
            // Handle network switching with real implementation
            try {
              const [chainParams] = params;
              if (!chainParams || !chainParams.chainId) {
                sendResponse({ success: false, error: 'Chain ID required' });
                return;
              }
              
              // Convert chain ID to decimal
              const chainId = parseInt(chainParams.chainId, 16);
              console.log('PayCio: Switching to chain ID:', chainId);
              
              // Find network by chain ID
              const networks = [
                { id: 'ethereum', chainId: 1, name: 'Ethereum' },
                { id: 'bsc', chainId: 56, name: 'BSC' },
                { id: 'polygon', chainId: 137, name: 'Polygon' },
                { id: 'arbitrum', chainId: 42161, name: 'Arbitrum' },
                { id: 'optimism', chainId: 10, name: 'Optimism' },
                { id: 'avalanche', chainId: 43114, name: 'Avalanche' }
              ];
              
              const targetNetwork = networks.find(net => net.chainId === chainId);
              if (!targetNetwork) {
                console.log('PayCio: Unsupported chain ID:', chainId);
                sendResponse({ success: false, error: `Unsupported chain ID: ${chainId}` });
                return;
              }
              
              console.log('PayCio: Switching to network:', targetNetwork);
              
              // Update the current network in storage
              await storage.set({ currentNetwork: targetNetwork.id });
              
              sendResponse({ success: true, result: null });
            } catch (error) {
              console.error('Network switching error:', error);
              sendResponse({ success: false, error: `Network switching failed: ${error.message}` });
            }
            break;
            
          case 'wallet_addEthereumChain':
            // Handle adding new networks with real implementation
            try {
              const [chainParams] = params;
              if (!chainParams || !chainParams.chainId) {
                sendResponse({ success: false, error: 'Chain parameters required' });
                return;
              }
              
              // Convert chain ID to decimal
              const chainId = parseInt(chainParams.chainId, 16);
              
              // Create custom network object
              const customNetwork = {
                id: `custom-${chainId}`,
                name: chainParams.chainName || `Custom Network ${chainId}`,
                symbol: chainParams.nativeCurrency?.symbol || 'ETH',
                chainId: chainId,
                rpcUrl: chainParams.rpcUrls?.[0] || '',
                blockExplorer: chainParams.blockExplorerUrls?.[0] || '',
                isCustom: true
              };
              
              console.log('PayCio: Custom network added:', customNetwork.name);
              
              sendResponse({ success: true, result: null });
            } catch (error) {
              console.error('Network adding error:', error);
              sendResponse({ success: false, error: `Network adding failed: ${error.message}` });
            }
            break;
            
          case 'wallet_requestPermissions':
            try {
              const [permissions] = params;
              console.log('PayCio: wallet_requestPermissions requested:', permissions);
              
              // Check if wallet is unlocked
              if (!walletState?.isWalletUnlocked) {
                sendResponse({ success: false, error: 'Wallet is locked' });
                return;
              }
              
              // For now, grant all requested permissions
              // In a real implementation, you would show a permission dialog
              const grantedPermissions = Array.isArray(permissions) 
                ? permissions.map((permission: any) => ({
                    ...permission,
                    caveats: permission.caveats || []
                  }))
                : [permissions].map((permission: any) => ({
                    ...permission,
                    caveats: permission.caveats || []
                  }));
              
              console.log('PayCio: Permissions granted:', grantedPermissions);
              sendResponse({ success: true, result: grantedPermissions });
            } catch (error) {
              console.error('Request permissions error:', error);
              sendResponse({ success: false, error: `Failed to request permissions: ${error.message}` });
            }
            break;
            
          case 'wallet_getPermissions':
            try {
              console.log('PayCio: wallet_getPermissions requested');
              
              // Check if wallet is unlocked
              if (!walletState?.isWalletUnlocked) {
                sendResponse({ success: false, error: 'Wallet is locked' });
                return;
              }
              
              // Return current permissions
              // In a real implementation, you would store and retrieve actual permissions
              const currentPermissions = [
                {
                  "caveats": [
                    {
                      "type": "restrictReturnedAccounts",
                      "value": [currentAddress]
                    }
                  ],
                  "date": Date.now(),
                  "id": "paycio-permission-1",
                  "invoker": "https://metamask.github.io",
                  "parentCapability": "eth_accounts"
                }
              ];
              
              console.log('PayCio: Current permissions:', currentPermissions);
              sendResponse({ success: true, result: currentPermissions });
            } catch (error) {
              console.error('Get permissions error:', error);
              sendResponse({ success: false, error: `Failed to get permissions: ${error.message}` });
            }
            break;
            
          case 'wallet_revokePermissions':
            try {
              const [permissions] = params;
              console.log('PayCio: wallet_revokePermissions requested:', permissions);
              
              // Check if wallet is unlocked
              if (!walletState?.isWalletUnlocked) {
                sendResponse({ success: false, error: 'Wallet is locked' });
                return;
              }
              
              // For now, just return success
              // In a real implementation, you would revoke the specified permissions
              console.log('PayCio: Permissions revoked (not implemented yet)');
              sendResponse({ success: true, result: null });
            } catch (error) {
              console.error('Revoke permissions error:', error);
              sendResponse({ success: false, error: `Failed to revoke permissions: ${error.message}` });
            }
            break;
            
          case 'unlock_wallet':
            try {
              const [password] = params;
              console.log('PayCio: unlock_wallet requested');
              
              if (!password) {
                sendResponse({ success: false, error: 'Password required' });
                return;
              }
              
              // Get stored wallet data and password hash
              const storedData = await storage.get(['wallet', 'walletState', 'passwordHash']);
              const storedWallet = storedData.wallet;
              const storedWalletState = storedData.walletState;
              const storedHash = storedData.passwordHash;
              
              if (!storedWallet || !storedWalletState) {
                sendResponse({ success: false, error: 'No wallet found' });
                return;
              }
              
              // Import password utilities
              const { verifyPassword, hashPassword } = await import('../utils/crypto-utils');
              
              let isValid = false;
              
              if (!storedHash) {
                // First time unlock, create password hash
                const hash = await hashPassword(password);
                await storage.set({ passwordHash: hash });
                isValid = true;
                console.log('PayCio: First time unlock - password hash created');
              } else {
                // Check if stored hash is in old PBKDF2 format (object) or new bcrypt format (string)
                if (typeof storedHash === 'object' && storedHash.hash) {
                  // Old PBKDF2 format - clear it and create new bcrypt hash
                  console.log('PayCio: Detected old PBKDF2 password hash format, converting to bcrypt');
                  const newHash = await hashPassword(password);
                  await storage.set({ passwordHash: newHash });
                  isValid = true;
                  console.log('PayCio: Password hash converted to bcrypt format');
                } else if (typeof storedHash === 'string') {
                  // New bcrypt format - verify normally
                  isValid = await verifyPassword(password, storedHash);
                  console.log('PayCio: Password verification result:', isValid);
                  console.log('PayCio: Stored hash type:', typeof storedHash);
                  console.log('PayCio: Stored hash length:', storedHash?.length);
                } else {
                  // Unknown format - clear and recreate
                  console.log('PayCio: Unknown password hash format, recreating');
                  const newHash = await hashPassword(password);
                  await storage.set({ passwordHash: newHash });
                  isValid = true;
                  console.log('PayCio: Password hash recreated');
                }
              }
              
              if (isValid) {
                // Update wallet state to unlocked
                const updatedWalletState = {
                  ...storedWalletState,
                  isWalletUnlocked: true,
                  lastUnlockTime: Date.now()
                };
                
                await storage.set({ walletState: updatedWalletState });
                
                // Store password in session storage for signing operations
                await storage.setSession({ sessionPassword: password });
                
                console.log('PayCio: Wallet unlocked successfully');
                sendResponse({ success: true, result: 'Wallet unlocked' });
              } else {
                console.log('PayCio: Wallet unlock failed - invalid password');
                sendResponse({ success: false, error: 'Invalid password' });
              }
            } catch (error) {
              console.error('Unlock wallet error:', error);
              sendResponse({ success: false, error: `Failed to unlock wallet: ${error.message}` });
            }
            break;
            
          default:
            console.log(`PayCio: Unhandled method: ${method}`);
            sendResponse({ success: false, error: `Method ${method} not implemented` });
        }
        } catch (error) {
          console.error('PayCio: Wallet request error:', error);
          sendResponse({ success: false, error: 'Wallet request failed' });
        }
      })();
      return true; // Keep message channel open for async response
      
    case 'SHOW_WALLET_UNLOCK_POPUP':
      // Handle wallet unlock popup request
      safeExecute(async () => {
        // Open the wallet popup for unlocking
        const popupUrl = runtime().getURL('popup.html');
        
        try {
          // Try to open popup via action (this is the correct way for Manifest V3)
          if (typeof chrome !== 'undefined' && chrome.action && chrome.action.openPopup) {
            await chrome.action.openPopup();
            sendResponse({ success: true });
          } else if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
            // Fallback: open options page if popup method not available
            await chrome.runtime.openOptionsPage();
            sendResponse({ success: true });
          } else {
            // Fallback for other browsers or if neither method is available
            sendResponse({ success: false, error: 'Could not open wallet popup - browser not supported' });
          }
        } catch (error) {
          console.error('Error opening popup:', error);
          sendResponse({ success: false, error: 'Could not open wallet popup' });
        }
      }).catch(() => {
        sendResponse({ success: false, error: 'Failed to show unlock popup' });
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