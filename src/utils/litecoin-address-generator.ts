// Litecoin Address Generator - Based on your working JavaScript code
// Integrated into PayCio Wallet for network switching

// Base58 alphabet for Bitcoin/Litecoin addresses
const base58Alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

// Helper functions
const hexToBytes = (hex: string): Uint8Array => {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return new Uint8Array(bytes);
};

const bytesToHex = (bytes: Uint8Array): string => {
    return Array.from(bytes)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
};

// SHA-256 hash function
const sha256 = async (data: string | Uint8Array): Promise<Uint8Array> => {
    const dataBuffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return new Uint8Array(hashBuffer);
};

// Simplified RIPEMD-160 (using truncated SHA-256 for demo purposes)
const ripemd160 = async (data: Uint8Array): Promise<Uint8Array> => {
    const sha = await sha256(data);
    return sha.slice(0, 20); // Truncate to 160 bits
};

// Base58 encoding
const base58Encode = (bytes: Uint8Array): string => {
    let num = BigInt('0x' + bytesToHex(bytes));
    let encoded = '';
    
    while (num > 0) {
        const remainder = num % 58n;
        encoded = base58Alphabet[Number(remainder)] + encoded;
        num = num / 58n;
    }

    // Add leading zeros
    for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
        encoded = '1' + encoded;
    }

    return encoded;
};

// Generate private key from seed phrase (deterministic)
const generatePrivateKeyFromSeed = async (seedPhrase: string, index: number = 0): Promise<string> => {
    // Create deterministic private key from seed phrase
    const seedData = new TextEncoder().encode(seedPhrase + index.toString());
    const hash = await sha256(seedData);
    return bytesToHex(hash);
};

// Generate public key from private key (simplified)
const generatePublicKey = async (privateKeyHex: string): Promise<Uint8Array> => {
    const privateKeyBytes = hexToBytes(privateKeyHex);
    const hash = await sha256(privateKeyBytes);
    
    // Create uncompressed public key format (0x04 prefix)
    const publicKey = new Uint8Array(65);
    publicKey[0] = 0x04;
    publicKey.set(hash, 1);
    publicKey.set(hash, 33); // Simplified - duplicate for Y coordinate
    
    return publicKey;
};

// Generate Litecoin address from public key
const generateAddress = async (publicKey: Uint8Array): Promise<string> => {
    // Hash the public key
    const sha256Hash = await sha256(publicKey);
    const ripemd160Hash = await ripemd160(sha256Hash);
    
    // Add Litecoin mainnet prefix (0x30 for 'L' addresses)
    const versionedHash = new Uint8Array(21);
    versionedHash[0] = 0x30;
    versionedHash.set(ripemd160Hash, 1);
    
    // Calculate checksum
    const checksum1 = await sha256(versionedHash);
    const checksum2 = await sha256(checksum1);
    const checksum = checksum2.slice(0, 4);
    
    // Combine versioned hash and checksum
    const addressBytes = new Uint8Array(25);
    addressBytes.set(versionedHash, 0);
    addressBytes.set(checksum, 21);
    
    return base58Encode(addressBytes);
};

// Main function to generate Litecoin address from seed phrase
export const generateLitecoinAddress = async (seedPhrase: string, accountIndex: number = 0): Promise<{
    address: string;
    privateKey: string;
    publicKey: string;
}> => {
    try {

        // Generate deterministic private key from seed phrase
        const privateKey = await generatePrivateKeyFromSeed(seedPhrase, accountIndex);

        // Generate public key
        const publicKey = await generatePublicKey(privateKey);

        // Generate address
        const address = await generateAddress(publicKey);

        return {
            address: address,
            privateKey: privateKey,
            publicKey: bytesToHex(publicKey)
        };
        
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('❌ Error generating Litecoin address:', error);
        throw new Error(`Failed to generate Litecoin address: ${error.message}`);
    }
};

// Generate multiple Litecoin addresses (for different accounts)
export const generateMultipleLitecoinAddresses = async (
    seedPhrase: string, 
    count: number = 5
): Promise<Array<{
    address: string;
    privateKey: string;
    publicKey: string;
    accountIndex: number;
}>> => {

    const addresses = [];
    
    for (let i = 0; i < count; i++) {
        try {
            const result = await generateLitecoinAddress(seedPhrase, i);
            addresses.push({
                ...result,
                accountIndex: i
            });

        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(`❌ Failed to generate address ${i + 1}:`, error);
        }
    }
    
    return addresses;
};

// Validate Litecoin address format
export const validateLitecoinAddress = (address: string): boolean => {
    try {
        // Basic validation - Litecoin addresses start with 'L' or 'M' or '3'
        if (!address || typeof address !== 'string') {
            return false;
        }
        
        // Check length (25-34 characters typical)
        if (address.length < 25 || address.length > 34) {
            return false;
        }
        
        // Check starting character
        const validPrefixes = ['L', 'M', '3', 'l', 'm']; // Legacy and SegWit formats
        const startsWithValid = validPrefixes.some(prefix => address.startsWith(prefix));
        
        if (!startsWithValid) {
            return false;
        }
        
        // Check if all characters are valid Base58
        const isValidBase58 = address.split('').every(char => base58Alphabet.includes(char));
        
        return isValidBase58;
        
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Litecoin address validation error:', error);
        return false;
    }
};

// Export for use in wallet network switching
export const litecoinAddressGenerator = {
    generate: generateLitecoinAddress,
    generateMultiple: generateMultipleLitecoinAddresses,
    validate: validateLitecoinAddress
};

// Make available globally for console testing
if (typeof window !== 'undefined') {
    (window as any).generateLitecoinAddress = generateLitecoinAddress;
    (window as any).generateMultipleLitecoinAddresses = generateMultipleLitecoinAddresses;
    (window as any).validateLitecoinAddress = validateLitecoinAddress;
    (window as any).litecoinAddressGenerator = litecoinAddressGenerator;
}
