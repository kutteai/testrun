// wallet-debug-tool.ts - Debug tool to test wallet password verification
// Run this in your browser console on the extension page

export async function debugWalletPassword(testPassword?: string) {
  try {
    console.log('🔍 Debugging wallet password verification...');
    
    // Get current storage data
    const storageData = await new Promise((resolve) => {
      chrome.storage.local.get(null, resolve);
    });
    
    console.log('📦 Storage keys found:', Object.keys(storageData));
    
    const wallet = (storageData as any).wallet;
    const passwordHash = (storageData as any).passwordHash;
    const walletState = (storageData as any).walletState;
    
    console.log('📋 Wallet analysis:');
    console.log('  - Has wallet:', !!wallet);
    console.log('  - Has password hash:', !!passwordHash);
    console.log('  - Has wallet state:', !!walletState);
    
    if (wallet) {
      console.log('  - Wallet ID:', wallet.id);
      console.log('  - Wallet name:', wallet.name);
      console.log('  - Has encrypted seed phrase:', !!wallet.encryptedSeedPhrase);
      console.log('  - Has legacy password:', !!wallet.password);
      console.log('  - Current address:', wallet.address);
    }
    
    if (!testPassword) {
      console.log('ℹ️ No test password provided. Storage analysis complete.');
      return;
    }
    
    console.log('🔐 Testing password verification methods...');
    
    // Test 1: Hash verification
    if (passwordHash) {
      try {
        // Use the same hashing method as the background script
        const encoder = new TextEncoder();
        const data = encoder.encode(testPassword);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const testHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        const hashMatch = testHash === passwordHash;
        console.log('✅ Hash verification:', hashMatch ? 'PASS' : 'FAIL');
        console.log('  - Test hash:', testHash.substring(0, 20) + '...');
        console.log('  - Stored hash:', passwordHash.substring(0, 20) + '...');
      } catch (error) {
        console.log('❌ Hash verification error:', error.message);
      }
    } else {
      console.log('⚠️ No password hash found in storage');
    }
    
    // Test 2: Seed phrase decryption
    if (wallet && wallet.encryptedSeedPhrase) {
      try {
        // Attempt decryption using the same method as background script
        const data = new Uint8Array(
          atob(wallet.encryptedSeedPhrase).split('').map(c => c.charCodeAt(0))
        );
        
        const salt = data.slice(0, 16);
        const iv = data.slice(16, 28);
        const encrypted = data.slice(28);
        
        console.log('🔍 Encrypted data structure:');
        console.log('  - Total length:', data.length);
        console.log('  - Salt length:', salt.length);
        console.log('  - IV length:', iv.length);
        console.log('  - Encrypted length:', encrypted.length);
        
        // Try to derive key and decrypt
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
          'raw',
          encoder.encode(testPassword),
          { name: 'PBKDF2' },
          false,
          ['deriveBits', 'deriveKey']
        );

        const key = await crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
          },
          keyMaterial,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt']
        );
        
        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: iv },
          key,
          encrypted
        );
        
        const seedPhrase = new TextDecoder().decode(decrypted);
        const words = seedPhrase.trim().split(' ');
        
        console.log('✅ Seed phrase decryption: PASS');
        console.log('  - Decrypted length:', seedPhrase.length);
        console.log('  - Word count:', words.length);
        console.log('  - First 3 words:', words.slice(0, 3).join(' ') + '...');
        
      } catch (error) {
        console.log('❌ Seed phrase decryption: FAIL');
        console.log('  - Error:', error.message);
      }
    } else {
      console.log('⚠️ No encrypted seed phrase found');
    }
    
    // Test 3: Legacy password check
    if (wallet && wallet.password) {
      const legacyMatch = wallet.password === testPassword;
      console.log('✅ Legacy password check:', legacyMatch ? 'PASS' : 'FAIL');
      console.log('  - Stored password:', wallet.password.substring(0, 3) + '***');
      console.log('  - Test password:', testPassword.substring(0, 3) + '***');
    } else {
      console.log('⚠️ No legacy password found');
    }
    
    // Test 4: Send message to background script
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'UNLOCK_WALLET',
          password: testPassword
        }, resolve);
      });
      
      console.log('📨 Background script response:', response);
    } catch (error) {
      console.log('❌ Background script communication error:', error.message);
    }
    
    console.log('🏁 Password debugging complete!');
    
  } catch (error) {
    console.error('❌ Debug function error:', error);
  }
}

// Make it available globally for console use
if (typeof window !== 'undefined') {
  (window as any).debugWalletPassword = debugWalletPassword;
  console.log('🔧 Wallet debug tool loaded. Use: debugWalletPassword("your-password")');
  console.log('🔧 Or just: debugWalletPassword() to analyze storage without testing password');
}
