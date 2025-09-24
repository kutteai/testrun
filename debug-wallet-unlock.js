// Wallet Unlock Debug Script
// Run this in the browser console to test wallet unlock functionality

console.log('🔍 Wallet Unlock Debug Script Loaded');
console.log('Available debug functions:');
console.log('- debugUnlockIssue(password) - Comprehensive unlock debugging');
console.log('- debugPassword(password) - Password verification only');
console.log('- debugStorage() - Storage integrity test');

// Example usage:
console.log('\n📋 Example Usage:');
console.log('// Test comprehensive unlock debugging');
console.log('await debugUnlockIssue("your-password-here");');
console.log('');
console.log('// Test password verification only');
console.log('const isValid = await debugPassword("your-password-here");');
console.log('console.log("Password valid:", isValid);');
console.log('');
console.log('// Test storage integrity');
console.log('const storageOk = await debugStorage();');
console.log('console.log("Storage working:", storageOk);');

// Helper function to check browser storage directly
window.checkBrowserStorage = async () => {
  try {
    console.log('🔍 === BROWSER STORAGE CHECK ===');
    
    // Check Chrome storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await new Promise((resolve) => {
        chrome.storage.local.get(null, resolve);
      });
      
      console.log('📦 All storage data keys:', Object.keys(result));
      
      // Check specific keys
      const importantKeys = ['wallet', 'passwordHash', 'walletState', 'sessionPassword', 'unlockTime'];
      for (const key of importantKeys) {
        const value = result[key];
        console.log(`🔍 ${key}:`, {
          exists: !!value,
          type: typeof value,
          size: value ? JSON.stringify(value).length : 0
        });
      }
      
      return result;
    } else {
      console.log('❌ Chrome storage API not available');
      return null;
    }
  } catch (error) {
    console.error('❌ Storage check failed:', error);
    return null;
  }
};

console.log('\n🔧 Additional helper function available:');
console.log('await checkBrowserStorage(); // Direct browser storage inspection');

// Auto-run storage check
console.log('\n🚀 Auto-running storage check...');
checkBrowserStorage().then((result) => {
  if (result) {
    console.log('✅ Storage check complete. Use the debug functions above to test unlock functionality.');
  } else {
    console.log('❌ Storage check failed. Check browser console for errors.');
  }
});
