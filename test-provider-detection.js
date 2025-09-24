// Paycio Provider Detection Test
// Run this in the browser console to test provider detection

console.log('🔍 Paycio Provider Detection Test');
console.log('================================');

// Test 1: Basic provider detection
console.log('\n📋 Basic Provider Detection:');
console.log('- window.ethereum:', !!window.ethereum);
console.log('- window.paycio:', !!window.paycio);
console.log('- window.paycioWallet:', !!window.paycioWallet);
console.log('- window.web3:', !!window.web3);

// Test 2: Provider details
if (window.ethereum) {
  console.log('\n🔍 Ethereum Provider Details:');
  console.log('- isPaycio:', window.ethereum.isPaycio);
  console.log('- isMetaMask:', window.ethereum.isMetaMask);
  console.log('- chainId:', window.ethereum.chainId);
  console.log('- selectedAddress:', window.ethereum.selectedAddress);
  console.log('- isConnected:', window.ethereum.isConnected ? window.ethereum.isConnected() : 'N/A');
}

if (window.paycio) {
  console.log('\n🔍 Paycio Provider Details:');
  console.log('- isPaycio:', window.paycio.isPaycio);
  console.log('- chainId:', window.paycio.chainId);
  console.log('- selectedAddress:', window.paycio.selectedAddress);
}

// Test 3: EIP-6963 detection
console.log('\n🔍 EIP-6963 Provider Detection:');
let eip6963Providers = [];

window.addEventListener('eip6963:announceProvider', (event) => {
  eip6963Providers.push(event.detail);
  console.log('Found EIP-6963 provider:', event.detail.info.name);
});

// Request EIP-6963 providers
window.dispatchEvent(new Event('eip6963:requestProvider'));

setTimeout(() => {
  console.log('EIP-6963 providers found:', eip6963Providers.length);
  eip6963Providers.forEach((provider, index) => {
    console.log(`Provider ${index + 1}:`, {
      name: provider.info.name,
      uuid: provider.info.uuid,
      rdns: provider.info.rdns
    });
  });
}, 1000);

// Test 4: Provider functionality test
async function testProviderFunctionality() {
  console.log('\n🧪 Provider Functionality Test:');
  
  if (!window.ethereum) {
    console.log('❌ No Ethereum provider found');
    return;
  }

  try {
    // Test basic methods
    console.log('Testing eth_chainId...');
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    console.log('✅ Chain ID:', chainId);

    console.log('Testing eth_accounts...');
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    console.log('✅ Accounts:', accounts);

    console.log('Testing eth_requestAccounts...');
    const requestAccounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    console.log('✅ Request Accounts:', requestAccounts);

  } catch (error) {
    console.log('❌ Provider test failed:', error.message);
  }
}

// Test 5: Provider comparison
function compareProviders() {
  console.log('\n🔍 Provider Comparison:');
  
  if (window.ethereum && window.paycio) {
    console.log('Both window.ethereum and window.paycio exist');
    console.log('Are they the same object?', window.ethereum === window.paycio);
    
    if (window.ethereum === window.paycio) {
      console.log('✅ Providers are identical - this is correct');
    } else {
      console.log('⚠️ Providers are different - this might cause issues');
    }
  } else if (window.ethereum && !window.paycio) {
    console.log('❌ Only window.ethereum exists - window.paycio is missing');
  } else if (!window.ethereum && window.paycio) {
    console.log('⚠️ Only window.paycio exists - window.ethereum is missing');
  } else {
    console.log('❌ No providers found');
  }
}

// Run all tests
console.log('\n🚀 Running provider functionality test...');
testProviderFunctionality();

console.log('\n🔍 Running provider comparison...');
compareProviders();

// Export test functions for manual testing
window.testPaycioProvider = {
  testFunctionality: testProviderFunctionality,
  compareProviders: compareProviders,
  runAllTests: () => {
    console.log('🔍 Running all Paycio provider tests...');
    testProviderFunctionality();
    compareProviders();
  }
};

console.log('\n✅ Test functions exported to window.testPaycioProvider');
console.log('You can run: window.testPaycioProvider.runAllTests()');
