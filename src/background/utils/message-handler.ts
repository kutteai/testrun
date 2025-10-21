import { storage } from './storage';
import { WalletManager } from './wallet-manager';
import { BlockchainService } from './blockchain-service';
import { PerformanceMonitor } from './performance-monitor';

interface ConnectedSiteInfo {
  accounts: string[];
  permissions: string[];
  lastActive: number;
  connectedAt?: number; // Add connectedAt as optional property
}

// Keep track of connected sites and their permissions
const connectedSites = new Map<string, ConnectedSiteInfo>();

// Function to add or update a connected site
async function addConnectedSite(origin: string, accounts: string[]) {
  connectedSites.set(origin, {
    accounts,
    permissions: ['eth_accounts', 'personal_sign', 'eth_sendTransaction'], // Default permissions
    connectedAt: connectedSites.get(origin)?.connectedAt || Date.now(),
    lastActive: Date.now(),
  });
  await storage.local.set({ connectedSites: JSON.stringify(Array.from(connectedSites.entries())) });
}

// Function to remove a connected site
async function removeConnectedSite(origin: string) {
  connectedSites.delete(origin);
  await storage.local.set({ connectedSites: JSON.stringify(Array.from(connectedSites.entries())) });
}

// Message handler map for incoming requests
const messageHandlers: Record<string, Function> = {
  // Handle wallet connection/disconnection
  CONNECT_WALLET: async (message: any) => {
    const { origin, accounts } = message;
    await addConnectedSite(origin, accounts);
    return { success: true };
  },
  DISCONNECT_WALLET: async (message: any) => {
    const { origin } = message;
    await removeConnectedSite(origin);
    return { success: true };
  },

  // Wallet actions
  WALLET_CREATE: async (message: any) => WalletManager.createWallet(message.password, message.seedPhrase, message.name),
  WALLET_UNLOCK: async (message: any) => WalletManager.unlockWallet(message.password),
  WALLET_LOCK: async () => WalletManager.lockWallet(),
  WALLET_GET_STATUS: async () => WalletManager.getWalletStatus(),
  WALLET_GET_ACCOUNTS: async () => WalletManager.getAccounts(),
  WALLET_GET_CURRENT_ACCOUNT: async (message: any) => WalletManager.getCurrentAccount(message.network),
  WALLET_SWITCH_NETWORK: async (message: any) => WalletManager.switchNetwork(message.networkId),

  // Transaction and signing
  WALLET_SEND_TRANSACTION: async (message: any) =>
    BlockchainService.sendTransaction(message.txParams, message.network),
  WALLET_SIGN_MESSAGE: async (message: any) =>
    BlockchainService.signMessage(message.method, message.params, message.seedPhrase),
  WALLET_SIGN_TRANSACTION: async (message: any) =>
    BlockchainService.sendTransaction(message.txParams, message.network),
  WALLET_SIGN_TYPED_DATA: async (message: any) =>
    BlockchainService.signMessage('eth_signTypedData', [message.address, message.typedData], message.seedPhrase),

  // Blockchain data
  BLOCKCHAIN_GET_BALANCE: async (message: any) =>
    BlockchainService.getNetworkBalance(message.address, message.network),
  BLOCKCHAIN_GET_GAS_PRICE: async (message: any) => BlockchainService.getGasPrice(message.network),
  BLOCKCHAIN_GET_TRANSACTION_COUNT: async (message: any) =>
    BlockchainService.getTransactionCount(message.address, message.network),

  // Debugging
  DEBUG_GET_METRICS: async () => new PerformanceMonitor().getMetrics(),
  DEBUG_GET_LOGS: async (message: any) => new PerformanceMonitor().getRecentLogs(message.limit),
  DEBUG_CLEAR_LOGS: async () => { new PerformanceMonitor().logBuffer = []; return 'Logs cleared'; },
};

export { messageHandlers, addConnectedSite, removeConnectedSite, connectedSites };
