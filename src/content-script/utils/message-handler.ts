import { browserAPI } from './browser-compatibility';
import { ToastManager, ToastConfig } from './toast-manager';
import type { WalletState, PerformanceMetrics, ExtensionMessage } from '../../types/content-script';

class MessageHandler {
  private pendingRequests = new Map<string, (response: any) => void>();
  private communicationPort: chrome.runtime.Port | null = null;
  private retryAttempts = 3;
  private currentState: WalletState;
  private performanceMetrics: PerformanceMetrics;
  private isDevelopment: boolean;
  private toast: ToastManager;
  private emit: (event: string, ...args: any[]) => void;
  private setupBackgroundConnection: () => void;
  private connectionRetryCount: number = 0;
  private readonly maxConnectionRetries: number = 3;
  public isConnecting: boolean = false;

  constructor(
    currentState: WalletState,
    performanceMetrics: PerformanceMetrics,
    isDevelopment: boolean,
    toast: ToastManager,
    emit: (event: string, ...args: any[]) => void,
    setupBackgroundConnection: () => void
  ) {
    this.currentState = currentState;
    this.performanceMetrics = performanceMetrics;
    this.isDevelopment = isDevelopment;
    this.toast = toast;
    this.emit = emit;
    this.setupBackgroundConnection = setupBackgroundConnection;
    this.setupPortConnection();
  }

  public setupPortConnection() {
    try {
      this.communicationPort = browserAPI.runtime.connect({ name: 'content-script' });
      
      this.communicationPort.onMessage.addListener((message) => {
        this.handlePortMessage(message);
      });
      
      this.communicationPort.onDisconnect.addListener(() => {
        // eslint-disable-next-line no-console
        console.warn('Port disconnected, will attempt to reconnect...');
        this.communicationPort = null;
        this.attemptReconnect();
      });
      
      
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to set up port connection:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.connectionRetryCount >= this.maxConnectionRetries) {
      // eslint-disable-next-line no-console
      console.error('Max reconnection attempts reached');
      this.toast.show('Connection to wallet lost. Please refresh the page.', 'error');
      return;
    }
    
    this.connectionRetryCount++;
    const delay = Math.min(1000 * Math.pow(2, this.connectionRetryCount), 10000);
    
    
    setTimeout(() => {
      this.setupPortConnection();
    }, delay);
  }
  
  public checkConnection() {
    if (!this.communicationPort) {
      this.setupPortConnection();
    } else {
      // Send a ping to check if the connection is still alive
      try {
        this.communicationPort.postMessage({ type: 'PING' });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Connection check failed, reconnecting...', error);
        this.setupPortConnection();
      }
    }
  }

  public setupMessageListeners() {
    // Listen for messages from the injected page script
    window.addEventListener('message', this.handlePageMessage.bind(this));
    
    // Listen for messages from the background script
    browserAPI.runtime.onMessage.addListener(this.handleBackgroundMessage.bind(this));
    
    // Set up port for long-lived connection
    this.setupPortConnection();
  }

  public async updateWalletState(state?: WalletState): Promise<void> {
    try {
      if (state) {
        // Update with provided state
        this.currentState = { ...this.currentState, ...state };
      } else {
        // Fetch fresh state from background
        const response = await new Promise<any>((resolve) => {
          browserAPI.runtime.sendMessage(
            { type: 'GET_WALLET_STATE' },
            (response) => {
              if (browserAPI.runtime.lastError) {
                // eslint-disable-next-line no-console
                console.error('Error getting wallet state:', browserAPI.runtime.lastError);
                resolve({ success: false, error: browserAPI.runtime.lastError });
              } else {
                resolve(response);
              }
            }
          );
        });
        
        if (response && response.success) {
          this.currentState = { ...this.currentState, ...response.state };
        }
      }
      
      return Promise.resolve();
      
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error updating wallet state:', error);
      return Promise.reject(error);
    }
  }
  
  public handlePortMessage(message: any) {
    if (!message || !message.type) return;
    
    (this.performanceMetrics.messageCount as any)++;
    
    switch (message.type) {
      case 'ACCOUNTS_CHANGED':
        this.handleAccountsChanged(message.accounts);
        break;
        
      case 'CHAIN_CHANGED':
        this.handleChainChanged({
          chainId: message.chainId,
          networkVersion: message.networkVersion
        });
        break;
        
      case 'CONNECTION_UPDATE':
        this.handleConnectionUpdate(message.connected, message.accounts);
        break;
        
      case 'PONG':
        // Connection is alive, reset retry counter
        this.connectionRetryCount = 0;
        break;
        
      default:
        this.forwardToPage(message);
    }
  }
  
  public handleBackgroundMessage(
    message: any,
    sender: any,
    sendResponse: (response?: any) => void
  ) {
    if (!message || !message.type) return;
    
    (this.performanceMetrics.messageCount as any)++;
    
    // Handle specific background messages
    switch (message.type) {
      case 'WALLET_STATE_UPDATE':
        // Assuming updateWalletState is still in PaycioWalletProvider and is public or passed as callback
        // this.updateWalletState(message.state);
        break;
        
      case 'REQUEST_PROCESSED':
        this.handleRequestResponse(message);
        break;
        
      case 'WALLET_LOCKED':
        this.handleWalletLocked();
        break;
        
      case 'WALLET_UNLOCKED':
        this.handleWalletUnlocked(message.accounts);
        break;
        
      case 'ACCOUNTS_CHANGED':
        this.handleAccountsChanged(message.accounts);
        break;
        
      case 'CHAIN_CHANGED':
        this.handleChainChanged({
          chainId: message.chainId,
          networkVersion: message.networkVersion
        });
        break;
        
      case 'DISCONNECT':
        this.handleDisconnect();
        break;
    }
    
    // Always respond to the background script
    if (sendResponse) {
      sendResponse({ success: true });
    }
    
    return true; // Keep the message channel open for async response
  }
  
  public handlePageMessage(event: MessageEvent) {
    // Only accept messages from same window and with expected origin
    if (event.source !== window) return;
    if (!event.data || typeof event.data !== 'object') return;
    
    const message = event.data as ExtensionMessage;
    
    // Log the incoming message for debugging
    if (this.isDevelopment) {
    }
    
    // Handle specific message types
    switch (message.type) {
      case 'PAYCIO_WALLET_REQUEST':
        this.handleWalletRequest(message);
        break;
        
      case 'PAYCIO_CHECK_WALLET_STATUS':
        this.forwardStatusCheck(message);
        break;
        
      case 'PAYCIO_GET_WALLET_ADDRESS':
        this.forwardAddressRequest(message);
        break;
        
      case 'PAYCIO_SHOW_WALLET_UNLOCK_POPUP':
        this.forwardWalletUnlockPopup(message);
        break;
        
      case 'PAYCIO_DEBUG_PASSWORD':
        this.forwardDebugPassword(message);
        break;
        
      case 'PAYCIO_TEST_MESSAGE':
        this.handleTestMessage(message);
        break;
        
      default:
        // eslint-disable-next-line no-console
        console.warn('Unknown message type:', message.type);
    }
  }
  
  private handleTestMessage(message: any) {
    try {
      window.postMessage({
        type: 'PAYCIO_TEST_RESPONSE',
        id: message.id,
        success: true,
        timestamp: Date.now()
      }, '*');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('PayCio Content: Error sending test response:', error);
    }
  }
  
  private handleWalletRequest(message: any) {
    if (!this.communicationPort) {
      this.sendErrorToInjected('PAYCIO_WALLET_REQUEST_RESPONSE', message.id, 'Not connected to wallet');
      return;
    }
    
    try {
      const requestId = this.generateRequestId();
      
      // Store the response handler
      this.pendingRequests.set(requestId, (response: any) => {
        this.pendingRequests.delete(requestId);
        
        window.postMessage({
          type: 'PAYCIO_WALLET_REQUEST_RESPONSE',
          id: message.id,
          success: response.success,
          result: response.result,
          error: response.error
        }, '*');
      });
      
      // Forward the request to the background script
      this.communicationPort.postMessage({
        type: 'WALLET_REQUEST',
        method: message.method,
        params: message.params || [],
        requestId
      });
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      // eslint-disable-next-line no-console
      console.error('Error handling wallet request:', err);
      this.sendErrorToInjected('PAYCIO_WALLET_REQUEST_RESPONSE', message.id, err.message);
    }
  }
  
  private forwardStatusCheck(message: any) {
    (async () => {
      try {
        const response = await this.sendToBackground(
          'CHECK_WALLET_STATUS',
          {},
        );
        window.postMessage({
          type: 'PAYCIO_WALLET_STATUS_RESPONSE',
          id: message.id,
          success: response.success,
          data: response.data,
        });
      } catch (error) {
        window.postMessage({
          type: 'PAYCIO_WALLET_STATUS_RESPONSE',
          id: message.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    })();
  }
  
  private forwardAddressRequest(message: any) {
    (async () => {
      try {
        const response = await this.sendToBackground(
          'GET_WALLET_ADDRESS',
          {},
        );
        window.postMessage({
          type: 'PAYCIO_WALLET_ADDRESS_RESPONSE',
          id: message.id,
          success: response.success,
          address: response.address || null,
        });
      } catch (error) {
        window.postMessage({
          type: 'PAYCIO_WALLET_ADDRESS_RESPONSE',
          id: message.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    })();
  }
  
  private forwardWalletUnlockPopup(message: any) {
    (async () => {
      try {
        const response = await this.sendToBackground(
          'SHOW_WALLET_UNLOCK_POPUP',
          { password: message.password },
        );
        window.postMessage({
          type: 'PAYCIO_WALLET_UNLOCK_RESPONSE',
          id: message.id,
          success: response.success,
          error: response.error || null,
        });
      } catch (error) {
        window.postMessage({
          type: 'PAYCIO_WALLET_UNLOCK_RESPONSE',
          id: message.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    })();
  }
  
  private forwardDebugPassword(message: any) {
    (async () => {
      try {
        const response = await this.sendToBackground(
          'DEBUG_PASSWORD',
          {},
        );
        window.postMessage({
          type: 'PAYCIO_DEBUG_PASSWORD_RESPONSE',
          id: message.id,
          success: response.success,
          passwordInfo: response.passwordInfo || null,
          error: response.error || null,
        });
      } catch (error) {
        window.postMessage({
          type: 'PAYCIO_DEBUG_PASSWORD_RESPONSE',
          id: message.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    })();
  }
  
  public sendToBackground(
    type: string,
    data: any
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId();
      
      // Store the response handler
      this.pendingRequests.set(requestId, (response: any) => {
        this.pendingRequests.delete(requestId);
        
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || 'Unknown error'));
        }
      });
      
      // Send the message
      try {
        if (this.communicationPort) {
          this.communicationPort.postMessage({
            ...data,
            type,
            requestId
          });
        } else {
          browserAPI.runtime.sendMessage({
            ...data,
            type,
            requestId
          });
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        reject(err);
      }
    });
  }
  
  private forwardToPage(message: any) {
    window.postMessage(message, '*');
  }
  
  private sendErrorToInjected(responseType: string, messageId: any, error: string) {
    window.postMessage({
      type: responseType,
      id: messageId,
      success: false,
      error: error
    }, '*');
  }
  
  public generateRequestId(): string {
    return 'req_' + Math.random().toString(36).substr(2, 9);
  }
  
  public handleRequestResponse(message: any) {
    const { requestId, ...response } = message;
    
    if (requestId && this.pendingRequests.has(requestId)) {
      const callback = this.pendingRequests.get(requestId);
      if (callback) {
        callback(response);
      }
    }
  }
  
  public handleWalletLocked() {
    this.currentState.isConnected = false;
    this.currentState.accounts = [];
    this.currentState.selectedAddress = null;
    this.currentState.isUnlocked = false;
    
    // Notify the page
    this.emit('accountsChanged', []);
    this.emit('disconnect', { code: 4900, message: 'Wallet locked' });
  }
  
  public handleWalletUnlocked(accounts: string[]) {
    this.currentState.isConnected = accounts.length > 0;
    this.currentState.accounts = accounts;
    this.currentState.selectedAddress = accounts[0] || null;
    this.currentState.isUnlocked = true;
    
    if (accounts.length > 0) {
      this.emit('accountsChanged', accounts);
      this.emit('connect', { chainId: this.currentState.chainId });
    }
  }
  
  public handleAccountsChanged(accounts: string[]) {
    const oldAccounts = [...this.currentState.accounts];
    const oldSelectedAddress = this.currentState.selectedAddress;
    
    this.currentState.accounts = accounts;
    this.currentState.selectedAddress = accounts[0] || null;
    this.currentState.isConnected = accounts.length > 0;
    
    // Only emit if accounts actually changed
    if (JSON.stringify(oldAccounts) !== JSON.stringify(accounts)) {
      this.emit('accountsChanged', accounts);
    }
    
    // If the selected address changed, emit a separate event
    if (oldSelectedAddress !== this.currentState.selectedAddress) {
      this.emit('selectedAddressChanged', this.currentState.selectedAddress);
    }
  }
  
  public handleChainChanged({ chainId, networkVersion }: { chainId: string; networkVersion: string }) {
    const oldChainId = this.currentState.chainId;
    
    this.currentState.chainId = chainId;
    this.currentState.networkVersion = networkVersion;
    
    if (oldChainId !== chainId) {
      this.emit('chainChanged', chainId);
      this.emit('networkChanged', networkVersion);
      
      // For EIP-1193 compatibility
      if (window.ethereum) {
        window.dispatchEvent(new Event('ethereum#initialized'));
      }
    }
  }
  
  public handleConnectionUpdate(connected: boolean, accounts: string[] = []) {
    this.currentState.isConnected = connected;
    
    if (accounts && accounts.length > 0) {
      this.handleAccountsChanged(accounts);
    }
    
    if (connected) {
      this.emit('connect', { chainId: this.currentState.chainId });
    } else {
      this.emit('disconnect', { code: 4900, message: 'Disconnected' });
    }
  }
  
  public handleDisconnect() {
    this.currentState.isConnected = false;
    this.currentState.accounts = [];
    this.currentState.selectedAddress = null;
    
    this.emit('accountsChanged', []);
    this.emit('disconnect', { code: 4900, message: 'User disconnected' });
  }

  destroy() {
    if (this.communicationPort) {
      this.communicationPort.disconnect();
      this.communicationPort = null;
    }
    window.removeEventListener('message', this.handlePageMessage.bind(this));
    browserAPI.runtime.onMessage.removeListener(this.handleBackgroundMessage.bind(this));
  }
}

export { MessageHandler };
