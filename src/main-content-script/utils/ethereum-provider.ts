import EventEmitter from 'events';
import { getBrowserAPI } from '../../utils/browser-api';
import { ExtensionResponse, WalletState } from '../../types/content-script';
import { NetworkManager } from '../../core/network-manager';
import { WalletManager } from '../../core/wallet-manager';
import { Transaction } from '../../types/index';
import { ToastManager } from '/Users/mac/Desktop/desktop2/untitled_folder_2/sow/src/main-content-script/utils/toast-manager';
import { ConnectionManager } from './connection-manager';
import { WalletConnectManager } from './wallet-connect-integration';
import { ProviderInitializer } from './ethereum-provider/provider-initializer';
import { ProviderEventHandler } from './ethereum-provider/provider-event-handler';
import { ProviderRequestProcessor } from './ethereum-provider/provider-request-processor';
import { ProviderRequestHandler } from './ethereum-provider/provider-request-handler';
import { ExtensionMessage } from '../../types/content-script';

interface ProviderRequest {
  method: string;
  params?: any[];
}

declare global {
  interface Window {
    paycioProvider: any; // Or a more specific type if available
  }
}

class PaycioEthereumProvider extends EventEmitter {
  private isPaycio: boolean;
  private isMetaMask: boolean;
  private isCoinbaseWallet: boolean;
  private isTrust: boolean;
  private isWalletConnect: boolean;

  public chainId: string;
  public selectedAddress: string | null;
  public networkVersion: string;

  private _isConnected: boolean;
  private _accounts: string[];
  public _initialized: boolean;
  private _connecting: boolean;

  private _requestId: number;
  private _pendingRequests: Map<string, any>;
  public _requestQueue: any[];
  public _processing: boolean;

  private _subscriptions: Map<string, any>;
  private _filters: Map<string, any>;

  private toast: ToastManager;
  private connectionManager: ConnectionManager;
  private walletConnect: WalletConnectManager;
  private browserAPI: typeof chrome | ReturnType<typeof getBrowserAPI>;
  private initializer: ProviderInitializer; // Add initializer instance
  private eventHandler: ProviderEventHandler; // Add event handler instance
  private requestProcessor: ProviderRequestProcessor; // Add request processor instance
  private requestHandler: ProviderRequestHandler; // Add request handler instance

  constructor(toast: ToastManager, connectionManager: ConnectionManager, walletConnect: WalletConnectManager, browserAPI: typeof chrome | ReturnType<typeof getBrowserAPI>) {
    super();
    this.toast = toast;
    this.connectionManager = connectionManager;
    this.walletConnect = walletConnect;
    this.browserAPI = browserAPI;

    // Provider identification
    this.isPaycio = true;
    this.isMetaMask = false;
    this.isCoinbaseWallet = false;
    this.isTrust = false;
    this.isWalletConnect = false;

    // Network state
    this.chainId = '0x1';
    this.selectedAddress = null;
    this.networkVersion = '1';

    // Connection state
    this._isConnected = false;
    this._accounts = [];
    this._initialized = false;
    this._connecting = false;

    // Request tracking
    this._requestId = 0;
    this._pendingRequests = new Map();
    this._requestQueue = [];
    this._processing = false;

    // Advanced features
    this._subscriptions = new Map();
    this._filters = new Map();

    this.initializer = new ProviderInitializer(this, toast, connectionManager);
    this.initializer.initialize();
    this.eventHandler = new ProviderEventHandler(this, toast);
    this.requestProcessor = new ProviderRequestProcessor(this);
    this.requestHandler = new ProviderRequestHandler(this, connectionManager, toast, walletConnect);
  }

  // Explicitly define emit and on methods
  override emit(eventName: string | symbol, ...args: any[]): boolean {
    return super.emit(eventName, ...args);
  }

  override on(eventName: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(eventName, listener);
  }

  override off(eventName: string | symbol, listener: (...args: any[]) => void): this {
    return super.off(eventName, listener);
  }

  override removeListener(eventName: string | symbol, listener: (...args: any[]) => void): this {
    return super.removeListener(eventName, listener);
  }

  updateProviderState(data: any) {
    this._isConnected = data?.isConnected || false;
    this._accounts = data?.accounts || [];
    this.selectedAddress = data?.selectedAddress || null;
    this.chainId = data?.chainId || '0x1';
    this.networkVersion = data?.networkVersion || '1';
  }

  getAccounts(): string[] {
    return [...this._accounts];
  }

  setConnecting(isConnecting: boolean) {
    this._connecting = isConnecting;
  }

  getConnecting(): boolean {
    return this._connecting;
  }

  setAccounts(accounts: string[]) {
    this._accounts = accounts;
    this.selectedAddress = accounts[0] || null;
    this._isConnected = accounts.length > 0;
  }

  setSubscription(id: string, subscription: any) {
    this._subscriptions.set(id, subscription);
  }

  getSubscription(id: string): any {
    return this._subscriptions.get(id);
  }

  deleteSubscription(id: string): boolean {
    return this._subscriptions.delete(id);
  }

  setFilter(id: string, filter: any) {
    this._filters.set(id, filter);
  }

  getFilter(id: string): any {
    return this._filters.get(id);
  }

  deleteFilter(id: string): boolean {
    return this._filters.delete(id);
  }

  async sendToContentScript(rpcMethod: string, rpcParams?: any[]): Promise<ExtensionResponse> {
    return new Promise((resolve) => {
      const message: ExtensionMessage = {
        type: 'PAYCIO_REQUEST',
        method: rpcMethod,
        params: rpcParams,
        __from: 'dapp-injected',
        __to: 'content-script',
        id: this._requestId++,
      };

      this._pendingRequests.set(message.id.toString(), resolve);

      // Correctly call sendMessage
      (this.browserAPI.runtime.sendMessage as (message: any) => void)(message);
    });
  }

  async request(payload: ProviderRequest): Promise<any> {
    // For now, delegate directly to the requestHandler
    return this.requestHandler.handleRequest(payload.method, payload.params);
  }

  handleProviderEvent(eventData: any) {
    this.eventHandler.handleProviderEvent(eventData);
  }

  async handleRequest(method: string, params: any): Promise<any> {
    return this.requestHandler.handleRequest(method, params);
  }

  isConnected(): boolean {
    return this._isConnected;
  }

  createProviderError(code: number, message: string): Error & { code?: number, name?: string } {
    const error: Error & { code?: number, name?: string } = new Error(message);
    error.code = code;

    switch (code) {
      case 4001:
        error.name = 'UserRejectedRequestError';
        break;
      case 4100:
        error.name = 'UnauthorizedError';
        break;
      case 4200:
        error.name = 'UnsupportedMethodError';
        break;
      case 4900:
        error.name = 'DisconnectedError';
        break;
      case 4901:
        error.name = 'ChainDisconnectedError';
        break;
      case 4902:
        error.name = 'UnrecognizedChainError';
        break;
    }

    return error;
  }

  // Utility methods
  isValidAddress(address: string): boolean {
    return this.requestHandler.isValidAddress(address);
  }

  isValidChainId(chainId: string): boolean {
    return this.requestHandler.isValidChainId(chainId);
  }

  // Legacy support methods
  async enable(): Promise<string[]> {
    return await this.requestHandler.enable();
  }

  async send(method: string, params: any[] = []): Promise<any> {
    return await this.requestHandler.send(method, params);
  }

  sendAsync(payload: any, callback: (error: Error | null, result?: any) => void) {
    this.requestHandler.sendAsync(payload, callback);
  }

  // Advanced connection methods
  async connectWalletConnect(uri: string): Promise<any> {
    return await this.requestHandler.connectWalletConnect(uri);
  }

  async getConnectedDapps(): Promise<string[]> {
    return await this.requestHandler.getConnectedDapps();
  }

  async disconnectDapp(origin: string) {
    await this.requestHandler.disconnectDapp(origin);
  }

  // Cleanup method
  destroy() {
    this.removeAllListeners();
    this._pendingRequests.forEach(({ timeout }) => clearTimeout(timeout));
    this._pendingRequests.clear();
    this._subscriptions.clear();
    this._filters.clear();
    this._isConnected = false;
    this._accounts = [];
    this.selectedAddress = null;
  }
}

export { PaycioEthereumProvider };
