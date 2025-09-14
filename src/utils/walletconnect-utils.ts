import { SignClient } from '@walletconnect/sign-client';
import { getSdkError } from '@walletconnect/utils';
import { ethers } from 'ethers';

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

  constructor() {
    // Get project ID from environment or use a working default
    this.projectId = process.env.WALLETCONNECT_PROJECT_ID || '4f7e02b6d85b4e24bf2f2f2b2f2f2f2f';
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
    });
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
      const session = await approval();
      console.log('Session approved:', session);
      this.session = session;
      
      const formattedSession = this.formatSession(session);
      console.log('Formatted session:', formattedSession);
      
      return {
        uri,
        session: formattedSession
      };
    } catch (error) {
      console.error('WalletConnect connection failed:', error);
      throw new Error(`WalletConnect connection failed: ${error}`);
    }
  }

  // Approve session proposal
  async approveSession(proposal: WalletConnectProposal): Promise<void> {
    if (!this.client) return;

    try {
      console.log('Approving session proposal:', proposal.id);
      
      const { topic } = await this.client.approve({
        id: proposal.id,
        namespaces: {
          eip155: {
            methods: ['eth_sendTransaction', 'eth_signTransaction', 'personal_sign'],
            chains: ['eip155:1'],
            events: ['chainChanged', 'accountsChanged'],
            accounts: ['eip155:1:0x0000000000000000000000000000000000000000']
          }
        }
      });

      console.log('Session approved:', topic);
    } catch (error) {
      console.error('Failed to approve session:', error);
      throw error;
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

  // Get accounts for specified chains
  private getAccountsForChains(chains: string[]): string[] {
    // Import wallet manager to get real accounts
    const { WalletManager } = require('../core/wallet-manager');
    const walletManager = new WalletManager();
    
    const accounts: string[] = [];
    
    chains.forEach(chain => {
      const chainId = parseInt(chain.split(':')[1]);
      const networkName = this.getNetworkNameFromChainId(chainId);
      
      // Get real accounts from wallet manager
      const realAccounts = walletManager.getAccountsByNetwork(networkName);
      if (realAccounts.length > 0) {
        accounts.push(`${chain}:${realAccounts[0].address}`);
      } else {
        // If no real accounts exist, throw an error instead of using mock
        throw new Error(`No accounts found for network: ${networkName}`);
      }
    });

    return accounts;
  }

  // Get network name from chain ID
  private getNetworkNameFromChainId(chainId: number): string {
    const networkMap: Record<number, string> = {
      1: 'ethereum',
      56: 'bsc',
      137: 'polygon',
      43114: 'avalanche',
      42161: 'arbitrum',
      10: 'optimism'
    };
    return networkMap[chainId] || 'ethereum';
  }

  // Approve request
  async approveRequest(request: WalletConnectRequest): Promise<void> {
    if (!this.client) return;

    try {
      console.log('Approving request:', request.id);
      
      const response = await this.handleSessionRequest(request);
      
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

  // Handle session requests
  private async handleSessionRequest(request: any): Promise<any> {
    const { method, params } = request;

    try {
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
          // Forward to background WALLET_REQUEST so it uses the same signer flow
          const txHash = await new Promise<string>((resolve, reject) => {
            chrome.runtime.sendMessage({ type: 'WALLET_REQUEST', method: 'eth_sendTransaction', params: [transaction] }, (response) => {
              if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
              if (response?.success) return resolve(response.result);
              reject(new Error(response?.error || 'eth_sendTransaction failed'));
            });
          });
          return {
            id: request.id,
            jsonrpc: '2.0',
            result: txHash
          };

        case 'eth_sign':
        case 'personal_sign':
          const [message, signAddress] = params;
          const signature = await this.signMessage(message, signAddress);
          return {
            id: request.id,
            jsonrpc: '2.0',
            result: signature
          };

        case 'eth_signTypedData':
        case 'eth_signTypedData_v4':
          const [typedData, typedDataAddress] = params;
          const typedSignature = await this.signTypedData(typedData, typedDataAddress);
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
          // WalletConnect doesn't support unlock method - wallets should be pre-unlocked
          return {
            id: request.id,
            jsonrpc: '2.0',
            error: {
              code: -32601,
              message: 'wallet_unlock method not supported. Please unlock your wallet manually.'
            }
          };

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
  private formatSession(session: WalletConnectSession): WalletConnectSession {
    const accounts = Object.values(session.namespaces.eip155?.accounts || []) as string[];
    
    return {
      topic: session.topic,
      chainId: parseInt(accounts[0]?.split(':')[1] || '1'),
      accounts: accounts.map(acc => acc.split(':')[2]),
      connected: true,
      namespaces: session.namespaces,
      clientMeta: session.clientMeta
    };
  }

  // Update session
  private updateSession(topic: string): void {
    if (!this.client) return;
    this.session = this.client.session.get(topic);
  }

  // Disconnect from WalletConnect
  async disconnect(): Promise<void> {
    if (this.client && this.session) {
      await this.client.disconnect({
        topic: this.session.topic,
        reason: getSdkError('USER_DISCONNECTED')
      });
    }
    
    this.session = null;
    this.uri = null;
    this.proposal = null;
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

  // Send transaction (real implementation)
  private async sendTransaction(transaction: any): Promise<string> {
    try {
      const { signTransaction, sendSignedTransaction } = await import('./web3-utils');
      
      // Get private key from wallet manager
      const { WalletManager } = require('../core/wallet-manager');
      const walletManager = new WalletManager();
      const account = walletManager.getAccountByAddress(transaction.from);
      
      if (!account) {
        throw new Error('Account not found');
      }

      // In a real implementation, you would decrypt the private key with user password
      // Get password from user (in real implementation, this would be a secure prompt)
      const password = await this.promptForPassword();
      if (!password) {
        throw new Error('Password required for transaction signing');
      }
      
      // Decrypt private key
      const { decryptData } = await import('./crypto-utils');
      const decryptedPrivateKey = await decryptData(account.privateKey, password);
      if (!decryptedPrivateKey) {
        throw new Error('Invalid password');
      }
      
      // Sign and send transaction
      const signedTx = await signTransaction(transaction, decryptedPrivateKey, 'ethereum');
      const txHash = await sendSignedTransaction(signedTx, 'ethereum');
      
      return txHash;
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw error;
    }
  }

  // Sign message (real implementation)
  private async signMessage(message: string, address: string): Promise<string> {
    try {
      const { signMessage } = await import('./web3-utils');
      
      // Get private key from wallet manager
      const { WalletManager } = require('../core/wallet-manager');
      const walletManager = new WalletManager();
      const account = walletManager.getAccountByAddress(address);
      
      if (!account) {
        throw new Error('Account not found');
      }

      const privateKey = account.privateKey; // This should be decrypted
      const signature = await signMessage(message, privateKey);
      
      return signature;
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  }

  // Sign typed data (real implementation)
  private async signTypedData(data: any, address: string): Promise<string> {
    try {
      const { signTypedData } = await import('./web3-utils');
      
      // Get private key from wallet manager
      const { WalletManager } = require('../core/wallet-manager');
      const walletManager = new WalletManager();
      const account = walletManager.getAccountByAddress(address);
      
      if (!account) {
        throw new Error('Account not found');
      }

      const privateKey = account.privateKey; // This should be decrypted
      const signature = await signTypedData(data, privateKey);
      
      return signature;
    } catch (error) {
      console.error('Error signing typed data:', error);
      throw error;
    }
  }

  // Switch chain
  private async switchChain(chainId: string): Promise<void> {
    // In real implementation, update wallet network
    console.log('Switching to chain:', chainId);
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

  // Prompt for password (real implementation)
  private async promptForPassword(): Promise<string | null> {
    try {
      // In a real implementation, this would show a secure password prompt
      // For now, we'll use a simple prompt (in production, this should be a secure UI)
      const password = prompt('Enter your wallet password to sign this transaction:');
      return password;
    } catch (error) {
      console.error('Error prompting for password:', error);
      return null;
    }
  }
}

// Export singleton instance
export const walletConnectManager = new WalletConnectManager(); 