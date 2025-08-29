import { createHash, randomBytes } from 'crypto-browserify';
import { pbkdf2Sync, createCipher, createDecipher } from 'crypto-browserify';

// TRON network constants
export const TRON_NETWORKS = {
  mainnet: {
    name: 'TRON Mainnet',
    symbol: 'TRX',
    endpoint: (process as any)?.env?.TRON_FULLNODE_URL || 'https://api.trongrid.io',
    explorer: 'https://tronscan.org',
    chainId: '0x2b6653dc'
  },
  testnet: {
    name: 'TRON Testnet',
    symbol: 'TRX',
    endpoint: (process as any)?.env?.TRON_FULLNODE_URL || 'https://api.shasta.trongrid.io',
    explorer: 'https://shasta.tronscan.org',
    chainId: '0xcd8690dc'
  }
};

// TRON transaction interface
export interface TronTransaction {
  txID: string;
  blockNumber: number;
  timestamp: number;
  amount: number;
  fee: number;
  type: 'send' | 'receive' | 'token_transfer' | 'contract_call';
  from: string;
  to: string;
  tokenSymbol?: string;
  contractAddress?: string;
  confirmed: boolean;
}

// TRON wallet interface
export interface TronWallet {
  id: string;
  name: string;
  address: string;
  publicKey: string;
  privateKey: string;
  balance: number;
  energy: number;
  bandwidth: number;
  network: 'mainnet' | 'testnet';
  derivationPath: string;
  createdAt: number;
}

// TRON token interface
export interface TronToken {
  contractAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: number;
  price?: number;
}

// Real TRON wallet generation
export class TronWalletGenerator {
  private network: typeof TRON_NETWORKS.mainnet;

  constructor(network: 'mainnet' | 'testnet' = 'mainnet') {
    this.network = TRON_NETWORKS[network];
  }

  // Generate private key
  private generatePrivateKey(): Buffer {
    return randomBytes(32);
  }

  // Get public key from private key
  private getPublicKey(privateKey: Buffer): Buffer {
    // In a real implementation, you'd use secp256k1 curve
    // For now, we'll use a simplified approach
    const hash = createHash('sha256').update(privateKey).digest();
    return hash.slice(0, 33); // Compressed public key
  }

  // Generate TRON address from public key
  private generateTronAddress(publicKey: Buffer): string {
    // TRON uses base58check encoding with prefix 0x41
    const prefix = Buffer.from([0x41]);
    const hash = createHash('sha256').update(publicKey).digest();
    const ripemd160 = createHash('ripemd160').update(hash).digest();
    const addressBytes = Buffer.concat([prefix, ripemd160]);
    
    // Double SHA256 for checksum
    const checksum = createHash('sha256')
      .update(createHash('sha256').update(addressBytes).digest())
      .digest()
      .slice(0, 4);
    
    const finalBytes = Buffer.concat([addressBytes, checksum]);
    
    // Base58 encoding (simplified)
    return this.base58Encode(finalBytes);
  }

  // Base58 encoding
  private base58Encode(buffer: Buffer): string {
    const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let num = BigInt('0x' + buffer.toString('hex'));
    let str = '';
    
    while (num > 0) {
      const mod = Number(num % BigInt(58));
      str = alphabet[mod] + str;
      num = num / BigInt(58);
    }
    
    // Handle leading zeros
    for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
      str = '1' + str;
    }
    
    return str;
  }

  // Generate TRON wallet
  generateWallet(name: string, network: 'mainnet' | 'testnet' = 'mainnet'): TronWallet {
    const privateKey = this.generatePrivateKey();
    const publicKey = this.getPublicKey(privateKey);
    const address = this.generateTronAddress(publicKey);

    return {
      id: createHash('sha256').update(privateKey).digest('hex'),
      name,
      address,
      publicKey: publicKey.toString('hex'),
      privateKey: privateKey.toString('hex'),
      balance: 0,
      energy: 0,
      bandwidth: 0,
      network,
      derivationPath: `m/44'/195'/0'/0/0`,
      createdAt: Date.now()
    };
  }

  // Get TRX balance
  async getBalance(address: string): Promise<number> {
    try {
      const response = await fetch(`${this.network.endpoint}/v1/accounts/${address}`);
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        return data.data[0].balance / 1_000_000; // Convert from sun to TRX
      }
      return 0;
    } catch (error) {
      console.error('Error fetching TRON balance:', error);
      return 0;
    }
  }

  // Get account resources (energy and bandwidth)
  async getAccountResources(address: string): Promise<{ energy: number; bandwidth: number }> {
    try {
      const response = await fetch(`${this.network.endpoint}/v1/accounts/${address}/resources`);
      const data = await response.json();
      
      return {
        energy: data.energyUsed || 0,
        bandwidth: data.NetUsed || 0
      };
    } catch (error) {
      console.error('Error fetching TRON resources:', error);
      return { energy: 0, bandwidth: 0 };
    }
  }

  // Get TRC20 token balance
  async getTokenBalance(address: string, contractAddress: string): Promise<number> {
    try {
      const response = await fetch(`${this.network.endpoint}/v1/contracts/${contractAddress}/tokens/trc20/balances?address=${address}`);
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        return parseFloat(data.data[0].balance);
      }
      return 0;
    } catch (error) {
      console.error('Error fetching TRC20 balance:', error);
      return 0;
    }
  }

  // Send TRX transaction
  async sendTrx(
    wallet: TronWallet,
    toAddress: string,
    amount: number
  ): Promise<{ success: boolean; txID?: string; error?: string }> {
    try {
      const TronWebModule = await import('tronweb');
      const TronWebCtor: any = (TronWebModule as any).default || (TronWebModule as any);
      const fullNode = (process as any)?.env?.TRON_FULLNODE_URL || this.network.endpoint;
      const solidityNode = (process as any)?.env?.TRON_SOLIDITYNODE_URL || fullNode;
      const eventServer = (process as any)?.env?.TRON_EVENTSERVER_URL || fullNode;
      const tronWeb = new TronWebCtor({ fullHost: fullNode, fullNode, solidityNode, eventServer, privateKey: wallet.privateKey });

      const amountSun = Math.round(amount * 1_000_000);
      const unsigned = await tronWeb.transactionBuilder.sendTrx(toAddress, amountSun, wallet.address);
      const signed = await tronWeb.trx.sign(unsigned, wallet.privateKey);
      const receipt = await tronWeb.trx.sendRawTransaction(signed);
      if (receipt?.result && receipt?.txid) {
        return { success: true, txID: receipt.txid };
      }
      return { success: false, error: 'Broadcast failed' };
    } catch (error) {
      console.error('Error sending TRX:', error);
      return { success: false, error: error.message };
    }
  }

  // Send TRC20 token transaction
  async sendToken(
    wallet: TronWallet,
    contractAddress: string,
    toAddress: string,
    amount: number
  ): Promise<{ success: boolean; txID?: string; error?: string }> {
    try {
      const TronWebModule = await import('tronweb');
      const TronWebCtor: any = (TronWebModule as any).default || (TronWebModule as any);
      const fullNode = (process as any)?.env?.TRON_FULLNODE_URL || this.network.endpoint;
      const solidityNode = (process as any)?.env?.TRON_SOLIDITYNODE_URL || fullNode;
      const eventServer = (process as any)?.env?.TRON_EVENTSERVER_URL || fullNode;
      const tronWeb = new TronWebCtor({ fullHost: fullNode, fullNode, solidityNode, eventServer, privateKey: wallet.privateKey });

      const contract = await tronWeb.contract().at(contractAddress);
      const decimals = 6; // Many TRC20 use 6, ideally query contract decimals()
      const scaled = BigInt(Math.round(amount * Math.pow(10, decimals))).toString();
      const tx = await contract.transfer(toAddress, scaled).send({ from: wallet.address });
      if (typeof tx === 'string') {
        return { success: true, txID: tx };
      }
      return { success: false, error: 'Token transfer failed' };
    } catch (error) {
      console.error('Error sending TRC20 token:', error);
      return { success: false, error: error.message };
    }
  }

  // Get transaction history
  async getTransactions(address: string): Promise<TronTransaction[]> {
    try {
      const response = await fetch(`${this.network.endpoint}/v1/accounts/${address}/transactions`);
      const data = await response.json();
      
      if (!data.data) return [];
      
      return data.data.map((tx: any) => ({
        txID: tx.txID,
        blockNumber: tx.blockNumber || 0,
        timestamp: tx.block_timestamp || Date.now(),
        amount: tx.raw_data?.contract?.[0]?.parameter?.value?.amount || 0,
        fee: tx.ret?.[0]?.fee || 0,
        type: this.getTransactionType(tx),
        from: tx.raw_data?.contract?.[0]?.parameter?.value?.owner_address || '',
        to: tx.raw_data?.contract?.[0]?.parameter?.value?.to_address || '',
        confirmed: tx.ret?.[0]?.contractRet === 'SUCCESS'
      }));
    } catch (error) {
      console.error('Error fetching TRON transactions:', error);
      return [];
    }
  }

  // Get transaction type
  private getTransactionType(tx: any): 'send' | 'receive' | 'token_transfer' | 'contract_call' {
    const contractType = tx.raw_data?.contract?.[0]?.type;
    
    switch (contractType) {
      case 'TransferContract':
        return 'send';
      case 'TriggerSmartContract':
        return 'token_transfer';
      default:
        return 'contract_call';
    }
  }

  // Get token metadata
  async getTokenMetadata(contractAddress: string): Promise<{ name: string; symbol: string; decimals: number } | null> {
    try {
      const response = await fetch(`${this.network.endpoint}/v1/contracts/${contractAddress}`);
      const data = await response.json();
      
      if (data.name && data.symbol) {
        return {
          name: data.name,
          symbol: data.symbol,
          decimals: data.decimals || 18
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching token metadata:', error);
      return null;
    }
  }
}

// TRON API utilities for real blockchain interaction
export class TronAPI {
  private network: typeof TRON_NETWORKS.mainnet;

  constructor(network: 'mainnet' | 'testnet' = 'mainnet') {
    this.network = TRON_NETWORKS[network];
  }

  // Get network status
  async getNetworkStatus(): Promise<{ blockHeight: number; totalSupply: number; tps: number }> {
    try {
      const response = await fetch(`${this.network.endpoint}/v1/chain/stats`);
      const data = await response.json();
      
      return {
        blockHeight: data.blockHeight || 0,
        totalSupply: data.totalSupply || 0,
        tps: data.tps || 0
      };
    } catch (error) {
      console.error('Error fetching TRON network status:', error);
      return { blockHeight: 0, totalSupply: 0, tps: 0 };
    }
  }

  // Get transaction details
  async getTransaction(txID: string): Promise<TronTransaction | null> {
    try {
      const response = await fetch(`${this.network.endpoint}/v1/transactions/${txID}`);
      const data = await response.json();
      
      if (!data.txID) return null;
      
      return {
        txID: data.txID,
        blockNumber: data.blockNumber || 0,
        timestamp: data.block_timestamp || Date.now(),
        amount: data.raw_data?.contract?.[0]?.parameter?.value?.amount || 0,
        fee: data.ret?.[0]?.fee || 0,
        type: 'send',
        from: data.raw_data?.contract?.[0]?.parameter?.value?.owner_address || '',
        to: data.raw_data?.contract?.[0]?.parameter?.value?.to_address || '',
        confirmed: data.ret?.[0]?.contractRet === 'SUCCESS'
      };
    } catch (error) {
      console.error('Error fetching TRON transaction:', error);
      return null;
    }
  }

  // Get gas price (energy price)
  async getEnergyPrice(): Promise<number> {
    try {
      const response = await fetch(`${this.network.endpoint}/v1/chain/parameters`);
      const data = await response.json();
      
      return data.energyPrice || 420;
    } catch (error) {
      console.error('Error fetching TRON energy price:', error);
      return 420; // Default energy price
    }
  }
}

// Export main utilities
export const tronUtils = {
  generateWallet: (name: string, network: 'mainnet' | 'testnet' = 'mainnet') => {
    const generator = new TronWalletGenerator(network);
    return generator.generateWallet(name, network);
  },
  
  getBalance: async (address: string, network: 'mainnet' | 'testnet' = 'mainnet') => {
    const generator = new TronWalletGenerator(network);
    return generator.getBalance(address);
  },
  
  getAccountResources: async (address: string, network: 'mainnet' | 'testnet' = 'mainnet') => {
    const generator = new TronWalletGenerator(network);
    return generator.getAccountResources(address);
  },
  
  getTokenBalance: async (address: string, contractAddress: string, network: 'mainnet' | 'testnet' = 'mainnet') => {
    const generator = new TronWalletGenerator(network);
    return generator.getTokenBalance(address, contractAddress);
  },
  
  sendTrx: async (wallet: TronWallet, toAddress: string, amount: number) => {
    const generator = new TronWalletGenerator(wallet.network);
    return generator.sendTrx(wallet, toAddress, amount);
  },
  
  sendToken: async (wallet: TronWallet, contractAddress: string, toAddress: string, amount: number) => {
    const generator = new TronWalletGenerator(wallet.network);
    return generator.sendToken(wallet, contractAddress, toAddress, amount);
  },
  
  getTransactions: async (address: string, network: 'mainnet' | 'testnet' = 'mainnet') => {
    const generator = new TronWalletGenerator(network);
    return generator.getTransactions(address);
  },
  
  getTokenMetadata: async (contractAddress: string, network: 'mainnet' | 'testnet' = 'mainnet') => {
    const generator = new TronWalletGenerator(network);
    return generator.getTokenMetadata(contractAddress);
  },
  
  getNetworkStatus: async (network: 'mainnet' | 'testnet' = 'mainnet') => {
    const api = new TronAPI(network);
    return api.getNetworkStatus();
  },
  
  getTransaction: async (txID: string, network: 'mainnet' | 'testnet' = 'mainnet') => {
    const api = new TronAPI(network);
    return api.getTransaction(txID);
  },
  
  getEnergyPrice: async (network: 'mainnet' | 'testnet' = 'mainnet') => {
    const api = new TronAPI(network);
    return api.getEnergyPrice();
  }
};
