// Address Compatibility Test
// This file verifies that generated addresses are compatible with other wallets

import { ethers } from 'ethers';
import * as bip39 from 'bip39';
import { generateNetworkAddress } from './network-address-utils';
import { getDerivationPath } from './key-derivation';

// Test seed phrase (DO NOT USE IN PRODUCTION - FOR TESTING ONLY)
const TEST_SEED_PHRASE = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

export interface CompatibilityTestResult {
  network: string;
  derivationPath: string;
  generatedAddress: string;
  expectedAddress: string;
  isCompatible: boolean;
  error?: string;
}

// Test address generation compatibility
export async function testAddressCompatibility(): Promise<CompatibilityTestResult[]> {
  const results: CompatibilityTestResult[] = [];
  
  // Test networks with known expected addresses
  const testCases = [
    {
      network: 'ethereum',
      derivationPath: "m/44'/60'/0'/0/0",
      expectedAddress: '0x9858EfFD232B4033E47d90003D41EC34EcaEda94' // Known address for test seed
    },
    {
      network: 'bitcoin',
      derivationPath: "m/44'/0'/0'/0/0",
      expectedAddress: 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu' // Known address for test seed
    }
  ];
  
  for (const testCase of testCases) {
    try {
      console.log(`🔍 Testing ${testCase.network} address generation...`);
      
      // Generate address using our implementation
      const generatedAddress = generateNetworkAddress(
        TEST_SEED_PHRASE, 
        testCase.derivationPath, 
        testCase.network
      );
      
      console.log(`✅ Generated ${testCase.network} address: ${generatedAddress}`);
      console.log(`📋 Expected ${testCase.network} address: ${testCase.expectedAddress}`);
      
      const isCompatible = generatedAddress.toLowerCase() === testCase.expectedAddress.toLowerCase();
      
      results.push({
        network: testCase.network,
        derivationPath: testCase.derivationPath,
        generatedAddress,
        expectedAddress: testCase.expectedAddress,
        isCompatible,
        error: isCompatible ? undefined : 'Address mismatch'
      });
      
    } catch (error) {
      console.error(`❌ Error testing ${testCase.network}:`, error);
      results.push({
        network: testCase.network,
        derivationPath: testCase.derivationPath,
        generatedAddress: '',
        expectedAddress: testCase.expectedAddress,
        isCompatible: false,
        error: error.message
      });
    }
  }
  
  return results;
}

// Verify BIP44 compliance
export function verifyBIP44Compliance(): {
  isCompliant: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Check derivation paths
  const networks = ['ethereum', 'bitcoin', 'solana', 'tron', 'xrp', 'ton'];
  
  for (const network of networks) {
    const path = getDerivationPath(network, 0);
    
    // Verify BIP44 format: m/44'/coin_type'/account'/change/address_index
    const parts = path.split('/');
    
    if (parts.length !== 6) {
      issues.push(`${network}: Invalid path length (${parts.length}), expected 6`);
    }
    
    if (parts[0] !== 'm') {
      issues.push(`${network}: Path must start with 'm'`);
    }
    
    if (parts[1] !== "44'") {
      issues.push(`${network}: Must use BIP44 standard (44')`);
    }
    
    // Check coin type
    const coinType = parts[2];
    if (!coinType.endsWith("'")) {
      issues.push(`${network}: Coin type must be hardened (end with ')`);
    }
  }
  
  return {
    isCompliant: issues.length === 0,
    issues
  };
}

// Test seed phrase compatibility
export function testSeedPhraseCompatibility(): {
  isValidBIP39: boolean;
  canGenerateAddresses: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  try {
    // Test BIP39 validation
    const isValidBIP39 = bip39.validateMnemonic(TEST_SEED_PHRASE);
    if (!isValidBIP39) {
      issues.push('Test seed phrase failed BIP39 validation');
    }
    
    // Test address generation
    const seed = bip39.mnemonicToSeedSync(TEST_SEED_PHRASE);
    const hdNode = ethers.HDNodeWallet.fromSeed(seed);
    const derivedWallet = hdNode.derivePath("m/44'/60'/0'/0/0");
    
    const canGenerateAddresses = !!derivedWallet.address;
    if (!canGenerateAddresses) {
      issues.push('Failed to generate address from test seed phrase');
    }
    
    return {
      isValidBIP39,
      canGenerateAddresses,
      issues
    };
    
  } catch (error) {
    issues.push(`Error testing seed phrase compatibility: ${error.message}`);
    return {
      isValidBIP39: false,
      canGenerateAddresses: false,
      issues
    };
  }
}

// Run all compatibility tests
export async function runCompatibilityTests(): Promise<{
  addressTests: CompatibilityTestResult[];
  bip44Compliance: { isCompliant: boolean; issues: string[] };
  seedPhraseTests: { isValidBIP39: boolean; canGenerateAddresses: boolean; issues: string[] };
  overallCompatible: boolean;
}> {
  console.log('🔍 Running address compatibility tests...');
  
  const addressTests = await testAddressCompatibility();
  const bip44Compliance = verifyBIP44Compliance();
  const seedPhraseTests = testSeedPhraseCompatibility();
  
  const overallCompatible = 
    addressTests.every(test => test.isCompatible) &&
    bip44Compliance.isCompliant &&
    seedPhraseTests.isValidBIP39 &&
    seedPhraseTests.canGenerateAddresses;
  
  console.log('📊 Compatibility Test Results:');
  console.log(`✅ Address Tests: ${addressTests.filter(t => t.isCompatible).length}/${addressTests.length} passed`);
  console.log(`✅ BIP44 Compliance: ${bip44Compliance.isCompliant ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Seed Phrase Tests: ${seedPhraseTests.isValidBIP39 && seedPhraseTests.canGenerateAddresses ? 'PASSED' : 'FAILED'}`);
  console.log(`🎯 Overall Compatible: ${overallCompatible ? 'YES' : 'NO'}`);
  
  return {
    addressTests,
    bip44Compliance,
    seedPhraseTests,
    overallCompatible
  };
}
