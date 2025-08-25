import { ethers } from 'ethers';
import { getGasPrice, estimateGas, sendRawTransaction, getTransactionReceipt } from './web3-utils';
export class TransactionManager {
    constructor() {
        this.transactions = new Map();
        this.providers = new Map();
    }
    // Get or create provider for network
    getProvider(network) {
        if (!this.providers.has(network)) {
            const rpcUrl = this.getRpcUrl(network);
            const provider = new ethers.JsonRpcProvider(rpcUrl);
            this.providers.set(network, provider);
        }
        return this.providers.get(network);
    }
    // Send transaction with real implementation
    async sendTransaction(fromAddress, toAddress, value, data = '0x', network, privateKey, options = {}) {
        try {
            const provider = this.getProvider(network);
            const wallet = new ethers.Wallet(privateKey, provider);
            // Get current nonce if not provided
            const nonce = options.nonce ?? await wallet.getNonce();
            // Get gas estimates
            const gasEstimates = await this.getGasEstimates(network, fromAddress, toAddress, value, data);
            // Prepare transaction
            const tx = {
                to: toAddress,
                value: value,
                data: data,
                nonce: nonce,
                chainId: options.chainId || this.getChainId(network)
            };
            // Set gas parameters
            if (options.maxFeePerGas && options.maxPriorityFeePerGas) {
                // EIP-1559 transaction
                tx.maxFeePerGas = options.maxFeePerGas;
                tx.maxPriorityFeePerGas = options.maxPriorityFeePerGas;
            }
            else {
                // Legacy transaction
                tx.gasPrice = options.gasPrice || gasEstimates.standard.gasPrice;
            }
            // Set gas limit
            tx.gasLimit = options.gasLimit || await estimateGas(fromAddress, toAddress, value, data, network);
            // Sign and send transaction
            const signedTx = await wallet.signTransaction(tx);
            const txHash = await sendRawTransaction(signedTx, network);
            // Create transaction object
            const transaction = {
                id: `${network}-${txHash}`,
                hash: txHash,
                from: fromAddress,
                to: toAddress,
                value: value,
                data: data,
                gasLimit: tx.gasLimit.toString(),
                gasPrice: tx.gasPrice?.toString() || '0',
                nonce: nonce,
                network: network,
                status: 'pending',
                confirmations: 0,
                timestamp: Date.now()
            };
            // Store transaction
            this.transactions.set(transaction.id, transaction);
            // Start monitoring
            this.monitorTransaction(transaction);
            return transaction;
        }
        catch (error) {
            throw new Error(`Transaction failed: ${error}`);
        }
    }
    // Get gas estimates for different speeds
    async getGasEstimates(network, fromAddress, toAddress, value, data = '0x') {
        try {
            // Get current gas price
            const currentGasPrice = await getGasPrice(network);
            const gasPriceBigInt = BigInt(currentGasPrice);
            // Estimate gas limit
            const gasLimit = await estimateGas(fromAddress, toAddress, value, data, network);
            const gasLimitBigInt = BigInt(gasLimit);
            // Calculate different gas price tiers
            const slowGasPrice = gasPriceBigInt * 80n / 100n; // 80% of current
            const standardGasPrice = gasPriceBigInt;
            const fastGasPrice = gasPriceBigInt * 120n / 100n; // 120% of current
            // For EIP-1559 networks, calculate maxFeePerGas and maxPriorityFeePerGas
            const baseFee = await this.getBaseFee(network);
            const maxPriorityFeePerGas = gasPriceBigInt - baseFee;
            return {
                slow: {
                    gasPrice: slowGasPrice.toString(),
                    maxFeePerGas: baseFee > 0 ? (slowGasPrice + maxPriorityFeePerGas).toString() : undefined,
                    maxPriorityFeePerGas: baseFee > 0 ? maxPriorityFeePerGas.toString() : undefined,
                    estimatedCost: (slowGasPrice * gasLimitBigInt).toString()
                },
                standard: {
                    gasPrice: standardGasPrice.toString(),
                    maxFeePerGas: baseFee > 0 ? (standardGasPrice + maxPriorityFeePerGas).toString() : undefined,
                    maxPriorityFeePerGas: baseFee > 0 ? maxPriorityFeePerGas.toString() : undefined,
                    estimatedCost: (standardGasPrice * gasLimitBigInt).toString()
                },
                fast: {
                    gasPrice: fastGasPrice.toString(),
                    maxFeePerGas: baseFee > 0 ? (fastGasPrice + maxPriorityFeePerGas).toString() : undefined,
                    maxPriorityFeePerGas: baseFee > 0 ? maxPriorityFeePerGas.toString() : undefined,
                    estimatedCost: (fastGasPrice * gasLimitBigInt).toString()
                }
            };
        }
        catch (error) {
            throw new Error(`Failed to get gas estimates: ${error}`);
        }
    }
    // Monitor transaction status
    async monitorTransaction(transaction) {
        const checkStatus = async () => {
            try {
                const receipt = await getTransactionReceipt(transaction.hash, transaction.network);
                if (receipt) {
                    transaction.status = receipt.status ? 'confirmed' : 'failed';
                    transaction.blockNumber = parseInt(receipt.hash, 16);
                    transaction.confirmations = 1; // Simplified
                    if (transaction.status === 'failed') {
                        transaction.error = 'Transaction reverted';
                    }
                }
            }
            catch (error) {
                console.warn(`Failed to check transaction status: ${error}`);
            }
        };
        // Check immediately
        await checkStatus();
        // Check every 10 seconds for 5 minutes
        const interval = setInterval(async () => {
            await checkStatus();
            if (transaction.status !== 'pending') {
                clearInterval(interval);
            }
        }, 10000);
        // Stop monitoring after 5 minutes
        setTimeout(() => {
            clearInterval(interval);
            if (transaction.status === 'pending') {
                transaction.status = 'failed';
                transaction.error = 'Transaction timeout';
            }
        }, 300000);
    }
    // Get transaction by ID
    getTransaction(id) {
        return this.transactions.get(id);
    }
    // Get all transactions
    getAllTransactions() {
        return Array.from(this.transactions.values());
    }
    // Get transactions by address
    getTransactionsByAddress(address) {
        return this.getAllTransactions().filter(tx => tx.from.toLowerCase() === address.toLowerCase() ||
            tx.to.toLowerCase() === address.toLowerCase());
    }
    // Get transactions by network
    getTransactionsByNetwork(network) {
        return this.getAllTransactions().filter(tx => tx.network === network);
    }
    // Get pending transactions
    getPendingTransactions() {
        return this.getAllTransactions().filter(tx => tx.status === 'pending');
    }
    // Cancel transaction (replace with higher gas price)
    async cancelTransaction(transactionId, privateKey, newGasPrice) {
        const originalTx = this.transactions.get(transactionId);
        if (!originalTx || originalTx.status !== 'pending') {
            throw new Error('Transaction not found or not pending');
        }
        // Create cancel transaction (send to self with 0 value)
        const cancelTx = await this.sendTransaction(originalTx.from, originalTx.from, '0x0', '0x', originalTx.network, privateKey, {
            nonce: originalTx.nonce,
            gasPrice: newGasPrice
        });
        // Mark original transaction as replaced
        originalTx.status = 'replaced';
        originalTx.error = 'Replaced by user';
        return cancelTx;
    }
    // Speed up transaction (replace with higher gas price)
    async speedUpTransaction(transactionId, privateKey, newGasPrice) {
        const originalTx = this.transactions.get(transactionId);
        if (!originalTx || originalTx.status !== 'pending') {
            throw new Error('Transaction not found or not pending');
        }
        // Create replacement transaction with same parameters but higher gas price
        const speedUpTx = await this.sendTransaction(originalTx.from, originalTx.to, originalTx.value, originalTx.data, originalTx.network, privateKey, {
            nonce: originalTx.nonce,
            gasPrice: newGasPrice
        });
        // Mark original transaction as replaced
        originalTx.status = 'replaced';
        originalTx.error = 'Replaced by user';
        return speedUpTx;
    }
    // Get base fee for EIP-1559
    async getBaseFee(network) {
        try {
            const provider = this.getProvider(network);
            const block = await provider.getBlock('latest');
            return block?.baseFeePerGas || 0n;
        }
        catch {
            return 0n; // Fallback to legacy gas pricing
        }
    }
    // Get RPC URL for network
    getRpcUrl(network) {
        const urls = {
            ethereum: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
            polygon: 'https://polygon-rpc.com',
            bsc: 'https://bsc-dataseed.binance.org',
            avalanche: 'https://api.avax.network/ext/bc/C/rpc',
            arbitrum: 'https://arb1.arbitrum.io/rpc',
            optimism: 'https://mainnet.optimism.io'
        };
        return urls[network] || urls.ethereum;
    }
    // Get chain ID for network
    getChainId(network) {
        const chainIds = {
            ethereum: 1,
            polygon: 137,
            bsc: 56,
            avalanche: 43114,
            arbitrum: 42161,
            optimism: 10
        };
        return chainIds[network] || 1;
    }
    // Clear old transactions (older than 24 hours)
    clearOldTransactions() {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        for (const [id, transaction] of this.transactions.entries()) {
            if (transaction.timestamp < oneDayAgo && transaction.status !== 'pending') {
                this.transactions.delete(id);
            }
        }
    }
}
// Export singleton instance
export const transactionManager = new TransactionManager();
