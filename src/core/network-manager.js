import { getBalance, getGasPrice, estimateGas, NETWORKS } from '../utils/web3-utils';
import { storage } from '../utils/storage-utils';
export class NetworkManager {
    constructor() {
        this.currentNetwork = null;
        this.networks = Object.entries(NETWORKS).map(([id, network]) => ({
            ...network,
            id,
            isCustom: false,
            isEnabled: true
        }));
        this.currentNetwork = this.networks[0] || null;
        this.loadNetworks();
    }
    // Load networks from storage
    async loadNetworks() {
        try {
            const result = await storage.get(['networks', 'currentNetwork']);
            if (result.networks) {
                this.networks = result.networks;
            }
            if (result.currentNetwork) {
                this.currentNetwork = result.currentNetwork;
            }
        }
        catch (error) {
            console.error('Error loading networks:', error);
        }
    }
    // Save networks to storage
    async saveNetworks() {
        try {
            await storage.set({
                networks: this.networks,
                currentNetwork: this.currentNetwork
            });
        }
        catch (error) {
            console.error('Error saving networks:', error);
        }
    }
    // Get default networks
    getDefaultNetworks() {
        return Object.entries(NETWORKS).map(([id, network]) => ({
            ...network,
            id,
            isCustom: false,
            isEnabled: true
        }));
    }
    // Get all networks
    getAllNetworks() {
        return this.networks;
    }
    // Get current network
    getCurrentNetwork() {
        return this.currentNetwork;
    }
    // Get network by ID
    getNetworkById(id) {
        return this.networks.find(network => network.id === id);
    }
    // Switch network
    async switchNetwork(networkId) {
        const network = this.getNetworkById(networkId);
        if (!network) {
            throw new Error(`Network ${networkId} not found`);
        }
        if (!network.isEnabled) {
            throw new Error(`Network ${network.name} is disabled`);
        }
        this.currentNetwork = network;
        await this.saveNetworks();
    }
    // Add custom network
    async addCustomNetwork(network) {
        const newNetwork = {
            ...network,
            isCustom: true
        };
        this.networks.push(newNetwork);
        await this.saveNetworks();
    }
    // Remove custom network
    async removeCustomNetwork(networkId) {
        this.networks = this.networks.filter(network => !(network.id === networkId && network.isCustom));
        // If current network was removed, switch to first available network
        if (this.currentNetwork?.id === networkId) {
            this.currentNetwork = this.networks[0] || null;
        }
        await this.saveNetworks();
    }
    // Toggle network
    async toggleNetwork(networkId) {
        const network = this.getNetworkById(networkId);
        if (network) {
            network.isEnabled = !network.isEnabled;
            await this.saveNetworks();
        }
    }
    // Update networks
    async updateNetworks(networks) {
        this.networks = networks;
        await this.saveNetworks();
    }
    // Get balance
    async getBalance(address, network) {
        try {
            return await getBalance(address, network);
        }
        catch (error) {
            console.error('Error getting balance:', error);
            return '0x0';
        }
    }
    // Get gas price
    async getGasPrice(network) {
        try {
            return await getGasPrice(network);
        }
        catch (error) {
            console.error('Error getting gas price:', error);
            return '0x0';
        }
    }
    // Estimate gas
    async estimateGas(transaction, network) {
        try {
            return await estimateGas(transaction.from || '0x0000000000000000000000000000000000000000', transaction.to || '0x0000000000000000000000000000000000000000', transaction.value || '0x0', transaction.data || '0x', network);
        }
        catch (error) {
            console.error('Error estimating gas:', error);
            return '0x5208'; // Default gas limit
        }
    }
    // Test network connection
    async testConnection(network) {
        try {
            const response = await fetch(network.rpcUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_blockNumber',
                    params: [],
                    id: 1
                })
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return !data.error;
        }
        catch (error) {
            console.error(`Connection test failed for ${network.name}:`, error);
            return false;
        }
    }
    // Get supported networks
    getSupportedNetworks() {
        return this.networks
            .filter(network => network.isEnabled)
            .map(network => network.id);
    }
    // Get network info
    getNetworkInfo(networkId) {
        return this.getNetworkById(networkId) || null;
    }
    // Validate network configuration
    validateNetworkConfig(config) {
        const errors = [];
        if (!config.id)
            errors.push('Network ID is required');
        if (!config.name)
            errors.push('Network name is required');
        if (!config.rpcUrl)
            errors.push('RPC URL is required');
        if (!config.chainId)
            errors.push('Chain ID is required');
        if (!config.symbol)
            errors.push('Symbol is required');
        // Validate RPC URL format
        if (config.rpcUrl && !config.rpcUrl.startsWith('http')) {
            errors.push('RPC URL must start with http:// or https://');
        }
        // Validate chain ID format
        if (config.chainId && !/^0x[0-9a-fA-F]+$/.test(config.chainId)) {
            errors.push('Chain ID must be a valid hex string starting with 0x');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
