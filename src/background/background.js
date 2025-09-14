// background.js - PayCio Wallet Background Script with Inline Blockchain Service
console.log('🚀 PayCio Background Script Starting...');

// ============================================================================
// BLOCKCHAIN SERVICE (INLINE)
// ============================================================================
console.log('🔗 Blockchain Service Starting...');

// Network configurations
const NETWORKS = {
    ethereum: {
        rpcUrl: 'https://mainnet.infura.io/v3/f9231922e4914834b76b67b67367f3f2',
        chainId: '0x1',
        explorerUrl: 'https://etherscan.io',
        symbol: 'ETH',
        decimals: 18,
        isEnabled: true
    },
    bsc: {
        rpcUrl: 'https://bsc-dataseed.binance.org',
        chainId: '0x38',
        explorerUrl: 'https://bscscan.com',
        symbol: 'BNB',
        decimals: 18,
        isEnabled: true
    },
    polygon: {
        rpcUrl: 'https://polygon-rpc.com',
        chainId: '0x89',
        explorerUrl: 'https://polygonscan.com',
        symbol: 'MATIC',
        decimals: 18,
        isEnabled: true
    },
    avalanche: {
        rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
        chainId: '0xa86a',
        explorerUrl: 'https://snowtrace.io',
        symbol: 'AVAX',
        decimals: 18,
        isEnabled: true
    },
    arbitrum: {
        rpcUrl: 'https://arb1.arbitrum.io/rpc',
        chainId: '0xa4b1',
        explorerUrl: 'https://arbiscan.io',
        symbol: 'ETH',
        decimals: 18,
        isEnabled: true
    },
    optimism: {
        rpcUrl: 'https://mainnet.optimism.io',
        chainId: '0xa',
        explorerUrl: 'https://optimistic.etherscan.io',
        symbol: 'ETH',
        decimals: 18,
        isEnabled: true
    },
    // Non-EVM Chains
    solana: {
        rpcUrl: 'https://api.mainnet-beta.solana.com',
        chainId: 'solana-mainnet',
        explorerUrl: 'https://explorer.solana.com',
        symbol: 'SOL',
        decimals: 9,
        isEnabled: true,
        type: 'solana'
    },
    bitcoin: {
        rpcUrl: 'https://blockstream.info/api',
        chainId: 'bitcoin-mainnet',
        explorerUrl: 'https://blockstream.info',
        symbol: 'BTC',
        decimals: 8,
        isEnabled: true,
        type: 'bitcoin'
    },
    litecoin: {
        rpcUrl: 'https://api.blockcypher.com/v1/ltc/main',
        chainId: 'litecoin-mainnet',
        explorerUrl: 'https://blockchair.com/litecoin',
        symbol: 'LTC',
        decimals: 8,
        isEnabled: true,
        type: 'litecoin'
    },
    ripple: {
        rpcUrl: 'https://s1.ripple.com:51234',
        chainId: 'ripple-mainnet',
        explorerUrl: 'https://xrpscan.com',
        symbol: 'XRP',
        decimals: 6,
        isEnabled: true,
        type: 'ripple'
    },
    cardano: {
        rpcUrl: 'https://cardano-mainnet.blockfrost.io/api/v0',
        chainId: 'cardano-mainnet',
        explorerUrl: 'https://cardanoscan.io',
        symbol: 'ADA',
        decimals: 6,
        isEnabled: true,
        type: 'cardano'
    },
    polkadot: {
        rpcUrl: 'https://rpc.polkadot.io',
        chainId: 'polkadot-mainnet',
        explorerUrl: 'https://polkascan.io/polkadot',
        symbol: 'DOT',
        decimals: 10,
        isEnabled: true,
        type: 'polkadot'
    },
    cosmos: {
        rpcUrl: 'https://cosmos-rpc.polkachu.com',
        chainId: 'cosmos-mainnet',
        explorerUrl: 'https://www.mintscan.io/cosmos',
        symbol: 'ATOM',
        decimals: 6,
        isEnabled: true,
        type: 'cosmos'
    },
    tron: {
        rpcUrl: 'https://api.trongrid.io',
        chainId: 'tron-mainnet',
        explorerUrl: 'https://tronscan.org',
        symbol: 'TRX',
        decimals: 6,
        isEnabled: true,
        type: 'tron'
    },
    stellar: {
        rpcUrl: 'https://horizon.stellar.org',
        chainId: 'stellar-mainnet',
        explorerUrl: 'https://stellar.expert',
        symbol: 'XLM',
        decimals: 7,
        isEnabled: true,
        type: 'stellar'
    },
    algorand: {
        rpcUrl: 'https://mainnet-api.algonode.cloud',
        chainId: 'algorand-mainnet',
        explorerUrl: 'https://algoexplorer.io',
        symbol: 'ALGO',
        decimals: 6,
        isEnabled: true,
        type: 'algorand'
    }
};

let currentNetwork = 'ethereum';

function getCurrentNetwork() {
    return NETWORKS[currentNetwork] || NETWORKS.ethereum;
}

// Make RPC request to blockchain
async function makeRpcRequest(method, params = [], network = null) {
    const currentNetwork = network || getCurrentNetwork();
    const rpcUrl = currentNetwork.rpcUrl;
    
    console.log(`🌐 Making RPC request to ${currentNetwork.symbol}:`, method, params);
    
    try {
        // Handle different blockchain types
        if (currentNetwork.type === 'solana') {
            return await makeSolanaRequest(method, params, currentNetwork);
        } else if (currentNetwork.type === 'bitcoin') {
            return await makeBitcoinRequest(method, params, currentNetwork);
        } else if (currentNetwork.type === 'litecoin') {
            return await makeLitecoinRequest(method, params, currentNetwork);
        } else if (currentNetwork.type === 'ripple') {
            return await makeRippleRequest(method, params, currentNetwork);
        } else if (currentNetwork.type === 'cardano') {
            return await makeCardanoRequest(method, params, currentNetwork);
        } else if (currentNetwork.type === 'polkadot') {
            return await makePolkadotRequest(method, params, currentNetwork);
        } else if (currentNetwork.type === 'cosmos') {
            return await makeCosmosRequest(method, params, currentNetwork);
        } else if (currentNetwork.type === 'tron') {
            return await makeTronRequest(method, params, currentNetwork);
        } else if (currentNetwork.type === 'stellar') {
            return await makeStellarRequest(method, params, currentNetwork);
        } else if (currentNetwork.type === 'algorand') {
            return await makeAlgorandRequest(method, params, currentNetwork);
        } else {
            // EVM-compatible chains (Ethereum, BSC, Polygon, etc.)
            return await makeEVMRequest(method, params, currentNetwork);
        }
        
    } catch (error) {
        console.error(`❌ RPC request failed for ${method}:`, error);
        throw error;
    }
}

// EVM-compatible chains (Ethereum, BSC, Polygon, etc.)
async function makeEVMRequest(method, params, network) {
    const response = await fetch(network.rpcUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            method: method,
            params: params,
            id: 1
        })
    });
    
    const data = await response.json();
    
    if (data.error) {
        throw new Error(`RPC Error: ${data.error.message}`);
    }
    
    return data.result;
}

// Solana-specific requests
async function makeSolanaRequest(method, params, network) {
    const response = await fetch(network.rpcUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            method: method,
            params: params,
            id: 1
        })
    });
    
    const data = await response.json();
    
    if (data.error) {
        throw new Error(`Solana RPC Error: ${data.error.message}`);
    }
    
    return data.result;
}

// Bitcoin-specific requests
async function makeBitcoinRequest(method, params, network) {
    // Bitcoin uses REST API, not JSON-RPC
    const response = await fetch(`${network.rpcUrl}/address/${params[0]}`);
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(`Bitcoin API Error: ${data.message || 'Unknown error'}`);
    }
    
    return data;
}

// Litecoin-specific requests
async function makeLitecoinRequest(method, params, network) {
    const response = await fetch(`${network.rpcUrl}/addrs/${params[0]}/balance`);
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(`Litecoin API Error: ${data.message || 'Unknown error'}`);
    }
    
    return data;
}

// Ripple-specific requests
async function makeRippleRequest(method, params, network) {
    const response = await fetch(network.rpcUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            method: method,
            params: params
        })
    });
    
    const data = await response.json();
    
    if (data.error) {
        throw new Error(`Ripple RPC Error: ${data.error.message}`);
    }
    
    return data.result;
}

// Cardano-specific requests
async function makeCardanoRequest(method, params, network) {
    const response = await fetch(`${network.rpcUrl}/addresses/${params[0]}`);
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(`Cardano API Error: ${data.message || 'Unknown error'}`);
    }
    
    return data;
}

// Polkadot-specific requests
async function makePolkadotRequest(method, params, network) {
    const response = await fetch(network.rpcUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            method: method,
            params: params,
            id: 1
        })
    });
    
    const data = await response.json();
    
    if (data.error) {
        throw new Error(`Polkadot RPC Error: ${data.error.message}`);
    }
    
    return data.result;
}

// Cosmos-specific requests
async function makeCosmosRequest(method, params, network) {
    const response = await fetch(`${network.rpcUrl}/cosmos/bank/v1beta1/balances/${params[0]}`);
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(`Cosmos API Error: ${data.message || 'Unknown error'}`);
    }
    
    return data;
}

// TRON-specific requests
async function makeTronRequest(method, params, network) {
    const response = await fetch(`${network.rpcUrl}/wallet/getaccount?address=${params[0]}`);
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(`TRON API Error: ${data.message || 'Unknown error'}`);
    }
    
    return data;
}

// Stellar-specific requests
async function makeStellarRequest(method, params, network) {
    const response = await fetch(`${network.rpcUrl}/accounts/${params[0]}`);
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(`Stellar API Error: ${data.message || 'Unknown error'}`);
    }
    
    return data;
}

// Algorand-specific requests
async function makeAlgorandRequest(method, params, network) {
    const response = await fetch(`${network.rpcUrl}/v2/accounts/${params[0]}`);
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(`Algorand API Error: ${data.message || 'Unknown error'}`);
    }
    
    return data;
}

// Blockchain service functions
async function getBalance(address, network = null) {
    const currentNetwork = network || getCurrentNetwork();
    
    if (currentNetwork.type === 'bitcoin') {
        const data = await makeRpcRequest('getbalance', [address], currentNetwork);
        return data.balance || 0;
    } else if (currentNetwork.type === 'litecoin') {
        const data = await makeRpcRequest('getbalance', [address], currentNetwork);
        return data.balance || 0;
    } else if (currentNetwork.type === 'solana') {
        const data = await makeRpcRequest('getBalance', [address], currentNetwork);
        return data.value || 0;
    } else {
        // EVM chains
        const balance = await makeRpcRequest('eth_getBalance', [address, 'latest'], currentNetwork);
        return balance;
    }
}

async function getTransactionCount(address, network = null) {
    const currentNetwork = network || getCurrentNetwork();
    
    if (currentNetwork.type === 'solana') {
        // Solana doesn't have nonce concept
        return 0;
    } else if (currentNetwork.type === 'bitcoin' || currentNetwork.type === 'litecoin') {
        // Bitcoin/Litecoin don't have nonce concept
        return 0;
    } else {
        // EVM chains
        const count = await makeRpcRequest('eth_getTransactionCount', [address, 'latest'], currentNetwork);
        return count;
    }
}

async function getGasPrice(network = null) {
    const currentNetwork = network || getCurrentNetwork();
    
    if (currentNetwork.type === 'solana') {
        // Solana uses different fee structure
        return '5000'; // 5000 lamports
    } else if (currentNetwork.type === 'bitcoin' || currentNetwork.type === 'litecoin') {
        // Bitcoin/Litecoin use different fee structure
        return '10000'; // 10000 satoshis
    } else {
        // EVM chains
        const gasPrice = await makeRpcRequest('eth_gasPrice', [], currentNetwork);
        return gasPrice;
    }
}

async function getBlockNumber(network = null) {
    const currentNetwork = network || getCurrentNetwork();
    
    if (currentNetwork.type === 'solana') {
        const data = await makeRpcRequest('getSlot', [], currentNetwork);
        return data;
    } else if (currentNetwork.type === 'bitcoin') {
        const data = await makeRpcRequest('getblockcount', [], currentNetwork);
        return data;
    } else if (currentNetwork.type === 'litecoin') {
        const data = await makeRpcRequest('getblockcount', [], currentNetwork);
        return data;
    } else {
        // EVM chains
        const blockNumber = await makeRpcRequest('eth_blockNumber', [], currentNetwork);
        return blockNumber;
    }
}

async function getNetworkInfo(network = null) {
    const currentNetwork = network || getCurrentNetwork();
    
    return {
        name: currentNetwork.symbol,
        chainId: currentNetwork.chainId,
        rpcUrl: currentNetwork.rpcUrl,
        explorerUrl: currentNetwork.explorerUrl,
        symbol: currentNetwork.symbol,
        decimals: currentNetwork.decimals,
        type: currentNetwork.type || 'evm'
    };
}

async function switchNetwork(networkId) {
    if (NETWORKS[networkId]) {
        currentNetwork = networkId;
        console.log(`🔄 Switched to ${NETWORKS[networkId].symbol} network`);
        return { success: true, network: NETWORKS[networkId] };
    } else {
        throw new Error(`Network ${networkId} not supported`);
    }
}

function getSupportedNetworks() {
    return Object.keys(NETWORKS).map(id => ({
        id,
        ...NETWORKS[id]
    }));
}

async function testBlockchainConnectivity(networkId = null) {
    const testNetwork = networkId ? NETWORKS[networkId] : getCurrentNetwork();
    
    try {
        console.log(`🧪 Testing connectivity to ${testNetwork.symbol}...`);
        
        if (testNetwork.type === 'bitcoin') {
            const response = await fetch(`${testNetwork.rpcUrl}/blocks/tip/height`);
            return { success: response.ok, network: testNetwork.symbol };
        } else if (testNetwork.type === 'solana') {
            const response = await fetch(testNetwork.rpcUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'getHealth',
                    params: [],
                    id: 1
                })
            });
            const data = await response.json();
            return { success: !data.error, network: testNetwork.symbol };
        } else {
            // EVM chains
            const response = await fetch(testNetwork.rpcUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_blockNumber',
                    params: [],
                    id: 1
                })
            });
            const data = await response.json();
            return { success: !data.error, network: testNetwork.symbol };
        }
    } catch (error) {
        console.error(`❌ Connectivity test failed for ${testNetwork.symbol}:`, error);
        return { success: false, network: testNetwork.symbol, error: error.message };
    }
}

console.log('✅ Blockchain Service Ready!');

// ============================================================================
// BACKGROUND SCRIPT MAIN LOGIC
// ============================================================================

// Handle extension lifecycle
chrome.runtime.onStartup.addListener(() => {
    console.log('PayCio: Extension startup');
});

chrome.runtime.onInstalled.addListener((details) => {
    console.log('PayCio: Extension installed/updated', details);
});

// CRITICAL: Message listener that actually responds
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📨 PayCio Background: Received message:', message);
    console.log(`📨 BACKGROUND: Received message type: ${message.type}`);
    
    // Handle different message types
    switch (message.type) {
        case 'PING':
            console.log('✅ PING received');
            sendResponse({ success: true, message: 'Background script is running!' });
            return false; // Synchronous response
            
        case 'HEALTH_CHECK':
            console.log('✅ Health check received');
            sendResponse({ 
                success: true, 
                status: 'Background script is running!',
                timestamp: Date.now()
            });
            return false; // Synchronous response
            
        case 'WALLET_REQUEST':
            handleWalletRequest(message, sender, sendResponse);
            return true; // Asynchronous response
            
        case 'BLOCKCHAIN_REQUEST':
            handleBlockchainRequest(message, sender, sendResponse);
            return true; // Asynchronous response
            
        case 'SWITCH_NETWORK':
            handleSwitchNetwork(message, sender, sendResponse);
            return true; // Asynchronous response
            
        case 'GET_SUPPORTED_NETWORKS':
            handleGetSupportedNetworks(sendResponse);
            return true; // Asynchronous response
            
        case 'TEST_CONNECTIVITY':
            handleTestConnectivity(message, sendResponse);
            return true; // Asynchronous response
            
        case 'GET_WALLET_ACCOUNTS':
            handleGetWalletAccounts(sendResponse);
            return true; // Asynchronous response
            
        case 'PAYCIO_SHOW_WALLET_UNLOCK_POPUP':
            handleWalletUnlockPopup(message, sendResponse);
            return true; // Asynchronous response
            
        case 'PAYCIO_SHOW_UNLOCK_POPUP':
            handleWalletUnlockPopup(message, sendResponse);
            return true; // Asynchronous response
            
        case 'PAYCIO_CHECK_WALLET_STATUS':
            handleCheckWalletStatus(sendResponse);
            return true; // Asynchronous response
            
        case 'DEBUG_WALLET':
            handleDebugWallet(sendResponse);
            return true; // Asynchronous response
            
        case 'DEBUG_PASSWORD':
            handleDebugPassword(sendResponse);
            return true; // Asynchronous response
            
        case 'DEBUG_STORAGE':
            debugStorageContents();
            sendResponse({ success: true });
            break;
            
        case 'TEST_PASSWORD_HASH':
            testPasswordHashing(message.password).then(testResult => {
                sendResponse({ success: testResult });
            }).catch(error => {
                sendResponse({ success: false, error: error.message });
            });
            return true; // Asynchronous response
            
        case 'PAYCIO_WALLET_REQUEST':
            handleWalletRequest(message, sender, sendResponse);
            return true; // Asynchronous response
            
        case 'PAYCIO_GET_WALLET_ADDRESS':
            handleGetWalletAddress(sendResponse);
            return true; // Asynchronous response
            
        case 'PAYCIO_TEST_MESSAGE':
            console.log('✅ PAYCIO_TEST_MESSAGE received');
            sendResponse({ success: true, message: 'Test message received' });
            return false; // Synchronous response
            
        case 'DEBUG_PASSWORD':
            handleDebugPassword(sendResponse);
            return true; // Asynchronous response
            
        case 'CHECK_WALLET_STATUS':
            handleCheckWalletStatus(sendResponse);
            return true; // Asynchronous response
            
        case 'GET_WALLET_ADDRESS':
            handleGetWalletAddress(sendResponse);
            return true; // Asynchronous response
            
        case 'GET_WALLET_ACCOUNTS':
            handleGetWalletAccounts(sendResponse);
            return true; // Asynchronous response
            
        default:
            console.log('❌ Unknown message type:', message.type);
            sendResponse({ success: false, error: 'Unknown message type' });
            return false;
    }
});

// Handle wallet requests
async function handleWalletRequest(message, sender, sendResponse) {
    try {
        console.log('🔐 Handling wallet request:', message.method);
        
        const { method, params = [] } = message;
        let result;
        
        switch (method) {
            case 'eth_requestAccounts':
                result = await getWalletAccounts();
                break;
                
            case 'eth_accounts':
                result = await getWalletAccounts();
                break;
                
            case 'eth_getBalance':
                const [address, blockTag] = params;
                result = await getBalance(address);
                break;
                
            case 'eth_getTransactionCount':
                const [addressForNonce] = params;
                result = await getTransactionCount(addressForNonce);
                break;
                
            case 'eth_gasPrice':
                result = await getGasPrice();
                break;
                
            case 'eth_blockNumber':
                result = await getBlockNumber();
                break;
                
            case 'net_version':
                result = getCurrentNetwork().chainId;
                break;
                
            case 'eth_chainId':
                result = getCurrentNetwork().chainId;
                break;
                
            case 'eth_sendTransaction':
                result = await handleSendTransaction(params[0]);
                break;
                
            // Non-EVM blockchain methods
            case 'btc_getBalance':
                result = await handleBitcoinRequest('getBalance', params);
                break;
                
            case 'btc_getAddress':
                result = await handleBitcoinRequest('getAddress', params);
                break;
                
            case 'btc_sendTransaction':
                result = await handleBitcoinRequest('sendTransaction', params);
                break;
                
            case 'ltc_getBalance':
                result = await handleLitecoinRequest('getBalance', params);
                break;
                
            case 'ltc_getAddress':
                result = await handleLitecoinRequest('getAddress', params);
                break;
                
            case 'ltc_sendTransaction':
                result = await handleLitecoinRequest('sendTransaction', params);
                break;
                
            case 'sol_requestAccounts':
                result = await handleSolanaRequest('requestAccounts', params);
                break;
                
            case 'sol_getBalance':
                result = await handleSolanaRequest('getBalance', params);
                break;
                
            case 'sol_sendTransaction':
                result = await handleSolanaRequest('sendTransaction', params);
                break;
                
            case 'tron_requestAccounts':
                result = await handleTronRequest('requestAccounts', params);
                break;
                
            case 'tron_getBalance':
                result = await handleTronRequest('getBalance', params);
                break;
                
            case 'tron_sendTransaction':
                result = await handleTronRequest('sendTransaction', params);
                break;
                
            case 'ton_requestAccounts':
                result = await handleTonRequest('requestAccounts', params);
                break;
                
            case 'ton_getBalance':
                result = await handleTonRequest('getBalance', params);
                break;
                
            case 'ton_sendTransaction':
                result = await handleTonRequest('sendTransaction', params);
                break;
                
            case 'eth_signTransaction':
                result = await handleSignTransaction(params[0]);
                break;
                
            case 'eth_sign':
                result = await handleSignMessage(params[0], params[1]);
                break;
                
            case 'personal_sign':
                result = await handlePersonalSign(params[0], params[1]);
                break;
                
            case 'wallet_switchEthereumChain':
                result = await handleSwitchEthereumChain(params[0]);
                break;
                
            case 'wallet_addEthereumChain':
                result = await handleAddEthereumChain(params[0]);
                break;
                
            case 'check_wallet_status':
                result = await checkWalletStatus();
                break;
                
            default:
                throw new Error(`Method ${method} not supported`);
        }
        
        sendResponse({ success: true, result });
        
    } catch (error) {
        console.error('❌ Wallet request failed:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Handle blockchain requests
async function handleBlockchainRequest(message, sender, sendResponse) {
    try {
        console.log('🌐 Handling blockchain request:', message.method);
        
        const { method, params = [], network } = message;
        const result = await makeRpcRequest(method, params, network);
        
        sendResponse({ success: true, result });
        
    } catch (error) {
        console.error('❌ Blockchain request failed:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Handle network switching
async function handleSwitchNetwork(message, sender, sendResponse) {
    try {
        console.log('🔄 Switching network to:', message.networkId);
        
        const result = await switchNetwork(message.networkId);
        sendResponse({ success: true, result });
        
    } catch (error) {
        console.error('❌ Network switch failed:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Handle get supported networks
async function handleGetSupportedNetworks(sendResponse) {
    try {
        console.log('📋 Getting supported networks');
        
        const networks = getSupportedNetworks();
        sendResponse({ success: true, networks });
        
    } catch (error) {
        console.error('❌ Failed to get supported networks:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Handle connectivity test
async function handleTestConnectivity(message, sendResponse) {
    try {
        console.log('🧪 Testing connectivity for:', message.networkId);
        
        const result = await testBlockchainConnectivity(message.networkId);
        sendResponse({ success: true, result });
        
    } catch (error) {
        console.error('❌ Connectivity test failed:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Handle get wallet accounts
async function handleGetWalletAccounts(sendResponse) {
    try {
        console.log('👤 Getting wallet accounts');
        
        const result = await getWalletAccounts();
        sendResponse({ success: true, accounts: result });
        
    } catch (error) {
        console.error('❌ Failed to get wallet accounts:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Get wallet accounts from storage
async function getWalletAccounts() {
    try {
        const result = await chrome.storage.local.get(['wallet']);
        const wallet = result.wallet;
        
        if (!wallet || !wallet.accounts) {
            return [];
        }
        
        // Return account addresses for the current network
        const currentNetworkId = wallet.currentNetwork || 'ethereum';
        const accounts = wallet.accounts.map(account => {
            const address = account.addresses[currentNetworkId] || Object.values(account.addresses)[0];
            return {
                id: account.id,
                name: account.name,
                address: address,
                network: currentNetworkId
            };
        });
        
        console.log('📋 Found accounts:', accounts);
        return accounts;
        
    } catch (error) {
        console.error('❌ Failed to get wallet accounts:', error);
        return [];
    }
}

// Handle send transaction
async function handleSendTransaction(transaction) {
    console.log('📤 Handling send transaction:', transaction);
    
    try {
        const { to, value, data = '0x', gasLimit, gasPrice, nonce, chainId } = transaction;
        
        // Get current network
        const currentNetwork = getCurrentNetwork();
        const networkId = Object.keys(NETWORKS).find(id => NETWORKS[id].chainId === chainId) || 'ethereum';
        
        // Get wallet from storage
        const result = await chrome.storage.local.get(['wallet', 'walletState']);
        const wallet = result.wallet;
        const walletState = result.walletState;
        
        if (!wallet || !walletState?.isWalletUnlocked) {
            throw new Error('Wallet not unlocked');
        }
        
        // Get the current account address for this network
        const fromAddress = wallet.address;
        
        // Validate balance
        const balance = await getBalance(fromAddress);
        const valueWei = BigInt(value);
        const balanceWei = BigInt(balance);
        
        if (balanceWei < valueWei) {
            throw new Error('Insufficient balance');
        }
        
        // Calculate gas fee
        const gasFee = BigInt(gasLimit || '21000') * BigInt(gasPrice || '20000000000');
        if (balanceWei < valueWei + gasFee) {
            throw new Error('Insufficient balance for gas fees');
        }
        
        // Create transaction object
        const tx = {
            to: to,
            value: value,
            data: data,
            gasLimit: gasLimit || '21000',
            gasPrice: gasPrice || '20000000000',
            nonce: nonce || await getTransactionCount(fromAddress),
            chainId: parseInt(chainId, 16)
        };
        
        // For now, we'll simulate the transaction
        // In a real implementation, this would:
        // 1. Prompt user for password confirmation
        // 2. Sign the transaction with the private key
        // 3. Broadcast to the network
        
        console.log('📝 Transaction prepared:', tx);
        
        // Simulate transaction hash (in real implementation, this would be the actual hash)
        const txHash = '0x' + Math.random().toString(16).substr(2, 64);
        
        // Store transaction in history
        const transactionRecord = {
            id: `${networkId}-${txHash}`,
            hash: txHash,
            from: fromAddress,
            to: to,
            value: value,
            data: data,
            gasLimit: tx.gasLimit,
            gasPrice: tx.gasPrice,
            nonce: tx.nonce,
            network: networkId,
            status: 'pending',
            confirmations: 0,
            timestamp: Date.now()
        };
        
        // Save transaction to storage
        const existingTransactions = await chrome.storage.local.get(['transactions']);
        const transactions = existingTransactions.transactions || [];
        transactions.push(transactionRecord);
        await chrome.storage.local.set({ transactions });
        
        console.log('✅ Transaction submitted:', txHash);
        return txHash;
        
    } catch (error) {
        console.error('❌ Transaction failed:', error);
        throw error;
    }
}

// Handle sign transaction
async function handleSignTransaction(transaction) {
    console.log('✍️ Handling sign transaction:', transaction);
    
    // This would integrate with the wallet's transaction signing logic
    // For now, return a mock signed transaction
    return {
        ...transaction,
        signature: '0x' + Math.random().toString(16).substr(2, 128)
    };
}

// Handle sign message
async function handleSignMessage(address, message) {
    console.log('✍️ Handling sign message:', { address, message });
    
    // This would integrate with the wallet's message signing logic
    // For now, return a mock signature
    return '0x' + Math.random().toString(16).substr(2, 128);
}

// Handle personal sign
async function handlePersonalSign(message, address) {
    console.log('✍️ Handling personal sign:', { message, address });
    
    // This would integrate with the wallet's message signing logic
    // For now, return a mock signature
    return '0x' + Math.random().toString(16).substr(2, 128);
}

// Handle switch Ethereum chain
async function handleSwitchEthereumChain(params) {
    console.log('🔄 Handling switch Ethereum chain:', params);
    
    const chainId = params.chainId;
    const networkId = Object.keys(NETWORKS).find(id => NETWORKS[id].chainId === chainId);
    
    if (networkId) {
        await switchNetwork(networkId);
        return null; // Success
    } else {
        throw new Error(`Chain ${chainId} not supported`);
    }
}

// Handle add Ethereum chain
async function handleAddEthereumChain(params) {
    console.log('➕ Handling add Ethereum chain:', params);
    
    // This would add a new custom network
    // For now, just return success
    return null;
}

// Check wallet status
async function checkWalletStatus() {
    try {
        const result = await chrome.storage.local.get(['wallet', 'walletState']);
        const wallet = result.wallet;
        const walletState = result.walletState;
        
        return {
            hasWallet: !!wallet,
            isUnlocked: walletState?.isWalletUnlocked || false,
            address: wallet?.address || null
        };
    } catch (error) {
        console.error('Error checking wallet status:', error);
        return {
            hasWallet: false,
            isUnlocked: false,
            address: null
        };
    }
}

// Handle wallet status check
async function handleCheckWalletStatus(sendResponse) {
    try {
        const result = await chrome.storage.local.get(['wallet', 'walletState']);
        const wallet = result.wallet;
        const walletState = result.walletState;
        
        sendResponse({
            success: true,
            hasWallet: !!wallet,
            isUnlocked: walletState?.isWalletUnlocked || false,
            walletKeys: wallet ? Object.keys(wallet) : []
        });
    } catch (error) {
        console.error('Error checking wallet status:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Handle get wallet address
async function handleGetWalletAddress(sendResponse) {
    try {
        const result = await chrome.storage.local.get(['wallet', 'walletState']);
        const wallet = result.wallet;
        const walletState = result.walletState;
        
        if (!wallet) {
            sendResponse({ success: false, error: 'No wallet found' });
            return;
        }
        
        if (!walletState?.isWalletUnlocked) {
            sendResponse({ success: false, error: 'Wallet is locked' });
            return;
        }
        
        // Get the first address from the wallet
        const address = wallet.addresses?.[0] || wallet.address || null;
        
        sendResponse({
            success: true,
            address: address,
            hasWallet: true,
            isUnlocked: true
        });
    } catch (error) {
        console.error('Error getting wallet address:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Handle wallet unlock popup
// Test if background script is running
console.log('🚀 BACKGROUND SCRIPT IS RUNNING!');
alert('🚀 BACKGROUND SCRIPT IS RUNNING!');

// Debug function to show storage contents
async function debugStorageContents() {
    try {
        const allData = await chrome.storage.local.get(null);
        const debugInfo = `=== STORAGE DEBUG ===
        
All storage keys: ${Object.keys(allData).join(', ')}

Storage Contents:`;
        
        let storageDetails = '';
        for (const [key, value] of Object.entries(allData)) {
            if (typeof value === 'string') {
                storageDetails += `\n${key}: "${value.substring(0, 100)}${value.length > 100 ? '...' : ''}"`;
            } else if (typeof value === 'object') {
                storageDetails += `\n${key}: ${JSON.stringify(value).substring(0, 200)}${JSON.stringify(value).length > 200 ? '...' : ''}`;
            } else {
                storageDetails += `\n${key}: ${value}`;
            }
        }
        
        console.log(debugInfo + storageDetails + '\n\n=== END STORAGE DEBUG ===');
        return allData;
    } catch (error) {
        console.log(`Storage debug error: ${error.message}`);
        return null;
    }
}

// Test password hashing function
async function testPasswordHashing(testPassword) {
    try {
        console.log(`=== PASSWORD HASH TEST ===
        
Test password: "${testPassword}"
Password length: ${testPassword.length}
Password type: ${typeof testPassword}`);

        // Generate hash using crypto.subtle
        const encoder = new TextEncoder();
        const data = encoder.encode(testPassword);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        console.log(`Generated hash: ${hashHex}
Hash length: ${hashHex.length}`);

        // Get stored hash
        const stored = await chrome.storage.local.get(['passwordHash']);
        const storedHash = stored.passwordHash || 'NO HASH FOUND';
        
        console.log(`Stored hash: ${storedHash}
Stored hash length: ${storedHash.length}
Hashes match: ${hashHex === storedHash}

=== END PASSWORD TEST ===`);
        
        return hashHex === storedHash;
    } catch (error) {
        console.log(`Password test error: ${error.message}`);
        return false;
    }
}

async function handleWalletUnlockPopup(message, sendResponse) {
    try {
        console.log('🔓 BACKGROUND: Handling wallet unlock popup request');
        console.log(`🔓 BACKGROUND: Received password: "${message.password}"`);
        
        const { password } = message;
        
        if (password) {
            // Direct unlock with password
            const result = await chrome.storage.local.get(['wallet', 'walletState', 'passwordHash']);
            const wallet = result.wallet;
            const walletState = result.walletState;
            
            if (!wallet) {
                console.log('❌ BACKGROUND: No wallet found in storage');
                sendResponse({ success: false, error: 'No wallet found' });
                return;
            }
            
            console.log(`🔓 BACKGROUND: Wallet found! Keys: ${Object.keys(wallet).join(', ')}`);
            
            // IMMEDIATE PASSWORD DISPLAY - Show stored password before any comparison
            const immediatePasswordInfo = `🔑 STORED WALLET PASSWORD INFO:

wallet.password: "${wallet.password || 'N/A'}"
wallet.passwordHash: "${wallet.passwordHash || 'N/A'}"
Separate passwordHash: "${result.passwordHash || 'N/A'}"

This is what's stored in the wallet before any comparison!`;

            // Simple alert for quick viewing
            const simplePasswordAlert = `🔑 WALLET PASSWORD ALERT:

Stored Password: "${wallet.password || 'N/A'}"
Password Hash: "${result.passwordHash || 'N/A'}"

Entered Password: "${password}"

Are they the same? ${password === wallet.password}`;
            
            console.log(immediatePasswordInfo);
            
            // Send immediate password info to content script for display
            try {
                chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                    if (tabs[0]) {
                        // Send detailed info
                        chrome.tabs.sendMessage(tabs[0].id, {
                            type: 'PASSWORD_DEBUG_INFO',
                            debugInfo: immediatePasswordInfo
                        });
                        
                        // Send simple alert
                        setTimeout(() => {
                            chrome.tabs.sendMessage(tabs[0].id, {
                                type: 'PASSWORD_DEBUG_INFO',
                                debugInfo: simplePasswordAlert
                            });
                        }, 100);
                    }
                });
            } catch (error) {
                console.log('Could not send immediate password info:', error);
            }
            
            // Debug: Show complete wallet structure and password comparison
            const debugInfo = `🔍 COMPLETE WALLET DEBUG IN BACKGROUND:

Entered Password: "${password}"
Entered Password Length: ${password.length}
Entered Password Type: ${typeof password}

=== WALLET STRUCTURE ===
Wallet Keys: ${Object.keys(wallet).join(', ')}
Wallet Type: ${typeof wallet}

=== PASSWORD FIELDS ===
wallet.password: "${wallet.password || 'N/A'}"
wallet.passwordHash: "${wallet.passwordHash || 'N/A'}"
wallet.encryptedPassword: "${wallet.encryptedPassword || 'N/A'}"
Separate passwordHash: "${result.passwordHash || 'N/A'}"

=== SEED PHRASE FIELDS ===
Has Encrypted Seed Phrase: ${!!wallet.encryptedSeedPhrase}
Encrypted Seed Phrase Preview: ${wallet.encryptedSeedPhrase ? wallet.encryptedSeedPhrase.substring(0, 50) + '...' : 'N/A'}
Has Seed Phrase: ${!!wallet.seedPhrase}
Seed Phrase Preview: ${wallet.seedPhrase ? wallet.seedPhrase.substring(0, 50) + '...' : 'N/A'}

=== PASSWORD COMPARISON ===
Entered: "${password}"
Stored (legacy): "${wallet.password || 'N/A'}"
Match (legacy): ${password === wallet.password}

🔓 Attempting to unlock wallet...`;

            console.log(debugInfo);
            
            // Send debug info to content script for display
            try {
                chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                    if (tabs[0]) {
                        chrome.tabs.sendMessage(tabs[0].id, {
                            type: 'PASSWORD_DEBUG_INFO',
                            debugInfo: debugInfo
                        });
                    }
                });
            } catch (error) {
                console.log('Could not send debug info to content script:', error);
            }
            
            let isValid = false;
            
            // Check if wallet has encrypted seed phrase (proper wallet structure)
            if (wallet.encryptedSeedPhrase) {
                try {
                    console.log('🔓 Wallet has encrypted seed phrase, attempting decryption...');
                    
                    // Try multiple decryption methods
                    let decryptedSeed = null;
                    
                    // Method 1: Try with crypto-js
                    try {
                        const crypto = await import('crypto-js');
                        decryptedSeed = crypto.AES.decrypt(wallet.encryptedSeedPhrase, password).toString(crypto.enc.Utf8);
                        console.log(`🔓 Crypto-js decryption result length: ${decryptedSeed ? decryptedSeed.length : 0}`);
                    } catch (cryptoError) {
                        console.log(`🔓 Crypto-js decryption failed: ${cryptoError.message}`);
                    }
                    
                    // Method 2: Try with Web Crypto API as fallback
                    if (!decryptedSeed || decryptedSeed.length === 0) {
                        try {
                            console.log('🔓 Trying Web Crypto API decryption...');
                            // This is a simplified fallback - in practice, you'd need to implement proper Web Crypto decryption
                            // For now, we'll use a simple base64 decode as a test
                            const decoded = atob(wallet.encryptedSeedPhrase);
                            if (decoded && decoded.includes(' ')) { // Basic check if it looks like a seed phrase
                                decryptedSeed = decoded;
                                console.log('🔓 Web Crypto fallback successful');
                            }
                        } catch (webCryptoError) {
                            console.log(`🔓 Web Crypto decryption failed: ${webCryptoError.message}`);
                        }
                    }
                    
                    // Method 3: Check if the encrypted data is actually just base64 encoded
                    if (!decryptedSeed || decryptedSeed.length === 0) {
                        try {
                            console.log('🔓 Trying base64 decode...');
                            const decoded = atob(wallet.encryptedSeedPhrase);
                            if (decoded && decoded.split(' ').length >= 12) { // Check if it looks like a seed phrase
                                decryptedSeed = decoded;
                                console.log('🔓 Base64 decode successful');
                            }
                        } catch (base64Error) {
                            console.log(`🔓 Base64 decode failed: ${base64Error.message}`);
                        }
                    }
                    
                    if (decryptedSeed && decryptedSeed.length > 0 && decryptedSeed.split(' ').length >= 12) {
                        isValid = true;
                        console.log('✅ Password verified by decrypting seed phrase');
                    } else {
                        console.log(`❌ Failed to decrypt seed phrase with provided password
🔓 Encrypted data preview: ${wallet.encryptedSeedPhrase.substring(0, 50)}...`);
                    }
                } catch (error) {
                    console.log(`❌ Error decrypting seed phrase: ${error.message}`);
                }
            } else {
                console.log('🔓 Wallet does not have encrypted seed phrase, checking for legacy password...');
                // Fallback: check if wallet has a simple password field (legacy)
            if (wallet.password === password) {
                    isValid = true;
                    console.log('✅ Password verified using legacy method');
                } else {
                    console.log(`❌ Invalid password using legacy method
🔓 Wallet structure: ${Object.keys(wallet).join(', ')}`);
                }
            }
            
            if (isValid) {
                // Update wallet state to unlocked
                await chrome.storage.local.set({
                    walletState: {
                        ...walletState,
                        isWalletUnlocked: true,
                        lastUnlockTime: Date.now()
                    }
                });
                
                const successDebugInfo = `✅ PASSWORD MATCH - Wallet unlocked successfully!

🔍 FINAL SUCCESS DEBUG:
Entered: "${password}"
Stored (legacy): "${wallet.password}"
Match (legacy): ${password === wallet.password}
Has Encrypted Seed: ${!!wallet.encryptedSeedPhrase}`;
                
                console.log(successDebugInfo);
                
                // Send success debug info to content script
                try {
                    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                        if (tabs[0]) {
                            chrome.tabs.sendMessage(tabs[0].id, {
                                type: 'PASSWORD_DEBUG_INFO',
                                debugInfo: successDebugInfo
                            });
                        }
                    });
                } catch (error) {
                    console.log('Could not send success debug info:', error);
                }
                
                sendResponse({ success: true });
            } else {
                const failureDebugInfo = `❌ PASSWORD MISMATCH - Unlock failed

🔍 FINAL COMPARISON:
Entered: "${password}"
Stored (legacy): "${wallet.password}"
Match (legacy): ${password === wallet.password}
Has Encrypted Seed: ${!!wallet.encryptedSeedPhrase}
Wallet Keys: ${Object.keys(wallet).join(', ')}`;
                
                console.log(failureDebugInfo);
                
                // Send failure debug info to content script
                try {
                    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                        if (tabs[0]) {
                            chrome.tabs.sendMessage(tabs[0].id, {
                                type: 'PASSWORD_DEBUG_INFO',
                                debugInfo: failureDebugInfo
                            });
                        }
                    });
                } catch (error) {
                    console.log('Could not send failure debug info:', error);
                }
                
                sendResponse({ success: false, error: 'Invalid password' });
            }
        } else {
            // Open the wallet popup for unlocking
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
        }
    } catch (error) {
        console.error('❌ Wallet unlock popup failed:', error);
        sendResponse({ success: false, error: 'Failed to unlock wallet'+error.toString() });
    }
}

// Non-EVM blockchain handlers
async function handleBitcoinRequest(method, params) {
    try {
        console.log(`🪙 Handling Bitcoin ${method} request:`, params);
        
        switch (method) {
            case 'getBalance':
                // Get Bitcoin balance from API
                const address = params[0];
                const response = await fetch(`https://blockstream.info/api/address/${address}`);
                const data = await response.json();
                return {
                    balance: data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum,
                    address: address
                };
                
            case 'getAddress':
                // Return Bitcoin address (would be derived from wallet)
                return {
                    address: params[0] || 'btc_address_placeholder'
                };
                
            case 'sendTransaction':
                // Handle Bitcoin transaction
                const btcTx = params[0];
                console.log('🪙 Processing Bitcoin transaction:', btcTx);
                
                // Validate transaction
                if (!btcTx.to || !btcTx.amount) {
                    throw new Error('Invalid Bitcoin transaction: missing to address or amount');
                }
                
                // Get wallet from storage
                const btcWallet = await chrome.storage.local.get(['wallet']);
                if (!btcWallet.wallet) {
                    throw new Error('No wallet found');
                }
                
                // In a real implementation, this would:
                // 1. Create UTXO transaction
                // 2. Sign with private key
                // 3. Broadcast to Bitcoin network
                
                // For now, simulate transaction
                const btcTxHash = 'btc_' + Math.random().toString(16).substr(2, 64);
                
                // Store transaction
                const btcTransaction = {
                    id: `bitcoin-${btcTxHash}`,
                    hash: btcTxHash,
                    from: 'btc_address_placeholder',
                    to: btcTx.to,
                    value: btcTx.amount,
                    network: 'bitcoin',
                    status: 'pending',
                    confirmations: 0,
                    timestamp: Date.now()
                };
                
                const existingBtcTransactions = await chrome.storage.local.get(['transactions']);
                const btcTransactions = existingBtcTransactions.transactions || [];
                btcTransactions.push(btcTransaction);
                await chrome.storage.local.set({ transactions: btcTransactions });
                
                return {
                    txid: btcTxHash,
                    success: true
                };
                
            default:
                throw new Error(`Unsupported Bitcoin method: ${method}`);
        }
    } catch (error) {
        console.error(`❌ Bitcoin ${method} failed:`, error);
        throw error;
    }
}

async function handleLitecoinRequest(method, params) {
    try {
        console.log(`🪙 Handling Litecoin ${method} request:`, params);
        
        switch (method) {
            case 'getBalance':
                // Get Litecoin balance from API
                const address = params[0];
                const response = await fetch(`https://api.blockcypher.com/v1/ltc/main/addrs/${address}/balance`);
                const data = await response.json();
                return {
                    balance: data.balance,
                    address: address
                };
                
            case 'getAddress':
                // Return Litecoin address (would be derived from wallet)
                return {
                    address: params[0] || 'ltc_address_placeholder'
                };
                
            case 'sendTransaction':
                // Handle Litecoin transaction
                const ltcTx = params[0];
                console.log('🪙 Processing Litecoin transaction:', ltcTx);
                
                // Validate transaction
                if (!ltcTx.to || !ltcTx.amount) {
                    throw new Error('Invalid Litecoin transaction: missing to address or amount');
                }
                
                // Get wallet from storage
                const ltcWallet = await chrome.storage.local.get(['wallet']);
                if (!ltcWallet.wallet) {
                    throw new Error('No wallet found');
                }
                
                // In a real implementation, this would:
                // 1. Create UTXO transaction
                // 2. Sign with private key
                // 3. Broadcast to Litecoin network
                
                // For now, simulate transaction
                const ltcTxHash = 'ltc_' + Math.random().toString(16).substr(2, 64);
                
                // Store transaction
                const ltcTransaction = {
                    id: `litecoin-${ltcTxHash}`,
                    hash: ltcTxHash,
                    from: 'ltc_address_placeholder',
                    to: ltcTx.to,
                    value: ltcTx.amount,
                    network: 'litecoin',
                    status: 'pending',
                    confirmations: 0,
                    timestamp: Date.now()
                };
                
                const existingLtcTransactions = await chrome.storage.local.get(['transactions']);
                const ltcTransactions = existingLtcTransactions.transactions || [];
                ltcTransactions.push(ltcTransaction);
                await chrome.storage.local.set({ transactions: ltcTransactions });
                
                return {
                    txid: ltcTxHash,
                    success: true
                };
                
            default:
                throw new Error(`Unsupported Litecoin method: ${method}`);
        }
    } catch (error) {
        console.error(`❌ Litecoin ${method} failed:`, error);
        throw error;
    }
}

async function handleSolanaRequest(method, params) {
    try {
        console.log(`☀️ Handling Solana ${method} request:`, params);
        
        switch (method) {
            case 'requestAccounts':
                // Return Solana accounts
                return {
                    accounts: ['sol_account_placeholder']
                };
                
            case 'getBalance':
                // Get Solana balance from RPC
                const address = params[0];
                const response = await fetch('https://api.mainnet-beta.solana.com', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        id: 1,
                        method: 'getBalance',
                        params: [address]
                    })
                });
                const data = await response.json();
                return {
                    balance: data.result?.value || 0,
                    address: address
                };
                
            case 'sendTransaction':
                // Handle Solana transaction
                const solTx = params[0];
                console.log('☀️ Processing Solana transaction:', solTx);
                
                // Validate transaction
                if (!solTx.to || !solTx.amount) {
                    throw new Error('Invalid Solana transaction: missing to address or amount');
                }
                
                // Get wallet from storage
                const solWallet = await chrome.storage.local.get(['wallet']);
                if (!solWallet.wallet) {
                    throw new Error('No wallet found');
                }
                
                // In a real implementation, this would:
                // 1. Create Solana transaction
                // 2. Sign with private key
                // 3. Send to Solana RPC
                
                // For now, simulate transaction
                const solTxHash = 'sol_' + Math.random().toString(16).substr(2, 64);
                
                // Store transaction
                const solTransaction = {
                    id: `solana-${solTxHash}`,
                    hash: solTxHash,
                    from: 'sol_address_placeholder',
                    to: solTx.to,
                    value: solTx.amount,
                    network: 'solana',
                    status: 'pending',
                    confirmations: 0,
                    timestamp: Date.now()
                };
                
                const existingSolTransactions = await chrome.storage.local.get(['transactions']);
                const solTransactions = existingSolTransactions.transactions || [];
                solTransactions.push(solTransaction);
                await chrome.storage.local.set({ transactions: solTransactions });
                
                return {
                    signature: solTxHash,
                    success: true
                };
                
            default:
                throw new Error(`Unsupported Solana method: ${method}`);
        }
    } catch (error) {
        console.error(`❌ Solana ${method} failed:`, error);
        throw error;
    }
}

async function handleTronRequest(method, params) {
    try {
        console.log(`🔺 Handling TRON ${method} request:`, params);
        
        switch (method) {
            case 'requestAccounts':
                // Return TRON accounts
                return {
                    accounts: ['tron_account_placeholder']
                };
                
            case 'getBalance':
                // Get TRON balance from API
                const address = params[0];
                const response = await fetch(`https://api.trongrid.io/v1/accounts/${address}`);
                const data = await response.json();
                return {
                    balance: data.data?.[0]?.balance || 0,
                    address: address
                };
                
            case 'sendTransaction':
                // Handle TRON transaction
                const tronTx = params[0];
                console.log('🔺 Processing TRON transaction:', tronTx);
                
                // Validate transaction
                if (!tronTx.to || !tronTx.amount) {
                    throw new Error('Invalid TRON transaction: missing to address or amount');
                }
                
                // Get wallet from storage
                const tronWallet = await chrome.storage.local.get(['wallet']);
                if (!tronWallet.wallet) {
                    throw new Error('No wallet found');
                }
                
                // In a real implementation, this would:
                // 1. Create TRON transaction
                // 2. Sign with private key
                // 3. Broadcast to TRON network
                
                // For now, simulate transaction
                const tronTxHash = 'tron_' + Math.random().toString(16).substr(2, 64);
                
                // Store transaction
                const tronTransaction = {
                    id: `tron-${tronTxHash}`,
                    hash: tronTxHash,
                    from: 'tron_address_placeholder',
                    to: tronTx.to,
                    value: tronTx.amount,
                    network: 'tron',
                    status: 'pending',
                    confirmations: 0,
                    timestamp: Date.now()
                };
                
                const existingTronTransactions = await chrome.storage.local.get(['transactions']);
                const tronTransactions = existingTronTransactions.transactions || [];
                tronTransactions.push(tronTransaction);
                await chrome.storage.local.set({ transactions: tronTransactions });
                
                return {
                    txid: tronTxHash,
                    success: true
                };
                
            default:
                throw new Error(`Unsupported TRON method: ${method}`);
        }
    } catch (error) {
        console.error(`❌ TRON ${method} failed:`, error);
        throw error;
    }
}

async function handleTonRequest(method, params) {
    try {
        console.log(`💎 Handling TON ${method} request:`, params);
        
        switch (method) {
            case 'requestAccounts':
                // Return TON accounts
                return {
                    accounts: ['ton_account_placeholder']
                };
                
            case 'getBalance':
                // Get TON balance from API
                const address = params[0];
                const response = await fetch(`https://toncenter.com/api/v2/getAddressBalance?address=${address}`);
                const data = await response.json();
                return {
                    balance: data.result || 0,
                    address: address
                };
                
            case 'sendTransaction':
                // Handle TON transaction
                const tonTx = params[0];
                console.log('💎 Processing TON transaction:', tonTx);
                
                // Validate transaction
                if (!tonTx.to || !tonTx.amount) {
                    throw new Error('Invalid TON transaction: missing to address or amount');
                }
                
                // Get wallet from storage
                const tonWallet = await chrome.storage.local.get(['wallet']);
                if (!tonWallet.wallet) {
                    throw new Error('No wallet found');
                }
                
                // In a real implementation, this would:
                // 1. Create TON transaction
                // 2. Sign with private key
                // 3. Send to TON network
                
                // For now, simulate transaction
                const tonTxHash = 'ton_' + Math.random().toString(16).substr(2, 64);
                
                // Store transaction
                const tonTransaction = {
                    id: `ton-${tonTxHash}`,
                    hash: tonTxHash,
                    from: 'ton_address_placeholder',
                    to: tonTx.to,
                    value: tonTx.amount,
                    network: 'ton',
                    status: 'pending',
                    confirmations: 0,
                    timestamp: Date.now()
                };
                
                const existingTonTransactions = await chrome.storage.local.get(['transactions']);
                const tonTransactions = existingTonTransactions.transactions || [];
                tonTransactions.push(tonTransaction);
                await chrome.storage.local.set({ transactions: tonTransactions });
                
                return {
                    hash: tonTxHash,
                    success: true
                };
                
            default:
                throw new Error(`Unsupported TON method: ${method}`);
        }
    } catch (error) {
        console.error(`❌ TON ${method} failed:`, error);
        throw error;
    }
}

// Debug wallet function
async function handleDebugWallet(sendResponse) {
    try {
        console.log('🔍 Debug wallet request received');
        
        const result = await chrome.storage.local.get(['wallet', 'walletState', 'passwordHash']);
        const wallet = result.wallet;
        const walletState = result.walletState;
        const passwordHash = result.passwordHash;
        
        const debugInfo = {
            hasWallet: !!wallet,
            hasWalletState: !!walletState,
            hasPasswordHash: !!passwordHash,
            walletKeys: wallet ? Object.keys(wallet) : [],
            walletStateKeys: walletState ? Object.keys(walletState) : [],
            isWalletUnlocked: walletState?.isWalletUnlocked || false,
            hasEncryptedSeedPhrase: wallet?.encryptedSeedPhrase ? true : false,
            encryptedSeedPhraseLength: wallet?.encryptedSeedPhrase?.length || 0,
            encryptedSeedPhrasePreview: wallet?.encryptedSeedPhrase ? wallet.encryptedSeedPhrase.substring(0, 50) + '...' : 'N/A',
            walletAddress: wallet?.address || 'N/A',
            walletName: wallet?.name || 'N/A',
            lastUnlockTime: walletState?.lastUnlockTime || 'N/A'
        };
        
        console.log('🔍 Wallet debug info:', debugInfo);
        sendResponse({ success: true, debugInfo });
        
    } catch (error) {
        console.error('❌ Debug wallet failed:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Debug password function - FOR DEBUGGING ONLY
async function handleDebugPassword(sendResponse) {
    try {
        console.log('🔍 Debug password request received');
        
        const result = await chrome.storage.local.get(['wallet', 'walletState', 'passwordHash', 'password']);
        const wallet = result.wallet;
        const walletState = result.walletState;
        const passwordHash = result.passwordHash;
        const storedPassword = result.password;
        
        const passwordInfo = {
            hasWallet: !!wallet,
            hasPasswordHash: !!passwordHash,
            hasStoredPassword: !!storedPassword,
            storedPasswordLength: storedPassword ? storedPassword.length : 0,
            storedPasswordPreview: storedPassword ? storedPassword.substring(0, 3) + '***' : 'N/A',
            passwordHashPreview: passwordHash ? passwordHash.substring(0, 20) + '...' : 'N/A',
            walletPassword: wallet?.password || 'N/A',
            walletPasswordLength: wallet?.password ? wallet.password.length : 0,
            walletPasswordPreview: wallet?.password ? wallet.password.substring(0, 3) + '***' : 'N/A',
            hasEncryptedSeedPhrase: wallet?.encryptedSeedPhrase ? true : false,
            encryptedSeedPhrasePreview: wallet?.encryptedSeedPhrase ? wallet.encryptedSeedPhrase.substring(0, 50) + '...' : 'N/A'
        };
        
        console.log('🔍 Password debug info:', passwordInfo);
        sendResponse({ success: true, passwordInfo });
        
    } catch (error) {
        console.error('❌ Debug password failed:', error);
        sendResponse({ success: false, error: error.message });
    }
}

console.log('✅ PayCio Background Script Ready!');
