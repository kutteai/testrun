// Core types for the wallet application

export type ScreenId = 
  | 'welcome'
  | 'create'
  | 'import'
  | 'verify'
  | 'dashboard'
  | 'send'
  | 'receive'
  | 'settings'
  | 'security'
  | 'networks'
  | 'accounts'
  | 'tokens'
  | 'ens'
  | 'hardware'
  | 'gas'
  | 'bitcoin'
  | 'solana'
  | 'tron'
  | 'litecoin'
  | 'ton'
  | 'xrp'
  | 'address-book'  
  | 'nfts'
  | 'portfolio'
  | 'transactions'
  | 'transaction-history'
  | 'walletconnect'
  | 'loading'
  | 'address-book' 
  | 'error';

export interface WalletData {
  id: string;
  name: string;
  address: string;
  privateKey: string;
  publicKey: string;
  encryptedSeedPhrase: string;
  accounts: string[];
  networks: string[];
  currentNetwork: string;
  derivationPath: string;
  balance: string;
  createdAt: number;
  lastUsed: number;
}

// Alias for backward compatibility
export type Wallet = WalletData;

export interface Network {
  id: string;
  name: string;
  symbol: string;
  rpcUrl: string;
  chainId: string;
  explorerUrl: string;
  isCustom: boolean;
  isEnabled: boolean;
}

export interface Transaction {
  id: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  amount: string;
  network: string;
  type: 'send' | 'receive';
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  gasUsed?: string;
  gasPrice?: string;
  nonce?: number;
  data?: string;
  blockNumber?: string;
  confirmations?: number;
  isTokenTransaction?: boolean;
  tokenName?: string;
  tokenSymbol?: string;
  tokenValue?: string;
}

export interface NFT {
  id: string;
  tokenId: string;
  contractAddress: string;
  network: string;
  name: string;
  description: string;
  imageUrl: string;
  metadata: Record<string, string | number | boolean>;
  owner: string;
  collection: string;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
}

export interface PortfolioValue {
  totalUSD: number;
  totalChange24h: number;
  totalChangePercent: number;
  assets: Array<{
    network: string;
    symbol: string;
    balance: string;
    usdValue: number;
    change24h: number;
    changePercent: number;
  }>;
  rates: Record<string, number>;
  lastUpdated: number;
}

export interface Balance {
  [network: string]: string;
}

export interface WalletState {
  wallet: WalletData | null;
  isWalletUnlocked: boolean;
  hasWallet: boolean;
  balances: Balance;
  isLoading: boolean;
  error: string | null;
  isWalletCreated: boolean;
  isInitializing: boolean;
  address: string | null;
  currentNetwork: Network | null;
  networks: Network[];
  accounts: string[];
  privateKey: string | null;
  globalPassword: string | null;
}

export interface SecurityState {
  isAuthenticated: boolean;
  isWalletUnlocked: boolean;
  autoLockTimeout: number;
  requirePassword: boolean;
  biometricAuth: boolean;
  failedAttempts: number;
  lastActivity: number;
  sessionExpiry?: number;
}

export interface NetworkState {
  currentNetwork: Network | null;
  networks: Network[];
  isConnected: boolean;
  connectionError: string | null;
}

export interface TransactionState {
  recentTransactions: Transaction[];
  pendingTransactions: Transaction[];
  isLoading: boolean;
  error: string | null;
}

export interface NFTState {
  nfts: NFT[];
  collections: string[];
  isLoading: boolean;
  error: string | null;
}

export interface PortfolioState {
  portfolioValue: PortfolioValue | null;
  portfolioHistory: Array<{
    timestamp: number;
    totalUSD: number;
    change24h: number;
  }>;
  isLoading: boolean;
  error: string | null;
}

// Context types
export interface WalletContextType {
  wallet: WalletData | null;
  isWalletUnlocked: boolean;
  hasWallet: boolean;
  balances: Balance;
  isLoading: boolean;
  error: string | null;
  isWalletCreated: boolean;
  isInitializing: boolean;
  address: string | null;
  currentNetwork: Network | null;
  networks: Network[];
  accounts: string[];
  privateKey: string | null;
  createWallet: (name: string, network: string) => Promise<void>;
  importWallet: (seedPhrase: string, network: string, password?: string) => Promise<void>;
importWalletFromPrivateKey: (privateKey: string, network: string, password?: string) => Promise<void>;
  unlockWallet: (password: string) => Promise<boolean>;
  lockWallet: () => void;
  switchNetwork: (networkId: string) => Promise<void>;
  getBalance: (address: string, network: string) => Promise<string>;
  updateAllBalances: () => Promise<void>;
  initializeWallet: () => Promise<void>;
  addHardwareWallet: (type: 'ledger' | 'trezor', address: string, derivationPath: string) => Promise<void>;
  switchAccount: (accountId: string) => Promise<void>;
  addAccount: (password: string) => Promise<void>;
  removeAccount: (accountId: string) => Promise<void>;
  getCurrentAccount: () => Promise<any>;
  getWalletAccounts: () => Promise<any[]>;
  setGlobalPassword: (password: string) => void;
  setGlobalPasswordAndHash: (password: string) => Promise<void>;
}

export interface SecurityContextType {
  securityState: SecurityState;
  isAuthenticated: boolean;
  sessionExpiry?: number;
  authenticate: (password: string) => Promise<boolean>;
  lockWallet: () => void;
  unlockWallet: (password: string) => Promise<boolean>;
  updateSecuritySettings: (settings: Partial<SecurityState>) => void;
  resetFailedAttempts: () => void;
  checkSession: () => Promise<boolean>;
  authenticateUser: (password: string) => Promise<boolean>;
}

export interface NetworkContextType {
  networkState: NetworkState;
  currentNetwork: Network | null;
  networks: Network[];
  isConnected: boolean;
  switchNetwork: (networkId: string) => Promise<void>;
  addCustomNetwork: (network: Omit<Network, 'isCustom'>) => void;
  removeCustomNetwork: (networkId: string) => void;
  toggleNetwork: (networkId: string) => void;
  getNetworkById: (networkId: string) => Network | undefined;
  refreshConnection: () => Promise<void>;
}

export interface TransactionContextType {
  transactionState: TransactionState;
  recentTransactions: Transaction[];
  pendingTransactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => void;
  updateTransaction: (hash: string, updates: Partial<Transaction>) => void;
  getTransactionByHash: (hash: string) => Transaction | undefined;
  clearTransactions: () => void;
  refreshTransactions: () => Promise<void>;
}

export interface NFTContextType {
  nftState: NFTState;
  nfts: NFT[];
  addNFT: (nft: Omit<NFT, 'id'>) => void;
  removeNFT: (nftId: string) => void;
  getNFTsByCollection: (collection: string) => NFT[];
  getNFTsByNetwork: (network: string) => NFT[];
  refreshNFTs: () => Promise<void>;
  importNFT: (contractAddress: string, tokenId: string, network: string) => Promise<void>;
}

export interface PortfolioContextType {
  portfolioState: PortfolioState;
  portfolioValue: PortfolioValue | null;
  portfolioHistory: Array<{
    timestamp: number;
    totalUSD: number;
    change24h: number;
  }>;
  updatePortfolio: () => Promise<void>;
  getAssetValue: (network: string, symbol: string) => number;
  getTotalValue: () => number;
  refreshRates: () => Promise<void>;
}

// Component prop types
export interface ScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export interface DashboardScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export interface HeaderProps {
  title: string;
  onBack?: () => void;
  canGoBack?: boolean;
  wallet?: WalletData | null;
  currentNetwork?: Network | null;
}

export interface NavigationProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  wallet?: WalletData | null;
  pendingTransactions?: Transaction[];
}

// API response types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface WalletResponse {
  address: string;
  network: string;
  balance: string;
}

export interface TransactionResponse {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
}

// Configuration types
export interface AppConfig {
  defaultNetwork: string;
  supportedNetworks: string[];
  autoLockTimeout: number;
  maxFailedAttempts: number;
  apiEndpoints: {
    ethereum: string;
    bsc: string;
    polygon: string;
    avalanche: string;
  };
}

// Event types
export interface WalletEvent {
  type: 'wallet_connected' | 'wallet_disconnected' | 'network_changed' | 'transaction_sent';
  data: any;
  timestamp: number;
}

// Error types
export interface WalletError {
  code: string;
  message: string;
  details?: any;
}

// Form types
export interface CreateWalletForm {
  name: string;
  network: string;
}

export interface ImportWalletForm {
  seedPhrase: string;
  network: string;
}

export interface SendTransactionForm {
  to: string;
  amount: string;
  network: string;
  gasPrice?: string;
  gasLimit?: string;
}

// Utility types
export type NetworkId = 'ethereum' | 'bsc' | 'polygon' | 'avalanche' | 'bitcoin' | 'solana' | 'tron' | 'litecoin' | 'ton' | 'xrp';

export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export type WalletStatus = 'locked' | 'unlocked' | 'creating' | 'importing';

// Theme types
export interface Theme {
  mode: 'light' | 'dark';
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
}

// Settings types
export interface UserSettings {
  theme: Theme;
  language: string;
  currency: string;
  notifications: {
    transactions: boolean;
    priceAlerts: boolean;
    securityAlerts: boolean;
  };
  privacy: {
    shareAnalytics: boolean;
    shareCrashReports: boolean;
  };
}

// Encrypted wallet data type
export interface EncryptedWalletData {
  encryptedSeedPhrase: string;
  encryptedPrivateKey: string;
  salt: string;
  iv: string;
} 

// Add missing types
export interface NotificationType {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

export interface TransferResult {
  success: boolean;
  hash?: string;
  txHash?: string;
  bridgeTxHash?: string;
  estimatedTime?: number;
  fees?: string;
  error?: string;
  amount?: string;
  fromChain?: string;
  toChain?: string;
}

export interface BridgeConfig {
  name: string;
  url: string;
  bridge: string;
  contractAddress?: string;
  minAmount?: string;
  maxAmount?: string;
  fees?: string | {
    fixed: number;
    percentage: number;
  };
  estimatedTime?: number;
  supportedNetworks: string[];
  // runtime fields for live execution
  rpcUrl?: string;
  tokenAddress?: string;
  privateKey?: string;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
} 

// Export to make this file a module
export {};

// Global type declarations
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
      isMetaMask?: boolean;
      selectedAddress?: string;
      chainId?: string;
    };
    web3?: {
      currentProvider?: any;
    };
  }
}

// Config interface
export interface Config {
  INFURA_PROJECT_ID: string;
  ALCHEMY_API_KEY: string;
  ETHERSCAN_API_KEY: string;
  BSCSCAN_API_KEY: string;
  POLYGONSCAN_API_KEY: string;
  AVALANCHESCAN_API_KEY: string;
  ARBITRUMSCAN_API_KEY: string;
  OPTIMISMSCAN_API_KEY: string;
  COINGECKO_API_KEY: string;
  COINMARKETCAP_API_KEY: string;
  OPENSEA_API_KEY: string;
  ALCHEMY_NFT_API_KEY: string;
  DEFI_PULSE_API_KEY: string;
  ENS_RPC_URL: string;
  IPFS_GATEWAY: string;
  CUSTOM_RPC_ENDPOINTS: Record<string, string>;
  SECURITY: {
    AUTO_LOCK_TIMEOUT: number;
    MAX_FAILED_ATTEMPTS: number;
    SESSION_TIMEOUT: number;
    REQUIRE_PASSWORD: boolean;
    ENABLE_BIOMETRIC: boolean;
  };
  FEATURES: {
    ENABLE_NFT_SUPPORT: boolean;
    ENABLE_DEFI_INTEGRATION: boolean;
    ENABLE_PORTFOLIO_TRACKING: boolean;
    ENABLE_HARDWARE_WALLET: boolean;
    ENABLE_WALLET_CONNECT: boolean;
  };
  NETWORKS: Record<string, {
    rpcUrl: string;
    chainId: string;
    explorerUrl: string;
    symbol: string;
    decimals: number;
    isEnabled: boolean;
  }>;
} 