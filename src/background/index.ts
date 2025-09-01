// Simplified background script to prevent crashes
console.log('PayCio Wallet background script starting...');

// Basic error handling wrapper
function safeExecute(fn: () => void, context: string) {
  try {
    fn();
  } catch (error) {
    console.error(`Error in ${context}:`, error);
  }
}

// Initialize basic functionality
let isInitialized = false;

function initializeBackground() {
  if (isInitialized) return;
  
  safeExecute(() => {
    console.log('Initializing background script...');
    
    // Handle extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      console.log('Extension installed:', details.reason);
    });
    
    // Handle messages from content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('Background received message:', message);
      
      try {
        // Basic message handling
        switch (message.type) {
          case 'PING':
            sendResponse({ success: true, message: 'Background script is running' });
            break;
            
          case 'GET_ACCOUNTS':
            // Get accounts from wallet storage
            chrome.storage.local.get(['wallet'], (result) => {
              const accounts = result.wallet?.accounts || [];
            sendResponse({ 
              success: true, 
                accounts 
              });
            });
            return true; // Keep message channel open for async response
            
          case 'GET_BALANCE':
            // Get balance from wallet storage
            chrome.storage.local.get(['wallet'], (result) => {
              const balance = result.wallet?.balance || '0x0';
            sendResponse({ 
              success: true, 
                balance 
              });
            });
            return true; // Keep message channel open for async response
            
          case 'ETH_REQUEST_ACCOUNTS':
            // Request accounts from wallet
            chrome.storage.local.get(['wallet'], (result) => {
              const accounts = result.wallet?.accounts || [];
            sendResponse({ 
              success: true, 
                accounts 
              });
            });
            return true; // Keep message channel open for async response
            
          case 'ETH_ACCOUNTS':
            // Get current accounts
            chrome.storage.local.get(['wallet'], (result) => {
              const accounts = result.wallet?.accounts || [];
            sendResponse({ 
              success: true, 
                accounts 
              });
            });
            return true; // Keep message channel open for async response
            
          case 'ETH_CHAIN_ID':
            // Get current chain ID
            chrome.storage.local.get(['network'], (result) => {
              const chainId = result.network?.chainId || '0x1';
            sendResponse({ 
              success: true, 
                chainId 
              });
            });
            return true; // Keep message channel open for async response
          
          case 'WALLET_REQUEST': {
            // Generic handler for injected provider calls
            const { method, params = [] } = message;
            // Read current network and rpc from storage
            chrome.storage.local.get(['network', 'currentWallet'], async (result) => {
              try {
                const currentNetwork = result.network?.id || 'ethereum';
                const chainId = result.network?.chainId || '0x1';
                const rpcUrl = result.network?.rpcUrl;
                const accounts: string[] = result.currentWallet?.accounts || [];
                const selectedAddress = accounts[0] || null;

                // Minimal live implementations using web3-utils RPC helpers
                const web3 = await import('../utils/web3-utils');

                switch (method) {
                  case 'eth_chainId':
                    sendResponse({ success: true, result: chainId });
                    return;
                  case 'net_version':
                    sendResponse({ success: true, result: parseInt(chainId, 16).toString() });
                    return;
                  case 'eth_accounts':
                    sendResponse({ success: true, result: accounts });
                    return;
                  case 'eth_requestAccounts':
                    // For now, return existing accounts (connection approval handled in UI)
                    sendResponse({ success: true, result: accounts });
                    return;
                  case 'eth_getBalance': {
                    const [address] = params;
                    const balance = await web3.getBalance(address || selectedAddress, currentNetwork);
                    sendResponse({ success: true, result: balance });
                    return;
                  }
                  case 'eth_gasPrice': {
                    const gasPrice = await web3.getGasPrice(currentNetwork);
                    sendResponse({ success: true, result: gasPrice });
                    return;
                  }
                  case 'eth_estimateGas': {
                    const [tx] = params;
                    const gas = await web3.estimateGas(
                      tx?.from || selectedAddress || '0x0000000000000000000000000000000000000000',
                      tx?.to || '0x0000000000000000000000000000000000000000',
                      tx?.value || '0x0',
                      tx?.data || '0x',
                      currentNetwork
                    );
                    sendResponse({ success: true, result: gas });
                    return;
                  }
                  case 'eth_sendTransaction': {
                    try {
                      const [{ from, to, value, data, gas, gasPrice, nonce }] = params;
                      // Resolve RPC URL
                      const rpc = (result.network && result.network.rpcUrl) || (web3.NETWORKS as any)[currentNetwork]?.rpcUrl;
                      if (!rpc) {
                        sendResponse({ success: false, error: 'RPC URL not configured for network' });
                        return;
                      }

                      const { ethers } = await import('ethers');
                      // Load wallets from storage and find the sender
                      chrome.storage.local.get(['wallets'], async (wres) => {
                        try {
                          const wallets = (wres as any).wallets || [];
                          const w = wallets.find((wx: any) => wx.address?.toLowerCase() === (from || selectedAddress || '').toLowerCase()) || wallets[0];
                          if (!w || !w.privateKey) {
                            sendResponse({ success: false, error: 'No sender wallet/private key available' });
                            return;
                          }

                          const provider = new ethers.JsonRpcProvider(rpc);
                          const signer = new ethers.Wallet(w.privateKey, provider);

                          // Build transaction
                          const txRequest: any = {
                            to: to || undefined,
                            data: data || '0x'
                          };
                          if (value) txRequest.value = ethers.toBeHex(BigInt(value));
                          if (gasPrice) txRequest.gasPrice = ethers.toBeHex(BigInt(gasPrice));
                          if (gas) txRequest.gasLimit = ethers.toBeHex(BigInt(gas));
                          if (nonce !== undefined) txRequest.nonce = Number(nonce);

                          // Fill missing gas/gasPrice
                          // Ethers v6 uses provider.getFeeData()
                          if (!txRequest.gasPrice) {
                            const feeData = await provider.getFeeData();
                            if (feeData.gasPrice) txRequest.gasPrice = feeData.gasPrice;
                          }
                          if (!txRequest.gasLimit) {
                            const est = await provider.estimateGas({ from: await signer.getAddress(), ...txRequest });
                            txRequest.gasLimit = est;
                          }

                          const sent = await signer.sendTransaction(txRequest);
                          sendResponse({ success: true, result: sent.hash });
                        } catch (e) {
                          console.error('eth_sendTransaction error:', e);
                          sendResponse({ success: false, error: e instanceof Error ? e.message : 'Send failed' });
                        }
                      });
                    } catch (e) {
                      sendResponse({ success: false, error: e instanceof Error ? e.message : 'Send failed' });
                    }
                    return;
                  }
                  case 'wallet_switchEthereumChain': {
                    // EIP-3326 { chainId }
                    const [switchParams] = params;
                    const requestedChainId: string = switchParams?.chainId;
                    if (!requestedChainId) {
                      sendResponse({ success: false, error: 'chainId is required' });
                      return;
                    }
                    // Try to map to known network by chainId
                    const knownEntries = Object.entries(web3.NETWORKS as any);
                    const hexToDec = (hex: string) => parseInt(hex, 16).toString();
                    const decId = hexToDec(requestedChainId);
                    let matchedId: string | null = null;
                    for (const [id, cfg] of knownEntries) {
                      if ((cfg as any).chainId === decId) { matchedId = id; break; }
                    }
                    const newNetwork = {
                      id: matchedId || `custom-${decId}`,
                      chainId: requestedChainId,
                      rpcUrl: matchedId ? (web3.NETWORKS as any)[matchedId].rpcUrl : (result.network?.rpcUrl || ''),
                    };
                    chrome.storage.local.set({ network: newNetwork, currentNetwork: newNetwork.id }, () => {
                      sendResponse({ success: true, result: null });
                    });
                    return;
                  }
                  case 'wallet_addEthereumChain': {
                    // EIP-3085 [{ chainId, chainName, nativeCurrency, rpcUrls, blockExplorerUrls }]
                    const [chainParams] = params;
                    const chainIdHex: string = chainParams?.chainId;
                    const rpcUrls: string[] = chainParams?.rpcUrls || [];
                    const chainName: string = chainParams?.chainName || 'Custom Network';
                    if (!chainIdHex || rpcUrls.length === 0) {
                      sendResponse({ success: false, error: 'chainId and rpcUrls are required' });
                      return;
                    }
                    const hexToDec = (hex: string) => parseInt(hex, 16).toString();
                    const decId = hexToDec(chainIdHex);
                    const id = (chainName || 'custom').toLowerCase().replace(/\s+/g, '-');
                    const networkObj = {
                      id,
                      name: chainName,
                      symbol: chainParams?.nativeCurrency?.symbol || 'ETH',
                      rpcUrl: rpcUrls[0],
                      chainId: chainIdHex,
                      explorerUrl: (chainParams?.blockExplorerUrls && chainParams.blockExplorerUrls[0]) || ''
                    };
                    chrome.storage.local.get(['customNetworks'], (res) => {
                      const customNetworks = res.customNetworks || [];
                      const exists = customNetworks.some((n: any) => n.chainId === chainIdHex || n.id === id);
                      const updated = exists ? customNetworks : [...customNetworks, { ...networkObj, isCustom: true, isEnabled: true }];
                      chrome.storage.local.set({ customNetworks: updated, network: { id, chainId: chainIdHex, rpcUrl: rpcUrls[0] }, currentNetwork: id }, () => {
                        sendResponse({ success: true, result: null });
                      });
                    });
                    return;
                  }
                  case 'btc_sendTransaction': {
                    try {
                      const [{ fromAddress, toAddress, amountSats, wif, privateKeyHex, networkType }] = params;
                      const btc = await import('../utils/bitcoin-utils');
                      const rawHex = await btc.createAndSignP2WPKHTransaction({ fromAddress, toAddress, amountSats, wif, privateKeyHex, networkType });
                      const api = new (btc as any).BitcoinAPI(networkType || 'mainnet');
                      const broadcast = await api.broadcastTransaction(rawHex);
                      if (broadcast.success) {
                        sendResponse({ success: true, result: broadcast.txid });
                      } else {
                        sendResponse({ success: false, error: broadcast.error || 'Broadcast failed' });
                      }
                    } catch (e) {
                      sendResponse({ success: false, error: e instanceof Error ? e.message : 'BTC send failed' });
                    }
                    return;
                  }
                  case 'tron_sendTransaction': {
                    try {
                      const [{ from, to, amount, privateKey, tokenAddress }] = params;
                      const tron = await import('../utils/tron-utils');
                      let wallet;
                      if (privateKey) {
                        wallet = { address: from, privateKey, name: 'tron', publicKey: '', balance: 0, energy: 0, bandwidth: 0, network: 'mainnet', derivationPath: "m/44'/195'/0'/0/0", createdAt: Date.now() };
                      } else {
                        sendResponse({ success: false, error: 'privateKey is required for TRON send' });
                        return;
                      }
                      if (tokenAddress) {
                        const res = await (tron as any).tronUtils.sendToken(wallet, tokenAddress, to, amount);
                        sendResponse(res.success ? { success: true, result: res.txID } : { success: false, error: res.error || 'TRON token send failed' });
                      } else {
                        const res = await (tron as any).tronUtils.sendTrx(wallet, to, amount);
                        sendResponse(res.success ? { success: true, result: res.txID } : { success: false, error: res.error || 'TRON send failed' });
                      }
                    } catch (e) {
                      sendResponse({ success: false, error: e instanceof Error ? e.message : 'TRON send failed' });
                    }
                    return;
                  }
                  case 'eth_sendTransaction': {
                    console.log('Background: Processing eth_sendTransaction');
                    
                    const txParams = params[0];
                    const { to, value, data, gas, gasPrice, nonce } = txParams;
                    
                    try {
                      const { ethers } = await import('ethers');
                      
                      // Get current wallet
                      chrome.storage.local.get(['currentWallet', 'wallets'], async (walletResult) => {
                        try {
                          const wallets = walletResult.wallets || [];
                          const currentWallet = walletResult.currentWallet;
                          
                          if (!currentWallet || !wallets.length) {
                            sendResponse({ success: false, error: 'No wallet available' });
                            return;
                          }
                          
                          const wallet = wallets.find((w: any) => w.id === currentWallet) || wallets[0];
                          if (!wallet || !wallet.privateKey) {
                            sendResponse({ success: false, error: 'No private key available' });
                            return;
                          }
                          
                          // Get network RPC URL
                          const currentNetwork = result.network || 'ethereum';
                          let rpcUrl = 'https://cloudflare-eth.com';
                          if (currentNetwork === 'bsc') rpcUrl = 'https://bsc-dataseed1.binance.org';
                          else if (currentNetwork === 'polygon') rpcUrl = 'https://polygon-rpc.com';
                          
                          const provider = new ethers.JsonRpcProvider(rpcUrl);
                          const signer = new ethers.Wallet(wallet.privateKey, provider);
                          
                          // Build transaction
                          const txRequest: any = {
                            to: to || undefined,
                            data: data || '0x'
                          };
                          
                          if (value) txRequest.value = ethers.toBeHex(BigInt(value));
                          if (gasPrice) txRequest.gasPrice = ethers.toBeHex(BigInt(gasPrice));
                          if (gas) txRequest.gasLimit = ethers.toBeHex(BigInt(gas));
                          if (nonce !== undefined) txRequest.nonce = Number(nonce);
                          
                          // Fill missing gas/gasPrice
                          if (!txRequest.gasPrice) {
                            const feeData = await provider.getFeeData();
                            if (feeData.gasPrice) txRequest.gasPrice = feeData.gasPrice;
                          }
                          if (!txRequest.gasLimit) {
                            const est = await provider.estimateGas({ 
                              from: await signer.getAddress(), 
                              ...txRequest 
                            });
                            txRequest.gasLimit = est;
                          }
                          
                          // Send transaction
                          const sentTx = await signer.sendTransaction(txRequest);
                          console.log('Transaction sent:', sentTx.hash);
                          
                          sendResponse({ 
                            success: true, 
                            result: sentTx.hash 
                          });
                          
                        } catch (error) {
                          console.error('Transaction failed:', error);
                          sendResponse({ 
                            success: false, 
                            error: error instanceof Error ? error.message : 'Transaction failed' 
                          });
                        }
                      });
                    } catch (error) {
                      sendResponse({ success: false, error: 'Failed to load ethers library' });
                    }
                    return;
                  }
                  case 'eth_signTransaction': {
                    console.log('Background: Processing eth_signTransaction');
                    
                    const txParams = params[0];
                    const { to, value, data, gas, gasPrice, nonce } = txParams;
                    
                    try {
                      const { ethers } = await import('ethers');
                      
                      chrome.storage.local.get(['currentWallet', 'wallets'], async (walletResult) => {
                        try {
                          const wallets = walletResult.wallets || [];
                          const currentWallet = walletResult.currentWallet;
                          
                          if (!currentWallet || !wallets.length) {
                            sendResponse({ success: false, error: 'No wallet available' });
                            return;
                          }
                          
                          const wallet = wallets.find((w: any) => w.id === currentWallet) || wallets[0];
                          if (!wallet || !wallet.privateKey) {
                            sendResponse({ success: false, error: 'No private key available' });
                            return;
                          }
                          
                          const signer = new ethers.Wallet(wallet.privateKey);
                          
                          // Build transaction
                          const txRequest: any = {
                            to: to || undefined,
                            data: data || '0x'
                          };
                          
                          if (value) txRequest.value = ethers.toBeHex(BigInt(value));
                          if (gasPrice) txRequest.gasPrice = ethers.toBeHex(BigInt(gasPrice));
                          if (gas) txRequest.gasLimit = ethers.toBeHex(BigInt(gas));
                          if (nonce !== undefined) txRequest.nonce = Number(nonce);
                          
                          // Sign transaction (don't send)
                          const signedTx = await signer.signTransaction(txRequest);
                          console.log('Transaction signed');
                          
                          sendResponse({ 
                            success: true, 
                            result: signedTx 
                          });
                          
                        } catch (error) {
                          console.error('Transaction signing failed:', error);
                          sendResponse({ 
                            success: false, 
                            error: error instanceof Error ? error.message : 'Transaction signing failed' 
                          });
                        }
                      });
                    } catch (error) {
                      sendResponse({ success: false, error: 'Failed to load ethers library' });
                    }
                    return;
                  }
                  case 'personal_sign': {
                    console.log('Background: Processing personal_sign');
                    
                    const message = params[0];
                    const address = params[1];
                    
                    try {
                      const { ethers } = await import('ethers');
                      
                      chrome.storage.local.get(['currentWallet', 'wallets'], async (walletResult) => {
                        try {
                          const wallets = walletResult.wallets || [];
                          const currentWallet = walletResult.currentWallet;
                          
                          if (!currentWallet || !wallets.length) {
                            sendResponse({ success: false, error: 'No wallet available' });
                            return;
                          }
                          
                          const wallet = wallets.find((w: any) => w.id === currentWallet) || wallets[0];
                          if (!wallet || !wallet.privateKey) {
                            sendResponse({ success: false, error: 'No private key available' });
                            return;
                          }
                          
                          const signer = new ethers.Wallet(wallet.privateKey);
                          
                          // Sign personal message
                          const signature = await signer.signMessage(message);
                          console.log('Message signed');
                          
                          sendResponse({ 
                            success: true, 
                            result: signature 
                          });
                          
                        } catch (error) {
                          console.error('Message signing failed:', error);
                          sendResponse({ 
                            success: false, 
                            error: error instanceof Error ? error.message : 'Message signing failed' 
                          });
                        }
                      });
                    } catch (error) {
                      sendResponse({ success: false, error: 'Failed to load ethers library' });
                    }
                    return;
                  }
                  case 'eth_signTypedData':
                  case 'eth_signTypedData_v3':
                  case 'eth_signTypedData_v4': {
                    console.log('Background: Processing', method);
                    
                    const address = params[0];
                    const typedData = params[1];
                    
                    try {
                      const { ethers } = await import('ethers');
                      
                      chrome.storage.local.get(['currentWallet', 'wallets'], async (walletResult) => {
                        try {
                          const wallets = walletResult.wallets || [];
                          const currentWallet = walletResult.currentWallet;
                          
                          if (!currentWallet || !wallets.length) {
                            sendResponse({ success: false, error: 'No wallet available' });
                            return;
                          }
                          
                          const wallet = wallets.find((w: any) => w.id === currentWallet) || wallets[0];
                          if (!wallet || !wallet.privateKey) {
                            sendResponse({ success: false, error: 'No private key available' });
                            return;
                          }
                          
                          const signer = new ethers.Wallet(wallet.privateKey);
                          
                          // Parse typed data
                          const parsedData = typeof typedData === 'string' ? JSON.parse(typedData) : typedData;
                          
                          // Sign typed data
                          const signature = await signer.signTypedData(
                            parsedData.domain,
                            parsedData.types,
                            parsedData.message
                          );
                          console.log('Typed data signed');
                          
                          sendResponse({ 
                            success: true, 
                            result: signature 
                          });
                          
                        } catch (error) {
                          console.error('Typed data signing failed:', error);
                          sendResponse({ 
                            success: false, 
                            error: error instanceof Error ? error.message : 'Typed data signing failed' 
                          });
                        }
                      });
                    } catch (error) {
                      sendResponse({ success: false, error: 'Failed to load ethers library' });
                    }
                    return;
                  }
                  case 'eth_sign': {
                    console.log('Background: Processing eth_sign');
                    
                    const address = params[0];
                    const data = params[1];
                    
                    try {
                      const { ethers } = await import('ethers');
                      
                      chrome.storage.local.get(['currentWallet', 'wallets'], async (walletResult) => {
                        try {
                          const wallets = walletResult.wallets || [];
                          const currentWallet = walletResult.currentWallet;
                          
                          if (!currentWallet || !wallets.length) {
                            sendResponse({ success: false, error: 'No wallet available' });
                            return;
                          }
                          
                          const wallet = wallets.find((w: any) => w.id === currentWallet) || wallets[0];
                          if (!wallet || !wallet.privateKey) {
                            sendResponse({ success: false, error: 'No private key available' });
                            return;
                          }
                          
                          const signer = new ethers.Wallet(wallet.privateKey);
                          
                          // Sign raw data
                          const signature = await signer.signMessage(ethers.getBytes(data));
                          console.log('Data signed');
                          
                          sendResponse({ 
                            success: true, 
                            result: signature 
                          });
                          
                        } catch (error) {
                          console.error('Data signing failed:', error);
                          sendResponse({ 
                            success: false, 
                            error: error instanceof Error ? error.message : 'Data signing failed' 
                          });
                        }
                      });
                    } catch (error) {
                      sendResponse({ success: false, error: 'Failed to load ethers library' });
                    }
                    return;
                  }
                  default:
                    sendResponse({ success: false, error: `Unsupported method: ${method}` });
                }
              } catch (err) {
                console.error('WALLET_REQUEST error:', err);
                sendResponse({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
              }
            });
            return true;
          }
            
          default:
            sendResponse({ 
              success: false, 
              error: 'Unknown message type' 
            });
        }
      } catch (error) {
        console.error('Error handling message:', error);
        sendResponse({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
      
      return true; // Keep message channel open for async response
    });
    
    // Handle alarms
    chrome.alarms.onAlarm.addListener((alarm) => {
      console.log('Alarm triggered:', alarm.name);
    });
    
    // Handle storage changes
    chrome.storage.local.onChanged.addListener((changes) => {
      console.log('Storage changed:', Object.keys(changes));
    });
    
    isInitialized = true;
    console.log('Background script initialized successfully');
    
  }, 'background initialization');
}

// Start initialization
initializeBackground();

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension startup');
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('Service worker activated');
});

// Handle service worker installation
self.addEventListener('install', (event) => {
  console.log('Service worker installed');
});

console.log('PayCio Wallet background script loaded'); 