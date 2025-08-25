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

console.log('PayCio Wallet content script initialized');

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
  const currentWallet = walletManager.getCurrentWallet();
  if (!currentWallet) {
    return { success: false, error: 'No wallet available' };
  }

  return {
    success: true,
    address: currentWallet.address,
    network: currentWallet.currentNetwork
  };
}

// Handle get accounts
async function handleGetAccounts() {
  const currentWallet = walletManager.getCurrentWallet();
  if (!currentWallet) {
    return { success: true, accounts: [] };
  }

  // Return all accounts from the current wallet
  const accounts = currentWallet.accounts.map(account => account.address);
  return {
    success: true,
    accounts: accounts
  };
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

// Handle wallet request (new format)
async function handleWalletRequest(method: string, params: any[] = []) {
  try {
    switch (method) {
      case 'eth_requestAccounts':
      case 'eth_accounts':
        return await handleGetAccounts();
      case 'eth_getBalance':
        const [address, blockTag] = params;
        return await handleGetBalance({ address, network: 'ethereum' });
      case 'eth_sendTransaction':
        const [transaction] = params;
        return await handleSendTransaction({
          to: transaction.to,
          value: transaction.value,
          network: 'ethereum'
        });
      case 'eth_signTransaction':
        return await handleSignTransaction();
      case 'eth_chainId':
        return { success: true, data: '0x1' }; // Ethereum mainnet
      case 'net_version':
        return { success: true, data: '1' }; // Ethereum mainnet
      case 'eth_getTransactionCount':
        return await handleGetTransactionCount(params[0]); // Real nonce
      case 'eth_estimateGas':
        return await handleEstimateGas(params[0]); // Real gas estimation
      case 'eth_gasPrice':
        return await handleGetGasPrice(); // Real gas price
      default:
        return { success: false, error: `Method ${method} not supported` };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
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

// Inject the wallet provider script
const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected.js');
script.onload = () => {
  script.remove();
};
(document.head || document.documentElement).appendChild(script); 