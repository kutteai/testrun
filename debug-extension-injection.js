// Debug Extension Injection Script
// Run this in the browser console to debug provider injection issues

console.log('🔍 Paycio Extension Injection Debug');
console.log('==================================');

// Check if content script is loaded
console.log('\n📋 Content Script Status:');
console.log('- window.paycioInjected:', window.paycioInjected);

// Check all providers
console.log('\n🔍 Provider Detection:');
console.log('- window.ethereum:', !!window.ethereum);
console.log('- window.paycio:', !!window.paycio);
console.log('- window.paycioWallet:', !!window.paycioWallet);

if (window.ethereum) {
  console.log('\n🔍 Ethereum Provider Details:');
  console.log('- isPaycio:', window.ethereum.isPaycio);
  console.log('- isMetaMask:', window.ethereum.isMetaMask);
  console.log('- chainId:', window.ethereum.chainId);
  console.log('- providers array:', window.ethereum.providers?.length || 'none');
  
  if (window.ethereum.providers) {
    console.log('\n📋 Providers Array:');
    window.ethereum.providers.forEach((provider, index) => {
      console.log(`Provider ${index}:`, {
        isPaycio: provider.isPaycio,
        isMetaMask: provider.isMetaMask,
        chainId: provider.chainId
      });
    });
  }
}

// Manual injection test
console.log('\n🧪 Manual Injection Test:');
if (!window.paycio) {
  console.log('❌ window.paycio not found - attempting manual injection...');
  
  // Try to find Paycio provider in providers array
  if (window.ethereum?.providers) {
    const paycioProvider = window.ethereum.providers.find(p => p.isPaycio);
    if (paycioProvider) {
      console.log('✅ Found Paycio provider in providers array, manually setting window.paycio');
      window.paycio = paycioProvider;
      console.log('✅ window.paycio manually set');
    } else {
      console.log('❌ Paycio provider not found in providers array');
    }
  } else {
    console.log('❌ No providers array found');
  }
} else {
  console.log('✅ window.paycio already exists');
}

// Final check
console.log('\n✅ Final Status:');
console.log('- window.ethereum:', !!window.ethereum);
console.log('- window.paycio:', !!window.paycio);
console.log('- window.paycioWallet:', !!window.paycioWallet);

// Test connection
if (window.paycio) {
  console.log('\n🧪 Testing Paycio Connection:');
  window.paycio.request({ method: 'eth_chainId' })
    .then(chainId => {
      console.log('✅ Paycio connection test successful, chainId:', chainId);
    })
    .catch(error => {
      console.log('❌ Paycio connection test failed:', error.message);
    });
}

// Extension reload instructions
console.log('\n📋 If window.paycio is still not found:');
console.log('1. Go to chrome://extensions/');
console.log('2. Find Paycio Wallet extension');
console.log('3. Click the reload button (🔄)');
console.log('4. Refresh this page');
console.log('5. Run this script again');

// Export manual fix function
window.fixPaycioProvider = function() {
  console.log('🔧 Attempting to fix Paycio provider...');
  
  if (window.ethereum?.providers) {
    const paycioProvider = window.ethereum.providers.find(p => p.isPaycio);
    if (paycioProvider) {
      window.paycio = paycioProvider;
      window.paycioWallet = paycioProvider;
      console.log('✅ Paycio provider manually fixed!');
      return true;
    }
  }
  
  console.log('❌ Could not fix Paycio provider automatically');
  return false;
};

console.log('\n🔧 Manual fix function available: window.fixPaycioProvider()');
