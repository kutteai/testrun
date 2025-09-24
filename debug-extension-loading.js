// Debug script to check extension loading and provider injection
console.log('🔍 Extension Debug Script Loading...');

// Check if content script is loaded
function checkContentScript() {
    console.log('📋 Content Script Check:');
    console.log('- Document ready state:', document.readyState);
    console.log('- Document URL:', window.location.href);
    console.log('- User agent:', navigator.userAgent);
    
    // Check for extension-specific globals
    console.log('- chrome object:', typeof chrome);
    console.log('- chrome.runtime:', typeof chrome?.runtime);
    console.log('- chrome.extension:', typeof chrome?.extension);
    
    // Check for any Paycio-related globals
    console.log('- window.paycio:', typeof window.paycio);
    console.log('- window.paycioProviderReady:', window.paycioProviderReady);
    console.log('- window.paycioInjected:', window.paycioInjected);
    
    // Check ethereum providers
    console.log('- window.ethereum:', typeof window.ethereum);
    if (window.ethereum) {
        console.log('- window.ethereum.isPaycio:', window.ethereum.isPaycio);
        console.log('- window.ethereum.isMetaMask:', window.ethereum.isMetaMask);
        console.log('- window.ethereum.providers:', window.ethereum.providers?.length || 'none');
    }
    
    // Check for other wallet providers
    console.log('- window.web3:', typeof window.web3);
    console.log('- window.coinbase:', typeof window.coinbase);
}

// Check extension manifest and permissions
function checkExtensionInfo() {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        console.log('📦 Extension Info:');
        console.log('- Extension ID:', chrome.runtime.id);
        console.log('- Extension URL:', chrome.runtime.getURL(''));
        
        // Check if we can access extension resources
        try {
            const manifest = chrome.runtime.getManifest();
            console.log('- Manifest version:', manifest.version);
            console.log('- Content scripts:', manifest.content_scripts?.length || 'none');
        } catch (error) {
            console.log('- Manifest access error:', error.message);
        }
    } else {
        console.log('❌ Chrome extension API not available');
    }
}

// Check for CSP issues
function checkCSP() {
    console.log('🛡️ CSP Check:');
    
    // Try to create a script element
    try {
        const script = document.createElement('script');
        script.textContent = 'console.log("CSP test script");';
        document.head.appendChild(script);
        document.head.removeChild(script);
        console.log('✅ CSP allows script creation');
    } catch (error) {
        console.log('❌ CSP blocks script creation:', error.message);
    }
    
    // Check for CSP meta tag
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (cspMeta) {
        console.log('📋 CSP Meta tag found:', cspMeta.content);
    } else {
        console.log('ℹ️ No CSP meta tag found');
    }
}

// Check timing issues
function checkTiming() {
    console.log('⏰ Timing Check:');
    console.log('- Current time:', new Date().toISOString());
    console.log('- Document ready state:', document.readyState);
    console.log('- Window load event fired:', window.performance?.timing?.loadEventEnd > 0);
    
    // Check if content script ran early enough
    if (document.readyState === 'loading') {
        console.log('✅ Content script running early (document still loading)');
    } else {
        console.log('⚠️ Content script running late (document already loaded)');
    }
}

// Manual provider injection test
function testManualInjection() {
    console.log('🧪 Manual Injection Test:');
    
    try {
        // Create a simple provider
        const testProvider = {
            isPaycio: true,
            isMetaMask: false,
            chainId: '0x1',
            request: async ({ method }) => {
                console.log('Test provider request:', method);
                return '0x1';
            }
        };
        
        // Try to set window.paycio
        Object.defineProperty(window, 'paycio', {
            value: testProvider,
            writable: false,
            configurable: false
        });
        
        console.log('✅ Manual window.paycio injection successful');
        console.log('- window.paycio:', !!window.paycio);
        console.log('- window.paycio.isPaycio:', window.paycio?.isPaycio);
        
    } catch (error) {
        console.log('❌ Manual injection failed:', error.message);
    }
}

// Run all checks
function runAllChecks() {
    console.log('🚀 Running Extension Debug Checks...');
    console.log('='.repeat(50));
    
    checkContentScript();
    console.log('-'.repeat(30));
    
    checkExtensionInfo();
    console.log('-'.repeat(30));
    
    checkCSP();
    console.log('-'.repeat(30));
    
    checkTiming();
    console.log('-'.repeat(30));
    
    testManualInjection();
    console.log('-'.repeat(30));
    
    console.log('✅ Debug checks completed');
}

// Auto-run on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAllChecks);
} else {
    runAllChecks();
}

// Also run after a delay to catch late-loading content scripts
setTimeout(runAllChecks, 2000);

// Export for manual testing
window.debugExtension = {
    checkContentScript,
    checkExtensionInfo,
    checkCSP,
    checkTiming,
    testManualInjection,
    runAllChecks
};
