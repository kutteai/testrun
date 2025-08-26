// PayCio Wallet Debug Script
// Run this in the browser console to test the extension

console.log('🔍 PayCio Wallet Debug Script Starting...');

// Test 1: Check if content script is running
console.log('=== Test 1: Content Script ===');
const contentScriptRunning = window.paycioWalletContentScript?.isRunning;
console.log('Content script running:', contentScriptRunning);
console.log('Content script timestamp:', window.paycioWalletContentScript?.timestamp);

// Test 2: Check if ethereum provider exists
console.log('\n=== Test 2: Ethereum Provider ===');
const ethereumExists = !!window.ethereum;
console.log('Ethereum provider exists:', ethereumExists);
console.log('Ethereum provider:', window.ethereum);

// Test 3: Check if it's PayCio Wallet
console.log('\n=== Test 3: PayCio Wallet Detection ===');
const isPayCioWallet = window.ethereum?.isPayCioWallet;
console.log('isPayCioWallet:', isPayCioWallet);
console.log('isMetaMask:', window.ethereum?.isMetaMask);

// Test 4: Check if paycioWallet exists
console.log('\n=== Test 4: Direct Access ===');
const paycioWalletExists = !!window.paycioWallet;
console.log('paycioWallet exists:', paycioWalletExists);
console.log('paycioWallet:', window.paycioWallet);

// Test 5: Check provider methods
console.log('\n=== Test 5: Provider Methods ===');
if (window.ethereum) {
  const methods = ['request', 'send', 'sendAsync', 'enable', 'on', 'removeListener'];
  methods.forEach(method => {
    const hasMethod = typeof window.ethereum[method] === 'function';
    console.log(`${method}: ${hasMethod ? '✅' : '❌'}`);
  });
}

// Test 6: Check if test function exists
console.log('\n=== Test 6: Test Function ===');
const testFunctionExists = typeof window.testPayCioWalletInjection === 'function';
console.log('testPayCioWalletInjection exists:', testFunctionExists);

// Test 7: Check debug div
console.log('\n=== Test 7: Debug Elements ===');
const debugDiv = document.getElementById('paycio-wallet-debug');
const debugDivExists = !!debugDiv;
console.log('Debug div exists:', debugDivExists);
if (debugDiv) {
  console.log('Debug div content:', debugDiv.innerHTML);
}

// Test 8: Try to connect wallet
console.log('\n=== Test 8: Wallet Connection ===');
async function testWalletConnection() {
  try {
    if (!window.ethereum) {
      console.log('❌ No ethereum provider available');
      return;
    }
    
    console.log('Attempting to connect wallet...');
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    console.log('✅ eth_accounts result:', accounts);
    
    if (accounts.length > 0) {
      console.log('✅ Wallet connected successfully!');
      console.log('Connected address:', accounts[0]);
      
      // Test chain ID
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      console.log('Chain ID:', chainId);
      
      // Test balance
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [accounts[0], 'latest']
      });
      console.log('Balance:', balance);
    } else {
      console.log('⚠️ No accounts found - wallet may not be set up');
    }
  } catch (error) {
    console.error('❌ Wallet connection failed:', error);
  }
}

// Test 9: Check EIP-6963 support
console.log('\n=== Test 9: EIP-6963 Support ===');
let providersFound = [];
const listener = (event) => {
  if (event.detail && event.detail.info && event.detail.provider) {
    providersFound.push(event.detail.info.name);
    console.log('✅ EIP-6963 provider found:', event.detail.info.name);
  }
};

window.addEventListener('eip6963:announceProvider', listener);
window.dispatchEvent(new CustomEvent('eip6963:requestProvider'));

setTimeout(() => {
  window.removeEventListener('eip6963:announceProvider', listener);
  console.log('EIP-6963 providers found:', providersFound);
  const hasPayCioWallet = providersFound.some(name => name.includes('PayCio'));
  console.log('PayCio Wallet in EIP-6963:', hasPayCioWallet ? '✅' : '❌');
}, 1000);

// Summary
console.log('\n=== SUMMARY ===');
const tests = [
  { name: 'Content Script', result: contentScriptRunning },
  { name: 'Ethereum Provider', result: ethereumExists },
  { name: 'Is PayCio Wallet', result: isPayCioWallet },
  { name: 'Direct Access', result: paycioWalletExists },
  { name: 'Test Function', result: testFunctionExists },
  { name: 'Debug Elements', result: debugDivExists }
];

const passed = tests.filter(t => t.result).length;
const total = tests.length;

console.log(`Tests passed: ${passed}/${total}`);
tests.forEach(test => {
  console.log(`${test.result ? '✅' : '❌'} ${test.name}`);
});

if (passed === total) {
  console.log('🎉 All tests passed! PayCio Wallet should be working.');
} else {
  console.log('⚠️ Some tests failed. Check the extension installation and permissions.');
}

// Run wallet connection test
setTimeout(testWalletConnection, 2000);

console.log('\n🔍 Debug script completed. Check the results above.');
