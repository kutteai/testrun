import { WalletConnectSession, WalletConnectRequest, WalletConnectProposal, SessionTypes, ProposalTypes } from './types';
import { WalletConnectSessionManager } from './session-manager';
import { WalletConnectEventHandler } from './event-handler';
import { getSdkError } from '@walletconnect/utils';

export class WalletConnectRequestHandler {
  private client: any;
  private session: WalletConnectSession | null;
  private sessionManager: WalletConnectSessionManager;
  private emit: (event: string, data?: any) => void;
  private withTimeout: <T>(promise: Promise<T>, timeoutMs: number, errorMessage: string) => Promise<T>;

  constructor(
    client: any,
    session: WalletConnectSession | null,
    sessionManager: WalletConnectSessionManager,
    emit: (event: string, data?: any) => void,
    withTimeout: <T>(promise: Promise<T>, timeoutMs: number, errorMessage: string) => Promise<T>,
  ) {
    this.client = client;
    this.session = session;
    this.sessionManager = sessionManager;
    this.emit = emit;
    this.withTimeout = withTimeout;
  }

  public setClient(client: any): void {
    this.client = client;
  }

  public setSession(session: WalletConnectSession | null): void {
    this.session = session;
  }

  // Check wallet status
  private async checkWalletStatus(): Promise<{ isUnlocked: boolean; accounts: string[] }> {
    try {
      // Send message to background script to check wallet status
      const response = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'WALLET_STATUS_CHECK' },
          resolve,
        );
      });

      return {
        isUnlocked: response.isUnlocked || false,
        accounts: response.accounts || [],
      };
    } catch (error) {
      // eslint-disable-next-line no-console
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
          resolve,
        );
      });

      return response.success || false;
    } catch (error) {
      // eslint-disable-next-line no-console
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
          resolve,
        );
      });

      return response.accounts || [];
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get wallet accounts:', error);
      return [];
    }
  }

  // Prompt user to unlock wallet
  private async promptWalletUnlock(): Promise<void> {
    try {
      // Open wallet popup to prompt unlock
      await chrome.action.openPopup();

      // Wait for user to unlock (poll for status change)
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(async () => {
          try {
            const status = this.checkWalletStatus();
            if ((await status).isUnlocked && (await status).accounts.length > 0) {
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
    } catch (error: any) {
      throw new Error(`Failed to prompt wallet unlock: ${error.message}`);
    }
  }

  private getAccounts(): string[] {
    if (!this.session) return [];
    return this.session.namespaces.eip155?.accounts.map((acc) => acc.split(':')[2]) || [];
  }

  // Get balance (real implementation)
  private async getBalance(address: string): Promise<string> {
    try {
      const { getRealBalance } = await import('../web3-utils');
      const balance = await getRealBalance(address, 'ethereum');
      return balance;
    } catch (error) {
      // eslint-disable-next-line no-console
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
          params: [message, address],
        }, resolve);
      });

      if (response?.success) {
        return response.result;
      }
      throw new Error(response?.error || 'Signing failed');
    } catch (error) {
      // eslint-disable-next-line no-console
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
          params: [address, data],
        }, resolve);
      });

      if (response?.success) {
        return response.result;
      }
      throw new Error(response?.error || 'Typed data signing failed');
    } catch (error) {
      // eslint-disable-next-line no-console
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
          params: [{ chainId }],
        }, resolve);
      });

      if (!response?.success) {
        throw new Error(response?.error || 'Chain switch failed');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error switching chain:', error);
      throw error;
    }
  }

  // Enhanced session request handling with wallet lock check
  public async handleSessionRequest(request: any): Promise<any> {
    const { method, params } = request;

    try {
      // For sensitive operations, check if wallet is unlocked
      const sensitiveOperations = [
        'eth_sendTransaction',
        'eth_signTransaction',
        'eth_sign',
        'personal_sign',
        'eth_signTypedData',
        'eth_signTypedData_v4',
      ];

      if (sensitiveOperations.includes(method)) {
        const walletStatus = await this.checkWalletStatus();
        if (!walletStatus.isUnlocked) {
          const unlocked = await this.requestWalletUnlock();
          if (!unlocked) {
            return {
              id: request.id,
              jsonrpc: '2.0',
              error: {
                code: 4001,
                message: 'Wallet unlock required for this operation',
              },
            };
          }
        }
      }

      switch (method) {
        case 'eth_accounts':
          return {
            id: request.id,
            jsonrpc: '2.0',
            result: this.getAccounts(),
          };

        case 'eth_requestAccounts':
          return {
            id: request.id,
            jsonrpc: '2.0',
            result: this.getAccounts(),
          };

        case 'eth_chainId':
          return {
            id: request.id,
            jsonrpc: '2.0',
            result: '0x1', // Ethereum mainnet
          };

        case 'eth_getBalance': {
          const [address, blockTag] = params;
          const balance = await this.getBalance(address);
          return {
            id: request.id,
            jsonrpc: '2.0',
            result: balance,
          };
        }

        case 'eth_sendTransaction': {
          const [transaction] = params;
          // Forward to background with timeout
          const txHash = await this.withTimeout(
            new Promise<string>((resolve, reject) => {
              chrome.runtime.sendMessage({
                type: 'WALLET_REQUEST',
                method: 'eth_sendTransaction',
                params: [transaction],
              }, (response) => {
                if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
                if (response?.success) return resolve(response.result);
                reject(new Error(response?.error || 'eth_sendTransaction failed'));
              });
            }),
            30000, // 30 second timeout for transactions
            'Transaction timeout - please try again',
          );
          return {
            id: request.id,
            jsonrpc: '2.0',
            result: txHash,
          };
        }

        case 'eth_sign':
        case 'personal_sign': {
          const [message, signAddress] = params;
          const signature = await this.withTimeout(
            this.signMessage(message, signAddress),
            15000, // 15 second timeout for signing
            'Signing timeout - please try again',
          );
          return {
            id: request.id,
            jsonrpc: '2.0',
            result: signature,
          };
        }

        case 'eth_signTypedData':
        case 'eth_signTypedData_v4': {
          const [typedData, typedDataAddress] = params;
          const typedSignature = await this.withTimeout(
            this.signTypedData(typedData, typedDataAddress),
            15000, // 15 second timeout for signing
            'Typed data signing timeout - please try again',
          );
          return {
            id: request.id,
            jsonrpc: '2.0',
            result: typedSignature,
          };
        }

        case 'wallet_switchEthereumChain':
          await this.switchChain(params[0].chainId);
          return {
            id: request.id,
            jsonrpc: '2.0',
            result: null,
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
                result: { unlocked: true },
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
                result: { unlocked: true },
              };
            }
            throw new Error('Wallet unlock failed or was cancelled by user');
          } catch (error) {
            return {
              id: request.id,
              jsonrpc: '2.0',
              error: {
                code: -32002,
                message: `Wallet unlock failed: ${error.message}`,
              },
            };
          }

        case 'wallet_requestPermissions':
          // Handle permission requests
          return {
            id: request.id,
            jsonrpc: '2.0',
            result: [{
              eth_accounts: {},
            }],
          };

        case 'wallet_getPermissions':
          // Return current permissions
          return {
            id: request.id,
            jsonrpc: '2.0',
            result: [{
              eth_accounts: {},
            }],
          };

        default:
          return {
            id: request.id,
            jsonrpc: '2.0',
            error: {
              code: -32601,
              message: `Method ${method} not supported`,
            },
          };
      }
    } catch (error: any) {
      return {
        id: request.id,
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
        },
      };
    }
  }

  // Approve request with timeout
  async approveRequest(request: WalletConnectRequest): Promise<void> {
    if (!this.client) return;

    try {

      const response = await this.withTimeout(
        this.handleSessionRequest(request),
        30000, // 30 second timeout for request handling
        'Request processing timeout',
      );

      await this.client.respond({
        topic: this.session?.topic || '',
        response,
      });

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to approve request:', error);
      throw error;
    }
  }

  // Reject request
  async rejectRequest(request: WalletConnectRequest): Promise<void> {
    if (!this.client) return;

    try {

      await this.client.respond({
        topic: this.session?.topic || '',
        response: {
          id: request.id,
          jsonrpc: '2.0',
          error: {
            code: 4001,
            message: 'User rejected request',
          },
        },
      });

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to reject request:', error);
      throw error;
    }
  }
}
