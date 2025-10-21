class LocalSecurityManager {
  static async hashPassword(_password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(_password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  static async deriveKey(_password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(_password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey'],
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  static async encrypt(plaintext: string, password: string): Promise<string> {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const key = await this.deriveKey(password, salt);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(plaintext),
    );

    const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(new Uint8Array(encrypted), salt.length + iv.length);

    return btoa(String.fromCharCode(...result));
  }

  static async decrypt(encryptedData: string, password: string): Promise<string> {
    try {
      const data = new Uint8Array(atob(encryptedData).split('').map((c) => c.charCodeAt(0)));

      const salt = data.slice(0, 16);
      const iv = data.slice(16, 28);
      const encrypted = data.slice(28);

      const key = await this.deriveKey(password, salt);
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted,
      );

      return new TextDecoder().decode(decrypted);
    } catch (_error) {
      throw new Error('Decryption failed - invalid password or corrupted data');
    }
  }
}

export { LocalSecurityManager };
