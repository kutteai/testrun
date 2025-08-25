// PayCio Wallet Injected Script
// This script is injected into web pages to provide wallet functionality
class PayCioWalletInjected {
    constructor() {
        this.isConnected = false;
        this.selectedAddress = null;
        this.chainId = null;
        this.listeners = new Map();
        this.pendingRequests = new Map();
        this.provider = this.createProvider();
        this.injectProvider();
        this.setupMessageListener();
    }
    createProvider() {
        const provider = {
            isPayCioWallet: true,
            version: '1.0.0',
            networkVersion: '1',
            autoRefreshOnNetworkChange: false,
            selectedAddress: undefined,
            isConnected: false,
            chainId: undefined,
            request: async (args) => {
                return this.handleRequest(args);
            },
            send: (payload, callback) => {
                this.handleSend(payload, callback);
            },
            sendAsync: (payload, callback) => {
                this.handleSend(payload, callback);
            },
            enable: async () => {
                const result = await this.handleRequest({ method: 'eth_requestAccounts' });
                return result;
            },
            on: (eventName, handler) => {
                this.addEventListener(eventName, handler);
            },
            removeListener: (eventName, handler) => {
                this.removeEventListener(eventName, handler);
            }
        };
        return provider;
    }
    async handleRequest(args) {
        try {
            const response = await this.sendMessageToExtension({
                type: 'WALLET_REQUEST',
                method: args.method,
                params: args.params || []
            });
            if (response.error) {
                throw new Error(response.error);
            }
            return response.result;
        }
        catch (error) {
            console.error('PayCio Wallet request failed:', error);
            throw error;
        }
    }
    handleSend(payload, callback) {
        this.handleRequest(payload)
            .then((result) => {
            if (callback) {
                callback(null, { id: payload.id, jsonrpc: '2.0', result });
            }
        })
            .catch((error) => {
            if (callback) {
                callback(error, { id: payload.id, jsonrpc: '2.0', error: { message: error.message } });
            }
        });
    }
    sendMessageToExtension(message) {
        return new Promise((resolve, reject) => {
            const messageId = Date.now() + Math.random();
            // Store the callback
            this.pendingRequests.set(messageId, { resolve, reject });
            // Send message to content script
            window.postMessage({
                source: 'paycio-wallet-injected',
                id: messageId,
                ...message
            }, '*');
            // Timeout after 30 seconds
            setTimeout(() => {
                if (this.pendingRequests.has(messageId)) {
                    this.pendingRequests.delete(messageId);
                    reject(new Error('Request timeout'));
                }
            }, 30000);
        });
    }
    setupMessageListener() {
        window.addEventListener('message', (event) => {
            if (event.source !== window || event.data.source !== 'paycio-wallet-content') {
                return;
            }
            const { id, result, error } = event.data;
            if (this.pendingRequests.has(id)) {
                const { resolve, reject } = this.pendingRequests.get(id);
                this.pendingRequests.delete(id);
                if (error) {
                    reject(new Error(error));
                }
                else {
                    resolve(result);
                }
            }
            // Handle wallet state updates
            if (event.data.type === 'WALLET_STATE_UPDATE') {
                this.updateWalletState(event.data.state);
            }
        });
    }
    updateWalletState(state) {
        if (state.selectedAddress !== this.selectedAddress) {
            this.selectedAddress = state.selectedAddress;
            this.provider.selectedAddress = state.selectedAddress;
            this.emit('accountsChanged', [state.selectedAddress]);
        }
        if (state.chainId !== this.chainId) {
            this.chainId = state.chainId;
            this.provider.chainId = state.chainId;
            this.emit('chainChanged', state.chainId);
        }
        if (state.isConnected !== this.isConnected) {
            this.isConnected = state.isConnected;
            this.provider.isConnected = state.isConnected;
            this.emit('connect', { chainId: state.chainId });
        }
    }
    addEventListener(eventName, handler) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }
        this.listeners.get(eventName).add(handler);
    }
    removeEventListener(eventName, handler) {
        const handlers = this.listeners.get(eventName);
        if (handlers) {
            handlers.delete(handler);
        }
    }
    emit(eventName, data) {
        const handlers = this.listeners.get(eventName);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data);
                }
                catch (error) {
                    console.error('Error in event handler:', error);
                }
            });
        }
    }
    injectProvider() {
        // Inject into window.ethereum
        if (!window.ethereum) {
            Object.defineProperty(window, 'ethereum', {
                value: this.provider,
                writable: false,
                configurable: false
            });
        }
        // Inject into window.web3
        if (typeof window.web3 !== 'undefined') {
            window.web3.currentProvider = this.provider;
        }
        // Notify that PayCio Wallet is available
        window.dispatchEvent(new CustomEvent('paycio-wallet-ready', {
            detail: { provider: this.provider }
        }));
        console.log('PayCio Wallet injected successfully');
    }
}
// Initialize the injected wallet
new PayCioWalletInjected();
// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PayCioWalletInjected;
}
