export interface ExtensionMessage {
  type: string;
  method?: string;
  params?: any[];
  requestId?: string;
  [key: string]: any;
}

export interface ExtensionResponse {
  success: boolean;
  data?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  requestId?: string;
}

export interface WalletState {
  isConnected: boolean;
  accounts: string[];
  selectedAddress: string | null;
  chainId: string;
  networkVersion: string;
  isUnlocked?: boolean;
  hasWallet?: boolean;
  walletId?: string | null;
}

export interface PerformanceMetrics {
  startTime: number;
  messageCount: number;
  errorCount: number;
  lastError: Error | null | string; // Adjusted type to allow string
  [key: string]: number | ({ count: number; totalTime: number; lastCall: number });
}
