// Address Comparison Test
// Compare generated addresses with external addresses to find the issue

export function compareAddresses() {
  // Your generated address (the one that's failing validation)
  const generatedAddress = '0x100A87f0755545bB9B7ab096B2E2a3A3e083e4A4';
  
  // A known valid external address
  const externalAddress = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94';
  
  console.log('🔍 Address Comparison Test');
  console.log('========================');
  
  // Test generated address
  console.log('\n📋 Generated Address Analysis:');
  console.log('  Address:', generatedAddress);
  console.log('  Length:', generatedAddress.length);
  console.log('  Characters:', generatedAddress.split(''));
  console.log('  Starts with 0x:', generatedAddress.startsWith('0x'));
  console.log('  Hex part:', generatedAddress.substring(2));
  console.log('  Hex part length:', generatedAddress.substring(2).length);
  
  // Test external address
  console.log('\n📋 External Address Analysis:');
  console.log('  Address:', externalAddress);
  console.log('  Length:', externalAddress.length);
  console.log('  Characters:', externalAddress.split(''));
  console.log('  Starts with 0x:', externalAddress.startsWith('0x'));
  console.log('  Hex part:', externalAddress.substring(2));
  console.log('  Hex part length:', externalAddress.substring(2).length);
  
  // Test both with regex
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  
  console.log('\n🧪 Regex Validation Test:');
  console.log('  Generated address valid:', ethAddressRegex.test(generatedAddress));
  console.log('  External address valid:', ethAddressRegex.test(externalAddress));
  
  // Test with ethers.js if available
  try {
    const { ethers } = require('ethers');
    console.log('\n🔧 Ethers.js Validation:');
    console.log('  Generated address valid:', ethers.isAddress(generatedAddress));
    console.log('  External address valid:', ethers.isAddress(externalAddress));
  } catch (error) {
    console.log('\n❌ Ethers.js not available:', error.message);
  }
  
  // Check for hidden characters
  console.log('\n🔍 Hidden Character Check:');
  console.log('  Generated address char codes:', generatedAddress.split('').map(c => c.charCodeAt(0)));
  console.log('  External address char codes:', externalAddress.split('').map(c => c.charCodeAt(0)));
  
  // Check for whitespace
  console.log('\n🔍 Whitespace Check:');
  console.log('  Generated address trimmed:', `"${generatedAddress.trim()}"`);
  console.log('  External address trimmed:', `"${externalAddress.trim()}"`);
  console.log('  Generated has leading/trailing spaces:', generatedAddress !== generatedAddress.trim());
  console.log('  External has leading/trailing spaces:', externalAddress !== externalAddress.trim());
  
  return {
    generated: {
      address: generatedAddress,
      length: generatedAddress.length,
      valid: ethAddressRegex.test(generatedAddress),
      trimmed: generatedAddress.trim()
    },
    external: {
      address: externalAddress,
      length: externalAddress.length,
      valid: ethAddressRegex.test(externalAddress),
      trimmed: externalAddress.trim()
    }
  };
}

// Run the test
if (typeof window !== 'undefined') {
  console.log('🧪 Running address comparison test...');
  const result = compareAddresses();
  console.log('📊 Comparison result:', result);
}
