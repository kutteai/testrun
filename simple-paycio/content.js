// Content script that works with CSP
console.log('🔍 PayCio content script starting...');

// Function to inject the web accessible resource script
function injectScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  script.onload = () => {
    script.remove();
  };
  (document.head || document.documentElement).appendChild(script);
}

// Function to add visual indicator
function addIndicator() {
  if (document.body) {
    const indicator = document.createElement('div');
    indicator.id = 'paycio-content-script-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #007bff;
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 12px;
      z-index: 999999;
    `;
    indicator.innerHTML = 'PayCio Content Script: ✅ Running';
    document.body.appendChild(indicator);
    
    // Remove indicator after 5 seconds
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    }, 5000);
    
    console.log('✅ PayCio: Indicator added to page');
  } else {
    console.log('⚠️ PayCio: Document body not ready, retrying...');
    setTimeout(addIndicator, 100);
  }
}

try {
  // Inject the script using web accessible resource
  injectScript();
  
  // Add visual indicator
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addIndicator);
  } else {
    addIndicator();
  }
  
  console.log('✅ PayCio: Content script completed setup');
  
} catch (error) {
  console.error('❌ PayCio: Error in content script:', error);
}