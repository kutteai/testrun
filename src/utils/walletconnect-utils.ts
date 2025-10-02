import { SignClient } from '@walletconnect/sign-client';
import { getSdkError } from '@walletconnect/utils';
import { ethers } from 'ethers';
import { getConfig } from './config-injector';

// Type definitions for WalletConnect v2
export interface WalletConnectSession {
  topic: string;
  chainId: number;
  accounts: string[];
  connected: boolean;
  namespaces: Record<string, any>;
  clientMeta: {
    name: string;
    description: string;
    url: string;
    icons: string[];
  };
}

export interface WalletConnectRequest {
  id: number;
  method: string;
  params: any[];
}

export interface WalletConnectProposal {
  id: number;
  params: {
    requiredNamespaces: Record<string, any>;
    optionalNamespaces?: Record<string, any>;
    relays: Array<{ protocol: string }>;
    proposer: {
      publicKey: string;
      controller: boolean;
      metadata: {
        name: string;
        description: string;
        url: string;
        icons: string[];
      };
    };
  };
}

// Type aliases for compatibility
type SessionTypes = {
  Struct: WalletConnectSession;
};

type ProposalTypes = {
  Struct: WalletConnectProposal;
};

export class WalletConnectManager {
  private client: any = null;
  private session: WalletConnectSession | null = null;
  private proposal: WalletConnectProposal | null = null;
  private uri: string | null = null;
  private projectId: string;
  private eventListeners: Map<string, Function[]> = new Map();
  private connectionTimeout: number = 30000; // 30 seconds
  private sessionHealthCheckInterval: NodeJS.Timeout | null = null;
  private cleanupTimeouts: Set<NodeJS.Timeout> = new Set();
  private sessionStorageKey = 'walletconnect_session';
  private proposalStorageKey = 'walletconnect_proposal';

  constructor() {
    // Get project ID from config system or use a working default
    const config = getConfig();
    this.projectId = config.WALLETCONNECT_PROJECT_ID || '4f7e02b6d85b4e24bf2f2f2b2f2f2f2f';
    
    // Load persisted session on initialization
    this.loadPersistedSession();
  }

  // Event emitter methods
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Utility method to add timeout to promises
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(errorMessage));
      }, timeoutMs);
      this.cleanupTimeouts.add(timeout);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
      // Clean up timeout
      this.cleanupTimeouts.forEach(timeout => clearTimeout(timeout));
      this.cleanupTimeouts.clear();
    });
  }

  // Session persistence methods
  private saveSession(session: WalletConnectSession): void {
    try {
      localStorage.setItem(this.sessionStorageKey, JSON.stringify(session));
    } catch (error) {
      console.warn('Failed to save session:', error);
    }
  }

  private loadPersistedSession(): void {
    try {
      const savedSession = localStorage.getItem(this.sessionStorageKey);
      if (savedSession) {
        this.session = JSON.parse(savedSession);
        console.log('Restored WalletConnect session:', this.session);
      }
    } catch (error) {
      console.warn('Failed to load persisted session:', error);
      this.clearPersistedSession();
    }
  }

  private clearPersistedSession(): void {
    try {
      localStorage.removeItem(this.sessionStorageKey);
      localStorage.removeItem(this.proposalStorageKey);
    } catch (error) {
      console.warn('Failed to clear persisted session:', error);
    }
  }

  private saveProposal(proposal: WalletConnectProposal): void {
    try {
      localStorage.setItem(this.proposalStorageKey, JSON.stringify(proposal));
    } catch (error) {
      console.warn('Failed to save proposal:', error);
    }
  }

  private loadPersistedProposal(): WalletConnectProposal | null {
    try {
      const savedProposal = localStorage.getItem(this.proposalStorageKey);
      if (savedProposal) {
        return JSON.parse(savedProposal);
      }
    } catch (error) {
      console.warn('Failed to load persisted proposal:', error);
    }
    return null;
  }

  // Initialize WalletConnect client
  async initialize(): Promise<any> {
    if (this.client) {
      return this.client;
    }

    try {
      console.log('Initializing WalletConnect with project ID:', this.projectId);
      
      this.client = await SignClient.init({
        projectId: this.projectId,
        metadata: {
          name: 'PayCio Wallet',
          description: 'Multi-chain browser extension wallet',
          url: 'https://paycio-wallet.com',
          icons: ['https://paycio-wallet.com/icon.png']
        },
        relayUrl: 'wss://relay.walletconnect.com'
      });

      console.log('WalletConnect client initialized successfully');
      
      // Set up event listeners
      this.setupEventListeners();

      return this.client;
    } catch (error) {
      console.error('WalletConnect initialization failed:', error);
      throw new Error(`Failed to initialize WalletConnect: ${error}`);
    }
  }

  // Set up event listeners
  private setupEventListeners(): void {
    if (!this.client) return;

    // Handle session proposals
    this.client.on('session_proposal', async (proposal) => {
      console.log('Session proposal received:', proposal);
      this.proposal = proposal;
      
      // Emit event for UI to show approval dialog
      this.emit('session_proposal', proposal);
    });

    // Handle session requests
    this.client.on('session_request', async (requestEvent) => {
      console.log('Session request received:', requestEvent);
      
      // Emit event for UI to show request approval dialog
      this.emit('session_request', requestEvent);
    });

    // Handle session events
    this.client.on('session_event', (event) => {
      console.log('Session event:', event);
    });

    // Handle session updates
    this.client.on('session_update', (event) => {
      console.log('Session updated:', event);
      this.updateSession(event.topic);
    });

    // Handle session deletions
    this.client.on('session_delete', (event) => {
      console.log('Session deleted:', event);
      this.session = null;
      this.cleanup();
    });
  }

  private removeEventListeners(): void {
    if (!this.client) return;

    // Remove all event listeners to prevent memory leaks
    this.client.removeAllListeners('session_proposal');
    this.client.removeAllListeners('session_request');
    this.client.removeAllListeners('session_event');
    this.client.removeAllListeners('session_update');
    this.client.removeAllListeners('session_delete');
  }

  // Connect to WalletConnect (initiate connection)
  async connect(): Promise<{ uri: string; session?: WalletConnectSession }> {
    try {
      console.log('Starting WalletConnect connection...');
      const client = await this.initialize();
      
      console.log('Creating connection proposal...');
      const { uri, approval } = await client.connect({
        requiredNamespaces: {
          eip155: {
            methods: [
              'eth_sendTransaction',
              'eth_signTransaction',
              'eth_sign',
              'personal_sign',
              'eth_signTypedData',
              'eth_signTypedData_v4',
              'eth_getBalance',
              'eth_accounts',
              'eth_chainId',
              'eth_requestAccounts',
              'wallet_switchEthereumChain',
              'wallet_addEthereumChain'
            ],
            chains: ['eip155:1', 'eip155:56', 'eip155:137', 'eip155:42161', 'eip155:10', 'eip155:43114'],
            events: ['chainChanged', 'accountsChanged', 'connect', 'disconnect']
          },
          // Add support for non-EVM chains
          bitcoin: {
            methods: [
              'btc_getBalance',
              'btc_getAddress',
              'btc_sendTransaction',
              'btc_signMessage'
            ],
            chains: ['bitcoin:0'],
            events: ['accountsChanged']
          },
          solana: {
            methods: [
              'sol_requestAccounts',
              'sol_getBalance',
              'sol_sendTransaction',
              'sol_signMessage'
            ],
            chains: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
            events: ['accountsChanged']
          },
          tron: {
            methods: [
              'tron_requestAccounts',
              'tron_getBalance',
              'tron_sendTransaction',
              'tron_signMessage'
            ],
            chains: ['tron:0x2b6653dc'],
            events: ['accountsChanged']
          }
        },
        optionalNamespaces: {
          eip155: {
            methods: [
              'eth_getTransactionCount',
              'eth_estimateGas',
              'eth_gasPrice',
              'eth_getTransactionReceipt',
              'eth_getBlockByNumber'
            ],
            chains: ['eip155:43114', 'eip155:250', 'eip155:25']
          },
          litecoin: {
            methods: [
              'ltc_getBalance',
              'ltc_getAddress',
              'ltc_sendTransaction'
            ],
            chains: ['litecoin:0'],
            events: ['accountsChanged']
          },
          ton: {
            methods: [
              'ton_requestAccounts',
              'ton_getBalance',
              'ton_sendTransaction'
            ],
            chains: ['ton:mainnet'],
            events: ['accountsChanged']
          }
        }
      });

      console.log('Connection URI generated:', uri);
      this.uri = uri;
      
      console.log('Waiting for session approval...');
      // Add timeout to session approval
      const session = await this.withTimeout(
        approval(),
        this.connectionTimeout,
        'Session approval timeout - please try connecting again'
      );
      console.log('Session approved:', session);
      this.session = session as any;
      
      const formattedSession = this.formatSession(session as any);
      console.log('Formatted session:', formattedSession);
      
      // Start session health monitoring
      this.startSessionHealthCheck();
      
      return {
        uri,
        session: formattedSession
      };
    } catch (error) {
      console.error('WalletConnect connection failed:', error);
      throw new Error(`WalletConnect connection failed: ${error}`);
    }
  }

  // Approve session proposal with MetaMask-style flow
  async approveSession(proposal: WalletConnectProposal): Promise<void> {
    if (!this.client) return;

    try {
      console.log('Approving session proposal:', proposal.id);
      
      // Check if wallet is unlocked before proceeding
      const walletStatus = await this.checkWalletStatus();
      if (!walletStatus.isUnlocked) {
        console.log('Wallet is locked, triggering unlock flow...');
        // Emit unlock event to trigger WalletUnlockModal
        this.emit('wallet_locked', {
          dAppName: proposal.params.proposer.metadata.name,
          dAppUrl: proposal.params.proposer.metadata.url,
          dAppIcon: proposal.params.proposer.metadata.icons?.[0]
        });
        
        // Wait for unlock to complete
        const unlockPromise = new Promise<boolean>((resolve) => {
          const handleUnlock = (success: boolean) => {
            this.off('wallet_unlocked', handleUnlock);
            resolve(success);
          };
          this.on('wallet_unlocked', handleUnlock);
        });
        
        const unlocked = await unlockPromise;
        if (!unlocked) {
          throw new Error('Wallet unlock required for session approval');
        }
      }

      // Show connection confirmation modal
      const dAppInfo = {
        name: proposal.params.proposer.metadata.name,
        url: proposal.params.proposer.metadata.url,
        icon: proposal.params.proposer.metadata.icons?.[0],
        description: proposal.params.proposer.metadata.description
      };

      const requestedPermissions = {
        accounts: true,
        balance: true,
        transactions: true,
        signing: true
      };

      const requestedChains = Object.keys(proposal.params.requiredNamespaces || {});
      
      // Emit connection confirmation event
      this.emit('connection_request', {
        dAppInfo,
        requestedPermissions,
        requestedChains,
        proposal
      });

      // Wait for user confirmation
      const confirmationPromise = new Promise<boolean>((resolve) => {
        const handleConfirmation = (approved: boolean) => {
          this.off('connection_confirmed', handleConfirmation);
          resolve(approved);
        };
        this.on('connection_confirmed', handleConfirmation);
      });

      const approved = await confirmationPromise;
      if (!approved) {
        throw new Error('Connection rejected by user');
      }

      // Get real accounts from wallet
      const accounts = await this.getWalletAccounts();
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts available for connection');
      }

      const { topic } = await this.client.approve({
        id: proposal.id,
        namespaces: {
          eip155: {
            methods: ['eth_sendTransaction', 'eth_signTransaction', 'personal_sign'],
            chains: ['eip155:1'],
            events: ['chainChanged', 'accountsChanged'],
            accounts: accounts.map(acc => `eip155:1:${acc}`)
          }
        }
      });

      console.log('Session approved:', topic);
      
      // Save session for persistence
      this.session = {
        topic,
        chainId: 1,
        accounts,
        connected: true,
        namespaces: {
          eip155: {
            methods: ['eth_sendTransaction', 'eth_signTransaction', 'personal_sign'],
            chains: ['eip155:1'],
            events: ['chainChanged', 'accountsChanged'],
            accounts: accounts.map(acc => `eip155:1:${acc}`)
          }
        },
        clientMeta: {
          name: 'PayCio Wallet',
          description: 'PayCio Multi-Chain Wallet',
          url: 'https://paycio.com',
          icons: ['https://paycio.com/icon.png']
        }
      };
      
      this.saveSession(this.session);
    } catch (error) {
      console.error('Failed to approve session:', error);
      throw error;
    }
  }

  // Check wallet status
  private async checkWalletStatus(): Promise<{ isUnlocked: boolean; accounts: string[] }> {
    try {
      // Send message to background script to check wallet status
      const response = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'WALLET_STATUS_CHECK' },
          resolve
        );
      });

      return {
        isUnlocked: response.isUnlocked || false,
        accounts: response.accounts || []
      };
    } catch (error) {
      console.error('Failed to check wallet status:', error);
      return { isUnlocked: false, accounts: [] };
    }
  }

  // Request wallet unlock
  private async requestWalletUnlock(): Promise<boolean> {
    try {
      // This would trigger the wallet unlock UI
      const response = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'REQUEST_WALLET_UNLOCK' },
          resolve
        );
      });

      return response.success || false;
    } catch (error) {
      console.error('Failed to request wallet unlock:', error);
      return false;
    }
  }

  // Get wallet accounts
  private async getWalletAccounts(): Promise<string[]> {
    try {
      const response = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'GET_WALLET_ACCOUNTS' },
          resolve
        );
      });

      return response.accounts || [];
    } catch (error) {
      console.error('Failed to get wallet accounts:', error);
      return [];
    }
  }

  // Start session health monitoring
  private startSessionHealthCheck(): void {
    if (this.sessionHealthCheckInterval) {
      clearInterval(this.sessionHealthCheckInterval);
    }

    this.sessionHealthCheckInterval = setInterval(async () => {
      if (this.session && this.client) {
        try {
          // Ping the session to check if it's still alive
          const sessions = this.client.session.getAll();
          const currentSession = sessions.find(s => s.topic === this.session?.topic);
          
          if (!currentSession) {
            console.log('Session no longer exists, cleaning up...');
            this.session = null;
            this.emit('session_expired');
          }
        } catch (error) {
          console.error('Session health check failed:', error);
        }
      }
    }, 60000); // Check every minute
  }

  // Stop session health monitoring
  private stopSessionHealthCheck(): void {
    if (this.sessionHealthCheckInterval) {
      clearInterval(this.sessionHealthCheckInterval);
      this.sessionHealthCheckInterval = null;
    }
  }

  // Clean up resources

  // Prompt user to unlock wallet
  private async promptWalletUnlock(): Promise<void> {
    try {
      // Open wallet popup to prompt unlock
      await chrome.action.openPopup();
      
      // Wait for user to unlock (poll for status change)
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(async () => {
          try {
            const status = await this.checkWalletStatus();
            if (status.isUnlocked && status.accounts.length > 0) {
              clearInterval(checkInterval);
              resolve();
            }
          } catch (error) {
            clearInterval(checkInterval);
            reject(error);
          }
        }, 1000);
        
        // Timeout after 60 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('Wallet unlock timeout'));
        }, 60000);
      });
    } catch (error) {
      throw new Error(`Failed to prompt wallet unlock: ${error.message}`);
    }
  }

  private cleanup(): void {
    this.stopSessionHealthCheck();
    this.cleanupTimeouts.forEach(timeout => clearTimeout(timeout));
    this.cleanupTimeouts.clear();
  }

  // Enhanced session request handling with wallet lock check
  private async handleSessionRequest(request: any): Promise<any> {
    const { method, params } = request;

    try {
      // For sensitive operations, check if wallet is unlocked
      const sensitiveOperations = [
        'eth_sendTransaction',
        'eth_signTransaction', 
        'eth_sign',
        'personal_sign',
        'eth_signTypedData',
        'eth_signTypedData_v4'
      ];

      if (sensitiveOperations.includes(method)) {
        const walletStatus = await this.checkWalletStatus();
        if (!walletStatus.isUnlocked) {
          console.log(`Wallet locked for ${method}, requesting unlock...`);
          const unlocked = await this.requestWalletUnlock();
          if (!unlocked) {
            return {
              id: request.id,
              jsonrpc: '2.0',
              error: {
                code: 4001,
                message: 'Wallet unlock required for this operation'
              }
            };
          }
        }
      }

      switch (method) {
        case 'eth_accounts':
          return {
            id: request.id,
            jsonrpc: '2.0',
            result: this.getAccounts()
          };

        case 'eth_requestAccounts':
          return {
            id: request.id,
            jsonrpc: '2.0',
            result: this.getAccounts()
          };

        case 'eth_chainId':
          return {
            id: request.id,
            jsonrpc: '2.0',
            result: '0x1' // Ethereum mainnet
          };

        case 'eth_getBalance':
          const [address, blockTag] = params;
          const balance = await this.getBalance(address);
          return {
            id: request.id,
            jsonrpc: '2.0',
            result: balance
          };

        case 'eth_sendTransaction':
          const [transaction] = params;
          // Forward to background with timeout
          const txHash = await this.withTimeout(
            new Promise<string>((resolve, reject) => {
              chrome.runtime.sendMessage({ 
                type: 'WALLET_REQUEST', 
                method: 'eth_sendTransaction', 
                params: [transaction] 
              }, (response) => {
                if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
                if (response?.success) return resolve(response.result);
                reject(new Error(response?.error || 'eth_sendTransaction failed'));
              });
            }),
            30000, // 30 second timeout for transactions
            'Transaction timeout - please try again'
          );
          return {
            id: request.id,
            jsonrpc: '2.0',
            result: txHash
          };

        case 'eth_sign':
        case 'personal_sign':
          const [message, signAddress] = params;
          const signature = await this.withTimeout(
            this.signMessage(message, signAddress),
            15000, // 15 second timeout for signing
            'Signing timeout - please try again'
          );
          return {
            id: request.id,
            jsonrpc: '2.0',
            result: signature
          };

        case 'eth_signTypedData':
        case 'eth_signTypedData_v4':
          const [typedData, typedDataAddress] = params;
          const typedSignature = await this.withTimeout(
            this.signTypedData(typedData, typedDataAddress),
            15000, // 15 second timeout for signing
            'Typed data signing timeout - please try again'
          );
          return {
            id: request.id,
            jsonrpc: '2.0',
            result: typedSignature
          };

        case 'wallet_switchEthereumChain':
          await this.switchChain(params[0].chainId);
          return {
            id: request.id,
            jsonrpc: '2.0',
            result: null
          };

        case 'wallet_unlock':
          // Handle wallet unlock request by prompting user to unlock wallet
          try {
            // Check if wallet is already unlocked
            const walletStatus = await this.checkWalletStatus();
            if (walletStatus.isUnlocked) {
              return {
                id: request.id,
                jsonrpc: '2.0',
                result: { unlocked: true }
              };
            }
            
            // Prompt user to unlock wallet via popup
            await this.promptWalletUnlock();
            
            // Check status again after unlock attempt
            const newStatus = await this.checkWalletStatus();
            if (newStatus.isUnlocked) {
              return {
                id: request.id,
                jsonrpc: '2.0',
                result: { unlocked: true }
              };
            } else {
              throw new Error('Wallet unlock failed or was cancelled by user');
            }
          } catch (error) {
            return {
              id: request.id,
              jsonrpc: '2.0',
              error: {
                code: -32002,
                message: `Wallet unlock failed: ${error.message}`
              }
            };
          }

        case 'wallet_requestPermissions':
          // Handle permission requests
          return {
            id: request.id,
            jsonrpc: '2.0',
            result: [{
              'eth_accounts': {}
            }]
          };

        case 'wallet_getPermissions':
          // Return current permissions
          return {
            id: request.id,
            jsonrpc: '2.0',
            result: [{
              'eth_accounts': {}
            }]
          };

        default:
          return {
            id: request.id,
            jsonrpc: '2.0',
            error: {
              code: -32601,
              message: `Method ${method} not supported`
            }
          };
      }
    } catch (error) {
      return {
        id: request.id,
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error'
        }
      };
    }
  }

  // Reject session proposal
  async rejectSession(proposal: WalletConnectProposal): Promise<void> {
    if (!this.client) return;

    try {
      console.log('Rejecting session proposal:', proposal.id);
      
      await this.client.reject({
        id: proposal.id,
        reason: getSdkError('USER_REJECTED')
      });
      
      console.log('Session rejected');
    } catch (error) {
      console.error('Failed to reject session:', error);
      throw error;
    }
  }

  // Update session
  private updateSession(topic: string): void {
    if (!this.client) return;
    this.session = this.client.session.get(topic);
  }

  // Disconnect from WalletConnect with timeout
  async disconnect(): Promise<void> {
    try {
      if (this.client && this.session) {
        await this.withTimeout(
          this.client.disconnect({
            topic: this.session.topic,
            reason: getSdkError('USER_DISCONNECTED')
          }),
          10000, // 10 second timeout for disconnect
          'Disconnect timeout'
        );
      }
    } catch (error) {
      console.error('Error during disconnect:', error);
    } finally {
      this.session = null;
      this.uri = null;
      this.proposal = null;
      this.cleanup();
    }
  }

  // Get connection URI for QR code
  getConnectionUri(): string | null {
    return this.uri;
  }

  // Get current session
  getSession(): WalletConnectSession | null {
    if (!this.session) return null;
    return this.formatSession(this.session);
  }

  // Format session data
  private formatSession(session: any): WalletConnectSession {
    const accounts = Object.values(session.namespaces?.eip155?.accounts || []) as string[];
    
    return {
      topic: session.topic || '',
      chainId: parseInt(accounts[0]?.split(':')[1] || '1'),
      accounts: accounts.map(acc => acc.split(':')[2]),
      connected: true,
      namespaces: session.namespaces || {},
      clientMeta: session.peer?.metadata || session.clientMeta || {
        name: 'Unknown DApp',
        description: '',
        url: '',
        icons: []
      }
    };
  }

  // Check if connected
  isConnected(): boolean {
    return this.session !== null;
  }

  // Get connected accounts
  getAccounts(): string[] {
    if (!this.session) return [];
    return this.session.namespaces.eip155?.accounts.map(acc => acc.split(':')[2]) || [];
  }

  // Get current chain ID
  getChainId(): number {
    if (!this.session) return 1;
    const accounts = this.session.namespaces.eip155?.accounts || [];
    return parseInt(accounts[0]?.split(':')[1] || '1');
  }

  // Get balance (real implementation)
  private async getBalance(address: string): Promise<string> {
    try {
      const { getRealBalance } = await import('./web3-utils');
      const balance = await getRealBalance(address, 'ethereum');
      return balance;
    } catch (error) {
      console.error('Error getting balance:', error);
      return '0x0';
    }
  }

  // Sign message (real implementation)
  private async signMessage(message: string, address: string): Promise<string> {
    try {
      const response = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage({
          type: 'WALLET_REQUEST',
          method: 'personal_sign',
          params: [message, address]
        }, resolve);
      });

      if (response?.success) {
        return response.result;
      } else {
        throw new Error(response?.error || 'Signing failed');
      }
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  }

  // Sign typed data (real implementation)
  private async signTypedData(data: any, address: string): Promise<string> {
    try {
      const response = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage({
          type: 'WALLET_REQUEST',
          method: 'eth_signTypedData_v4',
          params: [address, data]
        }, resolve);
      });

      if (response?.success) {
        return response.result;
      } else {
        throw new Error(response?.error || 'Typed data signing failed');
      }
    } catch (error) {
      console.error('Error signing typed data:', error);
      throw error;
    }
  }

  // Switch chain
  private async switchChain(chainId: string): Promise<void> {
    try {
      const response = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage({
          type: 'WALLET_REQUEST',
          method: 'wallet_switchEthereumChain',
          params: [{ chainId }]
        }, resolve);
      });

      if (!response?.success) {
        throw new Error(response?.error || 'Chain switch failed');
      }
    } catch (error) {
      console.error('Error switching chain:', error);
      throw error;
    }
  }

  // Get supported chains
  getSupportedChains(): number[] {
    return [1, 56, 137, 43114, 42161, 10];
  }

  // Get chain name
  getChainName(chainId: number): string {
    const names: Record<number, string> = {
      1: 'Ethereum',
      56: 'BSC',
      137: 'Polygon',
      43114: 'Avalanche',
      42161: 'Arbitrum',
      10: 'Optimism'
    };
    return names[chainId] || 'Unknown';
  }

  // Approve request with timeout
  async approveRequest(request: WalletConnectRequest): Promise<void> {
    if (!this.client) return;

    try {
      console.log('Approving request:', request.id);
      
      const response = await this.withTimeout(
        this.handleSessionRequest(request),
        30000, // 30 second timeout for request handling
        'Request processing timeout'
      );
      
      await this.client.respond({
        topic: this.session?.topic || '',
        response
      });
      
      console.log('Request approved');
    } catch (error) {
      console.error('Failed to approve request:', error);
      throw error;
    }
  }

  // Reject request
  async rejectRequest(request: WalletConnectRequest): Promise<void> {
    if (!this.client) return;

    try {
      console.log('Rejecting request:', request.id);
      
      await this.client.respond({
        topic: this.session?.topic || '',
        response: {
          id: request.id,
          jsonrpc: '2.0',
          error: {
            code: 4001,
            message: 'User rejected request'
          }
        }
      });
      
      console.log('Request rejected');
    } catch (error) {
      console.error('Failed to reject request:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const walletConnectManager = new WalletConnectManager();

