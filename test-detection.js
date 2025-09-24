function log(message) {
    const logDiv = document.getElementById('log');
    const timestamp = new Date().toLocaleTimeString();
    logDiv.innerHTML += `[${timestamp}] ${message}\n`;
    logDiv.scrollTop = logDiv.scrollHeight;
    console.log(message);
}

function updateStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
}

function clearLog() {
    document.getElementById('log').innerHTML = '';
}

function testDetection() {
    log('🔍 Starting detection test...');
    
    // Test window.paycio
    if (window.paycio) {
        log('✅ window.paycio found');
        log(`  - isPaycio: ${window.paycio.isPaycio}`);
        log(`  - isMetaMask: ${window.paycio.isMetaMask}`);
        log(`  - chainId: ${window.paycio.chainId}`);
    } else {
        log('❌ window.paycio NOT found');
    }

    // Test window.ethereum
    if (window.ethereum) {
        log('✅ window.ethereum found');
        log(`  - isPaycio: ${window.ethereum.isPaycio}`);
        log(`  - isMetaMask: ${window.ethereum.isMetaMask}`);
        
        if (window.ethereum.providers) {
            log(`  - providers array length: ${window.ethereum.providers.length}`);
            const paycioInProviders = window.ethereum.providers.find(p => p.isPaycio);
            if (paycioInProviders) {
                log('✅ Paycio found in providers array');
            } else {
                log('❌ Paycio NOT found in providers array');
            }
        }
    } else {
        log('❌ window.ethereum NOT found');
    }

    // Test other providers
    const otherProviders = [];
    if (window.web3) otherProviders.push('web3');
    if (window.ethereum && window.ethereum.isMetaMask) otherProviders.push('MetaMask');
    if (window.ethereum && window.ethereum.isCoinbaseWallet) otherProviders.push('Coinbase');
    
    if (otherProviders.length > 0) {
        log(`ℹ️ Other providers: ${otherProviders.join(', ')}`);
    }

    // Overall result
    const hasPaycio = window.paycio || 
                    (window.ethereum && window.ethereum.isPaycio) ||
                    (window.ethereum && window.ethereum.providers && 
                     window.ethereum.providers.find(p => p.isPaycio));

    if (hasPaycio) {
        updateStatus('✅ Paycio detected successfully!', 'success');
        log('🎉 SUCCESS: Paycio wallet is properly detected');
    } else {
        updateStatus('❌ Paycio not detected', 'error');
        log('💥 FAILURE: Paycio wallet is not detected');
    }

    // Test EIP-6963
    log('🔍 Testing EIP-6963...');
    const providers = [];
    
    window.addEventListener('eip6963:announceProvider', (event) => {
        const { info } = event.detail;
        providers.push(info.name);
        log(`📢 EIP-6963: ${info.name} announced`);
    });
    
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    
    setTimeout(() => {
        if (providers.length === 0) {
            log('❌ No EIP-6963 providers found');
        } else {
            log(`✅ EIP-6963 providers: ${providers.join(', ')}`);
        }
    }, 1000);
}

// Auto-test on load
window.addEventListener('load', () => {
    log('🚀 Page loaded');
    setTimeout(testDetection, 1000);
});

// Listen for ethereum events
window.addEventListener('ethereum#initialized', () => {
    log('📢 ethereum#initialized event received');
});
