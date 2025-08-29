import { createHash, randomBytes } from 'crypto-browserify';
import { Keypair, Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction } from '@solana/spl-token';

// Solana network constants
export const SOLANA_NETWORKS = {
  mainnet: {
    name: 'Solana Mainnet',
    symbol: 'SOL',
    endpoint: 'https://api.mainnet-beta.solana.com',
    explorer: 'https://explorer.solana.com'
  },
  testnet: {
    name: 'Solana Testnet',
    symbol: 'SOL',
    endpoint: 'https://api.testnet.solana.com',
    explorer: 'https://explorer.solana.com/?cluster=testnet'
  },
  devnet: {
    name: 'Solana Devnet',
    symbol: 'SOL',
    endpoint: 'https://api.devnet.solana.com',
    explorer: 'https://explorer.solana.com/?cluster=devnet'
  }
};

// Solana transaction interface
export interface SolanaTransaction {
  signature: string;
  slot: number;
  confirmations: number;
  timestamp: number;
  amount: number;
  fee: number;
  type: 'send' | 'receive' | 'token_transfer';
  address: string;
  tokenSymbol?: string;
  tokenMint?: string;
}

// Solana wallet interface
export interface SolanaWallet {
  id: string;
  name: string;
  address: string;
  publicKey: string;
  privateKey: string;
  balance: number;
  network: 'mainnet' | 'testnet' | 'devnet';
  createdAt: number;
  tokens: SolanaToken[];
}

// Solana token interface
export interface SolanaToken {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: number;
  price?: number;
}

// Real Solana wallet generation
export class SolanaWalletGenerator {
  private connection: Connection;
  private network: typeof SOLANA_NETWORKS.mainnet;

  constructor(network: 'mainnet' | 'testnet' | 'devnet' = 'devnet') {
    this.network = SOLANA_NETWORKS[network];
    this.connection = new Connection(this.network.endpoint, 'confirmed');
  }

  // Generate Solana keypair
  generateKeypair(): Keypair {
    return Keypair.generate();
  }

  // Generate Solana wallet
  generateWallet(name: string, network: 'mainnet' | 'testnet' | 'devnet' = 'devnet'): SolanaWallet {
    const keypair = this.generateKeypair();
    
    return {
      id: createHash('sha256').update(keypair.secretKey).digest('hex'),
      name,
      address: keypair.publicKey.toString(),
      publicKey: keypair.publicKey.toString(),
      privateKey: Buffer.from(keypair.secretKey).toString('base64'),
      balance: 0,
      network,
      createdAt: Date.now(),
      tokens: []
    };
  }

  // Get wallet balance
  async getBalance(address: string): Promise<number> {
    try {
      const publicKey = new PublicKey(address);
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error fetching Solana balance:', error);
      return 0;
    }
  }

  // Get token accounts
  async getTokenAccounts(address: string): Promise<SolanaToken[]> {
    try {
      const publicKey = new PublicKey(address);
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: TOKEN_PROGRAM_ID
      });

      return tokenAccounts.value.map(account => {
        const accountInfo = account.account.data.parsed.info;
        return {
          mint: accountInfo.mint,
          symbol: accountInfo.tokenAmount.symbol || 'Unknown',
          name: accountInfo.tokenAmount.name || 'Unknown Token',
          decimals: accountInfo.tokenAmount.decimals,
          balance: accountInfo.tokenAmount.uiAmount || 0
        };
      });
    } catch (error) {
      console.error('Error fetching token accounts:', error);
      return [];
    }
  }

  // Create associated token account
  async createAssociatedTokenAccount(
    wallet: SolanaWallet,
    tokenMint: string
  ): Promise<string> {
    try {
      const keypair = Keypair.fromSecretKey(Buffer.from(wallet.privateKey, 'base64'));
      const mintPublicKey = new PublicKey(tokenMint);
      const associatedTokenAddress = await getAssociatedTokenAddress(
        mintPublicKey,
        keypair.publicKey
      );

      const transaction = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          keypair.publicKey,
          associatedTokenAddress,
          keypair.publicKey,
          mintPublicKey
        )
      );

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [keypair]
      );

      return signature;
    } catch (error) {
      console.error('Error creating associated token account:', error);
      throw error;
    }
  }

  // Send SOL transaction
  async sendSol(
    wallet: SolanaWallet,
    toAddress: string,
    amount: number
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      const keypair = Keypair.fromSecretKey(Buffer.from(wallet.privateKey, 'base64'));
      const toPublicKey = new PublicKey(toAddress);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: toPublicKey,
          lamports: amount * LAMPORTS_PER_SOL
        })
      );

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [keypair]
      );

      return { success: true, signature };
    } catch (error) {
      console.error('Error sending SOL:', error);
      return { success: false, error: error.message };
    }
  }

  // Send token transaction
  async sendToken(
    wallet: SolanaWallet,
    tokenMint: string,
    toAddress: string,
    amount: number
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      const keypair = Keypair.fromSecretKey(Buffer.from(wallet.privateKey, 'base64'));
      const mintPublicKey = new PublicKey(tokenMint);
      const toPublicKey = new PublicKey(toAddress);

      // Get or create associated token accounts
      const fromTokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        keypair.publicKey
      );

      const toTokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        toPublicKey
      );

      const transaction = new Transaction();

      // Create destination token account if it doesn't exist
      const toTokenAccountInfo = await this.connection.getAccountInfo(toTokenAccount);
      if (!toTokenAccountInfo) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            keypair.publicKey,
            toTokenAccount,
            toPublicKey,
            mintPublicKey
          )
        );
      }

      // Add transfer instruction
      transaction.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          keypair.publicKey,
          amount
        )
      );

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [keypair]
      );

      return { success: true, signature };
    } catch (error) {
      console.error('Error sending token:', error);
      return { success: false, error: error.message };
    }
  }

  // Get transaction history
  async getTransactions(address: string): Promise<SolanaTransaction[]> {
    try {
      const publicKey = new PublicKey(address);
      const signatures = await this.connection.getSignaturesForAddress(publicKey, { limit: 20 });
      
      const transactions: SolanaTransaction[] = [];
      
      for (const sig of signatures) {
        try {
          const tx = await this.connection.getTransaction(sig.signature, {
            commitment: 'confirmed'
          });
          
          if (tx && tx.meta) {
            const preBalances = tx.meta.preBalances;
            const postBalances = tx.meta.postBalances;
            const preTokenBalances = tx.meta.preTokenBalances || [];
            const postTokenBalances = tx.meta.postTokenBalances || [];
            
            // Calculate SOL balance change
            const accountIndex = tx.transaction.message.accountKeys.findIndex(
              key => key.toString() === address
            );
            
            if (accountIndex !== -1) {
              const balanceChange = (postBalances[accountIndex] - preBalances[accountIndex]) / LAMPORTS_PER_SOL;
              
              if (balanceChange !== 0) {
                transactions.push({
                  signature: sig.signature,
                  slot: tx.slot,
                  confirmations: 1, // Simplified
                  timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
                  amount: Math.abs(balanceChange),
                  fee: tx.meta.fee / LAMPORTS_PER_SOL,
                  type: balanceChange > 0 ? 'receive' : 'send',
                  address
                });
              }
            }
            
            // Handle token transfers
            for (const tokenBalance of postTokenBalances) {
              if (tokenBalance.owner === address) {
                const preBalance = preTokenBalances.find(
                  pre => pre.accountIndex === tokenBalance.accountIndex
                );
                
                if (preBalance) {
                  const balanceChange = (tokenBalance.uiTokenAmount.uiAmount || 0) - 
                                       (preBalance.uiTokenAmount.uiAmount || 0);
                  
                  if (balanceChange !== 0) {
                    transactions.push({
                      signature: sig.signature,
                      slot: tx.slot,
                      confirmations: 1,
                      timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
                      amount: Math.abs(balanceChange),
                      fee: tx.meta.fee / LAMPORTS_PER_SOL,
                      type: 'token_transfer',
                      address,
                                                 tokenSymbol: (tokenBalance.uiTokenAmount as any).symbol || 'UNK',
                      tokenMint: tokenBalance.mint
                    });
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('Error processing transaction:', error);
        }
      }
      
      return transactions.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error fetching Solana transactions:', error);
      return [];
    }
  }

  // Get token price from CoinGecko API
  async getTokenPrice(tokenMint: string): Promise<number | null> {
    try {
      // This would call CoinGecko API to get real token prices
      // For now, return null to indicate no price data available
      console.warn('Token price fetching not yet implemented. Please implement CoinGecko API integration.');
      return null;
    } catch (error) {
      console.error('Error fetching token price:', error);
      return null;
    }
  }

  // Airdrop SOL (devnet/testnet only)
  async airdropSol(address: string, amount: number = 1): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      if (this.network.endpoint.includes('mainnet')) {
        return { success: false, error: 'Airdrop not available on mainnet' };
      }

      const publicKey = new PublicKey(address);
      const signature = await this.connection.requestAirdrop(publicKey, amount * LAMPORTS_PER_SOL);
      
      await this.connection.confirmTransaction(signature);
      
      return { success: true, signature };
    } catch (error) {
      console.error('Error airdropping SOL:', error);
      return { success: false, error: error.message };
    }
  }
}

// Solana API utilities for real blockchain interaction
export class SolanaAPI {
  private connection: Connection;
  private network: typeof SOLANA_NETWORKS.mainnet;

  constructor(network: 'mainnet' | 'testnet' | 'devnet' = 'devnet') {
    this.network = SOLANA_NETWORKS[network];
    this.connection = new Connection(this.network.endpoint, 'confirmed');
  }

  // Get network status
  async getNetworkStatus(): Promise<{ slot: number; blockHeight: number; clusterNodes: number }> {
    try {
      const slot = await this.connection.getSlot();
      const blockHeight = await this.connection.getBlockHeight();
      const clusterNodes = await this.connection.getClusterNodes();
      
      return {
        slot,
        blockHeight,
        clusterNodes: clusterNodes.length
      };
    } catch (error) {
      console.error('Error fetching network status:', error);
      return { slot: 0, blockHeight: 0, clusterNodes: 0 };
    }
  }

  // Get recent performance
  async getRecentPerformance(): Promise<{ tps: number; avgBlockTime: number }> {
    try {
      const performance = await this.connection.getRecentPerformanceSamples(1);
      
      if (performance.length > 0) {
        return {
          tps: performance[0].numTransactions / performance[0].samplePeriodSecs,
          avgBlockTime: performance[0].samplePeriodSecs / performance[0].numSlots
        };
      }
      
      return { tps: 0, avgBlockTime: 0 };
    } catch (error) {
      console.error('Error fetching performance:', error);
      return { tps: 0, avgBlockTime: 0 };
    }
  }

  // Get token metadata
  async getTokenMetadata(tokenMint: string): Promise<{ name: string; symbol: string; decimals: number } | null> {
    try {
      const mintPublicKey = new PublicKey(tokenMint);
      const mintInfo = await this.connection.getParsedAccountInfo(mintPublicKey);
      
      if (mintInfo.value && 'parsed' in mintInfo.value.data) {
        const parsedData = mintInfo.value.data.parsed as any;
        return {
          name: parsedData.info.name || 'Unknown',
          symbol: parsedData.info.symbol || 'UNK',
          decimals: parsedData.info.decimals || 0
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching token metadata:', error);
      return null;
    }
  }
}

// Export main utilities
export const solanaUtils = {
  generateWallet: (name: string, network: 'mainnet' | 'testnet' | 'devnet' = 'devnet') => {
    const generator = new SolanaWalletGenerator(network);
    return generator.generateWallet(name, network);
  },
  
  getBalance: async (address: string, network: 'mainnet' | 'testnet' | 'devnet' = 'devnet') => {
    const generator = new SolanaWalletGenerator(network);
    return generator.getBalance(address);
  },
  
  getTokenAccounts: async (address: string, network: 'mainnet' | 'testnet' | 'devnet' = 'devnet') => {
    const generator = new SolanaWalletGenerator(network);
    return generator.getTokenAccounts(address);
  },
  
  sendSol: async (wallet: SolanaWallet, toAddress: string, amount: number) => {
    const generator = new SolanaWalletGenerator(wallet.network);
    return generator.sendSol(wallet, toAddress, amount);
  },
  
  sendToken: async (wallet: SolanaWallet, tokenMint: string, toAddress: string, amount: number) => {
    const generator = new SolanaWalletGenerator(wallet.network);
    return generator.sendToken(wallet, tokenMint, toAddress, amount);
  },
  
  getTransactions: async (address: string, network: 'mainnet' | 'testnet' | 'devnet' = 'devnet') => {
    const generator = new SolanaWalletGenerator(network);
    return generator.getTransactions(address);
  },
  
  airdropSol: async (address: string, amount: number = 1, network: 'mainnet' | 'testnet' | 'devnet' = 'devnet') => {
    const generator = new SolanaWalletGenerator(network);
    return generator.airdropSol(address, amount);
  },
  
  getNetworkStatus: async (network: 'mainnet' | 'testnet' | 'devnet' = 'devnet') => {
    const api = new SolanaAPI(network);
    return api.getNetworkStatus();
  },
  
  getRecentPerformance: async (network: 'mainnet' | 'testnet' | 'devnet' = 'devnet') => {
    const api = new SolanaAPI(network);
    return api.getRecentPerformance();
  }
};
