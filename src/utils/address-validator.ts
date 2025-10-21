// Real-world address validation utility
// This helps verify that generated addresses are correctly formatted

export interface AddressValidationResult {
  isValid: boolean;
  network: string;
  addressType: string;
  errors: string[];
  warnings: string[];
}

export class AddressValidator {
  
  // Validate Bitcoin addresses
  static validateBitcoinAddress(address: string, network: 'mainnet' | 'testnet' = 'mainnet'): AddressValidationResult {
    const result: AddressValidationResult = {
      isValid: false,
      network: `bitcoin-${network}`,
      addressType: 'unknown',
      errors: [],
      warnings: []
    };

    if (!address || typeof address !== 'string') {
      result.errors.push('Address is required and must be a string');
      return result;
    }

    // Bitcoin Legacy (P2PKH) - starts with 1 (mainnet) or m/n (testnet)
    if (network === 'mainnet' && address.startsWith('1')) {
      if (address.length >= 26 && address.length <= 35) {
        result.isValid = true;
        result.addressType = 'Legacy (P2PKH)';
      } else {
        result.errors.push('Invalid Bitcoin legacy address length');
      }
    }
    // Bitcoin SegWit (P2SH) - starts with 3 (mainnet) or 2 (testnet)
    else if ((network === 'mainnet' && address.startsWith('3')) || 
             (network === 'testnet' && address.startsWith('2'))) {
      if (address.length >= 26 && address.length <= 35) {
        result.isValid = true;
        result.addressType = 'SegWit (P2SH)';
      } else {
        result.errors.push('Invalid Bitcoin SegWit address length');
      }
    }
    // Bitcoin Native SegWit (Bech32) - starts with bc1 (mainnet) or tb1 (testnet)
    else if ((network === 'mainnet' && address.startsWith('bc1')) ||
             (network === 'testnet' && address.startsWith('tb1'))) {
      if (address.length >= 42 && address.length <= 62) {
        result.isValid = true;
        result.addressType = 'Native SegWit (Bech32)';
      } else {
        result.errors.push('Invalid Bitcoin Native SegWit address length');
      }
    }
    else {
      result.errors.push(`Invalid Bitcoin address format for ${network}`);
    }

    return result;
  }

  // Validate Ethereum addresses
  static validateEthereumAddress(address: string): AddressValidationResult {
    const result: AddressValidationResult = {
      isValid: false,
      network: 'ethereum',
      addressType: 'EOA',
      errors: [],
      warnings: []
    };

    if (!address || typeof address !== 'string') {
      result.errors.push('Address is required and must be a string');
      return result;
    }

    // Ethereum addresses start with 0x and are 42 characters long
    if (!address.startsWith('0x')) {
      result.errors.push('Ethereum address must start with 0x');
      return result;
    }

    if (address.length !== 42) {
      result.errors.push('Ethereum address must be exactly 42 characters long');
      return result;
    }

    // Check if all characters after 0x are valid hex
    const hexPart = address.slice(2);
    if (!/^[0-9a-fA-F]{40}$/.test(hexPart)) {
      result.errors.push('Ethereum address contains invalid hexadecimal characters');
      return result;
    }

    // Check for checksum (mixed case indicates checksummed address)
    const hasUppercase = /[A-F]/.test(hexPart);
    const hasLowercase = /[a-f]/.test(hexPart);
    
    if (hasUppercase && hasLowercase) {
      result.warnings.push('Address appears to be checksummed (good practice)');
    } else if (hasUppercase && !hasLowercase) {
      result.warnings.push('Address is all uppercase (consider using checksummed format)');
    }

    result.isValid = true;
    return result;
  }

  // Validate Litecoin addresses
  static validateLitecoinAddress(address: string, network: 'mainnet' | 'testnet' = 'mainnet'): AddressValidationResult {
    const result: AddressValidationResult = {
      isValid: false,
      network: `litecoin-${network}`,
      addressType: 'unknown',
      errors: [],
      warnings: []
    };

    if (!address || typeof address !== 'string') {
      result.errors.push('Address is required and must be a string');
      return result;
    }

    // Litecoin Legacy (P2PKH) - starts with L (mainnet) or m/n (testnet)
    if (network === 'mainnet' && address.startsWith('L')) {
      if (address.length >= 26 && address.length <= 35) {
        result.isValid = true;
        result.addressType = 'Legacy (P2PKH)';
      } else {
        result.errors.push('Invalid Litecoin legacy address length');
      }
    }
    // Litecoin SegWit (P2SH) - starts with M (mainnet) or Q (testnet)
    else if ((network === 'mainnet' && address.startsWith('M')) ||
             (network === 'testnet' && address.startsWith('Q'))) {
      if (address.length >= 26 && address.length <= 35) {
        result.isValid = true;
        result.addressType = 'SegWit (P2SH)';
      } else {
        result.errors.push('Invalid Litecoin SegWit address length');
      }
    }
    // Litecoin Native SegWit (Bech32) - starts with ltc1 (mainnet) or tltc1 (testnet)
    else if ((network === 'mainnet' && address.startsWith('ltc1')) ||
             (network === 'testnet' && address.startsWith('tltc1'))) {
      if (address.length >= 43 && address.length <= 62) {
        result.isValid = true;
        result.addressType = 'Native SegWit (Bech32)';
      } else {
        result.errors.push('Invalid Litecoin Native SegWit address length');
      }
    }
    else {
      result.errors.push(`Invalid Litecoin address format for ${network}`);
    }

    return result;
  }

  // Validate Solana addresses
  static validateSolanaAddress(address: string): AddressValidationResult {
    const result: AddressValidationResult = {
      isValid: false,
      network: 'solana',
      addressType: 'Public Key',
      errors: [],
      warnings: []
    };

    if (!address || typeof address !== 'string') {
      result.errors.push('Address is required and must be a string');
      return result;
    }

    // Solana addresses are Base58 encoded and 32-44 characters long
    if (address.length < 32 || address.length > 44) {
      result.errors.push('Solana address must be between 32-44 characters long');
      return result;
    }

    // Check for valid Base58 characters
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    if (!base58Regex.test(address)) {
      result.errors.push('Solana address contains invalid Base58 characters');
      return result;
    }

    result.isValid = true;
    return result;
  }

  // Validate TRON addresses
  static validateTronAddress(address: string): AddressValidationResult {
    const result: AddressValidationResult = {
      isValid: false,
      network: 'tron',
      addressType: 'TRX',
      errors: [],
      warnings: []
    };

    if (!address || typeof address !== 'string') {
      result.errors.push('Address is required and must be a string');
      return result;
    }

    // TRON addresses start with 'T' and are 34 characters long
    if (!address.startsWith('T')) {
      result.errors.push('TRON address must start with T');
      return result;
    }

    if (address.length !== 34) {
      result.errors.push('TRON address must be exactly 34 characters long');
      return result;
    }

    // Check for valid Base58 characters
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    if (!base58Regex.test(address)) {
      result.errors.push('TRON address contains invalid Base58 characters');
      return result;
    }

    result.isValid = true;
    return result;
  }

  // Master validation function
  static validateAddress(address: string, network: string, testnet: boolean = false): AddressValidationResult {
    const networkType = testnet ? 'testnet' : 'mainnet';

    switch (network.toLowerCase()) {
      case 'bitcoin':
      case 'btc':
        return this.validateBitcoinAddress(address, networkType);
        
      case 'ethereum':
      case 'eth':
      case 'polygon':
      case 'matic':
      case 'bsc':
      case 'bnb':
      case 'avalanche':
      case 'avax':
      case 'arbitrum':
      case 'optimism':
        return this.validateEthereumAddress(address);
        
      case 'litecoin':
      case 'ltc':
        return this.validateLitecoinAddress(address, networkType);
        
      case 'solana':
      case 'sol':
        return this.validateSolanaAddress(address);
        
      case 'tron':
      case 'trx':
        return this.validateTronAddress(address);
        
      default:
        return {
          isValid: false,
          network: network,
          addressType: 'unknown',
          errors: [`Unsupported network: ${network}`],
          warnings: []
        };
    }
  }
}

// Real-world address testing utility
export class AddressTester {
  
  // Test address by checking it on blockchain explorers
  static async testAddressOnBlockchain(address: string, network: string): Promise<{
    exists: boolean;
    hasTransactions: boolean;
    balance: string;
    explorerUrl: string;
    error?: string;
  }> {
    
    const explorerUrls = {
      bitcoin: `https://blockstream.info/address/${address}`,
      ethereum: `https://etherscan.io/address/${address}`,
      litecoin: `https://blockchair.com/litecoin/address/${address}`,
      solana: `https://solscan.io/account/${address}`,
      tron: `https://tronscan.org/#/address/${address}`
    };

    const apiUrls = {
      bitcoin: `https://blockstream.info/api/address/${address}`,
      ethereum: `https://api.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=demo`,
      litecoin: `https://litecoinspace.org/api/address/${address}`,
      solana: `https://api.mainnet-beta.solana.com`,
      tron: `https://api.trongrid.io/v1/accounts/${address}`
    };

    try {
      const apiUrl = apiUrls[network.toLowerCase() as keyof typeof apiUrls];
      const explorerUrl = explorerUrls[network.toLowerCase() as keyof typeof explorerUrls];
      
      if (!apiUrl) {
        throw new Error(`No API available for network: ${network}`);
      }

      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Parse response based on network
      let balance = '0';
      let hasTransactions = false;
      
      switch (network.toLowerCase()) {
        case 'bitcoin':
          balance = ((data.chain_stats?.funded_txo_sum || 0) / 100000000).toString();
          hasTransactions = (data.chain_stats?.tx_count || 0) > 0;
          break;
          
        case 'ethereum':
          balance = (parseInt(data.result || '0', 10) / Math.pow(10, 18)).toString();
          hasTransactions = parseInt(data.result || '0', 10) > 0;
          break;
          
        case 'litecoin':
          balance = ((data.chain_stats?.funded_txo_sum || 0) / 100000000).toString();
          hasTransactions = (data.chain_stats?.tx_count || 0) > 0;
          break;
          
        case 'tron':
          balance = ((data.data?.[0]?.balance || 0) / Math.pow(10, 6)).toString();
          hasTransactions = (data.data?.[0]?.transactions || 0) > 0;
          break;
          
        default:
          balance = '0';
          hasTransactions = false;
      }

      return {
        exists: true,
        hasTransactions,
        balance,
        explorerUrl
      };

    } catch (error) {
      return {
        exists: false,
        hasTransactions: false,
        balance: '0',
        explorerUrl: explorerUrls[network.toLowerCase() as keyof typeof explorerUrls] || '',
        error: (error as Error).message
      };
    }
  }

  // Comprehensive address testing
  static async testGeneratedAddress(address: string, network: string, testnet: boolean = false): Promise<{
    validation: AddressValidationResult;
    blockchainTest: Awaited<ReturnType<typeof AddressTester.testAddressOnBlockchain>>;
    recommendations: string[];
  }> {
    
    // Step 1: Validate address format
    const validation = AddressValidator.validateAddress(address, network, testnet);
    
    // Step 2: Test on blockchain
    const blockchainTest = await this.testAddressOnBlockchain(address, network);
    
    // Step 3: Generate recommendations
    const recommendations: string[] = [];
    
    if (!validation.isValid) {
      recommendations.push('❌ Address format is invalid - check address generation logic');
    } else {
      recommendations.push('✅ Address format is valid');
    }
    
    if (blockchainTest.exists && !blockchainTest.error) {
      recommendations.push('✅ Address is recognized by blockchain network');
      
      if (blockchainTest.hasTransactions) {
        recommendations.push('⚠️ Address has transaction history (not a fresh address)');
      } else {
        recommendations.push('✅ Address is fresh with no transaction history');
      }
      
      if (parseFloat(blockchainTest.balance) > 0) {
        recommendations.push(`💰 Address has balance: ${blockchainTest.balance} ${network.toUpperCase()}`);
      }
    } else if (blockchainTest.error) {
      recommendations.push(`⚠️ Could not verify on blockchain: ${blockchainTest.error}`);
    }
    
    return {
      validation,
      blockchainTest,
      recommendations
    };
  }
}

// Test utility for development
export const testAllAddressTypes = async (testAddresses: Record<string, string>) => {

  for (const [network, address] of Object.entries(testAddresses)) {
    // eslint-disable-next-line no-console
    console.log(`\n📍 Testing ${network.toUpperCase()} Address: ${address}`);
    // eslint-disable-next-line no-console
    console.log('━'.repeat(60));
    
    try {
      const result = await AddressTester.testGeneratedAddress(address, network);
      
      // Display validation results


      if (result.validation.errors.length > 0) {

      }
      
      if (result.validation.warnings.length > 0) {

      }
      
      // Display blockchain test results


      if (result.blockchainTest.error) {

      }
      
      // Display recommendations

      // eslint-disable-next-line no-console
      result.recommendations.forEach(rec => console.log(`  ${rec}`));
      
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`❌ Failed to test ${network} address:`, error);
    }
  }
};

// Quick validation functions for each network
export const validateBTC = (address: string, testnet = false) => 
  AddressValidator.validateBitcoinAddress(address, testnet ? 'testnet' : 'mainnet');

export const validateETH = (address: string) => 
  AddressValidator.validateEthereumAddress(address);

export const validateLTC = (address: string, testnet = false) => 
  AddressValidator.validateLitecoinAddress(address, testnet ? 'testnet' : 'mainnet');

export const validateSOL = (address: string) => 
  AddressValidator.validateSolanaAddress(address);

export const validateTRX = (address: string) => 
  AddressValidator.validateTronAddress(address);

// Export for console testing
if (typeof window !== 'undefined') {
  (window as any).testAddresses = testAllAddressTypes;
  (window as any).validateAddress = AddressValidator.validateAddress;
  (window as any).testAddressOnBlockchain = AddressTester.testAddressOnBlockchain;
}
