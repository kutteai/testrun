import { PaycioEthereumProvider } from '../ethereum-provider';
import { ConnectionManager } from '../connection-manager';
import { ToastManager } from '../toast-manager';
import { WalletConnectManager } from '../wallet-connect-integration';

export class ProviderRequestHandler {
  private provider: PaycioEthereumProvider;
  private connectionManager: ConnectionManager;
  private toast: ToastManager;
  private walletConnect: WalletConnectManager;

  constructor(provider: PaycioEthereumProvider, connectionManager: ConnectionManager, toast: ToastManager, walletConnect: WalletConnectManager) {
    this.provider = provider;
    this.connectionManager = connectionManager;
    this.toast = toast;
    this.walletConnect = walletConnect;
  }

  async handleRequest(method: string, params: any): Promise<any> {

    try {
      switch (method) {
        // Account methods
        case 'eth_requestAccounts':
          return await this.requestAccounts();

        case 'eth_accounts':
          return this.provider.getAccounts();

        // Network methods
        case 'eth_chainId':
          return this.provider.chainId;

        case 'net_version':
          return this.provider.networkVersion;

        case 'web3_clientVersion':
          return 'Paycio/1.0.0';

        // Transaction methods
        case 'eth_sendTransaction':
          return await this.sendTransaction(params);

        case 'eth_signTransaction':
          return await this.signTransaction(params);

        case 'eth_sendRawTransaction':
          return await this.sendRawTransaction(params);

        // Signing methods
        case 'personal_sign':
          return await this.personalSign(params);

        case 'eth_sign':
          return await this.ethSign(params);

        case 'eth_signTypedData':
        case 'eth_signTypedData_v1':
        case 'eth_signTypedData_v3':
        case 'eth_signTypedData_v4':
          return await this.signTypedData(method, params);

        // Wallet methods
        case 'wallet_switchEthereumChain':
          return await this.switchChain(params);

        case 'wallet_addEthereumChain':
          return await this.addChain(params);

        case 'wallet_watchAsset':
          return await this.watchAsset(params);

        case 'wallet_requestPermissions':
          return await this.requestPermissions(params);

        case 'wallet_getPermissions':
          return await this.getPermissions();

        // Subscription methods
        case 'eth_subscribe':
          return await this.subscribe(params);

        case 'eth_unsubscribe':
          return await this.unsubscribe(params);

        // Filter methods
        case 'eth_newFilter':
          return await this.newFilter(params);

        case 'eth_newBlockFilter':
          return await this.newBlockFilter();

        case 'eth_newPendingTransactionFilter':
          return await this.newPendingTransactionFilter();

        case 'eth_getFilterChanges':
          return await this.getFilterChanges(params);

        case 'eth_getFilterLogs':
          return await this.getFilterLogs(params);

        case 'eth_uninstallFilter':
          return await this.uninstallFilter(params);

        // RPC proxy methods
        case 'eth_getBalance':
        case 'eth_getTransactionCount':
        case 'eth_getCode':
        case 'eth_getStorageAt':
        case 'eth_gasPrice':
        case 'eth_estimateGas':
        case 'eth_feeHistory':
        case 'eth_maxPriorityFeePerGas':
        case 'eth_blockNumber':
        case 'eth_getBlockByNumber':
        case 'eth_getBlockByHash':
        case 'eth_getTransactionByHash':
        case 'eth_getTransactionReceipt':
        case 'eth_call':
        case 'eth_getLogs':
        case 'eth_getProof':
          return await this.proxyRpcCall(method, params);

        default:
          return await this.proxyRpcCall(method, params);
      }
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error(`Error processing ${method}:`, error);
      if (error.code) {
        throw error;
      }
      throw this.provider.createProviderError(4001, error.message || 'Request failed');
    }
  }

  async requestAccounts(): Promise<string[]> {
    if (this.provider.getConnecting()) { // Use getter
      throw this.provider.createProviderError(4001, 'Connection already in progress');
    }

    try {
      this.provider.setConnecting(true); // Use setter

      // Check if already connected to this origin
      const { origin } = window.location;
      if (!this.connectionManager.isConnected(origin)) {
        await this.connectionManager.requestConnection(origin, ['eth_accounts']);
      }

      const response = await this.provider.sendToContentScript('ETH_REQUEST_ACCOUNTS');

      if (response && response.success) {
        this.provider.setAccounts(response.data || []); // Use setter

        if (this.provider.isConnected()) {
          this.provider.emit('connect', { chainId: this.provider.chainId });
          this.provider.emit('accountsChanged', this.provider.getAccounts()); // Use getter
        }

        return this.provider.getAccounts(); // Use getter
      }

      if (response && response.error) {
        if (response.error.message === 'WALLET_UNLOCK_REQUIRED') {
          throw this.provider.createProviderError(4100, 'Wallet is locked. Please unlock your Paycio wallet.');
        }
        throw this.provider.createProviderError(4001, String(response.error.message || response.error || 'Failed to connect accounts'));
      }

      throw this.provider.createProviderError(4001, 'Failed to connect accounts');
    } finally {
      this.provider.setConnecting(false); // Use setter
    }
  }

  async sendTransaction(params: any[]): Promise<string> {
    if (!this.provider.isConnected()) {
      throw this.provider.createProviderError(4100, 'Unauthorized - no accounts connected');
    }

    if (!params || !Array.isArray(params) || params.length === 0) {
      throw this.provider.createProviderError(4001, 'Invalid transaction parameters');
    }

    // Show transaction confirmation
    this.toast.show('Transaction confirmation required', 'info');

    const response = await this.provider.sendToContentScript('ETH_SEND_TRANSACTION', params);

    if (response && response.success) {
      this.toast.show('Transaction sent successfully', 'success');
      return response.data;
    }

    this.toast.show('Transaction failed', 'error');
    throw new Error(String(response?.error?.message || response?.error || 'Transaction failed'));
  }

  async signTransaction(params: any[]): Promise<string> {
    if (!this.provider.isConnected()) {
      throw this.provider.createProviderError(4100, 'Unauthorized');
    }

    this.toast.show('Transaction signature required', 'info');

    const response = await this.provider.sendToContentScript('ETH_SIGN_TRANSACTION', params);

    if (response && response.success) {
      this.toast.show('Transaction signed successfully', 'success');
      return response.data;
    }

    throw new Error(String(response?.error?.message || response?.error || 'Transaction signing failed'));
  }

  async sendRawTransaction(params: any[]): Promise<string> {
    if (!params || !Array.isArray(params) || params.length === 0) {
      throw this.provider.createProviderError(4001, 'Invalid raw transaction parameters');
    }

    return await this.proxyRpcCall('eth_sendRawTransaction', params);
  }

  async personalSign(params: string[]): Promise<string> {
    if (!this.provider.isConnected()) {
      throw this.provider.createProviderError(4100, 'Unauthorized');
    }

    if (!params || !Array.isArray(params) || params.length < 2) {
      throw this.provider.createProviderError(4001, 'Invalid personal_sign parameters');
    }

    this.toast.show('Message signature required', 'info');

    const response = await this.provider.sendToContentScript('PERSONAL_SIGN', params);

    if (response && response.success) {
      this.toast.show('Message signed successfully', 'success');
      return response.data;
    }

    throw new Error(String(response?.error?.message || response?.error || 'Message signing failed'));
  }

  async ethSign(params: string[]): Promise<string> {
    if (!this.provider.isConnected()) {
      throw this.provider.createProviderError(4100, 'Unauthorized');
    }

    // eslint-disable-next-line no-console
    console.warn('eth_sign is deprecated and dangerous. Use personal_sign instead.');
    this.toast.show('Warning: eth_sign is deprecated', 'warning');

    const response = await this.provider.sendToContentScript('ETH_SIGN', params);

    if (response && response.success) {
      return response.data;
    }

    throw new Error(String(response?.error?.message || response?.error || 'eth_sign failed'));
  }

  async signTypedData(method: string, params: any[]): Promise<string> {
    if (!this.provider.isConnected()) {
      throw this.provider.createProviderError(4100, 'Unauthorized');
    }

    if (!params || !Array.isArray(params) || params.length < 2) {
      throw this.provider.createProviderError(4001, 'Invalid signTypedData parameters');
    }

    this.toast.show('Typed data signature required', 'info');

    const response = await this.provider.sendToContentScript('ETH_SIGN_TYPED_DATA', [method, params]);

    if (response && response.success) {
      this.toast.show('Typed data signed successfully', 'success');
      return response.data;
    }

    throw new Error(String(response?.error?.message || response?.error || 'Typed data signing failed'));
  }

  async switchChain(params: any[]): Promise<null> {
    if (!params || !Array.isArray(params) || !params[0]) {
      throw this.provider.createProviderError(4001, 'Invalid switchEthereumChain parameters');
    }

    const { chainId } = params[0];

    if (!chainId || typeof chainId !== 'string') {
      throw this.provider.createProviderError(4001, 'chainId must be a non-empty string');
    }

    const response = await this.provider.sendToContentScript('WALLET_SWITCH_ETHEREUM_CHAIN', [chainId]);

    if (response && response.success) {
      const oldChainId = this.provider.chainId;
      this.provider.chainId = chainId;
      this.provider.networkVersion = parseInt(chainId, 16).toString();

      if (oldChainId !== chainId) {
        this.provider.emit('chainChanged', chainId);
      }

      return null;
    }
    const errorCode = (typeof response?.error?.message === 'string' && response.error.message.includes('Unrecognized')) ? 4902 : 4001;
    throw this.provider.createProviderError(errorCode, String(response?.error?.message || response?.error || 'Chain switch failed'));
  }

  async addChain(params: any[]): Promise<null> {
    if (!params || !Array.isArray(params) || !params[0]) {
      throw this.provider.createProviderError(4001, 'Invalid addEthereumChain parameters');
    }

    const chainConfig = params[0];

    if (!chainConfig.chainId || !chainConfig.chainName || !chainConfig.rpcUrls) {
      throw this.provider.createProviderError(4001, 'Missing required chain configuration');
    }

    const response = await this.provider.sendToContentScript('WALLET_ADD_ETHEREUM_CHAIN', params);

    if (response && response.success) {
      this.toast.show(`Added ${chainConfig.chainName} network`, 'success');
      return null;
    }

    throw this.provider.createProviderError(4001, String(response?.error?.message || response?.error || 'User rejected the request'));
  }

  async watchAsset(params: any[]): Promise<boolean> {
    if (!params || !Array.isArray(params) || !params[0]) {
      throw this.provider.createProviderError(4001, 'Invalid watchAsset parameters');
    }

    const response = await this.provider.sendToContentScript('WALLET_WATCH_ASSET', params);

    if (response && response.success) {
      this.toast.show('Asset added to wallet', 'success');
      return response.data;
    }

    return false;
  }

  async requestPermissions(params: any[]): Promise<any[]> {
    const response = await this.provider.sendToContentScript('WALLET_REQUEST_PERMISSIONS', params);

    if (response && response.success) {
      return response.data;
    }

    return [];
  }

  async getPermissions(): Promise<any[]> {
    const response = await this.provider.sendToContentScript('WALLET_GET_PERMISSIONS');

    if (response && response.success) {
      return response.data;
    }

    return [];
  }

  // Advanced subscription methods
  async subscribe(params: any[]): Promise<string> {
    if (!params || !Array.isArray(params) || params.length === 0) {
      throw this.provider.createProviderError(4001, 'Invalid subscription parameters');
    }

    const subscriptionType = params[0];
    const subscriptionId = `sub_${Math.random().toString(36).substring(2)}`;

    this.provider.setSubscription(subscriptionId, { // Use setter
      type: subscriptionType,
      params: params.slice(1),
      active: true,
    });

    const response = await this.provider.sendToContentScript('ETH_SUBSCRIBE', [subscriptionId, subscriptionType, params.slice(1)]);

    if (response && response.success) {
      return subscriptionId;
    }

    this.provider.deleteSubscription(subscriptionId); // Use deleter
    throw new Error(String(response?.error?.message || response?.error || 'Subscription failed'));
  }

  async unsubscribe(params: any[]): Promise<boolean> {
    if (!params || !Array.isArray(params) || params.length === 0) {
      return false;
    }

    const subscriptionId = params[0];
    const subscription = this.provider.getSubscription(subscriptionId); // Use getter

    if (!subscription) {
      return false;
    }

    subscription.active = false;
    this.provider.deleteSubscription(subscriptionId); // Use deleter

    const response = await this.provider.sendToContentScript('ETH_UNSUBSCRIBE', [subscriptionId]);
    return response?.success || false;
  }

  // Filter methods
  async newFilter(params: any[]): Promise<string | null> {
    const filterId = `filter_${Math.random().toString(36).substring(2)}`;

    this.provider.setFilter(filterId, { // Use setter
      type: 'logs',
      params,
      created: Date.now(),
    });

    const response = await this.provider.sendToContentScript('ETH_NEW_FILTER', [filterId, params]);
    return response?.success ? filterId : null;
  }

  async newBlockFilter(): Promise<string | null> {
    const filterId = `filter_${Math.random().toString(36).substring(2)}`;

    this.provider.setFilter(filterId, { // Use setter
      type: 'newHeads',
      created: Date.now(),
    });

    const response = await this.provider.sendToContentScript('ETH_NEW_BLOCK_FILTER', [filterId]);
    return response?.success ? filterId : null;
  }

  async newPendingTransactionFilter(): Promise<string | null> {
    const filterId = `filter_${Math.random().toString(36).substring(2)}`;

    this.provider.setFilter(filterId, { // Use setter
      type: 'newPendingTransactions',
      created: Date.now(),
    });

    const response = await this.provider.sendToContentScript('ETH_NEW_PENDING_TX_FILTER', [filterId]);
    return response?.success ? filterId : null;
  }

  async getFilterChanges(params: any[]): Promise<any[]> {
    if (!params || !Array.isArray(params) || params.length === 0) {
      return [];
    }

    const filterId = params[0];
    if (!this.provider.getFilter(filterId)) { // Use getter
      return [];
    }

    const response = await this.provider.sendToContentScript('ETH_GET_FILTER_CHANGES', [filterId]);
    return response?.success ? response.data : [];
  }

  async getFilterLogs(params: any[]): Promise<any[]> {
    if (!params || !Array.isArray(params) || params.length === 0) {
      return [];
    }

    const filterId = params[0];
    if (!this.provider.getFilter(filterId)) { // Use getter
      return [];
    }

    const response = await this.provider.sendToContentScript('ETH_GET_FILTER_LOGS', [filterId]);
    return response?.success ? response.data : [];
  }

  async uninstallFilter(params: any[]): Promise<boolean> {
    if (!params || !Array.isArray(params) || params.length === 0) {
      return false;
    }

    const filterId = params[0];
    const deleted = this.provider.deleteFilter(filterId); // Use deleter

    if (deleted) {
      const response = await this.provider.sendToContentScript('ETH_UNINSTALL_FILTER', [filterId]);
      return response?.success || false;
    }

    return false;
  }

  async proxyRpcCall(method: string, params: any[]): Promise<any> {
    const response = await this.provider.sendToContentScript(method, params);

    if (response && response.success) {
      return response.data;
    }

    throw new Error(String(response?.error?.message || response?.error || `RPC call ${method} failed`));
  }

  async connectWalletConnect(uri: string): Promise<any> {
    return await this.walletConnect.handleWalletConnectUri(uri);
  }

  async getConnectedDapps(): Promise<string[]> {
    return Array.from(this.connectionManager.getConnections().keys());
  }

  async disconnectDapp(origin: string) {
    this.connectionManager.disconnect(origin);
    this.provider.emit('dapp_disconnected', { origin });
  }

  isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  isValidChainId(chainId: string): boolean {
    return /^0x[a-fA-F0-9]+$/.test(chainId);
  }

  // Legacy support methods
  async enable(): Promise<string[]> {
    // eslint-disable-next-line no-console
    console.warn('ethereum.enable() is deprecated. Use ethereum.request({ method: "eth_requestAccounts" }) instead.');
    return await this.requestAccounts();
  }

  async send(method: string, params: any[] = []): Promise<any> {
    // eslint-disable-next-line no-console
    console.warn('ethereum.send() is deprecated. Use ethereum.request() instead.');
    return await this.provider.request({ method, params });
  }

  sendAsync(payload: any, callback: (error: Error | null, result?: any) => void) {
    // eslint-disable-next-line no-console
    console.warn('ethereum.sendAsync() is deprecated. Use ethereum.request() instead.');

    if (!callback || typeof callback !== 'function') {
      throw new Error('Callback is required for sendAsync');
    }

    if (Array.isArray(payload)) {
      Promise.all(payload.map((item: any) => this.provider.request(item)))
        .then((results) => {
          const responses = results.map((result, index) => ({
            id: payload[index].id || null,
            jsonrpc: '2.0',
            result,
          }));
          callback(null, responses);
        })
        .catch((error) => callback(error));
    } else {
      this.provider.request(payload)
        .then((result) => {
          callback(null, {
            id: payload.id || null,
            jsonrpc: '2.0',
            result,
          });
        })
        .catch((error) => callback(error));
    }
  }
}