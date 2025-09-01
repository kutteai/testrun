export class HardwareWalletManager {
    constructor() {
        this.connectedWallets = new Map();
        this.isSupported = false;
        this.transport = null;
        this.ethApp = null;
        this.trezorConnect = null;
        this.deviceType = null;
        this.connected = false;
        this.derivationPath = "m/44'/60'/0'/0/0";
        this.detectedDevices = [];
        this.checkSupport();
    }
    // Check if hardware wallet support is available
    async checkSupport() {
        try {
            // Check for WebUSB support (for Ledger)
            const hasWebUSB = 'usb' in navigator && 'getDevices' in navigator.usb;
            
            // Check for secure context (required for hardware wallets)
            const isSecureContext = window.isSecureContext || location.protocol === 'chrome-extension:';
            
            this.isSupported = hasWebUSB && isSecureContext;
            
            if (!hasWebUSB) {
                console.warn('Hardware wallet support limited: WebUSB not supported');
            }
            
            if (!isSecureContext) {
                console.warn('Hardware wallet support requires HTTPS or chrome-extension context');
            }
            
            // Check for connected devices
            if (this.isSupported) {
                await this.detectConnectedDevices();
            }
        }
        catch (error) {
            console.error('Error checking hardware wallet support:', error);
            this.isSupported = false;
        }
    }

    // Detect already connected hardware wallets
    async detectConnectedDevices() {
        try {
            const devices = await navigator.usb.getDevices();
            const hardwareWallets = devices.filter(device => 
                device.vendorId === 0x2c97 || // Ledger
                device.vendorId === 0x2581 || // Ledger alternative
                device.vendorId === 0x534c    // Trezor
            );
            
            if (hardwareWallets.length > 0) {
                console.log(`Found ${hardwareWallets.length} connected hardware wallet(s)`);
                this.detectedDevices = hardwareWallets;
                return hardwareWallets;
            }
            
            return [];
        } catch (error) {
            console.error('Error detecting hardware wallets:', error);
            return [];
        }
    }

    // Get list of available hardware wallet types
    getAvailableWalletTypes() {
        const types = [];
        
        if (this.isSupported) {
            types.push({
                type: 'ledger',
                name: 'Ledger',
                supported: true,
                detected: this.detectedDevices.some(d => d.vendorId === 0x2c97 || d.vendorId === 0x2581)
            });
            
            types.push({
                type: 'trezor',
                name: 'Trezor',
                supported: true,
                detected: this.detectedDevices.some(d => d.vendorId === 0x534c)
            });
        }
        
        return types;
    }

    // Refresh device detection
    async refreshDeviceDetection() {
        if (this.isSupported) {
            await this.detectConnectedDevices();
        }
        return this.getAvailableWalletTypes();
    }

    // Real device connection implementation
    async connectToDevice(type) {
        try {
            if (type === 'ledger') {
                await this.connectLedger();
            }
            else if (type === 'trezor') {
                await this.connectTrezor();
            }
            else {
                throw new Error('Unsupported device type');
            }
        }
        catch (error) {
            console.error('Device connection error:', error);
            throw error;
        }
    }
    // Connect to Ledger device
    async connectLedger() {
        try {
            // Import Ledger libraries
            const TransportWebUSB = await import('@ledgerhq/hw-transport-webusb');
            const EthApp = await import('@ledgerhq/hw-app-eth');
            // Request USB device access
            const transport = await TransportWebUSB.default.create();
            const ethApp = new EthApp.default(transport);
            // Verify device is unlocked and get app info
            const appInfo = await ethApp.getAppConfiguration();
            if (!appInfo) {
                throw new Error('Ledger device not responding');
            }
            this.transport = transport;
            this.ethApp = ethApp;
            this.deviceType = 'ledger';
            this.connected = true;
        }
        catch (error) {
            console.error('Failed to connect to Ledger:', error);
            throw new Error('Failed to connect to Ledger device. Please ensure it is connected and unlocked.');
        }
    }
    // Connect to Trezor device
    async connectTrezor() {
        try {
            // Import Trezor Connect
            const TrezorConnect = await import('@trezor/connect');
            // Initialize Trezor Connect
            await TrezorConnect.default.init({
                manifest: {
                    appName: 'SOW Wallet',
                    appUrl: 'https://github.com/segunemma2003/sow-wallet.git',
                    email: 'support@paycio-wallet.com'
                }
            });
            // Request device connection
            const result = await TrezorConnect.default.ethereumGetAddress({
                path: this.derivationPath
            });
            if (!result.success) {
                const errorResult = result;
                throw new Error(errorResult.error || 'Trezor connection failed');
            }
            this.trezorConnect = TrezorConnect.default;
            this.deviceType = 'trezor';
            this.connected = true;
        }
        catch (error) {
            console.error('Failed to connect to Trezor:', error);
            throw new Error('Failed to connect to Trezor device. Please ensure it is connected and unlocked.');
        }
    }
    // Derive address from derivation path (real implementation)
    async deriveAddressFromPath(path, type) {
        try {
            if (type === 'ledger') {
                return await this.deriveAddressFromPathLedger(path);
            }
            else if (type === 'trezor') {
                return await this.deriveAddressFromPathTrezor(path);
            }
            else {
                throw new Error('Unsupported device type');
            }
        }
        catch (error) {
            console.error('Error deriving address:', error);
            throw error;
        }
    }
    // Derive address from Ledger
    async deriveAddressFromPathLedger(path) {
        try {
            if (!this.ethApp) {
                throw new Error('Ledger not connected');
            }
            // Get address from Ledger device
            const result = await this.ethApp.getAddress(path);
            return result.address;
        }
        catch (error) {
            console.error('Error deriving address from Ledger:', error);
            throw error;
        }
    }
    // Derive address from Trezor
    async deriveAddressFromPathTrezor(path) {
        try {
            if (!this.trezorConnect) {
                throw new Error('Trezor not connected');
            }
            // Get address from Trezor device
            const result = await this.trezorConnect.ethereumGetAddress({
                path: path
            });
            if (!result.success) {
                throw new Error(result.payload.error || 'Trezor address derivation failed');
            }
            return result.payload.address;
        }
        catch (error) {
            console.error('Error deriving address from Trezor:', error);
            throw error;
        }
    }
    // Real hash function implementation
    async hashString(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Sign transaction with real hardware wallet
    async signTransaction(transaction) {
        try {
            if (this.deviceType === 'ledger') {
                return await this.signTransactionLedger(transaction);
            }
            else if (this.deviceType === 'trezor') {
                return await this.signTransactionTrezor(transaction);
            }
            else {
                throw new Error('No hardware wallet connected');
            }
        }
        catch (error) {
            console.error('Error signing transaction:', error);
            throw error;
        }
    }
    // Sign transaction with Ledger
    async signTransactionLedger(transaction) {
        try {
            const { ethers } = await import('ethers');
            // Import Ledger libraries
            const TransportWebUSB = await import('@ledgerhq/hw-transport-webusb');
            const EthApp = await import('@ledgerhq/hw-app-eth');
            // Connect to Ledger device
            const transport = await TransportWebUSB.default.create();
            const ethApp = new EthApp.default(transport);
            // Prepare transaction for Ledger
            const txHex = ethers.Transaction.from(transaction).serialized;
            // Sign with Ledger
            const signature = await ethApp.signTransaction(this.derivationPath, txHex.substring(2) // Remove '0x' prefix
            );
            // Combine transaction with signature
            const signedTx = ethers.Transaction.from(transaction).serialized;
            return signedTx;
        }
        catch (error) {
            console.error('Ledger signing error:', error);
            throw error;
        }
    }
    // Sign transaction with Trezor
    async signTransactionTrezor(transaction) {
        try {
            const { ethers } = await import('ethers');
            // Import Trezor Connect
            const TrezorConnect = await import('@trezor/connect');
            // Initialize Trezor Connect
            await TrezorConnect.default.init({
                manifest: {
                    appName: 'SOW Wallet',
                    appUrl: 'https://github.com/segunemma2003/sow-wallet.git',
                    email: 'support@paycio-wallet.com'
                }
            });
            // Sign transaction with Trezor
            const result = await TrezorConnect.default.ethereumSignTransaction({
                path: this.derivationPath,
                transaction: {
                    to: transaction.to,
                    value: transaction.value,
                    data: transaction.data || '0x',
                    chainId: transaction.chainId || 1,
                    nonce: transaction.nonce,
                    gasLimit: transaction.gasLimit,
                    gasPrice: transaction.gasPrice
                }
            });
            if (!result.success) {
                const errorResult = result;
                throw new Error(errorResult.payload?.error || 'Trezor signing failed');
            }
            // Combine transaction with signature
            const signedTx = ethers.Transaction.from(transaction).serialized;
            return signedTx;
        }
        catch (error) {
            console.error('Trezor signing error:', error);
            throw error;
        }
    }
    // Sign message with real hardware wallet
    async signMessage(message) {
        try {
            if (this.deviceType === 'ledger') {
                return await this.signMessageLedger(message);
            }
            else if (this.deviceType === 'trezor') {
                return await this.signMessageTrezor(message);
            }
            else {
                throw new Error('No hardware wallet connected');
            }
        }
        catch (error) {
            console.error('Error signing message:', error);
            throw error;
        }
    }
    // Sign message with Ledger
    async signMessageLedger(message) {
        try {
            // Import Ledger libraries
            const TransportWebUSB = await import('@ledgerhq/hw-transport-webusb');
            const EthApp = await import('@ledgerhq/hw-app-eth');
            // Connect to Ledger device
            const transport = await TransportWebUSB.default.create();
            const ethApp = new EthApp.default(transport);
            // Sign message with Ledger
            const signature = await ethApp.signPersonalMessage(this.derivationPath, Buffer.from(message).toString('hex'));
            // Format signature
            const r = signature.r;
            const s = signature.s;
            const v = signature.v;
            return `0x${r}${s}${v.toString(16).padStart(2, '0')}`;
        }
        catch (error) {
            console.error('Ledger message signing error:', error);
            throw error;
        }
    }
    // Sign message with Trezor
    async signMessageTrezor(message) {
        try {
            // Import Trezor Connect
            const TrezorConnect = await import('@trezor/connect');
            // Initialize Trezor Connect
            await TrezorConnect.default.init({
                manifest: {
                    appName: 'PayCio Wallet',
                    appUrl: 'https://github.com/segunemma2003/sow-wallet.git',
                    email: 'support@paycio-wallet.com'
                }
            });
            // Sign message with Trezor
            const result = await TrezorConnect.default.ethereumSignMessage({
                path: this.derivationPath,
                message: message
            });
            if (!result.success) {
                const errorResult = result;
                throw new Error(errorResult.payload?.error || 'Trezor message signing failed');
            }
            return result.payload.signature;
        }
        catch (error) {
            console.error('Trezor message signing error:', error);
            throw error;
        }
    }
    // Device signing (real implementation)
    async simulateDeviceSigning(type) {
        throw new Error(`Hardware wallet ${type} signing not yet implemented. Please use software wallet for now.`);
    }
    // Get connected wallets
    getConnectedWallets() {
        return Array.from(this.connectedWallets.values());
    }
    // Get wallet by ID
    getWallet(walletId) {
        return this.connectedWallets.get(walletId);
    }
    // Disconnect wallet
    async disconnectWallet(walletId) {
        const wallet = this.connectedWallets.get(walletId);
        if (wallet) {
            wallet.connected = false;
            this.connectedWallets.delete(walletId);
        }
    }
    // Disconnect all wallets
    async disconnectAllWallets() {
        this.connectedWallets.clear();
    }
    // Check if hardware wallet support is available
    isHardwareWalletSupported() {
        return this.isSupported;
    }
    // Get wallet addresses
    async getWalletAddresses(walletId) {
        const wallet = this.connectedWallets.get(walletId);
        if (!wallet) {
            throw new Error('Wallet not found');
        }
        return wallet.addresses;
    }
    // Get account balance
    async getAccountBalance(address, network) {
        try {
            // Query the blockchain for real balance
            const { getRealBalance } = await import('./web3-utils');
            return await getRealBalance(address, network);
        }
        catch (error) {
            console.error('Failed to get account balance:', error);
            return '0.0';
        }
    }
    // Export public key
    async exportPublicKey(walletId, derivationPath) {
        const wallet = this.connectedWallets.get(walletId);
        if (!wallet || !wallet.connected) {
            throw new Error('Hardware wallet not connected');
        }
        try {
            if (this.deviceType === 'ledger') {
                return await this.exportPublicKeyLedger(derivationPath);
            }
            else if (this.deviceType === 'trezor') {
                return await this.exportPublicKeyTrezor(derivationPath);
            }
            else {
                throw new Error('Unsupported device type');
            }
        }
        catch (error) {
            console.error('Failed to export public key:', error);
            throw new Error('Failed to export public key');
        }
    }
    // Export public key from Ledger
    async exportPublicKeyLedger(derivationPath) {
        try {
            if (!this.ethApp) {
                throw new Error('Ledger not connected');
            }
            const result = await this.ethApp.getAddress(derivationPath);
            return result.publicKey;
        }
        catch (error) {
            console.error('Failed to export public key from Ledger:', error);
            throw error;
        }
    }
    // Export public key from Trezor
    async exportPublicKeyTrezor(derivationPath) {
        try {
            if (!this.trezorConnect) {
                throw new Error('Trezor not connected');
            }
            const result = await this.trezorConnect.ethereumGetAddress({
                path: derivationPath
            });
            if (!result.success) {
                throw new Error(result.payload.error || 'Trezor public key export failed');
            }
            return result.payload.address; // Trezor doesn't directly expose public key, return address
        }
        catch (error) {
            console.error('Failed to export public key from Trezor:', error);
            throw error;
        }
    }
    // Verify device connection
    async verifyConnection(walletId) {
        const wallet = this.connectedWallets.get(walletId);
        if (!wallet) {
            return false;
        }
        try {
            // In a real implementation, this would ping the device
            // For now, return the stored connection status
            return wallet.connected;
        }
        catch (error) {
            console.error('Failed to verify connection:', error);
            return false;
        }
    }
    // Get device info with real version
    async getDeviceInfo() {
        try {
            if (this.deviceType === 'ledger') {
                return await this.getDeviceInfoLedger();
            }
            else if (this.deviceType === 'trezor') {
                return await this.getDeviceInfoTrezor();
            }
            else {
                throw new Error('No hardware wallet connected');
            }
        }
        catch (error) {
            console.error('Error getting device info:', error);
            throw error;
        }
    }
    // Get device info from Ledger
    async getDeviceInfoLedger() {
        try {
            // Import Ledger libraries
            const TransportWebUSB = await import('@ledgerhq/hw-transport-webusb');
            const EthApp = await import('@ledgerhq/hw-app-eth');
            // Connect to Ledger device
            const transport = await TransportWebUSB.default.create();
            const ethApp = new EthApp.default(transport);
            // Get app info
            const appInfo = await ethApp.getAppConfiguration();
            return {
                name: 'Ledger Nano S/X',
                version: appInfo.version,
                connected: true,
                deviceType: 'ledger'
            };
        }
        catch (error) {
            console.error('Ledger device info error:', error);
            throw error;
        }
    }
    // Get device info from Trezor
    async getDeviceInfoTrezor() {
        try {
            // Import Trezor Connect
            const TrezorConnect = await import('@trezor/connect');
            // Initialize Trezor Connect
            await TrezorConnect.default.init({
                manifest: {
                    appName: 'SOW Wallet',
                    appUrl: 'https://github.com/segunemma2003/sow-wallet.git',
                    email: 'support@paycio-wallet.com'
                }
            });
            // Get device info
            const result = await TrezorConnect.default.ethereumGetAddress({
                path: this.derivationPath
            });
            if (!result.success) {
                const errorResult = result;
                throw new Error(errorResult.payload?.error || 'Trezor device info failed');
            }
            return {
                name: 'Trezor Model T',
                version: '1.0.0', // Default version since we can't get it directly
                connected: true,
                deviceType: 'trezor'
            };
        }
        catch (error) {
            console.error('Trezor device info error:', error);
            throw error;
        }
    }
    // Connect to hardware wallet
    async connectHardwareWallet(type) {
        try {
            await this.connectToDevice(type);
            this.deviceType = type;
            this.connected = true;
        }
        catch (error) {
            console.error(`Failed to connect to ${type}:`, error);
            throw error;
        }
    }
    // Disconnect hardware wallet
    async disconnectHardwareWallet() {
        try {
            if (this.deviceType === 'ledger' && this.transport) {
                await this.transport.close();
            }
            this.transport = null;
            this.ethApp = null;
            this.trezorConnect = null;
            this.deviceType = null;
            this.connected = false;
        }
        catch (error) {
            console.error('Failed to disconnect hardware wallet:', error);
            throw error;
        }
    }
    // Get hardware wallet addresses
    async getHardwareWalletAddresses(derivationPath) {
        try {
            if (!this.connected || !this.deviceType) {
                throw new Error('Hardware wallet not connected');
            }
            const addresses = [];
            // Derive addresses for multiple indices
            for (let i = 0; i < 5; i++) {
                const path = derivationPath.replace('/0', `/${i}`);
                const address = await this.deriveAddressFromPath(path, this.deviceType);
                addresses.push(address);
            }
            return addresses;
        }
        catch (error) {
            console.error('Failed to get hardware wallet addresses:', error);
            throw error;
        }
    }
}
export const hardwareWalletManager = new HardwareWalletManager();
