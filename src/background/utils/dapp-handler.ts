import { WalletManager as CoreWalletManager } from '../../core/wallet-manager';
import { BlockchainService } from '../utils/blockchain-service';
import SecureSessionManager from '../../utils/secure-session-manager';
import { handlePublicMethod, handleUnlockedWalletRequest } from '../index';
import { NETWORK_CONFIGS } from '../index';

export class PaycioDAppHandler {
  private coreWalletManagerInstance: CoreWalletManager;

  constructor() {
    this.coreWalletManagerInstance = new CoreWalletManager();
  }

  async processRequest(request: any): Promise<any> {
    console.log('DAppHandler: Processing request', request);
    const { method, params, origin } = request;

    try {
      const hasWallet = await this.coreWalletManagerInstance.getAllWallets().then(wallets => wallets.length > 0);
      const isUnlocked = await SecureSessionManager.hasActiveSession();

      // Handle public methods that don't require wallet unlock
      const publicMethods = ['eth_chainId', 'net_version', 'eth_blockNumber'];
      if (publicMethods.includes(method)) {
        return await handlePublicMethod(method, params);
      }

      // Handle no wallet scenario
      if (!hasWallet) {
        return {
          success: false,
          error: 'NO_WALLET',
          data: {
            code: 4100,
            message: 'No wallet found. Please create a wallet first.',
            requiresSetup: true
          }
        };
      }

      // Handle wallet locked scenarios
      if (!isUnlocked) {
        const signingMethods = [
          'eth_sendTransaction', 'eth_signTransaction', 'eth_sign',
          'personal_sign', 'eth_signTypedData', 'eth_signTypedData_v3',
          'eth_signTypedData_v4'
        ];

        if (method === 'eth_requestAccounts' || method === 'eth_accounts') {
          return {
            success: false,
            error: 'WALLET_UNLOCK_REQUIRED',
            data: {
              code: 4100,
              message: 'Please unlock your wallet to connect to this DApp.',
              requiresUnlock: true,
              hasWallet: true,
              origin: origin,
              requestId: Date.now().toString(),
              pendingRequest: {
                method,
                params,
                origin,
                timestamp: Date.now()
              }
            }
          };
        } else if (signingMethods.includes(method)) {
          return {
            success: false,
            error: 'WALLET_UNLOCK_REQUIRED',
            data: {
              code: 4100,
              message: 'Please unlock your wallet to sign this transaction.',
              requiresUnlock: true,
              hasWallet: true,
              origin: origin,
              requestType: 'signing',
              pendingRequest: {
                method,
                params,
                origin,
                timestamp: Date.now()
              }
            }
          };
        } else {
          return {
            success: false,
            error: 'WALLET_LOCKED',
            data: {
              code: 4100,
              message: 'Wallet is locked. Please unlock to continue.',
              requiresUnlock: true,
              hasWallet: true
            }
          };
        }
      }

      // Wallet is unlocked - proceed with request
      return await handleUnlockedWalletRequest(method, params, origin);

    } catch (error: any) {
      console.error('DAppHandler processRequest error:', error);
      return {
        success: false,
        error: 'REQUEST_FAILED',
        data: {
          code: -32603,
          message: error.message || 'Internal error'
        }
      };
    }
  }
}
