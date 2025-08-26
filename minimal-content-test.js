// Minimal content script test
console.log('=== Minimal Content Script Test ===');

try {
  // Test 1: Basic functionality
  console.log('Content script is running');
  
  // Test 2: Set global indicator
  window.paycioWalletContentScript = {
    isRunning: true,
    timestamp: Date.now(),
    test: () => true
  };
  
  console.log('Global indicator set:', window.paycioWalletContentScript);
  
  // Test 3: Create debug div
  const debugDiv = document.createElement('div');
  debugDiv.id = 'paycio-wallet-debug';
  debugDiv.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #333;
    color: #fff;
    padding: 10px;
    border-radius: 5px;
    font-family: monospace;
    font-size: 12px;
    z-index: 999999;
  `;
  debugDiv.innerHTML = 'PayCio Wallet: Minimal Test Loaded';
  document.body.appendChild(debugDiv);
  
  console.log('Debug div created');
  
  // Test 4: Set ethereum provider
  window.ethereum = {
    isPayCioWallet: true,
    isConnected: () => true,
    request: async (args) => {
      console.log('Minimal provider request:', args);
      if (args.method === 'eth_accounts') {
        return ['0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'];
      }
      return null;
    }
  };
  
  console.log('Ethereum provider set:', window.ethereum);
  
  console.log('=== Minimal Test Complete ===');
  
} catch (error) {
  console.error('Error in minimal content script:', error);
}
