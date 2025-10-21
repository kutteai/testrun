// Non-EVM Token Support for PayCio Wallet
// Supports tokens on Bitcoin, Litecoin, Solana, TRON, TON, XRP networks

export interface NonEVMToken {
  symbol: string;
  name: string;
  contractAddress?: string;
  tokenId?: string;
  network: string;
  standard: string; // e.g., 'Omni', 'SPL', 'TRC-20', 'Jetton'
  decimals: number;
  isPopular: boolean;
  description: string;
}

export interface NonEVMTokenBalance {
  address: string;
  balance: string;
  network: string;
  standard: string;
  isConfirmed: boolean;
  symbol?: string;
  name?: string;
  decimals?: number;
}

// Non-EVM token databases
export const NON_EVM_TOKENS: Record<string, NonEVMToken[]> = {
  // Bitcoin tokens (Omni Layer, Liquid, RGB, etc.)
  bitcoin: [
    {
      symbol: 'USDT',
      name: 'Tether USD (Omni)',
      contractAddress: '31', // Omni Layer property ID
      network: 'bitcoin',
      standard: 'Omni Layer',
      decimals: 8,
      isPopular: true,
      description: 'USDT on Bitcoin via Omni Layer protocol'
    },
    {
      symbol: 'MAID',
      name: 'MaidSafeCoin',
      contractAddress: '3',
      network: 'bitcoin',
      standard: 'Omni Layer',
      decimals: 0,
      isPopular: false,
      description: 'MaidSafeCoin on Bitcoin Omni Layer'
    },
    {
      symbol: 'L-BTC',
      name: 'Liquid Bitcoin',
      contractAddress: '6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d',
      network: 'bitcoin',
      standard: 'Liquid Network',
      decimals: 8,
      isPopular: true,
      description: 'Bitcoin on Liquid sidechain'
    },
    {
      symbol: 'L-USDT',
      name: 'Liquid Tether',
      contractAddress: 'ce091c998b83c78bb71a632313ba3760f1763d9cfcffae02258ffa9865a37bd2',
      network: 'bitcoin',
      standard: 'Liquid Network',
      decimals: 8,
      isPopular: true,
      description: 'USDT on Liquid sidechain'
    }
  ],

  // Litecoin tokens (rare but exist via OmniLite)
  litecoin: [
    {
      symbol: 'LTC-USDT',
      name: 'Tether on Litecoin',
      contractAddress: '1',
      network: 'litecoin',
      standard: 'OmniLite',
      decimals: 8,
      isPopular: false,
      description: 'Theoretical USDT on Litecoin (experimental)'
    }
  ],

  // Solana tokens (SPL tokens)
  solana: [
    {
      symbol: 'USDT',
      name: 'Tether USD',
      contractAddress: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      network: 'solana',
      standard: 'SPL',
      decimals: 6,
      isPopular: true,
      description: 'USDT on Solana'
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      contractAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      network: 'solana',
      standard: 'SPL',
      decimals: 6,
      isPopular: true,
      description: 'USDC on Solana'
    },
    {
      symbol: 'RAY',
      name: 'Raydium',
      contractAddress: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
      network: 'solana',
      standard: 'SPL',
      decimals: 6,
      isPopular: true,
      description: 'Raydium DEX token'
    },
    {
      symbol: 'SRM',
      name: 'Serum',
      contractAddress: 'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt',
      network: 'solana',
      standard: 'SPL',
      decimals: 6,
      isPopular: true,
      description: 'Serum DEX token'
    }
  ],

  // TRON tokens (TRC-20)
  tron: [
    {
      symbol: 'USDT',
      name: 'Tether USD',
      contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
      network: 'tron',
      standard: 'TRC-20',
      decimals: 6,
      isPopular: true,
      description: 'USDT on TRON network'
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      contractAddress: 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8',
      network: 'tron',
      standard: 'TRC-20',
      decimals: 6,
      isPopular: true,
      description: 'USDC on TRON network'
    },
    {
      symbol: 'JST',
      name: 'JUST',
      contractAddress: 'TCFLL5dx5ZJdKnWuesXxi1VPwjLVmWZZy9',
      network: 'tron',
      standard: 'TRC-20',
      decimals: 18,
      isPopular: true,
      description: 'JUST DeFi token on TRON'
    },
    {
      symbol: 'WIN',
      name: 'WINkLink',
      contractAddress: 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7',
      network: 'tron',
      standard: 'TRC-20',
      decimals: 6,
      isPopular: true,
      description: 'WINkLink oracle token'
    }
  ],

  // TON tokens (Jettons)
  ton: [
    {
      symbol: 'jUSDT',
      name: 'Tether USD (Jetton)',
      contractAddress: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
      network: 'ton',
      standard: 'Jetton',
      decimals: 6,
      isPopular: true,
      description: 'USDT Jetton on TON network'
    },
    {
      symbol: 'jUSDC',
      name: 'USD Coin (Jetton)',
      contractAddress: 'EQB-MPwrd1G6WKNkLz_VnV6WqBDd142KMQv-g1O-8QUA3728',
      network: 'ton',
      standard: 'Jetton',
      decimals: 6,
      isPopular: true,
      description: 'USDC Jetton on TON network'
    }
  ],

  // XRP Ledger tokens (issued currencies)
  xrp: [
    {
      symbol: 'USD',
      name: 'USD (Bitstamp)',
      contractAddress: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B', // Bitstamp gateway
      network: 'xrp',
      standard: 'XRP Ledger IOU',
      decimals: 6,
      isPopular: true,
      description: 'USD issued by Bitstamp on XRP Ledger'
    },
    {
      symbol: 'BTC',
      name: 'Bitcoin (Bitstamp)',
      contractAddress: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
      network: 'xrp',
      standard: 'XRP Ledger IOU',
      decimals: 8,
      isPopular: true,
      description: 'Bitcoin issued by Bitstamp on XRP Ledger'
    },
    {
      symbol: 'EUR',
      name: 'Euro (Bitstamp)',
      contractAddress: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
      network: 'xrp',
      standard: 'XRP Ledger IOU',
      decimals: 6,
      isPopular: true,
      description: 'Euro issued by Bitstamp on XRP Ledger'
    }
  ]
};

export class NonEVMTokenManager {
  
  // Get tokens for a non-EVM network
  static getNetworkTokens(network: string): NonEVMToken[] {
    return NON_EVM_TOKENS[network.toLowerCase()] || [];
  }
  
  // Search tokens on non-EVM networks
  static searchNonEVMTokens(query: string, network: string): NonEVMToken[] {
    const networkTokens = this.getNetworkTokens(network);
    const normalizedQuery = query.toLowerCase().trim();
    
    return networkTokens.filter(token =>
      token.symbol.toLowerCase().includes(normalizedQuery) ||
      token.name.toLowerCase().includes(normalizedQuery) ||
      (token.contractAddress && token.contractAddress.toLowerCase().includes(normalizedQuery))
    );
  }
  
  // Validate non-EVM token contract/address
  static async validateNonEVMToken(contractAddress: string, network: string): Promise<{isValid: boolean; tokenInfo?: NonEVMToken}> {
    try {
      const networkTokens = this.getNetworkTokens(network);
      const token = networkTokens.find(t => 
        t.contractAddress?.toLowerCase() === contractAddress.toLowerCase()
      );
      
      if (token) {
        return { isValid: true, tokenInfo: token };
      }
      
      // For unknown tokens, check format based on network
      switch (network.toLowerCase()) {
        case 'bitcoin':
          // Bitcoin Omni Layer uses property IDs (numbers)
          if (/^\d+$/.test(contractAddress)) {
            return { 
              isValid: true, 
              tokenInfo: {
                symbol: 'UNKNOWN',
                name: 'Unknown Omni Token',
                contractAddress,
                network: 'bitcoin',
                standard: 'Omni Layer',
                decimals: 8,
                isPopular: false,
                description: 'Unknown token on Bitcoin Omni Layer'
              }
            };
          }
          break;
          
        case 'solana':
          // Solana uses base58 addresses (44 chars)
          if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(contractAddress)) {
            return {
              isValid: true,
              tokenInfo: {
                symbol: 'UNKNOWN',
                name: 'Unknown SPL Token',
                contractAddress,
                network: 'solana',
                standard: 'SPL',
                decimals: 6,
                isPopular: false,
                description: 'Unknown SPL token on Solana'
              }
            };
          }
          break;
          
        case 'tron':
          // TRON uses base58 addresses starting with T
          if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(contractAddress)) {
            return {
              isValid: true,
              tokenInfo: {
                symbol: 'UNKNOWN',
                name: 'Unknown TRC-20 Token',
                contractAddress,
                network: 'tron',
                standard: 'TRC-20',
                decimals: 6,
                isPopular: false,
                description: 'Unknown TRC-20 token on TRON'
              }
            };
          }
          break;
          
        case 'ton':
          // TON uses base64url addresses starting with EQ
          if (/^EQ[A-Za-z0-9_-]{46}$/.test(contractAddress)) {
            return {
              isValid: true,
              tokenInfo: {
                symbol: 'UNKNOWN',
                name: 'Unknown Jetton',
                contractAddress,
                network: 'ton',
                standard: 'Jetton',
                decimals: 9,
                isPopular: false,
                description: 'Unknown Jetton on TON network'
              }
            };
          }
          break;
          
        case 'xrp':
          // XRP uses gateway addresses (r-prefixed base58)
          if (/^r[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(contractAddress)) {
            return {
              isValid: true,
              tokenInfo: {
                symbol: 'UNKNOWN',
                name: 'Unknown XRP IOU',
                contractAddress,
                network: 'xrp',
                standard: 'XRP Ledger IOU',
                decimals: 6,
                isPopular: false,
                description: 'Unknown issued currency on XRP Ledger'
              }
            };
          }
          break;
      }
      
      return { isValid: false };
      
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Non-EVM token validation failed:', error);
      return { isValid: false };
    }
  }
  
  // Get popular tokens for non-EVM network
  static getPopularTokens(network: string): NonEVMToken[] {
    const networkTokens = this.getNetworkTokens(network);
    return networkTokens.filter(token => token.isPopular);
  }
  
  // Get token balance for non-EVM networks (requires specific APIs)
  static async getTokenBalance(address: string, tokenContract: string, network: string): Promise<NonEVMTokenBalance> {
    try {
      switch (network.toLowerCase()) {
        case 'bitcoin':
          return await this.getBitcoinTokenBalance(address, tokenContract);
        case 'solana':
          return await this.getSolanaTokenBalance(address, tokenContract);
        case 'tron':
          return await this.getTronTokenBalance(address, tokenContract);
        case 'ton':
          return await this.getTonTokenBalance(address, tokenContract);
        case 'xrp':
          return await this.getXrpTokenBalance(address, tokenContract);
        default:
          throw new Error(`Unsupported non-EVM network: ${network}`);
      }
    } catch (error) {
      throw new Error(`Failed to get ${network} token balance: ${error.message}. Real ${network} API integration required.`);
    }
  }
  
  // Bitcoin token balance (Omni Layer)
  private static async getBitcoinTokenBalance(address: string, propertyId: string): Promise<NonEVMTokenBalance> {
    try {
      // Omni Layer API call
      const response = await fetch(`https://api.omniexplorer.info/v1/address/addr/${address}/`);
      
      if (!response.ok) {
        throw new Error(`Omni API error: ${response.status}`);
      }
      
      const data = await response.json();
      const property = data.balance?.find((p: any) => p.id === propertyId);
      
      return {
        address,
        balance: property?.value || '0',
        network: 'bitcoin',
        standard: 'Omni Layer',
        isConfirmed: true
      };
      
    } catch (error) {
      throw new Error(`Bitcoin Omni token balance fetch failed: ${error.message}. Real Omni Layer API integration required.`);
    }
  }
  
  // Solana token balance (SPL)
  private static async getSolanaTokenBalance(address: string, mintAddress: string): Promise<NonEVMTokenBalance> {
    try {
      const response = await fetch('https://api.mainnet-beta.solana.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTokenAccountsByOwner',
          params: [
            address,
            { mint: mintAddress },
            { encoding: 'jsonParsed' }
          ]
        })
      });
      
      if (!response.ok) {
        throw new Error(`Solana RPC error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.result?.value?.length > 0) {
        const tokenAccount = data.result.value[0];
        const balance = tokenAccount.account?.data?.parsed?.info?.tokenAmount?.uiAmountString || '0';
        
        return {
          address,
          balance,
          network: 'solana',
          standard: 'SPL',
          isConfirmed: true
        };
      }
      
      return {
        address,
        balance: '0',
        network: 'solana',
        standard: 'SPL',
        isConfirmed: true
      };
      
    } catch (error) {
      throw new Error(`Solana SPL token balance fetch failed: ${error.message}. Real Solana RPC integration required.`);
    }
  }
  
  // TRON token balance (TRC-20)
  private static async getTronTokenBalance(address: string, contractAddress: string): Promise<NonEVMTokenBalance> {
    try {
      const response = await fetch(`https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?contract_address=${contractAddress}&limit=1`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`TRON API error: ${response.status}`);
      }
      
      // This is a simplified implementation
      // Real implementation would need TronWeb or proper TRON API integration
      throw new Error('TRON TRC-20 token balance requires TronWeb integration. Real TRON API integration required.');
      
    } catch (error) {
      throw new Error(`TRON TRC-20 token balance fetch failed: ${error.message}. Real TronWeb API integration required.`);
    }
  }
  
  // TON token balance (Jettons)
  private static async getTonTokenBalance(address: string, jettonAddress: string): Promise<NonEVMTokenBalance> {
    try {
      // TON API call for Jetton balance
      const response = await fetch(`https://toncenter.com/api/v2/getTokenData?address=${jettonAddress}`);
      
      if (!response.ok) {
        throw new Error(`TON API error: ${response.status}`);
      }
      
      // This is a simplified implementation
      // Real implementation would need TON SDK integration
      throw new Error('TON Jetton balance requires TON SDK integration. Real TON API integration required.');
      
    } catch (error) {
      throw new Error(`TON Jetton balance fetch failed: ${error.message}. Real TON SDK integration required.`);
    }
  }
  
  // XRP token balance (Issued currencies)
  private static async getXrpTokenBalance(address: string, gatewayAddress: string): Promise<NonEVMTokenBalance> {
    try {
      // Real XRPL API integration
      const response = await fetch('https://s1.ripple.com:51234', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'account_lines',
          params: [{
            account: address,
            peer: gatewayAddress,
            limit: 400
          }]
        })
      });
      
      if (!response.ok) {
        throw new Error(`XRPL API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(`XRPL API error: ${data.error.message}`);
      }
      
      if (!data.result || !data.result.lines) {
        return {
          balance: '0',
          symbol: 'XRP',
          name: 'XRP',
          address: gatewayAddress,
          network: 'xrp',
          standard: 'XRP',
          isConfirmed: true
        };
      }
      
      // Find the specific token line
      const tokenLine = data.result.lines.find((line: any) => 
        line.account === gatewayAddress || line.currency === gatewayAddress
      );
      
      if (!tokenLine) {
        return {
          balance: '0',
          symbol: 'XRP',
          name: 'XRP',
          address: gatewayAddress,
          network: 'xrp',
          standard: 'XRP',
          isConfirmed: true
        };
      }
      
      return {
        balance: tokenLine.balance || '0',
        symbol: tokenLine.currency || 'XRP',
        name: tokenLine.currency || 'XRP',
        address: gatewayAddress,
        network: 'xrp',
        standard: 'XRP',
        isConfirmed: true
      };
      
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('XRP token balance fetch failed:', error);
      // Return zero balance on error
      return {
        balance: '0',
        symbol: 'XRP',
        name: 'XRP',
        address: gatewayAddress,
        network: 'xrp',
        standard: 'XRP',
        isConfirmed: true
      };
    }
  }
}

// Export utilities
export const nonEVMTokenUtils = {
  // Get all non-EVM tokens
  getAllTokens: () => NON_EVM_TOKENS,
  
  // Get tokens for specific network
  getNetworkTokens: (network: string) => NonEVMTokenManager.getNetworkTokens(network),
  
  // Search tokens
  searchTokens: (query: string, network: string) => NonEVMTokenManager.searchNonEVMTokens(query, network),
  
  // Validate token
  validateToken: (contractAddress: string, network: string) => NonEVMTokenManager.validateNonEVMToken(contractAddress, network),
  
  // Get popular tokens
  getPopularTokens: (network: string) => NonEVMTokenManager.getPopularTokens(network),
  
  // Get token balance
  getTokenBalance: (address: string, tokenContract: string, network: string) => NonEVMTokenManager.getTokenBalance(address, tokenContract, network),
  
  // Check if network supports tokens
  supportsTokens: (network: string) => {
    const supportedNetworks = ['bitcoin', 'litecoin', 'solana', 'tron', 'ton', 'xrp'];
    return supportedNetworks.includes(network.toLowerCase());
  },
  
  // Get supported token standards
  getTokenStandards: (network: string) => {
    const standards: Record<string, string[]> = {
      bitcoin: ['Omni Layer', 'Liquid Network', 'RGB'],
      litecoin: ['OmniLite'],
      solana: ['SPL'],
      tron: ['TRC-20', 'TRC-10'],
      ton: ['Jetton'],
      xrp: ['XRP Ledger IOU']
    };
    return standards[network.toLowerCase()] || [];
  }
};

// Export for console testing
if (typeof window !== 'undefined') {
  (window as any).nonEVMTokenUtils = nonEVMTokenUtils;
  (window as any).NON_EVM_TOKENS = NON_EVM_TOKENS;
  
  // Quick test function
  (window as any).testNonEVMTokens = () => {

    const networks = ['bitcoin', 'solana', 'tron', 'ton', 'xrp'];
    
    networks.forEach(network => {
      const tokens = nonEVMTokenUtils.getNetworkTokens(network);
      // eslint-disable-next-line no-console
      console.log(`${network.toUpperCase()}: ${tokens.length} tokens`, tokens);
    });
  };
}
