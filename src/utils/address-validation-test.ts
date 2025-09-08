// Address Validation Test
// Test the specific address that's failing

export function testAddressValidation() {
  const testAddress = '0x100A87f0755545bB9B7ab096B2E2a3A3e083e4A4';
  
  console.log('🔍 Testing address:', testAddress);
  console.log('📏 Address length:', testAddress.length);
  console.log('🔤 Address characters:', testAddress.split(''));
  
  // Current regex from SendScreen
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  const isValid = ethAddressRegex.test(testAddress);
  
  console.log('✅ Regex test result:', isValid);
  console.log('🔍 Regex pattern:', ethAddressRegex);
  
  // Test individual parts
  console.log('🔍 Starts with 0x:', testAddress.startsWith('0x'));
  console.log('🔍 Length is 42:', testAddress.length === 42);
  console.log('🔍 After 0x length:', testAddress.substring(2).length);
  
  // Test the hex part only
  const hexPart = testAddress.substring(2);
  const hexRegex = /^[a-fA-F0-9]{40}$/;
  const hexValid = hexRegex.test(hexPart);
  
  console.log('🔍 Hex part:', hexPart);
  console.log('🔍 Hex part length:', hexPart.length);
  console.log('🔍 Hex regex test:', hexValid);
  
  // Test with ethers.js validation
  try {
    const { ethers } = require('ethers');
    const ethersValid = ethers.isAddress(testAddress);
    console.log('🔍 Ethers.js validation:', ethersValid);
  } catch (error) {
    console.log('❌ Ethers.js not available:', error.message);
  }
  
  return {
    address: testAddress,
    length: testAddress.length,
    startsWith0x: testAddress.startsWith('0x'),
    hexPartLength: testAddress.substring(2).length,
    regexValid: isValid,
    hexRegexValid: hexValid
  };
}

// Run the test
if (typeof window !== 'undefined') {
  console.log('🧪 Running address validation test...');
  const result = testAddressValidation();
  console.log('📊 Test result:', result);
}
