import * as bip39 from 'bip39';
import { ethers } from 'ethers';
import { encryptData, decryptData } from '../utils/crypto-utils';
import { deriveWalletFromSeed } from '../utils/key-derivation';
export class WalletManager {
    constructor() {
        this.wallets = [];
        this.loadWallets();
    }
    // Load wallets from storage
    async loadWallets() {
        try {
            chrome.storage.local.get(['wallets'], (result) => {
                if (result.wallets) {
                    this.wallets = result.wallets;
                }
            });
        }
        catch (error) {
            console.error('Failed to load wallets:', error);
        }
    }
    // Save wallets to storage
    async saveWallets() {
        try {
            chrome.storage.local.set({ wallets: this.wallets });
        }
        catch (error) {
            console.error('Failed to save wallets:', error);
        }
    }
    // Generate a real seed phrase using BIP39
    generateSeedPhrase() {
        // Generate 128 bits (12 words) of entropy
        const entropy = ethers.randomBytes(16);
        return bip39.entropyToMnemonic(ethers.hexlify(entropy));
    }
    // Validate seed phrase
    validateSeedPhrase(seedPhrase) {
        return bip39.validateMnemonic(seedPhrase);
    }
    // Create a new wallet with real seed phrase generation
    async createWallet(request) {
        try {
            // Generate real seed phrase
            const seedPhrase = this.generateSeedPhrase();
            // Encrypt seed phrase
            const encryptedSeedPhrase = await encryptData(seedPhrase, request.password);
            // Derive wallet accounts
            const accounts = await this.deriveAccounts(seedPhrase, request.network, request.accountCount || 1);
            // Get the first account for the main wallet properties
            const firstAccount = accounts[0];
            const wallet = {
                id: Date.now().toString(),
                name: request.name,
                address: firstAccount.address,
                seedPhrase: seedPhrase,
                privateKey: firstAccount.privateKey,
                publicKey: firstAccount.publicKey,
                network: request.network,
                currentNetwork: request.network,
                derivationPath: firstAccount.derivationPath,
                createdAt: Date.now(),
                encryptedSeedPhrase: encryptedSeedPhrase,
                accounts: accounts,
                lastAccessed: Date.now()
            };
            this.wallets.push(wallet);
            await this.saveWallets();
            return wallet;
        }
        catch (error) {
            console.error('Failed to create wallet:', error);
            throw error;
        }
    }
    // Import wallet from seed phrase
    async importWallet(request) {
        try {
            // Validate seed phrase
            if (!this.validateSeedPhrase(request.seedPhrase)) {
                throw new Error('Invalid seed phrase');
            }
            // Encrypt seed phrase
            const encryptedSeedPhrase = await encryptData(request.seedPhrase, request.password);
            // Derive wallet accounts
            const accounts = await this.deriveAccounts(request.seedPhrase, request.network, request.accountCount || 1);
            // Get the first account for the main wallet properties
            const firstAccount = accounts[0];
            const wallet = {
                id: Date.now().toString(),
                name: request.name,
                address: firstAccount.address,
                seedPhrase: request.seedPhrase,
                privateKey: firstAccount.privateKey,
                publicKey: firstAccount.publicKey,
                network: request.network,
                currentNetwork: request.network,
                derivationPath: firstAccount.derivationPath,
                createdAt: Date.now(),
                encryptedSeedPhrase: encryptedSeedPhrase,
                accounts: accounts,
                lastAccessed: Date.now()
            };
            this.wallets.push(wallet);
            await this.saveWallets();
            return wallet;
        }
        catch (error) {
            console.error('Failed to import wallet:', error);
            throw error;
        }
    }
    // Derive accounts from seed phrase
    async deriveAccounts(seedPhrase, network, count) {
        const accounts = [];
        for (let i = 0; i < count; i++) {
            try {
                const derivationPath = `m/44'/60'/0'/0/${i}`; // BIP44 path for Ethereum
                const walletData = await deriveWalletFromSeed(seedPhrase, derivationPath);
                const account = {
                    id: `${Date.now()}-${i}`,
                    address: walletData.address,
                    privateKey: walletData.privateKey,
                    publicKey: walletData.publicKey,
                    derivationPath: derivationPath,
                    network: network,
                    balance: '0',
                    nonce: 0,
                    createdAt: Date.now()
                };
                accounts.push(account);
            }
            catch (error) {
                console.error(`Failed to derive account ${i}:`, error);
            }
        }
        return accounts;
    }
    // Get wallet by ID
    getWallet(id) {
        return this.wallets.find(wallet => wallet.id === id);
    }
    // Get all wallets
    getAllWallets() {
        return this.wallets;
    }
    // Get wallet by name
    getWalletByName(name) {
        return this.wallets.find(wallet => wallet.name === name);
    }
    // Get wallet accounts
    getWalletAccounts(walletId) {
        const wallet = this.getWallet(walletId);
        return wallet ? wallet.accounts : [];
    }
    // Get account by address
    getAccountByAddress(address) {
        for (const wallet of this.wallets) {
            const account = wallet.accounts.find(acc => acc.address.toLowerCase() === address.toLowerCase());
            if (account)
                return account;
        }
        return undefined;
    }
    // Add new account to wallet
    async addAccount(walletId, password) {
        const wallet = this.getWallet(walletId);
        if (!wallet) {
            throw new Error('Wallet not found');
        }
        // Decrypt seed phrase
        const seedPhrase = await decryptData(wallet.encryptedSeedPhrase, password);
        if (!seedPhrase) {
            throw new Error('Invalid password');
        }
        // Derive new account
        const newAccountIndex = wallet.accounts.length;
        const derivationPath = `m/44'/60'/0'/0/${newAccountIndex}`;
        const walletData = await deriveWalletFromSeed(seedPhrase, derivationPath);
        const newAccount = {
            id: `${Date.now()}-${newAccountIndex}`,
            address: walletData.address,
            privateKey: walletData.privateKey,
            publicKey: walletData.publicKey,
            derivationPath: derivationPath,
            network: wallet.network,
            balance: '0',
            nonce: 0,
            createdAt: Date.now()
        };
        wallet.accounts.push(newAccount);
        wallet.lastAccessed = Date.now();
        await this.saveWallets();
        return newAccount;
    }
    // Update account balance
    async updateAccountBalance(address, balance) {
        const account = this.getAccountByAddress(address);
        if (account) {
            account.balance = balance;
            await this.saveWallets();
        }
    }
    // Update account nonce
    async updateAccountNonce(address, nonce) {
        const account = this.getAccountByAddress(address);
        if (account) {
            account.nonce = nonce;
            await this.saveWallets();
        }
    }
    // Export wallet (returns decrypted seed phrase)
    async exportWallet(walletId, password) {
        const wallet = this.getWallet(walletId);
        if (!wallet) {
            throw new Error('Wallet not found');
        }
        const seedPhrase = await decryptData(wallet.encryptedSeedPhrase, password);
        if (!seedPhrase) {
            throw new Error('Invalid password');
        }
        return seedPhrase;
    }
    // Change wallet password
    async changePassword(walletId, oldPassword, newPassword) {
        const wallet = this.getWallet(walletId);
        if (!wallet) {
            throw new Error('Wallet not found');
        }
        // Decrypt with old password
        const seedPhrase = await decryptData(wallet.encryptedSeedPhrase, oldPassword);
        if (!seedPhrase) {
            throw new Error('Invalid old password');
        }
        // Encrypt with new password
        const newEncryptedSeedPhrase = await encryptData(seedPhrase, newPassword);
        wallet.encryptedSeedPhrase = newEncryptedSeedPhrase;
        wallet.lastAccessed = Date.now();
        await this.saveWallets();
    }
    // Delete wallet
    async deleteWallet(walletId) {
        const index = this.wallets.findIndex(wallet => wallet.id === walletId);
        if (index !== -1) {
            this.wallets.splice(index, 1);
            await this.saveWallets();
        }
    }
    // Get wallet statistics
    getWalletStats() {
        const totalWallets = this.wallets.length;
        const totalAccounts = this.wallets.reduce((sum, wallet) => sum + wallet.accounts.length, 0);
        const totalBalance = this.wallets.reduce((sum, wallet) => {
            return sum + wallet.accounts.reduce((accSum, account) => accSum + parseFloat(account.balance), 0);
        }, 0).toString();
        const networks = Array.from(new Set(this.wallets.map(wallet => wallet.network)));
        return {
            totalWallets,
            totalAccounts,
            totalBalance,
            networks
        };
    }
    // Validate wallet password
    async validatePassword(walletId, password) {
        const wallet = this.getWallet(walletId);
        if (!wallet) {
            return false;
        }
        try {
            const seedPhrase = await decryptData(wallet.encryptedSeedPhrase, password);
            return !!seedPhrase;
        }
        catch (error) {
            return false;
        }
    }
    // Get wallet by address
    getWalletByAddress(address) {
        return this.wallets.find(wallet => wallet.accounts.some(account => account.address.toLowerCase() === address.toLowerCase()));
    }
    // Backup wallet data
    async backupWallet(walletId, password) {
        const wallet = this.getWallet(walletId);
        if (!wallet) {
            throw new Error('Wallet not found');
        }
        const seedPhrase = await decryptData(wallet.encryptedSeedPhrase, password);
        if (!seedPhrase) {
            throw new Error('Invalid password');
        }
        const backupData = {
            name: wallet.name,
            seedPhrase: seedPhrase,
            network: wallet.network,
            createdAt: wallet.createdAt,
            accounts: wallet.accounts.map(account => ({
                address: account.address,
                derivationPath: account.derivationPath
            }))
        };
        return JSON.stringify(backupData, null, 2);
    }
    // Restore wallet from backup
    async restoreWallet(backupData, password) {
        try {
            const data = JSON.parse(backupData);
            const request = {
                name: data.name,
                seedPhrase: data.seedPhrase,
                password: password,
                network: data.network,
                accountCount: data.accounts?.length || 1
            };
            return await this.importWallet(request);
        }
        catch (error) {
            console.error('Failed to restore wallet:', error);
            throw new Error('Invalid backup data');
        }
    }
    // Get current wallet (first wallet or specified wallet)
    getCurrentWallet() {
        if (this.wallets.length === 0) {
            return null;
        }
        // Return the most recently accessed wallet
        const sortedWallets = [...this.wallets].sort((a, b) => b.lastAccessed - a.lastAccessed);
        return sortedWallets[0];
    }
    // Get current wallet in the format expected by background script
    getCurrentWalletForBackground() {
        if (this.wallets.length === 0)
            return null;
        const currentWallet = this.wallets[0]; // For now, use the first wallet
        if (!currentWallet.accounts || currentWallet.accounts.length === 0)
            return null;
        return {
            address: currentWallet.accounts[0].address,
            currentNetwork: currentWallet.network
        };
    }
    // Get current account (first account of current wallet)
    getCurrentAccount() {
        const currentWallet = this.getCurrentWallet();
        if (!currentWallet || currentWallet.accounts.length === 0) {
            return null;
        }
        return currentWallet.accounts[0];
    }
    // Get balance for an account
    async getBalance(address, network) {
        try {
            const account = this.getAccountByAddress(address);
            if (!account) {
                throw new Error('Account not found');
            }
            // Import the getRealBalance function
            const { getRealBalance } = await import('../utils/web3-utils');
            const balance = await getRealBalance(address, network);
            // Update account balance
            await this.updateAccountBalance(address, balance);
            return balance;
        }
        catch (error) {
            console.error('Error getting balance:', error);
            return '0';
        }
    }
    // Switch network for current wallet
    async switchNetwork(networkId) {
        const currentWallet = this.getCurrentWallet();
        if (!currentWallet) {
            throw new Error('No wallet available');
        }
        currentWallet.network = networkId;
        currentWallet.lastAccessed = Date.now();
        await this.saveWallets();
    }
    // Get all accounts from all wallets
    getAllAccounts() {
        return this.wallets.flatMap(wallet => wallet.accounts);
    }
    // Get accounts for a specific network
    getAccountsByNetwork(network) {
        return this.getAllAccounts().filter(account => account.network === network);
    }
}
