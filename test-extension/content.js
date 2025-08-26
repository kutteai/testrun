// Simple test content script
console.log('🔍 Test content script starting...');

window.testContentScript = {
  isRunning: true,
  timestamp: Date.now(),
  message: 'Test content script is running!'
};

console.log('✅ Test content script loaded successfully');

// Add a visible indicator
const testDiv = document.createElement('div');
testDiv.id = 'test-content-script-indicator';
testDiv.style.cssText = `
  position: fixed;
  top: 10px;
  left: 10px;
  background: #28a745;
  color: white;
  padding: 10px;
  border-radius: 5px;
  font-family: monospace;
  font-size: 12px;
  z-index: 999999;
`;
testDiv.innerHTML = 'Test Content Script: ✅ Running';
document.body.appendChild(testDiv);

setTimeout(() => {
  testDiv.style.display = 'none';
}, 5000);

console.log('🔍 Test content script completed setup');
