// ENS Registration Service - Real ENS domain registration and pricing
import { 
  getDomainPrice, 
  checkDomainAvailability, 
  registerENSDomain,
  validateENSName,
  getENSRecords
} from '../utils/ens-utils';
import { ENSRegistrationValidator, ensValidator } from '../utils/ens-registration-validator';

export interface ENSPricing {
  domain: string;
  priceInEth: number;
  priceInUsd?: number;
  duration: number;
  gasEstimate?: number;
  totalCostEth: number;
  totalCostUsd?: number;
}

export interface ENSRegistrationParams {
  domain: string;
  walletAddress: string;
  duration: number; // in years
  password?: string;
}

export interface ENSRegistrationResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  error?: string;
  domain?: string;
  owner?: string;
}

class ENSRegistrationService {
  private readonly DEFAULT_DURATION_YEARS = 1;
  private readonly ETH_TO_USD_RATE = 2500; // Approximate rate - in production, fetch from API

  /**
   * Get registration pricing for an ENS domain
   */
  async getRegistrationPricing(domain: string, durationYears: number = this.DEFAULT_DURATION_YEARS): Promise<ENSPricing> {
    try {
      // Validate domain format first
      const validation = validateENSName(domain);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid ENS domain format');
      }

      // Ensure domain ends with .eth
      const fullDomain = domain.endsWith('.eth') ? domain : `${domain}.eth`;
      
      // Check if domain is available
      const isAvailable = await checkDomainAvailability(fullDomain);
      if (!isAvailable) {
        throw new Error(`Domain ${fullDomain} is not available for registration`);
      }

      // Get price from ENS contract
      const priceInEth = await getDomainPrice(fullDomain);
      const totalCostEth = priceInEth * durationYears;
      
      // Estimate gas costs (approximate)
      const gasEstimate = 150000; // Typical gas for ENS registration
      const gasPriceGwei = 20; // Approximate gas price
      const gasEstimateEth = (gasEstimate * gasPriceGwei) / 1e9; // Convert to ETH
      
      const finalCostEth = totalCostEth + gasEstimateEth;
      const finalCostUsd = finalCostEth * this.ETH_TO_USD_RATE;

      return {
        domain: fullDomain,
        priceInEth,
        priceInUsd: priceInEth * this.ETH_TO_USD_RATE,
        duration: durationYears,
        gasEstimate: gasEstimateEth,
        totalCostEth: finalCostEth,
        totalCostUsd: finalCostUsd
      };

    } catch (error) {
      throw new Error(`Failed to get ENS pricing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if ENS domain is available for registration
   */
  async checkAvailability(domain: string): Promise<boolean> {
    try {
      const fullDomain = domain.endsWith('.eth') ? domain : `${domain}.eth`;
      return await checkDomainAvailability(fullDomain);
    } catch (error) {
      console.error('ENS availability check failed:', error);
      return false;
    }
  }

  /**
   * Validate ENS domain format and rules
   */
  validateDomain(domain: string): { isValid: boolean; error?: string } {
    const fullDomain = domain.endsWith('.eth') ? domain : `${domain}.eth`;
    return validateENSName(fullDomain);
  }

  /**
   * Register ENS domain using bridge sender private key for gas fees
   */
  async registerDomain(params: ENSRegistrationParams): Promise<ENSRegistrationResult> {
    try {
      const { domain, walletAddress, duration } = params;
      const fullDomain = domain.endsWith('.eth') ? domain : `${domain}.eth`;

      // Validate domain first
      const validation = await ensValidator.validate(fullDomain);
      if (!validation.isValid || !validation.isAvailable) {
        return {
          success: false,
          error: validation.error || `Domain ${fullDomain} is not available for registration`
        };
      }

      // Try to use bridge sender private key first
      const bridgePrivateKey = process.env.BRIDGE_SENDER_PRIVATE_KEY;
      
      if (bridgePrivateKey) {
        console.log('🔧 Using bridge sender private key for ENS registration gas fees');
        return await this.registerWithBridgeKey(fullDomain, walletAddress, duration, bridgePrivateKey);
      }

      // Fallback to Web3 provider if bridge key not available
      if (typeof window === 'undefined' || !window.ethereum) {
        return {
          success: false,
          error: 'No bridge sender private key configured and Web3 provider not available. Please configure BRIDGE_SENDER_PRIVATE_KEY in your .env file.'
        };
      }

      // Get signer from Web3 provider
      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Register domain using ENS utils
      const durationInSeconds = duration * 365 * 24 * 60 * 60; // Convert years to seconds
      const result = await registerENSDomain(fullDomain, walletAddress, durationInSeconds, signer);

      if (result.success) {
        return {
          success: true,
          transactionHash: result.txHash,
          domain: fullDomain,
          owner: walletAddress
        };
      } else {
        return {
          success: false,
          error: result.error || 'ENS registration failed'
        };
      }

    } catch (error) {
      console.error('ENS registration failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'ENS registration failed'
      };
    }
  }

  /**
   * Register ENS domain using bridge sender private key
   */
  private async registerWithBridgeKey(
    domain: string, 
    walletAddress: string, 
    duration: number, 
    bridgePrivateKey: string
  ): Promise<ENSRegistrationResult> {
    try {
      const { ethers } = await import('ethers');
      
      // Create provider for Ethereum mainnet
      const provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
      
      // Create wallet from bridge private key
      const bridgeWallet = new ethers.Wallet(bridgePrivateKey, provider);
      
      console.log('🔧 Bridge wallet address:', bridgeWallet.address);
      
      // Check bridge wallet balance
      const balance = await provider.getBalance(bridgeWallet.address);
      const balanceEth = ethers.formatEther(balance);
      console.log('🔧 Bridge wallet balance:', balanceEth, 'ETH');
      
      if (balance === 0n) {
        return {
          success: false,
          error: `Bridge wallet has no ETH balance. Please fund the bridge wallet (${bridgeWallet.address}) with ETH for gas fees.`
        };
      }

      // Register domain using ENS utils with bridge wallet as signer
      const durationInSeconds = duration * 365 * 24 * 60 * 60; // Convert years to seconds
      const result = await registerENSDomain(domain, walletAddress, durationInSeconds, bridgeWallet);

      if (result.success) {
        console.log('✅ ENS domain registered successfully using bridge wallet');
        return {
          success: true,
          transactionHash: result.txHash,
          domain: domain,
          owner: walletAddress
        };
      } else {
        return {
          success: false,
          error: result.error || 'ENS registration failed'
        };
      }

    } catch (error) {
      console.error('ENS registration with bridge key failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'ENS registration with bridge key failed'
      };
    }
  }

  /**
   * Get current USD price of ETH (in production, use real API)
   */
  async getEthPrice(): Promise<number> {
    try {
      // In production, fetch from CoinGecko, CoinMarketCap, etc.
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      const data = await response.json();
      return data.ethereum?.usd || this.ETH_TO_USD_RATE;
    } catch (error) {
      console.warn('Failed to fetch ETH price, using fallback:', error);
      return this.ETH_TO_USD_RATE;
    }
  }

  /**
   * Get ENS domain information if already registered
   */
  async getDomainInfo(domain: string): Promise<{
    isRegistered: boolean;
    owner?: string;
    resolver?: string;
    records?: any;
    error?: string;
  }> {
    try {
      const fullDomain = domain.endsWith('.eth') ? domain : `${domain}.eth`;
      
      // Check if domain is available (if available, it's not registered)
      const isAvailable = await checkDomainAvailability(fullDomain);
      
      if (isAvailable) {
        return { isRegistered: false };
      }

      // Get ENS records for registered domain
      const records = await getENSRecords(fullDomain);
      
      return {
        isRegistered: true,
        owner: records.resolverAddress,
        resolver: records.resolverAddress,
        records
      };

    } catch (error) {
      return {
        isRegistered: false,
        error: error instanceof Error ? error.message : 'Failed to get domain info'
      };
    }
  }

  /**
   * Generate domain suggestions based on input
   */
  generateSuggestions(baseName: string, count: number = 5): string[] {
    const suggestions: string[] = [];
    const baseDomain = baseName.replace('.eth', '').toLowerCase();
    
    // Generate variations
    const variations = [
      `${baseDomain}2024`,
      `${baseDomain}official`,
      `${baseDomain}app`,
      `${baseDomain}dao`,
      `${baseDomain}defi`,
      `${baseDomain}nft`,
      `${baseDomain}web3`,
      `my${baseDomain}`,
      `the${baseDomain}`,
      `${baseDomain}eth`,
      `${baseDomain}crypto`,
      `${baseDomain}wallet`
    ];

    // Add random numbers to base name
    for (let i = 1; i <= 999; i++) {
      variations.push(`${baseDomain}${i}`);
    }

    // Return first `count` variations
    return variations.slice(0, count).map(name => `${name}.eth`);
  }

  /**
   * Estimate registration transaction gas cost
   */
  async estimateGasCost(): Promise<{ gasLimit: number; gasPrice: number; totalCostEth: number }> {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const { ethers } = await import('ethers');
        const provider = new ethers.BrowserProvider(window.ethereum);
        
        const gasPrice = await provider.getFeeData();
        const gasLimit = 150000; // Typical for ENS registration
        
        const totalCostWei = gasLimit * Number(gasPrice.gasPrice || 20000000000); // 20 gwei fallback
        const totalCostEth = parseFloat(ethers.formatEther(totalCostWei));
        
        return {
          gasLimit,
          gasPrice: Number(gasPrice.gasPrice || 20000000000),
          totalCostEth
        };
      }
    } catch (error) {
      console.warn('Failed to estimate gas cost:', error);
    }

    // Fallback estimates
    return {
      gasLimit: 150000,
      gasPrice: 20000000000, // 20 gwei
      totalCostEth: 0.003 // Approximate
    };
  }
}

// Export singleton instance
export const ensRegistrationService = new ENSRegistrationService();

// Types are already exported above in the interface declarations

