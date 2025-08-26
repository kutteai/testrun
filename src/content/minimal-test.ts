// Minimal content script test
console.log('=== Minimal Content Script Test ===');

try {
  // Test basic functionality
  console.log('Content script starting...');
  
  // Set global indicator
  (window as any).paycioWalletContentScript = {
    isRunning: true,
    timestamp: Date.now(),
    test: () => true
  };
  
  console.log('Global indicator set:', (window as any).paycioWalletContentScript);
  
  // Create debug div
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
  
  console.log('=== Minimal Test Complete ===');
  
} catch (error) {
  console.error('Error in minimal content script:', error);
}

