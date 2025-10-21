import { ToastManager, ToastConfig } from './toast-manager';
import { DAppConnectionManager } from './dapp-connection-manager';
import { browserAPI } from './browser-compatibility';
import { MessageHandler } from './message-handler';
import { ProviderInjector } from './provider-injector';

import { ExtensionMessage, ExtensionResponse, WalletState, PerformanceMetrics } from '../../types/content-script';

class PaycioWalletProvider {
  private connectedDApps = new Set<string>(); // Moved to ProviderInjector
  private currentState: WalletState = {
    isConnected: false,
    accounts: [],
    selectedAddress: null,
    chainId: '0x1',
    networkVersion: '1',
    isUnlocked: false,
    hasWallet: false
  };

  // Performance monitoring
  private performanceMetrics: PerformanceMetrics = {
    startTime: Date.now(),
    messageCount: 0,
    errorCount: 0,
    lastError: null
  };

  // Debug mode
  private readonly isDevelopment: boolean;
  private readonly isInjected: boolean = false;

  // Event listeners
  private eventListeners: { [event: string]: Array<(...args: any[]) => void> } = {};

  private messageHandler: MessageHandler;

  private providerInjector: ProviderInjector;

  constructor() {
    this.isDevelopment =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    this.messageHandler = new MessageHandler(
      this.currentState,
      this.performanceMetrics,
      this.isDevelopment,
      toast,
      this.emit.bind(this),
      this.messageHandler.setupPortConnection.bind(this.messageHandler)
    );

    this.providerInjector = new ProviderInjector(this.performanceMetrics, toast);

    this.initialize().catch(error => {
      const err = error instanceof Error ? error : new Error(String(error));
      // eslint-disable-next-line no-console
      console.error('Failed to initialize PaycioWalletProvider:', err);
      this.performanceMetrics.errorCount++;
      this.performanceMetrics.lastError = err;
      toast.show(`Failed to initialize wallet: ${err.message}`, 'error');
    });
  }

  private async initialize(): Promise<void> {
    try {

      // Set up content script indicator
      window.paycioWalletContentScript = {
        isRunning: true,
        timestamp: Date.now(),
        version: '1.0.0'
      };

      // Mark as injected
      // this.isInjected = true; // No longer needed as it's part of MessageHandler

      // Set up message listeners
      this.messageHandler.setupMessageListeners();

      // Inject the provider script into the page
      this.providerInjector.injectProviderScript();

      // Set up connection to background script
      this.messageHandler.setupPortConnection();

      // Get initial wallet state
      await this.messageHandler.updateWalletState();

      toast.show('PayCio Wallet is ready', 'success');

      // Set up periodic state updates
      this.setupPeriodicUpdates();

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      // eslint-disable-next-line no-console
      console.error('❌ Failed to initialize PayCio Wallet Provider:', err);
      this.performanceMetrics.errorCount++;
      this.performanceMetrics.lastError = err;
      toast.show(`Failed to initialize wallet: ${err.message}`, 'error');
      throw err;
    }
  }

  private setupPeriodicUpdates() {
    // Update wallet state every 30 seconds
    setInterval(() => {
      this.messageHandler.updateWalletState().catch(error => {
        // eslint-disable-next-line no-console
        console.warn('Failed to update wallet state:', error);
      });
    }, 30000);

    // Check connection status every 15 seconds
    setInterval(() => {
      this.messageHandler.checkConnection();
    }, 15000);
  }

  // Event emitter methods
  private emit(event: string, ...args: any[]) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  public on(event: string, listener: (...args: any[]) => void) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(listener);
    return () => this.off(event, listener);
  }

  public off(event: string, listener: (...args: any[]) => void) {
    if (!this.eventListeners[event]) return;

    const index = this.eventListeners[event].indexOf(listener);
    if (index > -1) {
      this.eventListeners[event].splice(index, 1);
    }
  }

  public once(event: string, listener: (...args: any[]) => void) {
    const onceListener = (...args: any[]) => {
      this.off(event, onceListener);
      listener(...args);
    };
    this.on(event, onceListener);
  }

  public destroy() {
    // Remove all event listeners
    this.eventListeners = {};

    // Close the port connection
    if (this.messageHandler) {
      this.messageHandler.destroy();
    }

    // Clear injected provider script attributes
    this.providerInjector.destroy();

    // Remove message listeners
    window.removeEventListener('message', this.messageHandler.handlePageMessage.bind(this.messageHandler));
    browserAPI.runtime.onMessage.removeListener(this.messageHandler.handleBackgroundMessage.bind(this.messageHandler));

    // Clean up global references
    if (window.__paycio === this) {
      delete window.__paycio;
    }

    if (window.paycioWalletContentScript) {
      window.paycioWalletContentScript.isRunning = false;
    }

  }

  // Public API methods
  public async request(args: { method: string; params?: any[] }): Promise<any> {
    if (!args || typeof args !== 'object' || !args.method) {
      throw new Error('Invalid request arguments');
    }

    const { method, params = [] } = args;

    // Handle some methods locally
    switch (method) {
      case 'eth_accounts':
        return this.currentState.accounts;

      case 'eth_chainId':
        return this.currentState.chainId;

      case 'net_version':
        return this.currentState.networkVersion;

      case 'eth_requestAccounts':
        return this.requestAccounts();
    }

    // Forward other methods to the background script
    const response = await this.messageHandler.sendToBackground(
      'WALLET_REQUEST',
      { method, params }
    );

    if (response.success) {
      return response.result;
    } else {
      throw new Error(response.error || 'Failed to process request');
    }
  }

  public async requestAccounts(): Promise<string[]> {
    if (this.messageHandler.isConnecting) {
      throw new Error('Request already in progress');
    }

    this.messageHandler.isConnecting = true;

    try {
      const response = await this.messageHandler.sendToBackground(
        'CONNECT_REQUEST',
        {}
      );

      if (response.success) {
        return response.accounts || [];
      } else {
        throw new Error(response.error || 'Failed to connect');
      }

    } finally {
      this.messageHandler.isConnecting = false;
    }
  }

  public async switchChain(chainId: string): Promise<null> {
    const response = await this.messageHandler.sendToBackground(
      'SWITCH_CHAIN',
      { chainId }
    );

    if (response.success) {
      return null;
    } else {
      throw new Error(response.error || 'Failed to switch chain');
    }
  }

  public async isConnected(): Promise<boolean> {
    return this.currentState.isConnected;
  }

  public async getChainId(): Promise<string> {
    return this.currentState.chainId;
  }

  public async getAccounts(): Promise<string[]> {
    return this.currentState.accounts;
  }

  // EIP-1193 Provider API
  public get isMetaMask(): boolean {
    return false; // We're not MetaMask
  }

  public get isPaycio(): boolean {
    return true;
  }

  public get selectedAddress(): string | null {
    return this.currentState.selectedAddress;
  }

  // For backward compatibility
  public enable(): Promise<string[]> {
    return this.requestAccounts();
  }

  // For backward compatibility
  public sendAsync(
    request: { method: string; params?: any[] },
    callback: (error: any, response: any) => void
  ): void {
    this.messageHandler.sendToBackground(
      'WALLET_REQUEST',
      { method: request.method, params: request.params }
    )
      .then(response => {
        callback(null, { result: response.result, id: request.params?.[0]?.id, jsonrpc: '2.0' });
      })
      .catch(error => {
        callback(error, null);
      });
  }

  // For backward compatibility
  public send(
    methodOrRequest: string | { method: string; params?: any[] },
    paramsOrCallback?: any[] | ((error: any, response: any) => void),
    callback?: (error: any, response: any) => void
  ): any {
    if (typeof methodOrRequest === 'string') {
      const method = methodOrRequest;
      const params = Array.isArray(paramsOrCallback) ? paramsOrCallback : [];
      
      if (typeof paramsOrCallback === 'function') {
        // If a callback is provided, use sendAsync
        this.sendAsync({ method, params }, paramsOrCallback);
        return;
      } else if (callback) {
        // If a separate callback is provided, use sendAsync
        this.sendAsync({ method, params }, callback);
        return;
      } else {
        // Synchronous calls for specific methods
        switch (method) {
          case 'eth_accounts':
            return this.currentState.accounts;
          case 'eth_chainId':
            return this.currentState.chainId;
          case 'net_version':
            return this.currentState.networkVersion;
          default:
            throw new Error('Synchronous methods are not supported');
        }
      }
    } else if (typeof methodOrRequest === 'object' && methodOrRequest !== null) {
      const request = methodOrRequest;
      const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
      
      if (cb) {
        // If a callback is provided, use sendAsync
        this.sendAsync(request, cb);
        return;
      } else {
        throw new Error('Callback is required for this method');
      }
    } else {
      throw new Error('Invalid arguments');
    }
  }
}

export { PaycioWalletProvider };
