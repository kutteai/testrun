// wallet-debug-tool.ts - Debug tool to test wallet password verification
// Run this in your browser console on the extension page

export async function debugWalletPassword(testPassword?: string) {
  try {

    // Get current storage data
    const storageData = await new Promise((resolve) => {
      chrome.storage.local.get(null, resolve);
    });
    
    // eslint-disable-next-line no-console
    console.log('📦 Storage keys found:', Object.keys(storageData));
    
    const wallet = (storageData as any).wallet;
    const passwordHash = (storageData as any).passwordHash;
    const walletState = (storageData as any).walletState;


    if (wallet) {
      // Intentionally empty for future debugging logic
    }
    
    if (!testPassword) {

      return;
    }

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

        // eslint-disable-next-line no-console
        console.log('  - Test hash:', testHash.substring(0, 20) + '...');
        // eslint-disable-next-line no-console
        console.log('  - Stored hash:', passwordHash.substring(0, 20) + '...');
      } catch (error) {

      }
    } else {

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


        // eslint-disable-next-line no-console
        console.log('  - First 3 words:', words.slice(0, 3).join(' ') + '...');
        
      } catch (error) {


      }
    } else {

    }
    
    // Test 3: Legacy password check
    if (wallet && wallet.password) {
      const legacyMatch = wallet.password === testPassword;

      // eslint-disable-next-line no-console
      console.log('  - Stored password:', wallet.password.substring(0, 3) + '***');
      // eslint-disable-next-line no-console
      console.log('  - Test password:', testPassword.substring(0, 3) + '***');
    } else {

    }
    
    // Test 4: Send message to background script
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'UNLOCK_WALLET',
          password: testPassword
        }, resolve);
      });

    } catch (error) {

    }

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Debug function error:', error);
  }
}

// Make it available globally for console use
if (typeof window !== 'undefined') {
  (window as any).debugWalletPassword = debugWalletPassword;
  // eslint-disable-next-line no-console
  console.log('🔧 Wallet debug tool loaded. Use: debugWalletPassword("your-password")');
  // eslint-disable-next-line no-console
  console.log('🔧 Or just: debugWalletPassword() to analyze storage without testing password');
}
