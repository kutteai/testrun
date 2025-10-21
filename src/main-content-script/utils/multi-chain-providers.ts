import { ToastManager } from './toast-manager';
import { WalletConnectManager } from './wallet-connect-integration';

declare global {
  interface Window {
    paycioProvider: any; // Assuming PaycioEthereumProvider is set here
  }
}

export const createMultiChainProvider = (toast: ToastManager, walletConnect: WalletConnectManager) => ({
  // Bitcoin provider with advanced features
  bitcoin: {
    isConnected: false,
    address: null,
    network: 'mainnet',

    async connect(options = {}) {
      try {
        toast.show('Connecting to Bitcoin wallet...', 'info');

        const response = await window.paycioProvider.sendToContentScript('BITCOIN_CONNECT', options);

        if (response && response.success) {
          this.isConnected = true;
          this.address = response.data.address;
          this.network = response.data.network || 'mainnet';

          toast.show('Bitcoin wallet connected', 'success');
          return response.data;
        }

        throw new Error(response?.error || 'Bitcoin connection failed');
      } catch (error: any) {
        toast.show(`Bitcoin connection failed: ${error.message}`, 'error');
        throw error;
      }
    },

    async disconnect() {
      this.isConnected = false;
      this.address = null;
      toast.show('Bitcoin wallet disconnected', 'info');
    },

    async getBalance(address = null) {
      const targetAddress = address || this.address;
      if (!targetAddress) throw new Error('No address provided');

      const response = await window.paycioProvider.sendToContentScript('BITCOIN_GET_BALANCE', { address: targetAddress });
      return response?.success ? response.data.balance : '0';
    },

    async getUtxos(address = null) {
      const targetAddress = address || this.address;
      if (!targetAddress) throw new Error('No address provided');

      const response = await window.paycioProvider.sendToContentScript('BITCOIN_GET_UTXOS', { address: targetAddress });
      return response?.success ? response.data.utxos : [];
    },

    async signTransaction(tx: any) {
      if (!this.isConnected) throw new Error('Bitcoin wallet not connected');

      toast.show('Bitcoin transaction signature required', 'info');

      const response = await window.paycioProvider.sendToContentScript('BITCOIN_SIGN_TRANSACTION', { transaction: tx });

      if (response?.success) {
        toast.show('Bitcoin transaction signed', 'success');
        return response.data.signedTransaction;
      }

      throw new Error(response?.error || 'Bitcoin signing failed');
    },

    async sendTransaction(tx: any) {
      if (!this.isConnected) throw new Error('Bitcoin wallet not connected');

      const response = await window.paycioProvider.sendToContentScript('BITCOIN_SEND_TRANSACTION', { transaction: tx });

      if (response?.success) {
        toast.show('Bitcoin transaction sent', 'success');
        return response.data.txHash;
      }

      throw new Error(response?.error || 'Bitcoin transaction failed');
    },

    async signMessage(message: string) {
      if (!this.isConnected) throw new Error('Bitcoin wallet not connected');

      const response = await window.paycioProvider.sendToContentScript('BITCOIN_SIGN_MESSAGE', { message });
      return response?.success ? response.data.signature : Promise.reject(new Error(response?.error || 'Bitcoin message signing failed'));
    },
  },

  // Solana provider with advanced features
  solana: {
    publicKey: null,
    isConnected: false,
    cluster: 'mainnet-beta',

    async connect(options = {}) {
      try {
        toast.show('Connecting to Solana wallet...', 'info');

        const response = await window.paycioProvider.sendToContentScript('SOLANA_CONNECT', options);

        if (response && response.success) {
          this.publicKey = response.data.publicKey;
          this.isConnected = true;
          this.cluster = response.data.cluster || 'mainnet-beta';

          toast.show('Solana wallet connected', 'success');
          return response.data;
        }

        throw new Error(response?.error || 'Solana connection failed');
      } catch (error: any) {
        toast.show(`Solana connection failed: ${error.message}`, 'error');
        throw error;
      }
    },

    async disconnect() {
      this.publicKey = null;
      this.isConnected = false;
      toast.show('Solana wallet disconnected', 'info');
    },

    async getBalance() {
      if (!this.isConnected || !this.publicKey) throw new Error('Solana wallet not connected');

      const response = await window.paycioProvider.sendToContentScript('SOLANA_GET_BALANCE', { publicKey: this.publicKey });
      return response?.success ? response.data.balance : 0;
    },

    async signTransaction(tx: any) {
      if (!this.isConnected) throw new Error('Solana wallet not connected');

      toast.show('Solana transaction signature required', 'info');

      const response = await window.paycioProvider.sendToContentScript('SOLANA_SIGN_TRANSACTION', { transaction: tx });

      if (response?.success) {
        toast.show('Solana transaction signed', 'success');
        return response.data.signedTransaction;
      }

      throw new Error(response?.error || 'Solana signing failed');
    },

    async signAndSendTransaction(tx: any) {
      if (!this.isConnected) throw new Error('Solana wallet not connected');

      const response = await window.paycioProvider.sendToContentScript('SOLANA_SEND_TRANSACTION', { transaction: tx });

      if (response?.success) {
        toast.show('Solana transaction sent', 'success');
        return { signature: response.data.signature };
      }

      throw new Error(response?.error || 'Solana transaction failed');
    },

    async signMessage(message: string | Uint8Array) {
      if (!this.isConnected) throw new Error('Solana wallet not connected');

      const messageArray = message instanceof Uint8Array ? Array.from(message) : message;
      const response = await window.paycioProvider.sendToContentScript('SOLANA_SIGN_MESSAGE', { message: messageArray });

      if (response?.success) {
        return new Uint8Array(response.data.signature);
      }

      throw new Error(response?.error || 'Solana message signing failed');
    },

    async signAllTransactions(txs: any[]) {
      if (!this.isConnected) throw new Error('Solana wallet not connected');

      const promises = txs.map((tx) => this.signTransaction(tx));
      return await Promise.all(promises);
    },
  },

  // TRON provider
  tron: {
    isConnected: false,
    address: null,

    async connect() {
      toast.show('Connecting to TRON wallet...', 'info');

      const response = await window.paycioProvider.sendToContentScript('TRON_CONNECT');

      if (response && response.success) {
        this.isConnected = true;
        this.address = response.data.address;
        toast.show('TRON wallet connected', 'success');
        return response.data;
      }

      throw new Error(response?.error || 'TRON connection failed');
    },

    async disconnect() {
      this.isConnected = false;
      this.address = null;
      toast.show('TRON wallet disconnected', 'info');
    },

    async signTransaction(tx: any) {
      if (!this.isConnected) throw new Error('TRON wallet not connected');

      const response = await window.paycioProvider.sendToContentScript('TRON_SIGN_TRANSACTION', { transaction: tx });
      return response?.success ? response.data.signedTransaction : Promise.reject(new Error(response?.error || 'TRON signing failed'));
    },
  },

  // TON provider
  ton: {
    isConnected: false,
    address: null,

    async connect() {
      toast.show('Connecting to TON wallet...', 'info');

      const response = await window.paycioProvider.sendToContentScript('TON_CONNECT');

      if (response && response.success) {
        this.isConnected = true;
        this.address = response.data.address;
        toast.show('TON wallet connected', 'success');
        return response.data;
      }

      throw new Error(response?.error || 'TON connection failed');
    },

    async disconnect() {
      this.isConnected = false;
      this.address = null;
      toast.show('TON wallet disconnected', 'info');
    },

    async signTransaction(tx: any) {
      if (!this.isConnected) throw new Error('TON wallet not connected');

      const response = await window.paycioProvider.sendToContentScript('TON_SIGN_TRANSACTION', { transaction: tx });
      return response?.success ? response.data.signedTransaction : Promise.reject(new Error(response?.error || 'TON signing failed'));
    },
  },
});
