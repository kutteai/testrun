import { ethers } from 'ethers';
import { validateBIP39SeedPhrase } from './crypto-utils';
import * as bip39 from 'bip39';
// @ts-ignore
import { HDKey } from 'hdkey';
// Generate HD wallet from seed phrase (real implementation)
export async function generateHDWallet(seedPhrase, _network = 'ethereum', derivationPath = "m/44'/60'/0'/0/0") {
    try {
        const { ethers } = await import('ethers');
        const bip39 = await import('bip39');
        // Validate seed phrase
        if (!bip39.validateMnemonic(seedPhrase)) {
            throw new Error('Invalid seed phrase');
        }
        // Generate seed from mnemonic
        const seed = await bip39.mnemonicToSeed(seedPhrase);
        // Create HD node
        const hdNode = ethers.HDNodeWallet.fromSeed(seed);
        // Derive wallet from path
        const derivedWallet = hdNode.derivePath(derivationPath);
        return {
            address: derivedWallet.address,
            privateKey: derivedWallet.privateKey,
            publicKey: derivedWallet.publicKey,
            mnemonic: seedPhrase,
            derivationPath: derivationPath,
            seedPhrase: seedPhrase,
            network: _network
        };
    }
    catch (error) {
        console.error('Error generating HD wallet:', error);
        throw error;
    }
}
// Derive wallet from seed phrase (real implementation)
export async function deriveWalletFromSeed(seedPhrase, network = 'ethereum') {
    if (!validateBIP39SeedPhrase(seedPhrase)) {
        throw new Error('Invalid seed phrase');
    }
    const derivationPath = getDerivationPath(network);
    const wallet = await generateHDWallet(seedPhrase, network, derivationPath);
    return {
        privateKey: wallet.privateKey,
        publicKey: wallet.publicKey,
        address: wallet.address,
        seedPhrase: wallet.mnemonic,
        derivationPath: wallet.derivationPath
    };
}
// Generate multiple accounts from seed phrase
export function generateMultipleAccounts(seedPhrase, network, count = 5) {
    if (!validateBIP39SeedPhrase(seedPhrase)) {
        throw new Error('Invalid seed phrase');
    }
    const accounts = [];
    const seed = bip39.mnemonicToSeedSync(seedPhrase);
    const hdkey = HDKey.fromMasterSeed(seed);
    for (let i = 0; i < count; i++) {
        const derivationPath = getDerivationPath(network, i);
        const childKey = hdkey.derive(derivationPath);
        const privateKey = '0x' + childKey.privateKey.toString('hex');
        const publicKey = '0x' + childKey.publicKey.toString('hex');
        const address = ethers.getAddress(ethers.computeAddress(publicKey));
        accounts.push({
            address,
            privateKey,
            publicKey,
            derivationPath,
            network
        });
    }
    return accounts;
}
// Import wallet from private key
export function importWalletFromPrivateKey(privateKey, network = 'ethereum') {
    if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
        throw new Error('Invalid private key format');
    }
    // Real implementation: derive public key and address from private key
    try {
        const wallet = new ethers.Wallet(privateKey);
        // Derive public key from private key
        const publicKey = ethers.SigningKey.computePublicKey(privateKey);
        const address = wallet.address;
        return {
            seedPhrase: '', // Not available when importing from private key
            privateKey,
            publicKey,
            address,
            network,
            derivationPath: 'm/44\'/60\'/0\'/0/0',
            mnemonic: '' // Not available when importing from private key
        };
    }
    catch {
        throw new Error('Invalid private key');
    }
}
// Import wallet from seed phrase
export async function importWalletFromSeedPhrase(seedPhrase, network = 'ethereum') {
    return await generateHDWallet(seedPhrase, network);
}
// Validate private key
export function validatePrivateKey(privateKey) {
    try {
        // Check if it's a valid private key format
        if (!privateKey.startsWith('0x')) {
            privateKey = '0x' + privateKey;
        }
        // Try to create a wallet from the private key
        new ethers.Wallet(privateKey);
        return true;
    }
    catch {
        return false;
    }
}
// Derive address from private key
export function deriveAddressFromPrivateKey(privateKey) {
    try {
        const wallet = new ethers.Wallet(privateKey);
        return wallet.address;
    }
    catch {
        throw new Error('Invalid private key');
    }
}
// Generate random private key
export function generateRandomPrivateKey() {
    const wallet = ethers.Wallet.createRandom();
    return wallet.privateKey;
}
// Convert seed phrase to private key (real implementation)
export async function seedPhraseToPrivateKey(seedPhrase, derivationPath = "m/44'/60'/0'/0/0") {
    if (!validateBIP39SeedPhrase(seedPhrase)) {
        throw new Error('Invalid seed phrase');
    }
    const derivedWallet = await generateHDWallet(seedPhrase, 'ethereum', derivationPath);
    return derivedWallet.privateKey;
}
// Get derivation path for different networks (real implementation)
export function getDerivationPath(network, accountIndex = 0) {
    const paths = {
        // EVM Networks - All use Ethereum's derivation path (coin type 60)
        ethereum: `m/44'/60'/0'/0/${accountIndex}`,
        bsc: `m/44'/60'/0'/0/${accountIndex}`,
        polygon: `m/44'/60'/0'/0/${accountIndex}`,
        avalanche: `m/44'/60'/0'/0/${accountIndex}`,
        arbitrum: `m/44'/60'/0'/0/${accountIndex}`,
        optimism: `m/44'/60'/0'/0/${accountIndex}`,
        base: `m/44'/60'/0'/0/${accountIndex}`,
        fantom: `m/44'/60'/0'/0/${accountIndex}`,
        zksync: `m/44'/60'/0'/0/${accountIndex}`,
        linea: `m/44'/60'/0'/0/${accountIndex}`,
        mantle: `m/44'/60'/0'/0/${accountIndex}`,
        scroll: `m/44'/60'/0'/0/${accountIndex}`,
        'polygon-zkevm': `m/44'/60'/0'/0/${accountIndex}`,
        'arbitrum-nova': `m/44'/60'/0'/0/${accountIndex}`,
        // Non-EVM Networks - Each has unique coin type
        bitcoin: `m/44'/0'/0'/0/${accountIndex}`,
        litecoin: `m/44'/2'/0'/0/${accountIndex}`,
        solana: `m/44'/501'/0'/0'/${accountIndex}'`,
        tron: `m/44'/195'/0'/0/${accountIndex}`,
        xrp: `m/44'/144'/0'/0/${accountIndex}`,
        ton: `m/44'/396'/0'/0/${accountIndex}`
    };
    return paths[network] || paths.ethereum;
}
// Generate wallet for specific network (real implementation)
export async function generateNetworkWallet(seedPhrase, network, accountIndex = 0) {
    if (!validateBIP39SeedPhrase(seedPhrase)) {
        throw new Error('Invalid seed phrase');
    }
    const derivationPath = getDerivationPath(network, accountIndex);
    return await generateHDWallet(seedPhrase, network, derivationPath);
}
// Export wallet data (for backup)
export function exportWalletData(wallet) {
    const data = {
        seedPhrase: wallet.seedPhrase,
        privateKey: wallet.privateKey,
        publicKey: wallet.publicKey,
        address: wallet.address,
        network: wallet.network,
        derivationPath: wallet.derivationPath,
        timestamp: Date.now()
    };
    return JSON.stringify(data, null, 2);
}
// Import wallet data (from backup)
export function importWalletData(data) {
    try {
        const walletData = JSON.parse(data);
        if (!walletData.address || !walletData.network) {
            throw new Error('Invalid wallet data format');
        }
        return {
            seedPhrase: walletData.seedPhrase || '',
            privateKey: walletData.privateKey || '',
            publicKey: walletData.publicKey || '',
            address: walletData.address,
            network: walletData.network,
            derivationPath: walletData.derivationPath || 'm/44\'/60\'/0\'/0/0',
            mnemonic: walletData.mnemonic || ''
        };
    }
    catch (error) {
        throw new Error('Failed to parse wallet data');
    }
}
// Validate derivation path
export function validateDerivationPath(path) {
    try {
        // Basic validation for BIP44 derivation paths
        const parts = path.split('/');
        if (parts[0] !== 'm')
            return false;
        for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            if (part.endsWith("'")) {
                const num = parseInt(part.slice(0, -1));
                if (isNaN(num) || num < 0 || num > 0x7fffffff)
                    return false;
            }
            else {
                const num = parseInt(part);
                if (isNaN(num) || num < 0 || num > 0x7fffffff)
                    return false;
            }
        }
        return true;
    }
    catch {
        return false;
    }
}
// Get network from derivation path
export function getNetworkFromPath(derivationPath) {
    const parts = derivationPath.split('/');
    if (parts.length < 3)
        return 'ethereum';
    const coinType = parseInt(parts[2].replace("'", ""));
    const networkMap = {
        0: 'bitcoin',
        2: 'litecoin',
        60: 'ethereum',
        144: 'xrp',
        195: 'tron',
        396: 'ton',
        501: 'solana'
    };
    return networkMap[coinType] || 'ethereum';
}
