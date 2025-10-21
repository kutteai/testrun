import { SecurityManager } from './security-manager';
import { WalletManager } from './wallet-manager';
import { AddressDerivationService } from './address-derivation';
import { getBrowser } from '../../utils/browser';

// Cross-browser storage getter
const getStorageAPI = () => {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    return chrome.storage;
  }
  const browserAPI = getBrowser();
  if (browserAPI && browserAPI.storage) {
    return browserAPI.storage;
  }
  throw new Error('Browser storage API not available');
};

// Enhanced storage utility with better error handling
const storage = {

  // Enhanced get with error handling
  async get(keys: string | string[] | object | null): Promise<any> {
    try {
      const api = getStorageAPI();

      // Handle different browser APIs
      if (typeof getBrowser() !== 'undefined') {
        return await api.local.get(keys);
      }
      return new Promise((resolve, reject) => {
        api.local.get(keys, (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(result);
          }
        });
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Storage get error:', error);
      return {}; // Return empty object on error
    }
  },

  // Enhanced set with error handling
  async set(items: object): Promise<void> {
    try {
      const api = getStorageAPI();

      if (typeof getBrowser() !== 'undefined') {
        await api.local.set(items);
      } else {
        return new Promise((resolve, reject) => {
          api.local.set(items, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
      }

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Storage set error:', error);
      throw error;
    }
  },

  // Session storage methods
  async getSession(keys: string | string[] | object | null): Promise<any> {
    try {
      const api = getStorageAPI();

      if (typeof getBrowser() !== 'undefined') {
        return await api.session.get(keys);
      }
      return new Promise((resolve, reject) => {
        api.session.get(keys, (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(result);
          }
        });
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Session storage get error:', error);
      return {}; // Return empty object on error
    }
  },

  async setSession(items: object): Promise<void> {
    try {
      const api = getStorageAPI();

      if (typeof getBrowser() !== 'undefined') {
        await api.session.set(items);
      } else {
        return new Promise((resolve, reject) => {
          api.session.set(items, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
      }

    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Session storage set error:', error);
      // Don't throw for session storage failures
    }
  },

  async removeSession(keys: string | string[]): Promise<void> {
    try {
      const api = getStorageAPI();

      if (typeof getBrowser() !== 'undefined') {
        await api.session.remove(keys);
      } else {
        return new Promise((resolve, reject) => {
          api.session.remove(keys, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
      }

    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Session storage remove error:', error);
      // Don't throw for session storage failures
    }
  },

  async remove(keys: string | string[]): Promise<void> {
    try {
      const api = getStorageAPI();

      if (typeof getBrowser() !== 'undefined') {
        await api.local.remove(keys);
      } else {
        return new Promise((resolve, reject) => {
          api.local.remove(keys, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
      }

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Storage remove error:', error);
      throw error;
    }
  },

  // Clear all local storage
  async clear(): Promise<void> {
    try {
      const api = getStorageAPI();

      if (typeof getBrowser() !== 'undefined') {
        await api.local.clear();
      } else {
        return new Promise((resolve, reject) => {
          api.local.clear(() => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
      }

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Storage clear error:', error);
      throw error;
    }
  },

  // Clear all session storage
  async clearSession(): Promise<void> {
    try {
      const api = getStorageAPI();

      if (typeof getBrowser() !== 'undefined') {
        await api.session.clear();
      } else {
        return new Promise((resolve, reject) => {
          api.session.clear(() => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
      }

    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Session storage clear error:', error);
      // Don't throw for session storage failures
    }
  },
};

// Enhanced session manager with persistent storage
class SecureSessionManager {
  private static readonly SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes
  private static readonly STORAGE_KEY = 'paycio_session';
  private static readonly PASSWORD_KEY = 'paycio_temp_password';

  static async createSession(password: string): Promise<{ sessionId: string; timestamp: number }> {
    try {
      const sessionId = crypto.randomUUID();
      const timestamp = Date.now();

      const sessionData = {
        sessionId,
        timestamp,
        isValid: true,
        passwordHash: await this.hashPassword(password),
      };

      // Store session data in LOCAL storage (persistent)
      await storage.set({ [this.STORAGE_KEY]: sessionData });

      // Store password temporarily in LOCAL storage for immediate use
      // This will persist across browser sessions until explicitly cleared
      await storage.set({ [this.PASSWORD_KEY]: password });

      // Also store in session storage for immediate access
      await storage.setSession({ sessionPassword: password });

      return { sessionId, timestamp };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Session creation failed:', error);
      throw new Error('Failed to create session');
    }
  }

  static async validateSession(): Promise<boolean> {
    try {
      // Check LOCAL storage first (persistent)
      let result = await storage.get([this.STORAGE_KEY]);
      let sessionData = result[this.STORAGE_KEY];

      // Fallback to session storage if not found in local
      if (!sessionData) {
        result = await storage.getSession([this.STORAGE_KEY]);
        sessionData = result[this.STORAGE_KEY];
      }

      if (!sessionData || !sessionData.sessionId || !sessionData.timestamp) {
        return false;
      }

      const now = Date.now();
      const sessionAge = now - sessionData.timestamp;

      if (sessionAge > this.SESSION_TIMEOUT) {
        await this.destroySession();
        return false;
      }

      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Session validation failed:', error);
      return false;
    }
  }

  static async extendSession(): Promise<boolean> {
    try {
      // Check LOCAL storage first
      let result = await storage.get([this.STORAGE_KEY]);
      let sessionData = result[this.STORAGE_KEY];

      // Fallback to session storage
      if (!sessionData) {
        result = await storage.getSession([this.STORAGE_KEY]);
        sessionData = result[this.STORAGE_KEY];
      }

      if (!sessionData || !sessionData.isValid) {
        return false;
      }

      // Update timestamp
      const updatedSessionData = {
        ...sessionData,
        timestamp: Date.now(),
      };

      // Update in LOCAL storage (persistent)
      await storage.set({ [this.STORAGE_KEY]: updatedSessionData });

      // Also update in session storage
      await storage.setSession({ [this.STORAGE_KEY]: updatedSessionData });

      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Session extension failed:', error);
      return false;
    }
  }

  static async destroySession(): Promise<void> {
    try {
      // Clear from LOCAL storage (persistent)
      await storage.remove([this.STORAGE_KEY, this.PASSWORD_KEY]);

      // Clear from session storage
      await storage.removeSession([this.STORAGE_KEY, 'sessionPassword']);

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Session destruction failed:', error);
    }
  }

  static async getSessionPassword(): Promise<string | null> {
    try {
      // Try session storage first (immediate access)
      let result = await storage.getSession(['sessionPassword']);
      if (result.sessionPassword) {
        return result.sessionPassword;
      }

      // Fallback to LOCAL storage (persistent)
      result = await storage.get([this.PASSWORD_KEY]);
      if (result[this.PASSWORD_KEY]) {
        // Restore to session storage for immediate access
        await storage.setSession({ sessionPassword: result[this.PASSWORD_KEY] });
        return result[this.PASSWORD_KEY];
      }

      return null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get session password:', error);
      return null;
    }
  }

  private static async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
}


class BlockchainService {
  private static rpcFallbacks: Record<string, string[]> = {
    ethereum: [
      'https://eth.llamarpc.com',
      'https://rpc.ankr.com/eth',
      'https://eth-mainnet.public.blastapi.io',
      'https://ethereum.publicnode.com',
    ],
    polygon: [
      'https://polygon-rpc.com',
      'https://rpc.ankr.com/polygon',
      'https://polygon-mainnet.public.blastapi.io',
      'https://polygon.meowrpc.com',
    ],
    bsc: [
      'https://bsc-dataseed1.binance.org',
      'https://rpc.ankr.com/bsc',
      'https://bsc.publicnode.com',
      'https://bsc-mainnet.public.blastapi.io',
    ],
    arbitrum: [
      'https://arb1.arbitrum.io/rpc',
      'https://rpc.ankr.com/arbitrum',
      'https://arbitrum.publicnode.com',
      'https://arbitrum-mainnet.public.blastapi.io',
    ],
    optimism: [
      'https://mainnet.optimism.io',
      'https://rpc.ankr.com/optimism',
      'https://optimism.publicnode.com',
      'https://optimism-mainnet.public.blastapi.io',
    ],
    avalanche: [
      'https://api.avax.network/ext/bc/C/rpc',
      'https://rpc.ankr.com/avalanche',
      'https://avalanche.publicnode.com',
    ],
  };

  static async makeRpcRequestWithFallbacks(network: string, method: string, params: any[] = []): Promise<any> {
    const rpcUrls = this.rpcFallbacks[network];
    if (!rpcUrls) {
      throw new Error(`Unsupported network: ${network}`);
    }

    let lastError: Error | null = null;

    for (const rpcUrl of rpcUrls) {
      try {

        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method,
            params,
            id: Date.now(),
          }),
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(`RPC Error: ${data.error.message || data.error}`);
        }

        if (data.result === undefined) {
          throw new Error('No result in RPC response');
        }

        return data.result;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`❌ RPC ${rpcUrl} failed:`, error.message);
        lastError = error instanceof Error ? error : new Error(String(error));
        continue;
      }
    }

    throw new Error(`All RPC endpoints failed for ${network}. Last error: ${lastError?.message}`);
  }

  static async getBalance(address: string, network = 'ethereum'): Promise<string> {
    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid Ethereum address format');
    }

    try {
      const balance = await this.makeRpcRequestWithFallbacks(network, 'eth_getBalance', [address, 'latest']);
      return balance;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to get balance for ${address} on ${network}:`, error);
      throw error;
    }
  }

  static async getTransactionCount(address: string, network = 'ethereum'): Promise<string> {
    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid Ethereum address format');
    }

    try {
      const nonce = await this.makeRpcRequestWithFallbacks(network, 'eth_getTransactionCount', [address, 'latest']);
      return nonce;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to get transaction count for ${address} on ${network}:`, error);
      throw error;
    }
  }

  static async getGasPrice(network = 'ethereum'): Promise<string> {
    try {
      const gasPrice = await this.makeRpcRequestWithFallbacks(network, 'eth_gasPrice', []);
      return gasPrice;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to get gas price for ${network}:`, error);
      // Return fallback gas price
      return '0x2540be400'; // 10 gwei
    }
  }

  // Non-EVM network methods
  static async getBitcoinBalance(address: string): Promise<string> {
    try {
      // Using BlockCypher API as fallback
      const response = await fetch(`https://api.blockcypher.com/v1/btc/main/addrs/${address}/balance`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      return data.balance.toString();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get Bitcoin balance:', error);
      return '0';
    }
  }

  static async getSolanaBalance(address: string): Promise<string> {
    try {
      const response = await fetch('https://api.mainnet-beta.solana.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [address],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.result?.value?.toString() || '0';
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get Solana balance:', error);
      return '0';
    }
  }

  // Generic balance fetcher that routes to appropriate method
  static async getNetworkBalance(address: string, network: string): Promise<string> {
    try {
      switch (network.toLowerCase()) {
        case 'bitcoin':
          return await this.getBitcoinBalance(address);
        case 'solana':
          return await this.getSolanaBalance(address);
        case 'ethereum':
        case 'polygon':
        case 'bsc':
        case 'arbitrum':
        case 'optimism':
        case 'avalanche':
          return await this.getBalance(address, network);
        default:
          // eslint-disable-next-line no-console
          console.warn(`Unsupported network: ${network}`);
          return '0';
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to get balance for ${network}:`, error);
      return '0';
    }
  }

  // Enhanced transaction sending with proper error handling
  static async sendTransaction(txParams: any, network = 'ethereum'): Promise<string> {
    try {
      // Validate transaction parameters
      if (!txParams.to || !txParams.from) {
        throw new Error('Transaction must have to and from addresses');
      }

      // Get wallet state from storage
      const result = await storage.get(['wallet', 'walletState']);
      const { wallet } = result;
      const { walletState } = result;

      if (!wallet || !walletState?.isWalletUnlocked) {
        throw new Error('Wallet is locked or not found');
      }

      // SECURITY FIX: Get password from secure session storage
      const sessionResult = await storage.getSession(['sessionPassword']);
      const password = sessionResult.sessionPassword;

      if (!password) {
        throw new Error('Session expired - please unlock wallet again');
      }

      // Decrypt seed phrase
      const seedPhrase = await SecurityManager.decrypt(wallet.encryptedSeedPhrase, password);

      // Route to appropriate network handler
      let txHash: string;
      switch (network.toLowerCase()) {
        case 'ethereum':
        case 'polygon':
        case 'bsc':
        case 'arbitrum':
        case 'optimism':
        case 'avalanche':
          txHash = await this.sendEthereumTransaction(txParams, network, seedPhrase);
          break;
        default:
          throw new Error(`Transaction sending not implemented for ${network}`);
      }

      const transaction = {
        hash: txHash,
        from: txParams.from,
        to: txParams.to,
        value: txParams.value || '0x0',
        gasPrice: txParams.gasPrice,
        gasLimit: txParams.gasLimit,
        nonce: txParams.nonce,
        network,
        timestamp: Date.now(),
        status: 'pending',
      };

      const storageResult = await storage.get(['transactions']);
      const transactions = storageResult.transactions || [];
      transactions.push(transaction);
      await storage.set({ transactions });

      return txHash;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Transaction failed:', error);
      throw new Error(`Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async sendEthereumTransaction(txParams: any, network: string, seedPhrase: string): Promise<string> {
    try {
      const { ethers } = await import('ethers');

      // Get network RPC URL
      const rpcUrl = this.getNetworkRpcUrl(network);
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      // Derive wallet from seed phrase
      const wallet = ethers.Wallet.fromPhrase(seedPhrase).connect(provider);

      // Create transaction object
      const tx = {
        to: txParams.to,
        value: txParams.value || '0x0',
        data: txParams.data || '0x',
        gasLimit: txParams.gasLimit || '21000',
        gasPrice: txParams.gasPrice || '20000000000', // 20 gwei
        nonce: txParams.nonce || 0,
        chainId: txParams.chainId || 1,
      };

      // Send transaction
      const txResponse = await wallet.sendTransaction(tx);
      return txResponse.hash;
    } catch (error) {
      throw new Error(`Ethereum transaction failed: ${error.message}`);
    }
  }

  static async sendBitcoinTransaction(txParams: any, seedPhrase: string): Promise<string> {
    try {
      const bitcoin = await import('bitcoinjs-lib');
      const { ECPairFactory } = await import('ecpair');
      const ecc = await import('tiny-secp256k1');

      // Derive key pair from seed phrase
      const seed = bitcoin.crypto.sha256(Buffer.from(seedPhrase));
      const ECPair = ECPairFactory(ecc);
      const keyPair = ECPair.fromPrivateKey(seed);

      // Create transaction
      const txb = new (bitcoin as any).TransactionBuilder(bitcoin.networks.bitcoin);

      // Add inputs and outputs based on txParams
      if (txParams.inputs) {
        txParams.inputs.forEach((input: any) => {
          txb.addInput(input.txId, input.vout);
        });
      }

      if (txParams.outputs) {
        txParams.outputs.forEach((output: any) => {
          txb.addOutput(output.address, output.value);
        });
      }

      // Sign inputs
      if (txParams.inputs) {
        txParams.inputs.forEach((input: any, index: number) => {
          txb.sign(index, keyPair);
        });
      }

      const tx = txb.build();
      const txHex = tx.toHex();

      // Broadcast transaction (would need actual Bitcoin node or API)
      // For now, return the signed transaction hex
      return txHex;
    } catch (error) {
      throw new Error(`Bitcoin transaction failed: ${error.message}`);
    }
  }

  static async sendSolanaTransaction(txParams: any, seedPhrase: string): Promise<string> {
    try {
      const {
        Connection, Transaction, PublicKey, Keypair,
      } = await import('@solana/web3.js');
      // For Solana key derivation, we'll use a simpler approach
      const crypto = await import('crypto');

      // Derive keypair from seed phrase using crypto hash
      const seed = crypto.createHash('sha256').update(seedPhrase).digest();
      const keypair = Keypair.fromSeed(seed);

      // Create connection
      const connection = new Connection('https://api.mainnet-beta.solana.com');

      // Create transaction
      const transaction = new Transaction();

      // Add instructions based on txParams
      if (txParams.instructions) {
        txParams.instructions.forEach((instruction: any) => {
          transaction.add(instruction);
        });
      }

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;

      // Set fee payer
      transaction.feePayer = keypair.publicKey;

      // Sign transaction
      transaction.sign(keypair);

      // Send transaction
      const signature = await connection.sendRawTransaction(transaction.serialize());
      return signature;
    } catch (error) {
      throw new Error(`Solana transaction failed: ${error.message}`);
    }
  }

  static async signMessage(method: string, params: any[], seedPhrase: string): Promise<string> {
    try {
      const { ethers } = await import('ethers');

      // Derive wallet from seed phrase
      const wallet = ethers.Wallet.fromPhrase(seedPhrase);

      switch (method) {
        case 'personal_sign': {
          const message = params[0];
          const signature = await wallet.signMessage(message);
          return signature;
        }

        case 'eth_signTypedData':
        case 'eth_signTypedData_v4': {
          const typedData = params[1];
          const typedSignature = await wallet.signTypedData(typedData.domain, typedData.types, typedData.message);
          return typedSignature;
        }

        default:
          throw new Error(`Unsupported signing method: ${method}`);
      }
    } catch (error) {
      throw new Error(`Message signing failed: ${error.message}`);
    }
  }

  private static getNetworkRpcUrl(network: string): string {
    const rpcUrls: Record<string, string> = {
      ethereum: 'https://eth.llamarpc.com',
      polygon: 'https://polygon-rpc.com',
      bsc: 'https://bsc-dataseed1.binance.org',
      arbitrum: 'https://arb1.arbitrum.io/rpc',
      optimism: 'https://mainnet.optimism.io',
      avalanche: 'https://api.avax.network/ext/bc/C/rpc',
    };

    return rpcUrls[network] || rpcUrls.ethereum;
  }
}

export { BlockchainService };
